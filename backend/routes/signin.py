import base64
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from db import users_collection
from argon2 import PasswordHasher, exceptions as argon2_exceptions
from utils.auth_utils import create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])
ph = PasswordHasher()


class Login(BaseModel):
    email: EmailStr
    password: str


@router.post("/signin")
def signin(user: Login):
    """
    User login route
    Returns JWT token and user data including profile_image (if available)
    """
    # Find user by email
    db_user = users_collection.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Verify password
    try:
        ph.verify(db_user["password"], user.password)
    except argon2_exceptions.VerifyMismatchError:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Create JWT token
    token = create_access_token({"id": str(db_user["_id"]), "email": db_user["email"]})

    # Handle profile image
    # Since profile_image is already stored as a full base64 string, return it directly
    profile_image_base64 = db_user.get("profile_image", None)

    # Prepare user data for response
    user_data = {
        "id": str(db_user.get("_id")),
        "first_name": db_user.get("first_name", ""),
        "last_name": db_user.get("last_name", ""),
        "email": db_user.get("email"),
        "phone_number": db_user.get("phone_number", ""),
        "skills": db_user.get("skills", ""),
        "total_interviews": db_user.get("total_interviews", 0),
        "technical_interview": db_user.get("technical_interview", 0),
        "aptitude_interview": db_user.get("aptitude_interview", 0),
        "technical_scores": db_user.get("technical_scores", []),
        "aptitude_scores": db_user.get("aptitude_scores", []),
        "overall_score": db_user.get("overall_score", 0.0),
        "profile_image": profile_image_base64,  # can be None if not set
        "created_at": db_user.get("created_at"),
    }

    return {
        "access_token": token,
        "token_type": "bearer",
        "message": "Login successful",
        "user": user_data,
    }
