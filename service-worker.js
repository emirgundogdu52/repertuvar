// Repertuvar Service Worker — offline cache
const CACHE_NAME = 'repertuvar-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/eserler.html',
  '/repertoires.html',
  '/artiesten.html',
  '/stage.html',
  '/ayarlar.html',
  '/auth.js',
  '/topnav.js',
  '/db.js',
  '/manifest.json',
  '/logo_dark.png',
  '/logo_light.png',
  '/logo_slogan_dark.png',
  '/logo_slogan_light.png',
  '/Repertuvar_logo.png',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css',
];

// Kurulum — statik dosyaları cache'e al
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll kısmen başarısız:', err);
      });
    })
  );
  self.skipWaiting();
});

// Aktivasyon — eski cache'leri temizle
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch stratejisi
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Supabase API isteklerini cache'leme — direkt network
  if (url.hostname.includes('supabase.co')) return;

  // Sadece GET
  if (e.request.method !== 'GET') return;

  // HTML sayfaları: cache-first (offline için)
  if (e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const networkFetch = fetch(e.request).then((response) => {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, cloned));
          }
          return response;
        }).catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  // Diğer statik dosyalar: network-first, cache fallback
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        if (response && response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, cloned));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
