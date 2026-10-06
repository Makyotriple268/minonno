// Usage: node render.mjs milk.js out/milk.mp4 [--fps 30] [--workers 4] [--from 0] [--to 99999] [--noaudio]
// Renders frames in parallel headless-Chromium workers (each frame is a pure function of time), encodes segments with ffmpeg,
// concatenates them, and mixes narration (placed on the timeline) with ducked background music.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2), src = args[0] || 'milk.js', out = resolve(args[1] || 'out/milk.mp4');
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const fps = +opt('fps', 30), workers = +opt('workers', 4), here = dirname(fileURLToPath(import.meta.url));
const tmp = join(dirname(out), '.parts'); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });

const browser = await chromium.launch({ args: ['--disable-gpu-vsync'] });
const url = `file://${here}/player.html?render=1&v=${encodeURIComponent(src)}`;
async function openPage() { const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } }); p.on('pageerror', (e) => console.error('PAGEERR', e.message)); await p.goto(url); await p.waitForFunction('window.READY', null, { timeout: 30000 }); return p; }
const probe = await openPage();
const total = await probe.evaluate('window.TOTAL'), audio = await probe.evaluate('window.TIMELINE.audio');
await probe.close();
const from = Math.floor(+opt('from', 0) * fps), to = Math.min(Math.round(total * fps), Math.floor(+opt('to', 1e9) * fps)), frames = to - from;
console.log(`total ${total.toFixed(1)}s, rendering frames ${from}..${to} (${frames}) on ${workers} workers`);

const per = Math.ceil(frames / workers), parts = [];
let done = 0; const t0 = Date.now();
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = from + w * per, b = Math.min(to, a + per); if (a >= b) return;
  const file = join(tmp, `part${String(w).padStart(2, '0')}.mp4`); parts[w] = file;
  const page = await openPage();
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(fps), file], { stdio: ['pipe', 'ignore', 'inherit'] });
  for (let i = a; i < b; i++) {
    const b64 = await page.evaluate((t) => { window.drawAt(t); return document.getElementById('c').toDataURL('image/jpeg', 0.93).slice(23); }, i / fps);
    if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
    if (++done % 600 === 0) console.log(`  ${done}/${frames}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r)); await page.close();
}));
await browser.close();

const list = join(tmp, 'list.txt'); writeFileSync(list, parts.filter(Boolean).map((p) => `file '${p}'`).join('\n'));
const silent = join(tmp, 'video.mp4'); execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);

if (args.includes('--noaudio')) { execFileSync('cp', [silent, out]); console.log('wrote', out); process.exit(0); }
// audio: narration clips delayed to their cue; music ducked under narration; loudness-normalised
const ad = join(here, 'audio'), inputs = [], filt = []; const dur = (to - from) / fps;
audio.forEach((c, i) => { inputs.push('-i', join(ad, c.file)); filt.push(`[${i + 1}:a]adelay=${Math.round((c.at - from / fps) * 1000)}|${Math.round((c.at - from / fps) * 1000)},volume=1.0[n${i}]`); });
const nIn = audio.length; inputs.push('-i', join(ad, 'music.mp3'));
filt.push(audio.map((_, i) => `[n${i}]`).join('') + `amix=inputs=${nIn}:normalize=0:dropout_transition=0,asplit=2[narr][sc]`);
filt.push(`[${nIn + 1}:a]atrim=start=${from / fps}:duration=${dur},asetpts=PTS-STARTPTS,volume=0.55,afade=t=in:d=3,afade=t=out:st=${Math.max(0, dur - 5)}:d=5[m]`);
filt.push(`[m][sc]sidechaincompress=threshold=0.015:ratio=10:attack=25:release=700:makeup=1[duck]`);
filt.push(`[narr][duck]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,atrim=duration=${dur}[aout]`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, ...inputs, '-filter_complex', filt.join(';'), '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], { stdio: 'inherit' });
console.log('wrote', out, `(${((Date.now() - t0) / 1000).toFixed(0)}s)`);
