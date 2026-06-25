from pydantic import BaseModel
from typing import List, Optional, Literal


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class PredictionContext(BaseModel):
    """Optional context passed from the results page so the bot
    can answer questions about the user's actual prediction."""
    top_diseases: Optional[List[dict]] = None
    risk_score: Optional[float] = None
    estimated_cost: Optional[dict] = None


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []          # previous turns for context
    context: Optional[PredictionContext] = None  # patient's result, if any


class ChatResponse(BaseModel):
    reply: str