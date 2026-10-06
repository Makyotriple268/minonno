// "Dark motivational" look: black room, cream character, red-glow shadow voice, DAY counters, glowing text.
(function () {
  const S = window.Stick, rad = (d) => (d * Math.PI) / 180;
  const FONT = '"Segoe Print","Comic Sans MS","Bradley Hand","Chalkboard SE",cursive';
  const SANS = '"Helvetica Neue",Arial,sans-serif';

  S.moodBg = (ctx, bg, t, { W, H, GROUND }) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, bg.top || '#0a0a0c'); g.addColorStop(1, bg.bottom || '#101014');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (bg.glow) { const r = ctx.createRadialGradient(bg.glow.x, bg.glow.y, 0, bg.glow.x, bg.glow.y, bg.glow.r || 260);
      r.addColorStop(0, bg.glow.color || 'rgba(255,200,120,.28)'); r.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = r; ctx.fillRect(0, 0, W, H); }
    if (bg.floor !== false) { ctx.strokeStyle = bg.floorColor || '#3a3a42'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(W, GROUND); ctx.stroke(); }
    if (bg.rain) { ctx.strokeStyle = 'rgba(150,170,220,.35)'; ctx.lineWidth = 1.5; for (let i = 0; i < 70; i++) { const x = (i * 83 + t * 120) % W, y = (i * 47 + t * 700) % H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 16); ctx.stroke(); } }
    if (bg.dust) { ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 25; i++) ctx.fillRect((i * 131 + t * 6) % W, (i * 71 + Math.sin(t + i) * 10 + 20) % H, 2, 2); }
  };

  S.moodPost = (ctx, scene, t, { W, H }) => {
    // vignette + letterbox + DAY label + film grain
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.65)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    if (scene.day) { ctx.fillStyle = 'rgba(235,235,235,.85)'; ctx.font = `bold 13px ${SANS}`; ctx.textAlign = 'left'; ctx.fillText(scene.day, 24, 32); }
  };

  S.moodCaption = (ctx, c, t, { W, H }) => {
    const a = Math.min(1, (t - c.from) / 0.5, (c.to - t) / 0.4);
    ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.textAlign = 'center';
    const lines = c.text.split('\n'), size = c.size || 20;
    ctx.font = `${c.bold ? 'bold ' : ''}${size}px Georgia, serif`; ctx.fillStyle = c.color || '#f1f1f1';
    ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 6;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, (c.y || H - 54) + i * (size * 1.35)));
    ctx.restore();
  };

  const O = S.objects;
  // red handwritten text that pops in and jitters: {type:'glowtext', text, x, y, size, from}
  O.glowtext = (ctx, o, t) => {
    const age = t - (o.from ?? 0); if (age < 0) return;
    const p = Math.min(1, age / 0.18), pop = 1 + (1 - p) * 0.4;
    ctx.save(); ctx.translate((o.shake ? Math.sin(t * 60) * 1.5 : 0), (o.shake ? Math.cos(t * 50) * 1.5 : 0));
    ctx.globalAlpha = Math.min(1, p * 1.2) * (o.fadeOut ? Math.max(0, Math.min(1, (o.to - t) / 0.3)) : 1);
    ctx.scale(pop, pop); ctx.textAlign = 'center';
    ctx.font = `${o.size || 34}px ${FONT}`; ctx.fillStyle = o.color || '#ff3b30'; ctx.shadowColor = o.color || '#ff3b30'; ctx.shadowBlur = o.blur ?? 14;
    ctx.fillText(o.text, 0, 0); ctx.restore();
  };
  // big white title text
  O.title = (ctx, o, t) => {
    const age = t - (o.from ?? 0); if (age < 0) return;
    ctx.save(); ctx.globalAlpha = Math.min(1, age / 0.5); ctx.textAlign = 'center';
    ctx.font = `${o.size || 64}px ${FONT}`; ctx.fillStyle = '#f5f5f5'; ctx.shadowColor = 'rgba(255,255,255,.35)'; ctx.shadowBlur = 12;
    ctx.fillText(o.text, 0, 0);
    if (o.underline) { ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 3; const w = ctx.measureText(o.text).width * Math.min(1, age / 0.8); ctx.beginPath(); ctx.moveTo(-w / 2, 12); ctx.quadraticCurveTo(0, 18, w / 2, 8); ctx.stroke(); }
    ctx.restore();
  };
  // bed: o.x,o.y = floor position at bed head (left end)
  O.bed = (ctx, o) => {
    ctx.fillStyle = '#16161b'; ctx.fillRect(-10, -80, 12, 80);                   // headboard
    ctx.fillStyle = '#23232b'; ctx.fillRect(0, -42, 260, 14);                    // frame
    ctx.fillStyle = '#2b3350'; ctx.beginPath(); ctx.roundRect(4, -62, 250, 26, 10); ctx.fill(); // blanket
    ctx.fillStyle = '#d9d3c0'; ctx.beginPath(); ctx.roundRect(8, -72, 52, 22, 10); ctx.fill();   // pillow
    ctx.fillStyle = '#16161b'; ctx.fillRect(4, -28, 8, 28); ctx.fillRect(246, -28, 8, 28);
  };
  O.nightstand = (ctx, o, t) => {
    ctx.fillStyle = '#1b1b22'; ctx.fillRect(-34, -70, 68, 70); ctx.strokeStyle = '#2d2d36'; ctx.lineWidth = 2; ctx.strokeRect(-34, -70, 68, 70);
    ctx.fillStyle = '#050505'; ctx.fillRect(-26, -118, 52, 44); ctx.strokeStyle = '#333'; ctx.strokeRect(-26, -118, 52, 44);
    ctx.fillStyle = o.red === false ? '#6a6a70' : '#ff3b30'; ctx.shadowColor = '#f00'; ctx.shadowBlur = 12; ctx.font = 'bold 26px "Courier New",monospace'; ctx.textAlign = 'center';
    ctx.fillText(o.time || '5:00', 0, -86);
  };
  O.window = (ctx, o) => {
    ctx.fillStyle = o.color || '#2b3350'; ctx.fillRect(-34, -34, 68, 68); ctx.strokeStyle = '#c9c9d4'; ctx.lineWidth = 3; ctx.strokeRect(-34, -34, 68, 68);
    ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(0, 34); ctx.moveTo(-34, 0); ctx.lineTo(34, 0); ctx.stroke();
    if (o.moon !== false) { ctx.fillStyle = '#f5f5f5'; ctx.beginPath(); ctx.arc(14, -14, 6, 0, 7); ctx.fill(); }
  };
  O.moonbeam = (ctx, o) => { const g = ctx.createLinearGradient(0, 0, 0, 320); g.addColorStop(0, 'rgba(160,180,255,.16)'); g.addColorStop(1, 'rgba(160,180,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.lineTo(150, 320); ctx.lineTo(-90, 320); ctx.fill(); };
  O.bigclock = (ctx, o, t) => {
    ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.roundRect(-110, -60, 220, 120, 10); ctx.fill(); ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#ff3b30'; ctx.shadowColor = '#f00'; ctx.shadowBlur = 22; ctx.font = 'bold 84px "Courier New",monospace'; ctx.textAlign = 'center'; ctx.fillText(o.time || '5:00', 0, 28);
  };
  O.lamppost = (ctx, o, t) => {
    ctx.fillStyle = '#25252c'; ctx.fillRect(-3, -150, 6, 150); ctx.fillRect(-3, -150, 24, 5);
    const g = ctx.createRadialGradient(21, -140, 0, 21, -140, 90); g.addColorStop(0, 'rgba(255,200,110,.5)'); g.addColorStop(1, 'rgba(255,200,110,0)'); ctx.fillStyle = g; ctx.fillRect(-90, -240, 220, 220);
    ctx.fillStyle = '#ffd98a'; ctx.beginPath(); ctx.arc(21, -142, 5, 0, 7); ctx.fill();
  };
  O.skyline = (ctx, o) => { // far buildings, o.w wide
    const w = o.w || 960; ctx.fillStyle = o.color || '#12131a'; let x = 0, i = 0;
    while (x < w) { const bw = 40 + ((i * 37) % 50), bh = 70 + ((i * 53) % 130); ctx.fillRect(x, -bh, bw, bh);
      ctx.fillStyle = 'rgba(255,214,130,.25)'; for (let k = 0; k < 4; k++) if ((i + k) % 3 === 0) ctx.fillRect(x + 8 + (k % 2) * 18, -bh + 14 + Math.floor(k / 2) * 26, 8, 10);
      ctx.fillStyle = o.color || '#12131a'; x += bw + 4; i++; }
  };
  O.stairs = (ctx, o) => { const n = o.n || 14; ctx.fillStyle = '#17171c'; for (let i = 0; i < n; i++) ctx.fillRect(i * (o.sw || 60), -(i + 1) * (o.sh || 34), (o.sw || 60) * (n - i) + 2, (o.sh || 34) + 1); ctx.strokeStyle = '#33333d'; ctx.lineWidth = 2; for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.moveTo(i * (o.sw || 60), -(i + 1) * (o.sh || 34)); ctx.lineTo((i + 1) * (o.sw || 60), -(i + 1) * (o.sh || 34)); ctx.stroke(); } };
  O.hills = (ctx, o, t, { W, H, GROUND }) => { // sunrise
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#16131f'); g.addColorStop(0.55, '#7a3b2e'); g.addColorStop(0.75, '#e08a3c'); g.addColorStop(1, '#2a1410');
    ctx.save(); ctx.setTransform(ctx.getTransform()); ctx.fillStyle = g; ctx.fillRect(-o.x, -o.y, W, H); ctx.restore();
    ctx.fillStyle = '#1a0f12'; ctx.beginPath(); ctx.moveTo(-o.x, 120); for (let x = -o.x; x <= W - o.x; x += 20) ctx.lineTo(x, 60 + Math.sin(x / 90 + 1) * 40 + Math.sin(x / 33) * 8); ctx.lineTo(W - o.x, 400); ctx.lineTo(-o.x, 400); ctx.fill();
  };
  O.lamp = (ctx, o) => { ctx.strokeStyle = '#555'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, -50); ctx.lineTo(34, -76); ctx.stroke(); ctx.fillStyle = '#6a6a72'; ctx.beginPath(); ctx.moveTo(26, -84); ctx.lineTo(48, -70); ctx.lineTo(36, -62); ctx.fill();
    const g = ctx.createRadialGradient(54, -36, 0, 54, -36, 150); g.addColorStop(0, 'rgba(255,214,140,.38)'); g.addColorStop(1, 'rgba(255,214,140,0)'); ctx.fillStyle = g; ctx.fillRect(-100, -190, 300, 300); };
  O.desk = (ctx) => { ctx.fillStyle = '#23232b'; ctx.fillRect(0, -78, 190, 8); ctx.fillRect(8, -70, 6, 70); ctx.fillRect(176, -70, 6, 70); };
  O.mirror = (ctx, o, t) => { ctx.strokeStyle = '#8a8a96'; ctx.lineWidth = 5; ctx.fillStyle = '#0c0c10'; ctx.beginPath(); ctx.ellipse(0, -90, 50, 80, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#25252c'; ctx.fillRect(-30, -10, 60, 10); };
  O.speedlines = (ctx, o, t) => { ctx.strokeStyle = 'rgba(255,196,80,.7)'; ctx.lineWidth = 2; for (let i = 0; i < 9; i++) { const y = -80 + i * 18, l = 40 + ((i * 37 + t * 600) % 60); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(-l, y - 6); ctx.stroke(); } };
})();
