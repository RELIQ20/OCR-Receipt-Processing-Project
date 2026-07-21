from mcp.server.fastmcp import FastMCP

from vision import extract_receipt_data
from database import save_to_mongo
from excel import generate_spreadsheet
from gdrive import upload_image_to_drive  # <--- Added the Drive service

mcp = FastMCP("OcrReceipt")


@mcp.tool()
def process_receipt(image_path: str, sender_name: str = "User") -> str:
    """
    Analyzes a receipt image, extracts JSON data, saves to DB, and returns an Excel file path.

    Args:
        image_path:   Absolute path to the receipt image received from WhatsApp.
        sender_name:  The WhatsApp display name of the person who sent the receipt.
    """
    try:
        print(f"1. Processing receipt from {sender_name}...")
        receipt_data = extract_receipt_data(image_path)

        if "error" in receipt_data:
            return f"❌ *{sender_name}*, your receipt couldn't be read. Please try again with better lighting."

        print("2. Uploading to Google Drive...")
        drive_link = upload_image_to_drive(image_path)
        receipt_data["drive_link"] = drive_link
        receipt_data["sender_name"] = sender_name  # <-- save who sent it

        print("3. Saving to MongoDB...")
        db_id = save_to_mongo(receipt_data)

        print("4. Generating Excel...")
        excel_path = generate_spreadsheet(receipt_data)

        merchant = receipt_data.get("merchant_name", "Unknown")
        total = receipt_data.get("total_amount", "?")
        currency = receipt_data.get("currency", "")
        date = receipt_data.get("date", "?")

        return (
            f"✅ Receipt processed for *{sender_name}*\n"
            f"📍 Merchant: {merchant}\n"
            f"📅 Date: {date}\n"
            f"💰 Total: {currency} {total}\n"
            f"🔗 Drive backup: {drive_link}\n"
            f"📊 Excel file path: {excel_path}"
        )

    except Exception as e:
        return f"❌ Tool error for *{sender_name}*: {str(e)}"


if __name__ == "__main__":
    print("--- STARTING MANUAL TEST ---")
    test_image_path = "./samples/sample4.jpeg"
    result = process_receipt(test_image_path)
    print("\n--- FINAL OUTPUT ---")
    print(result)
    # mcp.run(transport="stdio")
