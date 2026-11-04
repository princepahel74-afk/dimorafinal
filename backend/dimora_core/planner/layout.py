"""Single-floor layout: pixels → metres, room typing, snapping, doors and windows."""
from __future__ import annotations

from collections import Counter

from scipy.cluster.hierarchy import DisjointSet

from ..config import OUTDOOR, ROOM_TYPES, uid
from ..dsa.geometry import Rect, as_rect, clamp, r2, shared_edge
from ..dsa.graph import connectivity, door_between
from ..dsa.intervals import cluster_1d, wall_lines
from ..dsa.spatial import RoomGrid

HUBS = {"living", "dining", "hall"}


def area(r) -> float:
    return r["w"] * r["d"]


def make_room(name=None, type="empty", x=0.0, y=0.0, w=3.0, d=3.0):
    t = type if type in ROOM_TYPES else "empty"
    return {"id": uid("r"), "name": name or ROOM_TYPES[t], "type": t, "x": r2(x), "y": r2(y), "w": r2(w), "d": r2(d)}


def snap_rooms(rooms, tol: float = 0.25):
    """Snap nearly-equal edges onto shared wall lines (single-linkage clustering per axis)."""
    fx = cluster_1d([v for r in rooms for v in (r["x"], r["x"] + r["w"])], tol)
    fy = cluster_1d([v for r in rooms for v in (r["y"], r["y"] + r["d"])], tol)
    for r in rooms:
        x0, x1, y0, y1 = fx(r["x"]), fx(r["x"] + r["w"]), fy(r["y"]), fy(r["y"] + r["d"])
        r["x"], r["w"], r["y"], r["d"] = r2(x0), r2(max(0.6, x1 - x0)), r2(y0), r2(max(0.6, y1 - y0))


def heuristic_types(untyped, all_rooms):
    """Guess room types from size, shape and adjacency when no AI labels are available."""
    count = Counter()
    bb = as_rect({"x": min(r["x"] for r in all_rooms), "y": min(r["y"] for r in all_rooms),
                  "w": max(r["x"] + r["w"] for r in all_rooms) - min(r["x"] for r in all_rooms),
                  "d": max(r["y"] + r["d"] for r in all_rooms) - min(r["y"] for r in all_rooms)})

    def edges_out(r):
        return sum((r["x"] - bb.x < 0.3, r["y"] - bb.y < 0.3, bb.x1 - (r["x"] + r["w"]) < 0.3, bb.y1 - (r["y"] + r["d"]) < 0.3))

    def on_edge(r):  # balconies sit on a corner of the building (two outside sides)
        return edges_out(r) >= 2

    left = sorted(untyped, key=area, reverse=True)

    def set_type(r, t):
        r["type"] = t
        if r in left:
            left.remove(r)

    # open-plan groups first: the biggest group is the living / dining / kitchen space;
    # in other groups, small side pieces are closets or passages of the main room
    groups = {}
    for r in untyped:
        if r.get("group"):
            groups.setdefault(r["group"], []).append(r)
    if groups:
        biggest = max(groups.values(), key=lambda g: sum(area(x) for x in g))
        if sum(area(x) for x in biggest) >= 15:
            pieces = sorted(biggest, key=area, reverse=True)
            for k, r in enumerate(pieces):
                a = area(r)
                set_type(r, "living" if k == 0 else "hall" if a < 3 or max(r["w"], r["d"]) / min(r["w"], r["d"]) > 2.6 else "dining" if not any(x["type"] == "dining" for x in pieces[:k]) else "kitchen" if not any(x["type"] == "kitchen" for x in pieces[:k]) else "hall")
        open_kitchen = False
        if sum(area(x) for x in biggest) >= 15 and not any(x["type"] == "kitchen" for x in biggest):
            open_kitchen = True  # the kitchen is part of the open-plan living space
            max(biggest, key=area)["name"] = "Living & Kitchen"
        for g in groups.values():
            if g is biggest:
                continue
            main = max(g, key=area)
            for r in g:
                if r is not main:
                    set_type(r, "closet" if area(r) < 3.5 else "hall")
            if any(r["type"] == "closet" for r in g) and area(main) >= 6:
                set_type(main, "bedroom")  # a room with its own closets is a bedroom
    else:
        open_kitchen = False

    living = next((r for r in all_rooms if r.get("type") == "living"), None)
    if living is None:
        living = next((r for r in left if area(r) > 8), None)
        if living is not None:
            set_type(living, "living")
    for r in list(left):
        asp = max(r["w"], r["d"]) / min(r["w"], r["d"])
        if asp > 2.05 and min(r["w"], r["d"]) < 1.9:
            set_type(r, "balcony" if on_edge(r) and area(r) < 9 else "hall")
    if living is not None and left:
        biggest = left[0]
        din = sorted([r for r in left if r is not biggest and 6 <= area(r) <= 14 and max(r["w"], r["d"]) / min(r["w"], r["d"]) < 1.7 and shared_edge(r, living)], key=area, reverse=True)
        if din:
            set_type(din[0], "dining")
            kit = sorted([r for r in left if 4.4 <= area(r) <= 12.5 and shared_edge(r, din[0])], key=area, reverse=True)
            if kit:
                set_type(kit[0], "kitchen")
    master = False
    for r in list(left):
        if area(r) >= 8.5:
            set_type(r, "bedroom" if master else "master")
            master = True
    if not open_kitchen and not any(r.get("type") == "kitchen" for r in all_rooms):
        k = sorted([r for r in left if area(r) >= 4.4], key=area, reverse=True)
        if k:
            set_type(k[0], "kitchen")
    for r in list(left):
        a = area(r)
        set_type(r, "utility" if a < 2.4 else "bathroom" if a < 4.6 else "study")
    # the largest bedroom is the master bedroom
    beds = [r for r in untyped if r["type"] in ("bedroom", "master")]
    if beds and not any(r["type"] == "master" for r in all_rooms if r not in untyped):
        for r in beds:
            r["type"] = "bedroom"
        max(beds, key=area)["type"] = "master"
    for r in untyped:
        t = r["type"]
        count[t] += 1
        if r.get("name") == "Living & Kitchen" and t == "living":
            continue
        r["name"] = ROOM_TYPES[t] + (f" {count[t]}" if t in ("bedroom", "bathroom") else "")


def auto_openings(floor, doors: bool = True, windows: bool = True, main: bool = True, repair_only: bool = False):
    """Make sure every room is reachable and outer rooms get windows (greedy, graph-guided)."""
    R = floor["rooms"]
    floor.setdefault("doors", [])
    floor.setdefault("windows", [])
    pri = lambda r: 0 if r["type"] in HUBS else 1 if r["type"] == "kitchen" else 2  # noqa: E731

    def add_door(a, b):
        if a.get("group") and a.get("group") == b.get("group"):
            return False  # open-plan parts: no wall, so no door
        e = shared_edge(a, b)
        if not e or door_between(a, b, floor["doors"]):
            return False
        w = 0.75 if "bathroom" in (a["type"], b["type"]) else 0.9
        t = clamp((e["lo"] + e["hi"]) / 2, e["lo"] + w / 2 + 0.1, e["hi"] - w / 2 - 0.1)
        floor["doors"].append({"id": uid("d"), "o": e["o"], "x": r2(t if e["o"] == "h" else e["c"]), "y": r2(e["c"] if e["o"] == "h" else t), "w": w})
        return True

    if doors and not repair_only:
        for a in R:
            for b in R:
                if a is not b and pri(a) == 0 and pri(b) <= 1 and a["id"] < b["id"]:
                    add_door(a, b)
        PREF = {"bathroom": ["master", "bedroom", "hall", "living"], "utility": ["kitchen", "hall", "dining"],
                "balcony": ["living", "master", "bedroom"], "closet": ["master", "bedroom"], "pooja": ["living", "hall", "dining"]}

        def score(r, o):
            pl = PREF.get(r["type"])
            if pl and o["type"] in pl:
                return pl.index(o["type"])
            return 10 + pri(o) + (20 if o["type"] == "bathroom" else 0)

        for r in sorted(R, key=lambda r: r["type"] == "bathroom") if not repair_only else []:
            if pri(r) < 2:
                continue
            G = connectivity(floor)["graph"]
            if G.degree(r["id"]):
                continue
            nb = sorted([o for o in R if o is not r and shared_edge(r, o)], key=lambda o: score(r, o))
            if nb:
                add_door(r, nb[0])
    if doors:
        for _ in range(len(R)):  # grow the reachable set until every island is joined
            c = connectivity(floor)
            if not c["unreachable"]:
                break
            un = set(c["unreachable"])
            # any unreachable room that touches the reachable part; prefer hubs, avoid bathrooms
            links = [(pri(o) + (5 if o["type"] == "bathroom" else 0) + (5 if u["type"] == "bathroom" else 0), u, o)
                     for u in R if u["id"] in un for o in R if o["id"] not in un and shared_edge(u, o)]
            if not links:
                break
            _, u, o = min(links, key=lambda t: t[0])
            if not add_door(u, o):
                break
        if main and not any(d.get("main") for d in floor["doors"]):
            grid = RoomGrid(R)
            lv = next((r for r in R if r["type"] == "living"), None) or max(R, key=area, default=None)
            if lv:
                best = None
                for o, c, a, b in (("h", lv["y"], lv["x"], lv["x"] + lv["w"]), ("h", lv["y"] + lv["d"], lv["x"], lv["x"] + lv["w"]),
                                   ("v", lv["x"], lv["y"], lv["y"] + lv["d"]), ("v", lv["x"] + lv["w"], lv["y"], lv["y"] + lv["d"])):
                    if grid.is_exterior(o, c, (a + b) / 2) and (best is None or b - a > best[3]):
                        best = (o, c, a + min(1.0, (b - a) / 3), b - a)
                if best:
                    o, c, t, _ = best
                    floor["doors"].append({"id": uid("d"), "o": o, "x": r2(t if o == "h" else c), "y": r2(c if o == "h" else t), "w": 1.0, "main": True})
    if windows and not repair_only:
        grid = RoomGrid(R)
        for r in R:
            sides = [("h", r["y"], r["x"], r["x"] + r["w"]), ("h", r["y"] + r["d"], r["x"], r["x"] + r["w"]),
                     ("v", r["x"], r["y"], r["y"] + r["d"]), ("v", r["x"] + r["w"], r["y"], r["y"] + r["d"])]
            n = 0
            for o, c, a, b in sorted(sides, key=lambda s: s[3] - s[2], reverse=True):
                if n >= (2 if r["type"] in ("living", "master") else 1):
                    break
                ln, t = b - a, (a + b) / 2
                if ln < 1.2 or not grid.is_exterior(o, c, t):
                    continue
                blocked = any(d["o"] == o and abs((d["y"] if o == "h" else d["x"]) - c) < 0.2 and abs((d["x"] if o == "h" else d["y"]) - t) < d["w"] / 2 + 0.8 for d in floor["doors"])
                wt = a + ln * 0.75 if blocked else t
                if any(w["o"] == o and abs((w["y"] if o == "h" else w["x"]) - c) < 0.2 and abs((w["x"] if o == "h" else w["y"]) - wt) < 1 for w in floor["windows"]):
                    n += 1
                    continue
                bath, bal = r["type"] == "bathroom", r["type"] == "balcony"
                ww = 0.6 if bath else min(2.4, ln - 0.6) if bal else min(1.8 if r["type"] == "living" else 1.4, ln - 0.6)
                floor["windows"].append({"id": uid("w"), "o": o, "x": r2(wt if o == "h" else c), "y": r2(c if o == "h" else wt), "w": r2(ww),
                                         "sill": 1.5 if bath else 0.15 if bal else 0.9, "h": 0.6 if bath else 2.0 if bal else 1.25})
                n += 1


def snap_points_to_walls(points, floor, to_m, is_door: bool):
    """AI door/window centre points (percent) → openings on the nearest wall (≤ 0.6 m away).

    Near-duplicates are merged with a disjoint-set (union-find) before placing.
    """
    lines = wall_lines(floor["rooms"])
    grid = RoomGrid(floor["rooms"])
    snapped = []
    for p in points:
        if not (isinstance(p, (list, tuple)) and len(p) >= 2):
            continue
        try:
            x, y = to_m(float(p[0]), float(p[1]))
        except (TypeError, ValueError):
            continue
        best = None
        for L in lines:
            t = clamp(x if L["o"] == "h" else y, L["a"], L["b"])
            dist = abs(y - L["c"]) + abs(x - t) if L["o"] == "h" else abs(x - L["c"]) + abs(y - t)
            if dist < 0.6 and (best is None or dist < best[0]):
                best = (dist, L, t)
        if not best:
            continue
        _, L, t = best
        w = 0.9 if is_door else 1.2
        t = clamp(t, L["a"] + w / 2 + 0.05, L["b"] - w / 2 - 0.05)
        o = {"o": L["o"], "x": r2(t if L["o"] == "h" else L["c"]), "y": r2(L["c"] if L["o"] == "h" else t), "w": w}
        if not is_door and not grid.is_exterior(o["o"], o["y"] if o["o"] == "h" else o["x"], o["x"] if o["o"] == "h" else o["y"]):
            continue
        snapped.append(o)
    ds = DisjointSet(range(len(snapped)))
    for i in range(len(snapped)):
        for j in range(i + 1, len(snapped)):
            if abs(snapped[i]["x"] - snapped[j]["x"]) + abs(snapped[i]["y"] - snapped[j]["y"]) < 0.8:
                ds.merge(i, j)
    return [snapped[sorted(s)[0]] for s in ds.subsets()]


def _rooms_of(floor, d):
    """Rooms on either side of an opening (by which side of each room it sits on)."""
    from ..dsa.geometry import room_side_of
    return [r for r in floor["rooms"] if room_side_of(r, d["o"], d["x"], d["y"])]


def _tidy_openings(floor):
    """One door per pair of rooms (the widest); no doors inside open-plan groups; at most one
    outside door per room; collinear window pieces merged into one band."""
    best = {}
    for d in sorted(floor["doors"], key=lambda d: -d["w"]):
        rs = _rooms_of(floor, d)
        if len(rs) >= 2 and rs[0].get("group") and rs[0].get("group") == rs[1].get("group"):
            continue
        key = tuple(sorted(r["id"] for r in rs[:2])) if rs else ("?", d["id"])
        if len(rs) == 1 and not d.get("_ext"):
            from ..dsa.geometry import room_side_of
            key = (rs[0]["id"], room_side_of(rs[0], d["o"], d["x"], d["y"]))  # one door per side towards an unknown space
        best.setdefault(key, d)
    floor["doors"] = list(best.values())
    ws = sorted(floor["windows"], key=lambda w: (w["o"], round(w["y"] if w["o"] == "h" else w["x"], 1), w["x"] if w["o"] == "h" else w["y"]))
    merged = []
    for w in ws:
        if merged:
            p = merged[-1]
            pc, wc = (p["y"], w["y"]) if w["o"] == "h" else (p["x"], w["x"])
            pt, wt = (p["x"], w["x"]) if w["o"] == "h" else (p["y"], w["y"])
            if p["o"] == w["o"] and abs(pc - wc) < 0.15 and wt - w["w"] / 2 - (pt + p["w"] / 2) < 0.35:
                a, b = min(pt - p["w"] / 2, wt - w["w"] / 2), max(pt + p["w"] / 2, wt + w["w"] / 2)
                if w["o"] == "h":
                    p["x"] = r2((a + b) / 2)
                else:
                    p["y"] = r2((a + b) / 2)
                p["w"] = r2(min(4.0, b - a))
                continue
        merged.append(dict(w))
    floor["windows"] = merged


def _type_yards(yards):
    """Open ground around the house without a label: the biggest piece that fits a car (2.5 × 5 m) is
    the parking, everything else is garden."""
    for r in yards:
        r["type"], r["name"] = "garden", "Garden"
    fits = [r for r in yards if min(r["w"], r["d"]) >= 2.5 and max(r["w"], r["d"]) >= 4.8]
    if fits:
        p = max(fits, key=area)
        p["type"], p["name"] = "parking", "Car Parking"
    n = 0
    for r in yards:
        if r["type"] == "garden":
            n += 1
            r["name"] = "Garden" if n == 1 else f"Garden {n}"


def build_floor(reading, mpp: float, main: bool = True):
    """Reading (pixel-space CV + AI result) → floor dict in metres."""
    cv, ai = reading["cv"], reading.get("ai") or {}
    bx0, by0 = reading["bx0"], reading["by0"]
    floor = {"rooms": [], "doors": [], "windows": [], "stairs": []}
    typed = set()
    for pr in reading["px_rooms"]:
        room = make_room(type=pr.get("type") if pr.get("type") in ROOM_TYPES else "empty",
                         x=(pr["x0"] - bx0) * mpp, y=(pr["y0"] - by0) * mpp, w=(pr["x1"] - pr["x0"]) * mpp, d=(pr["y1"] - pr["y0"]) * mpp)
        if pr.get("group"):
            room["group"] = pr["group"]
        if pr.get("name"):
            room["name"] = str(pr["name"]).strip().title()[:28]
        if pr.get("outdoor"):
            room["_yard"] = True
        if pr.get("type") in ROOM_TYPES:
            typed.add(room["id"])
        elif pr.get("outdoor"):
            if min(room["w"], room["d"]) < 0.9:
                continue  # a sliver of setback, not a usable yard
            typed.add(room["id"])  # parking / garden decided below, once the whole plot is known
        elif pr.get("open_side") and room["w"] * room["d"] < 20:
            room["type"], room["name"] = "balcony", "Balcony"  # open outside edge (railing) → balcony
            typed.add(room["id"])
        floor["rooms"].append(room)
    snap_rooms(floor["rooms"], 0.35)
    _type_yards([r for r in floor["rooms"] if r.get("_yard") and r["type"] not in OUTDOOR])
    for r in floor["rooms"]:
        r.pop("_yard", None)
    untyped = [r for r in floor["rooms"] if r["id"] not in typed]
    if untyped:
        heuristic_types(untyped, floor["rooms"])
    rooms = sorted([r for r in floor["rooms"] if area(r) > 0.8], key=area, reverse=True)
    kept = []
    for r in rooms:  # drop rooms mostly covered by a bigger one
        if not any(Rect(**{k: r[k] for k in "xywd"}).overlap(Rect(**{k: k2[k] for k in "xywd"})) > area(r) * 0.6 for k2 in kept):
            kept.append(r)
    floor["rooms"] = kept

    def to_m(px, py):
        return (px / 100 * cv.W - bx0) * mpp, (py / 100 * cv.H - by0) * mpp

    # openings seen in the drawing itself (gaps bridged in the walls)
    lines = wall_lines(floor["rooms"])
    for op in getattr(cv, "openings", []) or []:
        horiz = op["o"] == "h"
        cx, cy = (op["x0"] + op["x1"]) / 2, (op["y0"] + op["y1"]) / 2
        length = ((op["x1"] - op["x0"]) if horiz else (op["y1"] - op["y0"])) * mpp
        x, y = to_m(cx / cv.W * 100, cy / cv.H * 100)
        best = None
        for L in lines:
            if L["o"] != op["o"]:
                continue
            t = clamp(x if horiz else y, L["a"], L["b"])
            dist = abs((y if horiz else x) - L["c"]) + abs((x if horiz else y) - t)
            if dist < 0.5 and (best is None or dist < best[0]):
                best = (dist, L, t)
        if not best:
            continue
        _, L, t = best
        kind = op["kind"] if op.get("exterior") or op["kind"] == "door" else "door"  # inside "windows" (glass partitions) act as doors
        if kind == "window" and not op.get("exterior"):
            kind = "door"
        if (kind == "door" and length < 0.55) or (kind == "window" and length < 0.45):
            continue
        w = r2(clamp(length, 0.6, 2.4) if kind == "door" else clamp(length, 0.5, 4.0))
        t = clamp(t, L["a"] + w / 2 + 0.02, L["b"] - w / 2 - 0.02) if L["b"] - L["a"] > w + 0.04 else (L["a"] + L["b"]) / 2
        o = {"o": L["o"], "x": r2(t if horiz else L["c"]), "y": r2(L["c"] if horiz else t), "w": w, "_ext": bool(op.get("exterior"))}
        if kind == "door":
            floor["doors"].append({"id": uid("d"), **o})
        else:
            floor["windows"].append({"id": uid("w"), **o, "sill": 0.9, "h": 1.25})
    _tidy_openings(floor)
    if main:  # main entrance: the widest outside door that doesn't open onto a balcony
        ext = [d for d in floor["doors"] if d.get("_ext") and not any(r["type"] == "balcony" for r in _rooms_of(floor, d))]
        if ext:
            max(ext, key=lambda d: d["w"])["main"] = True
    if ai:
        for o in snap_points_to_walls((ai.get("doors") or [])[:30], floor, to_m, True):
            floor["doors"].append({"id": uid("d"), **o})
        for o in snap_points_to_walls((ai.get("windows") or [])[:40], floor, to_m, False):
            floor["windows"].append({"id": uid("w"), **o, "sill": 0.9, "h": 1.25})
    drawn = len(getattr(cv, "openings", []) or []) >= 3  # the drawing shows its own doors/windows
    yards = [r for r in floor["rooms"] if r["type"] in ("parking", "garden")]
    if yards:  # yards are reached from outside: leave them out of door/window automation
        view = dict(floor, rooms=[r for r in floor["rooms"] if r not in yards])
        auto_openings(view, main=main, repair_only=drawn)
        floor["doors"], floor["windows"] = view["doors"], view["windows"]
    else:
        auto_openings(floor, main=main, repair_only=drawn)
    # staircase candidates: AI boxes + rooms labelled "staircase"
    rects = []
    for s in reading.get("px_stairs", []):
        rc = {"x": r2((s["x0"] - bx0) * mpp), "y": r2((s["y0"] - by0) * mpp), "w": r2((s["x1"] - s["x0"]) * mpp), "d": r2((s["y1"] - s["y0"]) * mpp), "src": "ai"}
        if min(rc["w"], rc["d"]) >= 0.6 and 1.5 <= max(rc["w"], rc["d"]) <= 9:
            rects.append(rc)
    for r in floor["rooms"]:
        if "stair" in r["name"].lower() and not any(as_rect(s).overlap(as_rect(r)) > area(s) * 0.3 for s in rects):
            rects.append({"x": r["x"], "y": r["y"], "w": r["w"], "d": r["d"], "src": "label"})
    floor["stair_rects"] = rects
    for o in floor["doors"] + floor["windows"]:
        o.pop("_ext", None)
    return floor
