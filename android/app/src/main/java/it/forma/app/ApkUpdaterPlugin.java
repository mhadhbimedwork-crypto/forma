package it.forma.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** Aggiornamento dell'APK da dentro l'app: scarica la release ufficiale e apre l'installazione di Android (che chiede la conferma). */
@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {
    private static final String ALLOWED = "https://github.com/mhadhbimedwork-crypto/forma/releases/download/";

    @PluginMethod
    public void canInstall(PluginCall call) {
        boolean ok = Build.VERSION.SDK_INT < 26 || getContext().getPackageManager().canRequestPackageInstalls();
        JSObject o = new JSObject();
        o.put("ok", ok);
        call.resolve(o);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Throwable t) {
            call.reject("impostazioni non apribili");
        }
    }

    @PluginMethod
    public void install(final PluginCall call) {
        final String url = call.getString("url", "");
        if (url == null || !url.startsWith(ALLOWED)) { call.reject("indirizzo non consentito"); return; }
        final Context c = getContext();
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    File dir = new File(c.getCacheDir(), "updates");
                    if (!dir.exists()) dir.mkdirs();
                    File f = new File(dir, "aggiornamento.apk");
                    HttpURLConnection h = (HttpURLConnection) new URL(url).openConnection();
                    h.setConnectTimeout(20000);
                    h.setReadTimeout(30000);
                    h.setInstanceFollowRedirects(true);
                    if (h.getResponseCode() != 200) { call.reject("download non riuscito (" + h.getResponseCode() + ")"); return; }
                    InputStream in = h.getInputStream();
                    FileOutputStream out = new FileOutputStream(f);
                    byte[] buf = new byte[65536];
                    int n;
                    long tot = 0;
                    while ((n = in.read(buf)) > 0) { out.write(buf, 0, n); tot += n; }
                    out.close();
                    in.close();
                    if (tot < 1000000) { call.reject("file scaricato incompleto"); return; }
                    Uri u = FileProvider.getUriForFile(c, c.getPackageName() + ".fileprovider", f);
                    Intent i = new Intent(Intent.ACTION_VIEW);
                    i.setDataAndType(u, "application/vnd.android.package-archive");
                    i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                    c.startActivity(i);
                    call.resolve();
                } catch (Throwable t) {
                    call.reject("errore: " + t.getMessage());
                }
            }
        }).start();
    }
}
