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

## Weapons

Ten Valorant guns, each with its fire rate, magazine, reload time, damage falloff, first-shot spread, spray error and a recoil pattern. Pick one in the Loadout panel, or switch mid-drill with `1`–`0`.

| # | Gun | Type | Fire rate | Mag | Head / body / legs |
| --- | --- | --- | --- | --- | --- |
| 1 | Classic | Sidearm, semi | 6.75/s | 12 | 78 / 26 / 22 |
| 2 | Ghost | Sidearm, semi, suppressed | 6.75/s | 15 | 105 / 30 / 25 |
| 3 | Sheriff | Sidearm, semi | 4/s | 6 | 159 / 55 / 46 |
| 4 | Spectre | SMG, auto, suppressed | 13.33/s | 30 | 78 / 26 / 22 |
| 5 | Bulldog | Rifle, auto | 9.15/s | 24 | 116 / 35 / 30 |
| 6 | Phantom | Rifle, auto, suppressed | 11/s | 30 | 156 / 39 / 33 (falls off) |
| 7 | Vandal | Rifle, auto | 9.75/s | 25 | 160 / 40 / 34 |
| 8 | Guardian | Rifle, semi | 5.25/s | 12 | 195 / 65 / 49 |
| 9 | Marshal | Sniper, 3.5× scope | 1.5/s | 5 | 202 / 101 / 85 |
| 0 | Operator | Sniper, 2.5× scope | 0.6/s | 5 | 255 / 150 / 127 |

- **Recoil** kicks the view up for the first shots of a spray, then drifts sideways in a repeatable pattern. Pull down to control it. The spray resets once you stop firing for the weapon's recovery time.
- **Zoom** (`Mouse 2`): rifles and the Spectre zoom in and get tighter spread. The Marshal and Operator show a full scope and have perfect accuracy only when scoped. Scoped sensitivity scales with the zoom, times the "Scoped multiplier" setting.
- Holding fire sprays with automatic guns. Semi-automatic guns fire once per click, capped at their fire rate.
- Bullet holes stay on the walls for a few seconds, so you can see your spray pattern.
- The gun model on screen shows recoil kick, muzzle flash, reloading and weapon switches. Each gun has its own synthesized gunshot sound.
- Stats are approximations of the live game.

## Drills

| Drill | Trains | Scoring |
| --- | --- | --- |
| Gridshot | Speed | 3 targets on a 5×5 grid, 100 pts per kill |
| Spidershot | Flicks | Alternates a centre target with a wide flick |
| Microshot | Precision | Head-sized target at 14 m |
| Reflex | Reaction | Pop-ups last 750 ms; faster hits score more |
| Spray Control | Recoil | Spray into a 10-ring bullseye board 10 m away; each bullet scores its ring |
| Strafe Track | Tracking | Time with the crosshair on a strafing target |
| Headshot Bots | Crosshair placement | Bots move A-D and stop like players, have 150 HP and take your gun's real damage |

For target drills, final score = points × (0.5 + 0.5 × accuracy).

## Sensitivity matching

- Valorant turns **0.07° per mouse count** at sens 1. The trainer uses the same formula: `yaw += movementX × sens × 0.07°`.
- **Raw mode** captures the mouse with pointer lock and requests `unadjustedMovement` (raw input) when the browser supports it. For the closest match on Windows, set pointer speed to 6/11 with "Enhance pointer precision" turned off.
- **FOV** is 103° horizontal at 16:9, the same as Valorant.
- The menu shows eDPI and cm/360°. It can also convert a CS2/Apex sens (÷ 3.1818) or an Overwatch 2 sens (÷ 10.6).
- **Cursor / touch mode** keeps the camera still so you aim with the pointer. It works on phones and trackpads.

## Other features

- A Valorant-style crosshair editor with the in-game colour presets, inner lines, center dot, and outline
- Score history and personal bests for each drill, saved in `localStorage`
- Controls: `Mouse 1` fire, `Mouse 2` zoom, `R` reload, `1`–`0` switch gun, `Esc` pause, `Backspace` restart, `Space` play again

Fan-made practice tool. Not affiliated with or endorsed by Riot Games.
