// نور المعرفة — Service Worker (Static)
const CACHE_VERSION = 'noor-v1.0.0';
const STATIC_CACHE = CACHE_VERSION + '-static';
const DATA_CACHE = CACHE_VERSION + '-data';
const API_CACHE = CACHE_VERSION + '-api';

self.addEventListener('install', (e) => {
  console.log('[SW] Installing...');
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (e) => {
  console.log('[SW] Activating...');
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => !k.startsWith(CACHE_VERSION)).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;
  
  if (url.pathname.endsWith('.json')) {
    e.respondWith(cacheFirst(e.request, DATA_CACHE));
    return;
  }
  
  e.respondWith(cacheFirst(e.request, STATIC_CACHE));
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return new Response('{"error": "offline"}', {
      status: 503,
      headers: {'Content-Type': 'application/json'}
    });
  }
}
