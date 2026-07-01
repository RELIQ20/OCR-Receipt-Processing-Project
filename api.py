import cv2
import json
from ollama import chat
from ollama import ChatResponse


def preprocess_image(image_path, output_path="cleaned_receipt.jpg"):
    """
    Cleans the receipt image using OpenCV to improve OCR accuracy.
    """
    # 1. Read the image
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Could not find image at {image_path}")

    # 2. Convert to grayscale (AI doesn't need color to read text)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 3. Apply Adaptive Thresholding
    # This acts like a scanner, making the background pure white and text solid black,
    # which completely eliminates shadows and fixes faded thermal prints.
    cleaned_img = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )

    # 4. Save the preprocessed image
    cv2.imwrite(output_path, cleaned_img)
    return output_path

# The original messy photo
raw_image_path = "samples/sample4.jpeg"

try:
    # Run the OpenCV cleaner
    print("Preprocessing image...")
    clean_image = preprocess_image(raw_image_path)

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

    print("Sending to Qwen2.5-VL...")
    response: ChatResponse = chat(
        model="qwen2.5vl",
        format="json",
        messages=[
            {
                "role": "user",
                "content": system_prompt,
                "images": [clean_image],  # Pass the CLEANED image to the AI
            }
        ],
        options={"temperature": 0},  # 0 forces robotic precision
    )

    # Parse and validate the response
    receipt_data = json.loads(response.message.content)

    # If the AI couldn't find a merchant or total, the scan is likely unreadable
    if (
        receipt_data.get("merchant_name") is None
        or receipt_data.get("total_amount") is None
    ):
        print("\nError: Image can't be read. Try scanning again.")
    else:
        print("\n--- EXTRACTION SUCCESSFUL ---")
        print(json.dumps(receipt_data, indent=2))

except Exception as e:
    # Catching generic errors (like missing files or complete JSON failure)
    print(f"\nError: Image can't be read. Try scanning again. (Detail: {e})")
