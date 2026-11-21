/* FORGIA – piano alimentare ricevuto dal professionista: l'utente incolla il testo, l'app riconosce alimenti e quantità (da rivedere e correggere).
   L'app NON crea né consiglia diete: trascrive e calcola. */
(function (F) {
  'use strict';
  const norm = s => F.normText ? F.normText(s) : String(s).toLowerCase();
  const MEAL_KEYS = [[/^(colazione|breakfast|prima colazione)\b/, 0], [/^(pranzo|lunch)\b/, 1], [/^(spuntino|merenda|snack|break|fuori pasto)\b/, 2], [/^(cena|dinner)\b/, 3]];
  const DAYS = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];
  const UNIT_G = { kg: 1000, g: 1, gr: 1, grammi: 1, grammo: 1, hg: 100, etto: 100, etti: 100 };
  const UNIT_ML = { l: 1000, litri: 1000, litro: 1000, ml: 1, cl: 10, dl: 100 };
  // misure casalinghe: valori indicativi, segnalati come "stima"
  const UNIT_HOME = { cucchiaino: 5, cucchiaini: 5, cucchiaio: 10, cucchiai: 10, bicchiere: 200, bicchieri: 200, tazza: 200, tazze: 200 };
  const UNIT_COUNT = { fetta: ['fetta', 30], fette: ['fetta', 30], vasetto: ['vasetto', 125], vasetti: ['vasetto', 125], uovo: ['uovo', 50], uova: ['uovo', 50], pezzo: ['', 0], pezzi: ['', 0], biscotto: ['biscott', 8], biscotti: ['biscott', 8], scatoletta: ['scatol', 80], scatolette: ['scatol', 80], porzione: ['', 0], porzioni: ['', 0], frutto: ['', 0], frutti: ['', 0] };
  const QTY = /(\d+(?:[.,]\d+)?\s*\/\s*\d+|\d+(?:[.,]\d+)?|½)\s*(kg|gr|grammi|grammo|g|hg|etti|etto|ml|cl|dl|litri|litro|l|cucchiaini|cucchiaino|cucchiai|cucchiaio|bicchieri|bicchiere|tazze|tazza|fette|fetta|vasetti|vasetto|uova|uovo|pezzi|pezzo|biscotti|biscotto|scatolette|scatoletta|porzioni|porzione|frutti|frutto)?(?![a-z0-9])/i;

  function num(s) {
    s = String(s).replace(/\s+/g, '');
    if (s === '½') return 0.5;
    if (s.indexOf('/') > 0) { const [a, b] = s.split('/'); return (parseFloat(a.replace(',', '.')) / parseFloat(b.replace(',', '.'))) || 0; }
    return parseFloat(s.replace(',', '.')) || 0;
  }
  function headingOf(line) {
    const n = norm(line).replace(/[^a-z0-9: ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!n || n.length > 40 || /\d+\s*(g|gr|ml|kg|etti|cl)\b/.test(n)) return null;
    const dw = n.replace(/^(giorno|day)\s*\d+\s*/, '');
    for (let i = 0; i < DAYS.length; i++) if (dw.indexOf(DAYS[i]) === 0 || n.indexOf(DAYS[i]) === 0) return { day: i, name: DAYS[i][0].toUpperCase() + DAYS[i].slice(1).replace('di', 'dì') };
    const gm = /^(giorno|day)\s*(\d+)/.exec(n); if (gm) return { day: null, name: 'Giorno ' + gm[2] };
    for (const [re, i] of MEAL_KEYS) if (re.test(n)) return { meal: i };
    return null;
  }
  const SUPP = /\b(bcaa|eaa|omega\s*-?\s*3|ala(?!\s+di\b)|acido alfa[- ]?lipoico|multivitaminic\w*|multi[- ]?vit\w*|creatina|vitamina\s*\w+|magnesio|zinco|integrator\w*|aminoacid\w*|glutammina|caffeina|collagene|elettroliti|sali minerali|beta[- ]?alanina|citrullina|arginina|probiotic\w*|melatonina)\b/i;
  const FREE = /^(verdur\w*|insalat\w*|ortagg\w*|spezie|sale|acqua|tisana|te|caffe|erbe aromatiche|limone|aceto|tutte le spezie)\b/;
  const UNIT_SUPP = /^(cpr|compress\w+|capsul\w+|cps|bustin\w+|misurin\w+|scoop|dos\w+|gocc\w+)$/;
  const QTY2 = /(\d+(?:[.,]\d+)?\s*\/\s*\d+|\d+(?:[.,]\d+)?|½)\s*(kg|gr|grammi|grammo|g|hg|etti|etto|ml|cl|dl|litri|litro|lt|l|cucchiaini|cucchiaino|cucchiai|cucchiaio|bicchieri|bicchiere|tazze|tazza|fette|fetta|vasetti|vasetto|uova|uovo|pezzi|pezzo|biscotti|biscotto|scatolette|scatoletta|porzioni|porzione|frutti|frutto|cpr|compresse|compressa|capsule|capsula|cps|bustine|bustina|misurini|misurino|scoop|dosi|dose|gocce|goccia)?(?![a-z0-9])/i;
  const ALT_HEAD = /^\s*(?:in alternativa|alternativa|oppure|in alt\.?|in sostituzione)\s*:?\s*/i;

  /* Memoria personale del professionista su questo dispositivo: alimenti suoi e abbinamenti scelti ("tonno rosso" -> alimento X). Si usa ai riconoscimenti successivi. */
  const MEM_KEY = 'forgia.nutri.mem';
  F.mem = {
    load() { try { const m = JSON.parse(localStorage.getItem(MEM_KEY) || '{}'); return { alias: m.alias || {}, foods: m.foods || [] }; } catch (e) { return { alias: {}, foods: [] }; } },
    save(m) { try { localStorage.setItem(MEM_KEY, JSON.stringify(m)); } catch (e) { } },
    alias(name, id) { const k = norm(name).trim(); if (!k || !id) return; const m = F.mem.load(); m.alias[k] = id; F.mem.save(m); },
    food(fd) { const m = F.mem.load(); if (!m.foods.some(x => x.id === fd.id)) { m.foods.push(fd); F.mem.save(m); } },
    heading(label, slot) { const k = norm(label).trim(); if (!k) return; const m = F.mem.load(); m.head = m.head || {}; m.head[k] = slot; F.mem.save(m); }
  };
  function itemCore(p, raw0, inherit) {
    let s = raw0.replace(/^[\s\-–—•*·]+/, '').replace(/^\d+[.)]\s+/, '').replace(/[\s.;:,]+$/, '').trim();
    if (!s) return null;
    let note = ''; s = s.replace(/\(([^)]*)\)/g, (m, t) => { note += (note ? ' · ' : '') + t.trim(); return ' '; });
    s = s.replace(/\bes\s*[:.]\s*(.*)$/i, (m, t) => { note += (note ? ' · ' : '') + 'es. ' + t.trim(); return ''; }).replace(/\s+/g, ' ').trim();
    if (inherit && !/\d/.test(s)) s = inherit + ' ' + s;
    const out = { raw: raw0.trim(), f: null, g: 0, q: '', alt: '', note, conf: 'none', est: false };
    const qm = QTY2.exec(s);
    let name = s, g = 0, unit = '', count = 0;
    if (qm) {
      let v = num(qm[1]); unit = (qm[2] || '').toLowerCase(); out.q = qm[0].trim();
      const after = s.slice(qm.index + qm[0].length);
      name = (s.slice(0, qm.index) + ' ' + after).replace(/\b(da|di|circa|ca|ca\.)\s*$/i, '').replace(/^\s*(di|da|d')\s*/i, '').replace(/\s+/g, ' ').trim();
      if (!unit && v >= 15 && /^\s*(di|d')\s*\S/i.test(after)) unit = 'g';   // "80 di riso", "350 di pesce": grammi
      if (/^(uova|uovo)$/.test(unit)) name = unit + (name ? ' ' + name : '');
      if (UNIT_SUPP.test(unit)) { out.kind = 'supp'; count = v; out.q = qm[0].trim(); }
      else if (unit === 'lt') g = v * 1000;
      else if (UNIT_G[unit] != null) g = v * UNIT_G[unit];
      else if (UNIT_ML[unit] != null) g = v * UNIT_ML[unit];
      else if (UNIT_HOME[unit] != null) { g = v * UNIT_HOME[unit]; out.est = true; }
      else if (UNIT_COUNT[unit]) count = v;
      else if (!unit) count = v;
      out.unit = unit; out.count = count;
    }
    name = name.replace(/\bq\.?b\.?\b/ig, '').replace(/^[\s,;:\-–]+|[\s,;:\-–]+$/g, '').replace(/^(di|d')\s*/i, '').trim();
    if (!name) { out.name = ''; return out; }
    out.name = name;
    const nn = norm(name);
    if (SUPP.test(name)) { out.kind = 'supp'; if (g) out.q = out.q || (g + ' g'); out.g = 0; out.gram = g || 0; return out; }
    if (!qm && FREE.test(nn)) { out.kind = 'free'; return out; }
    const toks = nn.split(' ').filter(t => t.length >= 3);
    const learned = F.mem.load().alias[nn];
    const lf = learned ? F.getFood(p, learned) : null;
    const res = lf ? [lf] : F.searchFoods(p, name, 3);
    let fd = res[0];
    if (fd) {
      const fn = norm(fd.name) + ' ' + (fd.al || []).map(norm).join(' ');
      const hit = toks.length && toks.every(t => fn.indexOf(t) >= 0);
      out.conf = (hit || lf) ? 'ok' : 'check';
      out.base = fd.id;
      const pref = p.nutrition && p.nutrition.brandPref && p.nutrition.brandPref[fd.id];
      if (pref && F.getFood(p, pref)) { fd = F.getFood(p, pref); out.pref = true; out.conf = 'ok'; }
      out.f = fd.id;
      if (!g && count) {
        const u = (fd.units || []).filter(x => !/bottigl|confezion|\bl\b|\bml\b|litr/i.test(x[0])), key = (UNIT_COUNT[unit] || ['', 0])[0], hitU = key && u.find(x => norm(x[0]).indexOf(key) >= 0);
        if (hitU) g = count * hitU[1];
        else if (u[0]) { g = count * u[0][1]; out.est = out.est || u.length > 1; }
        else if (UNIT_COUNT[unit] && UNIT_COUNT[unit][1]) { g = count * UNIT_COUNT[unit][1]; out.est = true; }
        else { g = 0; out.noq = true; }
      }
    }
    out.g = Math.round(g * 10) / 10;
    if (fd && !out.g) out.noq = true;
    return out;
  }
  /** Una voce con le sue varianti: "80 di riso o pasta", "250g di carne o 350 di pesce". La prima è la principale, le altre sono scambi (stessa quantità se non ne scrivi un'altra). */
  function itemOf(p, raw) {
    let s = String(raw).trim(); if (!s) return null;
    const segs = s.split(/\s+(?:oppure|ovvero)\s+|\s+o\s+|\s+\/\s+/i).map(x => x.trim()).filter(Boolean);
    const main = itemCore(p, segs[0]); if (!main) return null;
    main.raw = s; main.alts = [];
    if (segs.length > 1) {
      const inh = main.g > 0 ? main.g + 'g' : (main.q && main.kind !== 'free' ? main.q : '');
      segs.slice(1).forEach(sg => { const a = itemCore(p, sg, inh); if (a && a.name) main.alts.push(a); });
      main.alt = main.alts.map(a => (a.g > 0 ? a.g + ' g ' : (a.q ? a.q + ' ' : '')) + a.name).join(' · ');
    }
    return main;
  }
  const NOTE_HEAD = /^\s*(?:p\.?\s?s\.?|note|nota|n\.?\s?b\.?|consigli|avvertenze|importante)\s*[:.\-]?\s*/i;
  function mealHead(line) {
    const s = line.replace(/[’‘`´]/g, "'");
    const rules = [
      [/^\s*(?:prima\s+colazione|colazione)\s*(\d+)?/i, m => [0, 'Colazione' + (m[1] ? ' ' + m[1] : '')]],
      [/^\s*pranzo\s*(\d+)?/i, m => [1, 'Pranzo' + (m[1] ? ' ' + m[1] : '')]],
      [/^\s*cena\s*(\d+)?/i, m => [3, 'Cena' + (m[1] ? ' ' + m[1] : '')]],
      [/^\s*(?:spuntino|merenda|snack|break|fuori pasto)\s*(\d+)?/i, m => [2, 'Spuntino' + (m[1] ? ' ' + m[1] : '')]],
      [/^\s*(?:prima|pre)[\s-]*(?:dell'|del\s+|di\s+|dall')?\s*(?:allenamento|workout|training|palestra)/i, () => [2, "Pre workout"]],
      [/^\s*(?:dopo|post)[\s-]*(?:l'|dell'|il\s+|dall')?\s*(?:allenamento|workout|training|palestra)/i, () => [2, "Post workout"]]
    ];
    for (const [re, fn] of rules) { const m = re.exec(s); if (m) { const [slot, lab] = fn(m); return { slot, lab, rest: s.slice(m[0].length).replace(/^\s*[:\-–]\s*/, '').trim() }; } }
    return null;
  }
  function waterOf(t) {
    const m = /(\d+(?:[.,]\d+)?)\s*(l|lt|litri|litro|ml)\b[^.]{0,30}\bacqua|acqua[^.\d]{0,30}(\d+(?:[.,]\d+)?)\s*(l|lt|litri|litro|ml)\b/i.exec(t);
    if (!m) return 0; const v = num(m[1] || m[3]), u = (m[2] || m[4]).toLowerCase(); return u === 'ml' ? v / 1000 : v;
  }
  /** Divide una riga in voci: "+" , virgole tra voci con quantità, seconda quantità dopo un nome */
  function splitItems(text) {
    let parts = text.split(/\s\+\s|\s*\+\s*(?=\d)/);
    const out = [];
    parts.forEach(pt => {
      let cs = pt.split(/\s*[,;]\s*/); if (!(cs.length > 1 && cs.filter(x => /\d/.test(x)).length === cs.length)) cs = [pt];
      cs.forEach(c => {
        const re = /(?<=[A-Za-zÀ-ÿ)])\s+(?=\d+(?:[.,]\d+)?\s*(?:g|gr|kg|ml|cl|l|cucchia\w+|cpr|capsul\w+|bustin\w+|misurin\w+)\b|\d+\s+(?:di\s+)?[A-Za-zÀ-ÿ])/g;
        let last = 0, m, buf = c;
        const cuts = []; while ((m = re.exec(c))) { if (/\d/.test(c.slice(last, m.index)) && !/\b(di|da|o|e|con|circa|ca)$/i.test(c.slice(0, m.index).trim())) { cuts.push(m.index); last = m.index; } }
        let prev = 0; cuts.forEach(ix => { out.push(c.slice(prev, ix)); prev = ix; }); out.push(c.slice(prev));
      });
    });
    return out.map(x => x.trim()).filter(Boolean);
  }
  /** Testo libero del professionista -> piano con giorni e pasti. Quattro fasce (colazione, pranzo, spuntino, cena): ogni voce ricorda il titolo scritto (es. "Spuntino 2", "Dopo l'allenamento") e le alternative sono segnate. */
  F.parsePlanText = function (p, text) {
    const days = []; let cur = null, meal = 0, lab = '', hasDays = false, notes = [], inNotes = false, water = 0, optN = 0, ord = 0, suppSec = false, waterSec = false, seen = {};
    const newDay = (name, dow) => { cur = { name, dow: dow == null ? null : dow, meals: [[], [], [], []] }; days.push(cur); meal = 0; lab = ''; inNotes = false; suppSec = false; waterSec = false; seen = {}; };
    const addItems = (txt, opt) => {
      splitItems(txt).forEach(part => { const it = itemOf(p, part); if (!it) return; if (!it.name && !it.raw) return; if (lab) it.lab = lab; if (opt) it.opt = opt; it.ord = ord++; if (suppSec) { it.kind = 'supp'; it.f = null; if (!it.q && it.g) it.q = it.g + ' g'; it.g = 0; it.conf = 'none'; delete it.noq; } cur.meals[meal].push(it); });
    };
    String(text || '').replace(/[’‘´`]/g, "'").split(/\r?\n/).forEach(line0 => {
      let line = line0.trim(); if (!line) return;
      if (/^[#=\-_*\s]{3,}$/.test(line)) return;
      const h = headingOf(line);
      if (h && h.day !== undefined) { hasDays = true; newDay(h.name, h.day); return; }
      const nh = NOTE_HEAD.exec(line);
      if (nh) { inNotes = true; line = line.slice(nh[0].length).trim(); if (!line) return; }
      if (inNotes) { notes.push(line); const w = waterOf(line); if (w) water = w; return; }
      { const nl = norm(line).replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
        if (/^(integratori|integrazione|supplementi|supplementazione)$/.test(nl)) { if (!cur) newDay('Piano', null); suppSec = true; waterSec = false; meal = 2; lab = 'Integratori'; return; }
        if (/^acqua( al giorno)?$/.test(nl)) { waterSec = true; suppSec = false; return; }
      }
      if (waterSec && !mealHead(line)) { const wm = /(\d+(?:[.,]\d+)?)\s*(l|lt|litri|litro|ml)\b/i.exec(line); if (wm) { water = num(wm[1]) / (/ml/i.test(wm[2]) ? 1000 : 1); notes.push('Acqua: ' + line.trim()); return; } }
      let mh = null;
      { const gm = /^\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' ]{2,38}?\s*\d?)\s*[:\-–]\s*(.*)$/.exec(line.replace(/[’‘`´]/g, "'"));
        if (gm) {
          const lb = gm[1].trim(), k = norm(lb), isFoodLine = /^\d/.test(gm[2]) && (() => { const f1 = F.searchFoods(p, lb, 1)[0]; return f1 && norm(f1.name).indexOf(k) >= 0; })();
          if (!isFoodLine && !/\d\s*(g|gr|kg|ml|l)\b/i.test(lb) && lb.split(/\s+/).length <= 4 && !SUPP.test(lb) && !/\b(es|ad es)$/i.test(lb)) {
            const mm = F.mem.load().head || {};
            const slot = mm[k] != null ? mm[k] : /colaz|mattin|risvegl|sveglia/.test(k) ? 0 : /pranz/.test(k) ? 1 : /\bcen[ae]\b|serata|\bsera\b/.test(k) ? 3 : 2;
            mh = { slot, lab: lb[0].toUpperCase() + lb.slice(1), rest: gm[2].trim() };
          }
        }
      }
      if (!mh) mh = mealHead(line);
      if (!mh && !/[\d:+]/.test(line) && line.trim().split(/\s+/).length <= 4 && line.trim().length >= 3 && !SUPP.test(line) && !FREE.test(norm(line))) { const f1 = F.searchFoods(p, line.trim(), 1)[0]; if (!(f1 && norm(f1.name).indexOf(norm(line).trim()) >= 0)) { const k = norm(line).trim(), mm = F.mem.load().head || {}; mh = { slot: mm[k] != null ? mm[k] : /colaz|mattin/.test(k) ? 0 : /pranz/.test(k) ? 1 : /\bcen[ae]\b|serata/.test(k) ? 3 : 2, lab: line.trim()[0].toUpperCase() + line.trim().slice(1).toLowerCase(), rest: '' }; } }
      if (mh) { if (!cur) newDay('Piano', null); suppSec = false; waterSec = false; meal = mh.slot; optN = 0;
        { let nl = mh.lab; if (!/\d$/.test(nl) && nl !== lab) { const n = seen[nl] = (seen[nl] || 0) + 1; if (n === 2) { cur.meals.forEach(ms => ms.forEach(it => { if (it.lab === nl) it.lab = nl + ' 1'; })); nl = nl + ' 2'; } else if (n > 2) nl = nl + ' ' + n; } lab = nl; } line = mh.rest; if (!line) return; }
      if (!cur) { if (!/\d/.test(line)) return; newDay('Piano', null); }
      const w = waterOf(line); if (w && !/\d+\s*(g|gr|kg)\b/i.test(line)) { water = w; notes.push(line); return; }
      // alternative tra parentesi o dopo "in alternativa": gruppo di voci a parte
      const alts = []; line = line.replace(/\(([^()]*)\)/g, (m, t) => { if (ALT_HEAD.test(t)) { alts.push(t.replace(ALT_HEAD, '')); return ' '; } return m; });
      const ai = line.search(/\s(?:in alternativa|oppure)\s*:?\s+(?=\d)/i);
      if (ai > 0) { alts.push(line.slice(ai).replace(ALT_HEAD, '')); line = line.slice(0, ai); }
      line = line.replace(/\bes\.\s*/gi, 'es: ');
      line.split(/\.\s+(?=\d)/).forEach(sent => { if (sent.trim()) addItems(sent, 0); });
      alts.forEach(a => { optN++; a.split(/\s\+\s|\s+con\s+/i).forEach(x => addItems(x, optN)); });
    });
    const used = days.filter(d => d.meals.some(m => m.length));
    const plan = { id: 'pa' + Date.now().toString(36), name: 'Piano alimentare', text: String(text || '').slice(0, 20000), created: F.todayISO ? F.todayISO() : '', days: used, multi: hasDays && used.length > 1 };
    if (water) plan.water = Math.round(water * 100) / 100;
    if (notes.length) plan.notes = notes.join('\n').slice(0, 2000);
    return plan;
  };
  /** Voci principali di una fascia (senza le alternative) e voci ancora da completare */
  F.altText = it => (it.alts || []).map(a => (a.g > 0 ? a.g + ' g ' : (a.q ? a.q + ' ' : '')) + (a.name || '')).join(' · ');
  /** Scambia la voce principale con una sua variante (k = indice in alts) */
  F.swapAlt = (it, k) => {
    const a = (it.alts || [])[k]; if (!a) return;
    const old = Object.assign({}, it); delete old.alts; delete old.lab; delete old.opt; delete old.alt;
    const rest = it.alts.filter((_, j) => j !== k);
    ['f', 'g', 'name', 'q', 'conf', 'est', 'noq', 'base', 'kind', 'unit', 'count', 'note', 'pref', 'gram'].forEach(key => delete it[key]);
    Object.assign(it, a); it.alts = rest.concat([old]); it.alt = F.altText(it);
  };
  /** Sezioni del giorno nell'ordine in cui le ha scritte il professionista, ognuna con i suoi valori: [{lab, slot, supp, rows:[[voce, fascia, indice]], tot}] */
  F.planSections = (p, day) => {
    const map = {}, list = [];
    (day.meals || []).forEach((m, slot) => (m || []).forEach((it, i) => {
      const lab = it.lab || F.MEALS[slot], o = it.ord != null ? it.ord : 1e6 + slot * 1000 + i;
      let sc = map[lab]; if (!sc) { sc = map[lab] = { lab, slot, ord: o, rows: [] }; list.push(sc); }
      sc.ord = Math.min(sc.ord, o); sc.rows.push([it, slot, i]);
    }));
    list.sort((a, b) => a.ord - b.ord);
    list.forEach(sc => {
      sc.tot = { k: 0, p: 0, c: 0, f: 0 };
      sc.rows.forEach(r => { const it = r[0]; if (it.opt || !it.f || !(it.g > 0)) return; const x = F.itemMacros(p, { f: it.f, g: it.g }); sc.tot.k += x.k; sc.tot.p += x.p; sc.tot.c += x.c; sc.tot.f += x.f; });
      sc.supp = sc.rows.length > 0 && sc.rows.every(r => r[0].kind === 'supp');
      sc.groups = []; const mains = sc.rows.filter(r => !r[0].opt); if (mains.length) sc.groups.push({ head: '', rows: mains });
      const opts = {}; sc.rows.filter(r => r[0].opt).forEach(r => { (opts[r[0].opt] = opts[r[0].opt] || []).push(r); });
      Object.keys(opts).forEach(k => sc.groups.push({ head: 'In alternativa', rows: opts[k] }));
    });
    return list;
  };
  F.mainItems = items => (items || []).filter(it => !it.opt);
  F.itemOpen = it => !it.opt && !it.kind && (!it.f || !(it.g > 0));
  /** Raggruppa le voci di una fascia per titolo scritto e alternative: [{head, rows:[[it,indice]]}] */
  F.itemGroups = (items, slotName) => {
    const gs = [];
    (items || []).forEach((it, i) => {
      const head = (it.lab && it.lab !== slotName ? it.lab : '') + (it.opt ? (it.lab && it.lab !== slotName ? ' · ' : '') + 'In alternativa' : '');
      const key = head + '|' + (it.opt || 0), last = gs[gs.length - 1];
      if (last && last.key === key) last.rows.push([it, i]); else gs.push({ key, head, rows: [[it, i]] });
    });
    return gs;
  };
  F.planDayTotals = function (p, day) {
    const t = { k: 0, p: 0, c: 0, f: 0 }, meals = (day.meals || []).map(m => {
      const mt = { k: 0, p: 0, c: 0, f: 0 };
      m.forEach(it => { if (it.opt || !it.f || !(it.g > 0)) return; const x = F.itemMacros(p, { f: it.f, g: it.g }); mt.k += x.k; mt.p += x.p; mt.c += x.c; mt.f += x.f; });
      t.k += mt.k; t.p += mt.p; t.c += mt.c; t.f += mt.f; return mt;
    });
    return { total: t, meals };
  };
  /** Giorno del piano da usare per una data: quello con lo stesso giorno della settimana, altrimenti il primo */
  F.planDayFor = function (plan, iso, pick) {
    if (!plan || !plan.days || !plan.days.length) return null;
    if (pick != null && plan.days[pick]) return plan.days[pick];
    const dow = (new Date(iso + 'T12:00:00').getDay() + 6) % 7;
    return plan.days.find(d => d.dow === dow) || plan.days[0];
  };
  F.PLAN_NOTICE = 'FORGIA non crea né consiglia diete: registra ciò che mangi e trascrive il piano che ti ha dato il tuo professionista. Per qualsiasi dubbio su alimentazione, patologie o terapie rivolgiti a lui o al tuo medico.';

  /* Avvertenze e responsabilità (da far rivedere a un legale prima della pubblicazione sugli store) */
  F.LEGAL_VERSION = '2026-11-b';
  F.LEGAL = [
    ['Cos\'è quest\'app', 'È uno strumento di registrazione e di calcolo: tiene il diario degli allenamenti e dei pasti, trascrive i piani che l\'utente inserisce o importa e ne calcola i valori da tabelle e dati. Non è un servizio medico, dietetico, nutrizionale, fisioterapico o di allenamento personale e non instaura alcun rapporto professionale con chi la sviluppa o la pubblica. Non crea, non consiglia, non prescrive e non modifica diete o programmi di allenamento. È fornita così com\'è, senza garanzie di accuratezza, completezza, continuità o idoneità a uno scopo particolare.'],
    ['Chi è responsabile', 'Di come usa l\'app, di ciò che mangia e di come si allena è responsabile l\'utente. Dei piani alimentari è responsabile il professionista abilitato che li ha scritti (nutrizionista, dietista o medico); dei programmi di allenamento l\'allenatore o il coach che li ha scritti; di ciò che un professionista inserisce, misura o interpreta è responsabile quel professionista. L\'app si limita a trascrivere e calcolare ciò che l\'utente o il suo professionista inseriscono.'],
    ['Controlla sempre i dati', 'I valori nutrizionali provengono da tabelle (CREA), da Open Food Facts o dall\'utente e sono medi e indicativi: possono essere incompleti, contenere errori o cambiare. Per i prodotti confezionati vale l\'etichetta. Il riconoscimento automatico di un piano scritto a testo può sbagliare alimenti e quantità: l\'utente deve controllare ogni voce, anche se il peso è da crudo o da cotto, prima di attivare il piano. I calcoli non sono una valutazione dello stato di salute.'],
    ['Salute e sicurezza', 'Prima di iniziare un allenamento o un piano alimentare chiedi il parere del tuo medico o del tuo professionista, soprattutto in caso di malattie, gravidanza, terapie, allergie o intolleranze. Interrompi subito se hai un malessere. Gli avvisi su allergie e intolleranze sono solo un aiuto e non sostituiscono la lettura dell\'etichetta.'],
    ['Minorenni', 'I minorenni usano l\'app con il consenso e sotto la supervisione di un genitore o tutore e dei professionisti che li seguono. Il collegamento con un nutrizionista di un minorenne richiede il consenso di un genitore o tutore.'],
    ['Collegamento con un professionista', 'Se scegli di collegarti a un nutrizionista o dietista, decidi tu cosa può vedere: peso e misure con il collegamento, diario alimentare e allenamenti solo se li consenti. Puoi modificare i consensi o revocare il collegamento in qualsiasi momento. Il professionista tratta i dati che inserisce e che vede sotto la propria responsabilità professionale e secondo le proprie regole deontologiche.'],
    ['Uso, disponibilità e copie', 'Le funzioni possono cambiare, essere sospese o interrotte, anche senza preavviso. Conserva una copia dei dati che ritieni importanti. Usa l\'app in modo lecito e non inserire dati di altre persone senza il loro consenso.'],
    ['Limiti di responsabilità', 'Nei limiti consentiti dalla legge, chi ha sviluppato e pubblica l\'app non risponde dei danni derivanti dall\'uso dell\'app, dei piani e dei valori che contiene, né delle scelte dell\'utente o dei suoi professionisti. Resta ferma la responsabilità che la legge non permette di escludere (ad esempio per dolo o colpa grave) e i diritti inderogabili dei consumatori: nulla in queste avvertenze li esclude o li limita.'],
    ['Dati personali', 'Peso, allenamenti e alimentazione possono essere dati sulla salute. Sono trattati come descritto nell\'informativa privacy dell\'app; le funzioni che li condividono con un account o con un professionista si attivano solo con il tuo consenso, che puoi revocare. Per esercitare i tuoi diritti sui dati (accesso, rettifica, cancellazione e gli altri previsti dalla legge) usa i contatti indicati nell\'informativa.']
  ];
})(window.FORMA || (window.FORMA = {}));
