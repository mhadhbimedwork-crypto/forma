// Edge Function "apk-key": consegna la chiave di firma dell'APK SOLO alla build GitHub di questo repository (ramo main), verificando l'identità OIDC di GitHub.
// La chiave sta nella tabella privata public.apk_signing (RLS attiva, nessun accesso dall'app). Deploy: supabase functions deploy apk-key --no-verify-jwt
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ISS = 'https://token.actions.githubusercontent.com';
const AUD = 'forgia-apk-key';
const REPO = 'mhadhbimedwork-crypto/forma';
const b64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
const deny = (m: string, s = 403) => new Response(JSON.stringify({ error: m }), { status: s, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return deny('metodo non consentito', 405);
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
  const parts = jwt.split('.');
  if (parts.length !== 3) return deny('token mancante', 401);
  try {
    const head = JSON.parse(new TextDecoder().decode(b64u(parts[0])));
    const claims = JSON.parse(new TextDecoder().decode(b64u(parts[1])));
    if (head.alg !== 'RS256') return deny('algoritmo non valido');
    const jwks = await (await fetch(ISS + '/.well-known/jwks')).json();
    const jwk = (jwks.keys ?? []).find((k: { kid: string }) => k.kid === head.kid);
    if (!jwk) return deny('chiave non trovata');
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
    if (!ok) return deny('firma del token non valida');
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== ISS || claims.aud !== AUD || claims.repository !== REPO || claims.ref !== 'refs/heads/main' || !(claims.exp > now) || !['push', 'workflow_dispatch'].includes(claims.event_name)) return deny('non autorizzato');
  } catch (_e) { return deny('token non valido', 401); }
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await admin.from('apk_signing').select('data').eq('name', 'forgia-release-keystore').maybeSingle();
  if (error || !data) return deny('chiave non disponibile', 500);
  return new Response(JSON.stringify({ keystore: data.data }), { headers: { 'Content-Type': 'application/json' } });
});
