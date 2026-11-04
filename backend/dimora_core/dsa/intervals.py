"""Interval algorithms: merging wall segments and 1-D clustering for snapping.

* merge_intervals — classic sort + sweep, O(n log n).
* wall_lines — hash map keyed by (orientation, coordinate) → merged intervals.
* cluster_1d — single-linkage clustering of coordinates (SciPy hierarchy), used to
  snap nearly-equal room edges onto one wall line.
"""
from __future__ import annotations

from collections import defaultdict

import numpy as np
from scipy.cluster.hierarchy import fcluster, linkage


def merge_intervals(iv, gap: float = 0.02):
    """Merge overlapping / touching [a, b] intervals. O(n log n) for the sort, O(n) sweep."""
    out: list[list[float]] = []
    for a, b in sorted((min(a, b), max(a, b)) for a, b in iv):
        if out and a <= out[-1][1] + gap:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return out


def wall_lines(rooms):
    """All wall centre-lines of a floor.

    Each room contributes 4 edges; edges on the same line (same orientation and
    coordinate within 5 cm) are bucketed in a hash map and their spans merged.
    Returns [{'o','c','a','b'}]. O(R log R).
    """
    buckets: dict[tuple[str, int], dict] = {}
    for r in rooms:
        x, y, w, d = r["x"], r["y"], r["w"], r["d"]
        for o, c, a, b in (("h", y, x, x + w), ("h", y + d, x, x + w), ("v", x, y, y + d), ("v", x + w, y, y + d)):
            k = (o, round(c * 20))
            buckets.setdefault(k, {"o": o, "c": c, "iv": []})["iv"].append((a, b))
    lines = []
    for L in buckets.values():
        for a, b in merge_intervals(L["iv"]):
            lines.append({"o": L["o"], "c": L["c"], "a": a, "b": b})
    return lines


def cluster_1d(values, tol: float):
    """Group coordinates whose chain distance is < tol (single linkage).

    Returns a function mapping a value to its cluster mean (snapped to 5 cm).
    SciPy's linkage is O(n^2) memory but n here is ~4 × rooms (< 200).
    """
    vals = np.asarray(sorted(values), dtype=float)
    if len(vals) == 0:
        return lambda v: v
    if len(vals) == 1:
        labels = np.array([1])
    else:
        labels = fcluster(linkage(vals.reshape(-1, 1), method="single"), t=tol, criterion="distance")
    means = defaultdict(list)
    for v, l in zip(vals, labels):
        means[l].append(v)
    lookup = {}
    for l, vs in means.items():
        m = round(round(sum(vs) / len(vs) / 0.05) * 0.05, 2)
        for v in vs:
            lookup[v] = m

    def snap(v: float) -> float:
        if v in lookup:
            return lookup[v]
        # nearest known value (binary search on the sorted array)
        i = int(np.clip(np.searchsorted(vals, v), 1, len(vals) - 1)) if len(vals) > 1 else 0
        cand = min((vals[max(0, i - 1)], vals[i]), key=lambda c: abs(c - v))
        return lookup[cand] if abs(cand - v) < tol else v

    return snap
