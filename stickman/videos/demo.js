// Demo short: "Stan finds free WiFi". Each scene is plain data — edit and re-render.
window.VIDEO = { title: 'Stan finds free WiFi', scenes: [
  { dur: 4.5, bg: { sun: true, clouds: true },
    objects: [{ type: 'tree', x: 90, y: 700 }, { type: 'tree', x: 470, y: 700, scale: 0.8 }],
    actors: [{ id: 'stan', talk: [[2.2, 3.8]], keys: [
      { t: 0, x: -60, pose: 'idle', walk: true },
      { t: 1.8, x: 270, pose: 'idle' },
      { t: 2.0, x: 270, pose: 'wave', face: 'happy' },
      { t: 2.5, x: 270, pose: 'wave2' }, { t: 3.0, x: 270, pose: 'wave' }, { t: 3.5, x: 270, pose: 'wave2' },
      { t: 4.4, x: 270, pose: 'idle' }] }],
    bubbles: [{ actor: 'stan', text: "Hi! I'm Stan.", from: 2.2, to: 4.4 }],
    captions: [{ text: 'Meet Stan.', from: 0.4, to: 2.0 }] },

  { dur: 5, bg: { sun: true, clouds: true },
    objects: [{ type: 'sign', x: 440, y: 610, text: 'FREE WIFI', color: '#fff59d', wobble: 0 }],
    actors: [{ id: 'stan', keys: [
      { t: 0, x: 60, pose: 'idle', walk: true }, { t: 1.4, x: 230, pose: 'idle', face: 'happy' },
      { t: 1.5, x: 230, pose: 'point', face: 'shock' },
      { t: 2.6, x: 230, pose: 'crouch', face: 'shock' },
      { t: 3.0, x: 230, pose: 'idle', face: 'happy', walk: false },
      { t: 3.1, x: 230, pose: 'jump', jump: 90 }, { t: 3.9, x: 330, pose: 'cheer', face: 'cheer' },
      { t: 4.9, x: 330, pose: 'cheer' }] }],
    bubbles: [{ actor: 'stan', text: 'FREE WIFI?!', from: 1.6, to: 2.9 }],
    captions: [{ text: 'Then he saw it...', from: 0.2, to: 1.5 }, { text: 'Best day ever!', from: 3.4, to: 4.8 }] },

  { dur: 5, bg: { top: '#1a237e', bottom: '#3949ab', night: true, groundColor: '#33691e' },
    objects: [{ type: 'sign', x: 440, y: 610, text: '0 BARS', color: '#ef9a9a' }, { type: 'emoji', text: '📶', x: 270, y: 300, size: 90, bob: 8, from: 0, to: 2.2 }],
    actors: [{ id: 'stan', color: '#fff', fill: '#1a237e', talk: [[0.4, 1.6]], keys: [
      { t: 0, x: 330, pose: 'think', face: 'smirk' },
      { t: 2.2, x: 330, pose: 'scared', face: 'scared' },
      { t: 3.2, x: 330, pose: 'shrug', face: 'sad' },
      { t: 4.2, x: 330, pose: 'dead', face: 'dead', rot: 0, ease: 'in' },
      { t: 4.9, x: 330, pose: 'dead', face: 'dead' }] }],
    bubbles: [{ actor: 'stan', text: 'Loading...', from: 0.4, to: 2.0 }, { actor: 'stan', text: 'Zero bars?!', from: 2.3, to: 3.9 }],
    captions: [{ text: 'Until it buffered.', from: 0.2, to: 2.1 }, { text: 'Like & subscribe!', from: 3.0, to: 4.9 }],
    flash: [4.0, 4.4] },
] };
