# Manhwa Recap Video Maker

Turns manhwa chapters (`.cbz`) into narrated 16:9 recap videos for YouTube.

1. Cuts the long webtoon strips into separate panels.
2. Claude reads the panels in order and writes recap narration.
3. edge-tts (free Microsoft voices) reads the narration aloud.
4. Each panel is shown over a blurred backdrop, with tall panels scrolling top to bottom, timed to the voice, and saved as an MP4.

## Setup (once)

1. Install **Python 3.10+** and **ffmpeg**, and make sure `ffmpeg` runs from a terminal.
   - Windows: `winget install Gyan.FFmpeg`
   - Mac: `brew install ffmpeg`
2. Install the Python packages:
   ```
   pip install -r requirements.txt
   ```
3. Get an Anthropic API key at https://console.anthropic.com and set it:
   - Windows (PowerShell): `setx ANTHROPIC_API_KEY "sk-ant-..."`, then open a new terminal
   - Mac/Linux: `export ANTHROPIC_API_KEY=sk-ant-...`

## Make a video

```
python manhwa_recap.py chapter1.cbz -o recap.mp4 --series "Solo Leveling"
```

Several chapters in one video (list them in reading order):

```
python manhwa_recap.py ch1.cbz ch2.cbz ch3.cbz -o recap_ch1-3.mp4 --series "Solo Leveling"
```

### Review the script before rendering

```
python manhwa_recap.py ch1.cbz -o recap.mp4 --script-only
```

This writes `recap_work/script.json`. Open it, fix names or wording, then run the same command without `--script-only`. The edited script is reused, so Claude isn't called again. Add `--rewrite` to have Claude write a fresh script.

### Options

| Option | What it does |
|---|---|
| `--series "Name"` | Gives Claude the series name for context |
| `--style "..."` | Extra narration instructions, e.g. `"more dramatic, call the MC 'our boy'"` |
| `--voice en-US-AndrewNeural` | Narrator voice. See all voices with `edge-tts --list-voices`. Good picks: `en-US-AndrewNeural`, `en-US-ChristopherNeural`, `en-US-BrianNeural`, `en-GB-RyanNeural` |
| `--rate +8%` | Speech speed |
| `--music bg.mp3` | Background music, looped under the voice |
| `--music-volume 0.12` | Music loudness (0-1) |
| `--fps 30` | Frame rate |

## Notes

- Everything is cached in the `<output>_work` folder next to the video, so a re-run after an error picks up where it stopped. Delete that folder to start over.
- If panels are cut badly for a series (e.g. art with large plain backgrounds), tweak `BLANK_STD`, `MIN_GUTTER` and `MIN_PANEL` at the top of `manhwa_recap.py`, delete `<output>_work/panels`, and re-run.
- Claude is sent each panel image, so cost grows with panel count. Expect very roughly $0.30–$1 per chapter.
