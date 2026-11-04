"""Multi-storey sheets: plans side by side, inside a drawing frame, and typical floors."""
from pathlib import Path

import cv2
import numpy as np

from dimora_core import pipeline
from dimora_core.vision.walls import detect_plan, plan_boxes

SAMPLES = Path(__file__).resolve().parents[2] / "samples"


def _img(name):
    return cv2.imread(str(SAMPLES / name))


def _sheet(framed: bool):
    g, f = _img("house_ground_floor.png"), _img("house_first_floor.png")
    h = max(g.shape[0], f.shape[0]) + 160
    w = g.shape[1] + f.shape[1] + 240
    s = np.full((h, w, 3), 250, np.uint8)
    s[80:80 + g.shape[0], 80:80 + g.shape[1]] = g
    s[80:80 + f.shape[0], 160 + g.shape[1]:160 + g.shape[1] + f.shape[1]] = f
    if framed:  # drawing border + title block, joined to the border
        cv2.rectangle(s, (12, 12), (w - 13, h - 13), (20, 20, 20), 6)
        cv2.rectangle(s, (w - 520, h - 120), (w - 13, h - 13), (20, 20, 20), 3)
        cv2.line(s, (w - 520, h - 70), (w - 13, h - 70), (20, 20, 20), 2)
    return s


def _detect(img, **kw):
    ok, buf = cv2.imencode(".png", img)
    return pipeline.detect([("sheet.png", buf.tobytes())], use_ai=False, ai=None, **kw)


def test_two_plans_side_by_side():
    assert len(plan_boxes(_sheet(False))) == 2


def test_frame_and_title_block_do_not_merge_floors():
    sheet = _sheet(True)
    assert len(plan_boxes(sheet)) == 2
    res = _detect(sheet)
    assert len(res["floors"]) == 2
    for f in res["floors"]:
        w = max(r["x"] + r["w"] for r in f["rooms"]) - min(r["x"] for r in f["rooms"])
        assert 9 < w < 14  # the real plan is 11.6 m wide, not the whole sheet
        assert 11 <= len(f["rooms"]) <= 16
    assert res["floors"][0]["stairs"]


def test_exterior_door_beside_window_keeps_the_room():
    res = detect_plan(_img("house_ground_floor.png"))
    # living room 5.0 × 4.8 m is the biggest room; it used to leak outside through the front door
    areas = sorted(((q["x1"] - q["x0"]) * (q["y1"] - q["y0"]) for q in res.rooms), reverse=True)
    assert len(res.rooms) >= 12 and areas[0] > 1.5 * areas[2]
    assert sum(o["kind"] == "window" for o in res.openings) >= 7


def test_typical_floor_is_repeated():
    res = _detect(_img("house_first_floor.png"), forced_floors=4)
    names = [f["name"] for f in res["floors"]]
    assert names == ["Ground Floor", "First Floor", "Second Floor", "Third Floor"]
    assert all(f["stairs"] for f in res["floors"][:-1])
    assert any("typical floor" in line for line in res["log"])
