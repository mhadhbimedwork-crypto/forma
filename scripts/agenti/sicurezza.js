// Agente: sicurezza. Cerca chiavi nel codice, permessi larghi nei workflow, funzioni aperte.
const c = require('./comune'), fs = require('fs'), path = require('path');
const skip = new Set(['.git', 'node_modules', 'android', '.claude', 'www', '_site']);
const files = []; (function w(d) { fs.readdirSync(d, { withFileTypes: true }).forEach(e => { if (skip.has(e.name)) return; const p = path.join(d, e.name); e.isDirectory() ? w(p) : /\.(js|ts|json|yml|yaml|sql|html|md|py)$/.test(e.name) && files.push(p); }); })(c.root);
const pat = [[/sk-ant-[A-Za-z0-9_-]{20,}/, 'chiave Anthropic'], [/gh[pousr]_[A-Za-z0-9]{30,}/, 'token GitHub'], [/eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/, 'JWT (possibile chiave Supabase)'], [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'chiave privata'], [/service_role['"]?\s*[:=]\s*['"]eyJ/, 'chiave service_role']];
files.forEach(f => { const t = fs.readFileSync(f, 'utf8'); const rel = path.relative(c.root, f);
  pat.forEach(([re, n]) => { if (re.test(t)) { // la chiave pubblica "anon" è prevista nel client: la ignoro
    const m = t.match(re)[0]; try { const pl = JSON.parse(Buffer.from(m.split('.')[1], 'base64').toString()); if (pl.role === 'anon') return; } catch (e) {}
    c.segnala('sicurezza', 'alta', `${rel}: possibile ${n}`); } });
  if (/\.github\/workflows\/.*\.ya?ml$/.test(rel) && /pull_request_target|issue_comment/.test(t)) c.segnala('sicurezza', 'alta', `${rel}: avvio da eventi di estranei`);
  if (/\.sql$/.test(rel)) { (t.match(/create table (?:if not exists )?(?:public\.)?(\w+)/gi) || []).forEach(m => { const n = m.split(/\s+/).pop().replace('public.', ''); if (!new RegExp(`alter table (?:public\\.)?${n}\\s+enable row level security`, 'i').test(t) && !/_APPLIED/.test(rel)) c.segnala('sicurezza', 'media', `${rel}: tabella ${n} senza RLS visibile in questo file`); }); }
});
console.log(`file controllati: ${files.length}`); c.salva();
