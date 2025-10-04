from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from db import users_collection
from argon2 import PasswordHasher
from random import randint
from datetime import datetime, timedelta
import smtplib, os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()
router = APIRouter(prefix="/forgot-password", tags=["Forgot Password"])
ph = PasswordHasher()

# Temporary in-memory OTP store: {email: {"otp": 123456, "expires_at": datetime}}
otp_store = {}

# Pydantic models
class EmailRequest(BaseModel):
    email_id: EmailStr

class OTPRequest(BaseModel):
    email_id: EmailStr
    otp: str

class ResetPasswordRequest(BaseModel):
    email_id: EmailStr
    password: str

# Email sending function
def send_email(recipient: str, subject: str, body: str):
    sender_email = os.getenv("EMAIL_ADDRESS")
    sender_pass = os.getenv("EMAIL_PASSWORD")
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))

    msg = MIMEMultipart()
    msg["From"] = sender_email
    msg["To"] = recipient
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_pass)
        server.sendmail(sender_email, recipient, msg.as_string())
        server.quit()
    except Exception as e:
        print("Failed to send email:", e)
        raise HTTPException(status_code=500, detail="Failed to send OTP email")

# 1️⃣ Send OTP
@router.post("/send-otp")
def send_otp(data: EmailRequest):
    user = users_collection.find_one({"email": data.email_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    otp = str(randint(100000, 999999))
    otp_store[data.email_id] = {
        "otp": otp,
        "expires_at": datetime.utcnow() + timedelta(minutes=5)
    }

    # Send OTP via email
    subject = "Your OTP for Password Reset"
    body = f"Hello {user.get('first_name', '')},\n\nYour OTP for resetting your password is: {otp}\nIt will expire in 5 minutes.\n\nIf you didn't request this, please ignore this email."
    send_email(data.email_id, subject, body)

    return {"success": True, "message": "OTP sent successfully"}

# 2️⃣ Verify OTP
@router.post("/verify-otp")
def verify_otp(data: OTPRequest):
    record = otp_store.get(data.email_id)
    if not record:
        raise HTTPException(status_code=400, detail="No OTP requested for this email")

    if datetime.utcnow() > record["expires_at"]:
        otp_store.pop(data.email_id, None)
        raise HTTPException(status_code=400, detail="OTP expired")

    if data.otp != record["otp"]:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    return {"success": True, "message": "OTP verified"}

# 3️⃣ Reset Password
@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest):
    user = users_collection.find_one({"email": data.email_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Hash new password
    hashed_password = ph.hash(data.password)

    users_collection.update_one(
        {"email": data.email_id},
        {"$set": {"password": hashed_password}}
    )

    # Remove OTP from store after successful reset
    otp_store.pop(data.email_id, None)

    return {"success": True, "message": "Password reset successfully"}
