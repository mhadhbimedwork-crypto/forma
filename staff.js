/* FORGIA / THE LIFTING ZONE – schermate di: storico dolori, export/import Excel e CSV, accesso, area allenatore e area sviluppatore.
   Caricato prima di app.js; app.js lo collega passandogli le sue funzioni (F.mountExtras). */
(function (F) {
  'use strict';
  const DAY = 864e5, T = s => new Date(s + 'T00:00:00').getTime();
  F.mountExtras = function (c) {
    const { esc, ui, fmt, toast } = c, A = F.Account, views = {}, acts = {}, X = { views, acts };
    const S = () => c.S(), P = () => c.P();
    const chipCls = st => st === 'up' ? 'danger' : st === 'new' ? 'warn' : st === 'down' || st === 'clear' ? 'ok' : '';
    const tr = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : '';
    const arrow = st => ({ up: '▲', down: '▼', clear: '✓', new: '●', flat: '■' }[st] || '');
    const staffMode = () => A.enabled ? A.staff() : !!S().settings.staffMode;
    const devMode = () => A.enabled ? A.isAdmin() : !!S().settings.devMode;
    X.showClients = staffMode; X.showDev = devMode;
    X.forms = ['loginForm', 'pwForm', 'newClientForm', 'assignForm', 'mfaForm', 'newGymForm'];
    X.tabs = I => {
      if (!staffMode()) return [];
      if (!A.enabled) return [['clients', 'Clienti', I.user]];
      const r = A.me.role, t = []; if (r === 'admin') t.push(['gyms', 'Palestre', I.chart]); t.push(['clients', 'Clienti', I.user]); if (r === 'head') t.push(['team', 'Team', I.plan]); return t;
    };
    X.homeTab = () => (A.enabled && A.me && A.me.role === 'admin' ? 'gyms' : 'clients');

    /* ---------- storico dolori ---------- */
    function spark(days, today) {
      if (!days.length) return '';
      const W = 130, H = 30, t0 = T(days[0].date), t1 = Math.max(T(today), T(days[days.length - 1].date), t0 + DAY), X0 = d => 3 + (T(d) - t0) / (t1 - t0) * (W - 6), Y = l => H - 3 - l / 10 * (H - 6);
      const pts = [`M${X0(days[0].date).toFixed(1)} ${Y(days[0].level).toFixed(1)}`];
      days.forEach((e, i) => { if (i) { pts.push(`L${X0(e.date).toFixed(1)} ${Y(days[i - 1].level).toFixed(1)}`); pts.push(`L${X0(e.date).toFixed(1)} ${Y(e.level).toFixed(1)}`); } });
      pts.push(`L${X0(today).toFixed(1)} ${Y(days[days.length - 1].level).toFixed(1)}`);
      return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Andamento del dolore" style="flex:none"><line x1="3" y1="${H - 3}" x2="${W - 3}" y2="${H - 3}" stroke="var(--line)"/><path d="${pts.join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/></svg>`;
    };
    function painChart(h, today) {
      const pts = []; h.days.forEach(e => pts.push({ x: e.date, y: e.level })); pts.push({ x: today, y: h.days[h.days.length - 1].level });
      const uniq = pts.filter((p, i) => !i || p.x !== pts[i - 1].x);
      return uniq.length >= 2 ? c.lineChart(uniq, '/10') : '';
    }
    /** Cronologia dei dolori: stato, variazione, durata e date di ogni cambiamento (compresi gli azzeramenti). */
    X.painHistoryCard = function (p, opt) {
      opt = opt || {}; const today = F.todayISO(), hs = F.painHistory(p, today);
      if (!hs.length) return `<div class="card"><h2>Storico dolori</h2><p class="mute small">Ogni volta che segnali o cambi un dolore l'app registra data e livello, così vedi quando aumenta, quando cala e quando sparisce.</p></div>`;
      return `<div class="card"><h2>Storico dolori</h2><p class="mute small" style="margin-top:0">Registrato con data e livello (0-10) a ogni modifica.</p>
        ${hs.map(h => `<details style="border-top:1px solid var(--line);padding:8px 0"><summary style="cursor:pointer;list-style:none"><div class="row" style="gap:8px"><div class="grow"><b>${esc(h.label)}</b>
          <div class="small mute">${h.level > 0 ? `${h.level}/10 · da ${h.daysActive} giorn${h.daysActive === 1 ? 'o' : 'i'} (dal ${tr(h.openSince)})` : `Azzerato${h.clearedOn ? ' il ' + tr(h.clearedOn) : ''} · durato ${h.daysActive} giorn${h.daysActive === 1 ? 'o' : 'i'}`} · picco ${h.peak}/10${h.level > 0 && h.delta7 ? ` · ${h.delta7 > 0 ? '+' : ''}${h.delta7} negli ultimi 7 giorni` : ''}</div></div>
          ${spark(h.days, today)}<span class="chip ${chipCls(h.status)}">${arrow(h.status)} ${esc(h.statusLabel)}</span></div></summary>
          ${painChart(h, today)}
          <table class="sets" style="text-align:left;margin-top:6px"><thead><tr><th style="text-align:left">Data</th><th>Da</th><th>A</th><th style="text-align:left">Evento</th></tr></thead><tbody>${h.changes.slice().reverse().map(ch => { const ss = F.sessionsOn(p, ch.date); return `<tr><td style="text-align:left">${tr(ch.date)}</td><td>${ch.from}</td><td><b>${ch.to}</b></td><td style="text-align:left">${{ new: 'Nuovo dolore', up: 'Aumento', down: 'Calo', clear: 'Azzerato' }[ch.kind]}${ss.length ? `<div class="small mute">dopo: ${esc(ss.map(s => s.dayName).join(', '))}</div>` : ''}</td></tr>`; }).join('')}</tbody></table></details>`).join('')}</div>`;
    };

    /* ---------- export / import ---------- */
    async function deliver(blob, filename) {
      if (F.isNative()) {
        try {
          const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
          const FS = Capacitor.Plugins.Filesystem, path = 'FORGIA-Export/' + filename; await FS.writeFile({ path, data: b64, directory: 'CACHE', recursive: true });
          await Capacitor.Plugins.Share.share({ title: filename, files: [(await FS.getUri({ path, directory: 'CACHE' })).uri], dialogTitle: 'Salva o invia il file' }); return;
        } catch (e) { /* ripiega sul download */ }
      }
      F.saveBlob(blob, filename);
    }
    const stamp = () => F.todayISO();
    async function exportXlsx(list, base) { await deliver(F.xlsxBuild(F.datasets(list)), `${base}_${stamp()}.xlsx`); toast('File Excel pronto'); }
    function exportCsv(list, base) { F.download(F.datasets(list).map(s => ({ path: `${base}_${s.name}_${stamp()}.csv`, mime: 'text/csv', text: F.csvBuild(s) }))); toast('CSV scaricati: uno per ogni foglio'); }
    async function importFile(file, targets, defaultName) {
      let sheets; try { sheets = await F.readTableFile(file); } catch (e) { return toast('Import non riuscito: ' + e.message); }
      const dry = F.importTables(sheets, JSON.parse(JSON.stringify(targets)), { defaultName });
      if (!dry.sheets.length) return toast('Nessun foglio riconosciuto: usa i file esportati da questa app');
      if (!dry.sessions && !dry.pain && !dry.weights && !dry.measures) return toast(dry.unknown.length ? 'Nessun dato importato: clienti non trovati (' + dry.unknown.slice(0, 3).join(', ') + '). Il nome nel file deve essere uguale a quello del profilo.' : 'Nessun dato nuovo: è già tutto presente.');
      const msg = `Dal file (${dry.sheets.join(', ')}) verranno aggiunti:\n• ${dry.sessions} sedute (${dry.sets} serie)\n• ${dry.pain} registrazioni di dolore\n• ${dry.weights} pesi · ${dry.measures} misure\nSaltate ${dry.skipped} righe (duplicate o non valide)${dry.unknown.length ? '\nClienti non trovati: ' + dry.unknown.slice(0, 5).join(', ') : ''}.\nI dati esistenti non vengono cancellati. Procedere?`;
      if (!confirm(msg)) return;
      F.importTables(sheets, targets, { defaultName }); c.save(); c.afterImport && c.afterImport(); c.render(); toast('Importazione completata');
    }
    /** Scheda "Excel e CSV" per il profilo in uso (cliente: solo i suoi dati). */
    X.dataCard = function (p) {
      return `<div class="card"><h2>Excel e CSV dei tuoi dati</h2><p class="mute small" style="margin-top:0">Un file ordinato con fogli separati: sedute (serie, kg, ripetizioni, RPE, volume, 1RM stimato), riepilogo per seduta, progressi per esercizio, volume per muscolo, dolori (registro e andamento), peso, misure e schede.</p>
        <div class="row wrap"><button class="sm primary" data-act="xlsxMine">Scarica Excel</button><button class="sm" data-act="csvMine">Scarica CSV</button>
        <label class="btn sm" style="margin:0;display:inline-flex;align-items:center">Importa Excel/CSV<input type="file" id="impTab" accept=".xlsx,.csv" hidden></label></div>
        <p class="mute small">L'importazione aggiunge i dati senza cancellare quelli esistenti e senza duplicare le righe già presenti.${A.enabled ? ' Vedi e scarichi solo i dati del tuo profilo.' : ''}</p></div>`;
    };
    acts.xlsxMine = () => exportXlsx([P()], F.safeName(P().name));
    acts.csvMine = () => exportCsv([P()], F.safeName(P().name));

    /* ---------- accesso (versione con server) ---------- */
    views.login = function () {
      return `<div class="card hero"><h1>${A.mode === 'admin' ? 'Console amministratore' : 'Accedi'}</h1><p>${A.mode === 'admin' ? 'Accesso riservato. Serve la verifica a due passaggi.' : 'Usa nome, cognome e password ricevuti dalla palestra.'}</p></div>
        <form class="card" id="loginForm" autocomplete="on"><label for="lg_n">Nome</label><input id="lg_n" name="name" autocomplete="given-name" required value="${esc(ui.lgN || '')}">
        <label for="lg_s">Cognome</label><input id="lg_s" name="surname" autocomplete="family-name" required value="${esc(ui.lgS || '')}">
        <label for="lg_p">Password</label><input id="lg_p" name="password" type="password" autocomplete="current-password" required>
        ${ui.authErr ? `<div class="msg danger small" style="margin-top:8px">${esc(ui.authErr)}</div>` : ''}
        <button class="primary" style="margin-top:12px;width:100%" ${ui.busy ? 'disabled' : ''}>${ui.busy ? 'Accesso…' : 'Accedi'}</button>
        <p class="mute small">Non hai le credenziali? Chiedile al titolare della palestra. Puoi cambiare la password dopo il primo accesso.</p></form>`;
    };
    views.newPassword = function () {
      return `<div class="card hero"><h1>Scegli la tua password</h1><p>È la prima volta che entri: imposta una password personale (almeno 8 caratteri).</p></div>
        <form class="card" id="pwForm"><label for="pw1">Nuova password</label><input id="pw1" name="pw1" type="password" autocomplete="new-password" minlength="8" required>
        <label for="pw2">Ripeti la password</label><input id="pw2" name="pw2" type="password" autocomplete="new-password" minlength="8" required>
        ${ui.authErr ? `<div class="msg danger small" style="margin-top:8px">${esc(ui.authErr)}</div>` : ''}
        <button class="primary" style="margin-top:12px;width:100%">Salva password</button></form>`;
    };
    F.CONSENT_VERSION = '1-bozza';
    views.consent = function () {
      const minor = A.me && A.me.birth && F.ageOf(A.me.birth) < 18;
      return `<div class="card hero"><h1>Consenso al trattamento dei dati</h1><p>Per usare l'app la palestra tratta i tuoi dati di allenamento e, se li inserisci, di salute (dolori, misure, peso).</p></div>
        <div class="card"><p class="small">I dati sono visibili a te, all'allenatore e al titolare della palestra, che li usano per seguire il tuo allenamento. Puoi scaricarli in ogni momento e chiederne la cancellazione.</p>
        <p class="msg warn small">Testo provvisorio: va sostituito con l'informativa privacy ufficiale della palestra (versione ${esc(F.CONSENT_VERSION)}).</p>
        ${minor ? '<div class="msg danger small">Sei minorenne: il consenso deve essere dato da un genitore o tutore. Chiedi alla palestra di registrarlo.</div>' : `<label class="row" style="gap:8px"><input type="checkbox" id="cs_ok" style="width:auto"> <span class="small">Ho letto l'informativa e acconsento al trattamento dei miei dati, compresi quelli sulla salute.</span></label>
        <button class="primary" style="margin-top:10px" data-act="consentOk">Acconsento e continuo</button>`}
        <button class="ghost" style="margin-top:8px" data-act="logout">Esci</button></div>`;
    };
    acts.logout = () => { A.signOut(); c.onSignOut(); };

    X.onSubmit = async function (form) {
      if (form.id === 'loginForm') {
        const fd = Object.fromEntries(new FormData(form).entries()); ui.lgN = fd.name; ui.lgS = fd.surname; ui.authErr = ''; ui.busy = true; c.render();
        try { await A.signIn(fd.name, fd.surname, fd.password); ui.busy = false; await c.onSignIn(); } catch (e) { ui.busy = false; ui.authErr = e.message; c.render(); }
        return true;
      }
      if (form.id === 'pwForm') {
        const fd = Object.fromEntries(new FormData(form).entries()); ui.authErr = '';
        if (fd.pw1 !== fd.pw2) { ui.authErr = 'Le due password non coincidono'; c.render(); return true; }
        try { await A.changePassword(fd.pw1); toast('Password aggiornata'); await c.onSignIn(); } catch (e) { ui.authErr = e.message; c.render(); } return true;
      }
      if (form.id === 'mfaForm') {
        const fd = Object.fromEntries(new FormData(form).entries());
        try { await A.mfaVerify(ui.mfa.id, fd.code); ui.mfa = null; await c.onSignIn(); } catch (e) { ui.mfa.err = e.message; c.render(); } return true;
      }
      if (form.id === 'newGymForm') {
        const fd = Object.fromEntries(new FormData(form).entries());
        try { const r = await A.createGym({ gym_name: fd.gym, name: fd.name, surname: fd.surname, password: fd.password, birth: fd.birth || null }); ui.sub = null; ui.tab = 'gyms'; ui.admLoaded = false; toast('Palestra creata. Accesso: ' + r.username); c.render(); } catch (e) { toast('Creazione non riuscita: ' + e.message); } return true;
      }
      if (form.id === 'newClientForm') {
        const fd = Object.fromEntries(new FormData(form).entries()), minor = fd.role === 'client' && fd.birth && F.ageOf(fd.birth) < 18, back = ui.sub && ui.sub.back || 'clients';
        if (minor && (!fd.guardian || !fd.guardianOk)) { toast('Per un minorenne servono nome del genitore e conferma del consenso'); return true; }
        try {
          const r = await A.createUser({ name: fd.name, surname: fd.surname, birth: fd.birth || null, password: fd.password, role: fd.role || 'client', can_see_all: !!fd.canSeeAll, consent: fd.role === 'client' && (fd.consentOk || minor) ? { version: F.CONSENT_VERSION, is_minor: !!minor, guardian_name: fd.guardian || null, guardian_contact: fd.guardianContact || null } : null });
          ui.sub = null; ui.tab = back; ui.admLoaded = false; toast('Account creato: ' + r.username); await loadClients(); c.render();
        } catch (e) { toast('Creazione non riuscita: ' + e.message); } return true;
      }
      if (form.id === 'assignForm') {
        const fd = Object.fromEntries(new FormData(form).entries());
        if (!fd.title.trim() || !fd.body.trim()) { toast('Scrivi titolo e testo della scheda'); return true; }
        const r = F.parseScheda(fd.body); if (!r.days.length || !r.days.some(d => d.exercises.length)) { toast('Non riesco a leggere esercizi in questo testo'); return true; }
        if (!A.enabled) {
          const cl = find(ui.sub.uid); if (!cl) return true;
          const key = fd.title.trim().toLowerCase(), prevN = (cl.plans || []).filter(x => x.assignedLocal && (x.baseTitle || x.title).toLowerCase() === key).length;
          const pl = { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), title: fd.title.trim() + (prevN ? ' (v' + (prevN + 1) + ')' : ''), baseTitle: fd.title.trim(), body: fd.body, assignedLocal: true, source: 'allenatore', createdAt: F.todayISO(), notes: ['Scheda assegnata dal tuo allenatore.'], days: r.days.filter(d => d.exercises.length) };
          pl.days.forEach(d => d.exercises.forEach(x => { x.setsEarly = Math.max(2, x.sets - 1); }));
          const had = cl.plans.find(x => x.id === cl.activePlan); cl.plans.forEach(x => { if (x.offer) x.offer = false; });
          if (had) pl.offer = true; cl.plans.push(pl); if (!had) cl.activePlan = pl.id;
          c.save(); toast(prevN ? 'Scheda modificata e assegnata: versione ' + (prevN + 1) : 'Scheda assegnata a ' + cl.name); form.reset(); ui.asgDraft = null; c.render(); return true;
        }
        try { const prevN = ((ui.ph || {})[ui.sub.uid] || []).filter(m => keyT(m.title) === keyT(fd.title)).length; await A.assignPlan(ui.sub.uid, fd.title.trim(), fd.body); toast(prevN ? 'Scheda modificata e inviata: versione ' + (prevN + 1) : 'Scheda inviata al cliente'); form.reset(); ui.asgDraft = null; if (ui.ph) delete ui.ph[ui.sub.uid]; c.render(); } catch (e) { toast('Invio non riuscito: ' + e.message); } return true;
      }
      return false;
    };

    /* ---------- area allenatore ---------- */
    async function loadClients() { try { ui.cl = await A.listClients(); ui.clErr = null; } catch (e) { ui.clErr = e.message; } ui.clLoaded = true; }
    X.clients = () => A.enabled ? (ui.cl || []) : S().profiles;
    const uidOf = p => p._uid || p.id;
    const find = id => X.clients().find(p => uidOf(p) === id);
    X.ensureClients = async function () { if (A.enabled && staffMode() && !ui.clLoaded && !ui.clBusy) { ui.clBusy = true; await loadClients(); ui.clBusy = false; c.render(); } };

    /* ---------- dashboard del cliente: schede scorrevoli di lato ---------- */
    const bar = (v, mx, col) => `<div style="height:6px;border-radius:3px;background:#0a0e14;margin-top:3px"><div style="height:6px;border-radius:3px;width:${mx ? Math.max(2, Math.round(v / mx * 100)) : 0}%;background:${col || 'var(--accent)'}"></div></div>`;
    const kv = (v, l, col) => `<div class="kpi"><b ${col ? `style="color:${col}"` : ''}>${v}</b><span>${l}</span></div>`;
    X.dashSlides = function (p) {
      const today = F.todayISO(), st = F.clientStats(p, today), out = [];
      const ss = (p.sessions || []).slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.at || 0) - (b.at || 0));
      /* 1 sintesi */
      const from56 = F.isoAddDays(today, -56), wk = {}; ss.filter(s => s.date >= from56).forEach(s => { const k = F.mondayOf(s.date); wk[k] = (wk[k] || 0) + 1; });
      const weeks = []; for (let i = 7; i >= 0; i--) weeks.push(F.mondayOf(F.isoAddDays(today, -7 * i))); const wmax = Math.max(1, ...weeks.map(k => wk[k] || 0));
      out.push(['Sintesi', `<div class="grid3 k4">${kv(st.sessions7, 'sedute 7 giorni')}${kv(st.sessions28, 'sedute 4 sett.')}${kv(st.adherence + '%', 'aderenza', st.adherence < 50 && st.sessions ? 'var(--warn)' : '')}${kv(st.daysSince == null ? '–' : st.daysSince, 'giorni fermo', st.daysSince > 10 ? 'var(--warn)' : '')}</div>
        <div class="grid3 k4" style="margin-top:8px">${kv(st.sessions, 'sedute totali')}${kv(fmt(st.totalSets), 'serie totali')}${kv(fmt(st.volume28), 'kg volume 4 sett.')}${kv(st.rpe28 == null ? '–' : st.rpe28, 'RPE medio')}</div>
        <div class="small mute" style="margin:10px 0 2px">Sedute per settimana (ultime 8)</div><div style="display:flex;gap:4px;align-items:flex-end;height:48px">${weeks.map(k => `<div title="${tr(k)}: ${wk[k] || 0}" style="flex:1;background:var(--accent);height:${Math.max(3, Math.round((wk[k] || 0) / wmax * 48))}px;border-radius:2px;opacity:${wk[k] ? 1 : .25}"></div>`).join('')}</div>`]);
      /* 2 forza */
      const exs = F.exerciseStats(p).filter(o => o.bestE1).slice(0, 6), recent = F.exerciseStats(p).filter(o => o.prDate && o.prDate >= F.isoAddDays(today, -28));
      out.push(['Forza', exs.length ? `<table class="sets" style="text-align:left"><thead><tr><th style="text-align:left">Esercizio</th><th>Miglior kg</th><th>1RM stim.</th><th>Var.</th></tr></thead><tbody>${exs.map(o => `<tr><td style="text-align:left">${esc(o.name)}<div class="mute small">${o.sessions} sedute</div></td><td>${o.bestKg ? fmt(o.bestKg, 1) : '–'}</td><td>${fmt(o.bestE1, 1)}</td><td style="color:${o.change > 0 ? 'var(--ok)' : o.change < 0 ? 'var(--danger)' : 'inherit'}">${o.change == null ? '–' : (o.change > 0 ? '+' : '') + o.change + '%'}</td></tr>`).join('')}</tbody></table>
        <p class="small" style="margin:8px 0 0">${recent.length ? '<b>Record ultimi 28 giorni:</b> ' + recent.map(o => esc(o.name) + ' (' + tr(o.prDate) + ')').join(', ') : 'Nessun nuovo record negli ultimi 28 giorni.'}</p>` : '<p class="mute small">Servono sedute con peso e ripetizioni.</p>']);
      /* 3 dolori */
      const ph = st.painAll;
      out.push(['Dolori', ph.length ? ph.map(h => `<div style="padding:6px 0;border-top:1px solid var(--line)"><div class="row" style="gap:8px"><b class="grow">${esc(h.label)}</b><span class="chip ${chipCls(h.status)}">${arrow(h.status)} ${esc(h.statusLabel)}</span> <b>${h.level}/10</b></div>
        <div class="mute small">Picco ${h.peak}/10 · dal ${tr(h.first)}${h.level > 0 ? ` · ${h.daysActive} giorni attivo · ${h.delta7 > 0 ? '+' : ''}${h.delta7} negli ultimi 7 giorni` : h.clearedOn ? ` · azzerato il ${tr(h.clearedOn)}` : ''}</div>${bar(h.level, 10, h.level >= 7 ? 'var(--danger)' : h.level >= 4 ? 'var(--warn)' : 'var(--ok)')}</div>`).join('') : '<p class="mute small">Nessun dolore registrato.</p>']);
      /* 4 peso e misure */
      const ws = (p.weights || []).slice().sort((a, b) => a.date < b.date ? -1 : 1), ms = (p.measures || []).slice().sort((a, b) => a.date < b.date ? -1 : 1);
      const mrows = ms.length > 1 ? (F.MEASURES || []).map(m => { const a = ms[0].v[m[0]], b = ms[ms.length - 1].v[m[0]]; return a && b && a !== b ? [m[1] + ' ' + (m[2] || ''), b, Math.round((b - a) * 10) / 10] : null; }).filter(Boolean).slice(0, 6) : [];
      out.push(['Peso e corpo', `<div class="grid3 k4">${kv(fmt(st.weight, 1) + ' kg', 'peso attuale')}${kv((st.weightDelta > 0 ? '+' : '') + st.weightDelta, 'kg dall\'inizio')}${kv(ws.length, 'pesate')}${kv(ms.length, 'misure prese')}</div>${ws.length > 1 ? c.lineChart(ws.map(w => ({ x: w.date, y: w.kg })), 'kg') : ''}
        ${mrows.length ? `<table class="sets" style="text-align:left;margin-top:6px"><thead><tr><th style="text-align:left">Misura</th><th>Ora</th><th>Variazione</th></tr></thead><tbody>${mrows.map(r => `<tr><td style="text-align:left">${esc(r[0])}</td><td>${r[1]}</td><td>${r[2] > 0 ? '+' : ''}${r[2]}</td></tr>`).join('')}</tbody></table>` : ''}`]);
      /* 5 muscoli */
      const w0 = F.mondayOf(today), w1 = F.mondayOf(F.isoAddDays(today, -7)), wm = F.weeklyMuscleSets(p), cur = wm.filter(x => x.week === w0), prv = wm.filter(x => x.week === w1);
      const labs = [...new Set(cur.concat(prv).map(x => x.label))], get = (arr, l) => (arr.find(x => x.label === l) || {}).sets || 0, mx = Math.max(1, ...labs.map(l => Math.max(get(cur, l), get(prv, l))));
      out.push(['Muscoli', labs.length ? `<div class="small mute">Serie ponderate: questa settimana · scorsa</div>${labs.sort((a, b) => get(cur, b) - get(cur, a)).map(l => `<div style="margin-top:6px"><div class="row small"><span class="grow">${esc(l)}</span><b>${get(cur, l)}</b><span class="mute">&nbsp;· ${get(prv, l)}</span></div>${bar(get(cur, l), mx)}</div>`).join('')}` : '<p class="mute small">Nessuna seduta nelle ultime due settimane.</p>']);
      /* 6 scheda */
      const pl = (p.plans || []).find(x => x.id === p.activePlan), given = (p.plans || []).filter(x => x.assignedLocal || x.assignedId);
      out.push(['Scheda', pl ? `<b>${esc(pl.title)}</b><div class="mute small">${pl.days.length} giorni · ${pl.days.reduce((a, d) => a + d.exercises.filter(x => !x.alt).length, 0)} esercizi · dal ${tr(pl.createdAt)}</div>
        ${pl.days.map(d => { const n = ss.filter(s => s.planId === pl.id && s.dayName === d.name).length; return `<div class="row small" style="padding:4px 0;border-top:1px solid var(--line)"><span class="grow">${esc(d.name)}</span><span class="mute">${n} sedute</span></div>`; }).join('')}
        <p class="small" style="margin:8px 0 0">${given.length ? 'Schede dell\'allenatore: <b>' + given.length + '</b> · ultima ' + tr(given[given.length - 1].createdAt) + (given.some(x => x.offer) ? ' (il cliente non l\'ha ancora attivata)' : '') : 'Nessuna scheda inviata dall\'allenatore.'}</p>` : '<p class="mute small">Nessuna scheda attiva.</p>']);
      /* 7 ultime sedute */
      out.push(['Ultime sedute', ss.length ? ss.slice(-4).reverse().map(s => { const x = F.sessionStats(s); return `<div style="padding:6px 0;border-top:1px solid var(--line)"><b>${tr(s.date)}</b> · ${esc(s.dayName)}<div class="mute small">${x.exercises} esercizi · ${x.sets} serie · ${fmt(x.volume)} kg${x.rpe ? ' · RPE ' + x.rpe : ''}</div><div class="small">${s.ex.slice(0, 4).map(e => esc(e.name)).join(', ')}${s.ex.length > 4 ? '…' : ''}</div></div>`; }).join('') : '<p class="mute small">Nessuna seduta.</p>']);
      return out;
    };
    X.dashStrip = function (p) {
      const sl = X.dashSlides(p);
      return `<div class="dashw"><div class="dtabs" role="tablist">${sl.map((x, i) => `<button class="dtab${i === 0 ? ' on' : ''}" role="tab" data-act="dashTo" data-i="${i}">${esc(x[0])}</button>`).join('')}</div>
        <div class="dashbox"><button class="dnav l" data-act="dashGo" data-d="-1" aria-label="Pagina precedente" hidden>‹</button><button class="dnav r" data-act="dashGo" data-d="1" aria-label="Pagina successiva">›</button>
        <div class="dash" tabindex="0" aria-label="Dashboard del cliente (frecce sinistra e destra per scorrere)">${sl.map(x => `<section class="dslide"><h3>${esc(x[0])}</h3>${x[1]}</section>`).join('')}</div></div></div>`;
    };
    /* navigazione con mouse, frecce e tastiera */
    const dashOf = el => el.closest('.dashw');
    const dashStep = d => { const s = d.querySelector('.dslide'); return s ? s.getBoundingClientRect().width + 10 : 300; };
    const dashSync = d => {
      const w = dashOf(d); if (!w) return; const n = d.children.length, i = Math.min(n - 1, Math.max(0, Math.round(d.scrollLeft / dashStep(d))));
      w.querySelectorAll('.dtab').forEach((b, k) => b.classList.toggle('on', k === i));
      const l = w.querySelector('.dnav.l'), r = w.querySelector('.dnav.r'); if (l) l.hidden = d.scrollLeft < 4; if (r) r.hidden = d.scrollLeft + d.clientWidth >= d.scrollWidth - 4;
      const act = w.querySelector('.dtab.on'); if (act && act.scrollIntoView) { const tb = w.querySelector('.dtabs'); tb.scrollTo({ left: act.offsetLeft - 20, behavior: 'smooth' }); }
    };
    acts.dashGo = t => { const d = dashOf(t).querySelector('.dash'); d.scrollBy({ left: +t.dataset.d * dashStep(d), behavior: 'smooth' }); };
    acts.dashTo = t => { const d = dashOf(t).querySelector('.dash'); d.scrollTo({ left: +t.dataset.i * dashStep(d), behavior: 'smooth' }); };
    document.addEventListener('scroll', e => { if (e.target.classList && e.target.classList.contains('dash')) dashSync(e.target); }, true);
    document.addEventListener('keydown', e => { const d = e.target.closest && e.target.closest('.dash'); if (!d || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return; e.preventDefault(); d.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * dashStep(d), behavior: 'smooth' }); });
    let drag = null;
    document.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; const d = e.target.closest && e.target.closest('.dash'); if (!d || e.target.closest('button,a,input,select,textarea,summary')) return; drag = { d, x: e.clientX, l: d.scrollLeft, moved: false }; });
    document.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 4) { drag.moved = true; drag.d.classList.add('drag'); } if (drag.moved) drag.d.scrollLeft = drag.l - dx; });
    const dragEnd = () => { if (!drag) return; const d = drag.d, moved = drag.moved; drag = null; if (moved) { d.classList.remove('drag'); d.scrollTo({ left: Math.round(d.scrollLeft / dashStep(d)) * dashStep(d), behavior: 'smooth' }); } };
    document.addEventListener('pointerup', dragEnd); document.addEventListener('pointercancel', dragEnd);
    /* ---------- corpo del cliente: recupero muscolare e dolori, con i tempi ---------- */
    X.bodyCard = function (p) {
      const rec = F.recovery(p), rows = Object.keys(F.MUSCLE_LABEL).map(m => [m, rec[m]]).sort((a, b) => a[1].pct - b[1].pct);
      const ph = F.painHistory(p).filter(h => h.level > 0), pain = {}; ph.forEach(h => { pain[h.zone] = h.level; });
      const tired = rows.filter(([, o]) => o.pct < 90 && o.last), mode = ui.cBody || 'rec';
      const fig = opts => `<div class="bodies"><figure>${F.bodySVG('f', opts)}<figcaption>Fronte</figcaption></figure><figure>${F.bodySVG('b', opts)}<figcaption>Retro</figcaption></figure></div>`;
      const wait = o => o.hours ? 'pronto tra ' + (o.hours >= 48 ? Math.round(o.hours / 24) + ' g' : o.hours + ' h') : (o.last ? 'pronto' : 'a riposo');
      const seg = `<div class="row" style="margin-bottom:8px"><button class="sm grow ${mode === 'rec' ? 'primary' : ''}" data-act="cBody" data-m="rec">Recupero</button><button class="sm grow ${mode === 'pain' ? 'primary' : ''}" data-act="cBody" data-m="pain">Dolore</button></div>`;
      const body = mode === 'rec'
        ? `${fig({ rec })}<div class="legend"><span><i style="background:#34d399"></i>90-100%</span><span><i style="background:#a3e635"></i>70-89</span><span><i style="background:#facc15"></i>50-69</span><span><i style="background:#f97316"></i>30-49</span><span><i style="background:#ef4444"></i>&lt;30</span></div>
          ${tired.length ? tired.map(([m, o]) => `<div style="margin:6px 0"><div class="row small"><span class="grow">${esc(F.MUSCLE_LABEL[m])}</span><b style="color:${F.recColor(o.pct)}">${o.pct}%</b><span class="mute" style="min-width:96px;text-align:right">${wait(o)}</span></div>${bar(o.pct, 100, F.recColor(o.pct))}</div>`).join('') : `<p class="small mute">${(p.sessions || []).length ? 'Tutti i muscoli sono recuperati.' : 'Nessuna seduta: niente da recuperare.'}</p>`}`
        : `${fig({ pain })}<div class="legend"><span><i style="background:#facc15"></i>1-3</span><span><i style="background:#f97316"></i>4-6</span><span><i style="background:#ef4444"></i>7-10</span></div>
          ${ph.length ? ph.map(h => `<div style="margin:6px 0"><div class="row small"><span class="grow">${esc(h.label)}</span><span class="chip ${chipCls(h.status)}">${arrow(h.status)} ${esc(h.statusLabel)}</span> <b>${h.level}/10</b></div><div class="mute small">attivo da ${h.daysActive} giorni · picco ${h.peak}/10 · ${h.delta7 > 0 ? '+' : ''}${h.delta7} in 7 giorni</div></div>`).join('') : '<p class="small mute">Nessun dolore attivo.</p>'}`;
      return `<div class="card"><h2>Corpo: recupero e dolore</h2>${seg}${body}</div>`;
    };
    acts.cBody = t => { ui.cBody = t.dataset.m; c.render(); };
    function clientCard(p) {
      const st = F.clientStats(p), alert = st.alerts.length, late = st.daysSince != null && st.daysSince > 10;
      return `<div class="card" style="${alert ? 'border-color:var(--danger)' : ''}"><div class="row" style="gap:8px"><div class="grow"><b>${esc(p.name)}</b>${F.isMinor(p) ? ' <span class="chip warn">minorenne</span>' : ''}${p._acct && !p._acct.active ? ' <span class="chip">disattivato</span>' : ''}
        <div class="mute small">${F.ageOf(p.birth)} anni · ${fmt(st.weight, 1)} kg · ${st.sessions} sedute${st.last ? ` · ultima ${tr(st.last)} (${st.daysSince === 0 ? 'oggi' : st.daysSince + ' g fa'})` : ' · nessuna seduta'}</div></div>
        <button class="sm primary" data-act="clientOpen" data-id="${esc(uidOf(p))}">Apri</button></div>
        ${st.pain.length ? `<div style="margin-top:8px">${st.pain.map(h => `<span class="chip ${chipCls(h.status)}">${arrow(h.status)} ${esc(h.label)} ${h.level}/10</span>`).join(' ')}</div>` : ''}
        <div style="margin-top:8px">${X.dashStrip(p)}</div>`;
    }
    views.clients = function () {
      X.ensureClients();
      const q = (ui.clQ || '').toLowerCase(), list = X.clients().filter(p => !q || p.name.toLowerCase().includes(q))
        .sort((a, b) => (F.clientStats(b).alerts.length - F.clientStats(a).alerts.length) || a.name.localeCompare(b.name));
      const all = X.clients();
      const ver = F.VERSION.version + '.' + F.VERSION.build; let seen = null; try { seen = localStorage.getItem('tlz.bkver'); } catch (e) { }
      const needBk = A.enabled && ui.clLoaded && all.length && seen !== ver;
      if (needBk && A.isAdmin() && !ui.bkAuto) { ui.bkAuto = true; setTimeout(() => acts.bkUpdate(), 400); }
      return `<h1>Clienti</h1>
        ${needBk ? `<div class="card" style="border-color:var(--warn)"><b>Aggiornamento ${esc(F.VERSION.version)} installato: backup di tutti gli utenti</b><div class="small mute">Scarica subito il file Excel con i dati di tutti, da tenere sul PC. Dopo un aggiornamento è la copia di sicurezza che ti salva in caso di problemi.</div><button class="sm primary" data-act="bkUpdate" style="margin-top:8px">Backup completo adesso</button></div>` : ''}
        ${A.enabled ? '' : '<div class="msg tip small">Modalità locale: i clienti sono i profili di questo dispositivo. Con il server collegato qui compaiono tutti i clienti della palestra, ognuno col proprio accesso.</div>'}
        ${ui.clErr ? `<div class="msg danger small">${esc(ui.clErr)}</div>` : ''}
        <div class="card"><div class="row wrap"><button class="sm primary" data-act="xlsxAll">Excel di tutti</button><button class="sm" data-act="csvAll">CSV di tutti</button>
          <label class="btn sm" style="margin:0;display:inline-flex;align-items:center">Importa Excel/CSV<input type="file" id="impTabAll" accept=".xlsx,.csv" hidden></label>
          ${A.enabled ? '<button class="sm" data-act="clientNew">+ Nuovo cliente</button><button class="sm" data-act="clientsReload">Aggiorna</button>' : ''}</div>
          <p class="mute small" style="margin-bottom:0">${all.length} client${all.length === 1 ? 'e' : 'i'}. L'Excel ha un foglio per tipo di dato con la colonna Cliente; l'importazione riconosce i clienti dal nome.</p></div>
        ${all.length > 3 ? `<input id="clQ" placeholder="Cerca cliente…" value="${esc(ui.clQ || '')}" aria-label="Cerca cliente">` : ''}
        ${A.enabled && !ui.clLoaded ? '<p class="mute">Caricamento…</p>' : ''}
        ${list.map(clientCard).join('') || (ui.clLoaded || !A.enabled ? '<p class="mute">Nessun cliente.</p>' : '')}`;
    };
    function sessionsDetail(p) {
      const ss = (p.sessions || []).slice().sort((a, b) => b.date < a.date ? -1 : 1).slice(0, 10);
      return ss.length ? ss.map(s => { const x = F.sessionStats(s); return `<details style="border-top:1px solid var(--line);padding:6px 0"><summary><b>${tr(s.date)}</b> · ${esc(s.dayName)} <span class="mute small">${x.sets} serie · ${fmt(x.volume)} kg${x.rpe ? ' · RPE ' + x.rpe : ''}</span></summary>${s.ex.map(e => `<div class="small"><b>${esc(e.name)}</b>: ${e.sets.map(t => `${t.kg ? fmt(t.kg, 1) + '×' : ''}${t.reps}${t.rpe ? '@' + t.rpe : ''}`).join(' · ')}</div>`).join('')}</details>`; }).join('') : '<p class="mute small">Nessuna seduta registrata.</p>';
    }
    /* ---------- storico schede inviate (ogni invio resta, con versione e differenze) ---------- */
    const keyT = t => String(t || '').trim().toLowerCase();
    function planVersions(list) {
      const cnt = {}; return list.map(m => { const k = keyT(m.title); cnt[k] = (cnt[k] || 0) + 1; return Object.assign({}, m, { ver: cnt[k] }); });
    }
    function lineDiff(prev, cur) {
      const norm = t => String(t || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean), a = norm(prev), b = norm(cur);
      return { add: b.filter(x => !a.includes(x)), del: a.filter(x => !b.includes(x)) };
    }
    X.planHistoryCard = function (p) {
      const uid = uidOf(p); ui.ph = ui.ph || {};
      if (!A.enabled) ui.ph[uid] = (p.plans || []).filter(x => x.assignedLocal).map(x => ({ id: x.id, title: x.baseTitle || x.title, body: x.body || '', created_at: x.createdAt, imported_at: x.offer === false ? x.createdAt : null, coach: { full_name: 'Allenatore' } }));
      else if (ui.ph[uid] === undefined && !ui.phBusy) { ui.phBusy = true; A.clientPlans(uid).then(r => { ui.ph[uid] = r; ui.phBusy = false; c.render(); }).catch(() => { ui.ph[uid] = []; ui.phBusy = false; }); }
      const list = planVersions(ui.ph[uid] || []);
      if (!list.length) return `<div class="card"><h2>Schede inviate</h2><p class="mute small">${ui.ph[uid] === undefined ? 'Carico…' : 'Nessuna scheda inviata a questo cliente.'}</p></div>`;
      const last = {};
      const rows = list.map(m => {
        const k = keyT(m.title), prev = last[k]; last[k] = m;
        const d = prev ? lineDiff(prev.body, m.body) : null;
        return `<details style="border-top:1px solid var(--line);padding:6px 0"><summary><b>${esc(m.title)}</b> <span class="chip">v${m.ver}</span> <span class="mute small">${tr(String(m.created_at).slice(0, 10))}${m.coach && m.coach.full_name ? ' · ' + esc(m.coach.full_name) : ''} · ${m.imported_at ? 'ricevuta dal cliente' : 'in attesa'}</span></summary>
          ${d ? `<p class="small" style="margin:6px 0 2px"><b>Modifiche rispetto alla v${prev.ver}:</b> ${d.add.length} righe nuove o cambiate, ${d.del.length} tolte o cambiate.</p>${d.add.length ? '<div class="small" style="color:var(--ok)">' + d.add.map(x => '+ ' + esc(x)).join('<br>') + '</div>' : ''}${d.del.length ? '<div class="small" style="color:var(--danger)">' + d.del.map(x => '− ' + esc(x)).join('<br>') + '</div>' : ''}` : '<p class="small mute" style="margin:6px 0 2px">Prima versione.</p>'}
          <pre class="small" style="white-space:pre-wrap;font-family:inherit;margin:6px 0;max-height:220px;overflow:auto">${esc(m.body)}</pre>
          ${A.me && A.me.role !== 'admin' ? `<button class="sm" data-act="planReuse" data-id="${m.id}" data-u="${esc(uid)}">Modifica e rinvia</button>` : ''}</details>`;
      }).reverse().join('');
      return `<div class="card"><h2>Schede inviate (${list.length})</h2><p class="mute small" style="margin-top:0">Ogni invio resta registrato: se rinvii una scheda con lo stesso titolo diventa una nuova versione.</p>${rows}</div>`;
    };
    acts.planReuse = t => { const m = ((ui.ph || {})[t.dataset.u] || []).find(x => String(x.id) === t.dataset.id); if (!m) return; ui.asgDraft = { uid: t.dataset.u, title: m.title, body: m.body }; c.render(); setTimeout(() => { const el = document.getElementById('assignForm'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 50); toast('Modifica il testo e invia: sarà una nuova versione'); };

    views.client = function () {
      const p = find(ui.sub.uid); if (!p) return `<div class="row"><button class="ghost" data-act="clientBack">← Clienti</button></div><p class="mute">Cliente non trovato.</p>`;
      const st = F.clientStats(p), ex = F.exerciseStats(p).slice(0, 8), ws = (p.weights || []).slice().sort((a, b) => a.date < b.date ? -1 : 1).map(w => ({ x: w.date, y: w.kg }));
      const acct = p._acct, role = A.me && A.me.role, can = A.enabled && acct;
      return `<div class="row"><button class="ghost" data-act="clientBack">← Clienti</button></div><h1>${esc(p.name)}</h1>
        <div class="card"><div class="mute small">${F.ageOf(p.birth)} anni · ${p.height} cm · ${fmt(st.weight, 1)} kg${st.weightDelta ? ` (${st.weightDelta > 0 ? '+' : ''}${st.weightDelta} dall'inizio)` : ''}${F.isMinor(p) ? ' · minorenne' : ''}${acct ? ` · accesso: ${esc(acct.username)}` : ''}${p._updated ? ` · sincronizzato ${tr(String(p._updated).slice(0, 10))}` : ''}</div>
          <div class="grid3 k4" style="margin-top:8px"><div class="kpi"><b>${st.sessions}</b><span>sedute</span></div><div class="kpi"><b>${st.adherence}%</b><span>aderenza 4 sett.</span></div><div class="kpi"><b>${fmt(st.volume28)}</b><span>kg volume 4 sett.</span></div><div class="kpi"><b>${st.rpe28 == null ? '–' : st.rpe28}</b><span>RPE medio</span></div></div>
          <div class="row wrap" style="margin-top:10px"><button class="sm primary" data-act="xlsxClient" data-id="${esc(uidOf(p))}">Excel del cliente</button><button class="sm" data-act="csvClient" data-id="${esc(uidOf(p))}">CSV</button></div></div>
        <div class="card"><h2>Dashboard</h2>${X.dashStrip(p)}</div>
        ${X.bodyCard(p)}
        ${st.alerts.length ? `<div class="msg danger small"><b>Attenzione:</b> ${st.alerts.map(h => `${esc(h.label)} ${h.level}/10 (${esc(h.statusLabel.toLowerCase())})`).join(', ')}.</div>` : ''}
        ${X.painHistoryCard(p)}
        <div class="card"><h2>Ultime sedute</h2>${sessionsDetail(p)}</div>
        ${ex.length ? `<div class="card"><h2>Progressi per esercizio</h2><table class="sets" style="text-align:left"><thead><tr><th style="text-align:left">Esercizio</th><th>Sedute</th><th>Miglior 1RM</th><th>Var.</th></tr></thead><tbody>${ex.map(o => `<tr><td style="text-align:left">${esc(o.name)}</td><td>${o.sessions}</td><td>${o.bestE1 || '–'}</td><td>${o.change == null ? '–' : (o.change > 0 ? '+' : '') + o.change + '%'}</td></tr>`).join('')}</tbody></table></div>` : ''}
        ${ws.length > 1 ? `<div class="card"><h2>Peso</h2>${c.lineChart(ws, 'kg')}</div>` : ''}
        ${X.planHistoryCard(p)}
        ${(can && role !== 'admin') || !A.enabled ? `<div class="card"><h2>${A.enabled ? 'Invia una scheda' : 'Assegna una scheda a ' + esc(p.name)}</h2><form id="assignForm"><label for="as_t">Titolo</label><input id="as_t" name="title" value="${esc((ui.asgDraft && ui.asgDraft.uid === uidOf(p) ? ui.asgDraft.title : '') || '')}" placeholder="Es. Scheda forza novembre">
          <label for="as_b">Testo della scheda (come dal personal trainer)</label><textarea id="as_b" name="body" style="min-height:120px;font-family:inherit" placeholder="Giorno 1&#10;Panca piana 4x6-8 rec 120s&#10;…">${esc((ui.asgDraft && ui.asgDraft.uid === uidOf(p) ? ui.asgDraft.body : '') || '')}</textarea>
          <button class="primary" style="margin-top:8px">${A.enabled ? 'Invia al cliente' : 'Assegna al cliente'}</button></form><p class="mute small">${A.enabled ? '' : 'Modalità locale: la scheda va direttamente nel profilo di questo cliente su questo dispositivo, con la data di oggi; il cliente decide se attivarla subito. '}L'app del cliente la legge da sola (serie, recuperi, timer, alternative) e lo avvisa: sceglie lui se attivarla subito o continuare con la scheda attuale. Ogni invio resta nello storico.</p></div>` : ''}
        ${can ? `<div class="card"><h2>Account</h2>${acctExtra(p)}<div class="row wrap"><button class="sm" data-act="clientReset" data-id="${esc(uidOf(p))}">Reimposta password</button><button class="sm" data-act="clientActive" data-id="${esc(uidOf(p))}">${acct.active ? 'Disattiva accesso' : 'Riattiva accesso'}</button>${role === 'head' || role === 'admin' ? `<button class="sm danger" data-act="clientDelete" data-id="${esc(uidOf(p))}">Elimina account e dati</button>` : ''}</div></div>` : ''}`;
    };
    views.newClient = function () {
      const role = (ui.sub && ui.sub.role) || 'client', isC = role === 'client', back = (ui.sub && ui.sub.back) || 'clients';
      return `<div class="row"><button class="ghost" data-act="clientBack">← Indietro</button></div><h1>${isC ? 'Nuovo cliente' : 'Nuovo allenatore'}</h1>
        <form class="card" id="newClientForm" autocomplete="off"><input type="hidden" name="role" value="${role}"><label for="nc_n">Nome</label><input id="nc_n" name="name" required><label for="nc_s">Cognome</label><input id="nc_s" name="surname" required>
        ${isC ? `<label for="nc_b">Data di nascita</label><input id="nc_b" name="birth" type="date" required max="${F.todayISO()}">` : ''}
        <label for="nc_p">Password iniziale (min. 8 caratteri)</label><input id="nc_p" name="password" minlength="8" required autocomplete="off"><p class="mute small" style="margin:4px 0 0">Al primo accesso la persona sceglierà la propria password, che nessuno può leggere. Potrai reimpostarla se la dimentica.</p>
        ${isC ? `<h3>Consenso</h3><label class="row" style="gap:8px"><input type="checkbox" name="consentOk" style="width:auto"> <span class="small">Ho raccolto il consenso firmato al trattamento dei dati (anche di salute).</span></label>
        <div class="mute small" style="margin-top:6px">Se la persona è minorenne compila anche i dati del genitore o tutore:</div>
        <input name="guardian" placeholder="Nome e cognome del genitore/tutore"><input name="guardianContact" placeholder="Telefono o email del genitore/tutore">
        <label class="row" style="gap:8px"><input type="checkbox" name="guardianOk" style="width:auto"> <span class="small">Il genitore/tutore ha firmato il consenso.</span></label>`
        : `<label class="row" style="gap:8px;margin-top:8px"><input type="checkbox" name="canSeeAll" style="width:auto"> <span class="small">Può vedere i clienti di tutta la palestra (altrimenti solo i suoi)</span></label>`}
        <button class="primary" style="margin-top:12px;width:100%">Crea account</button></form>`;
    };
    acts.clientOpen = t => { ui.sub = { type: 'client', uid: t.dataset.id }; const p = find(t.dataset.id); if (A.enabled && p && p._acct) A.logAccess(p._uid, 'view_client'); c.render(); window.scrollTo(0, 0); };
    acts.clientBack = () => { const b = ui.sub && ui.sub.back; ui.sub = null; ui.tab = b || 'clients'; c.render(); };
    acts.clientNew = () => { ui.sub = { type: 'newClient', role: 'client', back: 'clients' }; c.render(); window.scrollTo(0, 0); };
    acts.clientsReload = async () => { ui.clLoaded = false; ui.clBusy = false; await loadClients(); c.render(); toast('Elenco aggiornato'); };
    acts.bkUpdate = async () => { const all = X.clients(); if (!all.length) return; try { await exportXlsx(all, 'BACKUP_TLZ_v' + F.VERSION.version + '_' + (A.enabled ? 'tutti' : 'profili')); localStorage.setItem('tlz.bkver', F.VERSION.version + '.' + F.VERSION.build); c.render(); } catch (e) { toast('Backup non riuscito: ' + e.message); } };
    acts.xlsxAll = () => exportXlsx(X.clients(), (A.enabled ? 'TLZ_clienti' : 'Profili'));
    acts.csvAll = () => exportCsv(X.clients(), (A.enabled ? 'TLZ_clienti' : 'Profili'));
    acts.xlsxClient = t => { const p = find(t.dataset.id); if (p) exportXlsx([p], F.safeName(p.name)); };
    acts.csvClient = t => { const p = find(t.dataset.id); if (p) exportCsv([p], F.safeName(p.name)); };
    acts.clientReset = async t => { const pw = prompt('Nuova password temporanea (almeno 8 caratteri). Il cliente dovrà sceglierne una sua al prossimo accesso:'); if (!pw) return; try { await A.resetPassword(t.dataset.id, pw); toast('Password reimpostata'); } catch (e) { toast('Non riuscito: ' + e.message); } };
    acts.clientActive = async t => { const p = find(t.dataset.id); try { await A.setActive(t.dataset.id, !p._acct.active); await loadClients(); c.render(); } catch (e) { toast('Non riuscito: ' + e.message); } };
    acts.clientDelete = async t => { const p = find(t.dataset.id); if (!confirm(`Eliminare l'account di ${p.name} e TUTTI i suoi dati? Non si può annullare.`) || !confirm('Ultima conferma: scarica prima l\'Excel se ti serve una copia. Eliminare davvero?')) return; try { await A.deleteUser(t.dataset.id); ui.sub = null; await loadClients(); c.render(); toast('Account eliminato'); } catch (e) { toast('Non riuscito: ' + e.message); } };
    acts.consentOk = async () => {
      if (!document.getElementById('cs_ok').checked) return toast('Spunta la casella per continuare');
      try { for (const kind of ['privacy', 'dati_salute', 'termini']) await F.Account._rest('consents', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: A.me.id, kind, version: F.CONSENT_VERSION, is_minor: false }) }); await c.onSignIn(); } catch (e) { toast('Non riuscito: ' + e.message); }
    };

    /* ---------- palestre, team, account (amministratore e allenatore principale) ---------- */
    async function loadAdmin() { try { ui.gyms = await A.listGyms(); ui.accts = await A.listAccounts(); ui.admErr = null; } catch (e) { ui.admErr = e.message; } ui.admLoaded = true; }
    X.ensureAdmin = function () { if (A.enabled && !ui.admLoaded && !ui.admBusy) { ui.admBusy = true; loadAdmin().then(() => { ui.admBusy = false; c.render(); }); } };
    const rl = r => esc(A.roles[r] || r);
    const reload = async () => { ui.admLoaded = false; ui.admBusy = false; await loadAdmin(); c.render(); };
    function acctRow(a) {
      const me = A.me && A.me.id === a.id, mgr = !me && (A.me.role === 'admin' || (A.me.role === 'head' && a.role !== 'head') || (A.me.role === 'coach' && a.role === 'client' && a.coach_id === A.me.id));
      return `<div style="border-top:1px solid var(--line);padding:8px 0"><div><b>${esc(a.full_name)}</b> <span class="mute small">${esc(a.username)}</span></div><div style="margin-top:4px"><span class="chip">${rl(a.role)}</span> ${a.active ? '' : '<span class="chip warn">disattivato</span> '}${a.must_change_password ? '<span class="chip">password da scegliere</span>' : ''}</div>
        ${mgr ? `<div class="row wrap" style="margin-top:6px"><button class="sm" data-act="acctReset" data-id="${a.id}">Reimposta password</button><button class="sm" data-act="acctActive" data-id="${a.id}" data-on="${a.active ? 0 : 1}">${a.active ? 'Disattiva' : 'Riattiva'}</button>${a.role === 'coach' && A.me.role !== 'coach' ? `<label class="small row" style="gap:4px;margin:0"><input type="checkbox" style="width:auto" data-perm="${a.id}" ${a.can_see_all ? 'checked' : ''}> vede tutti i clienti</label>` : ''}${A.me.role !== 'coach' && a.role !== 'client' ? `<button class="sm danger" data-act="acctDelete" data-id="${a.id}">Elimina</button>` : ''}</div>` : ''}</div>`;
    }
    const gymStats = g => { const l = (ui.accts || []).filter(a => a.gym_id === g.id); return { heads: l.filter(a => a.role === 'head'), coaches: l.filter(a => a.role === 'coach').length, clients: l.filter(a => a.role === 'client').length, list: l }; };
    views.gyms = function () {
      X.ensureAdmin(); X.ensureClients();
      return `<h1>Palestre</h1>${ui.admErr ? `<div class="msg danger small">${esc(ui.admErr)}</div>` : ''}
        <div class="card"><div class="row wrap"><button class="sm primary" data-act="gymNew">+ Nuova palestra</button><button class="sm" data-act="gymReload">Aggiorna</button><button class="sm" data-act="xlsxAll">Excel di tutti</button><button class="sm" data-act="csvAll">CSV di tutti</button></div>
        <p class="mute small" style="margin-bottom:0">Crei la palestra insieme al suo allenatore principale. Poi è lui a creare allenatori e clienti.</p></div>
        ${!ui.admLoaded ? '<p class="mute">Caricamento…</p>' : ''}
        ${(ui.gyms || []).map(g => { const k = gymStats(g); return `<div class="card"><div class="row" style="gap:8px"><div class="grow"><b>${esc(g.name)}</b>${g.active ? '' : ' <span class="chip warn">disattivata</span>'}<div class="mute small">Principale: ${k.heads.map(h => esc(h.full_name)).join(', ') || '–'} · ${k.coaches} allenator${k.coaches === 1 ? 'e' : 'i'} · ${k.clients} client${k.clients === 1 ? 'e' : 'i'}</div></div><button class="sm primary" data-act="gymOpen" data-id="${g.id}">Apri</button></div></div>`; }).join('') || (ui.admLoaded ? '<p class="mute">Nessuna palestra.</p>' : '')}`;
    };
    views.gym = function () {
      X.ensureAdmin(); X.ensureClients(); const g = (ui.gyms || []).find(x => x.id === ui.sub.id); if (!g) return `<div class="row"><button class="ghost" data-act="gymBack">← Palestre</button></div><p class="mute">Caricamento…</p>`;
      const k = gymStats(g), ord = { head: 0, coach: 1, client: 2 };
      return `<div class="row"><button class="ghost" data-act="gymBack">← Palestre</button></div><h1>${esc(g.name)}</h1>
        <div class="card"><div class="row wrap"><button class="sm" data-act="gymActive" data-id="${g.id}" data-on="${g.active ? 0 : 1}">${g.active ? 'Disattiva palestra' : 'Riattiva palestra'}</button><button class="sm primary" data-act="xlsxGym" data-id="${g.id}">Excel della palestra</button><button class="sm" data-act="csvGym" data-id="${g.id}">CSV</button></div>
        <p class="mute small" style="margin-bottom:0">Disattivando la palestra nessuno dei suoi account può più entrare. I dati restano e li riattivi quando vuoi.</p></div>
        <div class="card"><h2>Account (${k.list.length})</h2>${k.list.slice().sort((a, b) => ord[a.role] - ord[b.role] || a.full_name.localeCompare(b.full_name)).map(acctRow).join('') || '<p class="mute small">Nessun account.</p>'}</div>`;
    };
    views.newGym = function () {
      return `<div class="row"><button class="ghost" data-act="gymBack">← Palestre</button></div><h1>Nuova palestra</h1>
        <form class="card" id="newGymForm" autocomplete="off"><label for="ng_g">Nome della palestra</label><input id="ng_g" name="gym" required>
        <h3>Allenatore principale</h3><label for="ng_n">Nome</label><input id="ng_n" name="name" required><label for="ng_s">Cognome</label><input id="ng_s" name="surname" required>
        <label for="ng_p">Password iniziale (min. 8 caratteri)</label><input id="ng_p" name="password" minlength="8" required autocomplete="off"><p class="mute small" style="margin:4px 0 0">Al primo accesso sceglierà la sua password.</p>
        <button class="primary" style="margin-top:12px;width:100%">Crea palestra e accesso</button></form>`;
    };
    views.team = function () {
      X.ensureAdmin(); const coaches = (ui.accts || []).filter(a => a.role === 'coach');
      return `<h1>Team${A.gym ? ' · ' + esc(A.gym.name) : ''}</h1>${ui.admErr ? `<div class="msg danger small">${esc(ui.admErr)}</div>` : ''}
        <div class="card"><button class="sm primary" data-act="coachNew">+ Nuovo allenatore</button><p class="mute small" style="margin-bottom:0">Gli allenatori possono creare clienti e gestire i loro dati. Con "vede tutti i clienti" vedono quelli di tutta la palestra.</p></div>
        <div class="card"><h2>Allenatori (${coaches.length})</h2>${!ui.admLoaded ? '<p class="mute small">Caricamento…</p>' : ''}${coaches.map(acctRow).join('') || (ui.admLoaded ? '<p class="mute small">Ancora nessun allenatore oltre a te.</p>' : '')}</div>`;
    };
    function acctExtra(p) {
      const a = p._acct; if (!a) return '';
      X.ensureAdmin(); const r = A.me.role; let h = '';
      if (r !== 'coach') { const cs = (ui.accts || []).filter(x => x.gym_id === a.gym_id && (x.role === 'coach' || x.role === 'head') && x.active); if (cs.length) h += `<label for="asg">Allenatore assegnato</label><select id="asg" data-asg="${esc(p._uid)}">${cs.map(x => `<option value="${x.id}" ${x.id === a.coach_id ? 'selected' : ''}>${esc(x.full_name)}</option>`).join('')}</select>`; }
      if (r === 'admin') h += `<div class="msg small" style="margin:8px 0">Ripristino dati su richiesta della palestra: serve il blocco di sicurezza sbloccato (Profilo → Console).</div><label class="btn sm" style="margin:0 0 8px;display:inline-flex">Ripristina da file .json<input type="file" id="rstFile" data-id="${esc(p._uid)}" accept=".json" hidden></label>`;
      return h;
    }
    acts.gymNew = () => { ui.sub = { type: 'newGym' }; c.render(); window.scrollTo(0, 0); };
    acts.gymBack = () => { ui.sub = null; ui.tab = 'gyms'; c.render(); };
    acts.gymOpen = t => { ui.sub = { type: 'gym', id: t.dataset.id }; c.render(); window.scrollTo(0, 0); };
    acts.gymReload = reload;
    acts.gymActive = async t => { const on = t.dataset.on === '1'; if (!on && !confirm('Disattivare la palestra? Nessuno dei suoi account potrà entrare finché non la riattivi.')) return; try { await A.setGymActive(t.dataset.id, on); await reload(); } catch (e) { toast('Non riuscito: ' + e.message); } };
    acts.coachNew = () => { ui.sub = { type: 'newClient', role: 'coach', back: 'team' }; c.render(); window.scrollTo(0, 0); };
    acts.acctReset = async t => { const pw = prompt('Nuova password temporanea (almeno 8 caratteri). La persona ne sceglierà una sua al prossimo accesso:'); if (!pw) return; try { await A.resetPassword(t.dataset.id, pw); toast('Password reimpostata'); await reload(); } catch (e) { toast('Non riuscito: ' + e.message); } };
    acts.acctActive = async t => { try { await A.setActive(t.dataset.id, t.dataset.on === '1'); await reload(); } catch (e) { toast('Non riuscito: ' + e.message); } };
    acts.acctDelete = async t => { const a = (ui.accts || []).find(x => x.id === t.dataset.id); if (!confirm(`Eliminare l'account di ${a ? a.full_name : ''} e i dati collegati? Non si può annullare.`) || !confirm('Ultima conferma: eliminare davvero?')) return; try { await A.deleteUser(t.dataset.id); await reload(); toast('Account eliminato'); } catch (e) { toast('Non riuscito: ' + e.message); } };
    const gymProfiles = id => X.clients().filter(p => p._acct && p._acct.gym_id === id), gymName = id => ((ui.gyms || []).find(g => g.id === id) || {}).name || 'palestra';
    acts.xlsxGym = t => exportXlsx(gymProfiles(t.dataset.id), 'TLZ_' + F.safeName(gymName(t.dataset.id)));
    acts.csvGym = t => exportCsv(gymProfiles(t.dataset.id), 'TLZ_' + F.safeName(gymName(t.dataset.id)));

    /* ---------- verifica a due passaggi dell'amministratore ---------- */
    async function startMfa() { try { const f = await A.mfaFactor(); if (f) ui.mfa = { id: f.id }; else { const e = await A.mfaEnroll(); ui.mfa = { id: e.id, enroll: true, qr: e.totp.qr_code, secret: e.totp.secret }; } } catch (e) { ui.mfa = { err: e.message }; } c.render(); }
    views.mfa = function () {
      const m = ui.mfa; if (!m) { ui.mfa = { busy: true }; startMfa(); return '<p class="mute" style="padding:20px">Caricamento…</p>'; }
      if (m.busy) return '<p class="mute" style="padding:20px">Caricamento…</p>';
      if (m.err && !m.id) return `<div class="msg danger" style="margin:16px">${esc(m.err)}</div><button class="ghost" data-act="logout">Esci</button>`;
      return `<div class="card hero"><h1>Verifica a due passaggi</h1><p>${m.enroll ? 'Prima volta: scansiona il codice con Google Authenticator, Microsoft Authenticator o simili, poi scrivi il codice a 6 cifre.' : "Scrivi il codice a 6 cifre dell'app di verifica."}</p></div>
        <form class="card" id="mfaForm">${m.enroll ? `<img src="${esc(m.qr)}" alt="Codice QR" width="180" height="180" style="background:#fff;padding:8px;border-radius:8px"><p class="small mute">Se non riesci a scansionare, inserisci a mano: <code>${esc(m.secret)}</code></p>` : ''}
        <label for="mf_c">Codice</label><input id="mf_c" name="code" inputmode="numeric" autocomplete="one-time-code" required>
        ${m.err ? `<div class="msg danger small" style="margin-top:8px">${esc(m.err)}</div>` : ''}<button class="primary" style="margin-top:12px;width:100%">Conferma</button><button type="button" class="ghost" style="margin-top:8px" data-act="logout">Esci</button></form>`;
    };

    /* ---------- blocco di sicurezza in scrittura (solo amministratore) ---------- */
    X.lockCard = function () {
      if (!(A.enabled && A.isAdmin())) return '';
      const l = ui.lock; if (!l && !ui.lockBusy) { ui.lockBusy = true; A.lockState().then(v => { ui.lock = v; ui.lockBusy = false; c.render(); }).catch(() => { ui.lock = { open: false }; ui.lockBusy = false; }); }
      const open = !!(l && l.open);
      return `<div class="card" style="${open ? 'border-color:var(--warn)' : ''}"><h2>Blocco in scrittura</h2><p class="small">${open ? '<span class="chip warn">sbloccato</span> puoi modificare i dati degli utenti.' : '<span class="chip ok">attivo</span> leggi tutto ma non puoi modificare i dati degli utenti.'}</p>
        <button class="sm ${open ? 'primary' : ''}" data-act="lockToggle">${open ? 'Blocca' : 'Sblocca'}</button>
        <p class="mute small" style="margin-bottom:0">Lo gestisci solo tu, con un click, quando vuoi. Ogni cambio è nel registro accessi.</p></div>`;
    };
    acts.lockToggle = async () => { const open = !(ui.lock && ui.lock.open); try { await A.setLock(open); ui.lock = await A.lockState(); c.render(); toast(open ? 'Sbloccato' : 'Bloccato'); } catch (e) { toast('Non riuscito: ' + e.message); } };

    /* ---------- area sviluppatore ---------- */
    views.dev = function () {
      if (!devMode()) return '<p class="mute">Area non disponibile.</p>';
      const dev = ui.dev = ui.dev || {}, st = S(), size = (() => { try { return Math.round(JSON.stringify(st).length / 1024); } catch (e) { return 0; } })();
      if (A.enabled && !dev.loaded && !dev.busy) { dev.busy = true; Promise.all([A.listAccounts().catch(() => []), A.audit(60).catch(() => []), A.config().catch(() => [])]).then(([a, l, k]) => { dev.accounts = a; dev.log = l; dev.cfg = k; dev.loaded = true; dev.busy = false; c.render(); }); }
      const rows = (dev.accounts || []);
      return `<div class="row"><button class="ghost" data-act="devBack">← Profilo</button></div><h1>Area sviluppatore</h1>
        <div class="card"><h2>Stato</h2><table class="sets" style="text-align:left"><tbody>
          <tr><td style="text-align:left">Versione</td><td>${esc(F.VERSION.version)} (build ${F.VERSION.build})</td></tr>
          <tr><td style="text-align:left">Modalità</td><td>${A.enabled ? 'con server' : 'solo dispositivo'}</td></tr>
          <tr><td style="text-align:left">Ruolo</td><td>${A.me ? esc(A.roles[A.me.role]) : 'locale'}</td></tr>
          <tr><td style="text-align:left">Profili/clienti</td><td>${A.enabled ? (ui.cl || []).length : st.profiles.length}</td></tr>
          <tr><td style="text-align:left">Dati locali</td><td>${size} KB</td></tr>
          <tr><td style="text-align:left">Ultimo backup</td><td>${st.settings.backup && st.settings.backup.lastAt ? esc(st.settings.backup.lastAt.slice(0, 10)) : '–'}</td></tr></tbody></table>
          <div class="row wrap" style="margin-top:10px"><button class="sm" data-act="devDiag">Copia diagnostica</button><button class="sm" data-act="devExportAll">Esporta tutto (Excel)</button><button class="sm" data-act="checkUpdate">Controlla aggiornamenti</button>${A.enabled ? '<button class="sm" data-act="devReload">Ricarica dal server</button>' : ''}</div>
          <p class="mute small">La diagnostica non contiene dati personali: solo versione, contatori e browser.</p></div>
        ${X.lockCard()}
        ${A.enabled ? `<div class="card"><h2>Account (${rows.length})</h2>${dev.busy ? '<p class="mute small">Caricamento…</p>' : ''}${rows.map(a => `<div class="row small" style="border-top:1px solid var(--line);padding:5px 0"><span class="grow"><b>${esc(a.full_name)}</b> <span class="mute">${esc(a.username)}</span></span><span class="chip">${esc(A.roles[a.role] || a.role)}</span>${a.active ? '' : ' <span class="chip warn">off</span>'}</div>`).join('')}</div>
        <div class="card"><h2>Registro accessi</h2>${(dev.log || []).map(l => `<div class="small" style="border-top:1px solid var(--line);padding:4px 0"><span class="mute">${esc(String(l.at).slice(0, 16).replace('T', ' '))}</span> ${esc(l.action)}${l.detail && l.detail.username ? ' · ' + esc(l.detail.username) : ''}</div>`).join('') || '<p class="mute small">Vuoto.</p>'}</div>
        <div class="card"><h2>Impostazioni remote</h2><p class="mute small" style="margin-top:0">Valori letti da tutti gli utenti (es. messaggio di manutenzione) senza pubblicare una nuova versione.</p>
          ${(dev.cfg || []).map(k => `<div class="small" style="padding:3px 0"><b>${esc(k.key)}</b>: ${esc(JSON.stringify(k.value))}</div>`).join('')}
          <div class="row" style="margin-top:6px"><input id="cfgK" placeholder="chiave" style="width:35%"><input id="cfgV" placeholder='valore JSON, es. "testo"' class="grow"><button class="sm" data-act="devCfg">Salva</button></div></div>` : `<div class="card"><h2>Server</h2><p class="small">Nessun server collegato: l'app lavora solo sul dispositivo. Per attivarlo segui <code>server/supabase/README.md</code> e inserisci indirizzo e chiave pubblica in <code>gym-config.json</code>.</p></div>`}`;
    };
    acts.devBack = () => { ui.sub = null; ui.tab = 'me'; c.render(); };
    acts.devReload = () => { ui.dev = {}; c.render(); };
    acts.devDiag = async () => { const st = S(), txt = JSON.stringify({ app: F.VERSION, server: A.enabled, role: A.me && A.me.role, profiles: st.profiles.length, sessions: st.profiles.reduce((a, p) => a + (p.sessions || []).length, 0), ua: navigator.userAgent, at: new Date().toISOString() }, null, 1); try { await navigator.clipboard.writeText(txt); toast('Diagnostica copiata'); } catch (e) { toast('Copia non riuscita'); } };
    acts.devExportAll = () => exportXlsx(X.clients(), 'Tutti_i_dati');
    acts.devCfg = async () => { const k = $v('cfgK'), v = $v('cfgV'); if (!k) return; let val; try { val = JSON.parse(v); } catch (e) { val = v; } try { await A.setConfig(k, val); ui.dev = {}; c.render(); toast('Salvato'); } catch (e) { toast('Non riuscito: ' + e.message); } };
    const $v = id => (document.getElementById(id) || {}).value || '';

    /* ---------- profilo: interruttori della modalità locale ---------- */
    X.advancedCard = function () {
      const st = S();
      if (A.enabled) return `<div class="card"><h2>Account</h2><p class="small">Connesso come <b>${esc(A.me.full_name)}</b> (${esc(A.roles[A.me.role])}).</p>
        <div class="row wrap"><button class="sm" data-act="pwChange">Cambia password</button>${devMode() ? '<button class="sm" data-act="devOpen">Area sviluppatore</button>' : ''}<button class="sm" data-act="logout">Esci</button></div></div>`;
      return `<div class="card"><details ${ui.advOpen ? 'open' : ''}><summary style="cursor:pointer"><b>Strumenti avanzati</b></summary>
        <label class="row" style="gap:8px;margin-top:8px"><input type="checkbox" data-adv="staffMode" style="width:auto" ${st.settings.staffMode ? 'checked' : ''}> <span class="small">Area allenatore: elenco dei profili di questo dispositivo con Excel/CSV di tutti</span></label>
        <label class="row" style="gap:8px"><input type="checkbox" data-adv="devMode" style="width:auto" ${st.settings.devMode ? 'checked' : ''}> <span class="small">Area sviluppatore: diagnostica e strumenti</span></label>
        ${devMode() ? '<button class="sm" style="margin-top:6px" data-act="devOpen">Apri area sviluppatore</button>' : ''}</details></div>`;
    };
    acts.devOpen = () => { ui.sub = { type: 'dev' }; c.render(); window.scrollTo(0, 0); };
    acts.pwChange = async () => { const a = prompt('Nuova password (almeno 8 caratteri):'); if (!a) return; try { await A.changePassword(a); toast('Password aggiornata'); } catch (e) { toast(e.message); } };
    X.onChange = function (t) {
      if (t.dataset.perm) { A.setPerms(t.dataset.perm, t.checked).then(() => toast('Permesso aggiornato')).catch(e => { toast('Non riuscito: ' + e.message); reload(); }); return true; }
      if (t.dataset.asg) { A.assignCoach(t.dataset.asg, t.value).then(async () => { toast('Cliente assegnato'); await loadClients(); await reload(); }).catch(e => toast('Non riuscito: ' + e.message)); return true; }
      if (t.id === 'rstFile' && t.files[0]) { const f = t.files[0], id = t.dataset.id; t.value = ''; f.text().then(async tx => { let d; try { d = JSON.parse(tx.replace(/^\ufeff/, '')); d = d.profile || d; } catch (e) { return toast('File non valido'); } const why = prompt('Motivo del ripristino (resta nel registro accessi):'); if (!why) return; try { await A.restoreData(id, d, why); toast('Dati ripristinati'); await loadClients(); c.render(); } catch (e) { toast('Non riuscito: ' + e.message); } }); return true; }
      if (t.id === 'imp_file' && t.files[0]) { const f = t.files[0]; t.value = ''; toast('Leggo il file…'); F.fileToPlanText(f).then(tx => { const r = F.parseScheda(tx); r.days = r.days.filter(d => d.exercises.length); if (!r.days.length || !r.days.some(d => d.exercises.length)) return toast('Non trovo esercizi nel file: controlla che ci siano colonne esercizio, serie e ripetizioni'); ui.sub.state = { parsed: r, title: f.name.replace(/\.[^.]+$/, '') }; c.render(); window.scrollTo(0, 0); }).catch(e => toast('Lettura non riuscita: ' + e.message)); return true; }
      if (t.dataset.adv) { ui.advOpen = true; S().settings[t.dataset.adv] = t.checked; c.save(); c.render(); return true; }
      if (t.id === 'impTab' && t.files[0]) { importFile(t.files[0], [P()], P().name); t.value = ''; return true; }
      if (t.id === 'impTabAll' && t.files[0]) { importFile(t.files[0], X.clients(), null); t.value = ''; return true; }
      return false;
    };
    X.onInput = function (t) { if (t.id === 'clQ') { ui.clQ = t.value; const pos = t.selectionStart; c.render(); const n = document.getElementById('clQ'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } return true; } return false; };
    Object.assign(X.views, { newClient: views.newClient });
    return X;
  };
})(window.FORMA);
