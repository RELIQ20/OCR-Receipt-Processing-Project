import os
import pandas as pd


def generate_spreadsheet(receipt_data: dict, output_dir: str = "exports") -> str:
    """Generates an Excel file and saves it to an exports directory."""

    # Create the exports folder if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Sanitize merchant name for the file name (prevents saving errors)
    merchant = (
        receipt_data.get("merchant_name", "Unknown").replace(
            " ", "_").replace("/", "-")
    )
    excel_path = os.path.join(output_dir, f"receipt_{merchant}.xlsx")

    # Create DataFrame from the items array
    items_df = pd.DataFrame(receipt_data.get("items", []))

    # Add metadata columns to the DataFrame so every row has context
    items_df["merchant_name"] = receipt_data.get("merchant_name")
    items_df["date"] = receipt_data.get("date")
    items_df["total_amount"] = receipt_data.get("total_amount")

    # Reorder columns for readability
    preferred_order = ["merchant_name", "date",
                       "total_amount", "description", "price"]
    actual_columns = [
        col for col in preferred_order if col in items_df.columns]

    # If there are items, use the preferred order. Otherwise, handle empty receipts gracefully.
    if not items_df.empty:
        items_df = items_df[actual_columns]

    items_df.to_excel(excel_path, index=False)

    return excel_path
