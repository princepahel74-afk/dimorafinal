from dimora_core.ai.client import extract_json
from dimora_core.dsa.geometry import Rect, rect_minus, shared_edge
from dimora_core.dsa.graph import articulation_rooms, bfs_order, floor_graph, touching_pairs, walking_distances
from dimora_core.dsa.intervals import cluster_1d, merge_intervals, wall_lines
from dimora_core.dsa.spatial import RoomGrid
from dimora_core.planner.floors import best_offset, match_stairs, parse_level


def R(i, x, y, w, d, t="bedroom"):
    return {"id": i, "name": i, "type": t, "x": x, "y": y, "w": w, "d": d}


def test_merge_intervals():
    assert merge_intervals([(5, 6), (0, 2), (1.5, 3), (3.01, 4)]) == [[0, 4], [5, 6]]


def test_wall_lines_merges_shared_edges():
    rooms = [R("a", 0, 0, 3, 3), R("b", 3, 0, 3, 3)]
    top = [L for L in wall_lines(rooms) if L["o"] == "h" and L["c"] == 0]
    assert top == [{"o": "h", "c": 0, "a": 0, "b": 6}]


def test_cluster_snaps_close_values():
    snap = cluster_1d([0.0, 3.02, 2.98, 6.1], 0.25)
    assert snap(3.02) == snap(2.98) == 3.0 and snap(6.1) == 6.1


def test_rect_minus_hole_in_middle():
    pieces = rect_minus(Rect(0, 0, 4, 4), [Rect(1, 1, 1, 1)])
    assert abs(sum(p.area for p in pieces) - 15) < 1e-9 and len(pieces) == 4


def test_grid_room_lookup_and_exterior():
    g = RoomGrid([R("a", 0, 0, 3, 3), R("b", 3, 0, 2, 3)])
    assert g.room_at(1, 1)["id"] == "a" and g.room_at(4, 1)["id"] == "b" and g.room_at(9, 9) is None
    assert g.is_exterior("h", 0, 1) and not g.is_exterior("v", 3, 1)


def test_sweep_pairs_only_touching():
    rooms = [R("a", 0, 0, 3, 3), R("b", 3, 0, 3, 3), R("c", 20, 0, 3, 3)]
    pairs = {tuple(sorted((rooms[i]["id"], rooms[j]["id"]))) for i, j in touching_pairs(rooms)}
    assert ("a", "b") in pairs and not any("c" in p for p in pairs)


def test_graph_bfs_dijkstra_articulation():
    rooms = [R("hall", 0, 0, 2, 6, "hall"), R("a", 2, 0, 3, 3), R("b", 2, 3, 3, 3), R("c", 5, 0, 3, 3)]
    doors = [{"id": "d1", "o": "v", "x": 2, "y": 1.5, "w": 0.9}, {"id": "d2", "o": "v", "x": 2, "y": 4.5, "w": 0.9}, {"id": "d3", "o": "v", "x": 5, "y": 1.5, "w": 0.9}]
    G = floor_graph({"rooms": rooms, "doors": doors})
    assert set(G.edges) == {("hall", "a"), ("hall", "b"), ("a", "c")}
    assert bfs_order(G, "hall")[0] == "hall" and set(bfs_order(G, "hall")) == {"hall", "a", "b", "c"}
    assert set(articulation_rooms(G)) == {"hall", "a"}
    d = walking_distances(G, "hall")
    assert d["c"] > d["a"] > 0


def test_shared_edge():
    e = shared_edge(R("a", 0, 0, 3, 3), R("b", 3, 1, 3, 3))
    assert e["o"] == "v" and e["c"] == 3 and e["lo"] == 1 and e["hi"] == 3


def test_parse_level():
    assert parse_level("GROUND FLOOR PLAN") == 0 and parse_level("First Floor") == 1 and parse_level("2nd floor") == 2
    assert parse_level("house first floor") == 1 and parse_level("terrace") == 50 and parse_level("plan") is None


def test_best_offset_and_stair_matching():
    a = {"rooms": [R("a", 0, 0, 10, 8)], "stair_rects": [{"x": 4, "y": 2, "w": 1.2, "d": 3.5}]}
    b = {"rooms": [R("b", 2, 1, 10, 8)], "stair_rects": [{"x": 6, "y": 3, "w": 1.2, "d": 3.4}, {"x": 0, "y": 0, "w": 5, "d": 5}]}
    assert len(match_stairs(a["stair_rects"], b["stair_rects"])) == 1
    assert best_offset(a, b) == (-2.0, -1.0)


def test_extract_json_variants():
    assert extract_json('<think>x</think>```json\n{"a":1}\n``` trailing') == {"a": 1}
    assert extract_json('Sure! [1,2] ok') == [1, 2]


def test_largest_rectangle_histogram():
    import numpy as np
    from dimora_core.vision.walls import largest_rectangle
    m = np.zeros((6, 8), bool)
    m[1:5, 1:7] = True       # 4 x 6 block
    m[0, 0:3] = True         # small bump
    area, t, l, b, r = largest_rectangle(m)
    assert (area, t, l, b, r) == (24, 1, 1, 5, 7)


def test_decompose_l_shape_into_two_rects():
    import numpy as np
    from dimora_core.vision.walls import decompose
    reg = np.zeros((40, 40), bool)
    reg[0:40, 0:15] = True   # vertical bar
    reg[25:40, 0:40] = True  # horizontal bar → L shape
    rects = decompose(reg, cell=1, min_side_cells=5)
    covered = np.zeros_like(reg)
    for l, t, r, b in rects:
        covered[t:b, l:r] = True
    assert len(rects) == 2 and (covered == reg).all()


def test_wall_first_detection_on_sample(tmp_path=None):
    import cv2
    from pathlib import Path
    from dimora_core.vision.walls import detect_plan, plan_boxes
    img = cv2.imread(str(Path(__file__).resolve().parents[2] / "samples" / "house_ground_floor.png"))
    assert len(plan_boxes(img)) == 1
    r = detect_plan(img)
    assert 10 <= len(r.rooms) <= 20
    assert any(o["kind"] == "door" for o in r.openings) and any(o["exterior"] for o in r.openings)
