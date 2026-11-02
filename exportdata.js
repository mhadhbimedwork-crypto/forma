/* FORGIA – tabelle di export/import (Excel e CSV). Un foglio per tipo di dato, righe ordinate e in italiano.
   Lo stesso formato serve per esportare, importare e per l'area allenatore (colonna "Cliente"). */
(function (F) {
  'use strict';
  const r1 = x => Math.round(x * 10) / 10, yn = b => (b ? 'sì' : 'no');
  const MEAS = () => F.MEASURES || [];
  const KIND = { new: 'Nuovo dolore', up: 'Aumento', down: 'Calo', clear: 'Azzerato' };
  F.SHEETS = { sum: 'Riepilogo', ses: 'Sedute', sesSum: 'Sedute_Riepilogo', ex: 'Esercizi', vol: 'Volume_Muscoli', painLog: 'Dolori_Registro', painTrend: 'Dolori_Andamento', weight: 'Peso', meas: 'Misure', plans: 'Schede' };

  /** profiles: [profilo]; ritorna [{name, cols, rows}] */
  F.datasets = function (profiles, today) {
    today = today || F.todayISO();
    const S = {}, add = (k, cols) => (S[k] = { name: F.SHEETS[k], cols, rows: [] });
    add('sum', ['Cliente', 'Nato il', 'Età', 'Sesso', 'Altezza cm', 'Peso kg', 'Variazione peso kg', 'Obiettivo', 'Livello', 'Giorni/sett. previsti', 'Sedute totali', 'Ultima seduta', 'Giorni dall\'ultima', 'Sedute ultime 4 sett.', 'Aderenza 4 sett. %', 'Volume 4 sett. kg', 'RPE medio 4 sett.', 'Dolori attivi', 'Dolori in peggioramento', 'Scheda attiva']);
    add('ses', ['Cliente', 'Data', 'Seduta', 'Scheda', 'Esercizio', 'Serie', 'kg', 'Ripetizioni o secondi', 'RPE', 'Volume kg', '1RM stimato kg']);
    add('sesSum', ['Cliente', 'Data', 'Seduta', 'Scheda', 'Esercizi', 'Serie', 'Volume kg', 'RPE medio']);
    add('ex', ['Cliente', 'Esercizio', 'Sedute', 'Ultima volta', 'Miglior carico kg', 'Miglior 1RM stimato', 'Ultimo 1RM stimato', 'Variazione 1RM %', 'Data record']);
    add('vol', ['Cliente', 'Settimana dal', 'Muscolo', 'Serie ponderate']);
    add('painLog', ['Cliente', 'Data', 'Zona', 'Livello 0-10', 'Prima', 'Evento', 'Sedute di quel giorno']);
    add('painTrend', ['Cliente', 'Zona', 'Livello attuale', 'Stato', 'Picco', 'Primo inserimento', 'Ultima variazione', 'Azzerato il', 'Giorni di dolore', 'Variazione 7 gg']);
    add('weight', ['Cliente', 'Data', 'kg']);
    add('meas', ['Cliente', 'Data'].concat(MEAS().map(m => m[1] + ' ' + m[2])));
    add('plans', ['Cliente', 'Scheda', 'Attiva', 'Giorno', 'Esercizio', 'Serie', 'Ripetizioni', 'Recupero s', 'Note']);
    profiles.forEach(p => {
      const L = F.LABELS || { GOALS: {}, LEVELS: {} }, st = F.clientStats(p, today), n = p.name, pl = (p.plans || []).find(x => x.id === p.activePlan);
      S.sum.rows.push([n, p.birth, F.ageOf(p.birth), p.sex === 'F' ? 'F' : 'M', p.height, st.weight, st.weightDelta, (L.GOALS[p.goal] || p.goal || '').split(' (')[0], L.LEVELS[p.level] || p.level, p.days, st.sessions, st.last || '', st.daysSince == null ? '' : st.daysSince, st.sessions28, st.adherence, st.volume28, st.rpe28 == null ? '' : st.rpe28,
        st.pain.map(h => `${h.label} ${h.level}/10 (${h.statusLabel.toLowerCase()})`).join('; '), st.alerts.map(h => h.label).join('; '), pl ? pl.title : '']);
      (p.sessions || []).slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.at || 0) - (b.at || 0)).forEach(s => {
        const ss = F.sessionStats(s), pn = ((p.plans || []).find(x => x.id === s.planId) || {}).title || '';
        S.sesSum.rows.push([n, s.date, s.dayName, pn, ss.exercises, ss.sets, ss.volume, ss.rpe == null ? '' : ss.rpe]);
        s.ex.forEach(e => e.sets.forEach((t, i) => S.ses.rows.push([n, s.date, s.dayName, pn, e.name, i + 1, t.kg || 0, t.reps || 0, t.rpe || '', t.kg > 0 && t.reps > 0 ? r1(t.kg * t.reps) : 0, F.e1rm(t.kg, t.reps) || ''])));
      });
      F.exerciseStats(p).forEach(o => S.ex.rows.push([n, o.name, o.sessions, o.lastDate, o.bestKg || '', o.bestE1 || '', o.lastE1 || '', o.change == null ? '' : o.change, o.prDate || '']));
      F.weeklyMuscleSets(p).forEach(v => S.vol.rows.push([n, v.week, v.label, v.sets]));
      F.painHistory(p, today).forEach(h => {
        S.painTrend.rows.push([n, h.label, h.level, h.statusLabel, h.peak, h.first, h.lastChange, h.clearedOn || '', h.daysActive, h.delta7]);
        h.changes.forEach(c => S.painLog.rows.push([n, c.date, h.label, c.to, c.from, KIND[c.kind], F.sessionsOn(p, c.date).map(s => s.dayName + ': ' + s.ex.map(e => e.name).join(', ')).join(' | ')]));
      });
      S.painLog.rows.sort((a, b) => (a[0] === b[0] ? 0 : a[0] < b[0] ? -1 : 1) || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
      (p.weights || []).slice().sort((a, b) => a.date < b.date ? -1 : 1).forEach(w => S.weight.rows.push([n, w.date, w.kg]));
      (p.measures || []).slice().sort((a, b) => a.date < b.date ? -1 : 1).forEach(m => S.meas.rows.push([n, m.date].concat(MEAS().map(x => m.v[x[0]] || ''))));
      (p.plans || []).forEach(x => x.days.forEach(d => d.exercises.forEach(e => S.plans.rows.push([n, x.title, yn(x.id === p.activePlan), d.name, e.name, e.sets, F.repsLabel(e), e.rest || '', e.note || '']))));
    });
    return Object.values(S);
  };
  F.xlsxFile = (profiles, name) => ({ name: name + '.xlsx', blob: F.xlsxBuild(F.datasets(profiles)) });
  F.csvFiles = (profiles, name) => F.datasets(profiles).map(s => ({ name: `${name}_${s.name}.csv`, text: F.csvBuild(s) }));
  F.saveBlob = function (blob, filename) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  F.safeName = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'dati';

  /* ---------- IMPORT ---------- */
  const norm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const iso = v => {
    if (typeof v === 'number' && v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 864e5)); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); }
    const s = String(v || '').trim(), m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s) || null;
    if (m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
    const g = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/.exec(s); return g ? g[3] + '-' + g[2].padStart(2, '0') + '-' + g[1].padStart(2, '0') : null;
  };
  const num = v => { const x = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : null; };
  const zoneKey = lab => Object.keys(F.ZONES).find(k => norm(F.ZONES[k]) === norm(lab)) || null;
  const exByName = name => { const n = norm(name); return Object.values(F.EXMAP).find(e => norm(e.name) === n) || null; };
  /** Accetta fogli {nome: righe} (xlsx) o un solo CSV con nome foglio dedotto dalle intestazioni. */
  function table(rows) {
    if (!rows || rows.length < 2) return [];
    const h = rows[0].map(norm); return rows.slice(1).filter(r => r.some(x => x !== '' && x != null)).map(r => { const o = {}; h.forEach((k, i) => { o[k] = r[i]; }); return o; });
  }
  F.sheetKind = function (rows) {
    const h = (rows && rows[0] || []).map(norm);
    if (h.includes('ripetizioni o secondi') && h.includes('esercizio')) return 'ses';
    if (h.includes('livello 0 10') && h.includes('zona') && h.includes('evento')) return 'painLog';
    if (h.length === 3 && h[0] === 'cliente' && h[1] === 'data' && h[2] === 'kg') return 'weight';
    if (h.includes('data') && h.includes('petto cm')) return 'meas';
    return null;
  };
  /**
   * Importa le tabelle nei profili indicati (stesso "Cliente" = stesso nome profilo). Unisce senza duplicare: ritorna il resoconto.
   * sheets: {nomeFoglio: righe}; profiles: elenco profili modificabili; opts.defaultName: se manca la colonna Cliente.
   */
  F.importTables = function (sheets, profiles, opts) {
    opts = opts || {};
    const rep = { sessions: 0, sets: 0, pain: 0, weights: 0, measures: 0, skipped: 0, unknown: new Set(), sheets: [] };
    const find = n => profiles.find(p => norm(p.name) === norm(n || opts.defaultName)) || (profiles.length === 1 && !n ? profiles[0] : null);
    const touched = new Set();
    Object.keys(sheets).forEach(sn => {
      const kind = Object.keys(F.SHEETS).find(k => norm(F.SHEETS[k]) === norm(sn)) && (['ses', 'painLog', 'weight', 'meas'].find(k => norm(F.SHEETS[k]) === norm(sn))) || F.sheetKind(sheets[sn]);
      if (!kind) return; rep.sheets.push(F.SHEETS[kind]);
      table(sheets[sn]).forEach(r => {
        const p = find(r.cliente); if (!p) { rep.unknown.add(String(r.cliente || '?')); rep.skipped++; return; }
        const date = iso(r.data); if (!date) { rep.skipped++; return; }
        touched.add(p);
        if (kind === 'ses') {
          const exn = String(r.esercizio || '').trim(), day = String(r.seduta || 'Seduta'), reps = num(r['ripetizioni o secondi']), kg = num(r.kg) || 0;
          if (!exn || reps == null || reps < 0 || kg < 0) { rep.skipped++; return; }
          p.sessions = p.sessions || []; let s = p.sessions.find(x => x.date === date && x.dayName === day);
          if (!s) { const pl = (p.plans || []).find(x => norm(x.title) === norm(r.scheda)); s = { id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), date, at: new Date(date + 'T12:00:00').getTime(), planId: pl ? pl.id : (p.activePlan || null), dayName: day, ex: [], imported: true }; p.sessions.push(s); rep.sessions++; }
          const meta = exByName(exn); let e = s.ex.find(x => norm(x.name) === norm(exn)); if (!e) { e = { exId: meta ? meta.id : 'x_' + norm(exn).replace(/ /g, '_'), name: exn, sets: [] }; s.ex.push(e); }
          const idx = Math.max(1, num(r.serie) || e.sets.length + 1) - 1;
          if (e.sets[idx] && e.sets[idx].kg === kg && e.sets[idx].reps === reps) { rep.skipped++; return; }
          e.sets[idx] = { kg, reps, rpe: num(r.rpe) || null }; rep.sets++;
        } else if (kind === 'painLog') {
          const z = zoneKey(r.zona), lv = num(r['livello 0 10']); if (!z || lv == null) { rep.skipped++; return; }
          p.painLog = p.painLog || []; if (p.painLog.some(x => x.date === date && x.zone === z && x.level === lv)) { rep.skipped++; return; }
          p.painLog.push({ date, zone: z, level: Math.min(10, Math.max(0, lv)) }); rep.pain++;
        } else if (kind === 'weight') {
          const kg = num(r.kg); if (!(kg > 0)) { rep.skipped++; return; }
          p.weights = p.weights || []; if (p.weights.some(x => x.date === date)) { rep.skipped++; return; } p.weights.push({ date, kg }); rep.weights++;
        } else if (kind === 'meas') {
          const v = {}; MEAS().forEach(m => { const x = num(r[norm(m[1] + ' ' + m[2])]); if (x > 0) v[m[0]] = x; });
          if (!Object.keys(v).length) { rep.skipped++; return; }
          p.measures = p.measures || []; const ex = p.measures.find(x => x.date === date); if (ex) Object.assign(ex.v, v); else p.measures.push({ date, v }); rep.measures++;
        }
      });
    });
    touched.forEach(p => {
      /* riallinea: ordine cronologico e dolore corrente = ultimo livello registrato per zona */
      (p.sessions || []).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.at || 0) - (b.at || 0));
      (p.weights || []).sort((a, b) => a.date < b.date ? -1 : 1); (p.measures || []).sort((a, b) => a.date < b.date ? -1 : 1);
      (p.painLog || []).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
      const cur = {}; (p.painLog || []).forEach(e => { cur[e.zone] = e.level; }); p.pain = p.pain || {};
      Object.keys(cur).forEach(z => { if (cur[z] > 0) p.pain[z] = cur[z]; else delete p.pain[z]; });
      p.sessions.forEach(s => { s.ex.forEach(e => { e.sets = e.sets.filter(Boolean); }); });
    });
    rep.unknown = [...rep.unknown]; return rep;
  };
  /** Legge un file scelto dall'utente (xlsx o csv) → {nomeFoglio: righe} */
  F.readTableFile = async function (file) {
    if (/\.xlsx$/i.test(file.name)) return F.xlsxParse(await file.arrayBuffer());
    if (/\.csv$/i.test(file.name)) { const rows = F.csvParse(await file.text()), k = F.sheetKind(rows); if (!k) throw new Error('CSV non riconosciuto: usa i file esportati da questa app'); return { [F.SHEETS[k]]: rows }; }
    throw new Error('usa un file .xlsx o .csv');
  };
})(window.FORMA);
