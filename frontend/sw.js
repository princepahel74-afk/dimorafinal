/* DIMORA service worker: the app opens offline and installs like an app.
   Pages and code are fetched fresh when online (so updates show immediately) and fall back to the
   cached copy when offline. API calls are never cached. */
const CACHE = 'dimora-v2.7.0';
const CORE = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/main.js', 'assets/logo.svg', 'manifest.webmanifest',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || (url.origin === location.origin && url.pathname.startsWith('/api/'))) return; // straight to the network
  const sameOrigin = url.origin === location.origin;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque') && (sameOrigin || /fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/.test(url.host))) cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
      if (hit) return hit;
      if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
      throw err;
    }
  })());
});
