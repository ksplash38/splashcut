/* SplashCut editor engine v3 */
(() => {
'use strict';

/* ================= Utilities ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, u) => a + (b - a) * u;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = t => { t = Math.max(0, t || 0); const m = Math.floor(t / 60), s = Math.floor(t % 60), d = Math.floor((t * 10) % 10); return `${m}:${String(s).padStart(2, '0')}.${d}`; };
const fmtS = t => t < 60 ? `${t.toFixed(1)}s` : fmt(t);
const NATIVE = window.SplashNative || null;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const C = (w = 2, h = 2) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const ctx2d = (c, opts) => c.getContext('2d', opts);
const sizeCanvas = (c, w, h) => { w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h)); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } };
const rnd2 = x => { const s = Math.sin(Math.floor(x) * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
const easeIO = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const easeOut = u => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
const deep = o => JSON.parse(JSON.stringify(o));
// A short buzz so people can feel when something clicks into place.
const haptic = kind => { try { if (NATIVE && NATIVE.haptic) NATIVE.haptic(kind || 'snap'); else if (navigator.vibrate) navigator.vibrate(kind === 'apply' ? 18 : 8); } catch (e) { /* no vibration motor */ } };

const TF_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2';
const MP_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const SEG_MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

const RATIOS = { '9:16': [9, 16], '16:9': [16, 9], '1:1': [1, 1], '4:5': [4, 5], '3:4': [3, 4], '21:9': [21, 9] };
const FILTERS = {
  none: ['Original', ''], vivid: ['Vivid', 'saturate(1.45) contrast(1.1)'], warm: ['Warm', 'sepia(.25) saturate(1.3) hue-rotate(-10deg)'],
  cool: ['Cool', 'saturate(1.1) hue-rotate(14deg) brightness(1.03)'], mono: ['Mono', 'grayscale(1) contrast(1.15)'],
  vintage: ['Vintage', 'sepia(.55) contrast(.95) brightness(1.05) saturate(.85)'], fade: ['Faded', 'contrast(.85) brightness(1.08) saturate(.8)'],
  cyber: ['Cyber', 'hue-rotate(-35deg) saturate(1.7) contrast(1.2)'], noir: ['Noir', 'grayscale(1) contrast(1.6) brightness(.9)'],
  dream: ['Dream', 'saturate(1.25) brightness(1.08) contrast(.92)'], lagos: ['Lagos', 'saturate(1.35) contrast(1.08) sepia(.15) hue-rotate(-6deg)'],
  ice: ['Ice', 'saturate(.7) hue-rotate(25deg) brightness(1.1) contrast(1.05)'], teal: ['Teal & orange', 'saturate(1.3) contrast(1.12) hue-rotate(-8deg) sepia(.12)'],
  matte: ['Matte', 'contrast(.8) brightness(1.1) saturate(.9) sepia(.08)'], pop: ['Pop', 'saturate(1.9) contrast(1.15)'], night: ['Night', 'brightness(.8) contrast(1.25) saturate(.8) hue-rotate(20deg)']
};
const TRANSITIONS = { none: 'None', fade: 'Fade', flash: 'Flash', zoom: 'Zoom punch', zoomout: 'Zoom out', blur: 'Blur', spin: 'Spin', whip: 'Whip pan', glitch: 'Glitch', slide: 'Push', slideup: 'Push up', wipe: 'Wipe', circle: 'Circle reveal', bars: 'Blinds', pixel: 'Pixelate', shake: 'Shake' };
const CURVES = { none: ['None', null], montage: ['Montage', [2, 2, .35, .35, 2, 2]], hero: ['Hero', [1, 1, .25, .25, 1, 1]], bullet: ['Bullet', [2.5, .3, .3, 2.5]],
  jump: ['Jump cut', [1, 4, 1, 4, 1]], flashin: ['Flash in', [4, 2, 1, 1, 1]], flashout: ['Flash out', [1, 1, 1, 2, 4]], rampup: ['Ramp up', [.5, 1, 2, 3]], rampdown: ['Ramp down', [3, 2, 1, .5]] };
const FX = { vhs: 'VHS', rgb: 'RGB split', grain: 'Film grain', vignette: 'Vignette', glow: 'Glow', shake: 'Camera shake', pulse: 'Beat pulse', strobe: 'Beat strobe',
  mirror: 'Mirror', kaleido: 'Kaleidoscope', pixelate: 'Pixelate', letterbox: 'Cinema bars', lightleak: 'Light leak', oldfilm: 'Old film', negative: 'Negative',
  heat: 'Heat vision', duotone: 'Duotone', hue: 'Colour cycle', blur: 'Soft blur', motionblur: 'Motion blur', beauty: 'Beauty smooth' };
const ANIM_IN = { none: 'None', fade: 'Fade', zoomin: 'Zoom in', zoomout: 'Zoom out', slidel: 'Slide left', slider: 'Slide right', slideu: 'Slide up', slided: 'Slide down', spin: 'Spin', bounce: 'Bounce', blur: 'Blur', swing: 'Swing', shake: 'Shake',
  rise: 'Rise', drop: 'Drop', pop: 'Pop', twist: 'Twist', zoomblur: 'Zoom blur', whip: 'Whip', flicker: 'Flicker' };
const ANIM_COMBO = { none: 'None', kenburns: 'Ken Burns', zoomslow: 'Slow zoom in', zoomoutslow: 'Slow zoom out', pulse: 'Pulse', sway: 'Sway', float: 'Float', wobble: 'Wobble', heartbeat: 'Heartbeat', spin360: 'Spin 360',
  breathe: 'Breathe', jitter: 'Jitter', orbit: 'Orbit', pendulum: 'Pendulum', hop: 'Hop' };
const MASKS = { none: 'None', circle: 'Circle', rect: 'Rectangle', heart: 'Heart', star: 'Star', split: 'Split', band: 'Film band' };
const BLENDS = { 'source-over': 'Normal', screen: 'Screen', multiply: 'Multiply', overlay: 'Overlay', lighten: 'Lighten', darken: 'Darken', 'soft-light': 'Soft light', 'hard-light': 'Hard light', difference: 'Difference', 'color-dodge': 'Dodge' };
const RELIGHT = { none: 'Off', studio: 'Studio', warm: 'Warm side', neon: 'Neon duo', sunset: 'Sunset', moody: 'Moody', golden: 'Golden hour' };
const AFX = { none: 'None', echo: 'Echo', hall: 'Hall', stadium: 'Stadium', telephone: 'Telephone', radio: 'Radio', underwater: 'Underwater', robot: 'Robot', megaphone: 'Megaphone' };
const FONTS = {
  classic: ['Classic', '800', 'Roboto,"Segoe UI",system-ui,sans-serif'], serif: ['Serif', 'italic 700', 'Georgia,"Noto Serif",serif'],
  mono: ['Mono', '700', '"Roboto Mono",ui-monospace,monospace'], cond: ['Condensed', '700', '"sans-serif-condensed","Roboto Condensed","Arial Narrow",sans-serif'],
  hand: ['Script', '700', '"Dancing Script",cursive'], light: ['Light', '300', 'Roboto,"Segoe UI",system-ui,sans-serif'], black: ['Heavy', '900', 'Roboto,"Segoe UI",system-ui,sans-serif']
};
const COLORS = ['#ffffff', '#000000', '#ffd23f', '#36d7ff', '#ff5a87', '#3ddc97', '#9a8bff', '#ff8a3d', '#ff3b3b', '#e11d2e', '#0b3d91'];
const ANIMS = { none: 'None', fade: 'Fade', pop: 'Pop', slide: 'Slide up', type: 'Typewriter', bounce: 'Bounce', zoom: 'Zoom', spin: 'Spin in', glitch: 'Glitch', drop: 'Drop in', swing: 'Swing in', flicker: 'Neon flicker', stretch: 'Stretch' };
const TEXT_TEMPLATES = {
  title: ['Big title', { text: 'BIG TITLE', font: 'black', size: 9, color: '#ffffff', stroke: true, anim: 'pop' }],
  subtitle: ['Subtitle', { text: 'Your subtitle here', font: 'classic', size: 4.8, color: '#ffffff', stroke: false, shadow: true, anim: 'fade' }],
  lower: ['Lower third', { text: 'Name Surname\nTitle', font: 'cond', size: 4.2, color: '#ffffff', box: true, boxColor: '#0b3d91', y: .84, anim: 'slide' }],
  neon: ['Neon sign', { text: 'OPEN LATE', font: 'cond', size: 8, color: '#ff5a87', glow: true, stroke: false, anim: 'glitch' }],
  quote: ['Quote', { text: '“Make it count.”', font: 'serif', size: 6.5, color: '#ffffff', shadow: true, anim: 'type' }],
  breaking: ['Breaking', { text: 'BREAKING', font: 'black', size: 6, color: '#ffffff', box: true, boxColor: '#e11d2e', anim: 'zoom' }],
  comic: ['Comic', { text: 'BOOM!', font: 'black', size: 11, color: '#ffd23f', stroke: true, anim: 'bounce', rot: -8 }],
  subscribe: ['Subscribe', { text: 'SUBSCRIBE 🔔', font: 'classic', size: 5.5, color: '#ffffff', box: true, boxColor: '#ff0033', anim: 'pop', y: .8 }]
};
const CAP_STYLES = {
  classic: { color: '#ffffff', stroke: true, box: false, glow: false, font: 'classic' },
  boxed: { color: '#ffffff', stroke: false, box: true, glow: false, font: 'classic' },
  neon: { color: '#36d7ff', stroke: false, box: false, glow: true, font: 'cond' },
  pop: { color: '#ffd23f', stroke: true, box: false, glow: false, font: 'black' }
};
const STICKERS = {
  'Faces': '😀 😂 🤣 😍 🥰 😎 🤩 🥳 😭 😱 🤯 😤 🙄 😴 🤔 🫡 😇 🤑 🥶 🤡 👻 💀 🤖 👽',
  'Hands': '👍 👎 👏 🙌 🙏 💪 👀 ✌️ 🤞 👉 👈 👆 👇 🫶 🤝 ✍️ 👋 🤙',
  'Hype': '🔥 💯 ✨ ⭐ 🌟 ⚡ 💥 🎉 🎊 🚀 💎 👑 🏆 🎯 ✅ ❌ ❗ ❓ 💸 💰 📈 🆕 🔔',
  'Love': '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💔 💕 💖 💘 😘 💋',
  'Life': '⚽ 🏀 🎮 🎧 🎤 🎬 📸 🍕 🍔 🍟 🍗 🥤 ☕ 🎂 🌍 🌴 🌧️ ☀️ 🌙 🚗 ✈️ 🇳🇬 🛍️ 📱 💻',
  'Arrows': '⬆️ ⬇️ ⬅️ ➡️ ↗️ ↘️ 🔁 🔄 ⤴️ ⤵️ 🔽 🔼'
};

/* ================= Storage ================= */
let dbp = null;
function db() {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open('splashcut', 2);
    r.onupgradeneeded = () => { const d = r.result; for (const s of ['media', 'projects', 'waves']) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function idb(store, mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const tx = d.transaction(store, mode); let out;
    const r = fn(tx.objectStore(store)); if (r) r.onsuccess = () => { out = r.result; };
    tx.oncomplete = () => res(out); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
  });
}
const putMedia = m => idb('media', 'readwrite', s => s.put(m));
const getMediaRec = id => idb('media', 'readonly', s => s.get(id));
const delMediaRec = id => { idb('waves', 'readwrite', s => s.delete(id)).catch(() => {}); return idb('media', 'readwrite', s => s.delete(id)); };
const getWave = id => idb('waves', 'readonly', s => s.get(id));
const putWave = w => idb('waves', 'readwrite', s => s.put(w));
const putProject = p => idb('projects', 'readwrite', s => s.put(p));
const allProjects = () => idb('projects', 'readonly', s => s.getAll());
const delProjectRec = id => idb('projects', 'readwrite', s => s.delete(id));

/* ================= Toast / busy ================= */
let toastT = 0;
function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }
const busy = {
  show(title, text = '', cancel = null) {
    $('#busyTitle').textContent = title; $('#busyText').textContent = text; this.pct(0);
    $('#busyActions').innerHTML = cancel ? '<button type="button" class="btn" id="busyCancel">Cancel</button>' : '';
    if (cancel) $('#busyCancel').onclick = cancel;
    $('#busy').hidden = false;
  },
  pct(p) { p = clamp(p, 0, 1); $('#busyPct').textContent = Math.round(p * 100) + '%'; $('#ringFg').style.strokeDashoffset = String(125.66 * (1 - p)); },
  text(t) { $('#busyText').textContent = t; },
  actions(html) { $('#busyActions').innerHTML = html; },
  hide() { $('#busy').hidden = true; }
};
let cancelFlag = false;
const cancellable = (title, text) => { cancelFlag = false; busy.show(title, text, () => { cancelFlag = true; busy.text('Stopping…'); }); };

/* ================= Audio graph ================= */
let AC = null, master = null, recDest = null;
function actx() {
  if (!AC) {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.connect(AC.destination);
    recDest = AC.createMediaStreamDestination(); master.connect(recDest);
  }
  return AC;
}
const irCache = {};
function impulse(sec, decay) {
  const k = sec + '|' + decay; if (irCache[k]) return irCache[k];
  const sr = AC.sampleRate, n = Math.floor(sr * sec), b = AC.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
  return (irCache[k] = b);
}
function shaper(amount) { const ws = AC.createWaveShaper(), n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (1 + amount) * x / (1 + amount * Math.abs(x)); } ws.curve = c; return ws; }
function biq(type, f, gain = 0, q = 1) { const b = AC.createBiquadFilter(); b.type = type; b.frequency.value = f; b.gain.value = gain; b.Q.value = q; return b; }
function gainN(v) { const g = AC.createGain(); g.gain.value = v; return g; }
function presetChain(type, input, n) {
  const series = (...nodes) => { let prev = input; for (const nd of nodes) { prev.connect(nd); prev = nd; n.push(nd); } return prev; };
  switch (type) {
    case 'echo': { const out = gainN(1), d = AC.createDelay(2), fb = gainN(.38), wet = gainN(.5); d.delayTime.value = .28; input.connect(out); input.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(out); n.push(out, d, fb, wet); return out; }
    case 'hall': case 'stadium': { const out = gainN(1), cv = AC.createConvolver(), wet = gainN(type === 'hall' ? .45 : .75), dry = gainN(.8); cv.buffer = impulse(type === 'hall' ? 2.2 : 4, type === 'hall' ? 2.5 : 1.8); input.connect(dry); dry.connect(out); input.connect(cv); cv.connect(wet); wet.connect(out); n.push(out, cv, wet, dry); return out; }
    case 'telephone': return series(biq('highpass', 500), biq('lowpass', 3000), shaper(8), gainN(.9));
    case 'radio': return series(biq('bandpass', 1700, 0, .8), shaper(20), gainN(.9));
    case 'underwater': return series(biq('lowpass', 420, 0, 2), gainN(1.4));
    case 'megaphone': return series(biq('highpass', 700), biq('lowpass', 2600), shaper(40), gainN(.7));
    case 'robot': { const rm = gainN(0), osc = AC.createOscillator(), out = gainN(1.6); osc.frequency.value = 55; osc.connect(rm.gain); osc.start(); input.connect(rm); rm.connect(out); n.push(rm, osc, out); return out; }
    default: return input;
  }
}
function applyAfx(e, afx) {
  if (!e || !e.src) return;
  const a = afx || { preset: 'none', low: 0, mid: 0, high: 0 };
  const key = `${a.preset}|${a.low}|${a.mid}|${a.high}`;
  if (e.afxKey === key) return;
  e.afxKey = key;
  if (e.nodes) e.nodes.forEach(nd => { try { nd.disconnect(); } catch (_) {} if (nd.stop) try { nd.stop(); } catch (_) {} });
  try { e.src.disconnect(); } catch (_) {}
  const n = [], low = biq('lowshelf', 200, a.low || 0), mid = biq('peaking', 1200, a.mid || 0, 1), high = biq('highshelf', 4500, a.high || 0);
  n.push(low, mid, high); e.src.connect(low); low.connect(mid); mid.connect(high);
  presetChain(a.preset, high, n).connect(e.gain);
  e.nodes = n;
}

/* ================= Media runtime ================= */
const media = {};
function kindOf(f) {
  const t = f.type || '', n = (f.name || '').toLowerCase();
  if (t.startsWith('video') || /\.(mp4|mov|webm|mkv|3gp|m4v)$/.test(n)) return 'video';
  if (t.startsWith('image') || /\.(jpe?g|png|webp|gif|heic|bmp)$/.test(n)) return 'image';
  if (t.startsWith('audio') || /\.(mp3|m4a|aac|wav|ogg|opus|flac)$/.test(n)) return 'audio';
  return null;
}
async function loadMedia(id) {
  if (media[id]) return media[id];
  const rec = await getMediaRec(id); if (!rec) return null;
  const m = { id, kind: rec.kind, name: rec.name, blob: rec.blob, url: URL.createObjectURL(rec.blob), duration: rec.duration || 0, w: rec.w || 0, h: rec.h || 0, thumb: rec.thumb || null, wave: null, buf: undefined };
  media[id] = m;
  await probe(m, rec);
  return m;
}
function makeThumb(src, w, h, H = 96) {
  const c = C(Math.max(1, Math.round(H * (w || 16) / (h || 9))), H);
  try { ctx2d(c).drawImage(src, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.72); } catch (e) { return null; }
}
// Files from browser recorders (WebM) often have no stored length; seeking far past the end makes the browser compute it.
function fixDuration(el, fallback) {
  if (isFinite(el.duration) && el.duration > 0) return Promise.resolve(el.duration);
  return new Promise(res => {
    const done = () => { el.removeEventListener('durationchange', on); clearTimeout(t); const d = isFinite(el.duration) && el.duration > 0 ? el.duration : (fallback || 0); try { el.currentTime = 0; } catch (_) {} res(d); };
    const on = () => { if (isFinite(el.duration) && el.duration > 0) done(); };
    const t = setTimeout(done, 5000);
    el.addEventListener('durationchange', on);
    try { el.currentTime = 1e7; } catch (_) { done(); }
  });
}
function probe(m, rec) {
  return new Promise(res => {
    let done = false; const fin = () => { if (!done) { done = true; res(); } };
    setTimeout(fin, 12000);
    if (m.kind === 'image') {
      const img = new Image(); img.decoding = 'async';
      img.onload = () => { m.img = img; m.w = img.naturalWidth; m.h = img.naturalHeight; m.duration = 3600; if (!m.thumb) m.thumb = makeThumb(img, m.w, m.h); fin(); };
      img.onerror = fin; img.src = m.url; return;
    }
    if (m.kind === 'audio') {
      const a = document.createElement('audio'); a.preload = 'metadata';
      a.onloadedmetadata = () => { fixDuration(a, rec.duration).then(d => { m.duration = d; fin(); }); };
      a.onerror = fin; a.src = m.url; return;
    }
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.onloadedmetadata = async () => {
      m.w = v.videoWidth; m.h = v.videoHeight;
      m.duration = await fixDuration(v, rec.duration);
      if (m.thumb) { v.removeAttribute('src'); v.load(); fin(); return; }
      v.onseeked = () => { m.thumb = makeThumb(v, m.w, m.h); v.removeAttribute('src'); v.load(); fin(); };
      v.currentTime = Math.min(0.6, m.duration / 3);
    };
    v.onerror = fin; v.src = m.url;
  });
}
async function addMediaRecord(kind, name, blob, duration) {
  const rec = { id: uid(), kind, name, blob, duration: duration || 0, created: Date.now() };
  await putMedia(rec);
  const m = await loadMedia(rec.id);
  if (m && duration && !(m.duration > 0)) m.duration = duration;
  rec.duration = m.duration; rec.w = m.w; rec.h = m.h; rec.thumb = m.thumb; putMedia(rec).catch(() => {});
  return m;
}
async function importFiles(files) {
  const out = [];
  for (const f of files) {
    const kind = kindOf(f); if (!kind) { toast(`Skipped ${f.name}: unsupported file type`); continue; }
    try {
      const m = await addMediaRecord(kind, f.name || kind, f);
      if (!m || (kind !== 'image' && !(m.duration > 0))) { toast(`Could not read ${f.name}`); continue; }
      out.push(m);
    } catch (e) { toast('Not enough storage space to import ' + (f.name || 'file')); }
  }
  return out;
}
// The sound of a file for analysis (captions, beats, noise reduction). It is decoded apart from the playback engine,
// so it keeps working after the engine is rebuilt, and two tools asking at once share one decode.
async function decodeMedia(m) {
  if (!m || m.kind === 'image') return null;
  if (m.buf !== undefined) return m.buf;
  if (!m.dec) m.dec = (async () => {
    try { const ab = await m.blob.arrayBuffer(); m.buf = await new OfflineAudioContext(2, 1, 44100).decodeAudioData(ab); }
    catch (e) { m.buf = null; }
    m.dec = null; return m.buf;
  })();
  return m.dec;
}
/* Waveforms on the timeline. Big videos are decoded at a low sample rate just for the picture, which needs a small
   part of the memory a full decode would. The picture is kept, so a project opens without decoding again. */
const WAVE_FULL = 40 * 1024 * 1024;
function drawWave(b, dur) {
  const W = Math.round(clamp((dur || b.duration) * 40, 600, 6000)), H = 60, c = C(W, H), x = ctx2d(c);
  const chs = [...Array(Math.min(2, b.numberOfChannels))].map((_, i) => b.getChannelData(i)), n = chs[0].length, step = n / W, peaks = new Float32Array(W);
  let top = 0;
  for (let i = 0; i < W; i++) {
    const a = Math.floor(i * step), e = Math.min(n, Math.max(a + 1, Math.floor((i + 1) * step))), inc = Math.max(1, Math.floor((e - a) / 64));
    let mx = 0; for (const d of chs) for (let k = a; k < e; k += inc) { const v = Math.abs(d[k]); if (v > mx) mx = v; }
    peaks[i] = mx; if (mx > top) top = mx;
  }
  // Quiet recordings are scaled up so their shape is still easy to see.
  const gain = top > 0 ? Math.min(4, 0.95 / top) : 1;
  x.fillStyle = 'rgba(255,255,255,.62)';
  for (let i = 0; i < W; i++) { const h = Math.max(1.5, peaks[i] * gain * H * 0.92); x.fillRect(i, (H - h) / 2, 1, h); }
  return c.toDataURL('image/png');
}
const waveJobs = {};
function ensureWave(m) {
  if (!m || m.kind === 'image') return Promise.resolve(null);
  if (m.wave) return Promise.resolve(m.wave);
  if (waveJobs[m.id]) return waveJobs[m.id];
  const job = (async () => {
    try { const w = await getWave(m.id); if (w && w.wave) return (m.wave = w.wave); } catch (e) { /* not saved yet */ }
    let b = m.buf || null;
    if (!b && m.blob.size <= WAVE_FULL) b = await decodeMedia(m);
    if (!b) { try { b = await new OfflineAudioContext(1, 1, 8000).decodeAudioData(await m.blob.arrayBuffer()); } catch (e) { b = null; } }
    if (!b) { m.wave = 'none'; return m.wave; }
    m.wave = drawWave(b, m.duration);
    putWave({ id: m.id, wave: m.wave }).catch(() => {});
    return m.wave;
  })();
  waveJobs[m.id] = job; job.finally(() => { delete waveJobs[m.id]; });
  return job;
}
// Draws the waveform of an audio item's file, then shows it on the timeline.
const showWave = m => ensureWave(m).then(() => renderTimeline());
const showWaveSoon = m => { if (!waveJobs[m.id]) showWave(m); };
async function hiddenVideo(m) {
  const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = m.url;
  await new Promise(r => { v.onloadeddata = r; v.onerror = r; setTimeout(r, 8000); });
  return v;
}
const seekV = (v, t) => new Promise(r => { const to = setTimeout(r, 2000); v.onseeked = () => { clearTimeout(to); r(); }; v.currentTime = Math.max(0, t); });
async function sampleGray(m, from, to, fps, w, onp) {
  const v = await hiddenVideo(m); const vw = v.videoWidth || 16, vh = v.videoHeight || 9;
  const h = Math.max(4, Math.round(w * vh / vw)), c = C(w, h), g = ctx2d(c, { willReadFrequently: true });
  const frames = [], n = Math.max(2, Math.min(900, Math.floor((to - from) * fps)));
  for (let k = 0; k < n; k++) {
    if (cancelFlag) break;
    await seekV(v, from + k / fps);
    g.drawImage(v, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data, gray = new Uint8ClampedArray(w * h);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) gray[j] = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
    frames.push(gray); if (onp) onp(k / n);
  }
  v.removeAttribute('src'); v.load();
  return { frames, w, h, fps };
}

/* ================= Project model ================= */
let P = null, sel = null;
const DEF_TF = (s = 1) => ({ x: .5, y: .5, s, r: 0, o: 1, w: 1, h: 1 });
function newProject(ratio) {
  const d = new Date();
  return { v: 2, id: uid(), name: 'Project ' + d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    ratio, bg: 'blur', ending: store.get('sc_ending', true) !== false, clips: [], layers: [], overlays: [], audio: [], beats: [], bpm: 0, duck: null, capStyle: 'classic', created: Date.now(), updated: Date.now(), thumb: null, dur: 0 };
}
function normVI(c, layer) {
  const d = { speed: 1, curve: 'none', volume: 1, muted: false, filter: 'none', transition: 'none', fit: 'contain', rot: 0, crop: null,
    kf: [], mask: null, fx: {}, blurBg: false, removeBg: false, chroma: null, relight: null, stab: null, frame: null, blend: 'source-over', enhanced: false };
  for (const k in d) if (c[k] === undefined) c[k] = deep(d[k]);
  c.adj = Object.assign({ b: 1, c: 1, s: 1, temp: 0, tint: 0 }, c.adj || {});
  c.tf = Object.assign(DEF_TF(layer ? .55 : 1), c.tf || {});
  c.anim = Object.assign({ in: 'none', out: 'none', combo: 'none', dIn: .5, dOut: .5 }, c.anim || {});
  c.afx = Object.assign({ preset: 'none', low: 0, mid: 0, high: 0 }, c.afx || {});
  if (layer && c.start === undefined) c.start = 0;
  return c;
}
function normOv(o) { if (o.opacity === undefined) o.opacity = 1; if (!o.kf) o.kf = []; if (o.track === undefined) o.track = null; if (o.spacing === undefined) o.spacing = 0; return o; }
function normAu(a) { if (!a.rate) a.rate = 1; a.afx = Object.assign({ preset: 'none', low: 0, mid: 0, high: 0 }, a.afx || {}); if (a.fadeIn == null) a.fadeIn = 0; if (a.fadeOut == null) a.fadeOut = 0; return a; }
function normalize(p) {
  p.layers = p.layers || []; p.overlays = p.overlays || []; p.audio = p.audio || []; p.beats = p.beats || [];
  p.clips.forEach(c => normVI(c, false)); p.layers.forEach(c => normVI(c, true)); p.overlays.forEach(normOv); p.audio.forEach(normAu);
  if (!p.capStyle) p.capStyle = 'classic'; p.v = 2; return p;
}
function makeClip(m, layer) { return normVI({ id: uid(), mediaId: m.id, kind: m.kind, in: 0, out: m.kind === 'image' ? 3 : m.duration }, layer); }

/* speed and speed curves */
const curveCache = new Map();
function curveTab(c) {
  const key = c.curve; if (curveCache.has(key)) return curveCache.get(key);
  const pts = CURVES[c.curve][1], N = 240, cum = new Float64Array(N + 1);
  const sp = u => { const x = u * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(x)); return lerp(pts[i], pts[i + 1], x - i); };
  for (let k = 0; k < N; k++) cum[k + 1] = cum[k] + (1 / N) / sp((k + .5) / N);
  const tab = { cum, N, total: cum[N], sp }; curveCache.set(key, tab); return tab;
}
const hasCurve = c => c.kind !== 'image' && c.curve && c.curve !== 'none' && !!CURVES[c.curve];
function clipLen(c) {
  if (c.kind === 'image') return c.out - c.in;
  if (hasCurve(c)) return (c.out - c.in) * curveTab(c).total / c.speed;
  return (c.out - c.in) / c.speed;
}
function uAt(c, local) {
  const tb = curveTab(c), target = local * c.speed / (c.out - c.in), cum = tb.cum;
  let lo = 0, hi = tb.N; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= target) lo = mid; else hi = mid; }
  const f = cum[hi] > cum[lo] ? (target - cum[lo]) / (cum[hi] - cum[lo]) : 0;
  return clamp((lo + f) / tb.N, 0, 1);
}
function srcAt(c, local) {
  if (c.kind === 'image') return c.in + local;
  if (hasCurve(c)) return c.in + uAt(c, local) * (c.out - c.in);
  return c.in + local * c.speed;
}
function rateAt(c, local) { if (hasCurve(c)) return curveTab(c).sp(uAt(c, local)) * c.speed; return c.speed; }
function outAt(c, srcLocal) {
  if (hasCurve(c)) { const tb = curveTab(c), u = clamp(srcLocal / (c.out - c.in), 0, 1), x = u * tb.N, i = Math.min(tb.N - 1, Math.floor(x)); return lerp(tb.cum[i], tb.cum[i + 1], x - i) * (c.out - c.in) / c.speed; }
  return c.kind === 'image' ? srcLocal : srcLocal / c.speed;
}
const auLen = a => (a.out - a.in) / (a.rate || 1);

function layout() { let t = 0; for (const c of P.clips) { c._start = t; t += clipLen(c); } for (const l of P.layers) l._start = l.start; P._main = t; return t; }
/* Ending: a short SplashCut end card after the main track, like other editors add. Tap it on the timeline to
   delete it for this video or for every new project; Format turns it back on. */
const END_LEN = 2.5;
const endLen = () => P && P.ending && P.clips.length ? END_LEN : 0;
function duration() {
  let d = layout() + endLen();
  for (const l of P.layers) d = Math.max(d, l.start + clipLen(l));
  for (const o of P.overlays) d = Math.max(d, o.end);
  for (const a of P.audio) d = Math.max(d, a.start + auLen(a));
  return d;
}
const clipAt = t => { layout(); return P.clips.find(c => t >= c._start - 1e-6 && t < c._start + clipLen(c) - 1e-6) || null; };
const vis = () => [...P.clips, ...P.layers];
const findSel = () => {
  if (!sel || !P) return null;
  const list = { clip: P.clips, layer: P.layers, ov: P.overlays, au: P.audio }[sel.type];
  return list ? list.find(x => x.id === sel.id) || null : null;
};
const isVI = () => sel && (sel.type === 'clip' || sel.type === 'layer');
function clean(p) { return JSON.parse(JSON.stringify(p, (k, v) => k.startsWith('_') ? undefined : v)); }

/* keyframes */
const TFK = ['x', 'y', 's', 'r', 'o', 'w', 'h'];
function interpKf(kf, local, base) {
  if (!kf || !kf.length) return base;
  // Keyframes made before width/height existed fall back to the item's own values.
  const v = (f, k) => f[k] != null ? f[k] : base[k] != null ? base[k] : 1;
  if (local <= kf[0].t) return { ...base, ...kf[0] };
  const last = kf[kf.length - 1]; if (local >= last.t) return { ...base, ...last };
  for (let i = 0; i < kf.length - 1; i++) {
    const a = kf[i], b = kf[i + 1];
    if (local <= b.t) { const u = easeIO((local - a.t) / Math.max(1e-6, b.t - a.t)), o = {}; TFK.forEach(k => o[k] = lerp(v(a, k), v(b, k), u)); return o; }
  }
  return { ...base, ...last };
}
const tfAt = (c, local) => interpKf(c.kf, local, c.tf);
function ovBase(o) { return { x: o.x, y: o.y, s: o.scale || 1, r: o.rot || 0, o: o.opacity == null ? 1 : o.opacity, w: o.sw || 1, h: o.sh || 1 }; }
function ovTf(o, local) {
  const r = { ...interpKf(o.kf, local, ovBase(o)) };
  if (o.track && o.track.length) { const p = sampleTrack(o.track, local); r.x = p.x; r.y = p.y; }
  return r;
}
function sampleTrack(tr, local) {
  if (local <= tr[0].t) return tr[0]; const L = tr[tr.length - 1]; if (local >= L.t) return L;
  let i = 0; while (i < tr.length - 2 && tr[i + 1].t < local) i++;
  const a = tr[i], b = tr[i + 1], u = (local - a.t) / Math.max(1e-6, b.t - a.t);
  return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
}
function sampleSeries(sr, srcLocal) {
  if (sr.x.length < 2) return { x: sr.x[0] || 0, y: sr.y[0] || 0 };
  const f = clamp(srcLocal * sr.fps, 0, sr.x.length - 1), i = Math.min(sr.x.length - 2, Math.floor(f)), u = f - i;
  return { x: lerp(sr.x[i], sr.x[i + 1], u), y: lerp(sr.y[i], sr.y[i + 1], u) };
}
function setTf(item, patch, local, ov) {
  if (item.kf && item.kf.length) {
    let k = item.kf.find(k => Math.abs(k.t - local) < 0.05);
    if (!k) { const cur = ov ? ovTf(item, local) : tfAt(item, local); k = { t: +local.toFixed(3) }; TFK.forEach(n => k[n] = cur[n]); item.kf.push(k); item.kf.sort((a, b) => a.t - b.t); }
    Object.assign(k, patch);
  } else if (ov) {
    if (patch.x != null) item.x = patch.x; if (patch.y != null) item.y = patch.y; if (patch.s != null) item.scale = patch.s; if (patch.r != null) item.rot = patch.r; if (patch.o != null) item.opacity = patch.o; if (patch.w != null) item.sw = patch.w; if (patch.h != null) item.sh = patch.h;
  } else Object.assign(item.tf, patch);
}
function localOf(item) {
  layout();
  if (item.end != null && item.type) return clamp(T - item.start, 0, item.end - item.start);
  return clamp(T - item._start, 0, clipLen(item));
}

/* history */
let hist = [], hi = -1, saveT = 0;
function resetHistory() { hist = [JSON.stringify(clean(P))]; hi = 0; updUndo(); }
function commit() {
  // While an edit sheet is open nothing is saved or added to undo until ✓ Apply.
  if (edit) { renderTimeline(); requestDraw(); return; }
  const s = JSON.stringify(clean(P));
  if (hist[hi] === s) { renderTimeline(); requestDraw(); return; }
  hist = hist.slice(0, hi + 1); hist.push(s); if (hist.length > 60) hist.shift(); hi = hist.length - 1;
  updUndo(); scheduleSave(); renderTimeline(); requestDraw();
}
function restore(i) {
  hi = i; const keep = P.id; P = normalize(JSON.parse(hist[hi])); P.id = keep;
  if (sel && !findSel()) sel = null;
  syncEls(); updUndo(); scheduleSave(); renderTimeline(); renderToolbar(); seekTo(Math.min(T, duration()));
}
function updUndo() { $('#undo').disabled = hi <= 0; $('#redo').disabled = hi >= hist.length - 1; }
function scheduleSave() { clearTimeout(saveT); saveT = setTimeout(saveProject, 500); }
async function saveProject() {
  if (!P) return;
  P.updated = Date.now(); P.dur = duration();
  const first = P.clips[0] && media[P.clips[0].mediaId]; P.thumb = first ? first.thumb : null;
  try { await putProject(clean(P)); } catch (e) { toast('Could not save the project. Free some storage space.'); }
}

/* ================= Media elements ================= */
const els = {};
function elFor(item, m) {
  let e = els[item.id];
  if (e && e.mid === m.id) return e;
  if (e) dropEl(item.id);
  if (m.kind === 'image') { e = { img: true, el: m.img, mid: m.id }; els[item.id] = e; return e; }
  const audioOnly = m.kind === 'audio' || ['extracted', 'music', 'voice'].includes(item.kind);
  const el = document.createElement(audioOnly ? 'audio' : 'video');
  el.preload = 'auto'; el.playsInline = true; el.src = m.url; el.preservesPitch = true;
  el.addEventListener('seeked', () => { if (!playing && !offline) requestDraw(); });
  el.addEventListener('loadeddata', () => { if (!playing) requestDraw(); });
  const g = actx().createGain(); g.connect(master);
  e = { el, gain: g, mid: m.id, src: null };
  try { e.src = AC.createMediaElementSource(el); } catch (err) { /* already connected */ }
  els[item.id] = e; applyAfx(e, item.afx); return e;
}
function dropEl(id) {
  const e = els[id]; if (!e) return;
  if (!e.img) { try { e.el.pause(); e.el.removeAttribute('src'); e.el.load(); e.gain.disconnect(); if (e.nodes) e.nodes.forEach(n => { try { n.disconnect(); if (n.stop) n.stop(); } catch (_) {} }); } catch (_) {} }
  delete els[id];
}
function syncEls() { const ids = new Set([...vis().map(c => c.id), ...P.audio.map(a => a.id)]); for (const id of Object.keys(els)) if (!ids.has(id)) dropEl(id); }
function setGain(e, v, tau = .02) { if (!e.gain) return; const g = e.gain.gain; if (Math.abs(g.value - v) > 0.001) g.setTargetAtTime(v, AC.currentTime, tau); }

/* ================= Playback ================= */
let T = 0, playing = false, playPerf = 0, playT = 0, raf = 0, exporting = null, recording = null, offline = false;
function syncMedia(on) {
  const t = T; layout();
  for (const c of vis()) {
    const m = media[c.mediaId]; if (!m || m.kind === 'image') continue;
    const e = elFor(c, m), len = clipLen(c), v = e.el;
    applyAfx(e, c.afx);
    const active = t >= c._start - 1e-6 && t < c._start + len - 1e-6;
    if (active) {
      const local = t - c._start, want = srcAt(c, local), rate = clamp(rateAt(c, local), 0.0625, 16);
      if (Math.abs(v.playbackRate - rate) > 0.01) v.playbackRate = rate;
      setGain(e, c.muted || (recording && recording.muteBed) ? 0 : c.volume);
      const tol = hasCurve(c) ? 0.5 : 0.35;
      if (on) { if (Math.abs(v.currentTime - want) > tol) v.currentTime = want; if (v.paused) v.play().catch(() => {}); }
      else { if (!v.paused) v.pause(); if (Math.abs(v.currentTime - want) > 0.03) v.currentTime = want; }
    } else {
      if (!v.paused) v.pause();
      if (t < c._start && c._start - t < 1.5 && Math.abs(v.currentTime - c.in) > 0.05 && !v.seeking) v.currentTime = c.in;
    }
  }
  const duckOn = P.duck && P.duck.on && P.duck.env, duckNow = duckOn && P.duck.env[Math.floor(t * 10)] === '1';
  for (const a of P.audio) {
    const m = media[a.mediaId]; if (!m) continue;
    const e = elFor(a, m), v = e.el, len = auLen(a);
    applyAfx(e, a.afx);
    const active = t >= a.start && t < a.start + len;
    if (active) {
      const local = t - a.start, want = a.in + local * a.rate;
      if (Math.abs(v.playbackRate - a.rate) > 0.01) v.playbackRate = a.rate;
      let gv = a.volume;
      if (a.fadeIn > 0) gv *= clamp(local / a.fadeIn, 0, 1);
      if (a.fadeOut > 0) gv *= clamp((len - local) / a.fadeOut, 0, 1);
      if (a.kind === 'music' && duckNow) gv *= 1 - P.duck.amt;
      setGain(e, recording && recording.muteBed ? 0 : gv, a.kind === 'music' && duckOn ? .12 : .02);
      if (on) { if (Math.abs(v.currentTime - want) > 0.3) v.currentTime = want; if (v.paused) v.play().catch(() => {}); }
      else { if (!v.paused) v.pause(); if (Math.abs(v.currentTime - want) > 0.05) v.currentTime = want; }
    } else { if (!v.paused) v.pause(); }
  }
}
function play() {
  if (playing || !P) return;
  const D = duration(); if (D <= 0) return;
  if (T >= D - 0.05) T = 0;
  actx().resume();
  playing = true; playPerf = performance.now(); playT = T;
  syncMedia(true); loop(); updPlay();
}
function pause() {
  if (!playing) return;
  playing = false; cancelAnimationFrame(raf);
  for (const e of Object.values(els)) if (!e.img && !e.el.paused) e.el.pause();
  syncMedia(false); updPlay(); draw(); updTime();
}
function loop() {
  raf = requestAnimationFrame(loop);
  T = playT + (performance.now() - playPerf) / 1000;
  const D = duration();
  if (T >= D) {
    T = D; draw();
    if (exporting) { exporting.finish(); return; }
    if (recording) { stopVoice(); return; }
    pause(); return;
  }
  syncMedia(true); draw();
  if (!exporting) { followTimeline(); updTime(); }
  else exporting.progress(T / D);
}
function seekTo(t) { T = clamp(t, 0, duration()); if (playing) { playT = T; playPerf = performance.now(); } syncMedia(playing); requestDraw(); updTime(); followTimeline(); }
function updPlay() { const b = $('#playBtn'); b.innerHTML = playing ? '<svg class="i" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>' : '<svg class="i" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>'; b.classList.toggle('on', playing); b.setAttribute('aria-label', playing ? 'Pause' : 'Play'); }
function updTime() { $('#timeNow').textContent = fmt(T); $('#timeTotal').textContent = '/ ' + fmt(duration()); }
async function waitFrameReady(items, ms = 1500) {
  const t0 = performance.now();
  while (performance.now() - t0 < ms) {
    const ok = items.every(c => { const e = els[c.id]; return !e || e.img || (!e.el.seeking && e.el.readyState >= 2); });
    if (ok) return true; await sleep(16);
  }
  return false;
}

/* ================= Renderer ================= */
const cv = $('#cv'), g = ctx2d(cv);
const frameC = C(), fg = ctx2d(frameC), tmpC = C(), tg = ctx2d(tmpC);
const workC = C(), wg = ctx2d(workC), fxC = C(), xg = ctx2d(fxC), fxC2 = C(), xg2 = ctx2d(fxC2), alphaC = C(), ag = ctx2d(alphaC);
const chromaC = C(), cg = ctx2d(chromaC, { willReadFrequently: true });
const prepMap = new Map(), accMap = new Map(), maskMap = new Map();
const noiseC = (() => { const c = C(256, 256), x = ctx2d(c), d = x.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); return c; })();
let noisePat = null, drawReq = 0;
function requestDraw() { if (playing || drawReq) return; drawReq = requestAnimationFrame(() => { drawReq = 0; draw(); }); }
function setCanvasSize(longSide) {
  const [a, b] = RATIOS[P.ratio] || [9, 16];
  let W, H; if (a >= b) { W = longSide; H = Math.round(longSide * b / a); } else { H = longSide; W = Math.round(longSide * a / b); }
  W -= W % 2; H -= H % 2;
  for (const c of [cv, frameC, tmpC]) sizeCanvas(c, W, H);
  frameC._id = null; accMap.clear(); fitStage();
}
function fitStage() {
  const st = $('#stage'); if (!st || !cv.width) return;
  const sw = st.clientWidth - 16, sh = st.clientHeight - 16; if (sw <= 0 || sh <= 0) return;
  const k = Math.min(sw / cv.width, sh / cv.height);
  cv.style.width = Math.floor(cv.width * k) + 'px'; cv.style.height = Math.floor(cv.height * k) + 'px';
}
function filterOf(c) {
  const parts = [];
  const f = FILTERS[c.filter]; if (f && f[1]) parts.push(f[1]);
  const a = c.adj || {};
  if (a.b != null && a.b !== 1) parts.push(`brightness(${a.b})`);
  if (a.c != null && a.c !== 1) parts.push(`contrast(${a.c})`);
  if (a.s != null && a.s !== 1) parts.push(`saturate(${a.s})`);
  return parts.join(' ') || 'none';
}
function srcOf(c) {
  const m = media[c.mediaId]; if (!m) return null;
  if (m.kind === 'image') return m.img ? { el: m.img, w: m.w, h: m.h } : null;
  const e = els[c.id]; if (!e || e.img || e.el.readyState < 2) return null;
  return { el: e.el, w: e.el.videoWidth, h: e.el.videoHeight };
}
function beatEnv(t) {
  if (P.beats && P.beats.length) { let b = -1; for (const x of P.beats) { if (x <= t) b = x; else break; } return b < 0 ? 0 : Math.exp(-(t - b) * 8); }
  return Math.exp(-((t % 0.5)) * 8);
}
function animAt(c, local, len) {
  const a = c.anim || {}, R = { dx: 0, dy: 0, s: 1, r: 0, o: 1, blur: 0 };
  const di = Math.min(a.dIn || .5, len / 2), dO = Math.min(a.dOut || .5, len / 2);
  const ap = (type, p) => {
    switch (type) {
      case 'fade': R.o *= 1 - p; break;
      case 'zoomin': R.s *= 1 - .45 * p; R.o *= 1 - p * .6; break;
      case 'zoomout': R.s *= 1 + .6 * p; R.o *= 1 - p * .6; break;
      case 'slidel': R.dx -= p; break;
      case 'slider': R.dx += p; break;
      case 'slideu': R.dy += p; break;
      case 'slided': R.dy -= p; break;
      case 'spin': R.r += 200 * p; R.s *= 1 - .7 * p; break;
      case 'bounce': R.s *= (1 - p * .6) + Math.sin((1 - p) * Math.PI) * .14; break;
      case 'blur': R.blur += 26 * p; R.o *= 1 - p * .5; break;
      case 'swing': R.r += -32 * p; R.o *= 1 - p * .4; break;
      case 'shake': R.dx += (rnd2(local * 40) - .5) * .08 * p; R.dy += (rnd2(local * 40 + 9) - .5) * .08 * p; break;
      case 'rise': R.dy += .18 * p; R.o *= 1 - p; break;
      case 'drop': R.dy -= .35 * p * p + Math.sin(p * Math.PI) * .04; R.o *= 1 - p * .3; break;
      case 'pop': R.s *= 1 - .85 * p + Math.sin(p * Math.PI) * .2; R.o *= 1 - p; break;
      case 'twist': R.r += 90 * p; R.s *= 1 - .35 * p; R.o *= 1 - p; break;
      case 'zoomblur': R.s *= 1 + .8 * p; R.blur += 30 * p; R.o *= 1 - p; break;
      case 'whip': R.dx -= 1.1 * p; R.blur += 36 * p; break;
      case 'flicker': R.o *= p > .02 && rnd2(local * 30) < p ? .1 : 1; break;
    }
  };
  if (a.in && a.in !== 'none' && local < di) ap(a.in, 1 - easeOut(local / di));
  if (a.out && a.out !== 'none' && len - local < dO) ap(a.out, 1 - easeOut((len - local) / dO));
  switch (a.combo) {
    case 'pulse': R.s *= 1 + .05 * Math.sin(local * Math.PI * 2.4); break;
    case 'sway': R.r += 4 * Math.sin(local * Math.PI * 1.2); break;
    case 'float': R.dy += .015 * Math.sin(local * Math.PI); break;
    case 'wobble': R.s *= 1 + .03 * Math.sin(local * 7); R.r += 2.5 * Math.sin(local * 5); break;
    case 'heartbeat': R.s *= 1 + .08 * beatEnv((c._start || 0) + local); break;
    case 'spin360': R.r += 360 * local / Math.max(.1, len); break;
    case 'kenburns': { const u = local / Math.max(.1, len); R.s *= 1.04 + .14 * u; R.dx += .03 - .06 * u; R.dy += .02 - .04 * u; break; }
    case 'zoomslow': R.s *= 1 + .18 * local / Math.max(.1, len); break;
    case 'zoomoutslow': R.s *= 1.18 - .18 * local / Math.max(.1, len); break;
    case 'breathe': R.s *= 1.03 + .03 * Math.sin(local * Math.PI * .8); break;
    case 'jitter': R.dx += (rnd2(local * 24) - .5) * .012; R.dy += (rnd2(local * 24 + 4) - .5) * .012; break;
    case 'orbit': R.dx += .02 * Math.cos(local * Math.PI); R.dy += .02 * Math.sin(local * Math.PI); break;
    case 'pendulum': R.r += 7 * Math.sin(local * Math.PI * 1.6); break;
    case 'hop': R.dy -= .03 * Math.abs(Math.sin(local * Math.PI * 1.5)); break;
  }
  return R;
}
function geom(c, s, W, H, isMain, srcT) {
  let sx = 0, sy = 0, sw = s.w, sh = s.h, fit = c.fit;
  const r90 = ((c.rot || 0) % 360 + 360) % 360, sw90 = r90 === 90 || r90 === 270;
  if (c.frame && isMain && !sw90 && c.frame.x && c.frame.x.length) {
    const p = sampleSeries(c.frame, srcT - c.in), ar = W / H; let ww = s.w, hh = s.w / ar; if (hh > s.h) { hh = s.h; ww = s.h * ar; }
    sx = clamp(p.x * s.w - ww / 2, 0, s.w - ww); sy = clamp(p.y * s.h - hh / 2, 0, s.h - hh); sw = ww; sh = hh; fit = 'cover';
  } else if (c.crop) {
    sx = c.crop.l * s.w; sy = c.crop.t * s.h; sw = Math.max(2, s.w * (1 - c.crop.l - c.crop.r)); sh = Math.max(2, s.h * (1 - c.crop.t - c.crop.b));
  }
  const iw = sw90 ? sh : sw, ih = sw90 ? sw : sh;
  const base = (isMain && fit === 'cover') ? Math.max(W / iw, H / ih) : Math.min(W / iw, H / ih);
  return { sx, sy, sw, sh, r90, sw90, dw: iw * base, dh: ih * base, fit };
}
function prepFor(id) { let p = prepMap.get(id); if (!p) { const c = C(); p = { c, g: ctx2d(c) }; prepMap.set(id, p); } return p; }
function drawVI(tctx, c, t, W, H, isMain, noMb) {
  const s = srcOf(c); if (!s || !s.w || !s.h) return false;
  const local = t - c._start, len = clipLen(c), srcT = srcAt(c, local);
  const G = geom(c, s, W, H, isMain, srcT);
  const cap = Math.max(W, H) * (c.chroma && c.chroma.on ? .8 : 1.5), q = Math.min(1, cap / Math.max(G.dw, G.dh));
  const pw = Math.max(2, Math.round(G.dw * q)), ph = Math.max(2, Math.round(G.dh * q));
  const { c: prep, g: pg } = prepFor(c.id); sizeCanvas(prep, pw, ph);
  const A = animAt(c, local, len), fx = c.fx || {};
  pg.setTransform(1, 0, 0, 1, 0, 0); pg.globalCompositeOperation = 'source-over'; pg.globalAlpha = 1; pg.filter = 'none'; pg.clearRect(0, 0, pw, ph);
  let f = filterOf(c); const extra = [];
  if (A.blur > .2) extra.push(`blur(${(A.blur * q * W / 1080).toFixed(1)}px)`);
  if (fx.hue) extra.push(`hue-rotate(${Math.round(t * 120 * fx.hue) % 360}deg)`);
  if (fx.blur) extra.push(`blur(${(fx.blur * 10 * q * W / 1080).toFixed(1)}px)`);
  if (extra.length) f = (f === 'none' ? '' : f + ' ') + extra.join(' ');
  pg.filter = f;
  pg.save(); pg.translate(pw / 2, ph / 2); if (G.r90) pg.rotate(G.r90 * Math.PI / 180);
  const dW = G.sw90 ? ph : pw, dH = G.sw90 ? pw : ph;
  pg.drawImage(s.el, G.sx, G.sy, G.sw, G.sh, -dW / 2, -dH / 2, dW, dH); pg.restore(); pg.filter = 'none';
  const needMask = (c.removeBg || c.blurBg || (c.relight && c.relight.type !== 'none' && c.relight.person)) && seg.state === 'ready';
  const pmask = needMask ? personMask(c.id, prep) : null;
  if (fx.beauty) beautify(pg, prep, pw, ph, fx.beauty);
  if (c.relight && c.relight.type !== 'none') relight(pg, pw, ph, c.relight, c.relight.person ? pmask : null);
  if (c.adj && (c.adj.temp || c.adj.tint)) tempTint(pg, pw, ph, c.adj);
  if (pmask && c.removeBg) { pg.globalCompositeOperation = 'destination-in'; pg.drawImage(pmask, 0, 0, pw, ph); pg.globalCompositeOperation = 'source-over'; }
  else if (pmask && c.blurBg) blurBackground(prep, pg, pmask, pw, ph);
  if (c.chroma && c.chroma.on) chromaKey(prep, pg, c.chroma, pw, ph);
  if (c.mask && c.mask.type !== 'none') shapeMask(c.id, pg, c.mask, pw, ph);
  const tf = tfAt(c, local);
  let x = tf.x * W + A.dx * W, y = tf.y * H + A.dy * H, sc = tf.s * A.s, rot = tf.r + A.r, op = tf.o * A.o;
  if (c.stab && c.stab.x && c.stab.x.length) { const p = sampleSeries(c.stab, srcT - c.in); x += p.x * G.dw * sc; y += p.y * G.dh * sc; sc *= 1.1; }
  if (fx.shake) { const k = fx.shake; x += (rnd2(t * 30) - .5) * W * .035 * k; y += (rnd2(t * 30 + 7) - .5) * H * .035 * k; rot += (rnd2(t * 30 + 3) - .5) * 3 * k; }
  if (fx.pulse) sc *= 1 + .1 * fx.pulse * beatEnv(t);
  sizeCanvas(workC, W, H);
  wg.setTransform(1, 0, 0, 1, 0, 0); wg.globalCompositeOperation = 'source-over'; wg.globalAlpha = 1; wg.filter = 'none'; wg.clearRect(0, 0, W, H);
  if (isMain && P.bg === 'blur' && G.fit !== 'cover' && !c.removeBg && !(c.mask && c.mask.type !== 'none')) {
    wg.filter = 'blur(' + Math.round(W / 40) + 'px) brightness(.6)'; const k = Math.max(W / pw, H / ph); wg.drawImage(prep, (W - pw * k) / 2, (H - ph * k) / 2, pw * k, ph * k); wg.filter = 'none';
  }
  const tw = tf.w || 1, th = tf.h || 1;
  wg.save(); wg.translate(x, y); wg.rotate(rot * Math.PI / 180); wg.scale(sc * tw, sc * th); wg.globalAlpha = clamp(op, 0, 1);
  wg.drawImage(prep, -G.dw / 2, -G.dh / 2, G.dw, G.dh); wg.restore(); wg.globalAlpha = 1;
  c._box = { x, y, w: G.dw * sc * tw, h: G.dh * sc * th, rot };
  // The edit frame shows the resting size and place, without animations or shake.
  c._frame = { x: tf.x * W, y: tf.y * H, w: G.dw * tf.s * tw, h: G.dh * tf.s * th, rot: tf.r };
  frameFx(c, t, W, H, isMain);
  let out = workC;
  if (fx.motionblur && !noMb && (playing || exporting)) {
    let acc = accMap.get(c.id);
    if (!acc) { const ac = C(W, H); acc = { c: ac, g: ctx2d(ac), last: -1 }; accMap.set(c.id, acc); }
    sizeCanvas(acc.c, W, H);
    const reset = acc.last < 0 || t < acc.last || t - acc.last > .3;
    acc.g.globalCompositeOperation = 'source-over';
    if (reset) { acc.g.clearRect(0, 0, W, H); acc.g.globalAlpha = 1; }
    else acc.g.globalAlpha = 1 - clamp(fx.motionblur, 0, 1) * .82;
    acc.g.drawImage(workC, 0, 0); acc.g.globalAlpha = 1; acc.last = t; out = acc.c;
  }
  tctx.save(); tctx.globalCompositeOperation = isMain ? 'source-over' : (c.blend || 'source-over'); tctx.drawImage(out, 0, 0); tctx.restore();
  return true;
}
function tint(src, dst, dgx, color) {
  sizeCanvas(dst, src.width, src.height); dgx.globalCompositeOperation = 'source-over'; dgx.globalAlpha = 1; dgx.clearRect(0, 0, dst.width, dst.height); dgx.drawImage(src, 0, 0);
  dgx.globalCompositeOperation = 'multiply'; dgx.fillStyle = color; dgx.fillRect(0, 0, dst.width, dst.height);
  dgx.globalCompositeOperation = 'destination-in'; dgx.drawImage(src, 0, 0); dgx.globalCompositeOperation = 'source-over';
}
function copyTo(dst, dgx, src, filter) { sizeCanvas(dst, src.width, src.height); dgx.setTransform(1, 0, 0, 1, 0, 0); dgx.globalCompositeOperation = 'source-over'; dgx.globalAlpha = 1; dgx.clearRect(0, 0, dst.width, dst.height); dgx.filter = filter || 'none'; dgx.drawImage(src, 0, 0); dgx.filter = 'none'; }
function frameFx(c, t, W, H, isMain) {
  const fx = c.fx || {}, on = Object.keys(fx).filter(k => fx[k] > 0 && !['shake', 'pulse', 'hue', 'blur', 'motionblur', 'beauty'].includes(k));
  if (!on.length) return;
  if (!isMain) copyTo(alphaC, ag, workC);
  const v = k => clamp(fx[k], 0, 1);
  wg.setTransform(1, 0, 0, 1, 0, 0);
  if (fx.oldfilm) { copyTo(fxC, xg, workC, `sepia(${.85 * v('oldfilm')}) contrast(1.12) brightness(${(.95 + (rnd2(t * 24) - .5) * .12 * v('oldfilm')).toFixed(3)})`); wg.clearRect(0, 0, W, H); wg.drawImage(fxC, 0, 0); wg.fillStyle = `rgba(255,255,255,${.25 * v('oldfilm')})`; for (let i = 0; i < 3; i++) if (rnd2(t * 24 + i * 13) > .5) wg.fillRect(rnd2(t * 24 + i * 7) * W, 0, Math.max(1, W / 540), H); }
  if (fx.heat) { copyTo(fxC, xg, workC, 'grayscale(1) contrast(1.3) invert(1) sepia(1) saturate(8) hue-rotate(-50deg)'); wg.globalAlpha = v('heat'); wg.drawImage(fxC, 0, 0); wg.globalAlpha = 1; }
  if (fx.duotone) { const gr = wg.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#ff2f92'); gr.addColorStop(1, '#2f6bff'); wg.globalCompositeOperation = 'color'; wg.globalAlpha = v('duotone'); wg.fillStyle = gr; wg.fillRect(0, 0, W, H); wg.globalAlpha = 1; wg.globalCompositeOperation = 'source-over'; }
  if (fx.mirror) { copyTo(fxC, xg, workC); wg.save(); wg.clearRect(W / 2, 0, W / 2, H); wg.translate(W, 0); wg.scale(-1, 1); wg.drawImage(fxC, 0, 0, W / 2, H, 0, 0, W / 2, H); wg.restore(); }
  if (fx.kaleido) { copyTo(fxC, xg, workC); wg.clearRect(0, 0, W, H); const hw = W / 2, hh = H / 2; for (let i = 0; i < 4; i++) { wg.save(); wg.translate(i % 2 ? W : 0, i > 1 ? H : 0); wg.scale(i % 2 ? -1 : 1, i > 1 ? -1 : 1); wg.drawImage(fxC, W * .25, H * .25, hw, hh, 0, 0, hw, hh); wg.restore(); } }
  if (fx.pixelate) { const b = Math.max(2, Math.round((2 + v('pixelate') * 28) * W / 540)); sizeCanvas(fxC2, Math.ceil(W / b), Math.ceil(H / b)); xg2.clearRect(0, 0, fxC2.width, fxC2.height); xg2.drawImage(workC, 0, 0, fxC2.width, fxC2.height); wg.clearRect(0, 0, W, H); wg.imageSmoothingEnabled = false; wg.drawImage(fxC2, 0, 0, W, H); wg.imageSmoothingEnabled = true; }
  if (fx.rgb || fx.vhs) {
    const k = Math.max(fx.rgb ? v('rgb') : 0, fx.vhs ? v('vhs') * .6 : 0), d = W * .012 * k; copyTo(fxC, xg, workC);
    tint(fxC, fxC2, xg2, '#ff0000');
    wg.globalCompositeOperation = 'screen'; wg.globalAlpha = .7; wg.drawImage(fxC2, -d, 0);
    tint(fxC, fxC2, xg2, '#0050ff'); wg.drawImage(fxC2, d, 0); wg.globalAlpha = 1; wg.globalCompositeOperation = 'source-over';
  }
  if (fx.vhs) {
    const k = v('vhs');
    wg.globalCompositeOperation = 'source-atop'; wg.fillStyle = `rgba(0,0,0,${.22 * k})`; const st = Math.max(2, Math.round(H / 240)); for (let y = 0; y < H; y += st) wg.fillRect(0, y, W, Math.max(1, st / 2));
    const by = ((t * .35) % 1) * H; wg.fillStyle = `rgba(255,255,255,${.12 * k})`; wg.fillRect(0, by, W, H * .035);
    copyTo(fxC, xg, workC); wg.globalCompositeOperation = 'source-over'; wg.drawImage(fxC, 0, by, W, H * .05, (rnd2(t * 20) - .5) * W * .05 * k, by, W, H * .05);
  }
  if (fx.glow) { copyTo(fxC, xg, workC, `blur(${Math.round(W / 55)}px) brightness(1.25)`); wg.globalCompositeOperation = 'screen'; wg.globalAlpha = .75 * v('glow'); wg.drawImage(fxC, 0, 0); wg.globalAlpha = 1; wg.globalCompositeOperation = 'source-over'; }
  if (fx.lightleak) { const k = v('lightleak'); wg.globalCompositeOperation = 'screen'; [[.2 + .2 * Math.sin(t * .7), .2, '255,140,60'], [.85, .75 + .15 * Math.sin(t * .5 + 2), '255,60,140']].forEach(([px, py, col]) => { const gr = wg.createRadialGradient(px * W, py * H, 0, px * W, py * H, Math.max(W, H) * .6); gr.addColorStop(0, `rgba(${col},${.75 * k})`); gr.addColorStop(1, `rgba(${col},0)`); wg.fillStyle = gr; wg.fillRect(0, 0, W, H); }); wg.globalCompositeOperation = 'source-over'; }
  if (fx.negative) { wg.globalCompositeOperation = 'difference'; wg.globalAlpha = v('negative'); wg.fillStyle = '#fff'; wg.fillRect(0, 0, W, H); wg.globalAlpha = 1; wg.globalCompositeOperation = 'source-over'; }
  if (fx.grain) { if (!noisePat) noisePat = wg.createPattern(noiseC, 'repeat'); wg.save(); wg.globalCompositeOperation = 'overlay'; wg.globalAlpha = .55 * v('grain'); wg.translate(-rnd2(t * 24) * 256, -rnd2(t * 24 + 5) * 256); wg.fillStyle = noisePat; wg.fillRect(0, 0, W + 256, H + 256); wg.restore(); }
  if (fx.vignette) { const gr = wg.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .25, W / 2, H / 2, Math.hypot(W, H) / 2); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${.9 * v('vignette')})`); wg.globalCompositeOperation = 'source-atop'; wg.fillStyle = gr; wg.fillRect(0, 0, W, H); wg.globalCompositeOperation = 'source-over'; }
  if (fx.strobe && beatEnv(t) > .55) { wg.globalCompositeOperation = 'source-atop'; wg.fillStyle = `rgba(255,255,255,${.75 * v('strobe') * beatEnv(t)})`; wg.fillRect(0, 0, W, H); wg.globalCompositeOperation = 'source-over'; }
  if (fx.letterbox) { const bh = Math.max(0, (H - Math.min(H, W / 2.35)) / 2) * v('letterbox') + H * .04 * v('letterbox'); wg.fillStyle = '#000'; wg.fillRect(0, 0, W, bh); wg.fillRect(0, H - bh, W, bh); }
  if (!isMain) { wg.globalCompositeOperation = 'destination-in'; wg.drawImage(alphaC, 0, 0); wg.globalCompositeOperation = 'source-over'; }
}
function beautify(pg, prep, pw, ph, k) {
  // Soft-focus skin smoothing: a blurred copy blended over the frame keeps edges but evens out skin.
  const b = prepFor('__beauty'); copyTo(b.c, b.g, prep, `blur(${Math.max(1.5, pw / 160).toFixed(1)}px) brightness(1.06) saturate(1.05)`);
  pg.save(); pg.globalCompositeOperation = 'lighten'; pg.globalAlpha = .55 * clamp(k, 0, 1); pg.drawImage(b.c, 0, 0);
  pg.globalCompositeOperation = 'source-over'; pg.globalAlpha = .25 * clamp(k, 0, 1); pg.drawImage(b.c, 0, 0); pg.restore();
}
function relight(pg, pw, ph, rl, mask) {
  const r = prepFor('__relight'), x = r.g, amt = clamp(rl.amt == null ? .8 : rl.amt, 0, 1);
  sizeCanvas(r.c, pw, ph); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, pw, ph);
  const rad = (cx, cy, rr, col) => { const gr = x.createRadialGradient(cx * pw, cy * ph, 0, cx * pw, cy * ph, rr * Math.max(pw, ph)); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, pw, ph); };
  switch (rl.type) {
    case 'studio': rad(.2, .1, 1, 'rgba(255,250,240,1)'); rad(.95, .9, .7, 'rgba(40,60,90,.8)'); break;
    case 'warm': rad(0, .4, .9, 'rgba(255,150,60,1)'); break;
    case 'neon': rad(0, .5, .8, 'rgba(255,40,210,1)'); rad(1, .5, .8, 'rgba(40,220,255,1)'); break;
    case 'sunset': { const gr = x.createLinearGradient(0, 0, 0, ph); gr.addColorStop(0, 'rgba(255,120,40,1)'); gr.addColorStop(.6, 'rgba(255,40,110,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, pw, ph); break; }
    case 'moody': x.fillStyle = 'rgba(10,15,40,.8)'; x.fillRect(0, 0, pw, ph); rad(1, .35, .7, 'rgba(70,110,255,1)'); break;
    case 'golden': rad(.9, .1, 1.1, 'rgba(255,200,80,1)'); break;
  }
  if (mask) { x.globalCompositeOperation = 'destination-in'; x.drawImage(mask, 0, 0, pw, ph); x.globalCompositeOperation = 'source-over'; }
  pg.save(); pg.globalCompositeOperation = 'soft-light'; pg.globalAlpha = amt; pg.drawImage(r.c, 0, 0); pg.globalCompositeOperation = 'overlay'; pg.globalAlpha = amt * .35; pg.drawImage(r.c, 0, 0); pg.restore();
}
function tempTint(pg, pw, ph, a) {
  pg.save(); pg.globalCompositeOperation = 'soft-light';
  if (a.temp) { pg.globalAlpha = Math.min(1, Math.abs(a.temp) * .8); pg.fillStyle = a.temp > 0 ? '#ff9a3c' : '#3c8bff'; pg.fillRect(0, 0, pw, ph); }
  if (a.tint) { pg.globalAlpha = Math.min(1, Math.abs(a.tint) * .6); pg.fillStyle = a.tint > 0 ? '#ff3cc8' : '#3cff6a'; pg.fillRect(0, 0, pw, ph); }
  pg.restore();
}
function blurBackground(prep, pg, mask, pw, ph) {
  const p1 = prepFor('__bb1'), p2 = prepFor('__bb2');
  copyTo(p1.c, p1.g, prep); copyTo(p2.c, p2.g, prep); p2.g.globalCompositeOperation = 'destination-in'; p2.g.drawImage(mask, 0, 0, pw, ph); p2.g.globalCompositeOperation = 'source-over';
  pg.clearRect(0, 0, pw, ph); pg.filter = `blur(${Math.max(4, Math.round(pw / 45))}px)`; pg.drawImage(p1.c, 0, 0); pg.filter = 'none'; pg.drawImage(p2.c, 0, 0);
}
function chromaKey(prep, pg, ch, pw, ph) {
  sizeCanvas(chromaC, pw, ph); cg.clearRect(0, 0, pw, ph); cg.drawImage(prep, 0, 0);
  const im = cg.getImageData(0, 0, pw, ph), d = im.data;
  const hex = (ch.color || '#00ff00').replace('#', ''), kr = parseInt(hex.slice(0, 2), 16), kgc = parseInt(hex.slice(2, 4), 16), kb = parseInt(hex.slice(4, 6), 16);
  const tol = (ch.tol == null ? .3 : ch.tol) * 441, soft = Math.max(1, (ch.soft == null ? .1 : ch.soft) * 441);
  const gKey = kgc > kr && kgc > kb, bKey = kb > kr && kb > kgc;
  for (let i = 0; i < d.length; i += 4) {
    const dr = d[i] - kr, dgc = d[i + 1] - kgc, db2 = d[i + 2] - kb, dist = Math.sqrt(dr * dr + dgc * dgc + db2 * db2);
    if (dist < tol + soft) {
      const a = clamp((dist - tol) / soft, 0, 1); d[i + 3] = d[i + 3] * a;
      if (gKey) d[i + 1] = Math.min(d[i + 1], Math.max(d[i], d[i + 2]) + 10); else if (bKey) d[i + 2] = Math.min(d[i + 2], Math.max(d[i], d[i + 1]) + 10);
    }
  }
  cg.putImageData(im, 0, 0); pg.clearRect(0, 0, pw, ph); pg.drawImage(chromaC, 0, 0);
}
function heartPath(x, S) { const s = S / 2; x.moveTo(0, s * .55); x.bezierCurveTo(-s * 1.2, -s * .25, -s * .55, -s * 1.05, 0, -s * .45); x.bezierCurveTo(s * .55, -s * 1.05, s * 1.2, -s * .25, 0, s * .55); x.closePath(); }
function starPath(x, S) { const R = S / 2, r = S / 5; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; x[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); }
function shapeMask(id, pg, m, pw, ph) {
  let mm = maskMap.get(id); if (!mm) { const c = C(); mm = { c, g: ctx2d(c) }; maskMap.set(id, mm); }
  sizeCanvas(mm.c, pw, ph); const x = mm.g, mn = Math.min(pw, ph), S = mn * (m.size == null ? .8 : m.size), f = (m.feather || 0) * mn * .12;
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, pw, ph); x.filter = f > .5 ? `blur(${f.toFixed(1)}px)` : 'none'; x.fillStyle = '#fff';
  x.translate((m.x == null ? .5 : m.x) * pw, (m.y == null ? .5 : m.y) * ph); x.rotate((m.rot || 0) * Math.PI / 180); x.beginPath();
  const wr = m.w == null ? 1 : m.w, big = Math.hypot(pw, ph) * 2;
  switch (m.type) {
    case 'circle': x.ellipse(0, 0, S / 2 * wr, S / 2, 0, 0, Math.PI * 2); break;
    case 'rect': roundRect(x, -S * wr / 2, -S / 2, S * wr, S, S * .06); break;
    case 'heart': heartPath(x, S * 1.1); break;
    case 'star': starPath(x, S * 1.15); break;
    case 'split': x.rect(-big, 0, big * 2, big); break;
    case 'band': x.rect(-big, -S / 4, big * 2, S / 2); break;
  }
  x.fill(); x.filter = 'none'; x.setTransform(1, 0, 0, 1, 0, 0);
  pg.globalCompositeOperation = m.invert ? 'destination-out' : 'destination-in'; pg.drawImage(mm.c, 0, 0); pg.globalCompositeOperation = 'source-over';
}
function draw() {
  if (!P) return;
  const W = cv.width, H = cv.height, t = T, bgc = P.bg === 'white' ? '#fff' : /^#/.test(P.bg || '') ? P.bg : '#000';
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.filter = 'none'; g.globalCompositeOperation = 'source-over';
  g.fillStyle = bgc; g.fillRect(0, 0, W, H);
  const c = clipAt(t);
  if (c) {
    // While a video is seeking it may have no frame; keep showing the last one instead of flashing black.
    const ready = !!srcOf(c);
    if (ready) { fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalAlpha = 1; fg.globalCompositeOperation = 'source-over'; fg.fillStyle = bgc; fg.fillRect(0, 0, W, H); }
    if ((ready && drawVI(fg, c, t, W, H, true) && (frameC._id = c.id)) || (!ready && frameC._id === c.id)) {
      const len = clipLen(c), D = 0.5, idx = P.clips.indexOf(c), prev = P.clips[idx - 1];
      let tr = null, p = 0;
      if (c.transition !== 'none' && idx < P.clips.length - 1 && c._start + len - t < D / 2) { tr = c.transition; p = 0.5 - (c._start + len - t) / D; }
      else if (prev && prev.transition !== 'none' && t - c._start < D / 2) { tr = prev.transition; p = 0.5 + (t - c._start) / D; }
      paintTransition(g, frameC, W, H, tr, p, tmpC, tg);
    }
  }
  else if (endLen() && t >= P._main - 1e-6) drawEnding(g, W, H, t - P._main);
  for (const l of P.layers) if (t >= l._start && t < l._start + clipLen(l)) drawVI(g, l, t, W, H, false);
  drawOverlays(g, W, H, t);
  if (!exporting && !offline) { const fb = frameBox(); if (fb) drawFrame(g, fb.box); }
  if (pvGuides && !exporting && !offline) drawGuides(g, W, H, pvGuides);
}
const LOGO = new Path2D('M20 3c6 8 12 13 12 21a12 12 0 0 1-24 0c0-8 6-13 12-21z'), LOGO_X = new Path2D('M13 25.5l14-8M13 17.5l14 8');
// The end card: the last frame fades out, the logo drops in, then the name and a gold line.
function drawEnding(ctx, W, H, u) {
  const k = Math.min(W, H), last = P.clips[P.clips.length - 1], out = clamp((END_LEN - u) / .4, 0, 1);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0d0d0d'; ctx.fillRect(0, 0, W, H);
  if (last && frameC._id === last.id && u < .45) { ctx.globalAlpha = 1 - u / .45; ctx.drawImage(frameC, 0, 0); }
  const a = clamp((u - .15) / .55, 0, 1), pop = a < 1 ? .5 + .5 * easeOut(a) + Math.sin(a * Math.PI) * .1 : 1, s = k * .21 / 40 * pop;
  ctx.globalAlpha = out * Math.min(1, a * 2.5);
  ctx.translate(W / 2, H / 2 - k * .07); ctx.scale(s, s); ctx.translate(-20, -20);
  ctx.fillStyle = '#c9a45c'; ctx.fill(LOGO); ctx.strokeStyle = '#111'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.stroke(LOGO_X);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const b = clamp((u - .55) / .5, 0, 1), px = Math.round(k * .08), y = H / 2 + k * .12 + (1 - easeOut(b)) * k * .035;
  ctx.globalAlpha = out * b; ctx.font = `800 ${px}px Roboto,"Segoe UI",system-ui,sans-serif`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const w1 = ctx.measureText('Splash').width, w2 = ctx.measureText('Cut').width, x0 = W / 2 - (w1 + w2) / 2;
  ctx.fillStyle = '#f1ede6'; ctx.fillText('Splash', x0, y); ctx.fillStyle = '#c9a45c'; ctx.fillText('Cut', x0 + w1, y);
  const lw = k * .24 * easeOut(clamp((u - .85) / .5, 0, 1));
  ctx.globalAlpha = out; ctx.fillRect(W / 2 - lw / 2, y + px * .78, lw, Math.max(2, k * .005));
  ctx.restore();
}
// Draws one frame of a clip with transition tr at progress p (0 → 0.5 is the outgoing clip, 0.5 → 1 the incoming one).
function paintTransition(ctx, frame, W, H, tr, p, tmp, tx) {
  const k = tr ? 1 - Math.abs(p - 0.5) * 2 : 0, dir = p < .5 ? -1 : 1;
  ctx.save();
  if (tr === 'zoom' || tr === 'spin' || tr === 'zoomout') { const sc = tr === 'zoomout' ? 1 - k * .35 : 1 + k * .35; ctx.translate(W / 2, H / 2); if (tr === 'spin') ctx.rotate(-dir * k * .35); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2); }
  if (tr === 'slide') ctx.translate(dir * k * W * .25, 0);
  if (tr === 'slideup') ctx.translate(0, dir * k * H * .25);
  if (tr === 'whip') { ctx.translate(dir * k * W * .55, 0); ctx.filter = `blur(${(k * 22 * W / 1080).toFixed(1)}px)`; }
  if (tr === 'shake' && k > .05) { ctx.translate((rnd2(p * 97) - .5) * W * .08 * k, (rnd2(p * 53) - .5) * H * .05 * k); ctx.rotate((rnd2(p * 31) - .5) * .06 * k); }
  if (tr === 'blur') ctx.filter = `blur(${(k * 14 * W / 1080).toFixed(1)}px)`;
  if (tr === 'pixel' && k > .05) {
    const b = Math.max(2, Math.round(k * W / 14)); sizeCanvas(tmp, Math.ceil(W / b), Math.ceil(H / b));
    tx.setTransform(1, 0, 0, 1, 0, 0); tx.clearRect(0, 0, tmp.width, tmp.height); tx.drawImage(frame, 0, 0, tmp.width, tmp.height);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, 0, 0, W, H); ctx.imageSmoothingEnabled = true;
  } else ctx.drawImage(frame, 0, 0);
  ctx.restore(); ctx.filter = 'none';
  if (tr === 'fade' || tr === 'flash') { ctx.fillStyle = tr === 'fade' ? '#000' : '#fff'; ctx.globalAlpha = k; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  if (tr === 'wipe' && k > 0) { const w = W * (p < .5 ? p * 2 : (1 - p) * 2); ctx.fillStyle = '#000'; ctx.fillRect(p < .5 ? W - w : 0, 0, w, H); }
  if (tr === 'bars' && k > 0) { const n = 8, bh = H / n; ctx.fillStyle = '#000'; for (let i = 0; i < n; i++) ctx.fillRect(0, i * bh, W, bh * k + 1); }
  if (tr === 'circle' && k > 0) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(W / 2, H / 2, Math.hypot(W, H) / 2 * (1 - k), 0, Math.PI * 2, true); ctx.fillStyle = '#000'; ctx.fill('evenodd'); ctx.restore(); }
  if (tr === 'glitch' && k > .05) {
    sizeCanvas(tmp, W, H); tx.setTransform(1, 0, 0, 1, 0, 0); tx.globalCompositeOperation = 'source-over'; tx.clearRect(0, 0, W, H); tx.drawImage(ctx.canvas, 0, 0);
    for (let i = 0; i < 7; i++) { const y = Math.random() * H, h = H * (.02 + Math.random() * .08), dx = (Math.random() - .5) * W * .12 * k; ctx.drawImage(tmp, 0, y, W, h, dx, y, W, h); }
    ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .35 * k; ctx.drawImage(tmp, W * .012 * k, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
}
/* Free transform: the selected item gets a frame with handles on the preview.
   Corners resize evenly, the side handles stretch only the width or the height, the knob on top rotates. */
function frameBox() {
  if (!sel || !P || sel.type === 'au') return null;
  const it = findSel(); if (!it || !it._frame) return null;
  layout();
  const on = sel.type === 'ov' ? T >= it.start && T < it.end : sel.type === 'clip' ? clipAt(T) === it : T >= it._start && T < it._start + clipLen(it);
  return on ? { it, box: it._frame } : null;
}
const pxK = () => cv.width / Math.max(1, cv.getBoundingClientRect().width); // canvas pixels per screen pixel
const handlePts = (b, k) => { const w = b.w / 2, h = b.h / 2; return [['nw', -w, -h], ['ne', w, -h], ['se', w, h], ['sw', -w, h], ['n', 0, -h], ['s', 0, h], ['e', w, 0], ['w', -w, 0], ['rot', 0, -h - 30 * k]]; };
function drawFrame(ctx, b) {
  const k = pxK();
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot * Math.PI / 180);
  ctx.lineWidth = 1.5 * k; ctx.strokeStyle = '#c9a45c'; ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
  ctx.beginPath(); ctx.moveTo(0, -b.h / 2); ctx.lineTo(0, -b.h / 2 - 30 * k); ctx.stroke();
  for (const [n, x, y] of handlePts(b, k)) {
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#c9a45c'; ctx.lineWidth = 2 * k; ctx.beginPath();
    if (n === 'rot') {
      ctx.arc(x, y, 10 * k, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 4.5 * k, -Math.PI * .85, Math.PI * .55); ctx.strokeStyle = '#111'; ctx.lineWidth = 1.8 * k; ctx.stroke();
      continue;
    }
    if (n.length === 1) { const v = n === 'e' || n === 'w'; roundRect(ctx, x - (v ? 3.5 : 10) * k, y - (v ? 10 : 3.5) * k, (v ? 7 : 20) * k, (v ? 20 : 7) * k, 3.5 * k); }
    else ctx.arc(x, y, 7 * k, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
// Which handle (if any) is under a point on the canvas. Touching the inside of the item, or nearer its middle
// than any handle, moves the item instead.
function handleAt(b, pt) {
  const k = pxK(), a = -b.rot * Math.PI / 180, dx = pt.x - b.x, dy = pt.y - b.y, lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
  if (Math.abs(lx) < b.w / 2 - 14 * k && Math.abs(ly) < b.h / 2 - 14 * k) return null;
  let best = null, bd = 24 * k;
  for (const [n, x, y] of handlePts(b, k)) { const d = Math.hypot(lx - x, ly - y); if (d < bd) { bd = d; best = n; } }
  return best && Math.hypot(lx, ly) >= bd ? best : null;
}
// Centre lines shown on the preview while an item is dragged onto the middle of the frame.
let pvGuides = null;
function drawGuides(ctx, W, H, gd) {
  ctx.save(); ctx.strokeStyle = '#c9a45c'; ctx.lineWidth = Math.max(2, H / 360); ctx.setLineDash([H / 60, H / 90]);
  if (gd.x) { ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); }
  if (gd.y) { ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke(); }
  ctx.restore();
}
function drawOverlays(ctx, W, H, t) {
  for (const o of P.overlays) {
    if (t < o.start || t >= o.end) { o._box = o._frame = null; continue; }
    const local = t - o.start, len = o.end - o.start, tf = ovTf(o, local);
    let alpha = tf.o, sc = tf.s, dy = 0, dx = 0, rot = tf.r, text = o.text;
    const inP = clamp(local / 0.4, 0, 1), outP = clamp((len - local) / 0.25, 0, 1);
    switch (o.anim) {
      case 'fade': alpha *= inP; break;
      case 'pop': { const e = inP; sc *= e < 1 ? 0.4 + 0.6 * (1 - Math.pow(1 - e, 3)) + Math.sin(e * Math.PI) * 0.12 : 1; alpha *= Math.min(1, inP * 2); break; }
      case 'slide': dy = (1 - easeOut(inP)) * H * 0.06; alpha *= inP; break;
      case 'bounce': dy = -Math.abs(Math.sin(local * 4)) * H * 0.015 * Math.max(0, 1 - local / 3); break;
      case 'zoom': sc *= .2 + .8 * easeOut(inP); alpha *= inP; break;
      case 'spin': rot += (1 - easeOut(inP)) * 270; sc *= .3 + .7 * easeOut(inP); break;
      case 'glitch': if (local < .6 || rnd2(t * 12) > .93) { dx = (rnd2(t * 40) - .5) * W * .03; alpha *= rnd2(t * 33) > .2 ? 1 : .3; } break;
      case 'type': if (o.type === 'text') { const n = [...o.text]; text = n.slice(0, Math.ceil(n.length * clamp(local / clamp(n.length * 0.05, 0.5, 2), 0, 1))).join(''); } break;
      case 'drop': { const e = clamp(local / .55, 0, 1); dy = e < 1 ? -(1 - e) * (1 - e) * H * .35 + Math.sin(e * Math.PI) * H * .012 : 0; alpha *= Math.min(1, e * 3); break; }
      case 'swing': rot += (1 - easeOut(inP)) * -40 * Math.cos(inP * Math.PI * 1.5); alpha *= inP; break;
      case 'flicker': if (local < .9 && rnd2(t * 26) > clamp(local / .9, 0, 1)) alpha *= .12; break;
      case 'stretch': sc *= inP < 1 ? .3 + .7 * easeOut(inP) + Math.sin(inP * Math.PI) * .15 : 1; alpha *= inP; break;
    }
    if (o.anim && o.anim !== 'none') alpha *= outP;
    const px = (o.size || 6) / 100 * H, f = FONTS[o.font] || FONTS.classic;
    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    const tw = tf.w || 1, th = tf.h || 1;
    ctx.translate(tf.x * W + dx, tf.y * H + dy); ctx.rotate(rot * Math.PI / 180); ctx.scale(sc * tw, sc * th);
    ctx.font = o.type === 'sticker' ? `${px}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif` : `${f[1]} ${px}px ${f[2]}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = o.spacing ? `${(o.spacing * px / 100).toFixed(1)}px` : '0px';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lines = String(text || ' ').split('\n'), lh = px * 1.18;
    const wMax = Math.max(...lines.map(l => ctx.measureText(l || ' ').width), px * 0.5);
    const boxW = wMax + px * 0.7, boxH = lh * lines.length + px * 0.35;
    if (o.type === 'text' && o.box) { ctx.fillStyle = o.boxColor || (o.color === '#000000' ? 'rgba(255,255,255,.88)' : 'rgba(0,0,0,.72)'); roundRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, px * 0.25); ctx.fill(); }
    lines.forEach((l, i) => {
      const y = (i - (lines.length - 1) / 2) * lh;
      if (o.type === 'text') {
        if (o.glow) { ctx.shadowColor = o.color; ctx.shadowBlur = px * 0.7; }
        else if (o.shadow || !o.box) { ctx.shadowColor = o.shadow ? 'rgba(0,0,0,.75)' : 'rgba(0,0,0,.45)'; ctx.shadowBlur = px * (o.shadow ? .25 : .12); ctx.shadowOffsetY = px * (o.shadow ? .08 : .04); }
        if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = px * 0.16; ctx.strokeStyle = o.color === '#000000' ? '#fff' : '#000'; ctx.strokeText(l, 0, y); }
        ctx.fillStyle = o.color; ctx.fillText(l, 0, y);
        if (o.glow) { ctx.shadowBlur = px * 0.25; ctx.fillText(l, 0, y); }
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      } else ctx.fillText(l, 0, y);
    });
    o._box = { x: tf.x * W + dx, y: tf.y * H + dy, w: boxW * sc * tw, h: boxH * sc * th, rot };
    o._frame = { x: tf.x * W, y: tf.y * H, w: boxW * tf.s * tw, h: boxH * tf.s * th, rot: tf.r };
    ctx.restore();
  }
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

/* ---- Person segmentation ---- */
const seg = { state: 'off', s: null, small: null, lastTs: 0 };
const segCache = new Map();
async function loadSeg() {
  if (seg.state === 'ready') return true;
  if (seg.state === 'loading') { while (seg.state === 'loading') await sleep(200); return seg.state === 'ready'; }
  seg.state = 'loading';
  try {
    const V = await import(MP_URL + '/vision_bundle.mjs');
    const files = await V.FilesetResolver.forVisionTasks(MP_URL + '/wasm');
    const make = delegate => V.ImageSegmenter.createFromOptions(files, { baseOptions: { modelAssetPath: SEG_MODEL, delegate }, runningMode: 'VIDEO', outputConfidenceMasks: true, outputCategoryMask: false });
    try { seg.s = await make('GPU'); } catch (e) { seg.s = await make('CPU'); }
    seg.small = C(256, 256);
    seg.state = 'ready'; return true;
  } catch (e) { seg.state = 'off'; console.warn(e); return false; }
}
function runSeg(src, out) {
  ctx2d(seg.small).drawImage(src, 0, 0, 256, 256);
  let ts = performance.now(); if (ts <= seg.lastTs) ts = seg.lastTs + 1; seg.lastTs = ts;
  seg.s.segmentForVideo(seg.small, ts, r => {
    const ms = r.confidenceMasks; if (!ms || !ms.length) return;
    const m = ms.length > 1 ? ms[ms.length - 1] : ms[0], f = m.getAsFloat32Array(), mw = m.width, mh = m.height;
    sizeCanvas(out, mw, mh);
    const mc = ctx2d(out), id = mc.createImageData(mw, mh);
    for (let i = 0; i < f.length; i++) { const a = clamp((f[i] - .25) / .5, 0, 1) * 255; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = a; }
    mc.putImageData(id, 0, 0);
  });
}
function personMask(id, src) {
  let e = segCache.get(id); if (!e) { e = { c: C(256, 256), n: 0, ok: false }; segCache.set(id, e); }
  e.n++;
  try { if (!e.ok || exporting || offline || e.n % 2 === 0) { runSeg(src, e.c); e.ok = true; } } catch (err) { return null; }
  return e.c;
}

/* ================= Timeline ================= */
let pps = 60;
const tl = $('#tl');
let progScroll = -1;
const pad = () => Math.round(tl.clientWidth / 2);
function followTimeline() { if (dragging) return; const x = Math.round(T * pps); if (Math.abs(tl.scrollLeft - x) > 0.5) { progScroll = x; tl.scrollLeft = x; } }
tl.addEventListener('scroll', () => {
  if (progScroll >= 0 && Math.abs(tl.scrollLeft - progScroll) <= 1) { progScroll = -1; return; }
  progScroll = -1;
  if (dragging || exporting || recording || offline) return;
  if (playing) pause();
  T = clamp(tl.scrollLeft / pps, 0, duration()); syncMedia(false); requestDraw(); updTime();
}, { passive: true });
// Rows for a track: items keep the row they were dragged to (it.lane) when it is free, the rest fill the first free row.
function lanes(items, startOf, endOf) {
  const rows = [], out = {}, sorted = [...items].sort((a, b) => startOf(a) - startOf(b));
  const free = (l, s, e) => !(rows[l] || []).some(([a, b]) => s < b - 1e-3 && e > a + 1e-3);
  const put = (l, it) => { (rows[l] = rows[l] || []).push([startOf(it), endOf(it)]); out[it.id] = l; };
  for (const it of sorted) if (it.lane != null && free(it.lane, startOf(it), endOf(it))) put(it.lane, it);
  for (const it of sorted) if (out[it.id] == null) { let l = 0; while (!free(l, startOf(it), endOf(it))) l++; put(l, it); }
  // Drop empty rows so the track stays compact.
  const used = rows.map((r, i) => r && r.length ? i : -1).filter(i => i >= 0), re = {};
  used.forEach((l, i) => { re[l] = i; });
  for (const id in out) out[id] = re[out[id]];
  return { map: out, n: used.length };
}
function kfMarks(item) {
  if (!sel || sel.id !== item.id || !item.kf || !item.kf.length) return '';
  return item.kf.map(f => `<i class="kfd" style="left:${f.t * pps}px"></i>`).join('');
}
function viTags(c) {
  return [c.speed !== 1 && c.kind !== 'image' ? `${c.speed}×` : '', hasCurve(c) ? 'CRV' : '', c.filter !== 'none' ? 'FX' : '', Object.keys(c.fx || {}).length ? 'FX+' : '',
    c.removeBg || c.blurBg ? 'BG' : '', c.stab ? 'STB' : '', c.frame ? 'AF' : '', c.mask && c.mask.type !== 'none' ? 'MASK' : '', c.chroma && c.chroma.on ? 'KEY' : '', c.reversed ? 'REV' : '', c.enhanced ? 'ENH' : '', c.muted ? 'MUTE' : ''].filter(Boolean);
}
function renderTimeline() {
  if (!P) return;
  const D = duration(), pd = pad(), wpx = Math.max(1, D * pps);
  $('#tlIn').style.width = (wpx + pd * 2) + 'px';
  const step = pps >= 160 ? 0.5 : pps >= 70 ? 1 : pps >= 30 ? 2 : pps >= 14 ? 5 : 10;
  let r = '';
  for (let i = 0, s = 0; s <= D + 0.001; i++, s = i * step) { const x = pd + s * pps, maj = i % 2 === 0; r += `<i class="${maj ? 'maj' : ''}" style="left:${x}px"></i>`; if (maj) r += `<span style="left:${x}px">${s < 60 ? s.toFixed(step < 1 ? 1 : 0) + 's' : fmt(s).slice(0, -2)}</span>`; }
  for (const b of P.beats) if (b <= D) r += `<span class="beat" style="left:${pd + b * pps}px"></span>`;
  $('#ruler').innerHTML = r;
  layout();
  // While dragging: the item is lifted and follows the finger; a main clip trimmed on its left keeps its right end still.
  const dg = dragging, lift = it => dg && dg.item === it ? ' lift' : '', dyCss = it => dg && dg.item === it && dg.moved && dg.dy ? `transform:translateY(${dg.dy}px);` : '';
  // Short items get a minimum width and slimmer (or no) trim handles so their body is easy to grab.
  const wpxOf = (len, min) => Math.max(min, len * pps - 2), small = w => w < 34 ? ' tiny2' : w < 64 ? ' tiny' : '';
  let h = '';
  P.clips.forEach((c, i) => {
    const m = media[c.mediaId], len = clipLen(c), isSel = sel && sel.type === 'clip' && sel.id === c.id, tags = viTags(c);
    let left = c._start;
    if (dg && dg.moved && dg.k === 'clip' && dg.h === 'l' && i >= dg.idx) left += dg.shift;
    if (dg && dg.moved && dg.item === c && dg.h === 'move') left = dg.s0 + dg.dx;
    const w = wpxOf(len, 4);
    h += `<div class="blk${isSel ? ' sel' : ''}${lift(c)}${small(w)}" data-k="clip" data-id="${c.id}" style="left:${pd + left * pps}px;width:${w}px;${dyCss(c)}${m && m.thumb ? `background-image:url(${m.thumb})` : ''}">
      ${tags.length ? `<span class="tags">${tags.map(x => `<span>${x}</span>`).join('')}</span>` : ''}<span class="lbl">${fmtS(len)}</span>${kfMarks(c)}
      <span class="hdl l" data-h="l"></span><span class="hdl r" data-h="r"></span></div>`;
    if (i < P.clips.length - 1) h += `<button type="button" class="trn${c.transition !== 'none' ? ' on' : ''}" data-trn="${c.id}" style="left:${pd + (left + len) * pps}px" aria-label="Transition">${c.transition !== 'none' ? '⧓' : '|'}</button>`;
  });
  if (endLen()) {
    const sh = dg && dg.moved && dg.k === 'clip' && dg.h === 'l' ? dg.shift : 0;
    h += `<div class="blk ending${sel && sel.type === 'end' ? ' sel' : ''}" data-k="end" data-id="end" style="left:${pd + (P._main + sh) * pps}px;width:${Math.max(4, END_LEN * pps - 2)}px"><span class="lbl"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3c6 8 12 13 12 21a12 12 0 0 1-24 0c0-8 6-13 12-21z" fill="currentColor"/></svg>Ending</span></div>`;
  }
  if (!P.clips.length) h = `<div class="tl-empty">Tap + to add videos or photos</div>`;
  $('#trMain').innerHTML = h;
  const lane = (rowId, items, startOf, endOf, html) => {
    const L = lanes(items, startOf, endOf); let s = ''; for (let l = 0; l < L.n; l++) s += `<div class="lane" data-lane="${l}"></div>`;
    $(rowId).innerHTML = s;
    for (const it of items) $(`${rowId} .lane[data-lane="${L.map[it.id]}"]`).insertAdjacentHTML('beforeend', html(it));
  };
  lane('#trLy', P.layers, l => l.start, l => l.start + clipLen(l), l => {
    const m = media[l.mediaId], isSel = sel && sel.type === 'layer' && sel.id === l.id, tags = viTags(l), w = wpxOf(clipLen(l), 26);
    return `<div class="blk layer${isSel ? ' sel' : ''}${lift(l)}${small(w)}" data-k="layer" data-id="${l.id}" style="left:${pd + l.start * pps}px;width:${w}px;${dyCss(l)}${m && m.thumb ? `background-image:url(${m.thumb})` : ''}"><span class="lbl">${tags.join(' ')} ${fmtS(clipLen(l))}</span>${kfMarks(l)}<span class="hdl l" data-h="l"></span><span class="hdl r" data-h="r"></span></div>`;
  });
  lane('#trOv', P.overlays, o => o.start, o => o.end, o => {
    const isSel = sel && sel.type === 'ov' && sel.id === o.id, cls = o.type === 'sticker' ? 'sticker' : o.caption ? 'cap' : 'text', w = wpxOf(o.end - o.start, 26);
    return `<div class="blk ${cls}${isSel ? ' sel' : ''}${lift(o)}${small(w)}" data-k="ov" data-id="${o.id}" style="left:${pd + o.start * pps}px;width:${w}px;${dyCss(o)}"><span class="lbl">${o.track ? 'TRK · ' : ''}${o.type === 'sticker' ? esc(o.text) : (o.caption ? 'CC · ' : '') + esc(o.text.replace(/\n/g, ' '))}</span>${kfMarks(o)}<span class="hdl l" data-h="l"></span><span class="hdl r" data-h="r"></span></div>`;
  });
  lane('#trAu', P.audio, a => a.start, a => a.start + auLen(a), a => {
    const m = media[a.mediaId], isSel = sel && sel.type === 'au' && sel.id === a.id, w = wpxOf(auLen(a), 26);
    const wave = m && m.wave && m.wave !== 'none' ? `background-image:url(${m.wave});background-size:${m.duration / a.rate * pps}px 100%;background-position:${-a.in / a.rate * pps}px 0;` : '';
    if (m && !m.wave) showWaveSoon(m);
    const icon = a.kind === 'voice' ? 'Voice · ' : a.kind === 'extracted' ? 'Clip audio · ' : a.kind === 'sfx' ? 'SFX · ' : '';
    return `<div class="blk ${a.kind}${wave ? '' : ' nowave'}${isSel ? ' sel' : ''}${lift(a)}${small(w)}" data-k="au" data-id="${a.id}" style="left:${pd + a.start * pps}px;width:${w}px;${dyCss(a)}${wave}"><span class="lbl">${icon}${esc(m ? m.name : 'Audio')}${a.afx && a.afx.preset !== 'none' ? ' · ' + AFX[a.afx.preset] : ''}</span><span class="hdl l" data-h="l"></span><span class="hdl r" data-h="r"></span></div>`;
  });
  // Highlight the row an item will land in when it is dropped.
  $('#trMain').classList.toggle('drop', !!(dg && dg.row && dg.row.main));
  if (dg && dg.row && dg.row.lane != null) {
    const ls = $$(ROW_OF[dg.k] + ' .lane');
    if (ls[dg.row.lane]) ls[dg.row.lane].classList.add('drop');
    else $(ROW_OF[dg.k]).insertAdjacentHTML('beforeend', '<div class="lane drop fresh"><span>New row</span></div>');
  }
  updTime(); followTimeline();
}

/* timeline interactions
   Tap an item to select it. Swiping across items always scrolls the timeline; to move an item, hold it still for a
   moment until it lifts (with a buzz), then drag it (up or down to change row, main clips also reorder). The edge
   handles of a selected item trim straight away. While dragging, the timeline stays still under the finger and
   scrolls by itself near the screen edges. */
let dragging = null, hold = null, noClick = false, autoRaf = 0;
const HOLD_MS = 450;
const tlIn = $('#tlIn');
const listOf = k => ({ clip: P.clips, layer: P.layers, ov: P.overlays, au: P.audio })[k];
const spanOf = (k, it) => { layout(); return k === 'clip' || k === 'layer' ? [it._start, it._start + clipLen(it)] : k === 'ov' ? [it.start, it.end] : [it.start, it.start + auLen(it)]; };
function startDrag(k, item, h, x, y) {
  const [s0, e0] = spanOf(k, item);
  dragging = { k, h, x0: x, y0: y, cx: x, cy: y, sc0: tl.scrollLeft, orig: deep(clean(item)), item, moved: false, T0: T, s0, e0, snapAt: null, shift: 0, dx: 0, dy: 0, idx: P.clips.indexOf(item), row: null, at: null };
  if (playing) pause();
}
function cancelHold() { if (hold) { clearTimeout(hold.t); hold = null; } }
tlIn.addEventListener('pointerdown', ev => {
  if (ev.target.closest('[data-trn]') || pinch.on) return;
  const blk = ev.target.closest('.blk'); if (!blk) return;
  const k = blk.dataset.k, id = blk.dataset.id, item = (listOf(k) || []).find(x => x.id === id); if (!item) return;
  const isSel = sel && sel.type === k && sel.id === id;
  if (isSel && ev.target.dataset.h) { ev.preventDefault(); startDrag(k, item, ev.target.dataset.h, ev.clientX, ev.clientY); return; }
  // The body only moves after a hold, so a swipe that starts on an item still scrolls the timeline.
  cancelHold();
  hold = { x: ev.clientX, y: ev.clientY, pid: ev.pointerId, t: setTimeout(() => {
    const hd = hold; hold = null; if (!hd || pinch.on) return;
    select({ type: k, id }); haptic('snap');
    const it2 = (listOf(k) || []).find(x => x.id === id); if (!it2) return;
    startDrag(k, it2, 'move', hd.x, hd.y); dragging.lift = true; noClick = true; renderTimeline();
  }, HOLD_MS) };
});
tlIn.addEventListener('pointermove', ev => {
  if (hold && ev.pointerId === hold.pid) { if (Math.hypot(ev.clientX - hold.x, ev.clientY - hold.y) > 8) cancelHold(); return; }
  if (!dragging) return;
  const d = dragging; d.cx = ev.clientX; d.cy = ev.clientY;
  if (!d.moved && Math.hypot(d.cx - d.x0, d.cy - d.y0) > 4) { d.moved = true; noClick = true; try { tlIn.setPointerCapture(ev.pointerId); } catch (e) { /* pointer already gone */ } }
  if (d.moved) { dragStep(); autoScroll(); }
});
// Keeps the timeline from scrolling away while an item is being dragged.
tlIn.addEventListener('touchmove', e => { if (dragging && e.touches.length === 1 && e.cancelable) e.preventDefault(); }, { passive: false });
// Shows the frame at the edge being dragged without moving the timeline.
function peek(t) { T = clamp(t, 0, duration()); syncMedia(false); requestDraw(); updTime(); }
function dragStep() {
  const d = dragging; if (!d) return;
  const dt = (d.cx - d.x0 + tl.scrollLeft - d.sc0) / pps, o = d.orig, it = d.item;
  d.dx = dt; d.dy = d.h === 'move' ? d.cy - d.y0 : 0;
  if (d.k === 'clip' || d.k === 'layer') {
    const m = media[it.mediaId], max = m.kind === 'image' ? 3600 : m.duration, sp = it.kind === 'image' ? 1 : it.speed * (hasCurve(it) ? 1 / curveTab(it).total : 1);
    if (d.h === 'l') {
      const st = d.k === 'layer' ? snapEdge(o.start + dt, it, d.T0) : (showSnap(null), d.s0 + dt), ds = st - d.s0;
      if (it.kind === 'image') { it.out = clamp(o.out - ds, 0.3, 3600); if (d.k === 'layer') it.start = Math.max(0, o.start + (o.out - it.out)); }
      else { it.in = clamp(o.in + ds * sp, 0, it.out - 0.1); if (d.k === 'layer') it.start = Math.max(0, o.start + (it.in - o.in) / sp); }
      layout();
      // A main-track clip keeps its right end still while its left edge follows the finger; the gap closes on release.
      if (d.k === 'clip') d.shift = (d.e0 - d.s0) - clipLen(it);
      peek(it._start + 0.01);
    } else if (d.h === 'r') { const en = snapEdge(d.e0 + dt, it, d.T0); it.out = clamp(o.out + (en - d.e0) * sp, it.in + 0.1, max); layout(); peek(it._start + clipLen(it) - 0.01); }
    else if (d.k === 'layer') { it.start = snapStart(Math.max(0, o.start + dt), clipLen(it), d.T0, it); layout(); peek(it.start + 0.01); d.row = rowTarget(d); }
    else { d.row = rowTarget(d); d.at = d.row ? null : reorderAt(d); showSnap(d.at ? d.at.t : null); }
  } else if (d.k === 'ov') {
    const len = o.end - o.start;
    if (d.h === 'l') it.start = clamp(snapEdge(o.start + dt, it, d.T0), 0, o.end - 0.2);
    else if (d.h === 'r') it.end = Math.max(o.start + 0.2, snapEdge(o.end + dt, it, d.T0));
    else { it.start = snapStart(Math.max(0, o.start + dt), len, d.T0, it); it.end = it.start + len; d.row = rowTarget(d); }
    peek(d.h === 'r' ? it.end - 0.01 : it.start + 0.01);
  } else {
    const m = media[it.mediaId], r = it.rate || 1;
    if (d.h === 'l') { const nd = clamp((snapEdge(o.start + dt, it, d.T0) - o.start) * r, -o.in, (o.out - o.in) - 0.2); it.in = o.in + nd; it.start = Math.max(0, o.start + nd / r); }
    else if (d.h === 'r') { const en = snapEdge(d.e0 + dt, it, d.T0); it.out = clamp(o.out + (en - d.e0) * r, o.in + 0.2, m.duration); }
    else { it.start = snapStart(Math.max(0, o.start + dt), auLen(it), d.T0, it); d.row = rowTarget(d); }
    peek(d.h === 'r' ? it.start + auLen(it) - 0.01 : it.start + 0.01);
  }
  renderTimeline();
}
// Where a main-track clip would land if dropped now: its index among the other clips and that cut's time on screen.
function reorderAt(d) {
  const mid = d.s0 + d.dx + (d.e0 - d.s0) / 2, others = P.clips.filter(c => c !== d.item); layout();
  // Count the other clips whose middle (as shown on screen) is left of the dragged clip's middle.
  const idx = others.filter(c => mid > c._start + clipLen(c) / 2).length, last = others[others.length - 1];
  return { idx, t: others[idx] ? others[idx]._start : last ? last._start + clipLen(last) : 0 };
}
const ROW_OF = { clip: '#trLy', layer: '#trLy', ov: '#trOv', au: '#trAu' };
// Which row the finger is over while moving an item up or down: { lane } for a row of its own kind,
// { main } when an overlay video goes onto the main track. Small wobbles keep the item in its row.
function rowTarget(d) {
  if (Math.abs(d.cy - d.y0) < 16) return null;
  const y = d.cy, mainR = $('#trMain').getBoundingClientRect();
  if (d.k === 'layer' && y >= mainR.top && y <= mainR.bottom) return { main: true };
  if (d.k === 'clip' && y <= mainR.bottom + 6) return null;
  const ls = $$(ROW_OF[d.k] + ' .lane:not(.fresh)');
  for (let i = 0; i < ls.length; i++) { const r = ls[i].getBoundingClientRect(); if (y >= r.top - 3 && y <= r.bottom + 3) return { lane: i }; }
  const below = ls.length ? ls[ls.length - 1].getBoundingClientRect().bottom : (d.k === 'clip' ? mainR.bottom : $(ROW_OF[d.k]).getBoundingClientRect().top);
  if (y > below && (d.k === 'au' || y < below + 46)) return { lane: ls.length, fresh: true };
  return null;
}
const trackOf = k => k === 'layer' || k === 'clip' ? [P.layers, l => l.start, l => l.start + clipLen(l)] : k === 'ov' ? [P.overlays, o => o.start, o => o.end] : [P.audio, a => a.start, a => a.start + auLen(a)];
// Pins every item of a track to the row it is shown in, then puts one item on row `lane`.
function setLane(k, it, lane) {
  const [list, so, eo] = trackOf(k), L = lanes(list.filter(x => x !== it), so, eo);
  list.forEach(x => { if (x !== it) x.lane = L.map[x.id]; });
  it.lane = lane;
}
function applyDrop(d) {
  const it = d.item, r = d.row;
  if (d.k === 'clip' && d.h === 'move') {
    if (r && r.lane != null) {
      // A main clip dragged down becomes an overlay video at the same time.
      P.clips = P.clips.filter(c => c !== it);
      it.start = Math.max(0, d.s0 + d.dx); it.tf = DEF_TF(.6); it.kf = []; it.transition = 'none'; it.blend = 'source-over';
      P.layers.push(it); setLane('layer', it, r.lane); sel = { type: 'layer', id: it.id };
      toast('Moved to the overlay row. Drag it on the preview to place it.');
    } else if (d.at && d.at.idx !== d.idx) { P.clips = P.clips.filter(c => c !== it); P.clips.splice(d.at.idx, 0, it); toast('Clip moved'); }
    return;
  }
  if (d.h !== 'move' || !r) return;
  if (d.k === 'layer' && r.main) {
    P.layers = P.layers.filter(x => x !== it);
    const at = it.start; delete it.start; delete it.lane; it.tf = DEF_TF(1); it.kf = []; it.blend = 'source-over';
    layout(); let idx = P.clips.findIndex(c => c._start + clipLen(c) / 2 > at); if (idx < 0) idx = P.clips.length;
    P.clips.splice(idx, 0, it); sel = { type: 'clip', id: it.id }; toast('Moved to the main track');
    return;
  }
  if (r.lane != null) setLane(d.k, it, r.lane);
}
function autoScroll() {
  if (autoRaf) return;
  const step = () => {
    autoRaf = 0; const d = dragging; if (!d || !d.moved) return;
    const r = tl.getBoundingClientRect(), edge = 44;
    const v = d.cx < r.left + edge ? -Math.ceil((r.left + edge - d.cx) / 3) : d.cx > r.right - edge ? Math.ceil((d.cx - (r.right - edge)) / 3) : 0;
    if (!v) return;
    const before = tl.scrollLeft; tl.scrollLeft = before + v;
    if (tl.scrollLeft !== before) dragStep();
    autoRaf = requestAnimationFrame(step);
  };
  autoRaf = requestAnimationFrame(step);
}
function stopAuto() { cancelAnimationFrame(autoRaf); autoRaf = 0; }
/* Magnetic timeline: edges click onto the playhead, beats, the end of the video and the edges of
   every other item. Each new snap buzzes and shows a gold line with a magnet. */
function snapPts(self, beats) {
  layout();
  const main = P.clips.indexOf(self), pts = beats ? [...(P.beats || [])] : [];
  if (main < 0) pts.push(0, P._main);
  if (endLen()) pts.push(P._main + END_LEN);
  // Clips after a main-track clip move with it while it is trimmed, so they cannot be targets.
  P.clips.forEach((c, i) => { if (main < 0 || i < main) pts.push(c._start, c._start + clipLen(c)); });
  P.layers.forEach(l => { if (l !== self) pts.push(l.start, l.start + clipLen(l)); });
  P.overlays.forEach(o => { if (o !== self) pts.push(o.start, o.end); });
  P.audio.forEach(a => { if (a !== self) pts.push(a.start, a.start + auLen(a)); });
  return pts;
}
// Trimmed edges snap to items, the playhead and the video's end; moved items also snap to beat marks.
function snapEdge(t, self, T0) {
  const th = 9 / pps; let best = null, bd = th;
  for (const p of [T0, ...snapPts(self, false)]) { const dd = Math.abs(t - p); if (dd < bd) { bd = dd; best = p; } }
  showSnap(best); return best == null ? t : best;
}
function snapStart(start, len, T0, self) {
  const th = 9 / pps; let best = null, at = null, bd = th;
  for (const p of [T0, ...snapPts(self, true)]) for (const off of [0, len]) { const dd = Math.abs(start + off - p); if (dd < bd) { bd = dd; best = p - off; at = p; } }
  showSnap(at); return Math.max(0, best == null ? start : best);
}
function showSnap(t) {
  const ln = $('#snapLine'); if (!ln) return;
  if (t == null) { ln.hidden = true; if (dragging) dragging.snapAt = null; return; }
  ln.style.left = (pad() + t * pps) + 'px'; ln.hidden = false;
  if (dragging && dragging.snapAt !== t) { dragging.snapAt = t; haptic('snap'); ln.classList.remove('pop'); void ln.offsetWidth; ln.classList.add('pop'); }
}
function endDrag() {
  cancelHold();
  if (!dragging) return;
  const d = dragging; dragging = null; showSnap(null); stopAuto();
  if (d.moved) {
    applyDrop(d);
    // The playhead stays where the timeline shows it, not at the edge that was dragged. After a left trim on the
    // main track the clips after it move back by the trimmed time, so the view moves with them: the new left edge
    // stays under the finger and the cut is seen on the left, even on a clip longer than the screen.
    const keep = d.k === 'clip' && d.h === 'l' ? d.shift : 0;
    T = clamp(tl.scrollLeft / pps - keep, 0, duration()); syncMedia(false);
    commit(); renderToolbar();
  } else renderTimeline();
  setTimeout(() => { noClick = false; }, 60);
}
tlIn.addEventListener('pointerup', endDrag);
tlIn.addEventListener('pointercancel', endDrag);
tlIn.addEventListener('click', ev => {
  if (noClick) { noClick = false; return; }
  const trn = ev.target.closest('[data-trn]');
  if (trn) { select({ type: 'clip', id: trn.dataset.trn }); openTool('transition'); return; }
  const blk = ev.target.closest('.blk');
  if (!blk) { if (sel) select(null); return; }
  const k = blk.dataset.k, id = blk.dataset.id;
  if (sel && sel.type === k && sel.id === id) return;
  select({ type: k, id });
  if (k === 'end') { layout(); if (T < P._main) seekTo(P._main + .01); return; }
  const it = findSel(); layout();
  if (it) { const s = k === 'clip' || k === 'layer' ? it._start : it.start, e = k === 'clip' || k === 'layer' ? it._start + clipLen(it) : k === 'ov' ? it.end : it.start + auLen(it); if (T < s || T >= e) seekTo(s + 0.01); }
});
/* Zoom: pinch with two fingers anywhere on the timeline, the − / + buttons, or Ctrl + mouse wheel. */
const pinch = { on: false, d0: 0, p0: 0 };
const tDist = e => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
tl.addEventListener('touchstart', e => {
  if (e.touches.length !== 2) return;
  cancelHold();
  if (dragging) { const d = dragging; dragging = null; showSnap(null); stopAuto(); if (d.moved) Object.assign(d.item, d.orig); }
  pinch.on = true; pinch.d0 = Math.max(1, tDist(e)); pinch.p0 = pps; tl.classList.add('pinching');
}, { passive: true });
tl.addEventListener('touchmove', e => { if (!pinch.on || e.touches.length !== 2) return; if (e.cancelable) e.preventDefault(); setZoom(pinch.p0 * tDist(e) / pinch.d0); }, { passive: false });
const pinchEnd = e => { if (pinch.on && e.touches.length < 2) { pinch.on = false; tl.classList.remove('pinching'); renderTimeline(); } };
tl.addEventListener('touchend', pinchEnd); tl.addEventListener('touchcancel', pinchEnd);
tl.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); setZoom(pps * (e.deltaY < 0 ? 1.15 : 1 / 1.15)); }, { passive: false });
function setZoom(v) { pps = clamp(v, 8, 400); renderTimeline(); const z = $('#zoomLvl'); if (z) z.textContent = Math.round(pps / 60 * 100) + '%'; }
$('#zoomIn').onclick = () => setZoom(pps * 1.4);
$('#zoomOut').onclick = () => setZoom(pps / 1.4);

/* preview interactions */
const pv = { ptrs: new Map(), it: null, kind: null, start: null };
const canvasPt = ev => { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) * cv.width / r.width, y: (ev.clientY - r.top) * cv.height / r.height }; };
function curTf(it, kind) { const local = localOf(it); return kind === 'ov' ? ovTf(it, local) : tfAt(it, local); }
cv.addEventListener('pointerdown', ev => {
  if (exporting || offline) return;
  const pt = canvasPt(ev); pv.ptrs.set(ev.pointerId, pt); try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* pointer already gone */ }
  if (pv.ptrs.size === 1) {
    pv.handle = null;
    // Make sure the selected item's frame is measured before testing its handles.
    if (sel && sel.type !== 'au') { const s0 = findSel(); if (s0 && !s0._frame) draw(); }
    const fb = frameBox(), hn = fb && handleAt(fb.box, pt);
    if (hn) {
      pv.it = fb.it; pv.kind = sel.type; pv.handle = hn;
      pv.start = { x: pt.x, y: pt.y, tf: { ...curTf(fb.it, sel.type) }, box: { ...fb.box }, moved: false };
      if (playing) pause();
      return;
    }
    let hit = null, kind = null;
    const ov = [...P.overlays].reverse().find(o => o._box && inBox(o._box, pt.x, pt.y));
    // Inside the selected item's frame always grabs it, even while an animation has it small or hidden.
    if (fb && inBox(fb.box, pt.x, pt.y)) { hit = fb.it; kind = sel.type; }
    else if (ov) { hit = ov; kind = 'ov'; }
    else {
      const ly = [...P.layers].reverse().find(l => T >= l._start && T < l._start + clipLen(l) && l._box && inBox(l._box, pt.x, pt.y));
      if (ly) { hit = ly; kind = 'layer'; }
      else if (sel && sel.type === 'clip') { const c = findSel(); if (c && T >= c._start && T < c._start + clipLen(c)) { hit = c; kind = 'clip'; } }
    }
    if (hit) {
      if (!(sel && sel.id === hit.id)) select({ type: kind, id: hit.id });
      pv.it = hit; pv.kind = kind; pv.start = { x: pt.x, y: pt.y, tf: { ...curTf(hit, kind) }, moved: false };
      if (playing) pause();
    } else pv.it = null;
  } else if (pv.ptrs.size === 2 && pv.it) {
    const [a, b] = [...pv.ptrs.values()];
    pv.start = { ...pv.start, d0: Math.hypot(a.x - b.x, a.y - b.y), a0: Math.atan2(b.y - a.y, b.x - a.x), tf: { ...curTf(pv.it, pv.kind) } };
  }
});
cv.addEventListener('pointermove', ev => {
  if (!pv.ptrs.has(ev.pointerId) || !pv.it) return;
  const pt = canvasPt(ev); pv.ptrs.set(ev.pointerId, pt);
  const it = pv.it, s = pv.start, local = localOf(it), ov = pv.kind === 'ov';
  // Magnets: the centre of the frame, upright angles and 100% size pull the item in, with a buzz.
  const near = (v, to, th) => Math.abs(v - to) < th;
  let gd;
  if (pv.handle) {
    if (pv.ptrs.size !== 1) return;
    const b = s.box, t0 = s.tf, w0 = t0.w || 1, h0 = t0.h || 1, hn = pv.handle, a = -b.rot * Math.PI / 180, dx = pt.x - b.x, dy = pt.y - b.y;
    const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
    let snap = false;
    if (hn === 'rot') {
      let r = t0.r + (Math.atan2(dy, dx) - Math.atan2(s.y - b.y, s.x - b.x)) * 180 / Math.PI;
      r = ((r + 180) % 360 + 360) % 360 - 180;
      const r90 = Math.round(r / 90) * 90; if (near(r, r90, 4)) { r = r90; snap = true; }
      setTf(it, { r }, local, ov);
    } else if (hn === 'e' || hn === 'w') {
      // Width only. It clicks to the original shape (same as the height) and to 100%.
      let w = clamp(w0 * Math.abs(lx) / Math.max(1, b.w / 2), .05, 20);
      if (near(w, h0, .04)) { w = h0; snap = true; } else if (near(w, 1, .04)) { w = 1; snap = true; }
      setTf(it, { w }, local, ov);
    } else if (hn === 'n' || hn === 's') {
      let hh = clamp(h0 * Math.abs(ly) / Math.max(1, b.h / 2), .05, 20);
      if (near(hh, w0, .04)) { hh = w0; snap = true; } else if (near(hh, 1, .04)) { hh = 1; snap = true; }
      setTf(it, { h: hh }, local, ov);
    } else {
      let sc = clamp(t0.s * Math.hypot(lx, ly) / Math.max(1, Math.hypot(b.w / 2, b.h / 2)), .05, 10);
      if (near(sc, 1, .03)) { sc = 1; snap = true; }
      setTf(it, { s: sc }, local, ov);
    }
    s.moved = true;
    const key = snap ? 'h1' : 'h0'; if (key !== pv.snapKey && snap) haptic('snap'); pv.snapKey = key;
    requestDraw(); return;
  }
  if (pv.ptrs.size === 1) {
    let x = clamp(s.tf.x + (pt.x - s.x) / cv.width, -0.5, 1.5), y = clamp(s.tf.y + (pt.y - s.y) / cv.height, -0.5, 1.5);
    gd = { x: near(x, .5, .018), y: near(y, .5, .018) }; if (gd.x) x = .5; if (gd.y) y = .5;
    setTf(it, { x, y }, local, ov); s.moved = true;
  } else if (pv.ptrs.size === 2 && s.d0) {
    const [a, b] = [...pv.ptrs.values()];
    let sc = clamp(s.tf.s * Math.hypot(a.x - b.x, a.y - b.y) / s.d0, 0.1, 8), r = s.tf.r + (Math.atan2(b.y - a.y, b.x - a.x) - s.a0) * 180 / Math.PI;
    const r90 = Math.round(r / 90) * 90; gd = { r: near(r, r90, 4), s: near(sc, 1, .04) }; if (gd.r) r = r90; if (gd.s) sc = 1;
    setTf(it, { s: sc, r }, local, ov); s.moved = true;
  }
  if (gd) {
    const key = `${gd.x ? 1 : 0}${gd.y ? 1 : 0}${gd.r ? 1 : 0}${gd.s ? 1 : 0}`;
    if (key !== pv.snapKey && /1/.test(key)) haptic('snap');
    pv.snapKey = key; pvGuides = gd.x || gd.y ? gd : null;
  }
  requestDraw();
});
function pvEnd(ev) { pv.ptrs.delete(ev.pointerId); if (pv.ptrs.size === 0) { if (pv.it && pv.start && pv.start.moved) commit(); pv.it = null; pv.handle = null; pvGuides = null; pv.snapKey = ''; requestDraw(); } }
cv.addEventListener('pointerup', pvEnd); cv.addEventListener('pointercancel', pvEnd);
function inBox(b, x, y) { const a = -b.rot * Math.PI / 180, dx = x - b.x, dy = y - b.y, lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a); return Math.abs(lx) <= b.w / 2 + 12 && Math.abs(ly) <= b.h / 2 + 12; }

/* ================= Selection / toolbar ================= */
function select(s) { sel = s; closeSheet(); renderTimeline(); renderToolbar(); requestDraw(); }
/* Line icons (24×24, stroked) so the toolbar stays calm and monochrome. */
const IC = {
  edit: 'M6 4l6 8m0 0l6-8m-6 8l-4 6m4-6l4 6M5 20a2 2 0 1 0 0-.1M19 20a2 2 0 1 0 0-.1',
  add: 'M12 5v14M5 12h14', overlay: 'M4 4h11v11H4zM9 9h11v11H9z', audio: 'M9 18V6l10-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
  text: 'M5 6V4h14v2M12 4v16M9 20h6', sticker: 'M20 12a8 8 0 1 1-8-8M20 12h-5a3 3 0 0 1-3-3V4M9 14.5c.8 1 1.8 1.5 3 1.5', rootfx: 'M12 3l1.9 4.9L19 9l-4 3.4 1.2 5.1L12 15l-4.2 2.5L9 12.4 5 9l5.1-1.1z',
  captions: 'M3 6h18v12H3zM10 10.5a2 2 0 1 0 0 3M17 10.5a2 2 0 1 0 0 3', ai: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
  format: 'M7 3h10v18H7zM10 18h4', snapshot: 'M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', layout: 'M4 4h16v16H4zM12 4v16M4 12h8',
  sfx: 'M4 10v4h4l5 4V6L8 10zM16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11', muteall: 'M4 10v4h4l5 4V6L8 10zM17 9l4 6M21 9l-4 6',
  back: 'M15 6l-6 6 6 6', split: 'M12 3v18M7 8l-3 4 3 4M17 8l3 4-3 4', speed: 'M12 20a8 8 0 1 1 8-8M12 12l4-4M20 20l-2.5-2.5', curve: 'M3 17c3 0 4-10 9-10s6 10 9 10',
  volume: 'M4 10v4h4l5 4V6L8 10zM16.5 9a4 4 0 0 1 0 6', anim: 'M5 19c3-1 4-4 5-7s3-6 7-7M17 5l2 0 0 2M6 8h.01M9 5h.01M4 12h.01',
  transform: 'M12 3v18M3 12h18M12 3l-2.5 2.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5',
  crop: 'M7 3v14h14M3 7h14v14', mask: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v18', effects: 'M12 3l1.9 4.9L19 9l-4 3.4 1.2 5.1L12 15l-4.2 2.5L9 12.4 5 9l5.1-1.1z',
  filters: 'M9 8a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM15 8a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10z', adjust: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4',
  chroma: 'M4 4h16v16H4zM4 15l5-5 4 4 3-3 4 4', removebg: 'M12 8a3 3 0 1 0 0-.1M6 20c.8-3.5 3.2-5.5 6-5.5s5.2 2 6 5.5M3 3l18 18', portrait: 'M12 9a3 3 0 1 0 0-.1M7 19c.8-3 2.8-4.5 5-4.5s4.2 1.5 5 4.5M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3',
  relight: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z', stabilize: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3',
  autoframe: 'M3 8V4h4M17 4h4v4M21 16v4h-4M7 20H3v-4M9 9h6v6H9z', freeze: 'M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9M9 4l3 2 3-2M9 20l3-2 3 2', reverse: 'M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4',
  detach: 'M4 5h10v8H4zM9 17v-4M16 13v6M19 15v4M13 17v2', denoise: 'M3 12h2l2-5 3 10 3-12 3 9 2-2h3', voicefx: 'M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  transition: 'M4 5h7v14H4zM13 5h7v14h-7z', silence: 'M3 12h4l2-4 2 8 2-4h3M17 9l4 6M21 9l-4 6', enhance: 'M5 19L19 5M15 5h4v4M7 3v4M5 5h4M17 15v4M15 17h4',
  fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', rotate: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5', dup: 'M8 8h12v12H8zM4 16V4h12', left: 'M15 6l-6 6 6 6', right: 'M9 6l6 6-6 6',
  delete: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3', blend: 'M9 9a6 6 0 1 0 0 12A6 6 0 0 0 9 9zM15 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12z', tomain: 'M12 4v12M7 11l5 5 5-5M5 20h14',
  editov: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4', track: 'M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM12 3v4M12 17v4M3 12h4M17 12h4', avolume: 'M4 10v4h4l5 4V6L8 10zM16.5 9a4 4 0 0 1 0 6',
  aspeed: 'M12 20a8 8 0 1 1 8-8M12 12l4-4', fade: 'M3 19L21 5v14z', beats: 'M9 18V5l10-2v13M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0M3 8h2M3 12h2', copystyle: 'M8 8h12v12H8zM4 16V4h12M12 14h4',
  pastestyle: 'M9 4h6v3H9zM7 5H5v16h14V5h-2M9 13l2 2 4-4', replace: 'M4 7h12l-3-3M20 17H8l3 3', normalize: 'M3 12h3l2-6 4 12 3-9 2 3h4', beauty: 'M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z',
  account: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4-6 8-6s7 2 8 6', check: 'M5 12.5l4.5 4.5L19 7', play: 'M8 5.5v13l11-6.5z', close: 'M6 6l12 12M18 6L6 18', copy: 'M8 8h12v12H8zM4 16V4h12',
  crown: 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z', hd: 'M3 5h18v14H3zM7 9v6M7 12h3M10 9v6M14 9v6h2a3 3 0 0 0 0-6z', bolt: 'M13 2L4 14h7l-1 8 9-12h-7z', infinity: 'M7 9a3 3 0 1 0 0 6c3 0 7-6 10-6a3 3 0 1 1 0 6c-3 0-7-6-10-6z'
};
IC.endoff = IC.delete; IC.endnever = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5.6 5.6l12.8 12.8';
IC.trim = 'M9 4H6v16h3M15 4h3v16h-3M10 12h4';
const icon = (id, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24"><path d="${IC[id] || IC.effects}"/></svg>`;
const T_COMMON_VI = [['split', 'Split'], ['trim', 'Trim'], ['speed', 'Speed'], ['curve', 'Speed curve'], ['volume', 'Volume'], ['anim', 'Animation'], ['transform', 'Transform'], ['crop', 'Crop'], ['mask', 'Mask'], ['effects', 'Effects'], ['filters', 'Filters'], ['adjust', 'Adjust'], ['beauty', 'Beauty', 'ai']];
const TOOLS = {
  root: [['edit', 'Edit'], ['add', 'Add media'], ['overlay', 'Overlay'], ['audio', 'Audio'], ['sfx', 'Sound FX'], ['text', 'Text'], ['sticker', 'Stickers'], ['layout', 'Split screen'], ['rootfx', 'Effects'], ['captions', 'Captions', 'ai'], ['ai', 'Smart tools', 'ai'], ['muteall', 'Mute clips'], ['format', 'Format'], ['snapshot', 'Snapshot']],
  clip: [['back', 'Back', 'back'], ...T_COMMON_VI, ['chroma', 'Chroma key'], ['removebg', 'Remove BG', 'ai'], ['portrait', 'BG blur', 'ai'], ['relight', 'Relight', 'ai'], ['stabilize', 'Stabilize', 'ai'], ['autoframe', 'Auto frame', 'ai'], ['freeze', 'Freeze'], ['reverse', 'Reverse'], ['detach', 'Extract audio'], ['denoise', 'Noise reduce', 'ai'], ['normalize', 'Loudness'], ['voicefx', 'Voice effects'], ['transition', 'Transition'], ['silence', 'Magic cut', 'ai'], ['enhance', 'Enhance', 'ai'], ['copystyle', 'Copy style'], ['pastestyle', 'Paste style'], ['replace', 'Replace'], ['fit', 'Fit / Fill'], ['rotate', 'Rotate'], ['dup', 'Duplicate'], ['left', 'Move left'], ['right', 'Move right'], ['delete', 'Delete', 'danger']],
  layer: [['back', 'Back', 'back'], ...T_COMMON_VI, ['blend', 'Blend'], ['chroma', 'Chroma key'], ['removebg', 'Remove BG', 'ai'], ['relight', 'Relight', 'ai'], ['stabilize', 'Stabilize', 'ai'], ['freeze', 'Freeze'], ['reverse', 'Reverse'], ['detach', 'Extract audio'], ['denoise', 'Noise reduce', 'ai'], ['normalize', 'Loudness'], ['voicefx', 'Voice effects'], ['enhance', 'Enhance', 'ai'], ['copystyle', 'Copy style'], ['pastestyle', 'Paste style'], ['replace', 'Replace'], ['rotate', 'Rotate'], ['tomain', 'To main track'], ['dup', 'Duplicate'], ['delete', 'Delete', 'danger']],
  ov: [['back', 'Back', 'back'], ['editov', 'Edit'], ['anim', 'Animation'], ['transform', 'Transform'], ['trim', 'Trim'], ['track', 'Track motion', 'ai'], ['split', 'Split'], ['dup', 'Duplicate'], ['delete', 'Delete', 'danger']],
  end: [['back', 'Back', 'back'], ['endoff', 'Delete ending', 'danger'], ['endnever', 'Delete for all new projects', 'danger'], ['format', 'Format']],
  au: [['back', 'Back', 'back'], ['trim', 'Trim'], ['avolume', 'Volume'], ['aspeed', 'Speed'], ['fade', 'Fade'], ['voicefx', 'Voice effects'], ['denoise', 'Noise reduce', 'ai'], ['normalize', 'Loudness'], ['beats', 'Beat sync', 'ai'], ['split', 'Split'], ['dup', 'Duplicate'], ['delete', 'Delete', 'danger']]
};
function renderToolbar() {
  let set = TOOLS[sel ? sel.type : 'root'];
  const it = sel && sel.type === 'ov' && findSel();
  if (it && it.caption) { set = set.map(t => t[0] === 'editov' ? ['editov', 'Edit caption'] : t); set = [...set.slice(0, 2), ['captions', 'All captions'], ...set.slice(2)]; }
  $('#toolbar').innerHTML = set.map(([id, lab, cls]) => `<button type="button" class="tool ${cls || ''}" data-tool="${id}"><span class="ic">${icon(id)}</span>${lab}</button>`).join('');
}
$('#toolbar').addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (b) openTool(b.dataset.tool); });

/* ================= Sheets ================= */
let sheetClose = null;
/* Edit sheets (speed, volume, filters…) preview changes live but only keep them when ✓ Apply is tapped.
   Cancel, the back button or tapping outside puts the item back the way it was. */
let edit = null;
// Settings that "Apply to all" copies to every other item of the same kind. "a.b" copies one key inside an object.
const APPLY_ALL = {
  speed: ['speed'], curve: ['curve'], volume: ['volume', 'muted'], avolume: ['volume'], aspeed: ['rate'], fade: ['fadeIn', 'fadeOut'], filters: ['filter'],
  adjust: ['adj', 'fx.vignette', 'fx.grain'], effects: ['fx'], anim: ['anim'], transition: ['transition'], voicefx: ['afx'], relight: ['relight'], beauty: ['fx.beauty'], crop: ['crop'], mask: ['mask']
};
const EDIT_TOOLS = new Set([...Object.keys(APPLY_ALL), 'transform', 'chroma', 'blend', 'editov', 'trim']);
const editSiblings = () => {
  if (!sel || !edit) return [];
  const list = { clip: P.clips, layer: P.layers, ov: P.overlays, au: P.audio }[sel.type] || [];
  return edit.tool === 'transition' ? list.slice(0, -1) : list;
};
function copyKey(src, dst, key) {
  const [a, b] = key.split('.');
  if (!b) { dst[a] = src[a] === undefined ? src[a] : deep(src[a]); return; }
  dst[a] = dst[a] || {}; if (src[a] && src[a][b] != null) dst[a][b] = src[a][b]; else delete dst[a][b];
}
function openSheet(title, html, bind, onClose) {
  if (sheetClose) { const f = sheetClose; sheetClose = null; f(); }
  $('#sheet').classList.remove('tall');
  $('#sheetTitle').textContent = title; $('#sheetBody').innerHTML = html;
  $('#sheet').hidden = false; $('#sheetBack').hidden = false;
  const ed = !!edit, all = ed && APPLY_ALL[edit.tool] && editSiblings().length > 1;
  $('#sheet').classList.toggle('editing', ed);
  $('#sheetCancel').hidden = !ed; $('#sheetAll').hidden = !all;
  $('#sheetDone').innerHTML = ed ? `${icon('check')}Apply` : 'Done';
  sheetClose = onClose || null;
  if (bind) bind($('#sheetBody'));
}
function closeSheet(apply) {
  if ($('#sheet').hidden) return;
  $('#sheet').hidden = true; $('#sheetBack').hidden = true;
  const f = sheetClose; sheetClose = null; if (f) f();
  if (!edit) return;
  const e = edit; edit = null;
  if (apply === true) {
    if (e.onApply) e.onApply();
    haptic('apply'); commit();
  } else if (JSON.stringify(clean(P)) !== e.snap) {
    const keep = P.id; P = normalize(JSON.parse(e.snap)); P.id = keep;
    if (sel && !findSel()) sel = null;
    syncEls(); renderTimeline(); renderToolbar(); seekTo(Math.min(T, duration()));
    toast('Not applied. Tap ✓ Apply to keep a change.');
  }
}
function applyToAll() {
  const it = findSel(), keys = edit && APPLY_ALL[edit.tool]; if (!it || !keys) return;
  const list = editSiblings();
  const noun = edit.tool === 'transition' ? 'cuts' : { clip: 'clips', layer: 'overlays', ov: 'texts and stickers', au: 'audio tracks' }[sel.type];
  list.forEach(x => { if (x !== it) keys.forEach(k => copyKey(it, x, k)); });
  syncMedia(playing); closeSheet(true);
  toast(`Applied to all ${list.length} ${noun}`);
}
$('#sheetDone').onclick = () => closeSheet(true);
$('#sheetCancel').onclick = () => closeSheet(false);
$('#sheetAll').onclick = applyToAll;
$('#sheetBack').onclick = () => closeSheet(false);
function slider(id, label, min, max, step, val, fmtv = v => v) { return `<div class="row"><label for="${id}">${label}</label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"><output id="${id}O">${fmtv(+val)}</output></div>`; }
function bindSlider(root, id, fmtv, onInput) { const i = $('#' + id, root), o = $('#' + id + 'O', root); if (!i) return; i.addEventListener('input', () => { o.textContent = fmtv(+i.value); onInput(+i.value); requestDraw(); }); i.addEventListener('change', commit); }
const chipRow = (name, opts, cur, scroll) => `<div class="chips${scroll ? ' scroll' : ''}" data-chips="${name}">${Object.entries(opts).map(([k, v]) => `<button type="button" class="chip" data-v="${k}" aria-pressed="${k === String(cur)}">${Array.isArray(v) ? v[0] : v}</button>`).join('')}</div>`;
function bindChips(root, name, fn) { const box = $(`[data-chips="${name}"]`, root); if (!box) return; box.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; $$('[data-v]', box).forEach(x => x.setAttribute('aria-pressed', String(x === b))); fn(b.dataset.v); }); }
const toggleRow = (id, title, sub, on) => `<div class="toggle"><span><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span><button type="button" class="sw-tog" role="switch" id="${id}" aria-checked="${!!on}" aria-label="${title}"></button></div>`;
function bindToggle(root, id, fn) { const b = $('#' + id, root); if (!b) return; b.onclick = () => { const v = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', String(v)); fn(v); }; }
const pct = v => Math.round(v * 100) + '%';
const previewAt = (it, sec = 1.2) => { layout(); const s = it._start != null ? it._start : it.start; seekTo(s + 0.01); play(); setTimeout(() => { if (playing) pause(); }, sec * 1000); };

/* ================= Visual guides =================
   Small live graphs and demos inside the sheets that show what a setting actually does. */
const GC = { gold: '#c9a45c', blue: '#36d7ff', pink: '#ff5a87', green: '#3ddc97', violet: '#9a8bff', ink: '#f1ede6', text: '#9c978e', grid: '#2d2d2d', shade: 'rgba(201,164,92,.14)', shade2: 'rgba(255,90,135,.14)' };
const vizBox = (id, h = 110, cap = '') => `<figure class="viz"><canvas id="${id}" style="height:${h}px"></canvas>${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
// Sizes a canvas for the screen's pixel density and returns a context that draws in CSS pixels.
function gfx(cvs) {
  const r = cvs.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1), w = Math.max(1, r.width), h = Math.max(1, r.height);
  sizeCanvas(cvs, w * dpr, h * dpr); const x = cvs.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h); return { x, w, h };
}
// Runs fn(seconds) every frame for as long as the canvas is on screen.
function liveLoop(cvs, fn) { const t0 = performance.now(), tick = now => { if (!cvs || !cvs.isConnected) return; fn((now - t0) / 1000); requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
/* plot(canvas, { series: [{ f: u => value, color, fill, dash }], yMin, yMax, base, yTicks: [[v, label]], xLabels: [l, r],
   shade: [{ u0, u1, color, label }], points: [{ u, v, color }], marks: [{ u, label, color }] }) — u runs 0 → 1 across the item. */
function plot(cvs, o) {
  if (!cvs) return;
  const { x, w, h } = gfx(cvs), L = o.left == null ? 36 : o.left, R = 8, Tp = 8, B = o.xLabels ? 18 : 6, pw = w - L - R, ph = h - Tp - B;
  if (pw < 10 || ph < 10) return;
  const X = u => L + u * pw, Y = v => Tp + (1 - (v - o.yMin) / (o.yMax - o.yMin)) * ph, base = o.base != null ? o.base : o.yMin;
  x.font = '10px Roboto,system-ui,sans-serif'; x.textBaseline = 'middle'; x.lineWidth = 1;
  for (const s of o.shade || []) { x.fillStyle = s.color || GC.shade; x.fillRect(X(s.u0), Tp, Math.max(1, X(s.u1) - X(s.u0)), ph); if (s.label && X(s.u1) - X(s.u0) > 24) { x.fillStyle = GC.ink; x.textAlign = 'center'; x.fillText(s.label, (X(s.u0) + X(s.u1)) / 2, Tp + 9); } }
  x.textAlign = 'right';
  for (const [v, lab] of o.yTicks || []) { const y = Math.round(Y(v)) + .5; x.strokeStyle = GC.grid; x.beginPath(); x.moveTo(L, y); x.lineTo(w - R, y); x.stroke(); x.fillStyle = GC.text; x.fillText(lab, L - 5, y); }
  if (o.xLabels) { x.fillStyle = GC.text; x.textAlign = 'left'; x.fillText(o.xLabels[0], L, h - 7); x.textAlign = 'right'; x.fillText(o.xLabels[1], w - R, h - 7); }
  const N = Math.max(80, Math.round(pw));
  const trace = f => { x.beginPath(); for (let i = 0; i <= N; i++) { const u = i / N, v = clamp(f(u), o.yMin, o.yMax); if (i) x.lineTo(X(u), Y(v)); else x.moveTo(X(u), Y(v)); } };
  for (const s of o.series) {
    if (s.fill) { trace(s.f); x.lineTo(X(1), Y(base)); x.lineTo(X(0), Y(base)); x.closePath(); x.fillStyle = s.fill; x.fill(); }
    trace(s.f); x.strokeStyle = s.color; x.lineWidth = s.width || 2; x.lineJoin = 'round'; x.setLineDash(s.dash || []); x.stroke(); x.setLineDash([]);
  }
  for (const p of o.points || []) { const px = X(p.u), py = Y(p.v); x.fillStyle = p.color || GC.gold; x.beginPath(); x.moveTo(px, py - 5); x.lineTo(px + 5, py); x.lineTo(px, py + 5); x.lineTo(px - 5, py); x.closePath(); x.fill(); x.strokeStyle = '#111'; x.lineWidth = 1; x.stroke(); }
  for (const mk of o.marks || []) {
    const mx = Math.round(X(clamp(mk.u, 0, 1))) + .5; x.strokeStyle = mk.color || GC.ink; x.lineWidth = 1.5; x.beginPath(); x.moveTo(mx, Tp); x.lineTo(mx, Tp + ph); x.stroke();
    if (mk.label) { x.fillStyle = mk.color || GC.ink; x.textAlign = mk.u > .5 ? 'right' : 'left'; x.fillText(mk.label, mx + (mk.u > .5 ? -4 : 4), Tp + ph - 8); }
  }
}
const legend = items => items.map(([c, n]) => `<span><i style="background:${c}"></i>${n}</span>`).join('');
function volumeMeter(cvs, v) {
  if (!cvs) return; const { x, w, h } = gfx(cvs), L = 10, R = 10, pw = w - L - R, y = 16, bh = 14;
  x.fillStyle = '#262626'; roundRect(x, L, y, pw, bh, 7); x.fill();
  const gr = x.createLinearGradient(L, 0, L + pw, 0); gr.addColorStop(0, GC.green); gr.addColorStop(.45, GC.gold); gr.addColorStop(.5, GC.gold); gr.addColorStop(1, GC.pink);
  if (v > 0) { x.save(); roundRect(x, L, y, pw, bh, 7); x.clip(); x.fillStyle = gr; x.fillRect(L, y, pw * clamp(v / 2, 0, 1), bh); x.restore(); }
  x.font = '10px Roboto,system-ui,sans-serif'; x.textBaseline = 'top'; x.fillStyle = GC.text;
  [[0, 'Silent'], [.5, '50%'], [1, 'Original'], [1.5, '150%'], [2, '200%']].forEach(([t, lab]) => { const px = L + pw * t / 2; x.fillRect(px - .5, y + bh + 2, 1, 4); x.textAlign = t === 0 ? 'left' : t === 2 ? 'right' : 'center'; x.fillText(lab, px, y + bh + 8); });
  x.fillStyle = GC.ink; x.textAlign = 'left'; x.font = '600 11px Roboto,system-ui,sans-serif';
  x.fillText(v <= 0 ? 'Muted' : `${Math.round(v * 100)}%  ·  ${v === 1 ? 'no change' : (v > 1 ? '+' : '') + (20 * Math.log10(v)).toFixed(1) + ' dB'}`, L, 1);
}
function fadeGraph(cvs, a) {
  const len = Math.max(.1, auLen(a)), fi = Math.min(a.fadeIn || 0, len), fo = Math.min(a.fadeOut || 0, len), top = Math.max(1, a.volume);
  const f = u => { const t = u * len; let g = a.volume; if (fi > 0) g *= clamp(t / fi, 0, 1); if (fo > 0) g *= clamp((len - t) / fo, 0, 1); return g; };
  plot(cvs, { yMin: 0, yMax: top * 1.08, yTicks: [[0, '0'], [1, '100%'], ...(top > 1.2 ? [[2, '200%']] : [])], xLabels: ['0s', fmtS(len)],
    shade: [...(fi ? [{ u0: 0, u1: fi / len, label: 'Fade in' }] : []), ...(fo ? [{ u0: 1 - fo / len, u1: 1, label: 'Fade out', color: GC.shade2 }] : [])],
    series: [{ f, color: GC.gold, fill: 'rgba(201,164,92,.25)' }] });
}
function toneGraph(cvs, adj) {
  const b = adj.b == null ? 1 : adj.b, c = adj.c == null ? 1 : adj.c, s = adj.s == null ? 1 : adj.s;
  plot(cvs, { yMin: 0, yMax: 1, left: 42, yTicks: [[0, 'Black'], [.5, 'Mid'], [1, 'White']], xLabels: ['Shadows', 'Highlights'],
    series: [{ f: u => u, color: '#4a4a4a', width: 1, dash: [4, 4] }, { f: u => clamp((clamp(u * b, 0, 1) - .5) * c + .5, 0, 1), color: GC.gold, fill: 'rgba(201,164,92,.12)' }] });
  // Saturation shown as a colour strip under the curve.
  const x = cvs.getContext('2d'), r = cvs.getBoundingClientRect(), gr = x.createLinearGradient(42, 0, r.width - 8, 0);
  ['#ff3b3b', '#ffd23f', '#3ddc97', '#36d7ff', '#9a8bff', '#ff5a87'].forEach((col, i) => gr.addColorStop(i / 5, col));
  x.save(); x.filter = `saturate(${s})`; x.fillStyle = gr; x.fillRect(42, r.height - 3, r.width - 50, 3); x.restore();
}
function eqGraph(cvs, afx) {
  const ac = actx(), N = 140, fr = new Float32Array(N), sum = new Float32Array(N), mag = new Float32Array(N), ph = new Float32Array(N);
  for (let i = 0; i < N; i++) fr[i] = 20 * Math.pow(1000, i / (N - 1));
  [['lowshelf', 200, afx.low || 0, 1], ['peaking', 1200, afx.mid || 0, 1], ['highshelf', 4500, afx.high || 0, 1]].forEach(([t, f, gn, q]) => {
    const bq = ac.createBiquadFilter(); bq.type = t; bq.frequency.value = f; bq.gain.value = gn; bq.Q.value = q; bq.getFrequencyResponse(fr, mag, ph);
    for (let i = 0; i < N; i++) sum[i] += 20 * Math.log10(Math.max(1e-6, mag[i]));
  });
  const at = u => { const p = u * (N - 1), i = Math.min(N - 2, Math.floor(p)); return lerp(sum[i], sum[i + 1], p - i); };
  plot(cvs, { yMin: -14, yMax: 14, base: 0, yTicks: [[-12, '-12'], [0, '0 dB'], [12, '+12']], xLabels: ['Bass · 20 Hz', 'Treble · 20 kHz'],
    series: [{ f: at, color: GC.blue, fill: 'rgba(54,215,255,.16)' }] });
}
const SPEED_TICKS = [[-1, '0.1×'], [Math.log10(.5), '0.5×'], [0, '1×'], [Math.log10(2), '2×'], [Math.log10(5), '5×'], [1, '10×']];
const lg = v => Math.log10(clamp(v, .1, 10));
function speedGraph(cvs, it) {
  const tab = hasCurve(it) ? curveTab(it) : null;
  plot(cvs, { yMin: -1, yMax: 1, base: 0, yTicks: SPEED_TICKS, xLabels: ['Start of clip', 'End'],
    series: [{ f: u => lg((tab ? tab.sp(u) : 1) * it.speed), color: GC.gold, fill: 'rgba(201,164,92,.2)' }] });
}
function segmentGraph(cvs, it, a, b, sp) {
  const span = it.out - it.in, ua = (a - it.in) / span, ub = (b - it.in) / span;
  plot(cvs, { yMin: -1, yMax: 1, base: 0, yTicks: SPEED_TICKS, xLabels: ['Start of clip', 'End'], shade: [{ u0: ua, u1: ub, label: `${sp}×` }],
    series: [{ f: u => lg(u >= ua && u <= ub ? sp : it.speed), color: GC.gold, fill: 'rgba(201,164,92,.2)' }] });
}
function lenCompare(el, before, after) {
  if (!el) return; const mx = Math.max(before, after, .01);
  el.innerHTML = `<div><span>Original</span><i style="width:${before / mx * 100}%"></i><b>${fmtS(before)}</b></div><div><span>New</span><i class="new" style="width:${after / mx * 100}%"></i><b>${fmtS(after)}</b></div>`;
}
// Tiny speed-curve icon for the curve chips.
function sparkline(pts) {
  const y = v => (7 - lg(v) * 6).toFixed(1), d = pts.map((v, i) => `${i ? 'L' : 'M'}${(i / (pts.length - 1) * 32 + 1).toFixed(1)} ${y(v)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 34 14" aria-hidden="true"><path d="M1 7H33" class="mid"/><path d="${d}"/></svg>`;
}
const ANIM_SERIES = [['o', GC.gold, 'Opacity'], ['s', GC.blue, 'Size'], ['mv', GC.pink, 'Position'], ['r', GC.green, 'Rotation'], ['blur', GC.violet, 'Blur']];
function animGraph(cvs, leg, it) {
  if (!cvs) return;
  const len = Math.max(.3, clipLen(it)), fake = { anim: it.anim, _start: 0 }, N = 160, v = {};
  ANIM_SERIES.forEach(([k]) => { v[k] = new Float32Array(N + 1); });
  for (let i = 0; i <= N; i++) { const R = animAt(fake, i / N * len, len); v.o[i] = R.o; v.s[i] = R.s; v.mv[i] = Math.min(1.5, Math.hypot(R.dx, R.dy) * 2); v.r[i] = Math.min(1.5, Math.abs(R.r) / 180); v.blur[i] = Math.min(1.5, R.blur / 30); }
  const used = ANIM_SERIES.filter(([k]) => k === 'o' || Math.max(...v[k]) - Math.min(...v[k]) > .01);
  const at = arr => u => { const p = u * N, i = Math.min(N - 1, Math.floor(p)); return lerp(arr[i], arr[i + 1], p - i); };
  const a = it.anim, di = Math.min(a.dIn || .5, len / 2) / len, dO = Math.min(a.dOut || .5, len / 2) / len;
  plot(cvs, { yMin: 0, yMax: 1.5, left: 30, yTicks: [[0, '0'], [1, '100%']], xLabels: ['0s', fmtS(len)],
    shade: [...(a.in !== 'none' ? [{ u0: 0, u1: di, label: 'In' }] : []), ...(a.out !== 'none' ? [{ u0: 1 - dO, u1: 1, label: 'Out', color: GC.shade2 }] : [])],
    series: used.map(([k, c]) => ({ f: at(v[k]), color: c })) });
  if (leg) leg.innerHTML = legend(used.map(([, c, n]) => [c, n]));
}
function demoCard(x, w, h, R, colA, colB, label) {
  const cw = w * .5, ch = h * .56;
  x.save(); x.translate(w / 2 + R.dx * w, h / 2 + R.dy * h); x.rotate(R.r * Math.PI / 180); x.scale(R.s, R.s); x.globalAlpha = clamp(R.o, 0, 1);
  if (R.blur > .5) x.filter = `blur(${(R.blur / 26 * 5).toFixed(1)}px)`;
  const gr = x.createLinearGradient(-cw / 2, -ch / 2, cw / 2, ch / 2); gr.addColorStop(0, colA); gr.addColorStop(1, colB);
  x.fillStyle = gr; roundRect(x, -cw / 2, -ch / 2, cw, ch, 8); x.fill();
  x.fillStyle = 'rgba(17,17,17,.85)'; x.font = `800 ${Math.round(ch * .42)}px Roboto,system-ui,sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, 0, 1);
  x.restore();
}
function animDemo(cvs, it) {
  liveLoop(cvs, t => {
    const { x, w, h } = gfx(cvs), len = Math.max(.3, clipLen(it)), loop = clamp(len, 1.6, 4.5), u = Math.min(1, (t % (loop + .7)) / loop);
    x.fillStyle = '#0c0c0c'; x.fillRect(0, 0, w, h);
    demoCard(x, w, h, animAt({ anim: it.anim, _start: 0 }, u * len, len), GC.gold, GC.pink, '▶');
    x.fillStyle = '#2d2d2d'; x.fillRect(8, h - 6, w - 16, 2); x.fillStyle = GC.ink; x.fillRect(8 + (w - 16) * u - 1, h - 9, 2, 8);
  });
}
function textAnimDemo(cvs, o) {
  liveLoop(cvs, t => {
    const { x, w, h } = gfx(cvs), len = clamp(o.end - o.start, 1.2, 3.5), local = (t % (len + .6));
    x.fillStyle = '#0c0c0c'; x.fillRect(0, 0, w, h);
    const fo = { ...deep(clean(o)), id: '__demo', start: 0, end: len, x: .5, y: .5, kf: [], track: null, scale: 1, rot: 0, opacity: 1, size: o.type === 'sticker' ? 40 : 18,
      text: o.type === 'sticker' ? o.text : (o.text.split('\n')[0].slice(0, 16) || 'Text') };
    const keep = P.overlays; P.overlays = [fo];
    try { drawOverlays(x, w, h, Math.min(local, len - .001)); } finally { P.overlays = keep; }
  });
}
function transitionDemo(cvs, getTr) {
  const fc = C(), tmp = C(), tx = ctx2d(tmp);
  liveLoop(cvs, t => {
    gfx(cvs); const x = cvs.getContext('2d'), W = cvs.width, H = cvs.height, cyc = t % 2.4, p = clamp((cyc - .7) / 1, 0, 1);
    sizeCanvas(fc, W, H); const fx = ctx2d(fc); fx.setTransform(1, 0, 0, 1, 0, 0); fx.fillStyle = '#151515'; fx.fillRect(0, 0, W, H);
    demoCard(fx, W, H, { dx: 0, dy: 0, s: 1, r: 0, o: 1, blur: 0 }, p < .5 ? GC.gold : GC.blue, p < .5 ? '#ff8a3d' : GC.violet, p < .5 ? 'A' : 'B');
    x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    const tr = getTr(); paintTransition(x, fc, W, H, tr === 'none' ? null : tr, p, tmp, tx);
  });
}
function tfViz(r, it, ov) {
  const map = $('#tfMap', r), gcv = $('#tfG', r), leg = $('#tfLeg', r); if (!map) return;
  const len = Math.max(.1, ov ? it.end - it.start : clipLen(it)), local = clamp(localOf(it), 0, len), at = l => ov ? ovTf(it, l) : tfAt(it, l), cur = at(local);
  { // Where the item sits in the frame right now.
    const { x, w, h } = gfx(map), [ra, rb] = RATIOS[P.ratio] || [9, 16], k = Math.min((w - 12) / ra, (h - 12) / rb), fw = ra * k, fh = rb * k, fx = (w - fw) / 2, fy = (h - fh) / 2;
    x.fillStyle = '#0c0c0c'; x.fillRect(fx, fy, fw, fh); x.strokeStyle = '#3a3a3a'; x.lineWidth = 1; x.strokeRect(fx + .5, fy + .5, fw - 1, fh - 1);
    x.strokeStyle = '#262626'; x.beginPath(); x.moveTo(fx + fw / 2, fy); x.lineTo(fx + fw / 2, fy + fh); x.moveTo(fx, fy + fh / 2); x.lineTo(fx + fw, fy + fh / 2); x.stroke();
    let bw, bh;
    if (it._box && cv.width) { bw = it._box.w / cur.s / cv.width * fw; bh = it._box.h / cur.s / cv.height * fh; }
    else { const m = media[it.mediaId], ar = m && m.w && m.h ? m.w / m.h : 16 / 9; bw = fw; bh = fw / ar; if (bh > fh) { bh = fh; bw = fh * ar; } }
    x.save(); x.beginPath(); x.rect(fx, fy, fw, fh); x.clip(); x.translate(fx + cur.x * fw, fy + cur.y * fh); x.rotate(cur.r * Math.PI / 180); x.scale(cur.s, cur.s);
    x.globalAlpha = Math.max(.25, cur.o); x.fillStyle = 'rgba(201,164,92,.35)'; x.fillRect(-bw / 2, -bh / 2, bw, bh); x.globalAlpha = 1;
    x.strokeStyle = GC.gold; x.lineWidth = 1.5 / cur.s; x.strokeRect(-bw / 2, -bh / 2, bw, bh); x.restore();
  }
  const S = [['x', GC.gold, 'Left ↔ right', v => (v.x + .5) / 2], ['y', GC.blue, 'Up ↕ down', v => (v.y + .5) / 2], ['s', GC.pink, 'Size', v => clamp(v.s / 2, 0, 1)], ['r', GC.green, 'Rotation', v => (v.r + 180) / 360], ['o', GC.violet, 'Opacity', v => v.o]];
  const kf = it.kf || [], vary = S.filter(([k]) => kf.length > 1 && Math.max(...kf.map(f => f[k])) - Math.min(...kf.map(f => f[k])) > 1e-3);
  const show = vary.length ? vary : S.filter(([k]) => k !== 'r');
  plot(gcv, { yMin: 0, yMax: 1, left: 8, xLabels: ['0s', fmtS(len)], series: show.map(([, c, , m]) => ({ f: u => m(at(u * len)), color: c })),
    points: kf.map(f => ({ u: f.t / len, v: .04 })), marks: [{ u: local / len, label: 'Now', color: GC.ink }] });
  leg.innerHTML = legend(show.map(([, c, n]) => [c, n])) + `<small>${kf.length ? `◆ ${kf.length} keyframe${kf.length > 1 ? 's' : ''}: values glide smoothly between them` : 'No keyframes yet, so the item stays the same the whole time'}</small>`;
}
/* Two-handle range picker over a filmstrip or waveform: drag either edge, or the middle to move the whole part.
   Edges pull towards the ends and the playhead like a magnet, with a buzz. */
const rangeHtml = (id, strip, wave) => `<div class="rg" id="${id}"><div class="rg-strip${wave ? ' wave' : ''}"${strip ? ` style="background-image:url(${strip})"` : ''}></div><i class="rg-dim l"></i><i class="rg-dim r"></i><div class="rg-sel" data-rg="m"><span class="rg-h l" data-rg="a"></span><span class="rg-h r" data-rg="b"></span></div></div><div class="rg-times"><span id="${id}A"></span><b id="${id}L"></b><span id="${id}B"></span></div>`;
function rangeBar(root, o) {
  const el = $('#' + o.id, root), selEl = $('.rg-sel', el), dl = $('.rg-dim.l', el), dr = $('.rg-dim.r', el), span = Math.max(1e-6, o.max - o.min), fm = o.fmt || fmtS;
  let a = o.a, b = o.b, drag = null;
  (o.snaps || []).forEach(s => el.insertAdjacentHTML('beforeend', `<i class="rg-snap" style="left:${(s - o.min) / span * 100}%"></i>`));
  const paint = () => {
    const ua = (a - o.min) / span * 100, ub = (b - o.min) / span * 100;
    selEl.style.left = ua + '%'; selEl.style.width = (ub - ua) + '%'; dl.style.width = ua + '%'; dr.style.left = ub + '%';
    $('#' + o.id + 'A', root).textContent = fm(a); $('#' + o.id + 'B', root).textContent = fm(b); $('#' + o.id + 'L', root).textContent = fmtS(b - a);
  };
  el.addEventListener('pointerdown', ev => {
    const hd = ev.target.closest('[data-rg]'); if (!hd) return;
    ev.preventDefault(); try { el.setPointerCapture(ev.pointerId); } catch (e) { /* pointer already gone */ }
    drag = { h: hd.dataset.rg, x0: ev.clientX, a0: a, b0: b, w: el.getBoundingClientRect().width, hit: null }; el.classList.add('drag');
  });
  el.addEventListener('pointermove', ev => {
    if (!drag) return;
    const dt = (ev.clientX - drag.x0) / drag.w * span, th = span * .025, pts = [o.min, o.max, ...(o.snaps || [])];
    const near = v => { let best = null, bd = th; for (const p of pts) { const d = Math.abs(v - p); if (d < bd) { bd = d; best = p; } } return best; };
    let hit = null;
    if (drag.h === 'a') { a = clamp(drag.a0 + dt, o.min, b - o.gap); const s = near(a); if (s != null && s <= b - o.gap) { a = s; hit = s; } }
    else if (drag.h === 'b') { b = clamp(drag.b0 + dt, a + o.gap, o.max); const s = near(b); if (s != null && s >= a + o.gap) { b = s; hit = s; } }
    else {
      const len = drag.b0 - drag.a0; a = clamp(drag.a0 + dt, o.min, o.max - len); b = a + len;
      const sa = near(a), sb = near(b);
      if (sa != null) { a = sa; b = a + len; hit = sa; } else if (sb != null) { b = sb; a = b - len; hit = sb; }
    }
    if (hit !== drag.hit) { drag.hit = hit; if (hit != null) { haptic('snap'); el.classList.remove('snap'); void el.offsetWidth; el.classList.add('snap'); } }
    paint(); o.onChange(a, b, drag.h);
  });
  const end = () => { if (!drag) return; drag = null; el.classList.remove('drag'); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  paint();
  return { set(na, nb) { a = na; b = nb; paint(); } };
}

async function openTool(id) {
  if (edit) closeSheet(false);
  const it = findSel();
  if (EDIT_TOOLS.has(id) && it) edit = { tool: id, snap: JSON.stringify(clean(P)) };
  await runTool(id);
  if (edit && $('#sheet').hidden) edit = null; // the tool only showed a message
}
async function runTool(id) {
  const it = findSel();
  if (playing && id !== 'add') pause();
  switch (id) {
    case 'back': select(null); return;
    case 'edit': { const c = clipAt(T) || P.clips[P.clips.length - 1]; if (!c) { toast('Add a video or photo first'); return; } select({ type: 'clip', id: c.id }); return; }
    case 'add': return addMediaFlow();
    case 'overlay': return addLayerFlow();
    case 'audio': return audioSheet();
    case 'text': return textTemplatesSheet();
    case 'sticker': return stickerSheet();
    case 'rootfx': { const c = clipAt(T); if (!c) { toast('Move the playhead over a clip'); return; } select({ type: 'clip', id: c.id }); return effectsSheet(c); }
    case 'captions': return captionsSheet();
    case 'ai': return aiSheet();
    case 'format': return formatSheet();
    case 'snapshot': return snapshot();
    case 'split': return splitSel();
    case 'dup': return duplicateSel();
    case 'delete': return deleteSel();
    case 'endoff': case 'endnever': {
      P.ending = false; if (id === 'endnever') store.set('sc_ending', false);
      sel = null; commit(); renderToolbar(); seekTo(Math.min(T, duration()));
      toast(id === 'endnever' ? 'Ending deleted. New projects start without it. Turn it back on in Format.' : 'Ending deleted. Turn it back on in Format.', 3200); return;
    }
    case 'tomain': { P.layers = P.layers.filter(x => x !== it); const c = { ...it }; delete c.start; c.tf = DEF_TF(1); c.kf = []; c.blend = 'source-over'; const at = clipAt(T); P.clips.splice(at ? P.clips.indexOf(at) + 1 : P.clips.length, 0, c); commit(); select({ type: 'clip', id: c.id }); toast('Moved to the main track'); return; }
    case 'left': case 'right': { const i = P.clips.indexOf(it), j = id === 'left' ? i - 1 : i + 1; if (j < 0 || j >= P.clips.length) return; [P.clips[i], P.clips[j]] = [P.clips[j], P.clips[i]]; commit(); layout(); seekTo(it._start + 0.01); return; }
    case 'fit': it.fit = it.fit === 'cover' ? 'contain' : 'cover'; toast(it.fit === 'cover' ? 'Fill: the clip covers the frame' : 'Fit: the whole clip is visible'); commit(); return;
    case 'rotate': it.rot = ((it.rot || 0) + 90) % 360; commit(); return;
    case 'speed': return speedSheet(it);
    case 'curve': return curveSheet(it);
    case 'trim': return trimSheet(it);
    case 'volume': return openSheet('Clip volume', `${vizBox('volG', 64)}${slider('vol', 'Volume', 0, 2, 0.05, it.volume, pct)}<button type="button" class="btn" id="mute">${it.muted ? 'Unmute clip' : 'Mute clip'}</button>`,
      r => { const viz = () => volumeMeter($('#volG', r), it.muted ? 0 : it.volume); viz(); bindSlider(r, 'vol', pct, v => { it.volume = v; it.muted = false; syncMedia(playing); viz(); }); $('#mute', r).onclick = e => { it.muted = !it.muted; e.target.textContent = it.muted ? 'Unmute clip' : 'Mute clip'; syncMedia(playing); viz(); commit(); }; });
    case 'avolume': return openSheet('Audio volume', vizBox('volG', 64) + slider('vol', 'Volume', 0, 2, 0.05, it.volume, pct), r => { volumeMeter($('#volG', r), it.volume); bindSlider(r, 'vol', pct, v => { it.volume = v; syncMedia(playing); volumeMeter($('#volG', r), v); }); });
    case 'aspeed': return openSheet('Audio speed', slider('asp', 'Speed', .5, 2, .05, it.rate || 1, v => v.toFixed(2) + '×') + `<p class="note" id="aspN"></p><p class="note">Voices keep their normal pitch.</p>`,
      r => { const n = () => { $('#aspN', r).textContent = `Plays for ${fmtS(auLen(it))} (the original part is ${fmtS(it.out - it.in)}).`; }; n(); bindSlider(r, 'asp', v => v.toFixed(2) + '×', v => { it.rate = v; renderTimeline(); syncMedia(playing); n(); }); });
    case 'fade': return openSheet('Fade', vizBox('fdG', 120, 'Volume over the length of this audio') + slider('fi', 'Fade in', 0, 5, 0.1, it.fadeIn || 0, v => v.toFixed(1) + 's') + slider('fo', 'Fade out', 0, 5, 0.1, it.fadeOut || 0, v => v.toFixed(1) + 's') + '<p class="note">Fade in starts silent and rises to full volume. Fade out lowers it to silence at the end, so music never stops abruptly.</p>',
      r => { const viz = () => fadeGraph($('#fdG', r), it); viz(); bindSlider(r, 'fi', v => v.toFixed(1) + 's', v => { it.fadeIn = v; viz(); }); bindSlider(r, 'fo', v => v.toFixed(1) + 's', v => { it.fadeOut = v; viz(); }); });
    case 'filters': return filtersSheet(it);
    case 'adjust': return adjustSheet(it);
    case 'transition': return openSheet('Transition to next clip', vizBox('trDemo', 130, 'Clip A → Clip B') + chipRow('tr', TRANSITIONS, it.transition) + '<p class="note">The effect plays across the cut, half a second in total. Tap Apply to all to use it on every cut.</p>',
      r => { transitionDemo($('#trDemo', r), () => it.transition); bindChips(r, 'tr', v => { it.transition = v; commit(); layout(); seekTo(Math.max(0, it._start + clipLen(it) - 0.6)); play(); setTimeout(() => { if (playing) pause(); }, 1100); }); });
    case 'silence': return silenceCut(it);
    case 'enhance': return enhance([it]);
    case 'portrait': return segToggle(it, 'blurBg', 'Background blur');
    case 'removebg': return segToggle(it, 'removeBg', 'Background removal');
    case 'editov': return it.type === 'sticker' ? stickerSheet(it) : textSheet(it);
    case 'anim': return sel.type === 'ov' ? openSheet('Animation', vizBox('anDemo', 120, 'How it moves') + chipRow('an', ANIMS, it.anim || 'none') + '<p class="note">In-animations play when the item appears; every animated item fades out at its end.</p>', r => { textAnimDemo($('#anDemo', r), it); bindChips(r, 'an', v => { it.anim = v; commit(); previewAt(it, 1.3); }); }) : animSheet(it);
    case 'transform': return transformSheet(it);
    case 'crop': return cropSheet(it);
    case 'mask': return maskSheet(it);
    case 'effects': return effectsSheet(it);
    case 'blend': return openSheet('Blend', chipRow('bl', BLENDS, it.blend, true) + slider('blo', 'Opacity', 0, 1, .01, tfAt(it, localOf(it)).o, pct), r => { bindChips(r, 'bl', v => { it.blend = v; commit(); }); bindSlider(r, 'blo', pct, v => setTf(it, { o: v }, localOf(it))); });
    case 'chroma': return chromaSheet(it);
    case 'relight': return relightSheet(it);
    case 'stabilize': return stabilizeSheet(it);
    case 'autoframe': return autoframeSheet(it);
    case 'freeze': return freezeFrame(it);
    case 'reverse': return reverseClip(it);
    case 'detach': return detachAudio(it);
    case 'denoise': return denoiseSheet(it);
    case 'voicefx': return voiceFxSheet(it);
    case 'track': return trackSheet(it);
    case 'beats': return beatSheet(it);
    case 'sfx': return sfxSheet();
    case 'layout': return layoutSheet();
    case 'muteall': { const any = P.clips.some(c => !c.muted && c.kind === 'video'); P.clips.forEach(c => { c.muted = any; }); syncMedia(playing); commit(); toast(any ? 'All clip sound muted' : 'Clip sound back on'); return; }
    case 'copystyle': clipStyle = pickStyle(it); toast('Style copied. Select another clip and tap Paste style.'); return;
    case 'pastestyle': return pasteStyleSheet(it);
    case 'replace': return replaceClip(it);
    case 'normalize': return normalizeLoudness(it);
    case 'beauty': return openSheet('Beauty', slider('bty', 'Smooth skin', 0, 1, .01, (it.fx && it.fx.beauty) || 0, pct) + '<p class="note">Softens skin and evens out the tone while keeping eyes and edges sharp. Works best on faces filmed in good light.</p>', r => bindSlider(r, 'bty', pct, v => setFx(it, 'beauty', v)));
  }
}

/* ---- edit operations ---- */
function splitSel() {
  const it = findSel(); if (!it) return;
  layout();
  if (sel.type === 'clip' || sel.type === 'layer') {
    if (hasCurve(it)) { toast('Remove the speed curve before splitting this clip'); return; }
    const src = srcAt(it, T - it._start);
    if (src <= it.in + 0.05 || src >= it.out - 0.05) { toast('Move the playhead inside the clip to split it'); return; }
    splitVI(it, src, sel.type === 'layer');
  } else if (sel.type === 'ov') {
    if (T <= it.start + 0.05 || T >= it.end - 0.05) { toast('Move the playhead inside the item to split it'); return; }
    const b = { ...deep(clean(it)), id: uid(), start: T }; it.end = T; P.overlays.push(b);
  } else {
    const local = (T - it.start) * it.rate; if (local <= 0.05 || local >= it.out - it.in - 0.05) { toast('Move the playhead inside the audio to split it'); return; }
    const b = { ...deep(clean(it)), id: uid(), start: T, in: it.in + local, fadeIn: 0 }; it.out = it.in + local; it.fadeOut = 0; P.audio.push(b);
  }
  commit(); toast('Split');
}
// Cuts a video or photo clip at source time src. The original keeps the first part; the new second part is returned.
function splitVI(it, src, isLayer) {
  layout();
  const local = it.kind === 'image' ? src - it.in : outAt(it, src - it.in), start0 = it.start;
  const b = { ...deep(clean(it)), id: uid(), in: src };
  if (it.kind === 'image') { b.in = 0; b.out = it.out - local; it.out = local; }
  else it.out = src;
  b.kf = (it.kf || []).filter(k => k.t >= local).map(k => ({ ...k, t: +(k.t - local).toFixed(3) })); it.kf = (it.kf || []).filter(k => k.t < local);
  const cut = sr => sr ? { ...sr, x: sr.x.slice(Math.floor((src - it.in) * sr.fps)), y: sr.y.slice(Math.floor((src - it.in) * sr.fps)) } : null;
  b.stab = cut(it.stab); b.frame = cut(it.frame);
  // The in-animation stays on the first part and the out-animation moves to the second.
  it.anim = { ...it.anim, out: 'none' }; b.anim = { ...b.anim, in: 'none' };
  if (!isLayer) { b.transition = it.transition; it.transition = 'none'; P.clips.splice(P.clips.indexOf(it) + 1, 0, b); }
  else { b.start = start0 + clipLen(it); P.layers.push(b); }
  return b;
}
/* --- Trim: pick exactly which part to keep by dragging the left or right edge --- */
function trimSheet(it) {
  layout();
  const k = sel.type, m = media[it.mediaId], isVI = k === 'clip' || k === 'layer';
  if (isVI && it.kind === 'image') {
    return openSheet('Trim photo', slider('trL', 'Show for', .3, 30, .1, it.out - it.in, v => v.toFixed(1) + 's') + '<p class="note">Photos have no edges to trim; choose how long this one stays on screen.</p>',
      r => bindSlider(r, 'trL', v => v.toFixed(1) + 's', v => { it.out = it.in + v; if (k === 'clip') layout(); renderTimeline(); }));
  }
  const tl0 = k === 'ov' ? null : { in: it.in, start: it.start };
  // Overlays (texts/stickers) are trimmed on the project timeline; clips and audio within their source file.
  const span = k === 'ov' ? [0, Math.max(duration(), it.end) + 2] : [0, m.duration];
  const rate = () => k === 'au' ? it.rate || 1 : isVI ? it.speed * (hasCurve(it) ? 1 / curveTab(it).total : 1) : 1;
  const get = () => k === 'ov' ? [it.start, it.end] : [it.in, it.out];
  const startOf = () => isVI ? it._start : it.start, endOf = () => isVI ? it._start + clipLen(it) : k === 'ov' ? it.end : it.start + auLen(it);
  const strip = k === 'au' ? (m && m.wave !== 'none' && m.wave) : (m && m.thumb);
  const here = () => { const t = T; if (t < startOf() || t > endOf()) return null; return k === 'ov' ? t : isVI ? srcAt(it, t - it._start) : it.in + (t - it.start) * rate(); };
  const fmtv = v => k === 'ov' ? fmt(v) : fmtS(v);
  openSheet('Trim', `${rangeHtml('trR', strip, k === 'au')}
    <div class="kfbar"><button type="button" class="btn" id="trCutL">${icon('left')}Cut left of playhead</button><button type="button" class="btn" id="trCutR">Cut right of playhead${icon('right')}</button></div>
    <p class="note" id="trInfo"></p>`,
  r => {
    const set = (a, b) => {
      if (k === 'ov') { it.start = a; it.end = b; }
      else {
        it.in = a; it.out = b;
        // Overlay clips and audio keep their place: trimming the left edge moves where they start.
        if (k !== 'clip') it.start = Math.max(0, tl0.start + (a - tl0.in) / rate());
      }
      layout(); renderTimeline();
      const [x, y] = get();
      $('#trInfo', r).textContent = k === 'ov' ? `Shows from ${fmt(x)} to ${fmt(y)} (${fmtS(y - x)}).` : `Keeping ${fmtS(y - x)} of ${fmtS(m.duration)}: from ${fmtS(x)} to ${fmtS(y)} of the original. Plays for ${fmtS(endOf() - startOf())}.`;
    };
    const [a0, b0] = get(), h0 = here();
    const rb = rangeBar(r, { id: 'trR', min: span[0], max: span[1], a: a0, b: b0, gap: k === 'au' ? .2 : .1, fmt: fmtv, snaps: h0 == null ? [] : [h0],
      onChange: (a, b, h) => { set(a, b); seekTo(h === 'b' ? endOf() - .02 : startOf() + .01); } });
    set(a0, b0);
    const cutAt = side => {
      const h = here(); if (h == null) { toast('Move the playhead inside the item first'); return; }
      let [a, b] = get(); if (side === 'l') a = Math.min(h, b - .1); else b = Math.max(h, a + .1);
      rb.set(a, b); set(a, b); haptic('snap'); seekTo(side === 'l' ? startOf() + .01 : endOf() - .02);
    };
    $('#trCutL', r).onclick = () => cutAt('l'); $('#trCutR', r).onclick = () => cutAt('r');
  });
}
function duplicateSel() {
  const it = findSel(); if (!it) return;
  const b = { ...deep(clean(it)), id: uid() };
  if (sel.type === 'clip') P.clips.splice(P.clips.indexOf(it) + 1, 0, b);
  else if (sel.type === 'layer') { b.start = it.start + clipLen(it); P.layers.push(b); }
  else if (sel.type === 'ov') { b.y = clamp(b.y + 0.06, 0, 1); P.overlays.push(b); }
  else { b.start = it.start + auLen(it); P.audio.push(b); }
  commit(); select({ type: sel.type, id: b.id }); toast('Duplicated');
}
function deleteSel() {
  const it = findSel(); if (!it) return;
  if (sel.type === 'clip') P.clips = P.clips.filter(c => c !== it);
  else if (sel.type === 'layer') P.layers = P.layers.filter(c => c !== it);
  else if (sel.type === 'ov') P.overlays = P.overlays.filter(o => o !== it);
  else { P.audio = P.audio.filter(a => a !== it); if (it.kind === 'music' && !P.audio.some(a => a.kind === 'music')) { P.beats = []; P.bpm = 0; } }
  dropEl(it.id); sel = null; commit(); renderToolbar(); seekTo(Math.min(T, duration()));
}

/* ---- media adding ---- */
function pickFiles(accept, multiple = true) {
  return new Promise(res => {
    const inp = $('#fileIn'); inp.accept = accept; inp.multiple = multiple; inp.value = '';
    inp.onchange = () => res([...inp.files]); inp.oncancel = () => res([]);
    inp.click();
  });
}
async function addMediaFlow() {
  const files = await pickFiles('video/*,image/*'); if (!files.length) return;
  busy.show('Importing', `${files.length} file${files.length > 1 ? 's' : ''}`);
  const ms = await importFiles(files); busy.hide(); if (!ms.length) return;
  layout();
  let at = P.clips.length;
  const c = clipAt(T); if (c) at = P.clips.indexOf(c) + ((T - c._start) > clipLen(c) / 2 ? 1 : 0);
  const added = ms.filter(m => m.kind !== 'audio').map(m => makeClip(m, false));
  P.clips.splice(at, 0, ...added);
  ms.filter(m => m.kind === 'audio').forEach(m => addAudioItem(m, 'music'));
  commit(); layout(); if (added[0]) seekTo(added[0]._start + 0.01);
  toast(`Added ${added.length} clip${added.length !== 1 ? 's' : ''}`);
}
async function addLayerFlow() {
  const files = await pickFiles('video/*,image/*', false); if (!files.length) return;
  busy.show('Importing'); const ms = await importFiles(files); busy.hide(); if (!ms[0] || ms[0].kind === 'audio') return;
  const l = makeClip(ms[0], true); l.start = T; if (ms[0].kind === 'image') l.out = Math.max(1, Math.min(5, (P._main || 5) - T));
  P.layers.push(l); commit(); select({ type: 'layer', id: l.id }); seekTo(T + 0.01);
  toast('Overlay added. Drag it on the preview, pinch to resize.');
}
function addAudioItem(m, kind, start) {
  const a = normAu({ id: uid(), mediaId: m.id, kind, start: start != null ? start : (kind === 'music' && !P.audio.some(x => x.kind === 'music') ? 0 : T), in: 0,
    out: kind === 'music' ? Math.min(m.duration, Math.max(P._main || 0, 3)) : m.duration, volume: kind === 'music' ? 0.8 : 1, fadeIn: 0, fadeOut: kind === 'music' ? 1 : 0, rate: 1 });
  if (a.out <= 0) a.out = m.duration;
  P.audio.push(a);
  showWave(m);
  return a;
}
function audioSheet() {
  openSheet('Audio', `<div class="card"><h4>Add music</h4><p>Pick a song or sound from your phone. It starts at 0:00 and is trimmed to your video's length.</p><button type="button" class="btn main" id="aMusic">Choose audio file</button></div>
    <div class="card"><h4>Record voiceover</h4><p>Narrate over your video. Recording starts at the playhead.</p><button type="button" class="btn" id="aVoice">Open recorder</button></div>
    <div class="card"><h4>Extract audio from a clip</h4><p>Puts the sound of the clip at the playhead on its own track so you can move, cut or clean it.</p><button type="button" class="btn" id="aExt">Extract audio</button></div>
    <div class="card"><h4>Auto duck <span class="badge">Auto</span></h4><p>Lowers the music automatically whenever someone speaks.</p><button type="button" class="btn" id="aDuck">${P.duck && P.duck.on ? 'Turn off auto duck' : 'Turn on auto duck'}</button></div>`,
  r => {
    $('#aMusic', r).onclick = async () => {
      const files = await pickFiles('audio/*', false); if (!files.length) return;
      busy.show('Importing audio'); const ms = await importFiles(files); busy.hide(); if (!ms[0]) return;
      const a = addAudioItem(ms[0], 'music'); closeSheet(); commit(); select({ type: 'au', id: a.id }); toast('Music added. Try Beat sync next.');
    };
    $('#aVoice', r).onclick = voiceSheet;
    $('#aExt', r).onclick = () => { const c = clipAt(T); if (!c) { toast('Move the playhead over a video clip'); return; } closeSheet(); detachAudio(c); };
    $('#aDuck', r).onclick = () => { closeSheet(); autoDuck(); };
  });
}

/* ---- voiceover ---- */
function voiceSheet() {
  openSheet('Voiceover', `<div class="rec-time" id="recTime">0:00.0</div><button type="button" class="rec-btn" id="recBtn" aria-label="Start recording"></button>
    <div class="row"><label for="recMute">Video sound</label><select class="sel" id="recMute"><option value="1">Muted while recording (no echo)</option><option value="0">Play while recording (use headphones)</option></select></div>
    <p class="note">Recording starts at ${fmt(T)} and stops at the end of the video or when you tap again.</p>`,
  r => { $('#recBtn', r).onclick = () => recording ? stopVoice() : startVoice($('#recMute', r).value === '1'); }, () => { if (recording) stopVoice(); });
}
async function startVoice(muteBed) {
  let stream;
  // Echo cancellation would switch Android into phone-call audio (sound from the earpiece, stuck videos), so it is
  // left off; the video's sound is muted while recording unless headphones are used.
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } }); }
  catch (e) { toast('Microphone access was blocked. Allow it in Android settings > Apps > SplashCut > Permissions.', 4500); return; }
  const types = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'], mime = types.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
  const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : {}), chunks = [];
  mr.ondataavailable = e => e.data.size && chunks.push(e.data);
  recording = { mr, stream, chunks, start: T, t0: performance.now(), muteBed, timer: 0, mime: mr.mimeType || mime || 'audio/webm' };
  recording.timer = setInterval(() => { const el = $('#recTime'); if (el) el.textContent = fmt((performance.now() - recording.t0) / 1000); }, 100);
  mr.start(250);
  const b = $('#recBtn'); if (b) { b.classList.add('on'); b.setAttribute('aria-label', 'Stop recording'); }
  if (duration() - T > 0.2) play();
}
function stopVoice() {
  const r = recording; if (!r) return; recording = null;
  clearInterval(r.timer); if (playing) pause();
  const dur = (performance.now() - r.t0) / 1000;
  r.mr.onstop = async () => {
    r.stream.getTracks().forEach(t => t.stop());
    await sleep(150); restoreAudio();
    if (dur < 0.3) { toast('Recording too short'); return; }
    const m = await addMediaRecord('audio', 'Voiceover', new Blob(r.chunks, { type: r.mime.split(';')[0] }), dur);
    const a = addAudioItem(m, 'voice', r.start); a.out = m.duration;
    closeSheet(); commit(); select({ type: 'au', id: a.id }); toast(`Voiceover added (${dur.toFixed(1)}s)`);
  };
  r.mr.stop();
  const b = $('#recBtn'); if (b) b.classList.remove('on');
}

// After using the microphone, put the phone back into normal media sound and rebuild the audio engine and players,
// so sound comes from the loudspeaker again and videos play without leaving the project.
function restoreAudio() {
  try { if (NATIVE && NATIVE.audioReset) NATIVE.audioReset(); } catch (e) { /* older app shell */ }
  for (const id of Object.keys(els)) dropEl(id);
  if (AC) { try { AC.close(); } catch (e) { /* already closed */ } }
  AC = master = recDest = null;
  for (const k in irCache) delete irCache[k];
  actx(); if (P) { syncMedia(false); requestDraw(); }
}

/* ---- text & stickers ---- */
function textTemplatesSheet() {
  openSheet('Add text', `<div class="fgrid">${Object.entries(TEXT_TEMPLATES).map(([k, [n, st]]) => `<button type="button" class="fopt" data-tt="${k}"><span class="sw" style="background:${st.boxColor || '#1b2030'};color:${st.color};font-size:12px;${st.glow ? `text-shadow:0 0 8px ${st.color}` : ''}">${esc(st.text.split('\n')[0].slice(0, 7))}</span>${n}</button>`).join('')}</div>
    <button type="button" class="btn main full" id="ttPlain">Plain text</button>`,
  r => { r.addEventListener('click', e => { const b = e.target.closest('[data-tt]'); if (b) addText(TEXT_TEMPLATES[b.dataset.tt][1]); }); $('#ttPlain', r).onclick = () => addText(); });
}
function addText(preset) {
  const o = normOv({ id: uid(), type: 'text', text: 'Your text', start: T, end: T + 3, x: 0.5, y: 0.45, size: 7, scale: 1, rot: 0, font: 'classic', color: '#ffffff', stroke: true, box: false, glow: false, shadow: false, anim: 'pop', ...(preset ? deep(preset) : {}) });
  P.overlays.push(o); commit(); select({ type: 'ov', id: o.id }); textSheet(o, true);
}
function textSheet(o, fresh) {
  openSheet(o.caption ? (fresh ? 'Add caption' : 'Edit caption') : fresh ? 'Add text' : 'Edit text', `<textarea class="txt" id="txIn" aria-label="Text">${esc(o.text)}</textarea>
    <div class="lab">Font</div>${chipRow('font', FONTS, o.font, true)}
    <div class="lab">Colour</div><div class="swatches" id="txCol">${COLORS.map(c => `<button type="button" class="swatch" style="background:${c}" data-c="${c}" aria-label="${c}" aria-pressed="${c === o.color}"></button>`).join('')}</div>
    <div class="chips" id="txSty">${[['stroke', 'Outline'], ['box', 'Label box'], ['glow', 'Neon glow'], ['shadow', 'Shadow']].map(([k, n]) => `<button type="button" class="chip" data-s="${k}" aria-pressed="${!!o[k]}">${n}</button>`).join('')}</div>
    <div class="lab">Box colour</div><div class="swatches" id="txBox">${['', '#000000', '#ffffff', '#e11d2e', '#0b3d91', '#ffd23f', '#36d7ff', '#ff5a87'].map(c => `<button type="button" class="swatch" style="background:${c || 'linear-gradient(135deg,#000 50%,#fff 50%)'}" data-c="${c}" aria-label="${c || 'Auto'}" aria-pressed="${(o.boxColor || '') === c}"></button>`).join('')}</div>
    ${slider('txSz', 'Size', 2, 20, 0.5, o.size, v => v.toFixed(1))}${slider('txSp', 'Spacing', -5, 40, 1, o.spacing || 0, v => v)}${slider('txOp', 'Opacity', 0, 1, .01, o.opacity == null ? 1 : o.opacity, pct)}
    ${o.caption ? '<button type="button" class="btn full" id="txCapAll">Use this look and place on all captions</button>' : ''}
    <p class="note">Drag the ${o.caption ? 'caption' : 'text'} on the preview to move it. Use two fingers to resize and rotate.</p>`,
  r => {
    const ta = $('#txIn', r);
    ta.addEventListener('input', () => { o.text = ta.value || ' '; requestDraw(); renderTimeline(); });
    ta.addEventListener('change', commit);
    if (fresh) setTimeout(() => { ta.focus(); ta.select(); }, 150);
    bindChips(r, 'font', v => { o.font = v; commit(); });
    $('#txCol', r).onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; o.color = b.dataset.c; $$('#txCol [data-c]', r).forEach(x => x.setAttribute('aria-pressed', String(x === b))); commit(); };
    $('#txBox', r).onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; o.boxColor = b.dataset.c || null; if (b.dataset.c) o.box = true; $$('#txBox [data-c]', r).forEach(x => x.setAttribute('aria-pressed', String(x === b))); commit(); };
    $('#txSty', r).onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; o[b.dataset.s] = !o[b.dataset.s]; b.setAttribute('aria-pressed', String(o[b.dataset.s])); commit(); };
    bindSlider(r, 'txSz', v => v.toFixed(1), v => { o.size = v; });
    bindSlider(r, 'txSp', v => v, v => { o.spacing = v; });
    bindSlider(r, 'txOp', pct, v => { setTf(o, { o: v }, T - o.start, true); });
    const ca = $('#txCapAll', r); if (ca) ca.onclick = () => { const n = capList().filter(x => x !== o); n.forEach(x => CAP_LOOK.forEach(k => { x[k] = o[k]; })); requestDraw(); commit(); toast(`Copied to ${n.length} other caption${n.length === 1 ? '' : 's'}`); };
  }, () => commit());
}
function stickerSheet(existing) {
  openSheet(existing ? 'Change sticker' : 'Stickers', Object.entries(STICKERS).map(([cat, list]) => `<div class="lab">${cat}</div><div class="stk-grid">${list.split(' ').map(s => `<button type="button" class="stk" data-st="${s}">${s}</button>`).join('')}</div>`).join(''),
  r => r.addEventListener('click', e => {
    const b = e.target.closest('[data-st]'); if (!b) return;
    if (existing) { existing.text = b.dataset.st; commit(); closeSheet(); return; }
    const o = normOv({ id: uid(), type: 'sticker', text: b.dataset.st, start: T, end: T + 3, x: 0.5, y: 0.35, size: 14, scale: 1, rot: 0, anim: 'pop' });
    P.overlays.push(o); commit(); select({ type: 'ov', id: o.id }); toast('Sticker added. Drag it on the preview, or use Track motion to make it follow something.');
  }));
}

/* ---- clip look ---- */
function filtersSheet(c) {
  const m = media[c.mediaId], th = m && m.thumb;
  openSheet('Filters', `<div class="fgrid" id="fg">${Object.entries(FILTERS).map(([k, [n, f]]) => `<button type="button" class="fopt" data-f="${k}" aria-pressed="${k === c.filter}">${th ? `<img src="${th}" alt="" style="filter:${f || 'none'}">` : `<span class="sw" style="filter:${f || 'none'};background:linear-gradient(135deg,#36d7ff,#ff5a87)"></span>`}${n}</button>`).join('')}</div>
<p class="note">Tap Apply to all to give every clip this look.</p>`,
  r => {
    $('#fg', r).onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; c.filter = b.dataset.f; $$('[data-f]', r).forEach(x => x.setAttribute('aria-pressed', String(x === b))); commit(); };
  });
}
function adjustSheet(it) {
  const tfmt = v => (v > 0 ? 'warm ' : v < 0 ? 'cool ' : '') + Math.abs(Math.round(v * 100)), nfmt = v => (v > 0 ? 'magenta ' : v < 0 ? 'green ' : '') + Math.abs(Math.round(v * 100));
  openSheet('Adjust', vizBox('adjG', 120, 'Tone curve: how dark (left) to bright (right) parts of the picture change') + slider('ab', 'Brightness', 0.4, 1.8, 0.02, it.adj.b, v => v.toFixed(2)) + slider('ac', 'Contrast', 0.4, 1.8, 0.02, it.adj.c, v => v.toFixed(2)) + slider('as', 'Saturation', 0, 2.5, 0.02, it.adj.s, v => v.toFixed(2)) +
    slider('at', 'Temperature', -1, 1, .02, it.adj.temp, tfmt) + slider('ai2', 'Tint', -1, 1, .02, it.adj.tint, nfmt) +
    slider('av', 'Vignette', 0, 1, .02, (it.fx && it.fx.vignette) || 0, pct) + slider('ag', 'Grain', 0, 1, .02, (it.fx && it.fx.grain) || 0, pct) + '<button type="button" class="btn" id="adjR">Reset</button>',
  r => {
    const viz = () => toneGraph($('#adjG', r), it.adj); viz();
    bindSlider(r, 'ab', v => v.toFixed(2), v => { it.adj.b = v; viz(); }); bindSlider(r, 'ac', v => v.toFixed(2), v => { it.adj.c = v; viz(); }); bindSlider(r, 'as', v => v.toFixed(2), v => { it.adj.s = v; viz(); });
    bindSlider(r, 'at', tfmt, v => { it.adj.temp = v; }); bindSlider(r, 'ai2', nfmt, v => { it.adj.tint = v; });
    bindSlider(r, 'av', pct, v => setFx(it, 'vignette', v)); bindSlider(r, 'ag', pct, v => setFx(it, 'grain', v));
    $('#adjR', r).onclick = () => { it.adj = { b: 1, c: 1, s: 1, temp: 0, tint: 0 }; delete it.fx.vignette; delete it.fx.grain; it.enhanced = false; commit(); adjustSheet(it); };
  });
}
function setFx(it, k, v) { it.fx = it.fx || {}; if (v > 0) it.fx[k] = +v.toFixed(2); else delete it.fx[k]; }
function effectsSheet(it) {
  let cur = Object.keys(it.fx || {})[0] || 'vhs';
  const list = () => `<div class="fxlist" id="fxg">${Object.entries(FX).map(([k, n]) => `<button type="button" class="fxrow${it.fx && it.fx[k] ? ' on' : ''}" data-fx="${k}" aria-pressed="${k === cur}"><span>${n}</span><i class="dot"></i></button>`).join('')}</div>`;
  openSheet('Effects', `<div id="fxCtl"></div><div id="fxWrap">${list()}</div><p class="note">Stack as many effects as you like. Beat pulse and Beat strobe follow the music when Beat sync has run.</p>`, r => {
    const bindList = () => { $('#fxg', r).onclick = e => { const b = e.target.closest('[data-fx]'); if (!b) return; cur = b.dataset.fx; $$('[data-fx]', r).forEach(x => x.setAttribute('aria-pressed', String(x === b))); ctl(); }; };
    const ctl = () => {
      const on = !!(it.fx && it.fx[cur]);
      $('#fxCtl', r).innerHTML = `<div class="row"><label style="color:var(--text);font-size:14px">${FX[cur]}</label><button type="button" class="btn sm ${on ? 'danger' : 'main'}" id="fxOn" style="margin-left:auto">${on ? 'Remove' : 'Apply'}</button></div>${on ? slider('fxI', 'Intensity', .05, 1, .01, it.fx[cur], pct) : ''}`;
      $('#fxOn', r).onclick = () => { setFx(it, cur, on ? 0 : .6); commit(); $('#fxWrap', r).innerHTML = list(); bindList(); ctl(); if (!on) previewAt(it, 1.2); };
      bindSlider(r, 'fxI', pct, v => setFx(it, cur, v));
    };
    bindList(); ctl();
  });
}
const SPEEDS = [0.1, 0.25, 0.5, 1, 1.5, 2, 3, 5, 10];
const spChips = (attr, cur) => `<div class="chips" data-${attr}>${SPEEDS.map(v => `<button type="button" class="chip" data-v="${v}" aria-pressed="${v === cur}">${v}×</button>`).join('')}</div>`;
function speedSheet(it) {
  if (it.kind === 'image') { openSheet('Speed', '<p class="note">Photos have no speed. Use Trim or drag the clip edges to change how long a photo shows.</p>'); return; }
  layout();
  const sp0 = it.speed, src0 = srcAt(it, clamp(T - it._start, 0, clipLen(it))), span = it.out - it.in;
  let mode = 'all', segSp = 2, a = clamp(src0 - span * .15, it.in, it.out), b = clamp(a + Math.max(.4, span * .3), it.in, it.out);
  if (b - a < .3) { a = it.in; b = it.out; }
  const m = media[it.mediaId];
  const body = () => `<div class="seg2" id="spMode"><button type="button" data-m="all" aria-pressed="${mode === 'all'}">Entire clip</button><button type="button" data-m="seg" aria-pressed="${mode === 'seg'}">Part of clip</button></div>` + (mode === 'all'
    ? `${vizBox('spG', 104, 'Playback speed across the clip')}<div class="lencmp" id="spLen"></div>${slider('sp', 'Speed', 0.1, 10, 0.05, it.speed, v => v.toFixed(2) + '×')}${spChips('sp', it.speed)}<p class="note">From 0.1× slow motion to 10× time-lapse. Voices keep their normal pitch.</p>`
    : hasCurve(it) ? '<p class="note">This clip has a speed curve. Set Speed curve to None first, then you can change the speed of just one part.</p>'
    : `<div class="lab">1 · Drag the handles to pick the part</div>${rangeHtml('spR', m && m.thumb)}<div class="lab">2 · Pick its speed</div>${slider('ss', 'Speed', 0.1, 10, 0.05, segSp, v => v.toFixed(2) + '×')}${spChips('ss', segSp)}${vizBox('spG2', 96, 'Speed across the clip after applying')}<p class="note" id="spInfo"></p>`);
  const bind = r => {
    $('#spMode', r).onclick = e => {
      const x = e.target.closest('[data-m]'); if (!x || x.dataset.m === mode) return;
      mode = x.dataset.m; it.speed = sp0; layout(); renderTimeline();
      edit.onApply = mode === 'seg' && !hasCurve(it) ? () => applySegmentSpeed(it, a, b, segSp) : null;
      $('#sheetAll').hidden = mode === 'seg' || editSiblings().length < 2;
      r.innerHTML = body(); bind(r);
    };
    if (mode === 'all') {
      const viz = () => { speedGraph($('#spG', r), it); lenCompare($('#spLen', r), (it.out - it.in) * (hasCurve(it) ? curveTab(it).total : 1), clipLen(it)); };
      const set = v => { it.speed = v; $('#sp', r).value = v; $('#spO', r).textContent = v.toFixed(2) + '×'; $$('[data-sp] [data-v]', r).forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.v === v))); layout(); renderTimeline(); viz(); };
      bindSlider(r, 'sp', v => v.toFixed(2) + '×', set);
      $('[data-sp]', r).onclick = e => { const x = e.target.closest('[data-v]'); if (x) set(+x.dataset.v); };
      viz();
    } else if (!hasCurve(it)) {
      const viz = () => {
        const segLen = (b - a) / segSp, newLen = clipLen(it) - (b - a) / it.speed + segLen;
        segmentGraph($('#spG2', r), it, a, b, segSp);
        $('#spInfo', r).textContent = `${fmtS(a - it.in)} to ${fmtS(b - it.in)} of the clip plays at ${segSp}× (${fmtS((b - a) / it.speed)} becomes ${fmtS(segLen)}). The rest stays at ${it.speed}×. Clip length: ${fmtS(clipLen(it))} → ${fmtS(newLen)}.`;
      };
      rangeBar(r, { id: 'spR', min: it.in, max: it.out, a, b, gap: .2, fmt: v => fmtS(v - it.in), snaps: [src0],
        onChange: (na, nb, h) => { a = na; b = nb; viz(); seekTo(it._start + outAt(it, (h === 'b' ? nb : na) - it.in)); } });
      const set = v => { segSp = v; $('#ss', r).value = v; $('#ssO', r).textContent = v.toFixed(2) + '×'; $$('[data-ss] [data-v]', r).forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.v === v))); viz(); };
      bindSlider(r, 'ss', v => v.toFixed(2) + '×', set);
      $('[data-ss]', r).onclick = e => { const x = e.target.closest('[data-v]'); if (x) set(+x.dataset.v); };
      viz();
    }
  };
  openSheet('Speed', body(), bind);
}
// Splits the clip at the chosen part and gives only that part the new speed.
function applySegmentSpeed(it, a, b, sp) {
  const layer = P.layers.includes(it);
  let right = null, mid = it;
  if (b < it.out - .05) right = splitVI(it, b, layer);
  if (a > it.in + .05) mid = splitVI(it, a, layer);
  mid.speed = sp;
  if (layer && right) right.start = mid.start + clipLen(mid);
  sel = { type: layer ? 'layer' : 'clip', id: mid.id };
  setTimeout(() => { renderToolbar(); layout(); seekTo(mid._start + 0.01); toast(`That part now plays at ${sp}×`); }, 0);
}
function curveSheet(it) {
  if (it.kind === 'image') { toast('Speed curves work on video clips'); return; }
  const names = Object.fromEntries(Object.entries(CURVES).map(([k, v]) => [k, v[0]]));
  openSheet('Speed curve', vizBox('cvG', 110, 'Speed across the clip') + `<div class="chips" data-chips="cv">${Object.entries(names).map(([k, n]) => `<button type="button" class="chip curve-chip" data-v="${k}" aria-pressed="${k === it.curve}">${k === 'none' ? '' : sparkline(CURVES[k][1])}${n}</button>`).join('')}</div><p class="note">Curves speed the clip up and slow it down smoothly. Montage and Hero are great for action moments.</p>`,
    r => { speedGraph($('#cvG', r), it); bindChips(r, 'cv', v => { it.curve = v; commit(); speedGraph($('#cvG', r), it); previewAt(it, Math.min(4, clipLen(it))); }); });
}
function animSheet(it) {
  let tab = 'in';
  const body = () => {
    const opts = tab === 'combo' ? ANIM_COMBO : ANIM_IN, cur = it.anim[tab];
    return `<div class="seg2" id="anTab">${[['in', 'In'], ['out', 'Out'], ['combo', 'Loop']].map(([k, n]) => `<button type="button" data-t="${k}" aria-pressed="${k === tab}">${n}</button>`).join('')}</div>
      <div class="viz-row"><figure class="viz demo"><canvas id="anDemo" style="height:110px"></canvas></figure>${vizBox('anG', 110)}</div><div class="legend" id="anLeg"></div>
      ${chipRow('an', opts, cur, true)}${tab !== 'combo' ? slider('anD', 'Duration', .2, 2, .1, tab === 'in' ? it.anim.dIn : it.anim.dOut, v => v.toFixed(1) + 's') : ''}
      <p class="note">${tab === 'in' ? 'In plays as the clip starts.' : tab === 'out' ? 'Out plays as the clip ends.' : 'Loop runs for the whole clip.'} The graph shows what changes over the clip's ${fmtS(clipLen(it))}: the shaded parts are the in and out animations.</p>`;
  };
  const bind = r => {
    $('#anTab', r).onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; tab = b.dataset.t; r.innerHTML = body(); bind(r); };
    const viz = () => animGraph($('#anG', r), $('#anLeg', r), it);
    animDemo($('#anDemo', r), it); viz();
    bindChips(r, 'an', v => { it.anim[tab] = v; commit(); viz(); layout(); const len = clipLen(it); if (tab === 'out') { seekTo(it._start + Math.max(0, len - 1.2)); play(); setTimeout(() => { if (playing) pause(); }, 1200); } else previewAt(it, 1.2); });
    bindSlider(r, 'anD', v => v.toFixed(1) + 's', v => { if (tab === 'in') it.anim.dIn = v; else it.anim.dOut = v; viz(); });
  };
  openSheet('Animation', body(), bind);
}
function transformSheet(it) {
  const ov = sel.type === 'ov';
  const L = () => localOf(it);
  const render = r => {
    const local = L(), tf = ov ? ovTf(it, local) : tfAt(it, local), n = (it.kf || []).length, atKf = (it.kf || []).some(k => Math.abs(k.t - local) < .05);
    r.innerHTML = `<div class="viz-row"><figure class="viz demo"><canvas id="tfMap" style="height:110px"></canvas><figcaption>In the frame</figcaption></figure>${vizBox('tfG', 110)}</div><div class="legend" id="tfLeg"></div>` +
      slider('tx', 'Position X', -0.5, 1.5, .005, tf.x, v => Math.round(v * 100)) + slider('ty', 'Position Y', -0.5, 1.5, .005, tf.y, v => Math.round(v * 100)) + slider('ts', 'Scale', .1, 5, .01, tf.s, v => Math.round(v * 100) + '%') + slider('tw', 'Width', .1, 5, .01, tf.w || 1, v => Math.round(v * 100) + '%') + slider('th', 'Height', .1, 5, .01, tf.h || 1, v => Math.round(v * 100) + '%') + slider('tr', 'Rotation', -180, 180, 1, tf.r, v => Math.round(v) + '°') + slider('to', 'Opacity', 0, 1, .01, tf.o, pct) +
      `<div class="kfbar"><button type="button" class="btn ${atKf ? '' : 'main'}" id="kfAdd">${atKf ? 'Keyframe here' : 'Add keyframe'}</button>${atKf ? '<button type="button" class="btn danger" id="kfDel">Delete keyframe</button>' : ''}${n ? '<button type="button" class="btn" id="kfClr">Clear all</button>' : ''}<button type="button" class="btn" id="tfR">Reset</button></div>
      <p class="note">${n ? `${n} keyframe${n > 1 ? 's' : ''}. Move the playhead, change a value and a keyframe is added there. Movement between keyframes is smooth.` : 'Add a keyframe, move the playhead, then change position, size or rotation to animate. On the preview, drag the item to move it, drag a corner to resize, a side handle to stretch its width or height, and the round knob to rotate.'}</p>`;
    const viz = () => tfViz(r, it, ov); viz();
    const st = k => v => { setTf(it, { [k]: v }, L(), ov); viz(); };
    bindSlider(r, 'tx', v => Math.round(v * 100), st('x')); bindSlider(r, 'ty', v => Math.round(v * 100), st('y'));
    bindSlider(r, 'ts', v => Math.round(v * 100) + '%', st('s')); bindSlider(r, 'tw', v => Math.round(v * 100) + '%', st('w')); bindSlider(r, 'th', v => Math.round(v * 100) + '%', st('h')); bindSlider(r, 'tr', v => Math.round(v) + '°', st('r')); bindSlider(r, 'to', pct, st('o'));
    $('#kfAdd', r).onclick = () => { const l = L(), cur = ov ? ovTf(it, l) : tfAt(it, l); it.kf = it.kf || []; if (!it.kf.some(k => Math.abs(k.t - l) < .05)) { const k = { t: +l.toFixed(3) }; TFK.forEach(q => k[q] = cur[q]); it.kf.push(k); it.kf.sort((a, b) => a.t - b.t); } commit(); render(r); };
    const d = $('#kfDel', r); if (d) d.onclick = () => { const l = L(); it.kf = it.kf.filter(k => Math.abs(k.t - l) >= .05); commit(); render(r); };
    const c2 = $('#kfClr', r); if (c2) c2.onclick = () => { it.kf = []; commit(); render(r); };
    $('#tfR', r).onclick = () => { it.kf = []; if (ov) { it.x = .5; it.y = .5; it.scale = 1; it.rot = 0; it.opacity = 1; it.sw = 1; it.sh = 1; } else it.tf = DEF_TF(sel.type === 'layer' ? .55 : 1); commit(); render(r); };
  };
  openSheet('Transform & keyframes', '', render);
}
function cropSheet(it) {
  const m = media[it.mediaId], cur = it.crop || { l: 0, t: 0, r: 0, b: 0 };
  openSheet('Crop', chipRow('cr', { free: 'Free', '9:16': '9:16', '16:9': '16:9', '1:1': '1:1', '4:5': '4:5', '3:4': '3:4' }, 'free') + slider('cl', 'Left', 0, .45, .005, cur.l, pct) + slider('crr', 'Right', 0, .45, .005, cur.r, pct) + slider('ct', 'Top', 0, .45, .005, cur.t, pct) + slider('cb', 'Bottom', 0, .45, .005, cur.b, pct) + '<button type="button" class="btn" id="crR">Reset crop</button>',
  r => {
    const set = (k, v) => { it.crop = Object.assign({ l: 0, t: 0, r: 0, b: 0 }, it.crop || {}); it.crop[k] = v; if (!it.crop.l && !it.crop.t && !it.crop.r && !it.crop.b) it.crop = null; };
    bindSlider(r, 'cl', pct, v => set('l', v)); bindSlider(r, 'crr', pct, v => set('r', v)); bindSlider(r, 'ct', pct, v => set('t', v)); bindSlider(r, 'cb', pct, v => set('b', v));
    bindChips(r, 'cr', v => {
      if (v === 'free') return; const [a, b] = RATIOS[v], mw = m.w || 16, mh = m.h || 9, target = a / b, ar = mw / mh;
      if (ar > target) { const keep = target / ar; it.crop = { l: (1 - keep) / 2, r: (1 - keep) / 2, t: 0, b: 0 }; } else { const keep = ar / target; it.crop = { t: (1 - keep) / 2, b: (1 - keep) / 2, l: 0, r: 0 }; }
      commit(); cropSheet(it);
    });
    $('#crR', r).onclick = () => { it.crop = null; commit(); cropSheet(it); };
  });
}
function maskSheet(it) {
  const m = it.mask || { type: 'none', x: .5, y: .5, size: .8, w: 1, rot: 0, feather: .1, invert: false };
  openSheet('Mask', chipRow('mk', MASKS, m.type, true) + (m.type !== 'none' ? slider('ms', 'Size', .1, 1.6, .01, m.size, pct) + slider('mw', 'Width', .3, 3, .01, m.w, v => v.toFixed(2)) + slider('mx', 'Position X', 0, 1, .005, m.x, pct) + slider('my', 'Position Y', 0, 1, .005, m.y, pct) + slider('mr', 'Rotation', -180, 180, 1, m.rot, v => v + '°') + slider('mf', 'Feather', 0, 1, .01, m.feather, pct) + toggleRow('mi', 'Invert', 'Show outside the shape', m.invert) : ''),
  r => {
    bindChips(r, 'mk', v => { it.mask = v === 'none' ? null : Object.assign(deep(m), { type: v }); commit(); maskSheet(it); });
    const s = k => v => { it.mask[k] = v; };
    bindSlider(r, 'ms', pct, s('size')); bindSlider(r, 'mw', v => v.toFixed(2), s('w')); bindSlider(r, 'mx', pct, s('x')); bindSlider(r, 'my', pct, s('y')); bindSlider(r, 'mr', v => v + '°', s('rot')); bindSlider(r, 'mf', pct, s('feather'));
    bindToggle(r, 'mi', v => { it.mask.invert = v; commit(); });
  });
}
function chromaSheet(it) {
  const ch = it.chroma || { on: false, color: '#00ff00', tol: .3, soft: .1 };
  openSheet('Chroma key', toggleRow('chOn', 'Remove a colour', 'Green screen and blue screen', ch.on) + `<div class="row"><label>Key colour</label><div class="swatches" id="chCol">${['#00ff00', '#00b140', '#0047bb', '#ffffff', '#000000'].map(c => `<button type="button" class="swatch" style="background:${c}" data-c="${c}" aria-pressed="${c === ch.color}"></button>`).join('')}<input type="color" id="chPick" value="${ch.color}" aria-label="Custom colour"></div></div>` +
    slider('chT', 'Strength', 0, .8, .01, ch.tol, pct) + slider('chS', 'Edge softness', 0, .5, .01, ch.soft, pct) + '<p class="note">Put a green-screen video on an Overlay track over your background clip, then turn this on.</p>',
  r => {
    const ensure = () => { it.chroma = it.chroma || deep(ch); return it.chroma; };
    bindToggle(r, 'chOn', v => { ensure().on = v; commit(); });
    $('#chCol', r).onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; ensure().color = b.dataset.c; it.chroma.on = true; $('#chOn', r).setAttribute('aria-checked', 'true'); $$('#chCol [data-c]', r).forEach(x => x.setAttribute('aria-pressed', String(x === b))); commit(); };
    $('#chPick', r).addEventListener('input', e => { ensure().color = e.target.value; it.chroma.on = true; requestDraw(); }); $('#chPick', r).addEventListener('change', commit);
    bindSlider(r, 'chT', pct, v => { ensure().tol = v; }); bindSlider(r, 'chS', pct, v => { ensure().soft = v; });
  });
}
function relightSheet(it) {
  const rl = it.relight || { type: 'none', amt: .8, person: false };
  openSheet('Relight', chipRow('rl', RELIGHT, rl.type, true) + slider('rla', 'Intensity', 0, 1, .01, rl.amt, pct) + toggleRow('rlp', 'Light people only', 'Uses person detection (downloads a 1 MB model once)', rl.person),
  r => {
    const ensure = () => { it.relight = it.relight || deep(rl); return it.relight; };
    bindChips(r, 'rl', v => { ensure().type = v; if (v === 'none') it.relight = null; commit(); });
    bindSlider(r, 'rla', pct, v => { ensure().amt = v; });
    bindToggle(r, 'rlp', async v => { if (v && !(await withSeg())) { $('#rlp', r).setAttribute('aria-checked', 'false'); return; } ensure().person = v; commit(); });
  });
}
async function withSeg() {
  if (seg.state === 'ready') return true;
  busy.show('Getting ready', 'Downloading the person detection model'); busy.pct(.3);
  const ok = await loadSeg(); busy.hide();
  if (!ok) toast('Could not load the vision model. Check your internet connection and try again.', 4000);
  return ok;
}
async function segToggle(c, key, name) {
  if (c[key]) { c[key] = false; commit(); toast(name + ' off'); return; }
  if (!(await withSeg())) return;
  c[key] = true; if (key === 'removeBg') c.blurBg = false; if (key === 'blurBg') c.removeBg = false;
  commit(); toast(key === 'removeBg' ? 'Background removed. People stay, everything else is transparent.' : 'Background blur on. People stay sharp.');
}

/* ================= Smart and processing tools ================= */
function aiSheet() {
  openSheet('Smart tools', `
    <div class="card"><h4>Auto edit · Highlight reel <span class="badge">Auto edit</span></h4><p>Finds the best moments, cuts them on the beat and finishes the video with music, titles, transitions, a colour grade and sound effects.</p><button type="button" class="btn ai" data-ai="reel">Make an AI edit</button></div>
    <div class="card"><h4>Auto captions <span class="badge">Speech</span></h4><p>Transcribes speech in your clips and adds timed, styled captions. Runs on your phone.</p><button type="button" class="btn ai" data-ai="cap">Generate captions</button></div>
    <div class="card"><h4>Beat sync <span class="badge">Rhythm</span></h4><p>Finds the beat of your music, marks it and cuts your clips on the beat.</p><button type="button" class="btn ai" data-ai="beat">Sync clips to music</button></div>
    <div class="card"><h4>Magic cut <span class="badge">Audio</span></h4><p>Removes silent pauses from talking clips for a tight jump-cut edit.</p><button type="button" class="btn ai" data-ai="sil">Cut silences in all clips</button></div>
    <div class="card"><h4>Noise reduction <span class="badge">Audio</span></h4><p>Removes hiss, hum, wind and room noise from the clip at the playhead.</p><button type="button" class="btn ai" data-ai="dn">Clean audio</button></div>
    <div class="card"><h4>Auto duck <span class="badge">Audio</span></h4><p>Lowers the music whenever someone speaks.</p><button type="button" class="btn ai" data-ai="duck">${P.duck && P.duck.on ? 'Turn off' : 'Turn on'}</button></div>
    <div class="card"><h4>Stabilize <span class="badge">Vision</span></h4><p>Smooths out handheld shake on the clip at the playhead.</p><button type="button" class="btn ai" data-ai="stab">Stabilize clip</button></div>
    <div class="card"><h4>Auto frame <span class="badge">Vision</span></h4><p>Follows the action so wide videos look right in 9:16.</p><button type="button" class="btn ai" data-ai="af">Auto frame clip</button></div>
    <div class="card"><h4>Remove background, blur background, relight <span class="badge">Vision</span></h4><p>Select a clip, then use Remove BG, BG blur or Relight in its tools.</p></div>
    <div class="card"><h4>Smart enhance <span class="badge">Vision</span></h4><p>Balances light and colour on every clip.</p><button type="button" class="btn ai" data-ai="enh">Enhance all clips</button></div>
    <p class="note">Captions and person detection download their models the first time (about 40 MB and 1 MB). Everything else works offline.</p>`,
  r => r.addEventListener('click', e => {
    const b = e.target.closest('[data-ai]'); if (!b) return;
    const a = b.dataset.ai, c = clipAt(T);
    if (a === 'reel') reelSheet();
    else if (a === 'cap') captionsSheet();
    else if (a === 'beat') { const mu = P.audio.find(x => x.kind === 'music'); if (!mu) { toast('Add music first: Audio > Add music'); return; } select({ type: 'au', id: mu.id }); beatSheet(mu); }
    else if (a === 'sil') { closeSheet(); silenceCut(null); }
    else if (a === 'enh') { closeSheet(); enhance(vis()); }
    else if (a === 'duck') { closeSheet(); autoDuck(); }
    else { if (!c) { toast('Move the playhead over a clip'); return; } select({ type: 'clip', id: c.id }); if (a === 'dn') denoiseSheet(c); if (a === 'stab') stabilizeSheet(c); if (a === 'af') autoframeSheet(c); }
  }));
}

/* --- Smart enhance --- */
function grabFrame(c, at) {
  return new Promise(res => {
    const m = media[c.mediaId]; if (!m) return res(null);
    const c2 = C(48, 48), x = ctx2d(c2, { willReadFrequently: true });
    if (m.kind === 'image') { x.drawImage(m.img, 0, 0, 48, 48); return res(x.getImageData(0, 0, 48, 48).data); }
    const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.playsInline = true;
    const t = setTimeout(() => res(null), 6000);
    v.onloadeddata = () => { v.currentTime = at; };
    v.onseeked = () => { clearTimeout(t); try { x.drawImage(v, 0, 0, 48, 48); res(x.getImageData(0, 0, 48, 48).data); } catch (e) { res(null); } v.removeAttribute('src'); v.load(); };
    v.onerror = () => { clearTimeout(t); res(null); };
    v.src = m.url;
  });
}
async function enhance(list) {
  if (!list.length) { toast('Add clips first'); return; }
  busy.show('Smart enhance', 'Reading light and colour'); let n = 0;
  for (const c of list) {
    const d = await grabFrame(c, (c.in + c.out) / 2); n++; busy.pct(n / list.length);
    if (!d) continue;
    let sum = 0, sum2 = 0, sat = 0, rr = 0, bb = 0; const N = d.length / 4;
    for (let i = 0; i < d.length; i += 4) { const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255, l = 0.2126 * r + 0.7152 * gg + 0.0722 * b; sum += l; sum2 += l * l; rr += r; bb += b; const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b); sat += mx ? (mx - mn) / mx : 0; }
    const mean = sum / N, sd = Math.sqrt(Math.max(1e-6, sum2 / N - mean * mean)), ms = sat / N, cast = (rr - bb) / N;
    c.adj = Object.assign(c.adj || {}, { b: +clamp(0.5 / Math.max(mean, 0.05), 0.85, 1.4).toFixed(2), c: +clamp(0.22 / sd, 0.92, 1.35).toFixed(2), s: +(ms < 0.2 ? 1.35 : ms < 0.32 ? 1.18 : 1.06).toFixed(2), temp: +clamp(-cast * 1.2, -.3, .3).toFixed(2) });
    c.enhanced = true;
  }
  busy.hide(); commit(); toast(`Enhanced ${list.length} clip${list.length > 1 ? 's' : ''}. Fine-tune in Adjust.`);
}

/* --- Magic cut (silence removal) --- */
function rmsWindows(buf, from, to, win) {
  const sr = buf.sampleRate, chs = Math.min(2, buf.numberOfChannels), d = [...Array(chs)].map((_, i) => buf.getChannelData(i));
  const w = Math.round(sr * win), a = Math.floor(from * sr), b = Math.min(buf.length, Math.floor(to * sr)), out = [];
  for (let s = a; s < b; s += w) { let acc = 0, n = 0; const e = Math.min(b, s + w); for (let i = s; i < e; i += 2) { let v = 0; for (const ch of d) v += ch[i]; v /= chs; acc += v * v; n++; } out.push(Math.sqrt(acc / Math.max(1, n))); }
  return out;
}
const pctl = (arr, q) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))] || 0; };
async function silenceCut(only) {
  const list = only ? [only] : P.clips.filter(c => c.kind === 'video');
  if (!list.length) { toast('Magic cut works on video clips with sound'); return; }
  busy.show('Magic cut', 'Listening for pauses'); let removed = 0, cuts = 0, i = 0;
  for (const c of [...list]) {
    const m = media[c.mediaId]; busy.pct(i++ / list.length);
    if (hasCurve(c) || c.kind !== 'video') continue;
    const buf = await decodeMedia(m); if (!buf) continue;
    const win = 0.05, r = rmsWindows(buf, c.in, c.out, win); if (r.length < 10) continue;
    const thr = Math.max(pctl(r, 0.15) * 2.2, pctl(r, 0.95) * 0.1, 0.006), minSil = 0.5, padS = 0.1;
    const keep = []; let runStart = null;
    for (let k = 0; k <= r.length; k++) {
      const silent = k < r.length && r[k] < thr;
      if (silent && runStart == null) runStart = k;
      if ((!silent || k === r.length) && runStart != null) { if ((k - runStart) * win >= minSil) keep.push([c.in + runStart * win + padS, c.in + k * win - padS]); runStart = null; }
    }
    if (!keep.length) continue;
    const segs = []; let cur = c.in;
    for (const [a, b] of keep) { if (a - cur > 0.3) segs.push([cur, a]); cur = b; }
    if (c.out - cur > 0.3) segs.push([cur, c.out]);
    if (!segs.length) continue;
    const before = c.out - c.in, after = segs.reduce((t, [a, b]) => t + b - a, 0);
    if (before - after < 0.2) continue;
    removed += (before - after) / c.speed; cuts += keep.length;
    const parts = segs.map(([a, b], k) => ({ ...deep(clean(c)), id: k === 0 ? c.id : uid(), in: a, out: b, kf: [], stab: null, frame: null, transition: k === segs.length - 1 ? c.transition : 'none' }));
    if (P.clips.includes(c)) P.clips.splice(P.clips.indexOf(c), 1, ...parts);
  }
  busy.hide();
  if (!cuts) { toast('No long pauses found'); return; }
  sel = null; commit(); renderToolbar(); toast(`Removed ${cuts} pause${cuts > 1 ? 's' : ''} (${removed.toFixed(1)}s shorter)`);
}

/* --- Beat sync --- */
async function detectBeats(a) {
  const m = media[a.mediaId]; const buf = await decodeMedia(m); if (!buf) return null;
  const sr = buf.sampleRate, hop = 512, fps = sr / hop, d0 = buf.getChannelData(0), d1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : d0;
  const from = Math.floor(a.in * sr), to = Math.min(buf.length, Math.floor(a.out * sr)), n = Math.floor((to - from) / hop);
  if (n < fps * 3) return null;
  const e = new Float32Array(n);
  for (let k = 0; k < n; k++) { let acc = 0; const o = from + k * hop; for (let i = 0; i < hop; i += 2) { const v = (d0[o + i] + d1[o + i]) * 0.5; acc += v * v; } e[k] = Math.log(1e-6 + acc); }
  const on = new Float32Array(n); for (let k = 1; k < n; k++) on[k] = Math.max(0, e[k] - e[k - 1]);
  let mean = 0; for (const v of on) mean += v; mean /= n; for (let k = 0; k < n; k++) on[k] = Math.max(0, on[k] - mean);
  let best = 0, bestLag = Math.round(fps * 0.5);
  for (let bpm = 70; bpm <= 180; bpm += 0.5) {
    const lag = fps * 60 / bpm, L = Math.round(lag); let ac = 0;
    for (let k = 0; k + L < n; k++) ac += on[k] * on[k + L];
    ac *= Math.exp(-Math.pow(Math.log2(bpm / 120), 2) * 1.2);
    if (ac > best) { best = ac; bestLag = lag; }
  }
  let bestOff = 0, bestS = -1;
  for (let off = 0; off < bestLag; off++) { let s = 0; for (let k = off; k < n; k += bestLag) s += on[Math.round(k)] || 0; if (s > bestS) { bestS = s; bestOff = off; } }
  const beats = []; for (let k = bestOff; k < n; k += bestLag) beats.push(+(a.start + (k / fps) / a.rate).toFixed(3));
  return { beats, bpm: Math.round(60 * fps / bestLag * a.rate) };
}
function beatSheet(a) {
  if (!a || a.kind !== 'music') { toast('Beat sync works on music tracks'); return; }
  openSheet('Beat sync', `<p class="note" id="bInfo">${P.bpm ? `Detected ${P.bpm} BPM, ${P.beats.length} beats marked in yellow on the ruler.` : 'Detect the beat of this track, then cut your clips to it.'}</p>
    <button type="button" class="btn ai" id="bDet">${P.bpm ? 'Detect again' : 'Detect beats'}</button>
    <div class="lab">Cut each clip to</div><div class="chips" id="bCut"><button type="button" class="chip" data-n="1">1 beat</button><button type="button" class="chip" data-n="2">2 beats</button><button type="button" class="chip" data-n="4">4 beats</button><button type="button" class="chip" data-n="8">8 beats</button></div>
    <button type="button" class="btn" id="bClr">Clear beat marks</button>`,
  r => {
    const run = async () => {
      busy.show('Beat sync', 'Listening to the rhythm'); busy.pct(0.4);
      const res = await detectBeats(a); busy.hide();
      if (!res) { toast('Could not read this track. Try another audio file.'); return null; }
      P.beats = res.beats; P.bpm = res.bpm; commit();
      $('#bInfo', r).textContent = `Detected ${res.bpm} BPM, ${res.beats.length} beats marked in yellow on the ruler.`;
      return res;
    };
    $('#bDet', r).onclick = run;
    $('#bClr', r).onclick = () => { P.beats = []; P.bpm = 0; commit(); $('#bInfo', r).textContent = 'Beat marks cleared.'; };
    $('#bCut', r).onclick = async e => {
      const b = e.target.closest('[data-n]'); if (!b) return;
      if (!P.clips.length) { toast('Add clips first'); return; }
      if (!P.beats.length && !(await run())) return;
      const n = +b.dataset.n, period = 60 / P.bpm; let t = 0, changed = 0;
      for (const c of P.clips) {
        if (hasCurve(c)) { t += clipLen(c); continue; }
        const target = P.beats.find(x => x >= t + n * period * 0.75); if (target == null) break;
        const m = media[c.mediaId], sp = c.kind === 'image' ? 1 : c.speed, maxLen = c.kind === 'image' ? 3600 : (m.duration - c.in) / sp;
        const len = Math.min(target - t, maxLen); if (len < 0.15) { t += clipLen(c); continue; }
        c.out = c.in + len * sp; t += len; changed++;
      }
      commit(); seekTo(0); toast(`Cut ${changed} clip${changed !== 1 ? 's' : ''} to every ${n} beat${n > 1 ? 's' : ''}`);
    };
  });
}

/* --- Extract (detach) audio --- */
function detachAudio(c) {
  if (!c || c.kind !== 'video') { toast('Extract audio works on video clips'); return; }
  if (hasCurve(c)) { toast('Remove the speed curve first'); return; }
  layout();
  const m = media[c.mediaId];
  const a = normAu({ id: uid(), mediaId: m.id, kind: 'extracted', start: c._start, in: c.in, out: c.out, rate: c.speed, volume: c.muted ? 1 : c.volume, fadeIn: 0, fadeOut: 0, afx: deep(c.afx) });
  P.audio.push(a); c.muted = true;
  showWave(m);
  commit(); select({ type: 'au', id: a.id }); toast('Audio extracted to its own track. The clip is now muted.');
}

/* --- Noise reduction (spectral gating) --- */
function fft(re, im, inv) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (inv ? 2 : -2) * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), h = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < h; k++) {
        const a = i + k, b = a + h, br = re[b] * cr - im[b] * ci, bi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - br; im[b] = im[a] - bi; re[a] += br; im[a] += bi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
async function denoiseSignal(x, strength, onp) {
  const N = 1024, H = 256, B = N / 2 + 1, win = new Float64Array(N); for (let i = 0; i < N; i++) win[i] = .5 - .5 * Math.cos(2 * Math.PI * i / N);
  const frames = Math.max(1, Math.floor((x.length - N) / H) + 1), re = new Float64Array(N), im = new Float64Array(N);
  const energy = new Float64Array(frames);
  for (let f = 0; f < frames; f++) { let e = 0; const o = f * H; for (let i = 0; i < N; i += 4) { const v = x[o + i] || 0; e += v * v; } energy[f] = e; }
  const order = [...energy.keys()].sort((a, b) => energy[a] - energy[b]).slice(0, Math.max(4, Math.floor(frames * .1)));
  const noise = new Float64Array(B);
  for (const f of order) { const o = f * H; for (let i = 0; i < N; i++) { re[i] = (x[o + i] || 0) * win[i]; im[i] = 0; } fft(re, im); for (let k = 0; k < B; k++) noise[k] += Math.hypot(re[k], im[k]) / order.length; }
  const alpha = [1.4, 2.2, 3.2][strength] || 2.2, floor = .05, prev = new Float64Array(B).fill(1);
  const out = new Float32Array(x.length), norm = new Float32Array(x.length);
  for (let f = 0; f < frames; f++) {
    const o = f * H;
    for (let i = 0; i < N; i++) { re[i] = (x[o + i] || 0) * win[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < B; k++) {
      const mag = Math.hypot(re[k], im[k]) + 1e-12;
      let gn = Math.max(floor, 1 - alpha * noise[k] / mag); gn = .65 * gn + .35 * prev[k]; prev[k] = gn;
      re[k] *= gn; im[k] *= gn; if (k > 0 && k < N / 2) { re[N - k] = re[k]; im[N - k] = -im[k]; }
    }
    fft(re, im, true);
    for (let i = 0; i < N; i++) { if (o + i < out.length) { out[o + i] += re[i] * win[i]; norm[o + i] += win[i] * win[i]; } }
    if (f % 400 === 0) { onp(f / frames); await sleep(0); if (cancelFlag) return null; }
  }
  for (let i = 0; i < out.length; i++) out[i] = norm[i] > 1e-3 ? out[i] / norm[i] : 0;
  return out;
}
function wavBlob(samples, sr) {
  const n = samples.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, clamp(samples[i], -1, 1) * 32767, true);
  return new Blob([buf], { type: 'audio/wav' });
}
function denoiseSheet(it) {
  openSheet('Noise reduction', chipRow('dnS', { 0: 'Light', 1: 'Medium', 2: 'Strong' }, 1) + '<button type="button" class="btn ai full" id="dnGo">Clean the audio</button><p class="note">Learns the background noise from the quietest moments and removes it everywhere. Clips get a clean audio track and the original is muted, so you can undo any time.</p>',
    r => { let s = 1; bindChips(r, 'dnS', v => { s = +v; }); $('#dnGo', r).onclick = () => { closeSheet(); runDenoise(it, s); }; });
}
async function runDenoise(it, strength) {
  const isAu = P.audio.includes(it), m = media[it.mediaId];
  if (!isAu && it.kind !== 'video') { toast('Noise reduction needs a video clip or an audio track'); return; }
  if (!isAu && hasCurve(it)) { toast('Remove the speed curve first'); return; }
  cancellable('Noise reduction', 'Learning the background noise');
  const buf = await decodeMedia(m); if (!buf) { busy.hide(); toast('This clip has no audio to clean'); return; }
  const sr = buf.sampleRate, a = Math.floor(it.in * sr), b = Math.min(buf.length, Math.floor(it.out * sr)), chs = buf.numberOfChannels, x = new Float32Array(Math.max(0, b - a));
  for (let c = 0; c < chs; c++) { const d = buf.getChannelData(c); for (let i = 0; i < x.length; i++) x[i] += d[a + i] / chs; }
  busy.text('Removing noise');
  const y = await denoiseSignal(x, strength, p => busy.pct(p * .9));
  if (!y) { busy.hide(); toast('Stopped'); return; }
  const nm = await addMediaRecord('audio', (m.name || 'Audio') + ' (clean)', wavBlob(y, sr), y.length / sr);
  busy.hide();
  if (isAu) { it.mediaId = nm.id; it.out = it.out - it.in; it.in = 0; dropEl(it.id); }
  else {
    layout();
    const au = normAu({ id: uid(), mediaId: nm.id, kind: 'extracted', start: it._start, in: 0, out: nm.duration, rate: it.speed, volume: it.volume, fadeIn: 0, fadeOut: 0 });
    P.audio.push(au); it.muted = true;
  }
  showWave(nm);
  commit(); toast('Noise removed. Play to hear the difference.');
}

/* --- Voice and audio effects --- */
function voiceFxSheet(it) {
  const f = v => (v > 0 ? '+' : '') + v + ' dB';
  openSheet('Voice & audio effects', chipRow('vf', AFX, it.afx.preset, true) + '<div class="lab">Equalizer</div>' + vizBox('eqG', 110, 'Boost (up) or cut (down) for low, middle and high sounds') + slider('eqL', 'Bass', -12, 12, 1, it.afx.low, f) + slider('eqM', 'Mid', -12, 12, 1, it.afx.mid, f) + slider('eqH', 'Treble', -12, 12, 1, it.afx.high, f) + '<button type="button" class="btn" id="eqR">Reset</button>',
  r => {
    const viz = () => eqGraph($('#eqG', r), it.afx); viz();
    bindChips(r, 'vf', v => { it.afx.preset = v; commit(); syncMedia(playing); if (!playing) previewAt(it, 2); });
    bindSlider(r, 'eqL', f, v => { it.afx.low = v; syncMedia(playing); viz(); }); bindSlider(r, 'eqM', f, v => { it.afx.mid = v; syncMedia(playing); viz(); }); bindSlider(r, 'eqH', f, v => { it.afx.high = v; syncMedia(playing); viz(); });
    $('#eqR', r).onclick = () => { it.afx = { preset: 'none', low: 0, mid: 0, high: 0 }; commit(); voiceFxSheet(it); };
  });
}

/* --- Auto duck --- */
async function autoDuck() {
  if (P.duck && P.duck.on) { P.duck.on = false; commit(); toast('Auto duck off'); return; }
  if (!P.audio.some(a => a.kind === 'music')) { toast('Add music first, then turn on auto duck'); return; }
  busy.show('Auto duck', 'Finding speech'); layout();
  const D = duration(), env = new Uint8Array(Math.ceil(D * 10) + 1);
  const sources = [...P.clips.filter(c => c.kind === 'video' && !c.muted && !hasCurve(c)).map(c => ({ mid: c.mediaId, in: c.in, out: c.out, start: c._start, rate: c.speed })),
    ...P.audio.filter(a => a.kind !== 'music').map(a => ({ mid: a.mediaId, in: a.in, out: a.out, start: a.start, rate: a.rate }))];
  let i = 0;
  for (const s of sources) {
    busy.pct(i++ / Math.max(1, sources.length));
    const buf = await decodeMedia(media[s.mid]); if (!buf) continue;
    const r = rmsWindows(buf, s.in, s.out, .1), thr = Math.max(.02, pctl(r, .95) * .25);
    r.forEach((v, k) => { if (v > thr) { const t = s.start + k * .1 / s.rate, j = Math.floor(t * 10); for (let q = j - 2; q <= j + 3; q++) if (q >= 0 && q < env.length) env[q] = 1; } });
  }
  busy.hide();
  P.duck = { on: true, amt: .7, env: [...env].join('') };
  commit(); toast(env.some(Boolean) ? 'Auto duck on. Music drops while people talk.' : 'No speech found, but auto duck is on for later edits.');
}

/* --- Freeze frame --- */
async function freezeFrame(c) {
  const m = media[c.mediaId], isLayer = P.layers.includes(c); layout();
  if (T < c._start || T >= c._start + clipLen(c)) { toast('Move the playhead over the clip'); return; }
  let src;
  if (m.kind === 'image') src = m.img;
  else { syncMedia(false); await waitFrameReady([c]); const e = els[c.id]; src = e && e.el; }
  if (!src) return;
  const w = m.w, h = m.h, k = Math.min(1, 1920 / Math.max(w, h)), cc = C(Math.round(w * k), Math.round(h * k)); ctx2d(cc).drawImage(src, 0, 0, cc.width, cc.height);
  const blob = await new Promise(r => cc.toBlob(r, 'image/jpeg', .92));
  const im = await addMediaRecord('image', 'Freeze frame', blob);
  const f = { ...deep(clean(c)), id: uid(), mediaId: im.id, kind: 'image', in: 0, out: 3, speed: 1, curve: 'none', kf: [], stab: null, frame: null, crop: c.crop, anim: { in: 'none', out: 'none', combo: 'none', dIn: .5, dOut: .5 }, transition: 'none' };
  if (isLayer) { f.start = T; P.layers.push(f); }
  else {
    const local = T - c._start, src0 = srcAt(c, local);
    if (c.kind !== 'image' && src0 > c.in + .05 && src0 < c.out - .05) { const b = { ...deep(clean(c)), id: uid(), in: src0, kf: [] }; c.out = src0; b.transition = c.transition; c.transition = 'none'; P.clips.splice(P.clips.indexOf(c) + 1, 0, f, b); }
    else P.clips.splice(P.clips.indexOf(c) + 1, 0, f);
  }
  commit(); select({ type: isLayer ? 'layer' : 'clip', id: f.id }); toast('Freeze frame added (3 s). Drag its edge to change the length.');
}

/* --- Reverse --- */
function pickMime() {
  const opts = ['video/mp4;codecs="avc1.42E01F,mp4a.40.2"', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return opts.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
}
async function reverseClip(c) {
  if (c.kind !== 'video') { toast('Reverse works on video clips'); return; }
  if (hasCurve(c)) { toast('Remove the speed curve first'); return; }
  const len = c.out - c.in; if (len > 30.5) { toast('Reverse works on up to 30 seconds. Split or trim the clip first.', 3500); return; }
  const mime = pickMime(); if (!mime) { toast('This phone cannot encode video. Update Android System WebView.'); return; }
  actx().resume();
  cancellable('Reverse', 'Reading frames');
  const m = media[c.mediaId], v = await hiddenVideo(m), fps = 24, n = Math.max(2, Math.floor(len * fps));
  const k = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight)), fw = Math.round(v.videoWidth * k / 2) * 2, fh = Math.round(v.videoHeight * k / 2) * 2;
  const fc = C(fw, fh), fx2 = ctx2d(fc), frames = [];
  for (let i = 0; i < n; i++) { if (cancelFlag) break; await seekV(v, c.in + i / fps); fx2.drawImage(v, 0, 0, fw, fh); frames.push(await new Promise(r => fc.toBlob(r, 'image/jpeg', .9))); busy.pct(.55 * i / n); }
  v.removeAttribute('src'); v.load();
  if (cancelFlag) { busy.hide(); toast('Stopped'); return; }
  busy.text('Building the reversed clip');
  const buf = await decodeMedia(m); let rev = null;
  if (buf) { const a = Math.floor(c.in * buf.sampleRate), b = Math.min(buf.length, Math.floor(c.out * buf.sampleRate)); rev = AC.createBuffer(buf.numberOfChannels, Math.max(1, b - a), buf.sampleRate); for (let ch = 0; ch < buf.numberOfChannels; ch++) { const s = buf.getChannelData(ch), d = rev.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = s[b - 1 - i] || 0; } }
  const stream = fc.captureStream(fps); let srcN = null;
  if (rev) { const dest = AC.createMediaStreamDestination(); srcN = AC.createBufferSource(); srcN.buffer = rev; srcN.connect(dest); stream.addTrack(dest.stream.getAudioTracks()[0]); }
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8e6 }), chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  let next = await createImageBitmap(frames[frames.length - 1]);
  fx2.drawImage(next, 0, 0); rec.start(500); if (srcN) srcN.start();
  const t0 = performance.now();
  for (let i = 0; i < frames.length; i++) {
    const bmp = next; let pending = i + 1 < frames.length ? createImageBitmap(frames[frames.length - 2 - i]) : null;
    const wait = t0 + i * 1000 / fps - performance.now(); if (wait > 0) await sleep(wait);
    fx2.drawImage(bmp, 0, 0); bmp.close(); busy.pct(.55 + .43 * i / frames.length);
    if (pending) next = await pending;
    if (cancelFlag) break;
  }
  await sleep(1000 / fps + 50);
  const blob = await new Promise(r => { rec.onstop = () => r(new Blob(chunks, { type: mime.split(';')[0] })); rec.stop(); });
  if (srcN) try { srcN.stop(); } catch (_) {}
  if (cancelFlag) { busy.hide(); toast('Stopped'); return; }
  const nm = await addMediaRecord('video', (m.name || 'Clip') + ' (reversed)', blob, frames.length / fps);
  busy.hide();
  if (!nm || !(nm.duration > 0)) { toast('Could not create the reversed clip'); return; }
  dropEl(c.id); c.mediaId = nm.id; c.in = 0; c.out = Math.min(nm.duration, len); c.reversed = !c.reversed; c.kf = []; c.stab = null; c.frame = null;
  commit(); previewAt(c, 1.5); toast('Clip reversed');
}

/* --- Stabilize --- */
function globalShift(A, B, w, h, R) {
  let best = 1e18, bx = 0, by = 0; const m = R + 2;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    let s = 0;
    for (let y = m; y < h - m; y += 2) { const ra = y * w, rb = (y + dy) * w + dx; for (let x = m; x < w - m; x += 2) s += Math.abs(A[ra + x] - B[rb + x]); }
    if (s < best) { best = s; bx = dx; by = dy; }
  }
  return [bx, by];
}
function smooth(arr, win) { const out = new Float64Array(arr.length); for (let i = 0; i < arr.length; i++) { let s = 0, n = 0; for (let j = Math.max(0, i - win); j <= Math.min(arr.length - 1, i + win); j++) { s += arr[j]; n++; } out[i] = s / n; } return out; }
function stabilizeSheet(c) {
  if (c.kind !== 'video') { toast('Stabilize works on video clips'); return; }
  openSheet('Stabilize', (c.stab ? '<p class="note">This clip is stabilized. It is zoomed in slightly to hide moving edges.</p><button type="button" class="btn danger full" id="stOff">Turn off</button>' : '<p class="note">Analyses camera movement and smooths out shake. The clip is zoomed in about 10% to hide edges. Takes a few seconds per 10 seconds of video.</p>') + `<button type="button" class="btn ai full" id="stGo">${c.stab ? 'Analyse again' : 'Stabilize clip'}</button>`,
    r => { $('#stGo', r).onclick = () => { closeSheet(); runStabilize(c); }; const o = $('#stOff', r); if (o) o.onclick = () => { c.stab = null; commit(); closeSheet(); toast('Stabilize off'); }; });
}
async function runStabilize(c) {
  const len = c.out - c.in; if (len > 120) { toast('Stabilize works on up to 2 minutes at a time. Split the clip first.'); return; }
  cancellable('Stabilize', 'Tracking camera movement');
  const fps = 12, S = await sampleGray(media[c.mediaId], c.in, c.out, fps, 112, p => busy.pct(p * .9));
  if (cancelFlag || S.frames.length < 3) { busy.hide(); toast(cancelFlag ? 'Stopped' : 'Clip too short to stabilize'); return; }
  const tx = [0], ty = [0];
  for (let i = 1; i < S.frames.length; i++) { const [dx, dy] = globalShift(S.frames[i - 1], S.frames[i], S.w, S.h, 6); tx.push(tx[i - 1] - dx); ty.push(ty[i - 1] - dy); }
  const sx = smooth(tx, Math.round(fps * .8)), sy = smooth(ty, Math.round(fps * .8));
  c.stab = { fps, x: tx.map((v, i) => +clamp((sx[i] - v) / S.w, -.08, .08).toFixed(4)), y: ty.map((v, i) => +clamp((sy[i] - v) / S.h, -.08, .08).toFixed(4)) };
  busy.hide(); commit(); previewAt(c, 2); toast('Stabilized');
}

/* --- Auto frame --- */
function autoframeSheet(c) {
  if (!P.clips.includes(c) || c.kind !== 'video') { toast('Auto frame works on main-track video clips'); return; }
  openSheet('Auto frame', (c.frame ? '<p class="note">Auto frame is on: the crop follows the action.</p><button type="button" class="btn danger full" id="afOff">Turn off</button>' : `<p class="note">Crops the clip to your ${P.ratio} frame and pans to follow the subject. Uses person detection when it is available, otherwise follows the movement.</p>`) + `<button type="button" class="btn ai full" id="afGo">${c.frame ? 'Analyse again' : 'Auto frame clip'}</button>`,
    r => { $('#afGo', r).onclick = () => { closeSheet(); runAutoframe(c); }; const o = $('#afOff', r); if (o) o.onclick = () => { c.frame = null; commit(); closeSheet(); toast('Auto frame off'); }; });
}
async function runAutoframe(c) {
  const m = media[c.mediaId], len = c.out - c.in; if (len > 180) { toast('Auto frame works on up to 3 minutes at a time'); return; }
  cancellable('Auto frame', 'Finding the subject');
  const useSeg = await loadSeg().catch(() => false);
  const fps = 6, xs = [], ys = [];
  if (useSeg) {
    const v = await hiddenVideo(m), n = Math.max(2, Math.floor(len * fps)), mc = C(256, 256);
    for (let i = 0; i < n && !cancelFlag; i++) {
      await seekV(v, c.in + i / fps); runSeg(v, mc);
      const d = ctx2d(mc, { willReadFrequently: true }).getImageData(0, 0, mc.width, mc.height).data; let sx = 0, sy = 0, s = 0;
      for (let y = 0; y < mc.height; y += 2) for (let x = 0; x < mc.width; x += 2) { const a = d[(y * mc.width + x) * 4 + 3] / 255; if (a > .5) { sx += x * a; sy += y * a; s += a; } }
      xs.push(s > 20 ? sx / s / mc.width : (xs.length ? xs[xs.length - 1] : .5)); ys.push(s > 20 ? Math.min(.6, sy / s / mc.height) : (ys.length ? ys[ys.length - 1] : .45)); busy.pct(i / n);
    }
    v.removeAttribute('src'); v.load();
  } else {
    const S = await sampleGray(m, c.in, c.out, fps, 96, p => busy.pct(p * .9));
    for (let i = 0; i < S.frames.length; i++) {
      const A = S.frames[Math.max(0, i - 1)], B = S.frames[i]; let sx = 0, sy = 0, s = 0;
      for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) { const d = Math.abs(A[y * S.w + x] - B[y * S.w + x]); if (d > 18) { sx += x * d; sy += y * d; s += d; } }
      xs.push(s > 600 ? sx / s / S.w : (xs.length ? xs[xs.length - 1] : .5)); ys.push(s > 600 ? sy / s / S.h : (ys.length ? ys[ys.length - 1] : .5));
    }
  }
  if (cancelFlag) { busy.hide(); toast('Stopped'); return; }
  const w = Math.round(fps * 1.2), sx = smooth(xs, w), sy = smooth(ys, w);
  c.frame = { fps, x: [...sx].map(v => +v.toFixed(4)), y: [...sy].map(v => +v.toFixed(4)) };
  busy.hide(); commit(); previewAt(c, 2); toast(useSeg ? 'Auto frame follows the person in the shot' : 'Auto frame follows the movement in the shot');
}

/* --- Motion tracking for text and stickers --- */
function trackSheet(o) {
  openSheet('Track motion', (o.track ? '<p class="note">This item follows a tracked object. It is marked TRK on the timeline.</p><button type="button" class="btn danger full" id="tkOff">Remove tracking</button>' : '<p class="note">Place the text or sticker on the thing you want it to follow (a face, a ball, a car), then start tracking. It follows that spot until the item ends.</p>') + '<button type="button" class="btn ai full" id="tkGo">' + (o.track ? 'Track again' : 'Start tracking') + '</button>',
    r => { $('#tkGo', r).onclick = () => { closeSheet(); runTrack(o); }; const x = $('#tkOff', r); if (x) x.onclick = () => { o.track = null; commit(); closeSheet(); toast('Tracking removed'); }; });
}
async function runTrack(o) {
  layout();
  const c = clipAt(o.start + .01); if (!c || c.kind !== 'video') { toast('Tracking needs a video clip under the item'); return; }
  const end = Math.min(o.end, c._start + clipLen(c)), fps = 15, steps = Math.max(2, Math.floor((end - o.start) * fps));
  const tw = 192, th = Math.round(tw * cv.height / cv.width), tc = C(tw, th), tcx = ctx2d(tc, { willReadFrequently: true });
  const gray = () => { const d = tcx.getImageData(0, 0, tw, th).data, gr = new Uint8ClampedArray(tw * th); for (let i = 0, j = 0; i < d.length; i += 4, j++) gr[j] = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8; return gr; };
  if (playing) pause();
  syncMedia(false);
  const e = elFor(c, media[c.mediaId]);
  cancellable('Track motion', 'Following the object');
  const start = ovTf(o, 0); let px = start.x * tw, py = start.y * th; const P2 = 10, R = 9, PW = 2 * P2 + 1;
  let tpl = null; const path = [];
  const keepTrack = o.track; o.track = null;
  offline = true;
  for (let k = 0; k < steps && !cancelFlag; k++) {
    const t = o.start + k / fps;
    await seekV(e.el, srcAt(c, t - c._start));
    tcx.globalCompositeOperation = 'source-over'; tcx.fillStyle = '#000'; tcx.fillRect(0, 0, tw, th); drawVI(tcx, c, t, tw, th, true, true);
    const gr = gray();
    const patch = (cx, cy) => { const p = new Float32Array(PW * PW); let i = 0; for (let y = -P2; y <= P2; y++) for (let x = -P2; x <= P2; x++) { const yy = clamp(Math.round(cy + y), 0, th - 1), xx = clamp(Math.round(cx + x), 0, tw - 1); p[i++] = gr[yy * tw + xx]; } return p; };
    if (!tpl) tpl = patch(px, py);
    else {
      let best = 1e18, bx = px, by = py;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const cx = px + dx, cy = py + dy; let s = 0;
        for (let y = -P2; y <= P2; y += 2) for (let x = -P2; x <= P2; x += 2) { const yy = clamp(Math.round(cy + y), 0, th - 1), xx = clamp(Math.round(cx + x), 0, tw - 1); s += Math.abs(gr[yy * tw + xx] - tpl[(y + P2) * PW + (x + P2)]); }
        s += (dx * dx + dy * dy) * 2; if (s < best) { best = s; bx = cx; by = cy; }
      }
      px = clamp(bx, 0, tw - 1); py = clamp(by, 0, th - 1);
      const np = patch(px, py); for (let i = 0; i < tpl.length; i++) tpl[i] = tpl[i] * .75 + np[i] * .25;
    }
    path.push({ t: +(k / fps).toFixed(3), x: +(px / tw).toFixed(4), y: +(py / th).toFixed(4) });
    busy.pct(k / steps);
  }
  offline = false; e.el.onseeked = null;
  busy.hide();
  if (cancelFlag || path.length < 2) { o.track = keepTrack; toast('Stopped'); seekTo(T); return; }
  const sx = smooth(path.map(p => p.x), 1), sy = smooth(path.map(p => p.y), 1);
  o.track = path.map((p, i) => ({ t: p.t, x: +sx[i].toFixed(4), y: +sy[i].toFixed(4) }));
  commit(); seekTo(o.start); play(); setTimeout(() => { if (playing) pause(); }, Math.min(4000, (end - o.start) * 1000));
  toast('Tracking done. The item now follows the object.');
}

/* --- Auto reel (highlights) --- */
/* --- Auto edit: the reel is cut on the beat of the music, then finished like a pro edit --- */
const REEL_STYLES = {
  energetic: { name: 'Energetic', bpm: 124, beatsPerCut: 2, filter: 'vivid', trans: ['zoom', 'whip', 'flash', 'glitch', 'slide', 'shake'], fx: { pulse: .35 }, combo: 'none', first: 'zoomin', title: { font: 'black', size: 10, color: '#ffffff', stroke: true, anim: 'pop' }, sub: { font: 'cond', size: 4, color: '#ffd23f', anim: 'slide' }, endAnim: 'zoom', sfx: 'whoosh' },
  cinematic: { name: 'Cinematic', bpm: 90, beatsPerCut: 4, filter: 'teal', trans: ['fade', 'blur', 'zoomout', 'fade'], fx: { letterbox: .55, grain: .18 }, combo: 'kenburns', first: 'fade', title: { font: 'serif', size: 7, color: '#ffffff', shadow: true, spacing: 18, anim: 'fade' }, sub: { font: 'light', size: 3.4, color: '#e0c287', spacing: 30, anim: 'fade' }, endAnim: 'fade', sfx: 'riser' },
  chill: { name: 'Chill', bpm: 84, beatsPerCut: 4, filter: 'dream', trans: ['fade', 'slide', 'blur', 'slideup'], fx: { lightleak: .25 }, combo: 'zoomslow', first: 'rise', title: { font: 'hand', size: 9, color: '#ffffff', shadow: true, anim: 'type' }, sub: { font: 'classic', size: 3.6, color: '#ffffff', anim: 'fade' }, endAnim: 'fade', sfx: 'swipe' }
};
function reelSheet() {
  const vids = P.clips.filter(c => c.kind === 'video' && !hasCurve(c));
  if (!vids.length) { toast('Auto edit needs video clips. Add some first.'); return; }
  const hasMusic = P.audio.some(a => a.kind === 'music');
  const o = { style: 'energetic', len: 30, music: true, titles: true, trans: true, sfx: true, grade: true, title: (P.name || '').startsWith('Project ') ? 'HIGHLIGHTS' : P.name, sub: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) };
  openSheet('Auto edit', `<div class="lab">Style</div>${chipRow('rs', Object.fromEntries(Object.entries(REEL_STYLES).map(([k, v]) => [k, v.name])), o.style)}
    <div class="lab">Length</div>${chipRow('rl', { 15: '15 s', 30: '30 s', 60: '60 s' }, o.len)}
    <div class="row"><label for="rTitle">Title</label><input class="inp" id="rTitle" maxlength="40" value="${esc(o.title)}"></div>
    <div class="row"><label for="rSub">Subtitle</label><input class="inp" id="rSub" maxlength="50" value="${esc(o.sub)}"></div>
    ${toggleRow('rMu', hasMusic ? 'Use your music' : 'Add music', hasMusic ? 'Cuts land on the beat of your song' : 'A matching track is composed on your phone and cuts land on its beat', o.music)}
    ${toggleRow('rTi', 'Title and end card', 'Animated opening title and a closing card', o.titles)}
    ${toggleRow('rTr', 'Transitions', 'A different transition on every cut to match the style', o.trans)}
    ${toggleRow('rGr', 'Colour grade and effects', 'A film look that fits the style', o.grade)}
    ${toggleRow('rSf', 'Sound effects', 'Whooshes under the transitions', o.sfx)}
    <button type="button" class="btn ai full" id="rGo">Make the edit</button>
    <p class="note">Your clips are not deleted: Undo brings your full edit back.</p>`,
  r => {
    bindChips(r, 'rs', v => { o.style = v; }); bindChips(r, 'rl', v => { o.len = +v; });
    bindToggle(r, 'rMu', v => { o.music = v; }); bindToggle(r, 'rTi', v => { o.titles = v; }); bindToggle(r, 'rTr', v => { o.trans = v; }); bindToggle(r, 'rGr', v => { o.grade = v; }); bindToggle(r, 'rSf', v => { o.sfx = v; });
    $('#rGo', r).onclick = () => { o.title = $('#rTitle', r).value.trim(); o.sub = $('#rSub', r).value.trim(); closeSheet(); autoReel(o); };
  });
}
// Composes a short music bed (drums, bass, chords) in the chosen style, so the auto edit needs no download.
async function renderMusic(style, dur) {
  const S = REEL_STYLES[style], beat = 60 / S.bpm, sr = 44100, oc = new OfflineAudioContext(1, Math.ceil(sr * dur), sr);
  const comp = oc.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.connect(oc.destination);
  const bus = oc.createGain(); bus.gain.value = .9; bus.connect(comp);
  const nb = oc.createBuffer(1, sr, sr), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0008, t + a + d); };
  const kick = (t, amp = 1) => { const o = oc.createOscillator(), g = oc.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .22); env(g, t, .003, amp, .32); o.connect(g); g.connect(bus); o.start(t); o.stop(t + .4); };
  const noise = (t, type, f, amp, d, q = 1) => { const n = oc.createBufferSource(), fl = oc.createBiquadFilter(), g = oc.createGain(); n.buffer = nb; fl.type = type; fl.frequency.value = f; fl.Q.value = q; env(g, t, .002, amp, d); n.connect(fl); fl.connect(g); g.connect(bus); n.start(t, Math.random() * .5); n.stop(t + d + .05); };
  const tone = (t, type, m, amp, a, d, cut) => { const o = oc.createOscillator(), g = oc.createGain(), fl = oc.createBiquadFilter(); o.type = type; o.frequency.value = hz(m); fl.type = 'lowpass'; fl.frequency.value = cut; env(g, t, a, amp, d); o.connect(fl); fl.connect(g); g.connect(bus); o.start(t); o.stop(t + a + d + .05); };
  // A minor: Am – F – C – G, one chord per bar of four beats.
  const prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  const beats = []; const n = Math.ceil(dur / beat);
  for (let i = 0; i < n; i++) {
    const t = i * beat, bar = Math.floor(i / 4), inBar = i % 4, ch = prog[bar % 4], intro = i < 4, outro = t > dur - beat * 4;
    beats.push(+t.toFixed(3));
    if (style === 'energetic') {
      if (!intro) kick(t, .95);
      if (!intro && inBar % 2 === 1) { noise(t, 'bandpass', 1900, .55, .16, .9); tone(t, 'triangle', 50, .25, .002, .1, 2000); }
      noise(t + beat / 2, 'highpass', 7500, .22, .05);
      if (!intro) for (let k = 0; k < 2; k++) tone(t + k * beat / 2, 'sawtooth', ch[0] - 24, .22, .005, beat / 2 - .04, 520);
      for (let k = 0; k < 4; k++) tone(t + k * beat / 4, 'square', ch[k % 3] + 12, .045, .003, beat / 4, 2600);
      if (inBar === 0) ch.forEach(m => tone(t, 'sawtooth', m, .05, .08, beat * 3.6, 1400));
    } else if (style === 'cinematic') {
      if (inBar === 0 && !intro) { kick(t, 1.1); noise(t, 'lowpass', 300, .5, .9); }
      if (inBar === 2 && !intro) noise(t, 'bandpass', 900, .25, .5, .6);
      if (inBar === 0) { ch.forEach(m => tone(t, 'sawtooth', m, .06, beat * 1.2, beat * 3, 900)); tone(t, 'sine', ch[0] - 24, .35, .05, beat * 3.6, 300); }
      if (!intro && inBar % 2 === 0) tone(t, 'sine', ch[(inBar / 2 + bar) % 3] + 24, .05, .01, beat * 1.6, 5000);
    } else {
      if (inBar === 0 || (inBar === 2 && !outro)) kick(t, .7);
      if (inBar === 1 || inBar === 3) noise(t, 'bandpass', 1500, .28, .2, .7);
      noise(t + beat * .58, 'highpass', 6500, .1, .05);
      if (inBar === 0) ch.forEach((m, k) => tone(t + k * .03, 'triangle', m + 12, .08, .01, beat * 3.5, 1700));
      tone(t, 'sine', ch[0] - 12, .32, .01, beat * .9, 400);
    }
  }
  return { buf: await oc.startRendering(), beats, bpm: S.bpm };
}
async function sfxItem(k, at, vol) {
  let m = sfxMedia[k] && media[sfxMedia[k]];
  if (!m) { const buf = await renderSfx(k); m = await addMediaRecord('audio', SFX[k][0], wavBlob(buf.getChannelData(0), buf.sampleRate), buf.duration); sfxMedia[k] = m.id; }
  const a = addAudioItem(m, 'sfx', Math.max(0, at)); a.out = m.duration; a.volume = vol; return a;
}
async function autoReel(o) {
  const S = REEL_STYLES[o.style], target = o.len;
  const vids = P.clips.filter(c => c.kind === 'video' && !hasCurve(c));
  if (!vids.length) { toast('Auto reel needs video clips'); return; }
  cancellable('Auto edit', 'Finding the best moments');
  // The beat decides how long each cut is: the user's song if there is one, otherwise the composed track.
  let mu = P.audio.find(a => a.kind === 'music'), bpm = S.bpm, beats = null;
  if (o.music && mu) { const res = await detectBeats(mu); if (res) { bpm = res.bpm; beats = res.beats; } }
  const beat = 60 / bpm, win0 = beat * S.beatsPerCut;
  const cands = []; let i = 0;
  for (const c of vids) {
    if (cancelFlag) break;
    const m = media[c.mediaId], S2 = await sampleGray(m, c.in, c.out, 2, 48, p => busy.pct((i + p * .8) / vids.length * .7)), buf = await decodeMedia(m);
    const mot = S2.frames.map((f, k) => { if (!k) return 0; const A = S2.frames[k - 1]; let s = 0; for (let j = 0; j < f.length; j += 3) s += Math.abs(f[j] - A[j]); return s / (f.length / 3); });
    const rms = buf ? rmsWindows(buf, c.in, c.out, .5) : [];
    const mM = Math.max(1e-6, ...mot), mR = Math.max(1e-6, ...rms), win = Math.min(win0, c.out - c.in);
    for (let s = c.in; s + win <= c.out + 1e-6; s += .5) {
      const k0 = Math.floor((s - c.in) * 2), k1 = Math.ceil((s + win - c.in) * 2);
      let a = 0, b = 0, n = 0; for (let k = k0; k < k1; k++) { a += (mot[k] || 0) / mM; b += (rms[k] || 0) / mR; n++; }
      cands.push({ c, s, e: s + win, score: (a + b) / Math.max(1, n) });
    }
    i++;
  }
  if (cancelFlag) { busy.hide(); toast('Stopped'); return; }
  cands.sort((a, b) => b.score - a.score);
  const picked = []; let total = 0;
  for (const k of cands) { if (total >= target) break; if (picked.some(p => p.c.mediaId === k.c.mediaId && k.s < p.e && k.e > p.s)) continue; picked.push(k); total += k.e - k.s; }
  picked.sort((a, b) => P.clips.indexOf(a.c) - P.clips.indexOf(b.c) || a.s - b.s);
  const merged = []; for (const p of picked) { const L = merged[merged.length - 1]; if (L && L.c === p.c && Math.abs(L.e - p.s) < .01) L.e = p.e; else merged.push({ ...p }); }
  if (!merged.length) { busy.hide(); toast('Clips are too short for a reel'); return; }
  busy.text('Editing: cuts, music and titles'); busy.pct(.75);
  P.clips = merged.map((p, k) => {
    const c = { ...deep(clean(p.c)), id: uid(), in: p.s, out: p.e, speed: 1, kf: [], stab: null, frame: null, transition: 'none' };
    c.anim = { in: k === 0 ? S.first : 'none', out: k === merged.length - 1 ? 'fade' : 'none', combo: o.grade ? S.combo : 'none', dIn: .6, dOut: .8 };
    if (o.trans && k < merged.length - 1) c.transition = S.trans[k % S.trans.length];
    if (o.grade) { c.filter = S.filter; c.fx = { ...(c.fx || {}), ...S.fx }; }
    return c;
  });
  layout(); const D = P._main;
  // Titles: an opening title with a subtitle, and a closing card.
  P.overlays = P.overlays.filter(x => !x.reel);
  if (o.titles) {
    const tLen = Math.min(3.2, D * .4);
    if (o.title) P.overlays.push(normOv({ id: uid(), reel: true, type: 'text', text: o.title, start: .15, end: tLen, x: .5, y: .44, scale: 1, rot: 0, stroke: false, box: false, glow: false, shadow: false, ...deep(S.title) }));
    if (o.sub) P.overlays.push(normOv({ id: uid(), reel: true, type: 'text', text: o.sub, start: .55, end: tLen, x: .5, y: .53, scale: 1, rot: 0, stroke: false, box: false, glow: false, shadow: true, ...deep(S.sub) }));
    if (D > 6) P.overlays.push(normOv({ id: uid(), reel: true, type: 'text', text: o.title ? `${o.title}\nThanks for watching` : 'Thanks for watching', start: Math.max(tLen + .5, D - 2.4), end: D, x: .5, y: .5, scale: 1, rot: 0, stroke: false, box: false, glow: false, shadow: true, ...deep(S.title), size: S.title.size * .62, anim: S.endAnim }));
  }
  // Music: keep the user's song, or compose one to fit.
  if (o.music && !mu) {
    busy.text('Composing the music'); busy.pct(.82);
    const mus = await renderMusic(o.style, D + .5);
    const mm = await addMediaRecord('audio', `Music · ${S.name}`, wavBlob(mus.buf.getChannelData(0), mus.buf.sampleRate), mus.buf.duration);
    mu = addAudioItem(mm, 'music', 0); mu.out = Math.min(mm.duration, D); mu.fadeIn = .4; mu.fadeOut = 1.6; beats = mus.beats; bpm = mus.bpm;
  }
  if (mu) { mu.volume = P.clips.some(c => c.kind === 'video' && !c.muted) ? .6 : .85; if (beats) { P.beats = beats.filter(b => b <= D + .01); P.bpm = bpm; } }
  if (o.music) P.clips.forEach(c => { c.volume = Math.min(c.volume, .7); });
  // Sound effects under each transition, and one on the opening title.
  if (o.sfx) {
    busy.text('Adding sound effects'); busy.pct(.92);
    P.audio = P.audio.filter(a => !a.reel);
    for (const c of P.clips) if (c.transition !== 'none') (await sfxItem(S.sfx, c._start + clipLen(c) - (S.sfx === 'riser' ? 1.8 : .35), S.sfx === 'riser' ? .35 : .55)).reel = true;
    if (o.titles && o.title) (await sfxItem(o.style === 'energetic' ? 'impact' : 'whoosh', .05, .5)).reel = true;
  }
  busy.hide();
  sel = null; commit(); renderToolbar(); seekTo(0);
  toast(`Edit ready: ${Math.round(D)} s, ${merged.length} cuts${o.music ? ', music' : ''}${o.titles ? ', titles' : ''}. Undo brings your full edit back.`, 4000);
}

/* --- Captions ---
   Captions come from speech recognition, are typed in by hand, or both. Every caption can be retyped, moved on the
   preview, retimed on the timeline and restyled; typed ones are kept when the automatic ones are made again. */
let asr = null, asrModel = '';
const capList = () => P.overlays.filter(o => o.caption).sort((a, b) => a.start - b.start);
const CAP_LOOK = ['font', 'color', 'stroke', 'box', 'boxColor', 'glow', 'shadow', 'size', 'spacing', 'x', 'y'];
const capRow = o => `<div class="caprow" data-cid="${o.id}"><button type="button" class="cap-t" data-jump aria-label="Go to this caption">${fmt(o.start)}</button><input class="cap-in" value="${esc(o.text)}" aria-label="Caption text" enterkeyhint="done"><button type="button" class="cap-x" data-del aria-label="Delete caption">${icon('close')}</button></div>`;
function captionsSheet() {
  const caps = capList(), ref = caps[0], auto = caps.some(o => !o.manual);
  openSheet('Captions', `<div class="card"><h4>Auto captions</h4><p>Turns the speech in your clips and voiceovers into timed captions.</p>
      <div class="row"><label for="cLang">Speech</label><select class="sel" id="cLang"><option value="Xenova/whisper-tiny.en">English (fastest, most accurate)</option><option value="Xenova/whisper-tiny">Other languages (auto-detect)</option></select></div>
      <button type="button" class="btn ai full" id="cGo">${auto ? 'Make auto captions again' : 'Generate captions'}</button></div>
    <button type="button" class="btn main full" id="cAdd">${icon('add')}Type a caption at ${fmt(T)}</button>
    <div class="lab">Style for all captions</div>${chipRow('cs', { classic: 'Classic', boxed: 'Boxed', neon: 'Neon', pop: 'Pop yellow' }, P.capStyle || 'classic')}
    ${ref ? slider('cY', 'Height', .05, .95, .01, ref.y, v => v < .34 ? 'Top' : v > .66 ? 'Bottom' : 'Middle') + slider('cSz', 'Size', 2, 12, .1, ref.size || 5.2, v => v.toFixed(1)) : ''}
    ${ref ? `<div class="lab" id="cCount">All captions (${caps.length}) · tap a time to jump to it</div><div class="caplist" id="cList">${caps.map(capRow).join('')}</div>
      <button type="button" class="btn danger full" id="cDel">Remove all captions</button>` : ''}
    <p class="note">Drag a caption on the preview to place it anywhere. On the timeline, hold it to move it in time or drag its edges to change how long it shows. The first auto captions download the speech model (about 40 MB) once.</p>`,
  r => {
    const forCaps = fn => { capList().forEach(fn); requestDraw(); };
    bindChips(r, 'cs', v => { P.capStyle = v; forCaps(o => Object.assign(o, CAP_STYLES[v])); commit(); });
    $('#cGo', r).onclick = () => runCaptions($('#cLang', r).value);
    $('#cAdd', r).onclick = addCaption;
    bindSlider(r, 'cY', v => v < .34 ? 'Top' : v > .66 ? 'Bottom' : 'Middle', v => forCaps(o => { o.y = v; }));
    bindSlider(r, 'cSz', v => v.toFixed(1), v => forCaps(o => { o.size = v; }));
    const list = $('#cList', r), capOf = el => { const row = el.closest('[data-cid]'); return row && P.overlays.find(o => o.id === row.dataset.cid); };
    if (list) {
      list.addEventListener('input', e => { const o = capOf(e.target); if (o) { o.text = e.target.value || ' '; requestDraw(); renderTimeline(); } });
      list.addEventListener('change', commit);
      list.addEventListener('focusin', e => { const o = capOf(e.target); if (o && e.target.matches('.cap-in') && (T < o.start || T >= o.end)) seekTo(o.start + .01); });
      list.addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
      list.addEventListener('click', e => {
        const o = capOf(e.target); if (!o) return;
        if (e.target.closest('[data-jump]')) seekTo(o.start + .01);
        if (e.target.closest('[data-del]')) { P.overlays = P.overlays.filter(x => x !== o); e.target.closest('[data-cid]').remove(); if (sel && sel.id === o.id) sel = null; commit(); $('#cCount', r).textContent = `All captions (${capList().length}) · tap a time to jump to it`; }
      });
    }
    const d = $('#cDel', r); if (d) d.onclick = () => { P.overlays = P.overlays.filter(o => !o.caption); sel = null; commit(); renderToolbar(); closeSheet(); toast('Captions removed'); };
  });
}
// A typed caption at the playhead, with the same look and place as the captions already there.
function addCaption() {
  const caps = capList(), ref = caps[0], next = caps.find(o => o.start > T + .05);
  // Captions follow one another: one that is still showing at the playhead now ends there.
  const cur = caps.find(o => o.start < T - .3 && o.end > T + .05); if (cur) cur.end = +T.toFixed(2);
  const end = Math.max(T + .5, Math.min(T + 2.5, next ? next.start : Infinity));
  const look = ref ? Object.fromEntries(CAP_LOOK.filter(k => ref[k] !== undefined).map(k => [k, ref[k]])) : { ...CAP_STYLES[P.capStyle || 'classic'], x: .5, y: .78, size: 5.2 };
  const o = normOv({ id: uid(), type: 'text', caption: true, manual: true, text: 'Caption', start: +T.toFixed(2), end: +end.toFixed(2), scale: 1, rot: 0, anim: 'none', ...look });
  P.overlays.push(o); commit(); select({ type: 'ov', id: o.id }); textSheet(o, true);
}
async function toMono16k(buf, from, to) {
  const len = Math.max(0.1, to - from), oc = new OfflineAudioContext(1, Math.ceil(len * 16000), 16000);
  const s = oc.createBufferSource(); s.buffer = buf; s.connect(oc.destination); s.start(0, from, len);
  return (await oc.startRendering()).getChannelData(0);
}
async function runCaptions(model) {
  const clips = P.clips.filter(c => c.kind === 'video' && !c.muted);
  const extra = P.audio.filter(a => a.kind === 'voice' || a.kind === 'extracted');
  if (!clips.length && !extra.length) { toast('Captions need clips or voice tracks with speech'); return; }
  cancelFlag = false;
  busy.show('Auto captions', 'Loading the speech model', () => { cancelFlag = true; busy.hide(); });
  try {
    if (!asr || asrModel !== model) {
      const TF = await import(TF_URL);
      TF.env.allowLocalModels = false;
      const prog = {};
      asr = await TF.pipeline('automatic-speech-recognition', model, { progress_callback: p => {
        if (p.status === 'progress' && p.total) { prog[p.file] = [p.loaded, p.total]; const v = Object.values(prog); busy.pct(v.reduce((a, x) => a + x[0], 0) / v.reduce((a, x) => a + x[1], 0) * 0.5); busy.text('Downloading speech model'); }
      } });
      asrModel = model;
    }
    if (cancelFlag) return;
    const ref = capList()[0], st = ref ? Object.fromEntries(CAP_LOOK.filter(k => ref[k] !== undefined).map(k => [k, ref[k]])) : { ...CAP_STYLES[P.capStyle || 'classic'], x: 0.5, y: 0.78, size: 5.2 }, caps = []; layout();
    const jobs = [...clips.map(c => ({ mid: c.mediaId, from: c.in, to: c.out, map: s => c._start + outAt(c, s) })), ...extra.map(a => ({ mid: a.mediaId, from: a.in, to: a.out, map: s => a.start + s / a.rate }))];
    let i = 0;
    for (const j of jobs) {
      if (cancelFlag) return;
      busy.text(`Transcribing part ${i + 1} of ${jobs.length}`); busy.pct(0.5 + 0.5 * i / jobs.length); i++;
      const buf = await decodeMedia(media[j.mid]); if (!buf) continue;
      const pcm = await toMono16k(buf, j.from, j.to);
      const opts = { return_timestamps: true, chunk_length_s: 30, stride_length_s: 5 };
      if (model.endsWith('tiny')) opts.task = 'transcribe';
      const out = await asr(pcm, opts);
      const chunks = out.chunks && out.chunks.length ? out.chunks : (out.text ? [{ text: out.text, timestamp: [0, j.to - j.from] }] : []);
      for (const ch of chunks) {
        const text = (ch.text || '').trim(); if (!text || /^\[.*\]$|^\(.*\)$/.test(text)) continue;
        let [s, e] = ch.timestamp; if (e == null) e = Math.min(j.to - j.from, s + 3);
        const words = text.split(/\s+/), groups = [];
        for (let k = 0; k < words.length; k += 6) groups.push(words.slice(k, k + 6).join(' '));
        groups.forEach((gtxt, k) => {
          const a = s + (e - s) * k / groups.length, b = s + (e - s) * (k + 1) / groups.length, ts = j.map(a), te = j.map(b);
          if (te - ts > 0.15) caps.push(normOv({ id: uid(), type: 'text', caption: true, text: gtxt, start: +ts.toFixed(2), end: +te.toFixed(2), scale: 1, rot: 0, anim: 'none', ...st }));
        });
      }
    }
    busy.hide();
    if (cancelFlag) return;
    if (!caps.length) { toast('No speech found'); return; }
    P.overlays = P.overlays.filter(o => !o.caption || o.manual).concat(caps);
    closeSheet(); commit(); captionsSheet(); toast(`Added ${caps.length} captions. Fix any word in the list or tap a caption on the timeline.`, 3500);
  } catch (e) {
    console.warn(e); busy.hide();
    toast('Captions failed: ' + (navigator.onLine ? 'the speech model could not run on this phone' : 'connect to the internet for the first download'), 4500);
  }
}

/* ================= Format, snapshot, export ================= */
const PREVIEW_LONG = 960;
function formatSheet() {
  const cols = ['#000000', '#ffffff', '#1c1c1c', '#c9a45c', '#e8e1d5', '#2b3a4a', '#4a2b2b', '#2f3b2c'];
  openSheet('Format', `<div class="lab">Aspect ratio</div>${chipRow('ratio', { '9:16': '9:16 TikTok · Reels', '16:9': '16:9 YouTube', '1:1': '1:1 Square', '4:5': '4:5 Instagram', '3:4': '3:4', '21:9': '21:9 Cinema' }, P.ratio)}
    <div class="lab">Background behind fitted clips</div>${chipRow('bg', { blur: 'Blurred clip', black: 'Black', white: 'White' }, P.bg)}
    <div class="swatches" id="bgCol">${cols.map(c => `<button type="button" class="swatch" style="background:${c}" data-c="${c}" aria-label="Background ${c}" aria-pressed="${P.bg === c}"></button>`).join('')}<input type="color" id="bgPick" value="${/^#/.test(P.bg) ? P.bg : '#1c1c1c'}" aria-label="Custom background colour"></div>
    ${toggleRow('fEnd', 'Ending', 'A short SplashCut end card after your video', !!P.ending)}${toggleRow('fEndNew', 'Ending on new projects', 'Start every new project with the end card', store.get('sc_ending', true) !== false)}`,
  r => {
    bindToggle(r, 'fEnd', v => { P.ending = v; commit(); seekTo(Math.min(T, duration())); });
    bindToggle(r, 'fEndNew', v => store.set('sc_ending', v));
    bindChips(r, 'ratio', v => { P.ratio = v; setCanvasSize(PREVIEW_LONG); commit(); });
    bindChips(r, 'bg', v => { P.bg = v; $$('#bgCol [data-c]', r).forEach(x => x.setAttribute('aria-pressed', 'false')); commit(); });
    $('#bgCol', r).onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; P.bg = b.dataset.c; $$('[data-chips="bg"] [data-v]', r).forEach(x => x.setAttribute('aria-pressed', 'false')); $$('#bgCol [data-c]', r).forEach(x => x.setAttribute('aria-pressed', String(x === b))); commit(); };
    $('#bgPick', r).addEventListener('input', e => { P.bg = e.target.value; requestDraw(); }); $('#bgPick', r).addEventListener('change', commit);
  });
}
async function snapshot() {
  if (playing) pause(); const keepSel = sel; sel = null; draw();
  const blob = await new Promise(r => cv.toBlob(r, 'image/png')); sel = keepSel; requestDraw();
  const uri = await saveBlob(blob, `SplashCut_${Date.now().toString(36)}.png`, () => {});
  toast(uri === false ? 'Could not save the photo' : NATIVE ? 'Frame saved to Pictures/SplashCut' : 'Frame downloaded');
}
function exportSheet() {
  if (playing) pause();
  const mime = pickMime(), ext = mime.includes('mp4') ? 'MP4' : 'WebM', u = acct && acct.user;
  openSheet('Export', `${u ? `<div class="pending" style="display:flex;gap:10px;align-items:center">${icon('crown')}<span>${u.status === 'trial' ? `Pro trial · ${u.days_left} day${u.days_left === 1 ? '' : 's'} left` : 'SplashCut Pro'} · every resolution unlocked</span></div>` : ''}
    <div class="lab">Resolution</div>${chipRow('res', { 720: '720p', 1080: '1080p Full HD', 2160: '4K Ultra HD' }, '1080')}
    <p class="note" id="x4k" hidden></p>
    <div class="lab">Frame rate</div>${chipRow('fps', { 24: '24 fps', 30: '30 fps', 60: '60 fps' }, '30')}
    <div class="lab">Quality</div>${chipRow('q', { std: 'Standard', high: 'High' }, 'high')}
    <p class="note">Length ${fmt(duration())}. Exports as ${ext} and saves to Movies/SplashCut in your gallery. Export plays your video in real time, so keep the screen on.</p>
    <button type="button" class="btn main full" id="xGo">Export video</button>`,
  r => {
    let res = 1080, fps = 30, q = 'high';
    const check4k = async () => {
      const n = $('#x4k', r); if (!n) return;
      if (res !== 2160) { n.hidden = true; return; }
      n.hidden = false; n.textContent = '4K needs a powerful phone. If the video stutters, export in 1080p.';
      try {
        const [a, b] = RATIOS[P.ratio] || [9, 16], W = a >= b ? 3840 : Math.round(3840 * a / b), H = a >= b ? Math.round(3840 * b / a) : 3840;
        const info = await navigator.mediaCapabilities.encodingInfo({ type: 'record', video: { contentType: mime || 'video/webm;codecs=vp8', width: W, height: H, bitrate: 35e6, framerate: fps } });
        if (!info.supported) n.textContent = 'This phone may not be able to record 4K. 1080p is recommended.';
        else if (!info.smooth) n.textContent = 'This phone can record 4K but may not keep up smoothly. 1080p is the safe choice.';
        else n.textContent = 'Your phone supports 4K recording.';
      } catch (e) { /* capability check not available: keep the general note */ }
    };
    bindChips(r, 'res', v => { res = +v; check4k(); }); bindChips(r, 'fps', v => { fps = +v; check4k(); }); bindChips(r, 'q', v => { q = v; });
    $('#xGo', r).onclick = () => { closeSheet(); runExport(res, fps, q); };
  });
}
async function runExport(res, fps, q) {
  const mime = pickMime();
  if (!mime || !cv.captureStream) { toast('This phone cannot record video from the editor. Update Android System WebView from the Play Store.', 5000); return; }
  actx().resume();
  sel = null; renderToolbar();
  setCanvasSize(res === 720 ? 1280 : res === 2160 ? 3840 : 1920);
  T = 0; syncMedia(false);
  layout(); await waitFrameReady(vis().filter(c => c._start < .5), 2500);
  draw();
  const stream = cv.captureStream(fps);
  const at = recDest.stream.getAudioTracks()[0]; if (at) stream.addTrack(at);
  const vb = (res === 720 ? 6e6 : res === 2160 ? 35e6 : 12e6) * (q === 'high' ? 1.4 : 1) * (fps === 60 ? 1.5 : 1);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: vb, audioBitsPerSecond: 192000 });
  const chunks = []; rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  let cancelled = false;
  const D = duration();
  busy.show('Exporting', `${res === 2160 ? '4K' : res + 'p'} · ${fps} fps · ${fmt(D)}`, () => { cancelled = true; exporting && exporting.finish(); });
  busy.text(`${res === 2160 ? '4K' : res + 'p'} · ${fps} fps · ${fmt(D)} · keep SplashCut open until it finishes`);
  exporting = {
    progress: p => busy.pct(p * 0.92),
    // The phone stops drawing while the app is in the background, so the video would freeze; stop instead.
    abort: why => { cancelled = why || true; if (exporting) exporting.finish(); },
    finish: () => {
      if (!exporting) return; exporting = null;
      playing = false; cancelAnimationFrame(raf);
      for (const e of Object.values(els)) if (!e.img) e.el.pause();
      rec.onstop = async () => {
        stream.getVideoTracks().forEach(t => t.stop());
        setCanvasSize(PREVIEW_LONG); T = 0; syncMedia(false); draw(); renderTimeline(); updPlay();
        if (cancelled) { busy.hide(); toast(cancelled === 'hidden' ? 'Export stopped because SplashCut was closed. Keep the app open until the export finishes.' : 'Export cancelled', 4500); return; }
        const type = mime.split(';')[0], blob = new Blob(chunks, { type });
        if (blob.size < 2048) {
          $('#busyTitle').textContent = 'Nothing was recorded';
          busy.text('This phone did not record the video. Try 720p at 30 fps, or update Android System WebView from the Play Store.');
          busy.actions('<button type="button" class="btn" id="xDone">OK</button>'); $('#xDone').onclick = busy.hide; return;
        }
        const name = `SplashCut_${(P.name || 'video').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 30)}_${Date.now().toString(36)}.${type.includes('mp4') ? 'mp4' : 'webm'}`;
        busy.text('Saving to your gallery'); busy.pct(0.95);
        const uri = await saveBlob(blob, name, p => busy.pct(0.92 + p * 0.07));
        busy.pct(1);
        if (uri !== false) api('/exported', { method: 'POST', body: { res, seconds: Math.round(D) } }).catch(() => {});
        $('#busyTitle').textContent = uri !== false ? 'Saved' : 'Could not save';
        busy.text(uri !== false ? `${name} · ${(blob.size / 1048576).toFixed(1)} MB${NATIVE ? ' · in your gallery under Movies/SplashCut' : ''}` : 'Free some storage space and try again.');
        busy.actions(`${uri && NATIVE && NATIVE.open ? '<button type="button" class="btn light" id="xOpen">Open</button>' : ''}${uri && NATIVE && NATIVE.share ? '<button type="button" class="btn ai" id="xShare">Share</button>' : ''}<button type="button" class="btn" id="xDone">Done</button>`);
        const sh = $('#xShare'); if (sh) sh.onclick = () => NATIVE.share(uri, type);
        const op = $('#xOpen'); if (op) op.onclick = () => NATIVE.open(uri, type);
        $('#xDone').onclick = busy.hide;
      };
      rec.stop();
    }
  };
  rec.start(1000);
  play();
}
function b64(blob) { return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1] || ''); fr.onerror = () => rej(fr.error); fr.readAsDataURL(blob); }); }
async function saveBlob(blob, name, onp) {
  try {
    if (NATIVE && NATIVE.beginSave) {
      const id = NATIVE.beginSave(name, blob.type); if (!id) return false;
      const CH = 786432;
      for (let o = 0; o < blob.size; o += CH) {
        const ok = NATIVE.appendChunk(id, await b64(blob.slice(o, o + CH)));
        if (ok === false) return false;
        onp(Math.min(1, (o + CH) / blob.size));
      }
      // endSave rewrites the recording into a standard file; it blocks for a moment, so show why first.
      if (!blob.type.startsWith('image/')) { busy.text('Finishing the video file'); await sleep(60); }
      const uri = NATIVE.endSave(id); return uri || false;
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    return '';
  } catch (e) { console.warn(e); return false; }
}

/* ================= Extra editing tools ================= */
/* --- Sound effects, synthesized on the phone so they need no download --- */
const SFX = {
  whoosh: ['Whoosh', .8], swipe: ['Swipe', .35], pop: ['Pop', .18], click: ['Click', .06], ding: ['Ding', 1.3], notify: ['Notification', .5],
  impact: ['Impact', 1.2], riser: ['Riser', 2.2], glitch: ['Glitch', .6], shutter: ['Camera shutter', .25], typing: ['Typing', 1.6], heartbeat: ['Heartbeat', 1.6]
};
function noiseBuf(oc, sec) { const b = oc.createBuffer(1, Math.ceil(oc.sampleRate * sec), oc.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
async function renderSfx(kind) {
  const dur = SFX[kind][1], sr = 44100, oc = new OfflineAudioContext(1, Math.ceil(sr * dur), sr), out = oc.createGain(); out.connect(oc.destination);
  const env = (g, pts) => { g.gain.setValueAtTime(pts[0][1], 0); pts.slice(1).forEach(([t, v]) => g.gain.linearRampToValueAtTime(v, t)); };
  const noise = (sec, filterType, f0, f1, q = 1, pts) => {
    const n = oc.createBufferSource(); n.buffer = noiseBuf(oc, sec); const f = oc.createBiquadFilter(); f.type = filterType; f.Q.value = q;
    f.frequency.setValueAtTime(f0, 0); f.frequency.exponentialRampToValueAtTime(f1, sec); const g = oc.createGain(); env(g, pts);
    n.connect(f); f.connect(g); g.connect(out); n.start(0); return n;
  };
  const tone = (type, f0, f1, t0, sec, peak) => {
    const o = oc.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + sec);
    const g = oc.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0 + .005); g.gain.exponentialRampToValueAtTime(.0005, t0 + sec);
    o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + sec + .02);
  };
  switch (kind) {
    case 'whoosh': noise(dur, 'bandpass', 250, 3200, 1.4, [[0, 0], [dur * .55, .9], [dur, 0]]); break;
    case 'swipe': noise(dur, 'highpass', 6000, 900, .8, [[0, 0], [.04, .7], [dur, 0]]); break;
    case 'pop': tone('sine', 900, 140, 0, .16, .9); break;
    case 'click': noise(.05, 'highpass', 3000, 3000, 1, [[0, .9], [.03, 0]]); break;
    case 'ding': tone('sine', 1320, 1318, 0, 1.25, .5); tone('sine', 2640, 2636, 0, .8, .18); tone('sine', 3960, 3950, 0, .4, .06); break;
    case 'notify': tone('sine', 880, 879, 0, .22, .5); tone('sine', 1175, 1174, .16, .3, .5); break;
    case 'impact': tone('sine', 130, 35, 0, 1.1, 1); noise(.6, 'lowpass', 1800, 120, .7, [[0, .9], [.5, 0]]); break;
    case 'riser': { noise(dur, 'bandpass', 200, 6000, 2, [[0, 0], [dur * .95, .8], [dur, 0]]); const o = oc.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(110, 0); o.frequency.exponentialRampToValueAtTime(880, dur); const g = oc.createGain(); env(g, [[0, 0], [dur * .95, .12], [dur, 0]]); o.connect(g); g.connect(out); o.start(0); break; }
    case 'glitch': for (let t = 0; t < dur; t += .05) if (Math.random() > .3) tone('square', 200 + Math.random() * 1800, 100 + Math.random() * 900, t, .045, .25); break;
    case 'shutter': noise(.05, 'bandpass', 2500, 2500, 1, [[0, 1], [.04, 0]]); { const n2 = noise(.07, 'bandpass', 1800, 1800, 1, [[0, 0], [.12, 0], [.13, .9], [.2, 0]]); } break;
    case 'typing': for (let t = .02; t < dur - .05; t += .08 + Math.random() * .1) { const n = oc.createBufferSource(); n.buffer = noiseBuf(oc, .03); const f = oc.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2000 + Math.random() * 2500; const g = oc.createGain(); g.gain.setValueAtTime(.6, t); g.gain.linearRampToValueAtTime(0, t + .025); n.connect(f); f.connect(g); g.connect(out); n.start(t); } break;
    case 'heartbeat': [0, .25, .8, 1.05].forEach((t, i) => tone('sine', i % 2 ? 55 : 65, 35, t, .2, i % 2 ? .7 : 1)); break;
  }
  return oc.startRendering();
}
const sfxMedia = {};
function sfxSheet() {
  openSheet('Sound effects', `<div class="sfx-grid">${Object.entries(SFX).map(([k, [n, d]]) => `<div class="sfx"><button type="button" class="pl" data-play="${k}" aria-label="Play ${n}">${icon('play')}</button><span>${n}<br><small class="note">${d < 1 ? Math.round(d * 1000) + ' ms' : d.toFixed(1) + ' s'}</small></span><button type="button" class="add" data-add="${k}">Add</button></div>`).join('')}</div><p class="note">Sound effects are added at the playhead on the audio track. Tap one on the timeline to move, trim or change its volume.</p>`,
  r => r.addEventListener('click', async e => {
    const pb = e.target.closest('[data-play]'), ab = e.target.closest('[data-add]');
    if (pb) { const buf = await renderSfx(pb.dataset.play), ac = actx(); ac.resume(); const s = ac.createBufferSource(); s.buffer = buf; s.connect(master); s.start(); return; }
    if (!ab) return;
    const k = ab.dataset.add;
    let m = sfxMedia[k] && media[sfxMedia[k]];
    if (!m) { const buf = await renderSfx(k); m = await addMediaRecord('audio', SFX[k][0], wavBlob(buf.getChannelData(0), buf.sampleRate), buf.duration); sfxMedia[k] = m.id; }
    const a = addAudioItem(m, 'sfx', T); a.out = m.duration; a.volume = 1;
    commit(); toast(`${SFX[k][0]} added at ${fmt(T)}`);
  }));
}

/* --- Split-screen layouts --- */
const LAYOUTS = {
  top2: ['Top / bottom', [[0, 0, 1, .5], [0, .5, 1, .5]]],
  side2: ['Side by side', [[0, 0, .5, 1], [.5, 0, .5, 1]]],
  rows3: ['Three rows', [[0, 0, 1, 1 / 3], [0, 1 / 3, 1, 1 / 3], [0, 2 / 3, 1, 1 / 3]]],
  grid4: ['Grid of four', [[0, 0, .5, .5], [.5, 0, .5, .5], [0, .5, .5, .5], [.5, .5, .5, .5]]],
  big1: ['One big, two small', [[0, 0, 1, .5], [0, .5, .5, .5], [.5, .5, .5, .5]]],
  pip: ['Picture in picture', [[0, 0, 1, 1], [.56, .62, .38, .32]]],
  pipt: ['Corner top', [[0, 0, 1, 1], [.06, .06, .38, .32]]],
  diag: ['Offset pair', [[0, 0, .62, .62], [.38, .38, .62, .62]]]
};
function layoutSheet() {
  const art = cells => `<span class="lay" style="display:block;position:relative">${cells.map(([x, y, w, h]) => `<i style="position:absolute;left:${x * 100 + 2}%;top:${y * 100 + 1.5}%;width:${w * 100 - 4}%;height:${h * 100 - 3}%"></i>`).join('')}</span>`;
  openSheet('Split screen', `<div class="layouts">${Object.entries(LAYOUTS).map(([k, [n, cells]]) => `<button type="button" data-lay="${k}" aria-label="${n}" style="display:grid;gap:4px;font-size:11px;color:var(--muted);text-align:center">${art(cells)}${n}</button>`).join('')}</div>
    <p class="note">Uses the main clip and the overlays playing at the playhead (add more with Overlay). Each one is cropped to fill its box, and you can still move or zoom it afterwards.</p>`,
  r => r.addEventListener('click', e => { const b = e.target.closest('[data-lay]'); if (b) applyLayout(b.dataset.lay); }));
}
function applyLayout(key) {
  layout();
  const main = clipAt(T), lays = P.layers.filter(l => T >= l._start && T < l._start + clipLen(l)).sort((a, b) => a.start - b.start);
  const items = [main, ...lays].filter(Boolean);
  if (items.length < 2) { toast('Add an overlay video or photo first (Overlay button), then pick a layout.', 3500); return; }
  const W = cv.width, H = cv.height, cells = LAYOUTS[key][1];
  items.slice(0, cells.length).forEach((it, i) => {
    const [x, y, w, h] = cells[i], m = media[it.mediaId]; if (!m) return;
    const r90 = ((it.rot || 0) % 180) !== 0, sw = r90 ? m.h : m.w, sh = r90 ? m.w : m.h, sa = sw / sh, a = (w * W) / (h * H);
    it.crop = Math.abs(sa - a) < .01 ? null : sa > a ? (r90 ? { l: 0, r: 0, t: (1 - a / sa) / 2, b: (1 - a / sa) / 2 } : { l: (1 - a / sa) / 2, r: (1 - a / sa) / 2, t: 0, b: 0 })
      : (r90 ? { t: 0, b: 0, l: (1 - sa / a) / 2, r: (1 - sa / a) / 2 } : { t: (1 - sa / a) / 2, b: (1 - sa / a) / 2, l: 0, r: 0 });
    const iw = Math.max(sw, 1) * (sa > a ? a / sa : 1), ih = Math.max(sh, 1) * (sa > a ? 1 : sa / a), base = Math.min(W / iw, H / ih);
    it.fit = 'contain'; it.frame = null; it.kf = []; if (it !== main) it.blend = 'source-over';
    it.tf = { x: x + w / 2, y: y + h / 2, s: +((w * W) / (iw * base)).toFixed(4), r: 0, o: 1 };
  });
  commit(); closeSheet(); toast(`${LAYOUTS[key][0]} layout applied to ${Math.min(items.length, cells.length)} clips`);
}

/* --- Copy / paste style, replace clip, loudness --- */
let clipStyle = null;
const STYLE_KEYS = ['filter', 'adj', 'fx', 'anim', 'mask', 'relight', 'blend', 'chroma', 'afx', 'transition'];
function pickStyle(it) { const o = {}; STYLE_KEYS.forEach(k => { if (it[k] !== undefined) o[k] = deep(it[k]); }); return o; }
function pasteStyleSheet(it) {
  if (!clipStyle) { toast('Select a clip you like and tap Copy style first'); return; }
  openSheet('Paste style', '<p class="note">Copies the filter, adjustments, effects, animations, mask, relight, chroma key and voice effects.</p><button type="button" class="btn main full" id="psOne">Paste to this clip</button><button type="button" class="btn full" id="psAll">Paste to every clip</button>',
    r => {
      const apply = c => STYLE_KEYS.forEach(k => { if (clipStyle[k] !== undefined && !(k === 'transition' && !P.clips.includes(c))) c[k] = deep(clipStyle[k]); });
      $('#psOne', r).onclick = () => { apply(it); commit(); closeSheet(); toast('Style pasted'); };
      $('#psAll', r).onclick = () => { vis().forEach(apply); commit(); closeSheet(); toast('Style pasted to every clip'); };
    });
}
async function replaceClip(it) {
  const files = await pickFiles('video/*,image/*', false); if (!files.length) return;
  busy.show('Importing'); const ms = await importFiles(files); busy.hide();
  const m = ms[0]; if (!m || m.kind === 'audio') return;
  const len = clipLen(it), srcLen = it.out - it.in;
  dropEl(it.id);
  it.mediaId = m.id; it.kind = m.kind; it.stab = null; it.frame = null; it.reversed = false; it.crop = null;
  if (m.kind === 'image') { it.in = 0; it.out = len; it.curve = 'none'; it.speed = 1; }
  else { it.in = 0; it.out = Math.min(m.duration, srcLen > .1 ? srcLen : m.duration); }
  commit(); seekTo(T); toast('Clip replaced. Your edits were kept.');
}
async function normalizeLoudness(it) {
  const m = media[it.mediaId];
  if (!m || m.kind === 'image') { toast('This clip has no sound'); return; }
  busy.show('Loudness', 'Measuring the sound'); busy.pct(.4);
  const buf = await decodeMedia(m); busy.hide();
  if (!buf) { toast('This clip has no sound'); return; }
  const r = rmsWindows(buf, it.in, it.out, .1).filter(v => v > .003);
  if (!r.length) { toast('This clip is silent'); return; }
  const loud = pctl(r, .9), d = buf.getChannelData(0), a = Math.floor(it.in * buf.sampleRate), b = Math.min(d.length, Math.floor(it.out * buf.sampleRate));
  let peak = 0; for (let i = a; i < b; i += 3) { const v = Math.abs(d[i]); if (v > peak) peak = v; }
  const g = clamp(Math.min(.25 / loud, .98 / Math.max(peak, 1e-3)), .2, 2);
  it.volume = +g.toFixed(2); if ('muted' in it) it.muted = false;
  syncMedia(playing); commit(); toast(`Loudness evened out (volume ${Math.round(g * 100)}%)`);
}

/* ================= Account, trial and Pro ================= */
const API_BASE = (() => { try { return localStorage.getItem('sc_api') || 'https://kaybiz.in'; } catch (e) { return 'https://kaybiz.in'; } })();
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
let acct = store.get('sc_acct', null), billing = store.get('sc_info', null), pendingRef = store.get('sc_pref', null), afterPro = null;
async function api(path, { method = 'GET', body, form } = {}) {
  const h = { Accept: 'application/json' };
  if (acct && acct.token) { h.Authorization = 'Bearer ' + acct.token; h['X-Token'] = acct.token; }
  let payload;
  if (form) payload = form; else if (body) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let r;
  try { r = await fetch(API_BASE + '/api' + path, { method, headers: h, body: payload }); }
  catch (e) { const err = new Error('No internet connection. Connect and try again.'); err.offline = true; throw err; }
  let data = {}; try { data = await r.json(); } catch (e) {}
  if (r.status === 401 && acct && path !== '/login') setAcct(null);
  if (!r.ok) { const first = data.errors && Object.values(data.errors)[0]; const err = new Error((first && first[0]) || data.message || 'Something went wrong. Please try again.'); err.status = r.status; throw err; }
  return data;
}
function setAcct(a) { acct = a; store.set('sc_acct', a); renderAcct(); }
function setUser(u) { if (!acct || !u) return; acct.user = u; store.set('sc_acct', acct); renderAcct(); }
function accessOk() { const u = acct && acct.user; return !!(u && u.can_export && (!u.access_until || new Date(u.access_until) > new Date())); }
async function refreshMe() { if (!acct) return null; try { const d = await api('/me'); setUser(d.user); } catch (e) {} return acct && acct.user; }
async function loadInfo() { try { billing = await api('/info'); store.set('sc_info', billing); renderAcct(); } catch (e) {} return billing; }
const money = v => (billing && billing.symbol || '₦') + Number(v).toLocaleString('en-NG', { maximumFractionDigits: v % 1 ? 2 : 0 });
const dateStr = s => s ? new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const deviceName = () => { const m = navigator.userAgent.match(/Android [\d.]+; ([^;)]+)/); return m ? m[1].replace(/ Build.*/, '').trim() : 'Android phone'; };
const trialDays = () => (billing && billing.trial_days != null ? billing.trial_days : 30);
function openUrl(url) { if (NATIVE && NATIVE.openUrl) NATIVE.openUrl(url); else window.open(url, '_blank', 'noopener'); }
function copyText(t) {
  if (NATIVE && NATIVE.copy) { NATIVE.copy(t); toast('Copied ' + t); return; }
  const done = () => toast('Copied ' + t);
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(done).catch(() => { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} ta.remove(); });
}
function statusOf(u) {
  if (!u) return { key: 'none', short: 'Sign in', pro: false };
  if (u.status === 'blocked') return { key: 'blocked', short: 'Suspended', pro: false };
  if (!accessOk()) return { key: 'expired', short: 'Go Pro', pro: false };
  if (u.status === 'active') return { key: 'active', short: 'Pro', pro: true };
  return { key: 'trial', short: `Trial · ${u.days_left}d left`, pro: true };
}
function renderAcct() {
  const chip = $('#acctChip'), ban = $('#proBanner'); if (!chip) return;
  const u = acct && acct.user, st = statusOf(u);
  chip.innerHTML = `<span class="av">${u ? esc((u.name || '?').trim().charAt(0).toUpperCase()) : icon('account')}</span><span>${esc(st.short)}</span>`;
  chip.classList.toggle('is-pro', st.pro);
  let t, sub, go;
  if (!u) { t = `Get ${trialDays()} days of Pro free`; sub = 'Create an account to export in up to 4K.'; go = 'Start free'; }
  else if (st.key === 'trial') { t = `Pro trial · ${u.days_left} day${u.days_left === 1 ? '' : 's'} left`; sub = 'Choose a plan to keep exporting after your trial.'; go = 'See plans'; }
  else if (st.key === 'active') { t = 'SplashCut Pro'; sub = `Active until ${dateStr(u.access_until)}`; go = 'Account'; }
  else if (u.pending_payment) { t = 'Confirming your payment'; sub = 'Pro switches on as soon as your transfer is confirmed.'; go = 'Check'; }
  else if (st.key === 'blocked') { t = 'Account suspended'; sub = 'Contact support for help.'; go = 'Account'; }
  else { t = 'Your Pro access has ended'; sub = 'Renew to export your videos again.'; go = 'Renew'; }
  ban.innerHTML = `<span class="pb-t"><b>${esc(t)}</b><small>${esc(sub)}</small></span><span class="pb-go">${go}</span>`;
  ban.hidden = false;
}
$('#acctChip').onclick = () => acct ? acctSheet() : authSheet('register');
$('#proBanner').onclick = () => { const st = statusOf(acct && acct.user); if (st.key === 'none') authSheet('register'); else if (st.key === 'active' || st.key === 'blocked') acctSheet(); else if (acct.user.pending_payment && st.key === 'expired') acctSheet(); else openPro('plans'); };

function authSheet(mode, reason, then) {
  const reg = mode === 'register', wa = billing && billing.whatsapp;
  openSheet(reg ? 'Create your account' : 'Sign in', `
    ${reg ? `<div class="pending">${reason === 'export' ? 'Create a free account to export your video. ' : ''}You get <b>${trialDays()} days of SplashCut Pro free</b>: export in up to 4K and use every tool. No card needed.</div>` : reason === 'export' ? '<div class="pending">Sign in to export your video.</div>' : ''}
    ${reg ? '<div class="fld"><label for="auName">Full name</label><input class="inp" id="auName" autocomplete="name" maxlength="80"></div>' : ''}
    <div class="fld"><label for="auEmail">Email</label><input class="inp" id="auEmail" type="email" autocomplete="email" inputmode="email" maxlength="190"></div>
    ${reg ? '<div class="fld"><label for="auPhone">Phone number (optional)</label><input class="inp" id="auPhone" type="tel" autocomplete="tel" inputmode="tel" maxlength="40"></div>' : ''}
    <div class="fld"><label for="auPass">Password${reg ? ' (6+ characters)' : ''}</label><input class="inp" id="auPass" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" maxlength="100"></div>
    <p class="err" id="auErr" hidden></p>
    <button type="button" class="btn main full" id="auGo">${reg ? `Create account · start ${trialDays()}-day trial` : 'Sign in'}</button>
    <button type="button" class="linkbtn" id="auSwitch">${reg ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>
    ${!reg && wa ? `<button type="button" class="linkbtn" id="auForgot" style="color:var(--muted);font-weight:500">Forgot your password? Message support on WhatsApp</button>` : ''}`,
  r => {
    const go = async () => {
      const v = id => ($('#' + id, r) || {}).value || '', err = $('#auErr', r), btn = $('#auGo', r);
      err.hidden = true; btn.disabled = true; btn.textContent = 'Please wait…';
      try {
        const body = reg ? { name: v('auName').trim(), email: v('auEmail').trim(), phone: v('auPhone').trim(), password: v('auPass'), device: deviceName() } : { email: v('auEmail').trim(), password: v('auPass'), device: deviceName() };
        if (reg && !body.name) throw new Error('Enter your name.');
        if (!body.email) throw new Error('Enter your email.');
        const d = await api(reg ? '/register' : '/login', { method: 'POST', body });
        setAcct({ token: d.token, user: d.user }); closeSheet(); loadInfo();
        toast(reg ? `Welcome, ${d.user.name.split(' ')[0]}! Your ${trialDays()}-day Pro trial has started.` : `Signed in as ${d.user.name}`, 3500);
        if (then) then();
      } catch (e) { err.textContent = e.message; err.hidden = false; btn.disabled = false; btn.textContent = reg ? 'Create account' : 'Sign in'; }
    };
    $('#auGo', r).onclick = go;
    $$('.inp', r).forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }));
    $('#auSwitch', r).onclick = () => authSheet(reg ? 'login' : 'register', reason, then);
    const f = $('#auForgot', r); if (f) f.onclick = () => openUrl(`https://wa.me/${wa.replace(/^\+/, '')}?text=${encodeURIComponent('Hello, I forgot my SplashCut password. My email is: ')}`);
  });
  if (!billing) loadInfo();
}

async function acctSheet() {
  const u = acct && acct.user; if (!u) return authSheet('login');
  const st = statusOf(u), wa = billing && billing.whatsapp;
  const label = { trial: 'Free trial', active: 'Pro', expired: 'Expired', blocked: 'Suspended' }[st.key];
  openSheet('Account', `<div class="acct-head"><span class="av">${esc(u.name.charAt(0).toUpperCase())}</span><div><b>${esc(u.name)}</b><small>${esc(u.email)}</small></div></div>
    ${u.pending_payment ? '<div class="pending">We received your payment details and are confirming them. Pro switches on as soon as it is confirmed.</div>' : ''}
    <div class="statbox"><div><small>Plan</small><b>${label}</b></div><div><small>${st.key === 'expired' ? 'Ended' : 'Access until'}</small><b>${dateStr(u.access_until)}</b></div><div><small>Days left</small><b>${u.days_left}</b></div><div><small>Export quality</small><b>${st.pro ? 'Up to 4K' : 'Locked'}</b></div></div>
    <button type="button" class="btn main full" id="acPro">${st.key === 'active' ? 'Extend Pro' : st.key === 'trial' ? 'Choose a plan' : 'Renew Pro'}</button>
    <div class="lab">Payments</div><div class="paylist" id="acPays"><div>Loading…</div></div>
    <div class="kfbar"><button type="button" class="btn sm" id="acRef">Refresh status</button>${wa ? '<button type="button" class="btn sm" id="acWa">WhatsApp support</button>' : ''}<button type="button" class="btn sm danger" id="acOut">Sign out</button></div>`,
  r => {
    $('#acPro', r).onclick = () => { closeSheet(); openPro('plans'); };
    $('#acRef', r).onclick = async () => { await refreshMe(); closeSheet(); acctSheet(); toast('Status updated'); };
    $('#acOut', r).onclick = async () => { api('/logout', { method: 'POST' }).catch(() => {}); setAcct(null); closeSheet(); toast('Signed out'); };
    const w = $('#acWa', r); if (w) w.onclick = () => openUrl(`https://wa.me/${wa.replace(/^\+/, '')}?text=${encodeURIComponent(`Hello, I need help with SplashCut. My account email is ${u.email}.`)}`);
    api('/payments').then(d => {
      const el = $('#acPays', r); if (!el) return;
      el.innerHTML = d.payments.length ? d.payments.map(p => `<div><span><b>${esc(p.plan)}</b> · ${money(p.amount)}<br>${dateStr(p.date)} · ${p.method === 'paystack' ? 'Card' : p.method === 'bank' ? 'Bank transfer' : 'Added by support'}</span><span class="${p.status === 'paid' ? 'gold' : ''}" style="color:${p.status === 'paid' ? 'var(--gold)' : p.status === 'rejected' ? 'var(--bad)' : 'var(--muted)'}">${{ paid: 'Paid', pending: 'Confirming', rejected: 'Not received' }[p.status]}</span></div>`).join('') : '<div>No payments yet.</div>';
    }).catch(e => { const el = $('#acPays', r); if (el) el.innerHTML = `<div>${esc(e.message)}</div>`; });
  });
  refreshMe().then(() => { if (!$('#sheet').hidden && $('#sheetTitle').textContent === 'Account' && acct && JSON.stringify(acct.user) !== JSON.stringify(u)) acctSheet(); });
}

async function exportFlow() {
  if (!P.clips.length && !P.overlays.length && !P.layers.length) { toast('Add some clips first'); return; }
  if (playing) pause();
  if (!acct) { authSheet('register', 'export', () => exportFlow()); return; }
  await refreshMe();
  if (!acct) { authSheet('login', 'export', () => exportFlow()); return; }
  if (accessOk()) exportSheet(); else openPro('export');
}

let proPlan = null;
async function openPro(reason) {
  if (!acct) { authSheet('register', reason, () => openPro(reason)); return; }
  afterPro = reason === 'export' ? 'export' : null;
  const el = $('#pro'); el.hidden = false;
  const render = () => {
    const u = acct.user, st = statusOf(u), plans = (billing && billing.plans) || [];
    if (!proPlan || !plans.some(p => p.id === proPlan)) proPlan = (plans.find(p => p.popular) || plans[0] || {}).id;
    const sel1 = plans.find(p => p.id === proPlan);
    const head = st.key === 'trial' ? `You have <b>${u.days_left} day${u.days_left === 1 ? '' : 's'}</b> of Pro left. Pick a plan now and the new time is added on top.`
      : st.key === 'active' ? `You're Pro until ${dateStr(u.access_until)}. Extend now and the time is added on top.`
      : reason === 'export' ? 'Your free trial has ended. Go Pro to export this video and everything you make next.' : 'Export in up to 4K and use every tool, with no limits.';
    const perk = (ic, t, d) => `<li>${icon(ic)}<span>${t}<small>${d}</small></span></li>`;
    el.innerHTML = `<button type="button" class="pro-x" id="proX" aria-label="Close">${icon('close')}</button>
      <svg class="pro-mark" viewBox="0 0 56 56"><circle cx="28" cy="28" r="27" fill="none" stroke="#c9a45c" stroke-opacity=".5"/><path d="M15 22l7 6 6-10 6 10 7-6-3 16H18z" fill="#c9a45c"/></svg>
      <h2>Unlock <em>SplashCut Pro</em></h2>
      <p class="sub">${head}</p>
      <ul class="perks">
        ${perk('hd', 'Export in 4K Ultra HD', '720p, 1080p and 4K, up to 60 fps at high bitrate')}
        ${perk('ai', 'Every smart tool included', 'Captions, background removal, relight, stabilize, tracking')}
        ${perk('infinity', 'Unlimited exports', 'Make as many videos as you want, no watermark')}
        ${perk('bolt', 'New features first', 'Every update and new effect as soon as it ships')}
      </ul>
      ${u.pending_payment ? '<div class="pending" style="max-width:420px;margin:0 auto 14px">Your transfer is being confirmed. Pro switches on automatically once it is approved. You can still pay another way below.</div>' : ''}
      ${plans.length ? `<div class="plans" id="proPlans">${plans.map(p => { const save = p.old_price && p.old_price > p.price ? Math.round(100 - p.price / p.old_price * 100) : 0; return `<button type="button" class="plan" data-plan="${p.id}" aria-pressed="${p.id === proPlan}">${p.popular ? '<span class="ptag">MOST POPULAR</span>' : ''}<span class="rad"></span><span class="pn"><b>${esc(p.name)}</b><small>${p.months > 1 ? `${money(Math.round(p.per_month))}/month` : esc(p.description || '1 month of Pro')}${save ? ` · save ${save}%` : ''}</small></span><span class="pp">${p.old_price ? `<s>${money(p.old_price)}</s>` : ''}<b>${money(p.price)}</b></span></button>`; }).join('')}</div>
        <div class="pro-cta">
          ${billing.paystack ? `<button type="button" class="btn main" id="payCard">Pay ${sel1 ? money(sel1.price) : ''} · card, transfer or USSD</button>` : ''}
          ${billing.banks && billing.banks.length ? `<button type="button" class="btn ${billing.paystack ? '' : 'main'}" id="payBank">Pay by bank transfer</button>` : ''}
          <button type="button" class="linkbtn" id="proRefresh">I've already paid · check again</button>
        </div>`
      : `<div class="pro-cta"><p class="sub">Connect to the internet to see the plans.</p><button type="button" class="btn main" id="proRetry">Try again</button></div>`}
      <p class="pro-foot">Signed in as ${esc(u.email)}${billing && billing.paystack ? ' · Card payments are secured by Paystack' : ''}</p>`;
    $('#proX', el).onclick = closePro;
    const pl = $('#proPlans', el); if (pl) pl.onclick = e => { const b = e.target.closest('[data-plan]'); if (b) { proPlan = +b.dataset.plan; render(); } };
    const pc = $('#payCard', el); if (pc) pc.onclick = () => payCard(sel1, pc);
    const pb = $('#payBank', el); if (pb) pb.onclick = () => bankSheet(sel1);
    const rf = $('#proRefresh', el); if (rf) rf.onclick = () => checkPaid(true);
    const rt = $('#proRetry', el); if (rt) rt.onclick = async () => { await loadInfo(); render(); };
  };
  render();
  if (!billing || !billing.plans) { await loadInfo(); if (!$('#pro').hidden) render(); }
  else loadInfo().then(() => { if (!$('#pro').hidden && $('#sheet').hidden) render(); });
}
function closePro() { $('#pro').hidden = true; afterPro = null; }
async function payCard(plan, btn) {
  if (!plan) return;
  const txt = btn.textContent; btn.disabled = true; btn.textContent = 'Opening secure checkout…';
  try {
    const d = await api('/pay/paystack', { method: 'POST', body: { plan_id: plan.id } });
    pendingRef = d.reference; store.set('sc_pref', pendingRef);
    openUrl(d.url);
    toast('Complete the payment, then come back to SplashCut', 4000);
  } catch (e) { toast(e.message, 4000); }
  btn.disabled = false; btn.textContent = txt;
}
async function checkPaid(manual) {
  if (!acct) return;
  const was = accessOk() && acct.user.status === 'active' ? acct.user.access_until : null;
  try {
    if (pendingRef) { const d = await api('/pay/verify', { method: 'POST', body: { reference: pendingRef } }); setUser(d.user); if (d.status === 'paid' || d.status === 'rejected') { pendingRef = null; store.set('sc_pref', null); } }
    else await refreshMe();
  } catch (e) { if (manual) toast(e.message); return; }
  const u = acct && acct.user;
  if (u && u.status === 'active' && accessOk() && u.access_until !== was) {
    const next = afterPro; closePro(); closeSheet();
    toast(`Welcome to SplashCut Pro! Active until ${dateStr(u.access_until)}.`, 4000);
    if (next === 'export' && P) exportSheet();
  } else if (manual) toast(u && u.pending_payment ? 'Still confirming your transfer. We will activate Pro as soon as it is confirmed.' : 'No new payment found yet.', 3500);
  if (!$('#pro').hidden) openPro(afterPro || 'plans');
}
function bankSheet(plan) {
  if (!plan) return;
  const banks = (billing && billing.banks) || [], wa = billing && billing.whatsapp, u = acct.user;
  openSheet('Pay by bank transfer', `<div class="amount">${money(plan.price)}</div><p class="note" style="text-align:center">${esc(plan.name)} · ${plan.months} month${plan.months > 1 ? 's' : ''} of Pro</p>
    <p class="note">${esc((billing && billing.instructions) || '')}</p>
    ${banks.map((b, i) => `<div class="bankcard"><div class="bn"><small>${esc(b.bank)}</small><b>${esc(b.number)}</b><small>${esc(b.name)}</small></div><button type="button" class="btn sm" data-copy="${i}">${icon('copy')} Copy</button></div>`).join('')}
    <button type="button" class="btn sm" id="bkAmt" style="justify-self:start">${icon('copy')} Copy amount</button>
    <div class="fld"><label for="bkName">Name on the account you paid from</label><input class="inp" id="bkName" value="${esc(u.name)}" maxlength="120"></div>
    <div class="fld"><label for="bkNote">Note (optional)</label><input class="inp" id="bkNote" maxlength="300" placeholder="e.g. paid from Opay at 2:15pm"></div>
    <div class="fld"><label for="bkProof">Receipt screenshot (optional, makes approval faster)</label><input class="inp" id="bkProof" type="file" accept="image/*"></div>
    <p class="err" id="bkErr" hidden></p>
    <button type="button" class="btn main full" id="bkGo">I have paid ${money(plan.price)}</button>`,
  r => {
    r.addEventListener('click', e => { const c = e.target.closest('[data-copy]'); if (c) copyText(banks[+c.dataset.copy].number); });
    $('#bkAmt', r).onclick = () => copyText(String(plan.price));
    $('#bkGo', r).onclick = async () => {
      const btn = $('#bkGo', r), err = $('#bkErr', r), name = $('#bkName', r).value.trim();
      if (!name) { err.textContent = 'Enter the name on the account you paid from.'; err.hidden = false; return; }
      err.hidden = true; btn.disabled = true; btn.textContent = 'Sending…';
      const fd = new FormData(); fd.append('plan_id', plan.id); fd.append('sender_name', name); fd.append('note', $('#bkNote', r).value.trim());
      const f = $('#bkProof', r).files[0]; if (f) fd.append('proof', f);
      try {
        const d = await api('/pay/bank', { method: 'POST', form: fd }); setUser(d.user);
        r.innerHTML = `<div class="pending"><b>Thank you!</b> We've received your payment details (reference ${esc(d.payment.reference)}). Your Pro access will be switched on as soon as the transfer is confirmed, usually within a few hours.</div>
          ${wa ? `<button type="button" class="btn main full" id="bkWa">Send receipt on WhatsApp</button>` : ''}<button type="button" class="btn full" id="bkDone">Done</button>`;
        const w = $('#bkWa', r); if (w) w.onclick = () => openUrl(`https://wa.me/${wa.replace(/^\+/, '')}?text=${encodeURIComponent(`Hello, I paid ${money(plan.price)} for SplashCut Pro (${plan.name}). Reference ${d.payment.reference}. Account: ${u.email}. Paid from: ${name}.`)}`);
        $('#bkDone', r).onclick = () => { closeSheet(); if (!$('#pro').hidden) openPro(afterPro || 'plans'); };
      } catch (e) { err.textContent = e.message; err.hidden = false; btn.disabled = false; btn.textContent = `I have paid ${money(plan.price)}`; }
    };
  });
  $('#sheet').classList.add('tall');
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && acct && (pendingRef || !$('#pro').hidden)) checkPaid(false); else if (!document.hidden && acct) refreshMe(); });

/* ================= Screens ================= */
async function renderHome() {
  let list = []; try { list = await allProjects(); } catch (e) {}
  list.sort((a, b) => b.updated - a.updated);
  $('#projects').innerHTML = list.length ? list.map(p => `<div class="pcard" data-p="${p.id}"><button type="button" class="pthumb" data-open="${p.id}" style="${p.thumb ? `background-image:url(${p.thumb})` : ''}" aria-label="Open ${esc(p.name)}"><span class="pdur">${fmt(p.dur || 0).slice(0, -2)}</span></button>
      <button type="button" class="pmore" data-more="${p.id}" aria-label="More options">⋯</button>
      <span class="pname">${esc(p.name)}</span><span class="pmeta">${p.ratio} · ${new Date(p.updated).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span></div>`).join('')
    : '<div class="empty-home">No projects yet. Tap New project to make your first video.</div>';
}
$('#projects').addEventListener('click', async e => {
  const o = e.target.closest('[data-open]'); if (o) return openProject(o.dataset.open);
  const mo = e.target.closest('[data-more]');
  if (mo) {
    $$('.pmenu').forEach(x => x.remove());
    mo.parentElement.insertAdjacentHTML('beforeend', `<div class="pmenu"><button type="button" data-act="rename">Rename</button><button type="button" data-act="copy">Duplicate</button><button type="button" class="danger" data-act="del">Delete</button></div>`);
    e.stopPropagation(); return;
  }
  const act = e.target.closest('[data-act]'); if (!act) return;
  const id = act.closest('[data-p]').dataset.p, list = await allProjects(), p = list.find(x => x.id === id); if (!p) return;
  if (act.dataset.act === 'rename') { const card = act.closest('.pcard'); const nm = card.querySelector('.pname'); nm.outerHTML = `<input class="proj-name" value="${esc(p.name)}" maxlength="40" id="rn">`; const i = $('#rn'); i.focus(); i.select(); const fin = async () => { p.name = i.value.trim() || p.name; await putProject(p); renderHome(); }; i.onblur = fin; i.onkeydown = ev => { if (ev.key === 'Enter') i.blur(); }; return; }
  if (act.dataset.act === 'copy') { const c = { ...p, id: uid(), name: p.name + ' copy', updated: Date.now() }; await putProject(c); renderHome(); toast('Project duplicated'); return; }
  if (act.dataset.act === 'del') {
    if (act.dataset.armed !== '1') { act.dataset.armed = '1'; act.textContent = 'Tap again to delete'; return; }
    await delProjectRec(id);
    const refs = x => [...(x.clips || []), ...(x.layers || []), ...(x.audio || [])].map(i => i.mediaId), used = new Set();
    list.filter(x => x.id !== id).forEach(x => refs(x).forEach(mid => used.add(mid)));
    for (const mid of new Set(refs(p))) if (!used.has(mid)) { await delMediaRec(mid).catch(() => {}); if (media[mid]) { URL.revokeObjectURL(media[mid].url); delete media[mid]; } }
    renderHome(); toast('Project deleted');
  }
});
document.addEventListener('click', e => { if (!e.target.closest('.pmenu') && !e.target.closest('[data-more]')) $$('.pmenu').forEach(x => x.remove()); });

$('#newProject').onclick = async () => {
  const files = await pickFiles('video/*,image/*'); if (!files.length) return;
  busy.show('Importing', `${files.length} file${files.length > 1 ? 's' : ''}`);
  const ms = await importFiles(files); busy.hide();
  const vs = ms.filter(m => m.kind !== 'audio'); if (!vs.length) return;
  const f = vs[0], ratio = f.w && f.h ? (f.w > f.h * 1.15 ? '16:9' : f.h > f.w * 1.15 ? '9:16' : '1:1') : '9:16';
  P = newProject(ratio); P.clips = vs.map(m => makeClip(m, false));
  await saveProject(); await enterEditor();
};
async function openProject(id) {
  const list = await allProjects(), p = list.find(x => x.id === id); if (!p) return;
  busy.show('Opening', p.name);
  normalize(p);
  const ids = new Set([...p.clips, ...p.layers, ...p.audio].map(x => x.mediaId)); let n = 0, missing = 0;
  for (const mid of ids) { const m = await loadMedia(mid); if (!m) missing++; busy.pct(++n / Math.max(1, ids.size)); }
  busy.hide();
  P = p;
  if (missing) { P.clips = P.clips.filter(c => media[c.mediaId]); P.layers = P.layers.filter(c => media[c.mediaId]); P.audio = P.audio.filter(a => media[a.mediaId]); toast(`${missing} file${missing > 1 ? 's were' : ' was'} missing and removed from the project`); }
  for (const a of P.audio) { const m = media[a.mediaId]; if (m && !m.wave) showWave(m); }
  if (vis().some(c => c.removeBg || c.blurBg || (c.relight && c.relight.person))) loadSeg().then(ok => { if (ok) requestDraw(); });
  await enterEditor();
}
async function enterEditor() {
  $('#home').hidden = true; $('#editor').hidden = false;
  normalize(P);
  sel = null; T = 0; pps = 60;
  $('#projName').value = P.name;
  setCanvasSize(PREVIEW_LONG); resetHistory(); syncEls();
  renderToolbar(); renderTimeline(); syncMedia(false); requestDraw(); updPlay();
  setTimeout(() => { fitStage(); renderTimeline(); }, 60);
}
async function leaveEditor() {
  if (playing) pause(); closeSheet();
  await saveProject();
  for (const id of Object.keys(els)) dropEl(id);
  // Decoded sound can take hundreds of MB; it is decoded again only if a tool needs it.
  for (const m of Object.values(media)) { if (!m.dec) m.buf = undefined; }
  prepMap.clear(); accMap.clear(); maskMap.clear(); segCache.clear();
  P = null; sel = null;
  $('#editor').hidden = true; $('#home').hidden = false; renderHome();
}
$('#edBack').onclick = leaveEditor;
$('#projName').addEventListener('change', e => { P.name = e.target.value.trim() || P.name; e.target.value = P.name; scheduleSave(); });
$('#undo').onclick = () => { if (hi > 0) restore(hi - 1); };
$('#redo').onclick = () => { if (hi < hist.length - 1) restore(hi + 1); };
$('#playBtn').onclick = () => playing ? pause() : play();
$('#stepBack').onclick = () => { if (playing) pause(); seekTo(T - 1 / 30); };
$('#stepFwd').onclick = () => { if (playing) pause(); seekTo(T + 1 / 30); };
$('#exportBtn').onclick = exportFlow;
$('#tlAdd').onclick = () => openTool('add');
window.addEventListener('resize', () => { fitStage(); if (P) renderTimeline(); });
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  if (exporting) exporting.abort('hidden');
  else if (recording) stopVoice();
  else if (playing) pause();
  if (P) saveProject();
});

window.splashBack = () => {
  if (!$('#busy').hidden) return true;
  if (!$('#sheet').hidden) { closeSheet(); return true; }
  if (!$('#pro').hidden) { closePro(); return true; }
  if (P && sel) { select(null); return true; }
  if (P) { leaveEditor(); return true; }
  return false;
};

renderHome();
renderAcct(); loadInfo(); refreshMe();
window.__sc = { get P() { return P; }, set P(v) { P = v; }, addMediaRecord, newProject, makeClip, enterEditor, ensureWave, leaveEditor, get T() { return T; }, get sel() { return sel; }, media, els, layout, duration, clipAt, clipLen, srcAt, outAt, detectBeats, openTool, select, commit, draw, seekTo,
  runDenoise, runStabilize, runAutoframe, runTrack, reverseClip, freezeFrame, detachAudio, autoReel, autoDuck, setTf, tfAt, ovTf, denoiseSignal, normalize, setFx, play, pause, applyLayout, renderSfx, exportFlow, openPro, checkPaid, get acct() { return acct; } };
})();
