// Copia i file web dell'app in una cartella di output (default: www). Usato da Pages e da Capacitor.
const fs = require('fs'), path = require('path');
const out = path.resolve(process.argv[2] || 'www');
const FILES = ['index.html', 'styles.css', 'data.js', 'body.js', 'engine.js', 'exercises2.js', 'parser.js', 'nutrition.js', 'guide.js', 'planner.js', 'backup.js', 'app.js', 'sw.js', 'manifest.webmanifest', 'version.json'];
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
for (const f of FILES) fs.copyFileSync(f, path.join(out, f));
fs.cpSync('icons', path.join(out, 'icons'), { recursive: true });
fs.cpSync('fonts', path.join(out, 'fonts'), { recursive: true });
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log('Web app copiata in', out);
