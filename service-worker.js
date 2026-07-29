// ═══════════════════════════════════════════════════════════════
// Repertuvar — Service Worker
//
// KRİTİK DEĞİŞİKLİK: JS ve CSS dosyaları artık NETWORK-FIRST.
// Eski davranış (cache-first) yüzünden push edilen yeni auth.js/db.js/
// repertoires.js kullanıcıya hiç ulaşmıyordu — SW cache'deki eski sürümü
// sunuyordu. Artık kod dosyaları her zaman önce ağdan alınır (güncel kalır),
// ağ yoksa cache'e düşülür (offline çalışma korunur).
//
// Strateji özeti:
//   • HTML, JS, CSS  → network-first (güncel kalması kritik)
//   • Görsel/font/diğer statikler → cache-first (nadiren değişir, hız için)
//   • Supabase/API istekleri → SW'ye hiç uğramaz (her zaman canlı)
// ═══════════════════════════════════════════════════════════════

// Her deploy'da bu numarayı artır (ya da deploy script'in otomatik bump etsin).
const CACHE_NAME = 'repertuvar-v256';

// Açılışta öncelikli önbelleğe alınacak çekirdek dosyalar.
const PRECACHE = [
  '/',
  '/index.html',
];

// ── INSTALL: çekirdek dosyaları önbelleğe al, yeni SW'yi hemen beklet ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting()) // yeni SW beklemeden aktifleşsin
  );
});

// ── ACTIVATE: eski cache'leri sil, tüm sekmeleri hemen devral ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim()) // açık sekmeler yeni SW'yi hemen kullansın
  );
});

// Yardımcı: network-first — önce ağ, başarısızsa cache.
function networkFirst(request) {
  return fetch(request, { cache: 'no-store' })
    .then((res) => {
      // Başarılı yanıtı cache'e yaz (offline için)
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(request, copy)).catch(() => {});
      }
      return res;
    })
    .catch(() => caches.match(request)); // ağ yok → cache'ten ver
}

// Yardımcı: cache-first — önce cache, yoksa ağdan al ve cache'le.
function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(request, copy)).catch(() => {});
      }
      return res;
    });
  });
}

// ── FETCH ──
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Sadece GET isteklerini ele al
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // Supabase / API / farklı origin istekleri: SW'ye uğratma, doğrudan ağa gitsin.
  // (Auth, veri fetch'leri her zaman canlı olmalı; cache'lenmemeli.)
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/')) return;

  const path = url.pathname;
  const isHTML = req.mode === 'navigate' || req.destination === 'document' || path.endsWith('.html');
  const isCode = path.endsWith('.js') || path.endsWith('.css');

  // HTML + kod dosyaları → network-first (GÜNCEL kalması kritik)
  if (isHTML || isCode) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Görsel, font, manifest vb. → cache-first (nadiren değişir, hız için)
  event.respondWith(cacheFirst(req));
});

// Sayfa "hemen güncelle" isterse (opsiyonel): postMessage ile skipWaiting tetikle.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
