/* FORGIA – motore di analisi: storico e andamento dei dolori, statistiche di allenamento.
   Funzioni pure sui dati del profilo (nessun accesso alla rete): servono all'app, all'export e all'area allenatore. */
(function (F) {
  'use strict';
  const DAY = 864e5, T = s => new Date(s + 'T00:00:00').getTime(), ISO = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const r1 = x => Math.round(x * 10) / 10;
  F.isoAddDays = (s, n) => ISO(T(s) + n * DAY);
  F.mondayOf = s => { const d = new Date(T(s)); const w = (d.getDay() + 6) % 7; return ISO(d.getTime() - w * DAY); };

  /* ---------- DOLORI ---------- */
  const STATUS = { new: 'Nuovo', up: 'In aumento', down: 'In calo', flat: 'Stabile', clear: 'Azzerato' };
  F.PAIN_STATUS = STATUS;
  /** Andamento dei dolori per zona: eventi giornalieri, episodi (inizio → azzeramento), stato e variazione a 7 giorni. */
  F.painHistory = function (p, today) {
    today = today || F.todayISO();
    const log = (p.painLog || []).filter(e => e && F.ZONES[e.zone] && e.date).map((e, i) => ({ date: String(e.date), zone: e.zone, level: Math.min(10, Math.max(0, +e.level || 0)), i }));
    const byZone = {};
    log.forEach(e => (byZone[e.zone] = byZone[e.zone] || []).push(e));
    Object.entries(p.pain || {}).forEach(([z, v]) => { if (v > 0 && F.ZONES[z] && !byZone[z]) byZone[z] = [{ date: p.createdAt || today, zone: z, level: v, i: 0 }]; });
    const out = [];
    Object.keys(byZone).forEach(z => {
      const ev = byZone[z].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.i - b.i);
      const days = []; ev.forEach(e => { const l = days[days.length - 1]; if (l && l.date === e.date) l.level = e.level; else days.push({ date: e.date, level: e.level }); });
      /* il dolore attuale è quello che l'utente ha adesso (p.pain): lo storico non può contraddirlo */
      if (p.pain && typeof p.pain === 'object' && days.length) { const truth = Math.min(10, Math.max(0, +p.pain[z] || 0)); if (days[days.length - 1].level !== truth) days[days.length - 1].level = truth; }
      /* eventi: variazioni rispetto al valore precedente */
      const changes = []; let prev = 0, start = null, episodes = [];
      days.forEach(d => {
        if (d.level === prev) return;
        const kind = prev === 0 ? 'new' : d.level === 0 ? 'clear' : d.level > prev ? 'up' : 'down';
        changes.push({ date: d.date, from: prev, to: d.level, kind });
        if (prev === 0) { start = d.date; episodes.push({ start: d.date, end: null, peak: d.level }); }
        const ep = episodes[episodes.length - 1];
        if (ep && !ep.end) { ep.peak = Math.max(ep.peak, d.level); if (d.level === 0) ep.end = d.date; }
        prev = d.level;
      });
      const cur = prev, last = changes[changes.length - 1];
      const ref = F.isoAddDays(today, -7); let l7 = 0; days.forEach(d => { if (d.date <= ref) l7 = d.level; });
      let status = cur === 0 ? 'clear' : (last && last.kind === 'new' && changes.length === 1 ? 'new' : last && last.kind === 'up' ? 'up' : last && last.kind === 'down' ? 'down' : 'flat');
      const open = episodes.find(e => !e.end);
      const delta7 = cur - l7;
      /* se il livello non cambia da più di 7 giorni, l'andamento recente è "stabile" */
      if (cur > 0 && last && T(today) - T(last.date) > 7 * DAY && status !== 'new') status = 'flat';
      out.push({ zone: z, label: F.ZONES[z], level: cur, status, statusLabel: STATUS[status], peak: Math.max(...days.map(d => d.level)), first: days[0].date, lastChange: last ? last.date : days[0].date,
        clearedOn: cur === 0 && episodes.length ? episodes[episodes.length - 1].end : null, openSince: open ? open.start : null,
        daysActive: open ? Math.round((T(today) - T(open.start)) / DAY) : (episodes.length && episodes[episodes.length - 1].end ? Math.round((T(episodes[episodes.length - 1].end) - T(episodes[episodes.length - 1].start)) / DAY) : 0),
        delta7, days, changes, episodes });
    });
    return out.sort((a, b) => (b.level - a.level) || (a.label < b.label ? -1 : 1));
  };
  /** Zone il cui dolore sta peggiorando (utile per l'allenatore). */
  F.painAlerts = p => F.painHistory(p).filter(h => h.level > 0 && (h.status === 'up' || h.status === 'new' && h.level >= 4 || h.level >= 7));
  /** Sedute svolte in una data (per collegare un aumento di dolore agli esercizi fatti). */
  F.sessionsOn = (p, date) => (p.sessions || []).filter(s => s.date === date);

  /* ---------- STATISTICHE DI ALLENAMENTO ---------- */
  const setVol = s => (s.kg > 0 && s.reps > 0 ? s.kg * s.reps : 0);
  F.sessionStats = function (s) {
    let sets = 0, vol = 0, rpeS = 0, rpeN = 0;
    s.ex.forEach(e => e.sets.forEach(t => { sets++; vol += setVol(t); if (t.rpe) { rpeS += t.rpe; rpeN++; } }));
    return { exercises: s.ex.length, sets, volume: Math.round(vol), rpe: rpeN ? r1(rpeS / rpeN) : null };
  };
  /** Serie ponderate per muscolo e settimana (primari 1, secondari 0.5). */
  F.weeklyMuscleSets = function (p) {
    const m = {};
    (p.sessions || []).forEach(s => {
      const wk = F.mondayOf(s.date);
      s.ex.forEach(e => { const x = F.EXMAP[e.exId]; if (!x) return; const n = e.sets.length; x.prim.forEach(k => { const key = wk + '|' + k; m[key] = (m[key] || 0) + n; }); (x.sec || []).forEach(k => { const key = wk + '|' + k; m[key] = (m[key] || 0) + n * 0.5; }); });
    });
    return Object.entries(m).map(([k, v]) => { const [week, muscle] = k.split('|'); return { week, muscle, label: F.MUSCLE_LABEL[muscle] || muscle, sets: r1(v) }; }).sort((a, b) => a.week < b.week ? -1 : a.week > b.week ? 1 : a.label < b.label ? -1 : 1);
  };
  /** Per esercizio: miglior stima 1RM, ultimo valore, variazione, record. */
  F.exerciseStats = function (p) {
    const m = {};
    (p.sessions || []).slice().sort((a, b) => a.date < b.date ? -1 : 1).forEach(s => s.ex.forEach(e => {
      const o = m[e.exId || e.name] = m[e.exId || e.name] || { exId: e.exId, name: e.name, sessions: 0, firstE1: null, lastE1: null, bestE1: 0, bestKg: 0, prDate: null, lastDate: null };
      let best = 0, kg = 0; e.sets.forEach(t => { const v = F.e1rm(t.kg, t.reps) || 0; if (v > best) best = v; if (t.kg > kg) kg = t.kg; });
      o.sessions++; o.lastDate = s.date; if (kg > o.bestKg) o.bestKg = kg;
      if (best) { if (o.firstE1 == null) o.firstE1 = best; o.lastE1 = best; if (best > o.bestE1) { o.bestE1 = best; o.prDate = s.date; } }
    }));
    return Object.values(m).map(o => Object.assign(o, { change: o.firstE1 && o.lastE1 ? r1((o.lastE1 / o.firstE1 - 1) * 100) : null })).sort((a, b) => b.sessions - a.sessions);
  };
  /** Quadro d'insieme del cliente, usato in riepilogo, export e area allenatore. */
  F.clientStats = function (p, today) {
    today = today || F.todayISO();
    const ss = (p.sessions || []).slice().sort((a, b) => a.date < b.date ? -1 : 1), from28 = F.isoAddDays(today, -28), from7 = F.isoAddDays(today, -7);
    const rec = ss.filter(s => s.date >= from28), st = ss.map(F.sessionStats);
    const vol28 = rec.reduce((a, s) => a + F.sessionStats(s).volume, 0);
    const rp = rec.map(s => F.sessionStats(s).rpe).filter(x => x != null);
    const target = Math.max(1, +p.days || 3), weeks = 4;
    const lastDate = ss.length ? ss[ss.length - 1].date : null;
    const w = (p.weights || []).slice().sort((a, b) => a.date < b.date ? -1 : 1);
    const ph = F.painHistory(p, today);
    return { sessions: ss.length, last: lastDate, daysSince: lastDate ? Math.round((T(today) - T(lastDate)) / DAY) : null, sessions28: rec.length, sessions7: ss.filter(s => s.date >= from7).length,
      adherence: Math.min(100, Math.round(rec.length / (target * weeks) * 100)), volume28: vol28, rpe28: rp.length ? r1(rp.reduce((a, b) => a + b, 0) / rp.length) : null,
      weight: w.length ? w[w.length - 1].kg : p.weight, weightDelta: w.length > 1 ? r1(w[w.length - 1].kg - w[0].kg) : 0,
      pain: ph.filter(h => h.level > 0), painAll: ph, alerts: F.painAlerts(p), totalSets: st.reduce((a, s) => a + s.sets, 0) };
  };
})(window.FORMA);
