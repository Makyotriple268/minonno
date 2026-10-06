// Stick-man animation engine. Pure canvas, deterministic: draw(t) renders the video at time t (seconds).
// Logical canvas is 540x960 (9:16). The renderer scales it up to 1080x1920.
(function () {
  let W = 540, H = 960, GROUND = 700;
  const rad = (d) => (d * Math.PI) / 180;

  // ---- easing -------------------------------------------------------------
  const ease = {
    linear: (p) => p,
    in: (p) => p * p,
    out: (p) => 1 - (1 - p) * (1 - p),
    inOut: (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
    back: (p) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); },
    bounce: (p) => {
      const n = 7.5625, d = 2.75;
      if (p < 1 / d) return n * p * p;
      if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75;
      if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375;
      return n * (p -= 2.625 / d) * p + 0.984375;
    },
  };

  // ---- poses (degrees; limbs measured from straight down, + = toward facing direction) ----
  // a1 = shoulder/hip angle, a2 = elbow/knee bend added on top of a1
  const POSES = {
    idle:   { torso: 0,  head: 0,  aL1: 8,   aL2: 5,   aR1: -8,  aR2: 5,   lL1: 6,  lL2: 0,  lR1: -6, lR2: 0 },
    wave:   { torso: 0,  head: 5,  aL1: 8,   aL2: 5,   aR1: 150, aR2: -30, lL1: 6,  lL2: 0,  lR1: -6, lR2: 0 },
    wave2:  { torso: 0,  head: 5,  aL1: 8,   aL2: 5,   aR1: 150, aR2: 30,  lL1: 6,  lL2: 0,  lR1: -6, lR2: 0 },
    point:  { torso: 4,  head: 0,  aL1: 8,   aL2: 5,   aR1: 90,  aR2: 0,   lL1: 8,  lL2: 0,  lR1: -8, lR2: 0 },
    cheer:  { torso: -4, head: -8, aL1: 155, aL2: 10,  aR1: 155, aR2: -10, lL1: 12, lL2: 0,  lR1: -12,lR2: 0 },
    shrug:  { torso: 0,  head: 6,  aL1: 40,  aL2: 80,  aR1: -40, aR2: -80, lL1: 6,  lL2: 0,  lR1: -6, lR2: 0 },
    think:  { torso: 2,  head: 10, aL1: 8,   aL2: 5,   aR1: 40,  aR2: 120, lL1: 6,  lL2: 0,  lR1: -6, lR2: 0 },
    scared: { torso: -10,head: -10,aL1: 70,  aL2: 40,  aR1: -20, aR2: 90,  lL1: 14, lL2: 20, lR1: -14,lR2: 10 },
    crouch: { torso: 18, head: 0,  aL1: 30,  aL2: 40,  aR1: -30, aR2: 40,  lL1: 55, lL2: -90,lR1: -35,lR2: -90, drop: 38 },
    jump:   { torso: -4, head: -5, aL1: 150, aL2: 0,   aR1: 150, aR2: 0,   lL1: 25, lL2: -40,lR1: -25,lR2: -40 },
    sit:    { torso: 0,  head: 0,  aL1: 30,  aL2: 60,  aR1: 30,  aR2: 60,  lL1: 90, lL2: -90,lR1: 90, lR2: -90 },
    sleep:  { torso: 0,  head: 25, aL1: 10,  aL2: 10,  aR1: -10, aR2: 10,  lL1: 90, lL2: -90,lR1: 90, lR2: -90 },
    dead:   { torso: 90, head: 0,  aL1: 90,  aL2: 0,   aR1: -90, aR2: 0,   lL1: 85, lL2: 0,  lR1: 95, lR2: 0, drop: 94 },
  };
  const POSE_KEYS = Object.keys(POSES.idle);

  function walkPose(phase, speedFactor = 1) {
    const s = Math.sin(phase), c = Math.cos(phase);
    const k = 38 * speedFactor;
    return {
      torso: 4, head: 0,
      aL1: -s * k, aL2: 20 + Math.max(0, -s) * 25,
      aR1: s * k,  aR2: 20 + Math.max(0, s) * 25,
      lL1: s * k,  lL2: -Math.max(0, -c) * 55,
      lR1: -s * k, lR2: -Math.max(0, c) * 55,
      bob: Math.abs(Math.cos(phase)) * 5,
    };
  }

  // ---- drawing helpers ---------------------------------------------------
  function limb(ctx, x, y, a1, a2, l1, l2) {
    const jx = x + Math.sin(rad(a1)) * l1, jy = y + Math.cos(rad(a1)) * l1;
    const ex = jx + Math.sin(rad(a1 + a2)) * l2, ey = jy + Math.cos(rad(a1 + a2)) * l2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(jx, jy); ctx.lineTo(ex, ey); ctx.stroke();
    return [ex, ey];
  }

  function drawFigure(ctx, f) {
    // f: {x, y(ground), dir, pose, face, color, scale, rot, talk, props}
    const P = f.pose, d = f.dir || 1, sc = f.scale || 1;
    ctx.save();
    ctx.translate(f.x, f.y);
    if (f.rot) ctx.rotate(rad(f.rot));
    ctx.scale(sc * d, sc);
    const soft = f.style === 'soft';
    ctx.strokeStyle = f.color || (soft ? '#e9e2cf' : '#111'); ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = soft ? 15 : 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (f.glow) { ctx.shadowColor = f.glow; ctx.shadowBlur = 22; }

    const legLen = 52, hipY = -(legLen * 2 - (P.drop || 0)) - (P.bob || 0) + (P.lift || 0) * -1;
    const hx = 0, hy = hipY;
    const tl = 72, ta = rad(P.torso || 0);
    const sx = hx + Math.sin(ta) * tl, sy = hy - Math.cos(ta) * tl;

    limb(ctx, hx, hy, P.lL1, P.lL2, legLen, legLen);
    limb(ctx, hx, hy, P.lR1, P.lR2, legLen, legLen);
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(sx, sy); ctx.stroke();
    const handL = limb(ctx, sx, sy, P.aL1, P.aL2, 40, 38);
    const handR = limb(ctx, sx, sy, P.aR1, P.aR2, 40, 38);

    // head
    const hr = 26, ha = rad((P.head || 0) + (P.torso || 0));
    const cx = sx + Math.sin(ha) * (hr + 6), cy = sy - Math.cos(ha) * (hr + 6);
    ctx.fillStyle = f.fill || (soft ? (f.color || '#e9e2cf') : '#fff');
    ctx.beginPath(); ctx.arc(cx, cy, hr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = soft ? (f.eyes || '#2a2a2a') : (f.color || '#111'); ctx.strokeStyle = ctx.fillStyle;
    drawFace(ctx, cx, cy, hr, f.face || 'happy', f.talk || 0, f.t || 0);
    if (f.band) { ctx.fillStyle = '#e53935'; ctx.fillRect(cx - hr + 1, cy - 12, hr * 2 - 2, 7); ctx.beginPath(); ctx.moveTo(cx - hr, cy - 9); ctx.lineTo(cx - hr - 16, cy - 2 + Math.sin(f.t * 6) * 3); ctx.lineTo(cx - hr - 14, cy - 14); ctx.fill(); }

    if (f.hat === 'cap') { ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.arc(cx, cy - 4, hr + 2, Math.PI, 0); ctx.fill(); ctx.fillRect(cx, cy - 6, hr + 14, 6); }
    if (f.hat === 'top') { ctx.fillStyle = '#222'; ctx.fillRect(cx - hr - 6, cy - hr - 2, hr * 2 + 12, 6); ctx.fillRect(cx - hr + 6, cy - hr - 34, hr * 2 - 12, 34); }
    if (f.prop) f.prop(ctx, handR, handL);
    ctx.restore();
    return { head: [f.x + cx * sc * d, f.y + cy * sc] };
  }

  function drawFace(ctx, cx, cy, r, face, talk, t) {
    ctx.save(); ctx.lineWidth = 4;
    const blink = (t % 3.2) > 3.1;
    const eye = (ex, ey) => {
      if (face === 'tired') { ctx.beginPath(); ctx.moveTo(ex - 5, ey); ctx.lineTo(ex + 5, ey); ctx.stroke(); ctx.beginPath(); ctx.arc(ex, ey + 2, 2, 0, 7); ctx.fill(); }
      else if (face === 'angry' || face === 'determined') { ctx.beginPath(); ctx.moveTo(ex - 5, ey - 5); ctx.lineTo(ex + 5, ey - 1); ctx.stroke(); ctx.beginPath(); ctx.arc(ex, ey + 2, 2.4, 0, 7); ctx.fill(); }
      else if (face === 'evil') { ctx.save(); ctx.strokeStyle = ctx.fillStyle = '#ff3b30'; ctx.shadowColor = '#f00'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(ex - 6, ey - 4); ctx.lineTo(ex + 6, ey); ctx.stroke(); ctx.restore(); }
      else if (face === 'dead') { ctx.beginPath(); ctx.moveTo(ex - 4, ey - 4); ctx.lineTo(ex + 4, ey + 4); ctx.moveTo(ex + 4, ey - 4); ctx.lineTo(ex - 4, ey + 4); ctx.stroke(); }
      else if (face === 'sleep' || blink) { ctx.beginPath(); ctx.moveTo(ex - 4, ey); ctx.lineTo(ex + 4, ey); ctx.stroke(); }
      else if (face === 'shock') { ctx.beginPath(); ctx.arc(ex, ey, 6, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(ex, ey, 1.8, 0, 7); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(ex, ey, 3.6, 0, 7); ctx.fill(); }
    };
    eye(cx + 4, cy - 4); eye(cx + 15, cy - 4);
    const mx = cx + 10, my = cy + 10, open = talk ? (Math.sin(t * 22) * 0.5 + 0.5) * 6 + 2 : 0;
    ctx.beginPath();
    if (talk) { ctx.ellipse(mx, my, 5, open / 1.5 + 1, 0, 0, 7); ctx.fill(); }
    else if (face === 'happy' || face === 'cheer') { ctx.arc(mx, my - 3, 7, 0.1, Math.PI - 0.1); ctx.stroke(); }
    else if (face === 'tired' || face === 'evil') { ctx.moveTo(mx - 5, my + 3); ctx.quadraticCurveTo(mx, my - 1, mx + 5, my + 3); ctx.stroke(); }
    else if (face === 'determined' || face === 'angry') { ctx.moveTo(mx - 6, my + 2); ctx.lineTo(mx + 6, my + 2); ctx.stroke(); }
    else if (face === 'sad' || face === 'scared') { ctx.arc(mx, my + 7, 6, Math.PI + 0.3, -0.3); ctx.stroke(); }
    else if (face === 'shock') { ctx.ellipse(mx, my + 2, 5, 7, 0, 0, 7); ctx.stroke(); }
    else if (face === 'smirk') { ctx.moveTo(mx - 6, my); ctx.quadraticCurveTo(mx + 2, my + 6, mx + 9, my - 3); ctx.stroke(); }
    else { ctx.moveTo(mx - 6, my + 1); ctx.lineTo(mx + 6, my + 1); ctx.stroke(); }
    if (face === 'scared') { ctx.fillStyle = '#4fc3f7'; ctx.beginPath(); ctx.ellipse(cx - 6, cy - 22 + (t * 30) % 10, 3, 5, 0, 0, 7); ctx.fill(); }
    ctx.restore();
  }

  // ---- timeline evaluation -----------------------------------------------
  // keyframes: [{t, x, y?, pose?, face?, dir?, rot?, scale?, ease?, walk?}]  (t in seconds, relative to scene)
  function sample(kfs, t, key, dflt) {
    if (!kfs.length) return dflt;
    let a = null, b = null;
    for (const k of kfs) { if (k[key] === undefined) continue; if (k.t <= t) a = k; else { b = k; break; } }
    if (!a && !b) return dflt;
    if (!a) return b[key];
    if (!b) return a[key];
    const p = Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t || 1)));
    const e = (ease[b.ease] || ease.inOut)(p);
    const av = a[key], bv = b[key];
    return typeof av === 'number' && typeof bv === 'number' ? av + (bv - av) * e : av;
  }
  function lastBefore(kfs, t, key, dflt) {
    let v = dflt; for (const k of kfs) if (k.t <= t && k[key] !== undefined) v = k[key]; return v;
  }
  function poseAt(kfs, t) {
    // tween between named poses at each keyframe
    let a = null, b = null;
    for (const k of kfs) { if (!k.pose) continue; if (k.t <= t) a = k; else { b = k; break; } }
    const A = POSES[(a || b || { pose: 'idle' }).pose] || POSES.idle;
    if (!a || !b) return Object.assign({}, POSES.idle, A);
    const B = POSES[b.pose] || POSES.idle;
    // hold the pose until `hold` seconds before next key; blend over the transition window
    const dur = Math.min(b.t - a.t, b.blend || 0.35);
    const p = Math.min(1, Math.max(0, (t - (b.t - dur)) / (dur || 1)));
    const e = (ease[b.ease] || ease.out)(p);
    const out = {};
    for (const key of [...POSE_KEYS, 'drop']) { const av = A[key] ?? 0, bv = B[key] ?? 0; out[key] = av + (bv - av) * e; }
    return out;
  }

  function resolveActor(def, t) {
    const kfs = def.keys || [];
    const x = sample(kfs, t, 'x', def.x ?? W / 2);
    const y = sample(kfs, t, 'y', def.y ?? GROUND);
    let pose = poseAt(kfs, t);
    // walking: any segment flagged walk:true between key a and next key
    let walking = false;
    for (let i = 0; i < kfs.length - 1; i++) if (kfs[i].walk && t >= kfs[i].t && t < kfs[i + 1].t) walking = true;
    const prevX = sample(kfs, Math.max(0, t - 0.04), 'x', x);
    const vx = (x - prevX) / 0.04;
    if (walking && Math.abs(vx) > 5) {
      // phase from distance travelled so feet don't slide
      let dist = 0; const step = 1 / 30;
      for (let s = 0; s < t; s += step) dist += Math.abs(sample(kfs, s + step, 'x', x) - sample(kfs, s, 'x', x));
      pose = Object.assign({}, pose, walkPose(dist / 22));
    }
    // jump arc between keys flagged jump:true
    let lift = 0;
    for (let i = 0; i < kfs.length - 1; i++) if (kfs[i].jump && t >= kfs[i].t && t < kfs[i + 1].t) {
      const p = (t - kfs[i].t) / (kfs[i + 1].t - kfs[i].t); lift = Math.sin(p * Math.PI) * (kfs[i].jump);
    }
    const talkSpans = def.talk || [];
    const talk = talkSpans.some(([a, b]) => t >= a && t <= b) ? 1 : 0;
    return {
      x, y: y - lift, dir: lastBefore(kfs, t, 'dir', def.dir || 1), pose, t,
      face: lastBefore(kfs, t, 'face', def.face || 'happy'),
      rot: sample(kfs, t, 'rot', 0), scale: sample(kfs, t, 'scale', def.scale || 1),
      color: def.color, fill: def.fill, hat: def.hat, talk, prop: def.prop, style: def.style, glow: def.glow, band: def.band, eyes: def.eyes, scaleDefault: def.scale,
    };
  }

  // ---- scene furniture -----------------------------------------------------
  function drawBackground(ctx, bg, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, bg.top || '#bfe7ff'); g.addColorStop(1, bg.bottom || '#eaf7ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (bg.sun) { ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.arc(430, 150, 55, 0, 7); ctx.fill(); }
    if (bg.clouds) for (let i = 0; i < 3; i++) {
      const cx = ((i * 260 + t * 14) % (W + 200)) - 100, cy = 120 + i * 70;
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      [[0, 0, 34], [30, -10, 28], [58, 4, 30], [28, 8, 30]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(cx + dx, cy + dy, r, 0, 7); ctx.fill(); });
    }
    if (bg.night) { ctx.fillStyle = '#fff'; for (let i = 0; i < 40; i++) ctx.fillRect((i * 97) % W, (i * 53) % 500, 2, 2); }
    if (bg.ground !== false) {
      ctx.fillStyle = bg.groundColor || '#8bc34a'; ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(0, GROUND, W, 6);
    }
  }

  function drawObject(ctx, o, t) {
    // simple built-in props: {type, x, y, ...}
    ctx.save(); ctx.translate(o.x, o.y + (o.bob ? Math.sin(t * 3) * o.bob : 0));
    if (o.rot) ctx.rotate(rad(o.rot + (o.wobble ? Math.sin(t * 8) * o.wobble : 0)));
    const s = o.scale ?? 1; ctx.scale(s, s);
    ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.strokeStyle = '#222';
    switch (o.type) {
      case 'sign':
        ctx.fillStyle = '#8d6e63'; ctx.fillRect(-5, -10, 10, 100);
        ctx.fillStyle = o.color || '#fff'; ctx.fillRect(-75, -70, 150, 70); ctx.strokeRect(-75, -70, 150, 70);
        ctx.fillStyle = '#222'; ctx.font = 'bold 26px Arial'; ctx.textAlign = 'center'; ctx.fillText(o.text, 0, -25); break;
      case 'tree':
        ctx.fillStyle = '#6d4c41'; ctx.fillRect(-12, -20, 24, 110);
        ctx.fillStyle = '#43a047'; ctx.beginPath(); ctx.arc(0, -50, 60, 0, 7); ctx.fill(); break;
      case 'box':
        ctx.fillStyle = o.color || '#ffb74d'; ctx.fillRect(-o.w / 2, -o.h, o.w, o.h); ctx.strokeRect(-o.w / 2, -o.h, o.w, o.h);
        if (o.text) { ctx.fillStyle = '#222'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center'; ctx.fillText(o.text, 0, -o.h / 2 + 8); } break;
      case 'text':
        ctx.fillStyle = o.color || '#222'; ctx.font = `bold ${o.size || 40}px Arial`; ctx.textAlign = 'center';
        o.text.split('\n').forEach((l, i) => ctx.fillText(l, 0, i * (o.size || 40) * 1.15)); break;
      case 'emoji': ctx.font = `${o.size || 60}px serif`; ctx.textAlign = 'center'; ctx.fillText(o.text, 0, 0); break;
      default: if (window.Stick.objects[o.type]) window.Stick.objects[o.type](ctx, o, t, { W, H, GROUND }); break;
      case 'zzz': ctx.fillStyle = '#222'; ctx.font = 'bold 34px Arial'; for (let i = 0; i < 3; i++) { const p = ((t * .8 + i / 3) % 1); ctx.globalAlpha = 1 - p; ctx.fillText('Z', p * 40 + i * 10, -p * 80 - i * 12); } break;
    }
    ctx.restore();
  }

  function drawCaption(ctx, c, t) {
    const text = c.text, t0 = c.from;
    const p = Math.min(1, (t - t0) / 0.15);
    ctx.save(); ctx.globalAlpha = p;
    ctx.font = 'bold 44px Arial'; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    const lines = text.split('\n'); const y0 = 840 - (lines.length - 1) * 26;
    lines.forEach((l, i) => {
      ctx.lineWidth = 10; ctx.strokeStyle = '#000'; ctx.strokeText(l, W / 2, y0 + i * 52);
      ctx.fillStyle = '#fff'; ctx.fillText(l, W / 2, y0 + i * 52);
    });
    ctx.restore();
  }

  function drawBubble(ctx, text, x, y, t0, t) {
    const p = ease.back(Math.min(1, (t - t0) / 0.25));
    ctx.save(); ctx.translate(x, y); ctx.scale(p, p);
    ctx.font = 'bold 28px Arial'; ctx.textAlign = 'center';
    const lines = text.split('\n'), w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 36, h = lines.length * 34 + 24;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(-w / 2, -h - 30, w, h, 18); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10, -31); ctx.lineTo(0, -8); ctx.lineTo(12, -31); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, -33); ctx.lineTo(10, -33); ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.stroke();
    ctx.fillStyle = '#111'; lines.forEach((l, i) => ctx.fillText(l, 0, -h - 30 + 34 + i * 34));
    ctx.restore();
  }

  // ---- main ---------------------------------------------------------------
  // video = {title, scenes:[{dur, bg, actors:[{id, keys, talk, color, hat, ...}], objects:[{...,from,to}],
  //          captions:[{text, from, to}], bubbles:[{actor, text, from, to}], shake:[from,to], flash:[from,to], cut}]}
  function makeVideo(video, canvas) {
    if (video.size) { W = video.size[0]; H = video.size[1]; GROUND = video.ground || Math.round(H * 0.8); }
    const ctx = canvas.getContext('2d');
    const total = video.scenes.reduce((s, sc) => s + sc.dur, 0);
    function draw(T) {
      let t = T, scene = video.scenes[video.scenes.length - 1];
      for (const sc of video.scenes) { if (t < sc.dur) { scene = sc; break; } t -= sc.dur; }
      ctx.save();
      ctx.clearRect(0, 0, W, H);
      if (scene.shake && t >= scene.shake[0] && t <= scene.shake[1]) ctx.translate((Math.random() - .5) * 0 + Math.sin(t * 90) * 6, Math.cos(t * 70) * 6);
      if ((scene.bg || {}).mood) window.Stick.moodBg(ctx, scene.bg, t, { W, H, GROUND }); else drawBackground(ctx, scene.bg || {}, t);
      (scene.objects || []).forEach((o) => { if ((o.from ?? 0) <= t && t <= (o.to ?? 1e9)) drawObject(ctx, o.keys ? Object.assign({}, o, { x: sample(o.keys, t, 'x', o.x), y: sample(o.keys, t, 'y', o.y), rot: sample(o.keys, t, 'rot', o.rot || 0), scale: sample(o.keys, t, 'scale', o.scale ?? 1) }) : o, t); });
      const pos = {};
      (scene.actors || []).forEach((a) => {
        const f = resolveActor(a, t); const r = drawFigure(ctx, f); pos[a.id] = r.head;
      });
      (scene.bubbles || []).forEach((b) => { if (b.from <= t && t <= b.to && pos[b.actor]) drawBubble(ctx, b.text, pos[b.actor][0], pos[b.actor][1] - 30, b.from, t); });
      ctx.restore();
      if (window.Stick.moodPost) window.Stick.moodPost(ctx, scene, t, { W, H, GROUND });
      (scene.captions || []).forEach((c) => { if (c.from <= t && t <= c.to) (scene.bg && scene.bg.mood ? window.Stick.moodCaption : drawCaption)(ctx, c, t, { W, H, GROUND }); });
      if (scene.flash && t >= scene.flash[0] && t <= scene.flash[1]) { ctx.fillStyle = `rgba(255,255,255,${1 - (t - scene.flash[0]) / (scene.flash[1] - scene.flash[0])})`; ctx.fillRect(0, 0, W, H); }
      // fade in/out per scene
      const fade = scene.fade ?? 0.15;
      const a = Math.min(1, t / fade, (scene.dur - t) / fade);
      if (a < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - Math.max(0, a)})`; ctx.fillRect(0, 0, W, H); }
    }
    return { draw, total, W, H };
  }

  window.Stick = { objects: {}, makeVideo, POSES, ease, W, H, GROUND };
})();
