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

  /* Tecniche avanzate: topset + back-off, EMOM, myo-reps, dropset, pause, alternative. Le trasforma in serie normali + una nota. */
  function advanced(line) {
    const notes = []; const tech = {};
    let s = line.trim(); const sp = s.split(/\s+[-–—]\s+/);
    if (sp.length < 2) return { line, note: '', tech: null };
    let name = sp[0].trim(), scheme = sp.slice(1).join(' - ').trim();
    // alternativa "A / B - 3x8-10 / EMOM 6'"
    let m = scheme.match(/^(.*?)\s*\/\s*(EMOM\s*\d+.*)$/i);
    if (m && /\s\/\s/.test(name)) { const parts = name.split(/\s*\/\s*/); notes.push(`In alternativa: ${parts.slice(1).join(' / ')} in ${m[2].trim()}`); name = parts[0]; scheme = m[1]; }
    // parentesi descrittive -> nota (restano le parentesi RIR/RPE)
    scheme = scheme.replace(/\(([^)]*)\)/g, (all, inner) => {
      if (/^\s*(rir|rpe|@)/i.test(inner) || /^[\s\d\-–.,%]*$/.test(inner) && !/-\s*\d+\s*%/.test(inner)) return all;
      if (/^\s*-\s*\d+\s*%\s*$/.test(inner)) return all;
      let dm = inner.match(/drop\s*-?set\s*[-–]?\s*(\d+)\s*%/i);
      if (dm) { const sm = inner.match(/(\d)\s*[ªa°]?\s*serie/i), rm = inner.match(/(\d+)\s*["″”]\s*(?:di\s*)?rest/i) || inner.match(/rest\s*(\d+)/i); tech.drop = { after: sm ? +sm[1] - 1 : (/ultim/i.test(inner) ? -1 : 0), pct: +dm[1], rest: rm ? +rm[1] : 30 }; }
      let pm = inner.match(/(\d+)\s*["″”]\s*fermo(?:\s*ogni\s*(\d+)\s*rep)?/i);
      if (pm) tech.pause = { sec: +pm[1], every: pm[2] ? +pm[2] : 1 };
      notes.push(inner.trim().replace(/(\d+)\s*["″]/g, '$1 secondi').replace(/\b(\d)a serie\b/g, '$1ª serie')); return ' ';
    });
    // topset + back-off
    const TOP_BACK = '\\s*\\+\\s*(\\d+)\\s*[x×]\\s*(\\d+(?:\\s*[-–]\\s*\\d+(?!\\d|\\s*%))?)\\s*(?:\\(\\s*-\\s*(\\d+)\\s*%\\s*\\)|-\\s*(\\d+)\\s*%)?';
    let tp = scheme.match(new RegExp('(?:topset|mav)\\s*(\\d+)(?:\\s*[-–]\\s*(\\d+))?\\s*(?:reps?|rip\\w*)?\\s*(?:\\(\\s*@\\s*(?:rpe\\s*)?([\\d.,]+)\\s*\\))?' + TOP_BACK, 'i')) ||
      scheme.match(new RegExp('(?:^|[^\\d])(\\d+)()\\s*(?:reps?\\s*)?@\\s*(?:rpe\\s*)?([\\d.,]+)' + TOP_BACK, 'i')) ||
      scheme.match(new RegExp('1\\s*[x×]\\s*(\\d+)()\\s*(?:reps?\\s*)?@\\s*(?:rpe\\s*)?([\\d.,\\-]+)' + TOP_BACK, 'i'));
    if (tp) {
      const n = +tp[4], top1 = tp[1], top2 = tp[2] || tp[1], topLbl = top1 === top2 ? top1 : top1 + '-' + top2, backReps = tp[5].replace(/\s/g, ''), pct = tp[6] || tp[7], rpeTop = tp[3];
      notes.unshift(`Serie 1 = topset pesante da ${topLbl} ripetizioni${rpeTop ? ' (RPE ' + rpeTop.replace(',', '.') + ')' : ''}; poi ${n} serie da ${backReps} ripetizioni${pct ? ` con il carico ridotto del ${pct}%` : ''}.`);
      scheme = `${1 + n}x${topLbl} rest 150s`; tech.top = { n, backReps, pct: pct ? +pct : 15 };
    }
    // EMOM
    m = scheme.match(/emom\s*(\d+)\s*(?:['’′]|min\w*)?/i);
    if (m) { tech.emom = +m[1]; notes.unshift(`EMOM ${m[1]} minuti: una serie ogni minuto con ripetizioni sub-massimali (lascia 1-2 ripetizioni di riserva) e riposa il tempo che resta nel minuto.`); scheme = scheme.replace(m[0], ' ') ; scheme = `${m[1]}xMAX ` + scheme.replace(/^\s*\d+\s*[x×]\s*\S+/, ' ') + ' rest 30s'; }
    // myo-reps
    m = scheme.match(/\+\s*(?:(\d+)\s*[x×]\s*)?myo[\s-]?reps?/i);
    if (m) { if (!m[1]) m[1] = '1';
      const base = scheme.replace(m[0], ' ').match(/(\d+)\s*[x×]\s*(\d+(?:\s*[-–]\s*\d+)?)/);
      if (base) { notes.push('Ultima serie in myo-reps: una serie attivante vicino al cedimento, poi 3-4 mini-serie da 3-5 ripetizioni con 10-15 secondi di pausa.'); scheme = `${+base[1] + +m[1]}x${base[2].replace(/\s/g, '')}`; tech.myo = { sets: +m[1] }; }
    }
    return { line: `${name} ${scheme.replace(/\s+/g, ' ').trim()}`, note: notes.join(' '), tech: Object.keys(tech).length ? tech : null };
  }

  const parseFlat = function (text) {
    text = String(text || '').replace(/[\u200b-\u200d\u2060\ufeff]/g, '');
    const days = []; let cur = null, defRest = null; const globalFlags = [];
    const newDay = n => { cur = { name: n, exercises: [] }; days.push(cur); defRest = null; };
    let gseq = 0;
    /* alternative: "A / B - 3x8-10 / EMOM 6'" (stesso numero di parti) oppure "A / B - 3x8" con entrambi gli esercizi riconosciuti */
    const splitAlt = line0 => {
      let line = line0;
      // "A / B: 3x8" (due punti al posto del trattino)
      if (!/\s[-–—]\s/.test(line)) { const cm = line.match(/^([^:]*\/[^:]*):\s*(.*\d.*)$/); if (cm) line = cm[1].trim() + ' - ' + cm[2].trim(); }
      const sp = line.split(/\s+[-–—]\s+/); if (sp.length < 2) return null;
      const names = sp[0].split(/\s*\/\s*/), schemes = sp.slice(1).join(' - ').split(/\s+\/\s+/);
      if (names.length < 2 || names.some(n => !n.trim() || /\d/.test(n.replace(/\([^)]*\)/g, '')) || n.replace(/[^A-Za-zÀ-ÿ]/g, '').length < 3)) return null;
      names.forEach((n, k) => { const mw = names[0].trim().split(/\s+/); if (k > 0 && n.trim().split(/\s+/).length === 1 && mw.length >= 3 && mw.includes('con')) names[k] = mw.slice(0, mw.lastIndexOf('con') + 1).join(' ') + ' ' + n.trim(); });
      if (schemes.length === names.length) return names.map((n, k) => n.trim() + ' - ' + schemes[k].trim());
      if (schemes.length === 1) return names.map(n => n.trim() + ' - ' + schemes[0].trim());
      return null;
    };
    const addLine = (line, rawLine, grp) => {
      const srcTxt = rawLine.trim().replace(/^\s*(?:[-•*·]|\d{1,2}[.)])\s+/, '').replace(/\s+/g, ' ');   // riga esattamente come l'ha scritta l'allenatore
      const pre = advanced(line); line = pre.line;
      const L = F.parseLine(line);
      if (L.none) {
        if (L.rest && !L.text.replace(/\d+/g, '').trim()) { defRest = L.rest; return; } // "Rest 90s tra le serie" vale per le righe seguenti
        if (L.rest && /^(?:rest|rec|pausa)/i.test(line)) { defRest = L.rest; return; }
        if (L.text && L.text.length <= 45 && !/\d/.test(L.text.replace(/\b(day|giorno|workout|seduta|session|week|settimana|a|b|c|d)\s*\d*\b/ig, ''))) { newDay(L.text); return; }
        globalFlags.push(`Riga non letta: "${rawLine.trim()}"`); return;
      }
      if (!cur) newDay('Giorno 1');
      if (!L.name || !(L.sets > 0)) { globalFlags.push(`Riga non letta: "${rawLine.trim()}"`); return; }
      const info = F.parseReps(L.reps, L.sets), mt = F.matchExercise(L.name);
      if (info.scheme.length === 2 && info.scheme[0] < info.scheme[1] && !/cresc|crescente|ramp|pyramid|piramide/i.test(L.reps)) {
        info.range = [info.scheme[0], info.scheme[1]]; info.scheme = [info.scheme[1]]; info.flags = info.flags.filter(f => !/ripetizioni indicate/.test(f));
      }
      const timed = /\d\s*(?:s|sec|secondi|seconds|"|″)\b/i.test(L.reps) || (mt && mt.ex.unit === 'sec');
      const fl = (L.flags || []).concat(info.flags);
      if (!mt) fl.push('Esercizio non riconosciuto: collegalo a uno della lista.');
      else if (mt.score < 0.75) fl.push(`Riconosciuto come "${mt.ex.name}" (non sicuro): controlla.`);
      if (L.pct && L.pct[0] > 100) fl.push(`Percentuale ${L.pct[0]}% strana: controllala.`);
      if (pre.tech && pre.tech.drop && pre.tech.drop.after < 0) pre.tech.drop.after = L.sets - 1;
      cur.exercises.push({ src: srcTxt, name: L.name, sets: L.sets + (pre.tech && pre.tech.drop ? 1 : 0), repsInfo: info, reps: info.max ? 'MAX' : (info.range ? info.range.join('-') : info.scheme.join('-')), exId: mt ? mt.ex.id : null, match: mt ? mt.score : 0,
        unit: timed ? 'sec' : (mt ? mt.ex.unit : 'reps'), rest: L.rest || defRest || (L.pct && L.pct[1] >= 80 ? 150 : 90), restRead: !!L.rest,
        tech: pre.tech || null, exact: true, pct: L.pct || null, rpe: L.rpe || null, tempo: L.tempo || null, note: [L.superset ? 'Superserie con l\'esercizio successivo' : '', grp && grp.alt ? 'Alternativa a: ' + grp.main + '.' : '', pre.note].filter(Boolean).join(' '), flags: fl, altGroup: grp ? grp.id : null, alt: !!(grp && grp.alt) });
    };
    for (const rawLine of text.split(/\r?\n/)) {
      let line = rawLine.trim(); if (!line) continue;
      if (/^#/.test(line) || /:$/.test(line) && !/\d\s*[x×]/i.test(line)) { newDay(line.replace(/^#+\s*/, '').replace(/:$/, '')); continue; }
      // formato a colonne NOME | serie | rip | extra
      if (line.includes('|') || line.includes('\t')) {
        const parts = line.split(/\||\t/).map(x => x.trim()), sets = parseInt(parts[1], 10);
        if (parts[0] && sets > 0 && parts[2]) line = `${parts[0]} ${sets}x${parts.slice(2).join(' ')}`;
        else line = parts.join(' ');
      }
      line = line.replace(/^\s*(?:[-•*·]|\d{1,2}[.)])\s+/, '');
      line = line.replace(/\s*<\s*<\s*\/\s*>\s*>\s*/g, ' / ');
      // "Nome: 2x8 + 1x myo-reps" / "Nome: Topset 6-8 + 2x8 (-15%)" / "Nome: 3@9 + 4x6 -15%" (due punti al posto del trattino)
      if (!/\s[-–—]\s/.test(line)) { const tm = line.match(/^(.*?):\s*((?:topset|mav|emom)(?![a-z]).*|\d.*(?:myo|drop|topset|mav|emom|@\s*(?:rpe\s*)?\d.*\+).*)$/i); if (tm) line = tm[1].trim() + ' - ' + tm[2].trim(); }
      const alts = splitAlt(line);
      if (alts) { const gid = 'g' + (++gseq); alts.forEach((ln, k) => addLine(ln, rawLine, { id: gid, alt: k > 0, main: alts[0].split(' - ')[0] })); }
      else addLine(line, rawLine, null);
    }
    return { days, flags: globalFlags };
  };


  /* ---------- schede a blocco (settimane W1…W5, atleti di gara) ---------- */
  const WK = /^\s*(?:[*•·-]\s*)?W(\d+)(?:\s*[-–]\s*W?(\d+))?\s*[:\-–]\s*(.+)$/i;
  const WK_FIELDS = ['sets', 'reps', 'repsInfo', 'rest', 'restRead', 'tech', 'pct', 'rpe', 'note', 'unit', 'flags', 'tempo', 'src'];
  F.compKind = function (text) {   // tipo di gara dichiarato nel testo della scheda (solo righe di intestazione, prima del primo giorno)
    const head = String(text || '').split(/\r?\n/).slice(0, 12).join(' ');
    if (/power\s*lifting|\bPL\b/i.test(head) && /gara|competition|contest|meet|peaking|block/i.test(head)) return 'powerlifting';
    if (/calisthenic|kalisthenic|street\s*workout|freestyle/i.test(head) && /gara|competition|contest|challenge|campionato|peaking/i.test(head)) return 'calisthenics';
    if (/body\s*building|\bBB\b|physique|bikini|classic/i.test(head) && /gara|competition|contest|prep|peak/i.test(head)) return 'bodybuilding';
    if (/\bgara\b|competition|contest/i.test(head)) return 'gara';
    return null;
  };
  function parseBlock(text) {
    const days = [], flags = []; let cur = null, ex = null, maxW = 1, start = null;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim(); if (!line) continue;
      const sm = line.match(/^(?:inizio|start)\s*(?:blocco)?\s*[:\-]\s*(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/i);
      if (sm) { const y = +sm[3] < 100 ? 2000 + +sm[3] : +sm[3]; start = y + '-' + String(sm[2]).padStart(2, '0') + '-' + String(sm[1]).padStart(2, '0'); continue; }
      const wm = line.match(WK);
      if (wm) { if (!ex) continue; const a = +wm[1], b = wm[2] ? +wm[2] : a; maxW = Math.max(maxW, a, b); ex.weeks.push({ a, b, txt: wm[3].trim(), raw: line.replace(/^\s*[*•·-]\s*/, '') }); continue; }
      const dm = line.match(/^(?:giorno|day|gg|workout|seduta)\s*(\d+)\s*(?:[:\-–]\s*(.*))?$/i);
      if (dm) { cur = { name: 'GIORNO ' + dm[1], focus: (dm[2] || '').trim(), exercises: [], _ex: [] }; days.push(cur); ex = null; continue; }
      if (!cur) continue;   // titoli prima del primo giorno
      ex = { name: line.replace(/^\s*(?:[-•*·]|\d{1,2}[.)])\s+/, '').trim(), weeks: [] }; cur._ex.push(ex);
    }
    days.forEach(d => {
      d._ex.forEach(e => {
        if (!e.weeks.length) { try { parseFlat('X\n' + e.name).days.forEach(x => x.exercises.forEach(o => d.exercises.push(o))); } catch (er) { } return; }
        const wk = {}; let base = null;
        e.weeks.forEach(w => {
          const one = parseFlat('X\n' + e.name + ' - ' + w.txt).days.map(x => x.exercises[0]).filter(Boolean)[0];
          if (!one) { flags.push('Riga non letta: "' + e.name + ' ' + w.raw + '"'); return; }
          const v = {}; WK_FIELDS.forEach(f => { v[f] = one[f]; }); v.src = e.name + ' · ' + w.raw;
          for (let k = w.a; k <= w.b; k++) wk[k] = JSON.parse(JSON.stringify(v));
          if (!base || w.a < base.a) base = { a: w.a, one };
        });
        if (!base) return;
        const o = Object.assign({}, base.one, { name: e.name.replace(/\s+/g, ' '), wk });
        WK_FIELDS.forEach(f => { o[f] = wk[Math.min.apply(null, Object.keys(wk).map(Number))][f]; });
        d.exercises.push(o);
      });
      delete d._ex;
    });
    const out = { days: days.filter(d => d.exercises.length), flags, block: { weeks: maxW } };
    if (start) out.block.start = start;
    return out;
  }

  /* dati di gara scritti dall'allenatore nelle righe di intestazione: "Gara: Nome 12/12/2026", "Federazione: FIPL", "Categoria: 83", "Attrezzatura: Classic" */
  F.compInfo = function (text) {
    const o = {}, lines = String(text || '').split(/\r?\n/); let n = 0;
    for (const raw of lines) {
      if (/^\s*(?:giorno|day|gg)\s*\d/i.test(raw)) break;
      if (++n > 25) break;
      const m = raw.match(/^\s*(?:[*•-]\s*)?(data gara|gara|meet|competition|federazione|federation|categoria|category|classe|attrezzatura|equipaggiamento|equipment|disciplina|luogo|sede|messaggio|message|nota coach)\s*[:\-–]\s*(.+)$/i); if (!m) continue;
      const k = m[1].toLowerCase(), v = m[2].trim();
      if (/data|gara|meet|competition/.test(k)) {
        const d = v.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
        if (d) { const y = +d[3] < 100 ? 2000 + +d[3] : +d[3]; o.date = y + '-' + String(d[2]).padStart(2, '0') + '-' + String(d[1]).padStart(2, '0'); }
        const nm = v.replace(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/, '').replace(/[\s,;–-]+$/, '').trim();
        if (nm && !/^data/.test(k)) o.name = nm;
      } else if (/messaggio|message|nota/.test(k)) o.msg = v.slice(0, 400);
      else if (/federaz/.test(k)) o.fed = v;
      else if (/categor|classe/.test(k)) { const w = v.match(/(\d{2,3}(?:[.,]\d)?)\s*\+?/); if (w) o.cls = (v.indexOf('+') >= 0 ? '+' : '') + w[1].replace(',', '.'); else o.cls = v; }
      else if (/attrezz|equip/.test(k)) o.equip = /equip|attrez.*suppor|single|multi/i.test(v) && !/classic|raw/i.test(v) ? 'equipped' : 'classic';
      else if (/luogo|sede/.test(k)) o.place = v;
    }
    return o;
  };
  F.parseScheda = function (text) {
    text = String(text || '').replace(/[\u200b-\u200d\u2060\ufeff]/g, '');
    if (text.split(/\r?\n/).filter(l => WK.test(l)).length >= 3) { try { const r = parseBlock(text); if (r.days.length) { r.comp = F.compKind(text); r.compInfo = F.compInfo(text); return r; } } catch (e) { } }
    const r = parseFlat(text); r.comp = F.compKind(text); r.compInfo = F.compInfo(text); return r;
  };
  /* settimana del blocco: automatica dalla data di inizio, oppure scelta a mano */
  F.blockWeek = function (pl, atISO) {
    const b = pl && pl.block; if (!b) return 1;
    if (!atISO && b.manual >= 1 && b.manual <= b.weeks) return b.manual;
    const st = new Date(String(b.start || pl.createdAt || F.todayISO()).slice(0, 10) + 'T00:00:00'), at = atISO ? new Date(atISO + 'T00:00:00') : new Date(); const w = Math.floor((at - st) / (7 * 864e5)) + 1;
    return Math.max(1, Math.min(b.weeks, isNaN(w) ? 1 : w));
  };
  F.applyWeek = function (pl, w) {
    if (!pl || !pl.block) return;
    pl.days.forEach(d => d.exercises.forEach(x => {
      if (!x.wk) return; const ks = Object.keys(x.wk).map(Number).sort((a, b) => a - b); if (!ks.length) return;
      const k = x.wk[w] ? w : (ks.filter(n => n < w).pop() || ks[0]), v = x.wk[k];
      if (x.wkNow === k) return;
      if (x.wkNow && x.wk[x.wkNow]) F.wkSync(pl, x);
      WK_FIELDS.forEach(f => { x[f] = v[f] == null ? v[f] : JSON.parse(JSON.stringify(v[f])); });
      x.setsEarly = Math.max(2, (x.sets || 2) - 1); x.wkNow = k;
    }));
  };
  F.wkSync = function (pl, x) {   // una modifica fatta a mano alla settimana in corso resta in quella settimana
    if (!pl || !pl.block || !x || !x.wk || !x.wkNow || !x.wk[x.wkNow]) return;
    WK_FIELDS.forEach(f => { x.wk[x.wkNow][f] = x[f] == null ? x[f] : JSON.parse(JSON.stringify(x[f])); });
  };
  /* schede già salvate e lette male (topset, myo-reps, dropset, % scambiate per massimale): rilegge il testo originale con le regole attuali.
     Cambia solo gli esercizi dove tecnica/percentuale/nome risultano diversi, così le modifiche fatte a mano a serie e ripetizioni restano. */
  F.repairPlan = function (plan, body) {
    if (!plan || !Array.isArray(plan.days) || !body || plan.block) return 0;
    const r = F.parseScheda(body), nd = r.days.filter(d => d.exercises.length);
    if (nd.length !== plan.days.length || plan.days.some((d, i) => d.exercises.length !== nd[i].exercises.length)) return 0;
    const J = v => JSON.stringify(v == null ? null : v); let n = 0;
    plan.days.forEach((d, i) => d.exercises.forEach((ex, k) => {
      const nx = nd[i].exercises[k];
      if (nx.src && ex.src !== nx.src) ex.src = nx.src;   // testo originale dell'allenatore, sempre
      if (J(ex.tech) === J(nx.tech) && J(ex.pct) === J(nx.pct) && ex.name === nx.name) return;
      const renamed = ex.name !== nx.name;
      ['name', 'sets', 'reps', 'repsInfo', 'rest', 'restRead', 'tech', 'pct', 'rpe', 'note', 'unit', 'flags', 'alt', 'altGroup'].forEach(f => { ex[f] = nx[f]; });
      if (renamed || !ex.exId) { ex.exId = nx.exId; ex.match = nx.match; }
      ex.setsEarly = Math.max(2, ex.sets - 1); n++;
    }));
    return n;
  };

  /* schede già salvate con "Nome: Topset 6-8 + 2x8 (-15%)" lette male: le riporta a topset + serie ridotte */
  F.fixTopset = function (plan) {
    let n = 0;
    ((plan && plan.days) || []).forEach(d => (d.exercises || []).forEach(ex => {
      if (ex.tech && ex.tech.drop && ex.tech.drop.after === 0 && (ex.sets || 0) >= 3 && /ultim/i.test(ex.note || '')) { ex.tech.drop.after = ex.sets - 2; n++; }   // "dropset ultimo set": il recupero breve va prima dell'ultima serie
      const m = String(ex.name || '').match(/^(.*?)[:\s]+(?:topset|mav)\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:reps?|rip\w*)?\s*\+\s*$/i); if (!m || ex.tech) return;
      const k = ex.sets || 1, back = String(ex.reps || '8'), pct = ex.pct && ex.pct[0] > 0 ? ex.pct[0] : 15, topLbl = m[3] && m[3] !== m[2] ? m[2] + '-' + m[3] : m[2];
      const info = F.parseReps(topLbl, k + 1);
      if (info.scheme.length === 2 && info.scheme[0] < info.scheme[1]) { info.range = [info.scheme[0], info.scheme[1]]; info.scheme = [info.scheme[1]]; info.flags = (info.flags || []).filter(f => !/ripetizioni indicate/.test(f)); }
      if (!ex.src) ex.src = String(ex.name).replace(/\s+/g, ' ').trim() + ' ' + k + 'x' + back.replace(/\s/g, '') + ' (-' + pct + '%)';
      ex.name = m[1].trim(); ex.sets = k + 1; ex.repsInfo = info; ex.reps = info.range ? info.range.join('-') : info.scheme.join('-');
      ex.tech = { top: { n: k, backReps: back.replace(/\s/g, ''), pct } }; ex.pct = null; ex.rest = 150;
      ex.note = `Serie 1 = topset pesante da ${topLbl} ripetizioni; poi ${k} serie da ${back} ripetizioni con il carico ridotto del ${pct}%.` + (ex.note ? ' ' + ex.note : '');
      const mt = F.matchExercise(ex.name); if (mt) { ex.exId = mt.ex.id; ex.match = mt.score; }
      n++;
    }));
    return n;
  };
  /* massimale (1RM) per un esercizio: valore inserito a mano oppure stima migliore dalle sedute */
  F.oneRM = function (p, exId) {
    if (p.rm && p.rm[exId] > 0) return { kg: p.rm[exId], src: 'manuale' };
    let best = 0; (p.sessions || []).forEach(s => s.ex.forEach(e => { if (e.exId === exId) e.sets.forEach(t => { const v = F.e1rm(t.kg, t.reps); if (v && v > best) best = v; }); }));
    return best ? { kg: Math.round(best * 10) / 10, src: 'stimato' } : null;
  };
  /* massimali attivi: sempre per i maggiorenni; per i minorenni solo se li attiva l'allenatore o l'amministratore */
  F.rmActive = p => !F.isMinor(p) || p.rmOn === true;
  /* tabella massimali di un utente: valore inserito a mano + stima dalle serie (Epley), ultima volta, ultima stima */
  F.rmTable = function (p) {
    const ex = {}; (F.exerciseStats(p) || []).forEach(o => { ex[o.exId || o.name] = o; });
    const ids = new Set(Object.keys(ex)); Object.keys(p.rm || {}).forEach(k => ids.add(k));
    return Array.from(ids).map(k => {
      const o = ex[k] || {}, e = F.EXMAP[k], man = p.rm && p.rm[k] > 0 ? p.rm[k] : null;
      return { id: k, name: o.name || (e && e.name) || k, manual: man, est: o.bestE1 || null, last: o.lastE1 || null, lastDate: o.lastDate || '', prDate: o.prDate || '', bestKg: o.bestKg || null, use: man || o.bestE1 || null };
    }).sort((a, b) => (b.use || 0) - (a.use || 0));
  };
  /* spiegazione del calcolo stimato (per chi non ha i massimali attivi o vuole capire come funziona) */
  F.rmExplain = function (p) {
    let ex = null; (p.sessions || []).forEach(s => s.ex.forEach(e => e.sets.forEach(t => { const v = F.e1rm(t.kg, t.reps); if (v && (!ex || v > ex.v)) ex = { v, kg: t.kg, reps: t.reps, n: e.name }; })));
    const fx = ex ? `${ex.n}: ${ex.kg} kg × ${ex.reps} ripetizioni → ${ex.kg} × (1 + ${ex.reps} ÷ 30) = ${ex.v} kg` : 'Esempio: 60 kg × 8 ripetizioni → 60 × (1 + 8 ÷ 30) = 76 kg';
    return `<p class="small" style="margin:6px 0">Il massimale (1RM) è il peso che solleveresti una sola volta. Non va provato: si stima da una serie normale con la formula <b>peso × (1 + ripetizioni ÷ 30)</b>. Vale fino a 12 ripetizioni; più ne fai, meno è precisa.</p><p class="small" style="margin:6px 0"><b>${fx}</b></p><p class="mute small" style="margin:6px 0">È una stima per capire come si calcola: serve a vedere i progressi, non a caricare il massimo.</p>`;
  };
  F.pctTarget = function (p, x) {
    if (!x.pct) return null;
    if (!F.rmActive(p)) return { need: true, off: true };
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
