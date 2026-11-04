"""A stand-in for openrouter.ai for end-to-end tests: same /chat/completions API, canned answers.

    python tests/fake_openrouter.py            # serves http://127.0.0.1:11500/api/v1
    OPENROUTER_URL=http://127.0.0.1:11500/api/v1 OPENROUTER_API_KEY=test-key DIMORA_AI_PROVIDER=openrouter python app.py
"""
import json
import re

from flask import Flask, jsonify, request

app = Flask(__name__)
KEY = "test-key"
SEEN = []


def answer(prompt: str, n_msgs: int) -> str:
    if "HOME FACTS" in prompt:
        user = prompt.rsplit("User:", 1)[-1].split("\n")[0].strip().lower()
        facts = json.loads(re.search(r"HOME FACTS \(JSON\): (\{.*?\})\n", prompt, re.S).group(1))
        rooms = facts.get("rooms", [])
        if "paint" in user and "bedroom" in user:
            ids = [r["id"] for r in rooms if r["type"] in ("bedroom", "master", "guest")]
            return json.dumps({"reply": f"Painted {len(ids)} bedrooms a soft sage.", "actions": [{"do": "wall_color", "room": i, "color": "#b5c4a8", "name": "sage"} for i in ids]})
        if "how much" in user or "cost" in user:
            t = facts["totals"]["estimate_inr"]
            return json.dumps({"reply": f"The whole design comes to about ₹{t:,} (estimate).", "actions": []})
        if "remember" in user:
            return json.dumps({"reply": f"I can see {n_msgs - 1} earlier messages in our chat.", "actions": []})
        if "roof" in user:
            return json.dumps({"reply": "Here's the finished roof.", "actions": [{"do": "roof", "on": True}]})
        return json.dumps({"reply": "Happy to help with your home!", "actions": []})
    if "spoken, animated home tour" in prompt:
        ids = re.findall(r"^\[(\w+)\]", prompt, re.M)
        return json.dumps({"intro": "Welcome home.", "rooms": {i: "A lovely, light-filled space." for i in ids}, "outro": "Thanks for touring."})
    if "executive summary" in prompt:
        return json.dumps({"summary": "A well-planned home."})
    if "floor-plan analyst" in prompt:
        return json.dumps({"plan_width_m": None, "rooms": [], "extra_rooms": [], "doors": [], "windows": [], "stairs": []})
    return json.dumps({"ok": "DIMORA OK"})


@app.post("/api/v1/chat/completions")
def chat():
    if request.headers.get("Authorization") != f"Bearer {KEY}":
        return jsonify(error={"message": "No auth credentials found", "code": 401}), 401
    b = request.get_json()
    msgs = b.get("messages") or []
    last = msgs[-1]["content"]
    prompt = last if isinstance(last, str) else " ".join(p.get("text", "") for p in last if p.get("type") == "text")
    SEEN.append({"model": b.get("model"), "chars": len(prompt)})
    return jsonify(choices=[{"message": {"role": "assistant", "content": answer(prompt, len(msgs))}}], model=b.get("model"))


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=11500)
