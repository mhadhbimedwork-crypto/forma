/* FORGIA – interfaccia. Dati salvati sul dispositivo (localStorage). */
(function (F) {
  'use strict';
  const KEY = 'forma.v1';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = s => document.querySelector(s);
  let mem = null;
  function load() {
    try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch (e) { if (mem) return mem; }
    return { profiles: [], active: null, settings: { aiUrl: '' } };
  }
  let S = load();
  function save() { mem = S; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* senza storage resta in memoria */ } }
  const P = () => S.profiles.find(p => p.id === S.active) || null;
  const planOf = p => p && p.plans.find(x => x.id === p.activePlan) || null;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const ui = { tab: 'home', sub: null, zone: null, msgs: [], timer: null, tick: null };
  let toastT;
  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 3200); }
  const fmt = (n, d) => (Math.round(n * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toLocaleString('it-IT');
  const GOALS = { recomp: 'Definizione + massa magra (ricomposizione)', cut: 'Dimagrire / definizione', mass: 'Mettere massa muscolare', strength: 'Forza' };
  const STYLES = { cali: 'Calisthenics', gym: 'Palestra (pesi/macchine)', mix: 'Palestra + calisthenics' };
  const LEVELS = { 1: 'Principiante', 2: 'Intermedio', 3: 'Avanzato' };
  F.LABELS = { GOALS, STYLES, LEVELS };
  const ICON = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/></svg>',
    plan: '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
    body: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.5"/><path d="M12 8v7M7 10l5-2 5 2M9 21l3-6 3 6"/></svg>',
    chart: '<svg viewBox="0 0 24 24"><path d="M4 20V4M4 20h16M8 16l4-5 3 3 5-7"/></svg>',
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
    const t = F.pctTarget(p, x), cur = p.rm && p.rm[x.exId] || '';
    const hint = t && !t.need ? `<span class="small">${t.lo === t.hi ? t.lo : t.lo + '-' + t.hi} kg · ${esc(F.pctLabel(x))} (1RM ${t.rm.kg} kg, ${t.rm.src})</span>` : '<span class="mute small">La scheda indica una percentuale: inserisci il tuo massimale (1RM) per avere i kg. Se non lo conosci, fai la prima seduta leggera e lo stimo io.</span>';
    return `<div class="row wrap" style="margin:4px 0"><label style="margin:0">1RM kg</label><input inputmode="decimal" style="width:80px" data-rm="${x.exId}" value="${cur}" aria-label="Massimale ${esc(x.name)}">${hint}</div>`;
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
      ${fs ? `<p class="small">${dir || `Collega una cartella del PC (es. Desktop/Allenamento/Backup): da lì in poi il backup si scrive da solo ogni ${F.BACKUP_EVERY_DAYS} giorni appena apri l'app.`}</p>
      <div class="row wrap"><button class="sm primary" data-act="bkPick">${ui.bkDir ? 'Cambia cartella' : 'Scegli cartella del PC'}</button>${ui.bkDir ? '<button class="sm" data-act="bkForget">Scollega</button>' : ''}</div>` : ''}
      ${nat ? `<p class="small">Sul telefono il backup viene salvato in <b>Documenti/FORGIA-Backup</b> ogni ${F.BACKUP_EVERY_DAYS} giorni all'apertura dell'app.</p>` : ''}
      <div class="row wrap" style="margin-top:8px"><button class="sm ${fs ? '' : 'primary'}" data-act="bkNow">Fai il backup adesso</button>${nat ? '<button class="sm" data-act="bkShare">Condividi / invia ai file</button>' : ''}</div>
      ${!fs && !nat ? '<p class="mute small">Questo browser non può scrivere nelle cartelle del PC: usa Chrome o Edge sul computer, oppure i file vengono scaricati in Download.</p>' : ''}
      <p class="mute small">I dati del telefono e quelli del PC sono separati: per spostare un profilo da un dispositivo all\'altro importa il suo file .json.</p>`;
  }
  function backupBanner() {
    const b = F.backupInfo(S); if (!b.due || ui.bkHide) return '';
    return `<div class="card" style="border-color:var(--warn)"><b>Backup da fare</b><div class="small">${b.last ? 'Sono passati più di ' + F.BACKUP_EVERY_DAYS + ' giorni dall\'ultimo backup.' : 'Non hai ancora fatto nessun backup dei tuoi dati.'}</div>
      <div class="row wrap" style="margin-top:8px"><button class="sm primary" data-act="bkNow">Backup adesso</button><button class="sm" data-act="bkLater">Più tardi</button></div></div>`;
  }
  async function refreshDir() { if (!F.fsSupported()) return; const h = await F.getDir(); ui.bkDir = h ? h.name : null; }
  async function autoBackup() {
    if (!S.profiles.length) return;
    if (!S.settings.backup) { S.settings.backup = { since: new Date().toISOString() }; save(); }
    await refreshDir();
    if (F.backupInfo(S).due) { const r = await F.runBackup(S, { interactive: false }); if (r.ok) { save(); toast('Backup automatico fatto: ' + r.where); } }
    render();
  }

  /* ---------- VISTE ---------- */
  function header() {
    const p = P(), opts = S.profiles.map(x => `<option value="${x.id}" ${x.id === S.active ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
    const brand = `<div class="brandrow"><img src="icons/mark.png" alt="" width="28" height="28"><span class="brand">FORGIA</span><span class="tag">NO PAIN · NO GAIN</span></div>`;
    if (!p) return `<header class="top">${brand}</header>`;
    const c = F.calc(p);
    return `<header class="top">${brand}
      <div class="who"><div class="avatar" aria-hidden="true">${esc(p.name.trim().charAt(0).toUpperCase())}</div>
        <div class="grow"><div class="wname">${esc(p.name)}</div><div class="wsub">${c.age} anni · ${esc(GOALS[p.goal].split(' (')[0])}</div></div>
        <select id="profSel" aria-label="Cambia profilo">${opts}</select><button class="sm" data-act="newProfile" aria-label="Nuovo profilo">+</button></div></header>`;
  }
  function nav() {
    const t = [['home', 'Oggi', ICON.home], ['plan', 'Scheda', ICON.plan], ['body', 'Corpo', ICON.body], ['prog', 'Progressi', ICON.chart], ['me', 'Profilo', ICON.user]];
    return `<nav class="tabs" aria-label="Sezioni">${t.map(([k, l, i]) => `<button data-act="tab" data-tab="${k}" class="${ui.tab === k && !ui.sub ? 'on' : ''}" ${ui.tab === k ? 'aria-current="page"' : ''}>${i}${l}</button>`).join('')}</nav>`;
  }
  function render() {
    const p = P();
    let body;
    if (!p && !(ui.sub && ui.sub.type === 'profile')) body = viewWelcome();
    else if (ui.sub) body = ({ profile: viewProfileForm, plan: viewPlanDetail, session: viewSession, import: viewImport }[ui.sub.type] || (() => ''))();
    else body = ({ home: viewHome, plan: viewPlans, body: viewBody, prog: viewProg, me: viewMe }[ui.tab])();
    $('#app').innerHTML = header() + `<main>${body}</main>` + (p ? nav() : '');
    const th = $('#timerHost'); if (th) th.innerHTML = timerBar();
  }
  function timerBar() {
    if (!ui.timer) return '';
    return `<div class="timer" role="timer"><span>Recupero <span id="tleft">${ui.timer.left}</span> s</span><span><button data-act="timerAdd">+30 s</button> <button data-act="timerStop">Stop</button></span></div>`;
  }
  function startTimer(sec) {
    clearInterval(ui.tick); ui.timer = { left: sec };
    ui.tick = setInterval(() => {
      ui.timer.left--;
      const el = $('#tleft'); if (el) el.textContent = ui.timer.left;
      if (ui.timer.left <= 0) { clearInterval(ui.tick); ui.timer = null; try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) { } toast('Recupero finito: prossima serie'); const th = $('#timerHost'); if (th) th.innerHTML = ''; }
    }, 1000);
    const th = $('#timerHost'); if (th) th.innerHTML = timerBar();
  }

  function viewWelcome() {
    return `<div class="card hero"><h1>Benvenuto in FORGIA</h1>
      <p>Allenamento e alimentazione su misura per ogni persona: calcola calorie e proteine dai tuoi dati, crea o legge la tua scheda, regola tutto in base ai dolori e segue i tuoi progressi.</p>
      <button class="primary" data-act="newProfile">Crea il primo profilo</button></div>
      <p class="mute small">I dati restano sul tuo telefono. Nessun account, nessun invio a server (salvo che tu non colleghi un server IA tuo).</p>`;
  }

  /* --- profilo (form) --- */
  function viewProfileForm() {
    const old = ui.sub.id ? S.profiles.find(p => p.id === ui.sub.id) : null;
    const v = old || { name: '', birth: '', sex: 'M', height: '', weight: '', goal: 'recomp', style: 'mix', days: 3, level: 2, stopMonths: 0 };
    const sel = (name, map, cur) => `<select name="${name}">${Object.entries(map).map(([k, l]) => `<option value="${k}" ${String(cur) === String(k) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    return `<h1>${old ? 'Modifica profilo' : 'Nuovo profilo'}</h1><form class="card" id="pform" autocomplete="off">
      <label for="f_name">Nome</label><input id="f_name" name="name" required value="${esc(v.name)}">
      <div class="grid2"><div><label for="f_birth">Data di nascita</label><input id="f_birth" type="date" name="birth" required value="${esc(v.birth)}"></div>
      <div><label>Sesso</label>${sel('sex', { M: 'Uomo', F: 'Donna' }, v.sex)}</div></div>
      <div class="grid2"><div><label for="f_h">Altezza (cm)</label><input id="f_h" type="number" name="height" min="100" max="230" required value="${esc(v.height)}"></div>
      <div><label for="f_w">Peso (kg)</label><input id="f_w" type="number" step="0.1" name="weight" min="30" max="250" required value="${esc(v.weight)}"></div></div>
      <label>Obiettivo</label>${sel('goal', GOALS, v.goal)}
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
    let next = '';
    if (plan && plan.days.length) {
      const cnt = (p.sessions || []).filter(s => s.planId === plan.id).length, idx = cnt % plan.days.length, d = plan.days[idx];
      const early = F.isReturning(p) && (Date.now() - new Date(plan.createdAt)) / 864e5 < 28;
      next = `<div class="card hero"><div class="mute small">Prossima seduta · ${esc(plan.title)}</div><h1 style="margin:.1em 0">${esc(d.name)}</h1>
        <p>${d.exercises.length} esercizi · ${d.exercises.reduce((a, x) => a + (early && x.setsEarly ? x.setsEarly : x.sets), 0)} serie${early ? ' (fase di rientro: volume ridotto)' : ''}</p>
        <button class="primary" data-act="startSession" data-day="${idx}">${p.draft && p.draft.planId === plan.id ? 'Riprendi seduta' : 'Inizia'}</button></div>`;
    } else next = `<div class="card"><h2>Nessuna scheda attiva</h2><p class="mute">Crea una scheda su misura o importa quella del tuo allenatore.</p><button class="primary" data-act="tab" data-tab="plan">Vai a Scheda</button></div>`;
    const pains = Object.entries(p.pain || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const upd = ui.update ? `<div class="card" style="border-color:var(--accent)"><b>Aggiornamento disponibile · v${esc(ui.update.version)}</b>${(ui.update.notes || []).map(n => `<div class="small">• ${esc(n)}</div>`).join('')}<div class="row" style="margin-top:8px"><button class="primary sm" data-act="applyUpdate">Aggiorna ora</button></div></div>` : '';
    const news = ui.whatsNew ? `<div class="card" style="border-color:var(--accent)"><b>Novità · versione ${esc(ui.whatsNew.version)}</b>${(ui.whatsNew.notes || []).map(n => `<div class="small">• ${esc(n)}</div>`).join('')}<div class="row" style="margin-top:8px"><button class="sm" data-act="dismissNews">Ok, ho letto</button></div></div>` : '';
    const sym = (p.symptoms || []).filter(x => Date.now() - new Date(x.at || x.date) < 21 * 864e5).slice(-1)[0];
    const symCard = sym ? `<div class="card" style="border-color:var(--warn)"><b>Malessere del ${esc(sym.date)}</b><div class="small">Per le prossime sedute: carichi leggeri, niente cardio a tutta, mangia e bevi prima. Se si ripete, fai controllare cuore, pressione e glicemia dal medico.</div></div>` : '';
    return `${upd}${news}${backupBanner()}${symCard}${next}
      <div class="card"><h2>Obiettivi di oggi</h2><div class="grid3 k4"><div class="kpi"><b>${fmt(c.kcal)}</b><span>kcal</span></div><div class="kpi"><b>${c.protein} g</b><span>proteine</span></div><div class="kpi"><b>${c.carbs} g</b><span>carboidrati</span></div><div class="kpi"><b>${c.fat} g</b><span>grassi</span></div></div>
      <p class="mute small">Acqua: ~${fmt(c.water, 1)} l · Sonno: ${c.minor ? '8-10' : '7-9'} ore</p></div>
      <div class="card"><h2>Analisi dell'andamento</h2><div class="msg ${adv.kind}">${esc(adv.text)}</div>
      ${pains.length ? `<h3>Zone con dolore</h3>${pains.map(([z, v]) => `<span class="chip ${v >= 7 ? 'danger' : v >= 4 ? 'warn' : ''}">${esc(F.ZONES[z])} ${v}/10</span>`).join(' ')}` : ''}
      <div class="row wrap" style="margin-top:10px"><button class="sm" data-act="askAI">Chiedi all'analista IA</button><span class="mute small">${done} sedute registrate</span></div><div id="aiOut"></div></div>`;
  }

  /* --- sessione di allenamento --- */
  function viewSession() {
    const p = P(), plan = planOf(p), d = p.draft;
    if (!plan || !d) { ui.sub = null; return viewHome(); }
    const day = plan.days[d.dayIdx], early = F.isReturning(p) && (Date.now() - new Date(plan.createdAt)) / 864e5 < 28;
    const lastBW = (p.weights || []).slice(-1)[0];
    const blocks = day.exercises.map((x, i) => {
      const e = F.EXMAP[x.exId], hist = histFor(p, x.exId), sug = F.suggest(x, hist), last = hist[hist.length - 1];
      const n = Math.max(d.data[i] ? d.data[i].length : 0, early && x.setsEarly ? x.setsEarly : x.sets);
      const pt = F.pctTarget(p, x), ptKg = pt && !pt.need ? pt.hi : null;
      const rows = []; for (let s = 0; s < n; s++) {
        const cur = (d.data[i] || [])[s] || {}, prev = last && last.sets[s];
        const timed = x.unit === 'sec' || (e && e.unit === 'sec');
        rows.push(`<tr><td>${s + 1}</td><td class="mute">${esc(F.targetFor(x, s))}</td>
          <td><input inputmode="decimal" data-set="${i}:${s}:kg" value="${cur.kg != null ? cur.kg : (ptKg != null ? ptKg : (prev && prev.kg != null ? prev.kg : ''))}" placeholder="${timed ? '—' : 'kg'}" aria-label="Peso serie ${s + 1}"></td>
          <td><input inputmode="numeric" data-set="${i}:${s}:reps" value="${cur.reps != null ? cur.reps : ''}" placeholder="${timed ? 'sec' : 'rip'}" aria-label="${timed ? 'Secondi' : 'Ripetizioni'} serie ${s + 1}"></td>
          <td><input inputmode="decimal" data-set="${i}:${s}:rpe" value="${cur.rpe != null ? cur.rpe : ''}" placeholder="1-10" aria-label="Sforzo serie ${s + 1}"></td>
          <td><input type="checkbox" data-done="${i}:${s}" ${cur.done ? 'checked' : ''} aria-label="Serie ${s + 1} fatta"></td></tr>`);
      }
      return `<div class="card"><div class="ex">${exPic(x)}<div class="grow"><b>${esc(x.name)}</b>
        <div class="mute small">${n} serie · ${esc(F.repsLabel(x))}${x.repsInfo && x.repsInfo.max ? '' : ''} · recupero ${x.rest || 90}s${x.pct ? ' · ' + esc(F.pctLabel(x)) : ''}${x.rpe ? ' · RPE ' + x.rpe : ''}${x.tempo ? ' · tempo ' + esc(x.tempo) : ''}</div>
        ${x.pct ? (pt && !pt.need ? `<div class="msg ok small">Carico di oggi: ${pt.lo === pt.hi ? pt.lo : pt.lo + '-' + pt.hi} kg (${esc(F.pctLabel(x))}, 1RM ${pt.rm.kg} kg)</div>` : '<div class="msg warn small">Percentuale indicata ma manca il tuo 1RM: scegli un carico con 3 ripetizioni in riserva; poi lo stimo io.</div>') : ''}
        ${x.note ? `<div class="msg warn small">${esc(x.note)}</div>` : ''}
        <div class="msg ${sug.kind === 'up' ? 'ok' : sug.kind === 'warn' ? 'warn' : ''} small">${esc(sug.text)}</div>
        ${e ? `<details><summary>Come si esegue</summary><p class="small">${esc(e.cue)}</p><p class="mute small">Muscoli: ${e.prim.map(m => F.MUSCLE_LABEL[m]).join(', ')}${e.sec.length ? ' (aiuto: ' + e.sec.map(m => F.MUSCLE_LABEL[m]).join(', ') + ')' : ''}</p></details>` : ''}
      </div></div>
      <table class="sets"><thead><tr><th>#</th><th>Obiettivo</th><th>${x.unit === 'sec' ? '' : 'Peso'}</th><th>${x.unit === 'sec' ? 'Sec' : 'Rip'}</th><th>RPE</th><th>Fatta</th></tr></thead><tbody>${rows.join('')}</tbody></table>
      <div class="row" style="margin-top:6px"><button class="ghost sm" data-act="addSet" data-i="${i}">+ serie</button></div></div>`;
    }).join('');
    return `<div class="row"><button class="ghost" data-act="pauseSession">← Esci (salva bozza)</button></div>
      <h1>${esc(day.name)}</h1>
      <div class="card"><b>Peso corporeo oggi</b><div class="row" style="margin-top:6px"><input id="bw" inputmode="decimal" placeholder="kg" value="" style="max-width:120px" aria-label="Peso corporeo"><span class="mute small">ultimo: ${lastBW ? lastBW.kg + ' kg' : '—'}</span></div></div>
      ${ui.sick ? sickCard() : ''}
      <details class="card"><summary><b>Prima di iniziare</b> <span class="mute small">(1 minuto)</span></summary>
        <label class="row" style="margin:6px 0;color:var(--ink)"><input type="checkbox" style="width:22px;min-height:0"> Ho mangiato carboidrati e proteine 2-3 ore fa</label>
        <label class="row" style="margin:6px 0;color:var(--ink)"><input type="checkbox" style="width:22px;min-height:0"> Ho bevuto circa mezzo litro d'acqua</label>
        <label class="row" style="margin:6px 0;color:var(--ink)"><input type="checkbox" style="width:22px;min-height:0"> Ho dormito bene e sto bene oggi</label>
        <p class="mute small">Durante le serie espira e non trattenere il fiato. Se senti formicolio, testa leggera o confusione, fermati subito. Alla fine non fermarti di colpo: 5 minuti di camminata lenta. Niente intervalli a tutta nelle prime 4-6 settimane.</p></details>
      <button class="danger" style="width:100%;margin:0 0 12px" data-act="sick">Mi sento male</button>
      <p class="mute small">RPE = sforzo da 1 a 10 (10 = al limite). Per le piramidi "carico crescente" aumenta il peso a ogni serie.</p>
      ${blocks}<button class="primary" style="width:100%" data-act="finishSession">Termina e salva</button>`;
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
      <div class="card"><h2>Schede del vecchio personal trainer</h2><p class="mute small">Già trascritte dalle foto: caricale per analizzarle.</p>
      <div class="row wrap">${F.SAMPLES.map(s => `<button data-act="loadSample" data-id="${s.id}">${esc(s.title)}</button>`).join('')}</div></div>
      <div class="card"><h2>Incolla il testo</h2><p class="mute small">Incolla la scheda come l'ha scritta l'allenatore, anche in inglese: <code>Bench press 4x6 @80% rest 2 min</code>, <code>Lat pulldown 3 x 8-10 RPE 8</code>, <code>Squat 5 serie da 5, 75%, recupero 2'</code>. Riconosco serie, ripetizioni, % del massimale, RPE/RIR, recuperi e tempo. Le righe come <code># Giorno 1</code> o <code>Push day:</code> sono i giorni.</p>
      <textarea id="imp_text" placeholder="# Day 1&#10;Bench press 4x6 @80% rest 2 min&#10;Lat pulldown 3x8-10 RPE 8&#10;Leg press 3x12 rec 90s" aria-label="Testo della scheda"></textarea>
      <button class="primary" style="margin-top:8px" data-act="parseText">Leggi scheda</button></div>
      <div class="card"><h2>Da foto</h2><p class="mute small">La lettura automatica da foto usa l'IA e richiede il server collegato (Profilo → Server IA). Senza server, incolla il testo qui sopra.</p>
      <input type="file" id="imp_photo" accept="image/*" aria-label="Foto della scheda"><button style="margin-top:8px" data-act="parsePhoto">Leggi foto</button></div>`;
  }

  /* --- corpo --- */
  function viewBody() {
    const p = P(), pain = p.pain || {}, z = ui.zone;
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
        ${list.some(([, v]) => v >= 7) ? '<div class="msg danger">Un dolore forte (7 o più), formicolio, gonfiore, dolore notturno o che dura da giorni va valutato da un medico o fisioterapista. L\'app non fa diagnosi.</div>' : ''}</div>` : '<div class="msg ok">Nessun dolore segnalato.</div>'}`;
  }

  /* --- progressi --- */
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
      <div class="card"><h2>Forza per esercizio</h2>${exChart}</div>
      <div class="card"><h2>Ultime sedute</h2>${sess.length ? sess.map(s => `<div class="row small" style="padding:4px 0;border-top:1px solid var(--line)"><span class="grow"><b>${esc(s.dayName)}</b> · ${s.date}<br><span class="mute">${s.ex.length} esercizi, ${s.ex.reduce((a, e) => a + e.sets.length, 0)} serie</span></span><button class="ghost sm danger" data-act="delSession" data-id="${s.id}" aria-label="Elimina seduta">Elimina</button></div>`).join('') : '<p class="mute small">Ancora nessuna seduta.</p>'}</div>`;
  }

  /* --- profilo / impostazioni --- */
  function viewMe() {
    const p = P(), c = F.calc(p), pm = Math.round(c.protein / 4);
    return `<h1>${esc(p.name)}</h1>
      <div class="card"><div class="row"><div class="grow"><b>${c.age} anni</b> · ${p.height} cm · ${p.weight} kg · BMI ${fmt(c.bmi, 1)}<div class="mute small">${esc(GOALS[p.goal])} · ${esc(STYLES[p.style])} · ${p.days} giorni · ${LEVELS[p.level]}${p.stopMonths >= 12 ? ' · rientro dopo ' + Math.round(p.stopMonths / 12) + ' anni' : ''}</div></div>
        <button class="sm" data-act="editProfile">Modifica</button></div>${c.minor ? '<div class="msg tip">Profilo minorenne: regole di tutela attive. Programma da condividere con l\'allenatore.</div>' : ''}</div>
      <div class="card"><h2>Alimentazione su misura</h2><div class="grid3 k4"><div class="kpi"><b>${fmt(c.kcal)}</b><span>kcal/giorno</span></div><div class="kpi"><b>${c.protein} g</b><span>proteine</span></div><div class="kpi"><b>${c.carbs} g</b><span>carboidrati</span></div><div class="kpi"><b>${c.fat} g</b><span>grassi</span></div></div>
      <p class="small">Metabolismo basale ${fmt(c.bmr)} kcal · fabbisogno stimato ${fmt(c.tdee)} kcal (${c.delta > 0 ? '+' : ''}${c.delta} per l'obiettivo).</p>${msgs(c.notes.map(t => ({ t })))}
      <h3>Come distribuirle</h3><p class="small">4 pasti con circa <b>${pm} g di proteine</b> ciascuno, carboidrati attorno all'allenamento, verdure ad ogni pasto, acqua ${fmt(c.water, 1)} l.</p>
      <h3>Equivalenze di circa 30 g di proteine</h3><p class="small mute">130 g petto di pollo crudo · 125 g tonno al naturale · 5 albumi + 1 uovo · 250 g yogurt greco · 40 g proteine in polvere · 170 g pesce bianco.</p>
      ${c.minor ? '<div class="msg warn">Per i minorenni: niente integratori e niente bruciagrassi. Le proteine si coprono con il cibo.</div>' : '<div class="msg">Integratori con evidenza: creatina monoidrato 3-5 g/giorno, proteine in polvere solo se non arrivi col cibo. Maltodestrine, destrosio e BCAA non servono per questo obiettivo.</div>'}</div>
      <div class="card"><h2>Aggiornamenti e richieste</h2>
      <p class="small">Versione installata: <b>${esc(F.VERSION.version)}</b> (build ${F.VERSION.build})${ui.update ? ` · <span class="chip warn">disponibile v${esc(ui.update.version)}</span>` : ''}</p>
      <div class="row wrap"><button class="sm" data-act="checkUpdate">Controlla aggiornamenti</button>${ui.update ? '<button class="sm primary" data-act="applyUpdate">Aggiorna ora</button>' : ''}</div>
      <h3>Chiedi una modifica o una funzione nuova</h3>
      <textarea id="reqText" style="min-height:90px;font-family:inherit;font-size:.95rem" placeholder="Es. aggiungi un esercizio, cambia i colori, correggi un errore…" aria-label="Richiesta di modifica"></textarea>
      <div class="row wrap" style="margin-top:8px"><button class="sm primary" data-act="sendReq">Invia richiesta (GitHub)</button><button class="sm" data-act="copyReq">Copia per la chat</button></div>
      <p class="mute small">"Invia" apre GitHub con la richiesta già scritta (serve essere collegati a GitHub). Non vengono inclusi dati personali o di salute: solo versione dell'app e il tuo testo. Chi gestisce l'app la legge e la applica; l'aggiornamento arriva da solo alla prossima apertura.</p>
      ${(S.requests || []).slice(-5).reverse().map(r => `<div class="row small" style="border-top:1px solid var(--line);padding:5px 0"><span class="grow">${esc(r.text.slice(0, 90))}${r.text.length > 90 ? '…' : ''}<br><span class="mute">${r.date} · ${esc(r.how)}</span></span><button class="ghost sm danger" data-act="delReq" data-id="${r.id}" aria-label="Elimina richiesta">✕</button></div>`).join('')}</div>
      <div class="card"><h2>Server IA (opzionale)</h2><p class="mute small">Collegando il tuo server FORGIA (cartella <code>server</code>) l'analista IA legge le schede da foto e commenta i tuoi dati.</p>
      <input id="aiUrl" placeholder="https://il-tuo-server" value="${esc(S.settings.aiUrl || '')}" aria-label="Indirizzo server IA"><button class="sm" style="margin-top:8px" data-act="saveAI">Salva</button></div>
      <div class="card"><h2>Backup automatico ogni ${F.BACKUP_EVERY_DAYS} giorni</h2>${backupCard()}</div>
      <div class="card"><h2>Dati</h2><div class="row wrap"><button class="sm" data-act="export">Esporta backup</button><label class="btn sm" style="margin:0;display:inline-flex;align-items:center">Importa file (profilo o backup)<input type="file" id="impBk" accept="application/json,.json" hidden></label></div>
      <hr style="border:0;border-top:1px solid var(--line);margin:12px 0"><button class="sm danger" data-act="delProfile">Elimina questo profilo e tutti i suoi dati</button></div>
      <p class="mute small">FORGIA dà indicazioni generali di allenamento e alimentazione, non sostituisce medico, fisioterapista o allenatore.</p>`;
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
    tab(t) { ui.tab = t.dataset.tab; ui.sub = null; render(); window.scrollTo(0, 0); },
    newProfile() { ui.sub = { type: 'profile', id: null }; render(); },
    editProfile() { ui.sub = { type: 'profile', id: S.active }; render(); },
    cancelSub() { ui.sub = null; render(); },
    genPlan() { const p = P(), pl = F.generatePlan(p); pl.title = 'Scheda su misura ' + F.todayISO(); p.plans.push(pl); p.activePlan = pl.id; save(); ui.sub = { type: 'plan', id: pl.id }; render(); toast('Scheda creata e attivata'); },
    importPlan() { ui.sub = { type: 'import', state: {} }; render(); },
    openPlan(t) { ui.sub = { type: 'plan', id: t.dataset.id }; render(); window.scrollTo(0, 0); },
    activate(t) { const p = P(); p.activePlan = t.dataset.id; p.draft = null; save(); render(); toast('Scheda attivata'); },
    delPlan(t) { const p = P(), pl = p.plans.find(x => x.id === t.dataset.id); if (!confirm(`Eliminare "${pl.title}"? Le sedute già registrate restano.`)) return; p.plans = p.plans.filter(x => x.id !== pl.id); if (p.activePlan === pl.id) { p.activePlan = p.plans.length ? p.plans[p.plans.length - 1].id : null; p.draft = null; } save(); render(); },
    adapt(t) { const p = P(), pl = p.plans.find(x => x.id === t.dataset.id), n = adaptPlan(pl, p); p.plans.push(n); p.activePlan = n.id; save(); ui.sub = { type: 'plan', id: n.id }; render(); toast('Versione adattata creata e attivata'); },
    swap(t) { const p = P(), pl = p.plans.find(x => x.id === ui.sub.id), e = F.EXMAP[t.dataset.ex], x = pl.days[+t.dataset.d].exercises[+t.dataset.x]; Object.assign(x, { exId: e.id, name: e.name, unit: e.unit, repsInfo: undefined, reps: x.repsInfo ? '8-12' : x.reps, flags: [], note: '' }); save(); render(); },
    rmEx(t) { const p = P(), pl = p.plans.find(x => x.id === ui.sub.id); pl.days[+t.dataset.d].exercises.splice(+t.dataset.x, 1); save(); render(); },
    addEx(t) { const p = P(), pl = p.plans.find(x => x.id === ui.sub.id), v = $('#add_' + t.dataset.d).value; if (!v) return; const e = F.EXMAP[v]; pl.days[+t.dataset.d].exercises.push({ exId: e.id, name: e.name, sets: 3, setsEarly: 2, reps: e.unit === 'sec' ? '20-40 s' : '8-12', unit: e.unit, rest: 90, note: '' }); save(); render(); },
    loadSample(t) { const s = F.SAMPLES.find(x => x.id === t.dataset.id); ui.sub.state = { parsed: F.parseScheda(s.text), title: s.title }; render(); window.scrollTo(0, 0); },
    parseText() { const tx = $('#imp_text').value; if (!tx.trim()) return toast('Incolla prima il testo della scheda'); const r = F.parseScheda(tx); if (!r.days.length || !r.days.some(d => d.exercises.length)) return toast('Non riesco a leggere esercizi: usa il formato NOME | serie | ripetizioni'); ui.sub.state = { parsed: r, title: 'Scheda importata ' + F.todayISO() }; render(); },
    async parsePhoto() {
      const f = $('#imp_photo').files[0]; if (!f) return toast('Scegli prima una foto');
      const b64 = await new Promise(res => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.readAsDataURL(f); });
      toast('Lettura in corso…'); const out = await ai('parse-scheda', { image: b64, mime: f.type }); if (!out || !out.text) return;
      const r = F.parseScheda(out.text); ui.sub.state = { parsed: r, title: 'Scheda da foto ' + F.todayISO() }; render();
    },
    saveImport() {
      const p = P(), st = ui.sub.state, title = ($('#imp_title').value || st.title).trim();
      const pl = { id: 'p' + uid(), title, source: 'importata', createdAt: F.todayISO(), notes: ['Scheda importata: controlla ambiguità ed esercizi collegati.'], days: st.parsed.days.filter(d => d.exercises.length) };
      pl.days.forEach(d => d.exercises.forEach(x => { x.setsEarly = Math.max(2, x.sets - 1); }));
      p.plans.push(pl); p.activePlan = pl.id; save(); ui.sub = { type: 'plan', id: pl.id }; render(); toast('Scheda salvata e attivata');
    },
    startSession(t) {
      const p = P(), plan = planOf(p); const idx = +t.dataset.day;
      if (!p.draft || p.draft.planId !== plan.id) p.draft = { planId: plan.id, dayIdx: idx, data: {}, started: Date.now() };
      save(); ui.sub = { type: 'session' }; render(); window.scrollTo(0, 0);
    },
    sick() { ui.sick = true; render(); window.scrollTo(0, 0); },
    sickClose() { ui.sick = false; render(); },
    sickLog() { const p = P(); p.symptoms = p.symptoms || []; p.symptoms.push({ date: F.todayISO(), at: new Date().toISOString() }); save(); ui.sick = false; render(); toast('Episodio registrato. Se si ripete, fai controllare cuore, pressione e glicemia dal medico.'); },
    pauseSession() { save(); ui.sub = null; render(); },
    addSet(t) { const d = P().draft, i = +t.dataset.i; d.data[i] = d.data[i] || []; const plan = planOf(P()), x = plan.days[d.dayIdx].exercises[i]; const n = Math.max(d.data[i].length, x.sets); while (d.data[i].length < n + 1) d.data[i].push({}); save(); render(); },
    finishSession() {
      const p = P(), plan = planOf(p), d = p.draft, day = plan.days[d.dayIdx];
      const ex = day.exercises.map((x, i) => ({ exId: x.exId, name: x.name, sets: (d.data[i] || []).filter(s => s.done || s.reps != null).map(s => ({ kg: s.kg || 0, reps: s.reps || 0, rpe: s.rpe || null })) })).filter(e => e.sets.length);
      if (!ex.length) return toast('Annota almeno una serie');
      const bw = parseFloat(($('#bw') || {}).value); if (bw > 20) { p.weights.push({ date: F.todayISO(), kg: bw }); p.weight = bw; }
      p.sessions.push({ id: 's' + uid(), date: F.todayISO(), planId: plan.id, dayName: day.name, ex }); p.draft = null; save(); ui.sub = null; ui.tab = 'prog'; clearInterval(ui.tick); ui.timer = null; render(); toast('Seduta salvata. Ottimo lavoro!');
    },
    timerAdd() { if (ui.timer) { ui.timer.left += 30; const el = $('#tleft'); if (el) el.textContent = ui.timer.left; } },
    timerStop() { clearInterval(ui.tick); ui.timer = null; const th = $('#timerHost'); if (th) th.innerHTML = ''; },
    zoneOpen(t) { ui.zone = t.dataset.zone; ui.msgs = []; render(); },
    zoneClose() { ui.zone = null; ui.msgs = []; render(); },
    zoneClear(t) { setPain(t.dataset.zone, 0); },
    addWeight() { const v = parseFloat($('#wIn').value); if (!(v > 20 && v < 300)) return toast('Inserisci un peso valido'); const p = P(); p.weights.push({ date: F.todayISO(), kg: v }); p.weight = v; save(); render(); toast('Peso registrato'); },
    delSession(t) { if (!confirm('Eliminare questa seduta?')) return; const p = P(); p.sessions = p.sessions.filter(s => s.id !== t.dataset.id); save(); render(); },
    async checkUpdate() { toast('Controllo in corso…'); const r = await checkVersion(true); if (r === 'new') toast('Aggiornamento disponibile'); else if (r === 'same') toast('Sei già alla versione più recente'); else toast('Impossibile controllare: sei offline?'); render(); },
    async applyUpdate() { toast('Aggiorno…'); try { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(x => x.unregister())); const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch (e) { } location.reload(); },
    dismissNews() { S.settings.seenBuild = F.VERSION.build; save(); ui.whatsNew = null; render(); },
    sendReq() { const t = reqText(); if (!t) return; const body = `${t}\n\n---\nApp FORGIA v${F.VERSION.version} (build ${F.VERSION.build})\n${navigator.userAgent}`; const url = `https://github.com/${F.REPO}/issues/new?labels=richiesta&title=${encodeURIComponent('Richiesta: ' + t.slice(0, 60))}&body=${encodeURIComponent(body)}`; logReq(t, 'aperta su GitHub'); window.open(url, '_blank', 'noopener'); },
    async copyReq() { const t = reqText(); if (!t) return; const txt = `Richiesta per FORGIA v${F.VERSION.version}: ${t}`; try { await navigator.clipboard.writeText(txt); toast('Copiato: incollalo nella chat con Claude'); } catch (e) { toast('Copia non riuscita: seleziona il testo e copialo'); } logReq(t, 'copiata per la chat'); },
    delReq(t) { S.requests = (S.requests || []).filter(r => r.id !== t.dataset.id); save(); render(); },
    saveAI() { S.settings.aiUrl = $('#aiUrl').value.trim(); save(); toast('Salvato'); },
    async bkPick() { try { const h = await F.pickDir(); ui.bkDir = h.name; const r = await F.runBackup(S, { interactive: true }); save(); render(); toast(r.ok ? 'Cartella collegata. Backup fatto: ' + r.where : 'Cartella collegata'); } catch (e) { if (!e || e.name !== 'AbortError') toast('Cartella non accessibile'); } },
    async bkForget() { await F.forgetDir(); ui.bkDir = null; render(); toast('Cartella scollegata'); },
    async bkNow() { const r = await F.runBackup(S, { interactive: true, manual: true }); if (r.ok) { save(); ui.bkHide = true; render(); toast(`Backup di ${r.profiles} profil${r.profiles === 1 ? 'o' : 'i'} salvato: ${r.where}`); } else toast('Backup non riuscito (' + r.reason + ')'); },
    async bkShare() { try { await F.nativeShare(F.allFiles(S)); } catch (e) { toast('Condivisione annullata'); } },
    bkLater() { ui.bkHide = true; render(); },
    export() { F.download(F.allFiles(S).concat([{ path: 'FORGIA_backup_completo_' + F.todayISO() + '.json', mime: 'application/json', text: JSON.stringify(S, null, 1) }])); },
    delProfile() { const p = P(); if (!confirm(`Eliminare il profilo di ${p.name} con schede, sedute e dolori? Non si può annullare.`)) return; S.profiles = S.profiles.filter(x => x.id !== p.id); S.active = S.profiles.length ? S.profiles[0].id : null; save(); ui.sub = null; ui.tab = 'home'; render(); },
    async askAI() {
      const p = P(), plan = planOf(p); const out = $('#aiOut'); out.innerHTML = '<p class="mute small">Analisi in corso…</p>';
      const r = await ai('analyze', { profile: { age: F.ageOf(p.birth), sex: p.sex, height: p.height, weight: p.weight, goal: p.goal, style: p.style, level: p.level, stopMonths: p.stopMonths, pain: p.pain }, targets: F.calc(p), plan, analysis: plan ? F.analyzePlan(plan, p).flags : [], weights: p.weights.slice(-20), sessions: p.sessions.slice(-10) });
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
  function reqText() { const t = ($('#reqText').value || '').trim(); if (t.length < 5) { toast('Scrivi cosa vuoi cambiare'); return ''; } return t; }
  function logReq(text, how) { S.requests = S.requests || []; S.requests.push({ id: uid(), date: F.todayISO(), text, how }); save(); const el = $('#reqText'); if (el) el.value = ''; render(); }
  async function checkVersion(manual) {
    try {
      const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) throw 0; const v = await r.json();
      if (v.build > F.VERSION.build) { ui.update = v; return 'new'; }
      ui.update = null;
      if (v.build === F.VERSION.build && S.settings.seenBuild !== v.build && S.profiles.length) ui.whatsNew = v;
      else if (v.build === F.VERSION.build && !S.profiles.length) { S.settings.seenBuild = v.build; save(); }
      return 'same';
    } catch (e) { return 'err'; }
  }
  function setPain(zone, v) {
    const p = P(), before = Object.assign({}, p.pain); p.pain = p.pain || {}; if (v > 0) p.pain[zone] = v; else delete p.pain[zone];
    p.painLog = p.painLog || []; p.painLog.push({ date: F.todayISO(), zone, level: v });
    ui.msgs = F.painReaction(before, p.pain).filter(m => m.startsWith(F.ZONES[zone])); save(); render();
  }

  /* ---------- eventi ---------- */
  document.addEventListener('click', e => {
    const reg = e.target.closest('.reg.hit');
    if (reg && ui.tab === 'body' && !ui.sub) { ui.zone = reg.dataset.zone; ui.msgs = []; render(); const c = document.querySelector('#painR'); if (c) c.scrollIntoView({ block: 'nearest' }); return; }
    const t = e.target.closest('[data-act]'); if (t && act[t.dataset.act]) act[t.dataset.act](t, e);
  });
  document.addEventListener('submit', e => {
    if (e.target.id !== 'pform') return; e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    const base = { name: fd.name.trim(), birth: fd.birth, sex: fd.sex, height: +fd.height, weight: +fd.weight, goal: fd.goal, style: fd.style, days: +fd.days, level: +fd.level, stopMonths: +fd.stopMonths || 0 };
    if (new Date(base.birth) > new Date()) return toast('Data di nascita non valida');
    if (ui.sub.id) { const p = S.profiles.find(x => x.id === ui.sub.id); Object.assign(p, base); if (!p.weights.length || p.weights[p.weights.length - 1].kg !== base.weight) p.weights.push({ date: F.todayISO(), kg: base.weight }); save(); ui.sub = null; render(); toast('Profilo aggiornato'); return; }
    const p = Object.assign({ id: 'u' + uid(), pain: {}, painLog: [], weights: [{ date: F.todayISO(), kg: base.weight }], sessions: [], plans: [], activePlan: null, draft: null, createdAt: F.todayISO() }, base);
    const pl = F.generatePlan(p); pl.title = 'Scheda su misura ' + F.todayISO(); p.plans.push(pl); p.activePlan = pl.id;
    S.profiles.push(p); S.active = p.id; save(); ui.sub = null; ui.tab = 'home'; render(); toast('Profilo e scheda creati');
  });
  document.addEventListener('change', e => {
    const t = e.target, p = P();
    if (t.id === 'profSel') { S.active = t.value; save(); ui.sub = null; ui.zone = null; render(); return; }
    if (t.id === 'progSel') { ui.progEx = t.value; render(); return; }
    if (t.id === 'impBk' && t.files[0]) { const r = new FileReader(); r.onload = () => importText(r.result); r.readAsText(t.files[0]); t.value = ''; return; }
    if (t.dataset.rm) { const v = parseFloat(String(t.value).replace(',', '.')); p.rm = p.rm || {}; if (v > 0) p.rm[t.dataset.rm] = v; else delete p.rm[t.dataset.rm]; save(); render(); return; }
    if (t.dataset.done) { const [i, s] = t.dataset.done.split(':').map(Number); const d = p.draft; d.data[i] = d.data[i] || []; while (d.data[i].length <= s) d.data[i].push({}); d.data[i][s].done = t.checked; if (t.checked) { const plan = planOf(p), x = plan.days[d.dayIdx].exercises[i]; startTimer(x.rest || 90); } save(); return; }
    if (t.dataset.edit) { const [di, xi, k] = t.dataset.edit.split(':'); const pl = p.plans.find(x => x.id === ui.sub.id), x = pl.days[+di].exercises[+xi]; if (k === 'sets') { x.sets = Math.max(1, Math.min(10, +t.value || 1)); x.setsEarly = Math.max(1, x.sets - 1); } else x.reps = t.value; save(); render(); return; }
    if (t.dataset.map) { if (!t.value) return; const [di, xi] = t.dataset.map.split(':'); const pl = p.plans.find(x => x.id === ui.sub.id), x = pl.days[+di].exercises[+xi], e2 = F.EXMAP[t.value]; x.exId = e2.id; x.unit = e2.unit; save(); render(); return; }
  });
  document.addEventListener('input', e => {
    const t = e.target, p = P();
    if (t.id === 'painR') { const v = +t.value; $('#painV').textContent = v; clearTimeout(t._d); t._d = setTimeout(() => setPain(t.dataset.zone, v), 350); return; }
    if (t.dataset.set) { const [i, s, k] = t.dataset.set.split(':'); const d = p.draft; d.data[+i] = d.data[+i] || []; while (d.data[+i].length <= +s) d.data[+i].push({}); const raw = t.value.replace(',', '.'); d.data[+i][+s][k] = raw === '' ? undefined : parseFloat(raw); if (isNaN(d.data[+i][+s][k])) d.data[+i][+s][k] = undefined; save(); }
  });

  F.state = () => S; F.__adapt = adaptPlan;
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
  render();
  autoBackup();
  checkVersion().then(r => { if (r === 'new' || ui.whatsNew) render(); });
})(window.FORMA);
