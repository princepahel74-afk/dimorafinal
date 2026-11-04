"""What DIMORA asks Qwen to do. Each function builds a prompt, calls the model and
validates the JSON it returns (the model never edits the home directly)."""
from __future__ import annotations

from ..config import ROOM_TYPES
import re

from .client import AIClient, AIError, extract_json

TYPES = ", ".join(ROOM_TYPES)


def read_plan(ai: AIClient, image_b64: str, cv, multi: bool = False) -> dict:
    """Name the CV regions, read the scale, find doors/windows/stairs (and floor title)."""
    multi_task = (
        "\n5. This drawing is ONE storey of a multi-storey building. Give \"floor_label\" = the title printed for this plan "
        "(e.g. \"Ground Floor Plan\", \"First Floor\") or null, and \"level\" = 0 for ground/stilt, 1 for first floor, 2 for second, "
        "-1 for basement, or null if unknown.\n6. Give the bbox (percent) of every staircase drawn (the flight with its treads) in \"stairs\". "
        "Name a stair hall \"Staircase\"." if multi else "\n5. Give the bbox (percent) of any staircase drawn, in \"stairs\" ([] if none).")
    extra = ', "stairs":[[x0,y0,x1,y1]]' + (', "floor_label": string|null, "level": number|null' if multi else "")
    if len(cv.rooms) >= 2:
        boxes = "\n".join(f"R{i + 1}{' (OUTSIDE the house, inside the plot)' if r.get('outdoor') else ''}: [{round(r['x0'] / cv.W * 100)}, {round(r['y0'] / cv.H * 100)}, {round(r['x1'] / cv.W * 100)}, {round(r['y1'] / cv.H * 100)}]" for i, r in enumerate(cv.rooms))
        prompt = f"""You are an expert architectural floor-plan analyst for an Indian home-design app.
The attached image is a floor plan. Computer vision found these enclosed regions; boxes are [x0, y0, x1, y1] in percent of image width/height:
{boxes}

Tasks:
1. Read the text labels / dimensions printed on the plan and name every region. Choose "type" from: {TYPES}.
   Open-air areas: "balcony" (balcony, sit-out, deck, terrace), "parking" (open car/bike parking, porch, drive), "garden" (garden, lawn, park, landscape, play area). A walled, roofed "GARAGE" is type "garage" (it gets a roll-up door, a car and a bike in 3D).
2. If dimension annotations are visible, give the real-world width in metres of the built area (left-most to right-most outer wall) as plan_width_m, else null. Convert feet to metres (1 ft = 0.3048 m).
3. If CV clearly missed a room, add it to extra_rooms with a percent bbox.
4. Give approximate centre points (percent of image) of every door and every window you can see.{multi_task}
Respond with ONLY valid JSON, no prose:
{{"plan_width_m": number|null, "rooms":[{{"id":"R1","name":"Living Room","type":"living"}}], "extra_rooms":[{{"name":"","type":"","bbox":[0,0,0,0]}}], "doors":[[x,y]], "windows":[[x,y]]{extra}, "notes":"one sentence"}}"""
    else:
        prompt = f"""You are an expert architectural floor-plan analyst. Detect every room in the attached floor plan.
For each room give name, type (one of: {TYPES}; open-air areas: balcony, parking = open car parking/porch, garden = lawn/park; an enclosed garage = garage) and bbox [x0, y0, x1, y1] in percent (0-100) of the image width/height, tightly along the wall centre-lines. Rooms should tile the plan without overlapping.
Also give plan_width_m (real width of the built area in metres from dimension labels, else null) and approximate centre points (percent) of doors and windows.{multi_task.replace(chr(10) + '5.', chr(10) + '-').replace(chr(10) + '6.', chr(10) + '-')}
Respond with ONLY valid JSON: {{"plan_width_m": number|null, "rooms_full":[{{"name":"","type":"","bbox":[0,0,0,0]}}], "doors":[[x,y]], "windows":[[x,y]]{extra}, "notes":""}}"""
    out = ai.ask_json(prompt, [image_b64], temperature=0.1, max_tokens=4096)
    return out if isinstance(out, dict) else {}


def split_sheet(ai: AIClient, image_b64: str, n: int):
    prompt = f"""This architectural drawing sheet contains {n} floor plans of one building, one plan per storey (e.g. ground floor, first floor, terrace).
For each separate floor-plan drawing give its bounding box [x0, y0, x1, y1] in percent (0-100) of the image width/height around the walls and dimension lines (not the title block), the title printed for it, and its level (0 = ground/stilt, 1 = first floor, 2 = second, -1 = basement).
Respond with ONLY JSON: {{"floors":[{{"bbox":[0,0,0,0],"label":"Ground Floor Plan","level":0}}]}}"""
    j = ai.ask_json(prompt, [image_b64], temperature=0.1, max_tokens=1200)
    out = []
    for f in (j.get("floors") or []) if isinstance(j, dict) else []:
        b = f.get("bbox")
        if isinstance(b, list) and len(b) == 4 and b[2] > b[0] and b[3] > b[1]:
            out.append({"x0": max(0, b[0] / 100), "y0": max(0, b[1] / 100), "x1": min(1, b[2] / 100), "y1": min(1, b[3] / 100), "label": f.get("label"), "level": f.get("level")})
    return out


ARIA = """You are Aria, the AI design assistant inside DIMORA — an Indian app that turns 2D floor plans into furnished 3D homes.
You can both ANSWER questions and CHANGE the user's home by returning actions.

How to work:
- Use the home facts below for every number you mention (sizes, areas, costs in ₹, daylight). Never invent figures that aren't in the facts.
- When the user asks for a change, return the actions that do it. Several actions are fine ("paint the bedrooms beige and add a study table" = 2+ actions). Use room ids from the facts; "all" means every room.
- "this room" / "here" means focus_room. Vague requests ("make it cosy") → pick sensible, concrete choices that suit the theme and say what you chose.
- If a request is truly ambiguous (e.g. "paint it" with no room and no focus), ask one short question and return no actions.
- Questions only (costs, sizes, advice) → answer with actions [].
- Things you can't do (structural changes to load-bearing walls, buying products, anything unrelated to the home) → say so kindly and suggest what you can do.
- Reply in the same language the user writes in (English, Hindi or Hinglish). Keep "reply" to 1–3 warm, specific sentences.
"""


def assistant(ai: AIClient, text: str, home_state: str, action_doc: str, history=None) -> dict:
    allowed = set(re.findall(r'"do"\s*:\s*"(\w+)"', action_doc or "")) or None
    prompt = f"""{ARIA}
HOME FACTS (JSON): {home_state}

{action_doc}

User: {text}
Respond with ONLY JSON: {{"reply":"...","actions":[...]}}"""
    msgs = []
    for h in (history or [])[-12:]:
        t = str(h.get("text", ""))[:800]
        if t:
            msgs.append({"role": "assistant" if h.get("role") in ("model", "aria", "assistant") else "user", "text": t})
    msgs.append({"role": "user", "text": prompt})
    raw = ai.chat(msgs, temperature=0.3, max_tokens=1500)
    try:
        j = extract_json(raw)
    except AIError:
        j = {"reply": raw.strip()[:1200], "actions": []}  # the model answered in plain text: still a useful reply
    if not isinstance(j, dict):
        j = {}
    acts = j.get("actions") if isinstance(j.get("actions"), list) else []
    acts = [a for a in acts if isinstance(a, dict) and isinstance(a.get("do"), str) and (allowed is None or a["do"] in allowed)][:10]
    return {"reply": str(j.get("reply") or "")[:1200], "actions": acts}


def narration(ai: AIClient, theme: str, household: str, floors: list, rooms: list) -> dict:
    facts = "\n".join(f"[{r['id']}] " + (f"({r['floor']}) " if r.get("floor") and len(floors) > 1 else "") + r["facts"] for r in rooms)
    multi = (f"The home has {len(floors)} floors ({', '.join(floors)}) connected by a staircase; the tour climbs the stairs between floors, so mention it when a new floor starts.\n" if len(floors) > 1 else "")
    prompt = f"""You are Aria, a warm, witty Indian interior-design guide giving a spoken, animated home tour in DIMORA.
Home theme: {theme}. Household: {household}.
{multi}Rooms in tour order with facts:
{facts}
Write narration to be read aloud. For each room 2–3 short sentences (max 55 words): describe the space using the real facts, then one practical, specific suggestion. Mention cost in ₹ only for 2–3 rooms. Plain text, no emojis or markdown.
Respond ONLY with JSON: {{"intro":"...","rooms":{{"<id>":"..."}},"outro":"..."}}"""
    j = ai.ask_json(prompt, temperature=0.7, max_tokens=3000)
    ids = {r["id"] for r in rooms}
    return {"intro": str(j.get("intro") or ""), "outro": str(j.get("outro") or ""),
            "rooms": {k: str(v) for k, v in (j.get("rooms") or {}).items() if k in ids and v}}


def inspiration(ai: AIClient, image_b64: str, styles, floors, finishes) -> dict:
    prompt = (f'Analyse this interior inspiration photo. Respond ONLY JSON: {{"style":"one of {", ".join(styles)}","wall":"#hex wall paint colour seen or implied",'
              f'"accent":"#hex","floor":"one of {", ".join(floors)}","furniture_finish":"one of {", ".join(finishes)}","description":"1-2 sentences on what defines this look"}}')
    j = ai.ask_json(prompt, [image_b64], temperature=0.2, max_tokens=800)
    out = {"description": str(j.get("description") or "")}
    if j.get("style") in styles:
        out["style"] = j["style"]
    for k in ("wall", "accent"):
        if isinstance(j.get(k), str) and j[k].startswith("#") and len(j[k]) in (4, 7):
            out[k] = j[k]
    if j.get("floor") in floors:
        out["floor"] = j["floor"]
    if j.get("furniture_finish") in finishes:
        out["finish"] = j["furniture_finish"]
    return out


def report_summary(ai: AIClient, facts: str, room_facts: str) -> str:
    prompt = (f"Write a crisp 4-sentence executive summary for a homeowner's decision report. Facts: {facts} Room facts: {room_facts}. "
              f"Plain text, Indian Rupees, no markdown. Respond ONLY JSON: {{\"summary\":\"...\"}}")
    j = ai.ask_json(prompt, temperature=0.5, max_tokens=600)
    return str(j.get("summary") or "")
