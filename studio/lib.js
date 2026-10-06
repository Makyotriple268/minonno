// Studio library: flat-illustration motion graphics on a 960x540 canvas (rendered at 2x = 1920x1080).
// Everything is a pure function of time t, so any frame can be rendered independently (parallel rendering).
(function () {
  const TAU = Math.PI * 2, W = 960, H = 540;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    lin: (p) => p, out: (p) => 1 - Math.pow(1 - p, 3), in: (p) => p * p * p,
    io: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    back: (p) => { if (p <= 0) return 0; if (p >= 1) return 1; const c = 1.70158; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); },
    elastic: (p) => (p === 0 || p === 1 ? p : Math.pow(2, -9 * p) * Math.sin((p * 10 - 0.75) * (TAU / 3)) + 1),
  };
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const FONT = 'Inter, "Helvetica Neue", Arial, sans-serif';

  // ---- basic drawing helpers -------------------------------------------------
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function circle(ctx, x, y, r, fill, stroke, lw) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); } }
  function ell(ctx, x, y, rx, ry, fill, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); if (fill) { ctx.fillStyle = fill; ctx.fill(); } }
  function line(ctx, pts, color, w, cap = 'round') { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = cap; ctx.lineJoin = 'round'; ctx.stroke(); }
  function shadow(ctx, x, y, rx, a = 0.22) { ctx.save(); ctx.globalAlpha = a; ell(ctx, x, y, rx, rx * 0.16, '#000'); ctx.restore(); }
  function text(ctx, str, x, y, o = {}) {
    ctx.save(); ctx.font = `${o.weight || 700} ${o.size || 28}px ${o.font || FONT}`; ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'alphabetic';
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    if (o.shadow) { ctx.shadowColor = o.shadow === true ? 'rgba(0,0,0,.45)' : o.shadow; ctx.shadowBlur = o.blur ?? 10; ctx.shadowOffsetY = 2; }
    if (o.stroke) { ctx.lineWidth = o.strokeW || 6; ctx.strokeStyle = o.stroke; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
    ctx.fillStyle = o.color || '#fff'; ctx.fillText(str, x, y); ctx.restore();
  }
  function grad(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([p, c]) => g.addColorStop(p, c)); return g; }
  function radial(ctx, x, y, r0, r1, stops) { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([p, c]) => g.addColorStop(p, c)); return g; }

  // ---- sky / landscape --------------------------------------------------------
  const SKY = {
    dawn: [[0, '#2b2f6b'], [0.35, '#b25d7f'], [0.7, '#f4a261'], [1, '#ffd9a0']],
    day: [[0, '#4aa3df'], [0.6, '#9fd6f2'], [1, '#e8f6ff']],
    warm: [[0, '#f4b266'], [0.5, '#fbd89a'], [1, '#fff1d6']],
    dusk: [[0, '#1d2350'], [0.5, '#7b4a8c'], [1, '#f08a5d']],
    night: [[0, '#070b1f'], [0.6, '#12204a'], [1, '#243b6b']],
    cream: [[0, '#f6ead3'], [1, '#e7d3ad']],
    ink: [[0, '#111827'], [1, '#1f2937']],
  };
  function sky(ctx, name, y1 = H) { ctx.fillStyle = grad(ctx, 0, 0, 0, y1, SKY[name] || name); ctx.fillRect(-200, -200, W + 400, H + 400); }
  function sun(ctx, x, y, r, t = 0, color = '#fff3b0') {
    ctx.save(); ctx.fillStyle = radial(ctx, x, y, r * 0.4, r * 4.5, [[0, 'rgba(255,230,160,.55)'], [1, 'rgba(255,230,160,0)']]); ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
    circle(ctx, x, y, r, color); ctx.restore();
  }
  function stars(ctx, t, n = 70, seed = 4) { const R = rng(seed); for (let i = 0; i < n; i++) { const x = R() * W, y = R() * H * 0.6, s = R() * 1.6 + 0.4; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + i); circle(ctx, x, y, s, '#fff'); } ctx.globalAlpha = 1; }
  function clouds(ctx, t, o = {}) {
    const R = rng(o.seed || 9), n = o.n || 5;
    for (let i = 0; i < n; i++) { const sp = 6 + R() * 10, x = ((R() * (W + 300) + t * sp * (o.speed || 1)) % (W + 300)) - 150, y = (o.y0 ?? 40) + R() * (o.yr ?? 130), s = 0.6 + R() * 0.9;
      ctx.beginPath(); [[0, 0, 34], [32, -12, 28], [62, 2, 30], [30, 8, 32]].forEach(([dx, dy, r]) => { ctx.moveTo(x + (dx + r) * s, y + dy * s); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU); });
      ctx.fillStyle = o.color || 'rgba(255,255,255,.92)'; ctx.fill(); }
  }
  // layered rolling ridges with parallax offset `off`
  function ridge(ctx, o) {
    const { y, amp = 30, freq = 0.01, ph = 0, color, off = 0, bottom = H + 200, w = W + 400, detail = 0.5 } = o;
    ctx.beginPath(); ctx.moveTo(-200, bottom);
    for (let x = -200; x <= w - 200; x += 10) { const xx = x + off; ctx.lineTo(x, y + Math.sin(xx * freq + ph) * amp + Math.sin(xx * freq * 2.3 + ph * 1.7) * amp * detail * 0.5 + Math.sin(xx * freq * 5.1 + ph) * amp * 0.12); }
    ctx.lineTo(w - 200, bottom); ctx.closePath(); ctx.fillStyle = typeof color === 'string' ? color : grad(ctx, 0, y - amp, 0, y + 200, color); ctx.fill();
  }
  function grassTufts(ctx, y, off, color, seed = 3, density = 38, h = 12) {
    const R = rng(seed); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < density; i++) { const x = (((R() * (W + 400)) - off) % (W + 400) + (W + 400)) % (W + 400) - 200, yy = y + R() * 70; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x + k * 3, yy); ctx.lineTo(x + k * 6, yy - h * (0.7 + R() * 0.5)); ctx.stroke(); } }
  }
  function tree(ctx, x, y, s = 1, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); shadow(ctx, 0, 2, 38, 0.2);
    ctx.fillStyle = o.trunk || '#6b4a35'; rr(ctx, -7, -64, 14, 66, 5); ctx.fill();
    const c1 = o.c1 || '#4f8a45', c2 = o.c2 || '#6fae5a';
    circle(ctx, 0, -92, 42, c1); circle(ctx, -26, -74, 30, c1); circle(ctx, 28, -76, 32, c1); circle(ctx, -6, -104, 30, c2); circle(ctx, 14, -90, 22, c2);
    ctx.restore();
  }
  function hut(ctx, x, y, s = 1, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); shadow(ctx, 0, 2, 60, 0.2);
    ctx.fillStyle = o.wall || '#c79b6d'; rr(ctx, -42, -52, 84, 54, 4); ctx.fill();
    ctx.fillStyle = o.roof || '#8a5a3b'; ctx.beginPath(); ctx.moveTo(-58, -48); ctx.lineTo(0, -98); ctx.lineTo(58, -48); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4a2f1f'; rr(ctx, -10, -34, 20, 36, [10, 10, 0, 0]); ctx.fill(); ctx.restore();
  }
  function fence(ctx, x, y, n = 6, gap = 34) { ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 5; ctx.lineCap = 'round'; for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.moveTo(x + i * gap, y); ctx.lineTo(x + i * gap, y - 34); ctx.stroke(); } [-10, -24].forEach((d) => { ctx.beginPath(); ctx.moveTo(x - 6, y + d); ctx.lineTo(x + (n - 1) * gap + 6, y + d); ctx.stroke(); }); }

  // ---- people --------------------------------------------------------------------
  // o: {x,y(feet),s,dir,skin,hair,cloth,pants,walk(phase)|null,armL:[a1,a2],armR:[a1,a2],face,tilt,hold(ctx,handL,handR),hairStyle,bob}
  function person(ctx, o) {
    const s = o.s || 1, dir = o.dir || 1, skin = o.skin || '#e0a878', hair = o.hair || '#3a2a20', cloth = o.cloth || '#b9733f', pants = o.pants || '#6b4a35';
    const ph = o.walk ?? null, sw = ph === null ? 0 : Math.sin(ph), bob = o.bob ?? (ph === null ? Math.sin((o.t || 0) * 2) * 0.8 : Math.abs(Math.cos(ph)) * 3);
    ctx.save(); ctx.translate(o.x, o.y); ctx.scale(s * dir, s); shadow(ctx, 0, 0, 30, 0.25);
    const hipY = -60 - bob, shY = -108 - bob;
    // legs
    const leg = (a, front) => { const rad = (a * Math.PI) / 180, fx = Math.sin(rad) * 54, fy = hipY + Math.cos(rad) * 56; line(ctx, [[0, hipY], [fx * 0.9, fy * 0.55 + hipY * 0.45], [fx, Math.min(0, fy)]], front ? pants : shade(pants, -18), 12); ell(ctx, fx + 5, Math.min(0, fy) , 8, 4.5, front ? '#3b2a20' : '#2c2018'); };
    leg(ph === null ? -6 : -sw * 26, false); leg(ph === null ? 6 : sw * 26, true);
    // back arm
    const arm = (a, color, front, cfg) => { const [a1, a2] = cfg; const r1 = (a1 * Math.PI) / 180, r2 = ((a1 + a2) * Math.PI) / 180, sx = 2 * (front ? 1 : -1), sy = shY + 6; const ex = sx + Math.sin(r1) * 30, ey = sy + Math.cos(r1) * 30, hx = ex + Math.sin(r2) * 28, hy = ey + Math.cos(r2) * 28; line(ctx, [[sx, sy], [ex, ey], [hx, hy]], color, 9); circle(ctx, hx, hy, 5.5, skin); return [hx, hy]; };
    const aL = ph === null ? (o.armL || [-8, 6]) : [sw * 28, 18 + Math.max(0, -sw) * 20], aR = ph === null ? (o.armR || [8, 6]) : [-sw * 28, 18 + Math.max(0, sw) * 20];
    const hb = arm(0, shade(skin, -14), false, o.armL ? o.armL : aL);
    // torso (tunic)
    ctx.fillStyle = cloth; ctx.beginPath(); ctx.moveTo(-17, shY); ctx.quadraticCurveTo(0, shY - 6, 17, shY); ctx.lineTo(21, hipY + 22); ctx.quadraticCurveTo(0, hipY + 30, -21, hipY + 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(cloth, -22); ctx.fillRect(-20, hipY + 4, 40, 4); // belt
    const hf = arm(0, skin, true, o.armR ? o.armR : aR);
    // neck + head
    const hy = shY - 24, tilt = o.tilt || 0; ctx.save(); ctx.translate(2, hy + 16); ctx.rotate(tilt); ctx.translate(-2, -(hy + 16));
    ctx.fillStyle = shade(skin, -10); ctx.fillRect(-4, shY - 8, 9, 12);
    if ((o.hairStyle || 'short') === 'long') { ctx.fillStyle = hair; rr(ctx, -19, hy - 12, 40, 44, 16); ctx.fill(); }
    circle(ctx, 2, hy, 19, skin);
    // hair
    ctx.fillStyle = hair; ctx.beginPath(); if ((o.hairStyle || 'short') === 'long') { ctx.arc(2, hy - 3, 20.5, Math.PI, TAU); ctx.quadraticCurveTo(16, hy - 8, -10, hy - 7); ctx.closePath(); } else { ctx.arc(2, hy - 3, 20, Math.PI, TAU); ctx.quadraticCurveTo(14, hy - 10, -8, hy - 6); ctx.closePath(); } ctx.fill();
    face(ctx, 8, hy + 1, o.face || 'smile', o.t || 0);
    ctx.restore();
    if (o.hold) o.hold(ctx, hf, hb);
    ctx.restore();
  }
  function shade(hex, amt) { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, v + amt)); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
  function face(ctx, x, y, kind, t) {
    ctx.save(); ctx.fillStyle = '#2a1a12'; ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const blink = (t % 3.4) > 3.28 && kind !== 'sick';
    const eye = (ex, ey) => { if (blink) { ctx.beginPath(); ctx.moveTo(ex - 3, ey); ctx.lineTo(ex + 3, ey); ctx.stroke(); } else if (kind === 'sick') { ctx.beginPath(); ctx.moveTo(ex - 3, ey - 3); ctx.lineTo(ex + 3, ey + 3); ctx.moveTo(ex + 3, ey - 3); ctx.lineTo(ex - 3, ey + 3); ctx.stroke(); } else if (kind === 'wonder') { circle(ctx, ex, ey, 4.2, '#fff'); circle(ctx, ex + 0.8, ey, 2.4, '#2a1a12'); } else { circle(ctx, ex, ey, 2.6, '#2a1a12'); } };
    eye(x - 6, y - 1); eye(x + 6, y - 1);
    if (kind === 'worry' || kind === 'sick') { ctx.beginPath(); ctx.moveTo(x - 10, y - 8); ctx.lineTo(x - 3, y - 6); ctx.moveTo(x + 10, y - 8); ctx.lineTo(x + 3, y - 6); ctx.stroke(); }
    if (kind === 'wonder') { ctx.beginPath(); ctx.arc(x - 6, y - 8, 4, Math.PI * 1.1, Math.PI * 1.9); ctx.arc(x + 6, y - 8, 4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    ctx.beginPath();
    if (kind === 'smile') ctx.arc(x, y + 5, 6, 0.15, Math.PI - 0.15), ctx.stroke();
    else if (kind === 'grin') { ctx.arc(x, y + 4, 7, 0, Math.PI); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke(); }
    else if (kind === 'worry') ctx.arc(x, y + 11, 5, Math.PI + 0.3, -0.3), ctx.stroke();
    else if (kind === 'sick') { ctx.moveTo(x - 6, y + 9); for (let i = 0; i < 4; i++) ctx.lineTo(x - 6 + (i + 1) * 3.4, y + 9 + (i % 2 ? 2.5 : -2.5)); ctx.stroke(); }
    else if (kind === 'wonder') { ctx.ellipse(x, y + 9, 3, 4, 0, 0, TAU); ctx.fill(); }
    else if (kind === 'sleepy') { ctx.moveTo(x - 4, y + 8); ctx.lineTo(x + 4, y + 8); ctx.stroke(); }
    else { ctx.moveTo(x - 4, y + 8); ctx.lineTo(x + 4, y + 8); ctx.stroke(); }
    ctx.globalAlpha = 0.28; circle(ctx, x - 12, y + 6, 4, '#e8604c'); circle(ctx, x + 12, y + 6, 4, '#e8604c'); ctx.restore();
  }

  // ---- animals ---------------------------------------------------------------------
  // cow: o {x,y,s,dir,t,walk,graze(0..1),kind:'cow'|'aurochs'|'goat'|'sheep'|'horse'|'camel'|'yak',calf}
  const SPOTS = [[-40, -96, 18, 11], [-4, -84, 14, 9], [30, -100, 17, 10], [-58, -70, 10, 8], [8, -62, 11, 7], [52, -78, 9, 7]];
  function cow(ctx, o) {
    const kind = o.kind || 'cow', s = (o.s || 1) * (o.calf ? 0.52 : 1), dir = o.dir || 1, t = o.t || 0, ph = o.walk ?? null, sw = ph === null ? 0 : Math.sin(ph);
    const pal = { cow: ['#f4efe6', '#2b2623', '#f2b8a8'], aurochs: ['#4a3426', '#d7c3a0', '#7b5b45'], yak: ['#2b2420', '#4a3d36', '#6b5848'] }[kind] || ['#f4efe6', '#2b2623', '#f2b8a8'];
    const body = pal[0], spot = pal[1], muz = pal[2];
    const gr = (o.graze || 0), headDip = gr * 34 + (ph === null ? Math.sin(t * 1.3) * 1.5 : 0), tail = Math.sin(t * 3) * 14;
    ctx.save(); ctx.translate(o.x, o.y); ctx.scale(s * dir, s); shadow(ctx, 0, 0, 78, 0.22);
    const big = kind === 'aurochs' ? 1.08 : 1, calf = !!o.calf;
    const legs = [[48, 1], [30, -1], [-46, -1], [-30, 1]];
    legs.forEach(([lx, p], i) => { const a = ph === null ? 0 : sw * 22 * p * (i < 2 ? 1 : -1), top = -56, bx = lx + Math.sin((a * Math.PI) / 180) * 50; ctx.strokeStyle = i % 2 ? shade(body, -26) : body; ctx.lineWidth = 13; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(lx, top); ctx.lineTo(bx, -8); ctx.stroke(); ell(ctx, bx, -4, 8, 6, '#2a2320'); });
    // tail
    line(ctx, [[-68, -94], [-82 + tail * 0.4, -70], [-86 + tail, -44]], shade(body, -30), 5); ell(ctx, -86 + tail, -40, 6, 11, spot);
    // body
    ctx.fillStyle = body; rr(ctx, -72, -112 * big, 146, 62 * big, 30); ctx.fill();
    if (kind === 'aurochs') { circle(ctx, 32, -112, 36, body); }
    if (kind === 'cow') { ctx.save(); rr(ctx, -72, -112, 146, 62, 30); ctx.clip(); SPOTS.forEach(([x, y, rx, ry], i) => ell(ctx, x, y, rx, ry, spot, i)); ctx.restore(); }
    if (kind === 'yak') { ctx.fillStyle = '#3a2f29'; rr(ctx, -72, -80, 146, 34, 14); ctx.fill(); }
    // udder
    if (!calf && (kind === 'cow')) ell(ctx, -26, -48, 14, 9, muz);
    // neck + head
    const hx = 78, hy = -92 + headDip;
    ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(50, -108); ctx.quadraticCurveTo(76, -112 + headDip * 0.4, hx + 8, hy - 18); ctx.lineTo(hx + 10, hy + 22); ctx.quadraticCurveTo(70, -66, 52, -62); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(hx + 14, hy + 4); ctx.rotate(0.35 + gr * 0.5);
    ell(ctx, 0, 0, 30 * (calf ? 1.15 : 1), 18, body); ell(ctx, 22, 4, 15, 12, muz); circle(ctx, 27, 5, 2.2, '#5a3a30'); circle(ctx, 20, 6, 2.2, '#5a3a30');
    circle(ctx, -4, -6, 3.4, '#1a1412'); circle(ctx, -3, -7, 1.1, '#fff');
    // ears + horns
    ell(ctx, -14, -14, 12, 5, shade(body, -20), -0.5); ell(ctx, -6, -16, 12, 5, body, -0.2);
    if (!calf) { ctx.strokeStyle = kind === 'aurochs' ? '#eee4cf' : '#e8dcc0'; ctx.lineWidth = kind === 'aurochs' ? 7 : 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-8, -18); ctx.bezierCurveTo(-14, -42 * big, 4, -50 * big, 22, -44 * big); ctx.stroke(); }
    ctx.restore(); ctx.restore();
  }
  function goat(ctx, o) { // small stylised goat/sheep
    const s = o.s || 1, dir = o.dir || 1, t = o.t || 0, sheep = o.kind === 'sheep';
    ctx.save(); ctx.translate(o.x, o.y); ctx.scale(s * dir, s); shadow(ctx, 0, 0, 46, 0.2);
    const body = sheep ? '#f3efe6' : '#cdb89a';
    [[24], [12], [-24], [-12]].forEach(([lx], i) => { line(ctx, [[lx, -28], [lx, -4]], '#3a2f29', 7); });
    if (sheep) { [[-30, -52, 22], [-8, -58, 24], [18, -54, 22], [-18, -42, 20], [8, -40, 20], [-36, -40, 16]].forEach(([x, y, r]) => circle(ctx, x, y, r, body)); } else { rr(ctx, -38, -62, 76, 38, 18); ctx.fillStyle = body; ctx.fill(); }
    ell(ctx, 40, -56 + Math.sin(t * 2) * 1.5, 16, 12, sheep ? '#3a2f29' : '#b89c78', 0.2); circle(ctx, 45, -58, 2, '#111');
    if (!sheep) { line(ctx, [[34, -66], [30, -84]], '#6b5a48', 4); line(ctx, [[42, -66], [44, -84]], '#6b5a48', 4); line(ctx, [[48, -48], [50, -38]], '#e9dfcb', 3); }
    ctx.restore();
  }
  function horse(ctx, o) {
    const s = o.s || 1, dir = o.dir || 1, ph = o.walk ?? 0, sw = Math.sin(ph);
    ctx.save(); ctx.translate(o.x, o.y); ctx.scale(s * dir, s); shadow(ctx, 0, 0, 70, 0.22);
    const c = '#9a6b3f'; [[44, 1], [30, -1], [-44, -1], [-30, 1]].forEach(([lx, p], i) => line(ctx, [[lx, -56], [lx + sw * 18 * p * (i < 2 ? 1 : -1), -4]], i % 2 ? shade(c, -22) : c, 11));
    rr(ctx, -66, -108, 132, 56, 26); ctx.fillStyle = c; ctx.fill();
    ctx.beginPath(); ctx.moveTo(48, -102); ctx.lineTo(70, -142); ctx.lineTo(92, -136); ctx.lineTo(96, -108); ctx.lineTo(70, -84); ctx.closePath(); ctx.fillStyle = c; ctx.fill();
    ell(ctx, 94, -120, 15, 10, shade(c, 18), 0.5); circle(ctx, 76, -126, 2.6, '#111'); ctx.fillStyle = '#3a2418'; ctx.beginPath(); ctx.moveTo(52, -104); ctx.lineTo(68, -144); ctx.lineTo(60, -142); ctx.lineTo(44, -100); ctx.closePath(); ctx.fill();
    line(ctx, [[-66, -98], [-88, -76], [-82, -48]], '#3a2418', 8); ctx.restore();
  }
  function camel(ctx, o) {
    const s = o.s || 1, dir = o.dir || 1, ph = o.walk ?? 0, sw = Math.sin(ph); ctx.save(); ctx.translate(o.x, o.y); ctx.scale(s * dir, s); shadow(ctx, 0, 0, 70, 0.22);
    const c = '#c9a46a'; [[40, 1], [26, -1], [-42, -1], [-28, 1]].forEach(([lx, p], i) => line(ctx, [[lx, -60], [lx + sw * 16 * p * (i < 2 ? 1 : -1), -4]], i % 2 ? shade(c, -22) : c, 10));
    rr(ctx, -62, -112, 124, 54, 24); ctx.fillStyle = c; ctx.fill(); circle(ctx, -18, -118, 22, c); circle(ctx, 14, -116, 20, c);
    ctx.strokeStyle = c; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(50, -100); ctx.quadraticCurveTo(76, -128, 70, -158); ctx.stroke(); ell(ctx, 82, -162, 17, 11, shade(c, 14), 0.2); circle(ctx, 76, -167, 2.4, '#111'); ctx.restore();
  }

  // ---- grain / vignette / subtitles / transitions -----------------------------------
  let grainCv = null;
  function grain(ctx, t, a = 0.05) {
    if (!grainCv) { grainCv = document.createElement('canvas'); grainCv.width = grainCv.height = 220; const g = grainCv.getContext('2d'), id = g.createImageData(220, 220), R = rng(77); for (let i = 0; i < id.data.length; i += 4) { const v = R() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } g.putImageData(id, 0, 0); }
    const f = Math.floor(t * 12), R = rng(f * 31 + 5); ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = ctx.createPattern(grainCv, 'repeat'); ctx.translate(-R() * 220, -R() * 220); ctx.fillRect(0, 0, W + 220, H + 220); ctx.restore();
  }
  function vignette(ctx, a = 0.28) { ctx.save(); ctx.fillStyle = radial(ctx, W / 2, H / 2, H * 0.45, H * 1.0, [[0, 'rgba(0,0,0,0)'], [1, `rgba(0,0,0,${a})`]]); ctx.fillRect(0, 0, W, H); ctx.restore(); }
  function wrapLines(ctx, str, maxW) { const words = str.split(' '), lines = []; let cur = ''; words.forEach((w) => { const test = cur ? cur + ' ' + w : w; if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test; }); if (cur) lines.push(cur); return lines; }
  function subtitle(ctx, str, a = 1) {
    ctx.save(); ctx.globalAlpha = a; ctx.font = `700 23px ${FONT}`; const lines = wrapLines(ctx, str, 780), lh = 31, hgt = lines.length * lh + 14, wmax = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 34, y0 = H - 22 - hgt;
    ctx.fillStyle = 'rgba(10,12,20,.62)'; rr(ctx, W / 2 - wmax / 2, y0, wmax, hgt, 14); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; lines.forEach((l, i) => ctx.fillText(l, W / 2, y0 + 7 + 23 + i * lh)); ctx.restore();
  }
  function callout(ctx, str, x, y, t0, t, o = {}) {
    const p = E.back(prog(t, t0, t0 + 0.45)); if (p <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(p, p); ctx.font = `800 ${o.size || 26}px ${FONT}`;
    const w = ctx.measureText(str).width + 34, h = (o.size || 26) + 22; ctx.fillStyle = o.bg || '#fff'; ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4; rr(ctx, -w / 2, -h / 2, w, h, 12); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.fillStyle = o.color || '#1f2937'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(str, 0, 2); ctx.restore();
  }
  // big animated number / label, e.g. "10,500 years ago"
  function bigStat(ctx, big, small, x, y, t0, t, o = {}) {
    const p = E.out(prog(t, t0, t0 + 0.6)); if (p <= 0) return; ctx.save(); ctx.globalAlpha = p; ctx.translate(x, y + (1 - p) * 18);
    text(ctx, big, 0, 0, { size: o.size || 64, weight: 900, color: o.color || '#fff', shadow: true, blur: 16 }); text(ctx, small, 0, (o.size || 64) * 0.5 + 8, { size: o.sub || 24, weight: 600, color: o.subColor || 'rgba(255,255,255,.9)', shadow: true }); ctx.restore();
  }

  window.Studio = { W, H, TAU, clamp, lerp, prog, E, rng, FONT, rr, circle, ell, line, shadow, text, grad, radial, sky, sun, stars, clouds, ridge, grassTufts, tree, hut, fence, person, face, shade, cow, goat, horse, camel, grain, vignette, subtitle, wrapLines, callout, bigStat, SKY };
})();
