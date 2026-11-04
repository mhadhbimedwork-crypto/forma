// Edge Function "admin-users": crea e gestisce palestre e accessi (nome, cognome, password). Nessuno può leggere le password: si reimpostano.
// Gerarchia: admin (fornitore) → head (allenatore principale della palestra) → coach → client.
// L'admin può entrare come altro utente (impersonate): sola visione, oppure modifica se il blocco è tolto o se è un suo profilo (admin_own).
// L'admin è in sola lettura sui dati dei clienti finché non toglie il blocco (admin_lock, solo lui, con 2FA); "restore_data" richiede il blocco tolto e un motivo, ed è sempre registrata.
// Deploy: supabase functions deploy admin-users   (usa SUPABASE_SERVICE_ROLE_KEY, mai esposta all'app)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DOMAIN = Deno.env.get('LOGIN_DOMAIN') ?? 'login.tlz.app';
// CORS: solo gli indirizzi dell'app (variabile ALLOWED_ORIGINS, separati da virgola). Se manca, resta aperto: il token e il controllo dei ruoli proteggono comunque.
const ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
let cors: Record<string, string> = {};
const mkCors = (req: Request) => ({ 'Access-Control-Allow-Origin': ORIGINS.length ? (ORIGINS.includes(req.headers.get('Origin') ?? '') ? req.headers.get('Origin')! : ORIGINS[0]) : '*', 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey', 'Access-Control-Allow-Methods': 'POST, OPTIONS' });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const RANK: Record<string, number> = { client: 0, coach: 1, head: 2, admin: 3 };
const MAY: Record<string, string[]> = { coach: ['client'], head: ['coach', 'client'], admin: ['head', 'coach', 'client'] };
const aalOf = (jwt: string) => { try { return JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).aal; } catch { return null; } };

Deno.serve(async (req) => {
  cors = mkCors(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: u } = await admin.auth.getUser(jwt);
  if (!u?.user) return json({ error: 'non autenticato' }, 401);
  const { data: me } = await admin.from('profiles').select('id, role, active, gym_id').eq('id', u.user.id).single();
  if (!me?.active || RANK[me.role] < 1) return json({ error: 'non autorizzato' }, 403);
  if (me.role === 'admin' && aalOf(jwt) !== 'aal2') return json({ error: 'serve la verifica a due passaggi' }, 403);
  if (me.gym_id) { const { data: g } = await admin.from('gyms').select('active').eq('id', me.gym_id).single(); if (!g?.active) return json({ error: 'palestra disattivata' }, 403); }
  const b = await req.json().catch(() => ({}));
  const log = (action: string, target: string | null, detail: unknown = {}) => admin.from('audit_log').insert({ actor: me.id, action, target, detail });
  const mayManage = (t: { id: string; role: string; gym_id: string | null; coach_id: string | null }) =>
    t.id !== me.id && (me.role === 'admin' || (t.gym_id === me.gym_id && RANK[t.role] < RANK[me.role] && (me.role === 'head' || t.coach_id === me.id)));

  async function makeUser(name: string, surname: string, pass: string, role: string, gym_id: string | null, extra: Record<string, unknown>) {
    if (!name || !surname || pass.length < 8) return { error: 'servono nome, cognome e password di almeno 8 caratteri' };
    const base = `${slug(name)}.${slug(surname)}`; let username = base, n = 2;
    while ((await admin.from('profiles').select('id').eq('username', username).maybeSingle()).data) username = `${base}${n++}`;
    const { data: c, error } = await admin.auth.admin.createUser({ email: `${username}@${DOMAIN}`, password: pass, email_confirm: true });
    if (error || !c.user) return { error: error?.message ?? 'creazione non riuscita' };
    const row = { id: c.user.id, username, full_name: `${name.trim()} ${surname.trim()}`, role, gym_id, must_change_password: true, created_by: me.id, ...extra };
    const { error: e2 } = await admin.from('profiles').insert(row);
    if (e2) { await admin.auth.admin.deleteUser(c.user.id); return { error: e2.message }; }
    return { id: c.user.id, username };
  }

  if (b.action === 'create_gym') {
    if (me.role !== 'admin') return json({ error: 'solo l\'amministratore crea palestre' }, 403);
    const gname = String(b.gym_name ?? '').trim(); if (!gname) return json({ error: 'manca il nome della palestra' }, 400);
    const { data: g, error: eg } = await admin.from('gyms').insert({ name: gname }).select('id').single(); if (eg) return json({ error: eg.message }, 400);
    const r = await makeUser(String(b.name ?? ''), String(b.surname ?? ''), String(b.password ?? ''), 'head', g.id, { birth: b.birth ?? null });
    if ('error' in r) { await admin.from('gyms').delete().eq('id', g.id); return json({ error: r.error }, 400); }
    await log('create_gym', r.id, { gym: gname, gym_id: g.id }); return json({ ok: true, gym_id: g.id, ...r });
  }
  if (b.action === 'set_gym_active') {
    if (me.role !== 'admin') return json({ error: 'non autorizzato' }, 403);
    await admin.from('gyms').update({ active: !!b.active }).eq('id', b.gym_id); await log('set_gym_active', null, { gym_id: b.gym_id, active: !!b.active }); return json({ ok: true });
  }
  if (b.action === 'create') {
    const role = String(b.role ?? 'client'); if (!(MAY[me.role] ?? []).includes(role)) return json({ error: 'ruolo non consentito' }, 403);
    const gym_id = me.role === 'admin' ? (b.gym_id ?? null) : me.gym_id; if (!gym_id) return json({ error: 'manca la palestra' }, 400);
    const coach_id = role === 'client' ? (me.role === 'coach' ? me.id : (b.coach_id ?? (me.role === 'head' ? me.id : null))) : null;
    const r = await makeUser(String(b.name ?? ''), String(b.surname ?? ''), String(b.password ?? ''), role, gym_id, { birth: b.birth ?? null, coach_id, can_see_all: role === 'coach' ? !!b.can_see_all : false });
    if ('error' in r) return json({ error: r.error }, 400);
    if (b.consent) await admin.from('consents').insert((['privacy', 'dati_salute', 'termini'] as const).map((kind) => ({ user_id: r.id, kind, version: String(b.consent.version ?? '1'), is_minor: !!b.consent.is_minor, guardian_name: b.consent.guardian_name ?? null, guardian_contact: b.consent.guardian_contact ?? null, recorded_by: me.id })));
    await log('create_user', r.id, { role, username: r.username }); return json({ ok: true, ...r });
  }
  if (b.action === 'list_own') { // profili "miei" dell'amministratore (es. il suo account da atleta)
    if (me.role !== 'admin') return json({ error: 'solo l\'amministratore' }, 403);
    const { data: o } = await admin.from('admin_own').select('user_id').eq('owner_id', me.id); return json({ ok: true, ids: (o ?? []).map((x: { user_id: string }) => x.user_id) });
  }
  const target = String(b.user_id ?? '');
  const { data: t } = await admin.from('profiles').select('id, role, gym_id, coach_id').eq('id', target).single();
  if (!t) return json({ error: 'utente non trovato' }, 404);
  if (!mayManage(t)) return json({ error: 'non autorizzato su questo utente' }, 403);
  if (b.action === 'reset_password') {
    const pass = String(b.password ?? ''); if (pass.length < 8) return json({ error: 'password troppo corta' }, 400);
    const { error } = await admin.auth.admin.updateUserById(target, { password: pass }); if (error) return json({ error: error.message }, 400);
    await admin.from('profiles').update({ must_change_password: true }).eq('id', target); await log('reset_password', target); return json({ ok: true });
  }
  if (b.action === 'set_active') {
    await admin.from('profiles').update({ active: !!b.active }).eq('id', target);
    if (!b.active && t.role === 'coach') { // i clienti dell'allenatore passano all'allenatore principale: nulla va perso
      const { data: h } = await admin.from('profiles').select('id').eq('gym_id', t.gym_id).eq('role', 'head').eq('active', true).limit(1).maybeSingle();
      if (h) await admin.from('profiles').update({ coach_id: h.id }).eq('coach_id', target);
    }
    await log('set_active', target, { active: !!b.active }); return json({ ok: true });
  }
  if (b.action === 'set_perms') {
    if (t.role !== 'coach' || me.role === 'coach') return json({ error: 'non consentito' }, 403);
    await admin.from('profiles').update({ can_see_all: !!b.can_see_all }).eq('id', target); await log('set_perms', target, { can_see_all: !!b.can_see_all }); return json({ ok: true });
  }
  if (b.action === 'assign_coach') { // sposta un cliente a un altro allenatore della stessa palestra
    if (t.role !== 'client' || me.role === 'coach') return json({ error: 'non consentito' }, 403);
    const { data: c } = await admin.from('profiles').select('id, gym_id, role').eq('id', b.coach_id).single();
    if (!c || c.gym_id !== t.gym_id || !['coach', 'head'].includes(c.role)) return json({ error: 'allenatore non valido' }, 400);
    await admin.from('profiles').update({ coach_id: c.id }).eq('id', target); await log('assign_coach', target, { coach_id: c.id }); return json({ ok: true });
  }
  if (b.action === 'restore_data') { // unica scrittura dell'admin sui dati: su richiesta della palestra, con motivo, sempre registrata
    if (me.role === 'admin') {   // l'amministratore scrive sui dati altrui solo col lucchetto sbloccato; allenatori e principali solo sui propri utenti (già verificato sopra)
      const { data: lk } = await admin.from('admin_lock').select('open').eq('id', true).single();
      if (!lk?.open) return json({ error: 'blocco in scrittura attivo: sbloccalo dalla console' }, 403);
    }
    if (t.role !== 'client') return json({ error: 'si ripristinano solo i dati dei clienti' }, 403);
    if (!String(b.reason ?? '').trim() || typeof b.data !== 'object') return json({ error: 'servono motivo e dati da ripristinare' }, 400);
    await admin.from('client_data').upsert({ user_id: target, data: b.data, device: 'ripristino' }); await log('restore_data', target, { reason: String(b.reason).slice(0, 300) }); return json({ ok: true });
  }
  if (b.action === 'set_own') {
    if (me.role !== 'admin' || t.role === 'admin') return json({ error: 'non consentito' }, 403);
    if (b.own) await admin.from('admin_own').upsert({ user_id: target, owner_id: me.id }); else await admin.from('admin_own').delete().eq('user_id', target);
    await log('set_own', target, { own: !!b.own }); return json({ ok: true });
  }
  if (b.action === 'impersonate') { // entra come un altro utente senza password: sessione vera per l'utente scelto (registrata nel registro)
    if (me.role !== 'admin' || t.role === 'admin') return json({ error: 'non consentito' }, 403);
    const { data: tp } = await admin.from('profiles').select('username, active').eq('id', target).single();
    if (!tp) return json({ error: 'utente non trovato' }, 404);
    const { data: own } = await admin.from('admin_own').select('user_id').eq('user_id', target).eq('owner_id', me.id).maybeSingle();
    const { data: lk } = await admin.from('admin_lock').select('open').eq('id', true).single();
    const { data: gl, error: ge } = await admin.auth.admin.generateLink({ type: 'magiclink', email: `${tp.username}@${DOMAIN}` });
    if (ge || !gl?.properties?.hashed_token) return json({ error: ge?.message ?? 'accesso non riuscito' }, 400);
    await log('impersonate', target, { write: !!own || !!lk?.open });
    return json({ ok: true, token_hash: gl.properties.hashed_token, write: !!own || !!lk?.open, own: !!own });
  }
  if (b.action === 'delete') { // diritto alla cancellazione: account e tutti i dati collegati
    if (RANK[me.role] < 2) return json({ error: 'solo allenatore principale o amministratore' }, 403);
    const { data: cd } = await admin.from('client_data').select('data, updated_at').eq('user_id', target).maybeSingle(); // copia di sicurezza prima di eliminare: resta nello storico
    if (cd) await admin.from('client_data_history').insert({ user_id: target, data: cd.data, device: 'eliminazione account', saved_at: cd.updated_at });
    await log('delete_user', target, { role: t.role }); const { error } = await admin.auth.admin.deleteUser(target); return error ? json({ error: error.message }, 400) : json({ ok: true });
  }
  return json({ error: 'azione sconosciuta' }, 400);
});
