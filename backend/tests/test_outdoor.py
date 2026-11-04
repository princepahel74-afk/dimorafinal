"""Plots: compound wall / plot line around the house → car parking and garden, not indoor rooms."""
from pathlib import Path

import cv2
import numpy as np

from dimora_core import pipeline

SAMPLES = Path(__file__).resolve().parents[2] / "samples"


def _plot(thick: bool):
    g = cv2.imread(str(SAMPLES / "house_ground_floor.png"))
    ppm = 48.5  # sample drawing: about 48.5 px per metre
    front, side, rear = int(6.5 * ppm), int(1.6 * ppm), int(3.2 * ppm)
    pad = 30
    h, w = g.shape[:2]
    s = np.full((h + front + rear + 2 * pad, w + 2 * side + 2 * pad, 3), 250, np.uint8)
    oy, ox = front + pad, side + pad
    s[oy:oy + h, ox:ox + w] = g
    x0, y0, x1, y1 = ox + 65 - side, oy + 65 - front, ox + 632 + side, oy + 527 + rear
    lw = 9 if thick else 2
    gate0, gate1 = ox + 105, ox + 105 + int(3.2 * ppm)
    for a, b in [((x0, y0), (gate0, y0)), ((gate1, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x1, y1), (x0, y1)), ((x0, y1), (x0, y0))]:
        cv2.line(s, a, b, (25, 25, 25), lw)
    cv2.rectangle(s, (gate0 + 20, y0 + 60), (gate0 + 107, y0 + 270), (60, 60, 60), 1)  # a car symbol
    return s


def _floor(img):
    ok, buf = cv2.imencode(".png", img)
    return pipeline.detect([("plot.png", buf.tobytes())], use_ai=False, ai=None)["floors"][0]


def _check(f):
    yards = [r for r in f["rooms"] if r["type"] in ("parking", "garden")]
    house = [r for r in f["rooms"] if r["type"] not in ("parking", "garden")]
    assert any(r["type"] == "parking" for r in yards)
    assert any(r["type"] == "garden" for r in yards)
    park = next(r for r in yards if r["type"] == "parking")
    assert min(park["w"], park["d"]) >= 2.5 and max(park["w"], park["d"]) >= 4.8
    width = max(r["x"] + r["w"] for r in house) - min(r["x"] for r in house)
    assert 9.5 < width < 13.5  # scale comes from the house, not the plot
    assert 11 <= len(house) <= 16
    assert not any(d for d in f["doors"] if any(r["type"] in ("parking", "garden") and abs(d["x"] - (r["x"] + r["w"] / 2)) < r["w"] / 2 and abs(d["y"] - (r["y"] + r["d"] / 2)) < r["d"] / 2 for r in yards))


def test_thick_compound_wall_gives_parking_and_garden():
    _check(_floor(_plot(True)))


def test_thin_plot_line_gives_parking_and_garden():
    _check(_floor(_plot(False)))


def test_plan_without_a_plot_has_no_yards():
    f = _floor(cv2.imread(str(SAMPLES / "house_ground_floor.png")))
    assert not any(r["type"] in ("parking", "garden") for r in f["rooms"])


def test_garage_is_a_built_room_type():
    from dimora_core.config import ROOM_TYPES, OUTDOOR
    from dimora_core.ai.services import TYPES
    assert ROOM_TYPES["garage"] == "Garage"
    assert "garage" not in OUTDOOR          # walled and roofed: gets a roll-up door, not a railing
    assert "garage" in TYPES                # the plan reader may label rooms as garages
