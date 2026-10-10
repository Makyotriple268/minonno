#!/usr/bin/env python3
"""Make doodle-style explainer videos (like "What Did Ancient Humans Do All Day?")
from a topic, using a reusable library of character poses, backgrounds and items.

Steps:
  1. plan    - Gemini writes the script in a calm "you"-focused explainer style
               and splits it into shots (one every 2-4 seconds). Each shot says
               which background, character poses, items, label and mark to show.
               Prints a checklist (with image prompts) of any library art that's
               still missing.
  2. render  - the narration is voiced (free Microsoft voice), then every shot
               is assembled from the library and lightly animated: characters
               pop in and "breathe", items pop in one by one, check and cross
               marks draw themselves, labels appear, the camera slowly zooms.
               Also writes a thumbnail and the YouTube title/description/tags.

Usage:
  python explainer.py plan "what did ancient humans do all day" -o ancient.json --minutes 10
  python explainer.py render ancient.json

Library (make once, reuse in every video):
  library/characters/<name>/<pose>.png   transparent or plain white background
  library/backgrounds/<name>.png         16:9 scenes, no people
  library/items/<name>.png               single objects, transparent or plain white
Anything missing is drawn as a simple placeholder so you can preview first.
"""

import argparse
import asyncio
import colorsys
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080
FPS = 30
HERE = Path(__file__).resolve().parent
HAND_FONT = str(HERE / "fonts" / "PatrickHand-Regular.ttf")
GEMINI_MODEL = "gemini-2.5-flash"
SHOTS_PER_MINUTE = 20      # the reference style cuts every ~3 seconds
SHOT_GAP = 0.12            # pause after each shot's narration
MIN_SHOT = 1.3             # seconds
PAPER = (251, 250, 246)
INK = (30, 30, 30)
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}

POSES = {
    "idle": "standing relaxed, arms at sides, neutral face",
    "talking": "standing, one hand raised mid-gesture, mouth open as if explaining",
    "happy": "standing with a big smile",
    "laughing": "laughing with eyes closed, holding belly",
    "excited": "jumping slightly with both arms up, huge grin",
    "proud": "standing tall, hands on hips, confident smile",
    "sad": "head down, frowning, shoulders slumped",
    "crying": "crying with tears, hands near face",
    "angry": "furrowed brows, clenched fists, gritted teeth",
    "annoyed": "unimpressed half-lidded eyes, flat mouth",
    "scared": "leaning back, wide eyes, hands raised defensively",
    "shocked": "very wide eyes, mouth open, hands on cheeks",
    "confused": "scratching head, one eyebrow raised",
    "thinking": "hand on chin, eyes looking up",
    "curious": "leaning forward, looking closely",
    "tired": "droopy eyes, slouched, arms hanging",
    "exhausted": "bent over, hands on knees, sweating",
    "sick": "pale, holding stomach, queasy face",
    "sleeping": "lying down asleep with eyes closed",
    "bored": "slouching, resting cheek on hand, half-closed eyes",
    "relaxed": "lying back leisurely, hands behind head, content smile",
    "pointing": "pointing to the side with one arm extended",
    "shrug": "shrugging with both palms up",
    "arms_crossed": "arms crossed, skeptical look",
    "facepalm": "hand over face in disbelief",
    "celebrating": "both fists in the air, cheering",
    "waving": "waving hello with one hand",
    "walking": "walking mid-stride, side view",
    "running": "running fast, side view, leaning forward",
    "sitting": "sitting on the ground, legs crossed",
    "working": "bent over doing hard manual work",
    "eating": "eating, holding food near mouth",
}
MARKS = ["none", "check", "cross", "question", "exclamation", "arrow"]
CAMERAS = ["none", "zoom_in", "zoom_out", "shake"]
POSITIONS = ["left", "center", "right"]

STYLE = ("Simple hand-drawn doodle cartoon, like popular YouTube explainer animations: thick clean black "
         "outlines, flat soft colours, no gradients, no text")


# --------------------------------------------------------------------------
# 1. Plan (Gemini)
# --------------------------------------------------------------------------

PLAN_SYSTEM = """You write and storyboard narrated explainer videos for YouTube in \
a doodle-cartoon style.

Narration style: a calm, curious narrator who talks directly to the viewer as \
"you". Open with a surprising hook or mystery in the first 15 seconds, then \
promise the answer. Short, punchy sentences. Build the explanation step by \
step with concrete details, comparisons to the viewer's modern life, and small \
reveals ("But it's the opposite."). End with a thoughtful twist that ties back \
to the viewer. No headings, no lists: just the spoken words.

Storyboard: split the narration into shots. Each shot is one sentence or half \
a sentence (about 6 to 12 words, 2 to 4 seconds), with its own picture. \
The narration of all shots, read in order, is the full script.

Shot layouts:
- "scene": a background with characters (and maybe items). Use for action and story.
- "card": a plain white card with items and a short label, like "SHELL BEADS". \
Use for objects, numbers, facts and concepts.
- "split": a white card split down the middle, comparing left and right \
(e.g. YOU vs HIM, before vs after, a check vs a cross).

Rules:
- Characters only use poses from the allowed list.
- Keep the same short names for recurring characters, backgrounds and items, \
and describe each new one once under assets, so an artist can draw it.
- Labels are short (1 to 4 words), uppercase is fine. Leave the label empty \
when the picture speaks for itself.
- mark: draw a check, cross, question or exclamation mark, or an arrow, when \
it helps (e.g. a cross over something that didn't exist).
- camera: occasional "zoom_in" for emphasis, "shake" for shock; mostly "none".
- Vary the shots: mix scenes, cards and splits like a real explainer.
- Also give YouTube metadata and a thumbnail idea (one character pose on a \
background, with 1 to 3 words of text)."""

SIDE = {
    "type": "object",
    "properties": {
        "character": {"type": "string"},
        "pose": {"type": "string", "enum": list(POSES)},
        "item": {"type": "string"},
        "label": {"type": "string"},
        "mark": {"type": "string", "enum": MARKS},
    },
    "required": ["character", "pose", "item", "label", "mark"],
    "additionalProperties": False,
}

PLAN_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "cast": {"type": "array", "items": {
            "type": "object",
            "properties": {"name": {"type": "string"}, "description": {"type": "string"}},
            "required": ["name", "description"], "additionalProperties": False}},
        "assets": {
            "type": "object",
            "properties": {
                "backgrounds": {"type": "array", "items": {
                    "type": "object",
                    "properties": {"name": {"type": "string"}, "description": {"type": "string"}},
                    "required": ["name", "description"], "additionalProperties": False}},
                "items": {"type": "array", "items": {
                    "type": "object",
                    "properties": {"name": {"type": "string"}, "description": {"type": "string"}},
                    "required": ["name", "description"], "additionalProperties": False}},
            },
            "required": ["backgrounds", "items"],
            "additionalProperties": False,
        },
        "shots": {"type": "array", "items": {
            "type": "object",
            "properties": {
                "narration": {"type": "string"},
                "layout": {"type": "string", "enum": ["scene", "card", "split"]},
                "background": {"type": "string"},
                "characters": {"type": "array", "items": {
                    "type": "object",
                    "properties": {"name": {"type": "string"},
                                   "pose": {"type": "string", "enum": list(POSES)},
                                   "position": {"type": "string", "enum": POSITIONS}},
                    "required": ["name", "pose", "position"], "additionalProperties": False}},
                "items": {"type": "array", "items": {
                    "type": "object",
                    "properties": {"name": {"type": "string"},
                                   "position": {"type": "string", "enum": POSITIONS}},
                    "required": ["name", "position"], "additionalProperties": False}},
                "label": {"type": "string"},
                "mark": {"type": "string", "enum": MARKS},
                "camera": {"type": "string", "enum": CAMERAS},
                "left": SIDE,
                "right": SIDE,
            },
            "required": ["narration", "layout", "background", "characters", "items", "label", "mark",
                         "camera", "left", "right"],
            "additionalProperties": False}},
        "youtube": {
            "type": "object",
            "properties": {"titles": {"type": "array", "items": {"type": "string"}},
                           "description": {"type": "string"},
                           "tags": {"type": "array", "items": {"type": "string"}}},
            "required": ["titles", "description", "tags"], "additionalProperties": False},
        "thumbnail": {
            "type": "object",
            "properties": {"background": {"type": "string"}, "character": {"type": "string"},
                           "pose": {"type": "string", "enum": list(POSES)}, "text": {"type": "string"}},
            "required": ["background", "character", "pose", "text"], "additionalProperties": False},
    },
    "required": ["title", "cast", "assets", "shots", "youtube", "thumbnail"],
    "additionalProperties": False,
}


def library_listing(lib):
    def names(folder):
        return sorted(p.stem for p in folder.iterdir() if p.suffix.lower() in IMAGE_EXTS) if folder.is_dir() else []
    chars = {}
    if (lib / "characters").is_dir():
        for d in sorted(p for p in (lib / "characters").iterdir() if p.is_dir()):
            chars[d.name] = names(d)
    return chars, names(lib / "backgrounds"), names(lib / "items")


def ask_gemini(prompt, model):
    import time
    from google import genai
    from google.genai import errors, types

    client = genai.Client()  # keep a reference: a collected client closes its connection
    for attempt in range(6):
        try:
            response = client.models.generate_content(
                model=model, contents=[prompt],
                config=types.GenerateContentConfig(system_instruction=PLAN_SYSTEM,
                                                   response_mime_type="application/json",
                                                   response_json_schema=PLAN_SCHEMA,
                                                   max_output_tokens=65000))
            break
        except errors.APIError as e:
            daily = e.code == 429 and "PerDay" in str(e)
            if e.code not in (429, 500, 503) or daily or attempt == 5:
                raise SystemExit(f"Gemini error: {'daily free limit used up, try tomorrow' if daily else e}")
            wait = 60 * (attempt + 1)
            print(f"  Gemini busy ({e.code}), waiting {wait}s...", flush=True)
            time.sleep(wait)
    if not response.text:
        raise SystemExit("Gemini returned no plan. Try rewording the topic.")
    return json.loads(response.text)


def cmd_plan(args):
    if not (os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")):
        raise SystemExit("GEMINI_API_KEY is not set. See README.md.")
    chars, bgs, items = library_listing(args.library)
    n = round(args.minutes * SHOTS_PER_MINUTE)
    if args.script:
        text = args.script.read_text(encoding="utf-8")
        prompt = ("Storyboard this script. Use its words exactly as the narration (don't rewrite it), "
                  f"split into shots.\n\nSCRIPT:\n{text}\n")
    else:
        prompt = (f"Topic: {args.topic}\n\nWrite a video of about {args.minutes:g} minutes, about {n} shots "
                  f"(roughly {round(args.minutes * 140)} words of narration).\n")
    if args.style:
        prompt += f"\nExtra instructions from the channel owner: {args.style}\n"
    prompt += f"\nAllowed poses: {', '.join(POSES)}\n"
    if chars:
        prompt += "\nCharacters already in the library (reuse when they fit):\n" + "\n".join(
            f"- {c}" for c in chars) + "\n"
    if bgs:
        prompt += "\nBackgrounds already in the library (prefer these names):\n" + ", ".join(bgs) + "\n"
    if items:
        prompt += "\nItems already in the library (prefer these names):\n" + ", ".join(items) + "\n"

    print("Planning the video with Gemini (this can take a minute)...", flush=True)
    plan = clean_plan(ask_gemini(prompt, args.gemini_model))
    args.output.write_text(json.dumps(plan, indent=2, ensure_ascii=False), encoding="utf-8")
    words = sum(len(s["narration"].split()) for s in plan["shots"])
    print(f"Saved {args.output}: \"{plan['title']}\", {len(plan['shots'])} shots, {words} words "
          f"(about {words / 150:.1f} minutes).\n")
    todo = checklist(plan, args.library)
    path = args.output.with_name(args.output.stem + "_checklist.txt")
    path.write_text(todo, encoding="utf-8")
    print(todo)
    print(f"(Saved to {path}.) Add the missing art to {args.library}/, then run:\n"
          f"  python explainer.py render {args.output}")


def clean_plan(plan):
    """Repair small model mistakes so rendering never crashes."""
    for shot in plan["shots"]:
        shot.setdefault("layout", "scene")
        if shot["layout"] not in ("scene", "card", "split"):
            shot["layout"] = "scene"
        for c in shot.get("characters", []):
            if c.get("pose") not in POSES:
                c["pose"] = "idle"
            if c.get("position") not in POSITIONS:
                c["position"] = "center"
        for it in shot.get("items", []):
            if it.get("position") not in POSITIONS:
                it["position"] = "center"
        if shot.get("mark") not in MARKS:
            shot["mark"] = "none"
        if shot.get("camera") not in CAMERAS:
            shot["camera"] = "none"
        for side in ("left", "right"):
            s = shot.setdefault(side, {})
            for k, v in (("character", ""), ("item", ""), ("label", ""), ("mark", "none"), ("pose", "idle")):
                s.setdefault(k, v)
            if s["pose"] not in POSES:
                s["pose"] = "idle"
            if s["mark"] not in MARKS:
                s["mark"] = "none"
        shot.setdefault("label", "")
        shot.setdefault("background", "")
        shot.setdefault("characters", [])
        shot.setdefault("items", [])
    plan.setdefault("cast", [])
    plan.setdefault("assets", {"backgrounds": [], "items": []})
    return plan


def needed_assets(plan):
    poses, bgs, items = {}, set(), set()
    for shot in plan["shots"]:
        if shot["layout"] == "scene" and shot["background"]:
            bgs.add(shot["background"])
        for c in shot["characters"]:
            poses.setdefault(c["name"], set()).add(c["pose"])
        for it in shot["items"]:
            items.add(it["name"])
        if shot["layout"] == "split":
            for side in (shot["left"], shot["right"]):
                if side["character"]:
                    poses.setdefault(side["character"], set()).add(side["pose"])
                if side["item"]:
                    items.add(side["item"])
    t = plan.get("thumbnail", {})
    if t.get("character"):
        poses.setdefault(t["character"], set()).add(t.get("pose", "idle"))
    if t.get("background"):
        bgs.add(t["background"])
    return poses, bgs, items


def checklist(plan, lib):
    chars, have_bgs, have_items = library_listing(lib)
    poses, bgs, items = needed_assets(plan)
    desc = {c["name"]: c["description"] for c in plan.get("cast", [])}
    bg_desc = {b["name"]: b["description"] for b in plan["assets"].get("backgrounds", [])}
    item_desc = {i["name"]: i["description"] for i in plan["assets"].get("items", [])}
    out = [f"# {plan['title']}", "",
           "Art style for every image (paste at the start of each prompt):", f"  {STYLE}.", "",
           "Tip: make each character's idle.png first, then give it to your image tool as a reference",
           "for every other pose, so the character looks the same in all of them.", ""]
    missing = 0
    out.append(f"## Characters  ->  {lib}/characters/<name>/<pose>.png  (plain white or transparent background)")
    for name in sorted(poses):
        have = set(chars.get(name, []))
        todo = sorted(p for p in poses[name] if p not in have)
        out.append(f"\n{name}: {desc.get(name, '')}")
        out.append(f"  have: {', '.join(sorted(have & poses[name])) or 'none'}")
        for p in todo:
            missing += 1
            out.append(f"  [ ] {p}.png  ->  prompt: {STYLE}. Full body of {desc.get(name, name)}, {POSES[p]}, "
                       "centred, plain pure white background, no shadow.")
    out.append(f"\n## Backgrounds  ->  {lib}/backgrounds/<name>.png  (16:9, no people)")
    for b in sorted(bgs):
        if find_asset(lib / "backgrounds", b):
            out.append(f"  [x] {b}")
        else:
            missing += 1
            out.append(f"  [ ] {b}.png  ->  prompt: {STYLE}. Wide 16:9 scene of {bg_desc.get(b, b)}. No people, "
                       "no text, open ground in the lower middle.")
    out.append(f"\n## Items  ->  {lib}/items/<name>.png  (one object, plain white or transparent background)")
    for i in sorted(items):
        if find_asset(lib / "items", i):
            out.append(f"  [x] {i}")
        else:
            missing += 1
            out.append(f"  [ ] {i}.png  ->  prompt: {STYLE}. {item_desc.get(i, i)}, on its own, centred, "
                       "plain pure white background, no shadow, no text.")
    out.insert(1, f"{missing} images still to make. Placeholders are used for anything missing.\n")
    return "\n".join(out) + "\n"


# --------------------------------------------------------------------------
# 2. Library art (and placeholders)
# --------------------------------------------------------------------------

def key(name):
    return re.sub(r"[^a-z0-9]", "", name.lower())


def loose_key(name):
    """Name for matching: lowercase letters only, ignoring copy suffixes like "(1)" or "_2"."""
    name = re.sub(r"[\s_-]*(\(\d+\)|copy|\d+)$", "", name.strip().lower())
    return re.sub(r"[^a-z]", "", name)


def find_asset(folder, name):
    if not folder.is_dir():
        return None
    files = [p for p in folder.iterdir() if p.suffix.lower() in IMAGE_EXTS]
    want = key(name)
    for p in files:
        if key(p.stem) == want:
            return p
    for p in files:  # forgiving: "Campfire (1).png", "campfire_2.png", "Camp Fire.png"
        if loose_key(p.stem) == loose_key(name):
            return p
    return None


def diagnose_library(lib, missing):
    """Explain why images weren't found: unmatched files, wrong folders, near-miss names."""
    import difflib

    lines = []
    if not lib.is_dir():
        return [f"The library folder doesn't exist: {lib.resolve()}",
                "Put your images in the 'library' folder next to explainer.py (or pass --library <folder>)."]
    for sub in ("characters", "backgrounds", "items"):
        if not (lib / sub).is_dir():
            lines.append(f"Missing folder: {(lib / sub).resolve()}")
    loose = [p for p in (lib / "characters").iterdir() if p.suffix.lower() in IMAGE_EXTS] \
        if (lib / "characters").is_dir() else []
    if loose:
        lines.append(f"{len(loose)} images are loose in characters/ (e.g. {loose[0].name}). Poses must be inside a "
                     "folder named after the character, e.g. characters/caveman/idle.png")
    for m in sorted(missing):
        folder = (lib / m).parent
        want = Path(m).stem
        if not folder.is_dir():
            others = [p.name for p in folder.parent.iterdir() if p.is_dir()] if folder.parent.is_dir() else []
            close = difflib.get_close_matches(folder.name, others, n=1, cutoff=0.4)
            hint = f" Did you mean to name your folder '{folder.name}'? You have '{close[0]}'." if close else ""
            lines.append(f"No folder {folder.relative_to(lib)}/ for {m}.{hint}")
            continue
        names = [p.stem for p in folder.iterdir() if p.suffix.lower() in IMAGE_EXTS]
        close = difflib.get_close_matches(want, names, n=1, cutoff=0.5)
        if close:
            lines.append(f"{m}: not found, but there's '{close[0]}' - rename it to '{want}'")
        else:
            lines.append(f"{m}: not found (that folder has: {', '.join(sorted(names)[:8]) or 'nothing'})")
    return lines


def remove_flat_background(img):
    """Clear a plain background (white, green screen...) connected to the image edge."""
    img = img.convert("RGBA")
    a = np.asarray(img).astype(np.int16)
    if a[..., 3].min() < 250:
        return img
    corners = np.array([a[0, 0, :3], a[0, -1, :3], a[-1, 0, :3], a[-1, -1, :3]])
    bg = np.median(corners, axis=0)
    diff = np.abs(a[..., :3] - bg).sum(axis=2)
    close = diff < 60
    h, w = close.shape
    seen = np.zeros_like(close)
    q = deque((y, x) for y in (0, h - 1) for x in range(0, w, 3) if close[y, x])
    q.extend((y, x) for x in (0, w - 1) for y in range(0, h, 3) if close[y, x])
    for y, x in q:
        seen[y, x] = True
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and close[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    out = np.asarray(img).copy()
    out[seen, 3] = 0
    return Image.fromarray(out)


def name_color(name):
    hue = int(hashlib.md5(name.encode()).hexdigest(), 16) % 360 / 360
    r, g, b = colorsys.hls_to_rgb(hue, 0.45, 0.5)
    return int(r * 255), int(g * 255), int(b * 255)


def hand(size):
    return ImageFont.truetype(HAND_FONT, size)


# Arm/leg angles (degrees from straight down; positive = outward) for placeholder figures.
PLACEHOLDER_LIMBS = {
    "excited": (150, 150, 20), "celebrating": (160, 160, 15), "waving": (20, 150, 15),
    "pointing": (20, 95, 15), "shrug": (60, 60, 12), "talking": (20, 70, 12),
    "proud": (40, 40, 18), "scared": (110, 110, 25), "shocked": (130, 130, 15),
    "walking": (35, 35, 30), "running": (70, 70, 45), "exhausted": (15, 15, 25),
    "confused": (20, 150, 12), "thinking": (20, 120, 12), "facepalm": (20, 135, 12),
}


def placeholder_character(name, pose):
    """A doodle stick figure so a plan can be previewed before the art exists."""
    s = 2
    w, h = 420 * s, 760 * s
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = w // 2
    lw = 9 * s
    if pose in ("sleeping", "relaxed", "sitting"):
        y = 600 * s if pose != "sitting" else 470 * s
        d.line([cx - 190 * s, y, cx + 60 * s, y], fill=INK, width=lw)
        d.ellipse([cx + 50 * s, y - 120 * s, cx + 180 * s, y + 10 * s], fill="white", outline=INK, width=lw)
        d.text((cx, y + 90 * s), name, font=hand(46 * s), fill=name_color(name), anchor="mm")
        return img.resize((w // s, h // s), Image.LANCZOS)
    arm_l, arm_r, leg = PLACEHOLDER_LIMBS.get(pose, (18, 18, 14))
    head_c, head_r = (cx, 150 * s), 105 * s
    neck, hip = (cx, 255 * s), (cx, 500 * s)
    d.line([neck, hip], fill=INK, width=lw)
    for side, ang in ((-1, arm_l), (1, arm_r)):
        r = math.radians(ang)
        d.line([(cx, 300 * s), (cx + side * 170 * s * math.sin(r), 300 * s + 170 * s * math.cos(r))],
               fill=INK, width=lw)
    for side in (-1, 1):
        r = math.radians(leg)
        d.line([hip, (cx + side * 230 * s * math.sin(r), 500 * s + 230 * s * math.cos(r))], fill=INK, width=lw)
    d.ellipse([head_c[0] - head_r, head_c[1] - head_r, head_c[0] + head_r, head_c[1] + head_r],
              fill="white", outline=INK, width=lw)
    d.chord([head_c[0] - head_r - 6 * s, head_c[1] - head_r - 12 * s, head_c[0] + head_r + 6 * s,
             head_c[1] + 20 * s], 180, 360, fill=name_color(name))
    ex = (head_c[0] - 35 * s, head_c[0] + 35 * s)
    ey = head_c[1] + 15 * s
    for x in ex:
        r = 14 * s if pose in ("shocked", "scared", "excited") else 9 * s
        d.ellipse([x - r, ey - r, x + r, ey + r], fill=INK)
    my = head_c[1] + 60 * s
    if pose in ("happy", "laughing", "excited", "celebrating", "proud", "relaxed", "waving"):
        d.arc([head_c[0] - 40 * s, my - 35 * s, head_c[0] + 40 * s, my + 15 * s], 20, 160, fill=INK, width=6 * s)
    elif pose in ("sad", "crying", "angry", "tired", "exhausted", "sick"):
        d.arc([head_c[0] - 35 * s, my - 5 * s, head_c[0] + 35 * s, my + 35 * s], 200, 340, fill=INK, width=6 * s)
    elif pose in ("shocked", "scared"):
        d.ellipse([head_c[0] - 16 * s, my - 18 * s, head_c[0] + 16 * s, my + 18 * s], fill=INK)
    else:
        d.line([head_c[0] - 22 * s, my, head_c[0] + 22 * s, my], fill=INK, width=6 * s)
    d.text((cx, 735 * s), f"{name}: {pose}", font=hand(38 * s), fill=name_color(name), anchor="mb")
    return img.resize((w // s, h // s), Image.LANCZOS)


def placeholder_item(name):
    img = Image.new("RGBA", (420, 300), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = name_color(name)
    d.rounded_rectangle([20, 20, 400, 280], 40, fill=tuple(min(255, v + 90) for v in c) + (255,), outline=INK, width=7)
    d.text((210, 150), name.replace("_", " "), font=hand(52), fill=INK, anchor="mm")
    return img


def placeholder_background(name):
    base = name_color(name + "bg")
    sky = tuple(min(255, v + 120) for v in base)
    ground = tuple(min(255, v + 40) for v in base)
    img = Image.new("RGB", (W, H), sky)
    d = ImageDraw.Draw(img)
    d.rectangle([0, int(H * 0.58), W, H], fill=ground)
    d.line([0, int(H * 0.58), W, int(H * 0.58)], fill=INK, width=4)
    d.text((W // 2, 70), name.replace("_", " ").upper(), font=hand(54), fill=INK, anchor="mm")
    return img


class Library:
    def __init__(self, lib):
        self.lib = lib
        self.cache = {}
        self.missing = set()
        self.placeholders = set()  # never mirror these: their name tags would read backwards

    def character(self, name, pose):
        k = ("c", name, pose)
        if k not in self.cache:
            folder = self.lib / "characters" / name
            path = find_asset(folder, pose) or find_asset(folder, "idle")
            if path:
                img = remove_flat_background(Image.open(path))
                bbox = img.getchannel("A").getbbox()
                img = img.crop(bbox) if bbox else img
            else:
                self.missing.add(f"characters/{name}/{pose}.png")
                img = placeholder_character(name, pose)
                self.placeholders.add(id(img))
            self.cache[k] = img
        return self.cache[k]

    def item(self, name):
        k = ("i", name)
        if k not in self.cache:
            path = find_asset(self.lib / "items", name)
            if path:
                img = remove_flat_background(Image.open(path))
                bbox = img.getchannel("A").getbbox()
                img = img.crop(bbox) if bbox else img
            else:
                self.missing.add(f"items/{name}.png")
                img = placeholder_item(name)
            self.cache[k] = img
        return self.cache[k]

    def background(self, name):
        k = ("b", name)
        if k not in self.cache:
            path = find_asset(self.lib / "backgrounds", name)
            if path:
                img = Image.open(path).convert("RGB")
                s = max(W / img.width, H / img.height)
                img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
                x, y = (img.width - W) // 2, (img.height - H) // 2
                img = img.crop((x, y, x + W, y + H))
            else:
                self.missing.add(f"backgrounds/{name}.png")
                img = placeholder_background(name)
            self.cache[k] = img.convert("RGBA")
        return self.cache[k]

    def scaled(self, img, height):
        k = ("s", id(img), height)
        if k not in self.cache:
            self.cache[k] = img.resize((max(1, round(img.width * height / img.height)), height), Image.LANCZOS)
        return self.cache[k]


# --------------------------------------------------------------------------
# 3. Voice
# --------------------------------------------------------------------------

async def voice_shots(shots, audio_dir, voice, rate):
    import edge_tts

    audio_dir.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(4)
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")

    async def one(shot):
        text = re.sub(r"\s+", " ", shot["narration"]).strip()
        k = hashlib.sha1(json.dumps([voice, rate, text]).encode()).hexdigest()[:16]
        mp3 = audio_dir / f"{k}.mp3"
        shot["_audio"] = mp3
        if mp3.exists() and mp3.stat().st_size:
            return
        if not re.search(r"[A-Za-z0-9]", text):
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
                            "-t", "1.0", str(mp3)], check=True)
            return
        async with sem:
            await edge_tts.Communicate(text, voice, rate=rate, proxy=proxy).save(str(mp3))

    await asyncio.gather(*(one(s) for s in shots))


def probe_duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def build_audio(shots, work):
    """Join shot audio with small pauses; returns per-shot durations and the WAV path."""
    parts, durs = [], []
    for i, shot in enumerate(shots):
        total = max(probe_duration(shot["_audio"]) + SHOT_GAP, MIN_SHOT)
        dst = work / "audio" / f"shot{i:04d}.wav"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(shot["_audio"]), "-af",
                        f"apad=whole_dur={total:.3f}", "-ar", "44100", "-ac", "2", str(dst)], check=True)
        parts.append(dst)
        durs.append(probe_duration(dst))
    lst = work / "audio" / "concat.txt"
    lst.write_text("".join(f"file '{p.resolve().as_posix()}'\n" for p in parts))
    out = work / "narration.wav"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy",
                    str(out)], check=True)
    return durs, out


# --------------------------------------------------------------------------
# 4. Drawing and animation
# --------------------------------------------------------------------------

def ease_out_back(t):
    """0 -> 1 with a small overshoot: the 'pop' feel."""
    t = min(max(t, 0.0), 1.0)
    c = 1.7
    return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2


def paste(frame, img, cx, bottom, scale=1.0, alpha=1.0):
    if scale <= 0.02 or alpha <= 0.02:
        return
    if scale != 1.0:
        img = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.BILINEAR)
    if alpha < 1.0:
        a = img.getchannel("A").point(lambda v: int(v * alpha))
        img = img.copy()
        img.putalpha(a)
    frame.alpha_composite(img, (int(cx - img.width / 2), int(bottom - img.height)))


def draw_label(frame, text, cx, cy, size, t, start=0.1):
    if not text:
        return
    k = ease_out_back((t - start) / 0.3)
    if k <= 0:
        return
    f = hand(max(8, int(size * (0.6 + 0.4 * k))))
    d = ImageDraw.Draw(frame)
    d.text((cx, cy), text, font=f, fill=INK, anchor="mm", stroke_width=max(2, size // 14), stroke_fill=(255, 255, 255))


def draw_mark(frame, mark, cx, cy, size, t, start=0.35):
    if mark == "none":
        return
    p = min(max((t - start) / 0.35, 0.0), 1.0)
    if p <= 0:
        return
    d = ImageDraw.Draw(frame)
    lw = max(6, size // 9)
    if mark == "cross":
        red = (220, 40, 40)
        a = min(1.0, p * 2)
        d.line([cx - size / 2, cy - size / 2, cx - size / 2 + size * a, cy - size / 2 + size * a], fill=red, width=lw)
        if p > 0.5:
            b = (p - 0.5) * 2
            d.line([cx + size / 2, cy - size / 2, cx + size / 2 - size * b, cy - size / 2 + size * b], fill=red, width=lw)
    elif mark == "check":
        green = (60, 170, 70)
        pts = [(cx - size * 0.45, cy), (cx - size * 0.1, cy + size * 0.38), (cx + size * 0.5, cy - size * 0.45)]
        if p < 0.4:
            q = p / 0.4
            d.line([pts[0], (pts[0][0] + (pts[1][0] - pts[0][0]) * q, pts[0][1] + (pts[1][1] - pts[0][1]) * q)],
                   fill=green, width=lw)
        else:
            q = (p - 0.4) / 0.6
            d.line([pts[0], pts[1], (pts[1][0] + (pts[2][0] - pts[1][0]) * q, pts[1][1] + (pts[2][1] - pts[1][1]) * q)],
                   fill=green, width=lw, joint="curve")
    elif mark in ("question", "exclamation"):
        k = ease_out_back(p)
        d.text((cx, cy), "?" if mark == "question" else "!", font=hand(max(8, int(size * 1.3 * k))), fill=INK,
               anchor="mm")
    elif mark == "arrow":
        x1 = cx - size + 2 * size * p
        d.line([cx - size, cy, x1, cy], fill=INK, width=lw)
        if p > 0.8:
            d.polygon([(x1 + lw, cy), (x1 - size * 0.3, cy - size * 0.25), (x1 - size * 0.3, cy + size * 0.25)], fill=INK)


X = {"left": 0.27, "center": 0.5, "right": 0.73}


def breathe(t, seed):
    """Subtle idle motion so still characters look alive."""
    return 1 + 0.012 * math.sin(2 * math.pi * (t / 2.4 + seed))


def render_shot(frame, shot, lib, t, prev, flip_right):
    layout = shot["layout"]
    continuing = prev is not None and prev["layout"] == layout == "scene" and prev["background"] == shot["background"]
    prev_names = {c["name"] for c in prev["characters"]} if continuing else set()

    if layout == "scene":
        frame.alpha_composite(lib.background(shot["background"] or "plain"))
        n_items = len(shot["items"])
        for i, it in enumerate(shot["items"]):
            img = lib.scaled(lib.item(it["name"]), int(H * 0.2))
            k = ease_out_back((t - 0.15 - 0.12 * i) / 0.3)
            paste(frame, img, W * X[it["position"]] + (60 if n_items > 1 and i % 2 else 0), H * 0.9, k)
        for i, c in enumerate(shot["characters"]):
            src = lib.character(c["name"], c["pose"])
            img = lib.scaled(src, int(H * (0.42 if c["pose"] in ("sleeping", "relaxed") else 0.6)))
            if flip_right and c["position"] == "right" and id(src) not in lib.placeholders:
                img = img.transpose(Image.FLIP_LEFT_RIGHT)
            enter = 1.0 if c["name"] in prev_names else ease_out_back(t / 0.28)
            sy = breathe(t, i * 0.37) * enter
            scaled = img.resize((img.width, max(1, round(img.height * sy))), Image.BILINEAR) if sy != 1 else img
            paste(frame, scaled, W * X[c["position"]], H * 0.93, 1.0, min(1.0, t / 0.12 + (c["name"] in prev_names)))
        if shot["label"]:
            draw_label(frame, shot["label"], W / 2, H * 0.11, 84, t)
        draw_mark(frame, shot["mark"], W * 0.82, H * 0.2, 150, t)
    elif layout == "card":
        frame.paste(PAPER + (255,), (0, 0, W, H))
        has_label = bool(shot["label"])
        cy = H * (0.6 if has_label else 0.5)
        things = [("i", it["name"]) for it in shot["items"]] + [("c", c["name"], c["pose"]) for c in shot["characters"]]
        n = max(1, len(things))
        size = int(H * (0.42 if n == 1 else 0.34 if n <= 3 else 0.24))
        gap = W * (0.22 if n <= 3 else 0.16)
        x0 = W / 2 - gap * (n - 1) / 2
        for i, th in enumerate(things):
            img = lib.item(th[1]) if th[0] == "i" else lib.character(th[1], th[2])
            img = lib.scaled(img, size)
            k = ease_out_back((t - 0.1 - 0.15 * i) / 0.3)
            paste(frame, img, x0 + gap * i, cy + size / 2, k)
        draw_label(frame, shot["label"], W / 2, H * 0.2, 96, t, start=0.0)
        draw_mark(frame, shot["mark"], W / 2, cy, int(size * 0.9), t)
    else:  # split
        frame.paste(PAPER + (255,), (0, 0, W, H))
        d = ImageDraw.Draw(frame)
        for y in range(40, H - 40, 46):
            d.line([W / 2, y, W / 2, y + 24], fill=INK, width=5)
        for side_i, (side, cx) in enumerate(((shot["left"], W * 0.25), (shot["right"], W * 0.75))):
            t2 = t - 0.25 * side_i
            label_y = H * 0.16
            draw_label(frame, side["label"], cx, label_y, 88, t2, start=0.0)
            pieces = []
            if side["character"]:
                pieces.append(lib.character(side["character"], side["pose"]))
            if side["item"]:
                pieces.append(lib.item(side["item"]))
            size = int(H * (0.55 if len(pieces) == 1 else 0.4))
            for j, img in enumerate(pieces):
                img = lib.scaled(img, size if j == 0 else int(size * 0.6))
                k = ease_out_back((t2 - 0.1 - 0.12 * j) / 0.3)
                off = (j - (len(pieces) - 1) / 2) * W * 0.17
                paste(frame, img, cx + off, H * 0.86, k)
            draw_mark(frame, side["mark"], cx + W * 0.13, H * 0.3, 110, t2)


def apply_camera(frame, camera, t, dur):
    if camera == "zoom_in":
        z = 1 + 0.08 * min(1.0, t / max(dur, 0.1))
    elif camera == "zoom_out":
        z = 1.08 - 0.08 * min(1.0, t / max(dur, 0.1))
    else:
        z = 1.0
    dx = dy = 0
    if camera == "shake" and t < 0.45:
        dx = round(14 * math.sin(t * 70))
        dy = round(8 * math.cos(t * 55))
    if z == 1.0 and dx == 0 and dy == 0:
        return frame
    cw, ch = W / z, H / z
    left = (W - cw) / 2 + dx
    top = (H - ch) / 2 + dy
    left = min(max(left, 0), W - cw)
    top = min(max(top, 0), H - ch)
    return frame.crop((round(left), round(top), round(left + cw), round(top + ch))).resize((W, H), Image.BILINEAR)


def render_video(plan, durs, audio, out_path, lib, fps, music, music_volume, flip_right):
    cmd = ["ffmpeg", "-y", "-v", "error", "-stats", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(fps), "-i", "-", "-i", str(audio)]
    if music:
        cmd += ["-stream_loop", "-1", "-i", str(music), "-filter_complex",
                f"[2:a]volume={music_volume}[m];[1:a][m]amix=inputs=2:duration=first:normalize=0[a]",
                "-map", "0:v", "-map", "[a]"]
    else:
        cmd += ["-map", "0:v", "-map", "1:a"]
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac",
            "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(out_path)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    elapsed, written = 0.0, 0
    try:
        for i, (shot, dur) in enumerate(zip(plan["shots"], durs)):
            prev = plan["shots"][i - 1] if i else None
            elapsed += dur
            n = round(elapsed * fps) - written
            for f in range(n):
                t = f / fps
                frame = Image.new("RGBA", (W, H), PAPER + (255,))
                render_shot(frame, shot, lib, t, prev, flip_right)
                frame = apply_camera(frame, shot["camera"], t, dur)
                proc.stdin.write(frame.convert("RGB").tobytes())
            written += n
    finally:
        proc.stdin.close()
        proc.wait()
    if proc.returncode != 0:
        raise SystemExit("ffmpeg failed while encoding the video")


def make_thumbnail(plan, lib, path):
    t = plan.get("thumbnail") or {}
    frame = Image.new("RGBA", (W, H))
    frame.alpha_composite(lib.background(t.get("background") or "plain"))
    if t.get("character"):
        img = lib.scaled(lib.character(t["character"], t.get("pose", "shocked")), int(H * 0.85))
        paste(frame, img, W * 0.68, H * 1.02)
    text = (t.get("text") or "").upper()
    if text:
        d = ImageDraw.Draw(frame)
        size = 230 if len(text) <= 10 else 170
        y = H * 0.3
        for line in text.split("\n") if "\n" in text else [text]:
            d.text((W * 0.3, y), line, font=hand(size), fill=(255, 255, 255), anchor="mm",
                   stroke_width=16, stroke_fill=INK)
            y += size
    frame.convert("RGB").resize((1280, 720), Image.LANCZOS).save(path, quality=93)


def youtube_text(plan, durs):
    y = plan.get("youtube", {})
    lines = ["TITLE (pick one)", "================"] + [f"{i + 1}. {t}" for i, t in enumerate(y.get("titles", []))]
    lines += ["", "DESCRIPTION", "===========", y.get("description", "").strip(), "",
              "TAGS", "====", ", ".join(y.get("tags", []))]
    total = sum(durs)
    lines += ["", f"Video length: {int(total // 60)}:{int(total % 60):02d}"]
    return "\n".join(lines) + "\n"


def cmd_render(args):
    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            raise SystemExit(f"{tool} not found. Install ffmpeg and make sure it is on your PATH.")
    plan = clean_plan(json.loads(args.plan.read_text(encoding="utf-8")))
    out = args.output or args.plan.with_suffix(".mp4")
    work = out.with_name(out.stem + "_work")
    (work / "audio").mkdir(parents=True, exist_ok=True)

    print(f"Voicing {len(plan['shots'])} shots...", flush=True)
    asyncio.run(voice_shots(plan["shots"], work / "audio", args.voice, args.rate))
    durs, audio = build_audio(plan["shots"], work)
    total = sum(durs)
    print(f"  Length: {int(total // 60)}:{int(total % 60):02d}")

    lib = Library(args.library)
    print(f"Rendering {out}...", flush=True)
    render_video(plan, durs, audio, out, lib, args.fps, args.music, args.music_volume, not args.no_flip)
    thumb = out.with_name(out.stem + "_thumbnail.jpg")
    make_thumbnail(plan, lib, thumb)
    info = out.with_name(out.stem + "_youtube.txt")
    info.write_text(youtube_text(plan, durs), encoding="utf-8")
    print(f"Done: {out}\n      {thumb}\n      {info}")
    if lib.missing:
        print(f"\nPlaceholders were used for {len(lib.missing)} images that weren't found in "
              f"{args.library.resolve()}:")
        for line in diagnose_library(args.library, lib.missing)[:40]:
            print(f"  - {line}")
        print("Fix the names or folders above and render again. For prompts for missing art, run:\n"
              f"  python explainer.py checklist {args.plan}")


def cmd_checklist(args):
    plan = clean_plan(json.loads(args.plan.read_text(encoding="utf-8")))
    print(checklist(plan, args.library))


def main():
    ap = argparse.ArgumentParser(description="Make doodle-style explainer videos from a topic and an art library.")
    sub = ap.add_subparsers(dest="command", required=True)

    p = sub.add_parser("plan", help="write the script and storyboard with Gemini")
    p.add_argument("topic", nargs="?", default="", help='e.g. "what did ancient humans do all day"')
    p.add_argument("-o", "--output", type=Path, default=Path("video.json"))
    p.add_argument("--script", type=Path, help="use your own script (text file) instead of a topic")
    p.add_argument("--minutes", type=float, default=10)
    p.add_argument("--style", default="", help='extra instructions, e.g. "funnier, more modern comparisons"')
    p.add_argument("--gemini-model", default=GEMINI_MODEL)

    r = sub.add_parser("render", help="voice the plan and render the video, thumbnail and YouTube text")
    r.add_argument("plan", type=Path)
    r.add_argument("-o", "--output", type=Path)
    r.add_argument("--voice", default="en-US-AndrewNeural", help="edge-tts voice (edge-tts --list-voices)")
    r.add_argument("--rate", default="-2%", help="speech speed, e.g. +0%%")
    r.add_argument("--fps", type=int, default=FPS)
    r.add_argument("--music", type=Path, help="background music, looped")
    r.add_argument("--music-volume", type=float, default=0.08)
    r.add_argument("--no-flip", action="store_true", help="don't mirror characters standing on the right")

    c = sub.add_parser("checklist", help="list the library art a plan still needs, with image prompts")
    c.add_argument("plan", type=Path)

    for s in (p, r, c):
        s.add_argument("--library", type=Path, default=HERE / "library")
    args = ap.parse_args()
    if args.command == "plan" and not (args.topic or args.script):
        ap.error("give a topic, or --script yourscript.txt")
    {"plan": cmd_plan, "render": cmd_render, "checklist": cmd_checklist}[args.command](args)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
