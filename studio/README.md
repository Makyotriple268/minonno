# Studio — "Who Went First?" video engine

Flat-illustration motion graphics drawn on an HTML canvas (960x540 logical, rendered at 1920x1080),
narrated with ElevenLabs. Every frame is a pure function of time, so rendering is parallel and deterministic.

- `lib.js` – drawing helpers: sky/ridges, people, cattle & other animals, subtitles, callouts
- `props.js` – pots, cheese, DNA, lactose molecule, map, bars, donut, timeline…
- `framework.js` – builds the timeline from `data.js` (script + narration lengths); cues, panels, camera, subtitles
- `scenes_a.js`, `scenes_b.js` – one drawer per scene (`intro`, `s01`…`s13`)
- `audio/` – ElevenLabs narration (`sNN.mp3`) + background music
- `scripts/milk.json` – narration script
- `render.mjs` – `node render.mjs milk.js out/milk.mp4 [--workers 4]` (frames → x264, then narration + ducked music mix)
- `stills.mjs` – `node stills.mjs milk.js out/stills "10,60,120"` quick PNG previews
- `player.html?v=milk.js` – live preview in a browser

New episode: write a script JSON, generate narration clips into `audio/`, regenerate `data.js` (script + durations), add scene drawers.
