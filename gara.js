/* Area Gara: powerlifting (IPF/FIPL, Classic e Equipped) e bodybuilding.
   Regole e formule: Regolamento FIPL/IPF gennaio 2026; coefficienti IPF GL (Goodlift) e DOTS ufficiali.
   Sul server va solo ciò che sta in p.gara (piano gara, tentativi, risultati, check-in che l'atleta sceglie di inviare).
   Check-in completi, foto e prove di posa restano sul telefono (p.garaPriv e archivio locale). */
(function (F) {
  'use strict';

  /* ---------- formule ufficiali ---------- */
  // GL = 100 / (A - B * e^(-C * peso)) × totale   (peso minimo: 40 kg uomini, 35 kg donne; coefficiente arrotondato a 6 decimali)
  const GLC = {
    sbd: { classic: { M: [1199.72839, 1025.18162, 0.00921], F: [610.32796, 1045.59282, 0.03048] }, equipped: { M: [1236.25115, 1449.21864, 0.01644], F: [758.63878, 949.31382, 0.02435] } },
    bench: { classic: { M: [320.98041, 281.40258, 0.01008], F: [142.40398, 442.52671, 0.04724] }, equipped: { M: [381.22073, 733.79378, 0.02398], F: [221.82209, 357.00377, 0.02937] } }
  };
  const r6 = x => Math.round(x * 1e6) / 1e6;
  F.glPoints = function (total, bw, sex, equip, ev) {
    sex = sex === 'F' ? 'F' : 'M'; if (!(total > 0) || !(bw >= (sex === 'F' ? 35 : 40))) return 0;
    const c = GLC[ev === 'bench' ? 'bench' : 'sbd'][equip === 'equipped' ? 'equipped' : 'classic'][sex];
    const den = c[0] - c[1] * Math.exp(-c[2] * bw); if (!(den > 0)) return 0;
    return r6(r6(100 / den) * total);
  };
  // DOTS = totale × 500 / (A·x⁴ + B·x³ + C·x² + D·x + E), peso limitato a 40-210 kg (uomini) e 40-150 kg (donne)
  const DT = { M: [-0.000001093, 0.0007391293, -0.1918759221, 24.0900756, -307.75076, 210], F: [-0.0000010706, 0.0005158568, -0.1126655495, 13.6175032, -57.96288, 150] };
  F.dotsPoints = function (total, bw, sex) {
    const k = DT[sex === 'F' ? 'F' : 'M']; if (!(total > 0) || !(bw > 0)) return 0;
    const x = Math.min(k[5], Math.max(40, bw)), den = k[0] * x ** 4 + k[1] * x ** 3 + k[2] * x ** 2 + k[3] * x + k[4];
    return den > 0 ? total * 500 / den : 0;
  };

  /* ---------- categorie IPF/FIPL ---------- */
  const CLS = { M: [59, 66, 74, 83, 93, 105, 120], F: [47, 52, 57, 63, 69, 76, 84] };
  F.garaClasses = function (sex, young) { const a = CLS[sex === 'F' ? 'F' : 'M'].slice(); if (young) a.unshift(sex === 'F' ? 43 : 53); return a; };
  F.garaClassOf = function (sex, bw, young) {
    const a = F.garaClasses(sex, young); if (!(bw > 0)) return null;
    for (const l of a) if (bw <= l) return { label: String(l), max: l, min: a[a.indexOf(l) - 1] || 0 };
    const m = a[a.length - 1]; return { label: m + '+', max: Infinity, min: m };
  };
  F.garaAge = function (birth, ref) {
    if (!birth) return { cats: [], young: false };
    const b = new Date(birth), d = ref ? new Date(ref) : new Date(); if (isNaN(b) || isNaN(d)) return { cats: [], young: false };
    const exact = d.getFullYear() - b.getFullYear() - ((d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) ? 1 : 0), y = d.getFullYear() - b.getFullYear(), cats = [];
    if (exact >= 14 && y <= 18) cats.push('Sub-Junior');
    if (y >= 19 && y <= 23) cats.push('Junior');
    if (y >= 19) cats.push('Open');
    if (y >= 40 && y <= 49) cats.push('Master I'); else if (y >= 50 && y <= 59) cats.push('Master II'); else if (y >= 60 && y <= 69) cats.push('Master III'); else if (y >= 70) cats.push('Master IV');
    if (exact < 14) cats.push('Under 14 (solo gare nazionali)');
    return { cats, young: cats.indexOf('Sub-Junior') >= 0 || cats.indexOf('Junior') >= 0, exact };
  };

  /* ---------- regole (Regolamento FIPL/IPF 2026) ---------- */
  F.GARA_RULES = [
    ['Alzate e giudici', ['Tre alzate: squat, panca, stacco. Tre tentativi per alzata; conta il migliore valido di ognuna.', 'Tre giudici con luci bianca (valida) e rossa (nulla). Per il totale serve almeno un tentativo valido in ogni alzata.', 'Squat: la parte alta dell’anca scende sotto la parte alta del ginocchio. Comandi: "Squat" e "Giù" (rack).', 'Panca: comandi "Via", "Press" dopo la pausa sul petto, "Giù" (rack). Gomiti sotto la linea delle spalle.', 'Stacco: comando "Giù" solo a bilanciere fermo e atleta in posizione finale, ginocchia serrate e spalle indietro.']],
    ['Tentativi e cambi di peso', ['Il peso del tentativo successivo va consegnato entro 1 minuto dalla fine del precedente.', 'Se non lo consegni: +2,5 kg sul tentativo dopo; dopo un nullo senza consegna si ricarica lo stesso peso.', 'Un cambio consentito sul primo tentativo di ogni alzata, entro i termini annunciati dallo speaker.', 'Stacco, terzo round: due cambi, se il bilanciere non è già caricato e non sei stato chiamato in pedana.', 'Secondo round (tutte le alzate) e terzo round di squat e panca non si cambiano.', 'Dopo un nullo non puoi seguire te stesso: aspetti il round successivo.', 'Hai 1 minuto per iniziare l’alzata dopo la chiamata in pedana.']],
    ['Pesa', ['La pesa apre al più presto 2 ore prima dell’inizio della categoria e dura 1 ora e mezza.', 'Se sei sopra o sotto il limite puoi ripesarti più volte entro i tempi della pesa.', 'Alla pesa dichiari i primi tentativi delle tre alzate.', 'Controllo attrezzatura: fino a 30 minuti prima dell’inizio della categoria.']],
    ['Classifica', ['A parità di totale vince l’atleta più leggero.', 'A parità di peso e di totale vince chi ha fatto il totale per primo.', 'Il migliore atleta si calcola con la formula IPF (GL Points).']],
    ['Attrezzatura Classic', ['Costume monopezzo, un solo strato (doppio strato nel cavallo max 12×24 cm); gambe lunghe ammesse, uscita gamba 3-25 cm.', 'T-shirt senza tasche/bottoni/cerniere; maniche che finiscono sotto il deltoide e non oltre il gomito.', 'Cintura: larghezza max 10 cm, spessore max 13 mm, fibbia interna max 11 cm.', 'Ginocchiere in neoprene: spessore max 7 mm, lunghezza max 30 cm, niente lacci né velcro. Le fasce per le ginocchia non sono ammesse nel Classic.', 'Fasce polsi: max 1 m di lunghezza e 8 cm di altezza.', 'Calzettoni obbligatori per lo stacco (niente calzamaglia). Scarpe da interno con suola max 5 cm.']],
    ['Categorie di peso (kg)', ['Uomini: 59, 66, 74, 83, 93, 105, 120, 120+ (solo Sub-Junior e Junior anche 53).', 'Donne: 47, 52, 57, 63, 69, 76, 84, 84+ (solo Sub-Junior e Junior anche 43).', 'Ogni categoria va dal limite precedente (escluso) al proprio limite (incluso).']],
    ['Categorie di età', ['Sub-Junior: dal 14° compleanno fino al 31 dicembre dell’anno dei 18 anni. Junior: dal 1° gennaio dell’anno dei 19 anni fino a quello dei 23.', 'Open: dal 1° gennaio dell’anno dei 19 anni. Master I 40-49, II 50-59, III 60-69, IV 70+.', 'In Italia alle gare Open possono partecipare anche Sub-Junior, Master III e Master IV. Le donne Master III non hanno categorie di peso.']]
  ];
  F.GARA_SRC = 'Fonte: Regolamento FIPL/IPF, aggiornamento 1° gennaio 2026 (powerliftingitalia-fipl.it). Il bando della tua gara e il regolamento della tua federazione prevalgono.';

  const BB_DIV = [
    ['mens_bb', 'Men’s Bodybuilding', 'Massa muscolare, simmetria e condizione al massimo livello.'],
    ['mens_212', 'Men’s 212', 'Bodybuilding con limite di peso corporeo di 212 lb.'],
    ['classic', 'Classic Physique', 'Fisico estetico ispirato alla golden era del bodybuilding.'],
    ['mens_phys', 'Men’s Physique', 'Costume a pantaloncino; sviluppo del busto e presenza sul palco.'],
    ['wbb', 'Women’s Bodybuilding', 'Sviluppo muscolare femminile al massimo livello.'],
    ['wphys', 'Women’s Physique', 'Fisico muscolare femminile, tra Figure e Women’s Bodybuilding.'],
    ['figure', 'Figure', 'Muscolarità femminile bilanciata e condizione atletica.'],
    ['bikini', 'Bikini', 'Fisico tonico ed equilibrato, giudicato su presenza e presentazione.'],
    ['wellness', 'Wellness', 'Divisione centrata sulla parte inferiore del corpo e le proporzioni.'],
    ['fitness', 'Fitness', 'Routine atletica di due minuti più presentazione del fisico.']
  ];
  const POSES = ['Frontale rilassato', 'Laterale', 'Dorsale rilassato', 'Doppio bicipite frontale', 'Doppio bicipite dorsale', 'Addominali e gambe'];
  const LIFTS = {
    sq: { n: 'Squat', re: /\bsquat\b|\bsquat gara\b/i, no: /belt|front|frontale|hack|bulgar|split|goblet|zercher|box|pistol|jump|salto|overhead|sissy|smith|multipower/i },
    bp: { n: 'Panca', re: /\bpanca\b|bench/i, no: /inclinat|declinat|manubri|dumbbell|stretta|close|sling|spoto|floor|incline|decline|dip|chest|croci|fly/i },
    dl: { n: 'Stacco', re: /\bstacco\b|deadlift/i, no: /rumeno|romanian|rdl|gambe tese|stiff|manubri|dumbbell|kettlebell|trap|hex|deficit|rack|snatch|jefferson/i }
  };
  const L3 = ['sq', 'bp', 'dl'];
  const r25 = x => Math.round(x / 2.5) * 2.5;
  const todayISO = () => F.todayISO();
  const daysTo = d => d ? Math.ceil((new Date(d + 'T00:00:00') - new Date(todayISO() + 'T00:00:00')) / 864e5) : null;
  const fmtD = d => { if (!d) return '—'; const x = d.split('-'); return x[2] + '/' + x[1] + '/' + x[0]; };
  const pickKg = v => { v = +String(v).replace(',', '.'); return v > 0 ? Math.round(v * 100) / 100 : null; };

  /* massimale stimato dagli allenamenti per alzata (formula già usata nell'app) */
  F.garaE1 = function (p) {
    const out = {};
    L3.forEach(k => {
      const L = LIFTS[k]; let best = null; const hist = [];
      (p.sessions || []).forEach(s => {
        let b = 0; (s.ex || []).forEach(e => { if (!L.re.test(e.name || '') || L.no.test(e.name || '')) return; (e.sets || []).forEach(t => { if (t.warm) return; const v = F.e1rm(t.kg, t.reps); if (v && v > b) b = v; }); });
        if (b) { hist.push({ x: s.date, y: Math.round(b * 10) / 10 }); if (!best || b > best.v) best = { v: Math.round(b * 10) / 10, d: s.date }; }
      });
      out[k] = { best, hist: hist.slice(-16) };
    });
    return out;
  };

  F.GARA_SAMPLE = ['ATLETA ESEMPIO', 'POWERLIFTING COMPETITION BLOCK', 'Gara: Campionato di esempio ' + (function () { const d = new Date(Date.now() + 42 * 864e5); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); })(), 'Federazione: FIPL', 'Categoria: 83', 'Attrezzatura: Classic', '',
    'GIORNO 1: SQUAT + PANCA GARA', '1. Low Bar Squat', '   * W1: 1x6 @ RPE 7 + 4x6 (-10%)', '   * W2: 1x6 @ RPE 8 + 4x6 (-10%)', '   * W3: 1x4 @ RPE 7.5 + 3x4 (-8%)', '   * W4: 1x3 @ RPE 8 + 3x3 (-6%)', '   * W5: 1x2 @ RPE 8.5-9 + 2x2 (-5%)',
    '2. Panca Gara', '   * W1: 1x6 @ RPE 7 + 4x6 (-10%)', '   * W3: 1x4 @ RPE 7.5 + 3x4 (-8%)', '3. Belt Squat', '   * W1-W2: 3x12 @ RPE 8', '   * W3: 3x10 @ RPE 8', '4. Face Pull', '   * W1-W5: 3x15-20 RIR 2', '',
    'GIORNO 2: STACCO + PANCA VOLUME', '1. Stacco Gara', '   * W1: 1x5 @ RPE 7 + 3x5 (-10%)', '   * W3: 1x3 @ RPE 8 + 3x3 (-8%)', '   * W5: 1x2 @ RPE 8.5 + 2x2 (-5%)', '2. Panca Gara', '   * W1: MAV 5 (@ RPE 7.5) + 3x6 (-10%)', '   * W3: MAV 4 (@ RPE 8) + 3x5 (-8%)'].join('\n');

  /* ---------- motivazione: record e costanza dalle sedute registrate ---------- */
  F.garaPRs = function (p) {
    const ses = (p.sessions || []).slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0), best = {}, out = [];
    ses.forEach(s => {
      const day = {};
      (s.ex || []).forEach(e => {
        const key = String(e.name || '').toLowerCase().trim(); if (!key) return;
        (e.sets || []).forEach(t => {
          if (t.warm) return; let v = null, unit = '';
          if (t.kg > 0 && t.reps > 0) { v = F.e1rm(t.kg, t.reps); unit = 'kg stimati'; } else if (t.reps > 0 && !(t.kg > 0)) { v = t.reps; unit = 'rip'; }
          if (!v) return; const k = key + '|' + unit; if (!day[k] || v > day[k].v) day[k] = { v, name: e.name, unit };
        });
      });
      Object.keys(day).forEach(k => { const d = day[k]; if (best[k] != null && d.v > best[k] + (d.unit === 'rip' ? 0 : 0.5)) out.push({ date: s.date, name: d.name, val: Math.round(d.v * 10) / 10, unit: d.unit }); if (best[k] == null || d.v > best[k]) best[k] = d.v; });
    });
    return out;
  };
  F.garaStreak = function (p) {
    const mon = d => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
    const wk = {}; (p.sessions || []).forEach(s => { const k = mon(s.date); wk[k] = (wk[k] || 0) + 1; });
    let cur = mon(F.todayISO()), n = 0; const thisWeek = wk[cur] || 0;
    if (!thisWeek) { const x = new Date(cur + 'T00:00:00'); x.setDate(x.getDate() - 7); cur = mon(x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0')); }
    while (wk[cur]) { n++; const x = new Date(cur + 'T00:00:00'); x.setDate(x.getDate() - 7); cur = mon(x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0')); }
    return { weeks: n, thisWeek };
  };
  /* regole FIF Calisthenics Challenge 2026 (fif.it) */
  F.CAL_RULES = [
    ['Formato', ['Eliminatorie: un set di 50 secondi, senza limite di elementi. Passano i primi 4 in classifica.', 'Finale: i 4 finalisti eseguono 2 set a testa da 50 secondi, alternandosi.', 'Uomini: categorie Advanced (oltre 13 punti dichiarati) e Intermediate (fino a 13 punti dichiarati). Donne: una categoria. Nessuna categoria per età o peso.']],
    ['Tenute e tempi', ['1 secondo di riconoscimento della posizione statica, poi da 1 a 3 movimenti dinamici.', 'Ogni skill isometrica va tenuta 2 secondi, contati dal blocco della posizione.', 'Il bonus di tenuta richiede 5 secondi.']],
    ['Ripetizioni', ['Skill isometrica ripetuta sullo stesso attrezzo: la seconda vale la metà, la terza è nulla. Stessa skill su un altro attrezzo: valore pieno.', 'Push, pull, chin, presse e movimenti di forza: massimo 3 ripetizioni ciascuno; solo l’ultima termina con la tenuta di 2 secondi.', 'Dinamiche non fluide o controllate: non valide. One arm: pieno punteggio con entrambe le mani.']],
    ['Penalità', ['Skill non eseguita: nessuna penalità, ma il valore finale è inferiore.', 'Penalità per skill: leggera 0,1-0,3; media 0,3-0,5; alta da 0,5 fino all’annullamento.', 'Presse e pulls incompleti (braccia flesse, tenuta sotto i 2 secondi): da 0,1 a 0,5, fino all’annullamento.']],
    ['Bonus', ['Varietà di attrezzo +3,0: almeno una skill su parallele, anelli, sbarra e suolo.', 'Completezza +3,0: almeno una skill in ciascuna macro-categoria (verticalismo, spinta, tirata, forza).', 'Freestyle da 0 a 5 punti, a discrezione della giuria.', 'Collegamento senza pause sullo stesso attrezzo: +0,3 per elemento, minimo 3 elementi. Variazioni di presa: +0,1 ciascuna fino a +0,5. Tenuta di 5 secondi: +0,3.']]
  ];
  F.CAL_SRC = 'Fonte: Regolamento FIF Calisthenics Challenge 2026 (fif.it). Altre federazioni (per esempio WSWCF) hanno formati diversi: segui il regolamento della tua gara.';
  const CAL_LADD = { 'Front lever': ['Tuck', 'Advanced tuck', 'Una gamba', 'Straddle', 'Completo'], 'Planche': ['Tuck', 'Advanced tuck', 'Straddle', 'Completa'], 'Verticale': ['Al muro, pancia al muro', 'Al muro, schiena al muro', 'Libera 5 s', 'Libera 30 s'], 'Muscle-up': ['Negativa', 'Con elastico', 'Alla sbarra', 'Agli anelli'] };


  /* cruscotto del coach: tutti gli atleti con un'Area Gara */
  const offGet = () => { try { return JSON.parse(localStorage.getItem('forgia.garaOff') || '{}'); } catch (e) { return {}; } };
  F.garaOff = (p, uid) => { const o = offGet(); return !!(p && p.gara && o[uid] != null && o[uid] === (p.gara.opened || 0)); };
  F.garaOffSet = (p, uid) => { const o = offGet(); o[uid] = (p.gara && p.gara.opened) || 0; try { localStorage.setItem('forgia.garaOff', JSON.stringify(o)); } catch (e) { } };
  F.garaBoard = function (list, uidOf) {
    const rows = (list || []).filter(p => p.gara && !F.garaOff(p, uidOf(p))).map(p => {
      const g = p.gara, m = g.meet || {}, pl = (p.plans || []).find(x => x.id === p.activePlan), st = F.clientStats ? F.clientStats(p) : { adherence: 0, daysSince: null, alerts: [] };
      return { p, g, dd: daysTo(m.date), wk: pl && pl.block ? F.blockWeek(pl) : null, wks: pl && pl.block ? pl.block.weeks : null, st, name: m.name || 'Gara' };
    }).sort((a, b) => (a.dd == null ? 9999 : a.dd < 0 ? 5000 - a.dd : a.dd) - (b.dd == null ? 9999 : b.dd < 0 ? 5000 - b.dd : b.dd));
    if (!rows.length) return '';
    const lab = { powerlifting: 'Powerlifting', bodybuilding: 'Bodybuilding', calisthenics: 'Calisthenics' };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    return `<div class="card" style="border-color:var(--accent)"><h2>Atleti di gara</h2><p class="mute small" style="margin-top:0">Ordinati dalla gara più vicina.</p>${rows.map(r => `<div class="row" style="gap:8px;border-top:1px solid var(--line);padding:8px 0;align-items:center"><div class="grow"><b>${esc(r.p.name)}</b> <span class="chip">${lab[r.g.kind] || 'Gara'}</span>${r.g.seen ? '' : ' <span class="chip warn">non ancora aperta</span>'}<div class="small mute">${esc(r.name)} · ${r.dd == null ? 'data da impostare' : r.dd > 0 ? 'tra ' + r.dd + ' giorni' : r.dd === 0 ? 'oggi' : 'passata'}${r.wk ? ' · settimana ' + r.wk + '/' + r.wks : ''}</div><div class="small">Aderenza <b>${r.st.adherence}%</b>${r.st.daysSince != null ? ' · ultima seduta ' + (r.st.daysSince === 0 ? 'oggi' : r.st.daysSince + ' g fa') : ''}${r.st.alerts && r.st.alerts.length ? ' · <span class="chip danger">dolori ' + r.st.alerts.length + '</span>' : ''}</div></div><button class="sm primary" data-act="clientOpen" data-id="${esc(uidOf(r.p))}">Apri</button><button class="sm ghost" data-act="garaCoachOff" data-id="${esc(uidOf(r.p))}" aria-label="Rimuovi ${esc(r.p.name)} dall’elenco gara">Rimuovi</button></div>`).join('')}</div>`;
  };

  /* ---------- montaggio nell'app ---------- */
  F.mountGara = function (c) {
    const esc = c.esc, P = c.P, ui = c.ui, G = {};
    const AC = F.Account;
    G.gate = (p, plan) => !!(p && plan && plan.comp && p.gara && (F.GARA_LIVE || (AC && AC.isAdmin && AC.isAdmin()) || (AC && AC.me && (F.GARA_PREVIEW || []).indexOf(AC.me.username) >= 0) || p.garaPreview));
    G.ensure = function (p, plan) {
      if (!p || !plan || !plan.comp) return;
      if (!p.gara) p.gara = { kind: plan.comp, opened: Date.now(), seen: false, meet: Object.assign({}, plan.compInfo || {}), att: {}, res: {}, shared: [], history: [] };
      const g = p.gara; g.kind = g.kind || plan.comp; g.meet = g.meet || {}; g.att = g.att || {}; g.res = g.res || {}; g.shared = g.shared || []; g.history = g.history || [];
      if (plan.compInfo) { const m = plan.compInfo; ['name', 'date', 'fed', 'cls', 'equip', 'place'].forEach(k => { if (m[k] && !g.meet[k] && !g.meet['_u' + k]) g.meet[k] = m[k]; }); }
      g.cal = g.cal || { skills: [], bonus: {}, prog: [] };
      if (plan.compInfo) g.coachMsg = plan.compInfo.msg || '';
      p.garaPriv = p.garaPriv || { checkins: [], peak: {}, posing: [] };
    };
    const priv = p => (p.garaPriv = p.garaPriv || { checkins: [], peak: {}, posing: [] });
    const kind = g => g.kind === 'bodybuilding' ? 'bb' : g.kind === 'calisthenics' ? 'cal' : 'pl';
    const KL = { pl: 'Powerlifting', bb: 'Bodybuilding', cal: 'Calisthenics' };
    G.tab = ICON => ['gara', 'Gara', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v4a6 6 0 0 1-12 0V3zM6 5H3v1a3 3 0 0 0 3 3M18 5h3v1a3 3 0 0 1-3 3M12 13v5M8 21h8M10 18h4"/></svg>'];
    G.unseen = (p) => !!(p && p.gara && !p.gara.seen);

    /* notifica da leggere nella Home dell'atleta */
    G.notice = function (p, plan) {
      if (!G.gate(p, plan) || p.gara.seen) return '';
      const k = kind(p.gara);
      return `<div class="card" style="border-color:var(--accent);background:linear-gradient(135deg,#1a0d0f,#0a0e14)"><div class="mute small">Nuovo dal tuo allenatore</div><h2 style="margin:.1em 0">Si è aperta la tua Area Gara</h2>
        <p style="margin:.2em 0 .6em">Il tuo coach ti ha inviato una scheda di ${k === 'bb' ? 'preparazione bodybuilding' : k === 'cal' ? 'calisthenics' : 'powerlifting'}: ho aperto una sezione tutta tua con ${k === 'bb' ? 'check-in, foto, picco e conto alla rovescia' : k === 'cal' ? 'set di gara, punteggio stimato, skill, timer da 50 secondi e analisi' : 'tentativi, punteggio IPF GL, categoria di peso, giorno di gara e analisi'}. Puoi usarla subito.</p>
        <div class="row wrap"><button class="primary sm" data-act="garaOpen">Apri l’Area Gara</button><button class="sm ghost" data-act="garaSeen">Ho letto</button></div></div>`;
    };
    G.homeCard = function (p, plan) {
      if (!G.gate(p, plan) || !p.gara.seen || p.gara.hide) return '';
      const g = p.gara, m = g.meet || {}, d = daysTo(m.date), bw = plan.block ? F.blockWeek(plan) : 0;
      return `<div class="card" style="border-color:var(--accent)"><div class="row" style="align-items:center"><div class="grow"><div class="mute small">Area Gara · ${KL[kind(g)]}</div><b>${esc(m.name || 'Gara')}</b>
        <div class="small mute">${d == null ? 'Imposta la data della gara' : d > 0 ? 'mancano ' + d + ' giorni' : d === 0 ? 'è oggi!' : 'gara passata'}${bw ? ' · settimana ' + bw + ' di ' + plan.block.weeks : ''}</div></div><button class="sm primary" data-act="garaOpen">Apri</button></div>${g.coachMsg ? `<div class="msg tip" style="margin-top:8px"><b>Dal coach:</b> ${esc(g.coachMsg)}</div>` : ''}${(() => { const pr = F.garaPRs(p).filter(x => (Date.now() - new Date(x.date)) < 4 * 864e5).slice(-1)[0]; return pr ? `<div class="msg ok" style="margin-top:8px">Nuovo record: <b>${esc(pr.name)}</b> ${pr.val} ${pr.unit}</div>` : ''; })()}</div>`;
    };

    /* ---------- vista ---------- */
    const tabsFor = k => k === 'cal' ? [['home', 'Prima'], ['giorno', 'Durante'], ['dopo', 'Dopo'], ['regole', 'Regole']] : k === 'bb' ? [['home', 'Panoramica'], ['checkin', 'Check-in'], ['foto', 'Foto'], ['picco', 'Picco'], ['regole', 'Categorie']] : [['home', 'Prima'], ['giorno', 'Durante'], ['dopo', 'Dopo'], ['regole', 'Regole']];
    G.view = function () {
      const p = P(), plan = c.planOf(p);
      if (!G.gate(p, plan)) return `<h1>Area Gara</h1><div class="card"><p class="mute">Questa sezione si apre quando il tuo allenatore ti invia una scheda di gara.</p></div>`;
      G.ensure(p, plan); const g = p.gara, k = kind(g); if (!g.seen) { g.seen = true; c.save(); }
      const t = ui.gtab && tabsFor(k).some(x => x[0] === ui.gtab) ? ui.gtab : 'home';
      const nav = `<div class="row wrap" role="tablist" aria-label="Area Gara" style="margin:4px 0 10px">${tabsFor(k).map(([a, l]) => `<button class="sm ${a === t ? 'primary' : ''}" role="tab" aria-selected="${a === t}" data-act="garaTab" data-t="${a}">${l}</button>`).join('')}</div>`;
      const body = k === 'bb' ? bbView(p, plan, g, t) : k === 'cal' ? calView(p, plan, g, t) : plView(p, plan, g, t);
      return `<h1 style="margin-bottom:2px">Area Gara</h1><div class="mute small" style="margin-bottom:6px">${KL[k]} · ${esc((g.meet || {}).fed || 'federazione da indicare')}</div>${nav}${body}`;
    };
    const fld = (label, path, val, type, extra) => `<label class="small" for="g_${path}" style="margin-top:8px;display:block">${label}</label><input id="g_${path}" data-gp="${path}" data-gt="${type || 'text'}" type="${type === 'num' ? 'text" inputmode="decimal' : type || 'text'}" value="${esc(val == null ? '' : val)}" ${extra || ''}>`;
    const kpi = (v, l) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`;

    /* ----- Powerlifting ----- */
    function plData(p, g) {
      const m = g.meet || {}, sex = p.sex === 'F' ? 'F' : 'M', equip = m.equip === 'equipped' ? 'equipped' : 'classic';
      const age = F.garaAge(p.birth, m.date || null), lw = (p.weights || []).slice(-1)[0];
      const bw = pickKg((g.weighIn || {}).kg) || (lw && lw.kg) || +p.weight || 0;
      const cl = F.garaClassOf(sex, bw, age.young), tgt = m.cls ? String(m.cls) : (cl && cl.label);
      let mx = Infinity; if (tgt) { const n = parseFloat(String(tgt).replace('+', '')); mx = String(tgt).indexOf('+') >= 0 ? Infinity : n; }
      return { m, sex, equip, age, bw, cl, tgt, mx };
    }
    function total(g) {
      const out = { best: {}, tot: 0, ok: true };
      L3.forEach(k => { let b = 0; ((g.att || {})[k] || []).forEach((kg, i) => { if (kg > 0 && ((g.res || {})[k] || [])[i] === true && kg > b) b = kg; }); out.best[k] = b; if (!b) out.ok = false; out.tot += b; });
      return out;
    }
    function planTot(g) { let t = 0; L3.forEach(k => { const a = ((g.att || {})[k] || []).filter(x => x > 0); t += a.length ? a[a.length - 1] : 0; }); return t; }
    function plView(p, plan, g, t) {
      const d = plData(p, g), E = F.garaE1(p), dd = daysTo(d.m.date);
      if (t === 'regole') return rulesView();
      if (t === 'giorno') return dayView(p, plan, g, d);
      if (t === 'dopo') return afterView(p, plan, g, d, E);
      const wk = plan.block ? F.blockWeek(plan) : 0, ph = dd == null ? '—' : dd < 0 ? 'Post gara' : dd === 0 ? 'Giorno di gara' : dd <= 7 ? 'Settimana di gara' : dd <= 28 ? 'Peaking' : dd <= 56 ? 'Intensificazione' : 'Preparazione';
      const pt = planTot(g), gl = F.glPoints(pt, d.bw, d.sex, d.equip), dots = F.dotsPoints(pt, d.bw, d.sex);
      const left = d.mx < Infinity && d.bw ? Math.round((d.mx - d.bw) * 10) / 10 : null;
      const pains = Object.entries(p.pain || {}).filter(([, v]) => v >= 4).sort((a, b) => b[1] - a[1]).slice(0, 3);
      return `<div class="card hero"><div class="mute small">${esc(d.m.name || 'La tua gara')}${d.m.place ? ' · ' + esc(d.m.place) : ''}</div>
        <div style="font:italic 700 3rem/1 var(--display)">${dd == null ? '—' : dd > 0 ? dd : dd === 0 ? 'OGGI' : 'finita'}</div><div class="mute">${dd != null && dd > 0 ? 'giorni alla gara · ' + fmtD(d.m.date) : dd == null ? 'imposta la data qui sotto' : ''}</div>
        <div class="grid3 k4" style="margin-top:10px">${kpi('<span style="font-size:.62em">' + ph + '</span>', 'fase')}${kpi(wk ? wk + '/' + plan.block.weeks : '—', 'settimana blocco')}${kpi(d.tgt ? d.tgt + ' kg' : '—', 'categoria')}${kpi(d.bw ? d.bw + ' kg' : '—', 'peso')}</div>
        ${plan.block ? `<div class="row wrap" style="margin-top:10px;align-items:center"><span class="small mute">Settimana del blocco</span><button class="sm" data-act="garaWeek" data-d="-1" aria-label="Settimana precedente">‹</button><b>${wk}</b><button class="sm" data-act="garaWeek" data-d="1" aria-label="Settimana successiva">›</button>${plan.block.manual ? '<button class="sm ghost" data-act="garaWeek" data-d="0">Automatica</button>' : ''}</div>` : ''}
        ${left != null ? `<div class="msg ${left < 0 ? 'danger' : left < 1 ? 'warn' : 'ok'}" style="margin-top:10px">${left < 0 ? 'Sei ' + Math.abs(left) + ' kg sopra il limite della categoria ' + esc(d.tgt) + '.' : 'Margine sul limite ' + esc(d.tgt) + ' kg: ' + left + ' kg.'} ${d.cl && d.cl.label !== d.tgt ? '<br>Con il peso attuale rientreresti nella ' + esc(d.cl.label) + '.' : ''}</div>` : ''}</div>
        ${motCard(p, plan, g)}
        ${blockCard(plan)}
        <div class="card"><h2>Dati gara</h2><p class="mute small">Quello che il coach ha scritto nella scheda è già compilato: correggilo se serve.</p>
          ${fld('Nome gara', 'meet.name', d.m.name)}${fld('Data gara', 'meet.date', d.m.date, 'date')}${fld('Orario inizio della tua categoria (se lo sai)', 'meet.time', d.m.time, 'time')}${fld('Luogo', 'meet.place', d.m.place)}${fld('Federazione', 'meet.fed', d.m.fed)}
          <label class="small" for="g_meet.equip" style="margin-top:8px;display:block">Attrezzatura</label><select id="g_meet.equip" data-gp="meet.equip"><option value="classic" ${d.equip === 'classic' ? 'selected' : ''}>Classic (senza supporti)</option><option value="equipped" ${d.equip === 'equipped' ? 'selected' : ''}>Equipped</option></select>
          <label class="small" for="g_meet.cls" style="margin-top:8px;display:block">Categoria di peso</label><select id="g_meet.cls" data-gp="meet.cls"><option value="">Automatica (${d.cl ? esc(d.cl.label) : 'dal peso'})</option>${F.garaClasses(d.sex, d.age.young).map(x => `<option value="${x}" ${String(d.m.cls) === String(x) ? 'selected' : ''}>${x} kg</option>`).join('')}<option value="${F.garaClasses(d.sex, d.age.young).slice(-1)[0]}+" ${String(d.m.cls).indexOf('+') >= 0 ? 'selected' : ''}>${F.garaClasses(d.sex, d.age.young).slice(-1)[0]}+ kg</option></select>
          ${d.age.cats.length ? `<p class="small mute" style="margin-top:8px">Categoria di età (dal tuo anno di nascita): <b>${esc(d.age.cats.join(' · '))}</b></p>` : ''}
          ${d.sex === 'F' && d.age.cats.indexOf('Master III') >= 0 ? '<div class="msg warn">Le donne Master III non hanno categorie di peso.</div>' : ''}
          ${d.equip === 'equipped' ? '<div class="msg tip">Le misure dell’attrezzatura nella sezione Regole valgono per il Classic: per l’Equipped segui il regolamento della tua federazione.</div>' : ''}</div>
        <div class="card"><h2>Massimali stimati dagli allenamenti</h2><p class="mute small">Dalle serie registrate nell’app (non sono massimali in gara).</p>
          <div class="grid3">${L3.map(k => kpi(E[k].best ? Math.round(E[k].best.v) : '—', LIFTS[k].n + (E[k].best ? ' · ' + fmtD(E[k].best.d).slice(0, 5) : ''))).join('')}</div>
          <p class="small" style="margin:8px 0 0">Somma stimata: <b>${L3.every(k => E[k].best) ? Math.round(L3.reduce((a, k) => a + E[k].best.v, 0)) + ' kg' : 'servono serie di tutte e tre le alzate'}</b></p>
          ${L3.map(k => E[k].hist.length > 1 ? `<div class="small mute" style="margin-top:8px">${LIFTS[k].n}: andamento</div>${c.lineChart(E[k].hist, 'kg')}` : '').join('')}</div>
        <div class="card"><h2>Piano dei tentativi</h2><p class="mute small">Scrivi i tuoi pesi, oppure usa la proposta: aperture al 92%, secondi al 97% e terzi al 100% del terzo tentativo che vuoi provare (arrotondati a 2,5 kg). È una convenzione di allenamento, non una regola: decidete tu e il coach.</p>
          ${L3.map(k => attemptRow(g, k, E)).join('')}
          <div class="grid3 k4" style="margin-top:12px">${kpi(pt || '—', 'totale previsto')}${kpi(gl ? gl.toFixed(2) : '—', 'IPF GL')}${kpi(dots ? dots.toFixed(1) : '—', 'DOTS')}${kpi(d.bw ? d.bw : '—', 'peso usato')}</div>
          <p class="small mute">GL = punteggio ufficiale IPF per il migliore atleta (${d.equip === 'equipped' ? 'Equipped' : 'Classic'}, powerlifting). Calcolato con il tuo peso ${(g.weighIn || {}).kg ? 'di pesa' : 'più recente'}.</p></div>
        ${pains.length ? `<div class="msg warn"><b>Dolori da tenere d’occhio:</b> ${pains.map(([z, v]) => esc(z) + ' ' + v + '/10').join(' · ')}. Parlane con il coach prima di spingere sui carichi.</div>` : ''}
        <div class="card"><h2>Peso e pesa</h2>${fld('Peso di oggi (kg)', 'weighIn.kg', (g.weighIn || {}).kg, 'num')}<p class="small mute">Qui scrivi il peso per il calcolo categoria e punteggio. Questa sezione non dà indicazioni su come perdere peso: segui il tuo coach.</p></div>
        <div class="row wrap" style="gap:8px">${g.hide ? '' : '<button class="sm ghost" data-act="garaHide">Nascondi dalla Home</button>'}<button class="sm ghost" style="color:var(--danger)" data-act="garaLeave">Esci dalla gara ed elimina i dati gara</button></div>`;
    }
    function attemptRow(g, k, E) {
      const a = (g.att || {})[k] || [], tgt = E[k].best ? Math.floor(E[k].best.v / 2.5) * 2.5 : null;
      return `<div style="margin-top:10px"><b>${LIFTS[k].n}</b>${tgt ? ` <span class="small mute">stima ${Math.round(E[k].best.v)} kg</span>` : ''}
        <div class="grid3" style="margin-top:4px">${[0, 1, 2].map(i => `<div><label class="small" for="g_att.${k}.${i}">${i + 1}° tent.</label><input id="g_att.${k}.${i}" data-gp="att.${k}.${i}" data-gt="num" type="text" inputmode="decimal" value="${a[i] || ''}" aria-label="${LIFTS[k].n} tentativo ${i + 1} (kg)"></div>`).join('')}</div>
        <div class="row wrap" style="margin-top:4px"><button class="sm" data-act="garaSug" data-l="${k}" data-v="${a[2] || ''}">Proponi dal 3° tentativo</button>${tgt ? `<button class="sm" data-act="garaSug" data-l="${k}" data-v="${tgt}">Parti dalla stima</button>` : ''}</div></div>`;
    }
    function dayView(p, plan, g, d) {
      const m = d.m, tm = m.time, tt = total(g), dd = daysTo(m.date), gl = tt.ok ? F.glPoints(tt.tot, d.bw, d.sex, d.equip) : 0;
      const hhmm = off => { if (!tm) return null; const [h, mi] = tm.split(':').map(Number), x = h * 60 + mi + off; return String(Math.floor(((x % 1440) + 1440) % 1440 / 60)).padStart(2, '0') + ':' + String((x % 60 + 60) % 60).padStart(2, '0'); };
      const items = [['Pesa (apre al più presto)', hhmm(-120), 'dura 1 h 30; dichiari le aperture'], ['Controllo attrezzatura (entro)', hhmm(-30), 'fino a 30 minuti prima della categoria'], ['Inizio della tua categoria', tm, '']].filter(x => x[1]);
      let nextTxt = ''; outer: for (let i = 0; i < 3; i++) for (const k of L3) { const kg = ((g.att || {})[k] || [])[i], r = ((g.res || {})[k] || [])[i]; if (kg > 0 && r == null) { nextTxt = `${LIFTS[k].n}, ${i + 1}° tentativo: <b>${kg} kg</b>`; break outer; } }
      return `<div class="card hero"><div class="mute small">${dd === 0 ? 'Oggi si gareggia' : dd > 0 ? 'Gara tra ' + dd + ' giorni' : 'Giorno di gara'}</div><h2 style="margin:.1em 0">${nextTxt ? 'Prossimo: ' + nextTxt : 'Segna qui ogni tentativo'}</h2>
        <p class="small mute" style="margin:2px 0">Consegna il peso del tentativo successivo entro <b>1 minuto</b> dalla fine del precedente, altrimenti +2,5 kg. Dopo un nullo aspetti il round successivo.</p></div>
        ${items.length ? `<div class="card"><h2>Orari</h2>${items.map(x => `<div class="row small" style="padding:4px 0;border-top:1px solid var(--line)"><b style="min-width:54px">${x[1]}</b><span class="grow">${x[0]}<span class="mute"> ${x[2]}</span></span></div>`).join('')}<p class="small mute">Dal regolamento. L’orario esatto lo decide l’organizzatore: controlla il bando.</p></div>` : `<div class="msg tip">Inserisci l’orario d’inizio della tua categoria nella scheda "Prima" per vedere gli orari di pesa e controllo.</div>`}
        ${L3.map(k => `<div class="card"><h2>${LIFTS[k].n}</h2>${[0, 1, 2].map(i => { const kg = ((g.att || {})[k] || [])[i], r = ((g.res || {})[k] || [])[i]; return `<div class="row" style="align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--line)"><div style="min-width:70px"><div class="small mute">${i + 1}° tent.</div><b style="font-size:1.2rem">${kg ? kg + ' kg' : '—'}</b></div><div class="row grow wrap" style="justify-content:flex-end"><button class="sm ${r === true ? 'primary' : ''}" data-act="garaRes" data-l="${k}" data-i="${i}" data-v="1" aria-pressed="${r === true}" ${kg ? '' : 'disabled'}>Valida</button><button class="sm ${r === false ? 'danger' : ''}" data-act="garaRes" data-l="${k}" data-i="${i}" data-v="0" aria-pressed="${r === false}" ${kg ? '' : 'disabled'}>Nulla</button></div></div>`; }).join('')}
          <div class="small mute" style="margin-top:6px">Migliore valido: <b>${tt.best[k] ? tt.best[k] + ' kg' : '—'}</b></div></div>`).join('')}
        <div class="card"><h2>Totale in diretta</h2><div class="grid3 k4">${kpi(tt.ok ? tt.tot : '—', 'totale')}${kpi(gl ? gl.toFixed(2) : '—', 'IPF GL')}${kpi(tt.ok ? F.dotsPoints(tt.tot, d.bw, d.sex).toFixed(1) : '—', 'DOTS')}${kpi(d.tgt || '—', 'categoria')}</div>
          <p class="small mute">${tt.ok ? 'Totale valido.' : 'Il totale è valido solo con almeno un tentativo valido in tutte e tre le alzate.'}</p>
          <p class="small" style="margin-top:8px"><b>Da portare:</b> costume monopezzo, t-shirt, cintura (max 10 cm / 13 mm), ginocchiere (max 7 mm / 30 cm), fasce polsi (max 1 m / 8 cm), calzettoni per lo stacco, scarpe da interno, documento e tessera federale (verifica nel bando).</p></div>`;
    }
    function afterView(p, plan, g, d, E) {
      const tt = total(g), gl = tt.ok ? F.glPoints(tt.tot, d.bw, d.sex, d.equip) : 0, dots = tt.ok ? F.dotsPoints(tt.tot, d.bw, d.sex) : 0;
      const made = L3.reduce((a, k) => a + ((g.res || {})[k] || []).filter(x => x === true).length, 0), miss = L3.reduce((a, k) => a + ((g.res || {})[k] || []).filter(x => x === false).length, 0);
      const hist = g.history || [];
      return `<div class="card hero"><div class="mute small">Risultato</div><div style="font:italic 700 2.6rem/1 var(--display)">${tt.ok ? tt.tot + ' kg' : '—'}</div>
        <div class="grid3 k4" style="margin-top:10px">${kpi(gl ? gl.toFixed(2) : '—', 'IPF GL')}${kpi(dots ? dots.toFixed(1) : '—', 'DOTS')}${kpi(made + '/' + (made + miss || 9), 'alzate valide')}${kpi(made + miss ? Math.round(100 * made / (made + miss)) + '%' : '—', 'efficienza')}</div></div>
        <div class="card"><h2>Analisi tentativi</h2>${L3.map(k => { const a = (g.att || {})[k] || [], r = (g.res || {})[k] || [], e = E[k].best; const best = tt.best[k]; return `<div style="padding:6px 0;border-top:1px solid var(--line)"><b>${LIFTS[k].n}</b>: ${a.map((kg, i) => kg ? `<span class="chip ${r[i] === true ? '' : r[i] === false ? 'danger' : 'warn'}">${kg}${r[i] === true ? ' ✓' : r[i] === false ? ' ✗' : ''}</span>` : '').join(' ') || '—'}<div class="small mute">${best && e ? 'Migliore ' + best + ' kg · ' + (Math.round(100 * best / e.v)) + '% della stima da allenamento (' + Math.round(e.v) + ' kg)' : ''}</div></div>`; }).join('')}
          ${made + miss ? `<div class="msg tip">${miss ? 'Hai avuto ' + miss + ' nulli: guardate con il coach il motivo di ognuno (tecnica, giudici, peso scelto) prima del prossimo blocco.' : 'Nessun nullo: valutate se le aperture erano abbastanza coraggiose.'}</div>` : '<div class="msg tip">Segna i tentativi nella scheda "Durante" per vedere l’analisi.</div>'}</div>
        <div class="card"><h2>Storico gare</h2>${hist.length ? hist.slice().reverse().map(h => `<div class="row small" style="padding:5px 0;border-top:1px solid var(--line)"><span class="grow"><b>${esc(h.name || 'Gara')}</b> · ${fmtD(h.date)}<br><span class="mute">${h.bw} kg · cat. ${esc(h.cls || '—')} · ${esc(h.equip || '')}</span></span><span style="text-align:right"><b>${h.total} kg</b><br><span class="mute">GL ${h.gl ? h.gl.toFixed(2) : '—'}</span></span></div>`).join('') : '<p class="mute small">Nessuna gara archiviata.</p>'}
          <button class="sm" style="margin-top:8px" data-act="garaArchive" ${tt.ok ? '' : 'disabled'}>Archivia questa gara e prepara la prossima</button></div>
        <div class="card"><h2>Invia al coach</h2><p class="small mute">Il coach vede già piano tentativi e risultati. Qui scegli tu cosa mandargli in più.</p><button class="sm" data-act="garaShare" data-w="result" ${tt.ok ? '' : 'disabled'}>Invia il risultato finale</button></div>`;
    }
    function rulesView() {
      return `<div class="msg tip">${esc(F.GARA_SRC)}</div>` + F.GARA_RULES.map(([t, l]) => `<details class="card"><summary><b>${t}</b></summary><ul style="margin:8px 0 0;padding-left:18px">${l.map(x => `<li class="small" style="margin:4px 0">${esc(x)}</li>`).join('')}</ul></details>`).join('') +
        `<details class="card"><summary><b>Come si calcolano i punteggi</b></summary><p class="small">IPF GL = totale × 100 ÷ (A − B·e<sup>−C·peso</sup>). I coefficienti A, B, C cambiano per sesso e per tipo di gara (Classic o Equipped, powerlifting o solo panca). Il DOTS usa un polinomio di quarto grado sul peso. Tutti e due servono a confrontare atleti di peso diverso.</p></details>`;
    }

    /* ----- Bodybuilding ----- */
    function bbView(p, plan, g, t) {
      const pr = priv(p), m = g.meet || {}, dd = daysTo(m.date), wk = dd == null ? null : Math.ceil(dd / 7);
      if (t === 'regole') return `<div class="card"><h2>Categorie IFBB</h2><p class="mute small">Descrizioni generali. I limiti di peso o altezza e i requisiti cambiano per federazione e per anno: segui il bando della tua gara.</p>${BB_DIV.map(x => `<div style="padding:6px 0;border-top:1px solid var(--line)"><b>${x[1]}</b><div class="small mute">${x[2]}</div></div>`).join('')}</div>`;
      if (t === 'checkin') return checkinView(p, g, pr);
      if (t === 'foto') return photoView(p, g, pr);
      if (t === 'picco') return peakView(p, g, pr, dd);
      const last = pr.checkins.slice(-1)[0], first = pr.checkins[0];
      const ph = g.phase || 'definizione';
      return `<div class="card hero"><div class="mute small">${esc(m.name || 'La tua gara')}${m.place ? ' · ' + esc(m.place) : ''}</div>
        <div style="font:italic 700 3rem/1 var(--display)">${dd == null ? '—' : dd > 0 ? dd : dd === 0 ? 'OGGI' : 'finita'}</div><div class="mute">${dd != null && dd > 0 ? 'giorni alla gara · ' + wk + ' settimane · ' + fmtD(m.date) : 'imposta la data qui sotto'}</div>
        <div class="grid3" style="margin-top:10px">${kpi((BB_DIV.find(x => x[0] === g.div) || [0, '—'])[1], 'categoria')}${kpi(({ massa: 'Massa', definizione: 'Definizione', picco: 'Picco', post: 'Post gara' })[ph], 'fase')}${kpi(last && last.w ? last.w + ' kg' : '—', 'ultimo peso')}</div>
        ${last && first && last.w && first.w ? `<p class="small mute" style="margin:8px 0 0">Da ${fmtD(first.date)}: ${(last.w - first.w) > 0 ? '+' : ''}${Math.round((last.w - first.w) * 10) / 10} kg${last.waist && first.waist ? ' · vita ' + ((last.waist - first.waist) > 0 ? '+' : '') + Math.round((last.waist - first.waist) * 10) / 10 + ' cm' : ''}</p>` : ''}</div>
        ${motCard(p, plan, g)}
        <div class="card"><h2>Dati gara</h2>${fld('Nome gara', 'meet.name', m.name)}${fld('Data gara', 'meet.date', m.date, 'date')}${fld('Luogo', 'meet.place', m.place)}${fld('Federazione', 'meet.fed', m.fed)}
          <label class="small" for="g_div" style="margin-top:8px;display:block">Categoria</label><select id="g_div" data-gp="div"><option value="">Scegli…</option>${BB_DIV.map(x => `<option value="${x[0]}" ${g.div === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select>
          <label class="small" for="g_phase" style="margin-top:8px;display:block">Fase attuale</label><select id="g_phase" data-gp="phase">${[['massa', 'Massa'], ['definizione', 'Definizione'], ['picco', 'Picco'], ['post', 'Post gara']].map(x => `<option value="${x[0]}" ${ph === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select></div>
        <div class="card"><h2>Prima, durante, dopo</h2><p class="small"><b>Prima:</b> check-in settimanale e foto con le stesse pose, per confrontare le settimane.<br><b>Picco:</b> giorno per giorno quello che ti dice il coach.<br><b>Durante:</b> foglio con le tue indicazioni di palco.<br><b>Dopo:</b> note e confronto delle foto.</p><div class="msg tip">I dati del check-in e le foto restano sul tuo telefono. Il coach li vede solo quando scegli tu di inviarglieli.</div></div>`;
    }
    function checkinView(p, g, pr) {
      const sc = (id, l, v) => `<label class="small" for="${id}" style="margin-top:8px;display:block">${l}</label><select id="${id}"><option value="">—</option>${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${v == n ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
      const ci = pr.checkins, last = ci.slice(-1)[0] || {};
      const wp = ci.filter(x => x.w).map(x => ({ x: x.date, y: x.w })), vp = ci.filter(x => x.waist).map(x => ({ x: x.date, y: x.waist }));
      return `<div class="card"><h2>Check-in settimanale</h2><p class="mute small">Resta sul tuo telefono. Il valore da 1 a 5: 1 basso, 5 ottimo (per la fame: 5 = molta).</p>
        <form data-gform="checkin"><label class="small" for="ci_date" style="display:block">Data</label><input id="ci_date" name="date" type="date" value="${todayISO()}" required>
          <label class="small" for="ci_w" style="margin-top:8px;display:block">Peso al mattino (kg)</label><input id="ci_w" name="w" type="text" inputmode="decimal" placeholder="${last.w || ''}">
          <label class="small" for="ci_waist" style="margin-top:8px;display:block">Vita (cm)</label><input id="ci_waist" name="waist" type="text" inputmode="decimal" placeholder="${last.waist || ''}">
          ${['sleep|Sonno', 'energy|Energia', 'hunger|Fame', 'adh|Aderenza al piano'].map(s => { const [k, l] = s.split('|'); return sc('ci_' + k, l, '').replace('<select id=', `<select name="${k}" id=`); }).join('')}
          <label class="small" for="ci_note" style="margin-top:8px;display:block">Note per te e il coach</label><textarea id="ci_note" name="note" rows="2"></textarea>
          <div class="row" style="margin-top:10px"><button class="primary grow" type="submit">Salva check-in</button></div></form></div>
        ${wp.length > 1 ? `<div class="card"><h2>Peso</h2>${c.lineChart(wp, 'kg')}${vp.length > 1 ? '<h3>Vita</h3>' + c.lineChart(vp, 'cm') : ''}</div>` : ''}
        <div class="card"><h2>Ultimi check-in</h2>${ci.slice(-6).reverse().map((x, i) => `<div style="padding:6px 0;border-top:1px solid var(--line)"><div class="row"><b class="grow">${fmtD(x.date)}</b><button class="sm" data-act="garaShare" data-w="checkin" data-d="${esc(x.date)}">Invia al coach</button></div><div class="small mute">${x.w ? x.w + ' kg' : ''}${x.waist ? ' · vita ' + x.waist : ''}${x.sleep ? ' · sonno ' + x.sleep : ''}${x.energy ? ' · energia ' + x.energy : ''}${x.hunger ? ' · fame ' + x.hunger : ''}${x.adh ? ' · aderenza ' + x.adh : ''}${x.note ? '<br>' + esc(x.note) : ''}</div></div>`).join('') || '<p class="mute small">Nessun check-in.</p>'}</div>`;
    }
    function photoView(p, g, pr) {
      const dates = ui.phDates || [];
      return `<div class="card"><h2>Foto di avanzamento</h2><p class="mute small">Sempre stessa luce, distanza e posa. Le foto restano sul tuo telefono: non vanno sul server né nei backup condivisi. Decidi tu se inviarle al coach (tasto sotto la foto).</p>
        <label class="small" for="ph_date" style="display:block">Data</label><input id="ph_date" type="date" value="${esc(ui.phDate || todayISO())}" data-gu="phDate">
        <div class="grid3" style="margin-top:8px">${POSES.map((n, i) => `<div style="text-align:center"><div class="small" style="min-height:2.4em">${n}</div><div class="pic" style="aspect-ratio:3/4;background:#0a0e14;border:1px solid var(--line);overflow:hidden;display:flex;align-items:center;justify-content:center"><img alt="${esc(n)}" data-ph="${esc((ui.phDate || todayISO()) + '|' + i)}" style="max-width:100%;max-height:100%;display:none"><span class="mute small" data-phe>vuoto</span></div>
          <label class="btn sm" style="display:block;margin-top:4px;cursor:pointer;text-align:center">Scatta o scegli<input type="file" accept="image/*" capture="environment" hidden data-gph="${i}"></label>
          <button class="sm" data-act="garaPhShare" data-i="${i}" style="margin-top:4px;width:100%">Invia al coach</button></div>`).join('')}</div></div>
        <div class="card"><h2>Confronta due date</h2><div class="row wrap"><div class="grow"><label class="small" for="ph_a">Prima</label><input id="ph_a" type="date" data-gu="phA" value="${esc(ui.phA || '')}"></div><div class="grow"><label class="small" for="ph_b">Dopo</label><input id="ph_b" type="date" data-gu="phB" value="${esc(ui.phB || '')}"></div></div>
          ${ui.phA && ui.phB ? POSES.map((n, i) => `<div style="margin-top:10px"><div class="small"><b>${n}</b></div><div class="row" style="gap:6px"><div class="grow" style="aspect-ratio:3/4;background:#0a0e14;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;overflow:hidden"><img alt="${esc(n)} ${esc(ui.phA)}" data-ph="${esc(ui.phA + '|' + i)}" style="max-width:100%;max-height:100%;display:none"><span class="mute small" data-phe>—</span></div><div class="grow" style="aspect-ratio:3/4;background:#0a0e14;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;overflow:hidden"><img alt="${esc(n)} ${esc(ui.phB)}" data-ph="${esc(ui.phB + '|' + i)}" style="max-width:100%;max-height:100%;display:none"><span class="mute small" data-phe>—</span></div></div></div>`).join('') : '<p class="mute small">Scegli due date per vedere le pose affiancate.</p>'}</div>`;
    }
    function peakView(p, g, pr, dd) {
      const days = [7, 6, 5, 4, 3, 2, 1, 0];
      return `<div class="card"><h2>Settimana di picco</h2><p class="mute small">Qui scrivi giorno per giorno le indicazioni del tuo coach (allenamento, pasti, riposo, prove di posa). L’app non propone protocolli di acqua, sodio o altro: la preparazione finale la decide chi ti segue.</p>
        ${days.map(n => { const key = 'd' + n, dt = g.meet && g.meet.date ? new Date(new Date(g.meet.date + 'T00:00:00').getTime() - n * 864e5).toISOString().slice(0, 10) : null; return `<div style="margin-top:8px"><label class="small" for="pk_${n}"><b>${n === 0 ? 'Giorno di gara' : n + (n === 1 ? ' giorno prima' : ' giorni prima')}</b>${dt ? ' · ' + fmtD(dt) : ''}${dd === n ? ' · <b>oggi</b>' : ''}</label><textarea id="pk_${n}" rows="2" data-gpk="${key}">${esc((pr.peak || {})[key] || '')}</textarea></div>`; }).join('')}</div>
        <div class="card"><h2>Prove di posa</h2><form data-gform="posing"><label class="small" for="po_d" style="display:block">Data</label><input id="po_d" name="date" type="date" value="${todayISO()}"><label class="small" for="po_m" style="margin-top:8px;display:block">Minuti di prova</label><input id="po_m" name="min" type="text" inputmode="numeric"><label class="small" for="po_n" style="margin-top:8px;display:block">Note (del coach o tue)</label><textarea id="po_n" name="note" rows="2"></textarea><div class="row" style="margin-top:8px"><button class="sm primary" type="submit">Registra prova</button></div></form>
          ${(pr.posing || []).slice(-5).reverse().map(x => `<div class="small" style="padding:5px 0;border-top:1px solid var(--line)"><b>${fmtD(x.date)}</b>${x.min ? ' · ' + x.min + ' min' : ''}${x.note ? '<br><span class="mute">' + esc(x.note) + '</span>' : ''}</div>`).join('')}</div>`;
    }


    function blockCard(plan) {
      if (!plan || !plan.block) return '';
      const st = plan.block.start || plan.createdAt || '';
      return `<div class="card"><h2>Inizio del blocco</h2><p class="small mute">Hai già iniziato la preparazione? Metti qui il giorno della prima seduta: la settimana si aggiorna da sola.</p><label class="small" for="blk_start" style="display:block">Primo giorno del blocco</label><input id="blk_start" type="date" data-gblk="start" value="${esc(st)}">${c.pastCard ? c.pastCard(P(), plan) : ''}</div>`;
    }
    /* ----- Motivazione: record, costanza, messaggio del coach ----- */
    function motCard(p, plan, g) {
      const st = F.garaStreak(p), need = plan && plan.days ? plan.days.length : 0, prs = F.garaPRs(p).filter(x => (Date.now() - new Date(x.date)) < 30 * 864e5).slice(-4).reverse();
      return `<div class="card"><h2>La tua costanza</h2><div class="grid3">${kpi(st.weeks || 0, st.weeks === 1 ? 'settimana di fila' : 'settimane di fila')}${kpi(st.thisWeek + (need ? '/' + need : ''), 'sedute questa settimana')}${kpi(prs.length, 'record in 30 giorni')}</div>
        ${prs.length ? `<div style="margin-top:8px">${prs.map(x => `<div class="small" style="padding:4px 0;border-top:1px solid var(--line)"><span class="chip">Record</span> <b>${esc(x.name)}</b> ${x.val} ${x.unit} <span class="mute">· ${fmtD(x.date).slice(0, 5)}</span></div>`).join('')}</div>` : '<p class="small mute" style="margin:8px 0 0">Il prossimo record lo segniamo qui appena lo fai.</p>'}
        ${g.coachMsg ? `<div class="msg tip" style="margin-top:8px"><b>Dal coach:</b> ${esc(g.coachMsg)}</div>` : ''}</div>`;
    }

    /* ----- Calisthenics ----- */
    function calScore(g) {
      const c = g.cal, sk = c.skills || [], ok = sk.filter(s => s.ok === true), b = c.bonus || {};
      const att = ['parallele', 'anelli', 'sbarra', 'suolo'], cat = ['verticalismo', 'spinta', 'tirata', 'forza'];
      const base = ok.reduce((a, s) => a + (+s.v || 0), 0), pen = sk.reduce((a, s) => a + (+s.pen || 0), 0);
      const varied = att.every(a => ok.some(s => s.att === a)), compl = cat.every(k => ok.some(s => s.cat === k));
      const free = Math.min(5, Math.max(0, +b.free || 0)), link = Math.max(0, +b.link || 0) >= 3 ? 0.3 * (+b.link) : 0, grips = Math.min(0.5, 0.1 * (+b.grips || 0)), holds = 0.3 * (+b.holds || 0);
      const total = base - pen + (varied ? 3 : 0) + (compl ? 3 : 0) + free + link + grips + holds;
      return { base, pen, varied, compl, free, link, grips, holds, total: Math.round(total * 100) / 100, decl: sk.reduce((a, s) => a + (+s.v || 0), 0) };
    }
    const CAL_MAX = [['Trazioni', /trazion|pull.?up|chin.?up/i, /australian|inverted|negativ|assist|elastic/i], ['Dip alle parallele', /\bdip\b|parallele/i, /panca|bench/i], ['Piegamenti', /piegament|push.?up/i, /pike|verticale|handstand|archer|diamond/i], ['Muscle-up', /muscle.?up/i, /negativ|assist|elastic/i]];
    function calMax(p) {
      return CAL_MAX.map(([n, re, no]) => { let best = 0, d = ''; (p.sessions || []).forEach(s => (s.ex || []).forEach(e => { if (!re.test(e.name || '') || no.test(e.name || '')) return; (e.sets || []).forEach(t => { if (!t.warm && !(t.kg > 0) && t.reps > best) { best = t.reps; d = s.date; } }); })); return { n, best, d }; });
    }
    function calView(p, plan, g, t) {
      const c2 = g.cal, m = g.meet || {}, dd = daysTo(m.date), wk = plan.block ? F.blockWeek(plan) : 0;
      if (t === 'regole') return `<div class="msg tip">${esc(F.CAL_SRC)}</div>` + F.CAL_RULES.map(([h, l]) => `<details class="card"><summary><b>${h}</b></summary><ul style="margin:8px 0 0;padding-left:18px">${l.map(x => `<li class="small" style="margin:4px 0">${esc(x)}</li>`).join('')}</ul></details>`).join('');
      const sc = calScore(g);
      const skillRows = (live) => (c2.skills || []).map((s, i) => `<div class="row" style="align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--line)"><div class="grow"><b>${esc(s.n)}</b><div class="small mute">${esc(s.att)} · ${esc(s.cat)} · valore ${s.v}</div></div>${live ? `<button class="sm ${s.ok === true ? 'primary' : ''}" data-act="calOk" data-i="${i}" data-v="1" aria-pressed="${s.ok === true}">Eseguita</button><button class="sm ${s.ok === false ? 'danger' : ''}" data-act="calOk" data-i="${i}" data-v="0" aria-pressed="${s.ok === false}">No</button>` : `<button class="sm" data-act="calDel" data-i="${i}" aria-label="Togli ${esc(s.n)}">Togli</button>`}</div>${live && s.ok === true ? `<div class="row" style="align-items:center;gap:8px;padding:0 0 6px"><label class="small" for="cp_${i}">Penalità</label><input id="cp_${i}" style="max-width:90px" data-gp="cal.skills.${i}.pen" data-gt="num" type="text" inputmode="decimal" value="${s.pen || ''}"></div>` : ''}`).join('') || '<p class="mute small">Nessuna skill nel set.</p>';
      if (t === 'giorno') return `<div class="card hero"><div class="mute small">${dd === 0 ? 'Oggi si gareggia' : dd > 0 ? 'Gara tra ' + dd + ' giorni' : 'Giorno di gara'}</div><div id="calTimer" style="font:italic 700 3.6rem/1 var(--display)">50.0</div><div class="small mute">Un set dura 50 secondi (FIF Calisthenics Challenge 2026).</div><div class="row wrap" style="margin-top:8px"><button class="primary" data-act="calTimer">Avvia set da 50 s</button><button class="sm" data-act="calTimerStop">Ferma</button></div></div>
        <div class="card"><h2>Il tuo set</h2>${skillRows(true)}</div>
        <div class="card"><h2>Bonus</h2><p class="small mute">Segna quello che hai fatto. Il giudizio finale è della giuria: questa è una stima.</p>
          ${fld('Freestyle (0-5, a discrezione della giuria)', 'cal.bonus.free', (c2.bonus || {}).free, 'num')}${fld('Elementi collegati senza pause (minimo 3)', 'cal.bonus.link', (c2.bonus || {}).link, 'num')}${fld('Variazioni di presa (max +0,5)', 'cal.bonus.grips', (c2.bonus || {}).grips, 'num')}${fld('Tenute da 5 secondi', 'cal.bonus.holds', (c2.bonus || {}).holds, 'num')}</div>
        <div class="card"><h2>Punteggio stimato</h2><div class="grid3 k4">${kpi(sc.total, 'totale')}${kpi(sc.base, 'valore skill eseguite')}${kpi(sc.varied ? '+3' : '0', 'varietà attrezzo')}${kpi(sc.compl ? '+3' : '0', 'completezza')}</div><p class="small mute">Penalità inserite: ${sc.pen}. Le regole sulle ripetizioni (seconda tenuta sullo stesso attrezzo = metà) valgono per la giuria: se ne hai ripetuta una, abbassa tu il valore.</p></div>`;
      if (t === 'dopo') { const hist = g.history || []; return `<div class="card hero"><div class="mute small">Risultato stimato</div><div style="font:italic 700 2.6rem/1 var(--display)">${sc.total}</div><div class="small mute">${(c2.skills || []).filter(s => s.ok === true).length}/${(c2.skills || []).length} skill eseguite</div></div>
        <div class="card"><h2>Storico gare</h2>${hist.length ? hist.slice().reverse().map(h => `<div class="row small" style="padding:5px 0;border-top:1px solid var(--line)"><span class="grow"><b>${esc(h.name || 'Gara')}</b> · ${fmtD(h.date)}</span><b>${h.score}</b></div>`).join('') : '<p class="mute small">Nessuna gara archiviata.</p>'}<button class="sm" style="margin-top:8px" data-act="calArchive">Archivia questa gara e prepara la prossima</button></div>
        <div class="card"><h2>Invia al coach</h2><button class="sm" data-act="garaShare" data-w="calresult">Invia il punteggio stimato</button></div>`; }
      const mx = calMax(p), pr = c2.prog || [];
      return `<div class="card hero"><div class="mute small">${esc(m.name || 'La tua gara')}${m.place ? ' · ' + esc(m.place) : ''}</div><div style="font:italic 700 3rem/1 var(--display)">${dd == null ? '—' : dd > 0 ? dd : dd === 0 ? 'OGGI' : 'finita'}</div><div class="mute">${dd != null && dd > 0 ? 'giorni alla gara · ' + fmtD(m.date) : 'imposta la data qui sotto'}</div>
        <div class="grid3" style="margin-top:10px">${kpi(wk ? wk + '/' + plan.block.weeks : '—', 'settimana blocco')}${kpi(sc.decl, 'punti dichiarati')}${kpi(sc.decl > 13 ? 'Advanced' : 'Intermediate', 'categoria uomini')}</div>
        ${plan.block ? `<div class="row wrap" style="margin-top:10px;align-items:center"><span class="small mute">Settimana del blocco</span><button class="sm" data-act="garaWeek" data-d="-1" aria-label="Settimana precedente">‹</button><b>${wk}</b><button class="sm" data-act="garaWeek" data-d="1" aria-label="Settimana successiva">›</button></div>` : ''}</div>
        ${motCard(p, plan, g)}
        ${blockCard(plan)}
        <div class="card"><h2>Dati gara</h2>${fld('Nome gara', 'meet.name', m.name)}${fld('Data gara', 'meet.date', m.date, 'date')}${fld('Luogo', 'meet.place', m.place)}${fld('Federazione', 'meet.fed', m.fed)}${fld('Categoria', 'meet.cls', m.cls)}<p class="small mute">Regola FIF 2026: Intermediate fino a 13 punti dichiarati, Advanced oltre 13. Controlla il bando della tua gara.</p></div>
        <div class="card"><h2>Skill del set di gara</h2><p class="small mute">Scrivi gli elementi che dichiari, con il valore del codice della tua federazione.</p>${skillRows(false)}
          <form data-gform="calskill" style="margin-top:8px"><label class="small" for="cs_n" style="display:block">Skill</label><input id="cs_n" name="n" required placeholder="Per esempio Front lever straddle">
            <div class="row wrap" style="gap:8px"><div class="grow"><label class="small" for="cs_a">Attrezzo</label><select id="cs_a" name="att"><option>parallele</option><option>anelli</option><option>sbarra</option><option>suolo</option></select></div><div class="grow"><label class="small" for="cs_c">Macro-categoria</label><select id="cs_c" name="cat"><option>verticalismo</option><option>spinta</option><option>tirata</option><option>forza</option></select></div></div>
            <label class="small" for="cs_v" style="margin-top:8px;display:block">Valore (punti del codice)</label><input id="cs_v" name="v" type="text" inputmode="decimal" required><div class="row" style="margin-top:8px"><button class="sm primary" type="submit">Aggiungi al set</button></div></form></div>
        <div class="card"><h2>Massimo di ripetizioni</h2><p class="small mute">Dalle sedute registrate (solo serie a corpo libero).</p><div class="grid3 k4">${mx.map(x => kpi(x.best || '—', x.n)).join('')}</div></div>
        <div class="card"><h2>Livelli delle skill</h2><p class="small mute">Livelli indicativi di progressione. Registra il livello raggiunto e quanti secondi lo tieni.</p>
          <form data-gform="calprog"><label class="small" for="cg_s" style="display:block">Skill</label><select id="cg_s" name="s">${Object.keys(CAL_LADD).map(k => `<option>${k}</option>`).join('')}</select><label class="small" for="cg_l" style="margin-top:8px;display:block">Livello</label><select id="cg_l" name="l">${[...new Set([].concat(...Object.values(CAL_LADD)))].map(k => `<option>${k}</option>`).join('')}</select><label class="small" for="cg_h" style="margin-top:8px;display:block">Tenuta (secondi)</label><input id="cg_h" name="h" type="text" inputmode="numeric"><div class="row" style="margin-top:8px"><button class="sm primary" type="submit">Registra</button></div></form>
          ${pr.slice(-6).reverse().map(x => `<div class="small" style="padding:5px 0;border-top:1px solid var(--line)"><b>${esc(x.s)}</b> · ${esc(x.l)}${x.h ? ' · ' + x.h + ' s' : ''} <span class="mute">${fmtD(x.date).slice(0, 5)}</span></div>`).join('')}</div>`;
    }
    function calCoach(g) {
      const sc = calScore(g), sk = (g.cal && g.cal.skills) || [];
      return `<div class="small" style="margin-top:6px">Set: <b>${sk.length}</b> skill · punti dichiarati <b>${sc.decl}</b> · stima punteggio <b>${sc.total}</b></div>${sk.slice(0, 8).map(s => `<span class="chip ${s.ok === true ? '' : s.ok === false ? 'danger' : 'warn'}" style="margin:4px 4px 0 0">${esc(s.n)} ${s.v}</span>`).join('')}`;
    }

    /* ---------- vista del coach ---------- */
    F.garaCoachCard = function (cl, uid) {
      const g = cl && cl.gara; if (!g || F.garaOff(cl, uid)) return '';
      const m = g.meet || {}, dd = daysTo(m.date), sex = cl.sex === 'F' ? 'F' : 'M', age = F.garaAge(cl.birth, m.date || null), eq = m.equip === 'equipped' ? 'equipped' : 'classic';
      const lw = (cl.weights || []).slice(-1)[0], bw = pickKg((g.weighIn || {}).kg) || (lw && lw.kg) || +cl.weight || 0, tt = total(g), pt = planTot(g);
      const shared = (g.shared || []).slice(-4).reverse();
      return `<div class="card" style="border-color:var(--accent)"><div class="mute small">Area Gara · ${KL[kind(g)]}${g.seen ? '' : ' · <b>non ancora aperta dall’atleta</b>'}</div><b>${esc(m.name || 'Gara')}</b> <span class="small mute">${fmtD(m.date)}${dd != null ? ' · ' + (dd > 0 ? 'tra ' + dd + ' giorni' : dd === 0 ? 'oggi' : 'passata') : ''} · ${esc(m.fed || 'federazione n.d.')}</span>
        ${g.kind === 'calisthenics' ? calCoach(g) : g.kind === 'bodybuilding' ? `<div class="small" style="margin-top:6px">Categoria: <b>${esc((BB_DIV.find(x => x[0] === g.div) || [0, 'n.d.'])[1])}</b> · fase: <b>${esc(g.phase || 'n.d.')}</b></div>` : `<div class="grid3 k4" style="margin-top:8px">${kpi(bw || '—', 'peso kg')}${kpi(m.cls || (F.garaClassOf(sex, bw, age.young) || {}).label || '—', 'categoria')}${kpi(pt || '—', 'totale previsto')}${kpi(pt ? F.glPoints(pt, bw, sex, eq).toFixed(1) : '—', 'GL previsto')}</div>
          ${L3.map(k => { const a = (g.att || {})[k] || [], r = (g.res || {})[k] || []; return `<div class="small" style="margin-top:4px"><b>${LIFTS[k].n}</b>: ${a.map((kg, i) => kg ? `<span class="chip ${r[i] === true ? '' : r[i] === false ? 'danger' : 'warn'}">${kg}${r[i] === true ? ' ✓' : r[i] === false ? ' ✗' : ''}</span>` : '').join(' ') || '<span class="mute">non compilati</span>'}</div>`; }).join('')}
          ${tt.ok ? `<div class="msg ok" style="margin-top:8px">Totale gara: <b>${tt.tot} kg</b> · GL ${F.glPoints(tt.tot, bw, sex, eq).toFixed(2)}</div>` : ''}`}
        ${shared.length ? `<div class="small" style="margin-top:8px"><b>Inviato dall’atleta:</b>${shared.map(s => `<div class="mute">${fmtD(String(s.at).slice(0, 10))} · ${s.type === 'checkin' ? 'check-in: ' + [s.data.w && s.data.w + ' kg', s.data.waist && 'vita ' + s.data.waist, s.data.sleep && 'sonno ' + s.data.sleep, s.data.energy && 'energia ' + s.data.energy, s.data.hunger && 'fame ' + s.data.hunger, s.data.adh && 'aderenza ' + s.data.adh].filter(Boolean).join(', ') + (s.data.note ? ' — ' + esc(s.data.note) : '') : s.type === 'calresult' ? 'punteggio stimato ' + s.data.score : 'risultato finale ' + s.data.total + ' kg (GL ' + (s.data.gl || 0).toFixed(2) + ')'}</div>`).join('')}</div>` : ''}<div class="row" style="margin-top:10px"><button class="sm ghost" data-act="garaCoachOff" data-id="${esc(uid || '')}">Rimuovi dall’elenco gara</button></div></div>`;
    };

    /* ---------- foto locali (IndexedDB) ---------- */
    const idb = () => new Promise((res, rej) => { try { const r = indexedDB.open('forgia-gara', 1); r.onupgradeneeded = () => r.result.createObjectStore('ph'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } });
    const idbGet = k => idb().then(db => new Promise(res => { const q = db.transaction('ph').objectStore('ph').get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); })).catch(() => null);
    const idbPut = (k, v) => idb().then(db => new Promise((res, rej) => { const tx = db.transaction('ph', 'readwrite'); tx.objectStore('ph').put(v, k); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }));
    const shrink = file => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => { const s = Math.min(1, 1000 / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * s); cv.height = Math.round(im.height * s); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); res(cv.toDataURL('image/jpeg', 0.82)); }; im.onerror = rej; im.src = fr.result; }; fr.onerror = rej; fr.readAsDataURL(file); });
    G.after = function () { document.querySelectorAll('img[data-ph]').forEach(im => { idbGet(im.dataset.ph).then(v => { if (v) { im.src = v; im.style.display = 'block'; const e = im.parentNode.querySelector('[data-phe]'); if (e) e.style.display = 'none'; } }); }); };

    /* ---------- azioni ---------- */
    const setPath = (o, path, val) => { const ks = path.split('.'); let t = o; for (let i = 0; i < ks.length - 1; i++) { const k = ks[i]; if (t[k] == null || typeof t[k] !== 'object') t[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; t = t[k]; } t[ks[ks.length - 1]] = val; };
    G.acts = {
      garaLeave() {
        const p = P(); if (!p || !p.gara) return;
        if (!confirm('Uscire dalla gara?\n\nSi eliminano i dati gara (tentativi, check-in, piano, foto salvate in questa app) e il coach non ti vedrà più tra gli atleti di gara. La scheda e gli allenamenti restano.')) return;
        if (!confirm('ULTIMA CONFERMA\n\nL’eliminazione dei dati gara è definitiva (si recupera solo da un backup). Vuoi davvero uscire dalla gara?')) return;
        delete p.gara; delete p.garaPriv; (p.plans || []).forEach(pl => { delete pl.comp; });
        idb().then(db => { try { db.transaction('ph', 'readwrite').objectStore('ph').clear(); } catch (e) { } }).catch(() => { });
        ui.tab = 'home'; ui.sub = null; c.save(); c.render(); c.toast('Sei uscito dalla gara: dati gara eliminati'); window.scrollTo(0, 0);
      },
      calOk(t) { const p = P(), g = p && p.gara; if (!g) return; const s = g.cal.skills[+t.dataset.i]; if (!s) return; const v = t.dataset.v === '1'; s.ok = s.ok === v ? null : v; c.save(); c.render(); },
      calDel(t) { const p = P(), g = p && p.gara; if (!g) return; g.cal.skills.splice(+t.dataset.i, 1); c.save(); c.render(); },
      calArchive() { const p = P(), g = p && p.gara; if (!g) return; const sc = calScore(g); g.history.push({ date: (g.meet || {}).date || todayISO(), name: (g.meet || {}).name, score: sc.total, skills: JSON.parse(JSON.stringify(g.cal.skills)) }); g.cal.skills.forEach(s => { s.ok = null; s.pen = 0; }); g.cal.bonus = {}; g.meet = { fed: (g.meet || {}).fed }; c.save(); ui.gtab = 'home'; c.render(); c.toast('Gara archiviata'); },
      calTimer() { clearInterval(ui.calT); const end = Date.now() + 50000, el = () => document.getElementById('calTimer'); ui.calT = setInterval(() => { const e = el(); if (!e) { clearInterval(ui.calT); return; } const l = Math.max(0, end - Date.now()); e.textContent = (l / 1000).toFixed(1); if (!l) { clearInterval(ui.calT); try { navigator.vibrate && navigator.vibrate([300, 150, 300]); } catch (x) { } c.toast('Tempo! 50 secondi finiti'); } }, 100); },
      calTimerStop() { clearInterval(ui.calT); const e = document.getElementById('calTimer'); if (e) e.textContent = '50.0'; },
      garaSample() { const t = document.getElementById('imp_text'); if (t) { t.value = F.GARA_SAMPLE; c.toast('Scheda di esempio caricata: tocca Leggi scheda'); } },
      garaOpen() { const p = P(); if (p && p.gara) { p.gara.seen = true; p.gara.hide = false; c.save(); } ui.tab = 'gara'; ui.sub = null; c.render(); window.scrollTo(0, 0); },
      garaSeen() { const p = P(); if (p && p.gara) { p.gara.seen = true; c.save(); c.render(); } },
      garaHide() { const p = P(); if (p && p.gara) { p.gara.hide = true; c.save(); c.render(); } },
      garaTab(t) { ui.gtab = t.dataset.t; c.render(); window.scrollTo(0, 0); },
      garaSug(t) { const p = P(), g = p && p.gara; if (!g) return; const k = t.dataset.l, v = +t.dataset.v; if (!(v > 0)) return c.toast('Scrivi prima il 3° tentativo che vuoi provare'); g.att[k] = [r25(v * 0.92), r25(v * 0.97), r25(v)]; if (g.res) g.res[k] = []; c.save(); c.render(); },
      garaRes(t) { const p = P(), g = p && p.gara; if (!g) return; const k = t.dataset.l, i = +t.dataset.i, v = t.dataset.v === '1'; g.res[k] = g.res[k] || []; g.res[k][i] = g.res[k][i] === v ? null : v; const a = g.att[k] || [], nx = i + 1; if (v && nx < 3 && g.res[k][i] === true && !(a[nx] > 0) && a[i] > 0) c.toast('Scrivi il peso del prossimo tentativo nella scheda "Prima"'); c.save(); c.render(); },
      garaArchive() { const p = P(), g = p && p.gara, plan = p && c.planOf(p); if (!g || !plan) return; const d = plData(p, g), tt = total(g); if (!tt.ok) return; g.history.push({ date: d.m.date || todayISO(), name: d.m.name, bw: d.bw, cls: d.tgt, equip: d.equip, total: tt.tot, gl: F.glPoints(tt.tot, d.bw, d.sex, d.equip), att: JSON.parse(JSON.stringify(g.att)), res: JSON.parse(JSON.stringify(g.res)) }); g.att = {}; g.res = {}; g.meet = { fed: d.m.fed, equip: d.m.equip }; g.weighIn = null; c.save(); ui.gtab = 'home'; c.render(); c.toast('Gara archiviata'); },
      garaShare(t) { const p = P(), g = p && p.gara; if (!g) return; let item;
        if (t.dataset.w === 'checkin') { const x = priv(p).checkins.find(y => y.date === t.dataset.d); if (!x) return; item = { at: new Date().toISOString(), type: 'checkin', data: Object.assign({}, x) }; }
        else if (t.dataset.w === 'calresult') { item = { at: new Date().toISOString(), type: 'calresult', data: { score: calScore(g).total } }; }
        else { const d = plData(p, g), tt = total(g); if (!tt.ok) return; item = { at: new Date().toISOString(), type: 'result', data: { total: tt.tot, gl: F.glPoints(tt.tot, d.bw, d.sex, d.equip), bw: d.bw } }; }
        g.shared.push(item); c.save(); c.toast('Inviato al coach: lo vedrà alla prossima sincronizzazione'); c.render(); },
      garaPhShare(t) { const p = P(); const date = ui.phDate || todayISO(), i = +t.dataset.i; idbGet(date + '|' + i).then(v => { if (!v) return c.toast('Scatta prima questa foto'); fetch(v).then(r => r.blob()).then(b => { const f = new File([b], 'foto_' + date + '_' + (i + 1) + '.jpg', { type: 'image/jpeg' }); if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], title: 'Foto ' + POSES[i] + ' ' + date }).catch(() => { }); else c.toast('Questo telefono non può condividere: salva la foto e mandala al coach'); }); }); }
    };
    G.onChange = function (t) {
      const p = P(); if (!p) return false;
      if (t.dataset.gblk) { const pl = c.planOf(p); if (pl && pl.block) { pl.block.start = t.value || undefined; delete pl.block.manual; c.save(); c.render(); } return true; }
      if (t.dataset.gu) { ui[t.dataset.gu] = t.value; c.render(); return true; }
      if (t.dataset.gph != null) { const f = t.files && t.files[0], i = +t.dataset.gph; if (!f) return true; const date = ui.phDate || todayISO(); shrink(f).then(v => idbPut(date + '|' + i, v)).then(() => { c.toast('Foto salvata sul telefono'); c.render(); }).catch(() => c.toast('Non riesco a salvare la foto')); t.value = ''; return true; }
      if (t.dataset.gpk) { priv(p).peak[t.dataset.gpk] = t.value; c.save(); return true; }
      if (t.dataset.gp && p.gara) {
        const path = t.dataset.gp; let v = t.value; if (t.dataset.gt === 'num') v = pickKg(v); else if (t.type === 'date' || t.type === 'time') v = v || '';
        if (/^att\./.test(path)) { const [, k, i] = path.split('.'); p.gara.att[k] = p.gara.att[k] || []; p.gara.att[k][+i] = v; p.gara.att[k] = [0, 1, 2].map(j => p.gara.att[k][j] || null); }
        else { setPath(p.gara, path, v); if (/^meet\./.test(path)) p.gara.meet['_u' + path.slice(5)] = 1; }
        c.save(); c.render(); return true;
      }
      return false;
    };
    G.onSubmit = function (form) {
      const p = P(); if (!p) return false; const kind2 = form.dataset.gform; if (!kind2) return false; const fd = Object.fromEntries(new FormData(form).entries()), pr = priv(p);
      if (kind2 === 'checkin') { const o = { date: fd.date || todayISO(), w: pickKg(fd.w), waist: pickKg(fd.waist), sleep: +fd.sleep || null, energy: +fd.energy || null, hunger: +fd.hunger || null, adh: +fd.adh || null, note: (fd.note || '').trim() }; pr.checkins = pr.checkins.filter(x => x.date !== o.date); pr.checkins.push(o); pr.checkins.sort((a, b) => a.date < b.date ? -1 : 1); c.save(); c.toast('Check-in salvato sul telefono'); c.render(); return true; }
      if (kind2 === 'calskill') { const v = pickKg(fd.v); if (!fd.n.trim() || !v) { c.toast('Scrivi il nome e il valore della skill'); return true; } p.gara.cal.skills.push({ n: fd.n.trim(), att: fd.att, cat: fd.cat, v, ok: null, pen: 0 }); c.save(); c.render(); return true; }
      if (kind2 === 'calprog') { p.gara.cal.prog.push({ date: todayISO(), s: fd.s, l: fd.l, h: +fd.h || null }); c.save(); c.toast('Registrato'); c.render(); return true; }
      if (kind2 === 'posing') { pr.posing.push({ date: fd.date || todayISO(), min: +fd.min || null, note: (fd.note || '').trim() }); c.save(); c.toast('Prova registrata'); c.render(); return true; }
      return false;
    };
    return G;
  };
})(window.FORMA);
