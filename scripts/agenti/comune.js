// Utilità comuni: gli agenti sono programmi normali, NON usano intelligenza artificiale e NON consumano token.
const fs = require('fs'), path = require('path');
exports.root = path.join(__dirname, '..', '..');
exports.problemi = [];
exports.segnala = (agente, gravita, testo) => { exports.problemi.push({ agente, gravita, testo }); console.log(`[${agente}] ${gravita}: ${testo}`); };
exports.leggi = f => fs.readFileSync(path.join(exports.root, f), 'utf8');
exports.salva = (nome) => {
  const out = process.env.AGENTI_OUT || path.join(exports.root, 'report-agenti.json');
  const prev = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : [];
  fs.writeFileSync(out, JSON.stringify(prev.concat(exports.problemi), null, 1));
};
