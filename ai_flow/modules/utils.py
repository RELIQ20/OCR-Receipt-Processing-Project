import sys
import os
import urllib.parse
from .config import BASE_DIR

def log(msg: str):
    sys.stderr.write(f"[OcrReceipt] {msg}\n")
    sys.stderr.flush()

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
