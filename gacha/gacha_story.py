#!/usr/bin/env python3
"""Make Gacha Life / Gacha Club style story videos (GLMMs) from a one-line idea.

Two steps:

  1. write   - an AI turns your idea into a script: cast, scenes, dialogue,
               expressions and effects. It also prints a checklist of the
               character poses and backgrounds to make.
  2. render  - every line is voiced (a different free Microsoft voice per
               character), then the video is built to match: characters on a
               background, a dialogue box that types out in sync with the
               voice, and jumps, shakes and zooms for drama.

Usage:
  python gacha_story.py write "a shy girl finds out her crush is a vampire" -o story.json
  python gacha_story.py render story.json -o story.mp4

Characters come from Gacha Club: characters/<Name>/<expression>.png
(neutral.png, happy.png, sad.png, ...). Backgrounds: backgrounds/<name>.png.
Anything missing is drawn as a placeholder so you can preview before
making the art.
"""

import argparse
import asyncio
import colorsys
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1920, 1080
EXPRESSIONS = ["neutral", "happy", "sad", "angry", "shocked", "smug", "crying", "blush"]
EFFECTS = ["none", "jump", "shake", "zoom"]
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}

CLAUDE_MODEL = "claude-opus-5-5"
GEMINI_MODEL = "gemini-2.5-flash"

LINE_GAP = 0.35        # silence after each line (seconds)
SCENE_GAP = 0.8        # extra pause and fade between scenes
TITLE_SECONDS = 3.0
SPRITE_HEIGHT = 820    # on-screen height of a character
GROUND_Y = H - 90      # where characters' feet sit (the text box covers the legs)

FONT_DIR = Path("/usr/share/fonts/opentype/inter")
NARRATOR = "Narrator"


# --------------------------------------------------------------------------
# Fonts
# --------------------------------------------------------------------------

def find_font(*names):
    """Return the first font file that exists from a list of candidates."""
    candidates = []
    for name in names:
        candidates += [FONT_DIR / name, Path("C:/Windows/Fonts") / name, Path("/Library/Fonts") / name,
                       Path("/System/Library/Fonts/Supplemental") / name]
    for c in candidates:
        if c.exists():
            return str(c)
    return None


FONT_BOLD = find_font("Inter-Bold.otf", "arialbd.ttf", "Arial Bold.ttf")
FONT_BLACK = find_font("InterDisplay-Black.otf", "ariblk.ttf", "Arial Black.ttf")
FONT_TEXT = find_font("Inter-SemiBold.otf", "Inter-Medium.otf", "arial.ttf", "Arial.ttf")


def font(path, size):
    return ImageFont.truetype(path, size) if path else ImageFont.load_default(size)


# --------------------------------------------------------------------------
# 1. Idea -> script (Gemini or Claude)
# --------------------------------------------------------------------------

STORY_SYSTEM = """You write scripts for Gacha Life / Gacha Club mini movies \
(GLMMs) on YouTube.

These are dialogue-driven stories acted out by chibi characters standing on \
a background, with dialogue boxes at the bottom. Write in the style that \
works on the platform: a strong hook in the first lines, dramatic reveals, \
clear heroes and villains, relatable school, family, romance or fantasy \
drama, a twist near the end, and a satisfying or cliffhanger ending. Keep \
lines short and punchy (usually under 20 words), like real speech. Most of \
the story is told through dialogue; use the Narrator sparingly for time \
skips and scene setting.

Rules:
- Give every character a short look description someone could build in \
Gacha Club (hair, eyes, outfit, accessories).
- Each scene lists its cast in left-to-right stage order. Keep each scene to \
four characters or fewer. A line's speaker must be in that scene's cast, or \
"Narrator".
- Pick one expression per line from the allowed list, for the speaker. Use \
expressions generously; they carry the emotion.
- Effects are optional: "jump" for excitement or surprise, "shake" for \
anger or shock, "zoom" for a dramatic line or reveal. Most lines use "none".
- Backgrounds are short names like "school hallway" or "bedroom night". \
Reuse the same name for the same place."""

STORY_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "characters": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "gender": {"type": "string", "enum": ["female", "male"]},
                    "age": {"type": "string", "enum": ["child", "teen", "adult", "elder"]},
                    "look": {"type": "string"},
                },
                "required": ["name", "gender", "age", "look"],
                "additionalProperties": False,
            },
        },
        "scenes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "background": {"type": "string"},
                    "cast": {"type": "array", "items": {"type": "string"}},
                    "lines": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "speaker": {"type": "string"},
                                "text": {"type": "string"},
                                "expression": {"type": "string", "enum": EXPRESSIONS},
                                "effect": {"type": "string", "enum": EFFECTS},
                            },
                            "required": ["speaker", "text", "expression", "effect"],
                            "additionalProperties": False,
                        },
                    },
                },
                "required": ["background", "cast", "lines"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["title", "characters", "scenes"],
    "additionalProperties": False,
}

LENGTHS = {
    "short": "about 40 lines of dialogue in total (a 2-3 minute video)",
    "medium": "about 90 lines of dialogue in total (a 5-7 minute video)",
    "long": "about 180 lines of dialogue in total (a 10-15 minute video)",
}


def ask_gemini(system, prompt, model):
    from google import genai
    from google.genai import types

    # The client reads GEMINI_API_KEY (or GOOGLE_API_KEY). Keep a reference to it:
    # a client that gets garbage-collected closes its connection mid-call.
    client = genai.Client()
    response = client.models.generate_content(
        model=model,
        contents=[prompt],
        config=types.GenerateContentConfig(
            system_instruction=system,
            response_mime_type="application/json",
            response_json_schema=STORY_SCHEMA,
            max_output_tokens=60000,
        ),
    )
    if not response.text:
        reason = response.candidates[0].finish_reason if response.candidates else response.prompt_feedback
        raise SystemExit(f"Gemini returned no script ({reason}). Try rewording the idea.")
    return json.loads(response.text)


def ask_claude(system, prompt):
    import anthropic

    with anthropic.Anthropic().beta.messages.stream(
        model=CLAUDE_MODEL,
        max_tokens=64000,
        system=system,
        messages=[{"role": "user", "content": prompt}],
        output_config={"effort": "medium", "format": {"type": "json_schema", "schema": STORY_SCHEMA}},
        betas=["server-side-fallback-2026-07-01"],
        extra_body={"fallbacks": "default"},
    ) as stream:
        message = stream.get_final_message()
    if message.stop_reason == "refusal":
        raise SystemExit("Claude declined this idea. Try rewording it.")
    if message.stop_reason == "max_tokens":
        raise SystemExit("The script was cut off; try --length medium or short.")
    return json.loads("".join(b.text for b in message.content if b.type == "text"))


def existing_assets(char_dir, bg_dir):
    chars = {}
    if char_dir and char_dir.is_dir():
        for d in sorted(p for p in char_dir.iterdir() if p.is_dir()):
            chars[d.name] = sorted(p.stem.lower() for p in d.iterdir() if p.suffix.lower() in IMAGE_EXTS)
    bgs = []
    if bg_dir and bg_dir.is_dir():
        bgs = sorted(p.stem for p in bg_dir.iterdir() if p.suffix.lower() in IMAGE_EXTS)
    return chars, bgs


def write_story(idea, length, llm, gemini_model, char_dir, bg_dir, style):
    chars, bgs = existing_assets(char_dir, bg_dir)
    prompt = f"Story idea: {idea}\n\nLength: {LENGTHS[length]}.\n"
    if style:
        prompt += f"Style notes from the channel owner: {style}\n"
    if chars:
        listing = "\n".join(f"- {n} (poses: {', '.join(e) or 'none'})" for n, e in chars.items())
        prompt += ("\nThese characters are already made. Reuse them where they fit the story, with the "
                   f"same names, and only add new characters if the story needs them:\n{listing}\n")
    if bgs:
        prompt += ("\nThese backgrounds already exist. Prefer them, using the names exactly as written:\n"
                   + "\n".join(f"- {b}" for b in bgs) + "\n")

    print(f"Writing the story with {llm.title()}...", flush=True)
    story = ask_gemini(STORY_SYSTEM, prompt, gemini_model) if llm == "gemini" else ask_claude(STORY_SYSTEM, prompt)
    return clean_story(story)


def clean_story(story):
    """Fix the small mistakes models make: unknown speakers, cast mismatches, bad enums."""
    names = {c["name"] for c in story["characters"]}
    for scene in story["scenes"]:
        cast = [n for n in scene["cast"] if n in names]
        for line in scene["lines"]:
            if line["speaker"].lower() == NARRATOR.lower():
                line["speaker"] = NARRATOR
            elif line["speaker"] not in names:
                story["characters"].append({"name": line["speaker"], "gender": "female", "age": "teen", "look": ""})
                names.add(line["speaker"])
            if line["speaker"] != NARRATOR and line["speaker"] not in cast:
                cast.append(line["speaker"])
            if line.get("expression") not in EXPRESSIONS:
                line["expression"] = "neutral"
            if line.get("effect") not in EFFECTS:
                line["effect"] = "none"
        scene["cast"] = cast[:5]
    return story


def checklist(story, char_dir, bg_dir):
    """Text listing every pose and background the story uses, marking what already exists."""
    chars, bgs = existing_assets(char_dir, bg_dir)
    needed = {}
    for scene in story["scenes"]:
        for line in scene["lines"]:
            if line["speaker"] != NARRATOR:
                needed.setdefault(line["speaker"], set()).add(line["expression"])
        for name in scene["cast"]:
            needed.setdefault(name, set()).add("neutral")

    out = [f"# {story['title']}", "", "## Characters to make in Gacha Club", ""]
    out.append(f"Export each pose as a PNG into {char_dir}/<Name>/<pose>.png")
    out.append("(transparent or plain green-screen background; it's removed automatically).")
    out.append("")
    for c in story["characters"]:
        have = set(chars.get(c["name"], []))
        poses = sorted(needed.get(c["name"], {"neutral"}), key=EXPRESSIONS.index)
        marks = ", ".join(f"{p}{' (done)' if p in have else ''}" for p in poses)
        out.append(f"- {c['name']} ({c['age']} {c['gender']}): {c['look']}")
        out.append(f"    poses: {marks}")
    out += ["", "## Backgrounds", "", f"Save into {bg_dir}/<name>.png", ""]
    for bg in dict.fromkeys(s["background"] for s in story["scenes"]):
        out.append(f"- {bg}{' (done)' if resolve_background(bg, bg_dir) else ''}")
    return "\n".join(out) + "\n"


# --------------------------------------------------------------------------
# 2. Voices (edge-tts)
# --------------------------------------------------------------------------

VOICES = {
    ("female", "child"): [("en-US-AnaNeural", "+0Hz")],
    ("female", "teen"): [("en-US-AnaNeural", "-12Hz"), ("en-US-EmmaNeural", "+12Hz"), ("en-US-AvaNeural", "+14Hz"),
                         ("en-GB-MaisieNeural", "+0Hz"), ("en-US-AriaNeural", "+12Hz"), ("en-US-JennyNeural", "+14Hz")],
    ("female", "adult"): [("en-US-AvaNeural", "+0Hz"), ("en-US-JennyNeural", "+0Hz"), ("en-US-MichelleNeural", "+0Hz"),
                          ("en-GB-SoniaNeural", "+0Hz"), ("en-US-AriaNeural", "+0Hz"), ("en-GB-LibbyNeural", "+0Hz")],
    ("female", "elder"): [("en-GB-SoniaNeural", "-15Hz"), ("en-US-MichelleNeural", "-15Hz")],
    ("male", "child"): [("en-US-AnaNeural", "-25Hz")],
    ("male", "teen"): [("en-US-BrianNeural", "+10Hz"), ("en-US-RogerNeural", "+8Hz"), ("en-GB-RyanNeural", "+10Hz"),
                       ("en-US-AndrewNeural", "+12Hz"), ("en-US-EricNeural", "+10Hz")],
    ("male", "adult"): [("en-US-AndrewNeural", "+0Hz"), ("en-US-GuyNeural", "+0Hz"), ("en-US-ChristopherNeural", "+0Hz"),
                        ("en-GB-ThomasNeural", "+0Hz"), ("en-US-SteffanNeural", "+0Hz"), ("en-US-EricNeural", "+0Hz")],
    ("male", "elder"): [("en-US-ChristopherNeural", "-12Hz"), ("en-GB-ThomasNeural", "-12Hz")],
}
NARRATOR_VOICE = ("en-US-AndrewNeural", "-4Hz")


def assign_voices(story):
    """Give every character a voice, avoiding repeats within the same group where possible."""
    used = {}
    for c in story["characters"]:
        if c.get("voice"):
            continue
        pool = VOICES.get((c.get("gender", "female"), c.get("age", "teen")), VOICES[("female", "teen")])
        # Keep the narrator's voice for the narrator, unless it's the only option.
        pool = [v for v in pool if v[0] != NARRATOR_VOICE[0]] or pool
        i = used.get((c.get("gender"), c.get("age")), 0)
        c["voice"], c["pitch"] = pool[i % len(pool)]
        used[(c.get("gender"), c.get("age"))] = i + 1
    return {c["name"]: (c["voice"], c.get("pitch", "+0Hz")) for c in story["characters"]}


def speakable(text):
    """Drop stage directions like *gasps* and (whispers) from what gets read aloud."""
    spoken = re.sub(r"\*[^*]*\*|\([^)]*\)", " ", text)
    spoken = re.sub(r"\s+", " ", spoken).strip()
    # Lines like "..." or "?!" have nothing to say; the voice service rejects them.
    return spoken if re.search(r"[A-Za-z0-9]", spoken) else ""


async def voice_lines(lines, voices, audio_dir, rate):
    import edge_tts

    audio_dir.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(4)
    # edge-tts doesn't read proxy settings from the environment on its own.
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")

    async def one(line):
        voice, pitch = voices.get(line["speaker"], NARRATOR_VOICE)
        text = speakable(line["text"])
        key = hashlib.sha1(json.dumps([voice, pitch, rate, text]).encode()).hexdigest()[:16]
        mp3, words_path = audio_dir / f"{key}.mp3", audio_dir / f"{key}.json"
        line["_audio"], line["_words"] = mp3, words_path
        if mp3.exists() and words_path.exists():
            return
        words = []
        if text:
            async with sem:
                comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, proxy=proxy,
                                            boundary="WordBoundary")
                audio = bytearray()
                async for chunk in comm.stream():
                    if chunk["type"] == "audio":
                        audio += chunk["data"]
                    elif chunk["type"] == "WordBoundary":
                        words.append({"text": chunk["text"], "start": chunk["offset"] / 1e7})
            mp3.write_bytes(audio)
        else:  # nothing speakable, e.g. "..." - just hold the line silently
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
                            "-t", "1.2", str(mp3)], check=True)
        words_path.write_text(json.dumps(words), encoding="utf-8")

    await asyncio.gather(*(one(line) for line in lines))


def probe_duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def build_audio(timeline, work):
    """Lay every line's audio at its start time, return the full narration WAV path."""
    inputs, filters = [], []
    for i, item in enumerate(t for t in timeline if t["kind"] == "line"):
        inputs += ["-i", str(item["line"]["_audio"])]
        ms = round(item["start"] * 1000)
        filters.append(f"[{i}:a]aresample=44100,adelay={ms}|{ms}[a{i}]")
    n = len(filters)
    total = timeline[-1]["start"] + timeline[-1]["duration"]
    graph = ";".join(filters) + ";" + "".join(f"[a{i}]" for i in range(n)) + \
        f"amix=inputs={n}:normalize=0,apad=whole_dur={total:.3f}[out]"
    script = work / "mix.txt"
    script.write_text(graph)
    out = work / "dialogue.wav"
    subprocess.run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex_script", str(script),
                    "-map", "[out]", "-ac", "2", "-t", f"{total:.3f}", str(out)], check=True)
    return out


# --------------------------------------------------------------------------
# 3. Art: characters and backgrounds (with placeholders for anything missing)
# --------------------------------------------------------------------------

def remove_flat_background(img):
    """Make a Gacha Club export transparent if it isn't already.

    Takes the colour of the corners (green screen, white, any flat colour) and
    clears every pixel close to it that's connected to the edge.
    """
    img = img.convert("RGBA")
    a = np.asarray(img).astype(np.int16)
    if a[..., 3].min() < 250:  # already has transparency
        return img
    corners = np.array([a[0, 0, :3], a[0, -1, :3], a[-1, 0, :3], a[-1, -1, :3]])
    bg = np.median(corners, axis=0)
    close = (np.abs(a[..., :3] - bg).sum(axis=2) < 60)
    # Only clear background pixels reachable from the border, so matching colours
    # inside the character (a green shirt on a green screen) survive.
    from collections import deque
    h, w = close.shape
    seen = np.zeros_like(close)
    q = deque((y, x) for y in (0, h - 1) for x in range(0, w, 4) if close[y, x])
    q.extend((y, x) for x in (0, w - 1) for y in range(0, h, 4) if close[y, x])
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
    r, g, b = colorsys.hls_to_rgb(hue, 0.6, 0.75)
    return int(r * 255), int(g * 255), int(b * 255)


def placeholder_sprite(name, expression, look):
    """A simple chibi stand-in so stories can be previewed before the art exists."""
    s = 2  # draw at 2x and downscale for smooth edges
    w, h = 420 * s, 820 * s
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    hair = name_color(name)
    outfit = tuple(int(c * 0.55) for c in name_color(name[::-1] + "x"))
    skin = (255, 226, 204)
    cx = w // 2
    # legs, body, arms
    d.rounded_rectangle([cx - 60 * s, 600 * s, cx - 15 * s, 800 * s], 18 * s, fill=(70, 60, 80))
    d.rounded_rectangle([cx + 15 * s, 600 * s, cx + 60 * s, 800 * s], 18 * s, fill=(70, 60, 80))
    d.rounded_rectangle([cx - 110 * s, 390 * s, cx + 110 * s, 640 * s], 50 * s, fill=outfit)
    d.rounded_rectangle([cx - 150 * s, 410 * s, cx - 100 * s, 600 * s], 25 * s, fill=outfit)
    d.rounded_rectangle([cx + 100 * s, 410 * s, cx + 150 * s, 600 * s], 25 * s, fill=outfit)
    # head and hair
    d.ellipse([cx - 175 * s, 60 * s, cx + 175 * s, 410 * s], fill=hair)
    d.ellipse([cx - 150 * s, 110 * s, cx + 150 * s, 420 * s], fill=skin)
    d.pieslice([cx - 175 * s, 50 * s, cx + 175 * s, 330 * s], 180, 360, fill=hair)
    # face
    ey = 270 * s
    eye = (60, 40, 70)
    for ex in (cx - 65 * s, cx + 65 * s):
        if expression in ("happy", "smug"):
            d.arc([ex - 32 * s, ey - 20 * s, ex + 32 * s, ey + 30 * s], 200, 340, fill=eye, width=9 * s)
        elif expression == "shocked":
            d.ellipse([ex - 30 * s, ey - 38 * s, ex + 30 * s, ey + 38 * s], fill="white", outline=eye, width=6 * s)
            d.ellipse([ex - 10 * s, ey - 10 * s, ex + 10 * s, ey + 10 * s], fill=eye)
        else:
            d.ellipse([ex - 26 * s, ey - 34 * s, ex + 26 * s, ey + 34 * s], fill=eye)
            d.ellipse([ex - 12 * s, ey - 24 * s, ex + 4 * s, ey - 6 * s], fill="white")
        if expression == "angry":  # brows slant down toward the nose
            d.line([ex - 40 * s, ey - 70 * s, ex + 35 * s, ey - 45 * s] if ex < cx else
                   [ex - 35 * s, ey - 45 * s, ex + 40 * s, ey - 70 * s], fill=eye, width=9 * s)
        if expression in ("sad", "crying"):
            d.line([ex - 35 * s, ey - 45 * s, ex + 35 * s, ey - 60 * s] if ex < cx else
                   [ex - 35 * s, ey - 60 * s, ex + 35 * s, ey - 45 * s], fill=eye, width=8 * s)
        if expression == "crying":
            d.rounded_rectangle([ex - 10 * s, ey + 30 * s, ex + 10 * s, ey + 120 * s], 10 * s, fill=(120, 190, 255))
        if expression == "blush":
            d.ellipse([ex - 40 * s, ey + 40 * s, ex + 30 * s, ey + 70 * s], fill=(255, 150, 160))
    my = 350 * s
    if expression in ("happy", "blush"):
        d.chord([cx - 35 * s, my - 25 * s, cx + 35 * s, my + 25 * s], 0, 180, fill=(170, 60, 70))
    elif expression == "shocked":
        d.ellipse([cx - 18 * s, my - 15 * s, cx + 18 * s, my + 25 * s], fill=(170, 60, 70))
    elif expression in ("sad", "crying", "angry"):
        d.arc([cx - 30 * s, my, cx + 30 * s, my + 40 * s], 200, 340, fill=(120, 50, 60), width=7 * s)
    elif expression == "smug":
        d.arc([cx - 10 * s, my - 30 * s, cx + 45 * s, my + 10 * s], 20, 150, fill=(120, 50, 60), width=7 * s)
    else:
        d.line([cx - 20 * s, my, cx + 20 * s, my], fill=(120, 50, 60), width=7 * s)
    return img.resize((w // s, h // s), Image.LANCZOS)


class Sprites:
    def __init__(self, char_dir, story):
        self.dir = char_dir
        self.looks = {c["name"]: c.get("look", "") for c in story["characters"]}
        self.cache = {}
        self.missing = set()

    def get(self, name, expression):
        key = (name, expression)
        if key in self.cache:
            return self.cache[key]
        img = None
        folder = self.dir / name if self.dir else None
        if folder and folder.is_dir():
            files = {p.stem.lower(): p for p in folder.iterdir() if p.suffix.lower() in IMAGE_EXTS}
            path = files.get(expression) or files.get("neutral") or next(iter(files.values()), None)
            if path:
                img = remove_flat_background(Image.open(path))
                bbox = img.getchannel("A").getbbox()
                if bbox:
                    img = img.crop(bbox)
        if img is None:
            self.missing.add(name)
            img = placeholder_sprite(name, expression, self.looks.get(name, ""))
        scale = SPRITE_HEIGHT / img.height
        img = img.resize((max(1, round(img.width * scale)), SPRITE_HEIGHT), Image.LANCZOS)
        self.cache[key] = img
        return img


def resolve_background(name, bg_dir):
    if not bg_dir or not bg_dir.is_dir():
        return None
    want = re.sub(r"[^a-z0-9]", "", name.lower())
    files = [p for p in bg_dir.iterdir() if p.suffix.lower() in IMAGE_EXTS]
    for p in files:
        if re.sub(r"[^a-z0-9]", "", p.stem.lower()) == want:
            return p
    for p in files:  # loose match: "school hallway" finds "hallway"
        stem = re.sub(r"[^a-z0-9]", "", p.stem.lower())
        if stem and (stem in want or want in stem):
            return p
    return None


def placeholder_background(name):
    """Soft gradient with a few shapes, tinted by the place name."""
    base = name_color(name + "bg")
    top = tuple(min(255, int(c * 0.6 + 100)) for c in base)
    bottom = tuple(int(c * 0.45) for c in base)
    grad = np.linspace(0, 1, H)[:, None, None]
    arr = (np.array(top) * (1 - grad) + np.array(bottom) * grad).repeat(W, axis=1).astype(np.uint8)
    img = Image.fromarray(arr, "RGB")
    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle([0, GROUND_Y - 160, W, H], fill=(0, 0, 0, 50))
    for i in range(7):
        x = (i * 311 + len(name) * 97) % W
        d.rounded_rectangle([x, 120 + (i * 53) % 200, x + 180, 520], 18, fill=(255, 255, 255, 28))
    d.text((W // 2, 70), name.title(), font=font(FONT_BOLD, 40), fill=(255, 255, 255, 140), anchor="mm")
    return img


class Backgrounds:
    def __init__(self, bg_dir):
        self.dir = bg_dir
        self.cache = {}
        self.missing = set()

    def get(self, name):
        if name not in self.cache:
            path = resolve_background(name, self.dir)
            if path:
                img = Image.open(path).convert("RGB")
                s = max(W / img.width, H / img.height)
                img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
                x, y = (img.width - W) // 2, (img.height - H) // 2
                img = img.crop((x, y, x + W, y + H))
            else:
                self.missing.add(name)
                img = placeholder_background(name)
            self.cache[name] = img
        return self.cache[name]


# --------------------------------------------------------------------------
# 4. Timeline and rendering
# --------------------------------------------------------------------------

def make_timeline(story):
    """Every line gets a start time and duration from its voiced audio."""
    timeline = [{"kind": "title", "start": 0.0, "duration": TITLE_SECONDS}]
    t = TITLE_SECONDS
    for si, scene in enumerate(story["scenes"]):
        if si:
            t += SCENE_GAP
        for li, line in enumerate(scene["lines"]):
            dur = probe_duration(line["_audio"])
            words = json.loads(Path(line["_words"]).read_text(encoding="utf-8"))
            # Read-only lines (no voice) stay up long enough to read.
            if not words:
                dur = max(dur, 1.0 + len(line["text"]) / 18)
            timeline.append({"kind": "line", "scene": si, "index": li, "line": line, "words": words,
                             "start": t, "duration": dur + LINE_GAP})
            t += dur + LINE_GAP
    timeline[-1]["duration"] += 1.0  # hold the last frame a moment
    return timeline


def stage_positions(n):
    if n <= 1:
        return [W // 2]
    margin = 330 if n <= 3 else 260
    return [round(margin + i * (W - 2 * margin) / (n - 1)) for i in range(n)]


def wrap_text(text, fnt, max_width):
    lines = []
    for para in text.split("\n"):
        words, cur = para.split(), ""
        for w in words:
            trial = f"{cur} {w}".strip()
            if fnt.getlength(trial) <= max_width or not cur:
                cur = trial
            else:
                lines.append(cur)
                cur = w
        lines.append(cur)
    return lines


BOX = (90, H - 290, W - 90, H - 40)


def draw_textbox(frame, speaker, color, text):
    overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    x0, y0, x1, y1 = BOX
    d.rounded_rectangle([x0 + 6, y0 + 8, x1 + 6, y1 + 8], 34, fill=(0, 0, 0, 70))
    d.rounded_rectangle(BOX, 34, fill=(255, 255, 255, 252), outline=(40, 30, 60), width=6)
    if speaker != NARRATOR:
        nf = font(FONT_BLACK, 44)
        tw = nf.getlength(speaker)
        d.rounded_rectangle([x0 + 40, y0 - 44, x0 + 90 + tw, y0 + 30], 22, fill=color, outline=(40, 30, 60), width=5)
        d.text((x0 + 65, y0 - 7), speaker, font=nf, fill="white", anchor="lm", stroke_width=3, stroke_fill=(40, 30, 60))
    tf = font(FONT_TEXT, 50 if len(text) < 110 else 42)
    style = {"fill": (40, 30, 60)}
    if speaker == NARRATOR:
        style = {"fill": (90, 80, 110)}
    y = y0 + 58 if speaker != NARRATOR else y0 + 48
    for row in wrap_text(text, tf, x1 - x0 - 120)[:4]:
        d.text((x0 + 60, y), row, font=tf, **style)
        y += tf.size + 14
    frame.alpha_composite(overlay)


def revealed_text(full, words, t):
    """How much of the line to show at time t: typed out in step with the voice."""
    if not words:  # silent line: type at a steady reading pace
        return full[: max(1, int(len(full) * min(1.0, t / max(0.6, len(full) / 40))))]
    spoken = sum(1 for w in words if w["start"] <= t)
    if spoken >= len(words):
        return full
    # Find where the last spoken word ends in the displayed text.
    cursor = 0
    for w in words[:spoken]:
        found = full.find(w["text"], cursor)
        if found >= 0:
            cursor = found + len(w["text"])
    # Partly type the word being said now, for a smoother typewriter look.
    cur = words[spoken]
    end = words[spoken + 1]["start"] if spoken + 1 < len(words) else cur["start"] + 0.3
    frac = min(1.0, max(0.0, (t - cur["start"]) / max(end - cur["start"], 0.01)))
    found = full.find(cur["text"], cursor)
    if found >= 0:
        cursor = found + int(len(cur["text"]) * frac)
    return full[: max(cursor, 1)]


def render(story, timeline, sprites, backgrounds, audio_path, out_path, fps, music, music_volume, flip_right):
    colors = {c["name"]: name_color(c["name"]) for c in story["characters"]}
    total = timeline[-1]["start"] + timeline[-1]["duration"]
    n_frames = round(total * fps)

    cmd = ["ffmpeg", "-y", "-v", "error", "-stats",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
           "-i", str(audio_path)]
    if music:
        cmd += ["-stream_loop", "-1", "-i", str(music), "-filter_complex",
                f"[2:a]volume={music_volume}[m];[1:a][m]amix=inputs=2:duration=first:normalize=0[a]",
                "-map", "0:v", "-map", "[a]"]
    else:
        cmd += ["-map", "0:v", "-map", "1:a"]
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(out_path)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    # Per scene, each character's current expression carries over between lines.
    expressions = {}
    item_i = 0
    last_key, last_bytes = None, None
    try:
        for f in range(n_frames):
            t = f / fps
            while item_i + 1 < len(timeline) and timeline[item_i + 1]["start"] <= t:
                item_i += 1
                nxt = timeline[item_i]
                if nxt["kind"] == "line":
                    if nxt["index"] == 0:
                        expressions = {}
                    if nxt["line"]["speaker"] != NARRATOR:
                        expressions[nxt["line"]["speaker"]] = nxt["line"]["expression"]
            item = timeline[item_i]
            lt = t - item["start"]

            if item["kind"] == "title":
                key = ("title",)
                if key != last_key:
                    scene0 = story["scenes"][0]
                    frame = backgrounds.get(scene0["background"]).filter(ImageFilter.GaussianBlur(8)).convert("RGBA")
                    frame.alpha_composite(Image.new("RGBA", frame.size, (0, 0, 0, 90)))
                    d = ImageDraw.Draw(frame)
                    tf = font(FONT_BLACK, 110)
                    rows = textwrap.wrap(story["title"], 26)
                    y = H // 2 - (len(rows) - 1) * 65
                    for row in rows:
                        d.text((W // 2, y), row, font=tf, fill="white", anchor="mm", stroke_width=8, stroke_fill=(40, 30, 60))
                        y += 130
                    last_bytes = frame.convert("RGB").tobytes()
                    last_key = key
                proc.stdin.write(last_bytes)
                continue

            line, scene = item["line"], story["scenes"][item["scene"]]
            speaker = line["speaker"]
            effect = line["effect"]
            text = revealed_text(line["text"], item["words"], lt)

            # Animation state, quantised so identical frames can be reused.
            hop = 0
            if effect == "jump" and lt < 0.5:
                hop = round(110 * np.sin(np.pi * lt / 0.5))
            elif lt < 0.22 and speaker != NARRATOR:
                hop = round(18 * np.sin(np.pi * lt / 0.22))
            shake = round(16 * np.sin(lt * 70)) if effect == "shake" and lt < 0.6 else 0
            zoom = 1.0
            if effect == "zoom":
                zoom = round(1 + 0.28 * min(1.0, lt / 0.35), 3)
            fade = 1.0
            if item["index"] == 0 and item["scene"] > 0:
                fade = min(1.0, (lt + SCENE_GAP) / SCENE_GAP)
            next_item = timeline[item_i + 1] if item_i + 1 < len(timeline) else None
            if next_item and next_item.get("index") == 0:
                fade = min(fade, max(0.0, (next_item["start"] - t) / (SCENE_GAP / 2)))
            fade = round(fade, 2)
            key = (item_i, len(text), hop, shake, zoom, fade)
            if key == last_key:
                proc.stdin.write(last_bytes)
                continue

            frame = backgrounds.get(scene["background"]).convert("RGBA")
            cast = scene["cast"]
            xs = stage_positions(len(cast))
            for name, x in zip(cast, xs):
                spr = sprites.get(name, expressions.get(name, "neutral"))
                if flip_right and x > W // 2:
                    spr = spr.transpose(Image.FLIP_LEFT_RIGHT)
                dx = shake if name == speaker else 0
                dy = -hop if name == speaker else 0
                frame.alpha_composite(spr, (x - spr.width // 2 + dx, GROUND_Y - spr.height + dy))

            if zoom > 1.0 and speaker in cast:
                cx = xs[cast.index(speaker)]
                cy = GROUND_Y - SPRITE_HEIGHT * 0.62
                zw, zh = W / zoom, H / zoom
                left = min(max(cx - zw / 2, 0), W - zw)
                top = min(max(cy - zh / 2, 0), H - zh)
                frame = frame.crop((round(left), round(top), round(left + zw), round(top + zh))).resize((W, H), Image.BILINEAR)

            draw_textbox(frame, speaker, colors.get(speaker, (120, 120, 140)), text)
            out = frame.convert("RGB")
            if fade < 1.0:
                out = Image.eval(out, lambda v, k=fade: int(v * k))
            last_bytes, last_key = out.tobytes(), key
            proc.stdin.write(last_bytes)
    finally:
        proc.stdin.close()
        proc.wait()
    if proc.returncode != 0:
        raise SystemExit("ffmpeg failed while encoding the video")


# --------------------------------------------------------------------------

def cmd_write(args):
    if args.llm == "gemini" and not (os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")):
        raise SystemExit("GEMINI_API_KEY is not set. See README.md.")
    if args.llm == "claude" and not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
        raise SystemExit("ANTHROPIC_API_KEY is not set. See README.md.")
    story = write_story(args.idea, args.length, args.llm, args.gemini_model, args.characters, args.backgrounds, args.style)
    assign_voices(story)
    args.output.write_text(json.dumps(story, indent=2, ensure_ascii=False), encoding="utf-8")
    lines = sum(len(s["lines"]) for s in story["scenes"])
    print(f"Saved {args.output}: \"{story['title']}\", {len(story['scenes'])} scenes, {lines} lines.\n")
    todo = checklist(story, args.characters, args.backgrounds)
    todo_path = args.output.with_name(args.output.stem + "_checklist.txt")
    todo_path.write_text(todo, encoding="utf-8")
    print(todo)
    print(f"(Also saved to {todo_path}.) Edit {args.output} if you like, then run:\n"
          f"  python gacha_story.py render {args.output}")


def cmd_render(args):
    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            raise SystemExit(f"{tool} not found. Install ffmpeg and make sure it is on your PATH.")
    story = clean_story(json.loads(args.story.read_text(encoding="utf-8")))
    voices = assign_voices(story)
    output = args.output or args.story.with_suffix(".mp4")
    work = output.with_name(output.stem + "_work")
    work.mkdir(parents=True, exist_ok=True)

    lines = [line for scene in story["scenes"] for line in scene["lines"]]
    print(f"Voicing {len(lines)} lines...", flush=True)
    for c in story["characters"]:
        print(f"  {c['name']}: {c['voice']} ({c.get('pitch', '+0Hz')})")
    asyncio.run(voice_lines(lines, voices, work / "audio", args.rate))

    timeline = make_timeline(story)
    audio = build_audio(timeline, work)
    total = timeline[-1]["start"] + timeline[-1]["duration"]
    print(f"  Length: {int(total // 60)}:{int(total % 60):02d}")

    sprites = Sprites(args.characters, story)
    backgrounds = Backgrounds(args.backgrounds)
    print(f"Rendering {output}...", flush=True)
    render(story, timeline, sprites, backgrounds, audio, output, args.fps, args.music, args.music_volume,
           not args.no_flip)
    print(f"Done: {output}")
    if sprites.missing or backgrounds.missing:
        print("\nPlaceholders were used for missing art:")
        for n in sorted(sprites.missing):
            print(f"  character: {args.characters}/{n}/")
        for b in sorted(backgrounds.missing):
            print(f"  background: {args.backgrounds}/{b}.png")


def main():
    ap = argparse.ArgumentParser(description="Make Gacha Life / Gacha Club style story videos.")
    sub = ap.add_subparsers(dest="command", required=True)

    w = sub.add_parser("write", help="have an AI write a story script from your idea")
    w.add_argument("idea", help='one-line story idea, e.g. "the new girl is secretly a princess"')
    w.add_argument("-o", "--output", type=Path, default=Path("story.json"))
    w.add_argument("--length", choices=list(LENGTHS), default="medium")
    w.add_argument("--style", default="", help='extra instructions, e.g. "funny, lots of plot twists"')
    w.add_argument("--llm", choices=["gemini", "claude"], default="gemini")
    w.add_argument("--gemini-model", default=GEMINI_MODEL)

    r = sub.add_parser("render", help="voice a story script and render the video")
    r.add_argument("story", type=Path)
    r.add_argument("-o", "--output", type=Path)
    r.add_argument("--rate", default="+5%", help="speech speed for all voices")
    r.add_argument("--fps", type=int, default=30)
    r.add_argument("--music", type=Path, help="background music file, looped")
    r.add_argument("--music-volume", type=float, default=0.10)
    r.add_argument("--no-flip", action="store_true",
                   help="don't mirror characters on the right side to face the centre")

    for p in (w, r):
        p.add_argument("--characters", type=Path, default=Path("characters"))
        p.add_argument("--backgrounds", type=Path, default=Path("backgrounds"))

    args = ap.parse_args()
    {"write": cmd_write, "render": cmd_render}[args.command](args)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
