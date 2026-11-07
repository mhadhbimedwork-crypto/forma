/* FORGIA – interfaccia. Dati salvati sul dispositivo (localStorage). */
(function (F) {
  'use strict';
  const GYM = window.FORMA_GYM || null, BRAND = GYM ? GYM.name : 'FORGIA';
  const KEY = GYM ? GYM.key : 'forma.v1';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = s => document.querySelector(s);
  let mem = null;
  const AC = F.Account, keyNow = () => KEY + (AC.enabled && AC.me ? '.' + AC.me.id : '');
  const emptyState = () => ({ profiles: [], active: null, settings: { aiUrl: '' } });
  function load() {
    if (AC.enabled && !AC.me) return emptyState();
    try { const r = localStorage.getItem(keyNow()); if (r) return JSON.parse(r); } catch (e) { if (mem) return mem; }
    /* rete di sicurezza: copia fatta prima dell'ultimo aggiornamento */
    try { const r = localStorage.getItem(keyNow() + '.pre'); if (r) return JSON.parse(r); } catch (e) { }
    return emptyState();
  }
  const nameTok = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().split(/\s+/)[0];
  const isMine = p => !!(p && AC.me && nameTok(p.name) && nameTok(p.name) === nameTok(AC.me.full_name));
  const nSess = p => ((p && p.sessions) || []).length;
  /** Cerca su questo telefono ogni copia salvata dell'app e ne elenca i profili che hanno allenamenti (per recuperarli). */
  function scanLocal() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i); if (!/^(forma|tlz)\.v1/.test(k)) continue; let o; try { o = JSON.parse(localStorage.getItem(k)); } catch (e) { continue; }
      const profs = o && Array.isArray(o.profiles) ? o.profiles : (o && o.name && Array.isArray(o.sessions) ? [o] : []);
      profs.forEach((p, j) => { if (!p || !p.name || !(p.sessions || []).length) return; const ds = p.sessions.map(s => s.date || '').sort(); out.push({ k, j, name: p.name, birth: p.birth || '', n: p.sessions.length, last: ds[ds.length - 1] || '' }); });
    }
    return out;
  }
  function legacyRead() { if (!(AC.enabled && AC.me)) return null; try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  let S = load(), syncT = null;
  function save() {
    if (AC.enabled && !AC.me) return;
    mem = S; try { localStorage.setItem(keyNow(), JSON.stringify(S)); } catch (e) { /* senza storage resta in memoria */ }
    if (AC.enabled && AC.me) { lsSet(dkey(), String(Date.now())); updSync(); clearTimeout(syncT); syncT = setTimeout(syncUp, 4000); }
  }
  /* sincronizzazione: i dati restano sul telefono e partono da soli appena c'è rete; se un altro dispositivo ha scritto, le due copie si uniscono */
  const dkey = () => 'forgia.dirty.' + (AC.me ? AC.me.id : ''), vkey = () => 'forgia.sv.' + (AC.me ? AC.me.id : '');
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };
  const isDirty = () => !!(AC.enabled && AC.me && lsGet(dkey()));
  let syncBusy = false, syncAgain = false;
  function syncText() {
    if (!(AC.enabled && AC.me)) return '';
    if (!AC.isAdmin()) return navigator.onLine === false ? 'Offline · puoi continuare a usare l\'app' : '';   // clienti e allenatori non vedono stato server/sincronizzazione: solo l'amministratore
    const hm = t => new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    if (navigator.onLine === false) return isDirty() ? 'Offline · dati salvati sul telefono, si inviano da soli appena torna la rete' : 'Offline · puoi continuare, i dati restano sul telefono';
    if (syncBusy) return 'Sincronizzo…';
    if (isDirty()) return ui.syncErr ? 'Da inviare · riprovo da solo' : 'Da inviare…';
    return ui.syncAt ? 'Sincronizzato alle ' + hm(ui.syncAt) : 'Dati al sicuro sul server';
  }
  function updSync() { const n = document.getElementById('syncLine'); if (n) n.textContent = syncText(); }
  async function syncUp() {
    const p = P(); if (!p || !(AC.enabled && AC.me) || navigator.onLine === false || (AC.imp && AC.imp() && !AC.imp().write)) { updSync(); return; }
    if (syncBusy) { syncAgain = true; return; }
    syncBusy = true; updSync(); const t0 = Date.now();
    try {
      const srv = await AC.pullMine(), d = srv && srv.data;
      if (ui.pushOkFor !== AC.me.id + p.id) {   // mai sovrascrivere sul server i dati di un'altra persona
        if (d && d.name && p.name && d.birth && p.birth && String(d.name).trim().toLowerCase() !== String(p.name).trim().toLowerCase() && d.birth !== p.birth) { ui.syncErr = 'Il profilo su questo dispositivo non è quello del tuo account: non sincronizzato'; return; }
        ui.pushOkFor = AC.me.id + p.id;
      }
      let merged = false;
      if (srv && d && d.name && srv.version != null && String(srv.version) !== lsGet(vkey())) {   // un altro dispositivo ha scritto: unione, senza perdere nulla
        const sn = F.normalizeProfile(Object.assign({}, d, { id: p.id })), m = F.mergeProfiles(sn, p);
        Object.assign(p, sn, p, { sessions: m.sessions, painLog: m.painLog, weights: m.weights, measures: m.measures, plans: m.plans, pain: m.pain }); merged = true;
        try { localStorage.setItem(keyNow(), JSON.stringify(S)); } catch (e) { }
      }
      const r = await AC.pushMine(p); const v = r && r[0] && r[0].version; if (v != null) lsSet(vkey(), String(v));
      ui.syncAt = Date.now(); ui.syncErr = null; setTimeout(repairPlans, 300);
      if (+lsGet(dkey()) <= t0) { try { localStorage.removeItem(dkey()); } catch (e) { } }
      if (merged && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) render();
    } catch (e) { ui.syncErr = e.message; }
    finally { syncBusy = false; updSync(); if (syncAgain) { syncAgain = false; setTimeout(syncUp, 500); } }
  }
  /* una volta per accesso: rilegge con le regole attuali le schede ricevute dall'allenatore (testo originale sul server) e corregge quelle lette male */
  let repairDone = false;
  async function repairPlans() {
    const p = P(); if (repairDone || !p || !(AC.enabled && AC.me) || navigator.onLine === false) return; repairDone = true;
    let n = 0;
    try {
      for (const pl of p.plans || []) {
        if (pl.pv >= 3) continue;
        let body = pl.body || null;
        if (!body && pl.assignedId) body = await AC._rest('assigned_plans?id=eq.' + encodeURIComponent(pl.assignedId) + '&select=body').then(r => r && r[0] && r[0].body).catch(() => null);
        if (body) { try { n += F.repairPlan(pl, body); } catch (e) { } }
        pl.pv = 3;
      }
    } catch (e) { repairDone = false; return; }
    if (n || (p.plans || []).some(x => x.pv === 3)) { save(); if (n) render(); }
  }
  window.addEventListener('online', () => { updSync(); if (isDirty() || AC.me) syncUp(); });
  window.addEventListener('offline', updSync);
  setInterval(() => { if (isDirty() && navigator.onLine !== false) syncUp(); else updSync(); }, 30000);
  const P = () => S.profiles.find(p => p.id === S.active) || null;
  const srcLine = x => x && x.src && (x.tech || x.pct || x.rpe || x.alt || /[+@%]/.test(x.src)) ? `<div class="small" style="color:var(--mute);margin:1px 0">Scheda: <b>${esc(x.src)}</b></div>` : '';
  const planOf = p => { const pl = p && p.plans.find(x => x.id === p.activePlan) || null; if (pl) { try { F.fixTopset(pl); if (pl.block) F.applyWeek(pl, F.blockWeek(pl)); if (pl.comp && p && !p.gara) p.gara = { kind: pl.comp }; } catch (e) {} } return pl; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const ui = { tab: 'home', sub: null, zone: null, msgs: [], timer: null, tick: null };
  let toastT;
  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 3200); }
  const fmt = (n, d) => (Math.round(n * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toLocaleString('it-IT');
  const GOALS = { auto: 'Guidato dai miei dati (consigliato)', recomp: 'Definizione + massa magra (ricomposizione)', cut: 'Dimagrire / definizione', mass: 'Mettere massa muscolare', strength: 'Forza' };
  const STYLES = { cali: 'Calisthenics', gym: 'Palestra (pesi/macchine)', mix: 'Palestra + calisthenics' };
  const LEVELS = { 1: 'Principiante', 2: 'Intermedio', 3: 'Avanzato' };
  F.LABELS = { GOALS, STYLES, LEVELS };
  const ICON = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/></svg>',
    plan: '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
    body: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.5"/><path d="M12 8v7M7 10l5-2 5 2M9 21l3-6 3 6"/></svg>',
    chart: '<svg viewBox="0 0 24 24"><path d="M4 20V4M4 20h16M8 16l4-5 3 3 5-7"/></svg>',
    diet: '<svg viewBox="0 0 24 24"><path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8M7 7h4M17 3c-2 2-3 5-3 8h3v10"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>'
  };

  /* ---------- helper dati ---------- */
  function histFor(p, exId) {
    return (p.sessions || []).map(s => { const e = s.ex.find(x => x.exId === exId); return e ? { date: s.date, sets: e.sets } : null; }).filter(Boolean);
  }
  function bodyView(e) { return e && e.prim.some(m => ['lats', 'upback', 'lowback', 'hams', 'glutes', 'triceps'].includes(m)) ? 'b' : 'f'; }
  function exPic(x) {
    const e = F.EXMAP[x.exId];
    if (!e) return `<div class="pic mute small" style="text-align:center">?</div>`;
    return `<div class="pic">${F.bodySVG(bodyView(e), { prim: e.prim, sec: e.sec })}</div>`;
  }
  function lineChart(pts, unit) {
    if (pts.length < 2) return '<p class="mute small">Servono almeno 2 misurazioni per il grafico.</p>';
    const W = 320, H = 150, pl = 34, pb = 22, pt = 10, pr = 8;
    const ys = pts.map(p => p.y), mn = Math.min(...ys), mx = Math.max(...ys), rg = (mx - mn) || 1;
    const X = i => pl + i * (W - pl - pr) / (pts.length - 1), Y = y => pt + (H - pt - pb) * (1 - (y - mn) / rg);
    const path = pts.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.y).toFixed(1)).join(' ');
    const dots = pts.map((p, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="3" fill="var(--accent)"><title>${esc(p.x)}: ${p.y} ${unit}</title></circle>`).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Andamento in ${unit}">
      <line x1="${pl}" y1="${H - pb}" x2="${W - pr}" y2="${H - pb}" stroke="var(--line)"/><line x1="${pl}" y1="${pt}" x2="${pl}" y2="${H - pb}" stroke="var(--line)"/>
      <text x="${pl - 4}" y="${pt + 4}" font-size="9" fill="var(--mute)" text-anchor="end">${fmt(mx, 1)}</text>
      <text x="${pl - 4}" y="${H - pb}" font-size="9" fill="var(--mute)" text-anchor="end">${fmt(mn, 1)}</text>
      <text x="${pl}" y="${H - 6}" font-size="9" fill="var(--mute)">${esc(pts[0].x.slice(5))}</text>
      <text x="${W - pr}" y="${H - 6}" font-size="9" fill="var(--mute)" text-anchor="end">${esc(pts[pts.length - 1].x.slice(5))}</text>
      <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linejoin="round"/>${dots}</svg>`;
  }
  const msgs = list => list.map(f => `<div class="msg ${f.k || ''}">${esc(f.t)}</div>`).join('');

  function sickCard() {
    return `<div class="card" style="border-color:var(--danger)"><h2>Fermati adesso</h2>
      <ol class="small" style="padding-left:18px;margin:0 0 8px"><li>Siediti o sdraiati con le gambe in alto. Non restare in piedi.</li><li>Respira lento: 4 secondi dentro dal naso, 6 fuori dalla bocca.</li><li>Bevi acqua a piccoli sorsi e mangia qualcosa di zuccherato (frutta, succo, 2-3 datteri).</li><li>Esci all'aria aperta se la sala è chiusa e calda.</li></ol>
      <div class="msg danger small">Chiama il 118 se hai dolore al petto, palpitazioni forti, svenimento, difficoltà a parlare o debolezza da un solo lato, o se non passa in 15 minuti.</div>
      <div class="row wrap" style="margin-top:8px"><button class="sm primary" data-act="sickLog">Registra l'episodio</button><button class="sm" data-act="sickClose">Chiudi</button></div></div>`;
  }
  function rmInput(p, x) {
    if (!x.pct || !x.exId) return '';
    if (!F.rmActive(p)) return '<div class="msg warn small">Per ora i carichi in percentuale del massimale non sono attivi per te: segui i kg o le sensazioni indicate dall\'allenatore. Li attiva lui quando sarà il momento.</div>';
    const t = F.pctTarget(p, x), cur = p.rm && p.rm[x.exId] || '';
    const hint = t && !t.need ? `<span class="mute small">${t.rm.src === 'manuale' ? 'tuo valore' : 'stimato dalle tue serie'}: modificalo se vuoi</span>` : '<span class="mute small">La scheda indica una percentuale: inserisci il tuo massimale (1RM) per avere i kg. Se non lo conosci, fai la prima seduta leggera e lo stimo io.</span>';
    return `<div class="row wrap" style="margin:4px 0"><label style="margin:0">1RM kg</label><input inputmode="decimal" style="width:80px" data-rm="${x.exId}" value="${cur}" placeholder="${t && t.rm ? t.rm.kg : ''}" aria-label="Massimale ${esc(x.name)}">${hint}</div>`;
  }

  /* ---------- backup ---------- */
  const fdate = d => d ? d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  function backupCard() {
    const b = F.backupInfo(S), nat = F.isNative(), fs = F.fsSupported();
    const state = b.last ? `Ultimo backup: <b>${fdate(b.last)}</b> (${esc(b.where || '')}). ` : 'Nessun backup ancora. ';
    const next = b.due ? '<span class="chip warn">scaduto: fallo ora</span>' : `Prossimo: ${fdate(b.next)}`;
    const dir = ui.bkDir ? `Cartella del PC collegata: <b>${esc(ui.bkDir)}</b>` : '';
    return `<p class="small">${state}${next}</p>
      <p class="small mute">Per ogni profilo viene creata una cartella col suo nome con 4 file: <b>.json</b> (completo, modificabile, reimportabile), <b>.md</b> (riepilogo leggibile), <b>.csv</b> sedute e peso (Excel).</p>
      ${fs ? `<p class="small">${dir || `Collega una cartella del PC (es. Desktop/Allenamento/Backup): da lì in poi il backup si scrive da solo ogni giorno, alla prima apertura dell'app.`}</p>
      <div class="row wrap"><button class="sm primary" data-act="bkPick">${ui.bkDir ? 'Cambia cartella' : 'Scegli cartella del PC'}</button>${ui.bkDir ? '<button class="sm" data-act="bkForget">Scollega</button>' : ''}</div>` : ''}
      ${nat ? `<p class="small">Sul telefono il backup viene salvato in <b>Documenti/FORGIA-Backup</b> ogni giorno, alla prima apertura dell'app.</p>` : ''}
      <div class="row wrap" style="margin-top:8px"><button class="sm ${fs ? '' : 'primary'}" data-act="bkNow">Fai il backup adesso</button>${nat || F.canWebShare() ? '<button class="sm" data-act="bkShare">Salva su Drive / invia (Condividi)</button>' : ''}</div>
      ${!fs && !nat ? '<p class="mute small">Questo browser non può scrivere nelle cartelle del PC: usa Chrome o Edge sul computer, oppure i file vengono scaricati in Download.</p>' : ''}
      <p class="mute small">I dati del telefono e quelli del PC sono separati: per spostare un profilo da un dispositivo all\'altro importa il suo file .json.</p>`;
  }
  function backupBanner() {
    const b = F.backupInfo(S); if (!b.due || ui.bkHide) return '';
    return `<div class="card" style="border-color:var(--warn)"><b>Backup da fare</b><div class="small">${b.last ? 'Oggi il backup non è ancora stato fatto.' : 'Non hai ancora fatto nessun backup dei tuoi dati.'}</div>
      <div class="row wrap" style="margin-top:8px"><button class="sm primary" data-act="bkNow">Backup adesso</button>${F.isNative() || F.canWebShare() ? '<button class="sm" data-act="bkShare">Invia su Drive / WhatsApp</button>' : ''}<button class="sm" data-act="bkLater">Più tardi</button></div></div>`;
  }
  async function refreshDir() { if (!F.fsSupported()) return; const h = await F.getDir(); ui.bkDir = h ? h.name : null; }
  async function autoBackup() {
    if (!S.profiles.length) return;
    if (!S.settings.backup) { S.settings.backup = { since: new Date().toISOString() }; save(); }
    await refreshDir();
    if (F.backupInfo(S).due) { const r = await F.runBackup(S, { interactive: false }); if (r.ok) { save(); toast('Backup automatico fatto: ' + r.where); } }
    render();
  }

  const GOAL_SHORT = { recomp: 'Definizione e massa magra', cut: 'Dimagrire', mass: 'Massa muscolare', strength: 'Forza' };
  function goalLabel(p) { return p.goal === 'auto' ? 'Automatico · ' + (GOAL_SHORT[F.effGoal(p)] || '') : GOALS[p.goal].split(' (')[0]; }
  /* ---------- VISTE ---------- */
  function header() {
    const p = P(), opts = S.profiles.map(x => `<option value="${x.id}" ${x.id === S.active ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
    const brand = `<div class="brandrow">${GYM ? `<img class="gymlogo" src="icons/gym/mark.png" alt="${esc(BRAND)}">` : `<img src="icons/mark.png" alt="" width="28" height="28"><span class="brand">${esc(BRAND)}</span>`}<span class="tag">${GYM ? esc(GYM.tag) : 'NO PAIN · NO GAIN'}</span></div>${AC.enabled && AC.me ? `<div class="syncline" id="syncLine" role="status">${esc(syncText())}</div>` : ''}`;
    if (!p) return `<header class="top">${brand}${AC.enabled && AC.me ? '<div style="position:absolute;right:var(--gutter);top:calc(env(safe-area-inset-top) + 22px)">' + X.menuBtn() + '</div>' : ''}</header>`;
    const c = F.calc(p);
    return `<header class="top">${brand}
      <div class="who"><div class="avatar" aria-hidden="true">${esc(p.name.trim().charAt(0).toUpperCase())}</div>
        <div class="grow"><div class="wname">${esc(p.name)}</div><div class="wsub">${c.age} anni${GYM ? '' : ' · ' + esc(goalLabel(p))}</div></div>
        ${AC.enabled ? X.menuBtn() : `<select id="profSel" aria-label="Cambia profilo">${opts}</select><button class="sm" data-act="newProfile" aria-label="Nuovo profilo">+</button>`}</div></header>`;
  }
  function nav() {
    const t = [['home', 'Oggi', ICON.home], ['plan', 'Scheda', ICON.plan], ...(GYM ? [] : [['diet', 'Dieta', ICON.diet]]), ['body', 'Corpo', ICON.body], ['prog', 'Progressi', ICON.chart], ...(X ? X.tabs(ICON) : []), ['me', 'Profilo', ICON.user]].filter(x => P() || ['clients', 'me', 'gyms', 'team'].includes(x[0]));
    return `<nav class="tabs" aria-label="Sezioni">${t.map(([k, l, i]) => `<button data-act="tab" data-tab="${k}" class="${ui.tab === k && !ui.sub ? 'on' : ''}" ${ui.tab === k ? 'aria-current="page"' : ''}>${i}${l}</button>`).join('')}</nav>`;
  }
  /* --- sblocco con impronta / Face ID (WebAuthn): vale solo su questo dispositivo --- */
  const bio = {
    ok: false,
    key() { return KEY + '.bio.' + ((AC.me && AC.me.id) || ''); },
    get id() { try { return localStorage.getItem(bio.key()); } catch (e) { return null; } },
    async check() { try { bio.ok = !!(window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch (e) { bio.ok = false; } },
    b64: u => btoa(String.fromCharCode.apply(null, u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    un: s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
    async enable() {
      const cred = await navigator.credentials.create({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: BRAND }, user: { id: new TextEncoder().encode(AC.me.id), name: AC.me.username || AC.me.id, displayName: AC.me.full_name || BRAND }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, timeout: 60000 } });
      localStorage.setItem(bio.key(), bio.b64(new Uint8Array(cred.rawId)));
    },
    async verify() { await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: bio.un(bio.id) }], userVerification: 'required', timeout: 60000 } }); },
    off() { try { localStorage.removeItem(bio.key()); } catch (e) { } }
  };
  function bioCard() {
    if (!(AC.enabled && AC.me) || (AC.imp && AC.imp())) return '';
    if (!bio.ok) return `<div class="card"><h2>Sblocco con impronta</h2><p class="small mute">Su questo dispositivo non è disponibile. Succede se usi l'app installata dal file APK o un browser senza impronta. Apri FORGIA dal browser del telefono (Chrome o Safari) e scegli «Aggiungi a schermata Home»: lì l'impronta funziona.</p></div>`;
    return bio.id ? `<div class="card"><h2>Sblocco con impronta</h2><p class="small mute">Attivo su questo dispositivo: ogni volta che apri l'app ti chiede l'impronta (o il volto) invece della password.</p><button class="sm" data-act="bioOff">Disattiva su questo dispositivo</button></div>`
      : `<div class="card"><h2>Sblocco con impronta</h2><p class="small mute">Apri l'app con l'impronta o il volto, senza riscrivere nome e password. Vale solo su questo telefono; la password resta valida come alternativa.</p><button class="sm primary" data-act="bioOn">Attiva l'impronta</button>${ui.bioErr ? `<div class="msg danger small" style="margin-top:8px">${esc(ui.bioErr)}</div>` : ''}</div>`;
  }
  function lockView() {
    return `<div class="card" style="text-align:center;margin-top:40px"><h2>App bloccata</h2><p class="small mute">Ciao ${esc(String((AC.me && AC.me.full_name) || '').split(' ')[0])}, tocca per sbloccare con impronta o volto.</p><button class="primary" style="width:100%;margin-top:8px" data-act="bioUnlock">Sblocca</button>${ui.bioErr ? `<div class="msg danger small" style="margin-top:8px">${esc(ui.bioErr)}</div>` : ''}<button class="ghost" style="width:100%;margin-top:10px" data-act="bioOut">Entra con nome e password</button></div>`;
  }
  function gate() {
    if (!AC.enabled) return null;
    if (!AC.me) return X.views.login();
    if (AC.needMfa) return X.views.mfa();
    const imp = AC.imp && AC.imp();
    if (ui.locked && !imp) return lockView();
    if (AC.me.must_change_password && !imp) return X.views.newPassword();
    if (ui.consent === false && !imp) return X.views.consent();
    return null;
  }
  function render() {
    const p = P(), g = gate(), staff = !!(X && X.showClients());
    if (p && AC.enabled && AC.me && AC.me.role === 'client' && !p._acct) p.rmOn = !!AC.me.rm_enabled;
    let body;
    if (g) { $('#app').innerHTML = `<header class="top"><div class="brandrow">${GYM ? `<img class="gymlogo" src="icons/gym/mark.png" alt="${esc(BRAND)}">` : `<img src="icons/mark.png" alt="" width="28" height="28"><span class="brand">${esc(BRAND)}</span>`}</div></header><main>${g}</main>`; return; }
    if (!p && staff && !ui.sub && !['clients', 'me', 'gyms', 'team'].includes(ui.tab)) ui.tab = X.homeTab();
    const XV = X ? Object.assign({}, X.views) : {};
    if (!p && !(ui.sub && ['profile', 'client', 'newClient', 'dev', 'gym', 'newGym'].includes(ui.sub.type)) && !(staff && ['clients', 'me', 'gyms', 'team'].includes(ui.tab) && !ui.sub)) body = viewWelcome();
    else if (ui.sub) body = ({ profile: viewProfileForm, plan: viewPlanDetail, session: viewSession, editSession: viewEditSession, import: viewImport, recipe: viewRecipe, client: XV.client, newClient: XV.newClient, dev: XV.dev, gym: XV.gym, newGym: XV.newGym }[ui.sub.type] || (() => ''))();
    else body = ({ home: viewHome, plan: viewPlans, diet: viewDiet, body: viewBody, prog: viewProg, me: viewMe, clients: XV.clients, gyms: XV.gyms, team: XV.team }[ui.tab])();
    $('#app').innerHTML = header() + (X && X.impBanner ? X.impBanner() : '') + (ui.menu && AC.enabled && AC.me ? X.menu() : '') + `<main class="${ui.sub || ui.tab === 'clients' ? '' : 'multi'}">${body}</main>` + (p || staff ? nav() : '');
    const th = $('#timerHost'); if (th) th.innerHTML = timerBar();
  }
  /* suoni del timer (generati con Web Audio: nessun file) */
  let actx = null;
  function audio() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; } catch (e) { return null; } }
  function tone(freq, start, dur, vol, type) {
    const c = audio(); if (!c) return; const t0 = c.currentTime + start, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square'; o.frequency.value = freq; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.25, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  const soundOn = () => S.settings.sound !== false;
  function playTick() { if (soundOn()) tone(660, 0, 0.09, 0.2); }
  function playEnd() { if (!soundOn()) return; [0, 0.16, 0.32].forEach(t => tone(880, t, 0.11, 0.3)); tone(1320, 0.5, 0.55, 0.35, 'sawtooth'); }
  function timerBar() {
    if (!ui.timer) return '';
    return `<div class="timer" role="timer"><span>${esc(ui.timer.label)} <span id="tleft">${ui.timer.left}</span> s</span><span><button data-act="timerSound" aria-label="Suono del timer">${soundOn() ? 'Suono sì' : 'Suono no'}</button> <button data-act="timerSub">−30 s</button> <button data-act="timerAdd">+30 s</button> <button data-act="timerStop">Stop</button></span></div>`;
  }
  const setCount = (d, i, x, early) => d.count && d.count[i] != null ? d.count[i] : Math.max(d.data[i] ? d.data[i].length : 0, early && x.setsEarly ? x.setsEarly : x.sets);
  const repDefault = (x, si) => { const m = String(si.target).match(/(\d+)(?:\D+(\d+))?/); return si.max || !m ? '' : (m[2] || m[1]); };
  function startTimer(sec, label, onEnd) {
    clearInterval(ui.tick); ui.timer = { left: sec, label: label || 'Recupero' }; audio();
    ui.tick = setInterval(() => {
      ui.timer.left--;
      const el = $('#tleft'); if (el) el.textContent = ui.timer.left;
      if (ui.timer.left > 0 && ui.timer.left <= 3) playTick();
      if (ui.timer.left <= 0) { clearInterval(ui.tick); ui.timer = null; playEnd(); try { navigator.vibrate && navigator.vibrate([300, 100, 300, 100, 500]); } catch (e) { } const th = $('#timerHost'); if (th) th.innerHTML = ''; if (onEnd) onEnd(); else toast('Recupero finito: prossima serie'); }
    }, 1000);
    const th = $('#timerHost'); if (th) th.innerHTML = timerBar();
  }

  function viewWelcome() {
    return `<div class="card hero"><h1>Benvenuto in ${esc(BRAND)}</h1>
      <p>${GYM ? 'La tua scheda di allenamento sempre con te: segui gli esercizi, i recuperi e i tuoi progressi.' : 'Allenamento e alimentazione su misura per ogni persona: calcola calorie e proteine dai tuoi dati, crea o legge la tua scheda, regola tutto in base ai dolori e segue i tuoi progressi.'}</p>
      <button class="primary" data-act="newProfile">Crea il primo profilo</button></div>
      ${AC.enabled && ui.legacyMine ? `<div class="card"><b>Trovato il tuo profilo con i tuoi allenamenti</b><p class="mute small">Su questo telefono c'è il profilo «${esc(ui.legacyMine.name)}» con ${ui.legacyMine.n} allenament${ui.legacyMine.n === 1 ? 'o' : 'i'} salvat${ui.legacyMine.n === 1 ? 'o' : 'i'} prima di entrare con un account. Lo unisco al tuo account senza perdere nulla.</p><button class="primary" data-act="legacyMerge">Sì, unisci i miei allenamenti</button> <button class="ghost" data-act="legacyNo">Non ora</button></div>` : ''}${AC.enabled && ui.legacy ? `<div class="card"><b>Dati trovati su questo dispositivo</b><p class="mute small">Ci sono ${ui.legacy} profil${ui.legacy === 1 ? 'o' : 'i'} salvat${ui.legacy === 1 ? 'o' : 'i'} prima di entrare con un account. Vuoi portarli nel tuo account? Restano comunque sul telefono.</p><button class="primary" data-act="legacyYes">Sì, importa i miei dati</button> <button class="ghost" data-act="legacyNo">Non ora</button></div>` : ''}
      <p class="mute small">${AC.enabled ? 'I tuoi dati sono salvati sul tuo dispositivo, li vedono solo tu e il tuo allenatore.' : 'I dati restano sul tuo telefono. Nessun account, nessun invio a server (salvo che tu non colleghi un server IA tuo).'}</p>`;
  }

  /* --- profilo (form) --- */
  function viewProfileForm() {
    const old = ui.sub.id ? S.profiles.find(p => p.id === ui.sub.id) : null;
    const v = old || { name: AC.enabled && AC.me ? AC.me.full_name : '', birth: AC.enabled && AC.me && AC.me.birth ? AC.me.birth : '', sex: 'M', height: '', weight: '', goal: 'auto', style: 'mix', days: 3, level: 2, stopMonths: 0 };
    const sel = (name, map, cur) => `<select name="${name}">${Object.entries(map).map(([k, l]) => `<option value="${k}" ${String(cur) === String(k) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    return `<h1>${old ? 'Modifica profilo' : 'Nuovo profilo'}</h1><form class="card" id="pform" autocomplete="off">
      <label for="f_name">Nome</label><input id="f_name" name="name" required value="${esc(v.name)}" ${AC.enabled ? 'readonly' : ''}>
      <div class="grid2"><div><label for="f_birth">Data di nascita</label><input id="f_birth" type="date" name="birth" required value="${esc(v.birth)}"></div>
      <div><label>Sesso</label>${sel('sex', { M: 'Uomo', F: 'Donna' }, v.sex)}</div></div>
      <div class="grid2"><div><label for="f_h">Altezza (cm)</label><input id="f_h" type="number" name="height" min="100" max="230" required value="${esc(v.height)}"></div>
      <div><label for="f_w">Peso (kg)</label><input id="f_w" type="number" step="0.1" name="weight" min="30" max="250" required value="${esc(v.weight)}"></div></div>
      <label>Obiettivo</label>${sel('goal', GOALS, v.goal)}<p class="mute small" style="margin:4px 0 0">"Guidato dai miei dati" sceglie da solo tra ingrassare in modo sano, mettere massa, ricomposizione o dimagrire in base a età, peso e altezza (soglie OMS), e si aggiorna quando cambia il tuo peso.</p>
      <div class="grid2"><div><label for="f_waist">Vita (cm), facoltativa</label><input id="f_waist" type="number" inputmode="decimal" name="waist" min="40" max="200" value="${esc(v.waist || '')}"></div>
      <div><label for="f_bf">Grasso corporeo %, facoltativo</label><input id="f_bf" type="number" inputmode="decimal" step="0.1" name="bf" min="3" max="60" value="${esc(v.bf || '')}"></div></div>
      <label>Tipo di allenamento</label>${sel('style', STYLES, v.style)}
      <div class="grid2"><div><label>Giorni a settimana</label>${sel('days', { 2: '2', 3: '3', 4: '4', 5: '5' }, v.days)}</div>
      <div><label>Livello</label>${sel('level', LEVELS, v.level)}</div></div>
      <label for="f_stop">Mesi di stop dall'allenamento (0 se ti alleni)</label><input id="f_stop" type="number" name="stopMonths" min="0" max="600" value="${esc(v.stopMonths)}">
      <div class="row" style="margin-top:14px"><button type="button" data-act="cancelSub">Annulla</button><button class="primary grow" type="submit">Salva${old ? '' : ' e crea la scheda'}</button></div></form>
      <p class="mute small">Sotto i 18 anni l'app attiva automaticamente regole di tutela: niente deficit calorico, niente integratori, carichi moderati.</p>`;
  }

  /* --- home --- */
  function viewHome() {
    const p = P(), c = F.calc(p), plan = planOf(p), adv = F.weightAdvice(p);
    const done = (p.sessions || []).length;
    const offers = (p ? p.plans : []).filter(x => x.offer).map(x => `<div class="card" style="border-color:var(--accent)"><b>Hai ricevuto una nuova scheda dal tuo allenatore</b><div class="small">${esc(x.title)} · caricata il ${esc(x.createdAt)}</div><p class="mute small" style="margin:6px 0 0">È già salvata tra le tue schede. Vuoi usarla subito o continuare con quella che hai?</p><div class="row wrap" style="margin-top:8px"><button class="sm primary" data-act="offerYes" data-id="${x.id}">Attiva ora</button><button class="sm" data-act="offerNo" data-id="${x.id}">Continuo con la mia</button></div></div>`).join('');
    const inbox = offers + (ui.inbox || []).map(m => `<div class="card" style="border-color:var(--warn)"><b>Scheda dal tuo allenatore da controllare</b><div class="small">${esc(m.title)}</div><button class="sm primary" style="margin-top:8px" data-act="inboxImport" data-id="${m.id}">Controlla e importa</button></div>`).join('');
    let next = '';
    if (plan && plan.days.length) {
      const cnt = (p.sessions || []).filter(s => s.planId === plan.id).length, ls = (p.sessions || []).filter(s => s.planId === plan.id).slice(-1)[0], li = ls ? plan.days.findIndex(x => x.name === ls.dayName) : -1, auto = li >= 0 ? (li + 1) % plan.days.length : cnt % plan.days.length;
      const hasDraft = p.draft && p.draft.planId === plan.id;
      const idx = hasDraft ? p.draft.dayIdx : (ui.pickDay != null && ui.pickDay < plan.days.length ? ui.pickDay : auto), d = plan.days[idx];
      const early = early0(p, plan);
      const picker = hasDraft ? '' : `<div class="row wrap" style="margin:8px 0" role="group" aria-label="Scegli il giorno">${plan.days.map((x, k) => `<button class="sm ${k === idx ? 'primary' : 'ghost'}" data-act="pickDay" data-day="${k}">${esc(x.name.length > 14 ? x.name.slice(0, 14) + '…' : x.name)}${k === auto ? ' ★' : ''}</button>`).join('')}</div><div class="mute small">★ = prossimo giorno in ordine. Scegli tu quello che vuoi fare oggi.</div>`;
      next = `<div class="card hero"><div class="mute small">${hasDraft ? 'Seduta in corso' : 'Seduta di oggi'} · ${esc(plan.title)}</div><h1 style="margin:.1em 0">${esc(d.name)}</h1>
        <p>${d.exercises.filter(x => !x.alt).length} esercizi${d.exercises.some(x => x.alt) ? ' (+ alternative)' : ''} · ${d.exercises.filter(x => !x.alt).reduce((a, x) => a + (early && x.setsEarly ? x.setsEarly : x.sets), 0)} serie${early ? ' (fase di rientro: volume ridotto)' : ''}</p>${(p.sessions || []).length ? (() => { const r = F.dayReadiness(p, d); return `<p class="small" style="margin:.2em 0 .6em">Recupero dei muscoli di oggi: <b>${r.pct}%</b>${r.pct < 70 && r.worst ? ' · il più affaticato è ' + esc(F.MUSCLE_LABEL[r.worst]).toLowerCase() : ''}</p>`; })() : ''}${picker}
        <div class="row wrap" style="margin-top:8px"><button class="primary" data-act="startSession" data-day="${idx}">${hasDraft ? 'Riprendi seduta' : 'Inizia'}</button>${hasDraft ? '<button class="ghost sm" data-act="dropDraft">Scarta bozza e scegli un altro giorno</button>' : ''}</div></div>`;
    } else next = `<div class="card"><h2>Nessuna scheda attiva</h2><p class="mute">Crea una scheda su misura o importa quella del tuo allenatore.</p><button class="primary" data-act="tab" data-tab="plan">Vai a Scheda</button></div>`;
    const pains = Object.entries(p.pain || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const upd = '';   // nessun avviso di aggiornamento: si aggiorna in silenzio; lo stato si chiede dal Profilo
    const news = '';
    const sym = (p.symptoms || []).filter(x => Date.now() - new Date(x.at || x.date) < 21 * 864e5).slice(-1)[0];
    const symCard = sym ? `<div class="card" style="border-color:var(--warn)"><b>Malessere del ${esc(sym.date)}</b><div class="small">Per le prossime sedute: carichi leggeri, niente cardio a tutta, mangia e bevi prima. Se si ripete, fai controllare cuore, pressione e glicemia dal medico.</div></div>` : '';
    const gk = { powerlifting: 'Powerlifting', bodybuilding: 'Bodybuilding', gara: 'Gara' };
    const garaCard = (plan && plan.comp && p.gara && !p.gara.hide) ? (() => { const g = p.gara, bw = plan.block ? F.blockWeek(plan) : 0, left = g.date ? Math.ceil((new Date(g.date) - new Date(F.todayISO())) / 864e5) : null;
      return `<div class="card" style="border-color:var(--accent)"><div class="mute small">Area gara · ${esc(gk[g.kind] || 'Gara')}</div><h2 style="margin:.1em 0">${plan.block ? 'Settimana ' + bw + ' di ' + plan.block.weeks : esc(plan.title)}</h2>
        ${plan.block ? `<div class="row wrap" style="margin:6px 0"><button class="sm ghost" data-act="garaWeek" data-d="-1" aria-label="Settimana precedente">‹</button><button class="sm ghost" data-act="garaWeek" data-d="1" aria-label="Settimana successiva">›</button>${plan.block.manual ? '<button class="sm ghost" data-act="garaWeek" data-d="0">Automatica</button>' : ''}</div>` : ''}
        <div class="row wrap" style="align-items:center;gap:8px"><label for="gara_date" class="small" style="margin:0">Data gara</label><input type="date" id="gara_date" data-gara="date" value="${esc(g.date || '')}" style="max-width:170px">${left != null ? `<b>${left > 0 ? 'mancano ' + left + ' giorni' : left === 0 ? 'è oggi!' : 'gara passata'}</b>` : ''}</div>
        <button class="sm ghost" style="margin-top:8px" data-act="garaHide">Nascondi quest'area</button></div>`; })() : '';
    return `${upd}${news}${backupBanner()}${inbox}${symCard}${garaCard}${next}
      ${GYM ? '' : `      <div class="card"><h2>Obiettivi di oggi</h2><div class="grid3 k4"><div class="kpi"><b>${fmt(c.kcal)}</b><span>kcal</span></div><div class="kpi"><b>${c.protein} g</b><span>proteine</span></div><div class="kpi"><b>${c.carbs} g</b><span>carboidrati</span></div><div class="kpi"><b>${c.fat} g</b><span>grassi</span></div></div>
      <p class="mute small">Acqua: ~${fmt(c.water, 1)} l · Sonno: ${c.minor ? '8-10' : '7-9'} ore</p></div>`}
      <div class="card"><h2>Analisi dell'andamento</h2><div class="msg ${adv.kind}">${esc(adv.text)}</div>
      ${pains.length ? `<h3>Dolori segnalati <span class="mute small">· tocca per modificare, ✕ per togliere</span></h3><div class="row" style="flex-wrap:wrap;gap:6px">${painChips(p)}</div>` : ''}
      <div class="row wrap" style="margin-top:10px">${GYM ? '' : '<button class="sm" data-act="askAI">Chiedi all\'analista IA</button>'}<span class="mute small">${done} sedute registrate</span></div><div id="aiOut"></div></div>`;
  }

  /* --- tecniche della scheda: ruolo, recupero e carico suggerito per ogni serie --- */
  const early0 = (p, plan) => F.isReturning(p) && plan.source !== 'importata' && (Date.now() - new Date(plan.createdAt)) / 864e5 < 28;
  const r25 = v => Math.round(v / 2.5) * 2.5;
  function setInfo(x, s, cur) {
    const t = x.tech || {}, o = { role: '', target: F.targetFor(x, s), rest: x.rest || 90, kgHint: null, max: false };
    const prevKg = (k) => { const v = parseFloat(((cur || [])[k] || {}).kg); return v > 0 ? v : null; };
    if (t.top) {
      if (s === 0) { o.role = 'TOPSET'; o.rest = x.restRead ? x.rest : 180; }
      else if (!(t.drop && s === x.sets - 1)) { o.role = 'BACK-OFF −' + t.top.pct + '%'; o.target = t.top.backReps; o.rest = 120; const b = prevKg(0); if (b) o.kgHint = r25(b * (1 - t.top.pct / 100)); }
    }
    if (t.emom) { o.role = 'EMOM ' + (s + 1) + '/' + t.emom; o.rest = 0; }
    if (t.myo && s === x.sets - 1) { o.role = 'MYO-REPS'; o.rest = 15; o.target = 'attivante + mini-serie'; }
    if (t.drop) {
      if (s === x.sets - 1) { o.role = 'DROPSET −' + t.drop.pct + '%'; o.target = 'MAX'; o.max = true; const b = prevKg(s - 1); if (b) o.kgHint = Math.round(b * (1 - t.drop.pct / 100) * 2) / 2; o.rest = x.rest || 90; }
      else if (s === t.drop.after) o.rest = t.drop.rest;
    }
    return o;
  }
  /* "perché?" (prova su FORGIA): compare solo quando la serie va diversa dalla scheda */
  function whyCell(key) { const p = P(), d = p.draft; if (!d) return null; const [i, k] = key.split(':').map(Number); d.data[i] = d.data[i] || []; while (d.data[i].length <= k) d.data[i].push({}); return d.data[i][k]; }
  const WHY = ['Dolore', 'Stanchezza', 'Troppo pesante', 'Tecnica', 'Poco tempo', 'Altro'];
  function setDiff(x, si, c, ptKg) {
    if (!c) return '';
    const out = [], lo = /^\s*(\d+)/.exec(String(si.target || '')), timed = x.unit === 'sec';
    if (c.reps != null && lo && !timed && !si.max && c.reps < +lo[1]) out.push('meno ripetizioni del previsto');
    const plan = si.kgHint != null ? si.kgHint : ptKg;
    if (c.kg > 0 && plan > 0 && c.kg < plan * 0.95) out.push('peso più basso del previsto');
    if (c.done === false && c.reps != null) out.push('serie non completata');
    return out.join(' e ');
  }
  function whyRow(p, i, s, x, si, c, ptKg) {
    const diff = setDiff(x, si, c, ptKg), key = i + ':' + s, open = ui.whyOpen === key || !!c.why;
    const side = c.ws || 'B', o = c.wz && F.PX.by[c.wz];
    const sideB = (m, t) => `<button class="sm ${side === m ? 'primary' : ''}" data-act="whySide" data-k="${key}" data-sd="${m}">${t}</button>`;
    const pain = c.why === 'Dolore' ? `<div style="margin-top:6px">${o ? `<b>${esc(o.name)}</b> <button class="sm" data-act="whyPainReset" data-k="${key}">cambia</button><div class="row" style="margin:6px 0;gap:6px">${o.c ? '' : sideB('L', 'Sinistro') + sideB('R', 'Destro') + sideB('B', 'Entrambi')}</div><label class="small">Intensità: <b id="whyV${key.replace(':', '_')}">${c.wl || 0}</b>/10</label><input type="range" min="0" max="10" step="1" value="${c.wl || 0}" class="whyl" data-k="${key}"><button class="primary sm" data-act="whyApply" data-k="${key}">Registra questo dolore</button>` : `<input type="search" class="whyq" data-k="${key}" placeholder="Dove? es. spalla, ginocchio, bicipite…" autocomplete="off"><div class="whyres" data-k="${key}"></div>`}</div>` : '';
    return `<tr class="whyrow" data-why="${key}"${diff ? '' : ' hidden'}><td colspan="6"><button class="ghost sm" data-act="whyOpen" data-k="${key}">${c.why ? 'Motivo: ' + esc(c.why) : 'Serie diversa dalla scheda: perché?'}</button><span class="mute small whydiff"> ${esc(diff)}</span>${open ? `<div class="row" style="flex-wrap:wrap;gap:6px;margin-top:6px">${WHY.map(w => `<button class="sm ${c.why === w ? 'primary' : ''}" data-act="whyPick" data-k="${key}" data-v="${w}">${w}</button>`).join('')}</div>${pain}` : ''}</td></tr>`;
  }
  /* minuti di EMOM: principale (tech.emom) oppure indicato come alternativa nella nota ("... in EMOM 6'") */
  function emomN(x) { if (x.tech && x.tech.emom) return x.tech.emom; const m = /EMOM\s*(\d+)/i.exec(x.note || ''); return m ? +m[1] : 0; }
  /* alternative: di base si fa l'esercizio principale; l'utente può spuntare l'alternativa, o entrambi */
  function exOn(d, x, i) { return d.use && d.use[i] !== undefined ? !!d.use[i] : !x.alt; }
  function emomStart(i) {
    const p = P(), plan = planOf(p), x = plan.days[p.draft.dayIdx].exercises[i], n = emomN(x);
    if (!n) return;
    const step = k => { if (k > n) { toast('EMOM finito. Ottimo!'); return; } toast('Minuto ' + k + '/' + n + ': fai la serie ' + k); startTimer(60, 'EMOM ' + k + '/' + n, () => step(k + 1)); };
    step(1);
  }

  /* --- sessione di allenamento --- */
  function viewSession() {
    const p = P(), plan = planOf(p), d = p.draft;
    if (!plan || !d) { ui.sub = null; return viewHome(); }
    const day = plan.days[d.dayIdx], early = early0(p, plan);
    const lastBW = (p.weights || []).slice(-1)[0];
    const prevS = (p.sessions || []).filter(q => q.planId === plan.id && q.dayName === day.name).slice(-1)[0];
    const grpIdx = {}; day.exercises.forEach((x, i) => { if (x.altGroup) (grpIdx[x.altGroup] = grpIdx[x.altGroup] || []).push(i); });
    const chooser = (x, i) => {
      const g = grpIdx[x.altGroup]; if (!g || g[0] !== i || g.length < 2) return '';
      const onN = g.filter(j => exOn(d, day.exercises[j], j));
      const opt = (val, label, chk) => `<label style="display:flex;gap:10px;align-items:center;margin:6px 0;cursor:pointer"><input type="radio" name="altp_${x.altGroup}" data-altpick="${x.altGroup}|${val}" ${chk ? 'checked' : ''} style="width:auto"> <span><b>${label}</b></span></label>`;
      return `<div class="card" style="border:1px solid var(--accent)"><b>Scegli quale fare oggi</b><p class="mute small" style="margin:4px 0 6px">L'allenatore ti ha indicato due esercizi alternativi (nella scheda sono separati da «/»). Ne basta uno: scegli quello che preferisci o che hai a disposizione, mettendo la spunta. L'altro resta chiuso e puoi cambiare idea quando vuoi.</p>${g.map(j => opt(j, esc(day.exercises[j].name), onN.length === 1 && onN[0] === j)).join('')}${opt('both', 'Li faccio entrambi', onN.length === g.length)}</div>`;
    };
    const blocks = day.exercises.map((x, i) => {
      const on = exOn(d, x, i), altBar = '';
      const ch = chooser(x, i);
if (!on) return ch + `<div class="card" style="opacity:.75">${altBar}<b>${esc(x.name)}</b>${srcLine(x)} <span class="mute small">${x.sets} serie · ${esc(F.repsLabel(x))}</span></div>`;
      const e = F.EXMAP[x.exId], hist = histFor(p, x.exId), sug = F.suggest(x, hist), last = hist[hist.length - 1];
      const n = setCount(d, i, x, early);
      const pe0 = last ? { sets: last.sets, date: last.date } : null;
      const pt = F.pctTarget(p, x), ptKg = pt && !pt.need ? pt.hi : null;
      const rows = []; for (let s = 0; s < n; s++) {
        const cur = (d.data[i] || [])[s] || {}, prev = last && last.sets[s], si = setInfo(x, s, d.data[i]);
        const ps = pe0 && pe0.sets[s];
        const timed = x.unit === 'sec' || (e && e.unit === 'sec');
        rows.push(`<tr><td>${s + 1}</td><td class="mute">${si.role ? `<b style="color:var(--accent)">${esc(si.role)}</b><br>` : ''}${esc(si.target)}${si.rest ? `<br><span class="small">rec ${si.rest}s</span>` : ''}${ps ? `<br><span class="small prevline" title="Dati della volta scorsa (${pe0.date}), solo lettura">Scorsa ${pe0.date.slice(8, 10)}/${pe0.date.slice(5, 7)}: ${ps.kg ? fmt(ps.kg, 1) + ' kg × ' : ''}${ps.reps}${ps.rpe ? ' · RPE ' + ps.rpe : ''}</span>` : ''}</td>
          <td><input inputmode="decimal" data-set="${i}:${s}:kg" value="${cur.kg != null ? cur.kg : (si.kgHint != null ? si.kgHint : (prev && prev.kg != null ? prev.kg : (ptKg != null ? ptKg : '')))}" placeholder="${timed ? '—' : (ptKg != null ? ptKg : 'kg')}" aria-label="Peso serie ${s + 1}"></td>
          <td class="repcell"><button class="ghost sm" data-act="rep" data-i="${i}" data-s="${s}" data-d="-1" aria-label="Meno ripetizioni">−</button><input inputmode="numeric" data-set="${i}:${s}:reps" value="${cur.reps != null ? cur.reps : ''}" placeholder="${timed ? 'sec' : (repDefault(x, si) || 'rip')}" aria-label="${timed ? 'Secondi' : 'Ripetizioni'} serie ${s + 1}"><button class="ghost sm" data-act="rep" data-i="${i}" data-s="${s}" data-d="1" aria-label="Più ripetizioni">+</button></td>
          <td><input inputmode="decimal" data-set="${i}:${s}:rpe" value="${cur.rpe != null ? cur.rpe : ''}" placeholder="1-10" aria-label="Sforzo serie ${s + 1}"></td>
          <td><input type="checkbox" data-done="${i}:${s}" ${cur.done ? 'checked' : ''} aria-label="Serie ${s + 1} fatta"></td></tr>${whyRow(p, i, s, x, si, cur, ptKg)}`);
      }
      return ch + `<div class="card">${altBar}<div class="ex">${exPic(x)}<div class="grow"><b>${esc(x.name)}</b>${srcLine(x)}
        <div class="mute small">${n} serie · ${esc(F.repsLabel(x))}${x.repsInfo && x.repsInfo.max ? '' : ''} · recupero ${x.rest || 90}s${x.pct ? ' · ' + esc(F.pctLabel(x)) : ''}${x.rpe ? ' · RPE ' + x.rpe : ''}${x.tempo ? ' · tempo ' + esc(x.tempo) : ''}</div>
        ${x.pct && pt && pt.off ? '<div class="msg warn small">Percentuale del massimale non attiva per ora: usa i kg o lo sforzo indicati dall\'allenatore.</div>' : x.pct ? (pt && !pt.need ? `<div class="msg ok small">Carico di oggi: ${pt.lo === pt.hi ? pt.lo : pt.lo + '-' + pt.hi} kg (${esc(F.pctLabel(x))}, 1RM ${pt.rm.kg} kg)</div>` : '<div class="msg warn small">Percentuale indicata ma manca il tuo 1RM: scegli un carico con 3 ripetizioni in riserva; poi lo stimo io.</div>') : ''}
        ${x.note ? `<div class="msg warn small">${esc(x.note)}</div>` : ''}
        ${x.pct ? rmInput(p, x) : ''}
        <div class="msg ${sug.kind === 'up' ? 'ok' : sug.kind === 'warn' ? 'warn' : ''} small">${esc(sug.text)}</div>
        ${e ? `<details><summary>Come si esegue</summary><p class="small">${esc(e.cue)}</p><p class="mute small">Muscoli: ${e.prim.map(m => F.MUSCLE_LABEL[m]).join(', ')}${e.sec.length ? ' (aiuto: ' + e.sec.map(m => F.MUSCLE_LABEL[m]).join(', ') + ')' : ''}</p></details>` : ''}
      </div></div>
      <table class="sets"><thead><tr><th>#</th><th>Obiettivo · volta scorsa</th><th>${x.unit === 'sec' ? '' : 'Peso'}</th><th>${x.unit === 'sec' ? 'Sec' : 'Rip'}</th><th>RPE</th><th>Fatta</th></tr></thead><tbody>${rows.join('')}</tbody></table>
      <div class="row wrap" style="margin-top:6px"><button class="ghost sm" data-act="addSet" data-i="${i}">+ serie</button><button class="ghost sm" data-act="delSet" data-i="${i}">− serie</button>${emomN(x) ? `<button class="${x.tech && x.tech.emom ? 'primary ' : ''}sm" data-act="emomGo" data-i="${i}">▶ Avvia EMOM ${emomN(x)}'${x.tech && x.tech.emom ? '' : ' (alternativa)'}</button>` : ''}${x.tech && x.tech.myo ? `<button class="sm" data-act="myoGo" data-i="${i}">Pausa myo 15 s</button>` : ''}${x.tech && x.tech.pause ? `<span class="chip">Fermo ${x.tech.pause.sec} s${x.tech.pause.every > 1 ? ' ogni ' + x.tech.pause.every + ' rip' : ' a ogni rip'}</span>` : ''}</div></div>`;
    }).join('');
    return `<div class="row"><button class="ghost" data-act="pauseSession">← Esci (salva bozza)</button></div>
      <h1>${esc(day.name)}</h1>
      <div class="card row wrap" style="padding:8px 12px;gap:8px"><b>Peso oggi</b><input id="bw" inputmode="decimal" placeholder="kg" value="" style="max-width:90px" aria-label="Peso corporeo"><span class="mute small grow">ultimo: ${lastBW ? lastBW.kg + ' kg' : '—'}</span></div>
      <details class="card"><summary><b>Prima di iniziare</b> <span class="mute small">(1 minuto)</span></summary>
        <label class="row" style="margin:6px 0;color:var(--ink)"><input type="checkbox" style="width:22px;min-height:0"> Ho mangiato carboidrati e proteine 2-3 ore fa</label>
        <label class="row" style="margin:6px 0;color:var(--ink)"><input type="checkbox" style="width:22px;min-height:0"> Ho bevuto circa mezzo litro d'acqua</label>
        <label class="row" style="margin:6px 0;color:var(--ink)"><input type="checkbox" style="width:22px;min-height:0"> Ho dormito bene e sto bene oggi</label>
        <p class="mute small">Durante le serie espira e non trattenere il fiato. Se senti formicolio, testa leggera o confusione, fermati subito. Alla fine non fermarti di colpo: 5 minuti di camminata lenta. Niente intervalli a tutta nelle prime 4-6 settimane.</p></details>
      <p class="mute small" style="margin:4px 0 8px">RPE = sforzo 1-10 (10 = al limite). Nelle piramidi aumenta il peso a ogni serie.</p>
      <div class="exgrid">${blocks}</div><button class="primary" style="width:100%" data-act="finishSession">Termina e salva</button>`;
  }

  /* --- schede --- */
  function viewPlans() {
    const p = P();
    const list = p.plans.map(pl => {
      const a = F.analyzePlan(pl, p), warns = a.flags.filter(f => f.k === 'warn' || f.k === 'danger').length;
      return `<div class="card"><div class="row"><div class="grow"><b>${esc(pl.title)}</b> ${pl.id === p.activePlan ? '<span class="chip">attiva</span>' : ''}
        <div class="mute small">${esc(pl.source)} · ${pl.days.length} giorni · ${pl.createdAt}${warns ? ` · <span class="chip warn">${warns} avvisi</span>` : ''}</div></div></div>
        <div class="row wrap" style="margin-top:8px"><button class="sm" data-act="openPlan" data-id="${pl.id}">Apri e analizza</button>
        ${pl.id !== p.activePlan ? `<button class="sm" data-act="activate" data-id="${pl.id}">Attiva</button>` : ''}
        <button class="sm danger" data-act="delPlan" data-id="${pl.id}">Elimina</button></div></div>`;
    }).join('') || '<p class="mute">Nessuna scheda.</p>';
    return `<h1>Schede</h1>${list}
      <div class="card"><h2>Nuova scheda</h2><div class="row wrap"><button class="primary" data-act="genPlan">Crea su misura per ${esc(p.name)}</button><button data-act="importPlan">Importa scheda dell'allenatore</button></div>
      <p class="mute small">La scheda su misura usa età, obiettivo, livello, stop dall'allenamento e dolori indicati nella sezione Corpo.</p></div>`;
  }
  function viewPlanDetail() {
    const p = P(), pl = p.plans.find(x => x.id === ui.sub.id); if (!pl) { ui.sub = null; return viewPlans(); }
    const a = F.analyzePlan(pl, p);
    const days = pl.days.map((d, di) => `<div class="card"><h2>${esc(d.name)} <span class="mute small">· ${d.exercises.reduce((s, x) => s + x.sets, 0)} serie</span></h2>
      ${d.exercises.map((x, xi) => {
        const e = F.EXMAP[x.exId], chk = e ? F.painCheck(e, p.pain) : { blocked: false, notes: [] };
        const alts = chk.blocked ? F.alternatives(x.exId, p) : [];
        return `<div class="ex">${exPic(x)}<div class="grow"><b>${esc(x.name)}</b> ${!e ? '<span class="chip warn">non riconosciuto</span>' : ''} ${chk.blocked ? '<span class="chip danger">sconsigliato ora</span>' : ''}
        <div class="row wrap" style="margin:4px 0"><label style="margin:0">Serie</label><input type="number" min="1" max="10" style="width:64px" data-edit="${di}:${xi}:sets" value="${x.sets}" aria-label="Serie ${esc(x.name)}">
        ${x.repsInfo ? `<span class="mute small">${esc(F.repsLabel(x))}${x.pct ? ' · ' + esc(F.pctLabel(x)) : ''} · rec ${x.rest || 90}s${x.rpe ? ' · RPE ' + x.rpe : ''}</span>` : `<label style="margin:0">Rip</label><input style="width:90px" data-edit="${di}:${xi}:reps" value="${esc(x.reps)}" aria-label="Ripetizioni ${esc(x.name)}">`}</div>
        ${rmInput(p, x)}
        ${(x.flags || []).map(f => `<div class="msg warn small">${esc(f)}</div>`).join('')}
        ${chk.notes.length ? `<div class="msg ${chk.blocked ? 'danger' : 'warn'} small">${esc(chk.notes.join(' · '))}</div>` : ''}
        ${!e ? `<select data-map="${di}:${xi}" aria-label="Collega a un esercizio"><option value="">Collega a un esercizio…</option>${F.EX.map(o => `<option value="${o.id}">${esc(o.name)}</option>`).join('')}</select>` : ''}
        ${alts.length ? `<div class="small">Alternative: ${alts.map(o => `<button class="sm" data-act="swap" data-d="${di}" data-x="${xi}" data-ex="${o.id}">${esc(o.name)}</button>`).join(' ')}</div>` : ''}
        </div><button class="ghost sm danger" data-act="rmEx" data-d="${di}" data-x="${xi}" aria-label="Rimuovi ${esc(x.name)}">✕</button></div>`;
      }).join('')}
      <div class="row" style="margin-top:8px"><select id="add_${di}" aria-label="Aggiungi esercizio"><option value="">Aggiungi esercizio…</option>${F.EX.filter(o => !F.painCheck(o, p.pain).blocked && (!F.isMinor(p) || o.minor !== false)).map(o => `<option value="${o.id}">${esc(o.name)}</option>`).join('')}</select><button class="sm" data-act="addEx" data-d="${di}">Aggiungi</button></div></div>`).join('');
    const per = Object.entries(a.per).sort((x, y) => y[1] - x[1]);
    const mx = Math.max(1, ...per.map(e => e[1]));
    return `<div class="row"><button class="ghost" data-act="cancelSub">← Schede</button></div><h1>${esc(pl.title)}</h1>
      <div class="card"><h2>Analisi per ${esc(p.name)}</h2>${msgs(a.flags)}
      <div class="row wrap" style="margin-top:8px"><button class="sm primary" data-act="adapt" data-id="${pl.id}">Crea versione adattata a profilo e dolori</button>${pl.id !== p.activePlan ? `<button class="sm" data-act="activate" data-id="${pl.id}">Attiva</button>` : ''}</div></div>
      ${(pl.notes || []).length ? `<div class="card"><h2>Note</h2>${msgs(pl.notes.map(t => ({ t })))}</div>` : ''}
      <div class="card"><h2>Serie settimanali per muscolo</h2>${per.map(([m, v]) => `<div class="row small" style="margin:3px 0"><span style="width:120px">${esc(F.MUSCLE_LABEL[m])}</span><div class="bar grow"><i style="width:${Math.round(v / mx * 100)}%"></i></div><b style="width:34px;text-align:right">${fmt(v, 1)}</b></div>`).join('')}
      <p class="mute small">Principali = 1 serie, secondari = 0,5. Riferimento: 10-16 serie a settimana per muscolo.</p></div>${days}`;
  }
  function viewImport() {
    const p = P(), st = ui.sub.state;
    if (st.parsed) {
      const pr = st.parsed, all = pr.days.flatMap(d => d.exercises), unk = all.filter(x => !x.exId).length, fl = all.filter(x => x.flags.length).length;
      return `<div class="row"><button class="ghost" data-act="cancelSub">← Annulla</button></div><h1>Controlla la scheda letta</h1>
        <div class="card"><b>${pr.days.length} giorni, ${all.length} esercizi</b><div class="mute small">${unk ? unk + ' da collegare · ' : ''}${fl ? fl + ' con ambiguità' : 'nessuna ambiguità'}</div>
        <label for="imp_title">Nome scheda</label><input id="imp_title" value="${esc(st.title)}">
        ${pr.flags.length ? msgs(pr.flags.map(t => ({ k: 'warn', t }))) : ''}
        <div class="row" style="margin-top:12px"><button class="primary grow" data-act="saveImport">Salva scheda</button></div>
        <p class="mute small">Potrai collegare gli esercizi non riconosciuti e correggere serie e ripetizioni nel dettaglio della scheda.</p></div>
        ${pr.days.map(d => `<div class="card"><h2>${esc(d.name)}</h2>${d.exercises.map(x => `<div class="small" style="padding:3px 0;border-top:1px solid var(--line)"><b>${esc(x.name)}</b> — ${x.sets}× ${esc(F.repsLabel(x))}${x.pct ? ' · ' + esc(F.pctLabel(x)) : ''}${x.rest ? ' · rec ' + x.rest + 's' : ''}${x.rpe ? ' · RPE ' + x.rpe : ''}${x.tempo ? ' · tempo ' + esc(x.tempo) : ''} ${x.exId ? `<span class="chip">${esc(F.EXMAP[x.exId].name)}</span>` : '<span class="chip warn">da collegare</span>'}${x.flags.map(f => `<div class="mute">⚠ ${esc(f)}</div>`).join('')}</div>`).join('')}</div>`).join('')}`;
    }
    return `<div class="row"><button class="ghost" data-act="cancelSub">← Annulla</button></div><h1>Importa scheda</h1>
      <div class="card"><h2>Incolla il testo</h2><p class="mute small">Incolla la scheda come l'ha scritta l'allenatore, anche in inglese: <code>Bench press 4x6 @80% rest 2 min</code>, <code>Lat pulldown 3 x 8-10 RPE 8</code>, <code>Squat 5 serie da 5, 75%, recupero 2'</code>. Riconosco serie, ripetizioni, % del massimale, RPE/RIR, recuperi e tempo. Le righe come <code># Giorno 1</code> o <code>Push day:</code> sono i giorni.</p>
      <textarea id="imp_text" placeholder="# Day 1&#10;Bench press 4x6 @80% rest 2 min&#10;Lat pulldown 3x8-10 RPE 8&#10;Leg press 3x12 rec 90s" aria-label="Testo della scheda"></textarea>
      <button class="primary" style="margin-top:8px" data-act="parseText">Leggi scheda</button></div>
      <div class="card"><h2>Da file: Excel, PDF, CSV</h2><p class="mute small">Carica la scheda dell'allenatore come file <b>.xlsx</b>, <b>.csv</b>, <b>.pdf</b> o <b>.txt</b>. Riconosco le colonne (esercizio, serie, ripetizioni, recupero, carico, RPE, note) e i giorni (un foglio per giorno, oppure una riga titolo o la colonna Giorno). I PDF devono contenere testo; se è una scansione usa la foto.</p>
      <input type="file" id="imp_file" accept=".xlsx,.csv,.pdf,.txt,application/pdf" aria-label="File della scheda"></div>
      <div class="card"><h2>Da foto</h2><p class="mute small">La lettura automatica da foto usa l'IA e richiede il server collegato (Profilo → Server IA). Senza server, incolla il testo qui sopra.</p>
      <input type="file" id="imp_photo" accept="image/*" aria-label="Foto della scheda"><button style="margin-top:8px" data-act="parsePhoto">Leggi foto</button></div>`;
  }


  /* --- dieta: 4 pasti, alimenti, ricette --- */
  const fx = n => fmt(n, 0);
  const chips = fd => (fd.b12 ? '<span class="chip">B12</span> ' : '') + (fd.d ? '<span class="chip">D</span> ' : '');
  function ensureNut(p) {
    p.nutrition = p.nutrition || { days: {}, foods: [], recipes: [] };
    const sn = p.nutrition.seededNames = p.nutrition.seededNames || (p.nutrition.seeded ? F.RECIPE_SAMPLES.slice(0, 2).map(r => r.name) : []);
    F.RECIPE_SAMPLES.forEach(r => { if (sn.indexOf(r.name) < 0) { sn.push(r.name); p.nutrition.recipes.push({ id: 'r' + uid(), name: r.name, portions: r.portions, items: r.items.map(x => x.slice()), note: r.note }); } });
    if (!p.nutrition.seeded) { p.nutrition.seeded = true; save(); }
    return p.nutrition;
  }
  function bar(label, val, tgt, unit) {
    const pc = tgt ? Math.min(100, Math.round(val / tgt * 100)) : 0, over = tgt && val > tgt * 1.05;
    return `<div style="margin:8px 0"><div class="row small"><span class="grow"><b>${label}</b></span><span>${fx(val)} / ${fx(tgt)} ${unit}</span></div><div class="bar"><i style="width:${pc}%${over ? ';background:var(--warn)' : ''}"></i></div></div>`;
  }
  function itemLine(p, it, mi, ii) {
    const m = F.itemMacros(p, it);
    if (it.r) {
      const rec = F.getRecipe(p, it.r); if (!rec) return '';
      return `<div class="row" style="border-top:1px solid var(--line);padding:6px 0"><div class="grow"><b>${esc(rec.name)}</b><div class="mute small">${fx(m.k)} kcal · P ${fx(m.p)} · C ${fx(m.c)} · G ${fx(m.f)}</div></div>
        <input inputmode="decimal" style="width:62px" data-dn="${mi}:${ii}" value="${it.n || 1}" aria-label="Porzioni"><span class="mute small">porz.</span><button class="ghost sm danger" data-act="dRm" data-m="${mi}" data-i="${ii}" aria-label="Rimuovi">✕</button></div>`;
    }
    const fd = F.getFood(p, it.f); if (!fd) return '';
    return `<div class="row" style="border-top:1px solid var(--line);padding:6px 0"><div class="grow"><b>${esc(fd.name)}</b> ${chips(fd)}<div class="mute small">${fx(m.k)} kcal · P ${fx(m.p)} · C ${fx(m.c)} · G ${fx(m.f)}</div></div>
      <input inputmode="decimal" style="width:70px" data-dg="${mi}:${ii}" value="${it.g}" aria-label="${fd.liq ? 'Millilitri' : 'Grammi'} ${esc(fd.name)}"><span class="mute small">${F.unitOf(fd)}</span><button class="ghost sm danger" data-act="dRm" data-m="${mi}" data-i="${ii}" aria-label="Rimuovi">✕</button></div>`;
  }
  function limitBox(p, fd) {
    const l = fd.lim; if (!l) return '';
    const ud = F.usageOf(p, ui.diet.date)[fd.id] || 0, left = F.capLeft(p, fd, ui.diet.date);
    return `<div class="small" style="margin-top:6px"><b>Limite:</b> ${l.d ? 'fino a ' + l.d + ' g al giorno' : ''}${l.w ? (l.d ? ', ' : '') + 'massimo ' + l.w + ' g a settimana' : ''}. ${esc(l.t || '')}<div id="dgwarn" class="mute" data-left="${Math.round(left)}">Oggi ne hai già ${fx(ud)} g: puoi aggiungerne ancora ${fx(left)} g.</div></div>`;
  }
  function seasonTag(fd) { return fd.se && fd.se.length < 12 ? ' <span class="chip">stagione</span>' : ''; }
  const foodBtn = (x, mo) => `<button class="sm fooditem" style="margin:2px" data-act="dPick" data-id="${x.id}">${esc(x.name)}</button>`;
  function foodList(p, D, mo) {
    const foods = F.allFoods(p);
    return F.FOOD_GROUPS.concat(['I miei']).map(g => { const arr = foods.filter(x => x.grp === g && true); if (!arr.length) return ''; return `<div class="grp"><div class="mute small" style="margin:8px 0 2px">${esc(g)}</div>${arr.map(x => foodBtn(x, mo)).join('')}</div>`; }).join('');
  }
  function resultsHtml(p, q) {
    const res = F.searchFoods(p, q, 15);
    return res.length ? `<div class="mute small" style="margin:6px 0 2px">${res.length} risultati nella tua lista</div>${res.map(x => `<div class="row" style="border-top:1px solid var(--line);padding:6px 0"><span class="grow small"><b>${esc(x.name)}</b><br><span class="mute">${x.k} kcal · P ${x.p} · C ${x.c} · G ${x.f} per 100 ${F.unitOf(x)}</span></span><button class="sm primary" data-act="dPick" data-id="${x.id}">Scegli</button></div>`).join('')}` : '';
  }
  async function offFetch(q, out) {
    out.innerHTML = 'Cerco online…';
    try {
      const fields = 'code,product_name,brands,nutriments,categories_tags';
      const url = /^\d{8,14}$/.test(q) ? `https://world.openfoodfacts.org/api/v2/product/${q}.json?fields=${fields}` : `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=8&fields=${fields}&lc=it`;
      const r = await fetch(url); if (!r.ok) throw 0; const d = await r.json(); const list = d.products || (d.product ? [d.product] : []);
      ui.offList = list.filter(x => x.product_name && x.nutriments && x.nutriments['energy-kcal_100g'] != null).slice(0, 8);
      out.innerHTML = ui.offList.length ? `<div class="mute small" style="margin:6px 0 2px">Trovati online (Open Food Facts)</div>` + ui.offList.map((x, i) => `<div class="row" style="padding:4px 0;border-top:1px solid var(--line)"><span class="grow small">${esc(x.product_name)}${x.brands ? ' · ' + esc(x.brands) : ''}<br><span class="mute">${fx(x.nutriments['energy-kcal_100g'])} kcal · P ${fx(x.nutriments.proteins_100g || 0)} · C ${fx(x.nutriments.carbohydrates_100g || 0)} · G ${fx(x.nutriments.fat_100g || 0)} (per 100 g)</span></span><button class="sm" data-act="offUse" data-i="${i}">Usa</button></div>`).join('') : '<span class="mute">Nessun risultato online. Puoi inserire i valori dall\'etichetta qui sotto.</span>';
    } catch (e) { out.innerHTML = '<span class="mute">Ricerca online non riuscita: serve internet. Puoi inserire i valori dall\'etichetta qui sotto.</span>'; }
  }
  let offTimer = null;
  function liveSearch(q) {
    const p = P(), res = $('#dres'), onl = $('#donl'), lst = $('#dlist'); if (!res) return;
    clearTimeout(offTimer); q = q.trim();
    if (!q) { res.innerHTML = ''; onl.innerHTML = ''; if (lst) lst.style.display = ''; return; }
    if (lst) lst.style.display = 'none';
    res.innerHTML = resultsHtml(p, q); onl.innerHTML = '';
    if (q.length >= 3 && navigator.onLine !== false) { onl.innerHTML = '<span class="mute">Cerco anche online…</span>'; offTimer = setTimeout(() => { const cur = $('#dq'); if (cur && cur.value.trim() === q) offFetch(q, $('#donl')); }, 600); }
  }
  function seasonSheet(p) {
    const m = new Date().getMonth() + 1, foods = F.allFoods(p).filter(x => x.se && x.se.length < 12 && F.inSeason(x, m));
    const grp = g => foods.filter(x => x.grp === g);
    const block = (g, title) => grp(g).length ? `<div class="mute small" style="margin:10px 0 4px">${title} (${grp(g).length})</div>${grp(g).map(x => `<button class="sm" style="margin:2px" data-act="dSeasonPick" data-id="${x.id}">${esc(x.name)}</button>`).join('')}` : '';
    return `<div data-act="dSeason" style="position:fixed;inset:0;background:#000a;z-index:90" aria-hidden="true"></div>
      <div role="dialog" aria-label="Alimenti di stagione" style="position:fixed;left:0;right:0;bottom:0;max-height:75vh;overflow:auto;z-index:91;background:var(--panel);border-top:2px solid var(--accent);border-radius:16px 16px 0 0;padding:14px 16px calc(18px + env(safe-area-inset-bottom))">
        <div class="row"><h2 class="grow" style="margin:0">Di stagione: ${F.monthName(m)}</h2><button class="ghost sm" data-act="dSeason">Chiudi</button></div>
        <p class="mute small" style="margin:4px 0 0">Secondo la data del tuo telefono. Tocca un alimento per aggiungerlo.</p>
        ${block('Verdura', 'Verdura')}${block('Frutta', 'Frutta e frutta secca')}</div>`;
  }
  function addPanel(p, mi) {
    const D = ui.diet, nut = p.nutrition, foods = F.allFoods(p), pk = D.pick;
    let pickBox = '';
    if (pk) {
      if (pk.r) { const rec = F.getRecipe(p, pk.r); pickBox = `<div class="card" style="border-color:var(--accent2)"><b>${esc(rec.name)}</b><div class="row wrap" style="margin-top:6px"><input id="dn" inputmode="decimal" style="width:80px" value="${pk.n || 1}" aria-label="Porzioni"><span>porzioni</span><button class="sm primary" data-act="dAdd" data-m="${mi}">Aggiungi</button></div></div>`; }
      else { const fd = F.getFood(p, pk.f); pickBox = `<div class="card" style="border-color:var(--accent2)"><b>${esc(fd.name)}</b> ${chips(fd)}<div class="mute small">per 100 ${F.unitOf(fd)}: ${fd.k} kcal · P ${fd.p} · C ${fd.c} · G ${fd.f}${fd.note ? ' · ' + esc(fd.note) : ''}</div>${fd.custom ? `<div class="row small" style="margin-top:6px"><span class="mute grow">Misurato in <b>${F.unitOf(fd)}</b></span><button class="sm" data-act="foodUnit" data-id="${fd.id}">Cambia in ${fd.liq ? 'grammi' : 'millilitri'}</button></div>` : ''}${F.isAvoided(p, fd) ? '<div class="msg danger small" style="margin-top:6px">Hai segnato che questo alimento ti dà fastidio.</div>' : ''}${limitBox(p, fd)}
        <div class="row wrap" style="margin-top:6px"><input id="dg" inputmode="decimal" style="width:90px" value="${pk.g || 100}" aria-label="${fd.liq ? 'Millilitri' : 'Grammi'}"><span>${F.unitOf(fd)}</span>${(fd.units || []).map(u => `<button class="sm" data-act="dUnit" data-g="${u[1]}">${esc(u[0])}</button>`).join('')}<button class="sm primary" data-act="dAdd" data-m="${mi}">Aggiungi</button></div></div>`; }
    }
    const rec = nut.recipes;
    const mo = new Date(D.date + 'T12:00:00').getMonth() + 1;
    const list = foodList(p, D, mo);
    return `<div class="card" style="border-color:var(--ion)"><div class="row"><b class="grow">Aggiungi a ${F.MEALS[mi].toLowerCase()}</b><button class="ghost sm" data-act="dClose">Chiudi</button></div>
      ${pickBox}
      <input id="dq" placeholder="Scrivi un alimento: pollo, latte, gallette…" autocomplete="off" aria-label="Cerca alimento" style="margin:8px 0"><div class="row" style="margin-bottom:6px"><button class="sm" data-act="dSeason">Frutta e verdura di stagione: ${F.monthName(new Date().getMonth() + 1)}</button></div>
      ${rec.length ? `<div class="mute small">Le mie ricette</div><div>${rec.map(r => `<button class="sm" style="margin:2px" data-act="dPickR" data-id="${r.id}">${esc(r.name)}</button>`).join('')}</div>` : ''}
      ${D.sheet ? seasonSheet(p) : ''}<div id="dres"></div><div id="donl" class="small" style="margin:6px 0"></div><div id="dlist">${list}</div>
      <div class="row" style="margin-top:8px"><button class="sm primary" data-act="scan">Scansiona codice a barre</button></div>
      <details style="margin-top:10px" ${D.scanned ? 'open' : ''}><summary>Cerca online o aggiungi un alimento nuovo</summary>
        <div class="row" style="margin:8px 0"><input id="offq" placeholder="Nome o codice a barre" aria-label="Cerca online"><button class="sm" data-act="offSearch">Cerca</button></div>
        <div id="offRes" class="small mute">La ricerca usa Open Food Facts (database aperto): invia solo il testo che scrivi, nessun dato personale.</div>
        <h3>Da etichetta (valori per 100 g)</h3>
        <input id="nf_name" placeholder="Nome" aria-label="Nome alimento"><div class="grid2" style="margin-top:6px"><input id="nf_k" inputmode="decimal" placeholder="kcal" aria-label="kcal"><input id="nf_p" inputmode="decimal" placeholder="proteine g" aria-label="Proteine"><input id="nf_c" inputmode="decimal" placeholder="carboidrati g" aria-label="Carboidrati"><input id="nf_f" inputmode="decimal" placeholder="grassi g" aria-label="Grassi"></div>
        <button class="sm" style="margin-top:8px" data-act="dNewFood">Salva alimento</button></details></div>`;
  }
  const GOAL_NAME = { mass: 'massa', strength: 'forza', cut: 'dimagrimento', recomp: 'ricomposizione' };
  function guideHtml(p, D) {
    const open = D.guide || {}, c = F.calc(p), goal = c.goal;
    const sec = (k, title, body) => `<div class="card"><button class="ghost" style="display:block;width:100%;text-align:left;padding:0" data-act="dGuide" data-k="${k}" aria-expanded="${!!open[k]}"><h2 style="margin:0">${open[k] ? '▾' : '▸'} ${title}</h2></button>${open[k] ? body : ''}</div>`;
    const li = arr => arr.map(x => `<div class="small" style="padding:4px 0;border-top:1px solid var(--line)"><b>${esc(x[0])}</b><div class="mute">${esc(x[1])}</div></div>`).join('');
    const mine = F.SUPER.filter(x => x.g.indexOf(goal) >= 0), rest = F.SUPER.filter(x => x.g.indexOf(goal) < 0);
    return sec('best', 'Migliori proteine, carboidrati e grassi', F.BEST.map(b => `<h3>${esc(b.t)}</h3><p class="mute small" style="margin:0 0 4px">${esc(b.note)}</p>${li(b.items)}`).join('')) +
      sec('who', 'Linee guida OMS e piramide alimentare', `<h3>Valori OMS per un adulto</h3>${li(F.WHO)}<h3>Piramide alimentare mediterranea</h3>${li(F.PYRAMID)}<p class="mute small">Fonti: ${F.GUIDE_SOURCES.map(s => `<a href="${s[1]}" target="_blank" rel="noopener">${esc(s[0])}</a>`).join(' · ')}. L'app non scarica questi dati ogni volta: sono un riassunto da controllare sulle fonti.</p>`) +
      sec('safe', 'Sicurezza, tossicità e catena alimentare', li(F.SAFETY)) +
      sec('super', 'Super food per il tuo obiettivo', `<p class="mute small" style="margin:0 0 6px">${esc(F.SUPER_NOTE)}</p><h3>Per ${esc(GOAL_NAME[goal] || 'il tuo obiettivo')}</h3>${li(mine.map(x => [x.n, x.b]))}${rest.length ? `<h3>Altri alimenti utili</h3>${li(rest.map(x => [x.n, x.b]))}` : ''}`);
  }
  function intolCard(p) {
    const it = p.intol || {};
    return `<div class="card"><h2>Intolleranze e alimenti che ti danno fastidio</h2><p class="small mute" style="margin:0 0 6px">Segna quello che non tolleri: l'app lo toglie dai piani e ti avvisa se lo inserisci. Per allergie vere o patologie parla con il medico.</p>
      <div class="row wrap">${F.INTOL.map(([k, l]) => `<button class="sm ${it[k] ? 'primary' : ''}" data-act="intolTog" data-k="${k}" aria-pressed="${!!it[k]}">${it[k] ? '✓ ' : ''}${esc(l)}</button>`).join('')}</div>
      <label for="intolOther" style="margin-top:8px">Altri alimenti da evitare (separati da virgola)</label><input id="intolOther" value="${esc(it.other || '')}" placeholder="Es. cipolla, cavolfiore, pomodoro" autocomplete="off"></div>`;
  }
  function planDayHtml(pl) {
    const D = ui.diet, GN = { mass: 'massa', strength: 'forza', cut: 'dimagrimento', recomp: 'ricomposizione' }, tune = pl.mode === 'tune';
    const row = (o) => `<div class="small" style="padding:3px 0;display:flex;gap:8px;align-items:center"><span class="grow"><b>${esc(o.fd.name)}</b> ${o.g} ${F.unitOf(o.fd)}${o.fd.units && o.fd.units[0] && o.fd.units[0][1] <= 60 && o.fd.units[0][1] >= 8 && o.g >= o.fd.units[0][1] ? ` <span class="mute">(circa ${Math.round(o.g / o.fd.units[0][1])} ${esc(o.fd.units[0][0].replace(/^1 /, ''))})</span>` : ''}</span><button class="ghost sm" data-act="dSkip" data-id="${o.fd.id}" aria-label="Non ho ${esc(o.fd.name)}">Non ce l'ho</button></div>`;
    const miss = []; const g = pl.gap; if (g.p > 12) miss.push(fx(g.p) + ' g di proteine'); if (g.c > 25) miss.push(fx(g.c) + ' g di carboidrati'); if (g.f > 8) miss.push(fx(g.f) + ' g di grassi');
    return `<h3>Piano per chiudere la giornata</h3>
      <p class="mute small" style="margin:0 0 6px">Pensato per il tuo obiettivo (${esc(GN[pl.goal] || 'mantenimento')})${pl.minor ? ', in crescita (niente integratori)' : ''}. Pasti con alimenti che si abbinano bene e dosi entro i massimi consigliati.${pl.avoided.length ? ` <b>Escluso:</b> ${esc(pl.avoided.join(', '))}.` : ''}</p>
      <div class="row wrap" style="margin-bottom:6px"><button class="sm ${!tune ? 'primary' : ''}" data-act="dPlanMode" data-m="fill">Riempi solo i pasti mancanti</button><button class="sm ${tune ? 'primary' : ''}" data-act="dPlanMode" data-m="tune">Ritocca anche quello che ho mangiato</button></div>
      ${pl.raises.length ? `<div style="padding:6px 0;border-top:1px solid var(--line)"><b class="small">Aumenta le dosi già inserite</b>${pl.raises.map((w, i) => `<div class="small" style="padding:3px 0;display:flex;gap:8px;align-items:center"><span class="grow">${esc(F.MEALS[w.mi])}: ${esc(w.fd.name)} da ${w.from} a <b>${w.to}</b> ${F.unitOf(w.fd)}</span><button class="sm" data-act="dPlanRaise" data-i="${i}">Applica</button></div>`).join('')}</div>` : ''}
      ${pl.meals.length ? pl.meals.map(m => `<div style="padding:8px 0;border-top:1px solid var(--line)"><div class="row"><b class="grow">${esc(m.nm)}</b><span class="mute small">${fx(m.tot.k)} kcal · P ${fx(m.tot.p)} · C ${fx(m.tot.c)} · G ${fx(m.tot.f)}</span></div>${m.items.map(row).join('')}
        ${m.why.map(w => `<div class="mute small" style="margin:2px 0">• ${esc(w)}</div>`).join('')}<button class="sm primary" style="margin-top:4px" data-act="dPlanMeal" data-m="${m.mi}">Aggiungi a ${esc(m.nm.toLowerCase())}</button></div>`).join('') : '<div class="msg ok small" style="margin-top:6px">I pasti sono già pieni: niente da aggiungere. Se vuoi limare le dosi usa "Ritocca anche quello che ho mangiato".</div>'}
      <div class="small" style="margin-top:6px">A fine giornata: <b>${fx(pl.final.k)} / ${fx(pl.target.k)} kcal</b> · P ${fx(pl.final.p)}/${fx(pl.target.p)} · C ${fx(pl.final.c)}/${fx(pl.target.c)} · G ${fx(pl.final.f)}/${fx(pl.target.f)}.${miss.length ? ` Restano scoperti ${miss.join(', ')}: i limiti di salute non permettono di coprirli oggi senza esagerare.` : ' Il fabbisogno è coperto.'}</div>
      ${pl.meals.length || pl.raises.length ? '<div class="row wrap" style="margin-top:6px"><button class="sm primary" data-act="dPlanAllDay">Applica tutto il piano</button></div>' : ''}
      <p class="mute small" style="margin:6px 0 0">Se un alimento non lo hai tocca "Non ce l'ho": passo a un altro che si abbina bene e ricalcolo le quantità. Se qualcosa ti dà fastidio, segnalo nelle intolleranze qui sotto.</p>`;
  }
  // eliminazione con doppia conferma; avvisa se la ricetta è usata nei pasti
  function delRecipe(id) {
    const p = P(), r = p.nutrition.recipes.find(x => x.id === id); if (!r) return false;
    const used = Object.values(p.nutrition.days || {}).reduce((n, d) => n + (d.meals || []).reduce((m, it) => m + it.filter(x => x.r === id).length, 0), 0);
    if (!confirm(`Eliminare la ricetta "${r.name}"?${used ? `\n\nÈ usata ${used} volt${used === 1 ? 'a' : 'e'} nei tuoi pasti: quelle voci scompariranno dal diario.` : ''}`)) return false;
    if (!confirm(`ULTIMA CONFERMA\n\n"${r.name}" verrà cancellata in modo definitivo e non si può recuperare (solo da un backup). Vuoi davvero eliminarla?`)) return false;
    p.nutrition.recipes = p.nutrition.recipes.filter(x => x.id !== id); save(); toast('Ricetta eliminata'); return true;
  }
  const MEAL_PLAN_LABEL = ['colazione', 'pranzo', 'spuntino', 'cena'];
  function planHtml(plan, rem) {
    if (!plan.items.length) return '<div class="msg ok small">Macro quasi a target: non serve aggiungere altro.</div>';
    const L = plan.left, short = [];
    if (L.p > 12) short.push(`${fx(L.p)} g di proteine`); if (L.c > 25) short.push(`${fx(L.c)} g di carboidrati`); if (L.f > 8) short.push(`${fx(L.f)} g di grassi`);
    return `<h3>Per chiudere la giornata mangia ancora</h3><p class="mute small" style="margin:0 0 4px">Calcolato sul tuo obiettivo: ${esc(({ mass: 'massa', strength: 'forza', cut: 'dimagrimento', recomp: 'ricomposizione' })[plan.goal] || plan.goal || 'mantenimento')}${plan.minor ? ' e crescita (profilo minorenne: niente integratori)' : ''}. Se manca un alimento tocca "Non ce l'ho": passo al prossimo della stessa categoria con la quantità ribilanciata.</p>
      ${plan.items.map((o, i) => `<div style="padding:6px 0;border-top:1px solid var(--line)"><div class="row"><div class="grow small"><b>${esc(o.fd.name)} ${o.g} g</b>${o.fd.units && o.fd.units[0] && o.fd.units[0][1] <= 60 && o.g >= o.fd.units[0][1] ? ' <span class="mute">(circa ' + Math.round(o.g / o.fd.units[0][1]) + ' × ' + esc(o.fd.units[0][0].replace(/^1 /, '')) + ')</span>' : ''} ${o.capped ? '<span class="chip warn">al limite</span>' : ''}<div class="mute">${fx(o.m.k)} kcal · P ${fx(o.m.p)} · C ${fx(o.m.c)} · G ${fx(o.m.f)} · per ${esc(o.why)} · di solito a ${MEAL_PLAN_LABEL[F.mealGuess(o.fd)]}</div>${o.alts.length ? `<div class="mute">Al posto suo: ${o.alts.map(a => `${esc(a.x.name)} ${a.g} g${a.ok ? '' : ' (non basta da solo)'}`).join(' oppure ')}</div>` : ''}</div><div style="display:flex;flex-direction:column;gap:4px"><button class="sm primary" data-act="dPlanAdd" data-i="${i}">Ce l'ho: aggiungi</button><button class="sm" data-act="dSkip" data-id="${o.fd.id}">Non ce l'ho</button></div></div></div>`).join('')}
      <div class="small" style="margin-top:6px">Totale proposto: <b>${fx(plan.added.k)} kcal</b> · P ${fx(plan.added.p)} · C ${fx(plan.added.c)} · G ${fx(plan.added.f)}.${short.length ? ` Con i limiti di salute restano scoperti ${short.join(', ')}: ripeti dopo il prossimo pasto o aggiungi altri alimenti.` : ' Il fabbisogno è coperto.'}</div>
      <div class="row wrap" style="margin-top:6px"><button class="sm primary" data-act="dPlanAll">Aggiungi tutto ai pasti</button></div>`;
  }
  function viewDiet() {
    const p = P(), c = F.calc(p), nut = ensureNut(p), D = ui.diet = ui.diet || { date: F.todayISO(), addTo: null, pick: null, fill: false };
    const day = F.dayOf(p, D.date), tot = F.dayTotal(p, day), isToday = D.date === F.todayISO();
    const rem = { k: c.kcal - tot.k, p: c.protein - tot.p, c: c.carbs - tot.c, f: c.fat - tot.f };
    const lims = F.checkLimits(p, D.date), mon = new Date().getMonth() + 1;
    const inSeasonNow = F.allFoods(p).filter(x => (x.grp === 'Frutta' || x.grp === 'Verdura') && x.se && x.se.length < 12 && F.inSeason(x, mon));
    const meals = F.MEALS.map((nm, mi) => {
      const items = day.meals[mi], mt = F.mealTotal(p, items), tg = F.MEAL_SPLIT[mi];
      const open = !!(D.open && D.open[mi]) || D.addTo === mi, tk = c.kcal * tg, left = tk - mt.k;
      const pcs = [['P', mt.p, c.protein * tg], ['C', mt.c, c.carbs * tg], ['G', mt.f, c.fat * tg]];
      return `<div class="card"><button class="ghost" style="display:block;width:100%;text-align:left;padding:0" data-act="dToggle" data-m="${mi}" aria-expanded="${open}"><div class="row"><h2 class="grow" style="margin:0">${open ? '▾' : '▸'} ${nm}</h2><span class="small mute">${fx(mt.k)} / ${fx(tk)} kcal</span></div>
        <div class="bar" style="margin:6px 0 4px"><i style="width:${Math.min(100, Math.round(mt.k / tk * 100))}%${left < -tk * 0.05 ? ';background:var(--warn)' : ''}"></i></div>
        <div class="small mute">${left > 20 ? 'mancano ' + fx(left) + ' kcal' : left < -tk * 0.05 ? 'sopra di ' + fx(-left) + ' kcal' : 'a target'} · ${pcs.map(([l, v, t]) => `${l} ${fx(v)}/${fx(t)}`).join(' · ')} g</div></button>
        ${open ? `${items.map((it, ii) => itemLine(p, it, mi, ii)).join('') || '<p class="mute small" style="margin:8px 0">Ancora niente.</p>'}
        <div class="row" style="margin-top:8px"><button class="sm primary" data-act="dOpen" data-m="${mi}">+ Aggiungi</button></div>
        ${D.addTo === mi ? addPanel(p, mi) : ''}` : ''}</div>`;
    }).join('');
    const plan = D.fill ? F.planDay(p, D.date, { mode: D.mode, exclude: D.skip }) : null;
    return `<h1>Dieta</h1>
      <div class="row" style="margin-bottom:8px"><button class="sm" data-act="dDay" data-d="-1" aria-label="Giorno prima">←</button><div class="grow" style="text-align:center"><b>${isToday ? 'Oggi' : esc(D.date)}</b></div><button class="sm" data-act="dDay" data-d="1" aria-label="Giorno dopo">→</button></div>
      <div class="card"><h2>Fabbisogno di ${esc(p.name)}</h2>${bar('Calorie', tot.k, c.kcal, 'kcal')}${bar('Proteine', tot.p, c.protein, 'g')}${bar('Carboidrati', tot.c, c.carbs, 'g')}${bar('Grassi', tot.f, c.fat, 'g')}
        <p class="small" style="margin:8px 0 0">${rem.k > 50 ? `Ti mancano ${fx(rem.k)} kcal (P ${fx(Math.max(0, rem.p))} g · C ${fx(Math.max(0, rem.c))} g · G ${fx(Math.max(0, rem.f))} g).` : rem.k < -100 ? `Sei sopra di ${fx(-rem.k)} kcal.` : 'Giornata a target.'}</p>
        ${F.intolWarnings(p, D.date).map(w => `<div class="msg danger small">${esc(w.text)}</div>`).join('')}
        ${lims.map(w => `<div class="msg warn small">${esc(w.text)}</div>`).join('')}
        <div class="row wrap" style="margin-top:8px"><button class="sm" data-act="dFill">${D.fill ? 'Nascondi suggerimenti' : 'Bilancia la giornata'}</button><button class="sm" data-act="dCopy">Copia il giorno prima</button><button class="sm" data-act="newRecipe">Nuova ricetta</button></div>
        ${plan ? planDayHtml(plan) : ''}</div>
      ${meals}
      ${intolCard(p)}
      ${guideHtml(p, D)}
      <div class="card"><h2>Di stagione a ${F.monthName(mon)}</h2><p class="small mute" style="margin:0 0 6px">Frutta e verdura al meglio adesso: costano meno e hanno più sapore e nutrienti.</p>${inSeasonNow.map(x => `<span class="chip" style="margin:2px">${esc(x.name)}</span>`).join('')}</div>
      <div class="card"><details ${D.imp ? 'open' : ''}><summary>Importa una ricetta ricevuta</summary><p class="mute small" style="margin:6px 0">Incolla qui il testo che ti hanno mandato (inizia con FORGIA-RICETTA). Resta solo sul tuo telefono.</p><textarea id="rcImp" style="min-height:70px;font-family:inherit" aria-label="Testo della ricetta"></textarea><button class="sm primary" style="margin-top:6px" data-act="rImport">Importa</button></details></div>
      ${nut.recipes.length ? `<div class="card"><h2>Le mie ricette</h2>${nut.recipes.map(r => { const t = F.recipeTotal(p, r), n = r.portions || 1; return `<div class="row" style="border-top:1px solid var(--line);padding:6px 0"><div class="grow"><b>${esc(r.name)}</b><div class="mute small">${n} porz. · a porzione ${fx(t.k / n)} kcal · P ${fx(t.p / n)} · C ${fx(t.c / n)} · G ${fx(t.f / n)}</div></div><button class="sm" data-act="editRecipe" data-id="${r.id}">Modifica</button><button class="sm danger" data-act="rDelList" data-id="${r.id}" aria-label="Elimina ${esc(r.name)}">Elimina</button></div>`; }).join('')}</div>` : ''}
      <p class="mute small">Valori indicativi per 100 g di prodotto crudo (se non scritto diversamente): se un prodotto ha l'etichetta, salvalo come nuovo alimento. I dati restano sul tuo dispositivo.</p>`;
  }
  function recipeCheck(p, R, tot, n) {
    const c = F.calc(p), date = F.todayISO(), day = F.dayTotal(p, F.dayOf(p, date));
    const ud = F.usageOf(p, date), uw = F.weekUsage(p, date), w = [];
    R.items.forEach(([id, g]) => { const fd = F.getFood(p, id); if (!fd || !fd.lim) return; const per = g / n, left = F.capLeft(p, fd, date, ud, uw); if (per > left + 1) w.push(`${fd.name}: ${fx(per)} g a porzione, oggi ne puoi ancora mangiare ${fx(left)} g. ${fd.lim.t}`); });
    const rem = { k: c.kcal - day.k - tot.k / n, p: c.protein - day.p - tot.p / n, c: c.carbs - day.c - tot.c / n, f: c.fat - day.f - tot.f / n };
    const plan = R.items.length ? F.planFill(p, rem, date) : null;
    return `<h3>Controllo prima di prepararla</h3>${w.map(x => `<div class="msg warn small">${esc(x)}</div>`).join('') || '<div class="msg ok small">Gli ingredienti rispettano i limiti di oggi.</div>'}
      ${plan ? `<p class="small mute" style="margin:6px 0">Se oggi mangi una porzione, ti restano ${fx(Math.max(0, rem.k))} kcal.</p>${planHtml(plan, rem).replace(/<div class="row"><div class="grow small">/g, '<div class="row"><div class="grow small">').replace(/<button[^>]*data-act="dPlan[^>]*>[^<]*<\/button>/g, '')}` : ''}`;
  }
  function viewRecipe() {
    const p = P(), R = ui.sub.draft, foods = F.allFoods(p);
    const tot = F.recipeTotal(p, R), n = R.portions || 1;
    return `<div class="row"><button class="ghost" data-act="rCancel">← Dieta</button></div><h1>${ui.sub.id ? 'Ricetta' : 'Nuova ricetta'}</h1>
      <div class="card"><label for="rc_name">Nome</label><input id="rc_name" value="${esc(R.name)}" placeholder="Es. Torta proteica"><label for="rc_por">Porzioni</label><input id="rc_por" inputmode="numeric" style="width:90px" value="${R.portions}">
      <h3>Ingredienti</h3>${R.items.map((x, i) => { const fd = F.getFood(p, x[0]); return fd ? `<div class="row" style="border-top:1px solid var(--line);padding:6px 0"><span class="grow">${esc(fd.name)}</span><input inputmode="decimal" style="width:80px" data-ri="${i}" value="${x[1]}" aria-label="${fd.liq ? 'Millilitri' : 'Grammi'} ${esc(fd.name)}"><span class="mute small">${F.unitOf(fd)}</span><button class="ghost sm danger" data-act="rIngRm" data-i="${i}" aria-label="Rimuovi">✕</button></div>` : ''; }).join('') || '<p class="mute small">Aggiungi gli ingredienti.</p>'}
      <div class="row wrap" style="margin-top:8px"><input id="rc_add" list="rc_dl" autocomplete="off" style="flex:1;min-width:140px" placeholder="Scrivi un ingrediente…" aria-label="Ingrediente"><datalist id="rc_dl">${foods.map(x => `<option value="${esc(x.name)}"></option>`).join('')}</datalist><input id="rc_g" inputmode="decimal" style="width:80px" placeholder="g" aria-label="Grammi"><button class="sm" data-act="rIngAdd">Aggiungi</button></div>
      <label for="rc_note">Note</label><textarea id="rc_note" style="min-height:60px;font-family:inherit">${esc(R.note || '')}</textarea></div>
      <div class="card"><h2>Valori</h2><div class="grid3 k4"><div class="kpi"><b>${fx(tot.k / n)}</b><span>kcal a porz.</span></div><div class="kpi"><b>${fx(tot.p / n)} g</b><span>proteine</span></div><div class="kpi"><b>${fx(tot.c / n)} g</b><span>carboidrati</span></div><div class="kpi"><b>${fx(tot.f / n)} g</b><span>grassi</span></div></div><p class="mute small">Totale ricetta: ${fx(tot.k)} kcal · P ${fx(tot.p)} · C ${fx(tot.c)} · G ${fx(tot.f)}.</p>${recipeCheck(p, R, tot, n)}</div>
      <div class="row"><button class="primary grow" data-act="rSave">Salva ricetta</button>${ui.sub.id ? '<button data-act="rShare">Condividi</button><button class="danger" data-act="rDel">Elimina</button>' : ''}</div>`;
  }

  /* --- corpo --- */
  function recoveryView(p) {
    const rec = F.recovery(p), rows = Object.keys(F.MUSCLE_LABEL).map(m => [m, rec[m]]).sort((a, b) => a[1].pct - b[1].pct);
    const done = (p.sessions || []).length, tired = rows.filter(([, o]) => o.pct < 70);
    const plan = planOf(p);
    let tip;
    if (!done) tip = 'Registra la prima seduta e qui vedrai quanto ha recuperato ogni muscolo.';
    else if (!tired.length) tip = 'Tutti i muscoli sono quasi pronti o pronti: puoi allenare qualsiasi gruppo.';
    else tip = `Più affaticati: ${tired.slice(0, 3).map(([m, o]) => F.MUSCLE_LABEL[m] + ' ' + o.pct + '%').join(', ')}. Meglio allenare altri muscoli oggi, o ridurre le serie su questi.`;
    const sub = plan ? plan.days.map((d, i) => { const r = F.dayReadiness(p, d, rec); return `<div class="row small" style="border-top:1px solid var(--line);padding:5px 0"><span class="grow">${esc(d.name)}</span><span class="chip" style="border-color:${F.recColor(r.pct)};color:${F.recColor(r.pct)}">${r.pct}% pronto</span></div>`; }).join('') : '';
    return `<h1>Recupero muscolare</h1><p class="mute small">Stima dalla tua cronologia: peso sollevato rispetto al tuo massimale, serie, sforzo (RPE), muscoli principali e secondari, età e rientro. Non è una misura medica.</p>
      <div class="bodies"><figure>${F.bodySVG('f', { rec })}<figcaption>Fronte</figcaption></figure><figure>${F.bodySVG('b', { rec })}<figcaption>Retro</figcaption></figure></div>
      <div class="legend"><span><i style="background:#34d399"></i>90-100%</span><span><i style="background:#a3e635"></i>70-89</span><span><i style="background:#facc15"></i>50-69</span><span><i style="background:#f97316"></i>30-49</span><span><i style="background:#ef4444"></i>sotto 30</span></div>
      <div class="msg tip" style="margin:10px 0">${esc(tip)}</div>
      <div class="card"><h2>Muscolo per muscolo</h2>${rows.map(([m, o]) => `<div style="margin:7px 0"><div class="row small"><span class="grow">${esc(F.MUSCLE_LABEL[m])}</span><b style="color:${F.recColor(o.pct)}">${o.pct}%</b><span class="mute" style="min-width:104px;text-align:right;white-space:nowrap">${o.hours ? 'pronto tra ' + (o.hours >= 48 ? Math.round(o.hours / 24) + ' g' : o.hours + ' h') : (o.last ? 'pronto' : 'a riposo')}</span></div><div style="height:6px;background:var(--line);border-radius:3px"><div style="height:6px;width:${o.pct}%;background:${F.recColor(o.pct)};border-radius:3px"></div></div></div>`).join('')}</div>
      ${sub ? `<div class="card"><h2>Quanto sei pronto per ogni giorno</h2>${sub}<p class="mute small" style="margin:6px 0 0">Sopra il 90% vai a tutta. Tra 70 e 90 allena normale. Sotto il 70 scegli un altro giorno o riduci le serie.</p></div>` : ''}`;
  }
  function viewBody() {
    const p = P(), pain = p.pain || {}, z = ui.zone, mode = ui.bodyMode || 'rec';
    const seg = `<div class="row" style="margin-bottom:10px" role="group" aria-label="Sezione corpo"><button class="${mode === 'rec' ? 'primary' : ''} grow" data-act="bodyMode" data-m="rec">Recupero</button><button class="${mode === 'pain' ? 'primary' : ''} grow" data-act="bodyMode" data-m="pain">Dolore</button></div>`;
    if (mode === 'rec') return seg + recoveryView(p);
    return seg + (F.PX && F.PX.on() ? bodyPainX(p, z) : bodyPain(p, pain, z));
  }
  /* dolore per struttura e lato (prova su FORGIA) */
  /* finestra di conferma per ogni eliminazione; con reasons chiede anche il motivo */
  function ask(o) {
    return new Promise(res => {
      const d = document.createElement('div'); d.className = 'dlg'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
      d.innerHTML = `<div class="dlgbox"><h2>${esc(o.title)}</h2>${o.text ? `<p class="small">${esc(o.text)}</p>` : ''}${(o.reasons || []).map((t, i) => `<button class="dlgr" data-r="${i}">${esc(t)}</button>`).join('')}<div class="row" style="margin-top:10px"><button class="grow" data-x="0">Annulla</button>${o.reasons ? '' : `<button class="danger grow" data-x="1">${esc(o.ok || 'Elimina')}</button>`}</div></div>`;
      d.onclick = e => { const b = e.target.closest('button'); if (!b) { if (e.target === d) { d.remove(); res(null); } return; } d.remove(); res(b.dataset.r != null ? { reason: o.reasons[+b.dataset.r] } : b.dataset.x === '1' ? { ok: true } : null); };
      document.body.appendChild(d); const f = d.querySelector('button'); if (f) f.focus();
    });
  }
  const PAIN_WHY = ['Il dolore è passato', 'L\'ho inserito per sbaglio'];
  async function pxRemove(p, id, sides, label) {
    const r = await ask({ title: 'Togliere questo dolore?', text: label + '. Perché lo togli?', reasons: PAIN_WHY }); if (!r) return false;
    const mistake = r.reason === PAIN_WHY[1];
    sides.forEach(x => { if (F.pxCur(p).some(e => e.s === id && e.sd === x)) mistake ? F.pxPurge(p, id, x) : F.pxSet(p, id, x, 0); });
    if (mistake) F.pxPurge(p, id, 'C');
    save(); toast(mistake ? 'Dolore eliminato: non resta nello storico' : 'Dolore segnato come passato'); return true;
  }
  function painChips(p) {
    const seen = new Set(), out = [];
    F.pxCur(p).sort((x, y) => y.l - x.l).forEach(e => {
      const k = e.legacy ? e.s : e.s + '|' + e.sd; if (seen.has(k)) return; seen.add(k);
      const lbl = e.legacy ? esc(F.PX.by[e.s].name) : esc(F.pxLabel(e));
      out.push(`<span class="chip ${e.l >= 7 ? 'danger' : e.l >= 4 ? 'warn' : ''}" style="display:inline-flex;align-items:center;gap:6px;padding-right:4px"><button class="ghost sm" style="padding:2px 4px;min-height:0" data-act="pxHome" data-id="${e.s}" data-sd="${e.legacy ? 'B' : e.sd}">${lbl} ${e.l}/10</button><button class="ghost sm" style="padding:2px 8px;min-height:0" data-act="pxHomeDel" data-id="${e.s}" data-sd="${e.legacy ? 'B' : e.sd}" aria-label="Togli ${lbl}">✕</button></span>`);
    });
    return out.join('');
  }
  function pxEditor(p) {
    const o = F.PX.by[ui.pxSel]; if (!o) return '';
    const cur = F.pxCur(p).filter(e => e.s === o.id), lv = sd => (cur.find(e => e.sd === sd) || { l: 0 }).l;
    const mode = o.c ? 'C' : (ui.pxSide || 'B'), sides = o.c ? ['C'] : mode === 'B' ? ['L', 'R'] : [mode];
    const sideBtn = (m, t) => `<button class="${mode === m ? 'primary' : ''} grow" data-act="pxSide" data-sd="${m}">${t}</button>`;
    const tmp = ui.pxTmp || {};
    const chips = (k, arr) => arr.map(v => `<button class="sm ${tmp[k] === v ? 'primary' : ''}" data-act="pxTag" data-k="${k}" data-v="${esc(v)}">${esc(v)}</button>`).join(' ');
    return `<div class="card" id="pxEd"><h2>${esc(o.name)}</h2><p class="mute small" style="margin:0 0 8px">${esc(F.PX.KIND[o.kind] || o.kind)} · ${esc(F.ZONES[o.zone])}. Il punto bianco sul corpo mostra dove si trova.</p>
      ${o.c ? '' : `<div class="row" style="margin-bottom:8px" role="group" aria-label="Lato">${sideBtn('L', 'Sinistro')}${sideBtn('R', 'Destro')}${sideBtn('B', 'Entrambi')}</div>`}
      ${sides.map(sd => `<label for="pxR${sd}">${o.c ? 'Intensità' : 'Lato ' + F.PX.SIDE[sd]}: <b id="pxV${sd}">${lv(sd)}</b>/10</label><input id="pxR${sd}" class="pxr" type="range" min="0" max="10" step="1" value="${lv(sd)}" data-s="${o.id}" data-sd="${sd}">`).join('')}
      <div class="row small mute"><span class="grow">0 = nessun dolore</span><span>10 = insopportabile</span></div>
      <h3 style="margin:10px 0 4px">Che tipo di dolore?</h3><div class="row" style="flex-wrap:wrap;gap:6px">${chips('ty', F.PX.TYPES)}</div>
      <h3 style="margin:10px 0 4px">Quando lo senti?</h3><div class="row" style="flex-wrap:wrap;gap:6px">${chips('wh', F.PX.WHEN)}</div>
      ${ui.msgs.length ? msgs(ui.msgs.map(t => ({ t, k: 'warn' }))) : ''}
      <div class="row" style="margin-top:10px"><button class="primary grow" data-act="pxClose">Conferma</button><button class="sm" data-act="pxClear">Nessun dolore qui</button></div></div>`;
  }
  function bodyPainX(p, z) {
    const PX = F.PX, cur = F.pxCur(p), plan = planOf(p), a = plan ? F.analyzePlan(plan, p) : null, bad = a ? a.flags.filter(f => f.k === 'danger') : [];
    const fig = v => `<figure>${F.bodySVG(v, { pain: p.pain || {}, sideMap: F.pxSideMap(p, v), sel: z, extra: F.pxMarkers(v, p, { zone: z, sel: ui.pxSel }) })}<figcaption>${v === 'f' ? 'Fronte' : 'Retro'}</figcaption></figure>`;
    const opt = o => `<option value="${o.id}">${esc(o.name)}</option>`;
    const shortL = PX.list.filter(o => !o.full).map(opt).join('');
    const fullL = Object.keys(F.ZONES).map(k => { const it = PX.list.filter(o => o.full && o.zone === k); return it.length ? `<optgroup label="${esc(F.ZONES[k])}">${it.map(opt).join('')}</optgroup>` : ''; }).join('');
    const zs = z ? PX.list.filter(o => o.zone === z && o.full) : [];
    const rows = cur.sort((x, y) => y.l - x.l);
    return `<h1>Dove senti dolore?</h1><p class="mute small">Cerca la parte che ti fa male, scegli dall'elenco corto (gruppi comuni) o da quello completo (muscoli, tendini, articolazioni), oppure tocca il corpo. Poi indica il lato e l'intensità da 1 a 10. L'app adatta schede e allenamenti: 1-3 attenzione, 4-6 meno serie e meno esercizi stressanti, 7-10 esclude gli esercizi che la caricano.</p>
      <div class="card"><input id="pxQ" type="search" placeholder="Cerca: es. spalla, achille, menisco, bicipite…" autocomplete="off" value="${esc(ui.pxQ || '')}" aria-label="Cerca struttura"><div id="pxRes">${pxResHtml(ui.pxQ || '')}</div>
      <div class="row" style="margin-top:8px;gap:8px"><label class="grow small">Elenco corto<select id="pxShort"><option value="">Scegli…</option>${shortL}</select></label><label class="grow small">Elenco completo<select id="pxFull"><option value="">Scegli…</option>${fullL}</select></label></div></div>
      <div class="bodies">${fig('f')}${fig('b')}</div>
      <div class="legend"><span><i style="background:var(--body-fill)"></i>ok</span><span><i style="background:#facc15"></i>1-3</span><span><i style="background:#f97316"></i>4-6</span><span><i style="background:#ef4444"></i>7-10</span></div>
      ${z && !ui.pxSel ? `<div class="card"><h2>${esc(F.ZONES[z])}</h2><p class="small">${esc(F.ZONE_TIPS[z] || '')}</p><p class="mute small" style="margin:0 0 6px">Tocca un punto sul corpo o scegli qui:</p><div class="row" style="flex-wrap:wrap;gap:6px">${zs.map(o => `<button class="sm" data-act="pxPick" data-id="${o.id}">${esc(o.name)}</button>`).join('')}<button class="sm" data-act="pxPick" data-id="${PX.ZONE_G[z]}">Tutta la zona</button></div><div style="margin-top:8px"><button class="sm" data-act="zoneClose">Chiudi</button></div></div>` : ''}
      ${pxEditor(p)}
      ${rows.length ? `<div class="card"><h2>Dolori segnalati</h2>${rows.map(e => `<div class="row" style="margin:4px 0"><span class="grow">${esc(F.pxLabel(e))}${e.ty || e.wh ? `<span class="mute small"> · ${esc([e.ty, e.wh].filter(Boolean).join(' · ').toLowerCase())}</span>` : ''}</span><span class="chip ${e.l >= 7 ? 'danger' : e.l >= 4 ? 'warn' : ''}">${e.l}/10</span><button class="sm" data-act="pxPick" data-id="${e.s}" data-sd="${e.sd}">Modifica</button></div>`).join('')}
        ${bad.length ? `<h3>La scheda attiva contiene esercizi sconsigliati</h3>${msgs(bad)}<button class="primary sm" data-act="adapt" data-id="${plan.id}">Crea versione adattata</button>` : plan ? '<div class="msg ok">La scheda attiva è compatibile con le zone segnalate.</div>' : ''}
        ${rows.some(e => e.l >= 7) ? '<div class="msg danger">Un dolore forte (7 o più), formicolio, gonfiore, dolore notturno o che dura da giorni va valutato da un medico o fisioterapista. L\'app non fa diagnosi.</div>' : ''}</div>` : '<div class="msg ok">Nessun dolore segnalato.</div>'}
      ${X.painHistoryCard(p)}`;
  }
  function pxResHtml(q) {
    if (!q || !q.trim()) return '';
    const r = F.pxSearch(q, 8);
    return r.length ? `<div class="pxlist">${r.map(o => `<button class="sm" style="display:block;width:100%;text-align:left;margin:4px 0" data-act="pxPick" data-id="${o.id}">${esc(o.name)} <span class="mute small">· ${esc(F.PX.KIND[o.kind] || o.kind)}</span></button>`).join('')}</div>` : '<p class="mute small">Nessun risultato: prova un altro nome o scegli dagli elenchi.</p>';
  }
  function bodyPain(p, pain, z) {
    const list = Object.entries(pain).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const plan = planOf(p), a = plan ? F.analyzePlan(plan, p) : null, bad = a ? a.flags.filter(f => f.k === 'danger') : [];
    return `<h1>Dove senti dolore?</h1><p class="mute small">Tocca una zona del corpo e indica l'intensità da 1 a 10. L'app adatta schede e allenamenti: 1-3 resta attenzione, 4-6 riduce serie e toglie gli esercizi più stressanti, 7-10 esclude gli esercizi che la caricano.</p>
      <div class="bodies"><figure>${F.bodySVG('f', { pain, sel: z })}<figcaption>Fronte</figcaption></figure><figure>${F.bodySVG('b', { pain, sel: z })}<figcaption>Retro</figcaption></figure></div>
      <div class="legend"><span><i style="background:var(--body-fill)"></i>ok</span><span><i style="background:#facc15"></i>1-3</span><span><i style="background:#f97316"></i>4-6</span><span><i style="background:#ef4444"></i>7-10</span></div>
      ${z ? `<div class="card"><h2>${esc(F.ZONES[z])}</h2><label for="painR">Intensità del dolore: <b id="painV">${pain[z] || 0}</b>/10</label>
        <input id="painR" type="range" min="0" max="10" step="1" value="${pain[z] || 0}" data-zone="${z}"><div class="row small mute"><span class="grow">0 = nessun dolore</span><span>10 = insopportabile</span></div>
        <p class="small">${esc(F.ZONE_TIPS[z] || '')}</p>${ui.msgs.length ? msgs(ui.msgs.map(t => ({ t, k: 'warn' }))) : ''}
        <button class="sm" data-act="zoneClear" data-zone="${z}">Nessun dolore qui</button> <button class="sm" data-act="zoneClose">Chiudi</button></div>` : ''}
      ${list.length ? `<div class="card"><h2>Zone segnalate</h2>${list.map(([k, v]) => `<div class="row" style="margin:4px 0"><span class="grow">${esc(F.ZONES[k])}</span><span class="chip ${v >= 7 ? 'danger' : v >= 4 ? 'warn' : ''}">${v}/10</span><button class="sm" data-act="zoneOpen" data-zone="${k}">Modifica</button></div>`).join('')}
        ${bad.length ? `<h3>La scheda attiva contiene esercizi sconsigliati</h3>${msgs(bad)}<button class="primary sm" data-act="adapt" data-id="${plan.id}">Crea versione adattata</button>` : plan ? '<div class="msg ok">La scheda attiva è compatibile con le zone segnalate.</div>' : ''}
        ${list.some(([, v]) => v >= 7) ? '<div class="msg danger">Un dolore forte (7 o più), formicolio, gonfiore, dolore notturno o che dura da giorni va valutato da un medico o fisioterapista. L\'app non fa diagnosi.</div>' : ''}</div>` : '<div class="msg ok">Nessun dolore segnalato.</div>'}
      ${X.painHistoryCard(p)}`;
  }

  /* --- progressi --- */
  /* --- modifica di una seduta già salvata --- */
  function viewEditSession() {
    const d = ui.sub.draft;
    return `<div class="row"><button class="ghost" data-act="esCancel">← Annulla</button></div><h1>Modifica seduta</h1>
      <div class="card"><b>${esc(d.dayName)}</b><label for="esDate" style="margin-top:6px">Data</label><input id="esDate" type="date" value="${esc(d.date)}" max="${F.todayISO()}" data-es="date"></div>
      ${d.ex.map((e, i) => `<div class="card"><b>${esc(e.name)}</b>
        <table class="sets"><thead><tr><th>#</th><th>Peso (kg)</th><th>Rip</th><th>RPE</th><th></th></tr></thead><tbody>${e.sets.map((x, k) => `<tr><td>${k + 1}</td>
          <td><input inputmode="decimal" data-es="${i}:${k}:kg" value="${x.kg || ''}" placeholder="kg" aria-label="Peso serie ${k + 1}"></td>
          <td><input inputmode="numeric" data-es="${i}:${k}:reps" value="${x.reps != null ? x.reps : ''}" placeholder="rip" aria-label="Ripetizioni serie ${k + 1}"></td>
          <td><input inputmode="decimal" data-es="${i}:${k}:rpe" value="${x.rpe || ''}" placeholder="1-10" aria-label="Sforzo serie ${k + 1}"></td>
          <td><button class="ghost sm danger" data-act="esDelSet" data-i="${i}" data-s="${k}" aria-label="Togli serie ${k + 1}">✕</button></td></tr>`).join('')}</tbody></table>
        <div class="row" style="margin-top:6px"><button class="ghost sm" data-act="esAddSet" data-i="${i}">+ serie</button></div></div>`).join('')}
      <div class="row"><button class="primary grow" data-act="esSave">Salva modifiche</button></div>`;
  }

  /* --- misure corporee --- */
  function measSeries(p, k) {
    if (k === 'weight') return (p.weights || []).slice().sort((a, b) => a.date.localeCompare(b.date)).map(w => ({ x: w.date, y: w.kg }));
    return (p.measures || []).filter(m => m.v && m.v[k] > 0).sort((a, b) => a.date.localeCompare(b.date)).map(m => ({ x: m.date, y: m.v[k] }));
  }
  function measuresCard(p) {
    const sel = ui.measSel && F.MEASURES.some(m => m[0] === ui.measSel) ? ui.measSel : 'weight', def = F.MEASURES.find(m => m[0] === sel);
    const ser = measSeries(p, sel), last = ser[ser.length - 1], first = ser[0], prev = ser[ser.length - 2];
    const d = (a, b) => { const v = Math.round((a - b) * 10) / 10; return (v > 0 ? '+' : '') + v; };
    const lastOf = k => { const s = measSeries(p, k); return s.length ? s[s.length - 1].y : null; };
    const ORD = ['weight', 'bf', 'thighL', 'thighR', 'calfL', 'calfR', 'bicL', 'bicR', 'forL', 'forR', 'chest', 'waist', 'hip', 'shoulder', 'neck', 'wrist'];
    const inputs = ORD.map(k => F.MEASURES.find(m => m[0] === k)).map(([k, n, u]) => `<div><label for="ms_${k}" style="margin:0">${esc(n)} (${u})</label><input id="ms_${k}" data-ms="${k}" inputmode="decimal" placeholder="${lastOf(k) != null ? lastOf(k) : '—'}" aria-label="${esc(n)}"></div>`).join('');
    const rows = F.MEASURES.map(([k, n, u]) => { const s = measSeries(p, k); if (!s.length) return ''; const l = s[s.length - 1], pv = s[s.length - 2], f = s[0]; return `<tr><td>${esc(n)}</td><td><b>${fmt(l.y, 1)}</b> ${u}</td><td>${pv ? d(l.y, pv.y) : '—'}</td><td>${s.length > 1 ? d(l.y, f.y) : '—'}</td></tr>`; }).join('');
    const asym = [['thighR', 'thighL', 'Cosce'], ['calfR', 'calfL', 'Polpacci'], ['bicR', 'bicL', 'Bicipiti'], ['forR', 'forL', 'Avambracci']].map(([a, b, n]) => { const x = lastOf(a), y = lastOf(b); return x && y && Math.abs(x - y) / Math.max(x, y) > 0.03 ? `${n}: differenza di ${fmt(Math.abs(x - y), 1)} cm (${x > y ? 'destra' : 'sinistra'} più grande)` : null; }).filter(Boolean);
    return `<div class="card"><h2>Misure corporee</h2>
      <p class="mute small" style="margin:0 0 8px">Misura sempre allo stesso modo, la mattina a digiuno. Compila solo quello che hai misurato.</p>
      <label for="msDate">Data</label><input id="msDate" type="date" value="${F.todayISO()}" max="${F.todayISO()}">
      <div class="grid2" style="margin-top:8px">${inputs}</div>
      <div class="row wrap" style="margin-top:10px"><button class="primary sm" data-act="saveMeas">Salva misure</button></div>
      <h3 style="margin-top:14px">Andamento</h3>
      <select id="measSel" aria-label="Misura da mostrare">${F.MEASURES.map(([k, n]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
      ${lineChart(ser.map(s => ({ x: s.x, y: s.y })), def[2])}
      ${last ? `<p class="small" style="margin:6px 0 0">Ultimo valore: <b>${fmt(last.y, 1)} ${def[2]}</b>${prev ? ` · rispetto alla volta prima ${d(last.y, prev.y)}` : ''}${first && first !== last ? ` · dall'inizio ${d(last.y, first.y)}` : ''}</p>` : '<p class="mute small">Nessun dato per questa misura.</p>'}
      ${rows ? `<h3 style="margin-top:14px">Tutte le misure</h3><table class="sets" style="text-align:left"><thead><tr><th style="text-align:left">Misura</th><th>Ultima</th><th>Prima</th><th>Inizio</th></tr></thead><tbody>${rows}</tbody></table>` : ''}
      ${asym.length ? `<div class="msg tip" style="margin-top:8px">${asym.map(esc).join('<br>')}. Sotto il 3% è normale. Sopra, aggiungi esercizi a un braccio o a una gamba per volta, partendo dal lato più debole.</div>` : ''}
      ${(p.measures || []).length ? '<div class="row" style="margin-top:8px"><button class="ghost sm danger" data-act="delMeas">Elimina l\'ultima registrazione</button></div>' : ''}</div>`;
  }
  function rmCard(p) {
    const rows = F.rmTable(p), on = F.rmActive(p), d = x => x == null ? '–' : fmt(x, 1);
    if (!on) return `<div class="card"><h2>Come si calcola il massimale</h2><p class="mute small" style="margin-top:0">I massimali per ora non sono attivi: li attiva il tuo allenatore. Intanto ti spiego il calcolo.</p>${F.rmExplain(p)}${rows.length ? `<div class="small" style="margin-top:6px">${rows.slice(0, 8).map(r => `<div class="row" style="border-top:1px solid var(--line);padding:4px 0"><span class="grow">${esc(r.name)}</span><span class="mute">stima ${d(r.est)} kg</span></div>`).join('')}</div>` : ''}</div>`;
    return `<div class="card"><h2>I miei massimali (1RM)</h2><p class="mute small" style="margin-top:0">Scrivi il tuo massimale se lo conosci. Se lasci vuoto uso la stima dalle tue serie. L'allenatore vede questi dati nella tua scheda.</p>
      ${rows.length ? `<div class="small">${rows.map(r => `<div class="row wrap" style="gap:8px;border-top:1px solid var(--line);padding:6px 0"><span class="grow">${esc(r.name)}</span><input inputmode="decimal" style="width:76px" data-rm="${esc(r.id)}" value="${r.manual || ''}" placeholder="${r.est ? fmt(r.est, 0) : 'kg'}" aria-label="Massimale ${esc(r.name)}"><span class="mute" style="min-width:150px;text-align:right">stima ${d(r.est)} · ultima ${d(r.last)}${r.last && r.est ? ' <b style="color:' + (r.last >= r.est ? 'var(--ok,#2a9d4b)' : 'inherit') + '">' + (r.last >= r.est ? '=' : fmt(r.last - r.est, 1)) + '</b>' : ''}</span></div>`).join('')}</div>` : '<p class="small mute">Registra qualche seduta e qui compaiono le stime.</p>'}</div>`;
  }
  function viewProg() {
    const p = P(), ws = (p.weights || []).slice().sort((a, b) => a.date.localeCompare(b.date));
    const exs = {}; (p.sessions || []).forEach(s => s.ex.forEach(e => { if (e.exId) exs[e.exId] = e.name; }));
    const sel = ui.progEx && exs[ui.progEx] ? ui.progEx : Object.keys(exs)[0];
    let exChart = '<p class="mute small">Registra una seduta per vedere i progressi per esercizio.</p>';
    if (sel) {
      const e = F.EXMAP[sel], h = histFor(p, sel), timed = e && e.unit === 'sec';
      const pts = h.map(x => { const w = x.sets.filter(s => !s.warm); const best = Math.max(...w.map(s => s.kg || 0)); const r = Math.max(...w.map(s => s.reps || 0)); const e1 = best ? Math.max(...w.map(s => F.e1rm(s.kg, s.reps) || 0)) : 0; return { x: x.date, y: best ? (e1 || best) : r, kg: best, r }; });
      const unit = pts.some(q => q.kg) ? 'kg (forza stimata)' : (timed ? 'secondi' : 'ripetizioni');
      exChart = `<select id="progSel" aria-label="Esercizio">${Object.entries(exs).map(([k, n]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>${lineChart(pts, unit)}<p class="mute small">${unit.includes('forza') ? 'Forza massima stimata dalla serie migliore (formula di Epley).' : 'Migliore serie di ogni seduta.'}</p>`;
    }
    const sess = (p.sessions || []).slice().reverse().slice(0, 8);
    return `<h1>Progressi</h1>
      <div class="card"><h2>Peso corporeo</h2>${lineChart(ws.map(w => ({ x: w.date, y: w.kg })), 'kg')}
      <div class="row" style="margin-top:8px"><input id="wIn" inputmode="decimal" placeholder="kg" style="max-width:110px" aria-label="Nuovo peso"><button class="sm primary" data-act="addWeight">Registra peso</button></div>
      <div class="msg ${F.weightAdvice(p).kind}" style="margin-top:8px">${esc(F.weightAdvice(p).text)}</div></div>
      ${measuresCard(p)}
      <div class="card"><h2>Forza per esercizio</h2>${exChart}</div>
      ${rmCard(p)}
      <div class="card"><h2>Ultime sedute</h2>${sess.length ? sess.map(s => `<details style="padding:4px 0;border-top:1px solid var(--line)"><summary class="small"><b>${esc(s.dayName)}</b> · ${s.date} <span class="mute">· ${s.ex.length} esercizi, ${s.ex.reduce((a, e) => a + e.sets.length, 0)} serie</span></summary>
        ${s.ex.map(e => `<div class="small" style="margin:6px 0"><b>${esc(e.name)}</b><br><span class="mute">${e.sets.map((x, k) => `${k + 1}) ${x.kg ? fmt(x.kg, 1) + ' kg × ' : ''}${x.reps}${x.rpe ? ' (RPE ' + x.rpe + ')' : ''}`).join(' · ')}</span></div>`).join('')}
        <div class="row wrap" style="margin-top:6px"><button class="sm" data-act="editSession" data-id="${s.id}">Modifica</button><button class="ghost sm danger" data-act="delSession" data-id="${s.id}" aria-label="Elimina seduta">Elimina</button></div></details>`).join('') : '<p class="mute small">Ancora nessuna seduta.</p>'}</div>`;
  }

  /* --- profilo / impostazioni --- */
  function recoverCard() {
    if (!(AC.enabled && AC.me) || (AC.imp && AC.imp())) return '';
    if (!ui.rec) return `<div class="card"><h2>Recupera i miei allenamenti</h2><p class="small mute">Se i tuoi allenamenti non si vedono, qui cerco le copie salvate su questo telefono.</p><div class="row wrap" style="gap:6px"><button class="sm" data-act="recScan">Cerca su questo telefono</button><label class="btn sm" style="margin:0;display:inline-flex;align-items:center">Carica un file di backup<input type="file" id="recFile" accept=".zip,.json" multiple hidden></label></div><p class="mute small" style="margin-top:6px">Hai un file di backup (dal tuo telefono, dal PC o dal tuo allenatore)? Caricalo: riconosco il tuo profilo e lo unisco ai dati che hai.</p></div>`;
    const l = ui.rec.list;
    return `<div class="card"><h2>Recupera i miei allenamenti</h2>${l.length ? '<p class="small mute">Ho trovato queste copie su questo telefono. Tocca «Aggiungi» sul tuo profilo: i dati si uniscono a quelli che hai già, senza cancellare nulla.</p>' : '<p class="small">Non ho trovato allenamenti salvati su questo telefono.</p>'}
      ${l.map(x => `<div class="row" style="gap:8px;border-top:1px solid var(--line);padding:8px 0"><div class="grow"><b>${esc(x.name)}</b> ${x.birth ? '<span class="mute small">' + esc(x.birth) + '</span>' : ''}<div class="mute small">${x.n} allenament${x.n === 1 ? 'o' : 'i'} · ultimo ${esc(x.last)}</div></div><button class="sm primary" data-act="recAdd" data-k="${esc(x.k || '')}" data-j="${x.j}" ${x.f ? 'data-f="1"' : ''}>Aggiungi</button></div>`).join('')}
      <div class="row wrap" style="gap:6px;margin-top:8px"><label class="btn sm" style="margin:0;display:inline-flex;align-items:center">Carica un file di backup<input type="file" id="recFile" accept=".zip,.json" multiple hidden></label><button class="ghost sm" data-act="recClose">Chiudi</button></div></div>`;
  }
  function viewMe() {
    const p = P(); if (!p) return `<h1>Profilo</h1>${X.advancedCard()}${bioCard()}${recoverCard()}<p class="mute small">${esc(BRAND)} dà indicazioni generali di allenamento, non sostituisce medico, fisioterapista o allenatore.</p>`;
    const c = F.calc(p), pm = Math.round(c.protein / 4);
    return `<h1>${esc(p.name)}</h1>
      <div class="card"><div class="row"><div class="grow"><b>${c.age} anni</b> · ${p.height} cm · ${p.weight} kg · BMI ${fmt(c.bmi, 1)}<div class="mute small">${esc(p.goal === 'auto' ? goalLabel(p) : GOALS[p.goal])} · ${esc(STYLES[p.style])} · ${p.days} giorni · ${LEVELS[p.level]}${p.stopMonths >= 12 ? ' · rientro dopo ' + Math.round(p.stopMonths / 12) + ' anni' : ''}</div></div>
        <button class="sm" data-act="editProfile">Modifica</button></div>${c.minor ? '<div class="msg tip">Profilo minorenne: regole di tutela attive. Programma da condividere con l\'allenatore.</div>' : ''}</div>
      ${GYM ? '' : `
      <div class="card"><h2>Alimentazione su misura</h2><div class="grid3 k4"><div class="kpi"><b>${fmt(c.kcal)}</b><span>kcal/giorno</span></div><div class="kpi"><b>${c.protein} g</b><span>proteine</span></div><div class="kpi"><b>${c.carbs} g</b><span>carboidrati</span></div><div class="kpi"><b>${c.fat} g</b><span>grassi</span></div></div>
      <p class="small">Metabolismo basale ${fmt(c.bmr)} kcal · fabbisogno stimato ${fmt(c.tdee)} kcal (${c.delta > 0 ? '+' : ''}${c.delta} per l'obiettivo).</p>${msgs(c.notes.map(t => ({ t })))}
      <h3>Come distribuirle</h3><p class="small">4 pasti con circa <b>${pm} g di proteine</b> ciascuno, carboidrati attorno all'allenamento, verdure ad ogni pasto, acqua ${fmt(c.water, 1)} l.</p>
      <h3>Equivalenze di circa 30 g di proteine</h3><p class="small mute">130 g petto di pollo crudo · 125 g tonno al naturale · 5 albumi + 1 uovo · 250 g yogurt greco · 40 g proteine in polvere · 170 g pesce bianco.</p>
      ${c.minor ? '<div class="msg warn">Per i minorenni: niente integratori e niente bruciagrassi. Le proteine si coprono con il cibo.</div>' : '<div class="msg">Integratori con evidenza: creatina monoidrato 3-5 g/giorno, proteine in polvere solo se non arrivi col cibo. Maltodestrine, destrosio e BCAA non servono per questo obiettivo.</div>'}</div>
      ${intolCard(p)}
`}
      ${GYM ? '<div hidden>' : '<div class="card">'}<h2>Aggiornamenti e richieste</h2>
      <p class="small">Versione installata: <b>${esc(F.VERSION.version)}</b> (build ${F.VERSION.build})${NATIVE ? ' · app Android' + (APKB ? ' ' + APKB : '') : ''}</p>
      <p class="small" role="status">${esc(ui.updMsg || '')}</p>${ui.updStuck ? '<div class="msg warn small">L\'aggiornamento non è ancora arrivato su questo telefono. Chiudi del tutto l\'app, riaprila e tocca di nuovo Aggiorna. I tuoi dati non si perdono.</div>' : ''}
      <div class="row wrap"><button class="sm" data-act="checkUpdate">Controlla aggiornamenti</button>${ui.update ? '<button class="sm primary" data-act="applyUpdate">Aggiorna ora</button>' : ''}${ui.apkNew ? '<button class="sm primary" data-act="apkInstall">Scarica il nuovo APK</button>' : ''}</div>
      ${GYM ? '</div>' : `
      <h3>Chiedi una modifica o una funzione nuova</h3>
      <textarea id="reqText" style="min-height:90px;font-family:inherit;font-size:.95rem" placeholder="Es. aggiungi un esercizio, cambia i colori, correggi un errore…" aria-label="Richiesta di modifica"></textarea>
      <div class="row wrap" style="margin-top:8px"><button class="sm primary" data-act="sendReq">Invia richiesta (GitHub)</button><button class="sm" data-act="copyReq">Copia per la chat</button></div>
      <p class="mute small">"Invia" apre GitHub con la richiesta già scritta (serve essere collegati a GitHub). Non vengono inclusi dati personali o di salute: solo versione dell'app e il tuo testo. Chi gestisce l'app la legge e la applica; l'aggiornamento arriva da solo alla prossima apertura.</p>
      ${(S.requests || []).slice(-5).reverse().map(r => `<div class="row small" style="border-top:1px solid var(--line);padding:5px 0"><span class="grow">${esc(r.text.slice(0, 90))}${r.text.length > 90 ? '…' : ''}<br><span class="mute">${r.date} · ${esc(r.how)}</span></span><button class="ghost sm danger" data-act="delReq" data-id="${r.id}" aria-label="Elimina richiesta">✕</button></div>`).join('')}</div>
`}
      ${GYM ? '' : `
      <div class="card"><h2>Server IA (opzionale)</h2><p class="mute small">Collegando il tuo server FORGIA (cartella <code>server</code>) l'analista IA legge le schede da foto e commenta i tuoi dati.</p>
      <input id="aiUrl" placeholder="https://il-tuo-server" value="${esc(S.settings.aiUrl || '')}" aria-label="Indirizzo server IA"><button class="sm" style="margin-top:8px" data-act="saveAI">Salva</button></div>
`}
      <div class="card"><h2>Backup automatico ogni giorno</h2>${backupCard()}</div>
      <div class="card"><h2>Dati</h2><div class="row wrap"><button class="sm" data-act="export">Esporta backup</button><label class="btn sm" style="margin:0;display:inline-flex;align-items:center">Importa file (profilo o backup)<input type="file" id="impBk" accept="application/json,.json" hidden></label></div>
</div>
      ${X.dataCard(p)}
      ${X.advancedCard()}${bioCard()}${recoverCard()}
      ${AC.enabled ? '' : `<div class="card"><h2>I tuoi profili</h2><p class="small mute" style="margin:0 0 6px">Ogni profilo ha i suoi dati. Prima di eliminarne uno fai il backup: l'eliminazione è definitiva.</p>
        ${S.profiles.map(x => `<div class="row" style="border-top:1px solid var(--line);padding:6px 0"><div class="grow"><b>${esc(x.name)}</b>${x.id === S.active ? ' <span class="chip">in uso</span>' : ''}<div class="mute small">${F.ageOf(x.birth)} anni · ${x.weight} kg</div></div>${x.id !== S.active ? `<button class="sm" data-act="profUse" data-id="${x.id}">Apri</button>` : ''}<button class="sm danger" data-act="delProfile" data-id="${x.id}" aria-label="Elimina il profilo di ${esc(x.name)}">Elimina</button></div>`).join('')}
        <button class="sm primary" style="margin-top:8px" data-act="newProfile">+ Aggiungi un profilo</button></div>`}
      <p class="mute small">${esc(BRAND)} dà indicazioni generali di allenamento${GYM ? '' : ' e alimentazione'}, non sostituisce medico, fisioterapista o allenatore.</p>`;
  }

  /* ---------- azioni ---------- */
  function adaptPlan(pl, p) {
    const n = JSON.parse(JSON.stringify(pl)); n.id = 'p' + uid(); n.title = pl.title.replace(/ \(adattata\)$/, '') + ' (adattata)'; n.source = 'adattata'; n.createdAt = F.todayISO(); n.notes = (n.notes || []).slice();
    let changed = 0;
    n.days.forEach(d => { const taken = new Set(d.exercises.map(x => x.exId)); d.exercises = d.exercises.map(x => {
      const e = F.EXMAP[x.exId]; if (!e) return x;
      const c = F.painCheck(e, p.pain);
      if (c.blocked) { const alt = F.alternatives(x.exId, p).filter(o => !taken.has(o.id))[0]; changed++; if (alt) taken.add(alt.id); if (!alt) { n.notes.push(`${d.name}: ${x.name} rimosso per il dolore.`); return null; } n.notes.push(`${d.name}: ${x.name} → ${alt.name} per il dolore.`); return Object.assign({}, x, { exId: alt.id, name: alt.name, note: 'sostituisce ' + x.name, repsInfo: undefined, reps: x.repsInfo ? (x.repsInfo.max ? '10-15' : x.reps) : x.reps, unit: alt.unit, flags: [] }); }
      if (c.reduce && x.sets > 2) { changed++; return Object.assign({}, x, { sets: x.sets - 1, note: c.notes.join(' · ') }); }
      return x;
    }).filter(Boolean); });
    // regola di volume per rientro/minorenni
    if (F.isReturning(p) || F.isMinor(p)) n.days.forEach(d => { let tot = d.exercises.reduce((s, x) => s + x.sets, 0); const lim = F.isMinor(p) ? 20 : 18; let guard = 0; while (tot > lim && guard++ < 60) { const idx = d.exercises.map((x, i) => [x.sets, i]).filter(a => a[0] > 2).sort((a, b) => b[0] - a[0])[0]; if (!idx) break; d.exercises[idx[1]].sets--; tot--; changed++; } });
    n.notes.push(`Versione adattata: ${changed} modifiche per profilo (${F.isMinor(p) ? 'minorenne, ' : ''}${F.isReturning(p) ? 'rientro, ' : ''}dolori).`);
    return n;
  }
  function download(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
  async function ai(kind, payload) {
    if (!S.settings.aiUrl) { toast('Collega il server IA in Profilo per usare questa funzione.'); return null; }
    try { const r = await fetch(S.settings.aiUrl.replace(/\/$/, '') + '/api/' + kind, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!r.ok) throw new Error(r.status); return await r.json(); }
    catch (e) { toast('Server IA non raggiungibile.'); return null; }
  }
  const act = {
    dDay(t) { ui.diet.skip = {}; const d = new Date(ui.diet.date + 'T12:00:00'); d.setDate(d.getDate() + +t.dataset.d); ui.diet.date = d.toISOString().slice(0, 10); ui.diet.addTo = null; ui.diet.pick = null; render(); },
    dOpen(t) { ui.diet.addTo = +t.dataset.m; ui.diet.pick = null; render(); },
    dClose() { ui.diet.addTo = null; ui.diet.pick = null; render(); },
    dPick(t) { const fd = F.getFood(P(), t.dataset.id); ui.diet.pick = { f: t.dataset.id, g: fd.units && fd.units[0] ? fd.units[0][1] : 100 }; render(); const e = $('#dg'); if (e) { e.scrollIntoView({ block: 'center' }); } },
    dPickR(t) { ui.diet.pick = { r: t.dataset.id, n: 1 }; render(); },
    dUnit(t) { const e = $('#dg'); if (e) e.value = t.dataset.g; },
    dAdd(t) {
      const p = P(), D = ui.diet, pk = D.pick, mi = +t.dataset.m, day = F.dayOf(p, D.date); if (!pk) return;
      if (pk.r) { const n = parseFloat(String($('#dn').value).replace(',', '.')); if (!(n > 0)) return toast('Inserisci le porzioni'); day.meals[mi].push({ r: pk.r, n }); }
      else { const g = parseFloat(String($('#dg').value).replace(',', '.')); if (!(g > 0)) return toast('Inserisci i grammi'); day.meals[mi].push({ f: pk.f, g }); }
      D.pick = null; save(); render();
    },
    async dRm(t) { if (!(await ask({ title: 'Togliere questo alimento dal pasto?' }))) return; const day = F.dayOf(P(), ui.diet.date); day.meals[+t.dataset.m].splice(+t.dataset.i, 1); save(); render(); },
    dToggle(t) { const D = ui.diet; D.open = D.open || {}; const m = +t.dataset.m; D.open[m] = !D.open[m]; if (!D.open[m] && D.addTo === m) { D.addTo = null; D.pick = null; } render(); },
    dGuide(t) { const D = ui.diet; D.guide = D.guide || {}; D.guide[t.dataset.k] = !D.guide[t.dataset.k]; render(); },
    async scan() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return toast('Fotocamera non disponibile: scrivi il codice a barre nella ricerca');
      if (!('BarcodeDetector' in window)) { ui.diet.scanned = true; render(); return toast('Questo browser non legge i codici: scrivi le cifre nella ricerca'); }
      const ov = document.createElement('div'); ov.id = 'scanov'; ov.style.cssText = 'position:fixed;inset:0;background:#000d;z-index:99;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:16px';
      ov.innerHTML = '<video id="scanv" playsinline muted style="width:100%;max-width:420px;border-radius:12px;border:2px solid var(--accent)"></video><div class="small">Inquadra il codice a barre del prodotto</div><button class="sm" id="scanx">Annulla</button>';
      document.body.appendChild(ov);
      let stream, stop = false; const done = () => { stop = true; if (stream) stream.getTracks().forEach(t => t.stop()); ov.remove(); };
      $('#scanx').onclick = done;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        const v = $('#scanv'); v.srcObject = stream; await v.play();
        const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
        const loop = async () => {
          if (stop) return;
          try { const r = await det.detect(v); if (r.length) { const code = r[0].rawValue; done(); ui.diet.scanned = true; render(); const q = $('#offq'); if (q) { q.value = code; act.offSearch(); } return; } } catch (e) {}
          setTimeout(loop, 250);
        };
        loop();
      } catch (e) { done(); toast('Permesso alla fotocamera negato o non disponibile'); }
    },
    dSkip(t) { const D = ui.diet; D.skip = D.skip || {}; D.skip[t.dataset.id] = true; render(); },
    foodUnit(t) { const p = P(), f = p.nutrition.foods.find(x => x.id === t.dataset.id); if (!f) return; f.liq = f.liq ? 0 : 1; save(); render(); },
    dSeason() { ui.diet.sheet = !ui.diet.sheet; render(); },
    dSeasonPick(t) { ui.diet.sheet = false; act.dPick(t); },
    dPlanAdd(t) {
      const p = P(), D = ui.diet, c = F.calc(p), tot = F.dayTotal(p, F.dayOf(p, D.date)), plan = F.planFill(p, { k: c.kcal - tot.k, p: c.protein - tot.p, c: c.carbs - tot.c, f: c.fat - tot.f }, D.date, { exclude: D.skip }), o = plan.items[+t.dataset.i];
      if (!o) return; F.dayOf(p, D.date).meals[F.mealGuess(o.fd)].push({ f: o.fd.id, g: o.g }); save(); render(); toast(o.fd.name + ' aggiunto a ' + MEAL_PLAN_LABEL[F.mealGuess(o.fd)]);
    },
    dPlanAll() {
      const p = P(), D = ui.diet, c = F.calc(p), tot = F.dayTotal(p, F.dayOf(p, D.date)), plan = F.planFill(p, { k: c.kcal - tot.k, p: c.protein - tot.p, c: c.carbs - tot.c, f: c.fat - tot.f }, D.date, { exclude: D.skip }), day = F.dayOf(p, D.date);
      plan.items.forEach(o => day.meals[F.mealGuess(o.fd)].push({ f: o.fd.id, g: o.g })); save(); render(); toast('Aggiunto tutto ai pasti');
    },
    dPlanMode(t) { ui.diet.mode = t.dataset.m; render(); },
    dPlanRaise(t) { const p = P(), D = ui.diet, pl = F.planDay(p, D.date, { mode: 'tune', exclude: D.skip }), w = pl.raises[+t.dataset.i]; if (!w) return; const it = F.dayOf(p, D.date).meals[w.mi][w.ii]; if (it && it.f === w.fd.id) it.g = w.to; save(); render(); toast('Dose aggiornata'); },
    dPlanMeal(t) { const p = P(), D = ui.diet, pl = F.planDay(p, D.date, { mode: D.mode, exclude: D.skip }), m = pl.meals.find(x => x.mi === +t.dataset.m); if (!m) return; const day = F.dayOf(p, D.date); m.items.forEach(o => day.meals[m.mi].push({ f: o.fd.id, g: o.g })); D.open = D.open || {}; D.open[m.mi] = true; save(); render(); toast(m.nm + ' aggiornato'); },
    dPlanAllDay() { const p = P(), D = ui.diet, pl = F.planDay(p, D.date, { mode: D.mode, exclude: D.skip }), day = F.dayOf(p, D.date); pl.raises.forEach(w => { const it = day.meals[w.mi][w.ii]; if (it && it.f === w.fd.id) it.g = w.to; }); pl.meals.forEach(m => m.items.forEach(o => day.meals[m.mi].push({ f: o.fd.id, g: o.g }))); save(); render(); toast('Piano applicato'); },
    intolTog(t) { const p = P(); p.intol = p.intol || {}; p.intol[t.dataset.k] = !p.intol[t.dataset.k]; save(); render(); },
    dFill() { ui.diet.fill = !ui.diet.fill; render(); },
    dCopy() { const p = P(), y = new Date(ui.diet.date + 'T12:00:00'); y.setDate(y.getDate() - 1); const src = p.nutrition.days[y.toISOString().slice(0, 10)]; if (!src || !src.meals.some(m => m.length)) return toast('Il giorno prima è vuoto'); if (!confirm('Copiare i pasti del giorno prima? Sostituisce quelli di questo giorno.')) return; F.dayOf(p, ui.diet.date).meals = JSON.parse(JSON.stringify(src.meals)); save(); render(); },
    dNewFood() {
      const n = ($('#nf_name').value || '').trim(), v = id => parseFloat(String($('#' + id).value).replace(',', '.')) || 0;
      if (!n || !(v('nf_k') > 0 || v('nf_p') > 0)) return toast('Scrivi nome e valori per 100 g');
      const p = P(), id = 'c' + uid(); p.nutrition.foods.push({ id, name: n, k: v('nf_k'), p: v('nf_p'), c: v('nf_c'), f: v('nf_f') }); ui.diet.pick = { f: id, g: 100 }; save(); render(); toast('Alimento salvato');
    },
    async offSearch() { const q = ($('#offq').value || '').trim(); if (!q) return toast('Scrivi cosa cercare'); return offFetch(q, $('#offRes')); },
    offUse(t) { const x = (ui.offList || [])[+t.dataset.i]; if (!x) return; const n = x.nutriments, p = P(), id = 'c' + uid(); p.nutrition.foods.push({ id, name: x.product_name + (x.brands ? ' (' + x.brands.split(',')[0] + ')' : ''), k: Math.round(n['energy-kcal_100g']), p: +(n.proteins_100g || 0), c: +(n.carbohydrates_100g || 0), f: +(n.fat_100g || 0), liq: (x.categories_tags || []).some(c => /^en:(beverages|non-alcoholic-beverages|alcoholic-beverages|waters|juices-and-nectars|fruit-juices|sodas|teas|coffees|plant-based-beverages|milks|dairy-drinks)$/.test(c)) ? 1 : 0 }); ui.diet.pick = { f: id, g: 100 }; save(); render(); },
    newRecipe() { ui.sub = { type: 'recipe', id: null, draft: { name: '', portions: 1, items: [], note: '' } }; render(); window.scrollTo(0, 0); },
    editRecipe(t) { const r = P().nutrition.recipes.find(x => x.id === t.dataset.id); ui.sub = { type: 'recipe', id: r.id, draft: JSON.parse(JSON.stringify(r)) }; render(); window.scrollTo(0, 0); },
    rIngAdd() { readRecipe(); const typed = ($('#rc_add').value || '').trim(), p0 = P(), hit = F.allFoods(p0).find(x => x.name === typed) || F.searchFoods(p0, typed, 1)[0], id = hit && hit.id, g = parseFloat(String($('#rc_g').value).replace(',', '.')); if (!id || !(g > 0)) return toast('Scegli un ingrediente e i grammi'); ui.sub.draft.items.push([id, g]); render(); },
    rIngRm(t) { readRecipe(); ui.sub.draft.items.splice(+t.dataset.i, 1); render(); },
    rSave() { readRecipe(); const R = ui.sub.draft, p = P(); if (!R.name.trim()) return toast('Dai un nome alla ricetta'); if (!R.items.length) return toast('Aggiungi almeno un ingrediente');
      R.name = R.name.trim(); if (ui.sub.id) { const i = p.nutrition.recipes.findIndex(x => x.id === ui.sub.id); p.nutrition.recipes[i] = Object.assign({ id: ui.sub.id }, R); } else p.nutrition.recipes.push(Object.assign({ id: 'r' + uid() }, R));
      save(); ui.sub = null; render(); toast('Ricetta salvata'); },
    rDel() { const id = ui.sub && ui.sub.id; if (id && delRecipe(id)) { ui.sub = null; render(); } },
    rDelList(t) { if (delRecipe(t.dataset.id)) render(); },
    async rShare() {
      readRecipe(); const R = ui.sub.draft, p = P(), cust = {};
      R.items.forEach(([id]) => { if (/^c/.test(id)) { const f = p.nutrition.foods.find(x => x.id === id); if (f) cust[id] = f; } });
      const txt = 'FORGIA-RICETTA ' + JSON.stringify({ v: 1, name: R.name, portions: R.portions, note: R.note || '', items: R.items, foods: Object.values(cust) });
      try { if (navigator.share) { await navigator.share({ title: R.name, text: txt }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
      try { await navigator.clipboard.writeText(txt); toast('Ricetta copiata: incollala in un messaggio'); } catch (e) { prompt('Copia questo testo e mandalo:', txt); }
    },
    rImport() {
      const t = ($('#rcImp').value || '').trim(), i = t.indexOf('FORGIA-RICETTA'); if (i < 0) return toast('Testo non valido');
      let d; try { d = JSON.parse(t.slice(i + 14).trim()); } catch (e) { return toast('Testo incompleto: copialo tutto'); }
      if (!d || !d.name || !Array.isArray(d.items)) return toast('Ricetta non valida');
      const p = P(), nut = ensureNut(p), map = {};
      (d.foods || []).forEach(f => { const nid = 'c' + uid(); map[f.id] = nid; nut.foods.push({ id: nid, name: String(f.name).slice(0, 80), k: +f.k || 0, p: +f.p || 0, c: +f.c || 0, f: +f.f || 0 }); });
      const items = d.items.map(([id, g]) => [map[id] || id, +g || 0]).filter(([id, g]) => g > 0 && F.getFood(p, id));
      if (!items.length) return toast('Nessun ingrediente riconosciuto');
      nut.recipes.push({ id: 'r' + uid(), name: String(d.name).slice(0, 80), portions: +d.portions || 1, items, note: String(d.note || '').slice(0, 500) });
      save(); render(); toast('Ricetta importata: ' + d.name);
    },
    rCancel() { ui.sub = null; render(); },
    tab(t) { ui.tab = t.dataset.tab; ui.sub = null; render(); window.scrollTo(0, 0); },
    newProfile() { ui.sub = { type: 'profile', id: null }; render(); },
    legacyYes() { const l = legacyRead(); if (l && l.profiles && l.profiles.length) { const mine = l.profiles.filter(isMine); S.profiles = mine.length ? mine : l.profiles; l.active = mine.length ? mine[0].id : l.active; S.active = l.active && l.profiles.some(x => x.id === l.active) ? l.active : l.profiles[0].id; Object.assign(S.settings, l.settings || {}); save(); toast('Dati importati nel tuo account'); } ui.legacy = 0; render(); },
    legacyMerge() { const l = legacyRead(), m = l && l.profiles && l.profiles.find(isMine), p = P(); if (m && p) { Object.assign(p, F.mergeProfiles(p, F.normalizeProfile(Object.assign({}, m, { id: p.id })))); save(); syncUp(); toast('Allenamenti uniti al tuo profilo'); } ui.legacyMine = null; render(); },
    bioOn() { ui.bioErr = ''; bio.enable().then(() => { toast('Impronta attivata su questo dispositivo'); render(); }).catch(e => { ui.bioErr = 'Non riuscito: ' + (e && e.name === 'NotAllowedError' ? 'operazione annullata o non consentita' : (e && e.message) || e); render(); }); },
    bioOff() { bio.off(); toast('Sblocco con impronta disattivato'); render(); },
    bioUnlock() { ui.bioErr = ''; bio.verify().then(() => { ui.locked = false; ui.bioErr = ''; render(); }).catch(e => { ui.bioErr = 'Impronta non riconosciuta o annullata. Riprova.'; render(); }); },
    bioOut() { bio.off(); ui.locked = false; AC.signOut(); onSignOut(); },
    recScan() { ui.rec = { list: scanLocal() }; render(); },
    recClose() { ui.rec = null; render(); },
    recAdd(t) {
      const p = P(); if (!p) return toast('Crea prima il profilo');
      try { let src; if (t.dataset.f) src = ui.rec.files[+t.dataset.j]; else { const o = JSON.parse(localStorage.getItem(t.dataset.k)); src = Array.isArray(o.profiles) ? o.profiles[+t.dataset.j] : o; }
        if (!isMine(src) && !confirm('Questo profilo si chiama «' + src.name + '» e non sembra il tuo. Aggiungerlo comunque?')) return;
        const keep = JSON.stringify(S); try { localStorage.setItem(KEY + '.prerecupero.' + Date.now(), keep); } catch (e) { }
        Object.assign(p, F.mergeProfiles(p, F.normalizeProfile(Object.assign({}, src, { id: p.id })))); save(); syncUp(); ui.rec = t.dataset.f ? ui.rec : { list: scanLocal() }; toast('Allenamenti aggiunti: ora ne hai ' + (p.sessions || []).length); render();
      } catch (e) { toast('Non riuscito: ' + e.message); }
    },
    legacyNo() { ui.legacyMine = null; ui.legacy = 0; render(); },
    editProfile() { ui.sub = { type: 'profile', id: S.active }; render(); },
    cancelSub() { ui.sub = null; render(); },
    genPlan() { const p = P(), pl = F.generatePlan(p); pl.title = 'Scheda su misura ' + F.todayISO(); p.plans.push(pl); p.activePlan = pl.id; save(); ui.sub = { type: 'plan', id: pl.id }; render(); toast('Scheda creata e attivata'); },
    importPlan() { ui.sub = { type: 'import', state: {} }; render(); },
    offerYes(t) { const p = P(), x = p.plans.find(q => q.id === t.dataset.id); if (!x) return; if (p.draft && p.draft.planId !== x.id) { if (!confirm('Hai una seduta in corso con la scheda attuale: se attivi la nuova verrà scartata. Continuare?')) return; p.draft = null; } x.offer = false; p.activePlan = x.id; save(); render(); toast('Scheda attivata'); },
    offerNo(t) { const p = P(), x = p.plans.find(q => q.id === t.dataset.id); if (x) { x.offer = false; save(); render(); toast('Resta la scheda di prima. La nuova è tra le tue schede.'); } },
    inboxImport(t) { const m = (ui.inbox || []).find(x => String(x.id) === t.dataset.id); if (!m) return; const r = F.parseScheda(m.body); ui.sub = { type: 'import', state: { parsed: r, title: m.title, inboxId: m.id } }; render(); window.scrollTo(0, 0); },
    openPlan(t) { ui.sub = { type: 'plan', id: t.dataset.id }; render(); window.scrollTo(0, 0); },
    activate(t) { const p = P(); p.activePlan = t.dataset.id; p.draft = null; save(); render(); toast('Scheda attivata'); },
    delPlan(t) { const p = P(), pl = p.plans.find(x => x.id === t.dataset.id); if (!confirm(`Eliminare "${pl.title}"? Le sedute già registrate restano.`)) return; p.plans = p.plans.filter(x => x.id !== pl.id); if (p.activePlan === pl.id) { p.activePlan = p.plans.length ? p.plans[p.plans.length - 1].id : null; p.draft = null; } save(); render(); },
    adapt(t) { const p = P(), pl = p.plans.find(x => x.id === t.dataset.id), n = adaptPlan(pl, p); p.plans.push(n); p.activePlan = n.id; save(); ui.sub = { type: 'plan', id: n.id }; render(); toast('Versione adattata creata e attivata'); },
    swap(t) { const p = P(), pl = p.plans.find(x => x.id === ui.sub.id), e = F.EXMAP[t.dataset.ex], x = pl.days[+t.dataset.d].exercises[+t.dataset.x]; Object.assign(x, { exId: e.id, name: e.name, unit: e.unit, repsInfo: undefined, reps: x.repsInfo ? '8-12' : x.reps, flags: [], note: '' }); save(); render(); },
    async rmEx(t) { if (!(await ask({ title: 'Togliere questo esercizio dalla scheda?', text: 'Le sedute già registrate restano.' }))) return; const p = P(), pl = p.plans.find(x => x.id === ui.sub.id); pl.days[+t.dataset.d].exercises.splice(+t.dataset.x, 1); save(); render(); },
    addEx(t) { const p = P(), pl = p.plans.find(x => x.id === ui.sub.id), v = $('#add_' + t.dataset.d).value; if (!v) return; const e = F.EXMAP[v]; pl.days[+t.dataset.d].exercises.push({ exId: e.id, name: e.name, sets: 3, setsEarly: 2, reps: e.unit === 'sec' ? '20-40 s' : '8-12', unit: e.unit, rest: 90, note: '' }); save(); render(); },
    parseText() { const tx = $('#imp_text').value; if (!tx.trim()) return toast('Incolla prima il testo della scheda'); const r = F.parseScheda(tx); if (!r.days.length || !r.days.some(d => d.exercises.length)) return toast('Non riesco a leggere esercizi: usa il formato NOME | serie | ripetizioni'); ui.sub.state = { parsed: r, title: 'Scheda importata ' + F.todayISO() }; render(); },
    async parsePhoto() {
      const f = $('#imp_photo').files[0]; if (!f) return toast('Scegli prima una foto');
      const b64 = await new Promise(res => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.readAsDataURL(f); });
      toast('Lettura in corso…'); const out = await ai('parse-scheda', { image: b64, mime: f.type }); if (!out || !out.text) return;
      const r = F.parseScheda(out.text); ui.sub.state = { parsed: r, title: 'Scheda da foto ' + F.todayISO() }; render();
    },
    saveImport() {
      const p = P(), st = ui.sub.state, title = ($('#imp_title').value || st.title).trim();
      const pl = { id: 'p' + uid(), title, source: 'importata', createdAt: F.todayISO(), notes: ['Scheda importata: controlla ambiguità ed esercizi collegati.'], days: st.parsed.days.filter(d => d.exercises.length), block: st.parsed.block, comp: st.parsed.comp || undefined };
      pl.days.forEach(d => d.exercises.forEach(x => { x.setsEarly = Math.max(2, x.sets - 1); }));
      p.plans.push(pl); p.activePlan = pl.id; if (st.inboxId) { AC.markPlanImported(st.inboxId).catch(() => { }); ui.inbox = (ui.inbox || []).filter(x => x.id !== st.inboxId); } save(); ui.sub = { type: 'plan', id: pl.id }; render(); toast('Scheda salvata e attivata');
    },
    garaWeek(t) { const p = P(), pl = planOf(p); if (!pl || !pl.block) return; const d = +t.dataset.d; if (d === 0) delete pl.block.manual; else pl.block.manual = Math.max(1, Math.min(pl.block.weeks, F.blockWeek(pl) + d)); save(); render(); },
    garaHide() { const p = P(); if (p && p.gara) { p.gara.hide = true; save(); render(); } },
    bodyMode(t) { ui.bodyMode = t.dataset.m; render(); window.scrollTo(0, 0); },
    pickDay(t) { ui.pickDay = +t.dataset.day; render(); },
    dropDraft() { if (!confirm('Scartare la seduta in corso? I dati inseriti non salvati andranno persi.')) return; P().draft = null; save(); render(); },
    startSession(t) {
      const p = P(), plan = planOf(p); const idx = +t.dataset.day;
      if (!p.draft || p.draft.planId !== plan.id) p.draft = { planId: plan.id, dayIdx: idx, data: {}, started: Date.now() };
      save(); ui.sub = { type: 'session' }; render(); window.scrollTo(0, 0);
    },
    sick() { ui.sick = true; render(); window.scrollTo(0, 0); },
    sickClose() { ui.sick = false; render(); },
    sickLog() { const p = P(); p.symptoms = p.symptoms || []; p.symptoms.push({ date: F.todayISO(), at: new Date().toISOString() }); save(); ui.sick = false; render(); toast('Episodio registrato. Se si ripete, fai controllare cuore, pressione e glicemia dal medico.'); },
    pauseSession() { save(); ui.sub = null; render(); },
    rep(t) { const p = P(), d = p.draft, i = +t.dataset.i, s = +t.dataset.s, plan = planOf(p), x = plan.days[d.dayIdx].exercises[i], si = setInfo(x, s, d.data[i]); d.data[i] = d.data[i] || []; while (d.data[i].length <= s) d.data[i].push({}); const c = d.data[i][s]; const base = c.reps != null ? c.reps : (+repDefault(x, si) || 0); c.reps = Math.max(0, base + (+t.dataset.d)); save(); render(); },
    delSet(t) { const p = P(), d = p.draft, i = +t.dataset.i, plan = planOf(p), x = plan.days[d.dayIdx].exercises[i], n = setCount(d, i, x, early0(p, plan)); if (n <= 1) return; d.count = d.count || {}; d.count[i] = n - 1; d.data[i] = (d.data[i] || []).slice(0, n - 1); save(); render(); },
    emomGo(t) { emomStart(+t.dataset.i); },
    myoGo() { startTimer(15, 'Myo-reps: pausa', () => toast('Via: mini-serie da 3-5 rip')); },
    addSet(t) { const p = P(), d = p.draft, i = +t.dataset.i, plan = planOf(p), x = plan.days[d.dayIdx].exercises[i], n = setCount(d, i, x, early0(p, plan)); d.data[i] = d.data[i] || []; d.count = d.count || {}; d.count[i] = n + 1; while (d.data[i].length < n + 1) d.data[i].push({}); save(); render(); },
    finishSession() {
      const p = P(), plan = planOf(p), d = p.draft, day = plan.days[d.dayIdx];
      const ex = day.exercises.map((x, i) => ({ exId: x.exId, name: x.name, sets: (d.data[i] || []).filter(s => s.done || s.reps != null).map(s => Object.assign({ kg: s.kg || 0, reps: s.reps || 0, rpe: s.rpe || null }, s.why ? { why: s.why, wz: s.wz || undefined, ws: s.ws || undefined, wl: s.wl || undefined } : {})) })).filter(e => e.sets.length);
      if (!ex.length) return toast('Annota almeno una serie');
      const bw = parseFloat(($('#bw') || {}).value); if (bw > 20) { p.weights.push({ date: F.todayISO(), kg: bw }); p.weight = bw; }
      p.sessions.push({ id: 's' + uid(), date: F.todayISO(), at: Date.now(), planId: plan.id, dayName: day.name, ex }); p.draft = null; save(); ui.sub = null; ui.tab = 'prog'; clearInterval(ui.tick); ui.timer = null; render(); toast('Seduta salvata. Ottimo lavoro!');
    },
    timerSound() { S.settings.sound = !soundOn(); save(); if (soundOn()) playTick(); const th = $('#timerHost'); if (th) th.innerHTML = timerBar(); },
    timerSub() { if (ui.timer) { ui.timer.left = Math.max(1, ui.timer.left - 30); const el = $('#tleft'); if (el) el.textContent = ui.timer.left; } },
    timerAdd() { if (ui.timer) { ui.timer.left += 30; const el = $('#tleft'); if (el) el.textContent = ui.timer.left; } },
    timerStop() { clearInterval(ui.tick); ui.timer = null; const th = $('#timerHost'); if (th) th.innerHTML = ''; },
    zoneOpen(t) { ui.zone = t.dataset.zone; ui.msgs = []; render(); },
    whyOpen(t) { ui.whyOpen = ui.whyOpen === t.dataset.k ? null : t.dataset.k; render(); },
    whyPick(t) { const c = whyCell(t.dataset.k); if (!c) return; c.why = c.why === t.dataset.v ? undefined : t.dataset.v; if (c.why !== 'Dolore') { delete c.wz; delete c.ws; delete c.wl; } ui.whyOpen = t.dataset.k; save(); render(); },
    whyPainPick(t) { const c = whyCell(t.dataset.k); if (!c) return; c.wz = t.dataset.id; c.ws = 'B'; c.wl = c.wl || 3; save(); render(); },
    whyPainReset(t) { const c = whyCell(t.dataset.k); if (!c) return; delete c.wz; save(); render(); },
    whySide(t) { const c = whyCell(t.dataset.k); if (!c) return; c.ws = t.dataset.sd; save(); render(); },
    whyApply(t) {
      const c = whyCell(t.dataset.k), p = P(); if (!c || !c.wz) return; const o = F.PX.by[c.wz], lv = c.wl || 0; if (!lv) return toast('Indica l\'intensità del dolore');
      (o.c ? ['C'] : c.ws === 'L' ? ['L'] : c.ws === 'R' ? ['R'] : ['L', 'R']).forEach(sd => F.pxSet(p, c.wz, sd, lv, {})); save(); toast('Dolore registrato: l\'allenatore lo vede');
    },
    zoneClose() { ui.zone = null; ui.msgs = []; render(); },
    pxPick(t) {
      const id = t.dataset.id; const o = F.PX.by[id]; if (!o) return; const p = P(), cur = F.pxCur(p).filter(e => e.s === id);
      ui.pxSel = id; ui.zone = o.zone; ui.msgs = []; ui.pxQ = ''; ui.pxSide = o.c ? 'C' : (t.dataset.sd === 'L' || t.dataset.sd === 'R') ? t.dataset.sd : (cur.length && cur.every(e => e.sd === 'L') ? 'L' : cur.length && cur.every(e => e.sd === 'R') ? 'R' : 'B');
      ui.pxTmp = { ty: (cur[0] && cur[0].ty) || '', wh: (cur[0] && cur[0].wh) || '' }; render(); const c = document.querySelector('#pxEd'); if (c) c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },
    pxHome(t) { ui.tab = 'body'; ui.bodyMode = 'pain'; ui.sub = null; act.pxPick(t); window.scrollTo(0, 0); },
    async pxHomeDel(t) {
      const p = P(), id = t.dataset.id, sd = t.dataset.sd, o = F.PX.by[id]; if (!o) return;
      if (await pxRemove(p, id, sd === 'B' || o.c ? ['L', 'R', 'C'] : [sd], o.name + (sd === 'L' ? ' sinistro' : sd === 'R' ? ' destro' : ''))) render();
    },
    pxSide(t) { ui.pxSide = t.dataset.sd; render(); },
    pxClose() { ui.pxSel = null; ui.zone = null; ui.msgs = []; render(); },
    async pxClear() {
      const o = F.PX.by[ui.pxSel]; if (!o) return; const p = P();
      if (!F.pxCur(p).some(e => e.s === o.id)) { ui.pxSel = null; render(); return; }
      if (await pxRemove(p, o.id, o.c ? ['C'] : ['L', 'R'], o.name)) { ui.msgs = []; render(); }
    },
    pxTag(t) {
      const k = t.dataset.k, v = t.dataset.v, p = P(), o = F.PX.by[ui.pxSel]; ui.pxTmp = ui.pxTmp || {}; ui.pxTmp[k] = ui.pxTmp[k] === v ? '' : v;
      if (o) ['L', 'R', 'C'].forEach(sd => F.pxMeta(p, o.id, sd, { [k]: ui.pxTmp[k] })); save(); render();
    },
    zoneClear(t) { setPain(t.dataset.zone, 0); },
    saveMeas() {
      const p = P(), date = ($('#msDate') || {}).value || F.todayISO(), v = {}; let n = 0;
      document.querySelectorAll('[data-ms]').forEach(i => { const x = parseFloat(String(i.value).replace(',', '.')); if (x > 0 && x < (i.dataset.ms === 'bf' ? 70 : 300)) { v[i.dataset.ms] = x; n++; } });
      if (!n) return toast('Inserisci almeno una misura');
      if (v.weight) { p.weights = (p.weights || []).filter(w => w.date !== date); p.weights.push({ date, kg: v.weight }); p.weight = v.weight; delete v.weight; }
      p.measures = p.measures || []; let e = p.measures.find(m => m.date === date); if (!e) { e = { date, v: {} }; p.measures.push(e); } Object.assign(e.v, v);
      if (v.waist) p.waist = v.waist; if (v.bf) p.bf = v.bf;
      save(); render(); toast('Misure salvate');
    },
    delMeas() { const p = P(), l = (p.measures || []).slice().sort((a, b) => a.date.localeCompare(b.date)).pop(); if (!l) return; if (!confirm('Eliminare le misure del ' + l.date + '?')) return; p.measures = p.measures.filter(m => m !== l); save(); render(); toast('Registrazione eliminata'); },
    addWeight() { const v = parseFloat($('#wIn').value); if (!(v > 20 && v < 300)) return toast('Inserisci un peso valido'); const p = P(); p.weights.push({ date: F.todayISO(), kg: v }); p.weight = v; save(); render(); toast('Peso registrato'); },
    editSession(t) { const s = (P().sessions || []).find(x => x.id === t.dataset.id); if (!s) return; ui.sub = { type: 'editSession', id: s.id, draft: JSON.parse(JSON.stringify(s)) }; render(); window.scrollTo(0, 0); },
    esCancel() { ui.sub = null; render(); },
    esAddSet(t) { const e = ui.sub.draft.ex[+t.dataset.i], l = e.sets[e.sets.length - 1] || {}; e.sets.push({ kg: l.kg || 0, reps: l.reps || 0, rpe: l.rpe || null }); render(); },
    esDelSet(t) { const e = ui.sub.draft.ex[+t.dataset.i]; e.sets.splice(+t.dataset.s, 1); render(); },
    esSave() {
      const p = P(), d = ui.sub.draft; d.ex = d.ex.filter(e => e.sets.length);
      if (!d.ex.length) return toast('La seduta non può restare senza serie: per toglierla usa Elimina');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || d.date > F.todayISO()) return toast('Data non valida');
      const i = p.sessions.findIndex(x => x.id === ui.sub.id); if (i < 0) { ui.sub = null; return render(); }
      p.sessions[i] = Object.assign({}, p.sessions[i], d); save(); ui.sub = null; render(); toast('Seduta modificata');
    },
    delSession(t) {
      const p = P(), s = (p.sessions || []).find(x => x.id === t.dataset.id); if (!s) return;
      if (!confirm('Eliminare la seduta ' + s.dayName + ' del ' + s.date + '?')) return;
      if (!confirm('Ultima conferma: l\'eliminazione è definitiva e non si può annullare. Eliminare davvero questa seduta?')) return;
      p.sessions = p.sessions.filter(x => x.id !== s.id); save(); render(); toast('Seduta eliminata');
    },
    async checkUpdate() {
      ui.updMsg = 'Controllo in corso…'; render();
      const r = await checkVersion(true), a = await checkApk();
      ui.updMsg = r === 'err' ? 'Non riesco a controllare: verifica la connessione.' : r === 'new' ? 'C\'è un aggiornamento: tocca «Aggiorna ora». I tuoi dati restano.' : a ? 'L\'app è aggiornata, ma c\'è una nuova versione dell\'app Android: tocca «Scarica il nuovo APK», aprilo e conferma. Non serve disinstallare: i tuoi dati restano.' : 'L\'app è già aggiornata all\'ultima versione.';
      toast(ui.updMsg); render();
    },
    apkInstall() { if (ui.apkNew && ui.apkNew.url) { toast('Scarico il nuovo APK: aprilo e conferma l\'installazione sopra a quello attuale.'); window.open(ui.apkNew.url, '_blank'); } },
    async applyUpdate() { applyUpdateNow(false); },
    dismissNews() { S.settings.seenBuild = F.VERSION.build; save(); ui.whatsNew = null; render(); },
    sendReq() { const t = reqText(); if (!t) return; const body = `${t}\n\n---\nApp FORGIA v${F.VERSION.version} (build ${F.VERSION.build})\n${navigator.userAgent}`; const url = `https://github.com/${F.REPO}/issues/new?labels=richiesta&title=${encodeURIComponent('Richiesta: ' + t.slice(0, 60))}&body=${encodeURIComponent(body)}`; logReq(t, 'aperta su GitHub'); window.open(url, '_blank', 'noopener'); },
    async copyReq() { const t = reqText(); if (!t) return; const txt = `Richiesta per FORGIA v${F.VERSION.version}: ${t}`; try { await navigator.clipboard.writeText(txt); toast('Copiato: incollalo nella chat con Claude'); } catch (e) { toast('Copia non riuscita: seleziona il testo e copialo'); } logReq(t, 'copiata per la chat'); },
    async delReq(t) { if (!(await ask({ title: 'Eliminare questa richiesta?' }))) return; S.requests = (S.requests || []).filter(r => r.id !== t.dataset.id); save(); render(); },
    saveAI() { S.settings.aiUrl = $('#aiUrl').value.trim(); save(); toast('Salvato'); },
    async bkPick() { try { const h = await F.pickDir(); ui.bkDir = h.name; const r = await F.runBackup(S, { interactive: true }); save(); render(); toast(r.ok ? 'Cartella collegata. Backup fatto: ' + r.where : 'Cartella collegata'); } catch (e) { if (!e || e.name !== 'AbortError') toast('Cartella non accessibile'); } },
    async bkForget() { await F.forgetDir(); ui.bkDir = null; render(); toast('Cartella scollegata'); },
    async bkNow() { const r = await F.runBackup(S, { interactive: true, manual: true }); if (r.ok) { save(); ui.bkHide = true; render(); toast(`Backup di ${r.profiles} profil${r.profiles === 1 ? 'o' : 'i'} salvato: ${r.where}`); } else toast('Backup non riuscito (' + r.reason + ')'); },
    async bkShare() { try { if (F.isNative()) await F.nativeShare(F.allFiles(S)); else await F.webShareZip(F.allFiles(S), 'FORGIA_backup.zip', 'FORGIA backup'); } catch (e) { toast(e && e.name === 'AbortError' ? 'Condivisione annullata' : 'Condivisione non disponibile su questo browser'); } },
    bkLater() { ui.bkHide = true; render(); },
    export() { F.download(F.allFiles(S).concat([{ path: 'FORGIA_backup_completo.json', mime: 'application/json', text: JSON.stringify(S, null, 1) }])); },
    profUse(t) { S.active = t.dataset.id; save(); ui.sub = null; ui.zone = null; render(); window.scrollTo(0, 0); },
    delProfile(t) {
      const id = (t && t.dataset && t.dataset.id) || S.active, p = S.profiles.find(x => x.id === id); if (!p) return;
      const info = `${(p.sessions || []).length} sedute, ${(p.plans || []).length} schede, ${(p.weights || []).length} pesi e la dieta`;
      if (!confirm(`Eliminare il profilo di ${p.name}?\n\nSi cancellano ${info}. Hai fatto il backup?`)) return;
      if (!confirm(`ULTIMA CONFERMA\n\nIl profilo di ${p.name} verrà cancellato in modo definitivo e si recupera solo da un file di backup. Vuoi davvero eliminarlo?`)) return;
      S.profiles = S.profiles.filter(x => x.id !== p.id); if (S.active === p.id) S.active = S.profiles.length ? S.profiles[0].id : null;
      save(); ui.sub = null; ui.tab = S.profiles.length ? 'me' : 'home'; render(); toast('Profilo eliminato');
    },
    async askAI() {
      const p = P(), plan = planOf(p); const out = $('#aiOut'); out.innerHTML = '<p class="mute small">Analisi in corso…</p>';
      const r = await ai('analyze', { profile: { age: F.ageOf(p.birth), sex: p.sex, height: p.height, weight: p.weight, goal: F.effGoal(p), style: p.style, level: p.level, stopMonths: p.stopMonths, pain: p.pain }, targets: F.calc(p), plan, analysis: plan ? F.analyzePlan(plan, p).flags : [], weights: p.weights.slice(-20), sessions: p.sessions.slice(-10) });
      out.innerHTML = r && r.text ? `<div class="msg" style="white-space:pre-wrap">${esc(r.text)}</div>` : '';
    }
  };
  function importText(text) {
    let d; try { d = F.parseImport(text); } catch (x) { return toast('File non valido: ' + x.message); }
    if (d.kind === 'profile') {
      const ex = S.profiles.find(x => x.id === d.profile.id), same = S.profiles.find(x => x.name.toLowerCase() === d.profile.name.toLowerCase());
      if (ex) { if (!confirm(`Il profilo "${ex.name}" esiste già. Sostituirlo con quello del file?`)) return; Object.assign(ex, d.profile); }
      else { if (same) d.profile.name += ' (importato)'; if (S.profiles.some(x => x.id === d.profile.id)) d.profile.id = 'u' + uid(); S.profiles.push(d.profile); S.active = d.profile.id; }
      save(); ui.sub = null; ui.tab = 'home'; render(); return toast('Profilo importato: ' + d.profile.name);
    }
    if (!confirm(`Sostituire TUTTI i dati attuali con il backup (${d.profiles.length} profili)?`)) return;
    S.profiles = d.profiles; S.active = d.profiles.length ? d.profiles[0].id : null; S.settings = Object.assign({ aiUrl: '' }, S.settings, d.settings, { backup: S.settings.backup }); S.requests = d.requests;
    save(); ui.sub = null; render(); toast('Backup importato');
  }
  function readRecipe() { const R = ui.sub.draft; const n = $('#rc_name'), q = $('#rc_por'), no = $('#rc_note'); if (n) R.name = n.value; if (q) R.portions = Math.max(1, parseInt(q.value, 10) || 1); if (no) R.note = no.value; }
  function reqText() { const t = ($('#reqText').value || '').trim(); if (t.length < 5) { toast('Scrivi cosa vuoi cambiare'); return ''; } return t; }
  function logReq(text, how) { S.requests = S.requests || []; S.requests.push({ id: uid(), date: F.todayISO(), text, how }); save(); const el = $('#reqText'); if (el) el.value = ''; render(); }
  /* Aggiornamento in app: salva e copia i dati, svuota la copia locale del programma (mai i dati), ricarica dall'indirizzo più recente. */
  async function applyUpdateNow(auto) {
    if (!auto) toast('Aggiorno… i tuoi dati restano salvati');
    try { save(); const raw = localStorage.getItem(keyNow()); if (raw && raw.length < 3e6) localStorage.setItem(keyNow() + '.pre', raw); } catch (e) { }
    try { if (AC.enabled && AC.me) await Promise.race([syncUp(), new Promise(r => setTimeout(r, 3000))]); } catch (e) { }
    try { localStorage.setItem('forma.updTry', JSON.stringify({ b: ui.update ? ui.update.build : 0, t: Date.now() })); } catch (e) { }
    try { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(x => x.unregister())); const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch (e) { }
    location.replace(location.pathname + '?u=' + Date.now());
  }
  /* dopo un tentativo: se la versione è ancora quella vecchia, lo diciamo con parole semplici */
  function updTried() { try { const t = JSON.parse(localStorage.getItem('forma.updTry') || 'null'); return t && Date.now() - t.t < 120000 ? t : null; } catch (e) { return null; } }
  /* app Android (APK): il numero di build è nello user agent; l'ultima versione dell'APK è nelle note della release */
  const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const APKB = (/(?:TLZ|FORGIA)APK\/(\d+)/.exec(navigator.userAgent) || [])[1] || '';
  async function checkApk() {
    ui.apkNew = null; if (!NATIVE) return null;
    try {
      const r = await fetch('https://api.github.com/repos/mhadhbimedwork-crypto/forma/releases/tags/' + (GYM ? 'tlz-apk' : 'apk'), { cache: 'no-store' }); if (!r.ok) return null; const j = await r.json();
      const n = +((/build\s*(\d+)/i.exec(j.body || '') || [])[1] || 0), as = (j.assets || [])[0];
      if (as && n > (+APKB || 0)) ui.apkNew = { build: n, url: as.browser_download_url };
    } catch (e) { }
    return ui.apkNew;
  }
  async function checkVersion(manual) {
    try {
      const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) throw 0; const v = await r.json();
      if (v.build > F.VERSION.build) { ui.update = v; return 'new'; }
      ui.update = null;
      if (v.build === F.VERSION.build && S.settings.seenBuild !== v.build) { S.settings.seenBuild = v.build; save(); }
      return 'same';
    } catch (e) { return 'err'; }
  }
  function setPain(zone, v) {
    const p = P(), before = Object.assign({}, p.pain); p.pain = p.pain || {}; if (v > 0) p.pain[zone] = v; else delete p.pain[zone];
    p.painLog = p.painLog || []; if ((before[zone] || 0) !== v || !p.painLog.some(e => e.zone === zone)) p.painLog.push({ date: F.todayISO(), zone, level: v, at: Date.now() });
    ui.msgs = F.painReaction(before, p.pain).filter(m => m.startsWith(F.ZONES[zone])); save(); render();
  }

  /* ---------- eventi ---------- */
  document.addEventListener('click', e => {
    const reg = e.target.closest('.reg.hit');
    if (reg && ui.tab === 'body' && !ui.sub) { ui.zone = reg.dataset.zone; ui.pxSel = null; ui.msgs = []; render(); const c = document.querySelector('#painR'); if (c) c.scrollIntoView({ block: 'nearest' }); return; }
    const t = e.target.closest('[data-act]'); if (t && act[t.dataset.act]) act[t.dataset.act](t, e);
  });
  document.addEventListener('submit', e => {
    if (e.target.id !== 'pform') { if (X && X.forms.includes(e.target.id)) { e.preventDefault(); X.onSubmit(e.target); } return; } e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    const base = { name: fd.name.trim(), birth: fd.birth, sex: fd.sex, height: +fd.height, weight: +fd.weight, goal: fd.goal, waist: +fd.waist || 0, bf: +fd.bf || 0, style: fd.style, days: +fd.days, level: +fd.level, stopMonths: +fd.stopMonths || 0 };
    if (new Date(base.birth) > new Date()) return toast('Data di nascita non valida');
    if (ui.sub.id) { const p = S.profiles.find(x => x.id === ui.sub.id); Object.assign(p, base); if (!p.weights.length || p.weights[p.weights.length - 1].kg !== base.weight) p.weights.push({ date: F.todayISO(), kg: base.weight }); save(); ui.sub = null; render(); toast('Profilo aggiornato'); return; }
    const p = Object.assign({ id: AC.enabled && AC.me ? 'acct-' + AC.me.id : 'u' + uid(), pain: {}, painLog: [], weights: [{ date: F.todayISO(), kg: base.weight }], sessions: [], plans: [], activePlan: null, draft: null, createdAt: F.todayISO() }, base);
    const pl = F.generatePlan(p); pl.title = 'Scheda su misura ' + F.todayISO(); p.plans.push(pl); p.activePlan = pl.id;
    S.profiles.push(p); S.active = p.id; save(); ui.sub = null; ui.tab = 'home'; render(); toast('Profilo e scheda creati');
  });
  function whyLive(i, s) {
    const row = document.querySelector('.whyrow[data-why="' + i + ':' + s + '"]'); if (!row) return;
    const p = P(), plan = planOf(p), d = p.draft; if (!plan || !d) return; const x = plan.days[d.dayIdx].exercises[i], c = (d.data[i] || [])[s], si = setInfo(x, s, d.data[i]), pt = F.pctTarget(p, x);
    const diff = setDiff(x, si, c, pt && !pt.need ? pt.hi : null); row.hidden = !diff && !(c && c.why); const el = row.querySelector('.whydiff'); if (el) el.textContent = ' ' + diff;
  }
  function esSet(t) {
    const d = ui.sub && ui.sub.draft; if (!d) return;
    if (t.dataset.es === 'date') { d.date = t.value; return; }
    const [i, k, f] = t.dataset.es.split(':'), x = d.ex[+i].sets[+k], v = parseFloat(String(t.value).replace(',', '.'));
    if (f === 'rpe') x.rpe = v > 0 && v <= 10 ? v : null; else x[f] = v >= 0 ? v : 0;
  }
  document.addEventListener('change', e => {
    const t = e.target, p = P(); if (X && X.onChange(t)) return;
    if (t.id === 'recFile' && t.files.length) { const fl = Array.from(t.files); t.value = ''; F.readBackupFiles(fl).then(r => { const files = r.map(x => x.profile), list = files.map((q, j) => { const ss = (q.sessions || []).map(x => x.date).sort(); return { f: true, j, name: q.name, birth: q.birth, n: (q.sessions || []).length, last: ss.length ? ss[ss.length - 1] : '-', mine: isMine(q) }; }); list.sort((a, b) => (b.mine ? 1 : 0) - (a.mine ? 1 : 0)); ui.rec = { list, files }; if (!list.length) toast('Nel file non ho trovato profili di allenamento'); render(); }); return; }
    if (t.id === 'pxShort' || t.id === 'pxFull') { if (t.value) act.pxPick({ dataset: { id: t.value } }); return; }
    if (t.dataset.gara === 'date' && p && p.gara) { p.gara.date = t.value || ''; save(); render(); return; }
    if (t.id === 'profSel') { S.active = t.value; save(); ui.sub = null; ui.zone = null; render(); return; }
    if (t.dataset.es) { esSet(t); return; }
    if (t.id === 'measSel') { ui.measSel = t.value; render(); return; }
    if (t.id === 'progSel') { ui.progEx = t.value; render(); return; }
    if (t.id === 'impBk' && t.files[0]) { const r = new FileReader(); r.onload = () => importText(r.result); r.readAsText(t.files[0]); t.value = ''; return; }
    if (t.id === 'intolOther') { const p = P(); p.intol = p.intol || {}; p.intol.other = t.value.trim(); save(); toast('Salvato'); return; }
    if (t.dataset.dg) { const [m, i] = t.dataset.dg.split(':').map(Number), v = parseFloat(String(t.value).replace(',', '.')); const it = F.dayOf(p, ui.diet.date).meals[m][i]; if (v > 0) it.g = v; save(); render(); return; }
    if (t.dataset.dn) { const [m, i] = t.dataset.dn.split(':').map(Number), v = parseFloat(String(t.value).replace(',', '.')); const it = F.dayOf(p, ui.diet.date).meals[m][i]; if (v > 0) it.n = v; save(); render(); return; }
    if (t.dataset.ri) { readRecipe(); const v = parseFloat(String(t.value).replace(',', '.')); if (v > 0) ui.sub.draft.items[+t.dataset.ri][1] = v; render(); return; }
    if (t.id === 'rc_name' || t.id === 'rc_note') { readRecipe(); return; }
    if (t.id === 'rc_por') { readRecipe(); render(); return; }
    if (t.dataset.rm) { const v = parseFloat(String(t.value).replace(',', '.')); p.rm = p.rm || {}; if (v > 0) p.rm[t.dataset.rm] = v; else delete p.rm[t.dataset.rm]; save(); render(); return; }
    if (t.dataset.altpick != null) { const [gid, v] = t.dataset.altpick.split('|'), plan = planOf(p), dd = p.draft, ex = plan.days[dd.dayIdx].exercises; dd.use = dd.use || {}; ex.forEach((x, j) => { if (x.altGroup === gid) dd.use[j] = v === 'both' || +v === j; }); save(); render(); return; }
    if (t.dataset.altuse != null) { const d = p.draft, i = +t.dataset.altuse; d.use = d.use || {}; d.use[i] = t.checked; save(); render(); return; }
    if (t.dataset.done) { const [i, s] = t.dataset.done.split(':').map(Number); const d = p.draft; d.data[i] = d.data[i] || []; while (d.data[i].length <= s) d.data[i].push({}); const c = d.data[i][s]; c.done = t.checked; if (!t.checked) whyLive(+i, +s); if (t.checked) { const plan = planOf(p), x = plan.days[d.dayIdx].exercises[i], si = setInfo(x, s, d.data[i]); if (c.reps == null) { const dv = +repDefault(x, si); if (dv) c.reps = dv; } if (c.kg == null && si.kgHint != null) c.kg = si.kgHint; if ((x.pct || (x.tech && x.tech.top && s === 0)) && c.kg > 0 && c.reps > 0 && c.reps <= 12) { const ev = F.e1rm(c.kg, c.reps); if (ev) toast('Massimale stimato ' + Math.round(ev) + ' kg: salvato nella tabella Massimali'); } save(); if (!(x.tech && x.tech.emom) && si.rest) startTimer(si.rest, si.rest <= 30 ? 'Pausa' : 'Recupero'); if (x.tech && (x.tech.top || x.tech.drop || c.reps != null)) { const y = window.scrollY; render(); window.scrollTo(0, y); } return; } save(); return; }
    if (t.dataset.edit) { const [di, xi, k] = t.dataset.edit.split(':'); const pl = p.plans.find(x => x.id === ui.sub.id), x = pl.days[+di].exercises[+xi]; if (k === 'sets') { x.sets = Math.max(1, Math.min(10, +t.value || 1)); x.setsEarly = Math.max(1, x.sets - 1); } else x.reps = t.value; save(); render(); return; }
    if (t.dataset.map) { if (!t.value) return; const [di, xi] = t.dataset.map.split(':'); const pl = p.plans.find(x => x.id === ui.sub.id), x = pl.days[+di].exercises[+xi], e2 = F.EXMAP[t.value]; x.exId = e2.id; x.unit = e2.unit; save(); render(); return; }
  });
  document.addEventListener('input', e => {
    const t = e.target, p = P(); if (X && X.onInput(t)) return;
    if (t.dataset.es) { esSet(t); return; }
    if (t.id === 'dg') { const w = $('#dgwarn'), g = parseFloat(String(t.value).replace(',', '.')); if (w && g > 0) { const left = +w.dataset.left; w.style.color = g > left + 1 ? 'var(--warn)' : ''; w.textContent = g > left + 1 ? `Attenzione: ${fx(g)} g superano il limite di oggi (restano ${fx(left)} g).` : `Puoi aggiungerne ancora ${fx(left)} g oggi.`; } return; }
    if (t.id === 'dq') { liveSearch(t.value); return; }
    if (t.classList && t.classList.contains('whyq')) { const r = document.querySelector('.whyres[data-k="' + t.dataset.k + '"]'); if (r) r.innerHTML = F.pxSearch(t.value, 6).map(o => `<button class="sm" style="display:block;width:100%;text-align:left;margin:3px 0" data-act="whyPainPick" data-k="${t.dataset.k}" data-id="${o.id}">${esc(o.name)}</button>`).join(''); return; }
    if (t.classList && t.classList.contains('whyl')) { const c = whyCell(t.dataset.k); if (c) { c.wl = +t.value; const sv = $('#whyV' + t.dataset.k.replace(':', '_')); if (sv) sv.textContent = t.value; save(); } return; }
    if (t.id === 'pxQ') { ui.pxQ = t.value; const r = $('#pxRes'); if (r) r.innerHTML = pxResHtml(t.value); return; }
    if (t.classList && t.classList.contains('pxr')) { const v = +t.value, sd = t.dataset.sd, sv = $('#pxV' + sd); if (sv) sv.textContent = v; clearTimeout(t._d); t._d = setTimeout(async () => { if (v === 0 && F.pxCur(p).some(e => e.s === t.dataset.s && e.sd === sd)) { if (!(await pxRemove(p, t.dataset.s, [sd], F.pxLabel({ s: t.dataset.s, sd })))) { render(); return; } render(); return; } const tm = ui.pxTmp || {}, ex = {}; if (tm.ty) ex.ty = tm.ty; if (tm.wh) ex.wh = tm.wh; ui.msgs = F.pxSet(p, t.dataset.s, sd, v, ex); save(); render(); }, 350); return; }
    if (t.id === 'painR') { const v = +t.value; $('#painV').textContent = v; clearTimeout(t._d); t._d = setTimeout(() => setPain(t.dataset.zone, v), 350); return; }
    if (t.dataset.set) { const [i, s, k] = t.dataset.set.split(':'); const d = p.draft; d.data[+i] = d.data[+i] || []; while (d.data[+i].length <= +s) d.data[+i].push({}); const raw = t.value.replace(',', '.'); d.data[+i][+s][k] = raw === '' ? undefined : parseFloat(raw); if (isNaN(d.data[+i][+s][k])) d.data[+i][+s][k] = undefined; save(); whyLive(+i, +s); }
  });

  /* ---------- area allenatore, sviluppatore, account ---------- */
  async function onSignIn() {
    if (GYM && AC.me && AC.me.role === 'admin' && !AC.needMfa && !(AC.imp && AC.imp())) {   /* nell'app della palestra l'amministratore entra con gli stessi dati, ma direttamente nel suo profilo atleta: l'amministrazione resta su FORGIA */
      try { const ids = await AC.listOwn(); if (!ids.length) throw new Error('Nessun profilo atleta collegato al tuo account: collegalo da FORGIA (Accessi rapidi → ★).'); await AC.impersonate(ids[0], ''); }
      catch (e) { AC.signOut(); onSignOut(); ui.authErr = e.message; return render(); }
    }
    ui.busy = false; ui.authErr = ''; S = load(); ui.sub = null; ui.tab = AC.staff() ? X.homeTab() : 'home'; ui.cl = null; ui.clLoaded = false; ui.dev = {}; ui.inbox = [];
    const imp = AC.imp && AC.imp();
    if (AC.me.role === 'client' && !imp && S.profiles.length > 1) { const m = S.profiles.find(isMine); if (m) S.active = m.id; }
    if (AC.me.must_change_password && !imp) return render();
    ui.consent = true;
    if (!AC.staff() && !imp) { try { ui.consent = (await AC._rest('consents?user_id=eq.' + AC.me.id + '&kind=eq.privacy&select=id&limit=1')).length > 0; } catch (e) { ui.consent = true; } }
    render(); if (!ui.consent) return;
    try {
      const srv = await AC.pullMine(), loc = P();
      if (srv && srv.data && srv.data.name) {
        if (!loc) { const pr = F.normalizeProfile(Object.assign({}, srv.data, { id: 'acct-' + AC.me.id })); S.profiles = [pr]; S.active = pr.id; }
        else if (srv.data.name && loc.name && srv.data.birth && loc.birth && String(srv.data.name).trim().toLowerCase() !== String(loc.name).trim().toLowerCase() && srv.data.birth !== loc.birth) {
          /* sul dispositivo c'è il profilo di un'altra persona: non si mescola. Copia di sicurezza e si usa quello dell'account. */
          try { localStorage.setItem(KEY + '.altro.' + Date.now(), JSON.stringify(S)); } catch (e) { }
          const pr = F.normalizeProfile(Object.assign({}, srv.data, { id: 'acct-' + AC.me.id })); S.profiles = S.profiles.filter(x => x !== loc && !(nameTok(x.name) === nameTok(loc.name) && x.birth === loc.birth)); S.profiles.unshift(pr); S.active = pr.id;
        }
        else Object.assign(loc, F.mergeProfiles(loc, F.normalizeProfile(Object.assign({}, srv.data, { id: loc.id }))));
        save();
      } else if (P()) syncUp();
    } catch (e) { /* offline: si lavora in locale */ }
    { const l = legacyRead(); ui.legacy = 0; ui.legacyMine = null;
      if (l && l.profiles && l.profiles.length) {
        const m = l.profiles.find(isMine);
        if (!P()) ui.legacy = l.profiles.length;
        else if (m && nSess(m) > nSess(P())) ui.legacyMine = { name: m.name, n: nSess(m) };
      } }
    try { ui.inbox = await AC.myPlans(); } catch (e) { }
    if (!imp || imp.write) await autoImportAssigned();
    render();
  }
  /* La scheda inviata dall'allenatore viene letta e resa eseguibile da sola (serie, recuperi, timer, alternative): niente da importare a mano. */
  async function autoImportAssigned() {
    const p = P(); if (!p || !ui.inbox || !ui.inbox.length) return;
    const left = [], done = [];
    for (const m of ui.inbox) {
      let r; try { r = F.parseScheda(m.body); } catch (e) { r = null; }
      if (!r || !r.days.some(d => d.exercises.length)) { left.push(m); continue; }
      if (!(p.plans || []).some(x => x.assignedId === m.id)) {
        const pl = { id: 'p' + uid(), title: m.title, source: 'allenatore', assignedId: m.id, createdAt: F.todayISO(), notes: ['Scheda inviata dal tuo allenatore.'].concat(r.days.some(d => d.exercises.some(x => !x.exId)) ? ['Qualche esercizio non è nella lista: controllalo nella scheda.'] : []), days: r.days.filter(d => d.exercises.length), block: r.block, comp: r.comp || undefined };
        pl.days.forEach(d => d.exercises.forEach(x => { x.setsEarly = Math.max(2, x.sets - 1); }));
        const same = p.plans.filter(x => x.assignedId && x.title.replace(/ \(v\d+\)$/, '').toLowerCase() === m.title.toLowerCase()).length; if (same) pl.title = m.title + ' (v' + (same + 1) + ')'; p.plans.forEach(x => { if (x.offer) x.offer = false; }); if (m.created_at) pl.createdAt = String(m.created_at).slice(0, 10); const had = planOf(p) && planOf(p).days.length; if (had) pl.offer = true; p.plans.push(pl); if (!had) p.activePlan = pl.id; done.push(m.title);
      }
      try { await AC.markPlanImported(m.id); } catch (e) { left.push(m); }
    }
    ui.inbox = left;
    if (done.length) { save(); toast('Hai ricevuto una nuova scheda: ' + done[done.length - 1]); }
  }
  function onSignOut() { S = emptyState(); mem = null; ui.sub = null; ui.tab = 'home'; ui.consent = undefined; ui.cl = null; ui.clLoaded = false; ui.inbox = []; render(); }
  const X = F.mountExtras({ S: () => S, P, save, render, toast, esc, ui, fmt, lineChart, onSignIn, onSignOut });
  Object.assign(act, X.acts);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && AC.enabled && AC.me) { clearTimeout(syncT); syncUp(); } });
  /* console amministratore: disconnessione automatica dopo 15 minuti di inattività */
  { let hid = 0; document.addEventListener('visibilitychange', () => { if (document.hidden) hid = Date.now(); else if (hid && Date.now() - hid > 120000 && AC.enabled && AC.me && bio.ok && bio.id && !(AC.imp && AC.imp()) && !ui.locked) { ui.locked = true; render(); } }); }
  F.state = () => S; F.__adapt = adaptPlan;
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
  render();
  if (AC.enabled) bio.check().then(() => AC.restore()).then(me => { if (me && bio.ok && bio.id) ui.locked = true; return me ? onSignIn() : render(); });
  else autoBackup();
  checkVersion().then(r => {
    if (r === 'new' && !updTried() && !(P() && P().draft) && !(ui.sub && ui.sub.type === 'session')) return applyUpdateNow(true);   // aggiornamento automatico all'apertura, mai durante una seduta
    if (r === 'new' && updTried()) ui.updStuck = true;
    if (r === 'new' || ui.whatsNew) render();
  });
  /* app lasciata aperta in background: ricontrolla ogni 20 minuti e quando torni sull'app; aggiorna da sola appena non stai facendo nulla */
  const idleNow = () => !(P() && P().draft) && !(ui.sub && ui.sub.type === 'session') && !ui.locked && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
  async function autoUpd() {
    if (navigator.onLine === false || document.hidden) return;
    const r = await checkVersion(); if (r !== 'new') return;
    if (updTried()) { ui.updStuck = true; render(); return; }
    if (idleNow()) return applyUpdateNow(true);
    render();   // mostra il riquadro «Aggiornamento disponibile»; si applica appena finisci
    setTimeout(() => { if (ui.update && idleNow() && !updTried()) applyUpdateNow(true); }, 60000);
  }
  setInterval(autoUpd, 20 * 60e3);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(autoUpd, 1500); });
  window.addEventListener('online', () => setTimeout(autoUpd, 2000));
})(window.FORMA);
