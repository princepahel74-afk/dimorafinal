import io

import numpy as np
from PIL import Image

from conftest import upload


def test_health_reports_ai(client):
    j = client.get("/api/health").get_json()
    assert j["ok"] and "ollama" in j["ai"] and j["ai"]["openrouter"]["model"].startswith("qwen/")


def test_single_floor_cv_only(client, ground_png):
    r = upload(client, [("ground.png", ground_png)], use_ai=0, width_m=11.6)
    assert r.status_code == 200, r.get_json()
    j = r.get_json()
    assert len(j["floors"]) == 1
    f = j["floors"][0]
    assert len(f["rooms"]) >= 10
    assert any(d.get("main") for d in f["doors"])
    assert abs(max(r["x"] + r["w"] for r in f["rooms"]) - min(r["x"] for r in f["rooms"]) - 11.6) < 0.3


def test_sheet_with_two_floors_is_split_aligned_and_connected(client, sheet_png):
    j = upload(client, [("sheet.png", sheet_png)], use_ai=0).get_json()
    assert [f["name"] for f in j["floors"]] == ["Ground Floor", "First Floor"]
    g, up = j["floors"]
    assert len(g["stairs"]) == 1 and up["stairs"] == []
    assert up["overlay"]["image"].startswith("data:image/png")
    # stair top lands inside a room on the first floor
    st = g["stairs"][0]
    s = 1 if st["dir"] > 0 else -1
    hx, hy = (st["x"], st["y"] + s * (st["d"] / 2 + 0.45)) if st["run"] == "z" else (st["x"] + s * (st["w"] / 2 + 0.45), st["y"])
    assert any(r["x"] <= hx <= r["x"] + r["w"] and r["y"] <= hy <= r["y"] + r["d"] for r in up["rooms"])


def test_one_image_per_floor_ordered_by_filename(client, ground_png, first_png):
    j = upload(client, [("house_first_floor.png", first_png), ("house_ground_floor.png", ground_png)], use_ai=0).get_json()
    assert len(j["floors"]) == 2 and j["floors"][0]["stairs"]


def test_pdf_pages_become_floors(client, ground_png, first_png):
    pages = [Image.open(io.BytesIO(b)).convert("RGB") for b in (ground_png, first_png)]
    buf = io.BytesIO()
    pages[0].save(buf, format="PDF", save_all=True, append_images=pages[1:])
    j = upload(client, [("plans.pdf", buf.getvalue())], use_ai=0).get_json()
    assert len(j["floors"]) == 2


def test_forced_floor_count_without_ai_splits_evenly(client, ground_png):
    j = upload(client, [("g.png", ground_png)], use_ai=0, floors=2).get_json()
    assert len(j["floors"]) == 2


def test_bad_upload_is_400(client):
    r = upload(client, [("x.png", b"not an image")], use_ai=0)
    assert r.status_code == 400 and r.get_json()["error"] == "bad_request"


def test_qwen_reading_reorders_floors_by_printed_title(client, sheet_png, fake_qwen):
    j = upload(client, [("sheet.png", sheet_png)]).get_json()
    assert sum("floor-plan analyst" in c for c in fake_qwen) == 2
    assert j["floors"][0]["name"] == "Ground Floor" and j["floors"][1]["name"] == "First Floor"
    # the second plan on the sheet was labelled ground floor by the model → it must come first
    assert j["floors"][0]["overlay"]["image"] != j["floors"][1]["overlay"]["image"]
    assert "Qwen" in j["source"]
    assert any("Staircase" == r["name"] for f in j["floors"] for r in f["rooms"])


def test_restack_moves_a_floor_and_reconnects(client, sheet_png):
    j = upload(client, [("sheet.png", sheet_png)], use_ai=0).get_json()
    floors = j["floors"][::-1]
    offs = [f["overlay"]["off"] for f in floors]
    r = client.post("/api/plans/restack", json={"floors": floors, "offsets": offs}).get_json()
    assert [f["level"] for f in r["floors"]] == [0, 1]
    assert r["floors"][0]["stairs"] and any(d.get("main") for d in r["floors"][0]["doors"])


def test_analyze_graph(client, sheet_png):
    j = upload(client, [("sheet.png", sheet_png)], use_ai=0).get_json()
    a = client.post("/api/analyze", json={"project": {"floors": j["floors"]}}).get_json()
    assert len(a["floors"]) == 2
    g = a["floors"][0]
    assert g["start"] and g["order"][0] == g["start"] and not g["unreachable"]
    assert g["stairs"] and g["stairs"][0]["risers"] >= 12
    assert a["house"]["connected"] is True and a["house"]["farthest_from_entrance"]["metres"] > 0
    assert len(a["tour"]) >= 15


def test_assistant_without_ai_is_503(client):
    r = client.post("/api/assistant", json={"text": "paint it", "home": "{}"}, headers={"X-AI-Provider": "openrouter"})
    assert r.status_code in (502, 503)


def test_assistant_with_qwen_filters_actions(client, fake_qwen):
    doc = '{"do":"wall_color","room":"..","color":"#hex"}'
    j = client.post("/api/assistant", json={"text": "paint the bedroom sage", "home": "{}", "action_doc": doc}).get_json()
    # junk and actions the app doesn't offer are dropped
    assert j["reply"] == "Painted it sage." and j["actions"] == [{"do": "wall_color", "room": "r1", "color": "#9caf88"}]


def test_assistant_plain_text_reply_and_memory(client, fake_qwen):
    j = client.post("/api/assistant", json={"text": "plain text please", "home": "{}", "action_doc": ""}).get_json()
    assert j["reply"].startswith("Sure") and j["actions"] == []
    hist = [{"role": "user", "text": "hi"}, {"role": "model", "text": "hello"}, {"role": "user", "text": ""}]
    j = client.post("/api/assistant", json={"text": "do you remember", "home": "{}", "action_doc": "", "history": hist}).get_json()
    assert j["reply"] == "History: 2 messages"  # empty turns are skipped


def test_narration_keeps_only_known_rooms(client, fake_qwen):
    j = client.post("/api/narration", json={"theme": "Japandi", "household": "4 people", "floors": ["Ground Floor"], "rooms": [{"id": "a", "facts": "Living 5x4"}]}).get_json()
    assert j["rooms"] == {"a": "Room A text"} and j["intro"] == "Hello"


def test_inspiration_validates_choices(client, fake_qwen):
    img = Image.fromarray(np.full((40, 40, 3), 200, np.uint8))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    import base64
    url = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    j = client.post("/api/inspiration", json={"image": url, "styles": ["Japandi"], "floors": ["oak"], "finishes": ["teak"]}).get_json()
    assert j["style"] == "Japandi" and j["floor"] == "oak" and "finish" not in j


def test_report_summary_strips_thinking(client, fake_qwen):
    j = client.post("/api/report-summary", json={"facts": "x"}).get_json()
    assert j["summary"] == "A great home."


def test_frontend_is_served(client):
    r = client.get("/")
    assert r.status_code == 200 and b"DIMORA" in r.data
