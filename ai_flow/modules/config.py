import os
from pathlib import Path
from dotenv import load_dotenv

# Base Directory is the parent of modules directory (ai_flow)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(Path(BASE_DIR) / ".env")

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "lifewood_db"
COLLECTION_NAME = "receipts"

SCOPES = ["https://www.googleapis.com/auth/drive.file"]
CREDENTIALS_FILE = os.path.join(BASE_DIR, "credentials.json")
TOKEN_FILE = os.path.join(BASE_DIR, "token.json")
FOLDER_ID = os.getenv("GDRIVE_FOLDER_ID")
