from pydantic import BaseModel, Field # type: ignore
from typing import Optional
from datetime import datetime

class History(BaseModel):
    userId: str  
    interviewType: str 
    score: float  
    timestamp: datetime = Field(default_factory=datetime.utcnow)  
    feedback: Optional[str] = None  
