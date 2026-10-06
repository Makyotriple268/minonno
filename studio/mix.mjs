// Usage: node mix.mjs out/milk_video.mp4 out/milk.mp4  — mixes narration (placed from DATA) + ducked music into a silent render
import { execFileSync } from 'node:child_process'; import { readFileSync } from 'node:fs'; import { join, dirname, resolve } from 'node:path'; import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), [vid, out] = process.argv.slice(2).map((p) => resolve(p));
const DATA = JSON.parse(readFileSync(join(here, 'data.js'), 'utf8').replace(/^window\.DATA=/, '').replace(/;$/, ''));
const LEAD = 0.55, TAIL = 0.85, INTRO = 4.0; let T = INTRO; const cues = [];
for (const s of DATA.scenes) { cues.push({ file: `${s.id}.mp3`, at: T + LEAD }); T += LEAD + s.audio + TAIL + (s.id === 's13' ? 6 : 0); }
const dur = T, inputs = [], f = [];
cues.forEach((c, i) => { inputs.push('-i', join(here, 'audio', c.file)); const ms = Math.round(c.at * 1000); f.push(`[${i + 1}:a]adelay=${ms}|${ms}[n${i}]`); });
const n = cues.length; inputs.push('-i', join(here, 'audio', 'music.mp3'));
f.push(cues.map((_, i) => `[n${i}]`).join('') + `amix=inputs=${n}:normalize=0:dropout_transition=0,asplit=2[narr][sc]`);
f.push(`[${n + 1}:a]atrim=duration=${dur},asetpts=PTS-STARTPTS,volume=0.5,afade=t=in:d=3,afade=t=out:st=${dur - 6}:d=6[m]`);
f.push(`[m][sc]sidechaincompress=threshold=0.015:ratio=10:attack=25:release=700:makeup=1[duck]`);
f.push(`[narr][duck]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,atrim=duration=${dur}[aout]`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', vid, ...inputs, '-filter_complex', f.join(';'), '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], { stdio: 'inherit' });
console.log('wrote', out, dur.toFixed(1) + 's');
