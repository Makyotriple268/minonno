#!/usr/bin/env python3
"""Turn manhwa chapters (.cbz) into narrated 16:9 recap videos.

Pipeline:
  1. Unzip each CBZ and cut the long webtoon strips into individual panels.
  2. Claude reads the panels in order and writes recap narration, grouping
     panels into short narrated beats.
  3. edge-tts voices each beat.
  4. Each panel is shown over a blurred backdrop with a slow pan, timed to
     its narration, and everything is encoded into one MP4 with ffmpeg.

Everything is cached in a work folder next to the output, so re-running
skips finished steps. Edit <work>/script.json and re-run to change the
narration without paying for Claude again.

Usage:
  python manhwa_recap.py ch1.cbz ch2.cbz -o recap.mp4 --series "Solo Leveling"
"""

import argparse
import asyncio
import base64
import io
import json
import os
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}

# Panel detection: webtoon strips have blank (near-uniform) gutters between panels.
STRIP_WIDTH = 800          # every page is scaled to this width before stitching
BLANK_STD = 6.0            # a row whose pixel std-dev is below this counts as blank
MIN_GUTTER = 25            # blank rows needed to count as a gap between panels
MIN_PANEL = 120            # shorter content runs are merged into a neighbour
MAX_PANEL_RATIO = 2.6      # panels taller than width * this are cut into chunks

# Video
W, H = 1920, 1080
FG_MAX_W = 1300            # widest the panel itself may be on screen
PAN_W = 1000               # on-screen width of tall panels that scroll vertically
SEGMENT_GAP = 0.35         # seconds of silence after each narrated beat
MIN_PANEL_SECONDS = 1.5    # no panel is shown for less than this

MODEL = "claude-opus-5-5"
GEMINI_MODEL = "gemini-2.5-flash"
PANELS_PER_REQUEST = 40


# --------------------------------------------------------------------------
# 1. CBZ -> panels
# --------------------------------------------------------------------------

def natural_key(name):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", name)]


def read_cbz_pages(cbz_path):
    with zipfile.ZipFile(cbz_path) as zf:
        names = [
            n for n in zf.namelist()
            if Path(n).suffix.lower() in IMAGE_EXTS
            and not n.startswith("__MACOSX")
            and not Path(n).name.startswith(".")
        ]
        if not names:
            raise SystemExit(f"No images found in {cbz_path}")
        for name in sorted(names, key=natural_key):
            img = Image.open(io.BytesIO(zf.read(name)))
            img.load()
            yield img.convert("RGB")


def content_runs(gray):
    """Return [(start, end)] row ranges of non-blank content in a grayscale strip."""
    blank = gray.std(axis=1) < BLANK_STD
    runs, start, gap = [], None, 0
    for y, is_blank in enumerate(blank):
        if not is_blank:
            if start is None:
                start = y
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= MIN_GUTTER:
                runs.append((start, y - gap + 1))
                start, gap = None, 0
    if start is not None:
        runs.append((start, len(blank) - gap))
    return runs


def merge_small(runs):
    merged = []
    for s, e in runs:
        if merged and (e - s < MIN_PANEL or merged[-1][1] - merged[-1][0] < MIN_PANEL):
            merged[-1] = (merged[-1][0], e)
        else:
            merged.append((s, e))
    return merged


def split_tall(s, e, width):
    max_h = int(width * MAX_PANEL_RATIO)
    if e - s <= max_h:
        return [(s, e)]
    n = -(-(e - s) // max_h)
    step = (e - s) / n
    return [(s + round(i * step), s + round((i + 1) * step)) for i in range(n)]


def extract_panels(cbz_path, out_dir):
    """Stitch all pages into one strip, cut it at the gutters, save panels as JPEGs."""
    pages = []
    for img in read_cbz_pages(cbz_path):
        h = round(img.height * STRIP_WIDTH / img.width)
        pages.append(img.resize((STRIP_WIDTH, h), Image.LANCZOS))
    strip = Image.new("RGB", (STRIP_WIDTH, sum(p.height for p in pages)))
    y = 0
    for p in pages:
        strip.paste(p, (0, y))
        y += p.height

    # Short pages (credits, title cards, recruitment banners) are never part of a
    # continuous strip, so always cut at their edges.
    cuts, y = set(), 0
    for p in pages:
        if p.height < p.width * 1.5:
            cuts.update((y, y + p.height))
        y += p.height

    gray = np.asarray(strip.convert("L"), dtype=np.float32)
    runs = []
    for s, e in content_runs(gray):
        bounds = [s] + sorted(c for c in cuts if s < c < e) + [e]
        runs += list(zip(bounds, bounds[1:]))
    runs = merge_small(runs)
    out_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for s, e in runs:
        for cs, ce in split_tall(s, e, STRIP_WIDTH):
            if ce - cs < 40:
                continue
            path = out_dir / f"{len(paths):04d}.jpg"
            strip.crop((0, cs, STRIP_WIDTH, ce)).save(path, quality=92)
            paths.append(path)
    return paths


# --------------------------------------------------------------------------
# 1b. Text removal for the video (the script is still written from the originals)
# --------------------------------------------------------------------------

def find_bubbles(rgb):
    """Mask of speech bubbles and white caption boxes: white, convex shapes with dark text inside."""
    import cv2

    h, w = rgb.shape[:2]
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    white = ((hsv[..., 2] > 215) & (hsv[..., 1] < 45)).astype(np.uint8)
    white = cv2.morphologyEx(white, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    dark = (hsv[..., 2] < 110) & (hsv[..., 1] < 90)  # black lettering, not coloured title art
    contours, _ = cv2.findContours(white, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    mask = np.zeros((h, w), np.uint8)
    for c in contours:
        area = cv2.contourArea(c)  # includes the text "holes" inside the bubble
        if not (0.003 * h * w < area < 0.6 * h * w):
            continue
        hull = cv2.contourArea(cv2.convexHull(c))
        if hull == 0 or area / hull < 0.85:  # bubbles are round or boxy, backgrounds aren't
            continue
        shape = np.zeros((h, w), np.uint8)
        cv2.drawContours(shape, [c], -1, 1, thickness=cv2.FILLED)
        inside = shape.astype(bool)
        white_frac = white[inside].mean()
        dark_frac = dark[inside].mean()
        if 0.5 < white_frac < 0.985 and dark_frac > 0.015:  # mostly white, with lettering
            mask |= shape
    return mask


def clean_panel(src, dst):
    """Paint over speech bubbles. Returns False if the panel is basically all text."""
    import cv2

    rgb = np.asarray(Image.open(src).convert("RGB"))
    h, w = rgb.shape[:2]
    mask = find_bubbles(rgb)
    if mask.any():
        mask = cv2.dilate(mask, np.ones((9, 9), np.uint8))  # take the bubble outline and tail base too
        if mask.mean() > 0.6:
            return False
        out = rgb.copy()
        n, labels = cv2.connectedComponents(mask)
        flat_fill = np.zeros((h, w), np.uint8)
        for i in range(1, n):
            region = (labels == i).astype(np.uint8)
            if region.mean() > 0.35:  # a narration box filling the panel: nothing to show
                return False
            ring = cv2.dilate(region, np.ones((15, 15), np.uint8)).astype(bool) & ~region.astype(bool)
            around = rgb[ring]
            near_white = (around.min(axis=1) > 215).mean() if len(around) else 0
            # Bubbles in the white margin get plain white; on a flat colour, that colour.
            # Only bubbles over actual artwork are inpainted.
            if near_white > 0.5:
                # Mostly in the white margin: white where the surroundings are white,
                # and fill in from the artwork where the bubble overlaps it.
                inside = region.astype(bool)
                painted = cv2.inpaint(rgb, region, 9, cv2.INPAINT_TELEA)
                bright = painted.min(axis=2) > 200
                out[inside & bright] = 255
                out[inside & ~bright] = painted[inside & ~bright]
            elif len(around) and around.std(axis=0).mean() < 18:
                out[region.astype(bool)] = np.median(around, axis=0)
            else:
                flat_fill |= region
        if flat_fill.any():
            out = cv2.inpaint(out, flat_fill, 7, cv2.INPAINT_TELEA)
        rgb = out
        # Trim the now-empty white margins at the top and bottom.
        rows = np.where((rgb.min(axis=2) < 225).mean(axis=1) > 0.02)[0]
        if len(rows) and rows[-1] - rows[0] > 0.4 * h:
            rgb = rgb[max(0, rows[0] - 4): rows[-1] + 5]
    # Nothing left but a flat colour (a text-only panel)?
    gray = rgb.mean(axis=2)
    if gray.std() < 14 or (np.abs(gray - np.median(gray)) < 12).mean() > 0.93:
        return False
    Image.fromarray(rgb).save(dst, quality=92)
    return True


def clean_panels(panel_paths, out_dir):
    """Text-free copies for the video. Text-only panels map to the previous clean panel."""
    out_dir.mkdir(parents=True, exist_ok=True)
    result, last_good, removed = [], None, 0
    for p in panel_paths:
        dst = out_dir / f"{p.parent.name}_{p.name}"
        ok = dst.exists() or clean_panel(p, dst)
        if ok:
            last_good = dst
        else:
            removed += 1
        result.append(last_good or p)
    return result, removed


# --------------------------------------------------------------------------
# 2. Panels -> recap script (Claude)
# --------------------------------------------------------------------------

SYSTEM_PROMPT = """You write narration for YouTube manhwa recap videos.

You will be shown numbered panels from a manhwa, in reading order. Write the \
voiceover a recap channel would use: third person, present tense, energetic \
and easy to follow, retelling the plot so a viewer understands what happens \
without reading it. Translate dialogue into narration rather than quoting \
every speech bubble, but keep short quotes when a line lands hard. Use \
character names once they are known; until then describe characters by \
appearance or role and stay consistent.

Group consecutive panels into beats. Each beat is one to three sentences of \
narration covering the panels shown while it is read. Every beat lists its \
panel numbers in ascending order, beats never overlap, and together they \
cover the panels in order. Leave out panels that carry no story (credits, \
translator notes, blank or pure sound-effect panels) by not listing them.

The narration is voiced first and the video then cuts to each panel on the \
exact word you mark. Inside each beat's narration, put a marker like [12] \
right before the words that go with panel 12. The narration starts with a \
marker, every panel in the beat appears exactly once as a marker, in \
ascending order, and markers sit only between words, never inside one. Give \
each panel at least a few words so it stays on screen long enough to see; \
for a quick run of action panels, place the markers a few words apart rather \
than side by side.

Pacing: write about 12 to 20 words of narration per panel on average, so a \
chapter of 80 panels becomes roughly 4 to 5 minutes of voiceover. Don't \
compress a chapter into a quick summary; retell every scene.

Also return updated notes: a short running summary of the story so far plus \
the characters and their names. These notes are handed back to you with the \
next batch of panels so the narration stays consistent."""

SCRIPT_SCHEMA = {
    "type": "object",
    "properties": {
        "beats": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "panels": {"type": "array", "items": {"type": "integer"}},
                    "narration": {"type": "string"},
                },
                "required": ["panels", "narration"],
                "additionalProperties": False,
            },
        },
        "notes": {"type": "string"},
    },
    "required": ["beats", "notes"],
    "additionalProperties": False,
}


def encode_panel(path, max_side=1568):
    img = Image.open(path)
    scale = min(1.0, max_side / max(img.size))
    if scale < 1.0:
        img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.standard_b64encode(buf.getvalue()).decode()


def ask_claude(system, items, label):
    import anthropic

    content = []
    for kind, value in items:
        if kind == "text":
            content.append({"type": "text", "text": value})
        else:
            content.append({
                "type": "image",
                "source": {"type": "base64", "media_type": "image/jpeg", "data": encode_panel(value)},
            })
    with anthropic.Anthropic().beta.messages.stream(
        model=MODEL,
        max_tokens=32000,
        system=system,
        messages=[{"role": "user", "content": content}],
        output_config={"effort": "medium", "format": {"type": "json_schema", "schema": SCRIPT_SCHEMA}},
        betas=["server-side-fallback-2026-07-01"],
        extra_body={"fallbacks": "default"},
    ) as stream:
        message = stream.get_final_message()

    if message.stop_reason == "refusal":
        raise SystemExit(
            f"Claude declined {label}. "
            "Remove the offending pages from the CBZ or write those beats by hand in script.json."
        )
    if message.stop_reason == "max_tokens":
        raise SystemExit("Claude's response was cut off; lower PANELS_PER_REQUEST and re-run.")
    return json.loads("".join(b.text for b in message.content if b.type == "text"))


class GeminiFailed(Exception):
    """Gemini couldn't produce this batch (quota used up, refusal, or repeated errors)."""


def ask_gemini(system, items, label, model):
    from google import genai
    from google.genai import types

    contents = []
    for kind, value in items:
        if kind == "text":
            contents.append(value)
        else:
            contents.append(types.Part.from_bytes(data=base64.standard_b64decode(encode_panel(value)),
                                                  mime_type="image/jpeg"))
    # The client reads GEMINI_API_KEY (or GOOGLE_API_KEY) from the environment. Keep a
    # reference to it: a client that gets garbage-collected closes its connection mid-call.
    import time
    from google.genai import errors

    client = genai.Client()
    for attempt in range(6):
        try:
            response = client.models.generate_content(
                model=model,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    response_mime_type="application/json",
                    response_json_schema=SCRIPT_SCHEMA,
                    max_output_tokens=32000,
                ),
            )
            break
        except errors.APIError as e:
            # 429 = free-tier rate limit, 5xx = Gemini busy. Wait and retry, except when
            # the daily quota is gone: waiting minutes won't help, so fail fast.
            daily = e.code == 429 and "PerDay" in str(e)
            if e.code not in (429, 500, 503) or daily or attempt == 5:
                reason = "daily free limit used up" if daily else str(e)
                raise GeminiFailed(f"Gemini error for {label}: {reason}")
            wait = 60 * (attempt + 1)
            print(f"    Gemini limit reached ({e.code}), waiting {wait}s...", flush=True)
            time.sleep(wait)
    if not response.text:
        reason = response.candidates[0].finish_reason if response.candidates else response.prompt_feedback
        raise GeminiFailed(f"Gemini returned nothing for {label} ({reason})")
    return json.loads(response.text)


def write_script(panels, series, extra_style, llm="claude", gemini_model=GEMINI_MODEL, notes="", fallback=None):
    """panels: list of (global_index, path, chapter_label).

    notes: story-so-far from earlier chapters. Returns (beats, updated notes).
    """
    system = SYSTEM_PROMPT
    if extra_style:
        system += f"\n\nExtra style instructions from the channel owner: {extra_style}"

    beats = []
    for start in range(0, len(panels), PANELS_PER_REQUEST):
        batch = panels[start:start + PANELS_PER_REQUEST]
        intro = f"Series: {series}\n" if series else ""
        intro += f"Story notes so far:\n{notes}\n" if notes else "This is the start of the recap.\n"
        if start + PANELS_PER_REQUEST >= len(panels):
            intro += "This is the final batch, so end the last beat with a hook for the next chapter.\n"
        items = [("text", intro)]
        last_chapter = None
        for idx, path, chapter in batch:
            if chapter != last_chapter:
                items.append(("text", f"--- {chapter} ---"))
                last_chapter = chapter
            items.append(("text", f"Panel {idx}:"))
            items.append(("image", path))

        label = f"panels {batch[0][0]}-{batch[-1][0]}"
        print(f"  {llm.title()}: {label} of {len(panels)}...", flush=True)

        def ask(items):
            if llm != "gemini":
                return ask_claude(system, items, label)
            try:
                return ask_gemini(system, items, label, gemini_model)
            except GeminiFailed as e:
                if fallback != "claude":
                    raise SystemExit(f"{e}. Run again later, or add --fallback claude.")
                print(f"  {e}. Falling back to Claude for {label}...", flush=True)
                return ask_claude(system, items, label)

        result = ask(items)
        # Some models (especially lighter ones, or with many panels at once) write a
        # one-minute summary instead of a recap. Ask once more if it's far too short.
        words = sum(len(MARKER.sub("", b.get("narration", "")).split()) for b in result.get("beats", []))
        if words < 6 * len(batch):
            print(f"    Script too short ({words} words for {len(batch)} panels), asking again...", flush=True)
            result = ask(items + [("text", f"IMPORTANT: a previous attempt was far too short ({words} words "
                                           f"for {len(batch)} panels). Retell every scene in full, about "
                                           "15 words per panel.")])

        valid = {idx for idx, _, _ in batch}
        for beat in result["beats"]:
            beat["panels"] = sorted(p for p in beat["panels"] if p in valid)
            # Drop markers for panels that aren't in this beat.
            beat["narration"] = MARKER.sub(
                lambda m: m.group(0) if int(m.group(1)) in beat["panels"] else "", beat["narration"]
            )
            if beat["panels"] and beat["narration"].strip():
                beats.append(beat)
        notes = result["notes"]
    return beats, notes


# --------------------------------------------------------------------------
# 3. Narration -> audio (edge-tts)
# --------------------------------------------------------------------------

def probe_duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


MARKER = re.compile(r"\[(\d+)\]\s*")


def parse_markers(narration):
    """Split '[12] Text [13] more' into ('Text more', [(12, 0), (13, 5)])."""
    clean, markers, last = "", [], 0
    for m in MARKER.finditer(narration):
        clean += narration[last:m.start()]
        markers.append((int(m.group(1)), len(clean)))
        last = m.end()
    clean += narration[last:]
    return clean.strip(), markers


async def tts_all(beats, audio_dir, voice, rate):
    """Voice each beat; save <i>.mp3 plus <i>.json with the start time of every word."""
    import edge_tts

    audio_dir.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(4)
    # edge-tts doesn't read proxy settings from the environment on its own.
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")

    async def one(i, beat):
        path = audio_dir / f"{i:04d}.mp3"
        words_path = audio_dir / f"{i:04d}.json"
        if path.exists() and path.stat().st_size > 0 and words_path.exists():
            return
        text, _ = parse_markers(beat["narration"])
        async with sem:
            comm = edge_tts.Communicate(text, voice, rate=rate, proxy=proxy, boundary="WordBoundary")
            audio, words = bytearray(), []
            async for chunk in comm.stream():
                if chunk["type"] == "audio":
                    audio += chunk["data"]
                elif chunk["type"] == "WordBoundary":
                    words.append({"text": chunk["text"], "start": chunk["offset"] / 1e7})
        path.write_bytes(audio)
        words_path.write_text(json.dumps(words), encoding="utf-8")

    await asyncio.gather(*(one(i, b) for i, b in enumerate(beats)))


def with_min_time(cues, total, minimum):
    """Stretch panels shorter than `minimum`, taking the time from the longer ones."""
    durs = [d for _, d in cues]
    if len(durs) * minimum > total:
        minimum = total / len(durs)
    for _ in range(len(durs)):
        short = [i for i, d in enumerate(durs) if d < minimum - 1e-6]
        if not short:
            break
        for i in short:
            durs[i] = minimum
        long_ = [i for i, d in enumerate(durs) if d > minimum + 1e-6]
        excess = sum(durs) - total
        room = sum(durs[i] - minimum for i in long_)
        for i in long_:
            durs[i] -= excess * (durs[i] - minimum) / room if room > 0 else 0
    return [(p, d) for (p, _), d in zip(cues, durs)]


def panel_cues(beat, words, duration, panel_paths):
    """Return [(panel, seconds_on_screen)] for one beat, switching on the marked words.

    Falls back to splitting the time evenly (tall panels get more) when the
    narration has no usable markers.
    """
    text, markers = parse_markers(beat["narration"])
    if not markers or [p for p, _ in markers] != beat["panels"]:
        weights = []
        for p in beat["panels"]:
            with Image.open(panel_paths[p]) as im:
                weights.append(max(1.0, min(2.5, im.height / im.width)))
        cues = [(p, duration * w / sum(weights)) for p, w in zip(beat["panels"], weights)]
        return with_min_time(cues, duration, MIN_PANEL_SECONDS)

    # Find where each spoken word sits in the text, then each marker's word.
    positions, cursor = [], 0
    for w in words:
        pos = text.find(w["text"], cursor)
        if pos < 0:
            pos = cursor
        positions.append(pos)
        cursor = pos + len(w["text"])
    times = []
    for _, char_pos in markers:
        t = next((w["start"] for w, pos in zip(words, positions) if pos >= char_pos), duration)
        times.append(t)
    times[0] = 0.0
    times.append(duration)

    # Markers with no words between them share the time until the next word.
    i = 0
    while i < len(markers):
        j = i
        while j + 1 < len(markers) and times[j + 1] <= times[i]:
            j += 1
        span = (times[j + 1] - times[i]) / (j - i + 1)
        for k in range(i, j + 1):
            times[k] = times[i] + span * (k - i)
        i = j + 1
    cues = [(p, times[k + 1] - times[k]) for k, (p, _) in enumerate(markers)]
    return with_min_time(cues, duration, MIN_PANEL_SECONDS)


def build_narration_track(beats, audio_dir, out_wav):
    """Pad each clip with a short pause, join into one WAV. Returns per-beat durations.

    A beat whose narration is too short for its panels gets a longer pause, so
    every panel stays on screen at least MIN_PANEL_SECONDS instead of flashing by.
    """
    durations, padded = [], []
    for i, beat in enumerate(beats):
        src = audio_dir / f"{i:04d}.mp3"
        dst = audio_dir / f"{i:04d}.wav"
        total = max(probe_duration(src) + SEGMENT_GAP, len(beat["panels"]) * MIN_PANEL_SECONDS)
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-i", str(src), "-af", f"apad=whole_dur={total:.3f}",
             "-ar", "44100", "-ac", "2", str(dst)],
            check=True,
        )
        durations.append(probe_duration(dst))
        padded.append(dst)
    list_file = audio_dir / "concat.txt"
    list_file.write_text("".join(f"file '{p.resolve().as_posix()}'\n" for p in padded))
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(list_file),
         "-c", "copy", str(out_wav)],
        check=True,
    )
    return durations


# --------------------------------------------------------------------------
# 4. Panels + audio -> video
# --------------------------------------------------------------------------

def prepare_panel(path):
    """Return (backdrop, foreground) arrays for one panel."""
    img = Image.open(path).convert("RGB")

    bg_scale = max(W / img.width, H / img.height)
    bg = img.resize((round(img.width * bg_scale) + 1, round(img.height * bg_scale) + 1))
    left, top = (bg.width - W) // 2, (bg.height - H) // 2
    bg = bg.crop((left, top, left + W, top + H)).filter(ImageFilter.GaussianBlur(40))
    bg = Image.eval(bg, lambda v: int(v * 0.45))

    # Fit slightly taller than the screen so even normal panels drift a little;
    # tall panels are kept at a readable width and pan from top to bottom.
    fg_scale = min(FG_MAX_W / img.width, H * 1.06 / img.height)
    if img.width * fg_scale < PAN_W:
        fg_scale = PAN_W / img.width
    fg = img.resize((round(img.width * fg_scale), round(img.height * fg_scale)), Image.LANCZOS)
    return np.asarray(bg), np.asarray(fg)


def panel_frames(path, n_frames):
    bg, fg = prepare_panel(path)
    fh, fw = fg.shape[:2]
    x0 = (W - fw) // 2
    if fh <= H:
        y0 = (H - fh) // 2
        frame = bg.copy()
        frame[y0:y0 + fh, x0:x0 + fw] = fg
        data = frame.tobytes()
        for _ in range(n_frames):
            yield data
        return
    travel = fh - H
    for f in range(n_frames):
        t = f / max(n_frames - 1, 1)
        t = t * t * (3 - 2 * t)  # ease in/out
        y = round(travel * t)
        frame = bg.copy()
        frame[:, x0:x0 + fw] = fg[y:y + H]
        yield frame.tobytes()


def render_video(beats, panel_paths, durations, audio_dir, narration_wav, out_path, fps, music, music_volume):
    """Encode the video. Returns the frame number where each beat starts."""
    timeline = []  # (panel_path, seconds, beat_index)
    for b, (beat, dur) in enumerate(zip(beats, durations)):
        words = json.loads((audio_dir / f"{b:04d}.json").read_text(encoding="utf-8"))
        for p, secs in panel_cues(beat, words, dur, panel_paths):
            timeline.append((panel_paths[p], secs, b))

    # Frame where each beat starts; keyframes there let the video be split cleanly later.
    beat_frames, elapsed = [], 0.0
    for dur in durations:
        beat_frames.append(round(elapsed * fps))
        elapsed += dur
    keyframes = ",".join(f"{f / fps:.4f}" for f in beat_frames)

    cmd = [
        "ffmpeg", "-y", "-v", "error", "-stats",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
        "-i", str(narration_wav),
    ]
    if music:
        cmd += ["-stream_loop", "-1", "-i", str(music),
                "-filter_complex",
                f"[2:a]volume={music_volume}[m];[1:a][m]amix=inputs=2:duration=first:normalize=0[a]",
                "-map", "0:v", "-map", "[a]"]
    else:
        cmd += ["-map", "0:v", "-map", "1:a"]
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
            "-force_key_frames", keyframes,
            "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(out_path)]

    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    elapsed, frames_written = 0.0, 0
    try:
        for path, secs, _ in timeline:
            elapsed += secs
            n = round(elapsed * fps) - frames_written
            for data in panel_frames(path, n):
                proc.stdin.write(data)
            frames_written += n
    finally:
        proc.stdin.close()
        proc.wait()
    if proc.returncode != 0:
        raise SystemExit("ffmpeg failed while encoding the video")
    return beat_frames


def split_into_parts(video, beat_frames, fps, max_mb):
    """Cut the finished video at beat boundaries into parts no bigger than max_mb."""
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "packet=pts_time,size", "-of", "csv=p=0", str(video)],
        capture_output=True, text=True, check=True,
    )
    packets = []
    for line in out.stdout.split():
        t, size = line.split(",")[:2]
        if t != "N/A":
            packets.append((float(t), int(size)))
    packets.sort()
    total_len = probe_duration(video)
    starts = [f / fps for f in beat_frames] + [total_len]

    # Bytes between consecutive beat starts.
    beat_bytes, k = [], 0
    for b in range(len(beat_frames)):
        size = 0
        while k < len(packets) and packets[k][0] < starts[b + 1] - 0.5 / fps:
            size += packets[k][1]
            k += 1
        beat_bytes.append(size)
    beat_bytes[-1] += sum(s for _, s in packets[k:])

    budget = max_mb * 1024 * 1024 * 0.97  # leave room for the container
    cuts, size = [0], 0
    for b, nbytes in enumerate(beat_bytes):
        if size and size + nbytes > budget:
            cuts.append(b)
            size = 0
        size += nbytes
    cuts.append(len(beat_frames))

    parts = []
    for n, (a, b) in enumerate(zip(cuts, cuts[1:]), 1):
        part = video.with_name(f"{video.stem}_part{n}{video.suffix}")
        cmd = ["ffmpeg", "-y", "-v", "error", "-ss", f"{(beat_frames[a] + 0.5) / fps:.4f}"]
        if b < len(beat_frames):
            cmd += ["-to", f"{beat_frames[b] / fps:.4f}"]
        cmd += ["-i", str(video), "-c", "copy", "-avoid_negative_ts", "make_zero",
                "-movflags", "+faststart", str(part)]
        subprocess.run(cmd, check=True)
        parts.append(part)
    return parts


# --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Make a narrated recap video from manhwa .cbz chapters.")
    ap.add_argument("cbz", nargs="+", type=Path, help="chapter files, in reading order")
    ap.add_argument("-o", "--output", type=Path, default=Path("recap.mp4"))
    ap.add_argument("--series", default="", help="series name, helps Claude with context")
    ap.add_argument("--style", default="", help='extra narration instructions, e.g. "more dramatic, mention the MC\'s level-ups"')
    ap.add_argument("--llm", choices=["claude", "gemini"], default="claude",
                    help="which AI writes the script (needs ANTHROPIC_API_KEY or GEMINI_API_KEY)")
    ap.add_argument("--gemini-model", default=GEMINI_MODEL, help="Gemini model to use with --llm gemini")
    ap.add_argument("--voice", default="en-US-AndrewNeural", help="edge-tts voice (list with: edge-tts --list-voices)")
    ap.add_argument("--rate", default="+8%", help="speech speed, e.g. +0%%, +15%%")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--music", type=Path, help="optional background music file, looped")
    ap.add_argument("--music-volume", type=float, default=0.12)
    ap.add_argument("--max-part-mb", type=float, default=0,
                    help="also split the video into parts under this size (MB), cutting between beats")
    ap.add_argument("--script-only", action="store_true", help="stop after writing script.json so you can edit it")
    ap.add_argument("--keep-text", action="store_true",
                    help="show panels as they are, with speech bubbles (default: bubbles are removed)")
    ap.add_argument("--fallback", choices=["claude"],
                    help="if Gemini fails (e.g. daily limit used up), write that part with Claude instead")
    ap.add_argument("--notes-file", type=Path,
                    help="story-so-far file: read before writing the script, then updated for the next chapter")
    ap.add_argument("--rewrite", action="store_true", help="ignore the cached script and ask Claude again")
    args = ap.parse_args()

    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            raise SystemExit(f"{tool} not found. Install ffmpeg and make sure it is on your PATH.")

    work = args.output.with_suffix("").parent / (args.output.stem + "_work")
    work.mkdir(parents=True, exist_ok=True)
    print(f"Work folder: {work}")

    # 1. panels
    panels = []  # (global_index, path, chapter_label)
    for ch_i, cbz in enumerate(args.cbz):
        ch_dir = work / "panels" / f"{ch_i:02d}_{cbz.stem}"
        paths = sorted(ch_dir.glob("*.jpg")) if ch_dir.exists() else []
        if not paths:
            print(f"Cutting panels from {cbz.name}...")
            paths = extract_panels(cbz, ch_dir)
        print(f"  {cbz.name}: {len(paths)} panels")
        panels += [(len(panels) + i, p, cbz.stem) for i, p in enumerate(paths)]
    panel_paths = [p for _, p, _ in panels]
    video_paths = panel_paths
    if not args.keep_text:
        try:
            import cv2  # noqa: F401
        except ImportError:
            raise SystemExit("Text removal needs OpenCV: run  pip install opencv-python-headless  "
                             "(or add --keep-text to leave speech bubbles in).")
        print("Removing speech bubbles for the video...")
        video_paths, removed = clean_panels(panel_paths, work / "clean")
        print(f"  {removed} text-only panels will be skipped")

    # 2. script
    script_path = work / "script.json"
    if script_path.exists() and not args.rewrite:
        print(f"Using existing script: {script_path}")
        beats = json.loads(script_path.read_text(encoding="utf-8"))
    else:
        has_gemini = bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"))
        has_claude = bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"))
        fallback = args.fallback if has_claude else None
        if args.fallback and not has_claude:
            print("  Note: --fallback claude ignored because ANTHROPIC_API_KEY is not set.")
        if args.llm == "gemini" and not has_gemini:
            raise SystemExit("GEMINI_API_KEY is not set. See README.md, or put a script.json in the work folder.")
        if args.llm == "claude" and not has_claude:
            raise SystemExit("ANTHROPIC_API_KEY is not set. See README.md, or put a script.json in the work folder.")
        print(f"Writing recap script with {args.llm.title()}...")
        notes = ""
        if args.notes_file and args.notes_file.exists():
            notes = args.notes_file.read_text(encoding="utf-8").strip()
            print(f"  Continuing from story notes in {args.notes_file}")
        beats, notes = write_script(panels, args.series, args.style, args.llm, args.gemini_model, notes, fallback)
        script_path.write_text(json.dumps(beats, indent=2, ensure_ascii=False), encoding="utf-8")
        (work / "notes.txt").write_text(notes, encoding="utf-8")
        if args.notes_file:  # hand the updated story-so-far to the next chapter
            args.notes_file.write_text(notes, encoding="utf-8")
        shutil.rmtree(work / "audio", ignore_errors=True)
        print(f"Saved {len(beats)} beats to {script_path}")
    if args.script_only:
        print("Edit script.json if you like, then run the same command again without --script-only.")
        return

    # 3. audio (re-voice everything if the script changed since last time)
    audio_dir = work / "audio"
    stamp = audio_dir / "source.json"
    signature = json.dumps([args.voice, args.rate, [b["narration"] for b in beats]])
    if not stamp.exists() or stamp.read_text(encoding="utf-8") != signature:
        shutil.rmtree(audio_dir, ignore_errors=True)
    print("Generating narration...")
    asyncio.run(tts_all(beats, audio_dir, args.voice, args.rate))
    stamp.write_text(signature, encoding="utf-8")
    narration = work / "narration.wav"
    durations = build_narration_track(beats, audio_dir, narration)
    minutes, seconds = divmod(round(sum(durations)), 60)
    print(f"  Narration length: {minutes}:{seconds:02d}")

    # 4. video
    print(f"Rendering {args.output}...")
    beat_frames = render_video(beats, video_paths, durations, audio_dir, narration, args.output,
                               args.fps, args.music, args.music_volume)
    print(f"Done: {args.output}")
    if args.max_part_mb and args.output.stat().st_size > args.max_part_mb * 1024 * 1024:
        for part in split_into_parts(args.output, beat_frames, args.fps, args.max_part_mb):
            size = part.stat().st_size / 1024 / 1024
            print(f"  {part.name}: {size:.1f} MB, {probe_duration(part):.0f}s")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
