# Range Protocol: aim trainer for Valorant players

A browser-based 3D aim trainer. It is a single static file (`index.html`) with no build step and no dependencies, so you can host it anywhere (GitHub Pages, Netlify, or any static server) or just open it locally.

## Run it

```bash
# any static server works
npx serve aim-trainer
# or
python3 -m http.server -d aim-trainer 8080
```

To host it on GitHub Pages, go to **Settings → Pages**, deploy from this branch, and open `/aim-trainer/`.

## Drills

| Drill | Trains | Scoring |
| --- | --- | --- |
| Gridshot | Speed | 3 targets on a 5×5 grid, 100 pts per kill |
| Spidershot | Flicks | Alternates a centre target with a wide flick |
| Microshot | Precision | Head-sized target at 14 m |
| Reflex | Reaction | Pop-ups last 750 ms; faster hits score more |
| Strafe Track | Tracking | Time with the crosshair on a strafing target |
| Headshot Bots | Crosshair placement | Bots move A-D and stop like players. Head = 160 dmg (one tap), body = 40, legs = 34, bots have 150 HP |

For clicking drills, final score = points × (0.5 + 0.5 × accuracy).

## Sensitivity matching

- Valorant turns **0.07° per mouse count** at sens 1. The trainer uses the same formula: `yaw += movementX × sens × 0.07°`.
- **Raw mode** captures the mouse with pointer lock and requests `unadjustedMovement` (raw input) when the browser supports it. For the closest match on Windows, set pointer speed to 6/11 with "Enhance pointer precision" turned off.
- **FOV** is 103° horizontal at 16:9, the same as Valorant.
- The menu shows eDPI and cm/360°. It can also convert a CS2/Apex sens (÷ 3.1818) or an Overwatch 2 sens (÷ 10.6).
- **Cursor / touch mode** keeps the camera still so you aim with the pointer. It works on phones and trackpads.

## Other features

- A Valorant-style crosshair editor with the in-game colour presets, inner lines, center dot, and outline
- Score history and personal bests for each drill, saved in `localStorage`
- Controls: `Esc` pauses, `R` restarts, `Space` plays again

Fan-made practice tool. Not affiliated with or endorsed by Riot Games.
