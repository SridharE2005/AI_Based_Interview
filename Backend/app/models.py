from pydantic import BaseModel
from typing import List

class QuestionRequest(BaseModel):
    category: str
    topic: str
    difficulty: str = "easy"

class AnswerSubmission(BaseModel):
    question_id: str
    selected_option: str
    user_id: str  # optional, can be anonymous

class ResultResponse(BaseModel):
    total_questions: int
    correct_answers: int
    score: int
    strengths: dict
    weaknesses: dict
    improvements: List[str]
