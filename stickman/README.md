# Stickman video studio

HTML canvas stick-figure animations rendered to 1080x1920 (9:16) MP4s.

- `engine.js` – figure, poses, walk cycle, captions, speech bubbles, props
- `videos/*.js` – each video is plain data (scenes → actors → keyframes)
- `player.html?v=videos/demo.js` – live preview in a browser
- `render.mjs` – `node render.mjs videos/demo.js out/demo.mp4 30 [voiceover.mp3]`
