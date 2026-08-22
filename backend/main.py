import os
import json
import psycopg2
import psycopg2.extras
import os
import datetime
import threading
import time
import re
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, AIMessage
from langchain_groq import ChatGroq
from agents.agent import app
from caspian_sdk import CommClient
caspian_client = CommClient()
try:
    email_connection = caspian_client.connect_email()
    print(f"Caspian Email initialized. Address: {(email_connection.get('address') if email_connection else 'N/A')}")
except Exception as e:
    print(f'Failed to initialize Caspian email: {e}')
    email_connection = None
load_dotenv()
POSTGRES_URL = os.getenv('DATABASE_URL')
SILENCE_THRESHOLD_MINUTES = 1
analysis_llm = ChatGroq(model='llama-3.1-8b-instant', api_key=os.getenv('GROQ_API_KEY'))
ANALYSIS_PROMPT = 'You are an emotional intelligence analyst for a mental health companion app.\n\nGiven the following conversation transcript between a user and an AI companion, analyze the user\'s messages and produce a JSON object with exactly these three keys:\n\n1. "overallMood" - A single adjective describing the user\'s emotional state across the ENTIRE session (e.g., "happy", "anxious", "stressed", "neutral", "sad", "motivated", "frustrated", "content"). Base this on the full context, not any single message.\n\n2. "baseline" - A JSON object capturing the user\'s texting style with these exact keys:\n   - "averageLength": average character count per user message (number)\n   - "punctuationRatio": fraction of user messages containing periods, exclamation marks, or question marks (0.0 to 1.0)\n   - "emojiRatio": fraction of user messages containing emojis (0.0 to 1.0)\n   - "capitalStartRatio": fraction of user messages that start with a capital letter (0.0 to 1.0)\n   - "sentimentScore": overall sentiment from -1.0 (very negative) to 1.0 (very positive)\n   - "topWords": array of the 3 most frequently used non-stopwords by the user\n   - "typingStyle": one of "lowercase", "sentence-case", "uppercase", "mixed-case"\n   - "messagesPerMinute": estimated messages per minute based on message count and session duration\n\n3. "summary" - A single sentence summarizing the session (e.g., "User vented about work stress and felt better after discussing coping strategies.")\n\nIMPORTANT: Return ONLY the raw JSON object. No markdown, no code fences, no explanation.\n\nTranscript:\n{transcript}'

def generate_cuid():
    """Generate a simple unique ID for SQLite rows."""
    import uuid
    return str(uuid.uuid4()).replace('-', '')[:25]

def log_message_to_db(user_id: str, role: str, text: str) -> str:
    """Insert a raw message into the Message table."""
    msg_id = generate_cuid()
    now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    try:
        conn = psycopg2.connect(POSTGRES_URL)
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cursor.execute('INSERT INTO "Message" (id, "userId", role, text, "createdAt", processed) VALUES (%s, %s, %s, %s, %s, FALSE)', (msg_id, user_id, role, text, now))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f'[DB] Error logging message: {e}')
    return msg_id

def embed_message_sync(msg_id: str, text: str, user_id: str='', role: str='user'):
    """Embed a message into the ChromaDB vector store."""
    try:
        from vector_store import upsert
        upsert(msg_id, text, user_id=user_id, role=role)
    except Exception as e:
        print(f'[Vector] Error embedding message {msg_id}: {e}')

def proactive_send(recipient_id, text):
    """Helper to send proactive messages via Caspian SDK."""
    try:
        if hasattr(caspian_client, 'send_message'):
            caspian_client.send_message(recipient=str(recipient_id), text=text)
        else:
            print(f'[Caspian Dummy Send] To {recipient_id}: {text}')
    except Exception as e:
        print(f'Failed to send proactive message to {recipient_id}: {e}')

def fetch_silent_sessions():
    """Find all users who have unprocessed messages and whose latest message is older than SILENCE_THRESHOLD_MINUTES."""
    conn = psycopg2.connect(POSTGRES_URL)
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    threshold = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=SILENCE_THRESHOLD_MINUTES)
    threshold_str = threshold.strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute('\n        SELECT "userId"\n        FROM "Message"\n        WHERE processed = FALSE\n        GROUP BY "userId"\n        HAVING MAX("createdAt") < %s\n        LIMIT 50\n    ', (threshold_str,))
    user_ids = [row[0] for row in cursor.fetchall()]
    sessions = []
    for uid in user_ids:
        cursor.execute('\n            SELECT id, role, text, "createdAt"\n            FROM "Message"\n            WHERE "userId" = %s AND processed = FALSE\n            ORDER BY "createdAt" ASC\n        ', (uid,))
        messages = cursor.fetchall()
        if messages:
            sessions.append((uid, messages))
    conn.close()
    return sessions

def analyze_session(uid: str, messages: list):
    """Synchronous session analysis using LLM, then writes to SQLite."""
    transcript_lines = []
    for msg_id, role, text, created_at in messages:
        speaker = 'USER' if role == 'user' else 'AI'
        transcript_lines.append(f'[{created_at}] {speaker}: {text}')
    transcript = '\n'.join(transcript_lines)
    print(f'\n--- [Memory Agent] Analyzing session for user {uid} ---')
    prompt = ANALYSIS_PROMPT.format(transcript=transcript)
    try:
        result = analysis_llm.invoke(prompt)
        raw_content = result.content.strip()
        if raw_content.startswith('```'):
            raw_content = raw_content.split('\n', 1)[1]
            if raw_content.endswith('```'):
                raw_content = raw_content[:-3]
            raw_content = raw_content.strip()
        data = json.loads(raw_content)
        overall_mood = data.get('overallMood', 'neutral')
        baseline = data.get('baseline', {})
        summary = data.get('summary', 'Session analyzed.')
        conn = psycopg2.connect(POSTGRES_URL)
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cursor.execute('UPDATE "User" SET "textingBaseline" = %s WHERE id = %s', (json.dumps(baseline), uid))
        session_id = generate_cuid()
        now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute('INSERT INTO "SessionLog" (id, "userId", overallMood, summary, "createdAt") VALUES (%s, %s, %s, %s, %s)', (session_id, uid, overall_mood, summary, now))
        msg_ids = [m[0] for m in messages]
        placeholders = ','.join(['?'] * len(msg_ids))
        cursor.execute(f'UPDATE "Message" SET processed = TRUE WHERE id IN ({placeholders})', msg_ids)
        conn.commit()
        conn.close()
        print(f'    [OK] Session stored. SessionLog ID: {session_id}')
    except Exception as e:
        print(f'    [ERROR] Memory Agent error: {e}')

def memory_scan_loop():
    """Background task: find silent sessions and analyze them."""
    print(f'Memory Agent started (scanning every 60s, silence threshold: {SILENCE_THRESHOLD_MINUTES} min)')
    while True:
        try:
            sessions = fetch_silent_sessions()
            if sessions:
                print(f'\n[Memory Agent] Found {len(sessions)} session(s) to analyze.')
                for uid, messages in sessions:
                    analyze_session(uid, messages)
        except Exception as e:
            print(f'[Memory Agent] Scan error: {e}')
        time.sleep(60)

def proactive_scheduler_loop():
    """Background task: Send morning reminders and night check-ins."""
    print('Proactive Scheduler started (scanning every 60s for 8 AM and 9 PM triggers)')
    while True:
        try:
            try:
                from zoneinfo import ZoneInfo
            except ImportError:
                import pytz as ZoneInfo
            conn = psycopg2.connect(POSTGRES_URL)
            cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            cursor.execute('SELECT id, name, "discordId", "telegramId", "preferredPlatform", timezone, "lastMorningCheckIn", "lastNightCheckIn", "motivation" FROM "User" WHERE "discordId" IS NOT NULL OR "telegramId" IS NOT NULL')
            users = cursor.fetchall()
            for user_row in users:
                uid, name, discord_id, telegram_id, pref_platform, tz_str, last_morning, last_night, persona = user_row
                if pref_platform == 'telegram' and telegram_id:
                    target_platform_id = telegram_id
                elif discord_id:
                    target_platform_id = discord_id
                else:
                    target_platform_id = telegram_id
                if not tz_str:
                    tz_str = 'Asia/Kolkata'
                try:
                    tz = ZoneInfo(tz_str)
                except:
                    tz = ZoneInfo('Asia/Kolkata')
                now_local = datetime.datetime.now(tz)
                today_str = now_local.strftime('%Y-%m-%d')
                current_hour = now_local.hour
                if current_hour == 8 and last_morning != today_str:
                    cursor.execute('SELECT title, "dueDate" FROM "Task" WHERE "userId" = %s AND status != \'completed\' ORDER BY "dueDate" ASC LIMIT 5', (uid,))
                    tasks_rows = cursor.fetchall()
                    task_str = 'No tasks for today!'
                    if tasks_rows:
                        task_str = '\n'.join([f"- {t[0]} (Due: {t[1] or 'No date'})" for t in tasks_rows])
                    prompt = f"You are Guardian, a human friend on Discord/Telegram talking to {name or 'User'}. Keep it extremely short (1-2 sentences). Mostly lowercase.\nIt is currently 9:00 AM their time.\nGreet them good morning and remind them they have these tasks pending today:\n{task_str}\nDo NOT sound like an AI. Be casual. Persona: {persona or 'friendly'}"
                    res = analysis_llm.invoke([HumanMessage(content=prompt)])
                    msg_content = res.content.strip()
                    proactive_send(target_platform_id, msg_content)
                    cursor.execute('UPDATE "User" SET "lastMorningCheckIn" = %s WHERE id = %s', (today_str, uid))
                    conn.commit()
                elif current_hour == 21 and last_night != today_str:
                    cursor.execute('SELECT title, status FROM "Task" WHERE "userId" = %s AND status != \'completed\' ORDER BY "dueDate" ASC LIMIT 5', (uid,))
                    tasks_rows = cursor.fetchall()
                    task_str = '\n'.join([f'- {t[0]} [Current Status: {t[1]}]' for t in tasks_rows]) if tasks_rows else 'No pending tasks.'
                    if tasks_rows:
                        prompt = f"You are Guardian, a human friend talking to {name or 'User'}. Keep it extremely short (1-2 sentences). Mostly lowercase.\nIt is currently 9:00 PM their time.\nAsk them how their day went and if they managed to get these tasks done today:\n{task_str}\nDo NOT sound like an AI. Be casual. Persona: {persona or 'friendly'}"
                        res = analysis_llm.invoke([HumanMessage(content=prompt)])
                        msg_content = res.content.strip()
                        proactive_send(target_platform_id, msg_content)
                        cursor.execute('UPDATE "User" SET "lastNightCheckIn" = %s WHERE id = %s', (today_str, uid))
                        conn.commit()
            conn.close()
        except Exception as e:
            print(f'[Proactive Scheduler] Error: {e}')
        time.sleep(60)

def habit_scheduler_loop():
    """Strict State Machine for Habit Tracking."""
    print('Habit Scheduler started.')
    while True:
        try:
            try:
                from zoneinfo import ZoneInfo
            except ImportError:
                import pytz as ZoneInfo
            conn = psycopg2.connect(POSTGRES_URL)
            cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            cursor.execute('SELECT id, name, "discordId", "telegramId", "preferredPlatform", timezone, "motivation" FROM "User" WHERE "discordId" IS NOT NULL OR "telegramId" IS NOT NULL')
            users = cursor.fetchall()
            for user_row in users:
                uid, name, discord_id, telegram_id, pref_platform, tz_str, persona = user_row
                if pref_platform == 'telegram' and telegram_id:
                    target_platform_id = telegram_id
                elif discord_id:
                    target_platform_id = discord_id
                else:
                    target_platform_id = telegram_id
                if not tz_str:
                    tz_str = 'Asia/Kolkata'
                try:
                    tz = ZoneInfo(tz_str)
                except:
                    tz = ZoneInfo('Asia/Kolkata')
                now_local = datetime.datetime.now(tz)
                today_str = now_local.strftime('%Y-%m-%d')
                time_str = now_local.strftime('%H:%M')
                weekday = now_local.weekday()
                cursor.execute('SELECT id, title, frequency FROM "ScheduledHabit" WHERE "userId" = %s AND time = %s', (uid, time_str))
                habits = cursor.fetchall()
                for hid, title, freq in habits:
                    if freq == 'weekdays' and weekday > 4:
                        continue
                    if freq == 'weekends' and weekday < 5:
                        continue
                    cursor.execute('SELECT id FROM "HabitExecution" WHERE "scheduledHabitId" = %s AND "dateString" = %s', (hid, today_str))
                    if cursor.fetchone():
                        continue
                    exec_id = generate_cuid()
                    now_utc = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
                    cursor.execute('INSERT INTO "HabitExecution" (id, "scheduledHabitId", "userId", status, "reminderStep", "lastContactedAt", "dateString", "createdAt") VALUES (%s, %s, %s, \'pending\', \'initial\', %s, %s, %s)', (exec_id, hid, uid, now_utc, today_str, now_utc))
                    prompt = f"You are Guardian, a human friend talking to {name or 'User'}. Keep it extremely short (1 sentence).\nThey scheduled this exact time to do their daily habit: '{title}'.\nSend them a highly contextual, natural reminder to do it right now.\nDo NOT just say 'it's time for your habit called X'. Make it natural. Persona: {persona or 'friendly'}"
                    msg_content = analysis_llm.invoke([HumanMessage(content=prompt)]).content.strip()
                    proactive_send(target_platform_id, msg_content)
                    conn.commit()
                    print(f"[Habit] Triggered '{title}' for {name}")
                cursor.execute('\n                    SELECT e.id, e."scheduledHabitId", e."reminderStep", e."lastContactedAt", h.title \n                    FROM "HabitExecution" e\n                    JOIN "ScheduledHabit" h ON e."scheduledHabitId" = h.id\n                    WHERE e."userId" = %s AND e.status = \'pending\' AND e."dateString" = %s\n                ', (uid, today_str))
                pending_execs = cursor.fetchall()
                now_utc_dt = datetime.datetime.now(datetime.timezone.utc)
                for eid, hid, step, last_contact, title in pending_execs:
                    last_dt = datetime.datetime.strptime(last_contact, '%Y-%m-%d %H:%M:%S').replace(tzinfo=datetime.timezone.utc)
                    elapsed_mins = (now_utc_dt - last_dt).total_seconds() / 60.0
                    new_step, new_status, msg_to_send = (None, 'pending', None)
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
                        print(f'[Habit] {title} for {name} timed out.')
                    if new_step:
                        now_utc_str = now_utc_dt.strftime('%Y-%m-%d %H:%M:%S')
                        cursor.execute('UPDATE "HabitExecution" SET "reminderStep" = %s, status = %s, "lastContactedAt" = %s WHERE id = %s', (new_step, new_status, now_utc_str, eid))
                        conn.commit()
                        if msg_to_send:
                            proactive_send(target_platform_id, msg_to_send)
            conn.close()
        except Exception as e:
            print(f'[Habit Scheduler] Error: {e}')
        time.sleep(60)

@caspian_client.on_message
def on_message(message):

    def process():
        text = getattr(message, 'text', getattr(message, 'content', '')).strip()
        sender_id = str(getattr(message, 'sender_id', getattr(message, 'author_id', 'unknown')))
        platform = getattr(message, 'platform', 'unknown')
        print(f'[{platform.upper()}] Received message from {sender_id}: {text}')
        if text.startswith('!connect '):
            code = text.split(' ')[1]
            try:
                conn_db = psycopg2.connect(POSTGRES_URL)
                cursor = conn_db.cursor(cursor_factory=psycopg2.extras.DictCursor)
                if platform == 'telegram':
                    cursor.execute('SELECT id FROM "User" WHERE "telegramConnectCode" = %s', (code,))
                    row = cursor.fetchone()
                    if row:
                        user_id = row[0]
                        cursor.execute('UPDATE "User" SET "telegramId" = %s, "telegramConnectCode" = NULL WHERE id = %s', (sender_id, user_id))
                        conn_db.commit()
                        if hasattr(message, 'reply'):
                            message.reply(f'Successfully connected your {platform.capitalize()} account to AiGuardian!')
                        conn_db.close()
                        return
                else:
                    cursor.execute('SELECT id FROM "User" WHERE "discordConnectCode" = %s', (code,))
                    row = cursor.fetchone()
                    if row:
                        user_id = row[0]
                        cursor.execute('UPDATE "User" SET "discordId" = %s, "discordConnectCode" = NULL WHERE id = %s', (sender_id, user_id))
                        conn_db.commit()
                        if hasattr(message, 'reply'):
                            message.reply(f'Successfully connected your {platform.capitalize()} account to AiGuardian!')
                        conn_db.close()
                        return
                if hasattr(message, 'reply'):
                    message.reply('Invalid or expired connect code. Please generate a new one from the dashboard.')
                conn_db.close()
            except Exception as e:
                print(f'Database error: {e}')
                if hasattr(message, 'reply'):
                    message.reply('An internal error occurred while trying to connect your account.')
        else:
            try:
                user_id = 'unknown_user'
                user_baseline = 'No baseline established yet.'
                user_name = 'User'
                motivation_style = 'friendly'
                pending_task_context = '{}'
                user_timezone = 'Asia/Kolkata'
                try:
                    conn_db = psycopg2.connect(POSTGRES_URL)
                    cursor = conn_db.cursor(cursor_factory=psycopg2.extras.DictCursor)
                    if platform == 'telegram':
                        cursor.execute('SELECT id, "textingBaseline", name, "motivation", "pendingTaskContext", timezone FROM "User" WHERE "telegramId" = %s', (sender_id,))
                    else:
                        cursor.execute('SELECT id, "textingBaseline", name, "motivation", "pendingTaskContext", timezone FROM "User" WHERE "discordId" = %s', (sender_id,))
                    row = cursor.fetchone()
                    if row:
                        user_id, user_baseline_raw, user_name_raw, motivation_raw, pending_task_context_raw, tz = row
                        user_baseline = user_baseline_raw if user_baseline_raw else user_baseline
                        user_name = user_name_raw if user_name_raw else user_name
                        motivation_style = motivation_raw if motivation_raw else motivation_style
                        pending_task_context = pending_task_context_raw if pending_task_context_raw else '{}'
                        user_timezone = tz if tz else 'Asia/Kolkata'
                    conn_db.close()
                except Exception as db_e:
                    print(f'Database lookup error for baseline: {db_e}')
                if user_id == 'unknown_user':
                    if hasattr(message, 'reply'):
                        message.reply('Sorry, your account is not linked to Guardian AI! Please go to your dashboard, generate a connect code, and send it here using `!connect <code>`.')
                    return
                text = text.replace('[[', '').replace(']]', '')
                user_msg_id = log_message_to_db(user_id, 'user', text)
                threading.Thread(target=embed_message_sync, args=(user_msg_id, text, user_id, 'user'), daemon=True).start()
                history_messages = []
                try:
                    conn_db = psycopg2.connect(POSTGRES_URL)
                    cursor = conn_db.cursor(cursor_factory=psycopg2.extras.DictCursor)
                    cursor.execute('SELECT role, text FROM "Message" WHERE "userId" = %s ORDER BY "createdAt" DESC LIMIT 10', (user_id,))
                    rows = cursor.fetchall()
                    conn_db.close()
                    for r, t in rows[::-1]:
                        if r == 'user':
                            history_messages.append(HumanMessage(content=t))
                        else:
                            history_messages.append(AIMessage(content=t))
                except Exception as e:
                    print(f'Error loading history: {e}')
                    history_messages = [HumanMessage(content=text)]
                long_term_memory = ''
                try:
                    from vector_store import query as query_vector
                    results = query_vector(text, user_id, 3)
                    if results:
                        mem_parts = []
                        for r in results:
                            if r.get('distance', 1.0) > 0.05:
                                prefix = 'User said:' if r['role'] == 'user' else 'You (Guardian) said:'
                                mem_parts.append(f"- {prefix} {r['text']}")
                        if mem_parts:
                            long_term_memory = '\n'.join(mem_parts)
                except Exception as e:
                    print(f'Error querying ChromaDB: {e}')
                active_tasks_str, pending_habits_str = ('No active tasks.', 'No pending habits.')
                try:
                    conn_db = psycopg2.connect(POSTGRES_URL)
                    cursor = conn_db.cursor(cursor_factory=psycopg2.extras.DictCursor)
                    cursor.execute('SELECT COUNT(*) FROM "Task" WHERE "userId" = %s', (user_id,))
                    total_tasks = cursor.fetchone()[0]
                    cursor.execute('SELECT id, title, "dueDate", status FROM "Task" WHERE "userId" = %s AND status != \'completed\' ORDER BY "dueDate" ASC, "createdAt" DESC LIMIT 5', (user_id,))
                    tasks_rows = cursor.fetchall()
                    if tasks_rows:
                        lines = [f"- [ID: {t[0]}] {t[1]} (Due: {t[2] or 'No date'}) [Status: {t[3]}]" for t in tasks_rows]
                        if total_tasks > 5:
                            lines.append(f'...and {total_tasks - 5} more pending tasks.')
                        active_tasks_str = '\n'.join(lines)
                    today_str = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d')
                    cursor.execute('SELECT e.id, h.title, e."reminderStep" FROM "HabitExecution" e JOIN "ScheduledHabit" h ON e."scheduledHabitId" = h.id WHERE e."userId" = %s AND e.status = \'pending\' AND e."dateString" = %s', (user_id, today_str))
                    habit_rows = cursor.fetchall()
                    conn_db.close()
                    if habit_rows:
                        pending_habits_str = '\n'.join([f'- [HabitID: {h[0]}] {h[1]} (Step: {h[2]})' for h in habit_rows])
                except Exception as e:
                    print(f'Error fetching active tasks or habits: {e}')
                inputs = {'messages': history_messages, 'user_id': user_id, 'user_name': user_name, 'motivation_style': motivation_style, 'user_baseline': user_baseline, 'long_term_memory': long_term_memory, 'pending_task_context': pending_task_context, 'active_tasks': active_tasks_str, 'pending_habit_executions': pending_habits_str, 'user_timezone': user_timezone}
                print('\nInvoking LangGraph Multi-Agent Orchestrator...')
                result = app.invoke(inputs)
                final_response = result['messages'][-1].content
                new_pending_task = result.get('pending_task_context', '{}')
                if new_pending_task != pending_task_context:
                    try:
                        conn_db = psycopg2.connect(POSTGRES_URL)
                        cursor = conn_db.cursor(cursor_factory=psycopg2.extras.DictCursor)
                        cursor.execute('UPDATE "User" SET "pendingTaskContext" = %s WHERE id = %s', (new_pending_task, user_id))
                        conn_db.commit()
                        conn_db.close()
                    except Exception as e:
                        print(f'Failed to update pending task context: {e}')
                json_match = re.search('\\[\\[SAVE_TASK_START\\]\\](.*?)\\[\\[SAVE_TASK_END\\]\\]', final_response, re.DOTALL)
                if json_match:
                    try:
                        task_data = json.loads(json_match.group(1).strip())['SAVE_TASK']
                        conn_db = psycopg2.connect(POSTGRES_URL)
                        cursor = conn_db.cursor(cursor_factory=psycopg2.extras.DictCursor)
                        task_id = generate_cuid()
                        due_date = task_data.get('dueDate', None)
                        if due_date and (due_date == 'YYYY-MM-DDTHH:MM:SSZ' or 'YYYY' in due_date):
                            due_date = None
                        cursor.execute('INSERT INTO "Task" (id, "userId", title, description, priority, "dueDate") VALUES (%s, %s, %s, %s, %s, %s)', (task_id, user_id, task_data.get('title', 'New Task'), task_data.get('description', ''), task_data.get('priority', 'medium'), due_date))
                        cursor.execute('UPDATE "User" SET "pendingTaskContext" = \'{}\' WHERE id = %s', (user_id,))
                        conn_db.commit()
                        conn_db.close()
                        final_response = final_response.replace(json_match.group(0), '').strip()
                    except Exception as e:
                        print(f'Error saving task to DB: {e}')
                update_match = re.search('\\[\\[UPDATE_TASK_STATUS (.*?) (.*?)\\]\\]', final_response)
                if update_match:
                    task_id_to_update, new_status = (update_match.group(1).strip(), update_match.group(2).strip())
                    try:
                        conn_db = psycopg2.connect(POSTGRES_URL)
                        cursor = conn_db.cursor(cursor_factory=psycopg2.extras.DictCursor)
                        if new_status == 'completed':
                            cursor.execute('UPDATE "Task" SET status = %s, completed = TRUE WHERE id = %s', (new_status, task_id_to_update))
                        else:
                            cursor.execute('UPDATE "Task" SET status = %s WHERE id = %s', (new_status, task_id_to_update))
                        conn_db.commit()
                        conn_db.close()
                        final_response = final_response.replace(update_match.group(0), '').strip()
                    except Exception as e:
                        print(f'Error updating task status in DB: {e}')
                habit_complete_match = re.search('\\[\\[COMPLETE_HABIT_TODAY (.*?)\\]\\]', final_response)
                if habit_complete_match:
                    habit_id = habit_complete_match.group(1).strip()
                    try:
                        conn_db = psycopg2.connect(POSTGRES_URL)
                        cursor = conn_db.cursor(cursor_factory=psycopg2.extras.DictCursor)
                        now_utc = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
                        cursor.execute('UPDATE "HabitExecution" SET status = \'completed\', "lastContactedAt" = %s WHERE id = %s', (now_utc, habit_id))
                        conn_db.commit()
                        conn_db.close()
                        final_response = final_response.replace(habit_complete_match.group(0), '').strip()
                    except Exception as e:
                        print(f'Error completing habit: {e}')
                habit_delay_match = re.search('\\[\\[DELAY_HABIT (.*?)\\]\\]', final_response)
                if habit_delay_match:
                    habit_id = habit_delay_match.group(1).strip()
                    try:
                        conn_db = psycopg2.connect(POSTGRES_URL)
                        cursor = conn_db.cursor(cursor_factory=psycopg2.extras.DictCursor)
                        now_utc = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
                        cursor.execute('UPDATE "HabitExecution" SET "reminderStep" = \'delayed\', "lastContactedAt" = %s WHERE id = %s', (now_utc, habit_id))
                        conn_db.commit()
                        conn_db.close()
                        final_response = final_response.replace(habit_delay_match.group(0), '').strip()
                    except Exception as e:
                        print(f'Error delaying habit: {e}')
                habit_fail_match = re.search('\\[\\[FAIL_HABIT_TODAY (.*?)\\]\\]', final_response)
                if habit_fail_match:
                    habit_id = habit_fail_match.group(1).strip()
                    try:
                        conn_db = psycopg2.connect(POSTGRES_URL)
                        cursor = conn_db.cursor(cursor_factory=psycopg2.extras.DictCursor)
                        now_utc = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
                        cursor.execute('UPDATE "HabitExecution" SET status = \'failed\', "reminderStep" = \'timeout\', "lastContactedAt" = %s WHERE id = %s', (now_utc, habit_id))
                        conn_db.commit()
                        conn_db.close()
                        final_response = final_response.replace(habit_fail_match.group(0), '').strip()
                    except Exception as e:
                        print(f'Error failing habit: {e}')
                emergency_match = re.search('\\[\\[EMERGENCY_DETECTED\\]\\]', final_response)
                if emergency_match:
                    try:
                        conn_db = psycopg2.connect(POSTGRES_URL)
                        cursor = conn_db.cursor(cursor_factory=psycopg2.extras.DictCursor)
                        cursor.execute('SELECT u."emergencyEscalation", e.name, e.email FROM "User" u LEFT JOIN "EmergencyContact" e ON u.id = e."userId" WHERE u.id = %s', (user_id,))
                        row = cursor.fetchone()
                        conn_db.close()
                        if row and row[0]:
                            contact_name, contact_email = (row[1], row[2])
                            if contact_email:
                                print(f'🚨 EMERGENCY DETECTED! Escalating to {contact_name} at {contact_email}...')
                                email_text = f'''SUBJECT: URGENT: Guardian AI Mental Health Alert for {user_name}\n    \n    URGENT MEDICAL/SAFETY ALERT\n    --------------------------------------------------\n    Dear {contact_name},\n    \n    You are receiving this automated alert because you are listed as the emergency contact for {user_name} in their Guardian AI mental health monitoring dashboard.\n    \n    Our AI systems have detected a high-risk scenario in {user_name}'s recent conversational patterns that may indicate a crisis, severe distress, or potential for self-harm.\n    \n    Recent Context Flagged by AI:\n    "{text}"\n    \n    RECOMMENDED ACTIONS:\n    1. Attempt to contact {user_name} immediately.\n    2. If you are unable to reach them and believe they are in immediate danger, please contact local emergency services.\n    3. Treat this situation with urgency and care.\n    \n    This is an automated safety escalation from the Guardian AI platform.\n    --------------------------------------------------'''
                                if email_connection:
                                    caspian_client.initiate(connection_id=email_connection['id'], recipient=contact_email, text=email_text)
                                    print(f'✅ Emergency email dispatched to {contact_email} via Caspian.')
                        final_response = final_response.replace(emergency_match.group(0), '').strip()
                    except Exception as e:
                        print(f'Error handling emergency: {e}')
                bot_msg_id = log_message_to_db(user_id, 'ai', final_response)
                threading.Thread(target=embed_message_sync, args=(bot_msg_id, final_response, user_id, 'ai'), daemon=True).start()
                if hasattr(message, 'reply'):
                    message.reply(final_response)
            except Exception as e:
                print(f'Agent Error: {e}')
                if hasattr(message, 'reply'):
                    message.reply('My internal orchestration encountered an error.')
    threading.Thread(target=process, daemon=True).start()
if __name__ == '__main__':
    print('Starting Caspian Multi-Platform Bot (Discord, Telegram, etc.)...')
    threading.Thread(target=memory_scan_loop, daemon=True).start()
    threading.Thread(target=proactive_scheduler_loop, daemon=True).start()
    threading.Thread(target=habit_scheduler_loop, daemon=True).start()
    try:
        from vector_store import _get_collection
        _get_collection()
    except Exception:
        pass
    discord_token = os.getenv('DISCORD_BOT_TOKEN')
    telegram_token = os.getenv('TELEGRAM_BOT_TOKEN')
    if discord_token:
        caspian_client.connect_discord(discord_token)
    if telegram_token:
        caspian_client.connect_telegram(telegram_token)
    print('Listening on configured Caspian platforms...')
    
import threading
import uvicorn
from fastapi import FastAPI
import os

api_app = FastAPI()

@api_app.get("/")
def read_root():
    return {"status": "Alive", "bot": "Guardian AI"}

def run_api():
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(api_app, host="0.0.0.0", port=port)

api_thread = threading.Thread(target=run_api, daemon=True)
api_thread.start()

caspian_client.listen()
