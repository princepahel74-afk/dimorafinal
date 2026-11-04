"""Uniform-grid spatial hash for "which room is at this point?" queries.

Detection and planning ask this question thousands of times (exterior-wall tests,
stair landing checks, window placement). A naive scan is O(R) per query; the grid
buckets every room into the cells it covers so a query only checks the rooms in
one cell — O(1) on average, O(R) worst case. Build cost O(R · cells per room).
"""
from __future__ import annotations

import math
from collections import defaultdict


class RoomGrid:
    def __init__(self, rooms, cell: float = 1.0):
        self.cell = cell
        self.rooms = list(rooms)
        self.grid: dict[tuple[int, int], list[int]] = defaultdict(list)
        for i, r in enumerate(self.rooms):
            for gx in range(math.floor(r["x"] / cell), math.floor((r["x"] + r["w"]) / cell) + 1):
                for gy in range(math.floor(r["y"] / cell), math.floor((r["y"] + r["d"]) / cell) + 1):
                    self.grid[(gx, gy)].append(i)

    def _candidates(self, x: float, y: float, margin: float):
        if margin <= 0:
            return self.grid.get((math.floor(x / self.cell), math.floor(y / self.cell)), [])
        seen = set()
        for gx in range(math.floor((x - margin) / self.cell), math.floor((x + margin) / self.cell) + 1):
            for gy in range(math.floor((y - margin) / self.cell), math.floor((y + margin) / self.cell) + 1):
                seen.update(self.grid.get((gx, gy), []))
        return seen

    def rooms_at(self, x: float, y: float, margin: float = 0.0):
        out = []
        for i in self._candidates(x, y, margin):
            r = self.rooms[i]
            if r["x"] - margin <= x <= r["x"] + r["w"] + margin and r["y"] - margin <= y <= r["y"] + r["d"] + margin:
                out.append(r)
        return out

    def room_at(self, x: float, y: float):
        """Smallest room containing the point (matches the frontend's roomAt)."""
        hits = self.rooms_at(x, y)
        return min(hits, key=lambda r: r["w"] * r["d"]) if hits else None

    def inside(self, x: float, y: float) -> bool:
        return bool(self.rooms_at(x, y))

    def is_exterior(self, o: str, c: float, t: float, e: float = 0.12) -> bool:
        """A point on a wall line is exterior when exactly one side is inside the plan."""
        p1, p2 = ((t, c - e), (t, c + e)) if o == "h" else ((c - e, t), (c + e, t))
        return self.inside(*p1) != self.inside(*p2)
