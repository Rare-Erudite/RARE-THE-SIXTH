#!/bin/bash
set -e

echo "=== [1/8] Building Web Production Assets with Vite ==="
npm run build

BUILD_DIR="/tmp/android_apk_build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/src/com/rare/ai/intelligence"
mkdir -p "$BUILD_DIR/bin/classes"
mkdir -p "$BUILD_DIR/res/values"
mkdir -p "$BUILD_DIR/res/mipmap-mdpi"
mkdir -p "$BUILD_DIR/res/mipmap-hdpi"
mkdir -p "$BUILD_DIR/res/mipmap-xhdpi"
mkdir -p "$BUILD_DIR/res/mipmap-xxhdpi"
mkdir -p "$BUILD_DIR/res/mipmap-xxxhdpi"
mkdir -p "$BUILD_DIR/assets/www"

# 2. Copy web assets to assets/www
echo "=== [2/8] Packaging Web Application Bundle ==="
cp -r dist/* "$BUILD_DIR/assets/www/"

# 3. Bundle Offline Knowledge Corpus & Assets
echo "=== [3/8] Packaging Knowledge Corpus and Assets ==="
python3 scripts/prepare_apk_assets.py "$BUILD_DIR/assets"

# 4. App Launcher Icons
echo "=== [4/8] Installing High-Density Launcher Icons ==="
cp public/pwa-192x192.png "$BUILD_DIR/res/mipmap-mdpi/ic_launcher.png"
cp public/pwa-192x192.png "$BUILD_DIR/res/mipmap-hdpi/ic_launcher.png"
cp public/pwa-192x192.png "$BUILD_DIR/res/mipmap-xhdpi/ic_launcher.png"
cp public/pwa-512x512.png "$BUILD_DIR/res/mipmap-xxhdpi/ic_launcher.png"
cp public/pwa-512x512.png "$BUILD_DIR/res/mipmap-xxxhdpi/ic_launcher.png"

# 5. Strings & XML
cat << 'EOF' > "$BUILD_DIR/res/values/strings.xml"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">RARE</string>
</resources>
EOF

cat << 'EOF' > "$BUILD_DIR/AndroidManifest.xml"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.rare.ai.intelligence"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="34" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="true">

        <activity
            android:name="com.rare.ai.intelligence.MainActivity"
            android:label="@string/app_name"
            android:configChanges="orientation|screenSize|keyboardHidden|screenLayout"
            android:windowSoftInputMode="adjustResize"
            android:theme="@android:style/Theme.NoTitleBar"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

# 6. Native MainActivity with Embedded Local Asset Server & Splash Screen
cat << 'EOF' > "$BUILD_DIR/src/com/rare/ai/intelligence/MainActivity.java"
package com.rare.ai.intelligence;

import android.app.Activity;
import android.content.Intent;
import android.content.res.AssetManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Button;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;

public class MainActivity extends Activity {
    private WebView mWebView;
    private FrameLayout mRootLayout;
    private LinearLayout mSplashLayout;
    private ProgressBar mProgressBar;
    private TextView mStatusText;
    private boolean mHasLoadedSuccessfully = false;
    private LocalAssetServer mServer;
    private Handler mHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        Window window = getWindow();
        window.setFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED, WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.setStatusBarColor(Color.parseColor("#03040A"));
            window.setNavigationBarColor(Color.parseColor("#03040A"));
        }

        mRootLayout = new FrameLayout(this);
        mRootLayout.setBackgroundColor(Color.parseColor("#03040A"));

        // 1. Setup WebView
        setupWebView();
        mRootLayout.addView(mWebView);

        // 2. Setup Splash Screen Overlay (Guarantees NO BLANK SCREEN ever)
        setupSplashScreen();
        mRootLayout.addView(mSplashLayout);

        setContentView(mRootLayout);

        // 3. Start Local HTTP Server for local web assets
        startLocalServerAndLoad();

        // 4. Watchdog fallback: Reveal WebView after timeout if needed
        mHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (!mHasLoadedSuccessfully) {
                    if (mWebView != null && mSplashLayout != null) {
                        mSplashLayout.setVisibility(View.GONE);
                        mWebView.setVisibility(View.VISIBLE);
                    }
                }
            }
        }, 6000);
    }

    private void setupWebView() {
        mWebView = new WebView(this);
        mWebView.setBackgroundColor(Color.parseColor("#03040A"));
        mWebView.setVisibility(View.INVISIBLE);

        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setSupportZoom(false);

        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                if (mStatusText != null) {
                    mStatusText.setText("Initializing RARE Intelligence...");
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                mHasLoadedSuccessfully = true;
                if (mWebView != null && mSplashLayout != null) {
                    mWebView.setVisibility(View.VISIBLE);
                    mSplashLayout.setVisibility(View.GONE);
                }
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                super.onReceivedError(view, errorCode, description, failingUrl);
                if (failingUrl != null && failingUrl.startsWith("http://127.0.0.1")) {
                    view.loadUrl("file:///android_asset/www/index.html");
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("http://127.0.0.1") || url.startsWith("file:///android_asset/")) {
                    return false;
                }
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }
        });

        mWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                super.onProgressChanged(view, newProgress);
                if (mProgressBar != null) {
                    mProgressBar.setProgress(newProgress);
                }
                if (newProgress >= 85 && !mHasLoadedSuccessfully) {
                    mHasLoadedSuccessfully = true;
                    mWebView.setVisibility(View.VISIBLE);
                    mSplashLayout.setVisibility(View.GONE);
                }
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                request.grant(request.getResources());
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                return super.onConsoleMessage(consoleMessage);
            }
        });
    }

    private void setupSplashScreen() {
        mSplashLayout = new LinearLayout(this);
        mSplashLayout.setOrientation(LinearLayout.VERTICAL);
        mSplashLayout.setGravity(Gravity.CENTER);
        mSplashLayout.setBackgroundColor(Color.parseColor("#03040A"));
        mSplashLayout.setLayoutParams(new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        TextView titleText = new TextView(this);
        titleText.setText("RARE");
        titleText.setTextSize(36);
        titleText.setTextColor(Color.WHITE);
        titleText.setGravity(Gravity.CENTER);
        titleText.setPadding(0, 0, 0, 8);
        mSplashLayout.addView(titleText);

        TextView subTitle = new TextView(this);
        subTitle.setText("Autonomous AI Intelligence Core");
        subTitle.setTextSize(14);
        subTitle.setTextColor(Color.parseColor("#818CF8"));
        subTitle.setGravity(Gravity.CENTER);
        subTitle.setPadding(0, 0, 0, 32);
        mSplashLayout.addView(subTitle);

        mProgressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        mProgressBar.setIndeterminate(true);
        LinearLayout.LayoutParams pbParams = new LinearLayout.LayoutParams(400, 12);
        pbParams.setMargins(0, 0, 0, 16);
        mProgressBar.setLayoutParams(pbParams);
        mSplashLayout.addView(mProgressBar);

        mStatusText = new TextView(this);
        mStatusText.setText("Loading Intelligence Core...");
        mStatusText.setTextSize(12);
        mStatusText.setTextColor(Color.parseColor("#94A3B8"));
        mStatusText.setGravity(Gravity.CENTER);
        mSplashLayout.addView(mStatusText);
    }

    private void startLocalServerAndLoad() {
        try {
            mServer = new LocalAssetServer(getAssets());
            mServer.start();
            final String url = "http://127.0.0.1:" + mServer.getPort() + "/index.html";
            mWebView.loadUrl(url);
        } catch (Exception e) {
            mWebView.loadUrl("file:///android_asset/www/index.html");
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (mServer != null) {
            mServer.stop();
        }
    }

    @Override
    public void onBackPressed() {
        if (mWebView != null && mWebView.canGoBack()) {
            mWebView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    // --- Embedded Lightweight Local HTTP Server ---
    private static class LocalAssetServer implements Runnable {
        private final AssetManager mAssetManager;
        private ServerSocket mServerSocket;
        private int mPort;
        private volatile boolean mRunning = false;
        private Thread mThread;

        public LocalAssetServer(AssetManager assetManager) throws IOException {
            mAssetManager = assetManager;
            mServerSocket = new ServerSocket(0);
            mPort = mServerSocket.getLocalPort();
        }

        public int getPort() {
            return mPort;
        }

        public void start() {
            mRunning = true;
            mThread = new Thread(this);
            mThread.setDaemon(true);
            mThread.start();
        }

        public void stop() {
            mRunning = false;
            try {
                if (mServerSocket != null) mServerSocket.close();
            } catch (IOException ignored) {}
        }

        @Override
        public void run() {
            while (mRunning) {
                try {
                    Socket socket = mServerSocket.accept();
                    handleClient(socket);
                } catch (IOException e) {
                    if (!mRunning) break;
                }
            }
        }

        private void handleClient(final Socket socket) {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        InputStream in = socket.getInputStream();
                        OutputStream out = socket.getOutputStream();

                        byte[] buffer = new byte[2048];
                        int read = in.read(buffer);
                        if (read <= 0) {
                            socket.close();
                            return;
                        }
                        String request = new String(buffer, 0, read);
                        String[] lines = request.split("\r\n");
                        if (lines.length == 0) {
                            socket.close();
                            return;
                        }
                        String[] parts = lines[0].split(" ");
                        if (parts.length < 2) {
                            socket.close();
                            return;
                        }
                        String rawPath = parts[1];
                        if (rawPath.contains("?")) {
                            rawPath = rawPath.substring(0, rawPath.indexOf("?"));
                        }
                        if (rawPath.equals("/") || rawPath.isEmpty()) {
                            rawPath = "/index.html";
                        }
                        String assetPath = "www" + (rawPath.startsWith("/") ? rawPath : "/" + rawPath);

                        try {
                            InputStream assetStream = mAssetManager.open(assetPath);
                            ByteArrayOutputStream baos = new ByteArrayOutputStream();
                            byte[] chunk = new byte[8192];
                            int bytesRead;
                            while ((bytesRead = assetStream.read(chunk)) != -1) {
                                baos.write(chunk, 0, bytesRead);
                            }
                            assetStream.close();
                            byte[] body = baos.toByteArray();

                            String mime = getMimeType(assetPath);
                            String header = "HTTP/1.1 200 OK\r\n" +
                                    "Content-Type: " + mime + "\r\n" +
                                    "Content-Length: " + body.length + "\r\n" +
                                    "Access-Control-Allow-Origin: *\r\n" +
                                    "Connection: close\r\n\r\n";
                            out.write(header.getBytes("UTF-8"));
                            out.write(body);
                            out.flush();
                        } catch (IOException notFound) {
                            String err = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n";
                            out.write(err.getBytes("UTF-8"));
                            out.flush();
                        }
                        socket.close();
                    } catch (Exception ignored) {
                        try { socket.close(); } catch (Exception ignore2) {}
                    }
                }
            }).start();
        }

        private static String getMimeType(String path) {
            String lower = path.toLowerCase();
            if (lower.endsWith(".html")) return "text/html; charset=utf-8";
            if (lower.endsWith(".js")) return "application/javascript; charset=utf-8";
            if (lower.endsWith(".css")) return "text/css; charset=utf-8";
            if (lower.endsWith(".json") || lower.endsWith(".webmanifest")) return "application/json";
            if (lower.endsWith(".png")) return "image/png";
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
            if (lower.endsWith(".svg")) return "image/svg+xml";
            if (lower.endsWith(".ico")) return "image/x-icon";
            if (lower.endsWith(".woff2")) return "font/woff2";
            if (lower.endsWith(".woff")) return "font/woff";
            return "application/octet-stream";
        }
    }
}
EOF

ANDROID_JAR="/usr/lib/android-sdk/platforms/android-23/android.jar"

echo "=== [5/8] Generating R.java with AAPT ==="
aapt package -m -J "$BUILD_DIR/src" \
  -M "$BUILD_DIR/AndroidManifest.xml" \
  -S "$BUILD_DIR/res" \
  -I "$ANDROID_JAR"

echo "=== [6/8] Compiling Java Bytecode with ECJ ==="
ecj -proc:none -cp "$ANDROID_JAR" -source 1.8 -target 1.8 -d "$BUILD_DIR/bin/classes" \
  "$BUILD_DIR/src/com/rare/ai/intelligence/R.java" \
  "$BUILD_DIR/src/com/rare/ai/intelligence/MainActivity.java"

echo "=== [7/8] Converting Bytecode to Dalvik classes.dex ==="
dalvik-exchange --dex --output="$BUILD_DIR/bin/classes.dex" "$BUILD_DIR/bin/classes"

echo "=== [8/8] Packaging, Aligning & Signing Standalone Release APK ==="
aapt package -f \
  -M "$BUILD_DIR/AndroidManifest.xml" \
  -S "$BUILD_DIR/res" \
  -A "$BUILD_DIR/assets" \
  -I "$ANDROID_JAR" \
  -F "$BUILD_DIR/bin/unaligned.apk"

# Inject classes.dex into the APK
cd "$BUILD_DIR/bin"
aapt add unaligned.apk classes.dex

# 4-byte alignment
zipalign -v -p 4 "$BUILD_DIR/bin/unaligned.apk" "$BUILD_DIR/bin/aligned.apk"

# Keytool and Apksigner (v1 + v2 + v3)
KEYSTORE="/tmp/rare_release.keystore"
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkey -v -keystore "$KEYSTORE" -alias rarekey -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass androidrare -keypass androidrare \
    -dname "CN=RARE Intelligence, OU=Mobile, O=RARE Core, L=Global, S=Global, C=US"
fi

apksigner sign --ks "$KEYSTORE" --ks-pass pass:androidrare --key-pass pass:androidrare \
  --ks-key-alias rarekey --out "$BUILD_DIR/bin/rare-v1.0.0-release.apk" "$BUILD_DIR/bin/aligned.apk"

echo "=== Verifying APK Signature Schemes ==="
apksigner verify --verbose "$BUILD_DIR/bin/rare-v1.0.0-release.apk"

mkdir -p /exports /app/applet/exports
cp "$BUILD_DIR/bin/rare-v1.0.0-release.apk" /exports/rare-v1.0.0-release.apk 2>/dev/null || true
cp "$BUILD_DIR/bin/rare-v1.0.0-release.apk" /app/applet/exports/rare-v1.0.0-release.apk 2>/dev/null || true

echo "=== Android APK Successfully Created and Exported! ==="
ls -lh /app/applet/exports/rare-v1.0.0-release.apk
