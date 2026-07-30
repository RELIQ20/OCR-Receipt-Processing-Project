import os

from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "lifewood_db"
COLLECTION_NAME = "receipts"


def save_to_mongo(receipt_data: dict) -> str:
    """Formats the extracted data and inserts it into MongoDB."""
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]

    # 2. Map the data to a clean dictionary
    document = {
        "merchant_name": receipt_data.get("merchant_name"),
        "date": receipt_data.get("date"),
        "time": receipt_data.get("time"),
        "total_amount": receipt_data.get("total_amount"),
        "currency": receipt_data.get("currency"),
        "items": receipt_data.get("items", []),
        "drive_link": receipt_data.get("drive_link"),  # <-- save Drive URL
        # <-- save who sent it
        "sender_name": receipt_data.get("sender_name"),
        "status": "Processing",
        "source": "WhatsApp OpenClaw",
        "createdAt": datetime.now(timezone.utc),
    }
    # 3. Insert the document
    result = collection.insert_one(document)
    # 4. Close connection and return the new ID
    client.close()
    return str(result.inserted_id)
