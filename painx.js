/* FORMA – dolore dettagliato: struttura anatomica + lato (sinistro / destro). Elenco breve (gruppi comuni) e completo (muscoli, tendini, articolazioni, legamenti).
   Dati: p.painX = registro [{date, s, sd:'L'|'R'|'C', l:0-10, ty, wh, at}] (l=0 azzera). p.pain (zona → livello) e p.painLog restano gli stessi di sempre e vengono ricalcolati. */
(function (F) {
  /* [id, nome, zona, tipo, vista f|b, x, y, centrale?]  – coordinate sul corpo 402×768 per il lato sinistro dello schermo; il lato opposto è lo specchio (x → 402−x). */
  const L = [
    ['n_cerv', 'Colonna cervicale (vertebre e dischi)', 'neck', 'colonna', 'b', 201, 100, 1],
    ['n_trap_s', 'Trapezio superiore', 'neck', 'muscolo', 'b', 160, 135],
    ['n_scm', 'Sternocleidomastoideo (lato del collo)', 'neck', 'muscolo', 'f', 183, 120],
    ['n_scal', 'Scaleni e muscoli profondi del collo', 'neck', 'muscolo', 'f', 174, 136],
    ['n_subocc', 'Muscoli sotto-occipitali (nuca)', 'neck', 'muscolo', 'b', 182, 78],
    ['s_delt_a', 'Deltoide anteriore', 'shoulder', 'muscolo', 'f', 112, 184],
    ['s_delt_l', 'Deltoide laterale', 'shoulder', 'muscolo', 'f', 96, 194],
    ['s_delt_p', 'Deltoide posteriore', 'shoulder', 'muscolo', 'b', 108, 190],
    ['s_gleno', 'Articolazione della spalla (gleno-omerale)', 'shoulder', 'articolazione', 'f', 118, 172],
    ['s_acro', 'Articolazione acromion-claveare', 'shoulder', 'articolazione', 'f', 130, 157],
    ['s_sovra', 'Sovraspinato (cuffia dei rotatori)', 'shoulder', 'muscolo', 'b', 148, 166],
    ['s_sotto', 'Sottospinato (cuffia dei rotatori)', 'shoulder', 'muscolo', 'b', 140, 198],
    ['s_rot_min', 'Piccolo rotondo (cuffia dei rotatori)', 'shoulder', 'muscolo', 'b', 121, 207],
    ['s_sub', 'Sottoscapolare (cuffia dei rotatori)', 'shoulder', 'muscolo', 'f', 134, 196],
    ['s_bic_l', 'Tendine del capo lungo del bicipite', 'shoulder', 'tendine', 'f', 121, 202],
    ['c_pec_c', 'Pettorale grande – parte alta (clavicolare)', 'chest', 'muscolo', 'f', 150, 178],
    ['c_pec_s', 'Pettorale grande – parte centrale e bassa', 'chest', 'muscolo', 'f', 160, 214],
    ['c_pec_m', 'Pettorale piccolo', 'chest', 'muscolo', 'f', 136, 192],
    ['c_serr', 'Dentato anteriore', 'chest', 'muscolo', 'f', 138, 246],
    ['c_costo', 'Costole e cartilagini costali', 'chest', 'articolazione', 'f', 152, 238],
    ['c_sterno', 'Sterno', 'chest', 'osso', 'f', 201, 200, 1],
    ['u_trap_m', 'Trapezio medio', 'upper_back', 'muscolo', 'b', 168, 185],
    ['u_trap_i', 'Trapezio inferiore', 'upper_back', 'muscolo', 'b', 183, 242],
    ['u_romb', 'Romboidi (tra le scapole)', 'upper_back', 'muscolo', 'b', 172, 212],
    ['u_lat', 'Gran dorsale', 'upper_back', 'muscolo', 'b', 150, 272],
    ['u_rot_m', 'Grande rotondo', 'upper_back', 'muscolo', 'b', 132, 228],
    ['u_dors', 'Colonna dorsale (vertebre)', 'upper_back', 'colonna', 'b', 201, 215, 1],
    ['l_erett', 'Erettori spinali lombari', 'lower_back', 'muscolo', 'b', 186, 305],
    ['l_quad', 'Quadrato dei lombi', 'lower_back', 'muscolo', 'b', 172, 326],
    ['l_colon', 'Colonna lombare (vertebre e dischi)', 'lower_back', 'colonna', 'b', 201, 322, 1],
    ['l_sacro', 'Sacro', 'lower_back', 'osso', 'b', 201, 352, 1],
    ['l_sacroil', 'Articolazione sacro-iliaca', 'lower_back', 'articolazione', 'b', 176, 350],
    ['a_retto', 'Retto dell\'addome', 'abdomen', 'muscolo', 'f', 182, 295],
    ['a_obl', 'Obliqui (fianchi)', 'abdomen', 'muscolo', 'f', 150, 285],
    ['a_trasv', 'Trasverso e muscoli profondi dell\'addome', 'abdomen', 'muscolo', 'f', 160, 330],
    ['e_bic', 'Bicipite', 'elbow', 'muscolo', 'f', 112, 250],
    ['e_tric', 'Tricipite', 'elbow', 'muscolo', 'b', 108, 255],
    ['e_brac', 'Brachiale (sotto il bicipite)', 'elbow', 'muscolo', 'f', 106, 278],
    ['e_art', 'Articolazione del gomito', 'elbow', 'articolazione', 'f', 112, 298],
    ['e_epil', 'Epicondilo laterale (gomito del tennista)', 'elbow', 'tendine', 'f', 99, 298],
    ['e_epim', 'Epicondilo mediale (gomito del golfista)', 'elbow', 'tendine', 'f', 125, 298],
    ['e_bic_d', 'Tendine distale del bicipite', 'elbow', 'tendine', 'f', 113, 310],
    ['e_tric_t', 'Tendine del tricipite e olecrano', 'elbow', 'tendine', 'b', 112, 300],
    ['w_flex', 'Flessori dell\'avambraccio', 'wrist', 'muscolo', 'f', 92, 336],
    ['w_ext', 'Estensori dell\'avambraccio', 'wrist', 'muscolo', 'b', 90, 340],
    ['w_art', 'Articolazione del polso', 'wrist', 'articolazione', 'f', 70, 382],
    ['w_tunnel', 'Tunnel carpale', 'wrist', 'nervo', 'f', 66, 394],
    ['w_mano', 'Mano e dita', 'wrist', 'articolazione', 'f', 52, 420],
    ['h_ileo', 'Flessori dell\'anca (ileopsoas)', 'hip', 'muscolo', 'f', 168, 372],
    ['h_add', 'Adduttori (interno coscia / inguine)', 'hip', 'muscolo', 'f', 186, 432],
    ['h_tfl', 'Tensore della fascia lata', 'hip', 'muscolo', 'f', 135, 388],
    ['h_art', 'Articolazione dell\'anca', 'hip', 'articolazione', 'f', 142, 398],
    ['h_glut', 'Gluteo grande', 'hip', 'muscolo', 'b', 172, 400],
    ['h_glut_m', 'Gluteo medio', 'hip', 'muscolo', 'b', 138, 374],
    ['h_piri', 'Piriforme e rotatori profondi dell\'anca', 'hip', 'muscolo', 'b', 183, 376],
    ['q_retto', 'Retto femorale (centro coscia)', 'quad', 'muscolo', 'f', 162, 440],
    ['q_vl', 'Vasto laterale (esterno coscia)', 'quad', 'muscolo', 'f', 132, 456],
    ['q_vm', 'Vasto mediale (sopra l\'interno del ginocchio)', 'quad', 'muscolo', 'f', 174, 506],
    ['m_bf', 'Bicipite femorale (esterno dietro la coscia)', 'hamstring', 'muscolo', 'b', 140, 490],
    ['m_st', 'Semitendinoso e semimembranoso (interno)', 'hamstring', 'muscolo', 'b', 172, 490],
    ['m_isch', 'Inserzione dei femorali sull\'ischio', 'hamstring', 'tendine', 'b', 165, 440],
    ['k_rot', 'Rotula (articolazione femoro-rotulea)', 'knee', 'articolazione', 'f', 150, 554],
    ['k_tr', 'Tendine rotuleo', 'knee', 'tendine', 'f', 150, 584],
    ['k_tq', 'Tendine del quadricipite', 'knee', 'tendine', 'f', 150, 532],
    ['k_mm', 'Menisco mediale', 'knee', 'cartilagine', 'f', 164, 564],
    ['k_ml', 'Menisco laterale', 'knee', 'cartilagine', 'f', 136, 564],
    ['k_lc', 'Legamenti crociati (LCA / LCP)', 'knee', 'legamento', 'f', 150, 572],
    ['k_lcm', 'Legamento collaterale mediale', 'knee', 'legamento', 'f', 172, 552],
    ['k_lcl', 'Legamento collaterale laterale', 'knee', 'legamento', 'f', 128, 552],
    ['k_itb', 'Bendelletta ileotibiale (esterno coscia e ginocchio)', 'knee', 'tendine', 'f', 126, 520],
    ['k_pop', 'Cavo popliteo (dietro il ginocchio)', 'knee', 'muscolo', 'b', 152, 556],
    ['p_gm', 'Gastrocnemio mediale (polpaccio interno)', 'calf', 'muscolo', 'b', 166, 605],
    ['p_gl', 'Gastrocnemio laterale (polpaccio esterno)', 'calf', 'muscolo', 'b', 132, 600],
    ['p_sol', 'Soleo', 'calf', 'muscolo', 'b', 150, 652],
    ['p_ta', 'Tibiale anteriore', 'calf', 'muscolo', 'f', 150, 640],
    ['p_per', 'Peroneali (esterno della gamba)', 'calf', 'muscolo', 'f', 132, 626],
    ['p_tib', 'Tibia (periostite, «fascite tibiale»)', 'calf', 'osso', 'f', 162, 654],
    ['t_art', 'Articolazione della caviglia', 'ankle', 'articolazione', 'f', 150, 702],
    ['t_leg', 'Legamenti laterali della caviglia', 'ankle', 'legamento', 'f', 133, 708],
    ['t_ach', 'Tendine d\'Achille', 'ankle', 'tendine', 'b', 150, 690],
    ['t_pl', 'Fascia plantare e tallone', 'ankle', 'tendine', 'b', 152, 742],
    ['t_piede', 'Piede e dita', 'ankle', 'articolazione', 'f', 150, 738]
  ];
  /* lista breve: gruppi comuni e muscoli grandi (stessa logica, stessi lati) */
  const G = [
    ['g_neck', 'Collo', 'neck', 'f', 183, 124], ['g_trapezio', 'Trapezio', 'neck', 'b', 160, 140],
    ['g_shoulder', 'Spalla', 'shoulder', 'f', 106, 186], ['g_chest', 'Petto', 'chest', 'f', 152, 200],
    ['g_upper_back', 'Alto dorso', 'upper_back', 'b', 170, 208], ['g_lats', 'Dorsali', 'upper_back', 'b', 150, 268],
    ['g_lower_back', 'Zona lombare', 'lower_back', 'b', 184, 315], ['g_abdomen', 'Addome', 'abdomen', 'f', 182, 300],
    ['g_biceps', 'Bicipite', 'elbow', 'f', 112, 250], ['g_triceps', 'Tricipite', 'elbow', 'b', 108, 255],
    ['g_elbow', 'Gomito', 'elbow', 'f', 112, 298], ['g_forearm', 'Avambraccio', 'wrist', 'f', 90, 338],
    ['g_wrist', 'Polso e mano', 'wrist', 'f', 68, 386], ['g_glutes', 'Gluteo', 'hip', 'b', 170, 400],
    ['g_hip', 'Anca e inguine', 'hip', 'f', 146, 392], ['g_quad', 'Coscia davanti (quadricipite)', 'quad', 'f', 150, 452],
    ['g_hamstring', 'Coscia dietro (femorali)', 'hamstring', 'b', 152, 490], ['g_knee', 'Ginocchio', 'knee', 'f', 150, 556],
    ['g_calf', 'Polpaccio e tibia', 'calf', 'b', 150, 612], ['g_ankle', 'Caviglia e piede', 'ankle', 'f', 150, 704]
  ];
  const KIND_LBL = { muscolo: 'muscolo', tendine: 'tendine', articolazione: 'articolazione', legamento: 'legamento', cartilagine: 'cartilagine', osso: 'osso', colonna: 'colonna vertebrale', nervo: 'nervo', gruppo: 'gruppo di muscoli' };
  const S = [], BY = {};
  L.forEach(a => { const o = { id: a[0], name: a[1], zone: a[2], kind: a[3], v: a[4], x: a[5], y: a[6], c: !!a[7], full: true }; S.push(o); BY[o.id] = o; });
  G.forEach(a => { const o = { id: a[0], name: a[1], zone: a[2], kind: 'gruppo', v: a[3], x: a[4], y: a[5], c: false, full: false }; S.push(o); BY[o.id] = o; });
  const ZONE_G = { neck: 'g_neck', shoulder: 'g_shoulder', chest: 'g_chest', upper_back: 'g_upper_back', lower_back: 'g_lower_back', abdomen: 'g_abdomen', elbow: 'g_elbow', wrist: 'g_wrist', hip: 'g_hip', quad: 'g_quad', hamstring: 'g_hamstring', knee: 'g_knee', calf: 'g_calf', ankle: 'g_ankle' };
  const SIDE = { L: 'sinistro', R: 'destro', C: '' };
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  S.forEach(o => { o.n = norm(o.name + ' ' + (F.ZONES && F.ZONES[o.zone] || '') + ' ' + o.kind); });
  F.PX = { list: S, by: BY, KIND: KIND_LBL, SIDE, ZONE_G, TYPES: ['Acuto', 'Sordo', 'Bruciore', 'Formicolio', 'Rigidità', 'Scatto / schiocco'], WHEN: ['Durante lo sforzo', 'Dopo l\'allenamento', 'A riposo', 'Di notte'] };
  F.PX.on = () => true;

  const today = () => F.todayISO();
  /* stato attuale: ultima voce per struttura+lato (>0), più i dolori "vecchi" per zona senza dettaglio (valgono per entrambi i lati) */
  F.pxCur = function (p) {
    const log = (p.painX || []).map((e, i) => Object.assign({ i }, e)).filter(e => BY[e.s] && SIDE[e.sd] != null).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : ((a.at || 0) - (b.at || 0)) || a.i - b.i);
    const m = new Map(); log.forEach(e => m.set(e.s + '|' + e.sd, e));
    const out = [...m.values()].filter(e => e.l > 0).map(e => ({ s: e.s, sd: e.sd, l: e.l, ty: e.ty || '', wh: e.wh || '', date: e.date, zone: BY[e.s].zone, src: e.src || '' }));
    const detailed = new Set(log.map(e => BY[e.s].zone));
    Object.entries(p.pain || {}).forEach(([z, v]) => { if (v > 0 && ZONE_G[z] && !detailed.has(z)) ['L', 'R'].forEach(sd => out.push({ s: ZONE_G[z], sd, l: v, ty: '', wh: '', date: '', zone: z, legacy: true })); });
    return out;
  };
  F.pxLabel = e => { const o = BY[e.s]; return (o ? o.name : e.s) + (e.sd && e.sd !== 'C' ? ' ' + SIDE[e.sd] : ''); };
  F.pxLine = e => F.pxLabel(e) + ' ' + e.l + '/10' + (e.ty ? ' · ' + e.ty.toLowerCase() : '') + (e.wh ? ' · ' + e.wh.toLowerCase() : '');
  /* scrive un livello (0 = azzera); ricalcola il dolore per zona usato da schede, avvisi e storico */
  F.pxSet = function (p, s, sd, level, extra) {
    const o = BY[s]; if (!o) return [];
    level = Math.max(0, Math.min(10, Math.round(+level || 0)));
    p.painX = p.painX || []; p.pain = p.pain || {}; p.painLog = p.painLog || [];
    const before = Object.assign({}, p.pain), zone = o.zone;
    const hasDetail = p.painX.some(e => BY[e.s] && BY[e.s].zone === zone);
    if (!hasDetail && (p.pain[zone] || 0) > 0) ['L', 'R'].forEach(x => p.painX.push({ date: today(), s: ZONE_G[zone], sd: x, l: p.pain[zone], at: Date.now(), src: 'prima' }));
    const ent = Object.assign({ date: today(), s, sd, l: level, at: Date.now() }, extra || {});
    const prev = F.pxCur(p).find(e => e.s === s && e.sd === sd);
    if (prev) { if (ent.ty == null) ent.ty = prev.ty; if (ent.wh == null) ent.wh = prev.wh; }
    p.painX.push(ent);
    const lv = F.pxCur(p).filter(e => e.zone === zone).reduce((a, e) => Math.max(a, e.l), 0);
    if (lv > 0) p.pain[zone] = lv; else delete p.pain[zone];
    if ((before[zone] || 0) !== lv || !p.painLog.some(e => e.zone === zone)) p.painLog.push({ date: today(), zone, level: lv });
    return F.painReaction(before, p.pain).filter(m => m.startsWith(F.ZONES[zone]));
  };
  /* elimina del tutto un dolore inserito per sbaglio (non resta nello storico né nei backup) */
  F.pxPurge = function (p, s, sd) {
    const o = BY[s]; if (!o) return; const zone = o.zone; p.painX = p.painX || []; p.painDel = p.painDel || []; p.painLog = p.painLog || []; p.pain = p.pain || {};
    const key = e => [e.date, e.s, e.sd, e.l, e.at || ''].join('|');
    const hasDetail = p.painX.some(e => BY[e.s] && BY[e.s].zone === zone);
    if (!hasDetail) { const old = p.pain[zone]; delete p.pain[zone]; for (let i = p.painLog.length - 1; i >= 0; i--) if (p.painLog[i].zone === zone) { if (p.painLog[i].level === old) p.painLog.splice(i, 1); break; } return; }
    const idx = []; p.painX.forEach((e, i) => { if (e.s === s && e.sd === sd) idx.push(i); });
    const rm = []; for (let k = idx.length - 1; k >= 0; k--) { if (p.painX[idx[k]].l === 0) break; rm.push(idx[k]); }
    const gone = rm.map(i => p.painX[i]); gone.forEach(e => p.painDel.push(key(e))); p.painDel = p.painDel.slice(-300);
    p.painX = p.painX.filter((e, i) => !rm.includes(i));
    const lv = F.pxCur(p).filter(e => e.zone === zone).reduce((m, e) => Math.max(m, e.l), 0);
    if (lv > 0) p.pain[zone] = lv; else delete p.pain[zone];
    const minDate = gone.reduce((m, e) => !m || e.date < m ? e.date : m, ''), lvls = new Set(gone.map(e => e.l));
    for (let i = p.painLog.length - 1; i >= 0; i--) { const e = p.painLog[i]; if (e.zone === zone && e.date >= minDate && lvls.has(e.level) && e.level !== lv) p.painLog.splice(i, 1); }
  };
  F.pxMeta = function (p, s, sd, extra) {   // aggiorna tipo / momento senza creare una nuova voce di livello
    const e = (p.painX || []).slice().reverse().find(x => x.s === s && x.sd === sd); if (e) Object.assign(e, extra);
  };
  /* posizione sul corpo (coordinate 402×768) di una struttura per un lato */
  F.pxPos = function (o, sd) {
    if (o.c || sd === 'C') return [201, o.y];
    const front = o.v === 'f', left = sd === 'L';
    const screenLeft = front ? !left : left;   // davanti la destra della persona sta a sinistra dello schermo; dietro è il contrario
    return [screenLeft ? o.x : 402 - o.x, o.y];
  };
  F.pxSearch = function (q, limit) {
    const t = norm(q).split(' ').filter(Boolean); if (!t.length) return [];
    return S.filter(o => t.every(w => o.n.includes(w))).sort((a, b) => (a.full === b.full ? 0 : a.full ? 1 : -1) || a.name.localeCompare(b.name, 'it')).slice(0, limit || 10);
  };
  /* livelli per zona e lato dello schermo, per colorare solo il lato interessato */
  F.pxSideMap = function (p, view) {
    const m = {};
    F.pxCur(p).forEach(e => {
      const z = (m[e.zone] = m[e.zone] || { sl: 0, sr: 0 });
      if (e.sd === 'C') { z.sl = Math.max(z.sl, e.l); z.sr = Math.max(z.sr, e.l); return; }
      const left = e.sd === 'L', sl = view === 'f' ? !left : left;
      if (sl) z.sl = Math.max(z.sl, e.l); else z.sr = Math.max(z.sr, e.l);
    });
    return m;
  };
  const col = l => l >= 7 ? '#ef4444' : l >= 4 ? '#f97316' : l >= 1 ? '#facc15' : '#fff';
  /* segnaposti sul corpo: dolori attivi, punti della zona scelta, struttura selezionata (anello) */
  F.pxMarkers = function (view, p, st) {
    st = st || {}; let out = '';
    const cur = F.pxCur(p), sel = st.sel && BY[st.sel];
    const dot = (x, y, fill, id, r, ring) => `<g data-act="pxPick" data-id="${id}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="${r + 7}" fill="#000" fill-opacity=".001"/>${ring ? `<circle class="pxring" cx="${x}" cy="${y}" r="${r + 5}" fill="none" stroke="#fff" stroke-width="2.5"/>` : ''}<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="#111" stroke-width="1.5"/></g>`;
    if (st.zone) S.filter(o => o.zone === st.zone && o.full && o.v === view).forEach(o => { [o.c ? 'C' : 'L', 'R'].filter((v, i) => !(o.c && i)).forEach(sd => { const [x, y] = F.pxPos(o, sd); out += dot(x, y, 'rgba(255,255,255,.75)', o.id, 4.5); }); });
    cur.forEach(e => { const o = BY[e.s]; if (!o || o.v !== view) return; const [x, y] = F.pxPos(o, e.sd); out += dot(x, y, col(e.l), e.s, 6, false); });
    if (sel && sel.v === view) { const sds = sel.c ? ['C'] : ['L', 'R']; sds.forEach(sd => { const [x, y] = F.pxPos(sel, sd); const act = cur.find(e => e.s === sel.id && e.sd === sd); out += `<g pointer-events="none"><circle class="pxring" cx="${x}" cy="${y}" r="11" fill="none" stroke="#fff" stroke-width="3"/><circle cx="${x}" cy="${y}" r="5.5" fill="${col(act ? act.l : 0)}" stroke="#111" stroke-width="1.5"/></g>`; }); }
    return out;
  };
})(window.FORMA);
