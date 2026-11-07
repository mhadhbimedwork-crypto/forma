/* THE LIFTING ZONE – account e sincronizzazione con il server (Supabase via REST, senza librerie).
   Attivo solo se la versione palestra ha un server configurato (window.FORMA_GYM.server). Senza server l'app funziona come prima, solo sul dispositivo. */
(function (F) {
  'use strict';
  const cfg = (window.FORMA_GYM && window.FORMA_GYM.server) || (window.FORMA_SERVER && window.FORMA_SERVER.server) || null;
  const KEY = 'tlz.acct', ROLES = { client: 'Cliente', coach: 'Allenatore', head: 'Allenatore principale', admin: 'Amministratore' };
  F.ROLE_LABEL = ROLES;
  const A = F.Account = { enabled: !!(cfg && cfg.url && cfg.anonKey), roles: ROLES, me: null };
  const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const domain = () => (cfg && cfg.loginDomain) || 'login.tlz.app';
  A.emailOf = (name, surname) => `${slug(name)}.${slug(surname)}@${domain()}`;
  A.staff = () => !!(A.me && ['coach', 'head', 'admin'].includes(A.me.role));
  A.isAdmin = () => !!(A.me && A.me.role === 'admin');
  A.isDev = A.isAdmin; A.isHead = () => !!(A.me && A.me.role === 'head');
  A.mode = (window.FORMA_GYM && window.FORMA_GYM.mode) || 'app';   // 'admin' = console amministratore (indirizzo separato)

  let tok = null; try { tok = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { }
  /* Accesso rapido dell'amministratore a un altro profilo: la sessione del profilo aperto vive solo in questa scheda (sessionStorage),
     la sessione dell'amministratore resta dov'è, così "Torna amministratore" non chiede password. */
  const IMP = 'tlz.imp'; let imp = null; try { imp = JSON.parse(sessionStorage.getItem(IMP) || 'null'); } catch (e) { }
  if (imp && imp.tok) tok = imp.tok; else imp = null;
  const store = () => { if (imp) { try { imp.tok = tok; sessionStorage.setItem(IMP, JSON.stringify(imp)); } catch (e) { } return; } try { tok ? localStorage.setItem(KEY, JSON.stringify(tok)) : localStorage.removeItem(KEY); } catch (e) { } };
  A.imp = () => imp ? { write: !!imp.write, name: imp.name, uid: imp.uid, own: !!imp.own, from: imp.from || null } : null;
  async function raw(path, o) {
    let r; try { r = await fetch(cfg.url + path, o); } catch (e) { const er = new Error('Sei offline o la rete non risponde: questa azione richiede la connessione'); er.offline = true; throw er; }
    let b = null; try { b = await r.json(); } catch (e) { }
    if (!r.ok) { const m = (b && (b.error_description || b.msg || b.message || b.error)) || ('errore ' + r.status); const err = new Error(String(m)); err.status = r.status; throw err; } return b;
  }
  const hdr = (extra) => Object.assign({ apikey: cfg.anonKey, 'Content-Type': 'application/json', Authorization: 'Bearer ' + (tok ? tok.access_token : cfg.anonKey) }, extra || {});
  async function refresh() {
    if (!tok || !tok.refresh_token) throw new Error('sessione scaduta');
    const b = await raw('/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: tok.refresh_token }) });
    tok = { access_token: b.access_token, refresh_token: b.refresh_token, user: b.user, at: Date.now() }; store();
  }
  async function api(path, o) {
    o = o || {};
    if (imp && !imp.write && o.method && o.method !== 'GET') throw new Error('Sola visione: per modificare togli il lucchetto dalla console');
    try { return await raw(path, Object.assign({}, o, { headers: hdr(o.headers) })); }
    catch (e) { if (e.status === 401 && tok) { await refresh(); return raw(path, Object.assign({}, o, { headers: hdr(o.headers) })); } throw e; }
  }
  const rest = (p, o) => api('/rest/v1/' + p, o);
  A._rest = rest;

  async function loadMe() {
    const rows = await rest('profiles?id=eq.' + tok.user.id + '&select=id,username,full_name,role,birth,active,must_change_password,gym_id,can_see_all,rm_enabled');
    if (!rows.length || !rows[0].active) { tok = null; store(); throw new Error('account non attivo'); }
    if (A.mode === 'admin' && rows[0].role !== 'admin') { tok = null; store(); throw new Error('Accesso non consentito da questo indirizzo'); }
    A.me = rows[0]; A.gym = null;
    if (A.me.gym_id) { try { A.gym = (await rest('gyms?id=eq.' + A.me.gym_id + '&select=id,name,active'))[0] || null; } catch (e) { } }
    A.needMfa = A.me.role === 'admin' && A.aal() !== 'aal2'; A.offlineBoot = false; cacheMe();
    return A.me;
  }
  /** Ripristina una sessione già aperta (all'avvio). */
  const meKey = 'forgia.mecache';
  const cacheMe = () => { try { localStorage.setItem(meKey, JSON.stringify({ uid: A.me.id, me: A.me, gym: A.gym })); } catch (e) { } };
  A.restore = async function () {
    if (!A.enabled || !tok) return null;
    for (let k = 0; k < 4; k++) {
      try { return await loadMe(); }
      catch (e) {
        if (e.status === 401 || e.status === 400 && /refresh/i.test(e.message) || /scaduta|attivo/.test(e.message)) { tok = null; store(); return null; }
        if (e.offline && (navigator.onLine === false || k === 3)) {   // senza rete si apre con l'ultimo profilo noto: si lavora in locale
          try { const c = JSON.parse(localStorage.getItem(meKey) || 'null'); if (c && tok.user && c.uid === tok.user.id && c.me && c.me.active) { A.me = c.me; A.gym = c.gym || null; A.needMfa = A.me.role === 'admin' && A.aal() !== 'aal2'; A.offlineBoot = true; return A.me; } } catch (e2) { }
          return null;
        }
        if (e.status) return null; await new Promise(r => setTimeout(r, 1500));
      }
    }
    return null;
  };
  A.signIn = async function (name, surname, password) {
    const b = await raw('/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: A.emailOf(name, surname), password }) }).catch(e => { throw new Error(e.status === 400 ? 'Nome, cognome o password non corretti' : e.message); });
    tok = { access_token: b.access_token, refresh_token: b.refresh_token, user: b.user, at: Date.now() }; store(); return loadMe();
  };
  /* ---- verifica a due passaggi (TOTP) per l'amministratore ---- */
  A.aal = () => { try { return JSON.parse(atob(tok.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).aal || 'aal1'; } catch (e) { return 'aal1'; } };
  A.mfaFactor = async () => { const u = await api('/auth/v1/user'); return (u.factors || []).find(f => f.factor_type === 'totp' && f.status === 'verified') || null; };
  A.mfaEnroll = () => api('/auth/v1/factors', { method: 'POST', body: JSON.stringify({ factor_type: 'totp', friendly_name: 'Console ' + Date.now().toString(36) }) });
  A.mfaVerify = async function (factorId, code) {
    const ch = await api('/auth/v1/factors/' + factorId + '/challenge', { method: 'POST', body: '{}' });
    const b = await api('/auth/v1/factors/' + factorId + '/verify', { method: 'POST', body: JSON.stringify({ challenge_id: ch.id, code: String(code).replace(/\s/g, '') }) }).catch(e => { throw new Error('Codice non valido'); });
    tok = { access_token: b.access_token, refresh_token: b.refresh_token, user: b.user || tok.user, at: Date.now() }; store(); A.needMfa = false; return true;
  };
  /* ---- profili collegati su questo dispositivo (es. amministratore + atleta): si passa dall'uno all'altro senza uscire.
     Il token dell'amministratore non viene mai conservato: per tornare amministratore servono password e verifica a due passaggi. ---- */
  const LK = 'tlz.acct.links';
  const lkGet = () => { try { return JSON.parse(localStorage.getItem(LK) || '[]'); } catch (e) { return []; } };
  const lkSet = v => { try { localStorage.setItem(LK, JSON.stringify(v)); } catch (e) { } };
  const lkPut = (id, name, role, t) => { const l = lkGet().filter(x => x.id !== id); l.push({ id, name, role, tok: role === 'admin' ? null : (t || null) }); lkSet(l); };
  A.links = () => lkGet().filter(l => !A.me || l.id !== A.me.id);
  A.stashCurrent = () => { if (A.me && tok && !imp) lkPut(A.me.id, A.me.full_name, A.me.role, tok); };
  A.linkAccount = async function (name, surname, password) {
    if (!A.me) throw new Error('Entra prima');
    const b = await raw('/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: A.emailOf(name, surname), password }) });
    const t = { access_token: b.access_token, refresh_token: b.refresh_token, user: b.user, at: Date.now() }, prev = tok; let row;
    tok = t; try { row = (await rest('profiles?id=eq.' + t.user.id + '&select=id,full_name,role,active,must_change_password'))[0]; } finally { tok = prev; }
    if (!row || !row.active) throw new Error('Account non attivo');
    if (row.id === A.me.id) throw new Error('È l\'account con cui sei già dentro');
    if (row.must_change_password) throw new Error('Entra prima con questo account per scegliere la sua password personale');
    A.stashCurrent(); lkPut(row.id, row.full_name, row.role, t); return row;
  };
  A.unlink = id => lkSet(lkGet().filter(x => x.id !== id));
  A.switchTo = async function (id) {
    const e = lkGet().find(x => x.id === id); if (!e) throw new Error('Profilo non trovato');
    if (!e.tok) return { needLogin: e };
    A.stashCurrent(); tok = e.tok; store(); A.me = null;
    try { await loadMe(); } catch (er) { tok = null; store(); throw new Error('Sessione scaduta: entra di nuovo con questo profilo'); }
    return { ok: true };
  };
  A.leave = function () { A.stashCurrent(); tok = null; A.me = null; store(); };   // lascia la sessione senza dimenticare il profilo (passaggio ad altro profilo)
  A.signOut = function () { try { if (A.me && F.kvDel) F.kvDel('cache.cl.' + A.me.id); localStorage.removeItem('forgia.mecache'); } catch (e) { } if (imp) { imp = null; try { sessionStorage.removeItem(IMP); } catch (e) { } } if (A.me) { const l = lkGet(); const e = l.find(x => x.id === A.me.id); if (e) { e.tok = null; lkSet(l); } } tok = null; A.me = null; store(); };
  /* ---- accessi rapidi (solo amministratore) ---- */
  A.listOwn = () => admin({ action: 'list_own' }).then(r => r.ids || []);
  A.createOwn = gymId => admin({ action: 'create_own', gym_id: gymId || undefined });
  A.setOwn = (uid, own) => admin({ action: 'set_own', user_id: uid, own: !!own });
  A.impersonate = async function (uid, name) {
    if (!(A.me && ['admin', 'head', 'coach'].includes(A.me.role)) || imp) throw new Error('Non disponibile');
    const r = await admin({ action: 'impersonate', user_id: uid });
    const b = await raw('/auth/v1/verify', { method: 'POST', headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'magiclink', token_hash: r.token_hash }) });
    const prev = tok, prevMe = A.me;
    imp = { tok: { access_token: b.access_token, refresh_token: b.refresh_token, user: b.user, at: Date.now() }, write: !!r.write, own: !!r.own, from: prevMe ? { role: prevMe.role, name: prevMe.full_name } : null, name: name || '', uid }; tok = imp.tok;
    try { sessionStorage.setItem(IMP, JSON.stringify(imp)); await loadMe(); }
    catch (e) { imp = null; tok = prev; A.me = prevMe; try { sessionStorage.removeItem(IMP); } catch (e2) { } throw e; }
    return { write: imp.write };
  };
  A.endImp = async function () {
    if (!imp) return;
    imp = null; try { sessionStorage.removeItem(IMP); } catch (e) { }
    try { tok = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { tok = null; }
    A.me = null; if (!tok) return null;
    try { return await loadMe(); } catch (e) { return null; }
  };
  A.changePassword = async function (pw) {
    if (String(pw).length < 8) throw new Error('La password deve avere almeno 8 caratteri');
    await api('/auth/v1/user', { method: 'PUT', body: JSON.stringify({ password: pw }) }); await rest('rpc/password_changed', { method: 'POST', body: '{}' }); if (A.me) A.me.must_change_password = false;
  };

  /* ---- dati del cliente: il dispositivo resta la fonte principale (funziona offline), il server tiene la copia ---- */
  A.pullMine = async function () { const r = await rest('client_data?user_id=eq.' + A.me.id + '&select=data,version,updated_at'); return r[0] || null; };
  /** Sul server va SOLO l'allenamento: mai dieta, alimenti, intolleranze, bozze o altro. Il resto resta sul dispositivo. */
  const SHARE = ['id', 'name', 'birth', 'sex', 'height', 'weight', 'goal', 'waist', 'bf', 'style', 'days', 'level', 'stopMonths', 'pain', 'painLog', 'painX', 'painDel', 'weights', 'measures', 'plans', 'sessions', 'activePlan', 'rm', 'symptoms', 'createdAt'];
  F.shareable = p => { const o = {}; SHARE.forEach(k => { if (p && p[k] !== undefined) o[k] = p[k]; }); return o; };
  A.pushMine = async function (profile, device) {
    profile = F.shareable(profile);
    return rest('client_data?on_conflict=user_id&select=version', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify({ user_id: A.me.id, data: profile, device: device || navigator.userAgent.slice(0, 80) }) });
  };
  /** Unione di due copie dello stesso profilo senza perdere nulla (sedute, dolori, peso, misure). */
  F.mergeProfiles = function (a, b) {
    const o = Object.assign({}, a), uniq = (x, y, key) => { const m = new Map(); x.concat(y).forEach(i => m.set(key(i), i)); return [...m.values()]; };
    o.sessions = uniq(a.sessions || [], (b && b.sessions) || [], s => s.id || s.date + '|' + s.dayName).sort((p, q) => p.date < q.date ? -1 : p.date > q.date ? 1 : (p.at || 0) - (q.at || 0));
    o.painLog = uniq(a.painLog || [], (b && b.painLog) || [], e => e.date + '|' + e.zone + '|' + e.level + '|' + (e.at || '')).sort((p, q) => p.date < q.date ? -1 : p.date > q.date ? 1 : (p.at || 0) - (q.at || 0));
    o.painDel = Array.from(new Set([].concat(a.painDel || [], (b && b.painDel) || []))).slice(-300);
    o.painX = uniq(a.painX || [], (b && b.painX) || [], e => [e.date, e.s, e.sd, e.l, e.at || ''].join('|')).sort((p, q) => p.date < q.date ? -1 : p.date > q.date ? 1 : (p.at || 0) - (q.at || 0));
    o.painX = o.painX.filter(e => !o.painDel.includes([e.date, e.s, e.sd, e.l, e.at || ''].join('|')));
    o.weights = uniq(a.weights || [], (b && b.weights) || [], w => w.date).sort((p, q) => p.date < q.date ? -1 : 1);
    o.measures = uniq(a.measures || [], (b && b.measures) || [], m => m.date).sort((p, q) => p.date < q.date ? -1 : 1);
    o.plans = uniq(a.plans || [], (b && b.plans) || [], x => x.id);
    const cur = {}; o.painLog.forEach(e => { cur[e.zone] = e.level; }); o.pain = Object.assign({}, a.pain || {});
    Object.keys(cur).forEach(z => { if (cur[z] > 0) o.pain[z] = cur[z]; else delete o.pain[z]; });
    if (o.painX.length && F.pxCur) { const zs = new Set(o.painX.filter(e => F.PX.by[e.s]).map(e => F.PX.by[e.s].zone)); const lv = {}; F.pxCur(o).forEach(e => { lv[e.zone] = Math.max(lv[e.zone] || 0, e.l); }); zs.forEach(z => { if (lv[z] > 0) o.pain[z] = lv[z]; else delete o.pain[z]; }); }
    return o;
  };

  /* ---- area staff ---- */
  A.listClients = async function () {
    const rows = await rest('client_data?select=user_id,updated_at,version,data,profile:profiles!client_data_user_id_fkey(id,username,full_name,role,birth,active,coach_id,gym_id,must_change_password,rm_enabled)');
    return rows.filter(r => r.profile && r.profile.role === 'client').map(r => Object.assign({}, r.data, { _uid: r.user_id, _updated: r.updated_at, _acct: r.profile, rmOn: !!r.profile.rm_enabled }));
  };
  A.listAccounts = () => rest('profiles?select=id,username,full_name,role,birth,active,coach_id,gym_id,can_see_all,must_change_password,created_at&order=created_at.desc');
  A.listGyms = () => rest('gyms?select=id,name,active,created_at&order=name');
  A.createGym = o => admin(Object.assign({ action: 'create_gym' }, o));
  A.setGymActive = (gym_id, active) => admin({ action: 'set_gym_active', gym_id, active });
  A.setRm = (uid, on) => rest('rpc/set_rm_enabled', { method: 'POST', body: JSON.stringify({ target: uid, enabled: !!on }) });
  A.setPerms = (uid, can_see_all) => admin({ action: 'set_perms', user_id: uid, can_see_all });
  A.assignCoach = (uid, coach_id) => admin({ action: 'assign_coach', user_id: uid, coach_id });
  A.lockState = async () => { const r = await rest('admin_lock?select=open'); return { open: !!(r[0] && r[0].open) }; };
  A.setLock = unlock => rest('rpc/set_admin_lock', { method: 'POST', body: JSON.stringify({ unlock: !!unlock }) });
  A.restoreData = (uid, data, reason) => admin({ action: 'restore_data', user_id: uid, data, reason });
  A.logAccess = (uid, act) => rest('rpc/log_access', { method: 'POST', body: JSON.stringify({ target: uid, act }) }).catch(() => { });
  const boot = body => raw('/functions/v1/bootstrap-admin', { method: 'POST', headers: { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  A.bootstrapStatus = () => boot({ action: 'status' }).then(r => !!r.available);
  A.bootstrap = o => boot(Object.assign({ action: 'create' }, o));
  const admin = body => api('/functions/v1/admin-users', { method: 'POST', body: JSON.stringify(body) });
  A.createUser = o => admin(Object.assign({ action: 'create' }, o));
  A.resetPassword = (uid, password) => admin({ action: 'reset_password', user_id: uid, password });
  A.setActive = (uid, active) => admin({ action: 'set_active', user_id: uid, active });
  A.deleteUser = uid => admin({ action: 'delete', user_id: uid });
  A.assignPlan = (uid, title, body) => rest('assigned_plans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: uid, coach_id: A.me.id, title, body }) }).then(r => { A.logAccess(uid, 'send_plan'); return r; });
  A.clientPlans = uid => rest('assigned_plans?user_id=eq.' + uid + '&select=id,title,body,created_at,imported_at,coach:profiles!coach_id(full_name)&order=created_at.asc');
  A.myPlans = () => rest('assigned_plans?user_id=eq.' + A.me.id + '&imported_at=is.null&select=id,title,body,created_at&order=created_at.desc');
  A.markPlanImported = id => rest('assigned_plans?id=eq.' + id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ imported_at: new Date().toISOString() }) });
  A.audit = (n) => rest('audit_log?select=at,actor,action,target,detail&order=at.desc&limit=' + (n || 100));
  A.config = () => rest('app_config?select=key,value,updated_at');
  A.setConfig = (key, value) => rest('app_config?on_conflict=key', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ key, value }) });
})(window.FORMA);
