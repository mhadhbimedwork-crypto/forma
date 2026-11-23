// Edge Function "rename-gym": cambia il nome di una palestra. Autorizzati: amministratore (con 2 passaggi) e allenatore principale della propria palestra.
// Il nome vive solo nella tabella gyms: tutte le app lo leggono da lì al prossimo avvio/accesso. Aggiorna anche le recensioni che mostrano il nome della palestra.
// Deploy: supabase functions deploy rename-gym   (usa SUPABASE_SERVICE_ROLE_KEY, mai esposta all'app)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
let cors: Record<string, string> = {};
const mkCors = (req: Request) => ({ 'Access-Control-Allow-Origin': ORIGINS.length ? (ORIGINS.includes(req.headers.get('Origin') ?? '') ? req.headers.get('Origin')! : ORIGINS[0]) : '*', 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey', 'Access-Control-Allow-Methods': 'POST, OPTIONS' });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const aalOf = (jwt: string) => { try { return JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).aal; } catch { return null; } };

Deno.serve(async (req) => {
  cors = mkCors(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: u } = await admin.auth.getUser(jwt);
  if (!u?.user) return json({ error: 'non autenticato' }, 401);
  const { data: me } = await admin.from('profiles').select('id, role, active, gym_id').eq('id', u.user.id).single();
  if (!me?.active || !['admin', 'head'].includes(me.role)) return json({ error: 'non autorizzato' }, 403);
  if (me.role === 'admin' && aalOf(jwt) !== 'aal2') return json({ error: 'serve la verifica a due passaggi' }, 403);
  if (me.role === 'head') { // verifica a due passaggi obbligatoria per i ruoli scelti dall'amministratore
    const { data: cf } = await admin.from('app_config').select('value').eq('key', 'mfa_roles').maybeSingle();
    if (cf?.value?.head === true && aalOf(jwt) !== 'aal2') return json({ error: 'serve la verifica a due passaggi' }, 403);
  }
  const b = await req.json().catch(() => ({}));
  const gid = String(b.gym_id ?? ''); const nn = String(b.name ?? '').replace(/\s+/g, ' ').trim();
  if (me.role === 'head' && me.gym_id !== gid) return json({ error: 'non autorizzato' }, 403);
  if (!nn || nn.length > 80) return json({ error: 'il nome deve avere da 1 a 80 caratteri' }, 400);
  const { data: old } = await admin.from('gyms').select('name').eq('id', gid).maybeSingle();
  if (!old) return json({ error: 'palestra non trovata' }, 404);
  if (old.name === nn) return json({ ok: true, name: nn, unchanged: true });
  const { error: er } = await admin.from('gyms').update({ name: nn }).eq('id', gid);
  if (er) return json({ error: er.message }, 400);
  const { data: mem } = await admin.from('profiles').select('id').eq('gym_id', gid); const ids = (mem ?? []).map((x: { id: string }) => x.id);
  let reviews = 0;
  if (ids.length) { const { data: rr } = await admin.from('app_reviews').update({ gym_name: nn }).in('user_id', ids).eq('gym_name', old.name).select('id'); reviews = (rr ?? []).length; }
  await admin.from('audit_log').insert({ actor: me.id, action: 'rename_gym', target: null, detail: { gym_id: gid, from: old.name, to: nn, reviews } });
  return json({ ok: true, name: nn, reviews });
});
