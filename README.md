# 🛡️ Guardian AI 

**Guardian AI** is an intelligent, proactive mental health companion that meets you where you already are (Discord, Telegram). Unlike traditional mental health apps that require you to remember to log in and fill out surveys, Guardian AI acts as a trusted friend who checks in on you, tracks your mood over time, helps you build healthy habits, and can securely escalate to a trusted emergency contact if you're in severe distress.

## ✨ Comprehensive Feature List

### 1. Multi-Platform AI Companion
*   **Discord Integration**: Talk to Guardian AI naturally. It maintains a unified memory of who you are and what you've discussed.
*   **Proactive Check-ins**: The bot doesn't just wait for you to talk. If you haven't spoken in a while, or if you missed a habit, it will gently reach out using background task schedulers.

### 2. Live Mood & Risk Analytics
*   **Sentiment & Texting Baseline**: The system calculates your "texting baseline" (emoji usage, response length, punctuation) to understand what is normal for *you*.
*   **Risk Scores**: Analyzing your conversation patterns, the app generates dynamic risk scores for Burnout, Isolation, and Crisis, displayed in real-time on your web dashboard.

### 3. Dynamic Habit & Routine Tracking
*   **Conversational Creation**: Tell the bot you want to start a habit (e.g., "Remind me to drink water every 4 hours"). 
*   **Execution Tracking**: The backend schedules reminders, follows up, and calculates your consistency score automatically. A strict hard limit prevents habit spamming.

### 4. Silent Emergency Escalation (Caspian SDK)
*   If the AI detects severe distress or a crisis in your messages, it instantly triggers a silent email alert (via the **Caspian CommClient SDK**) to your pre-configured trusted contact, ensuring you get help when you need it most.

## 🔐 Security Posture

We take mental health data security seriously. Guardian AI implements several layers of security:

*   **Session-Based Authorization**: The Next.js frontend strictly utilizes `Auth.js` (NextAuth). Every API route and Server Action independently validates the user session before reading or writing data.
*   **Anti-IDOR (Insecure Direct Object Reference)**: Database queries are inherently tied to the authenticated `session.user.id`, ensuring a user can never fetch or modify another user's habits or profile.
*   **SQL Injection Prevention**: The backend strictly uses parameterized queries (e.g., `cursor.execute("...", (user_id,))`), neutralizing SQL injection vectors against the live database.
*   **LLM Prompt Injection Mitigation**: Raw user inputs are sanitized (stripping system-reserved tokens like `[[`) before being passed into the LangGraph orchestrator, preventing attackers from spoofing internal system commands (e.g., `[[CLEAR_TASK]]`).
*   **DoS & Memory Protection**: Background workers (like the memory agent) implement strict `LIMIT` pagination and batch processing when fetching user sessions, preventing Out-Of-Memory (OOM) crashes and resource exhaustion during traffic spikes.

## 🏗️ Architecture

Guardian AI is built as a full-stack monorepo with separated frontend and backend services:

*   **Frontend**: Next.js App Router, Tailwind CSS, and Auth.js for user dashboards and analytics.
*   **Backend**: Python, LangGraph for multi-agent orchestration, Discord.py, and Groq (Llama 3.1 8b) for blazing-fast LLM inference.
*   **Database**: A live production database (e.g., PostgreSQL/MySQL) acts as the shared state between the Next.js frontend and the Python backend.

---

## 🚀 Getting Started

To run Guardian AI locally, you'll need to start both the frontend and the backend.

### 1. Database & Frontend Setup
Ensure your live database connection string is properly configured. Navigate to the `frontend` directory:
```bash
cd frontend
npm install
# Ensure DATABASE_URL is set in your .env
npm run dev
```
Access the dashboard at `http://localhost:3000`.

### 2. Backend Bot Setup
Open a new terminal, navigate to the `backend` directory, and start the AI orchestrator:
```bash
cd backend
python -m venv env
source env/Scripts/activate  # On Windows
pip install -r requirements.txt
python main.py
```

*For an in-depth breakdown of API routes and orchestrator details, please see [`frontend/README.md`](frontend/README.md) and [`backend/README.md`](backend/README.md).*
