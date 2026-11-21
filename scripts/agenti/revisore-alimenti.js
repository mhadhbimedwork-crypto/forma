// Agente: revisore alimenti. Controlla coerenza kcal/macro e alias duplicati.
const c = require('./comune'); global.window = global; const F = global.FORMA = {}; F.normText = s => String(s).toLowerCase();
require('../../nutrition.js');
const alias = {};
F.FOODS.forEach(x => {
  const calc = 4 * x.p + 4 * x.c + 9 * x.f;
  if (!/birra|vino|alcol|liquor/i.test(x.name) && x.k > 20 && Math.abs(calc - x.k) / x.k > 0.15 && Math.abs(calc - x.k) > 8) c.segnala('revisore-alimenti', 'media', `${x.name}: kcal ${x.k} ma i macro ne danno ${Math.round(calc)} (controllare sulla tabella CREA)`);
  if (x.p + x.c + x.f > 101) c.segnala('revisore-alimenti', 'alta', `${x.name}: macro oltre 100 g su 100 g`);
  (x.al || []).forEach(a => { const k = F.normText(a); if (alias[k] && alias[k] !== x.id) c.segnala('revisore-alimenti', 'media', `alias "${a}" usato da ${alias[k]} e da ${x.id}`); alias[k] = x.id; });
});
console.log(`alimenti controllati: ${F.FOODS.length}`); c.salva();
