import os
import cv2
import json
from ollama import chat
from .config import BASE_DIR
from .utils import log

def preprocess_image(image_path: str) -> str:
    """Compresses and grayscales the image temporarily for faster OCR."""
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Could not read image at: {image_path}")

    # Compress size to max 800px width/height for faster processing
    max_dim = 800
    h, w = img.shape[:2]
    if max(h, w) > max_dim:
        if h > w:
            ratio = max_dim / h
        else:
            ratio = max_dim / w
        new_dim = (int(w * ratio), int(h * ratio))
        img = cv2.resize(img, new_dim, interpolation=cv2.INTER_AREA)

    # Grayscale for simpler matrix
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    samples_dir = os.path.join(BASE_DIR, "samples")
    os.makedirs(samples_dir, exist_ok=True)

    original_filename = os.path.basename(image_path)
    output_path = os.path.join(samples_dir, f"temp_ocr_{original_filename}")

    # Write compressed JPEG
    cv2.imwrite(output_path, gray, [cv2.IMWRITE_JPEG_QUALITY, 60])
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
    - Prices and quantities as numbers (no currency symbols).
    - currency: "PHP", "USD", etc. or null.
    - category: Assign a single category from this exact list: "Food & Dining", "Equipment", "Office Supplies", "Travel", "Health & Wellness", "Others".
    - items: list of {"description": str, "quantity": number, "price": number, "total_price": number}. Include ALL items. If quantity is not stated, assume 1. The total_price is quantity * price.
    Schema:
    {
    "merchant_name": "string",
    "date": "string or null",
    "time": "string or null",
    "total_amount": number or null,
    "currency": "string or null",
    "category": "string",
    "items": [{"description": "string", "quantity": number, "price": number, "total_price": number}, ...]
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
            "num_predict": 2048,
            "keep_alive": "30m",
        },
    )

    raw_text = response.message.content.strip()

    if raw_text.startswith("json"):
        raw_text = raw_text[7:]
    elif raw_text.startswith("```json"):
        raw_text = raw_text[7:]
    elif raw_text.startswith("```"):
        raw_text = raw_text[3:]

    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]

    raw_text = raw_text.strip()
    
    # Sometimes models output the keys without the enclosing braces
    if not raw_text.startswith("{"):
        raw_text = "{" + raw_text
    
    # If it was cut off and doesn't end with }, try to naively cap it off (though num_predict should fix the cutoff)
    if not raw_text.endswith("}"):
        if raw_text.endswith(","):
            raw_text = raw_text[:-1]
        if not raw_text.endswith("]"):
            # If we're inside the items array but it didn't close
            raw_text += "]}"
        else:
            raw_text += "}"


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
