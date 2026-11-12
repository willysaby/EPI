/* Service worker : permet d'ouvrir l'app EPI même sans réseau.
   Les fichiers du site sont gardés sur le téléphone ; une version plus récente
   est téléchargée en arrière-plan et utilisée à l'ouverture suivante. */
const CACHE = 'epi-v1';
const FICHIERS = ['./', './index.html', './manifest.json', './logo.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(FICHIERS.map(f => c.add(f).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(cles => Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // Seuls les fichiers du site sont concernés (jamais les appels au Google Sheet)
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const enCache = await c.match(req, { ignoreSearch: true });
    const reseau = fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
    if (enCache) { e.waitUntil(reseau); return enCache; }
    const r = await reseau;
    if (r) return r;
    if (req.mode === 'navigate') return (await c.match('./index.html')) || (await c.match('./')) || Response.error();
    return Response.error();
  }));
});
