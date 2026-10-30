# SplashCut

A mobile video editor for Android with built-in AI tools.

## Install on your phone

1. On your Android phone, open the latest release:
   https://github.com/ksplash38/splashcut/releases/latest
2. Tap **SplashCut.apk** to download it, then open the downloaded file.
3. If Android asks, allow your browser or file manager to **install unknown apps**, then tap **Install**.

New builds install over the old one and keep your projects.

## What it does

**Editing:** multi-clip timeline with pinch-to-zoom, trim by dragging clip edges, split, duplicate, reorder, speed 0.25× to 4×, clip volume and mute, rotate, fit or fill, undo and redo, projects saved automatically.

**Look:** 12 colour filters, brightness/contrast/saturation, 6 transitions (fade, flash, zoom punch, blur, spin, glitch), aspect ratios 9:16, 16:9, 1:1, 4:5 and 3:4, blurred, black or white backgrounds.

**Text and stickers:** styled text with fonts, colours, outline, label box and neon glow; emoji stickers; drag to move, two fingers to resize and rotate; animations (fade, pop, slide up, typewriter, bounce).

**Audio:** add music, record voiceovers, per-track volume, fade in and out, waveforms on the timeline.

**AI Magic:**
- **Auto captions** – on-device speech recognition (Whisper) turns speech into timed captions in four styles.
- **Beat sync** – detects the music's tempo, marks beats on the timeline and cuts clips to every 1, 2, 4 or 8 beats.
- **Magic cut** – finds and removes silent pauses for jump-cut edits.
- **Smart enhance** – analyses each clip's light and colour and corrects it.
- **Background blur** – on-device person segmentation keeps people sharp and blurs the background.

**Export:** 720p or 1080p at 24, 30 or 60 fps, saved to Movies/SplashCut, with a Share button for WhatsApp, TikTok, Instagram and others.

Captions and background blur download their AI models the first time they are used (about 40 MB and 1 MB), so they need internet once.

## How it is built

- `app/src/main/assets/www/` – the editor (HTML, CSS, JavaScript; Canvas rendering, Web Audio mixing, MediaRecorder export, IndexedDB storage).
- `app/src/main/java/com/splashcut/app/MainActivity.java` – the Android shell: WebView, file picker, microphone permission, saving to the gallery, sharing, back button.
- `.github/workflows/build-apk.yml` – GitHub Actions builds the APK on every push to `main` and publishes it as the `latest` release.

The signing key (`app/splashcut.keystore`, password `splashcut`) is in the repo so every build updates the installed app. It is fine for personal sideloading; create a private key before publishing to the Play Store.
