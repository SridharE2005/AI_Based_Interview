from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId


class Interaction(BaseModel):
    question: str
    answer: str
    feedback: str
    score: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Chat(BaseModel):
    userId: str   # Reference to Users._id (store as string/ObjectId)
    sessionId: str
    startedAt: datetime = Field(default_factory=datetime.utcnow)
    endedAt: Optional[datetime] = None
    overallScore: int = 0
    overallFeedback: Optional[str] = None
    interactions: List[Interaction] = []
