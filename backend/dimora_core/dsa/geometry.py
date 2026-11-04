"""Axis-aligned rectangle geometry used everywhere in the planner.

Plan coordinates are metres: x grows east, y grows south (same as the frontend).
A room/stair/hole is an axis-aligned rectangle (x, y, w, d).
"""
from __future__ import annotations

from dataclasses import dataclass


def r2(v: float) -> float:
    """Round to centimetres (2 dp), like the frontend's r2()."""
    return round(float(v) + 0.0, 2)


def clamp(v: float, lo: float, hi: float) -> float:
    return lo if v < lo else hi if v > hi else v


@dataclass
class Rect:
    x: float
    y: float
    w: float
    d: float

    @property
    def x1(self) -> float:
        return self.x + self.w

    @property
    def y1(self) -> float:
        return self.y + self.d

    @property
    def area(self) -> float:
        return self.w * self.d

    @property
    def cx(self) -> float:
        return self.x + self.w / 2

    @property
    def cy(self) -> float:
        return self.y + self.d / 2

    def contains(self, px: float, py: float, margin: float = 0.0) -> bool:
        return self.x - margin <= px <= self.x1 + margin and self.y - margin <= py <= self.y1 + margin

    def overlap(self, o: "Rect") -> float:
        """Area of intersection — O(1)."""
        ox = min(self.x1, o.x1) - max(self.x, o.x)
        oy = min(self.y1, o.y1) - max(self.y, o.y)
        return ox * oy if ox > 0 and oy > 0 else 0.0

    def shifted(self, dx: float, dy: float) -> "Rect":
        return Rect(self.x + dx, self.y + dy, self.w, self.d)


def as_rect(o) -> Rect:
    """Accept a dict with x, y, w, d or a Rect."""
    if isinstance(o, Rect):
        return o
    return Rect(float(o["x"]), float(o["y"]), float(o["w"]), float(o["d"]))


def bounds(rects) -> Rect:
    rects = [as_rect(r) for r in rects]
    if not rects:
        return Rect(0, 0, 10, 8)
    x0 = min(r.x for r in rects)
    y0 = min(r.y for r in rects)
    x1 = max(r.x1 for r in rects)
    y1 = max(r.y1 for r in rects)
    return Rect(x0, y0, x1 - x0, y1 - y0)


def rect_minus(r: Rect, holes) -> list[Rect]:
    """Rectangle difference: split r around each hole into at most 4 pieces per hole.

    Used for slabs/ceilings with stair openings. O(h * p) for h holes and p pieces.
    """
    pieces = [r]
    for h in holes:
        h = as_rect(h)
        nxt = []
        for p in pieces:
            ox0, oy0 = max(p.x, h.x), max(p.y, h.y)
            ox1, oy1 = min(p.x1, h.x1), min(p.y1, h.y1)
            if ox1 - ox0 <= 0.01 or oy1 - oy0 <= 0.01:
                nxt.append(p)
                continue
            if oy0 > p.y:
                nxt.append(Rect(p.x, p.y, p.w, oy0 - p.y))
            if oy1 < p.y1:
                nxt.append(Rect(p.x, oy1, p.w, p.y1 - oy1))
            if ox0 > p.x:
                nxt.append(Rect(p.x, oy0, ox0 - p.x, oy1 - oy0))
            if ox1 < p.x1:
                nxt.append(Rect(ox1, oy0, p.x1 - ox1, oy1 - oy0))
        pieces = [q for q in nxt if q.w > 0.01 and q.d > 0.01]
    return pieces


def shared_edge(a, b, tol: float = 0.15):
    """Common wall between two touching rooms → {'o','c','lo','hi'} or None. O(1)."""
    a, b = as_rect(a), as_rect(b)
    if abs(a.x1 - b.x) < tol or abs(b.x1 - a.x) < tol:
        c = (a.x1 + b.x) / 2 if abs(a.x1 - b.x) < tol else (b.x1 + a.x) / 2
        lo, hi = max(a.y, b.y), min(a.y1, b.y1)
        if hi - lo > 0.6:
            return {"o": "v", "c": c, "lo": lo, "hi": hi}
    if abs(a.y1 - b.y) < tol or abs(b.y1 - a.y) < tol:
        c = (a.y1 + b.y) / 2 if abs(a.y1 - b.y) < tol else (b.y1 + a.y) / 2
        lo, hi = max(a.x, b.x), min(a.x1, b.x1)
        if hi - lo > 0.6:
            return {"o": "h", "c": c, "lo": lo, "hi": hi}
    return None


def room_side_of(room, o: str, x: float, y: float):
    """Which side (N/S/W/E) of a room an opening on wall orientation o sits on."""
    r = as_rect(room)
    if o == "h":
        if abs(y - r.y) < 0.2 and r.x - 0.05 <= x <= r.x1 + 0.05:
            return "N"
        if abs(y - r.y1) < 0.2 and r.x - 0.05 <= x <= r.x1 + 0.05:
            return "S"
    else:
        if abs(x - r.x) < 0.2 and r.y - 0.05 <= y <= r.y1 + 0.05:
            return "W"
        if abs(x - r.x1) < 0.2 and r.y - 0.05 <= y <= r.y1 + 0.05:
            return "E"
    return None
