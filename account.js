/* THE LIFTING ZONE – account e sincronizzazione con il server (Supabase via REST, senza librerie).
   Attivo solo se la versione palestra ha un server configurato (window.FORMA_GYM.server). Senza server l'app funziona come prima, solo sul dispositivo. */
(function (F) {
  'use strict';
  const cfg = (window.FORMA_GYM && window.FORMA_GYM.server) || null;
  const KEY = 'tlz.acct', ROLES = { client: 'Cliente', coach: 'Allenatore', owner: 'Titolare', dev: 'Sviluppatore' };
  F.ROLE_LABEL = ROLES;
  const A = F.Account = { enabled: !!(cfg && cfg.url && cfg.anonKey), roles: ROLES, me: null };
  const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const domain = () => (cfg && cfg.loginDomain) || 'login.tlz.app';
  A.emailOf = (name, surname) => `${slug(name)}.${slug(surname)}@${domain()}`;
  A.staff = () => !!(A.me && ['coach', 'owner', 'dev'].includes(A.me.role));
  A.isDev = () => !!(A.me && A.me.role === 'dev');

  let tok = null; try { tok = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { }
  const store = () => { try { tok ? localStorage.setItem(KEY, JSON.stringify(tok)) : localStorage.removeItem(KEY); } catch (e) { } };
  async function raw(path, o) {
    const r = await fetch(cfg.url + path, o); let b = null; try { b = await r.json(); } catch (e) { }
    if (!r.ok) { const m = (b && (b.error_description || b.msg || b.message || b.error)) || ('errore ' + r.status); const err = new Error(String(m)); err.status = r.status; throw err; } return b;
  }
  const hdr = (extra) => Object.assign({ apikey: cfg.anonKey, 'Content-Type': 'application/json', Authorization: 'Bearer ' + (tok ? tok.access_token : cfg.anonKey) }, extra || {});
  async function refresh() {
    if (!tok || !tok.refresh_token) throw new Error('sessione scaduta');
    const b = await raw('/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: tok.refresh_token }) });
    tok = { access_token: b.access_token, refresh_token: b.refresh_token, user: b.user, at: Date.now() }; store();
  }
  async function api(path, o) {
    o = o || {}; try { return await raw(path, Object.assign({}, o, { headers: hdr(o.headers) })); }
    catch (e) { if (e.status === 401 && tok) { await refresh(); return raw(path, Object.assign({}, o, { headers: hdr(o.headers) })); } throw e; }
  }
  const rest = (p, o) => api('/rest/v1/' + p, o);
  A._rest = rest;

  async function loadMe() {
    const rows = await rest('profiles?id=eq.' + tok.user.id + '&select=id,username,full_name,role,birth,active,must_change_password');
    if (!rows.length || !rows[0].active) { tok = null; store(); throw new Error('account non attivo'); }
    return (A.me = rows[0]);
  }
  /** Ripristina una sessione già aperta (all'avvio). */
  A.restore = async function () { if (!A.enabled || !tok) return null; try { return await loadMe(); } catch (e) { if (e.status === 401 || /scaduta|attivo/.test(e.message)) { tok = null; store(); } return null; } };
  A.signIn = async function (name, surname, password) {
    const b = await raw('/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: A.emailOf(name, surname), password }) }).catch(e => { throw new Error(e.status === 400 ? 'Nome, cognome o password non corretti' : e.message); });
    tok = { access_token: b.access_token, refresh_token: b.refresh_token, user: b.user, at: Date.now() }; store(); return loadMe();
  };
  A.signOut = function () { tok = null; A.me = null; store(); };
  A.changePassword = async function (pw) {
    if (String(pw).length < 8) throw new Error('La password deve avere almeno 8 caratteri');
    await api('/auth/v1/user', { method: 'PUT', body: JSON.stringify({ password: pw }) }); await rest('rpc/password_changed', { method: 'POST', body: '{}' }); if (A.me) A.me.must_change_password = false;
  };

  /* ---- dati del cliente: il dispositivo resta la fonte principale (funziona offline), il server tiene la copia ---- */
  A.pullMine = async function () { const r = await rest('client_data?user_id=eq.' + A.me.id + '&select=data,version,updated_at'); return r[0] || null; };
  A.pushMine = async function (profile, device) {
    return rest('client_data?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: A.me.id, data: profile, device: device || navigator.userAgent.slice(0, 80) }) });
  };
  /** Unione di due copie dello stesso profilo senza perdere nulla (sedute, dolori, peso, misure). */
  F.mergeProfiles = function (a, b) {
    const o = Object.assign({}, a), uniq = (x, y, key) => { const m = new Map(); x.concat(y).forEach(i => m.set(key(i), i)); return [...m.values()]; };
    o.sessions = uniq(a.sessions || [], (b && b.sessions) || [], s => s.id || s.date + '|' + s.dayName).sort((p, q) => p.date < q.date ? -1 : p.date > q.date ? 1 : (p.at || 0) - (q.at || 0));
    o.painLog = uniq(a.painLog || [], (b && b.painLog) || [], e => e.date + '|' + e.zone + '|' + e.level).sort((p, q) => p.date < q.date ? -1 : p.date > q.date ? 1 : 0);
    o.weights = uniq(a.weights || [], (b && b.weights) || [], w => w.date).sort((p, q) => p.date < q.date ? -1 : 1);
    o.measures = uniq(a.measures || [], (b && b.measures) || [], m => m.date).sort((p, q) => p.date < q.date ? -1 : 1);
    o.plans = uniq(a.plans || [], (b && b.plans) || [], x => x.id);
    const cur = {}; o.painLog.forEach(e => { cur[e.zone] = e.level; }); o.pain = Object.assign({}, a.pain || {});
    Object.keys(cur).forEach(z => { if (cur[z] > 0) o.pain[z] = cur[z]; else delete o.pain[z]; });
    return o;
  };

  /* ---- area staff ---- */
  A.listClients = async function () {
    const rows = await rest('client_data?select=user_id,updated_at,version,data,profile:profiles!client_data_user_id_fkey(id,username,full_name,role,birth,active,coach_id,must_change_password)');
    return rows.filter(r => r.profile && r.profile.role === 'client').map(r => Object.assign({}, r.data, { _uid: r.user_id, _updated: r.updated_at, _acct: r.profile }));
  };
  A.listAccounts = () => rest('profiles?select=id,username,full_name,role,birth,active,coach_id,must_change_password,created_at&order=created_at.desc');
  A.logAccess = (uid, act) => rest('rpc/log_access', { method: 'POST', body: JSON.stringify({ target: uid, act }) }).catch(() => { });
  const admin = body => api('/functions/v1/admin-users', { method: 'POST', body: JSON.stringify(body) });
  A.createUser = o => admin(Object.assign({ action: 'create' }, o));
  A.resetPassword = (uid, password) => admin({ action: 'reset_password', user_id: uid, password });
  A.setActive = (uid, active) => admin({ action: 'set_active', user_id: uid, active });
  A.deleteUser = uid => admin({ action: 'delete', user_id: uid });
  A.assignPlan = (uid, title, body) => rest('assigned_plans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: uid, coach_id: A.me.id, title, body }) });
  A.myPlans = () => rest('assigned_plans?user_id=eq.' + A.me.id + '&imported_at=is.null&select=id,title,body,created_at&order=created_at.desc');
  A.markPlanImported = id => rest('assigned_plans?id=eq.' + id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ imported_at: new Date().toISOString() }) });
  A.audit = (n) => rest('audit_log?select=at,actor,action,target,detail&order=at.desc&limit=' + (n || 100));
  A.config = () => rest('app_config?select=key,value,updated_at');
  A.setConfig = (key, value) => rest('app_config?on_conflict=key', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ key, value }) });
})(window.FORMA);
