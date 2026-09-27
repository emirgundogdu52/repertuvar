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
const CACHE_NAME = 'repertuvar-v519';

// (2026-09-27, Offline Düzeltme 2) DEPLOY SONRASI OFFLINE KAYBI KAPATILDI.
// Eskiden burada yalnız '/' ve '/index.html' vardı ve activate eski önbelleği
// körü körüne siliyordu: her deploy'da CACHE_NAME değiştiği için sahne sayfası,
// repertuvarlar vb. o cihazda YENİDEN ONLINE açılana kadar offline açılmıyordu.
// Artık (1) kullanıcı sayfalarının tamamı + betikleri + stil + logolar kurulumda
// indiriliyor, (2) activate eski önbellekte olup yenisinde olmayan her şeyi
// (ör. ritim sesleri, kurulumda inmeyen bir dosya) taşıyıp SONRA siliyor.
// paylas.html BİLEREK yok: misafir sayfası önbelleğe alınmasın diye tasarlandı.
// Yeni bir sayfa/betik eklenirse buraya da eklenmeli.
const PRECACHE = [
  '/', '/index.html',
  // sayfalar
  '/stage.html', '/repertoires.html', '/eserler.html', '/calisma.html',
  '/ritim-kes.html', '/gruplar.html', '/mesajlar.html', '/ayarlar.html',
  '/artiesten.html', '/onerilerim.html', '/login.html', '/reset-password.html',
  '/splash.html',
  // betikler ve stil (soundtouch.js calisma.html'de dinamik import ile yükleniyor)
  '/auth.js', '/db.js', '/i18n.js', '/topnav.js', '/repertoires.js', '/secici.js',
  '/metronom.js', '/ritimcalar.js', '/ses.js', '/dongu.js', '/zamanlayici.js',
  '/qrcode.min.js', '/soundtouch.js', '/style.css',
  // görseller ve manifest
  '/manifest.json', '/Repertuvar_logo.png', '/logo_dark.png', '/logo_light.png',
  '/pwa-192.png', '/pwa-512.png', '/assets/pedal-foto.png',
];

// ── INSTALL: uygulama kabuğunu önbelleğe al ──
// Dosya dosya indiriliyor: addAll tek bir 404'te HİÇBİR ŞEYİ yazmıyordu (ve hata
// yutuluyordu). `cache: 'reload'` tarayıcının HTTP önbelleğini atlar — yeni
// sürümün önbelleğine eski dosya girmesin. Başarısız dosya kurulumu bozmaz;
// activate eski önbellekteki kopyasını taşır.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(PRECACHE.map((url) =>
        fetch(url, { cache: 'reload' }).then((res) => {
          if (res && res.ok && res.type === 'basic') return cache.put(url, res);
          throw new Error(url + ' ' + (res && res.status));
        })
      )))
      .then((sonuc) => {
        const hata = sonuc.filter((s) => s.status === 'rejected').length;
        if (hata) console.warn('[SW] önbelleğe alınamayan dosya:', hata, '/', PRECACHE.length);
      })
      .then(() => self.skipWaiting()) // yeni SW beklemeden aktifleşsin
  );
});

// ── ACTIVATE: eski önbellekten eksikleri taşı, SONRA sil; sekmeleri devral ──
async function eskiOnbellegiTasi() {
  const yeni = await caches.open(CACHE_NAME);
  const adlar = (await caches.keys()).filter((k) => k !== CACHE_NAME);
  for (const ad of adlar) {
    // Yalnız bu uygulamanın önbellekleri taşınır; başka bir şey varsa yalnız silinir.
    if (ad.indexOf('repertuvar-') === 0) {
      try {
        const eski = await caches.open(ad);
        for (const istek of await eski.keys()) {
          if (await yeni.match(istek)) continue;          // yenisi varsa ona dokunma
          const yanit = await eski.match(istek);
          if (yanit) await yeni.put(istek, yanit);
        }
      } catch (e) { console.warn('[SW] taşıma hatası:', ad, e); }
    }
    await caches.delete(ad);
  }
}
self.addEventListener('activate', (event) => {
  event.waitUntil(
    eskiOnbellegiTasi()
      .catch((e) => console.warn('[SW] activate:', e))
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
    .catch(() => caches.match(request).then((c) => {
      if (c) return c;
      // (2026-09-27) calisma.html?sekme=… / repertoires.html?rep=… gibi
      // parametreli sayfalar önbellekteki parametresiz kopyayla eşleşsin.
      const gezinme = request.mode === 'navigate' || request.destination === 'document';
      return (gezinme ? caches.match(request, { ignoreSearch: true }) : Promise.resolve(undefined))
        .then((c2) => c2 || cevrimdisiYanit(request));
    }));
}

// Ne ağ ne önbellek varken dönecek son çare. Boş bir hata yerine anlamlı
// bir yanıt: gezinme isteğiyse kısa bir sayfa, değilse 503.
function cevrimdisiYanit(request) {
  const gezinme = request.mode === 'navigate' || request.destination === 'document';
  if (gezinme) {
    // (2026-09-27) DİL: service worker i18n.js'e ve localStorage'a erişemez;
    // tarayıcı dili Türkçe değilse İngilizce (i18n.js'teki varsayılan kuralla aynı).
    let tr = true;
    try { tr = ((self.navigator && self.navigator.language) || 'tr').slice(0, 2).toLowerCase() === 'tr'; } catch (e) {}
    const metin = tr
      ? '<b>Çevrimdışısınız</b><br>Bu sayfa henüz kaydedilmemiş.<br>Bağlantı gelince tekrar deneyin.'
      : '<b>You are offline</b><br>This page has not been saved on this device yet.<br>Please try again when you are back online.';
    return new Response(
      '<!DOCTYPE html><html lang="' + (tr ? 'tr' : 'en') + '"><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<body style="margin:0;background:#0b0f18;color:#dfe6f2;' +
      'font:15px/1.6 -apple-system,system-ui,sans-serif;display:flex;' +
      'align-items:center;justify-content:center;height:100vh;text-align:center">' +
      '<div>' + metin + '</div></body>',
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
