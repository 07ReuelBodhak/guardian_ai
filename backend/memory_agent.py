"""
Async Memory Agent for Guardian AI.

This script runs as a standalone background process. It polls the SQLite
database every 60 seconds looking for users who:
  - Have unprocessed messages (processed = false)
  - Whose latest message is older than 15 minutes (they stopped chatting)

When it finds such a session, it:
  1. Loads all unprocessed messages for that user.
  2. Sends the transcript to Groq LLM to compute:
     - overallMood (e.g. "happy", "anxious", "neutral")
     - baseline (JSON: averageLength, punctuationRatio, emojiRatio, etc.)
     - summary (one-sentence session description)
  3. Updates User.textingBaseline with the new baseline JSON.
  4. Inserts a SessionLog row with the mood and summary.
  5. Marks all processed messages as processed = true.

Usage:
    python memory_agent.py
"""

import os
import sys
import json
import sqlite3
import time
import datetime
import schedule
from dotenv import load_dotenv

load_dotenv()

from langchain_groq import ChatGroq

# Path to the shared SQLite database
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "frontend", "prisma", "dev.db")

# Silence threshold in minutes
SILENCE_THRESHOLD_MINUTES = 15

# Groq LLM for session analysis
analysis_llm = ChatGroq(
    model="llama-3.1-8b-instant",
    api_key=os.getenv("GROQ_API_KEY")
)

# The prompt template for session analysis
ANALYSIS_PROMPT = """You are an emotional intelligence analyst for a mental health companion app.

Given the following conversation transcript between a user and an AI companion, analyze the user's messages and produce a JSON object with exactly these three keys:

1. "overallMood" - A single adjective describing the user's emotional state across the ENTIRE session (e.g., "happy", "anxious", "stressed", "neutral", "sad", "motivated", "frustrated", "content"). Base this on the full context, not any single message.

2. "baseline" - A JSON object capturing the user's texting style with these exact keys:
   - "averageLength": average character count per user message (number)
   - "punctuationRatio": fraction of user messages containing periods, exclamation marks, or question marks (0.0 to 1.0)
   - "emojiRatio": fraction of user messages containing emojis (0.0 to 1.0)
   - "capitalStartRatio": fraction of user messages that start with a capital letter (0.0 to 1.0)
   - "sentimentScore": overall sentiment from -1.0 (very negative) to 1.0 (very positive)
   - "topWords": array of the 3 most frequently used non-stopwords by the user
   - "typingStyle": one of "lowercase", "sentence-case", "uppercase", "mixed-case"
   - "messagesPerMinute": estimated messages per minute based on message count and session duration

3. "summary" - A single sentence summarizing the session (e.g., "User vented about work stress and felt better after discussing coping strategies.")

IMPORTANT: Return ONLY the raw JSON object. No markdown, no code fences, no explanation.

Transcript:
{transcript}"""


def generate_cuid():
    """Generate a simple unique ID (not a real cuid but good enough for SQLite)."""
    import uuid
    return str(uuid.uuid4()).replace("-", "")[:25]


def fetch_silent_sessions():
    """
    Find all users who have unprocessed messages and whose latest message
    is older than SILENCE_THRESHOLD_MINUTES minutes.

    Returns a list of (userId, [(id, role, text, createdAt), ...]) tuples.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    threshold = datetime.datetime.utcnow() - datetime.timedelta(minutes=SILENCE_THRESHOLD_MINUTES)
    threshold_str = threshold.strftime("%Y-%m-%d %H:%M:%S")

    # Find users with unprocessed messages whose newest message is old enough
    # Limit to 50 users per scan to prevent memory exhaustion
    cursor.execute("""
        SELECT userId
        FROM Message
        WHERE processed = 0
        GROUP BY userId
        HAVING MAX(createdAt) < ?
        LIMIT 50
    """, (threshold_str,))

    user_ids = [row[0] for row in cursor.fetchall()]

    sessions = []
    for uid in user_ids:
        cursor.execute("""
            SELECT id, role, text, createdAt
            FROM Message
            WHERE userId = ? AND processed = 0
            ORDER BY createdAt ASC
        """, (uid,))
        messages = cursor.fetchall()
        if messages:
            sessions.append((uid, messages))

    conn.close()
    return sessions


def analyze_session(uid: str, messages: list):
    """
    Analyze a batch of messages for a user and store the results.

    Args:
        uid: The user's ID (from the User table).
        messages: List of (id, role, text, createdAt) tuples.
    """
    # Build the transcript (only include user messages for analysis context,
    # but show both sides for the LLM to understand the conversation flow)
    transcript_lines = []
    for msg_id, role, text, created_at in messages:
        speaker = "USER" if role == "user" else "AI"
        transcript_lines.append(f"[{created_at}] {speaker}: {text}")

    transcript = "\n".join(transcript_lines)

    print(f"\n--- [Memory Agent] Analyzing session for user {uid} ---")
    print(f"    Messages in session: {len(messages)}")

    # Call Groq LLM
    prompt = ANALYSIS_PROMPT.format(transcript=transcript)

    try:
        result = analysis_llm.invoke(prompt)
        raw_content = result.content.strip()

        # Try to parse the JSON response
        # Strip markdown code fences if the LLM added them
        if raw_content.startswith("```"):
            raw_content = raw_content.split("\n", 1)[1]  # remove first line
            if raw_content.endswith("```"):
                raw_content = raw_content[:-3]
            raw_content = raw_content.strip()

        data = json.loads(raw_content)

        overall_mood = data.get("overallMood", "neutral")
        baseline = data.get("baseline", {})
        summary = data.get("summary", "Session analyzed.")

        print(f"    Overall Mood: {overall_mood}")
        print(f"    Summary: {summary}")
        print(f"    Baseline: {json.dumps(baseline, indent=2)}")

        # Write results to the database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # 1. Update User.textingBaseline
        cursor.execute(
            "UPDATE User SET textingBaseline = ? WHERE id = ?",
            (json.dumps(baseline), uid)
        )

        # 2. Insert a SessionLog row
        session_id = generate_cuid()
        now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute(
            "INSERT INTO SessionLog (id, userId, overallMood, summary, createdAt) VALUES (?, ?, ?, ?, ?)",
            (session_id, uid, overall_mood, summary, now)
        )

        # 3. Mark all messages as processed
        msg_ids = [m[0] for m in messages]
        placeholders = ",".join(["?"] * len(msg_ids))
        cursor.execute(
            f"UPDATE Message SET processed = 1 WHERE id IN ({placeholders})",
            msg_ids
        )

        conn.commit()
        conn.close()

        print(f"    [OK] Session stored. SessionLog ID: {session_id}")

    except json.JSONDecodeError as e:
        print(f"    [ERROR] Failed to parse LLM response as JSON: {e}")
        print(f"    Raw response: {raw_content[:500]}")
    except Exception as e:
        print(f"    [ERROR] Memory Agent error: {e}")


def run_memory_scan():
    """Main scan job: find silent sessions and analyze them."""
    sessions = fetch_silent_sessions()

    if not sessions:
        return  # No sessions to process, stay quiet

    print(f"\n[Memory Agent] Found {len(sessions)} session(s) to analyze.")

    for uid, messages in sessions:
        analyze_session(uid, messages)


# Schedule the scan to run every 60 seconds
schedule.every(1).minutes.do(run_memory_scan)

if __name__ == "__main__":
    print("=" * 60)
    print("  Guardian AI - Memory Agent")
    print(f"  Silence threshold: {SILENCE_THRESHOLD_MINUTES} minutes")
    print(f"  Scan interval: every 60 seconds")
    print(f"  Database: {os.path.abspath(DB_PATH)}")
    print("=" * 60)
    print("\nMemory Agent started. Scanning for silent sessions...\n")

    # Run once immediately on startup
    run_memory_scan()

    # Then loop
    while True:
        schedule.run_pending()
        time.sleep(5)
