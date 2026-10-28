/* FORGIA – lettura schede del personal trainer: italiano e inglese, serie×ripetizioni, % del massimale (1RM), RPE/RIR, recuperi, tempo. */
(function (F) {
  'use strict';
  const norm = F.norm;
  const SYN = { db: 'dumbbell', dbs: 'dumbbell', bb: 'barbell', manubri: 'dumbbell', manubrio: 'dumbbell', bilanciere: 'barbell', cavi: 'cable', cavo: 'cable', macchina: 'machine' };
  const STOP = new Set(['di', 'a', 'al', 'ai', 'con', 'su', 'in', 'da', 'del', 'della', 'le', 'la', 'il', 'lo', 'the', 'of', 'on', 'with', 'and', 'to', 'for', 'a', 'an', 'e']);
  const tok = s => new Set(norm(s).split(' ').map(t => SYN[t] || t).filter(t => t && !STOP.has(t)));
  F.matchExercise = function (name) {
    const clean = name.replace(/\(.*?\)/g, ' ');
    const n = norm(clean), nt = tok(clean);
    let best = null, bs = 0;
    for (const e of F.EX) {
      for (const c of [e.name].concat(e.al || [])) {
        const cn = norm(c); let s = 0;
        if (cn === n) s = 1;
        else if (cn.length >= 6 && n.length >= 5 && (n.includes(cn) || cn.includes(n))) s = 0.85 - Math.min(0.1, Math.abs(cn.length - n.length) / 100);
        else { const ct = tok(c); let i = 0; ct.forEach(t => { if (nt.has(t)) i++; }); s = i / Math.max(ct.size, nt.size, 1); }
        if (s > bs || (s === bs && best && e.type === 'gym' && best.type !== 'gym' && !/corpo libero|bodyweight|\bbw\b|air squat/.test(n))) { bs = s; best = e; }
      }
    }
    return bs >= 0.5 ? { ex: best, score: bs } : null;
  };

  const num = s => parseFloat(String(s).replace(',', '.'));
  /** Recupero in secondi, o null. Rimuove da `s` il testo letto. */
  function takeRest(s) {
    const unit = (u, v) => { u = (u || '').toLowerCase(); if (/^(min|m$|['’]$)/.test(u) && !/^(''|’’)$/.test(u)) return v * 60; if (u) return v; return v <= 5 ? v * 60 : v; };
    let m;
    const U = "(min\\w*|sec\\w*|s\\b|''|’’|\"|″|['’]|m\\b)?";
    const KW = '(?:rest(?:ing)?|rec(?:upero|\\.)?|recov\\w*|pausa|riposo|break|r)';
    // 1:30 / 1'30''
    if ((m = s.match(new RegExp(KW + "\\s*[:=]?\\s*(\\d+)\\s*[:'’]\\s*(\\d{2})\\s*(?:''|’’|\"|″)?", 'i')))) { s = s.replace(m[0], ' '); return { sec: +m[1] * 60 + +m[2], rest: s }; }
    if ((m = s.match(new RegExp('\\b' + KW + "\\s*[:=]?\\s*(\\d+(?:[.,]\\d+)?)(?:\\s*[-–]\\s*(\\d+(?:[.,]\\d+)?))?\\s*" + U, 'i')))) {
      const hi = num(m[2] || m[1]); s = s.replace(m[0], ' '); return { sec: Math.round(unit(m[3], hi)), rest: s };
    }
    if ((m = s.match(new RegExp("(\\d+(?:[.,]\\d+)?)(?:\\s*[-–]\\s*(\\d+(?:[.,]\\d+)?))?\\s*(min\\w*|sec\\w*|s\\b|''|’’|\"|″|['’])\\s*(?:di\\s+)?(?:rest|rec\\w*|pausa|riposo|break)\\b", 'i')))) {
      const hi = num(m[2] || m[1]); s = s.replace(m[0], ' '); return { sec: Math.round(unit(m[3], hi)), rest: s };
    }
    return { sec: null, rest: s };
  }
  function takePct(s) {
    const m = s.match(/@?\s*(\d{2,3})(?:\s*[-–]\s*(\d{2,3}))?\s*%\s*(?:(?:of|di|del|dell')\s*)?(?:1\s*rm|rm|max(?:imale)?|massimale)?/i);
    if (!m) return { pct: null, rest: s };
    const lo = +m[1], hi = m[2] ? +m[2] : null;
    return { pct: hi ? [Math.min(lo, hi), Math.max(lo, hi)] : [lo, lo], rest: s.replace(m[0], ' ') };
  }
  function takeRpe(s) {
    let m = s.match(/\brir\s*[:=@]?\s*(\d(?:[.,]\d)?)/i);
    if (m) return { rpe: 10 - num(m[1]), rest: s.replace(m[0], ' ') };
    m = s.match(/\brpe\s*[:=@]?\s*(\d(?:[.,]\d)?)(?:\s*[-–]\s*(\d(?:[.,]\d)?))?/i) || s.match(/@\s*(\d(?:[.,]5)?)\b(?!\s*%|\d)/);
    if (m) return { rpe: num(m[2] || m[1]), rest: s.replace(m[0], ' ') };
    return { rpe: null, rest: s };
  }
  function takeTempo(s) {
    const m = s.match(/\btempo\s*[:=]?\s*([0-9xX])\s*[-/.]\s*([0-9xX])\s*[-/.]\s*([0-9xX])(?:\s*[-/.]\s*([0-9xX]))?/i);
    return m ? { tempo: m.slice(1).filter(Boolean).join('-'), rest: s.replace(m[0], ' ') } : { tempo: null, rest: s };
  }

  const SEQ = "\\d+(?:\\s*[-–/]\\s*\\d+)*";
  const REPS = '(' + SEQ + "(?:\\s*(?:s|sec|secondi|seconds|\"|″))?|max|amrap|fail\\w*|cedimento)";
  /** Una riga di esercizio -> { name, sets, repsText, flags } oppure null. */
  function takeSetsReps(s) {
    let m, flags = [];
    if ((m = s.match(new RegExp('(' + SEQ + ")\\s*(?:reps?|ripetizioni|rip\\.?)\\s*(?:x|×)\\s*(\\d+)\\s*(?:sets?|serie)", 'i')))) return { sets: +m[2], reps: m[1], before: s.slice(0, m.index), after: s.slice(m.index + m[0].length), flags };
    if ((m = s.match(new RegExp('(\\d+)\\s*(?:sets?|serie|series)\\s*(?:of|da|di|x|×|:)?\\s*' + REPS + '\\s*(?:reps?|ripetizioni|rip\\.?)?', 'i')))) return { sets: +m[1], reps: m[2], before: s.slice(0, m.index), after: s.slice(m.index + m[0].length), flags };
    if ((m = s.match(new RegExp('(\\d+)\\s*[x×*]\\s*' + REPS, 'i')))) {
      let a = +m[1], r = m[2];
      if (/^\d+$/.test(r) && a >= 8 && +r <= 5) { flags.push(`"${m[0].trim()}" l'ho letto come ${r} serie da ${a} ripetizioni (ripetizioni × serie). Se è il contrario, correggilo.`); return { sets: +r, reps: String(a), before: s.slice(0, m.index), after: s.slice(m.index + m[0].length), flags }; }
      return { sets: a, reps: r, before: s.slice(0, m.index), after: s.slice(m.index + m[0].length), flags };
    }
    return null;
  }

  F.parseLine = function (raw) {
    let s = raw.replace(/^\s*(?:[-•*·]|\d{1,2}[.)])\s+/, '').trim();
    const flags = [], out = {};
    const r1 = takeRest(s); s = r1.rest; out.rest = r1.sec;
    const t1 = takeTempo(s); s = t1.rest; out.tempo = t1.tempo;
    const p1 = takePct(s); s = p1.rest; out.pct = p1.pct;
    const q1 = takeRpe(s); s = q1.rest; out.rpe = q1.rpe;
    if (/\b(?:superset|ss)\b/i.test(s)) { out.superset = true; s = s.replace(/\b(?:superset|ss)\b/ig, ' '); }
    const sr = takeSetsReps(s);
    if (!sr) return Object.assign(out, { none: true, text: s.replace(/[|–—:,-]+/g, ' ').trim() });
    flags.push(...sr.flags);
    let name = sr.before.replace(/[|–—:,;\-\s]+$/g, '').replace(/^[|–—:,;\-\s]+/g, '').trim();
    if (!name) name = sr.after.replace(/^[|–—:,;\-\s]+/g, '').replace(/[|–—:,;\-\s]+$/g, '').trim();
    const tail = name === sr.after.replace(/^[|–—:,;\-\s]+/g, '').replace(/[|–—:,;\-\s]+$/g, '').trim() ? '' : sr.after;
    return Object.assign(out, { name, sets: sr.sets, reps: (sr.reps + ' ' + tail).replace(/\s+/g, ' ').trim(), flags });
  };

  F.parseScheda = function (text) {
    const days = []; let cur = null, defRest = null; const globalFlags = [];
    const newDay = n => { cur = { name: n, exercises: [] }; days.push(cur); defRest = null; };
    for (const rawLine of text.split(/\r?\n/)) {
      let line = rawLine.trim(); if (!line) continue;
      if (/^#/.test(line) || /:$/.test(line) && !/\d\s*[x×]/i.test(line)) { newDay(line.replace(/^#+\s*/, '').replace(/:$/, '')); continue; }
      // formato a colonne NOME | serie | rip | extra
      if (line.includes('|') || line.includes('\t')) {
        const parts = line.split(/\||\t/).map(x => x.trim()), sets = parseInt(parts[1], 10);
        if (parts[0] && sets > 0 && parts[2]) line = `${parts[0]} ${sets}x${parts.slice(2).join(' ')}`;
        else line = parts.join(' ');
      }
      const L = F.parseLine(line);
      if (L.none) {
        if (L.rest && !L.text.replace(/\d+/g, '').trim()) { defRest = L.rest; continue; } // "Rest 90s tra le serie" vale per le righe seguenti
        if (L.rest && /^(?:rest|rec|pausa)/i.test(line)) { defRest = L.rest; continue; }
        if (L.text && L.text.length <= 45 && !/\d/.test(L.text.replace(/\b(day|giorno|workout|seduta|session|week|settimana|a|b|c|d)\s*\d*\b/ig, ''))) { newDay(L.text); continue; }
        globalFlags.push(`Riga non letta: "${rawLine.trim()}"`); continue;
      }
      if (!cur) newDay('Giorno 1');
      if (!L.name || !(L.sets > 0)) { globalFlags.push(`Riga non letta: "${rawLine.trim()}"`); continue; }
      const info = F.parseReps(L.reps, L.sets), mt = F.matchExercise(L.name);
      if (info.scheme.length === 2 && info.scheme[0] < info.scheme[1] && !/cresc|crescente|ramp|pyramid|piramide/i.test(L.reps)) {
        info.range = [info.scheme[0], info.scheme[1]]; info.scheme = [info.scheme[1]]; info.flags = info.flags.filter(f => !/ripetizioni indicate/.test(f));
      }
      const timed = /\d\s*(?:s|sec|secondi|seconds|"|″)\b/i.test(L.reps) || (mt && mt.ex.unit === 'sec');
      const fl = (L.flags || []).concat(info.flags);
      if (!mt) fl.push('Esercizio non riconosciuto: collegalo a uno della lista.');
      else if (mt.score < 0.75) fl.push(`Riconosciuto come "${mt.ex.name}" (non sicuro): controlla.`);
      if (L.pct && L.pct[0] > 100) fl.push(`Percentuale ${L.pct[0]}% strana: controllala.`);
      cur.exercises.push({ name: L.name, sets: L.sets, repsInfo: info, reps: info.max ? 'MAX' : (info.range ? info.range.join('-') : info.scheme.join('-')), exId: mt ? mt.ex.id : null, match: mt ? mt.score : 0,
        unit: timed ? 'sec' : (mt ? mt.ex.unit : 'reps'), rest: L.rest || defRest || (L.pct && L.pct[1] >= 80 ? 150 : 90), restRead: !!L.rest,
        pct: L.pct || null, rpe: L.rpe || null, tempo: L.tempo || null, note: L.superset ? 'Superserie con l\'esercizio successivo' : '', flags: fl });
    }
    return { days, flags: globalFlags };
  };

  /* massimale (1RM) per un esercizio: valore inserito a mano oppure stima migliore dalle sedute */
  F.oneRM = function (p, exId) {
    if (p.rm && p.rm[exId] > 0) return { kg: p.rm[exId], src: 'manuale' };
    let best = 0; (p.sessions || []).forEach(s => s.ex.forEach(e => { if (e.exId === exId) e.sets.forEach(t => { const v = F.e1rm(t.kg, t.reps); if (v && v > best) best = v; }); }));
    return best ? { kg: Math.round(best * 10) / 10, src: 'stimato' } : null;
  };
  F.pctTarget = function (p, x) {
    if (!x.pct) return null;
    const rm = F.oneRM(p, x.exId); if (!rm) return { need: true };
    const r5 = v => Math.round(v / 2.5) * 2.5;
    return { lo: r5(rm.kg * x.pct[0] / 100), hi: r5(rm.kg * x.pct[1] / 100), rm };
  };
  F.pctLabel = x => x.pct ? (x.pct[0] === x.pct[1] ? x.pct[0] : x.pct[0] + '-' + x.pct[1]) + '% di 1RM' : '';
})(window.FORMA);

(function (F) {
  const baseLabel = F.repsLabel, baseTarget = F.targetFor;
  F.repsLabel = x => x.repsInfo && x.repsInfo.range ? x.repsInfo.range.join('-') + (x.repsInfo.perSide ? ' per lato' : '') : baseLabel(x);
  F.targetFor = (x, i) => x.repsInfo && x.repsInfo.range ? x.repsInfo.range.join('-') : baseTarget(x, i);
})(window.FORMA);
