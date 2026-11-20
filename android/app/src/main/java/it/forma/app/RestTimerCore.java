package it.forma.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;

import androidx.core.app.NotificationCompat;

/** Timer di recupero nel blocca schermo: notifica con conto alla rovescia (gestito dal sistema) e sveglia esatta a fine recupero. */
final class RestTimerCore {
    static final String CH_RUN = "rest_run", CH_END = "rest_end";
    static final String A_ADD = "it.forma.REST_ADD", A_SUB = "it.forma.REST_SUB", A_STOP = "it.forma.REST_STOP", A_END = "it.forma.REST_END";
    static final int ID_RUN = 7101, ID_END = 7102;

    private RestTimerCore() { }

    static SharedPreferences sp(Context c) { return c.getSharedPreferences("resttimer", Context.MODE_PRIVATE); }

    static void channels(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel a = new NotificationChannel(CH_RUN, "Timer di recupero", NotificationManager.IMPORTANCE_LOW);
        a.setShowBadge(false);
        a.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(a);
        NotificationChannel b = new NotificationChannel(CH_END, "Fine recupero", NotificationManager.IMPORTANCE_HIGH);
        b.enableVibration(true);
        b.setVibrationPattern(new long[]{0, 300, 100, 300, 100, 500});
        b.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(b);
    }

    static PendingIntent bc(Context c, String action) {
        Intent i = new Intent(c, RestTimerReceiver.class).setAction(action);
        return PendingIntent.getBroadcast(c, 10 + (action.hashCode() & 0xff), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static PendingIntent open(Context c) {
        Intent i = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        if (i == null) i = new Intent();
        return PendingIntent.getActivity(c, 1, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static Bitmap bigIcon(Context c) {
        try { return BitmapFactory.decodeResource(c.getResources(), c.getApplicationInfo().icon); } catch (Throwable t) { return null; }
    }

    static void start(Context c, long end, String label, long totalSec) {
        sp(c).edit().putBoolean("on", true).putLong("end", end).putString("label", label).putLong("total", totalSec).apply();
        show(c);
        arm(c, end);
    }

    static void show(Context c) {
        SharedPreferences p = sp(c);
        if (!p.getBoolean("on", false)) return;
        channels(c);
        long end = p.getLong("end", System.currentTimeMillis());
        String label = p.getString("label", "Recupero");
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CH_RUN)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle(label)
                .setContentText("Tempo di recupero rimasto")
                .setWhen(end)
                .setShowWhen(true)
                .setUsesChronometer(true)
                .setChronometerCountDown(true)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_PROGRESS)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setContentIntent(open(c))
                .addAction(0, "−30 s", bc(c, A_SUB))
                .addAction(0, "+30 s", bc(c, A_ADD))
                .addAction(0, "Stop", bc(c, A_STOP));
        Bitmap big = bigIcon(c);
        if (big != null) b.setLargeIcon(big);
        try { ((NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE)).notify(ID_RUN, b.build()); } catch (Throwable t) { }
    }

    static void arm(Context c, long end) {
        try {
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            am.setAlarmClock(new AlarmManager.AlarmClockInfo(end, open(c)), bc(c, A_END));
        } catch (Throwable t) { }
    }

    static void adjust(Context c, int dSec) {
        SharedPreferences p = sp(c);
        if (!p.getBoolean("on", false)) return;
        long now = System.currentTimeMillis();
        long end = Math.max(now + 1000, p.getLong("end", now) + dSec * 1000L);
        long left = (end - now) / 1000;
        p.edit().putLong("end", end).putLong("total", Math.max(p.getLong("total", 0), left)).apply();
        show(c);
        arm(c, end);
    }

    static void stop(Context c) {
        sp(c).edit().putBoolean("on", false).apply();
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        nm.cancel(ID_RUN);
        try { ((AlarmManager) c.getSystemService(Context.ALARM_SERVICE)).cancel(bc(c, A_END)); } catch (Throwable t) { }
    }

    static void fire(Context c) {
        SharedPreferences p = sp(c);
        if (!p.getBoolean("on", false)) return;
        p.edit().putBoolean("on", false).apply();
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        nm.cancel(ID_RUN);
        channels(c);
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CH_END)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("Recupero finito")
                .setContentText("Prossima serie!")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setAutoCancel(true)
                .setTimeoutAfter(60000)
                .setContentIntent(open(c));
        Bitmap big = bigIcon(c);
        if (big != null) b.setLargeIcon(big);
        try { nm.notify(ID_END, b.build()); } catch (Throwable t) { }
    }
}
