package com.splashcut.app;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.media.AudioManager;
import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.media.MediaMuxer;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.ParcelFileDescriptor;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.HapticFeedbackConstants;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Hosts the SplashCut editor (assets/www) in a WebView and supplies the native pieces it needs. */
public class MainActivity extends Activity {
    private static final String START_URL = "https://appassets.androidplatform.net/assets/www/index.html";
    private static final int REQ_FILES = 1, REQ_MIC = 2, REQ_STORAGE = 3;

    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest pendingPermission;
    private final Map<String, Save> saves = new HashMap<>();

    /** An export in progress: the recording is buffered in a temp file, then finished into the gallery by endSave. */
    private static class Save { String name; File tmp; OutputStream out; String mime; boolean image; }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
        getWindow().setStatusBarColor(0xFF111111);
        getWindow().setNavigationBarColor(0xFF111111);

        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) WebView.setWebContentsDebuggingEnabled(true);

        web = new WebView(this);
        web.setBackgroundColor(0xFF111111);
        setContentView(web);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        web.clearCache(true);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if ("appassets.androidplatform.net".equals(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                String[] types = mimeTypes(params.getAcceptTypes());
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType(types.length == 1 ? types[0] : "*/*");
                if (types.length > 1) i.putExtra(Intent.EXTRA_MIME_TYPES, types);
                i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                try {
                    startActivityForResult(Intent.createChooser(i, "Choose media"), REQ_FILES);
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    boolean mic = Arrays.asList(request.getResources()).contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE);
                    if (!mic) { request.deny(); return; }
                    if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                    } else {
                        pendingPermission = request;
                        requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
                    }
                });
            }
        });

        web.addJavascriptInterface(new Bridge(), "SplashNative");
        web.loadUrl(START_URL);

        if (Build.VERSION.SDK_INT < 29 && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, REQ_STORAGE);
        }
    }

    private static String[] mimeTypes(String[] accept) {
        List<String> out = new ArrayList<>();
        if (accept != null) for (String a : accept) {
            if (a == null) continue;
            for (String p : a.split(",")) { p = p.trim(); if (!p.isEmpty() && p.contains("/")) out.add(p); }
        }
        if (out.isEmpty()) out.add("*/*");
        return out.toArray(new String[0]);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_FILES || fileCallback == null) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int n = data.getClipData().getItemCount();
                result = new Uri[n];
                for (int k = 0; k < n; k++) result[k] = data.getClipData().getItemAt(k).getUri();
            } else if (data.getData() != null) {
                result = new Uri[]{data.getData()};
            }
        }
        fileCallback.onReceiveValue(result);
        fileCallback = null;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_MIC && pendingPermission != null) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                pendingPermission.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            } else {
                pendingPermission.deny();
            }
            pendingPermission = null;
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        web.evaluateJavascript("(window.splashBack && window.splashBack()) ? '1' : '0'", v -> {
            if (!"\"1\"".equals(v)) finish();
        });
    }

    @Override
    protected void onPause() { super.onPause(); web.onPause(); }

    @Override
    protected void onResume() { super.onResume(); web.onResume(); }

    @Override
    protected void onDestroy() {
        for (Save s : saves.values()) { try { s.out.close(); } catch (Exception ignored) { } s.tmp.delete(); }
        saves.clear();
        web.destroy();
        super.onDestroy();
    }

    /** Methods the editor calls as window.SplashNative.* to save exports and share them. */
    private class Bridge {
        @JavascriptInterface
        public String beginSave(String name, String mime) {
            try {
                Save s = new Save();
                s.name = name;
                s.mime = (mime == null || mime.isEmpty()) ? "video/mp4" : mime.split(";")[0];
                s.image = s.mime.startsWith("image/");
                // Buffer to a private temp file first. Nothing appears in the gallery until endSave has a playable file.
                s.tmp = File.createTempFile("export", ".part", getCacheDir());
                s.out = new BufferedOutputStream(new FileOutputStream(s.tmp), 1 << 16);
                String id = UUID.randomUUID().toString();
                saves.put(id, s);
                return id;
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public boolean appendChunk(String id, String base64) {
            Save s = saves.get(id);
            if (s == null) return false;
            try {
                s.out.write(Base64.decode(base64, Base64.DEFAULT));
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public String endSave(String id) {
            Save s = saves.remove(id);
            if (s == null) return "";
            Uri uri = null;
            try {
                s.out.flush();
                s.out.close();
                if (s.tmp.length() == 0) return "";
                boolean webm = s.mime.contains("webm");
                String dirType = s.image ? Environment.DIRECTORY_PICTURES : Environment.DIRECTORY_MOVIES;
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.MediaColumns.DISPLAY_NAME, s.name);
                    cv.put(MediaStore.MediaColumns.MIME_TYPE, s.mime);
                    cv.put(MediaStore.MediaColumns.RELATIVE_PATH, dirType + "/SplashCut");
                    cv.put(MediaStore.MediaColumns.DATE_TAKEN, System.currentTimeMillis());
                    cv.put(MediaStore.MediaColumns.IS_PENDING, 1);
                    uri = getContentResolver().insert(s.image ? MediaStore.Images.Media.EXTERNAL_CONTENT_URI : MediaStore.Video.Media.EXTERNAL_CONTENT_URI, cv);
                    if (uri == null) return "";
                    boolean done = false;
                    if (!s.image) {
                        try (ParcelFileDescriptor pfd = getContentResolver().openFileDescriptor(uri, "rw")) {
                            done = pfd != null && remux(s.tmp, new MediaMuxer(pfd.getFileDescriptor(), webm ? MediaMuxer.OutputFormat.MUXER_OUTPUT_WEBM : MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4));
                        } catch (Exception ignored) { }
                    }
                    if (!done) try (OutputStream o = getContentResolver().openOutputStream(uri, "wt")) { copyFile(s.tmp, o); }
                    ContentValues fin = new ContentValues();
                    fin.put(MediaStore.MediaColumns.IS_PENDING, 0);
                    getContentResolver().update(uri, fin, null, null);
                    return uri.toString();
                }
                File dir = new File(Environment.getExternalStoragePublicDirectory(dirType), "SplashCut");
                if (!dir.exists() && !dir.mkdirs()) dir = getExternalFilesDir(dirType);
                File file = new File(dir, s.name);
                boolean done = false;
                if (!s.image) {
                    try { done = remux(s.tmp, new MediaMuxer(file.getAbsolutePath(), webm ? MediaMuxer.OutputFormat.MUXER_OUTPUT_WEBM : MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)); }
                    catch (Exception ignored) { }
                }
                if (!done) try (OutputStream o = new FileOutputStream(file)) { copyFile(s.tmp, o); }
                MediaScannerConnection.scanFile(MainActivity.this, new String[]{file.getAbsolutePath()}, new String[]{s.mime}, null);
                return "file:" + file.getAbsolutePath();
            } catch (Exception e) {
                if (uri != null) try { getContentResolver().delete(uri, null, null); } catch (Exception ignored) { }
                return "";
            } finally {
                //noinspection ResultOfMethodCallIgnored
                s.tmp.delete();
            }
        }

        /** After recording a voiceover: back to normal media sound on the loudspeaker instead of phone-call mode. */
        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public void audioReset() {
            runOnUiThread(() -> {
                AudioManager am = (AudioManager) getSystemService(AUDIO_SERVICE);
                if (am == null) return;
                am.setMode(AudioManager.MODE_NORMAL);
                am.setSpeakerphoneOn(false);
            });
        }

        /** Light tap of the vibration motor, used when items snap into place. */
        @JavascriptInterface
        public void haptic(String kind) {
            runOnUiThread(() -> web.performHapticFeedback("apply".equals(kind) ? HapticFeedbackConstants.VIRTUAL_KEY : HapticFeedbackConstants.CLOCK_TICK,
                    HapticFeedbackConstants.FLAG_IGNORE_VIEW_SETTING));
        }

        /** Opens a saved export in the phone's video player or photo viewer. */
        @JavascriptInterface
        public void open(String uri, String mime) {
            runOnUiThread(() -> {
                if (uri == null || uri.isEmpty()) return;
                if (uri.startsWith("file:")) {
                    MediaScannerConnection.scanFile(MainActivity.this, new String[]{uri.substring(5)}, new String[]{mime},
                            (path, contentUri) -> runOnUiThread(() -> { if (contentUri != null) startView(contentUri, mime); }));
                } else {
                    startView(Uri.parse(uri), mime);
                }
            });
        }

        @JavascriptInterface
        public void openUrl(String url) {
            runOnUiThread(() -> {
                try {
                    Uri u = Uri.parse(url);
                    String scheme = u.getScheme();
                    if (!"https".equals(scheme) && !"http".equals(scheme)) return;
                    startActivity(new Intent(Intent.ACTION_VIEW, u).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                } catch (Exception ignored) { }
            });
        }

        @JavascriptInterface
        public void copy(String text) {
            runOnUiThread(() -> {
                ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("SplashCut", text));
            });
        }

        @JavascriptInterface
        public void share(String uri, String mime) {
            runOnUiThread(() -> {
                if (uri == null || uri.isEmpty()) return;
                if (uri.startsWith("file:")) {
                    MediaScannerConnection.scanFile(MainActivity.this, new String[]{uri.substring(5)}, new String[]{mime},
                            (path, contentUri) -> runOnUiThread(() -> { if (contentUri != null) startShare(contentUri, mime); }));
                } else {
                    startShare(Uri.parse(uri), mime);
                }
            });
        }
    }

    /**
     * The WebView records in streaming form (fragmented MP4 or WebM without a length), which many gallery
     * apps cannot index, so the export would look missing. This rewrites it into a normal, seekable file.
     */
    private static boolean remux(File src, MediaMuxer mux) {
        MediaExtractor ex = new MediaExtractor();
        boolean started = false;
        try {
            ex.setDataSource(src.getAbsolutePath());
            int n = ex.getTrackCount();
            int[] map = new int[n];
            int maxIn = 1 << 20;
            for (int i = 0; i < n; i++) {
                MediaFormat f = ex.getTrackFormat(i);
                String m = f.getString(MediaFormat.KEY_MIME);
                map[i] = -1;
                if (m == null || !(m.startsWith("video/") || m.startsWith("audio/"))) continue;
                ex.selectTrack(i);
                map[i] = mux.addTrack(f);
                if (f.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) maxIn = Math.max(maxIn, f.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE));
            }
            mux.start();
            started = true;
            ByteBuffer buf = ByteBuffer.allocate(Math.max(maxIn, 8 << 20));
            MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
            long[] last = new long[n];
            Arrays.fill(last, -1);
            int samples = 0;
            while (true) {
                int ti = ex.getSampleTrackIndex();
                if (ti < 0) break;
                int size = ex.readSampleData(buf, 0);
                if (size < 0) break;
                long pts = Math.max(0, ex.getSampleTime());
                if (pts <= last[ti]) pts = last[ti] + 1; // the muxer needs rising timestamps per track
                last[ti] = pts;
                info.set(0, size, pts, (ex.getSampleFlags() & MediaExtractor.SAMPLE_FLAG_SYNC) != 0 ? MediaCodec.BUFFER_FLAG_KEY_FRAME : 0);
                if (map[ti] >= 0) { mux.writeSampleData(map[ti], buf, info); samples++; }
                ex.advance();
            }
            mux.stop();
            return samples > 0;
        } catch (Exception e) {
            return false;
        } finally {
            if (!started) try { mux.stop(); } catch (Exception ignored) { }
            try { mux.release(); } catch (Exception ignored) { }
            ex.release();
        }
    }

    private static void copyFile(File src, OutputStream o) throws java.io.IOException {
        try (InputStream in = new FileInputStream(src)) {
            byte[] b = new byte[1 << 16];
            int r;
            while ((r = in.read(b)) > 0) o.write(b, 0, r);
        }
    }

    private void startView(Uri uri, String mime) {
        Intent view = new Intent(Intent.ACTION_VIEW);
        view.setDataAndType(uri, mime == null || mime.isEmpty() ? "video/*" : mime.split(";")[0]);
        view.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try { startActivity(view); } catch (Exception ignored) { }
    }

    private void startShare(Uri uri, String mime) {
        Intent send = new Intent(Intent.ACTION_SEND);
        send.setType(mime == null || mime.isEmpty() ? "*/*" : mime.split(";")[0]);
        send.putExtra(Intent.EXTRA_STREAM, uri);
        send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try { startActivity(Intent.createChooser(send, "Share")); } catch (Exception ignored) { }
    }
}
