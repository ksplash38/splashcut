# SplashCut

A mobile video editor for Android with built-in AI tools.

## Install on your phone

1. On your Android phone, open the latest release:
   https://github.com/ksplash38/splashcut/releases/latest
2. Tap **SplashCut.apk** to download it, then open the downloaded file.
3. If Android asks, allow your browser or file manager to **install unknown apps**, then tap **Install**.

New builds install over the old one and keep your projects.

## What it does

**Editing:** multi-clip timeline with pinch-to-zoom, trim by dragging edges, split, duplicate, reorder, undo and redo, projects saved automatically. Speed from 0.1× to 10× plus 8 speed curves (Montage, Hero, Bullet, Jump cut, Flash in/out, Ramp up/down). Freeze frame, reverse, rotate, fit or fill, crop with ratio presets.

**Overlay (picture-in-picture):** put videos or photos on a second track above the main video, with 10 blend modes, opacity, chroma key (green/blue screen) and every clip tool.

**Transform and keyframes:** move, scale, rotate and fade any clip, overlay, text or sticker by dragging and pinching on the preview, and animate them with smooth keyframes.

**Animations:** 12 in and out animations (zoom, slide, spin, bounce, blur, swing, shake…) and 6 looping ones (pulse, sway, float, wobble, heartbeat, spin) for clips; 8 for text.

**Masks:** circle, rectangle, heart, star, split and film band, with size, position, rotation, feather and invert.

**Effects:** 20 stackable effects with intensity – VHS, RGB split, film grain, vignette, glow, camera shake, beat pulse, beat strobe, mirror, kaleidoscope, pixelate, cinema bars, light leak, old film, negative, heat vision, duotone, colour cycle, soft blur and motion blur. 16 filters, brightness, contrast, saturation, temperature and tint. 10 transitions.

**Text and stickers:** 8 text templates (title, lower third, neon, breaking news, subscribe…), 7 fonts, colours, outline, box, glow, shadow, letter spacing; 150+ emoji stickers.

**Audio:** music, voiceover recording, extract audio from video, volume, speed, fade in/out, 8 voice effects (echo, hall, stadium, telephone, radio, underwater, robot, megaphone) and a 3-band equalizer.

**AI tools (all run on the phone):**
- **Auto captions** – speech recognition turns speech into timed captions in four styles.
- **Remove background / background blur** – person detection cuts people out or blurs what is behind them.
- **AI relight** – six lighting looks (studio, neon, sunset, golden hour…), optionally on people only.
- **Stabilize** – tracks camera movement and smooths out shake.
- **Auto frame** – follows the subject so wide videos fit 9:16.
- **Motion tracking** – text and stickers follow a moving object.
- **Noise reduction** – removes hiss, hum, wind and room noise.
- **Auto duck** – lowers the music whenever someone speaks.
- **Auto reel** – picks the most active and loudest moments and cuts a 15, 30 or 60 second highlight reel.
- **Beat sync**, **Magic cut** (removes silent pauses) and **Smart enhance**.

**Export:** 720p or 1080p at 24, 30 or 60 fps in standard or high quality, saved to Movies/SplashCut with a Share button. **Snapshot** saves the current frame as a photo to Pictures/SplashCut.

Captions and person detection download their AI models the first time they are used (about 40 MB and 1 MB), so they need internet once.

## How it is built

- `app/src/main/assets/www/` – the editor (HTML, CSS, JavaScript; Canvas rendering, Web Audio mixing, MediaRecorder export, IndexedDB storage).
- `app/src/main/java/com/splashcut/app/MainActivity.java` – the Android shell: WebView, file picker, microphone permission, saving to the gallery, sharing, back button.
- `codemagic.yaml` – Codemagic builds `SplashCut.apk` on every push to `main`.
- `.github/workflows/build-apk.yml` – the same build for GitHub Actions.

The signing key (`app/splashcut.keystore`, password `splashcut`) is in the repo so every build updates the installed app. It is fine for personal sideloading; create a private key before publishing to the Play Store.
