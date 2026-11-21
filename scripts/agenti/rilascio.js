// Agente: rilascio. Verifica coerenza versione/build/cache/note.
const c = require('./comune');
const d = c.leggi('data.js'), sw = c.leggi('sw.js'), v = JSON.parse(c.leggi('version.json'));
const m = d.match(/version:\s*'([\d.]+)',\s*build:\s*(\d+)/); if (!m) c.segnala('rilascio', 'alta', 'VERSION non trovata in data.js');
else { if (m[1] !== v.version) c.segnala('rilascio', 'alta', `data.js ${m[1]} ≠ version.json ${v.version}`);
  if (+m[2] !== +v.build) c.segnala('rilascio', 'alta', `build data.js ${m[2]} ≠ version.json ${v.build}`);
  const s = sw.match(/forgia-v(\d+)/); if (!s || +s[1] !== +m[2]) c.segnala('rilascio', 'alta', `cache sw.js (${s && s[1]}) ≠ build ${m[2]}`); }
if (!Array.isArray(v.notes) || !v.notes.length) c.segnala('rilascio', 'media', 'nessuna nota di versione');
console.log('versione', v.version, 'build', v.build); c.salva();
