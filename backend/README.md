# Guardian AI - Backend Orchestrator

The backend of Guardian AI is a Python-based intelligent agent system that interfaces with Discord (and Telegram) to chat with users, orchestrate habits, perform background memory analysis, and detect severe distress.

## 🛠️ Tech Stack & Libraries
*   **Language**: Python 3
*   **Agent Orchestration**: [LangGraph](https://python.langchain.com/v0.1/docs/langgraph/) / LangChain
*   **LLM Engine**: [Groq](https://groq.com/) (Using Llama-3.1-8b-instant for blazing fast, cost-effective inference)
*   **Chat Platforms**: `discord.py` (Discord integration)
*   **Emergency Alerts**: [Caspian SDK](https://trycaspian.com/) for programmatic, silent email dispatches
*   **Database**: Live Production Database connector (Interacts directly with the Next.js database)

## 🧠 Core Features & Architecture

### 1. Main Chatbot Router (`main.py`)
This is the entry point of the backend. It listens to Discord messages, handles account linking via `!connect <code>`, and routes validated user messages into the LangGraph orchestrator. It also initializes the background task loops.

### 2. Multi-Agent Orchestrator (`agents/agent.py`)
Instead of a simple linear prompt, Guardian AI uses **LangGraph** to create a stateful, multi-node agent:
*   **Planner Node**: Analyzes the conversation context, the user's personality baseline, and pending tasks. It decides whether to just chat normally, save a new task/habit, or escalate an emergency.
*   **State Management**: It maintains a rolling history of the last 10 messages and the user's dynamic "texting baseline" to adapt its tone.

### 3. Background Memory Agent (`memory_agent.py`)
Guardian AI doesn't just forget you after a conversation. A background loop runs every 60 seconds to detect "silent sessions" (when a user hasn't messaged in 15+ minutes). 
*   **Sentiment & Baseline Analysis**: It bundles the recent unprocessed messages and asks the LLM to extract a "texting baseline" (emoji usage, capitalization, punctuation ratio, sentiment) and update the overall Mood. This data is what powers the live frontend dashboard.

### 4. Silent Emergency Escalation (Caspian Integration)
If the LangGraph agent detects severe distress or self-harm keywords, it emits a strict `[[EMERGENCY_DETECTED]]` token. The backend intercepts this token and uses the **Caspian SDK** to instantly fire a silent email to the user's trusted contact, providing crucial intervention without alarming the user.

## 🔒 Security Implementations
*   **Prompt Injection Mitigation**: User messages are actively sanitized in `main.py` (stripping brackets like `[[` and `]]`) *before* they are passed to the LangGraph agent. This prevents malicious users from spoofing internal system commands like `[[CLEAR_TASK]]` or `[[EMERGENCY_DETECTED]]`.
*   **Anti-DoS / Memory Protection**: The `memory_agent.py` implements a strict `LIMIT 50` batching limit when scanning for unprocessed sessions. This prevents Out-Of-Memory (OOM) crashes in the event of massive traffic spikes, ensuring background processing remains stable.
*   **Parameterized SQL**: All live database queries use strict parameterization, heavily mitigating SQL injection risks when reading from or writing to the production database.

## 🚀 Getting Started

1. **Virtual Environment**
   It is recommended to use a Python virtual environment.
   ```bash
   python -m venv env
   
   # Windows:
   source env/Scripts/activate
   # Mac/Linux:
   source env/bin/activate
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Environment Variables**
   Ensure you have a `.env` file in the `backend` folder containing the necessary keys:
   ```env
   DISCORD_BOT_TOKEN="your_discord_token"
   GROQ_API_KEY="your_groq_api_key"
   CASPIAN_API_KEY="your_caspian_api_key"
   CASPIAN_BASE_URL="https://api.trycaspianai.com"
   DATABASE_URL="postgres://user:password@host:port/database"
   ```

4. **Run the Bot**
   ```bash
   python main.py
   ```
   The bot will connect to Discord, initialize background task schedulers, and begin listening for messages.
