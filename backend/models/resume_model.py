from pydantic import BaseModel, Field # type: ignore
from typing import Optional, Literal
from datetime import datetime

class ResumeStorage(BaseModel):
    userId: str  
    fileName: str 
    fileType: Literal["pdf", "doc", "docx"]  
    fileData: bytes 
    uploadedAt: datetime = Field(default_factory=datetime.utcnow)  
    description: Optional[str] = None  
