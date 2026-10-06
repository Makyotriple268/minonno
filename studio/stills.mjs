// node stills.mjs milk.js outdir "t1,t2,..."  — quick PNG previews
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs'; import { dirname } from 'node:path'; import { fileURLToPath } from 'node:url';
const [src, outDir, times] = process.argv.slice(2), here = dirname(fileURLToPath(import.meta.url));
mkdirSync(outDir, { recursive: true });
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('pageerror', (e) => console.error('PAGEERR', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
await p.goto(`file://${here}/player.html?render=1&v=${encodeURIComponent(src)}`); await p.waitForFunction('window.READY', null, { timeout: 15000 });
for (const t of times.split(',').map(Number)) { await p.evaluate((t) => window.drawAt(t), t); await p.locator('#c').screenshot({ path: `${outDir}/t${t}.png` }); }
console.log('total', await p.evaluate('window.TOTAL')); await b.close();
