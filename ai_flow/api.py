import os
import sys
import json
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

# Lightweight Environment & MCP Imports ONLY at the top level
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

# ==========================================
# CONFIGURATION & INITIALIZATION
# ==========================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)
load_dotenv(Path(__file__).parent / ".env")

# Clean URL by stripping whitespace and quotes
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().strip('"').strip("'")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "").strip().strip('"').strip("'")
SUPABASE_BUCKET = "receipts"  

def log(msg: str):
    sys.stderr.write(f"[OcrReceipt] {msg}\n")
    sys.stderr.flush()

# ==========================================
# EXCEL BATCH MODULE
# ==========================================
def generate_merged_spreadsheet(all_items: list, sender: str, grand_total: float) -> str:
    """Generates a single Excel file grouping items from multiple receipts."""
    from openpyxl import Workbook
    from openpyxl.styles import Font

    log("Building consolidated Excel spreadsheet...")
    samples_dir = os.path.join(BASE_DIR, "samples")
    os.makedirs(samples_dir, exist_ok=True)
    file_path = os.path.join(samples_dir, f"receipts_merged_{sender}.xlsx")

    wb = Workbook()
    ws = wb.active
    ws.title = "Consolidated Receipts"
    ws.append(["Merchant Name", "Date", "Item Description", "Price"])

    for col in ["A1", "B1", "C1", "D1"]:
        ws[col].font = Font(bold=True)

    for item in all_items:
        ws.append([item["merchant"], item["date"], item["description"], item["price"]])

    ws.append([])
    ws.append(["", "", "GRAND TOTAL:", grand_total])

    max_row = ws.max_row
    ws[f"C{max_row}"].font = Font(bold=True)
    ws[f"D{max_row}"].font = Font(bold=True)

    ws.column_dimensions["A"].width = 25
    ws.column_dimensions["B"].width = 15
    ws.column_dimensions["C"].width = 40
    ws.column_dimensions["D"].width = 15

    wb.save(file_path)
    return file_path


# ==========================================
# SUPABASE DATABASE & STORAGE MODULE
# ==========================================
_supabase_client = None

def get_supabase():
    """Lazy-loads the Supabase client only when needed."""
    global _supabase_client
    if _supabase_client is None:
        from supabase import create_client
        log("Initializing Supabase connection...")
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase_client

def save_batch_to_supabase(batch_record: dict) -> str:
    db = get_supabase()
    batch_record["createdAt"] = batch_record["createdAt"].isoformat()
    response = db.table("receipts").insert(batch_record).execute()
    return str(response.data[0]['id'])

def upload_to_supabase_storage(file_path: str, mimetype: str) -> str:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    db = get_supabase()
    safe_filename = f"{int(time.time())}_{os.path.basename(file_path)}"
    
    log(f"Uploading {safe_filename} to Storage...")
    with open(file_path, "rb") as f:
        db.storage.from_(SUPABASE_BUCKET).upload(
            file=f,
            path=safe_filename,
            file_options={"content-type": mimetype}
        )
    return db.storage.from_(SUPABASE_BUCKET).get_public_url(safe_filename)


# ==========================================
# VISION / OCR MODULE
# ==========================================
def compress_image(image_path: str) -> str:
    """Shrinks the image BEFORE feeding it to the AI to prevent stalling."""
    import cv2 

    img = cv2.imread(image_path)
    if img is None:
        log(f"Warning: Could not read {image_path} for compression.")
        return image_path

    max_width = 1200
    h, w = img.shape[:2]
    if w > max_width:
        ratio = max_width / w
        new_dim = (max_width, int(h * ratio))
        img = cv2.resize(img, new_dim, interpolation=cv2.INTER_AREA)

    samples_dir = os.path.join(BASE_DIR, "samples")
    os.makedirs(samples_dir, exist_ok=True)
    
    # Save a lighter, compressed version for the AI and Storage
    output_path = os.path.join(samples_dir, f"compressed_{os.path.basename(image_path)}")
    cv2.imwrite(output_path, img, [cv2.IMWRITE_JPEG_QUALITY, 70])
    
    return output_path


def extract_receipt_data(image_path: str) -> dict:
    from ollama import chat

    system_prompt = """You are an expert receipt OCR engine. Extract data into EXACT JSON. 
    - Return ONLY valid JSON, no explanations.
    - Dates in YYYY-MM-DD. Time in HH:MM.
    - Prices as numbers (no currency symbols).
    - currency: "PHP", "USD", etc. or null.
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
    
    log("Sending compressed image to Ollama (qwen2.5vl:latest)...")
    
    try:
        response = chat(
            model="qwen3-vl:8b-instruct",
            format="json",
            messages=[
                {
                    "role": "user",
                    "content": system_prompt,
                    "images": [image_path],
                }
            ],
            options={
                "temperature": 0,
                "num_ctx": 4096,
                "keep_alive": "30m",
            },
        )
    except Exception as e:
        log(f"Ollama AI failed to process image: {e}")
        return {"error": "AI processing timeout or crash."}

    raw_text = response.message.content.strip()

    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]
    elif raw_text.startswith("```"):
        raw_text = raw_text[3:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]

    raw_text = raw_text.strip()

    try:
        receipt_data = json.loads(raw_text)
    except Exception as e:
        log(f"JSON Parse Error. Output: {raw_text}")
        return {"error": "Failed to parse model output into JSON."}

    if not receipt_data.get("merchant_name") or not receipt_data.get("total_amount"):
        return {"error": "Image cannot be clearly read. Please scan again."}

    return receipt_data


# ==========================================
# FAST MCP APP & TOOLS
# ==========================================
mcp = FastMCP("OcrReceipt")

def resolve_path(image_path: str) -> str:
    if os.path.exists(image_path):
        return image_path
    filename = os.path.basename(urllib.parse.urlparse(image_path).path)
    if not filename:
        filename = image_path
    home = os.path.expanduser("~")
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
def update_receipt_status(sender_name: str, status: str) -> str:
    db = get_supabase()
    response = (db.table("receipts").select("id").eq("sender_name", sender_name)
                .order("createdAt", desc=True).limit(1).execute())
    if not response.data:
        return f"Could not find any recent receipts for {sender_name} to update."
        
    db.table("receipts").update({"status": status}).eq("id", response.data[0]["id"]).execute()
    return f"✅ Status updated to: *{status}*."

@mcp.tool()
def process_receipt(image_path: str, sender_name: str = "User") -> str:
    """
    CRITICAL: You MUST call this tool whenever a user sends an image. 
    Do NOT generate JSON yourself. Pass the raw 'media://...' string.
    Return EXACTLY what this tool outputs.
    """
    paths = [p.strip() for p in image_path.split(",")]
    valid_paths = [resolve_path(p) for p in paths if resolve_path(p)]

    if not valid_paths:
        return "❌ Could not locate any image files."

    final_paths = set(valid_paths)
    reference_file = valid_paths[0]

    # Context-Aware Auto-Scoop
    if "inbound" in os.path.normpath(reference_file).split(os.sep):
        try:
            inbound_dir = os.path.dirname(reference_file)
            ref_time = os.path.getmtime(reference_file)
            if os.path.exists(inbound_dir):
                for filename in os.listdir(inbound_dir):
                    if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                        filepath = os.path.join(inbound_dir, filename)
                        file_time = os.path.getmtime(filepath)
                        if abs(ref_time - file_time) <= 180:
                            final_paths.add(filepath)
        except Exception as e:
            log(f"Auto-scoop failed: {e}")

    valid_paths = list(final_paths)
    log(f"Processing a total of {len(valid_paths)} image(s).")

    all_extracted_items = []
    total_sum = 0.0

    batch_db_record = {
        "sender_name": sender_name,
        "status": "Confirmed",
        "source": "WhatsApp OpenClaw",
        "createdAt": datetime.now(timezone.utc),
        "receipts": [],
        "grand_total": 0.0,
        "excel_link": None
    }

    final_reply = [f"✅ *Processed {len(valid_paths)} receipt(s) for {sender_name}!*\n"]

    for path in valid_paths:
        # CRITICAL FIX: Compress the image BEFORE sending it to the AI
        log("Compressing image for AI processing...")
        optimized_image_path = compress_image(path)
        
        log(f"Extracting data from optimized image...")
        receipt_data = extract_receipt_data(optimized_image_path)

        if "error" in receipt_data:
            final_reply.append(f"⚠️ Error reading an image: {receipt_data['error']}\n")
            continue

        image_url = None
        try:
            # Upload the optimized image to Supabase
            image_url = upload_to_supabase_storage(optimized_image_path, "image/jpeg")
        except Exception as e:
            log(f"Supabase Image Upload Failed: {e}")

        merchant = receipt_data.get("merchant_name", "Unknown Merchant")
        date = receipt_data.get("date", "Unknown Date")
        currency = receipt_data.get("currency", "PHP")

        final_reply.append(f"🏪 *Merchant:* {merchant}")
        final_reply.append(f"📅 *Date:* {date}")
        if image_url:
            final_reply.append(f"🖼️ *Image Backup:*\n{image_url}")
        final_reply.append("")

        receipt_entry = {
            "merchant_name": merchant,
            "date": date,
            "time": receipt_data.get("time"),
            "total_amount": receipt_data.get("total_amount"),
            "currency": currency,
            "drive_link": image_url,
            "items": []
        }

        for item in receipt_data.get("items", []):
            try:
                clean_price = float(str(item.get("price", 0)).replace(",", "").strip())
            except:
                clean_price = 0.0

            all_extracted_items.append({
                "merchant": merchant,
                "date": date,
                "description": item.get("description", "Unknown Item"),
                "price": clean_price,
            })
            total_sum += clean_price
            receipt_entry["items"].append({"description": item.get("description", "Unknown Item"), "price": clean_price})

        batch_db_record["receipts"].append(receipt_entry)

    batch_db_record["grand_total"] = total_sum

    if all_extracted_items:
        try:
            excel_path = generate_merged_spreadsheet(all_extracted_items, sender_name, total_sum)
            excel_url = upload_to_supabase_storage(excel_path, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            batch_db_record["excel_link"] = excel_url

            final_reply.append(f"💰 *Grand Total:* PHP {total_sum}")
            final_reply.append(f"📊 *Excel Cloud Report:*\n{excel_url}\n")
        except Exception as e:
            log(f"Excel Error: {e}")
            final_reply.append(f"❌ Excel Error: {e}\n")

    try:
        save_batch_to_supabase(batch_db_record)
    except Exception as e:
        log(f"Supabase Error: {e}")

    final_reply.append(
        "---\n"
        "SYSTEM DIRECTIVE FOR LLM: Present the text above to the user EXACTLY as written. "
        "CRITICAL: Preserve ALL newlines. DO NOT put this text inside a code block. "
    )

    return "\n".join(final_reply)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        test_images = sys.argv[1]
        print(f"--- Running Local CLI Batch Test ---")
        result = process_receipt(test_images, sender_name="Local_Tester")
        print("\n=== FINAL PIPELINE OUTPUT ===")
        print(result)
    else:
        mcp.run(transport="stdio")
