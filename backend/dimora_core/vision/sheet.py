"""Split an architect's sheet that holds several floor plans into one crop per plan.

Each plan is a big cluster of line work separated from the others by white space:
dilate the ink, take connected components (OpenCV), keep the large ones, order them
in reading order (row-major), then pad each crop so its printed title is included
without running into a neighbouring plan.
"""
from __future__ import annotations

import cv2
import numpy as np


def split_sheet(img: np.ndarray, max_dim: int = 640) -> list[dict]:
    h0, w0 = img.shape[:2]
    sc = min(1.0, max_dim / max(w0, h0))
    W, H = max(8, round(w0 * sc)), max(8, round(h0 * sc))
    small = cv2.resize(img, (W, H), interpolation=cv2.INTER_AREA) if sc < 1 else img
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    dark = (gray < 170).astype(np.uint8)
    r = max(2, round(max(W, H) * 0.018))
    mask = cv2.dilate(dark, np.ones((2 * r + 1, 2 * r + 1), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(mask, connectivity=4)
    comps = []
    for i in range(1, n):
        x, y, w, h, _ = st[i]
        ink = int(dark[lab == i].sum())
        comps.append({"x0": max(0, x - r), "y0": max(0, y - r), "x1": min(W, x + w + r), "y1": min(H, y + h + r), "ink": ink})

    def area(b):
        return (b["x1"] - b["x0"]) * (b["y1"] - b["y0"])

    big = max([area(b) for b in comps] + [1])
    plans = [b for b in comps if area(b) >= big * 0.16 and min(b["x1"] - b["x0"], b["y1"] - b["y0"]) >= min(W, H) * 0.14 and b["ink"] > 40]
    plans = [a for a in plans if not any(b is not a and a["x0"] >= b["x0"] and a["y0"] >= b["y0"] and a["x1"] <= b["x1"] and a["y1"] <= b["y1"] for b in plans)]
    plans = sorted(plans, key=area, reverse=True)[:6]
    row_tol = H * 0.2
    # reading order: same row (within 20% of height) → left to right
    plans.sort(key=lambda b: (round(b["y0"] / row_tol), b["x0"]))
    if not plans:
        return [{"x0": 0.0, "y0": 0.0, "x1": 1.0, "y1": 1.0}]
    return [{"x0": float(b["x0"] / W), "y0": float(b["y0"] / H), "x1": float(b["x1"] / W), "y1": float(b["y1"] / H)} for b in plans]


def pad_boxes(boxes: list[dict], pad: float = 0.05) -> list[dict]:
    out = []
    for i, b in enumerate(boxes):
        e = {"x0": max(0, b["x0"] - pad), "y0": max(0, b["y0"] - pad * 1.6), "x1": min(1, b["x1"] + pad), "y1": min(1, b["y1"] + pad * 1.6)}
        for j, o in enumerate(boxes):
            if j == i:
                continue
            if b["x1"] <= o["x0"]:
                e["x1"] = min(e["x1"], (b["x1"] + o["x0"]) / 2)
            elif o["x1"] <= b["x0"]:
                e["x0"] = max(e["x0"], (o["x1"] + b["x0"]) / 2)
            elif b["y1"] <= o["y0"]:
                e["y1"] = min(e["y1"], (b["y1"] + o["y0"]) / 2)
            elif o["y1"] <= b["y0"]:
                e["y0"] = max(e["y0"], (o["y1"] + b["y0"]) / 2)
        out.append(e)
    return out


def even_split(n: int, img: np.ndarray) -> list[dict]:
    h, w = img.shape[:2]
    wide = w >= h
    cols = 2 if n == 4 else (n if wide else 1)
    rows = 2 if n == 4 else (1 if wide else n)
    return [{"x0": i / cols, "y0": j / rows, "x1": (i + 1) / cols, "y1": (j + 1) / rows} for j in range(rows) for i in range(cols)]


def crop(img: np.ndarray, b: dict) -> np.ndarray:
    h, w = img.shape[:2]
    x0, y0 = round(b["x0"] * w), round(b["y0"] * h)
    x1, y1 = max(x0 + 8, round(b["x1"] * w)), max(y0 + 8, round(b["y1"] * h))
    return img[y0:y1, x0:x1].copy()
