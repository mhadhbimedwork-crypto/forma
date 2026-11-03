// Copia i file web dell'app in una cartella di output (default: www). Usato da Pages e da Capacitor.
const fs = require('fs'), path = require('path');
const out = path.resolve(process.argv[2] || 'www');
const FILES = ['index.html', 'styles.css', 'data.js', 'body.js', 'engine.js', 'exercises2.js', 'recovery.js', 'analytics.js', 'xlsx.js', 'exportdata.js', 'account.js', 'staff.js', 'planfile.js', 'parser.js', 'nutrition.js', 'guide.js', 'planner.js', 'backup.js', 'app.js', 'sw.js', 'manifest.webmanifest', 'version.json'];
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
for (const f of FILES) fs.copyFileSync(f, path.join(out, f));
fs.cpSync('icons', path.join(out, 'icons'), { recursive: true });
fs.cpSync('fonts', path.join(out, 'fonts'), { recursive: true });
fs.cpSync('img', path.join(out, 'img'), { recursive: true });
fs.cpSync('lib', path.join(out, 'lib'), { recursive: true });
fs.writeFileSync(path.join(out, '.nojekyll'), '');

/* Versione per la palestra (senza dieta): stessa app, altro nome, altri dati (chiave di archiviazione diversa) */
if (path.basename(out) === '_site') {
  const g = path.join(out, 'gym'); fs.mkdirSync(g, { recursive: true });
  let server = null, gymServer = null; try { const gc = JSON.parse(fs.readFileSync('gym-config.json', 'utf8')); server = gc.server || null; gymServer = gc.enableOnGym ? server : null; } catch (e) { }   // la console admin usa sempre il server; l'app /gym/ solo quando enableOnGym è true
  const cfgJs = 'window.FORMA_GYM = ' + JSON.stringify({ name: 'THE LIFTING ZONE', tag: 'TRAIN · LIFT · REPEAT', key: 'tlz.v1', server: gymServer }) + ';\n'; const cfg = '<script src="gymcfg.js"></script>\n'; fs.writeFileSync(path.join(g, 'gymcfg.js'), cfgJs);
  for (const f of FILES) {
    let t = fs.readFileSync(f, 'utf8');
    if (f === 'index.html') t = t.replace('<script src="data.js">', cfg + '<script src="data.js">').replace(/<title>.*?<\/title>/, '<title>THE LIFTING ZONE</title>').replace('content="#05070c"', 'content="#0b0b0d"').replace('icons/icon.svg', 'icons/gym/icon.svg').replace('icons/apple-touch-icon.png', 'icons/gym/icon-192.png');
    if (f === 'sw.js') t = t.replace("'app.js',", "'app.js', 'gymcfg.js',").replace("'forgia-", "'tlz-").replace("'icons/icon.svg'", "'icons/gym/icon.svg'").replace("'icons/mark.png', 'icons/icon-192.png', 'icons/icon-512.png'", "'icons/gym/mark.png', 'icons/gym/icon-192.png', 'icons/gym/icon-512.png'");
    if (f === 'manifest.webmanifest') { const m = JSON.parse(t); m.name = 'THE LIFTING ZONE'; m.short_name = 'LIFTING ZONE'; m.description = 'La tua scheda di allenamento'; m.background_color = '#0b0b0d'; m.theme_color = '#e11d2e'; m.icons = [{ src: 'icons/gym/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icons/gym/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }, { src: 'icons/gym/icon.svg', sizes: 'any', type: 'image/svg+xml' }]; t = JSON.stringify(m, null, 1); }
    fs.writeFileSync(path.join(g, f), t);
  }
  fs.cpSync('icons', path.join(g, 'icons'), { recursive: true }); fs.cpSync('img', path.join(g, 'img'), { recursive: true }); fs.cpSync('lib', path.join(g, 'lib'), { recursive: true }); fs.cpSync('fonts', path.join(g, 'fonts'), { recursive: true });

  /* Console amministratore: stesso codice, indirizzo separato (/admin/), non collegata da nessuna parte nell'app dei clienti */
  const ad = path.join(out, 'admin'); fs.mkdirSync(ad, { recursive: true });
  const acfgJs = 'window.FORMA_GYM = ' + JSON.stringify({ name: 'TLZ CONSOLE', tag: 'AMMINISTRAZIONE', key: 'tlz.admin.v1', mode: 'admin', server }) + ';\n'; const acfg = '<script src="gymcfg.js"></script>\n'; fs.writeFileSync(path.join(ad, 'gymcfg.js'), acfgJs);
  for (const f of FILES) {
    let t = fs.readFileSync(f, 'utf8');
    if (f === 'index.html') t = t.replace('<script src="data.js">', acfg + '<script src="data.js">').replace(/<title>.*?<\/title>/, '<title>TLZ Console</title>').replace('<meta name="viewport"', '<meta name="robots" content="noindex,nofollow">\n<meta name="viewport"').replace('content="#05070c"', 'content="#0b0b0d"').replace('icons/icon.svg', 'icons/gym/icon.svg').replace('icons/apple-touch-icon.png', 'icons/gym/icon-192.png');
    if (f === 'sw.js') t = t.replace("'app.js',", "'app.js', 'gymcfg.js',").replace("'forgia-", "'tlzadm-").replace("'icons/icon.svg'", "'icons/gym/icon.svg'").replace("'icons/mark.png', 'icons/icon-192.png', 'icons/icon-512.png'", "'icons/gym/mark.png', 'icons/gym/icon-192.png', 'icons/gym/icon-512.png'");
    if (f === 'manifest.webmanifest') { const m = JSON.parse(t); m.name = 'TLZ Console'; m.short_name = 'TLZ Console'; m.description = 'Amministrazione'; m.background_color = '#0b0b0d'; m.theme_color = '#e11d2e'; m.icons = [{ src: 'icons/gym/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icons/gym/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }]; t = JSON.stringify(m, null, 1); }
    fs.writeFileSync(path.join(ad, f), t);
  }
  fs.cpSync('icons', path.join(ad, 'icons'), { recursive: true }); fs.cpSync('img', path.join(ad, 'img'), { recursive: true }); fs.cpSync('fonts', path.join(ad, 'fonts'), { recursive: true }); fs.cpSync('lib', path.join(ad, 'lib'), { recursive: true });
  console.log('Console amministratore in', ad);
  console.log('Versione palestra in', g);
}
console.log('Web app copiata in', out);

/* indirizzi con numero di versione: dopo un aggiornamento il telefono non può riusare file vecchi in cache */
{
  const build = (fs.readFileSync('data.js', 'utf8').match(/build:\s*(\d+)/) || [])[1] || Date.now();
  for (const d of [out, path.join(out, 'gym'), path.join(out, 'admin')]) {
    const f = path.join(d, 'index.html'); if (!fs.existsSync(f)) continue;
    fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/(src|href)="((?!https?:|data:|#)[^"?]+\.(?:js|css))"/g, '$1="$2?v=' + build + '"'));
  }
}
