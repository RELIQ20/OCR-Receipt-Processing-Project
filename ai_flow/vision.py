import os
import cv2
import json
from ollama import chat


def preprocess_image(image_path: str, output_dir: str = "samples") -> str:
    """Cleans the receipt image and saves it to the samples directory."""
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Could not find image at {image_path}")

    # 1. Check if the 'samples' folder exists. If not, create it automatically.
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # 2. Grab the original file name (e.g., 'image_123.jpg' from WhatsApp)
    original_filename = os.path.basename(image_path)

    # 3. Create a safe path: samples/cleaned_image_123.jpg
    output_path = os.path.join(output_dir, f"cleaned_{original_filename}")

    # 4. Process the image
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    cleaned_img = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )

    # 5. Save and return the new safe path
    cv2.imwrite(output_path, cleaned_img)
    return output_path


def extract_receipt_data(image_path: str) -> dict:
    """Sends the cleaned image to Qwen and returns the JSON payload."""

    # This now safely returns something like "samples\cleaned_receipt.jpg"
    clean_image = preprocess_image(image_path)

    system_prompt = """
    You are a highly precise OCR and data extraction engine. Analyze the receipt image and extract the data into the exact JSON schema provided.

    STRICT RULES:
    1. Format: Return ONLY valid JSON. No markdown, no conversational text.
    2. Missing Data: If a field is cut off, illegible, or not present, return null.
    3. Prices: Do NOT confuse credit card numbers, authorization codes, or transaction IDs with item prices.

    REQUIRED SCHEMA:
    {
      "merchant_name": "string",
      "date": "string (YYYY-MM-DD)",
      "time": "string (HH:MM)",
      "total_amount": number,
      "currency": "string",
      "items": [{"description": "string", "price": number}]
    }
    """

    # Ollama will automatically look inside the 'samples' folder because of the path we passed!
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
        options={"temperature": 0},
    )

    receipt_data = json.loads(response.message.content)

    if not receipt_data.get("merchant_name") or not receipt_data.get("total_amount"):
        return {
            "error": "Image cannot be clearly read. Please ask the user to scan again with better lighting."
        }

    return receipt_data
