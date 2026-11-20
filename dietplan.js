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
  function itemOf(p, raw) {
    let s = raw.replace(/^[\s\-–—•*·]+/, '').replace(/^\d+[.)]\s+/, '').trim();
    if (!s) return null;
    // alternative ("oppure"): si tiene la prima, le altre restano come nota
    let alt = '';
    const am = /\s+(?:oppure|ovvero|o in alternativa|in alternativa)\s+|\s+\/\s+/i.exec(s);
    if (am) { alt = s.slice(am.index + am[0].length).trim(); s = s.slice(0, am.index).trim(); }
    let note = ''; s = s.replace(/\(([^)]*)\)/g, (m, t) => { note += (note ? ' · ' : '') + t.trim(); return ' '; }).replace(/\s+/g, ' ').trim();
    const out = { raw: raw.trim(), f: null, g: 0, q: '', alt, note, conf: 'none', est: false };
    const qm = QTY.exec(s);
    let name = s, g = 0, unit = '', count = 0;
    if (qm) {
      const v = num(qm[1]); unit = (qm[2] || '').toLowerCase(); out.q = qm[0].trim();
      name = (s.slice(0, qm.index) + ' ' + s.slice(qm.index + qm[0].length)).replace(/\b(da|di|circa|ca|ca\.)\s*$/i, '').replace(/^\s*(di|da|d')\s*/i, '').replace(/\s+/g, ' ').trim();
      if (/^(uova|uovo)$/.test(unit)) name = unit + (name ? ' ' + name : '');
      if (UNIT_G[unit] != null) g = v * UNIT_G[unit];
      else if (UNIT_ML[unit] != null) g = v * UNIT_ML[unit];
      else if (UNIT_HOME[unit] != null) { g = v * UNIT_HOME[unit]; out.est = true; }
      else if (UNIT_COUNT[unit]) count = v;
      else if (!unit) count = v;   // "2 mele", "1 yogurt"
      out.unit = unit; out.count = count;
    }
    name = name.replace(/\bq\.?b\.?\b/ig, '').replace(/^[\s,;:\-–]+|[\s,;:\-–]+$/g, '').trim();
    if (!name) { out.name = ''; return out; }
    out.name = name;
    const toks = norm(name).split(' ').filter(t => t.length >= 3);
    const res = F.searchFoods(p, name, 3);
    let fd = res[0];
    if (fd) {
      const fn = norm(fd.name) + ' ' + (fd.al || []).map(norm).join(' ');
      const hit = toks.length && toks.every(t => fn.indexOf(t) >= 0);
      out.conf = hit ? 'ok' : 'check';
      out.base = fd.id;
      const pref = p.nutrition && p.nutrition.brandPref && p.nutrition.brandPref[fd.id];
      if (pref && F.getFood(p, pref)) { fd = F.getFood(p, pref); out.pref = true; out.conf = 'ok'; }
      out.f = fd.id;
      if (!g && count) {
        const u = fd.units || [], key = (UNIT_COUNT[unit] || ['', 0])[0], hitU = key && u.find(x => norm(x[0]).indexOf(key) >= 0);
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
  /** Testo libero del professionista -> piano con giorni e pasti (4 pasti: colazione, pranzo, spuntino, cena) */
  F.parsePlanText = function (p, text) {
    const days = []; let cur = null, meal = 0, hasDays = false;
    const newDay = (name, dow) => { cur = { name, dow: dow == null ? null : dow, meals: [[], [], [], []] }; days.push(cur); meal = 0; };
    String(text || '').split(/\r?\n/).forEach(line => {
      if (!line.trim()) return;
      const h = headingOf(line);
      if (h && h.day !== undefined) { hasDays = true; newDay(h.name, h.day); return; }
      if (h && h.meal !== undefined) { if (!cur) newDay('Piano', null); meal = h.meal; return; }
      if (/^[#=\-_*\s]{3,}$/.test(line)) return;
      if (!cur) { if (!/\d/.test(line)) return; newDay('Piano', null); }   // titolo o intestazione prima del piano: si ignora
      // più alimenti sulla stessa riga: "+" oppure virgole se ognuno ha una quantità
      let parts = line.split(/\s\+\s|\s*\+\s*(?=\d)/);
      if (parts.length === 1) { const c = line.split(/\s*[,;]\s*/); if (c.length > 1 && c.filter(x => /\d/.test(x)).length === c.length) parts = c; }
      parts.forEach(part => { const it = itemOf(p, part); if (it) cur.meals[meal].push(it); });
    });
    const used = days.filter(d => d.meals.some(m => m.length));
    return { id: 'pa' + Date.now().toString(36), name: 'Piano alimentare', text: String(text || '').slice(0, 20000), created: F.todayISO ? F.todayISO() : '', days: used, multi: hasDays && used.length > 1 };
  };
  F.planDayTotals = function (p, day) {
    const t = { k: 0, p: 0, c: 0, f: 0 }, meals = (day.meals || []).map(m => {
      const mt = { k: 0, p: 0, c: 0, f: 0 };
      m.forEach(it => { if (!it.f || !(it.g > 0)) return; const x = F.itemMacros(p, { f: it.f, g: it.g }); mt.k += x.k; mt.p += x.p; mt.c += x.c; mt.f += x.f; });
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
  F.LEGAL_VERSION = '2026-11-a';
  F.LEGAL = [
    ['Cos\'è quest\'app', 'È uno strumento di registrazione e di calcolo: tiene il diario degli allenamenti e dei pasti, trascrive i piani che l\'utente inserisce o importa e ne calcola i valori da tabelle e dati. Non è un servizio medico, dietetico, nutrizionale, fisioterapico o di allenamento personale. Non crea, non consiglia, non prescrive e non modifica diete o programmi di allenamento.'],
    ['Chi è responsabile', 'Di come usa l\'app, di ciò che mangia e di come si allena è responsabile l\'utente. Dei piani alimentari è responsabile il professionista abilitato che li ha scritti (nutrizionista, dietista o medico); dei programmi di allenamento l\'allenatore o il coach che li ha scritti. L\'app si limita a trascrivere e calcolare ciò che l\'utente o il suo professionista inseriscono.'],
    ['Controlla sempre i dati', 'I valori nutrizionali provengono da tabelle (CREA), da Open Food Facts o dall\'utente e sono medi e indicativi: possono contenere errori o cambiare. Per i prodotti confezionati vale l\'etichetta. Il riconoscimento automatico di un piano scritto a testo può sbagliare alimenti e quantità: l\'utente deve controllare ogni voce, anche se il peso è da crudo o da cotto, prima di attivare il piano.'],
    ['Salute e sicurezza', 'Prima di iniziare un allenamento o un piano alimentare consulta il tuo medico, soprattutto in caso di malattie, gravidanza, terapie, allergie o intolleranze. Interrompi subito se hai un malessere. Gli avvisi su allergie e intolleranze sono solo un aiuto e non garantiscono nulla: leggi sempre l\'etichetta.'],
    ['Minorenni', 'I minorenni usano l\'app con il consenso e sotto la supervisione di un genitore o tutore e dei professionisti che li seguono.'],
    ['Limiti di responsabilità', 'Nei limiti consentiti dalla legge, chi ha sviluppato e pubblica l\'app non risponde dei danni derivanti dall\'uso dell\'app, dei piani e dei valori che contiene, né delle scelte dell\'utente o dei suoi professionisti. Resta ferma la responsabilità che la legge non permette di escludere (ad esempio per dolo o colpa grave) e i diritti inderogabili dei consumatori.'],
    ['Dati personali', 'Peso, allenamenti e alimentazione sono dati sulla salute: restano sul tuo dispositivo, salvo quando scegli di usare un account o la sincronizzazione, e sono trattati secondo l\'informativa privacy dell\'app. Puoi cancellarli quando vuoi.']
  ];
})(window.FORMA || (window.FORMA = {}));
