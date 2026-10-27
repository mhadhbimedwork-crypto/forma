// Server FORMA (opzionale): serve l'app e collega l'analista IA (Claude).
// Avvio: ANTHROPIC_API_KEY=... node server/server.js   (Node 18+, nessuna dipendenza)
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), PORT = process.env.PORT || 8080;
const KEY = process.env.ANTHROPIC_API_KEY, MODEL = process.env.FORMA_MODEL || 'claude-sonnet-5-5';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const SYSTEM = `Sei l'analista di FORMA, un'app di allenamento e benessere. Rispondi in italiano, concreto e breve, con passi chiari.
Regole: per i minorenni nessun deficit calorico, nessun integratore, carichi moderati. Dolore 7/10 o più, formicolio, gonfiore o dolore notturno: invita a vedere un medico o fisioterapista. Non fare diagnosi. Basati solo sui dati ricevuti.`;

async function claude(content, max = 900) {
  if (!KEY) throw new Error('ANTHROPIC_API_KEY mancante');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: max, system: SYSTEM, messages: [{ role: 'user', content }] })
  });
  const j = await r.json(); if (!r.ok) throw new Error(JSON.stringify(j));
  return j.content.map(c => c.text || '').join('');
}
const handlers = {
  async analyze(b) {
    return { text: await claude(`Analizza questo profilo e dai 5 indicazioni pratiche per le prossime 2 settimane (allenamento, alimentazione, recupero, gestione dei dolori).\n${JSON.stringify(b).slice(0, 60000)}`) };
  },
  async 'parse-scheda'(b) {
    return { text: await claude([{ type: 'image', source: { type: 'base64', media_type: b.mime || 'image/jpeg', data: b.image } },
      { type: 'text', text: 'Trascrivi questa scheda di allenamento nel formato: righe "# Nome giorno" e poi "ESERCIZIO | serie | ripetizioni". Riporta le ripetizioni come scritte (es. 15-12-10 CARICO CRESCENTE). Solo il testo, nient\'altro.' }], 2000) };
  }
};
http.createServer(async (req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'POST,GET,OPTIONS' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const m = req.url.match(/^\/api\/([\w-]+)/);
  if (m && req.method === 'POST' && handlers[m[1]]) {
    let body = ''; req.on('data', d => { body += d; if (body.length > 12e6) req.destroy(); });
    req.on('end', async () => { try { const out = await handlers[m[1]](JSON.parse(body || '{}')); res.writeHead(200, { ...cors, 'content-type': 'application/json' }); res.end(JSON.stringify(out)); }
      catch (e) { res.writeHead(500, { ...cors, 'content-type': 'application/json' }); res.end(JSON.stringify({ error: String(e.message || e) })); } });
    return;
  }
  let p = path.normalize(decodeURIComponent(req.url.split('?')[0])); if (p === '/' || p === path.sep) p = '/index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || f.includes(path.sep + 'server' + path.sep)) { res.writeHead(404); return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('Non trovato'); } res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(PORT, () => console.log(`FORMA su http://localhost:${PORT}  (IA ${KEY ? 'attiva' : 'non configurata'})`));
