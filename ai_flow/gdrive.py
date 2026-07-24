import os
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from dotenv import load_dotenv

load_dotenv()

# The scopes tell Google what we are allowed to do
SCOPES = ["https://www.googleapis.com/auth/drive.file"]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_FILE = os.path.join(BASE_DIR, "credentials.json")
TOKEN_FILE = os.path.join(BASE_DIR, "token.json")
FOLDER_ID = os.getenv("GDRIVE_FOLDER_ID")


def get_google_auth():
    """Handles the OAuth2 login flow for a real human account."""
    creds = None
    # 1. Check if we already logged in previously
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    # 2. If no valid credentials, force a login
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                CREDENTIALS_FILE, SCOPES)
            # This line pops open your web browser!
            creds = flow.run_local_server(port=0)

        # 3. Save the login token so we never have to log in manually again
        with open(TOKEN_FILE, "w") as token:
            token.write(creds.to_json())

    return creds


def upload_image_to_drive(image_path: str) -> str:
    """Uploads the raw receipt using your personal Drive quota."""
    if not os.path.exists(image_path):
        return "Error: Image file not found locally."

    # Authenticate as YOU
    creds = get_google_auth()
    service = build("drive", "v3", credentials=creds)

    file_name = os.path.basename(image_path)
    file_metadata = {"name": f"WhatsApp_{file_name}", "parents": [FOLDER_ID]}

    media = MediaFileUpload(image_path, mimetype="image/jpeg", resumable=True)

    file = (
        service.files()
        .create(body=file_metadata, media_body=media, fields="id, webViewLink")
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
