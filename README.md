# SplashCut

A mobile video editor for Android with built-in smart tools, and the kaybiz.in website that handles accounts and Pro subscriptions.

## Accounts and Pro (v3)

- Editing is free without an account. Exporting asks people to create an account, which starts a free Pro trial (30 days by default, set in the admin).
- When the trial ends, the app shows the SplashCut Pro screen with your plans. People pay with Paystack (instant) or by bank transfer, which you approve in the admin.
- Pro unlocks export in 720p, 1080p and 4K.
- The website, admin and API live in `website/` (Laravel 11). See `website/INSTALL.txt` for cPanel setup. The app talks to `https://kaybiz.in/api`.

**New editing tools in v3:** sound effects, split-screen layouts, copy and paste style, replace clip, beauty smoothing, Ken Burns and slow zoom animations, loudness levelling, mute all clips, frame-by-frame stepping, snapping on the timeline, background colours, 21:9 format and 4K export.

**New in v3.1:**
- **Export fix:** exports are rewritten into a standard MP4 before they go to Movies/SplashCut, so every gallery and file app shows them. Empty recordings are reported instead of "Saved", and an **Open** button plays the saved video.
- **Magnetic timeline:** moving or trimming an item snaps it to the playhead, other items' edges and the end of the video, with a light vibration and a gold magnet line. On the preview, items snap to the centre, upright angles and 100% size.
- **Apply or cancel:** tool sheets preview the change live; ✓ Apply keeps it, ✕ (or tapping outside) puts it back. **Apply to all** copies speed, volume, fades, filters, adjustments, effects, animations, transitions, voice effects, relight, crop and masks to every item of the same kind.
- **Trim tool:** drag the left or right edge over a filmstrip (or waveform), or cut left/right of the playhead, for clips, overlays, audio and text.
- **Speed for part of a clip:** choose Entire clip or Part of clip, drag the handles to pick the part, and only that part changes speed.
- **Visual guides:** live graphs and demos for speed and speed curves, fades, volume (dB meter), tone curve, equalizer, animations (opacity/size/position/rotation/blur over time), transitions (A → B demo), and transform keyframes with a frame map.
- **More animations and transitions:** Rise, Drop, Pop, Twist, Zoom blur, Whip, Flicker; loops Breathe, Jitter, Orbit, Pendulum, Hop; text Drop in, Swing in, Neon flicker, Stretch; transitions Zoom out, Whip pan, Push up, Blinds, Pixelate, Shake.
- **Auto edit:** picks Energetic, Cinematic or Chill, cuts the best moments on the beat, composes matching music on the phone (or uses your song), and adds an animated title, subtitle, end card, transitions, a colour grade and whoosh sound effects.

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

**Smart tools (all run on the phone):**
- **Auto captions** – speech recognition turns speech into timed captions in four styles.
- **Remove background / background blur** – person detection cuts people out or blurs what is behind them.
- **Relight** – six lighting looks (studio, neon, sunset, golden hour…), optionally on people only.
- **Stabilize** – tracks camera movement and smooths out shake.
- **Auto frame** – follows the subject so wide videos fit 9:16.
- **Motion tracking** – text and stickers follow a moving object.
- **Noise reduction** – removes hiss, hum, wind and room noise.
- **Auto duck** – lowers the music whenever someone speaks.
- **Auto reel** – picks the most active and loudest moments and cuts a 15, 30 or 60 second highlight reel.
- **Beat sync**, **Magic cut** (removes silent pauses) and **Smart enhance**.

**Export:** 720p or 1080p at 24, 30 or 60 fps in standard or high quality, saved to Movies/SplashCut with a Share button. **Snapshot** saves the current frame as a photo to Pictures/SplashCut.

Captions and person detection download their models the first time they are used (about 40 MB and 1 MB), so they need internet once.

## How it is built

- `app/src/main/assets/www/` – the editor (HTML, CSS, JavaScript; Canvas rendering, Web Audio mixing, MediaRecorder export, IndexedDB storage).
- `app/src/main/java/com/splashcut/app/MainActivity.java` – the Android shell: WebView, file picker, microphone permission, saving to the gallery, sharing, back button.
- `codemagic.yaml` – Codemagic builds `SplashCut.apk` on every push to `main`.
- `.github/workflows/build-apk.yml` – the same build for GitHub Actions.

The signing key (`app/splashcut.keystore`, password `splashcut`) is in the repo so every build updates the installed app. It is fine for personal sideloading; create a private key before publishing to the Play Store.
