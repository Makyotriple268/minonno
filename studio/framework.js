// Timeline framework: turns DATA (script + narration durations) and scene drawers into a single draw(T).
(function () {
  const S = window.Studio, { W, H, clamp, prog, E } = S;
  const LEAD = 0.55, TAIL = 0.85, INTRO = 4.0;

  function chunks(text) {
    const sents = text.split(/(?<=[.!?:])\s+/), out = [];
    sents.forEach((s) => { const w = s.split(' '); if (w.length <= 12) out.push(s); else { const parts = s.split(/(?<=,)\s+/); let cur = ''; parts.forEach((p) => { if ((cur + ' ' + p).trim().split(' ').length > 11 && cur) { out.push(cur.trim()); cur = p; } else cur = (cur + ' ' + p).trim(); }); if (cur) out.push(cur); } });
    return out;
  }
  function build(drawers, extras = {}) {
    const items = []; let T = INTRO;
    window.DATA.scenes.forEach((sc, i) => {
      const dur = LEAD + sc.audio + TAIL + (extras.tail && extras.tail[sc.id] || 0), ch = chunks(sc.text), total = ch.reduce((a, c) => a + c.length, 0); let acc = 0;
      const subs = ch.map((c) => { const a = LEAD + (acc / total) * sc.audio; acc += c.length; return { text: c, a, b: LEAD + (acc / total) * sc.audio }; });
      const env = { id: sc.id, text: sc.text, A: sc.audio, LEAD, dur, cue: (phrase, fallback) => { const k = sc.text.indexOf(phrase); if (k < 0) { console.warn('cue not found', phrase); return fallback ?? 0; } return LEAD + (k / sc.text.length) * sc.audio; } };
      items.push({ start: T, dur, sc, env, subs, draw: drawers[sc.id] }); T += dur;
    });
    const total = T, audio = items.map((it) => ({ file: `${it.sc.id}.mp3`, at: it.start + LEAD, dur: it.sc.audio }));
    return {
      total, audio, intro: INTRO,
      draw(ctx, TT) {
        if (TT < INTRO) { drawers.intro(ctx, TT, { dur: INTRO }); fade(ctx, TT, INTRO, 0.4, 0.5); return; }
        const it = items.find((x) => TT >= x.start && TT < x.start + x.dur) || items[items.length - 1], t = TT - it.start;
        ctx.save(); it.draw(ctx, t, it.env); ctx.restore();
        const sub = it.subs.find((s) => t >= s.a - 0.05 && t <= s.b + 0.25); if (sub && !it.env.noSubs) S.subtitle(ctx, sub.text, clamp((t - sub.a + 0.05) / 0.15) * clamp((sub.b + 0.25 - t) / 0.2));
        S.grain(ctx, TT); fade(ctx, t, it.dur, it.env.fadeIn ?? 0.45, it.env.fadeOut ?? 0.45);
      },
    };
  }
  function fade(ctx, t, dur, a, b) { const k = Math.min(a ? clamp(t / a) : 1, b ? clamp((dur - t) / b) : 1); if (k < 1) { ctx.fillStyle = `rgba(8,10,20,${1 - k})`; ctx.fillRect(0, 0, W, H); } }
  function panel(ctx, t, a, b, fn, f = 0.5) { if (t < a - 0.01 || t > b + f) return; const k = Math.min(clamp((t - a) / f), clamp((b + f - t) / f)); ctx.save(); ctx.globalAlpha *= k; fn(t - a, k); ctx.restore(); }
  function camera(ctx, x, y, z) { ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-x, -y); }
  function pasture(ctx, t, o = {}) {
    S.sky(ctx, o.sky || 'day');
    if (o.sun !== false) S.sun(ctx, o.sunX ?? 770, o.sunY ?? 120, o.sunR ?? 38, t);
    if (o.stars) S.stars(ctx, t);
    if (o.clouds !== false) S.clouds(ctx, t, { y0: 30, yr: 120, n: 5, color: o.cloudColor });
    const off = (o.off ?? t * 6), c = o.pal || ['#8fbf86', '#6aa466', '#4f8c4d'];
    S.ridge(ctx, { y: 330, amp: 28, freq: 0.006, ph: 1, color: o.far || c[0], off: off * 0.3 });
    S.ridge(ctx, { y: 378, amp: 22, freq: 0.009, ph: 2.4, color: c[1], off: off * 0.6 });
    S.ridge(ctx, { y: 430, amp: 12, freq: 0.012, ph: 5, color: c[2], off });
    S.grassTufts(ctx, 450, off, S.shade(c[2], -30), 5, 40);
  }
  window.Framework = { build, panel, camera, pasture, LEAD, TAIL, INTRO };
})();
