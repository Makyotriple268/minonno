Build a web app called "Manhwa Recap Studio" that turns manhwa chapters (.cbz files) into narrated 16:9 YouTube recap videos, entirely in the browser, using the Gemini API.

## What the user does

1. Uploads one or more .cbz files (chapters, in reading order) and types the series name.
2. Clicks "Make recap". The app shows progress for each step below.
3. Reviews and edits the script in an editor (optional), then clicks "Render".
4. Downloads the finished video. If it's longer than about 8 minutes, also offer it split into parts.

## Step 1: Cut the chapter into panels

- A .cbz is a zip of images. Unzip it with JSZip. Ignore non-images, `__MACOSX` and hidden files. Sort file names naturally (2 before 10).
- Webtoon pages are tall strips. Scale every page to 800 px wide and stitch them into one tall canvas.
- Find gutters: a row is "blank" if the standard deviation of its grayscale pixels is under 6. At least 25 blank rows in a row is a gap between panels.
- Merge any content run shorter than 120 px into its neighbour, so sound effects and slivers don't become their own panel.
- Cut any panel taller than 2.6× its width into equal chunks.
- Always cut at the edges of short pages (height under 1.5× width), such as credit pages and recruitment banners, even if there's no blank gap. Otherwise the credit page gets stuck to the first art panel.
- Save each panel as a JPEG and number them from 0.

## Step 2: Write the recap script with Gemini (vision)

Send the panels to Gemini (gemini-2.5-flash) in batches of 40 images. Before each image, send a text part "Panel N:"; when a new chapter starts, send a text part "--- Chapter name ---". Use structured JSON output.

System prompt:

"You write narration for YouTube manhwa recap videos. You will be shown numbered panels from a manhwa, in reading order. Write the voiceover a recap channel would use: third person, present tense, energetic and easy to follow, retelling the plot so a viewer understands what happens without reading it. Translate dialogue into narration rather than quoting every speech bubble, but keep short quotes when a line lands hard. Use character names once they are known; until then describe characters by appearance or role and stay consistent.

Group consecutive panels into beats. Each beat is one to three sentences of narration covering the panels shown while it is read. Every beat lists its panel numbers in ascending order, beats never overlap, and together they cover the panels in order. Leave out panels that carry no story (credits, translator notes, title logos, recruitment banners, blank or pure sound-effect panels) by not listing them.

The narration is voiced first and the video then cuts to each panel on the exact word you mark. Inside each beat's narration, put a marker like [12] right before the words that go with panel 12. The narration starts with a marker, every panel in the beat appears exactly once as a marker, in ascending order, and markers sit only between words. Give each panel at least a few words so it stays on screen long enough to see.

Also return updated notes: a short running summary of the story so far plus the characters and their names. These notes are handed back to you with the next batch of panels so the narration stays consistent."

JSON schema: `{ beats: [{ panels: number[], narration: string }], notes: string }`.

- The first batch's text says "Series: X. This is the start of the recap." Every later batch includes "Story notes so far: <notes from the previous batch>". The last batch adds "This is the final batch, so end the last beat with a hook for the next chapter."
- Carry the notes across chapters too, so names stay consistent from video to video. Let the user paste in notes from earlier chapters (see "Story so far" below).
- Validate the result. Drop panel numbers that aren't in the batch, and remove markers like [n] for panels not in that beat.
- The script editor shows each beat's text with its markers. The user can edit the text or move markers.

## Step 3: Voice

Use Gemini text-to-speech (gemini-2.5-flash-preview-tts, voice "Charon" or let the user pick) once per beat, with the markers removed from the text. It returns 24 kHz 16-bit mono PCM; wrap it in a WAV header. Add 0.35 s of silence after each beat.

Panel timing inside a beat: Gemini TTS gives no word timestamps, so estimate. Each panel starts at (characters of text before its marker ÷ total characters) × the beat's audio length. Give every panel at least 1.2 s; if that pushes past the beat's length, scale all of the beat's panels down to fit.

## Step 4: Render the video (1920×1080, 30 fps)

For each panel, for its time on screen:
- **Backdrop:** the same panel scaled to cover 1920×1080, Gaussian blur of 40 px, darkened to 45% brightness.
- **Foreground:** scale = min(1300 / width, 1080 / height). If that makes the panel narrower than 1000 px, use scale = 1000 / width instead (tall panels stay readable).
- No scrolling or drifting (fast motion makes some viewers feel sick). If the foreground is taller than 1080, split its time into still screen-sized views from top to bottom (evenly spaced, overlapping), each shown for at least 1.2 s, with a 0.35 s cross-fade between views. If there isn't time for two views, shrink the whole panel to fit the screen height and show it still. Otherwise centre it.
- Hard cuts between panels.

Encode with WebCodecs (VideoEncoder H.264 + AudioEncoder AAC) and the mp4-muxer library, so it renders faster than real time to an MP4. Fall back to MediaRecorder (WebM) only if WebCodecs isn't available. Keep the video and audio lengths exactly equal: add up the frame counts from the cumulative times, never per panel, or rounding drifts.

Splitting: if the user wants parts, cut only at beat boundaries so a sentence is never split.

## Step 5: YouTube package (optional button)

Ask Gemini for 3 titles under 100 characters, a description with a hook paragraph, timestamps for the start of each chapter (computed from the real audio lengths, first one 0:00), a credit line for the original creators, and about 20 tags under 500 characters in total.

Thumbnail: 1280×720. Split diagonally between two striking panels the user picks. Use one or two words of huge bold text with a thick black outline, plus a small red "CH x-y" badge. Keep the words to a minimum.

## Settings to expose

Series name, extra style instructions (e.g. "more dramatic"), TTS voice, speech speed, optional background music file and its volume (default 0.12), Gemini model names.

## Story so far: Damn Reincarnation, chapters 1–20 (paste as the starting notes)

Hamel ("Hamel the Foolish") was the swordsman of the Hero's party 300 years ago: Vermouth the Great (the Hero), Sienna the Wise (mage, called Senya in some translations), Anise the Faithful (saint), and Molon the Brave (barbarian, translated as "Moron"). Hamel died in the castle of the Demon King of Incarceration protecting Vermouth. Afterwards, Vermouth made a pact with that Demon King that ended the war, but two Demon Kings still live.

Hamel is reborn with his memories as Eugene Lionhart, 13, a branch-family descendant of Vermouth from the town of Gidol. His father is Gerhard Lionhart (spelled Jehard in some translations). At the Lionhart main estate:
- Patriarch: Gilead Lionhart (Guillard/Gillade). His brother Gion Lionhart has six Stars and teaches Eugene.
- First wife: Tanis (Theonis/Theoness), mother of Iode, the eldest son, who loves magic.
- Second wife: Annisilla, mother of the twins Cyan (Cian) and Ciel.
- Others: Eugene's maid Nina; the twins' instructor Hezar (Zehar); branch kids Gargis (muscle-obsessed) and Desira (spear user); Lovellian, Master of the Red Tower of Aroth.

Eugene beat Cyan and Desira in duels and won the Blood Succession Ritual, a labyrinth illusion made by Lovellian, by killing the boss minotaur alone. From the treasure vault he took Hamel's old necklace (it shouldn't be there; its mana memory was tampered with) and the Stormblade Winith. The Patriarch adopted him, and Gerhard moved to the estate. Iode left for Aroth with Lovellian. Gion taught Eugene the main family's White Flame Formula; Eugene formed his first Star almost instantly (Vermouth had ten Stars). When he channelled mana into Winith, the Wind Spirit King Tempest appeared and asked: "Are you... really Hamel?" Chapter 21 picks up from there.

Use these names in narration: Gerhard, Gilead, Tanis, Annisilla, Cyan, Ciel, Iode, Sienna, Molon.
