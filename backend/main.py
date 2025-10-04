from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import signup  # your signup.py route
from routes import signin
from routes import forgot_password
from routes import resume_analyze
from routes import mock_interview_chatbot
from db import db  # just to check connection

app = FastAPI(title="Interview Prep Backend")

# ------------------------
# CORS Configuration
# ------------------------
origins = [
    "http://localhost:5173",  # React dev server
    # Add other origins if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # allow these origins
    allow_credentials=True,
    allow_methods=["*"],        # allow all HTTP methods
    allow_headers=["*"],        # allow all headers
)

# ------------------------
# Register Routes
# ------------------------
app.include_router(signup.router)
app.include_router(signin.router)
app.include_router(forgot_password.router)
app.include_router(resume_analyze.router)
app.include_router(mock_interview_chatbot.router)

@app.get("/")
def root():
    if db:
        return {"message": "Backend is running 🚀", "db_status": "✅ MongoDB connected"}
    else:
        return {"message": "Backend is running 🚀", "db_status": "❌ MongoDB not connected"}
