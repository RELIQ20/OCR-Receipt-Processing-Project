import os
from pathlib import Path
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(Path(__file__).parent / ".env")

SCOPES = ["https://www.googleapis.com/auth/drive.file"]
CREDENTIALS_FILE = os.path.join(BASE_DIR, "credentials.json")
TOKEN_FILE = os.path.join(BASE_DIR, "token.json")
FOLDER_ID = os.getenv("GDRIVE_FOLDER_ID")

def get_google_auth():
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "w") as token:
            token.write(creds.to_json())
    return creds

def _upload(file_path: str, file_name: str, mimetype: str) -> str:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    if not FOLDER_ID:
        raise ValueError("GDRIVE_FOLDER_ID not found in .env")

    creds = get_google_auth()
    service = build("drive", "v3", credentials=creds)

    metadata = {"name": file_name, "parents": [FOLDER_ID]}
    media = MediaFileUpload(file_path, mimetype=mimetype, resumable=True)

    file = (
        service.files()
        .create(body=metadata, media_body=media, fields="id, webViewLink")
        .execute()
    )

    # Make the uploaded image accessible to anyone with the link.
    try:
        service.permissions().create(
            fileId=file["id"],
            body={"type": "anyone", "role": "reader"},
        ).execute()
    except Exception:
        # If permission creation fails, fall back to the original link.
        pass

    return file.get("webViewLink")

def upload_image_to_drive(image_path: str) -> str:
    name = f"Receipt_{os.path.basename(image_path)}"
    return _upload(image_path, name, "image/jpeg")

def upload_file_to_drive(
    file_path: str,
    mimetype: str = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
) -> str:
    name = os.path.basename(file_path)
    return _upload(file_path, name, mimetype)
