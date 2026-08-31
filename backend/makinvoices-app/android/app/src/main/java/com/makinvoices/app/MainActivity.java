package com.makinvoices.app;

import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        setupWebView();
    }

    private void setupWebView() {
        WebView webView = bridge.getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

            CookieManager.getInstance().setAcceptCookie(true);
            CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

            webView.setDownloadListener(new DownloadListener() {
                @Override
                public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
                    try {
                        if (url.startsWith("blob:") || url.startsWith("data:")) {
                            Toast.makeText(getApplicationContext(), "Preparing PDF export...", Toast.LENGTH_SHORT).show();
                            return;
                        }
                        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                        String filename = URLUtil.guessFileName(url, contentDisposition, mimeType);
                        if (filename == null || filename.endsWith(".bin") || filename.isEmpty()) {
                            filename = "MakInvoice_" + System.currentTimeMillis() + ".pdf";
                        }
                        request.setMimeType(mimeType != null && !mimeType.isEmpty() ? mimeType : "application/pdf");
                        String cookies = CookieManager.getInstance().getCookie(url);
                        request.addRequestHeader("cookie", cookies);
                        request.addRequestHeader("User-Agent", userAgent);
                        request.setDescription("Downloading MakInvoices document...");
                        request.setTitle(filename);
                        request.allowScanningByMediaScanner();
                        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                        request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);

                        DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                        if (dm != null) {
                            dm.enqueue(request);
                            Toast.makeText(getApplicationContext(), "Downloading " + filename, Toast.LENGTH_SHORT).show();
                        }
                    } catch (Exception e) {
                        Toast.makeText(getApplicationContext(), "Download failed: " + e.getLocalizedMessage(), Toast.LENGTH_LONG).show();
                    }
                }
            });
        }
    }

    @Override
    public void onBackPressed() {
        WebView webView = bridge.getWebView();
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
