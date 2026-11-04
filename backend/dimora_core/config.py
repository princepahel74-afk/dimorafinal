"""Settings, read from environment variables (or a .env file next to app.py)."""
from __future__ import annotations

import itertools
import os
import random
import string
from pathlib import Path


def _load_dotenv():
    p = Path(__file__).resolve().parent.parent / ".env"
    if not p.exists():
        return
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_dotenv()


class Settings:
    # "auto" tries the local Ollama server first, then OpenRouter. "ollama" / "openrouter" force one.
    ai_provider = os.getenv("DIMORA_AI_PROVIDER", "auto")
    ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
    ollama_model = os.getenv("OLLAMA_MODEL", "qwen3.5:9b")
    openrouter_url = os.getenv("OPENROUTER_URL", "https://openrouter.ai/api/v1")
    openrouter_key = os.getenv("OPENROUTER_API_KEY", "")
    openrouter_model = os.getenv("OPENROUTER_MODEL", "qwen/qwen3.5-27b")
    ai_timeout = float(os.getenv("DIMORA_AI_TIMEOUT", "120"))
    host = os.getenv("DIMORA_HOST", "127.0.0.1")
    port = int(os.getenv("PORT") or os.getenv("DIMORA_PORT", "8000"))  # hosts like Render set PORT
    max_upload_mb = int(os.getenv("DIMORA_MAX_UPLOAD_MB", "25"))
    # Public site mode: visitors can't point the server at their own URLs, and AI calls that use the
    # server's OpenRouter key are rate-limited (visitors who paste their own key are not limited).
    public = os.getenv("DIMORA_PUBLIC", "0").lower() in ("1", "true", "yes", "on")
    ai_per_hour = int(os.getenv("DIMORA_AI_PER_HOUR", "20"))    # per visitor IP, 0 = unlimited
    ai_per_day = int(os.getenv("DIMORA_AI_PER_DAY", "500"))     # whole site, 0 = unlimited


settings = Settings()

ROOM_TYPES = {
    "living": "Living Room", "bedroom": "Bedroom", "master": "Master Bedroom", "kitchen": "Kitchen",
    "dining": "Dining", "bathroom": "Bathroom", "balcony": "Balcony", "study": "Study", "office": "Home Office",
    "gaming": "Gaming Room", "reading": "Reading Corner", "closet": "Walk-in Closet", "nursery": "Nursery",
    "gym": "Home Gym", "guest": "Guest Room", "pooja": "Pooja Room", "utility": "Utility", "hall": "Passage",
    "empty": "Empty Room", "garage": "Garage", "parking": "Car Parking", "garden": "Garden",
}

_ORD = ["Ground", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth",
        "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth"]
# open-air spaces: no full walls to the outside, no ceiling (balconies get a railing)
OUTDOOR = {"balcony", "parking", "garden"}

FLOOR_NAMES = [f"{w} Floor" for w in _ORD]


def floor_name(k: int) -> str:
    if k < len(FLOOR_NAMES):
        return FLOOR_NAMES[k]
    suf = "th" if 10 <= k % 100 <= 20 else {1: "st", 2: "nd", 3: "rd"}.get(k % 10, "th")
    return f"{k}{suf} Floor"


_counter = itertools.count(1)
_salt = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))


def uid(prefix: str) -> str:
    """Short unique ids like the frontend's uid(): r_k3f9x2."""
    n = next(_counter)
    return f"{prefix}_{_salt}{n:x}"
