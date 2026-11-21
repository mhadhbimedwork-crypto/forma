/* FORGIA – pagina web del nutrizionista (/nutri/). Stessi dati dell'app: ogni dato si salva subito sul profilo del cliente. */
(function () {
  'use strict';
  const F = window.FORMA, A = F.Account; let $app = document.getElementById('app'); let EMB = false;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = v => { if (v == null || v === '') return null; const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };
  const today = () => new Date().toISOString().slice(0, 10);
  const fmtD = d => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(d || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : (d || ''); };
  const KIND = { visit: 'Visita (peso)', circ: 'Circonferenze', skin: 'Pliche', bia: 'Bioimpedenza', lab: 'Esame', note: 'Nota' };
  const rest = (p, o) => A._rest(p, o);
  const st = { clients: [], cur: null, view: null, recs: [], tab: 'dati', form: null, msg: '' };

  /* ---------- salvataggio sicuro: nulla va perso ---------- */
  const PK = 'forgia.nutri.pending';
  const pend = () => { try { return JSON.parse(localStorage.getItem(PK) || '[]'); } catch (e) { return []; } };
  const setPend = a => { try { localStorage.setItem(PK, JSON.stringify(a)); } catch (e) { } };
  async function flush() {
    const q = pend(); if (!q.length || !A.me) return 0; const left = []; let done = 0;
    for (const it of q) { try { await rest('nutri_records', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(it) }); done++; } catch (e) { left.push(it); } }
    setPend(left); return done;
  }
  window.addEventListener('online', () => flush().then(n => { if (n && st.cur) openClient(st.cur.client_id, true); }));
  setInterval(() => { if (pend().length) flush().then(n => { if (n && st.cur) openClient(st.cur.client_id, true); }); }, 20000);
  window.addEventListener('beforeunload', e => { if (pend().length) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- finestra di conferma nella pagina ---------- */
  function confirmBox(text, okLabel) {
    return new Promise(res => {
      const d = document.createElement('div'); d.className = 'modal';
      d.innerHTML = '<div><p>' + esc(text) + '</p><div class="row" style="justify-content:flex-end"><button data-v="0">Annulla</button><button class="pri" data-v="1">' + esc(okLabel || 'Conferma') + '</button></div></div>';
      d.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; d.remove(); res(b.dataset.v === '1'); });
      document.body.appendChild(d);
    });
  }

  /* ---------- accesso ---------- */
  function viewLogin(err) {
    if (!EMB) { document.getElementById('out').hidden = true; document.getElementById('who').textContent = ''; }
    $app.innerHTML = '<div class="card login"><h2>Accesso nutrizionista</h2><label>Nome</label><input id="ln" autocomplete="username"><label style="margin-top:8px">Cognome</label><input id="ls"><label style="margin-top:8px">Password</label><input id="lp" type="password" autocomplete="current-password"><div class="save"><button class="pri" id="lgo">Entra</button><span class="msg bad" id="lerr">' + esc(err || '') + '</span></div></div>';
    const go = async () => { const b = document.getElementById('lgo'); b.disabled = true; try { await A.signIn(v('ln'), v('ls'), v('lp')); boot(); } catch (e) { viewLogin(e.message); } };
    document.getElementById('lgo').onclick = go; document.getElementById('lp').onkeydown = e => { if (e.key === 'Enter') go(); };
  }
  const v = id => (document.getElementById(id) || {}).value || '';
  function viewPw() {
    $app.innerHTML = '<div class="card login"><h2>Scegli la tua password</h2><p class="mut">Al primo accesso devi sostituire la password provvisoria (almeno 8 caratteri).</p><input id="p1" type="password" autocomplete="new-password"><div class="save"><button class="pri" id="pgo">Salva password</button><span class="msg bad" id="perr"></span></div></div>';
    document.getElementById('pgo').onclick = async () => { try { await A.changePassword(v('p1')); boot(); } catch (e) { document.getElementById('perr').textContent = e.message; } };
  }

  /* ---------- condizioni d'uso del professionista ---------- */
  async function termsOk() {
    try { const r = await rest('consents?user_id=eq.' + A.me.id + '&kind=eq.nutri_termini&version=eq.' + F.NUTRI_TERMS_VERSION + '&select=id&limit=1'); return !!(r && r.length); } catch (e) { return false; }
  }
  function viewTerms() {
    $app.innerHTML = '<div class="card login" style="max-width:680px"><h2>Condizioni d\'uso dell\'area professionale</h2>' + F.NUTRI_TERMS.map(t => '<h3>' + esc(t[0]) + '</h3><p style="margin:0">' + esc(t[1]) + '</p>').join('') + '<label class="row" style="margin-top:14px;gap:8px;align-items:flex-start;color:var(--ink);font-size:14px"><input type="checkbox" id="tchk" style="width:auto;margin-top:4px"><span>Ho letto e accetto le condizioni, e dichiaro di essere abilitato all\'esercizio della professione.</span></label><div class="save"><button class="pri" id="tgo">Accetto e continuo</button><span class="msg bad" id="terr"></span></div></div>';
    document.getElementById('tgo').onclick = async () => {
      if (!document.getElementById('tchk').checked) { document.getElementById('terr').textContent = 'Spunta la casella per continuare.'; return; }
      try { await rest('consents', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: A.me.id, kind: 'nutri_termini', version: F.NUTRI_TERMS_VERSION, recorded_by: A.me.id }) }); boot(); } catch (e) { document.getElementById('terr').textContent = e.message; }
    };
  }

  async function boot() {
    if (!A.enabled) { $app.innerHTML = '<div class="card">Server non configurato.</div>'; return; }
    if (!A.me) await A.restore();
    if (!A.me) return viewLogin();
    if (!A.isNutri()) { if (EMB) { $app.innerHTML = '<div class="card">Questa sezione è riservata ai nutrizionisti.</div>'; return; } await A.signOut(); return viewLogin('Questo accesso è riservato ai nutrizionisti.'); }
    if (A.me.must_change_password) return viewPw();
    if (!await termsOk()) return viewTerms();
    if (!EMB) { document.getElementById('who').textContent = A.me.full_name; const o = document.getElementById('out'); o.hidden = false;
      o.onclick = async () => { await A.signOut(); A.me = null; viewLogin(); }; }
    flush(); loadClients();
  }

  /* ---------- elenco clienti ---------- */
  async function loadClients(msg) {
    try { st.clients = await rest('rpc/nutri_clients', { method: 'POST', body: '{}' }); } catch (e) { st.clients = []; msg = e.message; }
    st.cur = null; renderList(msg);
  }
  function spark(ws) {
    if (!ws || ws.length < 2) return '';
    const v = ws.map(w => w.kg), mn = Math.min(...v), mx = Math.max(...v), W = 90, H = 24, r = (mx - mn) || 1;
    return '<svg width="' + W + '" height="' + H + '"><polyline fill="none" stroke="currentColor" stroke-width="1.6" points="' + v.map((x, i) => (i * W / (v.length - 1)).toFixed(1) + ',' + (H - 2 - (x - mn) / r * (H - 4)).toFixed(1)).join(' ') + '"/></svg>';
  }
  function renderList(msg) {
    const rows = st.clients.map(c => {
      const dl = c.status === 'active' && c.last_kg != null && c.first_kg != null ? Math.round((c.last_kg - c.first_kg) * 10) / 10 : null;
      const stt = c.status === 'active' ? '<span class="tag ok">Collegato</span>' : c.status === 'pending' ? '<span class="tag warn">In attesa del consenso</span>' : '<span class="tag bad">Revocato</span>';
      return '<tr class="' + (c.status === 'active' ? 'click' : '') + '" data-id="' + c.client_id + '"><td><b>' + esc(c.name) + '</b></td><td>' + stt + '</td><td>' + (c.first_kg != null ? c.first_kg + ' → ' + c.last_kg + ' kg' : '–') + '</td><td>' + (dl == null ? '' : '<span class="' + (dl > 0 ? 'warn' : 'ok') + '">' + (dl > 0 ? '+' : '') + dl + ' kg</span>') + '</td><td>' + esc(fmtD(c.last_date)) + '</td></tr>';
    }).join('');
    $app.innerHTML = '<div class="card"><div class="row"><h2 style="flex:1;margin:0">I tuoi clienti</h2><button id="xall" class="noprint">Scarica Excel (tutti)</button><button id="pall" class="noprint">PDF (tutti)</button></div>' +
      (st.clients.length ? '<table><tr><th>Cliente</th><th>Stato</th><th>Peso</th><th>Variazione</th><th>Ultima pesata</th></tr>' + rows + '</table>' : '<p class="mut">Nessun cliente collegato. Chiedi il collegamento qui sotto: il cliente deve accettarlo nella sua app.</p>') +
      (msg ? '<p class="msg bad">' + esc(msg) + '</p>' : '') + '</div>' +
      '<div class="card noprint"><h2>Collega un cliente</h2><input id="rq" placeholder="Scrivi nome o cognome dell\'atleta…" autocomplete="off" style="width:100%"><div id="rsug" style="display:flex;flex-direction:column;gap:8px;margin-top:8px"></div><div class="row" style="margin-top:8px"><button class="pri" id="rgo">Invia richiesta</button></div><p class="mut" style="font-size:13px">Il cliente riceve la richiesta nella sua app e sceglie se consentire anche diario alimentare e allenamenti. Pesi e misure sono visibili dopo l\'accettazione.</p><span id="rmsg" class="msg"></span></div>';
    $app.querySelectorAll('tr.click').forEach(tr => tr.onclick = () => openClient(tr.dataset.id));
    const ask = async uname => {
      try { const r = await rest('rpc/nutri_request', { method: 'POST', body: JSON.stringify({ uname }) }); await loadClients('Richiesta inviata a ' + r.name + '.'); } catch (e) { document.getElementById('rmsg').className = 'msg bad'; document.getElementById('rmsg').textContent = e.message; }
    };
    let qT = null;
    document.getElementById('rq').oninput = e => {
      clearTimeout(qT); const q = e.target.value.trim(), box = document.getElementById('rsug'); if (q.length < 2) { box.innerHTML = ''; return; }
      qT = setTimeout(async () => {
        try {
          const l = await rest('rpc/nutri_search', { method: 'POST', body: JSON.stringify({ q }) });
          box.innerHTML = l.length ? l.map(x => '<button type="button" class="sugbtn" data-u="' + esc(x.username) + '" ' + (x.linked ? 'disabled' : '') + '><b>' + esc(x.full_name) + '</b><span>' + (x.linked === 'active' ? 'già collegato' : x.linked === 'pending' ? 'richiesta in attesa' : 'Tocca per inviare la richiesta') + '</span></button>').join('') : '<p class="mut" style="margin:0;font-size:13px">Nessun atleta della tua palestra con questo nome. Se è di un\'altra palestra scrivi nome e cognome completi e premi "Invia richiesta".</p>';
          box.querySelectorAll('button[data-u]:not([disabled])').forEach(b => b.onclick = () => ask(b.dataset.u));
        } catch (er) { box.innerHTML = '<p class="msg bad" style="margin:0">Ricerca non riuscita: ' + esc(er.message || 'riprova') + '</p>'; }
      }, 250);
    };
    document.getElementById('rgo').onclick = () => {
      const t = v('rq').trim().split(/\s+/); if (t.length < 2) { document.getElementById('rmsg').className = 'msg bad'; document.getElementById('rmsg').textContent = 'Scegli un atleta dall\'elenco o scrivi nome e cognome completi.'; return; }
      ask((t[0] + '.' + t.slice(1).join('')).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9.]+/g, ''));
    };
    document.getElementById('xall').onclick = () => exportExcel(null);
    document.getElementById('pall').onclick = () => exportPdf(null);
  }

  /* ---------- dieta: scrivi, controlla, invia ---------- */
  let _nd = null, _ndFor = null;
  function ND() { if (!_nd || _ndFor !== st.cur.client_id) { _ndFor = st.cur.client_id; _nd = F.nutriDiet({ A, st, root: $app, rerender: () => renderClient(), confirmBox, fmtD }); } return _nd; }

  /* ---------- scheda cliente ---------- */
  async function openClient(id, keep) {
    const c = st.clients.find(x => x.client_id === id); if (!c) return;
    try {
      const [view, recs] = await Promise.all([rest('rpc/nutri_client_view', { method: 'POST', body: JSON.stringify({ cid: id }) }), rest('nutri_records?client_id=eq.' + id + '&deleted_at=is.null&select=id,kind,at,data,created_at,updated_at&order=at.desc,id.desc')]);
      st.cur = c; st.view = view; st.recs = recs; if (!keep) { st.tab = 'dati'; st.form = null; st.dd = null; st.ddOk = ''; } renderClient();
    } catch (e) { loadClients(e.message); }
  }
  const age = b => { if (!b) return null; const d = new Date(b); return isFinite(d) ? Math.floor((Date.now() - d) / 31557600000) : null; };
  const prof = () => { const p = st.view.profile || {}; const w = (st.view.weights || []).slice(-1)[0]; return { sex: p.sex === 'F' ? 'F' : 'M', age: age(p.birth), h: p.h, w: w ? w.kg : p.weight }; };
  function weightChart(ws) {
    if (!ws.length) return '<p class="mut">Nessuna pesata registrata dal cliente.</p>';
    const W = 640, H = 170, P = 28, v = ws.map(w => w.kg), mn = Math.min(...v) - 1, mx = Math.max(...v) + 1, r = mx - mn || 1;
    const x = i => P + (ws.length === 1 ? (W - 2 * P) / 2 : i * (W - 2 * P) / (ws.length - 1)), y = k => H - P - (k - mn) / r * (H - 2 * P);
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;max-width:' + W + 'px;color:var(--ac)"><polyline fill="none" stroke="currentColor" stroke-width="2" points="' + ws.map((w, i) => x(i).toFixed(1) + ',' + y(w.kg).toFixed(1)).join(' ') + '"/>' +
      ws.map((w, i) => '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(w.kg).toFixed(1) + '" r="3" fill="currentColor"><title>' + fmtD(w.date) + ': ' + w.kg + ' kg</title></circle>').join('') +
      '<text x="4" y="' + (P) + '" font-size="11" fill="var(--mut)">' + mx.toFixed(0) + ' kg</text><text x="4" y="' + (H - P + 4) + '" font-size="11" fill="var(--mut)">' + mn.toFixed(0) + ' kg</text></svg>';
  }
  function recSummary(r) {
    const d = r.data || {};
    if (r.kind === 'visit') return d.w != null ? d.w + ' kg' : '';
    if (r.kind === 'note') return esc(d.text || '');
    if (r.kind === 'lab') return esc(d.name) + ': <b>' + esc(d.value) + '</b> ' + esc(d.unit || '') + (d.lo != null || d.hi != null ? ' <span class="mut">(rif. ' + esc(d.lo == null ? '' : d.lo) + '–' + esc(d.hi == null ? '' : d.hi) + ')</span>' : '') + (F.nutriLabFlag(d) === 'high' ? ' <span class="bad">sopra</span>' : F.nutriLabFlag(d) === 'low' ? ' <span class="bad">sotto</span>' : '');
    const f = (F.NUTRI_FIELDS[r.kind] || []), lab = {}; f.forEach(a => lab[a[0]] = a);
    return Object.keys(d).filter(k => d[k] !== '' && d[k] != null).map(k => esc((lab[k] || [k, k])[1]) + ' ' + esc(d[k]) + (lab[k] ? ' ' + lab[k][2] : '')).join(' · ');
  }
  function derivedHtml(rec) {
    const p = prof(), d = F.nutriDerive({ sex: p.sex, age: p.age, h: p.h, w: p.w }, rec), o = [];
    if (d.bmi != null) o.push('BMI ' + d.bmi); if (d.whr != null) o.push('Vita/fianchi ' + d.whr); if (d.whtr != null) o.push('Vita/altezza ' + d.whtr);
    (d.skin || []).forEach(s => o.push(s.name + ': somma ' + s.sum + ' mm → massa grassa ' + s.bfPct + '%' + (s.fm != null ? ' (' + s.fm + ' kg)' : '')));
    if (d.pa != null) o.push('Angolo di fase ' + d.pa + '°' + (d.paDerived ? ' (da R e Xc)' : '')); if (d.ecwTbw != null) o.push('ECW/TBW ' + d.ecwTbw + '%'); if (d.hydration != null) o.push('TBW/FFM ' + d.hydration + '%');
    if (d.ffmi != null) o.push('FFMI ' + d.ffmi); if (d.fmi != null) o.push('FMI ' + d.fmi); if (d.fmPct != null) o.push('Massa grassa ' + d.fmPct + '%');
    return o.length ? '<div class="der">' + o.join(' · ') + '<div class="mut" style="font-size:12px;margin-top:4px">Calcolo da formule pubblicate: i valori sono strumenti di lavoro del professionista, non indicazioni dell\'app.</div></div>' : '';
  }
  function renderClient() {
    const c = st.cur, p = prof(), tabs = [['dati', 'Dati e peso'], ['rilev', 'Rilevazioni'], ['nuovo', 'Nuova rilevazione'], ['import', 'Importa da file/testo'], ['dieta', 'Dieta'], ['metab', 'Calcolatrice metabolismo']];
    if (c.scope_diary) tabs.push(['diario', 'Diario']); if (c.scope_training) tabs.push(['allen', 'Allenamenti']);
    let body = '';
    if (st.tab === 'dati') {
      const ws = st.view.weights || [], ms = st.view.measures || [];
      body = '<div class="card"><h2>Peso</h2>' + weightChart(ws) + '<table style="margin-top:8px"><tr><th>Data</th><th>Peso</th></tr>' + ws.slice().reverse().map(w => '<tr><td>' + fmtD(w.date) + '</td><td>' + w.kg + ' kg</td></tr>').join('') + '</table></div>' +
        '<div class="card"><h2>Misure registrate dal cliente</h2>' + (ms.length ? '<table><tr><th>Data</th><th>Valori</th></tr>' + ms.slice().reverse().map(m => '<tr><td>' + fmtD(m.date || m.d) + '</td><td>' + Object.keys(m).filter(k => !/^(date|d|id)$/.test(k)).map(k => esc(k) + ' ' + esc(m[k])).join(' · ') + '</td></tr>').join('') + '</table>' : '<p class="mut">Nessuna misura registrata dal cliente.</p>') + '</div>';
    } else if (st.tab === 'rilev') {
      body = '<div class="card"><h2>Rilevazioni salvate</h2>' + (st.recs.length ? '<table><tr><th>Data</th><th>Tipo</th><th>Valori</th><th class="noprint"></th></tr>' + st.recs.map(r => '<tr><td>' + fmtD(r.at) + '</td><td>' + KIND[r.kind] + '</td><td>' + recSummary(r) + '</td><td class="noprint" style="white-space:nowrap"><button data-ed="' + r.id + '">Modifica</button> <button class="dan" data-del="' + r.id + '">Elimina</button></td></tr>').join('') + '</table>' : '<p class="mut">Nessuna rilevazione ancora.</p>') + (pend().length ? '<p class="warn">' + pend().length + ' rilevazioni in attesa di connessione: saranno salvate appena la rete torna.</p>' : '') + '</div>';
    } else if (st.tab === 'nuovo') body = formHtml(st.form || { kind: 'visit', at: today(), data: {} });
    else if (st.tab === 'import') body = '<div class="card"><h2>Importa da file o testo</h2><p class="mut">Carica un file di testo/CSV esportato dallo strumento (bioimpedenziometro, plicometro…) oppure incolla il testo. Il programma riconosce i valori e li mostra: nulla viene salvato finché non confermi.</p><input type="file" id="imf" accept=".txt,.csv,.tsv,text/*"><textarea id="imt" rows="7" placeholder="Peso: 80,5 kg&#10;Angolo di fase: 6,5&#10;Acqua extracellulare: 18 l" style="margin-top:8px"></textarea><div class="save"><button id="imgo" class="pri">Riconosci i valori</button></div><div id="imres"></div></div>';
    else if (st.tab === 'dieta') { const nd = ND(); body = (st.ddOk ? '<p class="ok">' + esc(st.ddOk) + '</p>' : '') + nd.html(); }
    else if (st.tab === 'metab') body = metabHtml();
    else if (st.tab === 'diario') body = diaryHtml();
    else if (st.tab === 'allen') body = trainHtml();
    $app.innerHTML = '<div class="row noprint" style="margin-bottom:10px"><button id="back">← Clienti</button><h2 style="margin:0;flex:1">' + esc(c.name) + ' <span class="mut" style="font-weight:400;font-size:13px">' + (p.age != null ? p.age + ' anni · ' : '') + (p.h ? p.h + ' cm · ' : '') + (p.sex === 'F' ? 'F' : 'M') + '</span></h2><button id="xcl">Excel</button><button id="pcl">PDF</button></div>' +
      '<div class="tabs noprint">' + tabs.map(t => '<button data-tab="' + t[0] + '" class="' + (st.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div>' + body;
    document.getElementById('back').onclick = () => loadClients();
    document.getElementById('xcl').onclick = () => exportExcel(c.client_id); document.getElementById('pcl').onclick = () => exportPdf(c.client_id);
    $app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { st.tab = b.dataset.tab; if (st.tab === 'nuovo') st.form = null; renderClient(); });
    $app.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => { const r = st.recs.find(x => x.id == b.dataset.ed); st.form = { id: r.id, kind: r.kind, at: r.at, data: JSON.parse(JSON.stringify(r.data || {})) }; st.tab = 'nuovo'; renderClient(); });
    $app.querySelectorAll('[data-del]').forEach(b => b.onclick = () => delRec(b.dataset.del));
    if (st.tab === 'nuovo') bindForm(); if (st.tab === 'import') bindImport(); if (st.tab === 'metab') bindMetab(); if (st.tab === 'dieta') { const nd = ND(); nd.bind(); nd.load(); }
  }

  /* ---------- modulo di inserimento: ogni dato si conferma con Salva ---------- */
  function formHtml(f) {
    const d = f.data || {}, fld = (k, l, u) => '<div><label>' + l + (u ? ' (' + u + ')' : '') + '</label><input data-k="' + k + '" inputmode="decimal" value="' + esc(d[k] == null ? '' : d[k]) + '"></div>';
    let inner = '';
    if (f.kind === 'visit') inner = '<div class="grid">' + fld('w', 'Peso', 'kg') + '</div>';
    else if (f.kind === 'note') inner = '<label>Nota</label><textarea data-k="text" rows="4">' + esc(d.text || '') + '</textarea>';
    else if (f.kind === 'lab') inner = '<div class="grid"><div><label>Esame</label><input data-k="name" list="labs" value="' + esc(d.name || '') + '"><datalist id="labs">' + F.NUTRI_LABS.map(l => '<option value="' + esc(l[0]) + '">').join('') + '</datalist></div>' + fld('value', 'Valore') + '<div><label>Unità</label><input data-k="unit" value="' + esc(d.unit || '') + '"></div>' + fld('lo', 'Minimo di riferimento') + fld('hi', 'Massimo di riferimento') + '</div><p class="mut" style="font-size:12px">Gli intervalli di riferimento sono quelli scritti sul referto del laboratorio: l\'app li confronta soltanto.</p>';
    else inner = '<div class="grid">' + (F.NUTRI_FIELDS[f.kind] || []).map(a => fld(a[0], a[1], a[2])).join('') + '</div>';
    return '<div class="card"><h2>' + (f.id ? 'Modifica rilevazione' : 'Nuova rilevazione') + '</h2><div class="grid" style="margin-bottom:10px"><div><label>Tipo</label><select id="fk"' + (f.id ? ' disabled' : '') + '>' + Object.keys(KIND).map(k => '<option value="' + k + '"' + (k === f.kind ? ' selected' : '') + '>' + KIND[k] + '</option>').join('') + '</select></div><div><label>Data</label><input id="fat" type="date" value="' + esc(f.at || today()) + '"></div></div><div id="ff">' + inner + '</div><div id="fder">' + (['circ', 'skin', 'bia'].includes(f.kind) ? derivedHtml(recFromDom(f.kind, d)) : '') + '</div><div class="save"><button class="pri" id="fsave">Salva</button><button id="fnew">' + (f.id ? 'Annulla modifica' : 'Svuota') + '</button><span id="fmsg" class="msg"></span></div></div>';
  }
  function recFromDom(kind, d) { const o = {}; Object.keys(d || {}).forEach(k => o[k] = d[k]); const r = {}; if (kind === 'circ') r.circ = o; else if (kind === 'skin') r.skin = o; else if (kind === 'bia') r.bia = o; return r; }
  const FKEY = 'forgia.nutri.draft.';
  function readForm() { const data = {}; $app.querySelectorAll('#ff [data-k]').forEach(i => { const k = i.dataset.k; let val = i.value.trim(); if (val === '') return; data[k] = ['text', 'name', 'unit'].includes(k) ? val : (num(val) != null ? num(val) : val); }); return data; }
  function bindForm() {
    const f = st.form || (st.form = { kind: 'visit', at: today(), data: {} }), key = FKEY + st.cur.client_id;
    if (!f.id && !Object.keys(f.data).length) { try { const dr = JSON.parse(localStorage.getItem(key) || 'null'); if (dr && dr.kind) { st.form = f = dr; renderClient(); return; } } catch (e) { } }
    const upd = () => { f.data = readForm(); f.at = v('fat') || today(); const dv = document.getElementById('fder'); if (dv && ['circ', 'skin', 'bia'].includes(f.kind)) dv.innerHTML = derivedHtml(recFromDom(f.kind, f.data)); if (!f.id) { try { localStorage.setItem(key, JSON.stringify(f)); } catch (e) { } } };
    $app.querySelectorAll('#ff [data-k],#fat').forEach(i => i.oninput = upd);
    document.getElementById('fk').onchange = e => { st.form = { kind: e.target.value, at: v('fat') || today(), data: {} }; renderClient(); };
    document.getElementById('fnew').onclick = () => { try { localStorage.removeItem(key); } catch (e) { } st.form = null; if (f.id) st.tab = 'rilev'; renderClient(); };
    document.getElementById('fsave').onclick = async () => {
      upd(); const m = document.getElementById('fmsg'), b = document.getElementById('fsave');
      if (!Object.keys(f.data).length) { m.className = 'msg bad'; m.textContent = 'Compila almeno un campo.'; return; }
      if (f.kind === 'lab' && (!f.data.name || f.data.value == null)) { m.className = 'msg bad'; m.textContent = 'Servono nome e valore dell\'esame.'; return; }
      b.disabled = true; m.className = 'msg'; m.textContent = 'Salvataggio…';
      try { await saveRec(f); try { localStorage.removeItem(key); } catch (e) { } st.form = null; await openClient(st.cur.client_id, true); st.tab = 'rilev'; renderClient(); const mm = document.createElement('p'); mm.className = 'ok'; mm.textContent = 'Salvato sul profilo del cliente ✓'; $app.insertBefore(mm, $app.children[2]); setTimeout(() => mm.remove(), 4000); }
      catch (e) { b.disabled = false; m.className = 'msg bad'; m.textContent = e.offline ? 'Sei offline: il dato è tenuto al sicuro su questo dispositivo e verrà salvato appena torna la rete.' : 'Non salvato: ' + e.message; if (e.offline && !f.id) { setPend(pend().concat([{ client_id: st.cur.client_id, nutri_id: A.me.id, kind: f.kind, at: f.at, data: f.data }])); } }
    };
  }
  async function saveRec(f) {
    if (f.id) { await rest('nutri_records?id=eq.' + f.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ at: f.at, data: f.data }) }); return; }
    await rest('nutri_records', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ client_id: st.cur.client_id, nutri_id: A.me.id, kind: f.kind, at: f.at, data: f.data }) });
  }
  async function delRec(id) {
    if (!await confirmBox('Eliminare questa rilevazione? Resta nella cronologia e può essere recuperata dall\'assistenza.', 'Elimina')) return;
    try { await rest('nutri_records?id=eq.' + id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ deleted_at: new Date().toISOString(), deleted_by: A.me.id }) }); await openClient(st.cur.client_id, true); } catch (e) { alert('Non eliminato: ' + e.message); }
  }

  /* ---------- importazione da file/testo ---------- */
  const GROUPS = [['circ', 'circ.'], ['skin', 'skin.'], ['bia', 'bia.']];
  function bindImport() {
    const file = document.getElementById('imf'); file.onchange = async () => { if (file.files[0]) document.getElementById('imt').value = await file.files[0].text(); };
    document.getElementById('imgo').onclick = () => {
      const r = F.nutriParse(v('imt')), keys = Object.keys(r.found), box = document.getElementById('imres');
      if (!keys.length) { box.innerHTML = '<p class="bad">Nessun valore riconosciuto. Controlla che ogni riga sia nel formato «nome: valore unità».</p>'; return; }
      const rec = F.nutriApply({}, r.found);
      box.innerHTML = '<h3>Valori riconosciuti</h3><table>' + r.lines.map(l => '<tr><td>' + esc(l.raw) + '</td><td class="ok">→ ' + esc(l.key) + ' = ' + esc(l.value) + '</td></tr>').join('') + '</table>' + (r.unknown.length ? '<p class="mut">Righe non riconosciute (ignorate): ' + r.unknown.map(esc).join(' | ') + '</p>' : '') + '<div class="row"><div><label>Data</label><input id="imd" type="date" value="' + today() + '"></div></div><div class="save"><button class="pri" id="imsave">Salva questi valori</button><span id="immsg" class="msg"></span></div>';
      document.getElementById('imsave').onclick = async () => {
        const at = v('imd') || today(), m = document.getElementById('immsg'); m.textContent = 'Salvataggio…'; const todo = [];
        GROUPS.forEach(g => { if (rec[g[0]] && Object.keys(rec[g[0]]).length) todo.push({ kind: g[0], at, data: rec[g[0]] }); });
        if (rec.w != null) todo.push({ kind: 'visit', at, data: { w: rec.w } });
        try { for (const f of todo) await saveRec(f); await openClient(st.cur.client_id, true); st.tab = 'rilev'; renderClient(); } catch (e) { m.className = 'msg bad'; m.textContent = 'Non salvato: ' + e.message; }
      };
    };
  }

  /* ---------- calcolatrice del metabolismo ---------- */
  function metabHtml() {
    const p = prof(), b = (st.recs.find(r => r.kind === 'bia' && r.data && r.data.ffm) || {}).data || {};
    return '<div class="card"><h2>Calcolatrice del metabolismo</h2><p class="mut">Formule pubblicate per il professionista. L\'app non indica quante calorie assumere: la scelta è tua.</p><div class="grid"><div><label>Peso (kg)</label><input id="mw" value="' + esc(p.w || '') + '"></div><div><label>Altezza (cm)</label><input id="mh" value="' + esc(p.h || '') + '"></div><div><label>Età</label><input id="ma" value="' + esc(p.age || '') + '"></div><div><label>Sesso</label><select id="ms"><option value="M"' + (p.sex === 'M' ? ' selected' : '') + '>M</option><option value="F"' + (p.sex === 'F' ? ' selected' : '') + '>F</option></select></div><div><label>Massa magra (kg, facoltativa)</label><input id="mf" value="' + esc(b.ffm || '') + '"></div><div><label>Livello di attività (moltiplicatore)</label><input id="ml" placeholder="es. 1,5"></div></div><div id="mout" class="der"></div></div>';
  }
  function bindMetab() {
    const calc = () => { const r = F.nutriBMR({ w: v('mw'), h: v('mh'), age: v('ma'), sex: v('ms'), ffm: v('mf'), laf: v('ml') }); document.getElementById('mout').innerHTML = r.length ? r.map(o => esc(o.name) + ': <b>' + o.kcal + ' kcal</b>' + (o.total ? ' · con attività ' + o.total + ' kcal' : '')).join('<br>') : 'Inserisci peso, altezza ed età.'; };
    $app.querySelectorAll('#mw,#mh,#ma,#ms,#mf,#ml').forEach(i => i.oninput = calc); calc();
  }

  /* ---------- diario e allenamenti: solo se il cliente li ha consentiti ---------- */
  function diaryHtml() {
    const days = (st.view.nutrition && st.view.nutrition.days) || {}, ks = Object.keys(days).sort().reverse(), M = ['Colazione', 'Pranzo', 'Spuntino', 'Cena'];
    const tot = d => { let k = 0, p = 0, c = 0, f = 0; (days[d].meals || []).forEach(m => (m || []).forEach(i => { k += i.k || 0; p += i.p || 0; c += i.c || 0; f += i.f || 0; })); return [Math.round(k), Math.round(p), Math.round(c), Math.round(f)]; };
    return '<div class="card"><h2>Diario alimentare (consentito dal cliente)</h2><p class="mut" style="font-size:13px">Ultimi 90 giorni, aggiornato quando il cliente sincronizza l\'app. I valori sono quelli registrati dal cliente.</p>' + (ks.length ? '<table><tr><th>Giorno</th><th>Pasti</th><th>Totale</th></tr>' + ks.map(k => { const t = tot(k); return '<tr><td>' + fmtD(k) + '</td><td>' + (days[k].meals || []).map((m, i) => (m && m.length ? M[i] + ': ' + m.map(it => esc(it.n) + (it.g ? ' ' + it.g + ' g' : it.q ? ' ×' + it.q : '')).join(', ') : '')).filter(Boolean).join('<br>') + '</td><td>' + t[0] + ' kcal<br><span class="mut">P ' + t[1] + ' · C ' + t[2] + ' · G ' + t[3] + '</span></td></tr>'; }).join('') + '</table>' : '<p class="mut">Il cliente non ha ancora registrato giorni o non ha ancora sincronizzato.</p>') + '</div>';
  }
  function trainHtml() {
    const ss = (st.view.sessions || []).slice(-30).reverse();
    return '<div class="card"><h2>Allenamenti (consentiti dal cliente)</h2>' + (ss.length ? '<table><tr><th>Data</th><th>Seduta</th></tr>' + ss.map(s => '<tr><td>' + fmtD(s.date || s.d) + '</td><td>' + esc(s.name || s.day || s.title || '') + (s.sets ? ' · ' + s.sets.length + ' serie' : '') + '</td></tr>').join('') + '</table>' : '<p class="mut">Nessuna seduta registrata.</p>') + '</div>';
  }

  /* ---------- export: Excel e PDF con tutti i dati ---------- */
  async function collect(id) {
    const list = id ? st.clients.filter(c => c.client_id === id) : st.clients.filter(c => c.status === 'active'), out = [];
    for (const c of list) { try { const [view, recs] = await Promise.all([rest('rpc/nutri_client_view', { method: 'POST', body: JSON.stringify({ cid: c.client_id }) }), rest('nutri_records?client_id=eq.' + c.client_id + '&deleted_at=is.null&select=id,kind,at,data&order=at.asc,id.asc')]); out.push({ c, view, recs }); } catch (e) { } }
    return out;
  }
  async function exportExcel(id) {
    const all = await collect(id), sum = [], pes = [], rl = [], calc = [];
    all.forEach(({ c, view, recs }) => {
      const ws = view.weights || [], p = view.profile || {};
      sum.push([c.name, p.sex || '', age(p.birth), p.h || '', ws.length ? ws[0].kg : '', ws.length ? ws[ws.length - 1].kg : '', ws.length > 1 ? Math.round((ws[ws.length - 1].kg - ws[0].kg) * 10) / 10 : '', ws.length ? fmtD(ws[ws.length - 1].date) : '']);
      ws.forEach(w => pes.push([c.name, fmtD(w.date), w.kg]));
      (view.measures || []).forEach(m => Object.keys(m).filter(k => !/^(date|d|id)$/.test(k)).forEach(k => rl.push([c.name, fmtD(m.date || m.d), 'Misura del cliente', k, m[k], ''])));
      recs.forEach(r => {
        const d = r.data || {}, lab = {}; (F.NUTRI_FIELDS[r.kind] || []).forEach(a => lab[a[0]] = a);
        if (r.kind === 'lab') rl.push([c.name, fmtD(r.at), 'Esame', d.name, d.value, d.unit || '', d.lo == null ? '' : d.lo, d.hi == null ? '' : d.hi]);
        else if (r.kind === 'note') rl.push([c.name, fmtD(r.at), 'Nota', '', d.text, '']);
        else Object.keys(d).forEach(k => rl.push([c.name, fmtD(r.at), KIND[r.kind], (lab[k] || [k, k])[1], d[k], (lab[k] || [0, 0, ''])[2]]));
        if (['circ', 'skin', 'bia'].includes(r.kind)) {
          const w = (ws.filter(x => x.date <= r.at).slice(-1)[0] || ws[ws.length - 1] || {}).kg, x = F.nutriDerive({ sex: p.sex === 'F' ? 'F' : 'M', age: age(p.birth), h: p.h, w }, recFromDom(r.kind, d));
          const add = (n, val, u) => { if (val != null) calc.push([c.name, fmtD(r.at), n, val, u || '']); };
          add('BMI', x.bmi); add('Vita/fianchi', x.whr); add('Vita/altezza', x.whtr); (x.skin || []).forEach(s => { add(s.name + ' – somma pliche', s.sum, 'mm'); add(s.name + ' – massa grassa', s.bfPct, '%'); add(s.name + ' – massa grassa', s.fm, 'kg'); add(s.name + ' – massa magra', s.ffm, 'kg'); });
          add('Angolo di fase', x.pa, '°'); add('ECW/TBW', x.ecwTbw, '%'); add('TBW/FFM', x.hydration, '%'); add('FFMI', x.ffmi); add('FMI', x.fmi); add('Massa grassa', x.fmPct, '%');
        }
      });
    });
    const blob = F.xlsxBuild([{ name: 'Clienti', cols: ['Cliente', 'Sesso', 'Età', 'Altezza cm', 'Peso iniziale kg', 'Ultimo peso kg', 'Variazione kg', 'Ultima pesata'], rows: sum }, { name: 'Pesi', cols: ['Cliente', 'Data', 'Peso kg'], rows: pes }, { name: 'Rilevazioni', cols: ['Cliente', 'Data', 'Tipo', 'Voce', 'Valore', 'Unità', 'Rif. min', 'Rif. max'], rows: rl }, { name: 'Calcoli', cols: ['Cliente', 'Data', 'Calcolo', 'Valore', 'Unità'], rows: calc }]);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'FORGIA-nutrizionista-' + (id ? (all[0] ? all[0].c.name.replace(/\s+/g, '-') : 'cliente') : 'tutti') + '-' + today() + '.xlsx'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  async function exportPdf(id) {
    const all = await collect(id), w = window.open('', '_blank'); if (!w) { alert('Consenti le finestre popup per scaricare il PDF.'); return; }
    const css = 'body{font:13px/1.4 system-ui,sans-serif;color:#000;margin:18px}h1{font-size:18px;margin:0 0 4px}h2{font-size:15px;margin:18px 0 6px;border-bottom:1px solid #999}table{border-collapse:collapse;width:100%;margin-bottom:6px}th,td{border:1px solid #bbb;padding:3px 6px;text-align:left;font-size:12px}.pb{page-break-after:always}@media print{.no{display:none}}';
    let h = '<!doctype html><meta charset="utf-8"><title>FORGIA – dati clienti</title><style>' + css + '</style><button class="no" onclick="print()">Stampa / Salva come PDF</button><h1>Dati clienti – ' + esc(A.me.full_name) + '</h1><div>Generato il ' + fmtD(today()) + '</div>';
    all.forEach(({ c, view, recs }, i) => {
      const ws = view.weights || [], p = view.profile || {};
      h += '<div class="' + (i < all.length - 1 ? 'pb' : '') + '"><h2>' + esc(c.name) + ' — ' + (age(p.birth) != null ? age(p.birth) + ' anni, ' : '') + (p.h ? p.h + ' cm, ' : '') + esc(p.sex || '') + '</h2>' +
        '<b>Peso</b><table><tr><th>Data</th><th>kg</th></tr>' + ws.map(x => '<tr><td>' + fmtD(x.date) + '</td><td>' + x.kg + '</td></tr>').join('') + '</table>' +
        '<b>Rilevazioni</b><table><tr><th>Data</th><th>Tipo</th><th>Valori</th></tr>' + recs.map(r => '<tr><td>' + fmtD(r.at) + '</td><td>' + KIND[r.kind] + '</td><td>' + recSummary(r) + '</td></tr>').join('') + '</table></div>';
    });
    w.document.write(h); w.document.close(); setTimeout(() => w.print(), 400);
  }

  /* Dentro l'app: stessa sessione dell'allenatore, nessun secondo accesso. */
  F.NutriApp = { mount(el) {
    if (!el) return; EMB = true; $app = el;
    if (A.me && A.isNutri() && !A.me.must_change_password && st.clients.length + (st.cur ? 1 : 0)) { if (st.cur) renderClient(); else renderList(); return; }
    boot();
  } };
  if (document.getElementById('who')) boot();
})();
