// Repertuvar Service Worker — offline cache
// NOT: Her önemli deploy'da CACHE_NAME'i artır (v8 → v9 → v10...) — bu, eski Service Worker'ı
// zorla devre dışı bırakıp yenisini aktive eder. Aksi halde kullanıcıların tarayıcısında
// haftalarca eski Service Worker aktif kalabilir ve yeni dosyaları hiç görmeyebilirler.
const CACHE_NAME = 'repertuvar-v118';
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

  // HTML sayfaları: network-first (her zaman taze, offline fallback)
  // cache:'no-store' → tarayıcının kendi HTTP cache'ini de atlar, gerçekten sunucudan ister
  if (e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).then((response) => {
        if (response && response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, cloned));
        }
        return response;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Diğer statik dosyalar: network-first, cache fallback
  // cache:'no-store' → tarayıcının kendi HTTP cache'ini de atlar, gerçekten sunucudan ister
  e.respondWith(
    fetch(e.request, { cache: 'no-store' })
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
