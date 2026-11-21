// Agente: collaudatore. Fa leggere schede alimentari di esempio al riconoscimento reale dell'app (browser headless).
const c = require('./comune'), fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const site = process.env.SITO || path.join(c.root, '_site'); // cartella costruita con: node scripts/build-www.js _site
const mime = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p.endsWith('/')) p += 'index.html'; const f = path.join(site, p); if (!fs.existsSync(f)) { r.statusCode = 404; return r.end(); } r.setHeader('Content-Type', mime[path.extname(f)] || 'text/plain'); r.end(fs.readFileSync(f)); }).listen(8199);
(async () => {
  const b = await chromium.launch(), pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:8199/nutri/index.html'); await pg.waitForTimeout(1500);
  const dir = path.join(__dirname, 'schede');
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.txt'))) {
    const txt = fs.readFileSync(path.join(dir, f), 'utf8');
    const attese = fs.existsSync(path.join(dir, f.replace('.txt', '.json'))) ? JSON.parse(fs.readFileSync(path.join(dir, f.replace('.txt', '.json')), 'utf8')) : null;
    const r = await pg.evaluate(async txt => { const F = window.FORMA; await F.loadCrea(); const p = { nutrition: { foods: [] } }; const x = F.parsePlanText(p, txt);
      return { water: x.water, secs: F.planSections(p, x.days[0]).map(s => ({ lab: s.lab, supp: !!s.supp, n: s.rows.length, k: Math.round(s.tot.k) })), mancanti: (x.days[0].meals || []).flat().filter(i => i && !i.f && !i.kind).map(i => i.raw || i.name) }; }, txt);
    console.log(f, JSON.stringify(r));
    r.mancanti.forEach(m => c.segnala('collaudatore', 'media', `${f}: alimento non riconosciuto "${m}"`));
    if (attese) { if (attese.water != null && r.water !== attese.water) c.segnala('collaudatore', 'alta', `${f}: acqua ${r.water} invece di ${attese.water}`);
      (attese.sezioni || []).forEach(s => { if (!r.secs.some(x => x.lab === s)) c.segnala('collaudatore', 'alta', `${f}: sezione "${s}" non riconosciuta`); }); }
  }
  errs.forEach(e => c.segnala('collaudatore', 'alta', 'errore nel browser: ' + e));
  await b.close(); srv.close(); c.salva();
})();
