import os
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
import fitz  # PyMuPDF
from io import BytesIO
from docx import Document
import google.generativeai as genai
from dotenv import load_dotenv
from utils.auth_utils import get_current_user  # JWT dependency
from bson import ObjectId
from db import users_collection  # MongoDB collection

load_dotenv()

router = APIRouter(prefix="/upload", tags=["Resume Analysis"])

# Gemini API setup
API_KEY = os.getenv("GEMINI_RESUME_API_KEY")
if not API_KEY:
    raise ValueError("GEMINI_RESUME_API_KEY not set in .env")
genai.configure(api_key=API_KEY)


# ----------------------
# Text Extraction
# ----------------------
def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        return "\n".join([page.get_text("text") for page in doc]).strip()
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")


def extract_text_from_word_bytes(doc_bytes: bytes) -> str:
    try:
        doc = Document(BytesIO(doc_bytes))
        return "\n".join([para.text for para in doc.paragraphs]).strip()
    except Exception as e:
        raise ValueError(f"Failed to extract text from DOCX: {str(e)}")


# ----------------------
# Send text to Gemini API
# ----------------------
def extract_resume_data_with_gemini(text: str) -> str:
    prompt = f"""
You are a resume parser. Extract the following details from the resume and return in the exact format below:

Format:
Job Role: <Job Role>
Skills: Programming Languages: <languages>
        Frameworks: <frameworks>
        Database: <databases>
        Technologies/Tools: <tools>
        Soft Skills: <soft skills>
Qualifications: Education: <degrees, institutions, CGPA/Percentage>
                Certifications: <certifications>

Resume Content:
{text}

Important:
- Do not add any extra text or explanation.
- Follow the format exactly.
- Keep everything in one continuous text.
"""
    try:
        model = genai.GenerativeModel("gemini-2.5-pro")
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        raise ValueError(f"Gemini API error: {str(e)}")


# ----------------------
# Protected FastAPI endpoint
# ----------------------
@router.post("/")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)  # JWT validation
):
    """
    Upload a resume for analysis.
    JWT token must be provided in the Authorization header:
    Authorization: Bearer <token>
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")

    filename = file.filename
    _, extension = os.path.splitext(filename)

    # Read file in memory
    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")

    # Extract text based on file type
    try:
        if extension.lower() == ".pdf":
            extracted_text = extract_text_from_pdf_bytes(file_bytes)
        elif extension.lower() in [".doc", ".docx"]:
            extracted_text = extract_text_from_word_bytes(file_bytes)
        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid file format. Only PDF and Word files are supported."
            )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not extracted_text:
        raise HTTPException(status_code=500, detail="Failed to extract text from the resume.")

    # Send text to Gemini for analysis
    try:
        analysis = extract_resume_data_with_gemini(extracted_text)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze resume with Gemini: {str(e)}")

    # ----------------------
    # Store in MongoDB (User.skills field)
    # ----------------------
    try:
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid user data in token")

        result = users_collection.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$set": {"skills": analysis}},
            return_document=True
        )
        if not result:
            raise HTTPException(status_code=404, detail="User not found in database")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update user skills: {str(e)}")

    return JSONResponse(
        content={
            "message": "Resume analyzed successfully",
            "skills": analysis
        }
    )
