import os
import sqlite3
import datetime
import json
from fpdf import FPDF
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from caspian_sdk import CommClient

load_dotenv()

DB_PATH = "../frontend/prisma/dev.db"

REPORT_PROMPT = """You are an AI generating a monthly performance report for a user based on their data.
Format your output as clean, plain text with simple sections (NO MARKDOWN). Do not use bold (**) or headers (#).
Just use ALL CAPS for section titles and simple bullet points for lists.

User Data:
Tasks Completed: {tasks_completed}
Tasks Pending: {tasks_pending}
Habits Logged: {habits_list}
Average Mood over the last 30 days: {average_mood}

Generate a concise, encouraging 3-paragraph report summarizing their month, highlighting their most frequent habits, and suggesting one area of improvement.
"""

class PDF(FPDF):
    def header(self):
        self.set_font('helvetica', 'B', 15)
        self.cell(0, 10, 'Your Monthly AI Performance Report', border=0, align='C', new_x="LMARGIN", new_y="NEXT")
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

def generate_report(user_id: str, is_automated: bool = False):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get User Details
    cursor.execute("SELECT email, caspianEmailConnectionId, autoMonthlyReport FROM User WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        print("User not found.")
        return False
    email, caspian_id, auto_monthly_report = user

    if is_automated and not auto_monthly_report:
        print("User has disabled automated monthly reports.")
        conn.close()
        return False

    # Get past 30 days date
    past_30 = (datetime.datetime.utcnow() - datetime.timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S")

    # Fetch Tasks
    cursor.execute("SELECT title, status FROM Task WHERE userId = ? AND createdAt >= ?", (user_id, past_30))
    tasks = cursor.fetchall()
    completed = [t[0] for t in tasks if t[1] == 'completed']
    pending = [t[0] for t in tasks if t[1] != 'completed']

    # Fetch Habits
    cursor.execute("SELECT action FROM HabitLog WHERE userId = ? AND createdAt >= ?", (user_id, past_30))
    habits = [h[0] for h in cursor.fetchall()]

    # Fetch Moods
    cursor.execute("SELECT overallMood FROM SessionLog WHERE userId = ? AND createdAt >= ?", (user_id, past_30))
    moods = [m[0] for m in cursor.fetchall()]

    # Compute average mood manually (most frequent)
    from collections import Counter
    avg_mood = "neutral"
    if moods:
        avg_mood = Counter(moods).most_common(1)[0][0]

    conn.close()

    # Generate Text
    llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=os.getenv("GROQ_API_KEY"))
    prompt = REPORT_PROMPT.format(
        tasks_completed=len(completed),
        tasks_pending=len(pending),
        habits_list=", ".join(list(set(habits))) if habits else "None recorded",
        average_mood=avg_mood
    )
    result = llm.invoke(prompt)
    report_text = result.content.strip()

    # Create PDF
    pdf = PDF()
    pdf.add_page()
    pdf.set_font("helvetica", size=12)
    pdf.multi_cell(0, 8, report_text)
    
    # Ensure reports directory exists
    os.makedirs("../frontend/public/reports", exist_ok=True)
    pdf_path = f"../frontend/public/reports/report_{user_id}.pdf"
    pdf.output(pdf_path)

    # Send Email via Caspian
    if caspian_id and email:
        try:
            client = CommClient()
            # Send the email. Since initiate might not support media, we just provide the link.
            # In a real deployed app, the URL would be dynamic.
            report_url = f"http://localhost:3000/reports/report_{user_id}.pdf"
            email_body = f"Hello!\n\nYour monthly AI performance report has been generated. You can download and view your PDF here:\n\n{report_url}\n\nKeep up the great work!"
            client.initiate(caspian_id, email, email_body)
            print(f"Report emailed to {email}")
        except Exception as e:
            print(f"Failed to send email via Caspian: {e}")
    
    return True

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        generate_report(sys.argv[1])
