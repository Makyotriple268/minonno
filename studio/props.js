// Props + infographics for the studio engine
(function () {
  const S = window.Studio, { TAU, W, H, E, prog, clamp, lerp, rr, circle, ell, line, text, shade, grad, radial, rng, FONT } = S;

  function pot(ctx, x, y, s = 1, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); S.shadow(ctx, 0, 0, 50, 0.22);
    const c = o.color || '#b8673a';
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-26, -88); ctx.bezierCurveTo(-62, -70, -58, -14, -30, 0); ctx.lineTo(30, 0); ctx.bezierCurveTo(58, -14, 62, -70, 26, -88); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(c, -26); rr(ctx, -30, -98, 60, 14, 5); ctx.fill();
    ctx.strokeStyle = '#f1d9a8'; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i <= 10; i++) { const px = -42 + i * 8.4, py = -56 + (i % 2 ? 7 : -7); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-34, -30); ctx.lineTo(34, -30); ctx.stroke();
    if (o.holes) { ctx.fillStyle = '#3a1f12'; for (let r = 0; r < 4; r++) for (let k = 0; k < 5; k++) circle(ctx, -32 + k * 16 + (r % 2) * 8, -78 + r * 17, 2.6, '#3a1f12'); }
    ctx.restore();
  }
  function cheese(ctx, x, y, s = 1, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); S.shadow(ctx, 0, 4, 34, 0.2);
    ctx.fillStyle = '#f7c948'; ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(34, 0); ctx.lineTo(34, -26); ctx.lineTo(-34, -48); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e5a91f'; ctx.beginPath(); ctx.moveTo(-34, -48); ctx.lineTo(34, -26); ctx.lineTo(52, -34); ctx.lineTo(-16, -58); ctx.closePath(); ctx.fill();
    [[-18, -14, 5], [8, -10, 4], [20, -22, 4], [-4, -28, 3.5]].forEach(([a, b, r]) => circle(ctx, a, b, r, '#d9951a')); ctx.restore();
  }
  function glass(ctx, x, y, s = 1, fill = 1, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); S.shadow(ctx, 0, 0, 30, 0.2);
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.moveTo(-26, -78); ctx.lineTo(26, -78); ctx.lineTo(20, 0); ctx.lineTo(-20, 0); ctx.closePath(); ctx.fill();
    const h = 70 * fill; ctx.save(); ctx.beginPath(); ctx.moveTo(-26, -78); ctx.lineTo(26, -78); ctx.lineTo(20, 0); ctx.lineTo(-20, 0); ctx.closePath(); ctx.clip(); ctx.fillStyle = '#fffdf6'; ctx.fillRect(-30, -h - 4, 60, h + 6); ctx.fillStyle = '#e9e4d6'; ctx.fillRect(-30, -h - 4, 60, 4); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-26, -78); ctx.lineTo(-20, 0); ctx.lineTo(20, 0); ctx.lineTo(26, -78); ctx.stroke(); ctx.restore();
  }
  function icecream(ctx, x, y, s = 1) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#d9a35a'; ctx.beginPath(); ctx.moveTo(-18, -50); ctx.lineTo(18, -50); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#b9803a'; ctx.lineWidth = 2; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 8 - 4, -50); ctx.lineTo(i * 3, -6); ctx.stroke(); } circle(ctx, -9, -58, 17, '#f7d6e0'); circle(ctx, 10, -60, 17, '#fff2cf'); circle(ctx, 0, -76, 16, '#f7d6e0'); circle(ctx, 0, -94, 5, '#d63b4a'); ctx.restore(); }
  function latte(ctx, x, y, s = 1) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); S.shadow(ctx, 0, 0, 40, 0.2); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-34, -52); ctx.lineTo(34, -52); ctx.quadraticCurveTo(30, 0, 0, 0); ctx.quadraticCurveTo(-30, 0, -34, -52); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(38, -32, 14, -1.2, 1.2); ctx.stroke(); ell(ctx, 0, -52, 34, 9, '#b9814f'); ctx.strokeStyle = '#f3dfc2'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -56); ctx.bezierCurveTo(-10, -54, -10, -48, 0, -47); ctx.bezierCurveTo(10, -48, 10, -54, 0, -56); ctx.stroke(); ctx.restore(); }
  function butter(ctx, x, y, s = 1) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); S.shadow(ctx, 0, 0, 36, 0.2); ctx.fillStyle = '#ffe27a'; rr(ctx, -34, -34, 68, 34, 6); ctx.fill(); ctx.fillStyle = '#fff1a8'; ctx.beginPath(); ctx.moveTo(-34, -34); ctx.lineTo(-22, -46); ctx.lineTo(46, -46); ctx.lineTo(34, -34); ctx.closePath(); ctx.fill(); ctx.restore(); }
  function jar(ctx, x, y, s = 1, fill = 0.8) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); S.shadow(ctx, 0, 0, 24, 0.2); ctx.fillStyle = '#d2a679'; ctx.beginPath(); ctx.moveTo(-16, -62); ctx.bezierCurveTo(-34, -48, -30, -8, -18, 0); ctx.lineTo(18, 0); ctx.bezierCurveTo(30, -8, 34, -48, 16, -62); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fffdf6'; ctx.beginPath(); ctx.moveTo(-26, -42); ctx.bezierCurveTo(-28, -20, -24, -6, -18, -2); ctx.lineTo(18, -2); ctx.bezierCurveTo(24, -6, 28, -20, 26, -42); ctx.closePath(); ctx.globalAlpha = fill; ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = '#8a6a4a'; rr(ctx, -16, -70, 32, 10, 3); ctx.fill(); ctx.restore(); }
  function bucket(ctx, x, y, s = 1, fill = 0) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); S.shadow(ctx, 0, 0, 26, 0.2); ctx.fillStyle = '#8a5a3b'; ctx.beginPath(); ctx.moveTo(-22, -36); ctx.lineTo(22, -36); ctx.lineTo(17, 0); ctx.lineTo(-17, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#5a3a24'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-20, -22); ctx.lineTo(20, -22); ctx.stroke(); ctx.save(); ctx.beginPath(); ctx.moveTo(-22, -36); ctx.lineTo(22, -36); ctx.lineTo(17, 0); ctx.lineTo(-17, 0); ctx.closePath(); ctx.clip(); ctx.fillStyle = '#fffdf6'; ctx.fillRect(-26, -4 - fill * 28, 52, 40); ctx.restore(); ell(ctx, 0, -36, 22, 5, fill > 0.05 ? '#fffdf6' : '#4a2f1f'); ctx.restore(); }

  // DNA double helix, horizontal; highlight rung glows at index hi
  function dna(ctx, x, y, w, h, t, o = {}) {
    ctx.save(); ctx.translate(x, y); const n = o.n || 28, ph = t * 1.2;
    for (let i = 0; i < n; i++) { const px = (i / (n - 1) - 0.5) * w, a = i * 0.45 + ph, y1 = Math.sin(a) * h / 2, y2 = -y1, z = Math.cos(a);
      const hot = o.hi === i; ctx.strokeStyle = hot ? '#ffd54a' : 'rgba(255,255,255,.28)'; ctx.lineWidth = hot ? 5 : 2.5; ctx.beginPath(); ctx.moveTo(px, y1); ctx.lineTo(px, y2); ctx.stroke();
      if (hot) { ctx.save(); ctx.fillStyle = radial(ctx, px, 0, 0, 60, [[0, 'rgba(255,213,74,.8)'], [1, 'rgba(255,213,74,0)']]); ctx.fillRect(px - 60, -60, 120, 120); ctx.restore(); }
      const cA = i % 2 ? '#59c3ff' : '#ff7ab6', cB = i % 2 ? '#ff7ab6' : '#59c3ff';
      ctx.globalAlpha = 0.65 + 0.35 * z; circle(ctx, px, y1, 6 + z * 1.5, hot ? '#ffd54a' : cA); ctx.globalAlpha = 0.65 - 0.35 * z; circle(ctx, px, y2, 6 - z * 1.5, hot ? '#ffd54a' : cB); ctx.globalAlpha = 1; }
    ctx.restore();
  }
  // stylised belly/gut with gas bubbles; a = intensity 0..1
  function gut(ctx, x, y, s, t, a) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#f08c9c'; ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; const wob = Math.sin(t * 6) * 3 * a;
    ctx.beginPath(); ctx.moveTo(-90, -40); ctx.bezierCurveTo(-30, -70 + wob, 40, -20, 90, -50); ctx.bezierCurveTo(130, -20, 110, 20, 50, 16); ctx.bezierCurveTo(-10, 12, -40, 50 + wob, -90, 30); ctx.stroke();
    ctx.strokeStyle = '#ffb3be'; ctx.lineWidth = 8; ctx.stroke();
    const R = rng(12); for (let i = 0; i < 9; i++) { const ph = (t * 0.7 * (0.6 + R() * 0.8) + R() * 3) % 1, bx = -70 + R() * 150, by = 30 - ph * 90 * (0.5 + a), r = (4 + R() * 9) * (0.4 + ph * 0.8); ctx.globalAlpha = a * (1 - ph) ; circle(ctx, bx, by, r, 'rgba(190,255,170,.75)', '#7bd36b', 1.5); ctx.globalAlpha = 1; }
    ctx.restore();
  }
  // lactose = galactose + glucose hexagons; lactase scissors cut at cutT
  function hexagon(ctx, x, y, r, color, label) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + TAU / 12; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.stroke(); if (label) text(ctx, label, x, y + 6, { size: 16, weight: 800, color: '#fff' }); }
  function lactose(ctx, x, y, s, split, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); const d = 36 + split * 46, bob = Math.sin(t * 2) * 3;
    if (split < 0.05) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke(); }
    hexagon(ctx, -d, bob - split * 14, 34, '#4fa3ff', 'gal'); hexagon(ctx, d, -bob + split * 14, 34, '#ff9f43', 'glu'); ctx.restore();
  }
  function scissors(ctx, x, y, s, open, rot = 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.strokeStyle = '#e9edf5'; ctx.lineWidth = 7; [-1, 1].forEach((k) => { ctx.save(); ctx.rotate(k * (0.12 + open * 0.38)); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -46); ctx.stroke(); ctx.restore(); }); ctx.strokeStyle = '#ff5d73'; ctx.lineWidth = 6; [-1, 1].forEach((k) => { ctx.beginPath(); ctx.arc(k * 14, 22, 11, 0, TAU); ctx.stroke(); }); ctx.restore(); }

  // ---- map ----------------------------------------------------------------------------
  // rough Afro-Eurasia outline in lon/lat (stylised)
  const LAND = [[-10, 36], [-9, 43], [-2, 43.5], [-1.5, 46.2], [-4.5, 48.4], [2, 51], [5, 53.4], [8.5, 55.5], [8, 57.5], [10.5, 57.7], [12.5, 56], [14, 54.5], [20, 54.8], [21, 57], [24, 59.3], [30, 60], [23, 60.5], [21.5, 63], [25, 65.5], [22, 66], [17.5, 62.5], [18.5, 59.5], [16, 56.5], [12.5, 56], [11, 59], [5.5, 58.5], [5, 62], [14, 67.5], [25, 71], [40, 68.5], [60, 69], [70, 73], [100, 77], [130, 72], [160, 69.5], [180, 67], [180, 50], [162, 55], [156, 51], [143, 53], [140, 46], [130, 42], [128.5, 38], [126.5, 34.8], [122, 40], [118, 38], [121.5, 31.5], [120, 27], [112, 21.5], [108, 21.5], [106, 10], [100, 13.5], [103, 3], [98, 8], [94, 16], [91, 22], [80, 15], [77, 8], [73, 17], [68, 23.5], [62, 25], [57, 25.8], [56.5, 27], [51, 29.5], [48, 30], [50.5, 25.2], [52, 24], [56.5, 24.5], [59, 22.5], [55, 17], [45, 13], [43, 15], [39, 21.5], [35, 28], [32.8, 29.9], [34.8, 31.5], [35.8, 34.5], [36, 36.5], [30, 36.4], [27, 37], [26.2, 40], [29, 41], [41.5, 41.2], [36, 41.5], [28.8, 41.1], [28, 43.5], [33, 45.2], [39.8, 47.1], [37.5, 45.3], [28.5, 45.2], [28, 41.5], [23.5, 40], [24, 37.5], [21.5, 36.5], [19.5, 41.8], [13.5, 45.6], [12.3, 45.2], [18.5, 40.2], [15.8, 38], [12, 41.7], [8.8, 44.4], [3.2, 43.2], [0.5, 40], [-0.5, 38], [-2, 36.7], [-5.6, 36], [-9, 37]];
  const AFRICA = [[-17, 21], [-16, 14], [-12, 7], [-7.5, 4.5], [2, 6], [9, 4], [9.8, -1], [13, -9], [12, -17], [15, -27], [18.2, -34.2], [25, -34], [32.5, -28.5], [35.5, -23], [40.5, -15], [39, -6], [41, -1], [51, 11.8], [43.2, 11.8], [37.5, 18], [34, 27], [32.5, 31.2], [25, 32], [19.5, 30.5], [10.3, 33.8], [10, 37.2], [0, 36], [-6, 35.7], [-10, 30], [-17, 21]];
  function proj(lon, lat, v) { const [cx, cy, sc] = v; return [W / 2 + (lon - cx) * sc, H / 2 - (lat - cy) * sc * 1.18]; }
  function map(ctx, v, o = {}) {
    // v = [centerLon, centerLat, scale px/deg]
    const sea = o.sea || ['#14324f', '#1b4a6e']; ctx.fillStyle = grad(ctx, 0, 0, 0, H, [[0, sea[0]], [1, sea[1]]]); ctx.fillRect(-100, -100, W + 200, H + 200);
    ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1; for (let lon = -40; lon <= 180; lon += 20) { const [a] = proj(lon, 0, v); ctx.beginPath(); ctx.moveTo(a, -50); ctx.lineTo(a, H + 50); ctx.stroke(); } for (let lat = -40; lat <= 80; lat += 20) { const [, b] = proj(0, lat, v); ctx.beginPath(); ctx.moveTo(-50, b); ctx.lineTo(W + 50, b); ctx.stroke(); }
    [LAND, AFRICA].forEach((poly) => { ctx.beginPath(); poly.forEach(([lo, la], i) => { const [px, py] = proj(lo, la, v); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath(); ctx.fillStyle = o.land || '#d9c7a0'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke(); });
  }
  function pin(ctx, lon, lat, v, label, t0, t, o = {}) {
    if (t < t0) return; const p = E.back(prog(t, t0, t0 + 0.5)); if (p <= 0) return; const [x, y] = proj(lon, lat, v), c = o.color || '#ff4d6d';
    ctx.save(); ctx.translate(x, y); const pulse = (t - t0) % 1.6 / 1.6; ctx.globalAlpha = (1 - pulse) * 0.8; ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 8 + pulse * 40, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    circle(ctx, 0, 0, 9 * p, c, '#fff', 3);
    if (label) { ctx.font = `800 ${o.size || 17}px ${FONT}`; const w = ctx.measureText(label).width + 20; ctx.save(); ctx.scale(p, p); ctx.fillStyle = 'rgba(10,14,28,.82)'; rr(ctx, -w / 2 + (o.dx || 0), (o.dy ?? -42), w, 28, 9); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(label, (o.dx || 0), (o.dy ?? -42) + 19); ctx.restore(); }
    ctx.restore();
  }
  function spread(ctx, lon, lat, v, t0, t, o = {}) { // growing translucent circle of spread
    const p = E.out(prog(t, t0, t0 + (o.dur || 3))); if (p <= 0) return; const [x, y] = proj(lon, lat, v), r = (o.r || 150) * p;
    ctx.save(); ctx.fillStyle = radial(ctx, x, y, 0, r, [[0, (o.color || 'rgba(255,213,74,.55)')], [0.7, (o.color || 'rgba(255,213,74,.35)')], [1, 'rgba(255,213,74,0)']]); ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }
  function arrowPath(ctx, pts, p, color = '#ffd54a', w = 5) {
    if (p <= 0) return; const segs = []; let L = 0; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(d); L += d; }
    let rem = L * p; ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.setLineDash([12, 9]); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); let last = pts[0];
    for (let i = 1; i < pts.length && rem > 0; i++) { const d = segs[i - 1], f = Math.min(1, rem / d); last = [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]; ctx.lineTo(last[0], last[1]); rem -= d; } ctx.stroke(); ctx.setLineDash([]);
    if (p > 0.98) { const q = pts[pts.length - 2], e = pts[pts.length - 1], a = Math.atan2(e[1] - q[1], e[0] - q[0]); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(e[0] - 14 * Math.cos(a - 0.5), e[1] - 14 * Math.sin(a - 0.5)); ctx.lineTo(e[0] - 14 * Math.cos(a + 0.5), e[1] - 14 * Math.sin(a + 0.5)); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  function bars(ctx, x, y, w, h, items, t, t0) { // horizontal bars: items [{label, v(0..1), color, txt}]
    const gap = 16, bh = (h - gap * (items.length - 1)) / items.length;
    items.forEach((it, i) => { const p = E.out(prog(t, t0 + i * 0.45, t0 + i * 0.45 + 1.1)), yy = y + i * (bh + gap); ctx.globalAlpha = clamp(p * 3); text(ctx, it.label, x, yy + bh / 2 + 7, { size: 22, weight: 700, align: 'left', color: '#fff' }); const bx = x + 250, bw = w - 250; ctx.fillStyle = 'rgba(255,255,255,.12)'; rr(ctx, bx, yy, bw, bh, bh / 2); ctx.fill(); ctx.fillStyle = it.color; rr(ctx, bx, yy, Math.max(bh, bw * it.v * p), bh, bh / 2); ctx.fill(); text(ctx, it.txt.replace('{n}', Math.round(it.v * 100 * p)), bx + Math.max(bh, bw * it.v * p) - 14, yy + bh / 2 + 8, { size: 24, weight: 800, align: 'right', color: '#10131f' }); ctx.globalAlpha = 1; });
  }
  function donut(ctx, x, y, r, frac, p, c1 = '#ff6b6b', c2 = 'rgba(255,255,255,.18)') { ctx.save(); ctx.lineWidth = r * 0.42; ctx.lineCap = 'butt'; ctx.strokeStyle = c2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.strokeStyle = c1; ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * frac * p); ctx.stroke(); ctx.restore(); }
  function timeline(ctx, y, t0, t, items, o = {}) { // items [{x,label,sub,color}] on a horizontal axis
    const p = E.out(prog(t, t0, t0 + 1.2)); ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(o.x0 ?? 60, y); ctx.lineTo(lerp(o.x0 ?? 60, o.x1 ?? 900, p), y); ctx.stroke(); ctx.restore();
    items.forEach((it, i) => { const q = E.back(prog(t, it.t, it.t + 0.5)); if (q <= 0) return; ctx.save(); ctx.translate(it.x, y); ctx.scale(q, q); circle(ctx, 0, 0, 11, it.color || '#ffd54a', '#fff', 3); text(ctx, it.label, 0, it.up ? -34 : 44, { size: 26, weight: 800, color: '#fff', shadow: true }); if (it.sub) text(ctx, it.sub, 0, it.up ? -12 : 68, { size: 17, weight: 600, color: 'rgba(255,255,255,.85)', shadow: true }); ctx.restore(); });
  }

  Object.assign(S, { pot, cheese, glass, icecream, latte, butter, jar, bucket, dna, gut, lactose, scissors, hexagon, map, proj, pin, spread, arrowPath, bars, donut, timeline });
})();
