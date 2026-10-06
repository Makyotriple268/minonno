// "Day One" — dark motivational short in the moody style. 960x540, edit the data and re-render.
const G = 440;
const hero = (keys, extra = {}) => Object.assign({ id: 'hero', style: 'soft', scale: 0.8, keys }, extra);
const shadow = (keys, extra = {}) => Object.assign({ id: 'shade', style: 'soft', color: '#0b0b0b', glow: '#ff3b30', eyes: '#ff3b30', scale: 0.85, keys, face: 'evil' }, extra);
const M = (extra) => Object.assign({ mood: true }, extra);

window.VIDEO = { title: 'Day One', size: [960, 540], ground: G, scenes: [
  // 1 — title card
  { dur: 4, bg: M({ floor: false }), captions: [{ text: 'Every morning, he made the same promise.', from: 0.6, to: 3.6, y: 275, size: 24 }] },

  // 2 — the bed, snooze
  { dur: 6, day: 'DAY 1', bg: M({ glow: { x: 700, y: 120, r: 300, color: 'rgba(150,170,255,.10)' } }),
    objects: [
      { type: 'window', x: 760, y: 110, scale: 1.4 }, { type: 'moonbeam', x: 760, y: 150 },
      { type: 'nightstand', x: 250, y: G, time: '5:00' }, { type: 'bed', x: 300, y: G },
      { type: 'glowtext', text: 'just five more minutes...', x: 400, y: 300, size: 26, from: 2.0, to: 5.4, fadeOut: true, shake: false },
      { type: 'zzz', x: 330, y: 330, from: 0, to: 2.0 }],
    actors: [hero([{ t: 0, x: 420, y: G - 48, dir: -1, pose: 'dead', face: 'tired' }])],
    captions: [{ text: 'The alarm rang at 5:00.', from: 0.3, to: 2.0, y: 500, size: 20 }, { text: 'His body said no.', from: 3.0, to: 5.5, y: 500, size: 20 }] },

  // 3 — clock
  { dur: 3.2, bg: M({ floor: false }), objects: [{ type: 'bigclock', x: 480, y: 280, time: '5:00', scale: 1.6 }], captions: [{ text: 'So he slept.', from: 0.6, to: 3.0, y: 470, size: 22 }] },

  // 4 — the shadow voice
  { dur: 7, day: 'DAY 12', bg: M({ glow: { x: 480, y: 330, r: 320, color: 'rgba(255,40,30,.10)' } }),
    objects: [
      { type: 'glowtext', text: "you're tired.", x: 330, y: 150, size: 34, from: 1.2, to: 3.4, fadeOut: true, shake: true },
      { type: 'glowtext', text: 'why even try?', x: 380, y: 150, size: 38, from: 3.6, to: 6.8, fadeOut: true, shake: true }],
    actors: [
      hero([{ t: 0, x: 640, pose: 'idle', face: 'tired', dir: -1 }, { t: 3.4, x: 640, pose: 'shrug', face: 'sad' }, { t: 4.2, x: 640, pose: 'think', face: 'sad' }]),
      shadow([{ t: 0, x: -80, pose: 'idle', walk: true }, { t: 1.1, x: 290, pose: 'idle' }, { t: 1.3, x: 290, pose: 'point', face: 'evil' }, { t: 3.4, x: 290, pose: 'shrug' }, { t: 4.2, x: 290, pose: 'point' }])],
    captions: [{ text: 'And the voice was always there.', from: 0.4, to: 1.8, y: 500, size: 20 }] },

  // 5 — decision
  { dur: 4.5, day: 'DAY 13', bg: M({ glow: { x: 480, y: 330, r: 300, color: 'rgba(255,255,255,.06)' } }),
    actors: [hero([{ t: 0, x: 480, pose: 'think', face: 'tired' }, { t: 1.6, x: 480, pose: 'idle', face: 'determined' }, { t: 2.4, x: 480, pose: 'crouch', face: 'determined' }, { t: 3.0, x: 480, pose: 'idle', face: 'determined' }], { band: true })],
    captions: [{ text: 'Then one morning, he got up anyway.', from: 0.5, to: 4.2, y: 480, size: 22 }] },

  // 6 — running in the rain
  { dur: 8, day: 'DAY 31', bg: M({ rain: true, top: '#07080d', bottom: '#12131a' }),
    objects: [
      { type: 'skyline', x: 0, y: G, w: 960, color: '#0e1017' },
      { type: 'lamppost', x: 180, y: G }, { type: 'lamppost', x: 560, y: G }, { type: 'lamppost', x: 900, y: G }],
    actors: [hero([{ t: 0, x: -60, pose: 'idle', walk: true, face: 'determined' }, { t: 7.8, x: 1020, pose: 'idle' }], { band: true })],
    captions: [{ text: 'Cold. Dark. Nobody watching.', from: 0.6, to: 3.6, y: 505, size: 20 }, { text: 'He ran anyway.', from: 4.2, to: 7.4, y: 505, size: 20 }] },

  // 7 — the stairs and the shadow
  { dur: 9, day: 'DAY 270', bg: M({ glow: { x: 480, y: 250, r: 360, color: 'rgba(255,60,40,.08)' } }),
    objects: [
      { type: 'stairs', x: 380, y: G, n: 8, sw: 70, sh: 38 },
      { type: 'glowtext', text: "you can't.", x: 220, y: 120, size: 44, from: 3.4, to: 6.4, fadeOut: true, shake: true }],
    actors: [
      hero([{ t: 0, x: 220, y: G, pose: 'idle', walk: true, face: 'determined' }, { t: 1.6, x: 380, y: G, walk: true }, { t: 8.6, x: 905, y: G - 38 - (905 - 380) * 38 / 70, pose: 'idle', face: 'determined' }], { band: true }),
      shadow([{ t: 0, x: 120, pose: 'idle' }, { t: 3.4, x: 120, pose: 'point' }, { t: 6.4, x: 120, pose: 'shrug' }])],
    captions: [{ text: 'The voice never left.', from: 0.5, to: 3.0, y: 505, size: 20 }, { text: 'It just got quieter.', from: 6.8, to: 8.8, y: 505, size: 20 }] },

  // 8 — summit
  { dur: 8, day: 'DAY 365', bg: M({ floor: false, dust: true }),
    objects: [{ type: 'hills', x: 0, y: 260 }],
    actors: [hero([{ t: 0, x: 480, y: 332, pose: 'idle', face: 'determined' }, { t: 3.2, x: 480, y: 332, pose: 'idle', face: 'happy' }, { t: 4.2, x: 480, y: 332, pose: 'cheer', face: 'cheer' }], { band: true })],
    captions: [{ text: 'Nobody is coming to save you.', from: 0.8, to: 3.4, y: 100, size: 24 }, { text: 'So run.', from: 3.8, to: 7.6, y: 100, size: 30, bold: true }] },

  // 9 — end card
  { dur: 5, bg: M({ floor: false }),
    objects: [{ type: 'title', text: 'SHOW UP.', x: 480, y: 255, size: 84, from: 0.5, underline: true }],
    captions: [{ text: 'Day one, or one day. You decide.', from: 1.8, to: 4.8, y: 330, size: 20 }] },
] };
