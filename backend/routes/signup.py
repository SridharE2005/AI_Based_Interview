from fastapi import APIRouter, HTTPException, Request
from models.user_model import User  # Your existing User model
from db import users_collection
from argon2 import PasswordHasher
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os, random, smtplib
from email.message import EmailMessage


load_dotenv()

# FastAPI app with CORS


router = APIRouter(prefix="/auth", tags=["Auth"])
ph = PasswordHasher()

# Email config from .env
EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")

# Temporary in-memory OTP storage
otp_storage = {}

# Send OTP email
def send_otp_email(email: str, otp: str):
    msg = EmailMessage()
    msg["Subject"] = "Your OTP for InterviewAI"
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = email
    msg.set_content(f"Your OTP for InterviewAI is: {otp}")

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        smtp.send_message(msg)

# Route: generate OTP and send email
@router.post("/send-otp")
async def send_otp(user: User):
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="User already exists")

    otp = f"{random.randint(100000, 999999)}"
    expiry = datetime.utcnow() + timedelta(minutes=5)

    # Store OTP and user data temporarily
    otp_storage[user.email] = {
        "otp": otp,
        "expiry": expiry,
        "user_data": user.dict()
    }

    send_otp_email(user.email, otp)
    return {"message": f"OTP sent to {user.email}"}

# Route: verify OTP and create user
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

    # Save user to main collection
    user_data = record["user_data"]
    hashed_password = ph.hash(user_data["password"])
    user_data["password"] = hashed_password
    user_data["created_at"] = datetime.utcnow()
    users_collection.insert_one(user_data)

    # Remove OTP from temporary storage
    del otp_storage[email]
    return {"message": "✅ Account verified and created successfully"}

# Include router
