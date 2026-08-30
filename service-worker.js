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
const CACHE_NAME = 'repertuvar-v444';

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
    // (2026-08-26) `caches.match` KAYIT YOKSA undefined DÖNER ve
    // respondWith(undefined) Safari'de "FetchEvent.respondWith received an
    // error" üretir. Artık her durumda GEÇERLİ bir Response dönüyoruz.
    .catch(() => caches.match(request).then((c) => c || cevrimdisiYanit(request)));
}

// Ne ağ ne önbellek varken dönecek son çare. Boş bir hata yerine anlamlı
// bir yanıt: gezinme isteğiyse kısa bir sayfa, değilse 503.
function cevrimdisiYanit(request) {
  const gezinme = request.mode === 'navigate' || request.destination === 'document';
  if (gezinme) {
    return new Response(
      '<!DOCTYPE html><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<body style="margin:0;background:#0b0f18;color:#dfe6f2;' +
      'font:15px/1.6 -apple-system,system-ui,sans-serif;display:flex;' +
      'align-items:center;justify-content:center;height:100vh;text-align:center">' +
      '<div><b>Çevrimdışısınız</b><br>Bu sayfa henüz kaydedilmemiş.<br>' +
      'Bağlantı gelince tekrar deneyin.</div></body>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
  return new Response('', { status: 503, statusText: 'Cevrimdisi' });
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
    })
    // (2026-08-26) CATCH EKLENDİ. Yoktu: önbellekte olmayan bir dosya için ağ
    // isteği reddedilince söz reddediliyor ve respondWith hata alıyordu —
    // Safari'nin "FetchEvent.respondWith received an error" mesajı buradan
    // geliyordu.
    .catch(() => cevrimdisiYanit(request));
  });
}

// ── FETCH ──
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Sadece GET isteklerini ele al
  if (req.method !== 'GET') return;

  // (2026-08-30) RANGE İSTEKLERİ SW'YE UĞRAMASIN.
  // Safari ses/video için dosyanın bir ARALIĞINI ister (Range başlığı) ve
  // 206 Partial Content bekler. Önbellekten tam bir 200 yanıtı dönersek
  // Safari bunu reddeder — "FetchEvent.respondWith received an error"
  // mesajının bilinen sebeplerinden biri budur.
  if (req.headers.get('range')) return;

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
