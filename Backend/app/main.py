# Backend/app/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
import os
from dotenv import load_dotenv
from datetime import datetime, timezone
import uuid
from typing import Optional, List, Any, Dict

from app.ai_client import generate_text  # updated Gemini client (see ai_client.py)

load_dotenv()

# Config
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "aptitudeAI")
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
questions_collection = db["questions"]      # cached/generated questions
answers_collection = db["user_answers"]     # user answers / history

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# ---- Request models ----
class QuestionRequest(BaseModel):
    category: str
    topic: Optional[str] = "General"
    difficulty: Optional[str] = "easy"  # "easy" | "medium" | "hard"
    user_id: Optional[str] = None
    previous_questions: Optional[List[str]] = None  # texts to avoid repeating

class AnswerRequest(BaseModel):
    question_id: str
    selected_index: int
    category: str
    topic: Optional[str] = "General"
    user_id: Optional[str] = None

# ---- Helpers ----
def compute_adaptive_difficulty(category: str, user_id: Optional[str], requested: str) -> str:
    """Compute next difficulty ('easy'|'medium'|'hard') using recent answers."""
    query = {"category": category}
    if user_id:
        query["user_id"] = user_id

    recent = list(answers_collection.find(query).sort("timestamp", -1).limit(10))
    if not recent or len(recent) < 3:
        return requested or "easy"

    correct = sum(1 for r in recent if r.get("is_correct"))
    accuracy = correct / len(recent)
    if accuracy >= 0.8:
        return "hard"
    elif accuracy >= 0.5:
        return "medium"
    else:
        return "easy"

def sanitize_category(cat: str) -> str:
    return (cat or "").strip()

def find_cached_question(category: str, topic: str, difficulty: str, previous_questions: Optional[List[str]]):
    """Return a not-often-used cached question matching category/topic/difficulty if available."""
    q = {
        "category": category,
        "topic": topic,
        "difficulty": difficulty
    }
    # try to find questions with used_count < 3 that are not in previous_questions
    if previous_questions:
        cursor = questions_collection.find({
            **q,
            "used_count": {"$lt": 3},
            "question_text": {"$nin": previous_questions}
        }).sort("created_at", 1)
    else:
        cursor = questions_collection.find({**q, "used_count": {"$lt": 3}}).sort("created_at", 1)

    # pick the earliest created (least used) question
    cand = cursor.limit(1)
    items = list(cand)
    return items[0] if items else None

# ---- Endpoints ----

@app.post("/get_question")
def get_question(req: QuestionRequest):
    category = sanitize_category(req.category)
    topic = (req.topic or "General").strip()
    requested_difficulty = (req.difficulty or "easy").lower()
    user_id = req.user_id or None
    previous = req.previous_questions or []

    if not category:
        raise HTTPException(status_code=400, detail="category is required")

    # determine adaptive difficulty
    difficulty = compute_adaptive_difficulty(category, user_id, requested_difficulty)

    # 1) Try to find cached question (avoid repetition)
    cached = find_cached_question(category, topic, difficulty, previous)
    if cached:
        # increment used_count atomically
        questions_collection.update_one({"_id": cached["_id"]}, {"$inc": {"used_count": 1}})
        return {
            "question_id": cached["question_id"],
            "question": cached["question_text"],
            "options": cached["options"],
            "difficulty": cached["difficulty"],
            "subtopic": cached.get("subtopic", "General")
        }

    # 2) No cached candidate — generate using Gemini
    # Pass the previous question texts to the generator so it won't repeat
    try:
        gen_result = generate_text(category, topic, difficulty, previous_questions=previous)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")

    if not gen_result or "error" in gen_result:
        # return a safe fallback question (guaranteed valid)
        fallback_question_text = "What is 5 + 3?"
        fallback_options = ["5", "6", "7", "8"]
        fallback_correct_index = 3
        doc = {
            "question_id": str(uuid.uuid4()),
            "category": category,
            "topic": topic,
            "difficulty": difficulty,
            "question_text": fallback_question_text,
            "options": fallback_options,
            "correct_index": fallback_correct_index,
            "correct_answer_text": fallback_options[fallback_correct_index],
            "explanation": "5 + 3 = 8",
            "subtopic": "General",
            "created_at": datetime.now(timezone.utc),
            "used_count": 1
        }
        questions_collection.insert_one(doc)
        return {
            "question_id": doc["question_id"],
            "question": doc["question_text"],
            "options": doc["options"],
            "difficulty": doc["difficulty"],
            "subtopic": doc["subtopic"]
        }

    # Validate returned fields from generate_text()
    required_keys = ["question", "options", "correct_index", "correct_answer_text", "explanation"]
    for k in required_keys:
        if k not in gen_result:
            raise HTTPException(status_code=500, detail=f"AI returned incomplete data: missing {k}")

    # Store generated question in DB (avoid duplicates)
    question_text = gen_result["question"].strip()
    existing = questions_collection.find_one({"question_text": question_text})
    if existing:
        # increment used_count and return existing
        questions_collection.update_one({"_id": existing["_id"]}, {"$inc": {"used_count": 1}})
        return {
            "question_id": existing["question_id"],
            "question": existing["question_text"],
            "options": existing["options"],
            "difficulty": existing["difficulty"],
            "subtopic": existing.get("subtopic", "General")
        }

    # Insert new question doc
    doc = {
        "question_id": str(uuid.uuid4()),
        "category": category,
        "topic": topic,
        "difficulty": difficulty,
        "question_text": question_text,
        "options": [str(o).strip() for o in gen_result["options"]],
        "correct_index": int(gen_result["correct_index"]),
        "correct_answer_text": str(gen_result["correct_answer_text"]).strip(),
        "explanation": str(gen_result["explanation"]).strip(),
        "subtopic": gen_result.get("subtopic", "General"),
        "created_at": datetime.now(timezone.utc),
        "used_count": 1
    }
    questions_collection.insert_one(doc)

    return {
        "question_id": doc["question_id"],
        "question": doc["question_text"],
        "options": doc["options"],
        "difficulty": doc["difficulty"],
        "subtopic": doc["subtopic"]
    }


@app.post("/submit_answer")
def submit_answer(req: AnswerRequest):
    # Validate
    question_doc = questions_collection.find_one({"question_id": req.question_id})
    if not question_doc:
        raise HTTPException(status_code=404, detail="Question not found")

    sel_idx = int(req.selected_index)
    if sel_idx < 0 or sel_idx >= len(question_doc["options"]):
        raise HTTPException(status_code=400, detail="selected_index out of range")

    correct_idx = int(question_doc["correct_index"])
    is_correct = (sel_idx == correct_idx)

    # Store answer
    record = {
        "question_id": req.question_id,
        "user_id": req.user_id or None,
        "category": req.category,
        "topic": req.topic,
        "selected_index": sel_idx,
        "correct_index": correct_idx,
        "is_correct": bool(is_correct),
        "question_text": question_doc["question_text"],
        "options": question_doc["options"],
        "correct_answer_text": question_doc["correct_answer_text"],
        "explanation": question_doc["explanation"],
        "timestamp": datetime.now(timezone.utc)
    }
    answers_collection.insert_one(record)

    # Return result (do not hide anything — the frontend should show the answer & explanation inline)
    return {
        "is_correct": is_correct,
        "correct_answer_text": question_doc["correct_answer_text"],
        "explanation": question_doc["explanation"]
    }


@app.get("/final_report/{category}")
def final_report(category: str, user_id: Optional[str] = None):
    query = {"category": category}
    if user_id:
        query["user_id"] = user_id

    answers = list(answers_collection.find(query))
    total = len(answers)
    correct = sum(1 for a in answers if a.get("is_correct"))
    score_percent = round((correct / total * 100), 2) if total else 0.0

    # strengths/weaknesses by subtopic (simple)
    by_topic = {}
    for a in answers:
        t = a.get("topic", "General")
        rec = by_topic.setdefault(t, {"total": 0, "correct": 0})
        rec["total"] += 1
        if a.get("is_correct"):
            rec["correct"] += 1

    strengths = [t for t, v in by_topic.items() if v["total"] >= 2 and (v["correct"] / v["total"]) >= 0.75]
    weaknesses = [t for t, v in by_topic.items() if v["total"] >= 2 and (v["correct"] / v["total"]) <= 0.5]
    areas_of_improvement = weaknesses  # simple mapping

    return {
        "total_questions": total,
        "correct_answers": correct,
        "score_percent": score_percent,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "areas_of_improvement": areas_of_improvement
    }
