from typing import TypedDict, Annotated
import operator
from langchain_core.messages import BaseMessage

class AgentState(TypedDict):
    """
    Central state for the multi-agent system.
    """
    messages: Annotated[list[BaseMessage], operator.add]
    mood: str
    user_id: str
    user_name: str
    motivation_style: str
    user_baseline: str
    long_term_memory: str
    pending_task_context: str
    active_tasks: str
    pending_habit_executions: str
    user_timezone: str
    next_node: str
