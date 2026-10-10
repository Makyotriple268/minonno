# Run the recap maker on your Windows PC (free)

Everything here is free: Gemini's free tier writes the scripts, the Microsoft "Andrew" voice reads them, and ffmpeg makes the video.

## One-time setup

1. **Install Python.** Open the Start menu, type `cmd`, open Command Prompt and run:
   ```
   winget install Python.Python.3.12
   ```
   (Or download it from python.org and tick **"Add python.exe to PATH"** in the installer.)
2. **Install ffmpeg** in the same window:
   ```
   winget install Gyan.FFmpeg
   ```
3. **Download this project.** On GitHub, open the repository, switch to branch `claude/wizardly-franklin-vmrx8x`, click the green **Code** button, then **Download ZIP**. Unzip it somewhere, for example `Documents\minonno`.
4. **Install the Python packages.** Close Command Prompt and open a new one, so it sees Python and ffmpeg. Then run:
   ```
   cd %USERPROFILE%\Documents\minonno\recap
   pip install -r requirements.txt
   ```
5. **Save your Gemini key** (from https://aistudio.google.com/apikey):
   ```
   setx GEMINI_API_KEY "paste-your-key-here"
   ```
   Close the window afterwards; the key only works in new windows.

6. **Optional: Claude as a backup.** If you also have an Anthropic API key (from https://console.anthropic.com), save it too:
   ```
   setx ANTHROPIC_API_KEY "paste-your-anthropic-key-here"
   ```
   Then when Gemini's free daily limit runs out, Claude writes the rest of the scripts instead of the run stopping. Claude is paid per use; I'd guess very roughly $0.30-1 per chapter, so check your Anthropic console. Without this key, the run simply stops at the limit as before.

## Add your chapters

Open your Google Drive folder, select the chapters you want (for example Chapter 21 to Chapter 40), and click **Download**. Drive gives you a zip; unzip it and put the `.cbz` files in a folder called `chapters` inside the `recap` folder:

```
recap\
  chapters\
    Chapter 21.cbz
    Chapter 22.cbz
    ...
  run_all.bat
  story_so_far.txt
```

Keep the names exactly as Drive has them: `Chapter 21.cbz`.

## Make the videos

Double-click **`run_all.bat`**. It goes through Chapter 21 to 81 one by one and saves each video in the `videos` folder. Each chapter takes a few minutes.

- **It remembers the story.** `story_so_far.txt` starts with everything up to Chapter 20 and is updated after every chapter, so names and plot stay consistent.
- **Safe to stop and restart.** Close the window any time. Next time, finished chapters are skipped.
- **If Gemini's free limit runs out,** it waits and retries. If the daily limit is used up, it switches to Claude if you saved an Anthropic key (step 6). Otherwise it stops; run it again the next day.
- **To change the range,** open `run_all.bat` in Notepad and edit `FIRST` and `LAST`. To do another series, also change `SERIES`, and replace `story_so_far.txt` with an empty file.

## Uploading to YouTube

Each chapter is a full 1080p video. To make one long video, put them in order in CapCut and export.
