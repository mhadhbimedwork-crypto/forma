package it.forma.app;

import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(name = "RestTimer", permissions = {@Permission(alias = "notif", strings = {"android.permission.POST_NOTIFICATIONS"})})
public class RestTimerPlugin extends Plugin {

    private boolean granted() {
        return Build.VERSION.SDK_INT < 33 || getPermissionState("notif") == PermissionState.GRANTED;
    }

    @PluginMethod
    public void ensure(PluginCall call) {
        if (granted()) {
            JSObject o = new JSObject();
            o.put("granted", true);
            call.resolve(o);
        } else {
            requestPermissionForAlias("notif", call, "permDone");
        }
    }

    @PermissionCallback
    private void permDone(PluginCall call) {
        JSObject o = new JSObject();
        o.put("granted", granted());
        call.resolve(o);
    }

    @PluginMethod
    public void start(PluginCall call) {
        long end = call.getData().optLong("end", 0);
        String label = call.getData().optString("label", "Recupero");
        long total = call.getData().optLong("total", 0);
        if (end <= 0) { call.reject("end mancante"); return; }
        RestTimerCore.start(getContext(), end, label, total);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        RestTimerCore.stop(getContext());
        call.resolve();
    }

    @PluginMethod
    public void getState(PluginCall call) {
        android.content.SharedPreferences p = RestTimerCore.sp(getContext());
        JSObject o = new JSObject();
        o.put("on", p.getBoolean("on", false));
        o.put("end", p.getLong("end", 0));
        call.resolve(o);
    }
}
