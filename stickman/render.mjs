// Usage: node render.mjs videos/demo.js out/demo.mp4 [fps]
// Steps the animation frame by frame in headless Chromium (deterministic), then encodes with ffmpeg.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [src = 'videos/demo.js', out = 'out/demo.mp4', fpsArg = '30', audio] = process.argv.slice(2);
const fps = +fpsArg, here = dirname(fileURLToPath(import.meta.url));
mkdirSync(dirname(resolve(out)), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(`file://${here}/player.html?render=1&v=${encodeURIComponent(src)}`);
await page.waitForFunction('window.READY');
const total = await page.evaluate('window.TOTAL');
const frames = Math.round(total * fps);

const args = ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
  ...(audio ? ['-i', audio, '-shortest', '-c:a', 'aac'] : []),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', resolve(out)];
const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'inherit'] });
const canvas = page.locator('#c');
for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => window.drawAt(t), i / fps);
  const buf = await canvas.screenshot({ type: 'jpeg', quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % 60 === 0) console.log(`frame ${i}/${frames}`);
}
ff.stdin.end(); await new Promise((r) => ff.on('close', r));
await browser.close();
console.log('wrote', out);
