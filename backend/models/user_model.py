from pydantic import BaseModel, EmailStr
from typing import Optional

class User(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: str
    password: str
    total_interviews: int = 0
    skills: str = ""  # You can later change to List[str] if needed
    technical_interview: Optional[int] = None
    aptitude_interview: Optional[int] = None
    overall_score: Optional[float] = None
