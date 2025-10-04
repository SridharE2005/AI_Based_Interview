# backend/routes/mock_interview_chatbot.py
import os
import uuid
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import google.generativeai as genai

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
# ----------------------
@router.post("/finish")
async def finish_interview(data: dict, current_user: dict = Depends(get_current_user)):
    session_id = data.get("sessionId")
    if not session_id:
        raise HTTPException(status_code=400, detail="sessionId is required")

    chat_session_doc = chat_sessions_collection.find_one({"sessionId": session_id})
    if not chat_session_doc:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # Mark end time
    chat_sessions_collection.update_one(
        {"sessionId": session_id},
        {"$set": {"endedAt": datetime.utcnow()}}
    )

    # Compute metrics
    interactions = chat_session_doc.get("interactions", [])
    num_questions = len(interactions)
    total_score = sum(i["score"] for i in interactions)

    num_correct = sum(1 for i in interactions if i["score"] >= 9)
    num_partial = sum(1 for i in interactions if 5 <= i["score"] <= 8)
    num_wrong = sum(1 for i in interactions if i["score"] <= 4)

    overall_score_100 = 0
    if num_questions > 0:
        overall_score_100 = round((total_score / (num_questions * 10)) * 100, 2)

    # Prepare resume_data (conversation logs)
    resume_data = "\n".join(
        [f"Bot: {i['question']}\nUser: {i['answer']}\nFeedback: {i.get('feedback', '')}"
         for i in interactions]
    )

    # Create evaluation prompt
    prompt = f"""
    Based on the following interview conversation between bot and user:

    {resume_data}

    Skip the initial greeting or introductory question and the last closing or wrap-up question.
    Evaluate only the relevant technical or knowledge-based questions in between.

    Summarize the candidate's performance strictly in the following format:

    1. Strengths: [one concise sentence summarizing strengths]
    2. Weakness: [one concise sentence summarizing weaknesses]
    3. Areas for Improvement: [one concise sentence]
    4. Number of Questions Attended: {num_questions}
    5. Number of Correct Answers: {num_correct}
    6. Number of Wrong Answers: {num_wrong}
    7. Score out of 100: {overall_score_100}

    ⚠️ Important Rules:
    - Output must follow the numbering and format above exactly.
    - Each response must be concise and on a single line.
    - Do not include any introductions, explanations, or extra commentary.
    - Output only the evaluation in the specified format.
    """

    # Call Gemini API for evaluation
    model = genai.GenerativeModel("gemini-2.5-flash-lite")
    response = model.generate_content(prompt)
    evaluation_text = response.text.strip() if response and response.text else "Evaluation not available."

    # Save evaluation to DB
    chat_sessions_collection.update_one(
        {"sessionId": session_id},
        {"$set": {
            "overallFeedback": evaluation_text,
            "overallScore": overall_score_100,
            "endedAt": datetime.utcnow()
        }}
    )

    # Return structured evaluation
    return JSONResponse(content={
        "overall_feedback": evaluation_text,
        "overall_score": overall_score_100,
        "questions_attended": num_questions
    })
