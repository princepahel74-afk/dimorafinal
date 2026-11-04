"""Classical computer vision: find walls and enclosed rooms in a floor-plan image.

Pipeline (all OpenCV):
 1. grayscale → Otsu threshold (kept ≥175 so light hatching stays background)
 2. connected components on the dark mask; drop small blobs (text, dimension numbers)
 3. wall thickness: run-length statistics along rows (median = partitions, p90 = outer walls)
 4. morphological dilation to close door gaps
 5. connected components on the free space = candidate rooms; drop the outside region
 6. robust rectangle per room from row/column occupancy histograms
 7. drop rooms nested inside bigger rooms (furniture outlines)
"""
from __future__ import annotations

from dataclasses import dataclass, field

import cv2
import numpy as np


@dataclass
class CVResult:
    W: int
    H: int
    rooms: list[dict] = field(default_factory=list)  # {x0,y0,x1,y1} in CV pixels
    int_px: float = 3.0
    ext_px: float = 6.0
    dark: float = 0.0
    scale: float = 1.0  # CV pixels per source pixel
    openings: list[dict] = field(default_factory=list)  # door/window gaps found in the walls (v2)
    stairs: list[dict] = field(default_factory=list)  # stair boxes found from tread lines (v2)
    method: str = "classic"


def detect_rooms(img: np.ndarray, max_dim: int = 760, gap: float = 0.012) -> CVResult:
    h0, w0 = img.shape[:2]
    sc = min(1.0, max_dim / max(w0, h0))
    W, H = max(8, round(w0 * sc)), max(8, round(h0 * sc))
    small = cv2.resize(img, (W, H), interpolation=cv2.INTER_AREA) if sc < 1 else img.copy()
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY) if small.ndim == 3 else small

    # 1. threshold
    otsu, _ = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    thr = float(np.clip(max(otsu, 175), 120, 215))
    wall = (gray < thr).astype(np.uint8)
    dark = float(wall.mean())

    # 2. remove small blobs (text) — bounding box smaller than 3.5% of the image
    n, labels, stats, _ = cv2.connectedComponentsWithStats(wall, connectivity=8)
    lim = max(W, H) * 0.035
    small_ids = np.where(np.maximum(stats[:, cv2.CC_STAT_WIDTH], stats[:, cv2.CC_STAT_HEIGHT]) < lim)[0]
    small_ids = small_ids[small_ids != 0]
    if len(small_ids):
        wall[np.isin(labels, small_ids)] = 0

    # 3. wall thickness from horizontal run lengths (every 2nd row)
    runs = []
    for row in wall[::2]:
        d = np.diff(np.concatenate(([0], row, [0])).astype(np.int8))
        starts, ends = np.where(d == 1)[0], np.where(d == -1)[0]
        lens = ends - starts
        runs.extend(lens[(lens >= 3) & (lens < 40)].tolist())
    runs.sort()
    int_px = float(runs[len(runs) // 2]) if runs else 3.0
    ext_px = float(runs[int(len(runs) * 0.9)]) if runs else 6.0

    # 4. dilate to close door openings
    r = max(2, round(max(W, H) * gap))
    closed = cv2.dilate(wall, np.ones((2 * r + 1, 2 * r + 1), np.uint8))

    # 5. label free space (4-connected so rooms don't leak through diagonal gaps)
    free = (closed == 0).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(free, connectivity=4)
    min_area = W * H * 0.0025
    grow = r + round(int_px / 2)
    rooms = []
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if area <= min_area or x == 0 or y == 0 or x + w >= W or y + h >= H:
            continue
        # 6. robust rectangle: trim rows/columns that are <30% full (door-swing bulges)
        m = lab[y:y + h, x:x + w] == i
        col, rowc = m.sum(axis=0), m.sum(axis=1)
        cols = np.where(col >= col.max() * 0.3)[0]
        rows = np.where(rowc >= rowc.max() * 0.3)[0]
        a, b = int(cols[0]), int(cols[-1])
        t, u = int(rows[0]), int(rows[-1])
        rooms.append({
            "x0": max(0, x + a - grow), "y0": max(0, y + t - grow),
            "x1": min(W, x + b + grow + 1), "y1": min(H, y + u + grow + 1),
            "fill": float(area) / float(w * h),
        })

    # 7. drop nested components
    def area_of(q):
        return (q["x1"] - q["x0"]) * (q["y1"] - q["y0"])

    keep = [a for a in rooms if not any(
        b is not a and a["x0"] >= b["x0"] - 2 and a["y0"] >= b["y0"] - 2 and a["x1"] <= b["x1"] + 2 and a["y1"] <= b["y1"] + 2
        and area_of(b) > area_of(a) * 1.2 for b in rooms)]
    return CVResult(W=W, H=H, rooms=keep, int_px=int_px, ext_px=ext_px, dark=dark, scale=sc)


def estimate_mpp(cv: CVResult):
    """Metres per CV pixel when the plan has no readable dimensions.

    Two independent cues, combined with a median: outer walls are usually 230 mm (9-inch brick),
    and interior doors are usually ~0.85 m wide."""
    cues = []
    if cv.ext_px >= 3:
        cues.append(("outer walls ≈ 230 mm", 0.23 / cv.ext_px))
    doors = sorted(max(o["x1"] - o["x0"], o["y1"] - o["y0"]) for o in cv.openings if o["kind"] == "door")
    if len(doors) >= 3:
        cues.append(("doors ≈ 0.85 m", 0.85 / doors[len(doors) // 2]))
    if not cues:
        return None, ""
    vals = sorted(v for _, v in cues)
    return vals[len(vals) // 2] if len(vals) % 2 else sum(vals) / len(vals), " + ".join(n for n, _ in cues)
