from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# ✅ Model for a single question and user's response
class QuestionResponse(BaseModel):
    questionText: str                     # The question text
    optionA: str
    optionB: str
    optionC: str
    optionD: str
    correctAnswer: str                    # Correct option (A/B/C/D)
    userAnswer: Optional[str] = None      # User's selected option (A/B/C/D)
    isCorrect: Optional[bool] = None      # True if correct, False otherwise
    timeTaken: Optional[int] = 0          # Time taken in seconds
    score: Optional[int] = 0              # Score earned for this question
    explanation: Optional[str] = None     # Optional explanation for the question


# ✅ Model for the entire aptitude test session
class AptitudeTestModel(BaseModel):
    userId: str                           # Reference to Users._id
    testId: str                           # UUID for the test session
    questionType: str                     # e.g., Quantitative, Verbal, Reasoning
    difficulty: str                       # Easy, Medium, Hard
    totalQuestions: int                   # Total questions generated
    totalScore: Optional[int] = 0         # Total score obtained
    timePerQuestion: int                  # Allotted time per question (seconds)
    questions: List[QuestionResponse] = []  # List of questions with responses
    startedAt: datetime = Field(default_factory=datetime.utcnow)
    completedAt: Optional[datetime] = None
