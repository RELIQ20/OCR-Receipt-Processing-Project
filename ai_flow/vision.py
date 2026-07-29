import os
import sys
import cv2
import json
from ollama import chat

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def log(msg: str):
    sys.stderr.write(f"[OcrReceipt] {msg}\n")
    sys.stderr.flush()

def preprocess_image(image_path: str) -> str:
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
    img = cv2.imread(image_path)
    if img is None:
        return image_path

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

    cv2.imwrite(output_path, img, [cv2.IMWRITE_JPEG_QUALITY, 70])
    return output_path

def extract_receipt_data(image_path: str) -> dict:
    """Sends the RAW image to the OCR model and safely parses the JSON."""
    system_prompt = """You are an expert receipt OCR engine. Extract data into EXACT JSON. 
    - Return ONLY valid JSON, no explanations, no markdown formatting, no backticks.
    - For missing/illegible fields use null.
    - Dates in YYYY-MM-DD. Time in HH:MM.
    - Prices as numbers (no currency symbols).
    - currency: "PHP", "USD", etc. or null.
    - items: list of {"description": str, "quantity": number, "price": number}. Include ALL items. If quantity is not explicitly stated, default to 1.
    Schema:
    {
    "merchant_name": "string",
    "date": "string or null",
    "time": "string or null",
    "total_amount": number or null,
    "currency": "string or null",
    "items": [{"description": "string", "quantity": number, "price": number}, ...]
    }
    """
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
            "num_ctx": 16384,
            "keep_alive": "30m",
        },
    )

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
        log(f"Failed to parse JSON. Raw model output was: {raw_text}")
        return {"error": "Failed to parse model output into structured JSON."}

    if not receipt_data.get("merchant_name") or not receipt_data.get("total_amount"):
        return {
            "error": "Image cannot be clearly read. Please scan again with better lighting."
        }

    return receipt_data
