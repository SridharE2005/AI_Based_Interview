from fastapi import APIRouter, HTTPException, UploadFile, Form, Request
from models.user_model import User
from db import users_collection
from argon2 import PasswordHasher
from datetime import datetime, timedelta
from dotenv import load_dotenv
from email.message import EmailMessage
import os, random, smtplib, base64


load_dotenv()
router = APIRouter(prefix="/auth", tags=["Auth"])
ph = PasswordHasher()

EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")

otp_storage = {}

def send_otp_email(email: str, otp: str):
    msg = EmailMessage()
    msg["Subject"] = "Your OTP for InterviewAI"
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = email
    msg.set_content(f"Your OTP for InterviewAI is: {otp}")

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        smtp.send_message(msg)


@router.post("/send-otp")
async def send_otp(
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    phone_number: str = Form(...),
    password: str = Form(...),
    total_interviews: int = Form(0),
    skills: str = Form(""),
    technical_interview: int = Form(0),
    aptitude_interview: int = Form(0),
    overall_score: float = Form(0.0),
    profile_image: UploadFile = None
):
    if users_collection.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="User already exists")

    # Convert image to base64 if uploaded
    image_data = None
    if profile_image:
        image_bytes = await profile_image.read()
        encoded_image = base64.b64encode(image_bytes).decode("utf-8")
        image_data = {
            "data": encoded_image,
            "contentType": profile_image.content_type
        }

    otp = f"{random.randint(100000, 999999)}"
    expiry = datetime.utcnow() + timedelta(minutes=5)

    user_data = {
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "phone_number": phone_number,
        "password": password,
        "total_interviews": total_interviews,
        "skills": skills,
        "technical_interview": technical_interview,
        "aptitude_interview": aptitude_interview,
        "overall_score": overall_score,
        "technical_scores": [],
        "aptitude_scores": [],
        "profile_image": image_data
    }

    otp_storage[email] = {
        "otp": otp,
        "expiry": expiry,
        "user_data": user_data
    }

    send_otp_email(email, otp)
    return {"message": f"OTP sent to {email}"}


@router.post("/verify-otp")
async def verify_otp(request: Request):
    data = await request.json()
    email = data.get("email")
    otp = data.get("otp")

    if not email or not otp:
        raise HTTPException(status_code=400, detail="Email and OTP required")

    record = otp_storage.get(email)
    if not record:
        raise HTTPException(status_code=400, detail="No OTP found")
    if record["otp"] != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    if datetime.utcnow() > record["expiry"]:
        del otp_storage[email]
        raise HTTPException(status_code=400, detail="OTP expired")

    user_data = record["user_data"]
    hashed_password = ph.hash(user_data["password"])
    user_data["password"] = hashed_password
    user_data["created_at"] = datetime.utcnow()

    users_collection.insert_one(user_data)
    del otp_storage[email]

    return {"message": "✅ Account verified and created successfully"}
