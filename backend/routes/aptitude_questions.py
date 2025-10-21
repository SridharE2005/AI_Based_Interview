from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId
import os, uuid, re
import google.generativeai as genai
import asyncio
from utils.auth_utils import get_current_user
from db import aptitude_collection, users_collection, history_collection
from models.aptitude_model import QuestionResponse

router = APIRouter(prefix="/aptitude", tags=["Aptitude Test"])

# ------------------------------
# Gemini API setup
# ------------------------------
API_KEY = os.getenv("GEMINI_APTITUDE_API")
if not API_KEY:
    raise RuntimeError("GEMINI_APTITUDE_API not found in .env")
genai.configure(api_key=API_KEY)

# ------------------------------
# Pydantic Models
# ------------------------------
class AptitudeTestRequest(BaseModel):
    questionType: str
    difficulty: str
    totalQuestions: int
    timePerQuestion: int
    topics: list[str] = []  # <-- NEW FIELD for topic-based generation

class AnswerSubmitRequest(BaseModel):
    testId: str
    questionText: str
    optionA: str
    optionB: str
    optionC: str
    optionD: str
    correctAnswer: str
    explanation: str
    selectedOption: str
    timeTaken: int

# ------------------------------
# Helper: Generate questions from selected topics
# ------------------------------
def generate_questions_by_topics(question_type: str, difficulty: str, topics: list[str], total_questions: int):
    model = genai.GenerativeModel("gemini-2.5-flash-lite")

    # Handle empty topics gracefully
    topics_str = ", ".join(topics) if topics else "general aptitude topics"

    # Improved prompt for stricter topic and difficulty control
    prompt = f"""
    You are an expert aptitude test question generator.

    Generate exactly {total_questions} multiple-choice questions of **{difficulty}** difficulty level 
    from the "{question_type}" category. 
    The questions must be **strictly based only on the following topics**: {topics_str}.
    Do not include questions from any other topic.

    Each question must be unique, logically valid, and appropriately challenging for the specified difficulty.
    
    Format each question strictly as follows (no numbering, markdown, or extra text):

    Q: <question text>
    A) <option A>
    B) <option B>
    C) <option C>
    D) <option D>
    Answer: <correct option letter>
    Explanation: <short explanation>

    Example:
    Q: What is the value of x if 2x + 3 = 9?
    A) 2
    B) 3
    C) 4
    D) 5
    Answer: C
    Explanation: 2x + 3 = 9 → 2x = 6 → x = 3.
    """

    try:
        response = model.generate_content(prompt)
        raw_text = response.text.strip() if response and response.text else None
        if not raw_text:
            return []

        # Split questions properly
        question_blocks = re.split(r"(?=Q:)", raw_text)
        seen = set()
        questions = []

        for block in question_blocks:
            q = re.search(r"Q:\s*(.*)", block)
            a = re.search(r"A\)\s*(.*)", block)
            b = re.search(r"B\)\s*(.*)", block)
            c = re.search(r"C\)\s*(.*)", block)
            d = re.search(r"D\)\s*(.*)", block)
            ans = re.search(r"Answer:\s*([A-Da-d])", block)
            exp = re.search(r"Explanation:\s*(.*)", block)

            if q and a and b and c and d and ans:
                text = q.group(1).strip()
                if text in seen:
                    continue
                seen.add(text)
                questions.append(QuestionResponse(
                    questionText=text,
                    optionA=a.group(1).strip(),
                    optionB=b.group(1).strip(),
                    optionC=c.group(1).strip(),
                    optionD=d.group(1).strip(),
                    correctAnswer=ans.group(1).upper(),
                    explanation=exp.group(1).strip() if exp else None
                ))

        return questions

    except Exception as e:
        print("Error generating topic questions:", e)
        return []


# ------------------------------
# Helper: Calculate dynamic score
# ------------------------------
def calculate_score(is_correct: bool, time_taken: int, time_per_question: int) -> int:
    if is_correct:
        time_ratio = time_taken / time_per_question
        if time_ratio <= 0.5:
            return 9 + int((0.5 - time_ratio) * 2)
        elif time_ratio <= 0.8:
            return 6 + int((0.8 - time_ratio) * 10 / 3)
        else:
            return 5
    else:
        return max(1, min(3, 3 - int(time_taken / time_per_question * 2)))

# ------------------------------
# Route: Create Test
# ------------------------------
@router.post("/create-test")
async def create_aptitude_test(request: AptitudeTestRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid user")

    test_id = str(uuid.uuid4())

    # Generate questions with selected topics
    questions = await asyncio.to_thread(
        generate_questions_by_topics,
        request.questionType,
        request.difficulty,
        request.topics,
        request.totalQuestions
    )

    if not questions:
        raise HTTPException(status_code=500, detail="Failed to generate questions")

    aptitude_collection.insert_one({
        "userId": user_id,
        "testId": test_id,
        "questionType": request.questionType,
        "difficulty": request.difficulty,
        "totalQuestions": len(questions),
        "timePerQuestion": request.timePerQuestion,
        "questions": [],
        "totalScore": 0,
        "maxPossibleScore": request.totalQuestions * 10,
        "startedAt": datetime.utcnow(),
        "completedAt": None
    })

    return JSONResponse({
        "message": "Test created",
        "testId": test_id,
        "questions": [q.dict() for q in questions]
    })

# ------------------------------
# Route: Submit Answer
# ------------------------------
@router.post("/submit-answer")
async def submit_answer(payload: AnswerSubmitRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid user")

    test_data = aptitude_collection.find_one({"testId": payload.testId, "userId": user_id})
    if not test_data:
        raise HTTPException(status_code=404, detail="Test not found")

    is_correct = payload.selectedOption.upper() == payload.correctAnswer.upper()
    time_per_question = test_data.get("timePerQuestion", payload.timeTaken)
    raw_score = calculate_score(is_correct, payload.timeTaken, time_per_question)

    question_obj = QuestionResponse(
        questionText=payload.questionText,
        optionA=payload.optionA,
        optionB=payload.optionB,
        optionC=payload.optionC,
        optionD=payload.optionD,
        correctAnswer=payload.correctAnswer.upper(),
        userAnswer=payload.selectedOption.upper(),
        isCorrect=is_correct,
        timeTaken=payload.timeTaken,
        score=raw_score,
        explanation=payload.explanation
    )

    aptitude_collection.update_one(
        {"_id": test_data["_id"], "questions.questionText": {"$ne": payload.questionText}},
        {"$push": {"questions": question_obj.dict()}}
    )

    updated_test = aptitude_collection.find_one({"_id": test_data["_id"]})
    all_scores = [q.get("score", 0) for q in updated_test.get("questions", [])]
    total_questions = test_data.get("totalQuestions", 1)
    total_score_percentage = round(sum(all_scores) * 100 / (10 * total_questions), 2)

    aptitude_collection.update_one(
        {"_id": test_data["_id"]},
        {"$set": {"totalScore": total_score_percentage}}
    )

    return JSONResponse({
        "message": "Answer recorded",
        "isCorrect": is_correct,
        "score": raw_score,
        "totalScore": total_score_percentage
    })

# ------------------------------
# Route: Complete Test
# ------------------------------
@router.post("/complete-test/{test_id}")
async def complete_aptitude_test(test_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid user")

    test_data = aptitude_collection.find_one({"testId": test_id, "userId": user_id})
    if not test_data:
        raise HTTPException(status_code=404, detail="Test not found")

    aptitude_collection.update_one(
        {"_id": test_data["_id"]},
        {"$set": {"completedAt": datetime.utcnow()}}
    )

    aptitude_score = test_data.get("totalScore", 0)
    user_data = users_collection.find_one({"_id": ObjectId(user_id)})

    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")

    updated_aptitude_scores = user_data.get("aptitude_scores", [])
    updated_aptitude_scores.append(aptitude_score)

    all_scores = updated_aptitude_scores + user_data.get("technical_scores", [])
    overall_score = round(sum(all_scores) / len(all_scores), 2) if all_scores else 0

    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$inc": {"total_interviews": 1, "aptitude_interview": 1},
            "$set": {"aptitude_scores": updated_aptitude_scores, "overall_score": overall_score}
        }
    )

    history_collection.insert_one({
        "userId": user_id,
        "interviewType": "Aptitude",
        "score": aptitude_score,
        "timestamp": datetime.utcnow(),
        "feedback": None
    })

    return JSONResponse({
        "message": "Aptitude test completed",
        "aptitudeScore": aptitude_score,
        "overallScore": overall_score
    })
