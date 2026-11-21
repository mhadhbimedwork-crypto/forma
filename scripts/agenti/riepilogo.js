// Riepilogo: stampa il report e prepara il testo della segnalazione. Esce con 1 se ci sono problemi di gravità alta.
const fs = require('fs'), c = require('./comune');
const f = process.env.AGENTI_OUT || require('path').join(c.root, 'report-agenti.json');
const r = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
const md = r.length ? '| Agente | Gravità | Problema |\n|---|---|---|\n' + r.map(x => `| ${x.agente} | ${x.gravita} | ${x.testo.replace(/\|/g, '/')} |`).join('\n') : 'Nessun problema trovato.';
fs.writeFileSync(process.env.AGENTI_MD || 'report-agenti.md', md); console.log(md);
process.exit(r.some(x => x.gravita === 'alta') ? 1 : 0);
