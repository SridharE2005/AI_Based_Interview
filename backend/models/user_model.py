from pydantic import BaseModel, EmailStr
from typing import Optional, List


class ProfileImage(BaseModel):
    data: Optional[bytes] = None        # Raw binary data (stored as Buffer in MongoDB)
    contentType: Optional[str] = None   # e.g. "image/jpeg", "image/png"


class User(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: str
    password: str
    total_interviews: int = 0
    skills: str = ""
    technical_interview: Optional[int] = 0
    aptitude_interview: Optional[int] = 0
    technical_scores: List[float] = []   # stores multiple technical interview scores
    aptitude_scores: List[float] = []    # stores multiple aptitude interview scores
    overall_score: Optional[float] = 0.0
    profile_image: Optional[ProfileImage] = None  # Nested image object
