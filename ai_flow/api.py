import os
import sys
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

# External Libraries
from dotenv import load_dotenv

# MCP
from mcp.server.fastmcp import FastMCP

# Local Modules
from database import save_batch_to_mongo, update_receipt_status_db
from excel import generate_merged_spreadsheet
from gdrive import upload_image_to_drive, upload_file_to_drive
from vision import compress_for_drive, extract_receipt_data

# ==========================================
# CONFIGURATION & INITIALIZATION
# ==========================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)
load_dotenv(Path(__file__).parent / ".env")

def log(msg: str):
    sys.stderr.write(f"[OcrReceipt] {msg}\n")
    sys.stderr.flush()

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
    workspace_root = os.path.dirname(BASE_DIR)
    
    possible_paths = [
        # Original default locations
        os.path.join(home, ".openclaw", "media", "inbound", filename),
        os.path.join(home, ".openclaw", "media", filename),
        os.path.join("C:\\Users\\R3liq\\.openclaw", "media", "inbound", filename),
        os.path.join("C:\\Users\\R3liq\\.openclaw", "media", filename),
        
        # In case the user moves it into the project folder
        os.path.join(workspace_root, ".openclaw", "media", "inbound", filename),
        os.path.join(workspace_root, ".openclaw", "media", filename),
        os.path.join(BASE_DIR, ".openclaw", "media", "inbound", filename),
        os.path.join(BASE_DIR, ".openclaw", "media", filename),
        
        # Direct fallback
        os.path.join(BASE_DIR, filename),
    ]

    for path in possible_paths:
        if os.path.exists(path):
            return path
    return None

@mcp.tool()
def update_receipt_status(sender_name: str, status: str) -> str:
    """
    Updates the database status of the user's most recent receipt batch.
    Valid statuses: 'Confirmed', 'Needs Checking'
    """
    return update_receipt_status_db(sender_name, status)

@mcp.tool()
def process_receipt(image_path: str, sender_name: str = "User") -> str:
    """
    Analyzes one OR MORE receipt images synchronously.
    CRITICAL LLM INSTRUCTION: Just pass the SINGLE most recent 'media://inbound/...' URI from the user's message into the `image_path` parameter. The Python script will automatically locate all other images the user sent in that batch.
    """
    paths = [p.strip() for p in image_path.split(",")]
    valid_paths = [resolve_path(p) for p in paths if resolve_path(p)]

    if not valid_paths:
        return "❌ Could not locate any image files. Please ensure they are downloaded."

    # ==========================================
    # AUTO-SCOOP LOGIC
    # Bypasses the LLM entirely and finds all images 
    # saved to the inbound folder in the last 3 minutes.
    # ==========================================
    final_paths = set(valid_paths)
    reference_file = valid_paths[0]

    try:
        inbound_dir = os.path.dirname(reference_file)
        ref_time = os.path.getmtime(reference_file)

        if os.path.exists(inbound_dir):
            for filename in os.listdir(inbound_dir):
                if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                    filepath = os.path.join(inbound_dir, filename)
                    file_time = os.path.getmtime(filepath)
                    # If file was modified within 180 seconds (3 mins) of our reference file, scoop it!
                    if abs(ref_time - file_time) <= 180:
                        final_paths.add(filepath)
    except Exception as e:
        log(f"Auto-scoop failed: {e}")

    valid_paths = list(final_paths)
    log(f"Auto-scooped a total of {len(valid_paths)} images for processing.")

    # ==========================================

    all_extracted_items = []
    total_sum = 0.0

    batch_mongo_record = {
        "sender_name": sender_name,
        "status": "Confirmed",
        "source": "WhatsApp OpenClaw",
        "createdAt": datetime.now(timezone.utc),
        "receipts": [],
        "grand_total": 0.0,
        "excel_link": None
    }

    final_reply = [f"✅ *Processed {len(valid_paths)} receipt(s) for {sender_name}!*\n"]

    for i, path in enumerate(valid_paths, 1):
        log(f"Extracting: {path}")
        receipt_data = extract_receipt_data(path)

        if "error" in receipt_data:
            final_reply.append(f"⚠️ *Receipt {i} Error:* {receipt_data['error']}\n")
            continue

        drive_link = None
        try:
            colored_path = compress_for_drive(path)
            drive_link = upload_image_to_drive(colored_path)
        except Exception as e:
            log(f"Drive Image Upload Failed: {e}")

        merchant = receipt_data.get("merchant_name", "Unknown Merchant")
        date = receipt_data.get("date", "Unknown Date")
        currency = receipt_data.get("currency", "PHP")

        final_reply.append(f"🧾 *--- RECEIPT {i} ---*")
        final_reply.append(f"🏪 *Merchant:* {merchant}")
        final_reply.append(f"📅 *Date:* {date}")
        if drive_link:
            final_reply.append(f"🖼️ *Image Backup:*\n{drive_link}")
        final_reply.append("") 

        receipt_entry = {
            "merchant_name": merchant,
            "date": date,
            "time": receipt_data.get("time"),
            "total_amount": receipt_data.get("total_amount"),
            "currency": currency,
            "drive_link": drive_link,
            "items": []
        }

        for item in receipt_data.get("items", []):
            try:
                clean_price = float(str(item.get("price", 0)).replace(",", "").strip())
            except:
                clean_price = 0.0
                
            try:
                quantity = float(str(item.get("quantity", 1)).replace(",", "").strip())
            except:
                quantity = 1.0

            all_extracted_items.append(
                {
                    "merchant": merchant,
                    "date": date,
                    "description": item.get("description", "Unknown Item"),
                    "quantity": quantity,
                    "price": clean_price,
                }
            )
            total_sum += clean_price
            receipt_entry["items"].append({"description": item.get("description", "Unknown Item"), "quantity": quantity, "price": clean_price})

        batch_mongo_record["receipts"].append(receipt_entry)

    batch_mongo_record["grand_total"] = total_sum

    if all_extracted_items:
        try:
            excel_path = generate_merged_spreadsheet(all_extracted_items, sender_name, total_sum)
            excel_link = upload_file_to_drive(excel_path)
            batch_mongo_record["excel_link"] = excel_link

            final_reply.append(f"💰 *Grand Total:* PHP {total_sum}")
            final_reply.append(f"📊 *Excel Cloud Report:*\n{excel_link}\n")
        except Exception as e:
            log(f"Excel Error: {e}")
            final_reply.append(f"❌ Excel Error: {e}\n")

    try:
        save_batch_to_mongo(batch_mongo_record)
    except Exception as e:
        log(f"Mongo Error: {e}")

    # Aggressive Anti-Markdown Prompt
    final_reply.append(
        "\n---\n"
        "CRITICAL SYSTEM DIRECTIVE FOR LLM: \n"
        "You MUST output the text above exactly as is. \n"
        "CRITICAL: You MUST preserve all newlines and line breaks exactly as they appear! Do not combine into a single paragraph. \n"
        "DO NOT wrap your response in markdown backticks (```). \n"
        "DO NOT use code blocks or HTML tags. If you use a code block, you will crash the WhatsApp plugin. \n"
        "Reply with raw, plain text starting immediately with the ✅ emoji."
    )

    return "\n".join(final_reply)

# ==========================================
# MAIN EXECUTION
# ==========================================
if __name__ == "__main__":
    if len(sys.argv) > 1:
        test_images = sys.argv[1]
        print(f"--- Running Local CLI Batch Test ---")
        result = process_receipt(test_images, sender_name="Local_Tester")
        print("\n=== FINAL PIPELINE OUTPUT ===")
        print(result)
    else:
        mcp.run(transport="stdio")
