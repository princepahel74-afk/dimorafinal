# DIMORA — AI floor plan → 3D home designer

Upload a 2D floor plan (single floor or multi-storey). DIMORA detects the walls, rooms, doors, windows and stairs, then builds a furnished 3D home. You can walk through it, edit it, budget it in ₹, and tour it with **Aria**, the AI guide.

Version 2 moves the engine into a **Python backend** built on data structures and algorithms, and replaces Gemma 4 with **Qwen 3.5**, an open-source vision-language model (Apache-2.0).

```
 Browser (frontend/)                         Python backend (backend/)                      AI
 ───────────────────                         ─────────────────────────                      ──
 3D WebGL2 renderer, 2D SVG editor,  ─HTTP→  Flask REST API (app.py)                  ─→  Qwen 3.5
 walk mode, tour camera, panels               ├─ vision/   OpenCV: sheet split, walls,       via Ollama (local, qwen3.5:9b)
                                              │            rooms, wall thickness, PDF        or OpenRouter (hosted, qwen/qwen3.5-27b)
                                              ├─ dsa/      geometry, interval merging,
                                              │            spatial grid, room graphs
                                              ├─ planner/  rooms, doors, windows, floor
                                              │            ordering, alignment, stairs,
                                              │            graph analytics, tour order
                                              └─ ai/       prompts + JSON validation
```

## Run it

**Windows:** double-click `run.bat`. **macOS / Linux:** `./run.sh`.
Then open **http://127.0.0.1:8000**.

Or by hand:
```bash
cd backend
python -m venv .venv && . .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                               # optional settings
python app.py
```

Without an AI connected, everything still works. The computer vision runs on the backend, and Aria uses a rule-based parser. If the backend isn't running at all, the page falls back to a simpler in-browser engine.

## Connect the AI (Qwen 3.5)

| | Local — **Ollama** | Hosted — **OpenRouter** |
|---|---|---|
| Model | `qwen3.5:9b` | `qwen/qwen3.5-27b` (default), `qwen/qwen3.5-9b` (cheapest), `qwen/qwen3-vl-235b-a22b-instruct` (most accurate) |
| Cost | free | pay per use (a floor plan costs well under ₹1) |
| Privacy | plans never leave your PC | sent to OpenRouter |
| Needs | ~8 GB of GPU memory, or a 16 GB Mac (runs on CPU, but slowly) | an API key |
| Setup | install [Ollama](https://ollama.com), then `ollama pull qwen3.5:9b` | put `OPENROUTER_API_KEY=sk-or-…` in `backend/.env`, or paste it in ⚙ Settings |

With `DIMORA_AI_PROVIDER=auto` (the default), the backend uses Ollama when it is running and has the model. Otherwise it uses OpenRouter. ⚙ **Settings** in the app shows what is connected and has a **Test AI** button.

**Why Qwen 3.5:**
- It is open-weight under Apache-2.0.
- Every size is natively multimodal: one model reads the plan image and also chats.
- The 9B model is small enough for a laptop GPU.
- Larger sizes are available through a cheap hosted API.

**What Qwen does in DIMORA:**
- names rooms and reads the scale, doors, windows, stairs and floor titles;
- splits a sheet that holds several floors when you force a floor count;
- powers Aria's actions;
- writes the tour narration;
- matches the style of an inspiration photo;
- writes the report summary.

Qwen never edits the home directly. It returns JSON that the backend validates.

## Accuracy: what the detector handles
- **Many drawing styles:** CAD drawings, coloured or watercolour presentation plans, scans and sheets with several floors. Walls are found first (thick grey or black strokes). Text, furniture, dimension lines, grid bubbles and colour washes are ignored.
- **Open-plan spaces:** an L-shaped living/dining/kitchen is kept as one connected space, split into rectangles with no wall between them.
- **Doors and windows from the drawing:** a door is a gap with a swing arc beside it, and a window is a gap with glazing lines across it. The main entrance is the widest outside door.
- **Balconies:** a balcony is recognised by its open railing side.
- **Stairs:** found from their tread lines, even without AI.
- **Fix anything before generating:** on the detection screen you can select and move rooms; **＋ Room** (drag), **＋ Door** and **＋ Window** (click a wall) add items; **Delete** (or the Del key) removes them. You can also rename rooms and change their type in the list.
- **For the best results:**
  - Connect Qwen: it reads room names, printed dimensions and floor titles.
  - Or type the real plan width.
  - Use the original PDF or a high-resolution image.

## Multi-floor plans
You can upload any of these:
- one sheet with every floor on it;
- a multi-page PDF;
- several images at once, one per floor.

The backend then:
1. splits the sheet into one plan per floor;
2. orders the floors (Qwen's level, then the printed title, then the file name, then the position on the sheet);
3. gives plans on the same sheet the same scale;
4. aligns each floor over the one below (stair matching with the Hungarian algorithm, plus maximum footprint overlap);
5. fits a staircase so its top step lands in a room upstairs.

## REST API

| Method | Path | Does |
|---|---|---|
| GET | `/api/health` | backend version and AI status (Ollama / OpenRouter) |
| POST | `/api/plans/detect` | multipart `files[]` (PNG/JPG/WEBP/PDF), `width_m`, `floors`, `use_ai` → floors in metres plus detection overlays and a log |
| POST | `/api/plans/restack` | re-order floors, then re-align and re-connect the stairs |
| POST | `/api/analyze` | room-graph analytics: BFS order, chokepoints, Dijkstra walking distances, stair geometry, whole-house connectivity |
| POST | `/api/tour` | tour order across floors |
| POST | `/api/assistant` | Aria: `{text, home, action_doc, history}` → `{reply, actions}` |
| POST | `/api/narration` | tour narration for each room |
| POST | `/api/inspiration` | inspiration photo → style, colours, floor, finish |
| POST | `/api/report-summary` | executive summary for the report |
| POST | `/api/ai/test` | a one-line check that the AI answers |
| POST | `/api/auth/signup` · `/api/auth/login` | `{email, password, name}` → `{user, token}` (send as `Authorization: Bearer <token>`) |
| POST | `/api/auth/logout` | end this session |
| GET · PATCH · DELETE | `/api/auth/me` | profile; update `{name, prefs}`; delete account (`{password}`) |
| POST | `/api/auth/password` | `{old, new}` → new token (other sessions are signed out) |
| GET | `/api/projects` | your saved homes (summaries) |
| GET · PUT · DELETE | `/api/projects/<id>` | open, save `{project, summary}`, delete one home |

AI endpoints return **503 `ai_unavailable`** when no model is connected; the frontend then uses its rule-based fallbacks. To choose the provider per request, send the headers `X-AI-Provider`, `X-OpenRouter-Key`, `X-OpenRouter-Model` and `X-Ollama-Model`.

## Tests
```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest -q             # 30 tests: DSA units + API (with Qwen mocked)
python tests/fake_ollama.py     # optional: a fake Ollama on :11434 for end-to-end runs with no GPU
```

## Project layout
```
backend/
  app.py                      Flask app: API routes + serves frontend/
  dimora_core/
    config.py                 settings (.env), room types, ids
    dsa/geometry.py           rectangles, overlap, rectangle difference, shared walls
    dsa/intervals.py          interval merging, wall lines (hash map), 1-D single-linkage clustering
    dsa/spatial.py            uniform-grid spatial hash for point → room queries
    dsa/graph.py              room-adjacency graph: sweep-line, BFS, Tarjan, Dijkstra, whole-house graph
    vision/loader.py          image/PDF decoding (OpenCV, pypdfium2)
    vision/walls.py           wall-first detection: walls, gaps → doors/windows, outline, rooms → rectangles, stairs
    vision/rooms.py           classic detector (fallback) + scale estimate
    vision/sheet.py           splitting a multi-plan sheet
    planner/layout.py         pixels → metres, room typing, snapping, doors/windows (union-find de-dup)
    planner/floors.py         floor names/levels, alignment (Hungarian matching), stair fitting
    planner/analysis.py       graph analytics and tour order
    ai/client.py              Qwen via Ollama/OpenRouter, auto-fallback, JSON extraction
    ai/services.py            prompts and validation of every AI answer
    pipeline.py               uploads → finished floors
  tests/                      pytest suite + fake Ollama server
frontend/                     the web app (HTML/CSS/JS, WebGL2 3D engine)
docs/DSA.md                   every data structure and algorithm, with complexity
samples/                      two one-floor plans to try
```

## Modern villa exteriors & garages (v2.7)
Your 2D plan now comes out looking like a finished modern house (the Planner 5D style):
- **Exterior styles** (Design panel → *Exterior style*, or ask Aria "make the outside a modern villa"):
  - **Modern villa** (default): white render, stacked-stone feature walls on the ground floor, a timber-batten band between floors, slim black window frames and a thin dark flat roof that overhangs the walls.
  - **Classic Indian**: plaster, stone plinth, moulded bands, window chajjas and a parapet roof terrace.
  - **Brick & white**: exposed red-brick volumes with white render.
  - *Outside paint* swatches or a custom colour override the wall colour; *Style default* resets it.
- **Garages**: a room labelled GARAGE on your plan, or any room you turn into one (Space → Transform → *Garage*), gets these on its outside wall:
  - a timber portal and a rolled-up door with an LED strip;
  - a detailed SUV parked nose-out, plus a motorbike if there's room;
  - a cobblestone driveway straight to a wide gate in the boundary wall.
  - If the garage sticks out past the floor above, it gets its own roof with an overhang. A balcony on top of it gets glass railings.
- **Cars**: open car porches and parking drawn on the plan use the same detailed SUV.
- **Landscaping**: lush shrub clusters line the front of the house and the footpath.
- **Roofs**: recessed balconies and small enclosed gaps in the plan (ducts, shafts) are covered by the roof, so the top looks solid.
- The sample duplex (*Try a sample* → duplex) shows all of it.

## Keyboard controls (v2.6.1)
| Where | Keys |
|---|---|
| **3D view** (fly around the outside) | **W A S D** or arrows: glide · **Q / E**: circle the house · **Z / X**: zoom in / out · **T / G**: higher / lower viewing angle · **Shift**: faster · drag to orbit, right-drag to pan, wheel to zoom |
| **🚶 Walk outside** (3D toolbar) | Starts you at the gate at eye level, facing the house. **W A S D** or arrows to walk around the garden, parking and paths, then in through the front door. Drag to look around · **Shift** to hurry · **Esc** to leave |
| **Walk** (inside) | **W A S D**: walk · ←/→: turn · stairs take you between floors · walk out of the main door to explore outside · **Esc** to leave |

Walls, balcony railings and the boundary wall stop you; doorways let you through. The keys are ignored while you type in a text box, and **⌨ WASD** in the toolbar shows this help.

## The complete app (v2.6)
**Your OpenRouter API key goes on the server, never in the page.**
- On your PC, open `backend/.env` (copied from `.env.example` the first time you run `run.bat`). Set `OPENROUTER_API_KEY=sk-or-…` and `DIMORA_AI_PROVIDER=openrouter`, then restart.
- On Render, set the same two values under *Environment*. `render.yaml` asks for the key when you create the Blueprint.
- ⚙ Settings → *Test AI* checks it. Clear messages tell you if the key is wrong, out of credits, or rate-limited.
- Visitors never see the key. In public mode (`DIMORA_PUBLIC=1`), each visitor gets an hourly allowance.

**Accounts and cloud save**
- Sign up with email and password. Passwords are stored as salted scrypt hashes, and sessions are random tokens of which only the hash is stored.
- Homes, chat history and preferences save to your account automatically (☁ chip in the top bar) and open on any device. Homes made before signing in move into the account.
- Account settings let you change your password (this signs out other devices) or delete the account and all its homes.
- *Continue without an account* keeps everything in this browser only. That's also what happens automatically when the server can't be reached.
- **Storage.** By default it's a SQLite file in `backend/data/`, which is fine on your own PC. Render's free plan wipes its disk on every restart, so for a public site create a free Postgres database:
  1. Sign up at neon.tech (or supabase.com), create a project and copy its connection string.
  2. Set it as `DATABASE_URL` on Render.

**Installable app.** DIMORA is a Progressive Web App.
- In Chrome or Edge, click *⤓ Install app* (landing page or dashboard), or use the browser menu → *Install*. On Android, choose *Add to Home screen*.
- On iPhone, tap Share → *Add to Home Screen*.
- It opens full screen with its own icon. Opened without internet, it still starts, and the 3D viewer and your device projects work. Plan reading, AI and sync come back when you're online.

**Aria, the chatbot**
- **With the AI connected,** Aria gets the real facts of your home: sizes, areas, cost per room, daylight, design checks and your budget. It answers with those numbers and can change the home. Its actions cover paint, flooring, furniture, themes, room transformations, resizing, budget fitting, ceilings, lighting, time of day, views, floors, facade colour, roof and cutaway, and saving variants.
- It remembers the conversation per home, and the chat history is saved with the home.
- It replies in English, Hindi or Hinglish.
- **Without the AI,** an on-device engine still carries out commands and answers questions: counts, sizes, costs (per room and against your budget), daylight, parking and garden.

**Tested.**
- 46 backend tests: accounts, privacy between users, plan reading, multi-floor, plots, and AI parsing.
- An automated click-through of every panel and button: no dead buttons, no errors.
- End-to-end runs of sign-up → design → sync → second device, and of the chatbot through an OpenRouter-compatible test server (`backend/tests/fake_openrouter.py`).

## Balconies, parking and gardens (v2.5)
- **Open-air spaces** are three room types: *Balcony*, *Car Parking* and *Garden*. In 3D they have no ceiling and no walls to the outside.
  - **Balconies** get a modern railing: a low upstand, frameless glass, steel posts and handrail. They have a deck floor and outdoor furniture. The house wall behind a balcony gets the exterior finish, with the stone plinth, sills and sunshades.
  - **Car parking** gets interlocking pavers, white bay lines, up to three cars, and a car porch on slim steel columns, unless a floor above already covers it.
  - **Gardens and parks** get lawn, trees or shrubs (depending on width), flower beds, a stepping-stone path, a bench and garden lights.
- **Detection (backend).** A compound wall or plot line drawn around the house is recognised as the plot, not as house walls. The open ground between the house and the plot is cut into areas.
  - With Qwen connected, labels such as *PARKING*, *CAR PORCH*, *GARDEN* or *LAWN* name them.
  - Without AI, the largest area that fits a car (2.5 × 5 m) becomes the parking and the rest becomes garden.
  - The plan's scale is still taken from the house, not the plot.
- **Site.** When the plan includes yards, the boundary wall follows the plot and the gate opens onto the parking.
- **Manual control.** In the detection screen or the 2D editor, draw a rectangle and set its type to Balcony, Car Parking or Garden. The browser-only mode (no backend) needs this, because it doesn't detect plots.
- The built-up area and room count leave out parking and garden.

## Multi-storey buildings (v2.4)
- **Several plans on one sheet** (side by side, stacked, three or more floors) are separated into floors, ordered by their titles, aligned, and connected with staircases.
- **Architect sheets with a drawing border and title block are read correctly.** The frame used to join every plan into one giant floor. It's now recognised (it spans the sheet but is almost empty inside) and ignored, and title-block text is never mistaken for a floor.
- **Several files or PDF pages** are read as one floor each.
- **Typical floors.** If a building has more storeys than plans drawn, set *Storeys in the building* (up to 15) before uploading and the top plan is repeated upwards. After detection you can also click **＋ Add floor above** to copy the floor you're viewing as a new storey, with a staircase up to it.
- **Detector accuracy fixes.**
  - Openings in thick outer walls (doors and windows) are found, so rooms next to the front door no longer leak outside.
  - A door right beside a window is split into a door and a window.
  - Bold room labels and size text are no longer read as walls or used to cut rooms apart.

## Realistic 3D (v2.3)
The WebGL2 engine renders the house in a photo-like style. Everything is generated in code, so there are no texture files to download:
- **Materials with depth and shine.** Every surface has roughness and reflections, and procedural relief (bump mapping) adds wood grain and plank gaps, tile grout, marble veins, brick and stone joints, plaster texture, grass and leaves.
- **Light.** The sun follows the time slider with soft shadows. The sky has a gradient, a sun glow and clouds. Moonlight and stars appear at night, warm interior lights come on, and ACES filmic tone mapping keeps colours natural.
- **Post-processing.** 4× anti-aliasing (MSAA) smooths edges, screen-space ambient occlusion adds soft shading where surfaces meet, and a light vignette frames the view.
- **The house.** Outside walls get a textured plaster finish with a stone plinth and floor bands, and rooms get skirting boards. Windows have tinted reflective glass, charcoal frames with mullions, stone sills and concrete sunshades (chajjas). The main door is panelled, with a canopy, a step and a wall light.
- **The plot.** A lawn, paved apron and path lead to a boundary wall with a gate, pillars and lamps. There are trees, hedges and shrubs, with the street in front.
- **Roof.** The "Roof" button in the 3D toolbar shows the finished terrace with tiles, a parapet with coping and a water tank.
- **Quality setting.** ⚙ Settings → Graphics → 3D quality offers Ultra, High, Balanced and Low. Phones default to Balanced. Without WebGL2 post-processing support the engine falls back automatically.

## Publish it as a website for everyone
DIMORA is one Flask app that serves both the website and the API, so it deploys as a **single web
service**. The repo includes `render.yaml` (one-click Render setup), a `Dockerfile` (for Railway, Fly.io,
Koyeb, Cloud Run or a VPS) and a `Procfile`.

**1. Get an AI key (2 min).** Sign in at openrouter.ai, then Keys → Create key. Set a **credit limit** on
the key (for example $5), because the public uses your credits. A server can't run Ollama without a GPU,
so the hosted site uses OpenRouter.

**2. Put the project on GitHub (5 min).**
- Create a free account at github.com, then New repository → name it `dimora` → Create.
- Click "uploading an existing file". Drag in everything *inside* the DIMORA folder (backend, frontend,
  docs, samples, render.yaml, Dockerfile, …), then Commit.
- ⚠ Never upload `backend/.env`. It holds your key, and the key goes into Render instead.

**3. Deploy on Render (5–10 min).**
- Sign up at render.com with your GitHub account, then New → Blueprint → choose the `dimora` repo.
- When asked for `OPENROUTER_API_KEY`, paste your key, then click Apply.
- The first build takes about 5 minutes. Your site is then live at `https://dimora-xxxx.onrender.com`.
  Share that link.
- Every change you push to GitHub redeploys the site automatically. Settings → Custom Domains lets you
  attach your own domain.

**What the free plan means.** The site sleeps after 15 minutes without visitors, and the next visitor waits
about a minute while it wakes. It also has a small CPU, so plan detection takes longer than on your PC.
The Starter instance ($7/month) stays awake and is faster.

**Public-site protection** (on by default in `render.yaml` and the Dockerfile with `DIMORA_PUBLIC=1`):
- Each visitor gets `DIMORA_AI_PER_HOUR` Qwen calls an hour on your key (default 20). The whole site gets
  `DIMORA_AI_PER_DAY` (default 500). After that DIMORA quietly continues with its rule-based engine.
- Visitors who paste their own OpenRouter key in ⚙ Settings use their own credits and aren't limited.
- Visitors can't make your server call other addresses. The Ollama-URL override is ignored.
- Uploads are capped at `DIMORA_MAX_UPLOAD_MB`.

**Other hosts.** With Docker: `docker build -t dimora . && docker run -p 8000:8000 -e OPENROUTER_API_KEY=… dimora`.
Static-only hosts (GitHub Pages, Netlify, Vercel) can serve `frontend/`, but they run the simpler
in-browser engine unless ⚙ Settings → Backend URL points at a running DIMORA backend.

Cost figures are illustrative estimates, not market quotes. Structural notes are indicative only: consult a licensed architect or engineer.
