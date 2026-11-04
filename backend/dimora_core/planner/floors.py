"""Multi-storey planning: order floors, share a scale, align them and connect them with stairs."""
from __future__ import annotations

import re

import numpy as np
from scipy.optimize import linear_sum_assignment

from ..config import FLOOR_NAMES, floor_name, uid
from ..dsa.geometry import as_rect, bounds, clamp, r2
from ..dsa.spatial import RoomGrid

WORDS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh"]


def parse_level(s):
    """'GROUND FLOOR PLAN' → 0, '1st floor' → 1, 'FF' → 1, 'terrace' → 50, unknown → None."""
    s = str(s or "").lower()
    if not s:
        return None
    if re.search(r"basement|cellar|lower ground", s):
        return -1
    if re.search(r"ground|\bg\.?\s?f\b|stilt|\bgf\b|\bg\s*floor", s):
        return 0
    if re.search(r"terrace|roof", s):
        return 50
    for i, w in enumerate(WORDS):
        if re.search(rf"\b{w}\b", s):
            return i + 1
    m = re.search(r"\b(\d)\s*(st|nd|rd|th)\b", s) or re.search(r"\bfloor\s*(\d)\b", s) or re.search(r"\b(\d)\s*f\b", s)
    if m:
        return int(m.group(1))
    if re.search(r"\bf\.?\s?f\b|\bff\b", s):
        return 1
    if re.search(r"\bs\.?\s?f\b|\bsf\b", s):
        return 2
    return None


def clean_floor_name(label, k: int) -> str:
    t = re.sub(r"\b(plan|layout|drawing|proposed)\b", "", str(label or ""), flags=re.I)
    t = re.sub(r"scale.*$", "", t, flags=re.I)
    t = re.sub(r"[^\w\s+-]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    if not t or len(t) > 24 or not re.search(r"floor|level|storey|terrace|basement|stilt|roof", t, re.I):
        return floor_name(k)
    return t.title()


def shift_floor(f, dx: float, dy: float):
    if not dx and not dy:
        return
    for key in ("rooms", "doors", "windows", "stairs", "stair_rects"):
        for o in f.get(key, []):
            o["x"] = r2(o["x"] + dx)
            o["y"] = r2(o["y"] + dy)


def footprint_overlap(a, b, dx=0.0, dy=0.0) -> float:
    """Built area shared by two floors (yards — parking, garden — don't count)."""
    ra = [r for r in a["rooms"] if r.get("type") not in ("parking", "garden")]
    rb = [q for q in b["rooms"] if q.get("type") not in ("parking", "garden")]
    return sum(as_rect(r).overlap(as_rect(q).shifted(dx, dy)) for r in ra for q in rb)


def match_stairs(A, B):
    """Pair staircases on two floors with the Hungarian algorithm (min total size mismatch)."""
    if not A or not B:
        return []
    cost = np.array([[abs(max(s["w"], s["d"]) - max(t["w"], t["d"])) + abs(min(s["w"], s["d"]) - min(t["w"], t["d"])) for t in B] for s in A])
    rows, cols = linear_sum_assignment(cost)
    return [(A[i], B[j]) for i, j in zip(rows, cols) if cost[i, j] < 2.5]


def best_offset(a, b):
    """Translation that places floor b over floor a.

    Candidates: matched staircases (+12% bonus) and the 9 combinations of aligning
    left/right/centre × top/bottom/centre of the footprints. Pick max overlap, then
    snap outer walls that nearly line up.
    """
    A, B = bounds(a["rooms"]), bounds(b["rooms"])
    cands = []
    for s, t in match_stairs(a.get("stair_rects", []), b.get("stair_rects", [])):
        cands.append((as_rect(s).cx - as_rect(t).cx, as_rect(s).cy - as_rect(t).cy, 0.12))
    for dx in (A.x - B.x, A.x1 - B.x1, A.cx - B.cx):
        for dy in (A.y - B.y, A.y1 - B.y1, A.cy - B.cy):
            cands.append((dx, dy, 0.0))
    best = max(cands, key=lambda c: footprint_overlap(a, b, c[0], c[1]) * (1 + c[2]))
    dx, dy = best[0], best[1]

    def snap(v, opts):
        ds = [o - v for o in opts if abs(o - v) < 0.45]
        return min(ds, key=abs) if ds else 0.0

    dx += snap(B.x + dx, [A.x, A.x1 - B.w])
    dy += snap(B.y + dy, [A.y, A.y1 - B.d])
    return r2(dx), r2(dy)


# ---- staircases -------------------------------------------------------------
def stair_risers(f) -> int:
    return max(12, int(np.ceil((f.get("height", 2.9) + 0.25) / 0.18)))


def stair_len(st):
    return st["d"] if st.get("run", "z") == "z" else st["w"]


def stair_width(st):
    return st["w"] if st.get("run", "z") == "z" else st["d"]


def stair_foot(st):
    return {"x": st["x"] - st["w"] / 2, "y": st["y"] - st["d"] / 2, "w": st["w"], "d": st["d"]}


def stair_end(st, which: str, beyond: float = 0.0):
    s = (1 if which == "high" else -1) * st.get("dir", 1)
    L = stair_len(st) / 2 + beyond
    return (st["x"], st["y"] + s * L) if st.get("run", "z") == "z" else (st["x"] + s * L, st["y"])


def make_stair(rc, lo, up):
    """Fit a straight flight in rect rc. Try both directions and both ends; score:
    +3 top lands in a room upstairs, +2 bottom landing is inside a room, +1 a door is
    near the bottom, +0.5 leftover landing at the top inside rc."""
    run_z = rc["d"] >= rc["w"]
    L, Wd = (rc["d"], rc["w"]) if run_z else (rc["w"], rc["d"])
    want = clamp(stair_risers(lo) * 0.25, 2.6, 4.6)
    length = r2(want if L - want >= 0.9 else L - 0.9 if L - 0.9 >= 2.4 else min(L, max(2.2, want)))
    sw = r2(clamp(min(Wd, 1.2), 0.75, 1.5))
    c0 = rc["y"] if run_z else rc["x"]
    across = rc["x"] + rc["w"] / 2 if run_z else rc["y"] + rc["d"] / 2
    g_lo, g_up = RoomGrid(lo["rooms"]), RoomGrid(up["rooms"]) if up else None
    best = None
    for direction in (1, -1):
        for along in (c0 + length / 2, c0 + L - length / 2):
            st = ({"x": r2(across), "y": r2(along), "w": sw, "d": length, "run": "z", "dir": direction} if run_z
                  else {"x": r2(along), "y": r2(across), "w": length, "d": sw, "run": "x", "dir": direction})
            hi, lw = stair_end(st, "high", 0.45), stair_end(st, "low", 0.45)
            sc = 0.0
            if g_up and g_up.inside(*hi):
                sc += 3
            if g_lo.inside(*lw):
                sc += 2
            if any(abs(d["x"] - lw[0]) + abs(d["y"] - lw[1]) < 1.6 for d in lo.get("doors", [])):
                sc += 1
            if g_up and as_rect(rc).contains(*hi):
                sc += 0.5
            if best is None or sc > best[0]:
                best = (sc, st)
    return {"id": uid("s"), **best[1]}


def place_stairs(lo, up):
    """Choose where the flight from floor lo to floor up goes (priority order)."""
    A, B = lo.get("stair_rects", []), up.get("stair_rects", [])
    cands = []
    for s in A:
        sc = (3 if s.get("src") == "ai" else 2) + (2 if any(as_rect(s).overlap(as_rect(t)) > as_rect(s).area * 0.3 for t in B) else 0)
        cands.append((sc, s))
    cands += [(1, s) for s in B]
    rc = max(cands, key=lambda c: c[0])[1] if cands else None
    if rc is None:  # corridor-like halls that sit under a hall upstairs
        halls = [r for r in lo["rooms"] if r["type"] == "hall" and min(r["w"], r["d"]) >= 0.9 and max(r["w"], r["d"]) >= 2.4]
        if halls:
            rc = max(halls, key=lambda r: (2 if any(q["type"] == "hall" and as_rect(r).overlap(as_rect(q)) > as_rect(r).area * 0.5 for q in up["rooms"]) else 0) + max(r["w"], r["d"]) / 10)
    if rc is None:  # last resort: along the inner edge of the living room
        hub = next((r for r in lo["rooms"] if r["type"] == "living"), None) or max(lo["rooms"], key=lambda r: r["w"] * r["d"], default=None)
        if hub is None:
            return None
        rc = ({"x": hub["x"] + hub["w"] - 1.1, "y": hub["y"] + max(0.2, hub["d"] - 3.6), "w": 1.0, "d": min(3.4, hub["d"] - 0.4)} if hub["d"] >= hub["w"]
              else {"x": hub["x"] + max(0.2, hub["w"] - 3.6), "y": hub["y"] + hub["d"] - 1.1, "w": min(3.4, hub["w"] - 0.4), "d": 1.0})
    st = make_stair(rc, lo, up)
    lo["stairs"] = [st]
    return st


def align_and_connect(floors, offsets=None):
    """Align each floor over the one below, then add one staircase per consecutive pair."""
    for k in range(1, len(floors)):
        dx, dy = best_offset(floors[k - 1], floors[k])
        shift_floor(floors[k], dx, dy)
        if offsets is not None:
            offsets[k][0] += dx
            offsets[k][1] += dy
    for f in floors:
        f["stairs"] = []
    for k in range(len(floors) - 1):
        place_stairs(floors[k], floors[k + 1])
    return floors
