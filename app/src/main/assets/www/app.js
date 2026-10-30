/* SplashCut editor engine v2 */
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

const TF_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2';
const MP_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const SEG_MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

const RATIOS = { '9:16': [9, 16], '16:9': [16, 9], '1:1': [1, 1], '4:5': [4, 5], '3:4': [3, 4] };
const FILTERS = {
  none: ['Original', ''], vivid: ['Vivid', 'saturate(1.45) contrast(1.1)'], warm: ['Warm', 'sepia(.25) saturate(1.3) hue-rotate(-10deg)'],
  cool: ['Cool', 'saturate(1.1) hue-rotate(14deg) brightness(1.03)'], mono: ['Mono', 'grayscale(1) contrast(1.15)'],
  vintage: ['Vintage', 'sepia(.55) contrast(.95) brightness(1.05) saturate(.85)'], fade: ['Faded', 'contrast(.85) brightness(1.08) saturate(.8)'],
  cyber: ['Cyber', 'hue-rotate(-35deg) saturate(1.7) contrast(1.2)'], noir: ['Noir', 'grayscale(1) contrast(1.6) brightness(.9)'],
  dream: ['Dream', 'saturate(1.25) brightness(1.08) contrast(.92)'], lagos: ['Lagos', 'saturate(1.35) contrast(1.08) sepia(.15) hue-rotate(-6deg)'],
  ice: ['Ice', 'saturate(.7) hue-rotate(25deg) brightness(1.1) contrast(1.05)'], teal: ['Teal & orange', 'saturate(1.3) contrast(1.12) hue-rotate(-8deg) sepia(.12)'],
  matte: ['Matte', 'contrast(.8) brightness(1.1) saturate(.9) sepia(.08)'], pop: ['Pop', 'saturate(1.9) contrast(1.15)'], night: ['Night', 'brightness(.8) contrast(1.25) saturate(.8) hue-rotate(20deg)']
};
const TRANSITIONS = { none: 'None', fade: 'Fade', flash: 'Flash', zoom: 'Zoom punch', blur: 'Blur', spin: 'Spin', glitch: 'Glitch', slide: 'Push', wipe: 'Wipe', circle: 'Circle reveal' };
const CURVES = { none: ['None', null], montage: ['Montage', [2, 2, .35, .35, 2, 2]], hero: ['Hero', [1, 1, .25, .25, 1, 1]], bullet: ['Bullet', [2.5, .3, .3, 2.5]],
  jump: ['Jump cut', [1, 4, 1, 4, 1]], flashin: ['Flash in', [4, 2, 1, 1, 1]], flashout: ['Flash out', [1, 1, 1, 2, 4]], rampup: ['Ramp up', [.5, 1, 2, 3]], rampdown: ['Ramp down', [3, 2, 1, .5]] };
const FX = { vhs: 'VHS', rgb: 'RGB split', grain: 'Film grain', vignette: 'Vignette', glow: 'Glow', shake: 'Camera shake', pulse: 'Beat pulse', strobe: 'Beat strobe',
  mirror: 'Mirror', kaleido: 'Kaleidoscope', pixelate: 'Pixelate', letterbox: 'Cinema bars', lightleak: 'Light leak', oldfilm: 'Old film', negative: 'Negative',
  heat: 'Heat vision', duotone: 'Duotone', hue: 'Colour cycle', blur: 'Soft blur', motionblur: 'Motion blur' };
const FX_ICON = { vhs: '📼', rgb: '🌈', grain: '░', vignette: '◎', glow: '✨', shake: '〰', pulse: '💓', strobe: '⚡', mirror: '⇋', kaleido: '❖', pixelate: '▦', letterbox: '🎬',
  lightleak: '☀', oldfilm: '🎞', negative: '◑', heat: '🔥', duotone: '◐', hue: '🎨', blur: '◌', motionblur: '💨' };
const ANIM_IN = { none: 'None', fade: 'Fade', zoomin: 'Zoom in', zoomout: 'Zoom out', slidel: 'Slide left', slider: 'Slide right', slideu: 'Slide up', slided: 'Slide down', spin: 'Spin', bounce: 'Bounce', blur: 'Blur', swing: 'Swing', shake: 'Shake' };
const ANIM_COMBO = { none: 'None', pulse: 'Pulse', sway: 'Sway', float: 'Float', wobble: 'Wobble', heartbeat: 'Heartbeat', spin360: 'Spin 360' };
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
const ANIMS = { none: 'None', fade: 'Fade', pop: 'Pop', slide: 'Slide up', type: 'Typewriter', bounce: 'Bounce', zoom: 'Zoom', spin: 'Spin in', glitch: 'Glitch' };
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
    const r = indexedDB.open('splashcut', 1);
    r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('media', { keyPath: 'id' }); d.createObjectStore('projects', { keyPath: 'id' }); };
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
const delMediaRec = id => idb('media', 'readwrite', s => s.delete(id));
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
async function decodeMedia(m) {
  if (m.buf !== undefined) return m.buf;
  try { const ab = await m.blob.arrayBuffer(); m.buf = await actx().decodeAudioData(ab); }
  catch (e) { m.buf = null; }
  return m.buf;
}
function waveOf(m) {
  if (m.wave || !m.buf) return m.wave;
  const b = m.buf, W = 1200, H = 60, c = C(W, H), g = ctx2d(c), d = b.getChannelData(0), step = Math.max(1, Math.floor(d.length / W));
  g.fillStyle = 'rgba(255,255,255,.55)';
  for (let x = 0; x < W; x++) { let mx = 0; const o = x * step; for (let i = 0; i < step; i += 8) { const v = Math.abs(d[o + i] || 0); if (v > mx) mx = v; } const h = Math.max(1, mx * H * 0.9); g.fillRect(x, (H - h) / 2, 1, h); }
  m.wave = c.toDataURL('image/png'); return m.wave;
}
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
const DEF_TF = (s = 1) => ({ x: .5, y: .5, s, r: 0, o: 1 });
function newProject(ratio) {
  const d = new Date();
  return { v: 2, id: uid(), name: 'Project ' + d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    ratio, bg: 'blur', clips: [], layers: [], overlays: [], audio: [], beats: [], bpm: 0, duck: null, capStyle: 'classic', created: Date.now(), updated: Date.now(), thumb: null, dur: 0 };
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
function duration() {
  let d = layout();
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
const TFK = ['x', 'y', 's', 'r', 'o'];
function interpKf(kf, local, base) {
  if (!kf || !kf.length) return base;
  if (local <= kf[0].t) return kf[0];
  const last = kf[kf.length - 1]; if (local >= last.t) return last;
  for (let i = 0; i < kf.length - 1; i++) {
    const a = kf[i], b = kf[i + 1];
    if (local <= b.t) { const u = easeIO((local - a.t) / Math.max(1e-6, b.t - a.t)), o = {}; TFK.forEach(k => o[k] = lerp(a[k], b[k], u)); return o; }
  }
  return last;
}
const tfAt = (c, local) => interpKf(c.kf, local, c.tf);
function ovBase(o) { return { x: o.x, y: o.y, s: o.scale || 1, r: o.rot || 0, o: o.opacity == null ? 1 : o.opacity }; }
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
    if (patch.x != null) item.x = patch.x; if (patch.y != null) item.y = patch.y; if (patch.s != null) item.scale = patch.s; if (patch.r != null) item.rot = patch.r; if (patch.o != null) item.opacity = patch.o;
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
function updPlay() { const b = $('#playBtn'); b.textContent = playing ? '❚❚' : '▶'; b.classList.toggle('on', playing); b.setAttribute('aria-label', playing ? 'Pause' : 'Play'); }
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
  wg.save(); wg.translate(x, y); wg.rotate(rot * Math.PI / 180); wg.scale(sc, sc); wg.globalAlpha = clamp(op, 0, 1);
  wg.drawImage(prep, -G.dw / 2, -G.dh / 2, G.dw, G.dh); wg.restore(); wg.globalAlpha = 1;
  c._box = { x, y, w: G.dw * sc, h: G.dh * sc, rot };
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
  const fx = c.fx || {}, on = Object.keys(fx).filter(k => fx[k] > 0 && !['shake', 'pulse', 'hue', 'blur', 'motionblur'].includes(k));
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
  const W = cv.width, H = cv.height, t = T, bgc = P.bg === 'white' ? '#fff' : '#000';
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
      const k = tr ? 1 - Math.abs(p - 0.5) * 2 : 0;
      g.save();
      if (tr === 'zoom' || tr === 'spin') { const sc = 1 + k * .35; g.translate(W / 2, H / 2); if (tr === 'spin') g.rotate((p < .5 ? 1 : -1) * k * .35); g.scale(sc, sc); g.translate(-W / 2, -H / 2); }
      if (tr === 'slide') g.translate((p < .5 ? -1 : 1) * k * W * .25, 0);
      if (tr === 'blur') g.filter = `blur(${(k * 14).toFixed(1)}px)`;
      g.drawImage(frameC, 0, 0); g.restore(); g.filter = 'none';
      if (tr === 'fade' || tr === 'flash') { g.fillStyle = tr === 'fade' ? '#000' : '#fff'; g.globalAlpha = k; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
      if (tr === 'wipe' && k > 0) { const w = W * (p < .5 ? p * 2 : (1 - p) * 2); g.fillStyle = '#000'; g.fillRect(p < .5 ? W - w : 0, 0, w, H); }
      if (tr === 'circle' && k > 0) { g.save(); g.beginPath(); g.rect(0, 0, W, H); g.arc(W / 2, H / 2, Math.hypot(W, H) / 2 * (1 - k), 0, Math.PI * 2, true); g.fillStyle = '#000'; g.fill('evenodd'); g.restore(); }
      if (tr === 'glitch' && k > .05) {
        tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, W, H); tg.drawImage(cv, 0, 0);
        for (let i = 0; i < 7; i++) { const y = Math.random() * H, h = H * (.02 + Math.random() * .08), dx = (Math.random() - .5) * W * .12 * k; g.drawImage(tmpC, 0, y, W, h, dx, y, W, h); }
        g.globalCompositeOperation = 'screen'; g.globalAlpha = .35 * k; g.drawImage(tmpC, W * .012 * k, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      }
    }
  }
  for (const l of P.layers) if (t >= l._start && t < l._start + clipLen(l)) drawVI(g, l, t, W, H, false);
  drawOverlays(g, W, H, t);
  if (!exporting && !offline && sel && sel.type === 'layer') { const it = findSel(); if (it && it._box && t >= it._start && t < it._start + clipLen(it)) outline(g, it._box, H); }
}
function outline(ctx, b, H) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot * Math.PI / 180); ctx.setLineDash([H / 80, H / 140]); ctx.lineWidth = Math.max(2, H / 400); ctx.strokeStyle = '#ffd23f'; ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.restore(); }
function drawOverlays(ctx, W, H, t) {
  for (const o of P.overlays) {
    if (t < o.start || t >= o.end) { o._box = null; continue; }
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
    }
    if (o.anim && o.anim !== 'none') alpha *= outP;
    const px = (o.size || 6) / 100 * H, f = FONTS[o.font] || FONTS.classic;
    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.translate(tf.x * W + dx, tf.y * H + dy); ctx.rotate(rot * Math.PI / 180); ctx.scale(sc, sc);
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
    o._box = { x: tf.x * W + dx, y: tf.y * H + dy, w: boxW * sc, h: boxH * sc, rot };
    if (!exporting && !offline && sel && sel.type === 'ov' && sel.id === o.id) {
      ctx.globalAlpha = 1; ctx.setLineDash([px * 0.15, px * 0.1]); ctx.lineWidth = Math.max(2, H / 400) / sc; ctx.strokeStyle = '#ffd23f';
      ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH); ctx.setLineDash([]);
    }
    ctx.restore();
  }
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

/* ---- AI person segmentation ---- */
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
function followTimeline() { const x = Math.round(T * pps); if (Math.abs(tl.scrollLeft - x) > 0.5) { progScroll = x; tl.scrollLeft = x; } }
tl.addEventListener('scroll', () => {
  if (progScroll >= 0 && Math.abs(tl.scrollLeft - progScroll) <= 1) { progScroll = -1; return; }
  progScroll = -1;
  if (dragging || exporting || recording || offline) return;
  if (playing) pause();
  T = clamp(tl.scrollLeft / pps, 0, duration()); syncMedia(false); requestDraw(); updTime();
}, { passive: true });
function lanes(items, startOf, endOf) {
  const ends = [], out = {};
  [...items].sort((a, b) => startOf(a) - startOf(b)).forEach(it => {
    let l = ends.findIndex(e => e <= startOf(it) + 1e-3); if (l < 0) { l = ends.length; ends.push(0); }
    ends[l] = endOf(it); out[it.id] = l;
  });
  return { map: out, n: ends.length };
}
function kfMarks(item) {
  if (!sel || sel.id !== item.id || !item.kf || !item.kf.length) return '';
  return item.kf.map(f => `<i class="kfd" style="left:${f.t * pps}px"></i>`).join('');
}
function viTags(c) {
  return [c.speed !== 1 && c.kind !== 'image' ? `${c.speed}×` : '', hasCurve(c) ? '〜' : '', c.filter !== 'none' ? 'FX' : '', Object.keys(c.fx || {}).length ? '✺' : '',
    c.removeBg || c.blurBg ? 'AI' : '', c.stab ? 'STB' : '', c.frame ? 'AF' : '', c.mask && c.mask.type !== 'none' ? '◐' : '', c.chroma && c.chroma.on ? 'KEY' : '', c.reversed ? '⟲' : '', c.enhanced ? '✦' : '', c.muted ? '🔇' : ''].filter(Boolean);
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
  let h = '';
  P.clips.forEach((c, i) => {
    const m = media[c.mediaId], len = clipLen(c), isSel = sel && sel.type === 'clip' && sel.id === c.id, tags = viTags(c);
    h += `<div class="blk${isSel ? ' sel' : ''}" data-k="clip" data-id="${c.id}" style="left:${pd + c._start * pps}px;width:${Math.max(4, len * pps - 2)}px;${m && m.thumb ? `background-image:url(${m.thumb})` : ''}">
      ${tags.length ? `<span class="tags">${tags.map(x => `<span>${x}</span>`).join('')}</span>` : ''}<span class="lbl">${fmtS(len)}</span>${kfMarks(c)}
      <span class="hdl l" data-h="l"></span><span class="hdl r" data-h="r"></span></div>`;
    if (i < P.clips.length - 1) h += `<button type="button" class="trn${c.transition !== 'none' ? ' on' : ''}" data-trn="${c.id}" style="left:${pd + (c._start + len) * pps}px" aria-label="Transition">${c.transition !== 'none' ? '⧓' : '|'}</button>`;
  });
  if (!P.clips.length) h = `<div class="tl-empty">Tap + to add videos or photos</div>`;
  $('#trMain').innerHTML = h;
  const lane = (rowId, items, startOf, endOf, html) => {
    const L = lanes(items, startOf, endOf); let s = ''; for (let l = 0; l < L.n; l++) s += `<div class="lane" data-lane="${l}"></div>`;
    $(rowId).innerHTML = s;
    for (const it of items) $(`${rowId} .lane[data-lane="${L.map[it.id]}"]`).insertAdjacentHTML('beforeend', html(it));
  };
  lane('#trLy', P.layers, l => l.start, l => l.start + clipLen(l), l => {
    const m = media[l.mediaId], isSel = sel && sel.type === 'layer' && sel.id === l.id, tags = viTags(l);
    return `<div class="blk layer${isSel ? ' sel' : ''}" data-k="layer" data-id="${l.id}" style="left:${pd + l.start * pps}px;width:${Math.max(4, clipLen(l) * pps - 2)}px;${m && m.thumb ? `background-image:url(${m.thumb})` : ''}"><span class="lbl">▣ ${tags.join(' ')} ${fmtS(clipLen(l))}</span>${kfMarks(l)}<span class="hdl l" data-h="l"></span><span class="hdl r" data-h="r"></span></div>`;
  });
  lane('#trOv', P.overlays, o => o.start, o => o.end, o => {
    const isSel = sel && sel.type === 'ov' && sel.id === o.id, cls = o.type === 'sticker' ? 'sticker' : o.caption ? 'cap' : 'text';
    return `<div class="blk ${cls}${isSel ? ' sel' : ''}" data-k="ov" data-id="${o.id}" style="left:${pd + o.start * pps}px;width:${Math.max(4, (o.end - o.start) * pps - 2)}px"><span class="lbl">${o.track ? '⌖ ' : ''}${o.type === 'sticker' ? esc(o.text) : (o.caption ? 'CC ' : 'T ') + esc(o.text.replace(/\n/g, ' '))}</span>${kfMarks(o)}<span class="hdl l" data-h="l"></span><span class="hdl r" data-h="r"></span></div>`;
  });
  lane('#trAu', P.audio, a => a.start, a => a.start + auLen(a), a => {
    const m = media[a.mediaId], isSel = sel && sel.type === 'au' && sel.id === a.id;
    const wave = m && m.wave ? `background-image:url(${m.wave});background-size:${m.duration / a.rate * pps}px 100%;background-position:${-a.in / a.rate * pps}px 0;` : '';
    const icon = a.kind === 'voice' ? '🎙 ' : a.kind === 'extracted' ? '🎞 ' : '♪ ';
    return `<div class="blk ${a.kind}${isSel ? ' sel' : ''}" data-k="au" data-id="${a.id}" style="left:${pd + a.start * pps}px;width:${Math.max(4, auLen(a) * pps - 2)}px;${wave}"><span class="lbl">${icon}${esc(m ? m.name : 'Audio')}${a.afx && a.afx.preset !== 'none' ? ' · ' + AFX[a.afx.preset] : ''}</span><span class="hdl l" data-h="l"></span><span class="hdl r" data-h="r"></span></div>`;
  });
  updTime(); followTimeline();
}

/* timeline interactions */
let dragging = null;
$('#tlIn').addEventListener('pointerdown', ev => {
  if (ev.target.closest('[data-trn]')) return;
  const blk = ev.target.closest('.blk'); if (!blk) return;
  const k = blk.dataset.k, id = blk.dataset.id, h = ev.target.dataset.h;
  if (!(sel && sel.type === k && sel.id === id)) return;
  const item = findSel(); if (!item) return;
  ev.preventDefault();
  dragging = { k, h: h || 'move', x0: ev.clientX, orig: deep(clean(item)), item, moved: false };
  blk.setPointerCapture(ev.pointerId);
  if (playing) pause();
});
$('#tlIn').addEventListener('pointermove', ev => {
  if (!dragging) return;
  const d = dragging, dt = (ev.clientX - d.x0) / pps, o = d.orig, it = d.item;
  if (Math.abs(ev.clientX - d.x0) > 3) d.moved = true;
  if (!d.moved) return;
  if (d.k === 'clip' || d.k === 'layer') {
    const m = media[it.mediaId], max = m.kind === 'image' ? 3600 : m.duration, sp = it.kind === 'image' ? 1 : it.speed * (hasCurve(it) ? 1 / curveTab(it).total : 1);
    if (d.h === 'l') {
      if (it.kind === 'image') { it.out = clamp(o.out - dt, 0.3, 3600); if (d.k === 'layer') it.start = Math.max(0, o.start + (o.out - it.out)); }
      else { it.in = clamp(o.in + dt * sp, 0, it.out - 0.1); if (d.k === 'layer') it.start = Math.max(0, o.start + (it.in - o.in) / sp); }
      layout(); seekTo(it._start);
    } else if (d.h === 'r') { it.out = clamp(o.out + dt * sp, it.in + 0.1, max); layout(); seekTo(it._start + clipLen(it) - 0.01); }
    else if (d.k === 'layer') { it.start = Math.max(0, o.start + dt); layout(); seekTo(it.start); }
    else return;
  } else if (d.k === 'ov') {
    const len = o.end - o.start;
    if (d.h === 'l') it.start = clamp(o.start + dt, 0, o.end - 0.2);
    else if (d.h === 'r') it.end = Math.max(o.start + 0.2, o.end + dt);
    else { it.start = Math.max(0, o.start + dt); it.end = it.start + len; }
    seekTo(d.h === 'r' ? it.end - 0.01 : it.start);
  } else {
    const m = media[it.mediaId], r = it.rate || 1;
    if (d.h === 'l') { const nd = clamp(dt * r, -o.in, (o.out - o.in) - 0.2); it.in = o.in + nd; it.start = Math.max(0, o.start + nd / r); }
    else if (d.h === 'r') it.out = clamp(o.out + dt * r, o.in + 0.2, m.duration);
    else it.start = Math.max(0, o.start + dt);
    seekTo(d.h === 'r' ? it.start + auLen(it) - 0.01 : it.start);
  }
  renderTimeline();
});
function endDrag() { if (!dragging) return; const moved = dragging.moved; dragging = null; if (moved) commit(); }
$('#tlIn').addEventListener('pointerup', endDrag);
$('#tlIn').addEventListener('pointercancel', endDrag);
$('#tlIn').addEventListener('click', ev => {
  const trn = ev.target.closest('[data-trn]');
  if (trn) { select({ type: 'clip', id: trn.dataset.trn }); openTool('transition'); return; }
  const blk = ev.target.closest('.blk');
  if (!blk) { if (sel) select(null); return; }
  const k = blk.dataset.k, id = blk.dataset.id;
  if (sel && sel.type === k && sel.id === id) return;
  select({ type: k, id });
  const it = findSel(); layout();
  if (it) { const s = k === 'clip' || k === 'layer' ? it._start : it.start, e = k === 'clip' || k === 'layer' ? it._start + clipLen(it) : k === 'ov' ? it.end : it.start + auLen(it); if (T < s || T >= e) seekTo(s + 0.01); }
});
const pinch = { d0: 0, p0: 0 };
tl.addEventListener('touchstart', e => { if (e.touches.length === 2) { pinch.d0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); pinch.p0 = pps; } }, { passive: true });
tl.addEventListener('touchmove', e => {
  if (e.touches.length !== 2 || !pinch.d0) return;
  e.preventDefault();
  setZoom(pinch.p0 * Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY) / pinch.d0);
}, { passive: false });
tl.addEventListener('touchend', e => { if (e.touches.length < 2) pinch.d0 = 0; });
function setZoom(v) { pps = clamp(v, 8, 400); renderTimeline(); }
$('#zoomIn').onclick = () => setZoom(pps * 1.4);
$('#zoomOut').onclick = () => setZoom(pps / 1.4);

/* preview interactions */
const pv = { ptrs: new Map(), it: null, kind: null, start: null };
const canvasPt = ev => { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) * cv.width / r.width, y: (ev.clientY - r.top) * cv.height / r.height }; };
function curTf(it, kind) { const local = localOf(it); return kind === 'ov' ? ovTf(it, local) : tfAt(it, local); }
cv.addEventListener('pointerdown', ev => {
  if (exporting || offline) return;
  const pt = canvasPt(ev); pv.ptrs.set(ev.pointerId, pt); cv.setPointerCapture(ev.pointerId);
  if (pv.ptrs.size === 1) {
    let hit = null, kind = null;
    const ov = [...P.overlays].reverse().find(o => o._box && inBox(o._box, pt.x, pt.y));
    if (ov) { hit = ov; kind = 'ov'; }
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
  if (pv.ptrs.size === 1) { setTf(it, { x: clamp(s.tf.x + (pt.x - s.x) / cv.width, -0.5, 1.5), y: clamp(s.tf.y + (pt.y - s.y) / cv.height, -0.5, 1.5) }, local, ov); s.moved = true; }
  else if (pv.ptrs.size === 2 && s.d0) { const [a, b] = [...pv.ptrs.values()]; setTf(it, { s: clamp(s.tf.s * Math.hypot(a.x - b.x, a.y - b.y) / s.d0, 0.1, 8), r: s.tf.r + (Math.atan2(b.y - a.y, b.x - a.x) - s.a0) * 180 / Math.PI }, local, ov); s.moved = true; }
  requestDraw();
});
function pvEnd(ev) { pv.ptrs.delete(ev.pointerId); if (pv.ptrs.size === 0) { if (pv.it && pv.start && pv.start.moved) commit(); pv.it = null; } }
cv.addEventListener('pointerup', pvEnd); cv.addEventListener('pointercancel', pvEnd);
function inBox(b, x, y) { const a = -b.rot * Math.PI / 180, dx = x - b.x, dy = y - b.y, lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a); return Math.abs(lx) <= b.w / 2 + 12 && Math.abs(ly) <= b.h / 2 + 12; }

/* ================= Selection / toolbar ================= */
function select(s) { sel = s; closeSheet(); renderTimeline(); renderToolbar(); requestDraw(); }
const T_COMMON_VI = [['split', '⫶', 'Split'], ['speed', '⏩', 'Speed'], ['curve', '〜', 'Speed curve'], ['volume', '🔊', 'Volume'], ['anim', '✺', 'Animation'], ['transform', '✥', 'Transform'], ['crop', '⬚', 'Crop'], ['mask', '◐', 'Mask'], ['effects', '✨', 'Effects'], ['filters', '◑', 'Filters'], ['adjust', '☼', 'Adjust']];
const TOOLS = {
  root: [['edit', '✂', 'Edit'], ['add', '＋', 'Add media'], ['overlay', '▣', 'Overlay'], ['audio', '♪', 'Audio'], ['text', 'T', 'Text'], ['sticker', '☺', 'Stickers'], ['rootfx', '✨', 'Effects'], ['captions', 'CC', 'Captions', 'ai'], ['ai', '✦', 'AI Magic', 'ai'], ['format', '▭', 'Format'], ['snapshot', '📷', 'Snapshot']],
  clip: [['back', '‹', 'Back', 'back'], ...T_COMMON_VI, ['chroma', '🟩', 'Chroma key'], ['removebg', '👤', 'Remove BG', 'ai'], ['portrait', '◉', 'BG blur', 'ai'], ['relight', '💡', 'Relight', 'ai'], ['stabilize', '⌖', 'Stabilize', 'ai'], ['autoframe', '⛶', 'Auto frame', 'ai'], ['freeze', '❄', 'Freeze'], ['reverse', '⟲', 'Reverse'], ['detach', '🎞', 'Extract audio'], ['denoise', '🔇', 'Noise reduce', 'ai'], ['voicefx', '🎚', 'Voice effects'], ['transition', '⧓', 'Transition'], ['silence', '✂︎', 'Magic cut', 'ai'], ['enhance', '✦', 'Enhance', 'ai'], ['fit', '⤢', 'Fit / Fill'], ['rotate', '⟳', 'Rotate'], ['dup', '⧉', 'Duplicate'], ['left', '◀', 'Move left'], ['right', '▶', 'Move right'], ['delete', '🗑', 'Delete', 'danger']],
  layer: [['back', '‹', 'Back', 'back'], ...T_COMMON_VI, ['blend', '⧉', 'Blend'], ['chroma', '🟩', 'Chroma key'], ['removebg', '👤', 'Remove BG', 'ai'], ['relight', '💡', 'Relight', 'ai'], ['stabilize', '⌖', 'Stabilize', 'ai'], ['freeze', '❄', 'Freeze'], ['reverse', '⟲', 'Reverse'], ['detach', '🎞', 'Extract audio'], ['denoise', '🔇', 'Noise reduce', 'ai'], ['voicefx', '🎚', 'Voice effects'], ['enhance', '✦', 'Enhance', 'ai'], ['rotate', '⟳', 'Rotate'], ['tomain', '⤓', 'To main track'], ['dup', '⧉', 'Duplicate'], ['delete', '🗑', 'Delete', 'danger']],
  ov: [['back', '‹', 'Back', 'back'], ['editov', '✎', 'Edit'], ['anim', '✺', 'Animation'], ['transform', '✥', 'Transform'], ['track', '⌖', 'Track motion', 'ai'], ['split', '⫶', 'Split'], ['dup', '⧉', 'Duplicate'], ['delete', '🗑', 'Delete', 'danger']],
  au: [['back', '‹', 'Back', 'back'], ['avolume', '🔊', 'Volume'], ['aspeed', '⏩', 'Speed'], ['fade', '◢', 'Fade'], ['voicefx', '🎚', 'Voice effects'], ['denoise', '🔇', 'Noise reduce', 'ai'], ['beats', '♩', 'Beat sync', 'ai'], ['split', '⫶', 'Split'], ['dup', '⧉', 'Duplicate'], ['delete', '🗑', 'Delete', 'danger']]
};
function renderToolbar() {
  const set = TOOLS[sel ? sel.type : 'root'];
  $('#toolbar').innerHTML = set.map(([id, ic, lab, cls]) => `<button type="button" class="tool ${cls || ''}" data-tool="${id}"><span class="ic">${ic}</span>${lab}</button>`).join('');
}
$('#toolbar').addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (b) openTool(b.dataset.tool); });

/* ================= Sheets ================= */
let sheetClose = null;
function openSheet(title, html, bind, onClose) {
  if (sheetClose) { const f = sheetClose; sheetClose = null; f(); }
  $('#sheetTitle').textContent = title; $('#sheetBody').innerHTML = html;
  $('#sheet').hidden = false; $('#sheetBack').hidden = false;
  sheetClose = onClose || null;
  if (bind) bind($('#sheetBody'));
}
function closeSheet() { if ($('#sheet').hidden) return; $('#sheet').hidden = true; $('#sheetBack').hidden = true; const f = sheetClose; sheetClose = null; if (f) f(); }
$('#sheetDone').onclick = closeSheet;
$('#sheetBack').onclick = closeSheet;
function slider(id, label, min, max, step, val, fmtv = v => v) { return `<div class="row"><label for="${id}">${label}</label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"><output id="${id}O">${fmtv(+val)}</output></div>`; }
function bindSlider(root, id, fmtv, onInput) { const i = $('#' + id, root), o = $('#' + id + 'O', root); if (!i) return; i.addEventListener('input', () => { o.textContent = fmtv(+i.value); onInput(+i.value); requestDraw(); }); i.addEventListener('change', commit); }
const chipRow = (name, opts, cur, scroll) => `<div class="chips${scroll ? ' scroll' : ''}" data-chips="${name}">${Object.entries(opts).map(([k, v]) => `<button type="button" class="chip" data-v="${k}" aria-pressed="${k === String(cur)}">${Array.isArray(v) ? v[0] : v}</button>`).join('')}</div>`;
function bindChips(root, name, fn) { const box = $(`[data-chips="${name}"]`, root); if (!box) return; box.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; $$('[data-v]', box).forEach(x => x.setAttribute('aria-pressed', String(x === b))); fn(b.dataset.v); }); }
const toggleRow = (id, title, sub, on) => `<div class="toggle"><span><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span><button type="button" class="sw-tog" role="switch" id="${id}" aria-checked="${!!on}" aria-label="${title}"></button></div>`;
function bindToggle(root, id, fn) { const b = $('#' + id, root); if (!b) return; b.onclick = () => { const v = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', String(v)); fn(v); }; }
const pct = v => Math.round(v * 100) + '%';
const previewAt = (it, sec = 1.2) => { layout(); const s = it._start != null ? it._start : it.start; seekTo(s + 0.01); play(); setTimeout(() => { if (playing) pause(); }, sec * 1000); };

async function openTool(id) {
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
    case 'tomain': { P.layers = P.layers.filter(x => x !== it); const c = { ...it }; delete c.start; c.tf = DEF_TF(1); c.kf = []; c.blend = 'source-over'; const at = clipAt(T); P.clips.splice(at ? P.clips.indexOf(at) + 1 : P.clips.length, 0, c); commit(); select({ type: 'clip', id: c.id }); toast('Moved to the main track'); return; }
    case 'left': case 'right': { const i = P.clips.indexOf(it), j = id === 'left' ? i - 1 : i + 1; if (j < 0 || j >= P.clips.length) return; [P.clips[i], P.clips[j]] = [P.clips[j], P.clips[i]]; commit(); layout(); seekTo(it._start + 0.01); return; }
    case 'fit': it.fit = it.fit === 'cover' ? 'contain' : 'cover'; toast(it.fit === 'cover' ? 'Fill: the clip covers the frame' : 'Fit: the whole clip is visible'); commit(); return;
    case 'rotate': it.rot = ((it.rot || 0) + 90) % 360; commit(); return;
    case 'speed': return speedSheet(it);
    case 'curve': return curveSheet(it);
    case 'volume': return openSheet('Clip volume', `${slider('vol', 'Volume', 0, 2, 0.05, it.volume, pct)}<button type="button" class="btn" id="mute">${it.muted ? 'Unmute clip' : 'Mute clip'}</button>`,
      r => { bindSlider(r, 'vol', pct, v => { it.volume = v; it.muted = false; syncMedia(playing); }); $('#mute', r).onclick = e => { it.muted = !it.muted; e.target.textContent = it.muted ? 'Unmute clip' : 'Mute clip'; syncMedia(playing); commit(); }; });
    case 'avolume': return openSheet('Audio volume', slider('vol', 'Volume', 0, 2, 0.05, it.volume, pct), r => bindSlider(r, 'vol', pct, v => { it.volume = v; syncMedia(playing); }));
    case 'aspeed': return openSheet('Audio speed', slider('asp', 'Speed', .5, 2, .05, it.rate || 1, v => v.toFixed(2) + '×') + '<p class="note">Voices keep their normal pitch.</p>', r => bindSlider(r, 'asp', v => v.toFixed(2) + '×', v => { it.rate = v; renderTimeline(); syncMedia(playing); }));
    case 'fade': return openSheet('Fade', slider('fi', 'Fade in', 0, 5, 0.1, it.fadeIn || 0, v => v.toFixed(1) + 's') + slider('fo', 'Fade out', 0, 5, 0.1, it.fadeOut || 0, v => v.toFixed(1) + 's'),
      r => { bindSlider(r, 'fi', v => v.toFixed(1) + 's', v => { it.fadeIn = v; }); bindSlider(r, 'fo', v => v.toFixed(1) + 's', v => { it.fadeOut = v; }); });
    case 'filters': return filtersSheet(it);
    case 'adjust': return adjustSheet(it);
    case 'transition': return openSheet('Transition to next clip', chipRow('tr', TRANSITIONS, it.transition) + '<button type="button" class="btn" id="trAll">Apply to all cuts</button><p class="note">The effect plays across the cut, half a second in total.</p>',
      r => { bindChips(r, 'tr', v => { it.transition = v; commit(); layout(); seekTo(Math.max(0, it._start + clipLen(it) - 0.6)); play(); setTimeout(() => { if (playing) pause(); }, 1100); }); $('#trAll', r).onclick = () => { P.clips.forEach((c, i) => { if (i < P.clips.length - 1) c.transition = it.transition; }); commit(); toast('Applied to every cut'); }; });
    case 'silence': return silenceCut(it);
    case 'enhance': return enhance([it]);
    case 'portrait': return segToggle(it, 'blurBg', 'Background blur');
    case 'removebg': return segToggle(it, 'removeBg', 'Background removal');
    case 'editov': return it.type === 'sticker' ? stickerSheet(it) : textSheet(it);
    case 'anim': return sel.type === 'ov' ? openSheet('Animation', chipRow('an', ANIMS, it.anim || 'none') + '<p class="note">In-animations play when the item appears; every animated item fades out at its end.</p>', r => bindChips(r, 'an', v => { it.anim = v; commit(); previewAt(it, 1.3); })) : animSheet(it);
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
  }
}

/* ---- edit operations ---- */
function splitSel() {
  const it = findSel(); if (!it) return;
  layout();
  if (sel.type === 'clip' || sel.type === 'layer') {
    if (hasCurve(it)) { toast('Remove the speed curve before splitting this clip'); return; }
    const local = T - it._start, src = srcAt(it, local);
    if (src <= it.in + 0.05 || src >= it.out - 0.05) { toast('Move the playhead inside the clip to split it'); return; }
    const b = { ...deep(clean(it)), id: uid(), in: src };
    if (it.kind === 'image') { b.in = 0; b.out = it.out - local; it.out = local; }
    else it.out = src;
    b.kf = (it.kf || []).filter(k => k.t >= local).map(k => ({ ...k, t: +(k.t - local).toFixed(3) })); it.kf = (it.kf || []).filter(k => k.t < local);
    const cut = sr => sr ? { ...sr, x: sr.x.slice(Math.floor((src - it.in) * sr.fps)), y: sr.y.slice(Math.floor((src - it.in) * sr.fps)) } : null;
    b.stab = cut(it.stab); b.frame = cut(it.frame);
    if (sel.type === 'clip') { b.transition = it.transition; it.transition = 'none'; P.clips.splice(P.clips.indexOf(it) + 1, 0, b); }
    else { b.start = T; P.layers.push(b); }
  } else if (sel.type === 'ov') {
    if (T <= it.start + 0.05 || T >= it.end - 0.05) { toast('Move the playhead inside the item to split it'); return; }
    const b = { ...deep(clean(it)), id: uid(), start: T }; it.end = T; P.overlays.push(b);
  } else {
    const local = (T - it.start) * it.rate; if (local <= 0.05 || local >= it.out - it.in - 0.05) { toast('Move the playhead inside the audio to split it'); return; }
    const b = { ...deep(clean(it)), id: uid(), start: T, in: it.in + local, fadeIn: 0 }; it.out = it.in + local; it.fadeOut = 0; P.audio.push(b);
  }
  commit(); toast('Split');
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
  decodeMedia(m).then(() => { waveOf(m); renderTimeline(); });
  return a;
}
function audioSheet() {
  openSheet('Audio', `<div class="card"><h4>♪ Add music</h4><p>Pick a song or sound from your phone. It starts at 0:00 and is trimmed to your video's length.</p><button type="button" class="btn main" id="aMusic">Choose audio file</button></div>
    <div class="card"><h4>🎙 Record voiceover</h4><p>Narrate over your video. Recording starts at the playhead.</p><button type="button" class="btn" id="aVoice">Open recorder</button></div>
    <div class="card"><h4>🎞 Extract audio from a clip</h4><p>Puts the sound of the clip at the playhead on its own track so you can move, cut or clean it.</p><button type="button" class="btn" id="aExt">Extract audio</button></div>
    <div class="card"><h4>🔉 Auto duck <span class="badge">AI</span></h4><p>Lowers the music automatically whenever someone speaks.</p><button type="button" class="btn" id="aDuck">${P.duck && P.duck.on ? 'Turn off auto duck' : 'Turn on auto duck'}</button></div>`,
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
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
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
    if (dur < 0.3) { toast('Recording too short'); return; }
    const m = await addMediaRecord('audio', 'Voiceover', new Blob(r.chunks, { type: r.mime.split(';')[0] }), dur);
    const a = addAudioItem(m, 'voice', r.start); a.out = m.duration;
    closeSheet(); commit(); select({ type: 'au', id: a.id }); toast(`Voiceover added (${dur.toFixed(1)}s)`);
  };
  r.mr.stop();
  const b = $('#recBtn'); if (b) b.classList.remove('on');
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
  openSheet(fresh ? 'Add text' : 'Edit text', `<textarea class="txt" id="txIn" aria-label="Text">${esc(o.text)}</textarea>
    <div class="lab">Font</div>${chipRow('font', FONTS, o.font, true)}
    <div class="lab">Colour</div><div class="swatches" id="txCol">${COLORS.map(c => `<button type="button" class="swatch" style="background:${c}" data-c="${c}" aria-label="${c}" aria-pressed="${c === o.color}"></button>`).join('')}</div>
    <div class="chips" id="txSty">${[['stroke', 'Outline'], ['box', 'Label box'], ['glow', 'Neon glow'], ['shadow', 'Shadow']].map(([k, n]) => `<button type="button" class="chip" data-s="${k}" aria-pressed="${!!o[k]}">${n}</button>`).join('')}</div>
    <div class="lab">Box colour</div><div class="swatches" id="txBox">${['', '#000000', '#ffffff', '#e11d2e', '#0b3d91', '#ffd23f', '#36d7ff', '#ff5a87'].map(c => `<button type="button" class="swatch" style="background:${c || 'linear-gradient(135deg,#000 50%,#fff 50%)'}" data-c="${c}" aria-label="${c || 'Auto'}" aria-pressed="${(o.boxColor || '') === c}"></button>`).join('')}</div>
    ${slider('txSz', 'Size', 2, 20, 0.5, o.size, v => v.toFixed(1))}${slider('txSp', 'Spacing', -5, 40, 1, o.spacing || 0, v => v)}${slider('txOp', 'Opacity', 0, 1, .01, o.opacity == null ? 1 : o.opacity, pct)}
    <p class="note">Drag the text on the preview to move it. Use two fingers to resize and rotate.</p>`,
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
    <button type="button" class="btn" id="fAll">Apply to all clips</button>`,
  r => {
    $('#fg', r).onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; c.filter = b.dataset.f; $$('[data-f]', r).forEach(x => x.setAttribute('aria-pressed', String(x === b))); commit(); };
    $('#fAll', r).onclick = () => { vis().forEach(x => { x.filter = c.filter; }); commit(); toast('Filter applied to all clips'); };
  });
}
function adjustSheet(it) {
  const tfmt = v => (v > 0 ? 'warm ' : v < 0 ? 'cool ' : '') + Math.abs(Math.round(v * 100)), nfmt = v => (v > 0 ? 'magenta ' : v < 0 ? 'green ' : '') + Math.abs(Math.round(v * 100));
  openSheet('Adjust', slider('ab', 'Brightness', 0.4, 1.8, 0.02, it.adj.b, v => v.toFixed(2)) + slider('ac', 'Contrast', 0.4, 1.8, 0.02, it.adj.c, v => v.toFixed(2)) + slider('as', 'Saturation', 0, 2.5, 0.02, it.adj.s, v => v.toFixed(2)) +
    slider('at', 'Temperature', -1, 1, .02, it.adj.temp, tfmt) + slider('ai2', 'Tint', -1, 1, .02, it.adj.tint, nfmt) +
    slider('av', 'Vignette', 0, 1, .02, (it.fx && it.fx.vignette) || 0, pct) + slider('ag', 'Grain', 0, 1, .02, (it.fx && it.fx.grain) || 0, pct) + '<button type="button" class="btn" id="adjR">Reset</button>',
  r => {
    bindSlider(r, 'ab', v => v.toFixed(2), v => { it.adj.b = v; }); bindSlider(r, 'ac', v => v.toFixed(2), v => { it.adj.c = v; }); bindSlider(r, 'as', v => v.toFixed(2), v => { it.adj.s = v; });
    bindSlider(r, 'at', tfmt, v => { it.adj.temp = v; }); bindSlider(r, 'ai2', nfmt, v => { it.adj.tint = v; });
    bindSlider(r, 'av', pct, v => setFx(it, 'vignette', v)); bindSlider(r, 'ag', pct, v => setFx(it, 'grain', v));
    $('#adjR', r).onclick = () => { it.adj = { b: 1, c: 1, s: 1, temp: 0, tint: 0 }; delete it.fx.vignette; delete it.fx.grain; it.enhanced = false; commit(); adjustSheet(it); };
  });
}
function setFx(it, k, v) { it.fx = it.fx || {}; if (v > 0) it.fx[k] = +v.toFixed(2); else delete it.fx[k]; }
function effectsSheet(it) {
  let cur = Object.keys(it.fx || {})[0] || 'vhs';
  const grid = () => `<div class="fgrid" id="fxg">${Object.entries(FX).map(([k, n]) => `<button type="button" class="fopt fxb" data-fx="${k}" aria-pressed="${k === cur}"><span class="sw">${FX_ICON[k]}</span>${n}${it.fx && it.fx[k] ? '<i class="on-dot"></i>' : ''}</button>`).join('')}</div>`;
  openSheet('Effects', `<div id="fxWrap">${grid()}</div><div id="fxCtl"></div><p class="note">Stack as many effects as you like. Beat pulse and Beat strobe follow the music's beat when Beat sync has run.</p>`, r => {
    const bindGrid = () => { $('#fxg', r).onclick = e => { const b = e.target.closest('[data-fx]'); if (!b) return; cur = b.dataset.fx; $$('[data-fx]', r).forEach(x => x.setAttribute('aria-pressed', String(x === b))); ctl(); }; };
    const ctl = () => {
      const on = !!(it.fx && it.fx[cur]);
      $('#fxCtl', r).innerHTML = `<div class="row"><label>${FX[cur]}</label><button type="button" class="btn ${on ? 'danger' : 'main'}" id="fxOn">${on ? 'Remove' : 'Apply'}</button></div>${on ? slider('fxI', 'Intensity', .05, 1, .01, it.fx[cur], pct) : ''}`;
      $('#fxOn', r).onclick = () => { setFx(it, cur, on ? 0 : .6); commit(); $('#fxWrap', r).innerHTML = grid(); bindGrid(); ctl(); if (!on) previewAt(it, 1.2); };
      bindSlider(r, 'fxI', pct, v => setFx(it, cur, v));
    };
    bindGrid(); ctl();
  });
}
function speedSheet(it) {
  openSheet('Speed', `${slider('sp', 'Speed', 0.1, 10, 0.05, it.speed, v => v.toFixed(2) + '×')}<div class="chips" id="spP">${[0.1, 0.25, 0.5, 1, 1.5, 2, 3, 5, 10].map(v => `<button type="button" class="chip" data-s="${v}" aria-pressed="${v === it.speed}">${v}×</button>`).join('')}</div><p class="note">From 0.1× slow motion to 10× time-lapse. Voices keep their normal pitch.</p>`,
  r => {
    if (it.kind === 'image') { r.innerHTML = '<p class="note">Photos have no speed. Drag the clip edges to change how long a photo shows.</p>'; return; }
    bindSlider(r, 'sp', v => v.toFixed(2) + '×', v => { it.speed = v; layout(); renderTimeline(); });
    $('#spP', r).onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; it.speed = +b.dataset.s; $('#sp', r).value = it.speed; $('#spO', r).textContent = it.speed.toFixed(2) + '×'; $$('[data-s]', r).forEach(x => x.setAttribute('aria-pressed', String(x === b))); commit(); };
  });
}
function curveSheet(it) {
  if (it.kind === 'image') { toast('Speed curves work on video clips'); return; }
  openSheet('Speed curve', chipRow('cv', Object.fromEntries(Object.entries(CURVES).map(([k, v]) => [k, v[0]])), it.curve, false) + '<p class="note">Curves speed the clip up and slow it down smoothly. Montage and Hero are great for action moments.</p>',
    r => bindChips(r, 'cv', v => { it.curve = v; commit(); previewAt(it, Math.min(4, clipLen(it))); }));
}
function animSheet(it) {
  let tab = 'in';
  const body = () => {
    const opts = tab === 'combo' ? ANIM_COMBO : ANIM_IN, cur = it.anim[tab];
    return `<div class="seg2" id="anTab">${[['in', 'In'], ['out', 'Out'], ['combo', 'Loop']].map(([k, n]) => `<button type="button" data-t="${k}" aria-pressed="${k === tab}">${n}</button>`).join('')}</div>${chipRow('an', opts, cur)}${tab !== 'combo' ? slider('anD', 'Duration', .2, 2, .1, tab === 'in' ? it.anim.dIn : it.anim.dOut, v => v.toFixed(1) + 's') : ''}`;
  };
  const bind = r => {
    $('#anTab', r).onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; tab = b.dataset.t; r.innerHTML = body(); bind(r); };
    bindChips(r, 'an', v => { it.anim[tab] = v; commit(); layout(); const len = clipLen(it); if (tab === 'out') { seekTo(it._start + Math.max(0, len - 1.2)); play(); setTimeout(() => { if (playing) pause(); }, 1200); } else previewAt(it, 1.2); });
    bindSlider(r, 'anD', v => v.toFixed(1) + 's', v => { if (tab === 'in') it.anim.dIn = v; else it.anim.dOut = v; });
  };
  openSheet('Animation', body(), bind);
}
function transformSheet(it) {
  const ov = sel.type === 'ov';
  const L = () => localOf(it);
  const render = r => {
    const local = L(), tf = ov ? ovTf(it, local) : tfAt(it, local), n = (it.kf || []).length, atKf = (it.kf || []).some(k => Math.abs(k.t - local) < .05);
    r.innerHTML = slider('tx', 'Position X', -0.5, 1.5, .005, tf.x, v => Math.round(v * 100)) + slider('ty', 'Position Y', -0.5, 1.5, .005, tf.y, v => Math.round(v * 100)) + slider('ts', 'Scale', .1, 5, .01, tf.s, v => Math.round(v * 100) + '%') + slider('tr', 'Rotation', -180, 180, 1, tf.r, v => Math.round(v) + '°') + slider('to', 'Opacity', 0, 1, .01, tf.o, pct) +
      `<div class="kfbar"><button type="button" class="btn ${atKf ? '' : 'main'}" id="kfAdd">${atKf ? '◆ Keyframe here' : '◆ Add keyframe'}</button>${atKf ? '<button type="button" class="btn danger" id="kfDel">Delete keyframe</button>' : ''}${n ? '<button type="button" class="btn" id="kfClr">Clear all</button>' : ''}<button type="button" class="btn" id="tfR">Reset</button></div>
      <p class="note">${n ? `${n} keyframe${n > 1 ? 's' : ''}. Move the playhead, change a value and a keyframe is added there. Movement between keyframes is smooth.` : 'Add a keyframe, move the playhead, then change position, scale or rotation to animate. You can also drag and pinch on the preview.'}</p>`;
    bindSlider(r, 'tx', v => Math.round(v * 100), v => setTf(it, { x: v }, L(), ov)); bindSlider(r, 'ty', v => Math.round(v * 100), v => setTf(it, { y: v }, L(), ov));
    bindSlider(r, 'ts', v => Math.round(v * 100) + '%', v => setTf(it, { s: v }, L(), ov)); bindSlider(r, 'tr', v => Math.round(v) + '°', v => setTf(it, { r: v }, L(), ov)); bindSlider(r, 'to', pct, v => setTf(it, { o: v }, L(), ov));
    $('#kfAdd', r).onclick = () => { const l = L(), cur = ov ? ovTf(it, l) : tfAt(it, l); it.kf = it.kf || []; if (!it.kf.some(k => Math.abs(k.t - l) < .05)) { const k = { t: +l.toFixed(3) }; TFK.forEach(q => k[q] = cur[q]); it.kf.push(k); it.kf.sort((a, b) => a.t - b.t); } commit(); render(r); };
    const d = $('#kfDel', r); if (d) d.onclick = () => { const l = L(); it.kf = it.kf.filter(k => Math.abs(k.t - l) >= .05); commit(); render(r); };
    const c2 = $('#kfClr', r); if (c2) c2.onclick = () => { it.kf = []; commit(); render(r); };
    $('#tfR', r).onclick = () => { it.kf = []; if (ov) { it.x = .5; it.y = .5; it.scale = 1; it.rot = 0; it.opacity = 1; } else it.tf = DEF_TF(sel.type === 'layer' ? .55 : 1); commit(); render(r); };
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
  openSheet('AI Relight', chipRow('rl', RELIGHT, rl.type, true) + slider('rla', 'Intensity', 0, 1, .01, rl.amt, pct) + toggleRow('rlp', 'Light people only', 'Uses person detection (downloads a 1 MB model once)', rl.person),
  r => {
    const ensure = () => { it.relight = it.relight || deep(rl); return it.relight; };
    bindChips(r, 'rl', v => { ensure().type = v; if (v === 'none') it.relight = null; commit(); });
    bindSlider(r, 'rla', pct, v => { ensure().amt = v; });
    bindToggle(r, 'rlp', async v => { if (v && !(await withSeg())) { $('#rlp', r).setAttribute('aria-checked', 'false'); return; } ensure().person = v; commit(); });
  });
}
async function withSeg() {
  if (seg.state === 'ready') return true;
  busy.show('Loading vision AI', 'Downloading the person detection model'); busy.pct(.3);
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

/* ================= AI and processing tools ================= */
function aiSheet() {
  openSheet('✦ AI Magic', `
    <div class="card"><h4>🎬 Auto reel <span class="badge">AI edit</span></h4><p>Finds the most active, loudest moments in your clips and cuts a highlight reel.</p><div class="kfbar"><button type="button" class="btn ai" data-ai="reel15">15 s reel</button><button type="button" class="btn ai" data-ai="reel30">30 s reel</button><button type="button" class="btn ai" data-ai="reel60">60 s reel</button></div></div>
    <div class="card"><h4>CC Auto captions <span class="badge">Speech AI</span></h4><p>Transcribes speech in your clips and adds timed, styled captions. Runs on your phone.</p><button type="button" class="btn ai" data-ai="cap">Generate captions</button></div>
    <div class="card"><h4>♩ Beat sync <span class="badge">Rhythm AI</span></h4><p>Finds the beat of your music, marks it and cuts your clips on the beat.</p><button type="button" class="btn ai" data-ai="beat">Sync clips to music</button></div>
    <div class="card"><h4>✂ Magic cut <span class="badge">Audio AI</span></h4><p>Removes silent pauses from talking clips for a tight jump-cut edit.</p><button type="button" class="btn ai" data-ai="sil">Cut silences in all clips</button></div>
    <div class="card"><h4>🔇 Noise reduction <span class="badge">Audio AI</span></h4><p>Removes hiss, hum, wind and room noise from the clip at the playhead.</p><button type="button" class="btn ai" data-ai="dn">Clean audio</button></div>
    <div class="card"><h4>🔉 Auto duck <span class="badge">Audio AI</span></h4><p>Lowers the music whenever someone speaks.</p><button type="button" class="btn ai" data-ai="duck">${P.duck && P.duck.on ? 'Turn off' : 'Turn on'}</button></div>
    <div class="card"><h4>⌖ Stabilize <span class="badge">Vision</span></h4><p>Smooths out handheld shake on the clip at the playhead.</p><button type="button" class="btn ai" data-ai="stab">Stabilize clip</button></div>
    <div class="card"><h4>⛶ Auto frame <span class="badge">Vision</span></h4><p>Follows the action so wide videos look right in 9:16.</p><button type="button" class="btn ai" data-ai="af">Auto frame clip</button></div>
    <div class="card"><h4>👤 Remove background · ◉ Blur background · 💡 Relight <span class="badge">Vision AI</span></h4><p>Select a clip, then use Remove BG, BG blur or Relight in its tools.</p></div>
    <div class="card"><h4>✦ Smart enhance <span class="badge">Vision</span></h4><p>Balances light and colour on every clip.</p><button type="button" class="btn ai" data-ai="enh">Enhance all clips</button></div>
    <p class="note">Captions and person detection download their AI models the first time (about 40 MB and 1 MB). Everything else works offline.</p>`,
  r => r.addEventListener('click', e => {
    const b = e.target.closest('[data-ai]'); if (!b) return;
    const a = b.dataset.ai, c = clipAt(T);
    if (a.startsWith('reel')) { closeSheet(); autoReel(+a.slice(4)); }
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
  decodeMedia(m).then(() => { waveOf(m); renderTimeline(); });
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
  decodeMedia(nm).then(() => { waveOf(nm); renderTimeline(); });
  commit(); toast('Noise removed. Play to hear the difference.');
}

/* --- Voice and audio effects --- */
function voiceFxSheet(it) {
  const f = v => (v > 0 ? '+' : '') + v + ' dB';
  openSheet('Voice & audio effects', chipRow('vf', AFX, it.afx.preset, true) + '<div class="lab">Equalizer</div>' + slider('eqL', 'Bass', -12, 12, 1, it.afx.low, f) + slider('eqM', 'Mid', -12, 12, 1, it.afx.mid, f) + slider('eqH', 'Treble', -12, 12, 1, it.afx.high, f) + '<button type="button" class="btn" id="eqR">Reset</button>',
  r => {
    bindChips(r, 'vf', v => { it.afx.preset = v; commit(); syncMedia(playing); if (!playing) previewAt(it, 2); });
    bindSlider(r, 'eqL', f, v => { it.afx.low = v; syncMedia(playing); }); bindSlider(r, 'eqM', f, v => { it.afx.mid = v; syncMedia(playing); }); bindSlider(r, 'eqH', f, v => { it.afx.high = v; syncMedia(playing); });
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
  openSheet('Track motion', (o.track ? '<p class="note">This item follows a tracked object. It is marked ⌖ on the timeline.</p><button type="button" class="btn danger full" id="tkOff">Remove tracking</button>' : '<p class="note">Place the text or sticker on the thing you want it to follow (a face, a ball, a car), then start tracking. It follows that spot until the item ends.</p>') + '<button type="button" class="btn ai full" id="tkGo">' + (o.track ? 'Track again' : 'Start tracking') + '</button>',
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
async function autoReel(target) {
  const vids = P.clips.filter(c => c.kind === 'video' && !hasCurve(c));
  if (!vids.length) { toast('Auto reel needs video clips'); return; }
  cancellable('Auto reel', 'Finding the best moments');
  const cands = []; let i = 0;
  for (const c of vids) {
    if (cancelFlag) break;
    const m = media[c.mediaId], S = await sampleGray(m, c.in, c.out, 2, 48, p => busy.pct((i + p * .8) / vids.length)), buf = await decodeMedia(m);
    const mot = S.frames.map((f, k) => { if (!k) return 0; const A = S.frames[k - 1]; let s = 0; for (let j = 0; j < f.length; j += 3) s += Math.abs(f[j] - A[j]); return s / (f.length / 3); });
    const rms = buf ? rmsWindows(buf, c.in, c.out, .5) : [];
    const mM = Math.max(1e-6, ...mot), mR = Math.max(1e-6, ...rms), win = Math.min(2, c.out - c.in);
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
  busy.hide();
  if (!merged.length) { toast('Clips are too short for a reel'); return; }
  P.clips = merged.map(p => ({ ...deep(clean(p.c)), id: uid(), in: p.s, out: p.e, speed: 1, kf: [], stab: null, frame: null, transition: 'none' }));
  sel = null; commit(); renderToolbar(); seekTo(0);
  toast(`Made a ${Math.round(merged.reduce((t, p) => t + p.e - p.s, 0))} s reel from ${merged.length} moments. Undo brings your full edit back.`, 3500);
}

/* --- Auto captions --- */
let asr = null, asrModel = '';
function captionsSheet() {
  const has = P.overlays.some(o => o.caption);
  openSheet('Auto captions', `<div class="row"><label for="cLang">Speech</label><select class="sel" id="cLang"><option value="Xenova/whisper-tiny.en">English (fastest, most accurate)</option><option value="Xenova/whisper-tiny">Other languages (auto-detect)</option></select></div>
    <div class="lab">Caption style</div>${chipRow('cs', { classic: 'Classic', boxed: 'Boxed', neon: 'Neon', pop: 'Pop yellow' }, P.capStyle || 'classic')}
    <button type="button" class="btn ai full" id="cGo">${has ? 'Regenerate captions' : 'Generate captions'}</button>
    ${has ? '<button type="button" class="btn danger full" id="cDel">Remove all captions</button>' : ''}
    <p class="note">Speech recognition runs on your phone. The first run downloads the speech model (about 40 MB) and needs internet once.</p>`,
  r => {
    bindChips(r, 'cs', v => { P.capStyle = v; const st = CAP_STYLES[v]; P.overlays.filter(o => o.caption).forEach(o => Object.assign(o, st)); commit(); });
    $('#cGo', r).onclick = () => runCaptions($('#cLang', r).value);
    const d = $('#cDel', r); if (d) d.onclick = () => { P.overlays = P.overlays.filter(o => !o.caption); sel = null; commit(); renderToolbar(); closeSheet(); toast('Captions removed'); };
  });
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
    const st = CAP_STYLES[P.capStyle || 'classic'], caps = []; layout();
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
          if (te - ts > 0.15) caps.push(normOv({ id: uid(), type: 'text', caption: true, text: gtxt, start: +ts.toFixed(2), end: +te.toFixed(2), x: 0.5, y: 0.78, size: 5.2, scale: 1, rot: 0, anim: 'none', ...st }));
        });
      }
    }
    busy.hide();
    if (cancelFlag) return;
    if (!caps.length) { toast('No speech found'); return; }
    P.overlays = P.overlays.filter(o => !o.caption).concat(caps);
    closeSheet(); commit(); toast(`Added ${caps.length} captions. Tap one on the timeline to fix a word.`, 3500);
  } catch (e) {
    console.warn(e); busy.hide();
    toast('Captions failed: ' + (navigator.onLine ? 'the speech model could not run on this phone' : 'connect to the internet for the first download'), 4500);
  }
}

/* ================= Format, snapshot, export ================= */
const PREVIEW_LONG = 960;
function formatSheet() {
  openSheet('Format', `<div class="lab">Aspect ratio</div>${chipRow('ratio', { '9:16': '9:16 TikTok · Reels', '16:9': '16:9 YouTube', '1:1': '1:1 Square', '4:5': '4:5 Instagram', '3:4': '3:4' }, P.ratio)}
    <div class="lab">Background behind fitted clips</div>${chipRow('bg', { blur: 'Blurred clip', black: 'Black', white: 'White' }, P.bg)}`,
  r => { bindChips(r, 'ratio', v => { P.ratio = v; setCanvasSize(PREVIEW_LONG); commit(); }); bindChips(r, 'bg', v => { P.bg = v; commit(); }); });
}
async function snapshot() {
  if (playing) pause(); const keepSel = sel; sel = null; draw();
  const blob = await new Promise(r => cv.toBlob(r, 'image/png')); sel = keepSel; requestDraw();
  const uri = await saveBlob(blob, `SplashCut_${Date.now().toString(36)}.png`, () => {});
  toast(uri === false ? 'Could not save the photo' : NATIVE ? 'Frame saved to Pictures/SplashCut' : 'Frame downloaded');
}
function exportSheet() {
  if (!P.clips.length && !P.overlays.length && !P.layers.length) { toast('Add some clips first'); return; }
  if (playing) pause();
  const mime = pickMime(), ext = mime.includes('mp4') ? 'MP4' : 'WebM';
  openSheet('Export', `<div class="lab">Resolution</div>${chipRow('res', { 720: '720p · smaller file', 1080: '1080p · full HD' }, '1080')}
    <div class="lab">Frame rate</div>${chipRow('fps', { 24: '24 fps', 30: '30 fps', 60: '60 fps' }, '30')}
    <div class="lab">Quality</div>${chipRow('q', { std: 'Standard', high: 'High' }, 'high')}
    <p class="note">Length ${fmt(duration())}. Exports as ${ext} and saves to Movies/SplashCut in your gallery. Export plays your video in real time, so keep the screen on.</p>
    <button type="button" class="btn main full" id="xGo">Export video</button>`,
  r => { let res = 1080, fps = 30, q = 'high'; bindChips(r, 'res', v => { res = +v; }); bindChips(r, 'fps', v => { fps = +v; }); bindChips(r, 'q', v => { q = v; }); $('#xGo', r).onclick = () => { closeSheet(); runExport(res, fps, q); }; });
}
async function runExport(res, fps, q) {
  const mime = pickMime();
  if (!mime || !cv.captureStream) { toast('This phone cannot record video from the editor. Update Android System WebView from the Play Store.', 5000); return; }
  actx().resume();
  sel = null; renderToolbar();
  setCanvasSize(res === 720 ? 1280 : 1920);
  T = 0; syncMedia(false);
  layout(); await waitFrameReady(vis().filter(c => c._start < .5), 2500);
  draw();
  const stream = cv.captureStream(fps);
  const at = recDest.stream.getAudioTracks()[0]; if (at) stream.addTrack(at);
  const vb = (res === 720 ? 6e6 : 12e6) * (q === 'high' ? 1.4 : 1) * (fps === 60 ? 1.5 : 1);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: vb, audioBitsPerSecond: 192000 });
  const chunks = []; rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  let cancelled = false;
  const D = duration();
  busy.show('Exporting', `${res}p · ${fps} fps · ${fmt(D)}`, () => { cancelled = true; exporting && exporting.finish(); });
  exporting = {
    progress: p => busy.pct(p * 0.92),
    finish: () => {
      if (!exporting) return; exporting = null;
      playing = false; cancelAnimationFrame(raf);
      for (const e of Object.values(els)) if (!e.img) e.el.pause();
      rec.onstop = async () => {
        stream.getVideoTracks().forEach(t => t.stop());
        setCanvasSize(PREVIEW_LONG); T = 0; syncMedia(false); draw(); renderTimeline(); updPlay();
        if (cancelled) { busy.hide(); toast('Export cancelled'); return; }
        const type = mime.split(';')[0], blob = new Blob(chunks, { type });
        const name = `SplashCut_${(P.name || 'video').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 30)}_${Date.now().toString(36)}.${type.includes('mp4') ? 'mp4' : 'webm'}`;
        busy.text('Saving to your gallery'); busy.pct(0.95);
        const uri = await saveBlob(blob, name, p => busy.pct(0.92 + p * 0.08));
        busy.pct(1);
        $('#busyTitle').textContent = uri !== false ? 'Saved' : 'Could not save';
        busy.text(uri !== false ? `${name} · ${(blob.size / 1048576).toFixed(1)} MB${NATIVE ? ' · Movies/SplashCut' : ''}` : 'Free some storage space and try again.');
        busy.actions(`${uri && NATIVE && NATIVE.share ? '<button type="button" class="btn ai" id="xShare">Share</button>' : ''}<button type="button" class="btn" id="xDone">Done</button>`);
        const sh = $('#xShare'); if (sh) sh.onclick = () => NATIVE.share(uri, type);
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
      const uri = NATIVE.endSave(id); return uri || false;
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    return '';
  } catch (e) { console.warn(e); return false; }
}

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
  for (const a of P.audio) { const m = media[a.mediaId]; if (m && !m.wave) decodeMedia(m).then(() => { waveOf(m); renderTimeline(); }); }
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
  prepMap.clear(); accMap.clear(); maskMap.clear(); segCache.clear();
  P = null; sel = null;
  $('#editor').hidden = true; $('#home').hidden = false; renderHome();
}
$('#edBack').onclick = leaveEditor;
$('#projName').addEventListener('change', e => { P.name = e.target.value.trim() || P.name; e.target.value = P.name; scheduleSave(); });
$('#undo').onclick = () => { if (hi > 0) restore(hi - 1); };
$('#redo').onclick = () => { if (hi < hist.length - 1) restore(hi + 1); };
$('#playBtn').onclick = () => playing ? pause() : play();
$('#exportBtn').onclick = exportSheet;
$('#tlAdd').onclick = () => openTool('add');
window.addEventListener('resize', () => { fitStage(); if (P) renderTimeline(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && playing && !exporting && !recording) pause(); if (document.hidden && P) saveProject(); });

window.splashBack = () => {
  if (!$('#busy').hidden) return true;
  if (!$('#sheet').hidden) { closeSheet(); return true; }
  if (P && sel) { select(null); return true; }
  if (P) { leaveEditor(); return true; }
  return false;
};

renderHome();
window.__sc = { get P() { return P; }, get T() { return T; }, get sel() { return sel; }, media, els, layout, duration, clipAt, clipLen, srcAt, outAt, detectBeats, openTool, select, commit, draw, seekTo,
  runDenoise, runStabilize, runAutoframe, runTrack, reverseClip, freezeFrame, detachAudio, autoReel, autoDuck, setTf, tfAt, ovTf, denoiseSignal, normalize, setFx, play, pause };
})();
