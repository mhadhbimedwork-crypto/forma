// Copia i file web dell'app in una cartella di output (default: www). Usato da Pages e da Capacitor.
const fs = require('fs'), path = require('path');
const out = path.resolve(process.argv[2] || 'www');
const FILES = ['index.html', 'styles.css', 'data.js', 'body.js', 'engine.js', 'exercises2.js', 'recovery.js', 'analytics.js', 'xlsx.js', 'exportdata.js', 'account.js', 'staff.js', 'parser.js', 'nutrition.js', 'guide.js', 'planner.js', 'backup.js', 'app.js', 'sw.js', 'manifest.webmanifest', 'version.json'];
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
for (const f of FILES) fs.copyFileSync(f, path.join(out, f));
fs.cpSync('icons', path.join(out, 'icons'), { recursive: true });
fs.cpSync('fonts', path.join(out, 'fonts'), { recursive: true });
fs.cpSync('img', path.join(out, 'img'), { recursive: true });
fs.writeFileSync(path.join(out, '.nojekyll'), '');

/* Versione per la palestra (senza dieta): stessa app, altro nome, altri dati (chiave di archiviazione diversa) */
if (path.basename(out) === '_site') {
  const g = path.join(out, 'gym'); fs.mkdirSync(g, { recursive: true });
  let server = null; try { server = JSON.parse(fs.readFileSync('gym-config.json', 'utf8')).server || null; } catch (e) { }
  const cfg = '<script>window.FORMA_GYM = ' + JSON.stringify({ name: 'THE LIFTING ZONE', tag: 'TRAIN · LIFT · REPEAT', key: 'tlz.v1', server }) + ';</script>\n';
  for (const f of FILES) {
    let t = fs.readFileSync(f, 'utf8');
    if (f === 'index.html') t = t.replace('<script src="data.js">', cfg + '<script src="data.js">').replace(/<title>.*?<\/title>/, '<title>THE LIFTING ZONE</title>').replace('content="#05070c"', 'content="#0b0b0d"').replace('icons/icon.svg', 'icons/gym/icon.svg').replace('icons/apple-touch-icon.png', 'icons/gym/icon-192.png');
    if (f === 'sw.js') t = t.replace("'forgia-", "'tlz-").replace("'icons/icon.svg'", "'icons/gym/icon.svg'").replace("'icons/mark.png', 'icons/icon-192.png', 'icons/icon-512.png'", "'icons/gym/mark.png', 'icons/gym/icon-192.png', 'icons/gym/icon-512.png'");
    if (f === 'manifest.webmanifest') { const m = JSON.parse(t); m.name = 'THE LIFTING ZONE'; m.short_name = 'LIFTING ZONE'; m.description = 'La tua scheda di allenamento'; m.background_color = '#0b0b0d'; m.theme_color = '#e11d2e'; m.icons = [{ src: 'icons/gym/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icons/gym/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }, { src: 'icons/gym/icon.svg', sizes: 'any', type: 'image/svg+xml' }]; t = JSON.stringify(m, null, 1); }
    fs.writeFileSync(path.join(g, f), t);
  }
  fs.cpSync('icons', path.join(g, 'icons'), { recursive: true }); fs.cpSync('img', path.join(g, 'img'), { recursive: true }); fs.cpSync('fonts', path.join(g, 'fonts'), { recursive: true });
  console.log('Versione palestra in', g);
}
console.log('Web app copiata in', out);
