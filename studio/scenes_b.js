// Scenes 6..13
(function () {
  const S = window.Studio, F = window.Framework, { W, H, TAU, clamp, lerp, prog, E, person, cow, text, circle, ell, rr, line, callout, bigStat } = S;
  const { panel, camera, pasture } = F; const D = window.SC;
  const dark = (ctx, a = '#0e1b33', b = '#1b3358') => { ctx.fillStyle = S.grad(ctx, 0, 0, W, H, [[0, a], [1, b]]); ctx.fillRect(0, 0, W, H); };
  const chip = (ctx, label, x, y, t0, t, o = {}) => callout(ctx, label, x, y, t0, t, o);
  function reindeer(ctx, o) { const s = o.s || 1, dir = o.dir || 1, ph = o.walk ?? 0, sw = Math.sin(ph); ctx.save(); ctx.translate(o.x, o.y); ctx.scale(s * dir, s); S.shadow(ctx, 0, 0, 56, 0.2); const c = '#a58b72';
    [[34, 1], [22, -1], [-34, -1], [-22, 1]].forEach(([lx, p], i) => line(ctx, [[lx, -50], [lx + sw * 14 * p * (i < 2 ? 1 : -1), -4]], i % 2 ? S.shade(c, -22) : c, 8));
    rr(ctx, -50, -92, 100, 46, 22); ctx.fillStyle = c; ctx.fill(); ctx.fillStyle = '#efe6d8'; ctx.beginPath(); ctx.ellipse(34, -62, 14, 20, 0.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = c; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(40, -80); ctx.lineTo(60, -112); ctx.stroke(); ell(ctx, 68, -116, 14, 10, c, 0.4); circle(ctx, 72, -121, 2.2, '#111'); circle(ctx, 80, -112, 3, '#222');
    ctx.strokeStyle = '#d8c8a8'; ctx.lineWidth = 4; [[0, 0], [10, -4]].forEach(([dx]) => { ctx.beginPath(); ctx.moveTo(60 + dx, -122); ctx.lineTo(54 + dx, -150); ctx.lineTo(44 + dx, -166); ctx.moveTo(54 + dx, -150); ctx.lineTo(66 + dx, -164); ctx.moveTo(57 + dx, -136); ctx.lineTo(70 + dx, -142); ctx.stroke(); });
    ctx.restore(); }
  function yak(ctx, o) { cow(ctx, Object.assign({}, o, { kind: 'yak' })); }

  D.s06 = (ctx, t, env) => {
    const cB = env.cue('And in what is now Poland', 12), cC = env.cue('That matters', 22), cD = env.cue('So our ancestors', 29);
    panel(ctx, t, 0, cB - 0.4, (lt) => {
      ctx.fillStyle = S.grad(ctx, 0, 0, 0, H, [[0, '#e9d7b3'], [0.6, '#d9bf90'], [1, '#a98655']]); ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 4; i++) { ctx.fillStyle = `rgba(110,80,40,${0.08 + i * 0.05})`; ctx.fillRect(0, 380 + i * 34, W, 34); }
      const pp = E.out(prog(lt, 0.2, 1)); S.pot(ctx, 250, 420, 2.3 * pp, {}); const mx = 640, my = 230;
      if (lt > 2) { const m = E.back(prog(lt, 2, 2.7)); ctx.save(); ctx.translate(mx, my); ctx.scale(m, m); ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 118, 0, TAU); ctx.clip(); ctx.fillStyle = '#b8673a'; ctx.fillRect(-120, -120, 240, 240); const R = S.rng(5); for (let i = 0; i < 26; i++) { const a = R() * TAU, r = R() * 100, wob = Math.sin(t * 2 + i) * 3; ctx.fillStyle = 'rgba(255,240,170,.9)'; ctx.beginPath(); ctx.ellipse(Math.cos(a) * r + wob, Math.sin(a) * r, 9 + R() * 8, 6 + R() * 5, R() * 3, 0, TAU); ctx.fill(); } ctx.restore(); ctx.strokeStyle = '#6b4a35'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(0, 0, 118, 0, TAU); ctx.stroke(); line(ctx, [[84, 84], [150, 150]], '#6b4a35', 16); ctx.restore(); callout(ctx, 'milk fat residue', mx, my + 150, 2.8, lt, { size: 24 }); }
      bigStat(ctx, '≈ 9,000', 'years old', 250, 130, 0.8, lt, { size: 62, color: '#4a2f1f', sub: 22, subColor: '#6b4a35' });
    }, 0.5);
    panel(ctx, t, cB - 0.2, cC - 0.4, (lt) => {
      const v = [18, 50, 14]; S.map(ctx, v); S.pin(ctx, 18.5, 53, v, 'Poland (Kuyavia)', 0.4, lt, { dy: -46 });
      ctx.save(); const p = E.back(prog(lt, 1.2, 1.9)); ctx.translate(250, 300); ctx.scale(p, p); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.arc(0, 0, 130, 0, TAU); ctx.fill(); S.pot(ctx, 0, 70, 1.6, { holes: true }); ctx.restore();
      bigStat(ctx, '≈ 7,000', 'years old · full of tiny holes', 700, 110, 1.6, lt, { size: 58 }); callout(ctx, 'a cheese strainer?', 250, 150, 2.4, lt, { size: 24, bg: '#ffecb3', color: '#5a3a10' });
    }, 0.5);
    panel(ctx, t, cC - 0.2, cD - 0.4, (lt) => {
      dark(ctx, '#2b1d14', '#4a3222'); text(ctx, 'LACTOSE CONTENT (approx.)', W / 2, 70, { size: 28, weight: 900, color: '#ffe3b0' });
      S.glass(ctx, 110, 235, 1.2, 1); S.jar(ctx, 110, 295, 1.0, 0.9); S.cheese(ctx, 110, 385, 1.0);
      S.bars(ctx, 190, 120, 700, 270, [{ label: 'Fresh milk', v: 1, color: '#fff7e6', txt: 'MOST' }, { label: 'Yogurt', v: 0.62, color: '#ffe0a3', txt: 'LESS' }, { label: 'Hard cheese', v: 0.07, color: '#ffc857', txt: 'TINY' }], lt, 0.6);
    }, 0.5);
    panel(ctx, t, cD - 0.2, 99, (lt) => {
      ctx.fillStyle = S.grad(ctx, 0, 0, 0, H, [[0, '#f6ead3'], [1, '#e2c997']]); ctx.fillRect(0, 0, W, H);
      const a = E.back(prog(lt, 0.3, 1)), b = E.back(prog(lt, 2, 2.8));
      ctx.save(); ctx.globalAlpha = clamp(a); S.cheese(ctx, 190, 360, 2.1 * a); S.jar(ctx, 320, 360, 1.7 * a); ctx.restore(); text(ctx, 'EAT dairy first', 260, 420 - 0, { size: 28, weight: 900, color: '#5a3a24', alpha: clamp(a) });
      S.arrowPath(ctx, [[400, 280], [520, 250], [640, 280]], E.out(prog(lt, 1.0, 2.4)), '#8a5a3b', 7); text(ctx, 'thousands of years', 520, 225, { size: 24, weight: 800, color: '#5a3a24', alpha: E.out(prog(lt, 1.2, 2)) });
      ctx.save(); ctx.globalAlpha = clamp(b); S.glass(ctx, 760, 360, 2.1 * b, 1); ctx.restore(); text(ctx, 'then DRINK milk', 760, 420, { size: 28, weight: 900, color: '#5a3a24', alpha: clamp(b) });
    }, 0.5);
    S.vignette(ctx);
  };

  D.s07 = (ctx, t, env) => {
    const cGene = env.cue('a tiny change', 5), cKeep = env.cue('It told the body', 11), cAdv = env.cue('And for a farming family', 18), cSurv = env.cue('People with the change', 28), cGen = env.cue('Generation by generation', 33);
    dark(ctx, '#0b1230', '#1a2a5e'); S.stars(ctx, t, 50, 21);
    panel(ctx, t, 0, cKeep - 0.4, (lt) => { const p = E.out(prog(lt, 0.2, 1.2)); ctx.save(); ctx.globalAlpha = p; S.dna(ctx, W / 2, 230, 820, 150, t, { n: 34, hi: lt > cGene - 0.0 ? 17 : -1 }); ctx.restore(); text(ctx, 'THE LCT GENE', W / 2, 90, { size: 34, weight: 900, color: '#bcd0ff', alpha: p }); if (lt > cGene) { callout(ctx, 'one tiny change', W / 2, 365, cGene + 0.2, lt, { size: 30, bg: '#ffd54a', color: '#1b1b1b' }); } if (lt > 0.4) text(ctx, 'a single gene', W / 2, 135, { size: 22, weight: 700, color: '#8fa5e6', alpha: E.out(prog(lt, 0.6, 1.4)) }); }, 0.5);
    panel(ctx, t, cKeep - 0.2, cAdv - 0.4, (lt) => {
      [[250, 'most adults', 0.06, '#ff6b6b'], [700, 'lactase persistence', 1, '#6be3b0']].forEach(([x, label, v, col], i) => { const p = E.out(prog(lt, 0.3 + i * 0.5, 1.2 + i * 0.5)); ctx.save(); ctx.globalAlpha = p; person(ctx, { x, y: 390, s: 1.35, t, face: i ? 'grin' : 'worry', cloth: i ? '#e8c872' : '#9aa7c8', armR: i ? [140, 20] : undefined });
        if (i) { ctx.fillStyle = S.radial(ctx, x, 300, 10, 130, [[0, 'rgba(107,227,176,.35)'], [1, 'rgba(107,227,176,0)']]); ctx.fillRect(x - 130, 170, 260, 260); }
        ctx.fillStyle = 'rgba(255,255,255,.14)'; rr(ctx, x - 130, 130, 260, 26, 13); ctx.fill(); ctx.fillStyle = col; rr(ctx, x - 130, 130, Math.max(12, 260 * v * E.out(prog(lt, 0.9 + i * 0.5, 2 + i * 0.5))), 26, 13); ctx.fill(); text(ctx, 'lactase after childhood', x, 120, { size: 17, weight: 700, color: '#cdd8ff' }); text(ctx, label, x, 430, { size: 24, weight: 900, color: col }); ctx.restore(); });
    }, 0.5);
    panel(ctx, t, cAdv - 0.2, cSurv - 0.4, (lt) => {
      text(ctx, 'A HUGE ADVANTAGE', W / 2, 80, { size: 36, weight: 900, color: '#ffd54a', alpha: E.out(prog(lt, 0, 0.6)) });
      [['extra calories', '🔥', '#ff9f43'], ['clean liquid', '💧', '#4fc3f7'], ['food on four legs', '🐄', '#c5e1a5']].forEach(([lab, ic, col], i) => { const p = E.back(prog(lt, 0.6 + i * 1.6, 1.2 + i * 1.6)); if (p <= 0) return; ctx.save(); ctx.translate(180 + i * 300, 240); ctx.scale(p, p); ctx.fillStyle = 'rgba(255,255,255,.1)'; rr(ctx, -120, -110, 240, 230, 24); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke(); ctx.font = '84px serif'; ctx.textAlign = 'center'; ctx.fillText(ic, 0, 15); text(ctx, lab, 0, 85, { size: 24, weight: 800, color: '#fff' }); ctx.restore(); });
    }, 0.5);
    panel(ctx, t, cSurv - 0.2, 99, (lt) => {
      const gens = prog(lt, 0.5, 8); const cols = 14, rows = 5; const R = S.rng(31); const order = []; for (let i = 0; i < cols * rows; i++) order.push([R(), i]); order.sort((a, b) => a[0] - b[0]);
      const frac = E.io(gens) * 0.85 + 0.03;
      for (let i = 0; i < cols * rows; i++) { const x = 100 + (i % cols) * 56, y = 130 + Math.floor(i / cols) * 58, rank = order.findIndex((o) => o[1] === i) / (cols * rows), gold = rank < frac; ctx.save(); ctx.translate(x, y); const pop = 1 + (gold ? 0.12 : 0); circle(ctx, 0, -8, 10 * pop, gold ? '#ffd54a' : '#7f8fb8'); rr(ctx, -9 * pop, 2, 18 * pop, 24, 7); ctx.fillStyle = gold ? '#ffb300' : '#6a7aa6'; ctx.fill(); if (gold) { ctx.globalAlpha = 0.25; circle(ctx, 0, 6, 26, '#ffd54a'); } ctx.restore(); }
      text(ctx, 'generation ' + Math.max(1, Math.round(gens * 120)), W / 2, 90, { size: 30, weight: 900, color: '#fff' });
      ctx.save(); ctx.translate(W / 2, 420); text(ctx, Math.round(frac * 100) + '% carry the gene', 0, 0, { size: 28, weight: 800, color: '#ffd54a' }); ctx.restore();
    }, 0.5);
    S.vignette(ctx);
  };

  D.s08 = (ctx, t, env) => {
    const cOnce = env.cue("it didn't happen", 0.5), cEA = env.cue('East Africa', 9), cME = env.cue('Middle East', 10.5), cFarm = env.cue('It is one of', 14);
    const v = [30, 30, 5.2]; S.map(ctx, v);
    S.spread(ctx, 14, 49, v, 1, t, { r: 120, dur: 2, color: 'rgba(255,213,74,.5)' }); S.pin(ctx, 14, 49, v, 'Europe', 1.0, t, { color: '#ffd54a' });
    S.spread(ctx, 37, 3, v, cEA, t, { r: 110, dur: 2, color: 'rgba(107,227,176,.5)' }); S.pin(ctx, 37, 3, v, 'East Africa', cEA, t, { color: '#6be3b0' });
    S.spread(ctx, 45, 27, v, cME, t, { r: 110, dur: 2, color: 'rgba(255,122,182,.5)' }); S.pin(ctx, 45, 27, v, 'Middle East', cME, t, { color: '#ff7ab6' });
    callout(ctx, 'evolved separately — 3 different changes', W / 2, 50, cOnce + 1.2, t, { size: 26, bg: '#0d1b2a', color: '#fff' });
    if (t > cFarm) { const p = E.out(prog(t, cFarm, cFarm + 0.8)); ctx.save(); ctx.globalAlpha = p; ctx.fillStyle = 'rgba(10,16,30,.72)'; rr(ctx, 160, 380, 640, 56, 14); ctx.fill(); text(ctx, 'farming → dairy → evolution', W / 2, 418, { size: 30, weight: 900, color: '#ffd54a' }); ctx.restore(); }
    S.vignette(ctx);
  };

  D.s09 = (ctx, t, env) => {
    const cs = [0, env.cue('Horses', 12), env.cue('Camels', 20), env.cue('Yaks', 24), env.cue('Even reindeer', 28), env.cue('Wherever humans', 33)];
    const seg = (i) => [cs[i] - (i ? 0.2 : 0), (cs[i + 1] ?? 99) - 0.4];
    panel(ctx, t, ...seg(0), (lt) => { pasture(ctx, t, { sky: 'day', sun: true, off: t * 5 }); S.goat(ctx, { x: 230, y: 462, s: 1.9, t }); S.goat(ctx, { x: 470, y: 466, s: 1.9, t, kind: 'sheep', dir: -1 }); S.hut(ctx, 880, 440, 0.9); cow(ctx, { x: 730, y: 458, s: 0.95, t, dir: -1, graze: 0.3 }); chip(ctx, 'Sheep & goats · 10,000+ years ago', 480, 90, 0.4, lt, { size: 24 }); }, 0.5);
    panel(ctx, t, ...seg(1), (lt) => { pasture(ctx, t, { sky: 'warm', pal: ['#c9c28a', '#b4ae6e', '#9b9657'], off: t * 40 }); S.horse(ctx, { x: lerp(-80, 560, E.out(prog(lt, 0, 3))), y: 462, s: 1.5, walk: t * 7 }); chip(ctx, 'Horses · Kazakhstan · ~5,500 years ago', 480, 90, 0.4, lt, { size: 24 }); }, 0.5);
    panel(ctx, t, ...seg(2), (lt) => { S.sky(ctx, 'warm'); S.sun(ctx, 760, 110, 50, t, '#fff0b0'); S.ridge(ctx, { y: 380, amp: 18, freq: 0.006, color: '#e0b36a', off: t * 4 }); S.ridge(ctx, { y: 430, amp: 14, freq: 0.01, ph: 3, color: '#d09f55', off: t * 10 }); S.camel(ctx, { x: lerp(1040, 480, E.out(prog(lt, 0, 3.4))), y: 462, s: 1.6, walk: t * 5, dir: -1 }); chip(ctx, 'Camels · the desert', 480, 90, 0.4, lt, { size: 24 }); }, 0.5);
    panel(ctx, t, ...seg(3), (lt) => { S.sky(ctx, 'day'); S.ridge(ctx, { y: 250, amp: 60, freq: 0.008, ph: 1, color: '#9fb4c8', off: 0 }); S.ridge(ctx, { y: 310, amp: 50, freq: 0.01, ph: 4, color: '#c9d6e3', off: 0 }); S.ridge(ctx, { y: 430, amp: 14, freq: 0.012, ph: 5, color: '#86a58a', off: t * 8 }); yak(ctx, { x: 480, y: 462, s: 1.6, t, graze: 0.2, dir: -1 }); chip(ctx, 'Yaks · high mountains of Asia', 480, 90, 0.4, lt, { size: 24 }); }, 0.5);
    panel(ctx, t, ...seg(4), (lt) => { S.sky(ctx, [[0, '#9db7d9'], [1, '#eef4fb']]); for (let i = 0; i < 60; i++) { const R = S.rng(i), x = (R() * W + t * 20) % W, y = ((R() * H + t * (40 + R() * 30)) % H); circle(ctx, x, y, 1.5 + R() * 2, 'rgba(255,255,255,.9)'); } ctx.fillStyle = '#f4f8fd'; ctx.fillRect(0, 430, W, 110); S.ridge(ctx, { y: 400, amp: 16, freq: 0.01, color: '#dfe9f5', off: 0 }); reindeer(ctx, { x: lerp(-60, 500, E.out(prog(lt, 0, 3))), y: 462, s: 1.8, walk: t * 5 }); chip(ctx, 'Reindeer · the frozen north', 480, 90, 0.4, lt, { size: 24 }); }, 0.5);
    panel(ctx, t, cs[5] - 0.2, 99, (lt) => { dark(ctx, '#17314d', '#2a5a7e'); text(ctx, 'WHEREVER HUMANS WENT…', W / 2, 90, { size: 38, weight: 900, color: '#fff' }); const row = [(c, x) => S.goat(c, { x, y: 380, s: 1, t }), (c, x) => S.horse(c, { x, y: 380, s: 0.75, walk: 0 }), (c, x) => S.camel(c, { x, y: 380, s: 0.7, walk: 0 }), (c, x) => yak(c, { x, y: 380, s: 0.8, t }), (c, x) => reindeer(c, { x, y: 380, s: 0.8, walk: 0 }), (c, x) => cow(c, { x, y: 380, s: 0.8, t })];
      row.forEach((fn, i) => { const p = E.back(prog(lt, 0.3 + i * 0.25, 0.9 + i * 0.25)); if (p <= 0) return; const x = 100 + i * 150; ctx.save(); ctx.translate(x, 380); ctx.scale(p, p); ctx.translate(-x, -380); fn(ctx, x); S.glass(ctx, x, 270 + Math.sin(t * 2 + i) * 3, 0.5, 1); ctx.restore(); }); text(ctx, '…they found something to milk', W / 2, 440, { size: 32, weight: 900, color: '#ffd54a', alpha: E.out(prog(lt, 2, 2.8)) }); }, 0.5);
    S.vignette(ctx);
  };

  D.s10 = (ctx, t, env) => {
    const cFr = 0.5, cMilk = env.cue('shows people milking', 4), cBy = env.cue('By then', 11), cCity = env.cue('and it was feeding', 15);
    panel(ctx, t, 0, cBy - 0.4, (lt) => {
      dark(ctx, '#0a1f45', '#123068'); const pan = lt * -26, cream = '#f3e6c4', shell = '#e9d5a1';
      ctx.save(); ctx.translate(pan, 0); ctx.fillStyle = '#16367a'; ctx.fillRect(-40, 120, 1100, 300); ctx.fillStyle = shell; ctx.fillRect(-40, 112, 1100, 10); ctx.fillRect(-40, 418, 1100, 10); ctx.fillStyle = '#c8553d'; for (let i = 0; i < 24; i++) ctx.fillRect(-30 + i * 46, 126, 28, 6);
      const sil = (fn) => { ctx.save(); ctx.fillStyle = cream; fn(); ctx.restore(); };
      // cows in profile
      [[160, 1], [470, 1], [780, 1]].forEach(([x], i) => { ctx.save(); ctx.translate(x, 395); ctx.fillStyle = cream; rr(ctx, -62, -118, 124, 54, 22); ctx.fill(); [[-44], [-28], [26], [44]].forEach(([lx]) => ctx.fillRect(lx - 4, -66, 8, 62)); ctx.beginPath(); ctx.moveTo(58, -108); ctx.lineTo(96, -128); ctx.lineTo(100, -96); ctx.lineTo(60, -78); ctx.closePath(); ctx.fill(); ctx.strokeStyle = cream; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(86, -126); ctx.quadraticCurveTo(80, -148, 96, -150); ctx.stroke(); line(ctx, [[-62, -108], [-76, -70]], cream, 4); ctx.restore();
        // milkers (kneeling)
        ctx.save(); ctx.translate(x - 38, 395); ctx.fillStyle = shell; ctx.beginPath(); ctx.arc(-18, -78, 12, 0, TAU); ctx.fill(); rr(ctx, -28, -66, 22, 40, 8); ctx.fill(); ctx.fillRect(-30, -28, 14, 26); ctx.fillRect(-12, -28, 14, 26); line(ctx, [[-10, -58], [14, -52]], shell, 7); ctx.restore(); });
      // jars & strainers
      [[330, 0], [640, 0], [950, 0]].forEach(([x]) => { ctx.save(); ctx.translate(x, 395); ctx.fillStyle = shell; ctx.beginPath(); ctx.moveTo(-14, -78); ctx.bezierCurveTo(-34, -60, -30, -16, -16, 0); ctx.lineTo(16, 0); ctx.bezierCurveTo(30, -16, 34, -60, 14, -78); ctx.closePath(); ctx.fill(); ctx.fillRect(-14, -86, 28, 9); ctx.restore(); });
      ctx.restore(); text(ctx, 'THE STANDARD OF UR · Mesopotamia · ≈ 4,500 years old', W / 2, 80, { size: 26, weight: 800, color: '#ffe9b0', alpha: E.out(prog(lt, 0.4, 1)) });
      if (lt > cMilk - 0.5) callout(ctx, 'milking → straining → jars', W / 2, 455 - 14, cMilk, lt + 0.5, { size: 24, bg: '#ffe9b0', color: '#1b2a4a' });
    }, 0.5);
    panel(ctx, t, cBy - 0.2, 99, (lt) => {
      S.sky(ctx, 'dusk'); S.sun(ctx, 480, 330, 70, t, '#ffd89a'); S.ridge(ctx, { y: 455, amp: 6, freq: 0.01, color: '#2d1b33', off: 0 });
      // ziggurat + houses
      ctx.fillStyle = '#7a4f3b'; [[0, 0, 300, 40], [30, -40, 240, 40], [60, -80, 180, 40], [90, -120, 120, 40]].forEach(([dx, dy, w, h]) => { ctx.fillRect(330 + dx, 440 + dy - 40, w, h); }); ctx.fillStyle = '#3b2430'; ctx.fillRect(445, 280, 70, 36);
      const R = S.rng(14); for (let i = 0; i < 16; i++) { const x = i * 62 - 10, h = 40 + R() * 40; if (x > 300 && x < 640) continue; ctx.fillStyle = '#4b2b36'; ctx.fillRect(x, 440 - h, 52, h); ctx.fillStyle = 'rgba(255,200,120,.7)'; ctx.fillRect(x + 12, 440 - h + 12, 10, 12); }
      for (let i = 0; i < 6; i++) { const p = E.back(prog(lt, 0.8 + i * 0.35, 1.3 + i * 0.35)); if (p > 0) S.jar(ctx, 100 + i * 150, 440, 0.9 * p, 0.9); }
      bigStat(ctx, 'DAIRY = A WAY OF LIFE', 'feeding whole cities', W / 2, 120, 0.4, lt, { size: 44, sub: 26 });
    }, 0.5);
    S.vignette(ctx);
  };

  D.s11 = (ctx, t, env) => {
    const cTwo = env.cue('roughly two out of', 0.5), cEA = env.cue("In parts of East Asia", 7), cNE = env.cue('In Northern Europe', 12), cLatte = env.cue('So if you can enjoy', 16);
    dark(ctx, '#101a33', '#223a6b'); S.stars(ctx, t, 40, 5);
    panel(ctx, t, 0, cEA - 0.4, (lt) => { const p = E.out(prog(lt, 0.6, 2.6)); S.donut(ctx, 300, 250, 120, 0.65, p); text(ctx, Math.round(65 * p) + '%', 300, 270, { size: 80, weight: 900, color: '#fff' }); text(ctx, 'of adults lose some', 640, 200, { size: 34, weight: 800, color: '#fff', align: 'center' }); text(ctx, 'lactose digestion', 640, 245, { size: 34, weight: 800, color: '#ff8f8f' }); text(ctx, 'roughly 2 in 3 people', 640, 300, { size: 24, weight: 600, color: '#bcd0ff' }); }, 0.5);
    panel(ctx, t, cEA - 0.2, 99, (lt) => { text(ctx, 'ADULTS WHO CAN DIGEST LACTOSE (approx.)', W / 2, 70, { size: 26, weight: 900, color: '#bcd0ff' }); S.bars(ctx, 120, 120, 720, 230, [{ label: 'East Asia', v: 0.1, color: '#ff8f8f', txt: '~{n}%' }, { label: 'World', v: 0.35, color: '#ffd54a', txt: '~{n}%' }, { label: 'Northern Europe', v: 0.9, color: '#6be3b0', txt: '~{n}%' }], lt, 0.6); if (t > cLatte) { const p = E.back(prog(t, cLatte, cLatte + 0.8)); ctx.save(); ctx.globalAlpha = clamp(p); S.latte(ctx, 800, 440, 1.3 * p); ctx.restore(); callout(ctx, 'a very recent gift from your ancestors', 440, 405, cLatte + 1.2, t, { size: 24, bg: '#ffd54a', color: '#1b1b1b' }); } }, 0.5);
    S.vignette(ctx);
  };

  D.s12 = (ctx, t, env) => {
    const cWho = 0.5, cHero = env.cue('Probably not a hero', 4), cHungry = env.cue('Probably someone hungry', 8), cAche = env.cue('Someone who got', 12), cAgain = env.cue('tried again anyway', 15), cEvery = env.cue('Every glass of milk', 17), cBrave = env.cue('that one brave', 23);
    const sunUp = E.out(prog(t, 0, 10)); pasture(ctx, t, { sky: 'dawn', sunX: 480, sunY: lerp(360, 200, sunUp), sunR: 56, off: 0 });
    S.tree(ctx, 100, 450, 1.1); S.tree(ctx, 870, 445, 1);
    cow(ctx, { x: 640, y: 458, s: 1.3, t, graze: 0.1 + Math.sin(t * 0.8) * 0.05 });
    const sip = prog(t, cAche - 1.2, cAche), sick = t > cAche && t < cAgain - 0.4, tried = t >= cAgain - 0.4;
    person(ctx, { x: 380, y: 470, s: 1.5, t, face: tried ? 'grin' : sick ? 'sick' : t > cHungry ? 'worry' : 'smile', cloth: sick ? '#7fb08a' : '#b9733f', skin: sick ? '#b9d8a8' : '#e0a878', armR: sick ? [-10, -90] : [60 + Math.sin(t * 4) * (t > cAche - 1.2 ? 4 : 0), 100], hold: (c, h) => { if (!sick) { c.save(); c.translate(h[0], h[1] - 6); S.glass(c, 0, 8, 0.3, 0.8); c.restore(); } } });
    if (sick) { text(ctx, 'ughh…', 235, 330, { size: 36, weight: 900, color: '#c9f5b8', shadow: true, alpha: E.out(prog(t, cAche, cAche + 0.4)) }); }
    if (tried) { text(ctx, 'again!', 235, 330, { size: 40, weight: 900, color: '#ffe27a', shadow: true, alpha: E.out(prog(t, cAgain - 0.4, cAgain + 0.2)) }); }
    if (t > cEvery) { const items = [(x, y, s) => S.glass(ctx, x, y, s * 0.8, 1), (x, y, s) => S.cheese(ctx, x, y, s * 0.9), (x, y, s) => S.icecream(ctx, x, y, s * 0.9), (x, y, s) => S.latte(ctx, x, y, s * 0.8), (x, y, s) => S.butter(ctx, x, y, s * 0.9)]; items.forEach((fn, i) => { const p = E.back(prog(t, cEvery + i * 0.55, cEvery + 0.5 + i * 0.55)); if (p > 0) fn(150 + i * 165, 190 + Math.sin(t * 2 + i) * 5, 1.1 * p); }); }
    if (t > cBrave) { const p = E.back(prog(t, cBrave, cBrave + 0.6)); ctx.save(); ctx.translate(W / 2, 110); ctx.rotate(-0.06); ctx.scale(p, p); ctx.strokeStyle = '#ff5d73'; ctx.lineWidth = 6; ctx.fillStyle = 'rgba(10,12,24,.55)'; rr(ctx, -250, -50, 500, 100, 12); ctx.fill(); ctx.stroke(); text(ctx, 'NAME: UNKNOWN', 0, 8, { size: 48, weight: 900, color: '#ff8fa0', shadow: true }); ctx.restore(); }
    S.vignette(ctx);
  };

  D.s13 = (ctx, t, env) => {
    env.noSubs = false; ctx.fillStyle = S.grad(ctx, 0, 0, W, H, [[0, '#fff4dd'], [1, '#f7d9a8']]); ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) { const R = S.rng(i + 9); circle(ctx, R() * W, ((R() * H + t * 12) % (H + 60)) - 30, 12 + R() * 30, 'rgba(255,255,255,.5)'); }
    const cNext = env.cue('next time', 3); const p = E.back(prog(t, 1.2, 2));
    ctx.save(); ctx.translate(W / 2, 150); ctx.scale(p, p); ctx.fillStyle = '#e4572e'; rr(ctx, -130, -22, 260, 44, 22); ctx.fill(); text(ctx, 'NEXT EPISODE', 0, 8, { size: 24, weight: 900, color: '#fff' }); ctx.restore();
    const q = E.out(prog(t, cNext, cNext + 1)); ctx.save(); ctx.globalAlpha = q; ctx.translate(0, (1 - q) * 20); text(ctx, 'Who was the first person', W / 2, 240, { size: 46, weight: 900, color: '#2b1d14' }); text(ctx, 'to eat an egg?', W / 2, 296, { size: 46, weight: 900, color: '#e4572e' }); ctx.restore();
    // egg
    const ep = E.back(prog(t, cNext + 0.6, cNext + 1.4)); ctx.save(); ctx.translate(W / 2, 400 + Math.sin(t * 3) * 3); ctx.scale(ep, ep); ctx.rotate(Math.sin(t * 2) * 0.04); ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#d9c9a8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 0, 40, 52, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-26, -6); ctx.lineTo(-10, 6); ctx.lineTo(0, -8); ctx.lineTo(12, 8); ctx.lineTo(26, -4); ctx.stroke(); ctx.restore();
    // subscribe button (bottom-left) pulses
    const sb = E.back(prog(t, 6.5, 7.2)); if (sb > 0) { ctx.save(); ctx.translate(120, 488); const pul = 1 + Math.sin(t * 5) * 0.03; ctx.scale(sb * pul, sb * pul); ctx.fillStyle = '#e62117'; rr(ctx, -92, -22, 184, 44, 22); ctx.fill(); text(ctx, 'SUBSCRIBE', 4, 7, { size: 20, weight: 900, color: '#fff' }); ctx.restore(); }
    S.vignette(ctx, 0.16);
  };
})();
