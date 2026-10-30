package com.splashcut.app;

import android.Manifest;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
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
import java.io.FileOutputStream;
import java.io.OutputStream;
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

    private static class Save { Uri uri; File file; OutputStream out; String mime; boolean image; }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(0xFF0B0D14);
        getWindow().setNavigationBarColor(0xFF0B0D14);

        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) WebView.setWebContentsDebuggingEnabled(true);

        web = new WebView(this);
        web.setBackgroundColor(0xFF0B0D14);
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
        for (Save s : saves.values()) { try { s.out.close(); } catch (Exception ignored) { } }
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
                s.mime = (mime == null || mime.isEmpty()) ? "video/mp4" : mime.split(";")[0];
                s.image = s.mime.startsWith("image/");
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                    cv.put(MediaStore.MediaColumns.MIME_TYPE, s.mime);
                    cv.put(MediaStore.MediaColumns.RELATIVE_PATH, (s.image ? Environment.DIRECTORY_PICTURES : Environment.DIRECTORY_MOVIES) + "/SplashCut");
                    cv.put(MediaStore.MediaColumns.IS_PENDING, 1);
                    s.uri = getContentResolver().insert(s.image ? MediaStore.Images.Media.EXTERNAL_CONTENT_URI : MediaStore.Video.Media.EXTERNAL_CONTENT_URI, cv);
                    if (s.uri == null) return "";
                    s.out = new BufferedOutputStream(getContentResolver().openOutputStream(s.uri), 1 << 16);
                } else {
                    String dirType = s.image ? Environment.DIRECTORY_PICTURES : Environment.DIRECTORY_MOVIES;
                    File dir = new File(Environment.getExternalStoragePublicDirectory(dirType), "SplashCut");
                    if (!dir.exists() && !dir.mkdirs()) dir = getExternalFilesDir(dirType);
                    s.file = new File(dir, name);
                    s.out = new BufferedOutputStream(new FileOutputStream(s.file), 1 << 16);
                }
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
            try {
                s.out.flush();
                s.out.close();
                if (s.uri != null) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.MediaColumns.IS_PENDING, 0);
                    getContentResolver().update(s.uri, cv, null, null);
                    return s.uri.toString();
                }
                MediaScannerConnection.scanFile(MainActivity.this, new String[]{s.file.getAbsolutePath()}, new String[]{s.mime}, null);
                return "file:" + s.file.getAbsolutePath();
            } catch (Exception e) {
                return "";
            }
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

    private void startShare(Uri uri, String mime) {
        Intent send = new Intent(Intent.ACTION_SEND);
        send.setType(mime == null || mime.isEmpty() ? "*/*" : mime.split(";")[0]);
        send.putExtra(Intent.EXTRA_STREAM, uri);
        send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try { startActivity(Intent.createChooser(send, "Share")); } catch (Exception ignored) { }
    }
}
