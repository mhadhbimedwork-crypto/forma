package it.forma.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class RestTimerReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        String a = i == null ? null : i.getAction();
        if (a == null) return;
        if (RestTimerCore.A_ADD.equals(a)) RestTimerCore.adjust(c, 30);
        else if (RestTimerCore.A_SUB.equals(a)) RestTimerCore.adjust(c, -30);
        else if (RestTimerCore.A_STOP.equals(a)) RestTimerCore.stop(c);
        else if (RestTimerCore.A_END.equals(a)) RestTimerCore.fire(c);
    }
}
