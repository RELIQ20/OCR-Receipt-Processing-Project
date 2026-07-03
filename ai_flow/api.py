import os
import sys
import cv2
import json
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

# External Libraries
from ollama import chat
from pymongo import MongoClient
from dotenv import load_dotenv
from openpyxl import Workbook
from openpyxl.styles import Font

# Google Drive API
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

# MCP
from mcp.server.fastmcp import FastMCP


# ==========================================
# CONFIGURATION & INITIALIZATION
# ==========================================
# Forces working directory to the project folder on initialization
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)

# Load environment variables
load_dotenv(Path(__file__).parent / ".env")

# Mongo Configuration
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "lifewood_db"
COLLECTION_NAME = "receipts"

# Google Drive Configuration
SCOPES = ["https://www.googleapis.com/auth/drive.file"]
CREDENTIALS_FILE = os.path.join(BASE_DIR, "credentials.json")
TOKEN_FILE = os.path.join(BASE_DIR, "token.json")
FOLDER_ID = os.getenv("GDRIVE_FOLDER_ID")


# ==========================================
# LOGGING UTILITY
# ==========================================
# IMPORTANT: Use stderr for logging!
# 'print()' writes to stdout and corrupts the MCP JSON-RPC protocol.
def log(msg: str):
    sys.stderr.write(f"[OcrReceipt] {msg}\n")
    sys.stderr.flush()


# ==========================================
# EXCEL MODULE
# ==========================================
def generate_spreadsheet(receipt_data: dict) -> str:
    """
    Generates a formatted Excel spreadsheet from the extracted receipt data.
    """
    log("Building actual Excel spreadsheet from receipt data...")
    
    samples_dir = os.path.join(BASE_DIR, "samples")
    os.makedirs(samples_dir, exist_ok=True)
    
    sender = receipt_data.get("sender_name", "Unknown")
    merchant = receipt_data.get("merchant_name", "Unknown Merchant")
    date = receipt_data.get("date", "Unknown Date")
    total = receipt_data.get("total_amount", 0)
    currency = receipt_data.get("currency", "")
    items = receipt_data.get("items", [])
    
    file_path = os.path.join(samples_dir, f"receipt_{sender}.xlsx")
    
    # Create workbook and active sheet
    wb = Workbook()
    ws = wb.active
    ws.title = "Receipt Details"
    
    # Write Receipt Meta Data
    ws['A1'] = "Merchant Name:"
    ws['B1'] = merchant
    ws['A2'] = "Date:"
    ws['B2'] = date
    ws['A3'] = "Total Amount:"
    ws['B3'] = f"{currency} {total}".strip()
    
    # Bold the header labels
    for cell in ['A1', 'A2', 'A3']:
        ws[cell].font = Font(bold=True)
        
    # Leave a blank row
    ws.append([])
    
    # Write Items Table Headers
    ws.append(["Item Description", "Price"])
    ws['A5'].font = Font(bold=True)
    ws['B5'].font = Font(bold=True)
    
    # Loop through extracted items and write them to the rows
    for item in items:
        desc = item.get("description", "Unknown Item")
        price = item.get("price", 0)
        ws.append([desc, price])
        
    # Adjust column widths so it looks clean
    ws.column_dimensions['A'].width = 40
    ws.column_dimensions['B'].width = 15
    
    # Save the file
    wb.save(file_path)
    return file_path


# ==========================================
# DATABASE MODULE
# ==========================================
def save_to_mongo(receipt_data: dict) -> str:
    """Inserts a receipt document into MongoDB and returns its ID."""
    if not MONGO_URI:
        raise ValueError("MONGO_URI not found in .env — check your environment file")

    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]

    document = {
        "merchant_name": receipt_data.get("merchant_name"),
        "date": receipt_data.get("date"),
        "time": receipt_data.get("time"),
        "total_amount": receipt_data.get("total_amount"),
        "currency": receipt_data.get("currency"),
        "items": receipt_data.get("items", []),
        "drive_link": receipt_data.get("drive_link"),
        "sender_name": receipt_data.get("sender_name"),
        "status": "Pending",
        "source": "WhatsApp OpenClaw",
        "createdAt": datetime.now(timezone.utc),
    }

    result = collection.insert_one(document)
    client.close()
    return str(result.inserted_id)


# ==========================================
# GOOGLE DRIVE MODULE
# ==========================================
def get_google_auth():
    """Handles OAuth2 tokens — uses saved credentials or handles re-authentication."""
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
    """Internal upload engine. Returns the viewable web address."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    if not FOLDER_ID:
        raise ValueError("GDRIVE_FOLDER_ID not found in .env mapping")

    creds = get_google_auth()
    service = build("drive", "v3", credentials=creds)

    metadata = {"name": file_name, "parents": [FOLDER_ID]}
    media = MediaFileUpload(file_path, mimetype=mimetype, resumable=True)

    file = (
        service.files()
        .create(body=metadata, media_body=media, fields="id, webViewLink")
        .execute()
    )
    return file.get("webViewLink")


def upload_image_to_drive(image_path: str) -> str:
    """Uploads a compressed color receipt image to Google Drive."""
    name = f"Receipt_{os.path.basename(image_path)}"
    return _upload(image_path, name, "image/jpeg")


def upload_file_to_drive(
    file_path: str,
    mimetype: str = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
) -> str:
    """Uploads an Excel document spreadsheet directly to Google Drive."""
    name = os.path.basename(file_path)
    return _upload(file_path, name, mimetype)


# ==========================================
# VISION / OCR MODULE
# ==========================================
def preprocess_image(image_path: str) -> str:
    """Cleans the receipt image for OCR and saves it to samples/."""
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Could not read image at: {image_path}")

    samples_dir = os.path.join(BASE_DIR, "samples")
    os.makedirs(samples_dir, exist_ok=True)

    original_filename = os.path.basename(image_path)
    output_path = os.path.join(samples_dir, f"cleaned_{original_filename}")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    cleaned = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    cv2.imwrite(output_path, cleaned)
    return output_path


def compress_for_drive(image_path: str) -> str:
    """Compresses the image for Drive storage without converting to grayscale."""
    img = cv2.imread(image_path)
    if img is None:
        return image_path

    # Downscale resolution if excessive to keep cloud space optimized
    max_width = 1200
    h, w = img.shape[:2]
    if w > max_width:
        ratio = max_width / w
        new_dim = (max_width, int(h * ratio))
        img = cv2.resize(img, new_dim, interpolation=cv2.INTER_AREA)

    samples_dir = os.path.join(BASE_DIR, "samples")
    os.makedirs(samples_dir, exist_ok=True)

    original_filename = os.path.basename(image_path)
    output_path = os.path.join(samples_dir, f"drive_compressed_{original_filename}")

    # Save with balanced JPEG compression while keeping color space intact
    cv2.imwrite(output_path, img, [cv2.IMWRITE_JPEG_QUALITY, 70])
    return output_path


def extract_receipt_data(image_path: str) -> dict:
    """Preprocesses the image and sends it to Qwen2.5-VL for OCR."""
    clean_image = preprocess_image(image_path)

    system_prompt = """You are an expert receipt OCR engine. Extract data into EXACT JSON. 
    - Return ONLY valid JSON, no explanations, no markdown.
    - For missing/illegible fields use null.
    - Dates in YYYY-MM-DD. Time in HH:MM.
    - Prices as numbers (no currency symbols).
    - currency: "PHP", "USD", etc. or null.
    - items: list of {"description": str, "price": number}. Include ALL items.
    Schema:
    {
    "merchant_name": "string",
    "date": "string or null",
    "time": "string or null",
    "total_amount": number or null,
    "currency": "string or null",
    "items": [{"description": "string", "price": number}, ...]
    }
    """
    response = chat(
        model="qwen2.5vl:latest",
        format="json",
        messages=[
            {
                "role": "user",
                "content": system_prompt,
                "images": [clean_image],
            }
        ],
        options={
            "temperature": 0,
            "num_ctx": 16384,
            "keep_alive": "30m",
        },
    )

    try:
        receipt_data = json.loads(response.message.content)
    except Exception:
        return {"error": "Failed to parse model output into structured JSON."}

    if not receipt_data.get("merchant_name") or not receipt_data.get("total_amount"):
        return {
            "error": "Image cannot be clearly read. Please scan again with better lighting."
        }

    return receipt_data


# ==========================================
# FAST MCP APP
# ==========================================
mcp = FastMCP("OcrReceipt")


def resolve_path(image_path: str) -> str:
    """Resolves various path formats (absolute, media://, file://) to a local file."""
    if os.path.exists(image_path):
        return image_path

    # Extract filename from path or URI string securely
    filename = os.path.basename(urllib.parse.urlparse(image_path).path)
    if not filename:
        filename = image_path

    home = os.path.expanduser("~")
    # Scan standard OpenClaw media storage directories
    possible_paths = [
        os.path.join(home, ".openclaw", "media", "inbound", filename),
        os.path.join(home, ".openclaw", "media", filename),
        os.path.join("C:\\Users\\R3liq\\.openclaw", "media", "inbound", filename),
        os.path.join("C:\\Users\\R3liq\\.openclaw", "media", filename),
        os.path.join(BASE_DIR, filename),
    ]

    for path in possible_paths:
        if os.path.exists(path):
            return path

    return None


@mcp.tool()
def process_receipt(image_path: str, sender_name: str = "User") -> str:
    """
    Analyzes a receipt image, extracts data, saves to MongoDB,
    uploads files to Google Drive, and generates a downloadable Excel report.

    Args:
        image_path: File system path or media:// URI to the image asset.
        sender_name: Name context from inbound WhatsApp transport.
    """
    resolved = resolve_path(image_path)

    if not resolved:
        log(f"Failed to locate image: {image_path}")
        return (
            f"❌ Could not locate image file for *{sender_name}*.\n"
            f"Please ensure the image is properly downloaded and try again."
        )

    image_path = resolved
    log(f"Resolved image path → {image_path}")

    try:
        log(f"[1/5] Extracting text with Qwen2.5-VL from {sender_name}...")
        receipt_data = extract_receipt_data(image_path)

        if "error" in receipt_data:
            return (
                f"❌ *{sender_name}*, your receipt couldn't be read clearly.\n"
                f"Error: {receipt_data['error']}\n"
                f"Please try again with clearer visibility or lighting."
            )

        receipt_data["sender_name"] = sender_name

        log("[2/5] Compressing and uploading color image to Google Drive...")
        try:
            colored_compressed_path = compress_for_drive(image_path)
            image_drive_link = upload_image_to_drive(colored_compressed_path)
            receipt_data["drive_link"] = image_drive_link
            log(f"Image Drive Link generated: {image_drive_link}")
        except Exception as e:
            log(f"Drive Image Upload Failed: {e}")
            image_drive_link = None
            receipt_data["drive_link"] = None

        log("[3/5] Syncing transaction record to MongoDB...")
        try:
            db_id = save_to_mongo(receipt_data)
            log(f"Saved to Mongo with ID: {db_id}")
        except Exception as e:
            log(f"Database Sync Failed: {e}")
            db_id = "DB-ERROR"

        log("[4/5] Constructing localized Excel worksheet...")
        try:
            excel_path = generate_spreadsheet(receipt_data)
            log(f"Generated Excel successfully at: {excel_path}")
        except Exception as e:
            log(f"Local Spreadsheet Output Failed: {e}")
            excel_path = None

        log("[5/5] Pushing generated spreadsheet to cloud storage...")
        excel_drive_link = None
        if excel_path and os.path.exists(excel_path):
            try:
                excel_drive_link = upload_file_to_drive(excel_path)
                log(f"Excel Drive Link generated: {excel_drive_link}")
            except Exception as e:
                log(f"Drive Spreadsheet Upload Failed: {e}")

        # Extract structured data components for response mapping
        merchant = receipt_data.get("merchant_name", "Unknown")
        total = receipt_data.get("total_amount", "?")
        currency = receipt_data.get("currency", "")
        date = receipt_data.get("date", "?")
        items = receipt_data.get("items", [])

        item_lines = "\n".join(
            f"  • {i.get('description', '?')} — {currency} {i.get('price', '?')}"
            for i in items[:8]
        )
        if len(items) > 8:
            item_lines += f"\n  ... and {len(items) - 8} more items"

        # Construct the summary output for the user
        reply = [
            f"✅ *Receipt processed for {sender_name}*",
            "",
            f"🏪 *Merchant:* {merchant}",
            f"📅 *Date:* {date}",
            f"💰 *Total:* {currency} {total}",
        ]

        if item_lines:
            reply += ["", "🧾 *Items:*", item_lines]

        reply.append("")

        # Put the generated links right in the markdown so they can be clicked
        if image_drive_link:
            reply.append(f"🖼️ *Image backup:* {image_drive_link}")

        if excel_drive_link:
            reply.append(f"📊 *Excel Cloud Report:* {excel_drive_link}")

        reply += [
            "",
            "Reply *Okay* to confirm or *Need Checking* if something looks wrong.",
            "",
            "---",
            "[SYSTEM INSTRUCTION FOR AGENT]",
            "Relay the summary above directly to the user.",
        ]

        # Explicit instructions to OpenClaw to handle the attachment
        if excel_path:
            abs_excel_path = os.path.abspath(excel_path)
            reply.append(
                f"You MUST provide the user with this file attachment: {abs_excel_path}"
            )
            reply.append(f"ATTACH_FILE:{abs_excel_path}")

        return "\n".join(reply)

    except Exception as e:
        log(f"CRITICAL PIPELINE EXECUTION FAULT: {e}")
        return f"❌ Pipeline failure processing asset: {str(e)}"


# ==========================================
# MAIN EXECUTION
# ==========================================
if __name__ == "__main__":
    # If you pass a file path in the terminal (e.g., python api.py samples/sample.jpg)
    if len(sys.argv) > 1:
        test_image_path = sys.argv[1]
        
        print(f"--- Running Local CLI Test for: {test_image_path} ---")
        
        # Run the pipeline directly
        result = process_receipt(test_image_path, sender_name="Local_Tester")
        
        print("\n=== FINAL PIPELINE OUTPUT ===")
        print(result)
        
    else:
        # If no arguments are passed, assume OpenClaw is running it in the background
        mcp.run(transport="stdio")
