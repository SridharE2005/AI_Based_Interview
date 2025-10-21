from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from bson import ObjectId
from db import users_collection, history_collection
from utils.auth_utils import get_current_user

router = APIRouter(prefix="/user", tags=["User"])

@router.get("/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    user_id = ObjectId(current_user.get("id"))

    # Fetch user document
    user_doc = users_collection.find_one({"_id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    # Compute total interviews (sum of technical + aptitude)
    total_interviews = user_doc.get("total_interviews", 0)
    technical_interview = user_doc.get("technical_interview", 0)
    aptitude_interview = user_doc.get("aptitude_interview", 0)
    technical_scores = user_doc.get("technical_scores", [])
    aptitude_scores = user_doc.get("aptitude_scores", [])
    overall_score = user_doc.get("overall_score", 0.0)

    # Fetch recent history
    history_cursor = history_collection.find({"userId": str(user_id)}).sort("created_at", -1).limit(5)
    history = []
    for h in history_cursor:
        history.append({
            "type": h.get("interviewType"),
            "date": h.get("created_at").strftime("%Y-%m-%d") if h.get("created_at") else "",
            "score": h.get("score", 0),
            "duration": h.get("duration", "N/A")
        })

    dashboard_data = {
        "total_interviews": total_interviews,
        "technical_interview": technical_interview,
        "aptitude_interview": aptitude_interview,
        "technical_scores": technical_scores,
        "aptitude_scores": aptitude_scores,
        "overall_score": overall_score,
        "recent_history": history
    }

    return JSONResponse(content=dashboard_data)
