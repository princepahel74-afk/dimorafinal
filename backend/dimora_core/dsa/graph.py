"""Room-adjacency graphs (NetworkX).

Nodes are rooms; an edge means "a door connects these two rooms". Edge weight is
the walking distance centroid → door → centroid in metres. On top of that graph:

* BFS (nearest-first)       → visiting order for the animated tour
* connected components      → rooms you can't reach from the entrance
* articulation points       → rooms that every route must pass through (chokepoints)
* Dijkstra                  → walking distance from the entrance to every room
* a whole-house graph       → floors joined by staircase edges, for multi-floor routes
"""
from __future__ import annotations

import math
from collections import deque

import networkx as nx

from .geometry import as_rect, room_side_of, shared_edge
from .spatial import RoomGrid

BEDROOMS = {"bedroom", "master", "guest"}


def door_between(a, b, doors):
    e = shared_edge(a, b)
    if not e:
        return None
    for d in doors:
        on = d["y"] if e["o"] == "h" else d["x"]
        t = d["x"] if e["o"] == "h" else d["y"]
        if d["o"] == e["o"] and abs(on - e["c"]) < 0.2 and e["lo"] - 0.05 < t < e["hi"] + 0.05:
            return d
    return None


def touching_pairs(rooms, tol: float = 0.15):
    """Sweep-line over x: only rooms whose x-spans touch can share a wall.

    Sorting is O(R log R); each room is compared only with the 'active' rooms whose
    right edge hasn't been passed yet — far fewer than all R² pairs on real plans.
    """
    order = sorted(range(len(rooms)), key=lambda i: rooms[i]["x"])
    active: list[int] = []
    for i in order:
        x0 = rooms[i]["x"]
        active = [j for j in active if rooms[j]["x"] + rooms[j]["w"] + tol >= x0]
        for j in active:
            yield j, i
        active.append(i)


def floor_graph(floor) -> nx.Graph:
    rooms, doors = floor["rooms"], floor.get("doors", [])
    G = nx.Graph()
    for r in rooms:
        G.add_node(r["id"], name=r.get("name", ""), type=r.get("type", "empty"), area=r["w"] * r["d"])
    for i, j in touching_pairs(rooms):
        a, b = rooms[i], rooms[j]
        d = door_between(a, b, doors)
        ra, rb = as_rect(a), as_rect(b)
        if d:
            w = math.dist((ra.cx, ra.cy), (d["x"], d["y"])) + math.dist((d["x"], d["y"]), (rb.cx, rb.cy))
            G.add_edge(a["id"], b["id"], weight=round(w, 2), door=d.get("id"))
        elif a.get("group") and a.get("group") == b.get("group") and shared_edge(a, b):
            # two parts of one open-plan space: connected without a door
            G.add_edge(a["id"], b["id"], weight=round(math.dist((ra.cx, ra.cy), (rb.cx, rb.cy)), 2), door=None, open=True)
    return G


def entrance_room(floor, stair_arrival=None):
    """Upper floors start where the stairs arrive; the ground floor at the main door."""
    rooms = floor["rooms"]
    if not rooms:
        return None
    grid = RoomGrid(rooms)
    if stair_arrival is not None:
        r = grid.room_at(*stair_arrival)
        if r:
            return r
    doors = floor.get("doors", [])
    main = next((d for d in doors if d.get("main")), None)
    if not main:
        main = next((d for d in doors if grid.is_exterior(d["o"], d["y"] if d["o"] == "h" else d["x"], d["x"] if d["o"] == "h" else d["y"])), None)
    if main:
        r = next((r for r in rooms if room_side_of(r, main["o"], main["x"], main["y"])), None)
        if r:
            return r
    return next((r for r in rooms if r.get("type") == "living"), rooms[0])


def bfs_order(G: nx.Graph, start_id):
    """Breadth-first order with a FIFO queue; from each room the nearest door-neighbour
    is enqueued first. O(V + E log deg)."""
    if start_id not in G:
        return []
    order, seen, queue = [], {start_id}, deque([start_id])
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in sorted(G[u], key=lambda n: G[u][n].get("weight", 0)):
            if v not in seen:
                seen.add(v)
                queue.append(v)
    return order


def connectivity(floor, stair_arrival=None):
    G = floor_graph(floor)
    start = entrance_room(floor, stair_arrival)
    order = bfs_order(G, start["id"]) if start else []
    seen = set(order)
    return {
        "graph": G,
        "start": start["id"] if start else None,
        "order": order,
        "unreachable": [r["id"] for r in floor["rooms"] if r["id"] not in seen],
    }


def articulation_rooms(G: nx.Graph):
    """Rooms whose removal splits the home — every route passes through them (Tarjan, O(V+E))."""
    return sorted(nx.articulation_points(G))


def walking_distances(G: nx.Graph, start_id):
    """Dijkstra from the entrance: metres of walking to each reachable room."""
    if start_id not in G:
        return {}
    return {k: round(v, 2) for k, v in nx.single_source_dijkstra_path_length(G, start_id, weight="weight").items()}


def circulation_through_bedrooms(G: nx.Graph, start_id, rooms):
    """Shared rooms reachable only by walking through a bedroom.

    Remove bedroom nodes (except the start) and find what is still connected to the
    start; any shared room outside that component needs a passage door.
    """
    if start_id not in G:
        return []
    private = {"bathroom", "balcony", "closet", "study"} | BEDROOMS
    keep = [n for n in G if n == start_id or G.nodes[n]["type"] not in BEDROOMS]
    reach = nx.node_connected_component(G.subgraph(keep), start_id)
    full = nx.node_connected_component(G, start_id)
    return [r["id"] for r in rooms if r["id"] in full and r["id"] not in reach and r.get("type") not in private]


def house_graph(floors, stair_edges):
    """One graph for the whole building: node = (floor index, room id).

    stair_edges: [((fi, room_id), (fj, room_id), length_m)] from the planner.
    """
    H = nx.Graph()
    for fi, f in enumerate(floors):
        G = floor_graph(f)
        H.add_nodes_from(((fi, n), {**G.nodes[n], "floor": fi}) for n in G)
        H.add_edges_from(((fi, a), (fi, b), dict(G[a][b])) for a, b in G.edges)
    for a, b, length in stair_edges:
        H.add_edge(a, b, weight=round(length, 2), stairs=True)
    return H
