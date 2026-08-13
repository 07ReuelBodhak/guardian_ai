import os
import json
import sqlite3
import datetime
import threading
import time
import re
from dotenv import load_dotenv

from langchain_core.messages import HumanMessage, AIMessage
from langchain_groq import ChatGroq
from agents.agent import app

from caspian_sdk import CommClient

# Initialize Caspian client for multi-platform support
caspian_client = CommClient()

try:
    email_connection = caspian_client.connect_email()
    print(f"Caspian Email initialized. Address: {email_connection.get('address') if email_connection else 'N/A'}")
except Exception as e:
    print(f"Failed to initialize Caspian email: {e}")
    email_connection = None

load_dotenv()

DB_PATH = "../frontend/prisma/dev.db"

# ── Memory Agent configuration ────────────────────────────────────────────────

SILENCE_THRESHOLD_MINUTES = 1

analysis_llm = ChatGroq(
    model="llama-3.1-8b-instant",
    api_key=os.getenv("GROQ_API_KEY")
)

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

# ── Helpers ────────────────────────────────────────────────────────────────────

def generate_cuid():
    """Generate a simple unique ID for SQLite rows."""
    import uuid
    return str(uuid.uuid4()).replace("-", "")[:25]


def log_message_to_db(user_id: str, role: str, text: str) -> str:
    """Insert a raw message into the Message table."""
    msg_id = generate_cuid()
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO Message (id, userId, role, text, createdAt, processed) VALUES (?, ?, ?, ?, ?, 0)",
            (msg_id, user_id, role, text, now)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[DB] Error logging message: {e}")
    return msg_id


def embed_message_sync(msg_id: str, text: str, user_id: str = "", role: str = "user"):
    """Embed a message into the ChromaDB vector store."""
    try:
        from vector_store import upsert
        upsert(msg_id, text, user_id=user_id, role=role)
    except Exception as e:
        print(f"[Vector] Error embedding message {msg_id}: {e}")

def proactive_send(recipient_id, text):
    """Helper to send proactive messages via Caspian SDK."""
    try:
        # Assuming caspian_client provides a generic send_message method for proactive contact
        if hasattr(caspian_client, 'send_message'):
            caspian_client.send_message(recipient=str(recipient_id), text=text)
        else:
            print(f"[Caspian Dummy Send] To {recipient_id}: {text}")
    except Exception as e:
        print(f"Failed to send proactive message to {recipient_id}: {e}")

# ── Memory Agent helpers ──────────────────────────────────────────────────────

def fetch_silent_sessions():
    """Find all users who have unprocessed messages and whose latest message is older than SILENCE_THRESHOLD_MINUTES."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    threshold = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=SILENCE_THRESHOLD_MINUTES)
    threshold_str = threshold.strftime("%Y-%m-%d %H:%M:%S")

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
    """Synchronous session analysis using LLM, then writes to SQLite."""
    transcript_lines = []
    for msg_id, role, text, created_at in messages:
        speaker = "USER" if role == "user" else "AI"
        transcript_lines.append(f"[{created_at}] {speaker}: {text}")

    transcript = "\n".join(transcript_lines)
    print(f"\n--- [Memory Agent] Analyzing session for user {uid} ---")
    
    prompt = ANALYSIS_PROMPT.format(transcript=transcript)

    try:
        result = analysis_llm.invoke(prompt)
        raw_content = result.content.strip()

        if raw_content.startswith("```"):
            raw_content = raw_content.split("\n", 1)[1]
            if raw_content.endswith("```"):
                raw_content = raw_content[:-3]
            raw_content = raw_content.strip()

        data = json.loads(raw_content)

        overall_mood = data.get("overallMood", "neutral")
        baseline = data.get("baseline", {})
        summary = data.get("summary", "Session analyzed.")

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("UPDATE User SET textingBaseline = ? WHERE id = ?", (json.dumps(baseline), uid))

        session_id = generate_cuid()
        now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute(
            "INSERT INTO SessionLog (id, userId, overallMood, summary, createdAt) VALUES (?, ?, ?, ?, ?)",
            (session_id, uid, overall_mood, summary, now)
        )

        msg_ids = [m[0] for m in messages]
        placeholders = ",".join(["?"] * len(msg_ids))
        cursor.execute(f"UPDATE Message SET processed = 1 WHERE id IN ({placeholders})", msg_ids)

        conn.commit()
        conn.close()
        print(f"    [OK] Session stored. SessionLog ID: {session_id}")

    except Exception as e:
        print(f"    [ERROR] Memory Agent error: {e}")

# ── Background Task Loops ─────────────────────────────────────────────────────

def memory_scan_loop():
    """Background task: find silent sessions and analyze them."""
    print(f"Memory Agent started (scanning every 60s, silence threshold: {SILENCE_THRESHOLD_MINUTES} min)")
    while True:
        try:
            sessions = fetch_silent_sessions()
            if sessions:
                print(f"\n[Memory Agent] Found {len(sessions)} session(s) to analyze.")
                for uid, messages in sessions:
                    analyze_session(uid, messages)
        except Exception as e:
            print(f"[Memory Agent] Scan error: {e}")
        time.sleep(60)


def proactive_scheduler_loop():
    """Background task: Send morning reminders and night check-ins."""
    print("Proactive Scheduler started (scanning every 60s for 8 AM and 9 PM triggers)")
    while True:
        try:
            try:
                from zoneinfo import ZoneInfo
            except ImportError:
                import pytz as ZoneInfo

            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            # Get all users connected via Caspian platforms
            cursor.execute("SELECT id, name, discordId, telegramId, preferredPlatform, timezone, lastMorningCheckIn, lastNightCheckIn, motivation FROM User WHERE discordId IS NOT NULL OR telegramId IS NOT NULL")
            users = cursor.fetchall()
            
            for user_row in users:
                uid, name, discord_id, telegram_id, pref_platform, tz_str, last_morning, last_night, persona = user_row
                
                # Determine target platform based on preference with fallback
                if pref_platform == 'telegram' and telegram_id:
                    target_platform_id = telegram_id
                elif discord_id:
                    target_platform_id = discord_id
                else:
                    target_platform_id = telegram_id
                if not tz_str: tz_str = "Asia/Kolkata"
                try: tz = ZoneInfo(tz_str)
                except: tz = ZoneInfo("Asia/Kolkata")
                    
                now_local = datetime.datetime.now(tz)
                today_str = now_local.strftime("%Y-%m-%d")
                current_hour = now_local.hour
                
                # Morning Check-in (between 9:00 and 9:59 AM)
                if current_hour == 9 and last_morning != today_str:
                    cursor.execute("SELECT title, dueDate FROM Task WHERE userId = ? AND status != 'completed' ORDER BY dueDate ASC LIMIT 5", (uid,))
                    tasks_rows = cursor.fetchall()
                    task_str = "No tasks for today!"
                    if tasks_rows:
                        task_str = "\n".join([f"- {t[0]} (Due: {t[1] or 'No date'})" for t in tasks_rows])
                    
                    prompt = (
                        f"You are Guardian, a human friend on Discord/Telegram talking to {name or 'User'}. Keep it extremely short (1-2 sentences). Mostly lowercase.\n"
                        f"It is currently 9:00 AM their time.\n"
                        f"Greet them good morning and remind them they have these tasks pending today:\n{task_str}\n"
                        f"Do NOT sound like an AI. Be casual. Persona: {persona or 'friendly'}"
                    )
                    
                    res = analysis_llm.invoke([HumanMessage(content=prompt)])
                    msg_content = res.content.strip()
                    proactive_send(target_platform_id, msg_content)
                        
                    cursor.execute("UPDATE User SET lastMorningCheckIn = ? WHERE id = ?", (today_str, uid))
                    conn.commit()
                    
                # Night Check-in (between 9:00 and 9:59 PM)
                elif current_hour == 21 and last_night != today_str:
                    cursor.execute("SELECT title, status FROM Task WHERE userId = ? AND status != 'completed' ORDER BY dueDate ASC LIMIT 5", (uid,))
                    tasks_rows = cursor.fetchall()
                    task_str = "\n".join([f"- {t[0]} [Current Status: {t[1]}]" for t in tasks_rows]) if tasks_rows else "No pending tasks."
                    
                    if tasks_rows:
                        prompt = (
                            f"You are Guardian, a human friend talking to {name or 'User'}. Keep it extremely short (1-2 sentences). Mostly lowercase.\n"
                            f"It is currently 9:00 PM their time.\n"
                            f"Ask them how their day went and if they managed to get these tasks done today:\n{task_str}\n"
                            f"Do NOT sound like an AI. Be casual. Persona: {persona or 'friendly'}"
                        )
                        
                        res = analysis_llm.invoke([HumanMessage(content=prompt)])
                        msg_content = res.content.strip()
                        proactive_send(target_platform_id, msg_content)
                            
                        cursor.execute("UPDATE User SET lastNightCheckIn = ? WHERE id = ?", (today_str, uid))
                        conn.commit()
            conn.close()
        except Exception as e:
            print(f"[Proactive Scheduler] Error: {e}")
        time.sleep(60)


def habit_scheduler_loop():
    """Strict State Machine for Habit Tracking."""
    print("Habit Scheduler started.")
    while True:
        try:
            try:
                from zoneinfo import ZoneInfo
            except ImportError:
                import pytz as ZoneInfo

            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute("SELECT id, name, discordId, telegramId, preferredPlatform, timezone, motivation FROM User WHERE discordId IS NOT NULL OR telegramId IS NOT NULL")
            users = cursor.fetchall()
            
            for user_row in users:
                uid, name, discord_id, telegram_id, pref_platform, tz_str, persona = user_row
                
                # Determine target platform based on preference with fallback
                if pref_platform == 'telegram' and telegram_id:
                    target_platform_id = telegram_id
                elif discord_id:
                    target_platform_id = discord_id
                else:
                    target_platform_id = telegram_id
                if not tz_str: tz_str = "Asia/Kolkata"
                try: tz = ZoneInfo(tz_str)
                except: tz = ZoneInfo("Asia/Kolkata")
                    
                now_local = datetime.datetime.now(tz)
                today_str = now_local.strftime("%Y-%m-%d")
                time_str = now_local.strftime("%H:%M")
                weekday = now_local.weekday()
                
                # --- 1. Trigger Initial Habits ---
                cursor.execute("SELECT id, title, frequency FROM ScheduledHabit WHERE userId = ? AND time = ?", (uid, time_str))
                habits = cursor.fetchall()
                
                for hid, title, freq in habits:
                    if freq == "weekdays" and weekday > 4: continue
                    if freq == "weekends" and weekday < 5: continue
                    
                    cursor.execute("SELECT id FROM HabitExecution WHERE scheduledHabitId = ? AND dateString = ?", (hid, today_str))
                    if cursor.fetchone(): continue
                    
                    exec_id = generate_cuid()
                    now_utc = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
                    cursor.execute(
                        "INSERT INTO HabitExecution (id, scheduledHabitId, userId, status, reminderStep, lastContactedAt, dateString, createdAt) VALUES (?, ?, ?, 'pending', 'initial', ?, ?, ?)",
                        (exec_id, hid, uid, now_utc, today_str, now_utc)
                    )
                    
                    prompt = (
                        f"You are Guardian, a human friend talking to {name or 'User'}. Keep it extremely short (1 sentence).\n"
                        f"They scheduled this exact time to do their daily habit: '{title}'.\n"
                        f"Send them a highly contextual, natural reminder to do it right now.\n"
                        f"Do NOT just say 'it's time for your habit called X'. Make it natural. Persona: {persona or 'friendly'}"
                    )
                    msg_content = analysis_llm.invoke([HumanMessage(content=prompt)]).content.strip()
                    proactive_send(target_platform_id, msg_content)
                    conn.commit()
                    print(f"[Habit] Triggered '{title}' for {name}")

                # --- 2. Process Pending Executions (Follow-ups & Timeouts) ---
                cursor.execute('''
                    SELECT e.id, e.scheduledHabitId, e.reminderStep, e.lastContactedAt, h.title 
                    FROM HabitExecution e
                    JOIN ScheduledHabit h ON e.scheduledHabitId = h.id
                    WHERE e.userId = ? AND e.status = 'pending' AND e.dateString = ?
                ''', (uid, today_str))
                pending_execs = cursor.fetchall()
                
                now_utc_dt = datetime.datetime.now(datetime.timezone.utc)
                for eid, hid, step, last_contact, title in pending_execs:
                    last_dt = datetime.datetime.strptime(last_contact, "%Y-%m-%d %H:%M:%S").replace(tzinfo=datetime.timezone.utc)
                    elapsed_mins = (now_utc_dt - last_dt).total_seconds() / 60.0
                    
                    new_step, new_status, msg_to_send = None, 'pending', None
                    
                    if step == 'initial' and elapsed_mins >= 15:
                        new_step = 'followup1'
                        prompt = f"You are Guardian. {name} was supposed to do their habit '{title}' 15 minutes ago. Ask them casually (1 sentence) if they ended up doing it. Persona: {persona or 'friendly'}"
                        msg_to_send = analysis_llm.invoke([HumanMessage(content=prompt)]).content.strip()
                        
                    elif step == 'delayed' and elapsed_mins >= 15:
                        new_step = 'followup1'
                        prompt = f"You are Guardian. {name} said they would do '{title}' 15 mins ago. Ask them casually (1 sentence) if they got it done. Persona: {persona or 'friendly'}"
                        msg_to_send = analysis_llm.invoke([HumanMessage(content=prompt)]).content.strip()
                        
                    elif step == 'followup1' and elapsed_mins >= 5:
                        new_step = 'timeout'
                        new_status = 'failed'
                        print(f"[Habit] {title} for {name} timed out.")
                    
                    if new_step:
                        now_utc_str = now_utc_dt.strftime("%Y-%m-%d %H:%M:%S")
                        cursor.execute("UPDATE HabitExecution SET reminderStep = ?, status = ?, lastContactedAt = ? WHERE id = ?", (new_step, new_status, now_utc_str, eid))
                        conn.commit()
                        if msg_to_send:
                            proactive_send(target_platform_id, msg_to_send)
            conn.close()
        except Exception as e:
            print(f"[Habit Scheduler] Error: {e}")
        time.sleep(60)


# ── Caspian Multi-Platform Orchestrator ───────────────────────────────────────

@caspian_client.on_message
def on_message(message):
    text = getattr(message, 'text', getattr(message, 'content', '')).strip()
    sender_id = str(getattr(message, 'sender_id', getattr(message, 'author_id', 'unknown')))
    platform = getattr(message, 'platform', 'unknown')
    
    print(f"[{platform.upper()}] Received message from {sender_id}: {text}")
    
    # ── Handle Account Connect ──
    if text.startswith("!connect "):
        code = text.split(" ")[1]
        try:
            conn_db = sqlite3.connect(DB_PATH)
            cursor = conn_db.cursor()
            cursor.execute("SELECT id FROM User WHERE discordConnectCode = ?", (code,))
            row = cursor.fetchone()
            
            if row:
                user_id = row[0]
                cursor.execute(
                    "UPDATE User SET discordId = ?, discordConnectCode = NULL WHERE id = ?",
                    (sender_id, user_id)
                )
                conn_db.commit()
                if hasattr(message, 'reply'): message.reply(f"Successfully connected your {platform.capitalize()} account to AiGuardian!")
                conn_db.close()
                return
                
            if hasattr(message, 'reply'): message.reply("Invalid or expired connect code. Please generate a new one from the dashboard.")
            conn_db.close()
        except Exception as e:
            print(f"Database error: {e}")
            if hasattr(message, 'reply'): message.reply("An internal error occurred while trying to connect your account.")
    else:
        # ── AI Agent Logic ──
        try:
            user_id = "unknown_user"
            user_baseline = "No baseline established yet."
            user_name = "User"
            motivation_style = "friendly"
            pending_task_context = "{}"
            user_timezone = "Asia/Kolkata"
            
            try:
                conn_db = sqlite3.connect(DB_PATH)
                cursor = conn_db.cursor()
                cursor.execute(
                    "SELECT id, textingBaseline, name, motivation, pendingTaskContext, timezone FROM User WHERE discordId = ?", 
                    (sender_id,)
                )
                row = cursor.fetchone()
                if row:
                    user_id, user_baseline_raw, user_name_raw, motivation_raw, pending_task_context_raw, tz = row
                    user_baseline = user_baseline_raw if user_baseline_raw else user_baseline
                    user_name = user_name_raw if user_name_raw else user_name
                    motivation_style = motivation_raw if motivation_raw else motivation_style
                    pending_task_context = pending_task_context_raw if pending_task_context_raw else "{}"
                    user_timezone = tz if tz else "Asia/Kolkata"
                conn_db.close()
            except Exception as db_e:
                print(f"Database lookup error for baseline: {db_e}")
                
            if user_id == "unknown_user":
                if hasattr(message, 'reply'): message.reply("Sorry, your account is not linked to Guardian AI! Please go to your dashboard, generate a connect code, and send it here using `!connect <code>`.")
                return

            # ── Sanitize input: strip system-reserved bracket tokens ──
            text = text.replace("[[", "").replace("]]", "")

            user_msg_id = log_message_to_db(user_id, "user", text)
            threading.Thread(target=embed_message_sync, args=(user_msg_id, text, user_id, "user"), daemon=True).start()
                
            history_messages = []
            try:
                conn_db = sqlite3.connect(DB_PATH)
                cursor = conn_db.cursor()
                cursor.execute("SELECT role, text FROM Message WHERE userId = ? ORDER BY createdAt DESC LIMIT 10", (user_id,))
                rows = cursor.fetchall()
                conn_db.close()
                for r, t in rows[::-1]:
                    if r == "user": history_messages.append(HumanMessage(content=t))
                    else: history_messages.append(AIMessage(content=t))
            except Exception as e:
                print(f"Error loading history: {e}")
                history_messages = [HumanMessage(content=text)]
                
            long_term_memory = ""
            try:
                from vector_store import query as query_vector
                results = query_vector(text, user_id, 3)
                if results:
                    mem_parts = []
                    for r in results:
                        if r.get("distance", 1.0) > 0.05:
                            prefix = "User said:" if r["role"] == "user" else "You (Guardian) said:"
                            mem_parts.append(f"- {prefix} {r['text']}")
                    if mem_parts:
                        long_term_memory = "\n".join(mem_parts)
            except Exception as e:
                print(f"Error querying ChromaDB: {e}")

            # ── Fetch active tasks ──
            active_tasks_str, pending_habits_str = "No active tasks.", "No pending habits."
            try:
                conn_db = sqlite3.connect(DB_PATH)
                cursor = conn_db.cursor()
                cursor.execute("SELECT COUNT(*) FROM Task WHERE userId = ?", (user_id,))
                total_tasks = cursor.fetchone()[0]
                
                cursor.execute("SELECT id, title, dueDate, status FROM Task WHERE userId = ? AND status != 'completed' ORDER BY dueDate ASC, createdAt DESC LIMIT 5", (user_id,))
                tasks_rows = cursor.fetchall()
                if tasks_rows:
                    lines = [f"- [ID: {t[0]}] {t[1]} (Due: {t[2] or 'No date'}) [Status: {t[3]}]" for t in tasks_rows]
                    if total_tasks > 5: lines.append(f"...and {total_tasks - 5} more pending tasks.")
                    active_tasks_str = "\n".join(lines)
                
                today_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
                cursor.execute('''SELECT e.id, h.title, e.reminderStep FROM HabitExecution e JOIN ScheduledHabit h ON e.scheduledHabitId = h.id WHERE e.userId = ? AND e.status = 'pending' AND e.dateString = ?''', (user_id, today_str))
                habit_rows = cursor.fetchall()
                conn_db.close()
                if habit_rows:
                    pending_habits_str = "\n".join([f"- [HabitID: {h[0]}] {h[1]} (Step: {h[2]})" for h in habit_rows])
            except Exception as e:
                print(f"Error fetching active tasks or habits: {e}")

            inputs = {
                "messages": history_messages,
                "user_id": user_id,
                "user_name": user_name,
                "motivation_style": motivation_style,
                "user_baseline": user_baseline,
                "long_term_memory": long_term_memory,
                "pending_task_context": pending_task_context,
                "active_tasks": active_tasks_str,
                "pending_habit_executions": pending_habits_str,
                "user_timezone": user_timezone
            }
            
            print("\nInvoking LangGraph Multi-Agent Orchestrator...")
            result = app.invoke(inputs)
            final_response = result["messages"][-1].content
            
            # Check for Planner Agent state updates
            new_pending_task = result.get("pending_task_context", "{}")
            if new_pending_task != pending_task_context:
                try:
                    conn_db = sqlite3.connect(DB_PATH)
                    cursor = conn_db.cursor()
                    cursor.execute("UPDATE User SET pendingTaskContext = ? WHERE id = ?", (new_pending_task, user_id))
                    conn_db.commit()
                    conn_db.close()
                except Exception as e:
                    print(f"Failed to update pending task context: {e}")

            # Extract SAVE_TASK payload
            json_match = re.search(r'\[\[SAVE_TASK_START\]\](.*?)\[\[SAVE_TASK_END\]\]', final_response, re.DOTALL)
            if json_match:
                try:
                    task_data = json.loads(json_match.group(1).strip())["SAVE_TASK"]
                    conn_db = sqlite3.connect(DB_PATH)
                    cursor = conn_db.cursor()
                    task_id = generate_cuid()
                    due_date = task_data.get("dueDate", None)
                    if due_date and (due_date == "YYYY-MM-DDTHH:MM:SSZ" or "YYYY" in due_date): due_date = None
                        
                    cursor.execute(
                        "INSERT INTO Task (id, userId, title, description, priority, dueDate) VALUES (?, ?, ?, ?, ?, ?)",
                        (task_id, user_id, task_data.get("title", "New Task"), task_data.get("description", ""), task_data.get("priority", "medium"), due_date)
                    )
                    cursor.execute("UPDATE User SET pendingTaskContext = '{}' WHERE id = ?", (user_id,))
                    conn_db.commit()
                    conn_db.close()
                    final_response = final_response.replace(json_match.group(0), "").strip()
                except Exception as e:
                    print(f"Error saving task to DB: {e}")

            # Extract UPDATE_TASK_STATUS
            update_match = re.search(r'\[\[UPDATE_TASK_STATUS (.*?) (.*?)\]\]', final_response)
            if update_match:
                task_id_to_update, new_status = update_match.group(1).strip(), update_match.group(2).strip()
                try:
                    conn_db = sqlite3.connect(DB_PATH)
                    cursor = conn_db.cursor()
                    if new_status == 'completed':
                        cursor.execute("UPDATE Task SET status = ?, completed = 1 WHERE id = ?", (new_status, task_id_to_update))
                    else:
                        cursor.execute("UPDATE Task SET status = ? WHERE id = ?", (new_status, task_id_to_update))
                    conn_db.commit()
                    conn_db.close()
                    final_response = final_response.replace(update_match.group(0), "").strip()
                except Exception as e:
                    print(f"Error updating task status in DB: {e}")

            # Extract Habit tracking tokens
            habit_complete_match = re.search(r'\[\[COMPLETE_HABIT_TODAY (.*?)\]\]', final_response)
            if habit_complete_match:
                habit_id = habit_complete_match.group(1).strip()
                try:
                    conn_db = sqlite3.connect(DB_PATH)
                    cursor = conn_db.cursor()
                    now_utc = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
                    cursor.execute("UPDATE HabitExecution SET status = 'completed', lastContactedAt = ? WHERE id = ?", (now_utc, habit_id))
                    conn_db.commit()
                    conn_db.close()
                    final_response = final_response.replace(habit_complete_match.group(0), "").strip()
                except Exception as e:
                    print(f"Error completing habit: {e}")
                    
            habit_delay_match = re.search(r'\[\[DELAY_HABIT (.*?)\]\]', final_response)
            if habit_delay_match:
                habit_id = habit_delay_match.group(1).strip()
                try:
                    conn_db = sqlite3.connect(DB_PATH)
                    cursor = conn_db.cursor()
                    now_utc = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
                    cursor.execute("UPDATE HabitExecution SET reminderStep = 'delayed', lastContactedAt = ? WHERE id = ?", (now_utc, habit_id))
                    conn_db.commit()
                    conn_db.close()
                    final_response = final_response.replace(habit_delay_match.group(0), "").strip()
                except Exception as e:
                    print(f"Error delaying habit: {e}")

            habit_fail_match = re.search(r'\[\[FAIL_HABIT_TODAY (.*?)\]\]', final_response)
            if habit_fail_match:
                habit_id = habit_fail_match.group(1).strip()
                try:
                    conn_db = sqlite3.connect(DB_PATH)
                    cursor = conn_db.cursor()
                    now_utc = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
                    cursor.execute("UPDATE HabitExecution SET status = 'failed', reminderStep = 'timeout', lastContactedAt = ? WHERE id = ?", (now_utc, habit_id))
                    conn_db.commit()
                    conn_db.close()
                    final_response = final_response.replace(habit_fail_match.group(0), "").strip()
                except Exception as e:
                    print(f"Error failing habit: {e}")

            # Handle Emergency Detection
            emergency_match = re.search(r'\[\[EMERGENCY_DETECTED\]\]', final_response)
            if emergency_match:
                try:
                    conn_db = sqlite3.connect(DB_PATH)
                    cursor = conn_db.cursor()
                    cursor.execute("SELECT u.emergencyEscalation, e.name, e.email FROM User u LEFT JOIN EmergencyContact e ON u.id = e.userId WHERE u.id = ?", (user_id,))
                    row = cursor.fetchone()
                    conn_db.close()
                    
                    if row and row[0]:  
                        contact_name, contact_email = row[1], row[2]
                        if contact_email:
                            print(f"🚨 EMERGENCY DETECTED! Escalating to {contact_name} at {contact_email}...")
                            email_text = f"SUBJECT: URGENT: Guardian AI Alert for {user_name} [TESTING]\n\n[TESTING / HACKATHON DEMO]\n\nURGENT: Guardian AI has detected that {user_name} is experiencing severe distress. Please check in on them immediately.\n\nLatest message context: '{text}'"
                            if email_connection:
                                caspian_client.initiate(
                                    connection_id=email_connection["id"],
                                    recipient=contact_email,
                                    text=email_text
                                )
                                print(f"✅ Emergency email dispatched to {contact_email} via Caspian.")
                    final_response = final_response.replace(emergency_match.group(0), "").strip()
                except Exception as e:
                    print(f"Error handling emergency: {e}")

            bot_msg_id = log_message_to_db(user_id, "ai", final_response)
            threading.Thread(target=embed_message_sync, args=(bot_msg_id, final_response, user_id, "ai"), daemon=True).start()

            if hasattr(message, 'reply'): message.reply(final_response)
            
        except Exception as e:
            print(f"Agent Error: {e}")
            if hasattr(message, 'reply'): message.reply("My internal orchestration encountered an error.")


if __name__ == "__main__":
    print("Starting Caspian Multi-Platform Bot (Discord, Telegram, etc.)...")
    
    threading.Thread(target=memory_scan_loop, daemon=True).start()
    threading.Thread(target=proactive_scheduler_loop, daemon=True).start()
    threading.Thread(target=habit_scheduler_loop, daemon=True).start()
    
    # Pre-initialize ChromaDB collection safely
    try:
        from vector_store import _get_collection
        _get_collection()
    except Exception:
        pass
        
    discord_token = os.getenv("DISCORD_BOT_TOKEN")
    telegram_token = os.getenv("TELEGRAM_BOT_TOKEN")
    
    if discord_token:
        caspian_client.connect_discord(discord_token)
    if telegram_token:
        caspian_client.connect_telegram(telegram_token)
        
    print("Listening on configured Caspian platforms...")
    caspian_client.listen()
