from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")  # your MongoDB connection string
client = MongoClient(MONGO_URI)
db = client["aptitude_ai"]

# Collections
questions_col = db["questions"]       # optional if storing past generated questions
results_col = db["results"]           # store user answers for analytics
