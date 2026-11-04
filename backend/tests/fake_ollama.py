"""A stand-in for `ollama serve` that answers like Qwen, for offline end-to-end tests.

    python tests/fake_ollama.py      # listens on http://127.0.0.1:11434
"""
import json
import re

from flask import Flask, jsonify, request

app = Flask(__name__)
CALLS = {"plan": 0}


@app.get("/api/tags")
def tags():
    return jsonify(models=[{"name": "qwen3.5:9b"}])


@app.post("/api/chat")
def chat():
    body = request.get_json()
    msg = body["messages"][-1]
    prompt = msg["content"]
    assert body["model"] == "qwen3.5:9b"
    if "floor-plan analyst" in prompt:
        assert msg.get("images"), "plan image missing"
        CALLS["plan"] += 1
        ids = re.findall(r"R(\d+): \[", prompt)
        names = ["Living Room", "Dining", "Kitchen", "Bedroom", "Master Bedroom", "Bathroom", "Study", "Bathroom", "Utility", "Balcony", "Bedroom", "Bathroom", "Closet", "Bathroom"]
        types = ["living", "dining", "kitchen", "bedroom", "master", "bathroom", "study", "bathroom", "utility", "balcony", "bedroom", "bathroom", "closet", "bathroom"]
        rooms = [{"id": f"R{i}", "name": names[k % len(names)], "type": types[k % len(types)]} for k, i in enumerate(ids)]
        out = {"plan_width_m": 11.6, "rooms": rooms, "doors": [], "windows": [], "stairs": [],
               "floor_label": "GROUND FLOOR PLAN" if CALLS["plan"] % 2 == 1 else "FIRST FLOOR PLAN", "level": 0 if CALLS["plan"] % 2 == 1 else 1}
    elif "Aria, the AI home assistant" in prompt:
        out = {"reply": "Done — the first floor is on screen and the living room is sage green.", "actions": [{"do": "show_floor", "floor": "First Floor"}]}
    elif "spoken, animated home tour" in prompt:
        ids = re.findall(r"\[([a-z]_[a-z0-9]+)\]", prompt)
        out = {"intro": "Welcome to your duplex!", "rooms": {i: f"Qwen narration for {i}." for i in ids}, "outro": "That's the tour."}
    else:
        out = {"ok": "DIMORA OK", "summary": "A well-planned home."}
    return jsonify(model=body["model"], message={"role": "assistant", "content": json.dumps(out)}, done=True)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=11434)
