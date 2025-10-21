import os
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
import fitz  # PyMuPDF
from io import BytesIO
from docx import Document
import google.generativeai as genai
from dotenv import load_dotenv
from utils.auth_utils import get_current_user
from bson import ObjectId, Binary  # ✅ Binary is important for MongoDB
from db import users_collection, resumes_collection
from models.resume_model import ResumeStorage  # ✅ Make sure this import exists

load_dotenv()

router = APIRouter(prefix="/upload", tags=["Resume Analysis"])

# ----------------------
# Gemini API setup
# ----------------------
API_KEY = os.getenv("GEMINI_RESUME_API_KEY")
if not API_KEY:
    raise ValueError("GEMINI_RESUME_API_KEY not set in .env")
genai.configure(api_key=API_KEY)


# ----------------------
# Text Extraction Helpers
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
# Gemini Resume Analysis
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
# Protected FastAPI Endpoint
# ----------------------
@router.post("/")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")

    filename = file.filename
    _, extension = os.path.splitext(filename)
    extension = extension.lower().replace(".", "")

    if extension not in ["pdf", "doc", "docx"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Only PDF and Word files are supported."
        )

    # Read file content
    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")

    # Extract text
    try:
        extracted_text = (
            extract_text_from_pdf_bytes(file_bytes)
            if extension == "pdf"
            else extract_text_from_word_bytes(file_bytes)
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not extracted_text:
        raise HTTPException(status_code=500, detail="Failed to extract text from resume.")

    # Gemini analysis
    try:
        analysis = extract_resume_data_with_gemini(extracted_text)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze resume: {str(e)}")

    # ✅ Store resume binary in MongoDB
    try:
        resume_entry = ResumeStorage(
            userId=current_user["id"],
            fileName=filename,
            fileType=extension,
            fileData=file_bytes,
            description="Uploaded resume for Gemini analysis"
        )

        resume_dict = resume_entry.dict()
        resume_dict["fileData"] = Binary(resume_dict["fileData"])  # ✅ Convert to BSON Binary

        resumes_collection.insert_one(resume_dict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to store resume: {str(e)}")

    # ✅ Update user’s skills
    try:
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid user data in token")

        users_collection.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$set": {"skills": analysis}},
            return_document=True
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update user skills: {str(e)}")

    return JSONResponse(
        content={
            "message": "Resume uploaded and analyzed successfully",
            "skills": analysis
        }
    )
