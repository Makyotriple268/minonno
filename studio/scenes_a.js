// Scenes: intro + 1..5
(function () {
  const S = window.Studio, F = window.Framework, { W, H, TAU, clamp, lerp, prog, E, person, cow, text, circle, ell, rr, line, callout, bigStat } = S;
  const { panel, camera, pasture } = F; const D = (window.SC = window.SC || {});
  const walkPh = (t, sp = 5) => t * sp;

  D.intro = (ctx, t) => {
    ctx.fillStyle = S.grad(ctx, 0, 0, W, H, [[0, '#fff4dd'], [1, '#f7d9a8']]); ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) { const R = S.rng(i + 3), x = R() * W, y = ((R() * H + t * (10 + R() * 14)) % (H + 80)) - 40, r = 14 + R() * 38; circle(ctx, x, y, r, 'rgba(255,255,255,.55)'); }
    const p = E.out(prog(t, 0.2, 1.1)), q = E.out(prog(t, 0.9, 1.8));
    ctx.save(); ctx.translate(W / 2, 150 - (1 - p) * 20); ctx.globalAlpha = p; ctx.fillStyle = '#e4572e'; rr(ctx, -150, -22, 300, 44, 22); ctx.fill(); text(ctx, 'WHO WENT FIRST?', 0, 8, { size: 24, weight: 900, color: '#fff' }); ctx.restore();
    ctx.save(); ctx.globalAlpha = q; ctx.translate(0, (1 - q) * 28); text(ctx, 'The First Person', W / 2, 270, { size: 74, weight: 900, color: '#2b1d14' }); text(ctx, 'to Drink Milk', W / 2, 352, { size: 74, weight: 900, color: '#e4572e' }); ctx.restore();
    const gp = E.back(prog(t, 1.6, 2.4)); S.glass(ctx, W / 2, 470, 0.9 * gp, 1);
    ctx.save(); ctx.globalAlpha = 0.9 * E.out(prog(t, 2, 2.8)); text(ctx, 'Episode 1', W / 2, 500, { size: 20, weight: 700, color: '#8a5a3b', alpha: 0.8 }); ctx.restore();
  };

  D.s01 = (ctx, t, env) => {
    const cNote = env.cue('I wonder', 4), cBaby = env.cue('Milk is made for baby cows', 9), cBill = env.cue('billions of us', 14), cWho = env.cue('who was the first person', 18);
    const zoom = 1 + prog(t, 0, env.dur) * 0.06 + E.io(prog(t, cWho, cWho + 3)) * 0.12; ctx.save(); camera(ctx, 420 + prog(t, cWho, cWho + 3) * -40, 300, zoom);
    const rise = E.out(prog(t, 0, 9)); pasture(ctx, t, { sky: 'dawn', sunY: lerp(330, 130, rise), sunX: 740, sunR: 40, off: t * 5 });
    S.tree(ctx, 90, 450, 1.1); S.tree(ctx, 880, 440, 0.9);
    const calfIn = E.out(prog(t, cBaby, cBaby + 2));
    cow(ctx, { x: 640, y: 456, s: 1.15, t, graze: 0.55 + Math.sin(t * 0.8) * 0.1 });
    if (calfIn > 0) cow(ctx, { x: lerp(980, 540, calfIn), y: 462, s: 1.15, t, calf: true, walk: calfIn < 1 ? t * 7 : null, graze: calfIn >= 1 ? 1 : 0, dir: -1 });
    const wx = lerp(-60, 310, E.io(prog(t, 0.6, 4.2))), walking = t > 0.6 && t < 4.2;
    person(ctx, { x: wx, y: 466, s: 1.35, t, walk: walking ? walkPh(t) : null, face: t > cNote - 0.5 ? 'wonder' : 'smile', tilt: t > cNote ? -0.08 : 0, armR: t > cNote ? [30, 120] : undefined });
    ctx.restore();
    // thought bubble
    panel(ctx, t, cNote, cNote + 3.4, (lt, k) => { const bx = 400, by = 215; [[330, 330, 6], [352, 300, 10], [376, 266, 14]].forEach(([x, y, r]) => circle(ctx, x, y, r * k, '#fff')); ctx.save(); ctx.translate(bx, by); ctx.scale(E.back(prog(lt, 0, 0.5)), E.back(prog(lt, 0, 0.5))); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 16; rr(ctx, -80, -62, 160, 108, 40); ctx.fill(); ctx.shadowColor = 'transparent'; S.glass(ctx, -2, 28, 0.9, 1); text(ctx, '?', 52, -6, { size: 54, weight: 900, color: '#e4572e' }); ctx.restore(); }, 0.35);
    if (t > cBaby + 1.2) callout(ctx, 'Milk is for baby cows', 620, 300, cBaby + 1.2, t, { size: 24, bg: '#fff8e8' });
    if (t > cBill) { const n = 7; for (let i = 0; i < n; i++) { const p = E.back(prog(t, cBill + i * 0.12, cBill + 0.5 + i * 0.12)); if (p > 0) S.glass(ctx, 120 + i * 120, 150 + Math.sin(t * 2 + i) * 4, 0.6 * p, 1); } callout(ctx, 'billions of us, every day', 480, 90, cBill + 0.9, t, { size: 28, bg: '#2b1d14', color: '#fff' }); }
    if (t > cWho) { const p = E.back(prog(t, cWho, cWho + 0.8)); ctx.save(); ctx.translate(W / 2, 200); ctx.scale(p, p); ctx.fillStyle = 'rgba(15,18,32,.55)'; ctx.fillRect(-W, -140, W * 2, 280); text(ctx, 'WHO WAS FIRST?', 0, 22, { size: 84, weight: 900, color: '#fff', shadow: true, blur: 24 }); ctx.restore(); }
    S.vignette(ctx);
  };

  D.s02 = (ctx, t, env) => {
    const cNo = env.cue('no name', 7), cWrite = env.cue('writing was invented', 12), cSci = env.cue('Archaeologists', 18), cClues = env.cue("So let's follow", 23);
    ctx.fillStyle = S.grad(ctx, 0, 0, 0, H, [[0, '#0f1424'], [1, '#1d2a4a']]); ctx.fillRect(0, 0, W, H); S.stars(ctx, t, 60, 8);
    // mystery silhouette
    const sp = E.out(prog(t, 0.4, 1.4)); ctx.save(); ctx.globalAlpha = sp; ctx.translate(210, 410); ctx.fillStyle = S.radial(ctx, 0, -90, 10, 170, [[0, 'rgba(255,213,74,.35)'], [1, 'rgba(255,213,74,0)']]); ctx.fillRect(-200, -280, 400, 400);
    person(ctx, { x: 0, y: 0, s: 1.7, t, cloth: '#0a0d18', skin: '#0a0d18', hair: '#0a0d18', pants: '#0a0d18', face: 'neutral' }); ctx.restore();
    text(ctx, '?', 210 + Math.sin(t * 2) * 3, 150, { size: 120, weight: 900, color: '#ffd54a', alpha: sp, shadow: 'rgba(255,213,74,.6)', blur: 30 });
    ['NAME', 'FACE', 'DATE'].forEach((l, i) => { const p = E.back(prog(t, cNo + i * 0.55, cNo + 0.45 + i * 0.55)); if (p <= 0) return; ctx.save(); ctx.translate(560, 70 + i * 58); ctx.scale(p, p); ctx.fillStyle = 'rgba(255,255,255,.1)'; rr(ctx, -150, -24, 300, 48, 12); ctx.fill(); text(ctx, l, -130, 8, { size: 22, weight: 800, align: 'left', color: '#9fb4ff' }); text(ctx, 'unknown', 130, 9, { size: 22, weight: 700, align: 'right', color: '#ffd54a' }); ctx.restore(); });
    // timeline
    const ty = 290; S.timeline(ctx, ty, cWrite - 0.6, t, [{ x: 440, t: cWrite - 0.2, label: '12,000 yrs ago', sub: 'milk drinking begins?', up: true, color: '#ff7ab6' }, { x: 770, t: cWrite + 0.4, label: '5,000 yrs ago', sub: 'writing invented', up: false, color: '#59c3ff' }, { x: 900, t: cWrite + 0.9, label: 'today', up: true, color: '#fff' }], { x0: 420, x1: 910 });
    if (t > cWrite + 0.6) { ctx.save(); ctx.globalAlpha = E.out(prog(t, cWrite + 0.6, cWrite + 1.4)) * 0.9; ctx.fillStyle = 'rgba(255,122,182,.2)'; rr(ctx, 440, ty - 14, 330, 28, 14); ctx.fill(); text(ctx, 'no written records', 605, ty + 6, { size: 17, weight: 700, color: '#ffc2dd' }); ctx.restore(); }
    // science icons
    const icons = [['archaeology', '#ffb86b'], ['chemistry', '#6be3b0'], ['genetics', '#7aa8ff']];
    icons.forEach(([k, c], i) => { const p = E.back(prog(t, cSci + i * 0.9, cSci + 0.5 + i * 0.9)); if (p <= 0) return; ctx.save(); ctx.translate(530 + i * 130, 378); ctx.scale(p, p); circle(ctx, 0, 0, 38, 'rgba(255,255,255,.1)', c, 3);
      if (k === 'archaeology') { line(ctx, [[-14, 14], [10, -14]], '#d9b98a', 6); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(10, -14); ctx.lineTo(22, -8); ctx.lineTo(16, 2); ctx.closePath(); ctx.fill(); }
      if (k === 'chemistry') { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-6, -22); ctx.lineTo(6, -22); ctx.lineTo(6, -6); ctx.lineTo(20, 18); ctx.lineTo(-20, 18); ctx.lineTo(-6, -6); ctx.closePath(); ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1; for (let b = 0; b < 3; b++) circle(ctx, -6 + b * 6, 8 - ((t * 20 + b * 9) % 18), 2.5, '#fff'); }
      if (k === 'genetics') S.dna(ctx, 0, 0, 40, 26, t, { n: 7 });
      ctx.restore(); text(ctx, ['archaeologists', 'chemists', 'geneticists'][i], 530 + i * 130, 440, { size: 13, weight: 700, color: '#cfd6ee', alpha: p }); });
    if (t > cClues) { const p = E.out(prog(t, cClues, cClues + 0.8)); ctx.save(); ctx.globalAlpha = p; ctx.translate(0, (1 - p) * 20); text(ctx, 'FOLLOW THE CLUES', W / 2, 60, { size: 40, weight: 900, color: '#ffd54a', shadow: true }); ctx.restore(); }
    S.vignette(ctx);
  };

  D.s03 = (ctx, t, env) => {
    const cHuge = env.cue('Aurochs were huge', 3), cTall = env.cue('as tall as a grown man', 8), cRoam = env.cue('They roamed', 14), cTen = env.cue('And around ten', 18), cSlow = env.cue('Slowly, over many', 24);
    // panel 1: pasture with aurochs & person
    panel(ctx, t, 0, cRoam - 0.4, (lt) => {
      ctx.save(); camera(ctx, 480, 300, 1 + lt * 0.006); pasture(ctx, t, { sky: 'warm', sunX: 200, sunY: 110, pal: ['#c2b273', '#a3a15a', '#8c8a47'], off: t * 4 });
      S.tree(ctx, 860, 440, 0.8, { c1: '#6a8a3e', c2: '#86a64a' });
      const x = lerp(1100, 560, E.out(prog(t, 0.2, 3.2))); cow(ctx, { x, y: 462, s: 1.45, t, kind: 'aurochs', dir: -1, walk: prog(t, 0.2, 3.2) < 1 ? t * 4 : null, graze: prog(t, 3.2, 5) * 0.3 });
      const pp = prog(t, cTall - 0.5, cTall + 0.7); if (pp > 0) { const px = lerp(-80, 250, E.out(pp)); person(ctx, { x: px, y: 466, s: 1.1, t, walk: pp < 1 ? t * 5 : null, face: 'wonder' }); }
      ctx.restore();
      if (t > cTall + 0.8) { const p = E.out(prog(t, cTall + 0.8, cTall + 1.6)); ctx.save(); ctx.globalAlpha = p; ctx.setLineDash([10, 8]); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(210, 316); ctx.lineTo(600, 316); ctx.stroke(); ctx.setLineDash([]); callout(ctx, 'shoulder height ≈ a grown man', 400, 272, cTall + 1.0, t, { size: 22 }); ctx.restore(); }
      if (t > cHuge) callout(ctx, 'AUROCHS · wild ox', 760, 190, cHuge, t, { size: 26, bg: '#3a2a1c', color: '#fff' });
    }, 0.5);
    // panel 2: map
    panel(ctx, t, cRoam - 0.2, cSlow - 0.6, (lt) => {
      const v = [55, 38, 4.2]; S.map(ctx, v); S.spread(ctx, 10, 48, v, cRoam, t, { r: 120, dur: 2, color: 'rgba(210,150,90,.55)' }); S.spread(ctx, 70, 45, v, cRoam + 0.8, t, { r: 190, dur: 2.2, color: 'rgba(210,150,90,.5)' }); S.spread(ctx, 12, 28, v, cRoam + 1.6, t, { r: 120, dur: 2, color: 'rgba(210,150,90,.5)' });
      text(ctx, 'EUROPE', ...S.proj(12, 49, v), { size: 18, weight: 800, color: '#fff', alpha: 0.8 }); text(ctx, 'ASIA', ...S.proj(78, 46, v), { size: 18, weight: 800, color: '#fff', alpha: 0.8 }); text(ctx, 'N. AFRICA', ...S.proj(10, 24, v), { size: 18, weight: 800, color: '#fff', alpha: 0.8 });
      S.pin(ctx, 38, 37, v, 'Near East', cTen, t, { dx: 0 }); bigStat(ctx, '≈ 10,500', 'years ago · first cattle tamed', 740, 100, cTen + 0.5, t, { size: 60 });
    }, 0.5);
    // panel 3: aurochs -> cow
    panel(ctx, t, cSlow - 0.2, 99, (lt) => {
      S.sky(ctx, 'cream'); ctx.fillStyle = '#c9b78a'; ctx.fillRect(0, 440, W, 100);
      const m = E.io(prog(lt, 1.2, 4)); ctx.save(); ctx.globalAlpha = 1 - m; cow(ctx, { x: 270, y: 440, s: 1.3, t, kind: 'aurochs', dir: -1, graze: 0.2 }); ctx.restore(); ctx.save(); ctx.globalAlpha = m; cow(ctx, { x: 270, y: 440, s: 1.15, t, kind: 'cow', dir: -1, graze: 0.2 }); ctx.restore();
      cow(ctx, { x: 740, y: 440, s: 1.15, t, kind: 'cow', graze: 0.1 });
      ctx.save(); ctx.globalAlpha = E.out(prog(lt, 0.4, 1)); S.arrowPath(ctx, [[360, 300], [520, 270], [620, 300]], E.out(prog(lt, 0.4, 2.2)), '#8a5a3b', 6); text(ctx, 'many generations', 490, 245, { size: 24, weight: 800, color: '#5a3a24' }); ctx.restore();
      text(ctx, 'wild aurochs', 270, 160, { size: 22, weight: 800, color: '#5a3a24' }); text(ctx, 'today’s cattle', 740, 160, { size: 22, weight: 800, color: '#5a3a24' });
    }, 0.5);
    S.vignette(ctx);
  };

  D.s04 = (ctx, t, env) => {
    const cCalf = env.cue('But imagine', 6), cWhy = env.cue('Maybe someone wondered', 11), cChild = env.cue('Or maybe it began', 15), cFirst = env.cue('But somebody', 24);
    const hungry = E.io(prog(t, cChild, cChild + 2)) * (1 - E.io(prog(t, cFirst - 1, cFirst + 0.5)));
    pasture(ctx, t, { sky: 'warm', sunX: 790, sunY: 130, pal: ['#a9c27a', '#8bad5f', '#6f9a4a'], off: 0, cloudColor: 'rgba(255,255,255,.85)' });
    if (hungry > 0) { ctx.fillStyle = `rgba(170,120,60,${0.28 * hungry})`; ctx.fillRect(0, 0, W, H); ctx.fillStyle = `rgba(150,110,60,${0.55 * hungry})`; ctx.fillRect(0, 440, W, 100); }
    S.hut(ctx, 840, 445, 1.2); S.fence(ctx, 40, 462, 6, 34); S.tree(ctx, 100, 440, 0.9);
    // cow with calf nursing
    cow(ctx, { x: 520, y: 458, s: 1.3, t, graze: 0 }); cow(ctx, { x: 430, y: 466, s: 1.3, t, calf: true, graze: 0.9 + Math.sin(t * 3) * 0.05 });
    // farmer watching
    const fx = lerp(-60, 230, E.io(prog(t, 0.4, 3.8))); person(ctx, { x: fx, y: 468, s: 1.35, t, walk: t < 3.8 ? t * 5 : null, face: t > cCalf ? 'wonder' : 'smile', tilt: t > cCalf ? 0.05 : 0 });
    if (t > cWhy) { const p = E.back(prog(t, cWhy, cWhy + 0.5)); ctx.save(); ctx.translate(250, 215); ctx.scale(p, p); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 14; rr(ctx, -90, -34, 180, 62, 30); ctx.fill(); ctx.shadowColor = 'transparent'; text(ctx, 'why not me?', 0, 8, { size: 28, weight: 800, color: '#2b1d14' }); [[-6, 44, 6], [-14, 60, 4]].forEach(([x, y, r]) => circle(ctx, x, y, r, '#fff')); ctx.restore(); }
    // hungry child
    if (hungry > 0) { ctx.save(); ctx.globalAlpha = hungry; person(ctx, { x: 730, y: 470, s: 0.85, t, face: 'worry', cloth: '#7aa0c8', hairStyle: 'long', skin: '#d29a6c', hold: (c, h) => { S.rr(c, h[0] - 14, h[1] - 3, 28, 10, 5); c.fillStyle = '#8a5a3b'; c.fill(); } }); text(ctx, 'harvest failed…', 730, 330, { size: 24, weight: 800, color: '#fff', shadow: true }); ctx.restore(); [1, 2, 3].forEach((i) => { const wx = 640 + i * 0 + i * 40; ctx.save(); ctx.globalAlpha = hungry; line(ctx, [[wx, 447], [wx + 6, 423], [wx + 18, 415]], '#9a7a3a', 3); ctx.restore(); }); }
    // first sip
    if (t > cFirst) { const p = prog(t, cFirst, cFirst + 3); S.bucket(ctx, 470, 462, 1.3, E.out(p)); text(ctx, 'the first sip', W / 2, 90, { size: 54, weight: 900, color: '#fff', alpha: E.out(prog(t, cFirst + 0.3, cFirst + 1.1)), shadow: true, blur: 20 }); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + t, r = 70 + Math.sin(t * 3 + i) * 6, q = E.out(prog(t, cFirst + 0.6, cFirst + 1.2)); ctx.globalAlpha = 0.9 * q; S.circle(ctx, 470 + Math.cos(a) * r, 410 + Math.sin(a) * r * 0.6, 3.5, '#fff7b0'); ctx.globalAlpha = 1; } }
    S.vignette(ctx);
  };

  D.s05 = (ctx, t, env) => {
    const cBaby = env.cue('Every baby mammal', 1), cBreak = env.cue('It breaks down lactose', 7), cOff = env.cue('But in most mammals', 12), cGut = env.cue('Without it', 19), cGas = env.cue('Gas, cramps', 24), cPaid = env.cue('So the first adult', 27);
    ctx.fillStyle = S.grad(ctx, 0, 0, W, H, [[0, '#0e2a3a'], [1, '#17465c']]); ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 20; i++) { const R = S.rng(i + 40); ctx.globalAlpha = 0.07; circle(ctx, R() * W, ((R() * H - t * 12) % H + H) % H, 8 + R() * 30, '#fff'); ctx.globalAlpha = 1; }
    // panel A: lactase cuts lactose
    panel(ctx, t, 0, cOff - 0.5, (lt) => {
      const bp = E.back(prog(t, cBaby, cBaby + 0.8)); S.cow(ctx, { x: 190, y: 330, s: 0.9 * bp, t, calf: true }); person(ctx, { x: 360, y: 330, s: 0.8 * bp, t, cloth: '#e8c872', face: 'smile' }); ell(ctx, 275, 335, 140, 12, 'rgba(0,0,0,.2)'); text(ctx, 'every baby mammal', 275, 380, { size: 22, weight: 800, color: '#bfe9ff', alpha: bp });
      const cut = E.io(prog(t, cBreak + 0.6, cBreak + 2.2)); ctx.save(); ctx.translate(690, 250); text(ctx, 'LACTOSE', 0, -150, { size: 26, weight: 900, color: '#fff' }); S.lactose(ctx, 0, 0, 1.1, cut, t); const sx = lerp(0, 0, 1), sy = lerp(-130, -44, E.out(prog(t, cBreak, cBreak + 0.8))); S.scissors(ctx, sx, sy + (cut > 0 && cut < 1 ? 0 : 0), 1.2, Math.abs(Math.sin(t * 6)) * (cut < 1 ? 1 : 0.3), Math.PI); ctx.restore();
      text(ctx, 'LACTASE enzyme = molecular scissors', 690, 410, { size: 22, weight: 800, color: '#ffb3c1', alpha: E.out(prog(t, cBreak, cBreak + 0.8)) });
    }, 0.5);
    // panel B: lactase meter drops with age
    panel(ctx, t, cOff - 0.2, cGut - 0.6, (lt) => {
      const age = E.io(prog(lt, 0.6, 5)); const meter = 1 - age;
      person(ctx, { x: 250, y: 400, s: lerp(0.95, 1.5, age), t, face: age > 0.6 ? 'worry' : 'smile', cloth: '#e8c872' }); text(ctx, ['child', 'teen', 'adult'][Math.min(2, Math.floor(age * 3))], 250, 425, { size: 28, weight: 900, color: '#fff' });
      ctx.save(); ctx.translate(620, 200); text(ctx, 'LACTASE ENZYME', 0, -34, { size: 26, weight: 900, color: '#fff' }); ctx.fillStyle = 'rgba(255,255,255,.15)'; rr(ctx, -200, -10, 400, 44, 22); ctx.fill(); ctx.fillStyle = meter > 0.3 ? '#6be3b0' : '#ff6b6b'; rr(ctx, -200, -10, Math.max(8, 400 * meter), 44, 22); ctx.fill(); text(ctx, Math.round(meter * 100) + '%', 0, 80, { size: 54, weight: 900, color: meter > 0.3 ? '#6be3b0' : '#ff6b6b' }); ctx.restore();
      text(ctx, 'switched off after childhood', 620, 330, { size: 22, weight: 700, color: '#bfe9ff' });
    }, 0.5);
    // panel C: gut
    panel(ctx, t, cGut - 0.2, 99, (lt) => {
      const a = E.out(prog(lt, 0.4, 2.4)); S.gut(ctx, 300, 250, 1.7, t, a);
      person(ctx, { x: 690, y: 430, s: 1.4, t, face: lt > cGas - cGut ? 'sick' : 'worry', cloth: lt > cGas - cGut ? '#7fb08a' : '#e8c872', skin: lt > cGas - cGut ? '#b9d8a8' : '#e0a878', armR: [-20, -100], armL: [20, 100] });
      text(ctx, 'bacteria ferment the sugar', 300, 352, { size: 22, weight: 800, color: '#c9f5b8', alpha: a });
      ['GAS', 'CRAMPS', 'BLOATING'].forEach((w, i) => { const p = E.back(prog(t, cGas + i * 0.7, cGas + 0.5 + i * 0.7)); if (p > 0) callout(ctx, w, 600 + (i % 2) * 130, 120 + i * 62, cGas + i * 0.7, t, { size: 26, bg: '#ffecb3', color: '#7a2e0e' }); });
      if (t > cPaid) text(ctx, 'ouch.', 300, 405, { size: 44, weight: 900, color: '#ff9aa8', alpha: E.out(prog(t, cPaid, cPaid + 0.6)) });
    }, 0.5);
    S.vignette(ctx);
  };
})();
