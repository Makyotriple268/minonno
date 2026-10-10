#!/usr/bin/env python3
"""Print YouTube chapter timestamps for a compilation of chapter videos.

Usage (from the recap folder):
  python youtube_timestamps.py 21 60

Reads videos/Chapter 21.mp4 ... videos/Chapter 60.mp4 in order and prints the
time each chapter starts in the joined video, ready to paste in a description.
Join the videos in the same order, with nothing added between them.
"""
import subprocess
import sys
from pathlib import Path


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                          str(path)], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def stamp(seconds):
    s = int(seconds)
    return f"{s // 3600}:{s % 3600 // 60:02d}:{s % 60:02d}" if s >= 3600 else f"{s // 60}:{s % 60:02d}"


def main():
    first, last = (int(a) for a in sys.argv[1:3]) if len(sys.argv) >= 3 else (1, 999)
    folder = Path(sys.argv[3]) if len(sys.argv) > 3 else Path("videos")
    t, missing = 0.0, []
    for n in range(first, last + 1):
        video = folder / f"Chapter {n}.mp4"
        if not video.exists():
            missing.append(n)
            continue
        print(f"{stamp(t)} Chapter {n}")
        t += duration(video)
    print(f"\nTotal length: {stamp(t)}")
    if missing:
        print(f"Not found (skipped): chapters {', '.join(map(str, missing))}")


if __name__ == "__main__":
    main()
