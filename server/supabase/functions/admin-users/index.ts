// Edge Function "admin-users": crea e gestisce gli accessi (nome, cognome, password). Solo staff autorizzato.
// Deploy: supabase functions deploy admin-users   (usa SUPABASE_SERVICE_ROLE_KEY, mai esposta all'app)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DOMAIN = Deno.env.get('LOGIN_DOMAIN') ?? 'login.tlz.app';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const RANK: Record<string, number> = { client: 0, coach: 1, owner: 2, dev: 3 };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: u } = await admin.auth.getUser(jwt);
  if (!u?.user) return json({ error: 'non autenticato' }, 401);
  const { data: me } = await admin.from('profiles').select('id, role, active').eq('id', u.user.id).single();
  if (!me?.active || RANK[me.role] < 1) return json({ error: 'non autorizzato' }, 403);
  const b = await req.json().catch(() => ({}));
  const log = (action: string, target: string | null, detail: unknown = {}) => admin.from('audit_log').insert({ actor: me.id, action, target, detail });

  if (b.action === 'create') {
    const role = b.role ?? 'client';
    const may: Record<string, string[]> = { coach: ['client'], owner: ['client', 'coach'], dev: ['client', 'coach', 'owner', 'dev'] };
    if (!(may[me.role] ?? []).includes(role)) return json({ error: 'ruolo non consentito' }, 403);
    const name = String(b.name ?? '').trim(), surname = String(b.surname ?? '').trim(), pass = String(b.password ?? '');
    if (!name || !surname || pass.length < 8) return json({ error: 'servono nome, cognome e password di almeno 8 caratteri' }, 400);
    const base = `${slug(name)}.${slug(surname)}`; let username = base, n = 2;
    while ((await admin.from('profiles').select('id').eq('username', username).maybeSingle()).data) username = `${base}${n++}`;
    const { data: c, error } = await admin.auth.admin.createUser({ email: `${username}@${DOMAIN}`, password: pass, email_confirm: true });
    if (error || !c.user) return json({ error: error?.message ?? 'creazione non riuscita' }, 400);
    const row = { id: c.user.id, username, full_name: `${name} ${surname}`, role, birth: b.birth ?? null, coach_id: role === 'client' ? (b.coach_id ?? (me.role === 'coach' ? me.id : null)) : null, must_change_password: true, created_by: me.id };
    const { error: e2 } = await admin.from('profiles').insert(row);
    if (e2) { await admin.auth.admin.deleteUser(c.user.id); return json({ error: e2.message }, 400); }
    if (b.consent) await admin.from('consents').insert((['privacy', 'dati_salute', 'termini'] as const).map((kind) => ({ user_id: c.user!.id, kind, version: String(b.consent.version ?? '1'), is_minor: !!b.consent.is_minor, guardian_name: b.consent.guardian_name ?? null, guardian_contact: b.consent.guardian_contact ?? null, recorded_by: me.id })));
    await log('create_user', c.user.id, { role, username });
    return json({ ok: true, id: c.user.id, username });
  }
  const target = String(b.user_id ?? '');
  const { data: t } = await admin.from('profiles').select('id, role, coach_id').eq('id', target).single();
  if (!t) return json({ error: 'utente non trovato' }, 404);
  if ((RANK[t.role] >= RANK[me.role] && me.role !== 'dev') || me.role === 'coach' && t.coach_id && t.coach_id !== me.id) return json({ error: 'non autorizzato su questo utente' }, 403);
  if (b.action === 'reset_password') {
    const pass = String(b.password ?? ''); if (pass.length < 8) return json({ error: 'password troppo corta' }, 400);
    const { error } = await admin.auth.admin.updateUserById(target, { password: pass }); if (error) return json({ error: error.message }, 400);
    await admin.from('profiles').update({ must_change_password: true }).eq('id', target); await log('reset_password', target); return json({ ok: true });
  }
  if (b.action === 'set_active') { await admin.from('profiles').update({ active: !!b.active }).eq('id', target); await log('set_active', target, { active: !!b.active }); return json({ ok: true }); }
  if (b.action === 'delete') { // diritto alla cancellazione: elimina account e tutti i dati collegati
    if (RANK[me.role] < 2) return json({ error: 'solo titolare o sviluppatore' }, 403);
    await log('delete_user', target); const { error } = await admin.auth.admin.deleteUser(target); return error ? json({ error: error.message }, 400) : json({ ok: true });
  }
  return json({ error: 'azione sconosciuta' }, 400);
});
