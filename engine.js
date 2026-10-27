/* FORGIA – motore di regole: calcolatore, generatore schede, filtro dolore, progressione, analisi e import. */
(function (F) {
  const todayISO = () => new Date().toISOString().slice(0, 10);
  F.todayISO = todayISO;
  const round = (n, s) => Math.round(n / s) * s;

  F.ageOf = (birth, now) => {
    const b = new Date(birth), n = now || new Date();
    let a = n.getFullYear() - b.getFullYear();
    const m = n.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
    return a;
  };
  F.isMinor = p => F.ageOf(p.birth) < 18;
  F.isReturning = p => (+p.stopMonths || 0) >= 12;

  /* ---------- CALCOLATORE ---------- */
  F.calc = function (p) {
    const age = F.ageOf(p.birth), minor = age < 18;
    const w = +p.weight, h = +p.height;
    const bmi = w / Math.pow(h / 100, 2);
    const bmr = 10 * w + 6.25 * h - 5 * age + (p.sex === 'F' ? -161 : 5);
    const act = { 2: 1.4, 3: 1.5, 4: 1.55, 5: 1.65 }[+p.days] || 1.5;
    const tdee = bmr * act;
    const notes = [];
    let delta = 0;
    if (minor) {
      delta = 250;
      notes.push('Profilo minorenne: nessun deficit calorico. Si cresce con un piccolo surplus, sonno 8-10 ore e carichi moderati.');
      if (p.goal === 'cut') notes.push('L\'obiettivo "dimagrire" non è previsto sotto i 18 anni: l\'app lo trasforma in ricomposizione corporea.');
    } else if (p.goal === 'cut') {
      delta = bmi < 22 ? 0 : -500;
      if (bmi < 22) notes.push('Il tuo BMI è già basso: niente deficit, meglio mantenimento e costruire muscolo.');
    } else if (p.goal === 'recomp') {
      delta = bmi < 21 ? 100 : -350;
      notes.push('Ricomposizione: deficit lieve, proteine alte e allenamento di forza permettono di perdere grasso e mettere muscolo, soprattutto dopo uno stop.');
    } else if (p.goal === 'mass') { delta = 250; }
    else if (p.goal === 'strength') { delta = 100; }
    const kcal = Math.round((tdee + delta) / 10) * 10;
    const protein = Math.round(w * (minor ? 1.8 : p.goal === 'cut' || p.goal === 'recomp' ? 2.0 : 1.8));
    const fat = Math.round(w * (minor ? 1.0 : 0.9));
    const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
    return { age, minor, bmi, bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, protein, fat, carbs, delta, notes,
      water: Math.round(w * 35 / 100) / 10 };
  };

  /* Andamento del peso: confronta pendenza reale e obiettivo */
  F.weightAdvice = function (p) {
    const ws = (p.weights || []).slice().sort((a, b) => a.date.localeCompare(b.date));
    if (ws.length < 2) return { text: 'Registra il peso 1-2 volte a settimana, a digiuno, per far funzionare le regolazioni automatiche.', kind: 'info' };
    const last = ws[ws.length - 1], cutoff = new Date(last.date); cutoff.setDate(cutoff.getDate() - 21);
    const base = ws.find(x => new Date(x.date) >= cutoff) || ws[0];
    const days = (new Date(last.date) - new Date(base.date)) / 864e5;
    if (days < 7) return { text: 'Servono almeno 7 giorni di dati per giudicare il trend.', kind: 'info' };
    const slope = (last.kg - base.kg) / days * 7; // kg/sett
    const c = F.calc(p);
    const f = n => (n > 0 ? '+' : '') + n.toFixed(2) + ' kg/sett';
    if (c.minor) {
      if (slope < -0.1) return { text: `Peso in calo (${f(slope)}). Per un ragazzo in crescita non va bene: aumenta di 200-300 kcal e parlane con l\'allenatore o il pediatra.`, kind: 'warn' };
      if (slope > 0.5) return { text: `Salita rapida (${f(slope)}): rientra in 0,1-0,4 kg/sett riducendo un po\' i cibi calorici.`, kind: 'warn' };
      return { text: `Trend ${f(slope)}: in linea per crescere con massa magra.`, kind: 'ok' };
    }
    const lo = c.delta < 0 ? -0.8 : c.delta > 0 ? 0.1 : -0.2, hi = c.delta < 0 ? -0.3 : c.delta > 0 ? 0.4 : 0.2;
    if (slope < lo) return { text: `Perdi troppo in fretta (${f(slope)}): aggiungi circa 150-200 kcal per non perdere muscolo.`, kind: 'warn' };
    if (slope > hi) return { text: `Il peso non scende/sale come previsto (${f(slope)}): ${c.delta < 0 ? 'riduci di circa 150 kcal o aggiungi 2.000 passi al giorno' : 'riduci di circa 150 kcal'}.`, kind: 'warn' };
    return { text: `Trend ${f(slope)}: perfettamente in linea con l\'obiettivo.`, kind: 'ok' };
  };

  /* ---------- FILTRO DOLORE ---------- */
  F.painCheck = function (ex, pain) {
    pain = pain || {};
    const stress = Object.assign({}, ex.loads);
    for (const m of ex.prim) { const z = F.MUSCLE_ZONE[m]; if (z && !(z in stress)) stress[z] = 1; }
    let blocked = false, reduce = false; const notes = [];
    for (const z in stress) {
      const pz = pain[z] || 0, s = stress[z];
      if (!pz) continue;
      if (pz >= 7 && s >= 1) { blocked = true; notes.push(`escluso: dolore ${pz}/10 su ${F.ZONES[z]}`); }
      else if (pz >= 4 && s >= 2) { blocked = true; notes.push(`escluso: dolore ${pz}/10 su ${F.ZONES[z]}`); }
      else if (pz >= 4 && s >= 1) { reduce = true; notes.push(`carico ridotto per dolore ${pz}/10 su ${F.ZONES[z]}`); }
      else if (pz >= 1 && s >= 2) { reduce = true; notes.push(`attenzione a ${F.ZONES[z]} (${pz}/10): fermati se il dolore sale oltre 3`); }
    }
    return { blocked, reduce, notes };
  };

  /* ---------- GENERATORE SCHEDE ---------- */
  const T = (pat, extra) => Object.assign({ pat: [].concat(pat) }, extra || {});
  const LAYOUT = {
    2: [['Full body A', [T('push'), T('vpull'), T('squat'), T('hinge'), T('core')]],
        ['Full body B', [T('vpush'), T('pull'), T('lunge'), T('push', { alt: 1 }), T('core', { alt: 1 })]]],
    3: [['Full body A', [T('push'), T('vpull'), T('squat'), T('hinge'), T('core')]],
        ['Full body B', [T(['vpush', 'delt']), T('pull'), T('lunge'), T('arms', { m: 'triceps' }), T('core', { alt: 1 })]],
        ['Full body C', [T('push', { alt: 1 }), T('vpull', { alt: 1 }), T(['squat', 'leg']), T('hinge', { alt: 1 }), T('core', { alt: 2 })]]],
    4: [['Parte alta A', [T('push'), T('vpull'), T(['vpush', 'delt']), T('pull'), T('arms', { m: 'triceps' }), T('core')]],
        ['Parte bassa A', [T('squat'), T('hinge'), T('lunge'), T('leg', { m: 'hams' }), T('calf'), T('core', { alt: 1 })]],
        ['Parte alta B', [T('push', { alt: 1 }), T('vpull', { alt: 1 }), T(['vpush', 'delt'], { alt: 1 }), T('pull', { alt: 1 }), T('arms', { m: 'biceps' }), T('core', { alt: 2 })]],
        ['Parte bassa B', [T(['squat', 'leg'], { alt: 1 }), T('hinge', { alt: 1 }), T('lunge', { alt: 1 }), T('leg', { m: 'quads' }), T('calf', { alt: 1 }), T('core', { alt: 3 })]]],
    5: [['Spinta', [T('push'), T(['vpush', 'delt']), T('push', { alt: 1 }), T('arms', { m: 'triceps' }), T('core')]],
        ['Trazione', [T('vpull'), T('pull'), T('pull', { alt: 1 }), T('arms', { m: 'biceps' }), T('core', { alt: 1 })]],
        ['Gambe', [T('squat'), T('hinge'), T('lunge'), T('leg', { m: 'hams' }), T('calf'), T('core', { alt: 2 })]],
        ['Parte alta', [T('push', { alt: 2 }), T('vpull', { alt: 1 }), T('delt'), T('pull', { alt: 2 })]],
        ['Parte bassa', [T(['squat', 'leg'], { alt: 1 }), T('hinge', { alt: 1 }), T('lunge', { alt: 1 }), T('calf', { alt: 1 }), T('core', { alt: 3 })]]]
  };

  F.generatePlan = function (p) {
    const minor = F.isMinor(p), ret = F.isReturning(p), pain = p.pain || {};
    const days = LAYOUT[Math.min(5, Math.max(2, +p.days || 3))];
    const lvl = Math.max(1, Math.min(3, +p.level || 1));
    const style = p.style || 'mix';
    const goal = minor && p.goal === 'cut' ? 'recomp' : p.goal;
    const notes = [], used = new Set(), skipped = [];
    const repsFor = (ex) => {
      if (ex.unit === 'sec') return minor ? '20-30 s' : '20-45 s';
      if (minor) return '8-12';
      if (goal === 'strength') return ex.type === 'cali' ? '5-8' : '5-8';
      if (goal === 'mass') return '8-12';
      if (goal === 'cut') return '10-15';
      return ex.type === 'cali' ? '8-15' : '8-12';
    };
    const plan = { id: 'p' + Date.now().toString(36), title: 'Scheda su misura', source: 'generata', createdAt: todayISO(), days: [], notes };
    let slotCounter = 0;
    for (const [dname, slots] of days) {
      const day = { name: dname, exercises: [] };
      for (const slot of slots) {
        slotCounter++;
        let pool = F.EX.filter(e => slot.pat.includes(e.pat) && e.lvl <= lvl);
        if (slot.m) { const m2 = pool.filter(e => e.prim.includes(slot.m)); if (m2.length) pool = m2; }
        if (minor) pool = pool.filter(e => e.minor !== false);
        const want = style === 'mix' ? (slotCounter % 2 ? 'cali' : 'gym') : style;
        pool.sort((a, b) => ((b.type === want) - (a.type === want)) || (style !== 'mix' && ((b.type === style) - (a.type === style))) || (b.lvl - a.lvl));
        const typed = pool.filter(e => e.type === want || style === 'mix');
        let cand = (style === 'mix' ? pool : (typed.length ? typed : pool)).filter(e => !used.has(e.id) || (slot.alt || 0) > 0);
        if (style !== 'mix') { const only = cand.filter(e => e.type === style); if (only.length) cand = only; }
        let chosen = null, chk = null;
        const start = (slot.alt || 0) % Math.max(1, cand.length);
        const order = cand.slice(start).concat(cand.slice(0, start));
        for (const e of order) { const c = F.painCheck(e, pain); if (!c.blocked) { chosen = e; chk = c; break; } }
        if (!chosen) {
          const FB = { squat: ['hinge'], lunge: ['hinge'], leg: ['hinge'], calf: ['core'], vpush: ['delt', 'push'], push: ['pull', 'delt'], vpull: ['pull'], pull: ['vpull'], delt: ['pull'], arms: ['pull'], hinge: ['core'] };
          const fbPats = slot.pat.flatMap(x => FB[x] || []);
          let fb = F.EX.filter(e => fbPats.includes(e.pat) && e.lvl <= lvl && !used.has(e.id) && (!minor || e.minor !== false) && (style === 'mix' || e.type === style));
          for (const e of fb) { const c = F.painCheck(e, pain); if (!c.blocked) { chosen = e; chk = c; break; } }
        }
        if (!chosen) { skipped.push(`${dname}: nessun esercizio sicuro per "${slot.pat.join('/')}" con il dolore indicato`); continue; }
        used.add(chosen.id);
        const core = chosen.pat === 'core';
        let sets = minor ? 3 : (core || chosen.pat === 'calf' || chosen.pat === 'arms' || chosen.pat === 'delt') ? 3 : (goal === 'strength' ? 4 : 3);
        let early = Math.max(2, sets - 1);
        if (chk.reduce) { sets = Math.max(2, sets - 1); early = 2; }
        day.exercises.push({
          exId: chosen.id, name: chosen.name, sets, setsEarly: early, reps: repsFor(chosen), unit: chosen.unit,
          rest: core ? 45 : chosen.type === 'gym' && chosen.lvl >= 2 ? 120 : 90, note: chk.notes.join(' · ')
        });
      }
      plan.days.push(day);
    }
    if (ret) notes.push('Rientro dopo uno stop lungo: nelle prime 4 settimane fai 1 serie in meno per esercizio e fermati sempre con 3 ripetizioni in riserva.');
    if (minor) notes.push('Scheda per minorenne: carichi moderati, 8-12 ripetizioni, niente massimali. Fai vedere l\'esecuzione all\'allenatore.');
    notes.push('Riscaldamento: 5 minuti di cardio leggero + 1-2 serie leggere del primo esercizio.');
    const maxPain = Math.max(0, ...Object.values(pain));
    if (maxPain >= 7) notes.push('Hai indicato un dolore ≥ 7/10: la zona è esclusa dalla scheda. Un dolore così intenso va valutato da un medico o fisioterapista prima di riprendere quel movimento.');
    for (const z in pain) if (pain[z] >= 1 && F.ZONE_TIPS[z]) notes.push(`${F.ZONES[z]} (${pain[z]}/10): ${F.ZONE_TIPS[z]}`);
    for (const s of skipped) notes.push(s);
    return plan;
  };

  /* ---------- ANALISI SCHEDA ---------- */
  F.analyzePlan = function (plan, p) {
    const per = {}, freq = {}, perDay = [], flags = [];
    const ret = p && F.isReturning(p), minor = p && F.isMinor(p);
    plan.days.forEach(d => {
      let tot = 0; const seen = new Set();
      d.exercises.forEach(x => {
        const e = F.EXMAP[x.exId]; tot += x.sets;
        if (!e) return;
        e.prim.forEach(m => { per[m] = (per[m] || 0) + x.sets; seen.add(m); });
        e.sec.forEach(m => { per[m] = (per[m] || 0) + x.sets * 0.5; });
      });
      seen.forEach(m => { freq[m] = (freq[m] || 0) + 1; });
      perDay.push({ name: d.name, sets: tot });
    });
    perDay.forEach(d => {
      if (d.sets > 24) flags.push({ k: 'warn', t: `${d.name}: ${d.sets} serie in una seduta sono troppe${ret ? ' per un rientro' : ''}; oltre ~20-24 la qualità cala.` });
      else if (ret && d.sets > 20) flags.push({ k: 'warn', t: `${d.name}: ${d.sets} serie. Per un rientro dopo lo stop punta a 12-18.` });
    });
    ['chest', 'lats', 'quads', 'hams', 'delts', 'glutes'].forEach(m => {
      if ((per[m] || 0) >= 8 && (freq[m] || 0) === 1) flags.push({ k: 'tip', t: `${F.MUSCLE_LABEL[m]}: allenato 1 volta a settimana con ${Math.round(per[m])} serie. Dividere le serie su 2 giorni di solito dà più crescita.` });
      if ((per[m] || 0) > 22) flags.push({ k: 'warn', t: `${F.MUSCLE_LABEL[m]}: ${Math.round(per[m])} serie settimanali, molte per un rientro.` });
    });
    if ((freq.abs || 0) >= 4) flags.push({ k: 'tip', t: 'Addominali quasi tutti i giorni: 2-3 sedute a settimana bastano e riducono il carico sulla zona lombare.' });
    const heavy = plan.days.flatMap(d => d.exercises).filter(x => F.EXMAP[x.exId] && F.EXMAP[x.exId].minor === false);
    if (minor && heavy.length) flags.push({ k: 'warn', t: `Per un minorenne: ${heavy.map(x => x.name).join(', ')} richiedono supervisione diretta e carichi moderati.` });
    const unk = plan.days.flatMap(d => d.exercises).filter(x => !F.EXMAP[x.exId]);
    if (unk.length) flags.push({ k: 'info', t: `${unk.length} esercizi non riconosciuti (non entrano nei conteggi): ${unk.map(x => x.name).join(', ')}.` });
    if (p && Object.values(p.pain || {}).some(v => v >= 4)) {
      plan.days.forEach(d => d.exercises.forEach(x => {
        const e = F.EXMAP[x.exId]; if (!e) return;
        const c = F.painCheck(e, p.pain);
        if (c.blocked) flags.push({ k: 'danger', t: `${d.name} – ${x.name}: ${c.notes.filter(n => n.startsWith('escluso')).join('; ')}. Sostituiscilo (vedi alternative) o salta.`, exId: x.exId });
      }));
    }
    if (!flags.length) flags.push({ k: 'ok', t: 'Volume e distribuzione sono ragionevoli per il tuo profilo.' });
    return { per, freq, perDay, flags };
  };

  /* Sostituzioni suggerite per un esercizio bloccato dal dolore */
  F.alternatives = function (exId, p) { // fino a 6, il chiamante filtra i duplicati
    const e = F.EXMAP[exId]; if (!e) return [];
    return F.EX.filter(o => o.id !== exId && o.pat === e.pat && o.prim.some(m => e.prim.includes(m)) && !F.painCheck(o, p.pain).blocked && (F.isMinor(p) ? o.minor !== false : true))
      .sort((a, b) => Math.abs(a.lvl - e.lvl) - Math.abs(b.lvl - e.lvl)).slice(0, 6);
  };

  /* ---------- IMPORT SCHEDA (testo) ---------- */
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[°'’`]/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  F.norm = norm;
  const stop = new Set(['di', 'a', 'al', 'ai', 'con', 'su', 'in', 'da', 'del', 'della', 'le', 'la', 'il']);
  const toks = s => new Set(norm(s).split(' ').filter(t => t && !stop.has(t)));
  F.matchExercise = function (name) {
    const n = norm(name.replace(/\(.*?\)/g, ' ')), nt = toks(name.replace(/\(.*?\)/g, ' '));
    let best = null, bs = 0;
    for (const e of F.EX) {
      for (const c of [e.name].concat(e.al)) {
        const cn = norm(c); let s = 0;
        if (cn === n) s = 1;
        else if (cn.length >= 6 && (n.includes(cn) || cn.includes(n))) s = 0.85;
        else {
          const ct = toks(c); let inter = 0; ct.forEach(t => { if (nt.has(t)) inter++; });
          s = inter / Math.max(ct.size, nt.size, 1);
        }
        if (s > bs) { bs = s; best = e; }
      }
    }
    return bs >= 0.5 ? { ex: best, score: bs } : null;
  };

  F.parseReps = function (txt, sets) {
    const t = (txt || '').toUpperCase().trim(), r = { text: txt.trim(), scheme: [], ramp: false, max: false, perSide: false, flags: [] };
    if (/MAX/.test(t)) r.max = true;
    if (/CRESC/.test(t)) r.ramp = true;
    if (/X\s*GAMBA|PER GAMBA|SINGOL|X\s*LATO/.test(t)) r.perSide = true;
    const nums = (t.replace(/\(.*?\)/g, ' ').match(/\d+/g) || []).map(Number);
    if (!r.max) r.scheme = nums;
    if (r.scheme.length > 1 && r.scheme.length < sets) r.flags.push(`${sets} serie ma ${r.scheme.length} ripetizioni indicate (${r.scheme.join('-')}): l'ultima viene ripetuta. Controlla con l'allenatore.`);
    if (r.scheme.length > sets && sets > 0) r.flags.push(`${r.scheme.length} ripetizioni indicate ma solo ${sets} serie.`);
    if (!r.scheme.length && !r.max) r.flags.push('Ripetizioni non riconosciute.');
    return r;
  };
  F.repsLabel = x => x.repsInfo ? (x.repsInfo.max ? 'MAX' : x.repsInfo.scheme.join('-')) + (x.repsInfo.ramp ? ' ↑ carico crescente' : '') + (x.repsInfo.perSide ? ' per lato' : '') : x.reps;

  F.parseScheda = function (text) {
    const days = []; let cur = null; const globalFlags = [];
    for (let raw of text.split(/\r?\n/)) {
      const line = raw.trim(); if (!line) continue;
      if (/^#/.test(line) || /:$/.test(line)) { cur = { name: line.replace(/^#+\s*/, '').replace(/:$/, ''), exercises: [] }; days.push(cur); continue; }
      if (!cur) { cur = { name: 'Giorno 1', exercises: [] }; days.push(cur); }
      let name, sets, reps;
      if (line.includes('|') || line.includes('\t')) { const parts = line.split(/\||\t/).map(s => s.trim()); name = parts[0]; sets = parseInt(parts[1], 10); reps = parts.slice(2).join(' '); }
      else { const m = line.match(/^(.*?)[\s:-]+(\d+)\s*(?:x|×|serie)\s*(.+)$/i); if (!m) { globalFlags.push(`Riga non letta: "${line}"`); continue; } name = m[1]; sets = +m[2]; reps = m[3]; }
      if (!name || !(sets > 0)) { globalFlags.push(`Riga non letta: "${line}"`); continue; }
      const info = F.parseReps(reps, sets), mt = F.matchExercise(name);
      cur.exercises.push({ name: name.trim(), sets, repsInfo: info, reps: info.max ? 'MAX' : info.scheme.join('-'), exId: mt ? mt.ex.id : null, match: mt ? mt.score : 0,
        unit: mt ? mt.ex.unit : 'reps', rest: 90, note: '', flags: info.flags.slice() });
    }
    return { days, flags: globalFlags };
  };

  F.targetFor = (x, i) => {
    const r = x.repsInfo;
    if (r) { if (r.max) return 'MAX'; if (r.scheme.length) return String(r.scheme[Math.min(i, r.scheme.length - 1)]); }
    return x.reps;
  };
  const topReps = x => { const r = x.repsInfo; if (r && r.scheme.length) return Math.max(...r.scheme); const m = (x.reps || '').match(/(\d+)\D*(\d+)?/); return m ? +(m[2] || m[1]) : 12; };

  /* ---------- PROGRESSIONE ---------- */
  F.e1rm = (kg, reps) => (kg > 0 && reps > 0 && reps <= 12) ? Math.round(kg * (1 + reps / 30) * 10) / 10 : null;
  F.suggest = function (x, hist) {
    const e = F.EXMAP[x.exId];
    const sess = (hist || []).filter(h => h.sets && h.sets.length);
    const timed = x.unit === 'sec' || (e && e.unit === 'sec');
    if (!sess.length && e && e.type === 'cali' && !timed) return { kind: 'info', text: 'Prima volta: fai ripetizioni pulite fermandoti con 2-3 in riserva e annota quante ne riesci.' };
    if (!sess.length) return { kind: 'info', text: timed ? 'Prima volta: tieni la posizione finché la tecnica è pulita, fermati 5 secondi prima del cedimento.' : 'Prima volta: scegli un carico con 3 ripetizioni in riserva (sforzo 7/10) e annota tutto.' };
    const last = sess[sess.length - 1], prev = sess[sess.length - 2];
    const top = topReps(x), done = last.sets.filter(s => !s.warm);
    const allTop = done.length >= Math.max(1, Math.min(x.sets, done.length)) && done.every(s => s.reps >= top);
    const rpe = done.filter(s => s.rpe).map(s => s.rpe), avgRpe = rpe.length ? rpe.reduce((a, b) => a + b, 0) / rpe.length : null;
    const kg = Math.max(...done.map(s => s.kg || 0));
    if (avgRpe && avgRpe >= 9.5 && prev) return { kind: 'warn', text: `Sforzo altissimo (${avgRpe.toFixed(1)}/10): mantieni ${kg ? kg + ' kg' : 'la stessa variante'} e punta a rendere le serie più pulite prima di salire.` };
    if (prev) {
      const pr = Math.max(...prev.sets.map(s => s.reps)), lr = Math.max(...done.map(s => s.reps));
      if (lr <= pr - 2 && (kg >= Math.max(...prev.sets.map(s => s.kg || 0)))) return { kind: 'warn', text: 'Le ripetizioni sono calate: dormi/mangia meglio e riduci il carico del 5-10% per questa seduta.' };
    }
    if (timed) return allTop ? { kind: 'up', text: `Hai raggiunto ${top}: prova ${Math.round(top + 5)} secondi o la variante successiva.` } : { kind: 'keep', text: 'Aggiungi 2-5 secondi rispetto all\'ultima volta.' };
    if (allTop) {
      if (!kg) return { kind: 'up', text: e && e.next ? `Tutte le serie a ${top}: passa a "${F.EXMAP[e.next].name}" oppure aggiungi zavorra.` : `Tutte le serie a ${top}: aggiungi zavorra leggera (1-2 kg) o rallenta la discesa.` };
      const lower = e && ['squat', 'leg', 'hinge', 'lunge'].includes(e.pat);
      const inc = Math.max(1.25, round(kg * (lower ? 0.05 : 0.025), 1.25));
      return { kind: 'up', text: `Tutte le serie a ${top} rip.: sali a ${(kg + inc).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')} kg e riparti dal basso del range.` };
    }
    const worst = Math.min(...done.map(s => s.reps));
    return { kind: 'keep', text: `Mantieni ${kg ? kg + ' kg' : 'la variante'} e punta a ${worst + 1} ripetizioni nella serie più debole prima di salire.` };
  };

  /* Reazione a un aumento del dolore */
  F.painReaction = function (before, after) {
    const msgs = [];
    for (const z in after) {
      const a = after[z] || 0, b = (before || {})[z] || 0;
      if (a >= 7 && b < 7) msgs.push(`${F.ZONES[z]} ${a}/10: gli esercizi che la caricano vengono esclusi. Dolore forte, formicolio, gonfiore o dolore notturno: fatti valutare da un medico o fisioterapista.`);
      else if (a >= 4 && b < 4) msgs.push(`${F.ZONES[z]} ${a}/10: scheda adattata (serie ridotte, esercizi sostitutivi).`);
      else if (a < b) msgs.push(`${F.ZONES[z]} migliora (${b}→${a}): riprendi con gradualità, +1 serie dopo 2 sedute senza dolore.`);
    }
    return msgs;
  };
})(window.FORMA);
