from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "interview_platform")

try:
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    # Collections
    users_collection = db["users"]
    chat_sessions_collection = db["chat_sessions"]
    history_collection = db["history"]
    resumes_collection = db["resumes"]

    # ✅ New collection for storing aptitude test data
    aptitude_collection = db["aptitude_tests"]

    # Check connection
    client.admin.command("ping")
    print("✅ MongoDB connected successfully!")
except Exception as e:
    print("❌ MongoDB connection failed:", e)
    db = None
    users_collection = None
    chat_sessions_collection = None
    history_collection = None
    resumes_collection = None
    aptitude_collection = None
