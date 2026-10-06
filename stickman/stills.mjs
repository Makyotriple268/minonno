// Usage: node stills.mjs videos/runner.js out/stills "2,8,14,..."  -> PNG per timestamp (fast preview)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const [src, outDir, times] = process.argv.slice(2), here = dirname(fileURLToPath(import.meta.url));
mkdirSync(outDir, { recursive: true });
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto(`file://${here}/player.html?render=1&v=${encodeURIComponent(src)}`); await p.waitForFunction('window.READY');
const [w, h] = await p.evaluate('window.PX'); await p.setViewportSize({ width: w, height: h });
for (const t of times.split(',').map(Number)) { await p.evaluate((t) => window.drawAt(t), t); await p.locator('#c').screenshot({ path: `${outDir}/t${t}.png` }); }
await b.close();
