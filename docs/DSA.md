# Data structures & algorithms in DIMORA

This is a guide for explaining the backend, for example in a viva. For each part it says where the code lives, which data structure or algorithm it uses, why, and how much it costs.

R = rooms on a floor (typically 8–40), D = doors, F = floors, N = pixels in the image being processed.

## 1. Image → rooms (computer vision) — `vision/walls.py` (v2, wall-first) · `vision/rooms.py` (classic fallback)

The detector first isolates the **walls**, the thick strokes, and ignores everything thin or coloured: text, furniture, dimension lines, grid bubbles, sheet frames and colour washes.

| Step | Technique | Cost |
|---|---|---|
| Ignore coloured ink (red icons, blue fills) | HSV saturation test; coloured pixels count as paper | O(N) |
| Wall thickness T | **Distance transform** of the ink, widths read at **ridge (local-maximum) pixels**; median = partition walls, 90th percentile = outer walls | O(N) |
| Wall mask | **Median filter** (kernel ≈ 0.75·T): wipes out thin lines and text, fills speckled/textured walls. Then threshold, and drop short blobs with **connected components** | O(N·k) |
| Split a sheet with several plans | dilate walls by 10·T, connected components, merge overlapping boxes with **union-find (disjoint set)**, then sort into reading order | O(N + k² α) |
| Close door and window gaps | split the walls into horizontal and vertical pieces (**morphological opening with line kernels**), then **directional closing** along each axis: up to 16·T between two walls running the same way, up to 8·T when a wall ends at a perpendicular wall (doors next to corners). Only gaps about one wall thick are kept, so corridors are never filled | O(N) per pass |
| Door or window? | Window: thin parallel lines run along the gap (a **projection profile** covers > 70 % of its length). Door: the **swing arc or leaf** is drawn beside the gap (ink density in the square next to it). An inside gap with neither is a corridor crossing, so it is reopened | O(gap area) |
| Building outline | walls + long thin straight lines (railings, window bands; wobble-tolerant opening, then bridging along their own axis) inside the walls' bounding box. Closing, then **flood fill from the border** to remove the outside | O(N) |
| Rooms | **connected components** (4-connected) of the free space inside the outline; hairline slits sealed first | O(N) |
| Rooms → rectangles | **Largest rectangle in a binary matrix**: for each row, keep a histogram of consecutive ones and solve "largest rectangle in a histogram" with a **monotonic stack**. Repeat on what is left. Pieces of one space share a `group` (an open-plan area: no wall is built between them) | O(rows·cols) per rectangle |
| Balcony | a room whose outside edge has no solid wall (a railing) | O(perimeter) |
| Stairs without AI | **projection profile** of the ink in a room: ≥ 7 evenly spaced tread lines (coefficient of variation < 0.35) | O(room area) |
| Scale without dimensions | median of two cues: outer walls ≈ 230 mm, interior doors ≈ 0.85 m (**median** of the door-gap widths) | O(k log k) |

## 2. Geometry — `dsa/geometry.py`
- **Rect** (x, y, w, d): overlap area, contains, shift — each O(1).
- **Rectangle difference** (`rect_minus`): splits a slab around stair openings into at most 4 pieces per hole. O(holes × pieces).
- **Shared wall** between two rooms: compare touching edges, then intersect their spans. O(1).

## 3. Walls as intervals — `dsa/intervals.py`
- **Hash map**: the key is (orientation, coordinate rounded to 5 cm) and the value is a list of spans. Every room adds 4 edges, so rooms on the same line share a bucket.
- **Interval merging** (sort + sweep) turns touching spans into continuous walls. O(R log R).
- **1-D single-linkage clustering** (SciPy `linkage` + `fcluster`) snaps nearly-equal edges, such as 3.02 m and 2.98 m, onto one wall line. It joins every value whose chain distance is under the tolerance, which is the same as sort-and-sweep. A snap lookup is a **binary search** (`numpy.searchsorted`), O(log n).

## 4. Spatial index — `dsa/spatial.py`
**Uniform-grid spatial hash** (`RoomGrid`). Every room is stored in each 1 m cell it covers. "Which room is at (x, y)?" then only checks the rooms in one cell: O(1) on average instead of O(R).
This is used thousands of times: exterior-wall tests for windows, stair landings, and AI door/window snapping.

## 5. Room graphs — `dsa/graph.py` (NetworkX)
- **Graph model**: a node is a room; an edge means a door joins two rooms. The weight is the walking distance centroid → door → centroid.
- **Sweep line** to find candidate neighbours: sort rooms by x and keep an *active list* of rooms whose right edge hasn't been passed. Only those pairs are tested for a shared wall, instead of all R² pairs. O(R log R + candidate pairs).
- **BFS** (a FIFO `deque`) from the entrance, nearest door first. This gives the tour order and finds rooms that can't be reached. O(R + D log deg).
- **Tarjan's articulation points** (`nx.articulation_points`, DFS low-link values) find *chokepoint rooms* that every route passes through. O(R + D).
- **Dijkstra** (binary heap) gives the walking distance from the entrance to every room, in metres. O((R + D) log R).
- **Induced subgraph + connected component** finds shared rooms that are reachable only by walking through a bedroom: remove the bedroom nodes and see what stays connected.
- **Whole-house graph**: nodes are (floor, room). Staircase edges join a room on one floor to the arrival room above, weighted by the flight length. Dijkstra on it gives the room farthest from the main door across all floors.

## 6. Doors & windows — `planner/layout.py`
- **Greedy graph repair** (`auto_openings`):
  1. connect each hub (living, dining, passage) to its neighbours;
  2. give every isolated room one door to its best neighbour, using a preference table;
  3. repeatedly add a door from any unreachable room to the reachable part (BFS after each change) until the floor is connected.
- **Union-find (disjoint set)** (`scipy.cluster.hierarchy.DisjointSet`) merges AI door/window points less than 0.8 m apart, so the same door isn't placed twice. Nearly O(α(n)) per merge.
- **Nearest wall** for each AI point: a linear scan over the merged wall lines (≤ ~60 per floor).

## 7. Multi-floor planning — `planner/floors.py`
- **Hungarian algorithm** (`scipy.optimize.linear_sum_assignment`) pairs the staircases on two floors with the least total size mismatch. O(k³), with k ≤ a few stairs.
- **Alignment search**: candidate offsets are the matched stair centres plus 9 combinations of aligning left/right/centre and top/bottom/centre. Each candidate is scored by total footprint overlap (O(R²)) and the best one is chosen; nearly-aligned outer walls are then snapped.
- **Stair fitting**: try 2 directions × 2 ends of the stair space. Each option is scored by:
  - whether the top lands in a room upstairs (+3);
  - whether there is a landing at the bottom (+2);
  - whether a door is near the bottom (+1).

  The number of risers is ⌈floor-to-floor height / 180 mm⌉.
- **Floor ordering**: a stable sort on a key built from Qwen's level, then the printed title (regex parser), then the file name, then the position on the sheet.
- **Shared drawing scale**: the median (`statistics.median`) of the metres-per-pixel values read from dimension labels on the same sheet.

## 8. AI answers are data, not commands — `ai/`
- JSON is extracted from the model's reply by stripping `<think>` blocks and code fences, then trying the longest prefix that parses (the scan runs backwards from the end).
- Every field is validated against the allowed values (room types, styles, materials, known room ids) before the frontend applies it.
- If the AI isn't available, the backend returns a typed error (`503 ai_unavailable`) and the frontend falls back to rule-based logic.

## 9. Public-site AI quota — `dsa/ratelimit.py`
- **Sliding-window rate limiter**: a hash map from visitor IP to a **deque of timestamps**. Expired hits are popped from the front, so each check costs O(1) amortised. A second deque under the key `*` enforces a site-wide 24-hour cap.
- A check can peek (`consume=False`), which is used when choosing a provider, or record a hit (`consume=True`), which happens just before a paid call. Idle visitors are garbage-collected once the table grows past 50,000 keys.
- Only calls paid with the server's own OpenRouter key are metered. A visitor's own key is never limited.
