"""Whole-home analytics on the room graph: tour order, chokepoints, walking distances."""
from __future__ import annotations

import math

import networkx as nx

from ..dsa.geometry import as_rect
from ..dsa.graph import (articulation_rooms, circulation_through_bedrooms, connectivity, floor_graph,
                         house_graph, walking_distances)
from ..dsa.spatial import RoomGrid
from .floors import stair_end, stair_foot, stair_len, stair_risers, stair_width


def _sorted_floors(project):
    return sorted(project["floors"], key=lambda f: f.get("level", 0))


def _arrival(floors, k):
    """Point where the stairs from floor k-1 arrive on floor k."""
    if k == 0:
        return None
    st = (floors[k - 1].get("stairs") or [None])[0]
    return stair_end(st, "high", 0.5) if st else None


def tour_order(project):
    """Floor by floor (lowest first): BFS from the entrance / stair arrival, nearest door first.
    Stair halls and tiny passages are skipped."""
    floors, out = _sorted_floors(project), []
    for k, f in enumerate(floors):
        c = connectivity(f, _arrival(floors, k))
        ids = c["order"] + [r for r in c["unreachable"]]
        wells = [as_rect(stair_foot(s)) for s in (f.get("stairs") or [])]
        if k > 0 and floors[k - 1].get("stairs"):
            wells += [as_rect(stair_foot(s)) for s in floors[k - 1]["stairs"]]
        by_id = {r["id"]: r for r in f["rooms"]}
        for rid in ids:
            r = by_id.get(rid)
            if not r:
                continue
            a = r["w"] * r["d"]
            if r["type"] == "hall" and (a < 3 or "stair" in r["name"].lower() or "landing" in r["name"].lower() or any(w.overlap(as_rect(r)) > a * 0.35 for w in wells)):
                continue
            out.append(rid)
    return out


def stair_edges(floors):
    edges = []
    for k in range(len(floors) - 1):
        lo, up = floors[k], floors[k + 1]
        for st in lo.get("stairs") or []:
            a = RoomGrid(lo["rooms"]).room_at(*stair_end(st, "low", 0.45))
            b = RoomGrid(up["rooms"]).room_at(*stair_end(st, "high", 0.45))
            if a and b:
                edges.append(((k, a["id"]), (k + 1, b["id"]), math.hypot(stair_len(st), lo.get("height", 2.9) + 0.25)))
    return edges


def analyze(project):
    floors = _sorted_floors(project)
    per_floor = []
    names = {r["id"]: r["name"] for f in floors for r in f["rooms"]}
    for k, f in enumerate(floors):
        c = connectivity(f, _arrival(floors, k))
        G = c["graph"]
        dist = walking_distances(G, c["start"]) if c["start"] else {}
        far = max(dist.items(), key=lambda kv: kv[1]) if dist else None
        stairs = []
        if k < len(floors) - 1:
            for st in f.get("stairs") or []:
                n = stair_risers(f)
                L = stair_len(st)
                stairs.append({"id": st.get("id"), "width": round(stair_width(st), 2), "run": round(L, 2), "risers": n,
                               "riser_mm": round((f.get("height", 2.9) + 0.25) / n * 1000), "tread_mm": round(L / n * 1000)})
        per_floor.append({
            "floor": f.get("name"), "level": f.get("level", k),
            "start": c["start"], "order": c["order"], "unreachable": c["unreachable"],
            "articulation": articulation_rooms(G),
            "through_bedroom": circulation_through_bedrooms(G, c["start"], f["rooms"]) if c["start"] else [],
            "distances": dist,
            "farthest": {"room": far[0], "name": names.get(far[0]), "metres": far[1]} if far else None,
            "rooms": G.number_of_nodes(), "doors": G.number_of_edges(),
            "components": nx.number_connected_components(G) if G.number_of_nodes() else 0,
            "stairs": stairs,
        })
    H = house_graph(floors, stair_edges(floors))
    whole = {"rooms": H.number_of_nodes(), "links": H.number_of_edges(),
             "connected": nx.is_connected(H) if H.number_of_nodes() else True}
    if floors and per_floor[0]["start"] and (0, per_floor[0]["start"]) in H:
        d = nx.single_source_dijkstra_path_length(H, (0, per_floor[0]["start"]), weight="weight")
        if d:
            (fi, rid), m = max(d.items(), key=lambda kv: kv[1])
            whole["farthest_from_entrance"] = {"floor": floors[fi].get("name"), "room": rid, "name": names.get(rid), "metres": round(m, 2)}
            whole["unreached"] = [rid for (fi, rid) in H if (fi, rid) not in d]
    return {"floors": per_floor, "house": whole, "tour": tour_order(project)}


__all__ = ["analyze", "tour_order", "floor_graph"]
