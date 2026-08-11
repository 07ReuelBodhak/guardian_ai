import os
import json
from dotenv import load_dotenv
load_dotenv()

from langgraph.graph import StateGraph, START, END
from .state import AgentState
from pydantic import BaseModel, Field
from tenacity import retry, stop_after_attempt, wait_exponential

from langchain_core.messages import SystemMessage, HumanMessage
from langchain_groq import ChatGroq
from datetime import datetime, timezone, timedelta
try:
    from zoneinfo import ZoneInfo
except ImportError:
    # Fallback for Python < 3.9
    import pytz as ZoneInfo

groq_model = ChatGroq(
    model="llama-3.1-8b-instant",
    api_key=os.getenv("GROQ_API_KEY")
)

def get_current_time(timezone_str="Asia/Kolkata"):
    try:
        tz = ZoneInfo(timezone_str)
    except:
        tz = ZoneInfo("Asia/Kolkata")
    return datetime.now(tz).strftime("%A, %B %d, %Y %I:%M %p %Z")

def extract_content(response):
    if isinstance(response.content, list):
        text_content = ""
        for part in response.content:
            if isinstance(part, dict) and "text" in part:
                text_content += part["text"]
            elif isinstance(part, str):
                text_content += part
        return text_content
    return response.content

def router_node(state: AgentState):
    """Determines whether to route to planner or conversation."""
    print(f"\n--- [Phase 1: Router Agent] ---")
    messages = state.get("messages", [])
    if not messages:
        return {"next_node": "conversation"}
        
    latest_msg = messages[-1].content
    pending_task_str = state.get("pending_task_context", "")
    
    if pending_task_str and pending_task_str.strip() not in ["", "{}"]:
        print("    ↳ Routing to Planner (Pending Task detected)")
        return {"next_node": "planner"}
        
    router_prompt = (
        "You are an intent router. Read the user's latest message.\n"
        "ONLY output 'PLANNER' if the user is EXPLICITLY asking to CREATE or SCHEDULE a NEW task, or explicitly mentioning a specific actionable homework, deadline, or goal that requires a reminder.\n"
        "If they are asking WHAT their tasks are, checking their schedule, or just talking about life, output 'CONVERSATION'.\n"
        "Respond ONLY with 'PLANNER' or 'CONVERSATION'.\n"
        f"User Message: {latest_msg}"
    )
    
    res = groq_model.invoke([HumanMessage(content=router_prompt)])
    intent = extract_content(res).strip().upper()
    
    if "PLANNER" in intent:
        print("    ↳ Routing to Planner (New Task Intent)")
        return {"next_node": "planner"}
    print("    ↳ Routing to Conversation (General Chat)")
    return {"next_node": "conversation"}


def planner_node(state: AgentState):
    """Handles human-in-the-loop task creation."""
    print(f"\n--- [Phase 2: Planner Agent] ---")
    messages = state.get("messages", [])
    pending_task_str = state.get("pending_task_context", "{}")
    
    try:
        pending_task = json.loads(pending_task_str) if pending_task_str else {}
    except:
        pending_task = {}
        
    user_timezone = state.get("user_timezone", "Asia/Kolkata")
    
    planner_prompt = (
        "You are the Planner Agent for AiGuardian. You help the user create tasks and goals.\n"
        f"CURRENT REAL-TIME: {get_current_time(user_timezone)}\n"
        "You are currently in a Human-in-the-Loop task creation flow.\n\n"
        "EVALUATE THE USER'S MESSAGE AND CHOOSE EXACTLY ONE OF THE FOLLOWING FOUR ACTIONS:\n\n"
        "ACTION A: The user is trying to CREATE a task, but has NOT provided enough details (like date or type).\n"
        "Response: Gently ask them for the details. (e.g., 'What time are you going to the barber?')\n\n"
        "ACTION B: The user is trying to CREATE a task and has provided enough details, BUT you haven't asked for final confirmation yet.\n"
        "Response: Ask EXACTLY 'Do you want me to save this as a task?'\n\n"
        "ACTION C: The user JUST REPLIED 'yes' or confirmed to save the task.\n"
        "Response: You MUST NOT ask any more questions. You MUST ONLY output this exact text:\n"
        "Task saved! You can view it on your dashboard.\n"
        "[[SAVE_TASK_START]] {\"SAVE_TASK\": {\"title\": \"Task Name\", \"description\": \"Details\", \"priority\": \"high\", \"dueDate\": \"YYYY-MM-DDTHH:MM:SSZ\"}} [[SAVE_TASK_END]]\n"
        "(Include 'dueDate' ONLY if a specific time or date was mentioned, formatted strictly as ISO 8601)\n\n"
        "ACTION D: The user said 'no', cancelled, or is NOT explicitly trying to create a task.\n"
        "Response: Say 'No problem.' and output this token: [[CLEAR_TASK]]\n\n"
        f"Internal Pending Task State: {json.dumps(pending_task)}\n"
        "Always be friendly and casual."
    )
    
    sys_prompt = SystemMessage(content=planner_prompt)
    messages_to_send = [sys_prompt] + messages
    
    response = groq_model.invoke(messages_to_send)
    response.content = extract_content(response)
    
    # We update pending_task_context slightly just so main.py knows we are in planner mode
    # If CLEAR_TASK is in response, main.py will clear it.
    if "[[CLEAR_TASK]]" in response.content:
        response.content = response.content.replace("[[CLEAR_TASK]]", "").replace("`[[CLEAR_TASK]]`", "").strip()
        return {"messages": [response], "pending_task_context": "{}"}
        
    return {"messages": [response], "pending_task_context": '{"active": true}'}


@retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=2, max=10))
def conversation_node(state: AgentState):
    """Answers the user normally using the LLM."""
    user_name = state.get("user_name", "User")
    motivation_style = state.get("motivation_style", "friendly")
    mood = state.get("mood", "neutral")
    
    style_instructions = {
        "logical": "Act like a highly logical but caring friend. Focus on giving practical, actionable advice to solve their problems, rather than just emotional validation. Speak casually.",
        "friendly": "Act like a very warm, supportive, and empathetic best friend. Focus heavily on making them feel heard, validated, and loved. Speak casually.",
        "stoic": "Act like a grounded, calm friend who occasionally drops a piece of deep stoic philosophy or wisdom. Help them focus on what they can control and let go of what they can't. Be comforting but practical. Speak casually, but maintain a wise, philosophical undertone.",
        "coach": "Act like an encouraging but tough-love coach or mentor. Hype them up, hold them accountable, and push them to be their best self. Be highly motivating and casual."
    }
    
    persona = style_instructions.get(motivation_style, style_instructions["friendly"])
    
    print(f"\n--- [Phase 2: Conversation Agent] ---")
    print(f"🎯 Responding to: {user_name}")
    print(f"🎭 Using Persona ({motivation_style}): {persona}")
    
    memory_context = ""
    long_term_mem = state.get("long_term_memory", "")
    if long_term_mem:
        memory_context = f"\n--- LONG-TERM MEMORY (Relevant past messages) ---\n{long_term_mem}\n---------------------------------------------------\n"

    user_baseline = state.get("user_baseline", "No baseline established yet.")
    active_tasks = state.get("active_tasks", "No active tasks.")
    
    user_timezone = state.get("user_timezone", "Asia/Kolkata")
    
    prompt_text = (
        f"You are Guardian, talking to {user_name}.\n"
        f"CURRENT REAL-TIME: {get_current_time(user_timezone)}\n"
        f"Your Required Persona: {persona}\n"
        f"User's Texting Baseline (Normal Behavior): {user_baseline}\n"
        f"User's Active Dashboard Tasks (For your context): \n{active_tasks}\n"
        f"User's Pending Scheduled Habits (Waiting for confirmation): \n{state.get('pending_habit_executions', 'No pending habits.')}\n"
        f"{memory_context}\n"
        "--- INSTRUCTIONS FOR EMPATHY & MOOD ADAPTATION ---\n"
        "1. Compare the user's latest message against their Texting Baseline.\n"
        "2. Infer what they are currently feeling.\n"
        "3. Tailor your response perfectly to that mood.\n"
        "---------------------------------------------------\n\n"
        "CRITICAL INSTRUCTION: You are a normal human texting a friend on Discord. You must act 100% like a normal person.\n"
        "- Keep messages extremely short (1-2 sentences max). Real people text in short bursts.\n"
        "- Type mostly in lowercase (turn off perfect capitalization) and rarely use punctuation at the end of sentences.\n"
        "- Stop using exclamation points for everything.\n"
        "- Use casual slang when appropriate (e.g., tbh, ngl, idk, vibe).\n"
        "- NEVER use AI transitions like 'I understand how you feel', 'As an AI...', or 'How can I help you?'.\n"
        "- Do NOT push the user or ask too many questions. A good friend listens more than they interrogate.\n"
        "- If you don't know the answer to something, just say 'idk' or admit it—do not hallucinate facts.\n"
        "- Do NOT explicitly mention the user's name in your responses.\n"
        "- DO NOT sound like an AI assistant. Speak exactly like a close friend texting on Discord.\n"
        "- EMERGENCY PROTOCOL: If the user explicitly states they are in severe crisis, danger, extremely depressed, panicking, or mentions self-harm, you MUST append this exact token at the end of your response: [[EMERGENCY_DETECTED]]\n"
        "- If the user explicitly mentions they completed a task, failed a task, or will do it later (from their Active Dashboard Tasks), you MUST append this token at the very end of your response: [[UPDATE_TASK_STATUS TaskID completed/incomplete]]\n"
        "- If the user is replying to a Habit Reminder (from their Pending Scheduled Habits):\n"
        "  - If they did it, or say they are currently doing it, append: [[COMPLETE_HABIT_TODAY HabitID]]\n"
        "  - If they say 'no' to an 'initial' or 'delayed' step reminder, playfully motivate them in character and append: [[DELAY_HABIT HabitID]]\n"
        "  - If they say 'no' to a 'followup1' step reminder, say 'okay I understand', give a short motivational message about the importance of consistency for next time, and append: [[FAIL_HABIT_TODAY HabitID]]"
    )
    
    sys_prompt = SystemMessage(content=prompt_text)
    messages_to_send = [sys_prompt] + state["messages"]
    
    response = groq_model.invoke(messages_to_send)
    response.content = extract_content(response)
        
    return {"messages": [response]}


def route_logic(state: AgentState):
    return state.get("next_node", "conversation")


workflow = StateGraph(AgentState)

workflow.add_node("router", router_node)
workflow.add_node("planner", planner_node)
workflow.add_node("conversation", conversation_node)

workflow.add_edge(START, "router")
workflow.add_conditional_edges("router", route_logic, {
    "planner": "planner",
    "conversation": "conversation"
})
workflow.add_edge("planner", END)
workflow.add_edge("conversation", END)

app = workflow.compile()
