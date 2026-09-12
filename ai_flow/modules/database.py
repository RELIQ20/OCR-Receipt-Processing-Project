import pymongo
from pymongo import MongoClient
from .config import MONGO_URI, DB_NAME, COLLECTION_NAME

def save_batch_to_mongo(batch_record: dict) -> str:
    """Saves a unified batch document containing all receipts to MongoDB."""
    if not MONGO_URI:
        raise ValueError("MONGO_URI not found in .env")

    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]

    result = collection.insert_one(batch_record)
    client.close()
    return str(result.inserted_id)

def update_receipt_status_in_db(sender_name: str, status: str) -> str:
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]

    latest = collection.find_one(
        {"sender_name": sender_name}, sort=[("createdAt", pymongo.DESCENDING)]
    )

    if not latest:
        client.close()
        return f"Could not find any recent receipts for {sender_name} to update."

    collection.update_one({"_id": latest["_id"]}, {"$set": {"status": status}})
    client.close()

    if status == "Confirmed":
        return f"✅ Database record for recent batch marked as *Confirmed*."
    else:
        return f"⚠️ Database record for recent batch flagged for *Checking*."
