/* FORGIA – motore del recupero muscolare.
   Per ogni muscolo somma la fatica delle serie fatte (peso rispetto al massimale stimato, sforzo RPE, muscoli principali e secondari),
   la fa decadere nel tempo (più lenta per muscoli grandi, adulti oltre i 40 anni e fase di rientro, più veloce per i giovani)
   e restituisce la percentuale di recupero e le ore che mancano. Stima indicativa, non una misura medica. */
(function (F) {
  const LARGE = { quads: 1, glutes: 1, hams: 1, lats: 1, chest: 1, lowback: 1, upback: 0.9 };
  const BASE_H = { large: 60, mid: 48, small: 38 };   // ore di recupero di riferimento per ~9 serie dure
  const SIZE = m => LARGE[m] ? 'large' : (m === 'delts' || m === 'adductors' ? 'mid' : 'small');
  const SEC_W = 0.45;       // i muscoli secondari pesano meno
  const FULL = 0.05;        // sotto il 5% di fatica residua = recuperato

  const effort = r => r == null || r === '' ? 1 : r >= 9.5 ? 1.25 : r >= 8.5 ? 1.12 : r >= 7.5 ? 1 : r >= 6.5 ? 0.82 : r >= 5.5 ? 0.65 : 0.45;
  const when = s => s.at || new Date(s.date + 'T18:00:00').getTime();

  F.recoverySpeed = function (p) {
    let k = 1;
    const age = F.calc ? F.calc(p).age : 30;
    if (age < 18) k *= 0.88; else if (age >= 50) k *= 1.25; else if (age >= 40) k *= 1.12;
    if (F.isReturning && F.isReturning(p)) k *= 1.1;
    return k;
  };

  F.recovery = function (p, now) {
    now = now || Date.now();
    const bw = +p.weight || 75, speed = F.recoverySpeed(p), out = {};
    Object.keys(F.MUSCLE_LABEL).forEach(m => { out[m] = { fat: 0, sets: 0, last: null, pct: 100, hours: 0 }; });
    const sessions = (p.sessions || []).slice().sort((a, b) => when(a) - when(b));
    // 1RM stimato: miglior serie nota per esercizio
    const best = {};
    sessions.forEach(s => (s.ex || []).forEach(e => (e.sets || []).forEach(x => { if (x.kg > 0 && x.reps > 0) { const r = x.kg * (1 + Math.min(x.reps, 20) / 30); if (!best[e.exId] || r > best[e.exId]) best[e.exId] = r; } })));
    sessions.forEach(s => {
      const t = when(s), dh = (now - t) / 36e5; if (dh < 0 || dh > 24 * 21) return;
      const per = {};
      (s.ex || []).forEach(e => {
        const def = F.EXMAP && F.EXMAP[e.exId]; if (!def) return;
        (e.sets || []).forEach(x => {
          if (!(x.reps > 0) && !(def.unit === 'sec')) return;
          const rm = best[e.exId], rel = x.kg > 0 && rm ? Math.min(1, x.kg / rm) : 0.7;
          const reps = x.reps || 0, hard = rel >= 0.5 || reps >= 6 || x.rpe >= 7;
          if (!hard && !(x.rpe >= 7)) { /* serie molto leggera: conta poco */ }
          const w = (0.5 + 0.7 * rel) * effort(x.rpe) * (hard ? 1 : 0.5);
          def.prim.forEach(m => { per[m] = (per[m] || 0) + w; });
          def.sec.forEach(m => { per[m] = (per[m] || 0) + w * SEC_W; });
        });
      });
      Object.keys(per).forEach(m => {
        if (!out[m]) return;
        const tau = BASE_H[SIZE(m)] * speed / 3;                   // dopo ~3 tau il muscolo è recuperato
        const f = Math.min(1, 0.105 * per[m]);                      // ~9-10 serie dure = fatica piena
        out[m].fat += f * Math.exp(-dh / tau); out[m].sets += per[m];
        out[m].last = Math.max(out[m].last || 0, t); out[m]._tau = tau;
      });
    });
    Object.keys(out).forEach(m => {
      const o = out[m]; o.fat = Math.min(1, o.fat);
      o.pct = Math.round(100 * (1 - o.fat));
      o.hours = o.fat > FULL ? Math.ceil((o._tau || BASE_H[SIZE(m)] * speed / 3) * Math.log(o.fat / FULL)) : 0;
      o.sets = Math.round(o.sets * 10) / 10; delete o._tau;
    });
    return out;
  };

  /* recupero medio dei muscoli che lavora una seduta (principali pesano più dei secondari) */
  F.dayReadiness = function (p, day, rec) {
    rec = rec || F.recovery(p);
    let sum = 0, wt = 0; const need = {};
    day.exercises.forEach(x => { const d = F.EXMAP[x.exId]; if (!d) return; d.prim.forEach(m => { need[m] = Math.max(need[m] || 0, 1); }); d.sec.forEach(m => { need[m] = Math.max(need[m] || 0, 0.4); }); });
    Object.keys(need).forEach(m => { sum += rec[m].pct * need[m]; wt += need[m]; });
    const worst = Object.keys(need).filter(m => need[m] === 1).sort((a, b) => rec[a].pct - rec[b].pct)[0];
    return { pct: wt ? Math.round(sum / wt) : 100, worst: worst || null };
  };

  F.recColor = pct => pct >= 90 ? '#34d399' : pct >= 70 ? '#a3e635' : pct >= 50 ? '#facc15' : pct >= 30 ? '#f97316' : '#ef4444';
  F.recLabel = pct => pct >= 90 ? 'Pronto' : pct >= 70 ? 'Quasi pronto' : pct >= 50 ? 'In recupero' : 'Affaticato';
})(window.FORMA);
