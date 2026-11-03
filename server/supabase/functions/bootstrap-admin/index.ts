// Edge Function "bootstrap-admin": crea il PRIMO amministratore, una sola volta, con un codice di installazione monouso.
// Rifiuta se esiste già un admin; il codice (solo hash sha256 sul server) si cancella dopo l'uso; massimo 5 tentativi errati.
// Deploy: verify_jwt = false (chiamata prima di avere un account).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const DOMAIN = Deno.env.get('LOGIN_DOMAIN') ?? 'login.tlz.app';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const sha = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map((x) => x.toString(16).padStart(2, '0')).join('');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const b = await req.json().catch(() => ({}));
  const { count } = await db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin');
  const { data: s } = await db.from('bootstrap_setup').select('hash, attempts').eq('id', true).maybeSingle();
  const available = !count && !!s;
  if (b.action === 'status') return json({ available });
  if (!available) return json({ error: 'configurazione non disponibile' }, 403);
  if (s!.attempts >= 5) return json({ error: 'troppi tentativi: contatta chi gestisce il server' }, 429);
  const code = String(b.code ?? '').trim().toUpperCase();
  if ((await sha(code)) !== s!.hash) { await db.from('bootstrap_setup').update({ attempts: s!.attempts + 1 }).eq('id', true); return json({ error: 'codice di installazione non corretto' }, 403); }
  const name = String(b.name ?? '').trim(), surname = String(b.surname ?? '').trim(), pass = String(b.password ?? '');
  if (!name || !surname || pass.length < 10) return json({ error: 'servono nome, cognome e password di almeno 10 caratteri' }, 400);
  const username = `${slug(name)}.${slug(surname)}`;
  const { data: c, error } = await db.auth.admin.createUser({ email: `${username}@${DOMAIN}`, password: pass, email_confirm: true });
  if (error || !c.user) return json({ error: error?.message ?? 'creazione non riuscita' }, 400);
  const { error: e2 } = await db.from('profiles').insert({ id: c.user.id, username, full_name: `${name} ${surname}`, role: 'admin', gym_id: null, must_change_password: false });
  if (e2) { await db.auth.admin.deleteUser(c.user.id); return json({ error: e2.message }, 400); }
  await db.from('bootstrap_setup').delete().eq('id', true);
  await db.from('audit_log').insert({ actor: c.user.id, action: 'bootstrap_admin', target: c.user.id, detail: {} });
  return json({ ok: true, username });
});
