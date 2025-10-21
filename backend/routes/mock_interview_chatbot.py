# backend/routes/mock_interview_chatbot.py
import os
import uuid
from datetime import datetime
from bson import ObjectId # type: ignore
from fastapi import APIRouter, Depends, HTTPException # type: ignore
from fastapi.responses import JSONResponse # type: ignore
from dotenv import load_dotenv # type: ignore
import google.generativeai as genai # type: ignore
from models.history_model import History
from db import history_collection

from utils.auth_utils import get_current_user
from db import users_collection, chat_sessions_collection
from models.chat_session import Chat, Interaction

load_dotenv()

router = APIRouter(prefix="/mock-interview", tags=["Mock Interview Chatbot"])

API_KEY = os.getenv("GEMINI_MOCK_API_KEY")
genai.configure(api_key=API_KEY)

generated_questions = []  # global question memory


# ----------------------
# Generate Technical Question
# ----------------------
def generate_technical_question(skills_text: str):
    global generated_questions
    model = genai.GenerativeModel("gemini-2.5-flash-lite")

    prompt = f"""
    Based on the following resume and detected skills:
{skills_text}

🎯 Task:
Generate exactly **one** unique and relevant **technical interview question** for the candidate.

⚙️ Rules:
1. Randomly decide between:
   - **Theory question (60% probability)**
   - **Programming question (40% probability)**
2. If it’s a **theory question**:
   - Ask a short and simple conceptual question based on the candidate’s skills.
   - Example: "What is polymorphism in Java?" or "Explain the use of lists in Python."
3. If it’s a **programming question**:
   - Pick one of these languages based on the candidate’s skills: 
     Python, Java, C++, JavaScript, C, C#, PHP, Ruby, Swift, Kotlin, Go, TypeScript.
   - Ask a simple coding task like:
     Fibonacci series, factorial, palindrome, Armstrong number, prime check, sum of digits, reverse a string, etc.
   - Example: "Write a Python program to check if a number is an Armstrong number."
4. Do not repeat previous questions: {generated_questions}
5. Output **only the question text** — no explanations, no extra formatting, no greetings.

🧠 The goal:
Generate simple, skill-relevant questions that feel like an actual entry-level technical interview.
    """

    for _ in range(10):
        response = model.generate_content(prompt)
        question = response.text.strip() if response and response.text else ""
        question = question.split("\n")[0]
        if question and question not in generated_questions:
            generated_questions.append(question)
            return question
    return "No more unique technical questions available."


# ----------------------
# GET Next Question / Start Session
# ----------------------
@router.get("/")
async def get_next_question(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid user data in token")

    user_doc = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user_doc or "skills" not in user_doc:
        raise HTTPException(status_code=404, detail="User or skills not found")

    skills_text = user_doc["skills"]
    question = generate_technical_question(skills_text)

    # Create a new chat session
    session_id = str(uuid.uuid4())
    chat_session = Chat(
        userId=user_id,
        sessionId=session_id,
        startedAt=datetime.utcnow(),
        interactions=[]
    )
    chat_sessions_collection.insert_one(chat_session.dict())

    return JSONResponse(content={"question": question, "sessionId": session_id})


# ----------------------
# Evaluate Answer
# ----------------------
@router.post("/evaluate")
async def evaluate_answer(data: dict, current_user: dict = Depends(get_current_user)):
    question = data.get("question")
    answer = data.get("answer")
    session_id = data.get("sessionId")
    skip_feedback = data.get("skip_feedback", False)

    if not question or not answer or not session_id:
        raise HTTPException(status_code=400, detail="Question, answer, and sessionId are required")

    chat_session_doc = chat_sessions_collection.find_one({"sessionId": session_id})
    if not chat_session_doc:
        raise HTTPException(status_code=404, detail="Chat session not found")

    feedback = ""
    score = 0

    if not skip_feedback:
        model = genai.GenerativeModel("gemini-2.5-flash-lite")
        prompt = f"""
You are acting as a **real human interviewer** conducting a mock technical interview.

Interview Question: {question}  
Candidate's Answer: {answer}  

Your behavior should feel natural and human — not robotic or overly formal.

---

### 🟢 If the user wants to know the answer:
- If the user's answer includes phrases like "give the answer", "answer", "please tell me", "tell me what it is", or similar,
  you must provide **only the correct, actual answer** to the interview question.
- Do **not** include any extra text, greetings, encouragement, or filler.

Example:
[Actual correct answer]

---

### 🟡 If the user wants to skip the question:
- If the user's answer includes phrases like "skip", "next", "move on", or similar, 
  respond naturally with one of these:
  - "Okay, let’s skip this one and move to the next question."
  - "Alright, no worries, let’s move on to the next question."
  - "Got it, we’ll skip this and continue."
- Do **not** evaluate or give the answer for skipped questions.

---

### 🟢 If the user's answer is mostly correct:
Respond positively and naturally with one of these:
- "That’s correct, well done!"
- "Excellent answer!"
- "Great job, you’re absolutely right!"
- "Perfect, you nailed it!"
- "Nice work, that’s right!"

---

### 🔴 If the user's answer is mostly wrong:
Be kind and encouraging, while still giving the correct answer clearly.

Do **not** skip the correct answer or ask to move on — always provide it directly.

Respond using a short, natural, human-like phrase followed by the correct answer.

Example responses:
- "Good try! The correct answer is: [actual correct answer]."
- "Nice effort, but the correct answer is: [actual correct answer]."
- "You’re close, but the correct answer is: [actual correct answer]."
- "Don’t worry, you’ll get it next time! The correct answer is: [actual correct answer]."

---

### ⚙️ Response Rules:
- Use a human-like, conversational tone.
- Keep responses concise (2–3 sentences maximum).
- Do not include multiple questions or unrelated comments.
- Never say “AI” or “assistant” — act fully like a human interviewer giving feedback.

---

### 🎯 Evaluation Goals:
In addition to feedback, you must also assign a **numerical score (1–10)** based on how accurate the answer is.

Scoring Guide:
- **1–4 → Wrong or mostly incorrect**
- **5–8 → Partially correct**
- **9–10 → Mostly correct or perfect**

---

### 🧭 Output Format (STRICT):
Feedback: <your human-like feedback>
Score: <number between 1 and 10>
"""
        response = model.generate_content(prompt)
        full_response = response.text.strip() if response and response.text else "Feedback not available."

        # Extract score safely
        feedback_lines = full_response.splitlines()
        feedback_text = []
        extracted_score = 0
        for line in feedback_lines:
            if line.strip().lower().startswith("score:"):
                try:
                    extracted_score = int(line.split(":")[1].strip())
                except ValueError:
                    extracted_score = 0
            else:
                feedback_text.append(line.strip())

        feedback = " ".join(feedback_text).replace("Feedback:", "").strip()
        score = max(1, min(extracted_score, 10)) if extracted_score else 0

    # Save interaction
    interaction = Interaction(
        question=question,
        answer=answer,
        feedback=feedback,
        score=score
    )
    chat_sessions_collection.update_one(
        {"sessionId": session_id},
        {"$push": {"interactions": interaction.dict()},
         "$inc": {"overallScore": score}}
    )

    # Generate next question
    user_doc = users_collection.find_one({"_id": ObjectId(current_user.get("id"))})
    skills_text = user_doc.get("skills", "")
    next_question = generate_technical_question(skills_text)

    return JSONResponse(content={
        "feedback": feedback,
        "score": score,
        "next_question": next_question
    })


# ----------------------
# Finish Interview
@router.post("/finish")
async def finish_interview(data: dict, current_user: dict = Depends(get_current_user)):
    session_id = data.get("sessionId")
    if not session_id:
        raise HTTPException(status_code=400, detail="sessionId is required")

    chat_session_doc = chat_sessions_collection.find_one({"sessionId": session_id})
    if not chat_session_doc:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # Mark end time
    ended_at = datetime.utcnow()
    chat_sessions_collection.update_one(
        {"sessionId": session_id},
        {"$set": {"endedAt": ended_at}}
    )

    # Compute metrics
    interactions = chat_session_doc.get("interactions", [])
    num_questions = len(interactions)
    total_score = sum(i.get("score", 0) for i in interactions)
    overall_score_100 = round((total_score / (num_questions * 10)) * 100, 2) if num_questions > 0 else 0

    # Prepare conversation logs
    resume_data = "\n".join(
        [f"Bot: {i['question']}\nUser: {i['answer']}\nFeedback: {i.get('feedback', '')}" for i in interactions]
    )

    # Generate evaluation prompt for Gemini
    prompt = f"""
Based on the following interview conversation between bot and user:

{resume_data}

Skip the initial greeting or closing questions.
Evaluate only relevant technical/knowledge-based questions.

Summarize candidate performance strictly in the following format:

1. Strengths: Provide 2-3 concise sentences summarizing the candidate's key strengths.
2. Weaknesses: Provide 2-3 concise sentences summarizing the candidate's weaknesses or areas where improvement is needed.
3. Overall Feedback: Provide 2-3 concise sentences giving overall feedback, including suggestions for improvement if any.

⚠️ Important Rules:
- Each section (Strengths, Weaknesses, Overall Feedback) should be 2-3 sentences.
- Do not add any extra commentary or numbering beyond the specified format.
- Output must be clear, structured, and ready to parse.
    """

    # Call Gemini API
    model = genai.GenerativeModel("gemini-2.5-flash-lite")
    response = model.generate_content(prompt)
    evaluation_text = response.text.strip() if response and response.text else ""

    # Parse multi-line Gemini output into fields
    strengths_lines, weaknesses_lines, feedback_lines = [], [], []
    current_field = None

    for line in evaluation_text.split("\n"):
        line = line.strip()
        if line.startswith("1. Strengths:"):
            current_field = "strengths"
            strengths_lines.append(line.replace("1. Strengths:", "").strip())
        elif line.startswith("2. Weaknesses:"):
            current_field = "weaknesses"
            weaknesses_lines.append(line.replace("2. Weaknesses:", "").strip())
        elif line.startswith("3. Overall Feedback:"):
            current_field = "feedback"
            feedback_lines.append(line.replace("3. Overall Feedback:", "").strip())
        else:
            # Append remaining lines to the current field
            if current_field == "strengths":
                strengths_lines.append(line)
            elif current_field == "weaknesses":
                weaknesses_lines.append(line)
            elif current_field == "feedback":
                feedback_lines.append(line)

    # Join lines for each field
    strengths = " ".join(strengths_lines).strip() or "Not available"
    weaknesses = " ".join(weaknesses_lines).strip() or "Not available"
    overall_feedback = " ".join(feedback_lines).strip() or "Not available"

    # Save evaluation to chat session
    chat_sessions_collection.update_one(
        {"sessionId": session_id},
        {"$set": {
            "overallFeedback": overall_feedback,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "overallScore": overall_score_100,
            "endedAt": ended_at
        }}
    )

    # Add entry to History
    history_entry = History(
        userId=chat_session_doc["userId"],
        interviewType="Technical",
        score=overall_score_100,
        feedback=overall_feedback
    )
    history_collection.insert_one(history_entry.dict())

    # Update user document
    user_id = ObjectId(current_user.get("id"))
    user_doc = users_collection.find_one({"_id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    technical_scores = user_doc.get("technical_scores", [])
    technical_scores.append(overall_score_100)
    technical_interview = (user_doc.get("technical_interview") or 0) + 1
    total_interviews = (user_doc.get("total_interviews") or 0) + 1

    users_collection.update_one(
        {"_id": user_id},
        {"$set": {
            "technical_scores": technical_scores,
            "technical_interview": technical_interview,
            "total_interviews": total_interviews
        }}
    )

    # Return structured response ready for frontend
    return JSONResponse(content={
        "overall_score": int(overall_score_100),  # convert to int
        "overall_feedback": overall_feedback,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "questions_attended": num_questions
    })