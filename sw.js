// نور المعرفة — Service Worker v5.0 (Clean)
const CACHE_VERSION = 'noor-v5.3.0-ICONS';
const STATIC_CACHE = CACHE_VERSION + '-static';
const DATA_CACHE = CACHE_VERSION + '-data';

const PRECACHE_ICONS = [
  './icons/icon-192.png','./icons/icon-512.png',
  './icons/icon-maskable-192.png','./icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png','./icons/favicon-32.png',
  './icons/favicon.ico','./manifest.json'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STATIC_CACHE).then(c => c.addAll(PRECACHE_ICONS).catch(()=>{})));
});


// ═══ تثبيت فوري ═══
self.addEventListener('install', (e) => {
  console.log('[SW] Installing v5...');
  e.waitUntil(self.skipWaiting());
});

// ═══ تنشيط — حذف كل الكاش القديم ═══
self.addEventListener('activate', (e) => {
  console.log('[SW] Activating v5...');
  e.waitUntil(
    caches.keys()
      .then(keys => {
        console.log('[SW] حذف الكاش القديم:', keys.length, 'ملف');
        return Promise.all(
          keys
            .filter(k => !k.startsWith(CACHE_VERSION))
            .map(k => caches.delete(k))
        );
      })
      .then(() => self.clients.claim())
      .then(() => {
        console.log('[SW] v5 جاهز — كل الكاش القديم محذوف');
      })
  );
});

// ═══ اعتراض الطلبات ═══
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // تجاهل الخارجي
  if (url.origin !== self.location.origin) return;
  
  // تجاهل غير GET — لا تخزين
  if (e.request.method !== 'GET') return;
  
  // ❌ تجاهل api-send.json و api-tafsir.json — لا تخزين
  if (url.pathname.includes('api-send.json') || 
      url.pathname.includes('api-tafsir.json') ||
      url.pathname.includes('api-random.json')) {
    return; // مرر عادي (سيُرفض من Cloudflare — لكن الكود لا يستدعيها الآن)
  }
  
  // JSON → Cache First
  if (url.pathname.endsWith('.json')) {
    e.respondWith(cacheFirst(e.request, DATA_CACHE));
    return;
  }
  
  // الباقي → Network First (للتحديث التلقائي)
  e.respondWith(networkFirst(e.request, STATIC_CACHE));
});

// ═══ Cache First ═══
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  
  try {
    const res = await fetch(req);
    if (res.ok && res.status === 200) {
      cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    return new Response(JSON.stringify({error: 'offline'}), {
      status: 503,
      headers: {'Content-Type': 'application/json'}
    });
  }
}

// ═══ Network First (للتحديث) ═══
async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const res = await fetch(req);
    if (res.ok) {
      cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) return cached;
    return new Response('Offline', {status: 503});
  }
}

// ═══ رسائل ═══
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
  if (e.data === 'CLEAR_ALL_CACHE') {
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => console.log('[SW] كل الكاش محذوف'));
  }
});
