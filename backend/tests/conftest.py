import io
import json
import re
import sys
from pathlib import Path

import cv2
import numpy as np
import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
import os  # noqa: E402
import tempfile  # noqa: E402

os.environ.setdefault("DIMORA_DB_PATH", str(Path(tempfile.mkdtemp()) / "test.db"))  # never touch the real database
SAMPLES = ROOT.parent / "samples"

from app import create_app  # noqa: E402
from dimora_core.ai.client import AIClient  # noqa: E402
from dimora_core.store import Store  # noqa: E402


@pytest.fixture()
def client(tmp_path):
    return create_app(Store(url="", path=str(tmp_path / "db.sqlite"))).test_client()


@pytest.fixture()
def ground_png():
    return (SAMPLES / "house_ground_floor.png").read_bytes()


@pytest.fixture()
def first_png():
    return (SAMPLES / "house_first_floor.png").read_bytes()


@pytest.fixture()
def sheet_png(ground_png, first_png):
    a = cv2.imdecode(np.frombuffer(ground_png, np.uint8), cv2.IMREAD_COLOR)
    b = cv2.imdecode(np.frombuffer(first_png, np.uint8), cv2.IMREAD_COLOR)
    gap = np.full((a.shape[0], 110, 3), 250, np.uint8)
    ok, buf = cv2.imencode(".png", np.hstack([a, gap, b]))
    return buf.tobytes()


@pytest.fixture()
def fake_qwen(monkeypatch):
    """Pretend Ollama is running Qwen; answer each prompt type with canned JSON."""
    calls = []

    def fake_ollama(self, messages, temperature, max_tokens, want_json, timeout):
        prompt = messages[-1]["text"]
        calls.append(prompt)
        if "floor-plan analyst" in prompt:
            ids = re.findall(r"R(\d+): \[", prompt)
            first_call = sum("floor-plan analyst" in c for c in calls) == 1
            rooms = [{"id": f"R{i}", "name": "Staircase" if k == 0 else f"Room {i}", "type": "hall" if k == 0 else "bedroom"} for k, i in enumerate(ids)]
            # sheet order is ground, first — the fake swaps the titles to test re-ordering
            return json.dumps({"plan_width_m": 11.6, "rooms": rooms, "doors": [], "windows": [], "stairs": [],
                               "floor_label": "FIRST FLOOR PLAN" if first_call else "GROUND FLOOR PLAN", "level": 1 if first_call else 0})
        if "HOME FACTS" in prompt:
            if "plain text please" in prompt:
                return "Sure — your living room is 5 by 4.8 metres."
            if "remember" in prompt:
                return json.dumps({"reply": f"History: {len(messages) - 1} messages", "actions": []})
            return '```json\n{"reply":"Painted it sage.","actions":[{"do":"wall_color","room":"r1","color":"#9caf88"}, "junk", {"do":"format_disk"}]}\n```'
        if "spoken, animated home tour" in prompt:
            return json.dumps({"intro": "Hello", "rooms": {"a": "Room A text", "zzz": "unknown id"}, "outro": "Bye"})
        if "inspiration photo" in prompt:
            return json.dumps({"style": "Japandi", "wall": "#eeeeee", "accent": "#123456", "floor": "oak", "furniture_finish": "walnut", "description": "Calm."})
        if "executive summary" in prompt:
            return '<think>hmm</think>{"summary":"A great home."}'
        return '{"ok":"DIMORA OK"}'

    monkeypatch.setattr(AIClient, "order", lambda self: ["ollama"])
    monkeypatch.setattr(AIClient, "_ollama", fake_ollama)
    return calls


def upload(client, files, **form):
    data = {k: str(v) for k, v in form.items()}
    data["files"] = [(io.BytesIO(b), name) for name, b in files]
    return client.post("/api/plans/detect", data=data, content_type="multipart/form-data")
