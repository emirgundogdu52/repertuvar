// Repertuvar Service Worker — offline cache
const CACHE_NAME = 'repertuvar-v2';
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

// Fetch — önce network, hata olursa cache
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Supabase API isteklerini cache'leme
  if (url.hostname.includes('supabase.co')) return;

  // GET isteklerini cache'le
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Başarılı response'u cache'e yaz
        if (response && response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, cloned));
        }
        return response;
      })
      .catch(() => {
        // Network yok — cache'den sun
        return caches.match(e.request).then((cached) => {
          if (cached) return cached;
          // HTML sayfası isteniyorsa index'e yönlendir
          if (e.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
  );
});
