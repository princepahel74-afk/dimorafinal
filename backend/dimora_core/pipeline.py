"""Uploads → detected, scaled, ordered, aligned and stair-connected floors."""
from __future__ import annotations

import re
import statistics

from .ai import services
from .ai.client import AIClient, AIError
from .config import FLOOR_NAMES, floor_name
from .dsa.geometry import bounds, r2
from .planner.floors import align_and_connect, clean_floor_name, parse_level, shift_floor
from .planner.layout import auto_openings, build_floor
from .vision.loader import image_to_data_url, load_upload, shrink, to_jpeg_b64
from .vision.rooms import detect_rooms, estimate_mpp
from .vision.walls import detect_plan, plan_boxes
from .vision.sheet import crop, even_split, pad_boxes, split_sheet


def read_plan(img, ai: AIClient | None, multi: bool, log, tag: str = ""):
    """CV + optional Qwen reading of one floor-plan image (pixel space, no scale yet)."""
    pre = f"{tag} — " if tag else ""
    cv = detect_plan(img)
    if len(cv.rooms) < 2:  # very faint / unusual drawing: fall back to the classic detector
        alt = detect_rooms(img)
        if len(alt.rooms) > len(cv.rooms):
            cv = alt
    groups = len({r.get("group") for r in cv.rooms if r.get("group")})
    log(f"{pre}computer vision found {len(cv.rooms)} room areas{f' ({groups} open-plan)' if groups else ''}, "
        f"{sum(o['kind'] == 'door' for o in cv.openings)} door and {sum(o['kind'] == 'window' for o in cv.openings)} window openings · walls ≈ {cv.int_px:.0f}/{cv.ext_px:.0f} px.")
    data, source = None, "Computer vision"
    if ai is not None:
        log(f"{pre}asking {ai.label()} to read labels, dimensions, doors, windows{', stairs and the floor name' if multi else ''}…")
        try:
            data = services.read_plan(ai, to_jpeg_b64(img), cv, multi)
            source = ("Computer vision + " if len(cv.rooms) >= 2 else "") + "Qwen"
            log(f"{pre}Qwen returned a structured reading of the plan ({ai.used}).")
        except AIError as e:
            log(f"{pre}AI unavailable ({str(e)[:140]}) — continuing with computer vision only.")
    W, H = cv.W, cv.H

    def pct_box(b, i, pre_id):
        try:
            x0, y0, x1, y1 = (float(v) for v in b)
        except (TypeError, ValueError):
            return None
        if x1 <= x0 or y1 <= y0:
            return None
        return {"id": f"{pre_id}{i}", "x0": x0 / 100 * W, "y0": y0 / 100 * H, "x1": x1 / 100 * W, "y1": y1 / 100 * H}

    px_rooms = [{"id": f"R{i + 1}", "group": r.get("group"), "open_side": bool(r.get("open_side")), "outdoor": bool(r.get("outdoor")),
                 **{k: float(r[k]) for k in ("x0", "y0", "x1", "y1")}} for i, r in enumerate(cv.rooms)]
    if data:
        if len(cv.rooms) < 2 and data.get("rooms_full"):
            px_rooms = []
            for i, r in enumerate(data["rooms_full"]):
                b = pct_box(r.get("bbox"), i + 1, "R") if isinstance(r, dict) else None
                if b:
                    px_rooms.append({**b, "name": r.get("name"), "type": r.get("type")})
        else:
            by_id = {p["id"]: p for p in px_rooms}
            for g in data.get("rooms") or []:
                if isinstance(g, dict) and g.get("id") in by_id:
                    by_id[g["id"]].update(name=g.get("name"), type=g.get("type"))
            for i, g in enumerate(data.get("extra_rooms") or []):
                b = pct_box(g.get("bbox"), i, "X") if isinstance(g, dict) else None
                if b:
                    px_rooms.append({**b, "name": g.get("name"), "type": g.get("type")})
    if not px_rooms:
        raise ValueError("No rooms could be detected. Try a cleaner, high-contrast plan (dark walls on white) or turn on the AI.")
    for r in px_rooms:
        if "stair" in str(r.get("name") or "").lower():
            r["type"] = "hall"
    px_stairs = [b for b in (pct_box(s, i, "S") for i, s in enumerate((data or {}).get("stairs") or [])) if b]
    if not px_stairs:
        px_stairs = [{"id": f"C{i}", **{k: float(v) for k, v in s.items()}} for i, s in enumerate(getattr(cv, "stairs", []) or [])]
    bx0, by0 = min(r["x0"] for r in px_rooms), min(r["y0"] for r in px_rooms)
    # the scale comes from the built width: leave parking / garden / plot out of it
    built = [r for r in px_rooms if not r.get("outdoor") and r.get("type") not in ("parking", "garden")] or px_rooms
    bx1 = max(r["x1"] for r in built)
    built_x0 = min(r["x0"] for r in built)
    try:
        gw = float((data or {}).get("plan_width_m") or 0)
    except (TypeError, ValueError):
        gw = 0
    lvl = (data or {}).get("level")
    est_mpp, est_why = estimate_mpp(cv)
    return {
        "cv": cv, "ai": data, "source": source, "px_rooms": px_rooms, "px_stairs": px_stairs, "est_mpp": est_mpp, "est_why": est_why,
        "bx0": bx0, "by0": by0, "px_w": bx1 - built_x0, "nat": img.shape[1] / cv.W,
        "width_m": gw if 2 < gw < 80 else 0,
        "label": (data or {}).get("floor_label") if isinstance((data or {}).get("floor_label"), str) else "",
        "level": int(round(float(lvl))) if isinstance(lvl, (int, float)) else None,
    }


def _overlay(rd, img, off):
    return {"W": rd["cv"].W, "H": rd["cv"].H, "mpp": rd["mpp"], "bx0": rd["bx0"], "by0": rd["by0"], "off": off,
            "image": image_to_data_url(shrink(img, 1600)) if img is not None else None}


def detect(uploads, width_m: float = 0, forced_floors: int = 0, use_ai: bool = True, ai: AIClient | None = None, default_width: float = 12.0):
    """uploads: [(filename, bytes)] → {'floors': [...], 'log': [...], ...}"""
    log_lines: list[str] = []
    log = log_lines.append
    if ai is not None and (not use_ai or not ai.order()):
        if use_ai:
            log("No AI provider available (Ollama not running and no OpenRouter key) — using computer vision only.")
        ai = None
    sheets = [s for name, data in uploads for s in load_upload(name, data)]
    forced = forced_floors if len(sheets) == 1 else 0
    plans = []
    for si, (name, img) in enumerate(sheets):
        boxes, how = plan_boxes(img), "computer vision"
        if len(boxes) == 1:
            alt = split_sheet(img)  # classic ink-based split (thin-line drawings)
            if len(alt) > 1:
                boxes = alt
        repeat = 0
        if forced and len(boxes) != forced:
            found = boxes
            boxes = None
            if forced > 1 and ai is not None and len(found) > 1:
                try:
                    g = services.split_sheet(ai, to_jpeg_b64(img, 1400), forced)
                    if len(g) == forced:
                        boxes, how = g, "Qwen"
                except AIError as e:
                    log(f"Qwen could not split the sheet ({str(e)[:80]}).")
            if not boxes:
                if forced == 1:
                    boxes = [{"x0": 0, "y0": 0, "x1": 1, "y1": 1}]
                elif len(found) < forced:
                    # fewer plans drawn than storeys: the top plan is a typical floor, repeated upwards
                    boxes, repeat = found, forced - len(found)
                else:
                    boxes = found[:forced]
        padded = pad_boxes(boxes) if len(boxes) > 1 else boxes
        if len(boxes) > 1:
            log(f"{(name + ': ') if len(sheets) > 1 else ''}found {len(boxes)} separate floor plans on the sheet ({how}).")
        for i, b in enumerate(padded):
            plans.append({"img": crop(img, b) if len(boxes) > 1 else img, "sheet": si, "name": name,
                          "hint": boxes[i].get("label") or "", "hint_level": boxes[i].get("level"), "idx": len(plans)})
        if repeat:
            last = plans[-1]
            log(f"{len(boxes)} plan{'' if len(boxes) == 1 else 's'} drawn for {forced} storeys — repeating the top plan as a typical floor for the {repeat} floor{'' if repeat == 1 else 's'} above.")
            for _ in range(repeat):
                plans.append(dict(last, idx=len(plans), hint="", hint_level=None, typical_of=last["idx"]))

    if len(plans) == 1:
        p = plans[0]
        rd = read_plan(p["img"], ai, False, log)
        if width_m or rd["width_m"]:
            width = width_m or rd["width_m"]
            rd["mpp"] = width / rd["px_w"]
        elif rd["est_mpp"]:
            rd["mpp"] = rd["est_mpp"]
            width = rd["mpp"] * rd["px_w"]
            log(f"No dimensions read — scale estimated from {rd['est_why']} (≈ {width:.1f} m wide). Type the real width to override.")
        else:
            width = default_width
            rd["mpp"] = width / rd["px_w"]
        f = build_floor(rd, rd["mpp"], main=True)
        f.update(name=FLOOR_NAMES[0], level=0, height=2.9)
        f["overlay"] = _overlay(rd, p["img"], [0, 0])
        floors, readings = [f], [rd]
        note = f"{rd['source']} · scale {r2(rd['mpp'] * 100)} cm/px · plan width {r2(width)} m"
        log(f"Built {len(f['rooms'])} rooms, {len(f['doors'])} doors and {len(f['windows'])} windows · {note}")
    else:
        log(f"Reading {len(plans)} floors one by one…")
        for p in plans:
            if "typical_of" in p:  # a repeated typical floor: same reading, read once
                src = next(q for q in plans if q["idx"] == p["typical_of"])
                p["rd"] = dict(src["rd"], level=None, label="")
                continue
            p["rd"] = read_plan(p["img"], ai, True, log, f"Plan {p['idx'] + 1}")
        # order: AI level → printed title → file name → position on the sheet
        for p in plans:
            rd = p["rd"]
            lv = rd["level"]
            if lv is None and isinstance(p["hint_level"], (int, float)):
                lv = int(p["hint_level"])
            if lv is None:
                lv = parse_level(rd["label"])
            if lv is None:
                lv = parse_level(p["hint"])
            if lv is None and len(sheets) > 1:
                lv = parse_level(p["name"])
            p["key"] = 1000 + p["idx"] if lv is None else lv * 100 + p["idx"]
            p["title"] = rd["label"] or p["hint"] or ""
        plans.sort(key=lambda p: p["key"])
        # scale: plans on one sheet share a drawing scale (metres per native pixel)
        nat_w = lambda p: p["rd"]["px_w"] * p["rd"]["nat"]  # noqa: E731
        sheet_mpp: dict[int, float] = {}
        if width_m:
            sheet_mpp[plans[0]["sheet"]] = width_m / nat_w(plans[0])
        for si in {p["sheet"] for p in plans}:
            if si in sheet_mpp:
                continue
            v = [p["rd"]["width_m"] / nat_w(p) for p in plans if p["sheet"] == si and p["rd"]["width_m"]]
            if v:
                sheet_mpp[si] = statistics.median(v)
        if not sheet_mpp:
            est = [p["rd"]["est_mpp"] / p["rd"]["nat"] for p in plans if p["sheet"] == plans[0]["sheet"] and p["rd"]["est_mpp"]]
            if est:
                sheet_mpp[plans[0]["sheet"]] = statistics.median(est)
                log(f"No dimensions read — scale estimated from {plans[0]['rd']['est_why']}. Type the real width to override.")
            else:
                sheet_mpp[plans[0]["sheet"]] = default_width / nat_w(plans[0])
        g0 = plans[0]
        ground_w = nat_w(g0) * sheet_mpp[g0["sheet"]] if g0["sheet"] in sheet_mpp else next(nat_w(q) * sheet_mpp[q["sheet"]] for q in plans if q["sheet"] in sheet_mpp)
        for p in plans:
            if p["sheet"] not in sheet_mpp:
                sheet_mpp[p["sheet"]] = ground_w / nat_w(p)  # separate image with no dimensions: same footprint width as ground
        floors, readings = [], []
        for k, p in enumerate(plans):
            rd = p["rd"]
            rd["mpp"] = sheet_mpp[p["sheet"]] * rd["nat"]
            f = build_floor(rd, rd["mpp"], main=(k == 0))
            f.update(name=clean_floor_name(p["title"], k), level=k, height=2.9)
            floors.append(f)
            readings.append(rd)
        for k, f in enumerate(floors):
            if any(o["name"] == f["name"] for o in floors[:k]):
                f["name"] = floor_name(k)
        offs = [[0.0, 0.0] for _ in floors]
        align_and_connect(floors, offs)
        for k, (f, p) in enumerate(zip(floors, plans)):
            f["overlay"] = _overlay(readings[k], p["img"], offs[k])
        srcs = " / ".join(sorted({rd["source"] for rd in readings}))
        note = f"{srcs} · {len(floors)} floors · scale {r2(readings[0]['mpp'] * 100)} cm/px · ground floor width {r2(bounds(floors[0]['rooms']).w)} m"
        for f in floors:
            log(f"{f['name']}: {len(f['rooms'])} rooms, {len(f['doors'])} doors, {len(f['windows'])} windows{', staircase going up' if f['stairs'] else ''}")
        n_st = sum(1 for f in floors if f["stairs"])
        log(f"Stacked {len(floors)} floors and connected them with {n_st} staircase{'' if n_st == 1 else 's'} · {note}")
    rd0 = readings[0]
    return {
        "floors": floors,
        "wall_thickness": {"ext": r2(max(0.15, min(0.35, rd0["cv"].ext_px * rd0["mpp"]))), "int": r2(max(0.08, min(0.25, rd0["cv"].int_px * rd0["mpp"])))},
        "scale_note": note, "log": log_lines, "ai": ai.used if ai else None,
        "source": " / ".join(sorted({rd["source"] for rd in readings})),
    }


def restack(floors, offsets):
    """User moved a floor up/down in the review panel: undo old alignment, re-number, re-align, re-connect."""
    for f, off in zip(floors, offsets):
        shift_floor(f, -off[0], -off[1])
    for k, f in enumerate(floors):
        f["level"] = k
        if f.get("name") in FLOOR_NAMES or re.fullmatch(r"\d+(st|nd|rd|th) Floor", str(f.get("name"))):
            f["name"] = floor_name(k)
        f["doors"] = [d for d in f.get("doors", []) if not d.get("main")]
    auto_openings(floors[0], windows=False)
    new_offs = [[0.0, 0.0] for _ in floors]
    align_and_connect(floors, new_offs)
    return floors, new_offs
