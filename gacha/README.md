# Gacha Story Video Maker

Makes Gacha Life / Gacha Club style story videos (GLMMs) from a one-line idea.

1. **write** - an AI (Gemini by default) turns your idea into a full script: cast, scenes, dialogue, expressions and effects. It also gives you a checklist of the character poses and backgrounds to make.
2. **render** - each line is voiced with a different free Microsoft voice per character. The video is then built to match: characters on a background, a dialogue box that types out in sync with the voice, and jumps, shakes and zooms for drama. Saved as a 1080p MP4.

## Setup (once)

1. Install **Python 3.10+** and **ffmpeg** (Windows: `winget install Gyan.FFmpeg`, Mac: `brew install ffmpeg`).
2. `pip install -r requirements.txt`
3. Get a free Gemini API key at https://aistudio.google.com/apikey and set it:
   - Windows (PowerShell): `setx GEMINI_API_KEY "your-key"`, then open a new terminal
   - Mac/Linux: `export GEMINI_API_KEY=your-key`

## Make a video

**1. Write the story**

```
python gacha_story.py write "the new girl is secretly a princess" -o princess.json
```

Options: `--minutes 8` (target length), or `--length short|medium|long` (about 2-3, 5-7 or 10-15 minutes), and `--style "funny, lots of plot twists"`.
This saves `princess.json` (the script; edit it freely) and `princess_checklist.txt` (what to make).

**2a. Let Gemini draw the art**

```
python gacha_story.py art princess.json
```

Gemini draws each character in Gacha style, then edits that same image for every expression so the character stays consistent, and paints a background for every location in the story. Delete any image you don't like and run `art` again to redraw just that one. Image generation uses Gemini's image model, which may not be free on your plan.

**2b. Or make the characters in Gacha Club yourself**

For each character on the checklist, build them in Gacha Club and export one image per pose:

```
characters/
  Luna/
    neutral.png
    happy.png
    sad.png
    ...
  Bella/
    neutral.png
    ...
backgrounds/
  classroom.png
  school hallway.png
```

- Pose names: `neutral, happy, sad, angry, shocked, smug, crying, blush`. A missing pose falls back to `neutral`.
- Images can be transparent or on a plain green screen or other flat colour. The background is removed automatically.
- Characters you've already made are reused: the next `write` is told about them, so recurring characters keep their names.

**3. Render**

```
python gacha_story.py render princess.json -o princess.mp4
```

Anything still missing is drawn as a simple placeholder, so you can preview a story before making any art.

Render options: `--music bg.mp3`, `--music-volume 0.10`, `--rate +5%` (speech speed), `--no-flip` (don't mirror characters on the right side to face the centre).

## Editing the script

In `princess.json`, each scene has a `background`, a `cast` (left-to-right stage order) and `lines`. Each line has:

- `speaker` - a character name, or `Narrator`
- `text` - what they say. Text in `*asterisks*` or `(brackets)` shows on screen but isn't read aloud.
- `expression` - one of the pose names above
- `effect` - `none`, `jump`, `shake` or `zoom`

To change a character's voice, set `"voice"` (and optionally `"pitch"`, e.g. `"+10Hz"`) on that character. See all voices with `edge-tts --list-voices`.

Use `--llm claude` with `ANTHROPIC_API_KEY` to have Claude write the story instead of Gemini.
