from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, EmailStr
from bson import ObjectId
from db import users_collection  # your MongoDB collection
from argon2 import PasswordHasher
import base64

router = APIRouter(prefix="/settings", tags=["Settings"])
ph = PasswordHasher()


# -------------------- MODELS --------------------
class UpdateProfile(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: str


class ChangePassword(BaseModel):
    currentPassword: str
    newPassword: str


# -------------------- ROUTES --------------------
@router.put("/{user_id}")
async def update_profile(user_id: str, profile: UpdateProfile):
    """Update user profile fields"""
    db_user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update only the specified fields, keep others intact
    update_data = profile.dict()
    users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})

    # Return updated user with profile_image in base64
    updated_user = users_collection.find_one({"_id": ObjectId(user_id)})
    profile_image_base64 = updated_user.get("profile_image")
    if profile_image_base64:
        profile_image_base64 = profile_image_base64  # already stored as base64 string

    response_user = {
        "id": str(updated_user["_id"]),
        "first_name": updated_user.get("first_name", ""),
        "last_name": updated_user.get("last_name", ""),
        "email": updated_user.get("email", ""),
        "phone_number": updated_user.get("phone_number", ""),
        "skills": updated_user.get("skills", ""),
        "total_interviews": updated_user.get("total_interviews", 0),
        "technical_interview": updated_user.get("technical_interview", 0),
        "aptitude_interview": updated_user.get("aptitude_interview", 0),
        "technical_scores": updated_user.get("technical_scores", []),
        "aptitude_scores": updated_user.get("aptitude_scores", []),
        "overall_score": updated_user.get("overall_score", 0),
        "profile_image": profile_image_base64,
        "created_at": updated_user.get("created_at"),
    }

    return {"success": True, "user": response_user}


@router.post("/{user_id}")
async def update_profile_picture(user_id: str, file: UploadFile = File(...)):
    db_user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    image_bytes = await file.read()
    encoded_string = base64.b64encode(image_bytes).decode("utf-8")
    content_type = file.content_type or "image/jpeg"
    profile_image_base64 = f"data:{content_type};base64,{encoded_string}"

    users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": {"profile_image": profile_image_base64}})

    return {"success": True, "profile_image": profile_image_base64}



@router.post("/change-password/{user_id}")
async def change_password(user_id: str, data: ChangePassword):
    """Change password"""
    db_user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify current password
    try:
        ph.verify(db_user["password"], data.currentPassword)
    except Exception:
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    # Hash new password and update
    new_hashed = ph.hash(data.newPassword)
    users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": {"password": new_hashed}})

    return {"success": True, "message": "Password changed successfully"}
