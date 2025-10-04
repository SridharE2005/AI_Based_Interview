from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from db import users_collection
from argon2 import PasswordHasher, exceptions as argon2_exceptions
from utils.auth_utils import create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])
ph = PasswordHasher()

# Pydantic model for login
class Login(BaseModel):
    email: EmailStr
    password: str

# SignIn route
@router.post("/signin")
def signin(user: Login):
    # Check if user exists
    db_user = users_collection.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Verify password
    try:
        ph.verify(db_user["password"], user.password)
    except argon2_exceptions.VerifyMismatchError:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Generate JWT token using auth_utils
    token = create_access_token({"id": str(db_user["_id"]), "email": db_user["email"]})

    # Prepare user data for frontend (exclude password)
    user_data = {
        "id":str(db_user.get("_id")),
        "first_name": db_user.get("first_name"),
        "last_name": db_user.get("last_name"),
        "email": db_user.get("email"),
        "phone_number": db_user.get("phone_number"),
        "skills": db_user.get("skills"),
        "total_interviews": db_user.get("total_interviews"),
        "technical_interview": db_user.get("technical_interview"),
        "aptitude_interview": db_user.get("aptitude_interview"),
        "overall_score": db_user.get("overall_score"),
        "created_at": db_user.get("created_at")
    }

    return {
        "access_token": token,
        "token_type": "bearer",
        "message": "Login successful",
        "user": user_data
    }
