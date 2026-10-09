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
MIN_PANEL_SECONDS = 1.2

MODEL = "claude-opus-5-5"
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


def write_script(panels, series, extra_style):
    """panels: list of (global_index, path, chapter_label). Returns list of beats."""
    import anthropic

    client = anthropic.Anthropic()
    system = SYSTEM_PROMPT
    if extra_style:
        system += f"\n\nExtra style instructions from the channel owner: {extra_style}"

    notes = ""
    beats = []
    for start in range(0, len(panels), PANELS_PER_REQUEST):
        batch = panels[start:start + PANELS_PER_REQUEST]
        intro = f"Series: {series}\n" if series else ""
        intro += f"Story notes so far:\n{notes}\n" if notes else "This is the start of the recap.\n"
        if start + PANELS_PER_REQUEST >= len(panels):
            intro += "This is the final batch, so end the last beat with a hook for the next chapter.\n"
        content = [{"type": "text", "text": intro}]
        last_chapter = None
        for idx, path, chapter in batch:
            if chapter != last_chapter:
                content.append({"type": "text", "text": f"--- {chapter} ---"})
                last_chapter = chapter
            content.append({"type": "text", "text": f"Panel {idx}:"})
            content.append({
                "type": "image",
                "source": {"type": "base64", "media_type": "image/jpeg", "data": encode_panel(path)},
            })

        print(f"  Claude: panels {batch[0][0]}-{batch[-1][0]} of {len(panels)}...", flush=True)
        with client.beta.messages.stream(
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
                f"Claude declined panels {batch[0][0]}-{batch[-1][0]}. "
                "Remove the offending pages from the CBZ or write those beats by hand in script.json."
            )
        if message.stop_reason == "max_tokens":
            raise SystemExit("Claude's response was cut off; lower PANELS_PER_REQUEST and re-run.")
        text = "".join(b.text for b in message.content if b.type == "text")
        result = json.loads(text)
        valid = {idx for idx, _, _ in batch}
        for beat in result["beats"]:
            beat["panels"] = sorted(p for p in beat["panels"] if p in valid)
            if beat["panels"] and beat["narration"].strip():
                beats.append(beat)
        notes = result["notes"]
    return beats


# --------------------------------------------------------------------------
# 3. Narration -> audio (edge-tts)
# --------------------------------------------------------------------------

def probe_duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


async def tts_all(beats, audio_dir, voice, rate):
    import edge_tts

    audio_dir.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(4)

    async def one(i, beat):
        path = audio_dir / f"{i:04d}.mp3"
        if path.exists() and path.stat().st_size > 0:
            return
        async with sem:
            await edge_tts.Communicate(beat["narration"], voice, rate=rate).save(str(path))

    await asyncio.gather(*(one(i, b) for i, b in enumerate(beats)))


def build_narration_track(beats, audio_dir, out_wav):
    """Pad each clip with a short pause, join into one WAV. Returns per-beat durations."""
    durations, padded = [], []
    for i in range(len(beats)):
        src = audio_dir / f"{i:04d}.mp3"
        dst = audio_dir / f"{i:04d}.wav"
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-i", str(src), "-af", f"apad=pad_dur={SEGMENT_GAP}",
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


def render_video(beats, panel_paths, durations, narration_wav, out_path, fps, music, music_volume):
    # Split each beat's duration across its panels, weighting tall panels (they pan) a bit more.
    timeline = []
    for beat, dur in zip(beats, durations):
        paths = [panel_paths[i] for i in beat["panels"]]
        weights = []
        for p in paths:
            with Image.open(p) as im:
                weights.append(max(1.0, min(2.5, im.height / im.width)))
        total = sum(weights)
        for p, w in zip(paths, weights):
            timeline.append((p, max(MIN_PANEL_SECONDS, dur * w / total)))

    # Stretch or shrink the timeline so it exactly matches the narration length.
    audio_len = sum(durations)
    scale = audio_len / sum(d for _, d in timeline)
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
            "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(out_path)]

    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    elapsed, frames_written = 0.0, 0
    try:
        for path, dur in timeline:
            elapsed += dur * scale
            n = round(elapsed * fps) - frames_written
            for data in panel_frames(path, n):
                proc.stdin.write(data)
            frames_written += n
    finally:
        proc.stdin.close()
        proc.wait()
    if proc.returncode != 0:
        raise SystemExit("ffmpeg failed while encoding the video")


# --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Make a narrated recap video from manhwa .cbz chapters.")
    ap.add_argument("cbz", nargs="+", type=Path, help="chapter files, in reading order")
    ap.add_argument("-o", "--output", type=Path, default=Path("recap.mp4"))
    ap.add_argument("--series", default="", help="series name, helps Claude with context")
    ap.add_argument("--style", default="", help='extra narration instructions, e.g. "more dramatic, mention the MC\'s level-ups"')
    ap.add_argument("--voice", default="en-US-AndrewNeural", help="edge-tts voice (list with: edge-tts --list-voices)")
    ap.add_argument("--rate", default="+8%", help="speech speed, e.g. +0%%, +15%%")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--music", type=Path, help="optional background music file, looped")
    ap.add_argument("--music-volume", type=float, default=0.12)
    ap.add_argument("--script-only", action="store_true", help="stop after writing script.json so you can edit it")
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

    # 2. script
    script_path = work / "script.json"
    if script_path.exists() and not args.rewrite:
        print(f"Using existing script: {script_path}")
        beats = json.loads(script_path.read_text(encoding="utf-8"))
    else:
        print("Writing recap script with Claude...")
        beats = write_script(panels, args.series, args.style)
        script_path.write_text(json.dumps(beats, indent=2, ensure_ascii=False), encoding="utf-8")
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
    render_video(beats, panel_paths, durations, narration, args.output, args.fps, args.music, args.music_volume)
    print(f"Done: {args.output}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
