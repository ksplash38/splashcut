/* SplashCut editor engine */
(() => {
'use strict';

/* ================= Utilities ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = t => { t = Math.max(0, t || 0); const m = Math.floor(t / 60), s = Math.floor(t % 60), d = Math.floor((t * 10) % 10); return `${m}:${String(s).padStart(2, '0')}.${d}`; };
const fmtS = t => t < 60 ? `${t.toFixed(1)}s` : fmt(t);
const NATIVE = window.SplashNative || null;
const sleep = ms => new Promise(r => setTimeout(r, ms));

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
  ice: ['Ice', 'saturate(.7) hue-rotate(25deg) brightness(1.1) contrast(1.05)']
};
const TRANSITIONS = { none: 'None', fade: 'Fade', flash: 'Flash', zoom: 'Zoom punch', blur: 'Blur', spin: 'Spin', glitch: 'Glitch' };
const FONTS = {
  classic: ['Classic', '800', 'Roboto,"Segoe UI",system-ui,sans-serif'], serif: ['Serif', 'italic 700', 'Georgia,"Noto Serif",serif'],
  mono: ['Mono', '700', '"Roboto Mono",ui-monospace,monospace'], cond: ['Condensed', '700', '"sans-serif-condensed","Roboto Condensed","Arial Narrow",sans-serif'],
  hand: ['Script', '700', '"Dancing Script",cursive'], light: ['Light', '300', 'Roboto,"Segoe UI",system-ui,sans-serif']
};
const COLORS = ['#ffffff', '#000000', '#ffd23f', '#36d7ff', '#ff5a87', '#3ddc97', '#9a8bff', '#ff8a3d', '#ff3b3b'];
const ANIMS = { none: 'None', fade: 'Fade', pop: 'Pop', slide: 'Slide up', type: 'Typewriter', bounce: 'Bounce' };
const CAP_STYLES = {
  classic: { color: '#ffffff', stroke: true, box: false, glow: false, font: 'classic' },
  boxed: { color: '#ffffff', stroke: false, box: true, glow: false, font: 'classic' },
  neon: { color: '#36d7ff', stroke: false, box: false, glow: true, font: 'cond' },
  pop: { color: '#ffd23f', stroke: true, box: false, glow: false, font: 'classic' }
};
const STICKERS = {
  'Faces': '😀 😂 🤣 😍 🥰 😎 🤩 🥳 😭 😱 🤯 😤 🙄 😴 🤔 🫡 😇 🤑 🥶 🤡',
  'Hands': '👍 👎 👏 🙌 🙏 💪 👀 ✌️ 🤞 👉 👈 👆 👇 🫶 🤝 ✍️',
  'Hype': '🔥 💯 ✨ ⭐ 🌟 ⚡ 💥 🎉 🎊 🚀 💎 👑 🏆 🎯 ✅ ❌ ❗ ❓ 💸 💰',
  'Love': '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💔 💕 💖 💘',
  'Life': '⚽ 🏀 🎮 🎧 🎤 🎬 📸 🍕 🍔 🍟 🍗 🥤 ☕ 🎂 🌍 🌴 🌧️ ☀️ 🌙 🚗 ✈️ 🇳🇬'
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

/* ================= Media runtime ================= */
const media = {}; // id -> runtime media
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
  const c = document.createElement('canvas'); c.height = H; c.width = Math.max(1, Math.round(H * (w || 16) / (h || 9)));
  try { c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.72); } catch (e) { return null; }
}
// Files from browser recorders (WebM) often have no stored length; seeking far past the end makes the browser compute it.
function fixDuration(el, fallback) {
  if (isFinite(el.duration) && el.duration > 0) return Promise.resolve(el.duration);
  return new Promise(res => {
    const done = () => { el.removeEventListener('durationchange', on); clearTimeout(t); const d = isFinite(el.duration) && el.duration > 0 ? el.duration : (fallback || 0); el.onseeked = null; try { el.currentTime = 0; } catch (_) {} res(d); };
    const on = () => { if (isFinite(el.duration) && el.duration > 0) done(); };
    const t = setTimeout(done, 5000);
    el.addEventListener('durationchange', on);
    try { el.currentTime = 1e7; } catch (_) { done(); }
  });
}
function probe(m, rec) {
  return new Promise(res => {
    let done = false; const fin = () => { if (!done) { done = true; res(); } };
    setTimeout(fin, 10000);
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
async function importFiles(files) {
  const out = [];
  for (const f of files) {
    const kind = kindOf(f); if (!kind) { toast(`Skipped ${f.name}: unsupported file type`); continue; }
    const rec = { id: uid(), kind, name: f.name || kind, blob: f, created: Date.now() };
    try { await putMedia(rec); } catch (e) { toast('Not enough storage space to import ' + (f.name || 'file')); continue; }
    const m = await loadMedia(rec.id);
    if (!m || (kind !== 'image' && !(m.duration > 0))) { toast(`Could not read ${f.name}`); continue; }
    rec.duration = m.duration; rec.w = m.w; rec.h = m.h; rec.thumb = m.thumb; putMedia(rec).catch(() => {});
    out.push(m);
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
  const b = m.buf, W = 1200, H = 60, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), d = b.getChannelData(0), step = Math.max(1, Math.floor(d.length / W));
  g.fillStyle = 'rgba(255,255,255,.55)';
  for (let x = 0; x < W; x++) { let mx = 0; const o = x * step; for (let i = 0; i < step; i += 8) { const v = Math.abs(d[o + i] || 0); if (v > mx) mx = v; } const h = Math.max(1, mx * H * 0.9); g.fillRect(x, (H - h) / 2, 1, h); }
  m.wave = c.toDataURL('image/png'); return m.wave;
}

/* ================= Project model ================= */
let P = null; // current project
let sel = null; // {type:'clip'|'ov'|'au', id}
function newProject(ratio) {
  return { id: uid(), name: 'Project ' + new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' ' + new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    ratio, bg: 'blur', clips: [], overlays: [], audio: [], beats: [], bpm: 0, created: Date.now(), updated: Date.now(), thumb: null, dur: 0 };
}
const clipLen = c => c.kind === 'image' ? (c.out - c.in) : (c.out - c.in) / c.speed;
function layout() { let t = 0; for (const c of P.clips) { c._start = t; t += clipLen(c); } P._main = t; return t; }
function duration() {
  let d = layout();
  for (const o of P.overlays) d = Math.max(d, o.end);
  for (const a of P.audio) d = Math.max(d, a.start + (a.out - a.in));
  return d;
}
const clipAt = t => { layout(); return P.clips.find(c => t >= c._start - 1e-6 && t < c._start + clipLen(c) - 1e-6) || null; };
const findSel = () => !sel ? null : sel.type === 'clip' ? P.clips.find(c => c.id === sel.id) : sel.type === 'ov' ? P.overlays.find(o => o.id === sel.id) : P.audio.find(a => a.id === sel.id);
function makeClip(m) {
  return { id: uid(), mediaId: m.id, kind: m.kind, in: 0, out: m.kind === 'image' ? 3 : m.duration, speed: 1, volume: 1, muted: false,
    filter: 'none', adj: { b: 1, c: 1, s: 1 }, transition: 'none', fit: 'contain', rot: 0, blurBg: false, enhanced: false };
}
function clean(p) { return JSON.parse(JSON.stringify(p, (k, v) => k.startsWith('_') ? undefined : v)); }

/* history */
let hist = [], hi = -1, saveT = 0;
function resetHistory() { hist = [JSON.stringify(clean(P))]; hi = 0; updUndo(); }
function commit() {
  const s = JSON.stringify(clean(P));
  if (hist[hi] === s) return;
  hist = hist.slice(0, hi + 1); hist.push(s); if (hist.length > 60) hist.shift(); hi = hist.length - 1;
  updUndo(); scheduleSave(); renderTimeline(); requestDraw();
}
function restore(i) {
  hi = i; const keep = P.id; P = JSON.parse(hist[hi]); P.id = keep;
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

/* ================= Per-item media elements ================= */
const els = {}; // itemId -> {el, gain, mid, img}
function elFor(item, m) {
  let e = els[item.id];
  if (e && e.mid === m.id) return e;
  if (e) dropEl(item.id);
  if (m.kind === 'image') { e = { img: true, el: m.img, mid: m.id }; els[item.id] = e; return e; }
  const el = document.createElement(m.kind === 'audio' ? 'audio' : 'video');
  el.preload = 'auto'; el.playsInline = true; el.src = m.url; el.preservesPitch = true;
  el.addEventListener('seeked', () => { if (!playing) requestDraw(); });
  el.addEventListener('loadeddata', () => { if (!playing) requestDraw(); });
  const g = actx().createGain();
  try { const src = AC.createMediaElementSource(el); src.connect(g); g.connect(master); } catch (err) { /* already connected */ }
  e = { el, gain: g, mid: m.id }; els[item.id] = e; return e;
}
function dropEl(id) {
  const e = els[id]; if (!e) return;
  if (!e.img) { try { e.el.pause(); e.el.removeAttribute('src'); e.el.load(); e.gain.disconnect(); } catch (_) {} }
  delete els[id];
}
function syncEls() {
  const ids = new Set([...P.clips.map(c => c.id), ...P.audio.map(a => a.id)]);
  for (const id of Object.keys(els)) if (!ids.has(id)) dropEl(id);
}
function setGain(e, v) { if (!e.gain) return; const g = e.gain.gain; if (Math.abs(g.value - v) > 0.001) g.setTargetAtTime(v, AC.currentTime, 0.02); }

/* ================= Playback ================= */
let T = 0, playing = false, playPerf = 0, playT = 0, raf = 0, exporting = null, recording = null;
function syncMedia(on) {
  const t = T; layout();
  for (const c of P.clips) {
    const m = media[c.mediaId]; if (!m || m.kind === 'image') continue;
    const e = elFor(c, m), len = clipLen(c), v = e.el;
    const active = t >= c._start - 1e-6 && t < c._start + len - 1e-6;
    if (active) {
      const want = c.in + (t - c._start) * c.speed;
      if (v.playbackRate !== c.speed) v.playbackRate = c.speed;
      setGain(e, c.muted ? 0 : c.volume);
      if (on) { if (Math.abs(v.currentTime - want) > 0.35) v.currentTime = want; if (v.paused) v.play().catch(() => {}); }
      else { if (!v.paused) v.pause(); if (Math.abs(v.currentTime - want) > 0.03) v.currentTime = want; }
    } else {
      if (!v.paused) v.pause();
      if (t < c._start && c._start - t < 1.5 && Math.abs(v.currentTime - c.in) > 0.05 && !v.seeking) v.currentTime = c.in;
    }
  }
  for (const a of P.audio) {
    const m = media[a.mediaId]; if (!m) continue;
    const e = elFor(a, m), v = e.el, len = a.out - a.in;
    const active = t >= a.start && t < a.start + len;
    if (active) {
      const local = t - a.start, want = a.in + local;
      let g = a.volume;
      if (a.fadeIn > 0) g *= clamp(local / a.fadeIn, 0, 1);
      if (a.fadeOut > 0) g *= clamp((len - local) / a.fadeOut, 0, 1);
      setGain(e, recording && recording.muteBed ? 0 : g);
      if (on) { if (Math.abs(v.currentTime - want) > 0.3) v.currentTime = want; if (v.paused) v.play().catch(() => {}); }
      else { if (!v.paused) v.pause(); if (Math.abs(v.currentTime - want) > 0.05) v.currentTime = want; }
    } else { if (!v.paused) v.pause(); }
  }
  if (recording && recording.muteBed) for (const c of P.clips) { const e = els[c.id]; if (e && !e.img) setGain(e, 0); }
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

/* ================= Renderer ================= */
const cv = $('#cv'), g = cv.getContext('2d');
const frameC = document.createElement('canvas'), fg = frameC.getContext('2d');
const tmpC = document.createElement('canvas'), tg = tmpC.getContext('2d');
let drawReq = 0;
function requestDraw() { if (playing || drawReq) return; drawReq = requestAnimationFrame(() => { drawReq = 0; draw(); }); }
function setCanvasSize(longSide) {
  const [a, b] = RATIOS[P.ratio] || [9, 16];
  let W, H; if (a >= b) { W = longSide; H = Math.round(longSide * b / a); } else { H = longSide; W = Math.round(longSide * a / b); }
  W -= W % 2; H -= H % 2;
  for (const c of [cv, frameC, tmpC]) { c.width = W; c.height = H; }
  fitStage();
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
function drawMediaTo(ctx, src, sw, sh, fit, rot, W, H) {
  if (!sw || !sh) return;
  const r = ((rot || 0) % 360 + 360) % 360, swapped = r === 90 || r === 270;
  const iw = swapped ? sh : sw, ih = swapped ? sw : sh;
  const k = fit === 'cover' ? Math.max(W / iw, H / ih) : Math.min(W / iw, H / ih);
  const dw = sw * k, dh = sh * k;
  ctx.save(); ctx.translate(W / 2, H / 2); if (r) ctx.rotate(r * Math.PI / 180);
  ctx.drawImage(src, -dw / 2, -dh / 2, dw, dh); ctx.restore();
}
function srcOf(c) {
  const m = media[c.mediaId]; if (!m) return null;
  if (m.kind === 'image') return m.img ? { el: m.img, w: m.w, h: m.h } : null;
  const e = els[c.id]; if (!e || e.el.readyState < 2) return null;
  return { el: e.el, w: e.el.videoWidth, h: e.el.videoHeight };
}
function draw() {
  if (!P) return;
  const W = cv.width, H = cv.height, t = T;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.filter = 'none';
  g.fillStyle = P.bg === 'white' ? '#fff' : '#000'; g.fillRect(0, 0, W, H);
  const c = clipAt(t);
  if (c) {
    const s = srcOf(c);
    if (s) {
      // compose clip into frame canvas
      fg.setTransform(1, 0, 0, 1, 0, 0); fg.filter = 'none';
      fg.fillStyle = P.bg === 'white' ? '#fff' : '#000'; fg.fillRect(0, 0, W, H);
      if (P.bg === 'blur' && c.fit !== 'cover') { fg.filter = 'blur(22px) brightness(.62) ' + (filterOf(c) === 'none' ? '' : filterOf(c)); drawMediaTo(fg, s.el, s.w, s.h, 'cover', c.rot, W, H); fg.filter = 'none'; }
      fg.filter = filterOf(c); drawMediaTo(fg, s.el, s.w, s.h, c.fit, c.rot, W, H); fg.filter = 'none';
      if (c.blurBg && seg.state === 'ready') portrait(W, H);
      // transitions
      const len = clipLen(c), D = 0.5, idx = P.clips.indexOf(c), prev = P.clips[idx - 1];
      let tr = null, p = 0;
      if (c.transition !== 'none' && idx < P.clips.length - 1 && c._start + len - t < D / 2) { tr = c.transition; p = 0.5 - (c._start + len - t) / D; }
      else if (prev && prev.transition !== 'none' && t - c._start < D / 2) { tr = prev.transition; p = 0.5 + (t - c._start) / D; }
      const k = tr ? 1 - Math.abs(p - 0.5) * 2 : 0; // 0..1 peak at cut
      g.save();
      if (tr === 'zoom' || tr === 'spin') { const sc = 1 + k * 0.35; g.translate(W / 2, H / 2); if (tr === 'spin') g.rotate((p < 0.5 ? 1 : -1) * k * 0.35); g.scale(sc, sc); g.translate(-W / 2, -H / 2); }
      if (tr === 'blur') g.filter = `blur(${(k * 14).toFixed(1)}px)`;
      g.drawImage(frameC, 0, 0); g.restore(); g.filter = 'none';
      if (tr === 'fade' || tr === 'flash') { g.fillStyle = tr === 'fade' ? '#000' : '#fff'; g.globalAlpha = k; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
      if (tr === 'glitch' && k > 0.05) {
        tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, W, H); tg.drawImage(cv, 0, 0);
        for (let i = 0; i < 7; i++) { const y = Math.random() * H, h = H * (0.02 + Math.random() * 0.08), dx = (Math.random() - .5) * W * 0.12 * k; g.drawImage(tmpC, 0, y, W, h, dx, y, W, h); }
        g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.35 * k; g.drawImage(tmpC, W * 0.012 * k, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      }
    }
  }
  drawOverlays(g, W, H, t);
}
function drawOverlays(ctx, W, H, t) {
  for (const o of P.overlays) {
    if (t < o.start || t >= o.end) { o._box = null; continue; }
    const local = t - o.start, len = o.end - o.start;
    let alpha = 1, sc = o.scale || 1, dy = 0, text = o.text;
    const inP = clamp(local / 0.4, 0, 1), outP = clamp((len - local) / 0.25, 0, 1);
    switch (o.anim) {
      case 'fade': alpha = inP; break;
      case 'pop': { const e = inP; sc *= e < 1 ? 0.4 + 0.6 * (1 - Math.pow(1 - e, 3)) + Math.sin(e * Math.PI) * 0.12 : 1; alpha = Math.min(1, inP * 2); break; }
      case 'slide': dy = (1 - (1 - Math.pow(1 - inP, 3))) * H * 0.06; alpha = inP; break;
      case 'bounce': dy = -Math.abs(Math.sin(local * 4)) * H * 0.015 * Math.max(0, 1 - local / 3); break;
      case 'type': if (o.type === 'text') { const n = [...o.text]; text = n.slice(0, Math.ceil(n.length * clamp(local / clamp(n.length * 0.05, 0.5, 2), 0, 1))).join(''); } break;
    }
    if (o.anim !== 'none') alpha *= outP;
    const px = (o.size || 6) / 100 * H;
    const f = FONTS[o.font] || FONTS.classic;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(o.x * W, o.y * H + dy); ctx.rotate((o.rot || 0) * Math.PI / 180); ctx.scale(sc, sc);
    ctx.font = o.type === 'sticker' ? `${px}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif` : `${f[1]} ${px}px ${f[2]}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lines = String(text || ' ').split('\n'), lh = px * 1.18;
    const wMax = Math.max(...lines.map(l => ctx.measureText(l || ' ').width), px * 0.5);
    const boxW = wMax + px * 0.7, boxH = lh * lines.length + px * 0.35;
    if (o.type === 'text' && o.box) { ctx.fillStyle = o.color === '#000000' ? 'rgba(255,255,255,.88)' : 'rgba(0,0,0,.72)'; roundRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, px * 0.25); ctx.fill(); }
    lines.forEach((l, i) => {
      const y = (i - (lines.length - 1) / 2) * lh;
      if (o.type === 'text') {
        if (o.glow) { ctx.shadowColor = o.color; ctx.shadowBlur = px * 0.7; }
        else if (!o.box) { ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = px * 0.12; ctx.shadowOffsetY = px * 0.04; }
        if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = px * 0.16; ctx.strokeStyle = o.color === '#000000' ? '#fff' : '#000'; ctx.strokeText(l, 0, y); }
        ctx.fillStyle = o.color; ctx.fillText(l, 0, y);
        if (o.glow) { ctx.shadowBlur = px * 0.25; ctx.fillText(l, 0, y); }
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      } else ctx.fillText(l, 0, y);
    });
    o._box = { x: o.x * W, y: o.y * H + dy, w: boxW * sc, h: boxH * sc, rot: o.rot || 0 };
    if (!exporting && sel && sel.type === 'ov' && sel.id === o.id) {
      ctx.globalAlpha = 1; ctx.setLineDash([px * 0.15, px * 0.1]); ctx.lineWidth = Math.max(2, H / 400) / sc; ctx.strokeStyle = '#ffd23f';
      ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH); ctx.setLineDash([]);
    }
    ctx.restore();
  }
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

/* ---- AI portrait (background blur) ---- */
const seg = { state: 'off', s: null, small: null, maskC: null, lastTs: 0, frame: 0 };
async function loadSeg() {
  if (seg.state === 'ready') return true;
  if (seg.state === 'loading') { while (seg.state === 'loading') await sleep(200); return seg.state === 'ready'; }
  seg.state = 'loading';
  try {
    const V = await import(MP_URL + '/vision_bundle.mjs');
    const files = await V.FilesetResolver.forVisionTasks(MP_URL + '/wasm');
    const make = delegate => V.ImageSegmenter.createFromOptions(files, { baseOptions: { modelAssetPath: SEG_MODEL, delegate }, runningMode: 'VIDEO', outputConfidenceMasks: true, outputCategoryMask: false });
    try { seg.s = await make('GPU'); } catch (e) { seg.s = await make('CPU'); }
    seg.small = document.createElement('canvas'); seg.small.width = seg.small.height = 256;
    seg.maskC = document.createElement('canvas'); seg.maskC.width = seg.maskC.height = 256;
    seg.state = 'ready'; return true;
  } catch (e) { seg.state = 'off'; console.warn(e); return false; }
}
function portrait(W, H) {
  try {
    seg.frame++;
    if (seg.frame % 2 === 1 || exporting) {
      seg.small.getContext('2d').drawImage(frameC, 0, 0, 256, 256);
      let ts = performance.now(); if (ts <= seg.lastTs) ts = seg.lastTs + 1; seg.lastTs = ts;
      seg.s.segmentForVideo(seg.small, ts, r => {
        const ms = r.confidenceMasks; if (!ms || !ms.length) return;
        const m = ms.length > 1 ? ms[ms.length - 1] : ms[0];
        const f = m.getAsFloat32Array(), mw = m.width, mh = m.height;
        if (seg.maskC.width !== mw) { seg.maskC.width = mw; seg.maskC.height = mh; }
        const mc = seg.maskC.getContext('2d'), id = mc.createImageData(mw, mh);
        for (let i = 0; i < f.length; i++) { const a = clamp((f[i] - 0.25) / 0.5, 0, 1) * 255; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = a; }
        mc.putImageData(id, 0, 0);
      });
    }
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, W, H); tg.drawImage(frameC, 0, 0);
    tg.globalCompositeOperation = 'destination-in'; tg.drawImage(seg.maskC, 0, 0, W, H); tg.globalCompositeOperation = 'source-over';
    fg.filter = `blur(${Math.round(W / 60)}px)`; fg.drawImage(frameC, 0, 0); fg.filter = 'none';
    fg.drawImage(tmpC, 0, 0);
  } catch (e) { /* keep sharp frame */ }
}

/* ================= Timeline ================= */
let pps = 60; // pixels per second
const tl = $('#tl');
let progScroll = -1;
const pad = () => Math.round(tl.clientWidth / 2);
function followTimeline() { const x = Math.round(T * pps); if (Math.abs(tl.scrollLeft - x) > 0.5) { progScroll = x; tl.scrollLeft = x; } }
tl.addEventListener('scroll', () => {
  if (progScroll >= 0 && Math.abs(tl.scrollLeft - progScroll) <= 1) { progScroll = -1; return; }
  progScroll = -1;
  if (dragging || exporting || recording) return;
  if (playing) pause();
  T = clamp(tl.scrollLeft / pps, 0, duration()); syncMedia(false); requestDraw(); updTime();
}, { passive: true });
function lanes(items, startOf, endOf) {
  const ends = []; const out = {};
  [...items].sort((a, b) => startOf(a) - startOf(b)).forEach(it => {
    let l = ends.findIndex(e => e <= startOf(it) + 1e-3); if (l < 0) { l = ends.length; ends.push(0); }
    ends[l] = endOf(it); out[it.id] = l;
  });
  return { map: out, n: ends.length };
}
function renderTimeline() {
  if (!P) return;
  const D = duration(), pd = pad(), wpx = Math.max(1, D * pps);
  $('#tlIn').style.width = (wpx + pd * 2) + 'px';
  // ruler
  const step = pps >= 160 ? 0.5 : pps >= 70 ? 1 : pps >= 30 ? 2 : pps >= 14 ? 5 : 10;
  let r = '';
  for (let s = 0; s <= D + 0.001; s += step) { const x = pd + s * pps, maj = Math.abs(s / (step * 2) - Math.round(s / (step * 2))) < 1e-6; r += `<i class="${maj ? 'maj' : ''}" style="left:${x}px"></i>`; if (maj) r += `<span style="left:${x}px">${s < 60 ? s.toFixed(step < 1 ? 1 : 0) + 's' : fmt(s).slice(0, -2)}</span>`; }
  for (const b of P.beats) if (b <= D) r += `<span class="beat" style="left:${pd + b * pps}px"></span>`;
  $('#ruler').innerHTML = r;
  // main
  layout();
  let h = '';
  P.clips.forEach((c, i) => {
    const m = media[c.mediaId], len = clipLen(c), isSel = sel && sel.type === 'clip' && sel.id === c.id;
    const tags = [c.speed !== 1 && c.kind !== 'image' ? `${c.speed}×` : '', c.filter !== 'none' ? 'FX' : '', c.blurBg ? 'AI' : '', c.enhanced ? '✦' : '', c.muted ? '🔇' : ''].filter(Boolean);
    h += `<div class="blk${isSel ? ' sel' : ''}" data-k="clip" data-id="${c.id}" style="left:${pd + c._start * pps}px;width:${Math.max(4, len * pps - 2)}px;${m && m.thumb ? `background-image:url(${m.thumb})` : ''}">
      ${tags.length ? `<span class="tags">${tags.map(x => `<span>${x}</span>`).join('')}</span>` : ''}<span class="lbl">${fmtS(len)}</span>
      <span class="hdl l" data-h="l"></span><span class="hdl r" data-h="r"></span></div>`;
    if (i < P.clips.length - 1) h += `<button type="button" class="trn${c.transition !== 'none' ? ' on' : ''}" data-trn="${c.id}" style="left:${pd + (c._start + len) * pps}px" aria-label="Transition">${c.transition !== 'none' ? '⧓' : '|'}</button>`;
  });
  if (!P.clips.length) h = `<div class="tl-empty">Tap + to add videos or photos</div>`;
  $('#trMain').innerHTML = h;
  // overlays
  const L = lanes(P.overlays, o => o.start, o => o.end);
  let ov = ''; for (let l = 0; l < L.n; l++) ov += `<div class="lane" data-lane="${l}"></div>`;
  $('#trOv').innerHTML = ov;
  for (const o of P.overlays) {
    const lane = $(`#trOv .lane[data-lane="${L.map[o.id]}"]`), isSel = sel && sel.type === 'ov' && sel.id === o.id;
    const cls = o.type === 'sticker' ? 'sticker' : o.caption ? 'cap' : 'text';
    lane.insertAdjacentHTML('beforeend', `<div class="blk ${cls}${isSel ? ' sel' : ''}" data-k="ov" data-id="${o.id}" style="left:${pd + o.start * pps}px;width:${Math.max(4, (o.end - o.start) * pps - 2)}px"><span class="lbl">${o.type === 'sticker' ? esc(o.text) : (o.caption ? 'CC ' : 'T ') + esc(o.text.replace(/\n/g, ' '))}</span><span class="hdl l" data-h="l"></span><span class="hdl r" data-h="r"></span></div>`);
  }
  // audio
  const A = lanes(P.audio, a => a.start, a => a.start + a.out - a.in);
  let au = ''; for (let l = 0; l < A.n; l++) au += `<div class="lane" data-lane="${l}"></div>`;
  $('#trAu').innerHTML = au;
  for (const a of P.audio) {
    const m = media[a.mediaId], lane = $(`#trAu .lane[data-lane="${A.map[a.id]}"]`), isSel = sel && sel.type === 'au' && sel.id === a.id;
    const wave = m && m.wave ? `background-image:url(${m.wave});background-size:${m.duration * pps}px 100%;background-position:${-a.in * pps}px 0;` : '';
    lane.insertAdjacentHTML('beforeend', `<div class="blk ${a.kind}${isSel ? ' sel' : ''}" data-k="au" data-id="${a.id}" style="left:${pd + a.start * pps}px;width:${Math.max(4, (a.out - a.in) * pps - 2)}px;${wave}"><span class="lbl">${a.kind === 'voice' ? '🎙 ' : '♪ '}${esc(m ? m.name : 'Audio')}</span><span class="hdl l" data-h="l"></span><span class="hdl r" data-h="r"></span></div>`);
  }
  updTime(); followTimeline();
}

/* timeline interactions */
let dragging = null;
$('#tlIn').addEventListener('pointerdown', ev => {
  const trn = ev.target.closest('[data-trn]');
  if (trn) return;
  const blk = ev.target.closest('.blk'); if (!blk) return;
  const k = blk.dataset.k, id = blk.dataset.id, h = ev.target.dataset.h;
  const isSel = sel && sel.type === k && sel.id === id;
  if (!isSel) return; // selection happens on click so scrolling stays smooth
  const item = findSel(); if (!item) return;
  ev.preventDefault();
  dragging = { k, h: h || 'move', x0: ev.clientX, orig: JSON.parse(JSON.stringify(item)), item, moved: false };
  blk.setPointerCapture(ev.pointerId);
  if (playing) pause();
});
$('#tlIn').addEventListener('pointermove', ev => {
  if (!dragging) return;
  const d = dragging, dt = (ev.clientX - d.x0) / pps, o = d.orig, it = d.item;
  if (Math.abs(ev.clientX - d.x0) > 3) d.moved = true;
  if (!d.moved) return;
  if (d.k === 'clip') {
    const m = media[it.mediaId], max = m.kind === 'image' ? 3600 : m.duration, sp = it.kind === 'image' ? 1 : it.speed;
    if (d.h === 'l') { if (it.kind === 'image') it.out = clamp(o.out - dt, 0.3, 3600); else it.in = clamp(o.in + dt * sp, 0, it.out - 0.1 * sp); layout(); seekTo(it._start); }
    else if (d.h === 'r') { it.out = clamp(o.out + dt * sp, it.in + 0.1 * sp, max); layout(); seekTo(it._start + clipLen(it) - 0.01); }
    else return;
  } else if (d.k === 'ov') {
    const len = o.end - o.start;
    if (d.h === 'l') it.start = clamp(o.start + dt, 0, o.end - 0.2);
    else if (d.h === 'r') it.end = Math.max(o.start + 0.2, o.end + dt);
    else { it.start = Math.max(0, o.start + dt); it.end = it.start + len; }
    seekTo(d.h === 'r' ? it.end - 0.01 : it.start);
  } else {
    const m = media[it.mediaId];
    if (d.h === 'l') { const nd = clamp(dt, -o.in, (o.out - o.in) - 0.2); it.in = o.in + nd; it.start = Math.max(0, o.start + nd); }
    else if (d.h === 'r') it.out = clamp(o.out + dt, o.in + 0.2, m.duration);
    else it.start = Math.max(0, o.start + dt);
    seekTo(d.h === 'r' ? it.start + it.out - it.in - 0.01 : it.start);
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
  const it = findSel();
  if (it) { const s = k === 'clip' ? it._start : it.start, e = k === 'clip' ? it._start + clipLen(it) : k === 'ov' ? it.end : it.start + it.out - it.in; if (T < s || T >= e) seekTo(s + 0.01); }
});
// pinch zoom on timeline
const pinch = { pts: new Map(), d0: 0, p0: 0 };
tl.addEventListener('touchstart', e => { if (e.touches.length === 2) { pinch.d0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); pinch.p0 = pps; } }, { passive: true });
tl.addEventListener('touchmove', e => {
  if (e.touches.length !== 2 || !pinch.d0) return;
  e.preventDefault();
  const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  setZoom(pinch.p0 * d / pinch.d0);
}, { passive: false });
tl.addEventListener('touchend', e => { if (e.touches.length < 2) pinch.d0 = 0; });
function setZoom(v) { pps = clamp(v, 8, 400); renderTimeline(); }
$('#zoomIn').onclick = () => setZoom(pps * 1.4);
$('#zoomOut').onclick = () => setZoom(pps / 1.4);

/* preview interactions: move/scale/rotate text and stickers */
const pv = { ptrs: new Map(), o: null, start: null };
cv.addEventListener('pointerdown', ev => {
  if (exporting) return;
  const r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) * cv.width / r.width, y = (ev.clientY - r.top) * cv.height / r.height;
  pv.ptrs.set(ev.pointerId, { x, y });
  cv.setPointerCapture(ev.pointerId);
  if (pv.ptrs.size === 1) {
    const hit = [...P.overlays].reverse().find(o => o._box && inBox(o._box, x, y));
    if (hit) { if (!(sel && sel.id === hit.id)) select({ type: 'ov', id: hit.id }); pv.o = hit; pv.start = { x, y, ox: hit.x, oy: hit.y, moved: false }; if (playing) pause(); }
    else { pv.o = null; }
  } else if (pv.ptrs.size === 2 && pv.o) {
    const [a, b] = [...pv.ptrs.values()];
    pv.start = { ...pv.start, d0: Math.hypot(a.x - b.x, a.y - b.y), a0: Math.atan2(b.y - a.y, b.x - a.x), s0: pv.o.scale || 1, r0: pv.o.rot || 0 };
  }
});
cv.addEventListener('pointermove', ev => {
  if (!pv.ptrs.has(ev.pointerId) || !pv.o) return;
  const r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) * cv.width / r.width, y = (ev.clientY - r.top) * cv.height / r.height;
  pv.ptrs.set(ev.pointerId, { x, y });
  const o = pv.o, s = pv.start;
  if (pv.ptrs.size === 1) { o.x = clamp(s.ox + (x - s.x) / cv.width, 0, 1); o.y = clamp(s.oy + (y - s.y) / cv.height, 0, 1); s.moved = true; }
  else if (pv.ptrs.size === 2 && s.d0) { const [a, b] = [...pv.ptrs.values()]; o.scale = clamp(s.s0 * Math.hypot(a.x - b.x, a.y - b.y) / s.d0, 0.2, 6); o.rot = s.r0 + (Math.atan2(b.y - a.y, b.x - a.x) - s.a0) * 180 / Math.PI; s.moved = true; }
  requestDraw();
});
function pvEnd(ev) { pv.ptrs.delete(ev.pointerId); if (pv.ptrs.size === 0) { if (pv.o && pv.start && pv.start.moved) commit(); pv.o = null; } }
cv.addEventListener('pointerup', pvEnd); cv.addEventListener('pointercancel', pvEnd);
function inBox(b, x, y) { const a = -b.rot * Math.PI / 180, dx = x - b.x, dy = y - b.y, lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a); return Math.abs(lx) <= b.w / 2 + 12 && Math.abs(ly) <= b.h / 2 + 12; }

/* ================= Selection / toolbar ================= */
function select(s) { sel = s; closeSheet(); renderTimeline(); renderToolbar(); requestDraw(); }
const TOOLS = {
  root: [['edit', '✂', 'Edit'], ['add', '＋', 'Add media'], ['audio', '♪', 'Audio'], ['text', 'T', 'Text'], ['sticker', '☺', 'Stickers'], ['captions', 'CC', 'Captions', 'ai'], ['ai', '✦', 'AI Magic', 'ai'], ['format', '▭', 'Format']],
  clip: [['back', '‹', 'Back', 'back'], ['split', '⫶', 'Split'], ['speed', '⏩', 'Speed'], ['volume', '🔊', 'Volume'], ['filters', '◐', 'Filters'], ['adjust', '☼', 'Adjust'], ['transition', '⧓', 'Transition'], ['silence', '✂︎✦', 'Magic cut', 'ai'], ['enhance', '✦', 'Enhance', 'ai'], ['portrait', '◉', 'BG blur', 'ai'], ['fit', '⛶', 'Fit / Fill'], ['rotate', '⟳', 'Rotate'], ['dup', '⧉', 'Duplicate'], ['left', '◀', 'Move left'], ['right', '▶', 'Move right'], ['delete', '🗑', 'Delete', 'danger']],
  ov: [['back', '‹', 'Back', 'back'], ['editov', '✎', 'Edit'], ['anim', '✺', 'Animation'], ['split', '⫶', 'Split'], ['dup', '⧉', 'Duplicate'], ['delete', '🗑', 'Delete', 'danger']],
  au: [['back', '‹', 'Back', 'back'], ['avolume', '🔊', 'Volume'], ['fade', '◢', 'Fade'], ['beats', '♩', 'Beat sync', 'ai'], ['split', '⫶', 'Split'], ['dup', '⧉', 'Duplicate'], ['delete', '🗑', 'Delete', 'danger']]
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
function bindSlider(root, id, fmtv, onInput) { const i = $('#' + id, root), o = $('#' + id + 'O', root); i.addEventListener('input', () => { o.textContent = fmtv(+i.value); onInput(+i.value); requestDraw(); }); i.addEventListener('change', commit); }
const chipRow = (name, opts, cur, scroll) => `<div class="chips${scroll ? ' scroll' : ''}" data-chips="${name}">${Object.entries(opts).map(([k, v]) => `<button type="button" class="chip" data-v="${k}" aria-pressed="${k === cur}">${Array.isArray(v) ? v[0] : v}</button>`).join('')}</div>`;
function bindChips(root, name, fn) { const box = $(`[data-chips="${name}"]`, root); box.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; $$('[data-v]', box).forEach(x => x.setAttribute('aria-pressed', String(x === b))); fn(b.dataset.v); }); }

async function openTool(id) {
  const it = findSel();
  if (playing && id !== 'add') pause();
  switch (id) {
    case 'back': select(null); return;
    case 'edit': { const c = clipAt(T) || P.clips[P.clips.length - 1]; if (!c) { toast('Add a video or photo first'); return; } select({ type: 'clip', id: c.id }); return; }
    case 'add': return addMediaFlow();
    case 'audio': return audioSheet();
    case 'text': return addText();
    case 'sticker': return stickerSheet();
    case 'captions': return captionsSheet();
    case 'ai': return aiSheet();
    case 'format': return formatSheet();
    case 'split': return splitSel();
    case 'dup': return duplicateSel();
    case 'delete': return deleteSel();
    case 'left': case 'right': { const i = P.clips.indexOf(it), j = id === 'left' ? i - 1 : i + 1; if (j < 0 || j >= P.clips.length) return; [P.clips[i], P.clips[j]] = [P.clips[j], P.clips[i]]; commit(); layout(); seekTo(it._start + 0.01); return; }
    case 'fit': it.fit = it.fit === 'cover' ? 'contain' : 'cover'; toast(it.fit === 'cover' ? 'Fill: the clip covers the frame' : 'Fit: the whole clip is visible'); commit(); return;
    case 'rotate': it.rot = ((it.rot || 0) + 90) % 360; commit(); return;
    case 'speed': return openSheet('Speed', `${slider('sp', 'Speed', 0.25, 4, 0.05, it.speed, v => v.toFixed(2) + '×')}<div class="chips" id="spP">${[0.25, 0.5, 1, 1.5, 2, 3, 4].map(v => `<button type="button" class="chip" data-s="${v}" aria-pressed="${v === it.speed}">${v}×</button>`).join('')}</div><p class="note">Speed changes the clip length. Voices keep their normal pitch.</p>`,
      r => { if (it.kind === 'image') { r.innerHTML = '<p class="note">Photos have no speed. Drag the clip edges to change how long a photo shows.</p>'; return; }
        bindSlider(r, 'sp', v => v.toFixed(2) + '×', v => { it.speed = v; layout(); renderTimeline(); });
        $('#spP', r).onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; it.speed = +b.dataset.s; $('#sp', r).value = it.speed; $('#spO', r).textContent = it.speed.toFixed(2) + '×'; $$('[data-s]', r).forEach(x => x.setAttribute('aria-pressed', String(x === b))); commit(); }; });
    case 'volume': return openSheet('Clip volume', `${slider('vol', 'Volume', 0, 2, 0.05, it.volume, v => Math.round(v * 100) + '%')}<button type="button" class="btn" id="mute">${it.muted ? 'Unmute clip' : 'Mute clip'}</button>`,
      r => { bindSlider(r, 'vol', v => Math.round(v * 100) + '%', v => { it.volume = v; it.muted = false; syncMedia(playing); }); $('#mute', r).onclick = e => { it.muted = !it.muted; e.target.textContent = it.muted ? 'Unmute clip' : 'Mute clip'; syncMedia(playing); commit(); }; });
    case 'avolume': return openSheet('Audio volume', slider('vol', 'Volume', 0, 2, 0.05, it.volume, v => Math.round(v * 100) + '%'), r => bindSlider(r, 'vol', v => Math.round(v * 100) + '%', v => { it.volume = v; syncMedia(playing); }));
    case 'fade': return openSheet('Fade', slider('fi', 'Fade in', 0, 5, 0.1, it.fadeIn || 0, v => v.toFixed(1) + 's') + slider('fo', 'Fade out', 0, 5, 0.1, it.fadeOut || 0, v => v.toFixed(1) + 's'),
      r => { bindSlider(r, 'fi', v => v.toFixed(1) + 's', v => { it.fadeIn = v; }); bindSlider(r, 'fo', v => v.toFixed(1) + 's', v => { it.fadeOut = v; }); });
    case 'filters': return filtersSheet(it);
    case 'adjust': return openSheet('Adjust', slider('ab', 'Brightness', 0.4, 1.8, 0.02, it.adj.b, v => v.toFixed(2)) + slider('ac', 'Contrast', 0.4, 1.8, 0.02, it.adj.c, v => v.toFixed(2)) + slider('as', 'Saturation', 0, 2.5, 0.02, it.adj.s, v => v.toFixed(2)) + '<button type="button" class="btn" id="adjR">Reset</button>',
      r => { bindSlider(r, 'ab', v => v.toFixed(2), v => { it.adj.b = v; }); bindSlider(r, 'ac', v => v.toFixed(2), v => { it.adj.c = v; }); bindSlider(r, 'as', v => v.toFixed(2), v => { it.adj.s = v; }); $('#adjR', r).onclick = () => { it.adj = { b: 1, c: 1, s: 1 }; it.enhanced = false; commit(); openTool('adjust'); }; });
    case 'transition': return openSheet('Transition to next clip', chipRow('tr', TRANSITIONS, it.transition) + '<button type="button" class="btn" id="trAll">Apply to all cuts</button><p class="note">The effect plays across the cut, half a second in total.</p>',
      r => { bindChips(r, 'tr', v => { it.transition = v; commit(); layout(); seekTo(Math.max(0, it._start + clipLen(it) - 0.6)); play(); setTimeout(() => { if (playing) pause(); }, 1100); }); $('#trAll', r).onclick = () => { P.clips.forEach((c, i) => { if (i < P.clips.length - 1) c.transition = it.transition; }); commit(); toast('Applied to every cut'); }; });
    case 'silence': return silenceCut(it);
    case 'enhance': return enhance([it]);
    case 'portrait': return portraitToggle(it);
    case 'editov': return it.type === 'sticker' ? stickerSheet(it) : textSheet(it);
    case 'anim': return openSheet('Animation', chipRow('an', ANIMS, it.anim || 'none') + '<p class="note">In-animations play when the item appears; every animated item fades out at its end.</p>', r => bindChips(r, 'an', v => { it.anim = v; commit(); seekTo(it.start); play(); setTimeout(() => { if (playing) pause(); }, 1300); }));
    case 'beats': return beatSheet(it);
  }
}

/* ---- edit operations ---- */
function splitSel() {
  const it = findSel(); if (!it) return;
  if (sel.type === 'clip') {
    layout(); const sp = it.kind === 'image' ? 1 : it.speed, local = it.in + (T - it._start) * sp;
    if (local <= it.in + 0.05 || local >= it.out - 0.05) { toast('Move the playhead inside the clip to split it'); return; }
    const b = { ...JSON.parse(JSON.stringify(it)), id: uid(), in: local };
    if (it.kind === 'image') { b.in = 0; b.out = it.out - (T - it._start); it.out = T - it._start; }
    else it.out = local;
    b.transition = it.transition; it.transition = 'none';
    P.clips.splice(P.clips.indexOf(it) + 1, 0, b);
  } else if (sel.type === 'ov') {
    if (T <= it.start + 0.05 || T >= it.end - 0.05) { toast('Move the playhead inside the item to split it'); return; }
    const b = { ...JSON.parse(JSON.stringify(it)), id: uid(), start: T }; it.end = T; P.overlays.push(b);
  } else {
    const local = T - it.start; if (local <= 0.05 || local >= it.out - it.in - 0.05) { toast('Move the playhead inside the audio to split it'); return; }
    const b = { ...JSON.parse(JSON.stringify(it)), id: uid(), start: T, in: it.in + local, fadeIn: 0 }; it.out = it.in + local; it.fadeOut = 0; P.audio.push(b);
  }
  commit(); toast('Split');
}
function duplicateSel() {
  const it = findSel(); if (!it) return;
  const b = { ...JSON.parse(JSON.stringify(it)), id: uid() };
  if (sel.type === 'clip') P.clips.splice(P.clips.indexOf(it) + 1, 0, b);
  else if (sel.type === 'ov') { b.y = clamp(b.y + 0.06, 0, 1); P.overlays.push(b); }
  else { b.start = it.start + (it.out - it.in); P.audio.push(b); }
  commit(); select({ type: sel.type, id: b.id }); toast('Duplicated');
}
function deleteSel() {
  const it = findSel(); if (!it) return;
  if (sel.type === 'clip') P.clips = P.clips.filter(c => c !== it);
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
  const added = ms.filter(m => m.kind !== 'audio').map(makeClip);
  P.clips.splice(at, 0, ...added);
  if (ms.some(m => m.kind === 'audio')) ms.filter(m => m.kind === 'audio').forEach(m => addAudioItem(m, 'music'));
  commit(); layout(); if (added[0]) seekTo(added[0]._start + 0.01);
  toast(`Added ${added.length} clip${added.length !== 1 ? 's' : ''}`);
}
function addAudioItem(m, kind, start) {
  const a = { id: uid(), mediaId: m.id, kind, start: start != null ? start : (kind === 'music' && !P.audio.some(x => x.kind === 'music') ? 0 : T), in: 0,
    out: kind === 'music' ? Math.min(m.duration, Math.max(P._main || 0, 3)) : m.duration, volume: kind === 'music' ? 0.8 : 1, fadeIn: 0, fadeOut: kind === 'music' ? 1 : 0 };
  if (a.out <= 0) a.out = m.duration;
  P.audio.push(a);
  decodeMedia(m).then(() => { waveOf(m); renderTimeline(); });
  return a;
}
function audioSheet() {
  openSheet('Audio', `<div class="card"><h4>♪ Add music</h4><p>Pick a song or sound from your phone. It starts at 0:00 and is trimmed to your video's length.</p><button type="button" class="btn main" id="aMusic">Choose audio file</button></div>
    <div class="card"><h4>🎙 Record voiceover</h4><p>Narrate over your video. Recording starts at the playhead.</p><button type="button" class="btn" id="aVoice">Open recorder</button></div>`,
  r => {
    $('#aMusic', r).onclick = async () => {
      const files = await pickFiles('audio/*', false); if (!files.length) return;
      busy.show('Importing audio'); const ms = await importFiles(files); busy.hide(); if (!ms[0]) return;
      const a = addAudioItem(ms[0], 'music'); closeSheet(); commit(); select({ type: 'au', id: a.id }); toast('Music added. Try Beat sync next.');
    };
    $('#aVoice', r).onclick = voiceSheet;
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
    const blob = new Blob(r.chunks, { type: r.mime.split(';')[0] });
    const rec = { id: uid(), kind: 'audio', name: 'Voiceover', blob, duration: dur, created: Date.now() };
    await putMedia(rec); const m = await loadMedia(rec.id); if (!m.duration) m.duration = dur;
    const a = addAudioItem(m, 'voice', r.start); a.out = m.duration;
    closeSheet(); commit(); select({ type: 'au', id: a.id }); toast(`Voiceover added (${dur.toFixed(1)}s)`);
  };
  r.mr.stop();
  const b = $('#recBtn'); if (b) b.classList.remove('on');
}

/* ---- text & stickers ---- */
function addText(preset) {
  const o = { id: uid(), type: 'text', text: 'Your text', start: T, end: T + 3, x: 0.5, y: 0.45, size: 7, scale: 1, rot: 0, font: 'classic', color: '#ffffff', stroke: true, box: false, glow: false, anim: 'pop', ...preset };
  P.overlays.push(o); commit(); select({ type: 'ov', id: o.id }); textSheet(o, true);
}
function textSheet(o, fresh) {
  openSheet(fresh ? 'Add text' : 'Edit text', `<textarea class="txt" id="txIn" aria-label="Text">${esc(o.text)}</textarea>
    <div class="lab">Font</div>${chipRow('font', FONTS, o.font, true)}
    <div class="lab">Colour</div><div class="swatches" id="txCol">${COLORS.map(c => `<button type="button" class="swatch" style="background:${c}" data-c="${c}" aria-label="${c}" aria-pressed="${c === o.color}"></button>`).join('')}</div>
    <div class="chips" id="txSty"><button type="button" class="chip" data-s="stroke" aria-pressed="${!!o.stroke}">Outline</button><button type="button" class="chip" data-s="box" aria-pressed="${!!o.box}">Label box</button><button type="button" class="chip" data-s="glow" aria-pressed="${!!o.glow}">Neon glow</button></div>
    ${slider('txSz', 'Size', 2, 20, 0.5, o.size, v => v.toFixed(1))}
    <p class="note">Drag the text on the preview to move it. Use two fingers to resize and rotate.</p>`,
  r => {
    const ta = $('#txIn', r);
    ta.addEventListener('input', () => { o.text = ta.value || ' '; requestDraw(); renderTimeline(); });
    ta.addEventListener('change', commit);
    if (fresh) setTimeout(() => { ta.focus(); ta.select(); }, 150);
    bindChips(r, 'font', v => { o.font = v; commit(); });
    $('#txCol', r).onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; o.color = b.dataset.c; $$('[data-c]', r).forEach(x => x.setAttribute('aria-pressed', String(x === b))); commit(); };
    $('#txSty', r).onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; o[b.dataset.s] = !o[b.dataset.s]; b.setAttribute('aria-pressed', String(o[b.dataset.s])); commit(); };
    bindSlider(r, 'txSz', v => v.toFixed(1), v => { o.size = v; });
  }, () => commit());
}
function stickerSheet(existing) {
  openSheet(existing ? 'Change sticker' : 'Stickers', Object.entries(STICKERS).map(([cat, list]) => `<div class="lab">${cat}</div><div class="stk-grid">${list.split(' ').map(s => `<button type="button" class="stk" data-st="${s}">${s}</button>`).join('')}</div>`).join(''),
  r => r.addEventListener('click', e => {
    const b = e.target.closest('[data-st]'); if (!b) return;
    if (existing) { existing.text = b.dataset.st; commit(); closeSheet(); return; }
    const o = { id: uid(), type: 'sticker', text: b.dataset.st, start: T, end: T + 3, x: 0.5, y: 0.35, size: 14, scale: 1, rot: 0, anim: 'pop' };
    P.overlays.push(o); commit(); select({ type: 'ov', id: o.id }); toast('Sticker added. Drag it on the preview.');
  }));
}
function filtersSheet(c) {
  const m = media[c.mediaId], th = m && m.thumb;
  openSheet('Filters', `<div class="fgrid" id="fg">${Object.entries(FILTERS).map(([k, [n, f]]) => `<button type="button" class="fopt" data-f="${k}" aria-pressed="${k === c.filter}">${th ? `<img src="${th}" alt="" style="filter:${f || 'none'}">` : `<span class="sw" style="filter:${f || 'none'};background:linear-gradient(135deg,#36d7ff,#ff5a87)"></span>`}${n}</button>`).join('')}</div>
    <button type="button" class="btn" id="fAll">Apply to all clips</button>`,
  r => {
    $('#fg', r).onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; c.filter = b.dataset.f; $$('[data-f]', r).forEach(x => x.setAttribute('aria-pressed', String(x === b))); commit(); };
    $('#fAll', r).onclick = () => { P.clips.forEach(x => { x.filter = c.filter; }); commit(); toast('Filter applied to all clips'); };
  });
}
function formatSheet() {
  openSheet('Format', `<div class="lab">Aspect ratio</div>${chipRow('ratio', { '9:16': '9:16 TikTok · Reels', '16:9': '16:9 YouTube', '1:1': '1:1 Square', '4:5': '4:5 Instagram', '3:4': '3:4' }, P.ratio)}
    <div class="lab">Background behind fitted clips</div>${chipRow('bg', { blur: 'Blurred clip', black: 'Black', white: 'White' }, P.bg)}`,
  r => { bindChips(r, 'ratio', v => { P.ratio = v; setCanvasSize(PREVIEW_LONG); commit(); }); bindChips(r, 'bg', v => { P.bg = v; commit(); }); });
}

/* ================= AI features ================= */
function aiSheet() {
  openSheet('✦ AI Magic', `
    <div class="card"><h4>CC Auto captions <span class="badge">Speech AI</span></h4><p>Transcribes speech in your clips and adds timed, styled captions. Runs on your phone.</p><button type="button" class="btn ai" data-ai="cap">Generate captions</button></div>
    <div class="card"><h4>♩ Beat sync <span class="badge">Rhythm AI</span></h4><p>Finds the beat of your music, marks it on the timeline and cuts your clips to land on the beat.</p><button type="button" class="btn ai" data-ai="beat">Sync clips to music</button></div>
    <div class="card"><h4>✂ Magic cut <span class="badge">Audio AI</span></h4><p>Removes silent pauses from talking clips for a tight jump-cut edit.</p><button type="button" class="btn ai" data-ai="sil">Cut silences in all clips</button></div>
    <div class="card"><h4>✦ Smart enhance <span class="badge">Vision</span></h4><p>Reads each clip's light and colour and balances brightness, contrast and saturation.</p><button type="button" class="btn ai" data-ai="enh">Enhance all clips</button></div>
    <div class="card"><h4>◉ Background blur <span class="badge">Vision AI</span></h4><p>Detects people and blurs the background, like portrait mode for video. Select a clip and tap BG blur.</p><button type="button" class="btn" data-ai="por">Use on clip at playhead</button></div>
    <p class="note">Captions and background blur download their AI models the first time (about 40 MB and 1 MB) and need internet once.</p>`,
  r => r.addEventListener('click', e => {
    const b = e.target.closest('[data-ai]'); if (!b) return;
    const a = b.dataset.ai;
    if (a === 'cap') captionsSheet();
    else if (a === 'beat') { const mu = P.audio.find(x => x.kind === 'music'); if (!mu) { toast('Add music first: Audio > Add music'); return; } select({ type: 'au', id: mu.id }); beatSheet(mu); }
    else if (a === 'sil') { closeSheet(); silenceCut(null); }
    else if (a === 'enh') { closeSheet(); enhance(P.clips); }
    else if (a === 'por') { const c = clipAt(T); if (!c) { toast('Move the playhead over a clip'); return; } select({ type: 'clip', id: c.id }); portraitToggle(c); }
  }));
}

/* --- Smart enhance --- */
function grabFrame(c, at) {
  return new Promise(res => {
    const m = media[c.mediaId]; if (!m) return res(null);
    const C = document.createElement('canvas'); C.width = C.height = 48; const x = C.getContext('2d');
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
    let sum = 0, sum2 = 0, sat = 0; const N = d.length / 4;
    for (let i = 0; i < d.length; i += 4) { const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255, l = 0.2126 * r + 0.7152 * gg + 0.0722 * b; sum += l; sum2 += l * l; const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b); sat += mx ? (mx - mn) / mx : 0; }
    const mean = sum / N, sd = Math.sqrt(Math.max(1e-6, sum2 / N - mean * mean)), ms = sat / N;
    c.adj = { b: +clamp(0.5 / Math.max(mean, 0.05), 0.85, 1.4).toFixed(2), c: +clamp(0.22 / sd, 0.92, 1.35).toFixed(2), s: +(ms < 0.2 ? 1.35 : ms < 0.32 ? 1.18 : 1.06).toFixed(2) };
    c.enhanced = true;
  }
  busy.hide(); commit(); toast(`Enhanced ${list.length} clip${list.length > 1 ? 's' : ''}. Fine-tune in Adjust.`);
}

/* --- Background blur --- */
async function portraitToggle(c) {
  if (c.blurBg) { c.blurBg = false; commit(); toast('Background blur off'); return; }
  busy.show('Loading vision AI', 'Downloading the person detection model');
  busy.pct(0.3);
  const ok = await loadSeg(); busy.hide();
  if (!ok) { toast('Could not load the vision model. Check your internet connection and try again.', 4000); return; }
  c.blurBg = true; commit(); toast('Background blur on. People stay sharp.');
}

/* --- Magic cut (silence removal) --- */
function rmsWindows(buf, from, to, win) {
  const sr = buf.sampleRate, chs = Math.min(2, buf.numberOfChannels), d = [...Array(chs)].map((_, i) => buf.getChannelData(i));
  const w = Math.round(sr * win), a = Math.floor(from * sr), b = Math.min(buf.length, Math.floor(to * sr)), out = [];
  for (let s = a; s < b; s += w) { let acc = 0, n = 0; const e = Math.min(b, s + w); for (let i = s; i < e; i += 2) { let v = 0; for (const ch of d) v += ch[i]; v /= chs; acc += v * v; n++; } out.push(Math.sqrt(acc / Math.max(1, n))); }
  return out;
}
const pct = (arr, q) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))] || 0; };
async function silenceCut(only) {
  const list = only ? [only] : P.clips.filter(c => c.kind === 'video');
  if (!list.length) { toast('Magic cut works on video clips with sound'); return; }
  busy.show('Magic cut', 'Listening for pauses'); let removed = 0, cuts = 0, i = 0;
  for (const c of [...list]) {
    const m = media[c.mediaId]; busy.pct(i++ / list.length);
    const buf = await decodeMedia(m); if (!buf) continue;
    const win = 0.05, r = rmsWindows(buf, c.in, c.out, win); if (r.length < 10) continue;
    const thr = Math.max(pct(r, 0.15) * 2.2, pct(r, 0.95) * 0.1, 0.006), minSil = 0.5, padS = 0.1;
    const keep = []; let s = null, runStart = null;
    for (let k = 0; k <= r.length; k++) {
      const silent = k < r.length && r[k] < thr;
      if (silent && runStart == null) runStart = k;
      if ((!silent || k === r.length) && runStart != null) {
        const len = (k - runStart) * win;
        if (len >= minSil) { const a = c.in + runStart * win + padS, b = c.in + k * win - padS; keep.push([a, b]); }
        runStart = null;
      }
    }
    if (!keep.length) continue;
    const segs = []; let cur = c.in;
    for (const [a, b] of keep) { if (a - cur > 0.3) segs.push([cur, a]); cur = b; }
    if (c.out - cur > 0.3) segs.push([cur, c.out]);
    if (!segs.length) continue;
    const before = c.out - c.in, after = segs.reduce((t, [a, b]) => t + b - a, 0);
    if (before - after < 0.2) continue;
    removed += (before - after) / c.speed; cuts += keep.length;
    const parts = segs.map(([a, b], k) => ({ ...JSON.parse(JSON.stringify(c)), id: k === 0 ? c.id : uid(), in: a, out: b, transition: k === segs.length - 1 ? c.transition : 'none' }));
    P.clips.splice(P.clips.indexOf(c), 1, ...parts);
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
    const w = Math.exp(-Math.pow(Math.log2(bpm / 120), 2) * 1.2); ac *= w;
    if (ac > best) { best = ac; bestLag = lag; }
  }
  let bestOff = 0, bestS = -1;
  for (let off = 0; off < bestLag; off++) { let s = 0; for (let k = off; k < n; k += bestLag) s += on[Math.round(k)] || 0; if (s > bestS) { bestS = s; bestOff = off; } }
  const beats = []; for (let k = bestOff; k < n; k += bestLag) beats.push(+(a.start + k / fps).toFixed(3));
  return { beats, bpm: Math.round(60 * fps / bestLag), period: bestLag / fps };
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
      P.beats = res.beats; P.bpm = res.bpm; P._period = res.period; commit();
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
        const target = P.beats.find(x => x >= t + n * period * 0.75); if (target == null) break;
        const m = media[c.mediaId], sp = c.kind === 'image' ? 1 : c.speed, maxLen = c.kind === 'image' ? 3600 : (m.duration - c.in) / sp;
        const len = Math.min(target - t, maxLen); if (len < 0.15) { t += clipLen(c); continue; }
        c.out = c.in + len * sp; t += len; changed++;
      }
      commit(); seekTo(0); toast(`Cut ${changed} clip${changed !== 1 ? 's' : ''} to every ${n} beat${n > 1 ? 's' : ''}`);
    };
  });
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
  const out = await oc.startRendering(); return out.getChannelData(0);
}
async function runCaptions(model) {
  const clips = P.clips.filter(c => c.kind === 'video' && !c.muted);
  if (!clips.length) { toast('Captions need video clips with speech'); return; }
  let cancelled = false;
  busy.show('Auto captions', 'Loading the speech model', () => { cancelled = true; busy.hide(); });
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
    if (cancelled) return;
    const st = CAP_STYLES[P.capStyle || 'classic'], caps = []; let i = 0;
    layout();
    for (const c of clips) {
      if (cancelled) return;
      busy.text(`Transcribing clip ${i + 1} of ${clips.length}`); busy.pct(0.5 + 0.5 * i / clips.length); i++;
      const m = media[c.mediaId], buf = await decodeMedia(m); if (!buf) continue;
      const pcm = await toMono16k(buf, c.in, c.out);
      const opts = { return_timestamps: true, chunk_length_s: 30, stride_length_s: 5 };
      if (model.endsWith('tiny')) opts.task = 'transcribe';
      const out = await asr(pcm, opts);
      const chunks = out.chunks && out.chunks.length ? out.chunks : (out.text ? [{ text: out.text, timestamp: [0, (c.out - c.in)] }] : []);
      for (const ch of chunks) {
        const text = (ch.text || '').trim(); if (!text || /^\[.*\]$|^\(.*\)$/.test(text)) continue;
        let [s, e] = ch.timestamp; if (e == null) e = Math.min(c.out - c.in, s + 3);
        const words = text.split(/\s+/), groups = [];
        for (let k = 0; k < words.length; k += 6) groups.push(words.slice(k, k + 6).join(' '));
        groups.forEach((gtxt, k) => {
          const a = s + (e - s) * k / groups.length, b = s + (e - s) * (k + 1) / groups.length;
          const ts = c._start + a / c.speed, te = c._start + b / c.speed;
          if (te - ts > 0.15) caps.push({ id: uid(), type: 'text', caption: true, text: gtxt, start: +ts.toFixed(2), end: +te.toFixed(2), x: 0.5, y: 0.78, size: 5.2, scale: 1, rot: 0, anim: 'none', ...st });
        });
      }
    }
    busy.hide();
    if (cancelled) return;
    if (!caps.length) { toast('No speech found in your clips'); return; }
    P.overlays = P.overlays.filter(o => !o.caption).concat(caps);
    closeSheet(); commit(); toast(`Added ${caps.length} captions. Tap one on the timeline to fix a word.`, 3500);
  } catch (e) {
    console.warn(e); busy.hide();
    toast('Captions failed: ' + (navigator.onLine ? 'the speech model could not run on this phone' : 'connect to the internet for the first download'), 4500);
  }
}

/* ================= Export ================= */
const PREVIEW_LONG = 960;
function pickMime() {
  const opts = ['video/mp4;codecs="avc1.42E01F,mp4a.40.2"', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return opts.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
}
function exportSheet() {
  if (!P.clips.length && !P.overlays.length) { toast('Add some clips first'); return; }
  if (playing) pause();
  const mime = pickMime(), ext = mime.includes('mp4') ? 'MP4' : 'WebM';
  openSheet('Export', `<div class="lab">Resolution</div>${chipRow('res', { 720: '720p · smaller file', 1080: '1080p · full HD' }, '1080')}
    <div class="lab">Frame rate</div>${chipRow('fps', { 24: '24 fps', 30: '30 fps', 60: '60 fps' }, '30')}
    <p class="note">Length ${fmt(duration())}. Exports as ${ext} and saves to Movies/SplashCut in your gallery. Export plays your video in real time, so keep the screen on.</p>
    <button type="button" class="btn main full" id="xGo">Export video</button>`,
  r => { let res = 1080, fps = 30; bindChips(r, 'res', v => { res = +v; }); bindChips(r, 'fps', v => { fps = +v; }); $('#xGo', r).onclick = () => { closeSheet(); runExport(res, fps); }; });
}
async function runExport(res, fps) {
  const mime = pickMime();
  if (!mime || !cv.captureStream) { toast('This phone cannot record video from the editor. Update Android System WebView from the Play Store.', 5000); return; }
  actx().resume();
  sel = null; renderToolbar();
  setCanvasSize(res === 720 ? 1280 : 1920);
  T = 0; syncMedia(false);
  await Promise.all(P.clips.slice(0, 2).map(c => { const e = els[c.id]; return e && !e.img && e.el.readyState < 2 ? new Promise(r => { e.el.addEventListener('canplay', r, { once: true }); setTimeout(r, 2500); }) : null; }));
  draw();
  const stream = cv.captureStream(fps);
  const at = recDest.stream.getAudioTracks()[0]; if (at) stream.addTrack(at);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: res === 720 ? 6e6 : 12e6, audioBitsPerSecond: 160000 });
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
        const uri = await saveVideo(blob, name, p => busy.pct(0.92 + p * 0.08));
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
async function saveVideo(blob, name, onp) {
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
    const others = list.filter(x => x.id !== id), used = new Set();
    others.forEach(x => { x.clips.forEach(c => used.add(c.mediaId)); x.audio.forEach(a => used.add(a.mediaId)); });
    for (const mid of new Set([...p.clips.map(c => c.mediaId), ...p.audio.map(a => a.mediaId)])) if (!used.has(mid)) { await delMediaRec(mid).catch(() => {}); if (media[mid]) { URL.revokeObjectURL(media[mid].url); delete media[mid]; } }
    renderHome(); toast('Project deleted');
  }
});
document.addEventListener('click', e => { if (!e.target.closest('.pmenu') && !e.target.closest('[data-more]')) $$('.pmenu').forEach(x => x.remove()); });

$('#newProject').onclick = async () => {
  const files = await pickFiles('video/*,image/*'); if (!files.length) return;
  busy.show('Importing', `${files.length} file${files.length > 1 ? 's' : ''}`);
  const ms = await importFiles(files); busy.hide();
  const vis = ms.filter(m => m.kind !== 'audio'); if (!vis.length) return;
  const f = vis[0], ratio = f.w && f.h ? (f.w > f.h * 1.15 ? '16:9' : f.h > f.w * 1.15 ? '9:16' : '1:1') : '9:16';
  P = newProject(ratio); P.clips = vis.map(makeClip);
  await saveProject(); await enterEditor();
};
async function openProject(id) {
  const list = await allProjects(), p = list.find(x => x.id === id); if (!p) return;
  busy.show('Opening', p.name);
  const ids = new Set([...p.clips.map(c => c.mediaId), ...p.audio.map(a => a.mediaId)]); let n = 0, missing = 0;
  for (const mid of ids) { const m = await loadMedia(mid); if (!m) missing++; busy.pct(++n / ids.size); }
  busy.hide();
  P = p;
  if (missing) { P.clips = P.clips.filter(c => media[c.mediaId]); P.audio = P.audio.filter(a => media[a.mediaId]); toast(`${missing} file${missing > 1 ? 's were' : ' was'} missing and removed from the project`); }
  for (const a of P.audio) { const m = media[a.mediaId]; if (m && !m.wave) decodeMedia(m).then(() => { waveOf(m); renderTimeline(); }); }
  await enterEditor();
}
async function enterEditor() {
  $('#home').hidden = true; $('#editor').hidden = false;
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

/* Android back button */
window.splashBack = () => {
  if (!$('#busy').hidden) return true;
  if (!$('#sheet').hidden) { closeSheet(); return true; }
  if (P && sel) { select(null); return true; }
  if (P) { leaveEditor(); return true; }
  return false;
};

renderHome();
window.__sc = { get P() { return P; }, get T() { return T; }, media, layout, duration, clipAt, detectBeats, rmsWindows, splitSel, openTool, select, commit, draw };
})();
