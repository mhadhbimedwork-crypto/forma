const V = 'forgia-v8';
const FILES = ['./', 'index.html', 'styles.css', 'data.js', 'body.js', 'engine.js', 'exercises2.js', 'parser.js', 'nutrition.js', 'guide.js', 'backup.js', 'app.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/mark.png', 'icons/icon-192.png', 'icons/icon-512.png', 'fonts/chakra-petch-latin-600-italic.woff2', 'fonts/chakra-petch-latin-700-italic.woff2', 'fonts/chakra-petch-latin-700-normal.woff2', 'fonts/inter-latin-400-normal.woff2', 'fonts/inter-latin-600-normal.woff2', 'fonts/inter-latin-800-normal.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.includes('/api/') || u.pathname.endsWith('version.json')) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
