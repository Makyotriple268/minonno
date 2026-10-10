# Doodle Explainer Video Maker

Makes narrated explainer videos in the doodle-cartoon style of channels like "What Did Ancient Humans Actually Do All Day?", from a topic and your own reusable art library.

1. **plan** - Gemini writes the script (calm narrator, talks to "you", hook, mystery, step-by-step reveal) and a storyboard: one shot every 2-4 seconds, each saying which background, character poses, items, label and ✓/✗ mark to show. It also writes YouTube titles, description, tags and a thumbnail idea, and gives you a checklist (with ready-to-paste image prompts) of any art your library doesn't have yet.
2. **You make the missing art** with any image tool and drop it into the library.
3. **render** - the narration is voiced with a free Microsoft voice, and each shot is assembled from your library with light animation: characters pop in and gently "breathe", items pop in one by one, ✓ and ✗ marks draw themselves, handwritten labels appear, and the camera zooms or shakes on dramatic lines. Output: a 1080p video, a thumbnail, and the YouTube text.

## Setup (once)

Same as the other tools: Python, ffmpeg, then in this folder:
```
pip install -r requirements.txt
```
and your Gemini key (`setx GEMINI_API_KEY "your-key"`, then open a new window).

## Make a video

Double-click **make_video.bat** (asks for the topic, a file name and the length), make the art on the checklist, then double-click **render_video.bat**. Or from Command Prompt:

```
python explainer.py plan "what did ancient humans do all day" -o videos\ancient.json --minutes 10
python explainer.py render videos\ancient.json
```

Use your own script instead of a topic: `python explainer.py plan --script myscript.txt -o videos\mine.json`

Check what a plan still needs at any time: `python explainer.py checklist videos\ancient.json`

## The library

```
library/
  characters/
    caveman/        idle.png, happy.png, shocked.png, thinking.png, ... (32 poses below)
    you/            idle.png, tired.png, ...
  backgrounds/      savanna.png, cave_night.png, office.png, ...   (16:9, no people)
  items/            campfire.png, spear.png, rock.png, clock.png, ... (one object each)
```

- Character and item images can have a **plain white** or transparent background; it's removed automatically.
- Make it once and reuse it. Each new video only needs the few items or backgrounds it introduces; the checklist tells you exactly which.
- **Keep characters consistent:** make `idle.png` first, then use it as a reference image when generating the other poses.
- **Don't put text in the images.** Labels like "SHELL BEADS" are added by the app in a handwritten font, so they're never misspelled.
- Anything missing is drawn as a simple placeholder, so you can render a preview before making any art.

**The 32 poses** (file names): idle, talking, happy, laughing, excited, proud, sad, crying, angry, annoyed, scared, shocked, confused, thinking, curious, tired, exhausted, sick, sleeping, bored, relaxed, pointing, shrug, arms_crossed, facepalm, celebrating, waving, walking, running, sitting, working, eating.

## Editing a plan

The `.json` from `plan` is the whole storyboard. Each shot has `narration`, a `layout` (`scene`, `card` or `split`), a `background`, `characters` (name, pose, position left/center/right), `items`, a `label`, a `mark` (none, check, cross, question, exclamation, arrow) and a `camera` (none, zoom_in, zoom_out, shake). For `split` shots, `left` and `right` each have a character, pose, item, label and mark. Change anything, then run `render` again.

## Render options

`--voice en-US-AndrewNeural` (any `edge-tts --list-voices` voice), `--rate -2%`, `--music bg.mp3`, `--music-volume 0.08`, `--no-flip` (don't mirror characters standing on the right).
