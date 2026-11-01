// abonelik.js — Repertuvar Pro: durum, kilit, mağaza satın alma (2026-10-17)
//
// TEK DOĞRU KAYNAK sunucu: rpc/abonelik_durumu() (abonelikler tablosu → plan_of).
// RevenueCat yalnız mağaza köprüsü: satın alma / geri yükleme / fiyatlar. Satın almadan
// sonra Edge Function `abonelik` çağrılır; webhook gecikse de Pro hemen açılır.
//
// KİLİT (D2): Pro yoksa sayfalar pro.html'e yönlenir (muaf sayfalar hariç).
//   * iOS/Android derlemesinde HER ZAMAN (inceleme bu derlemeyle yapılır).
//   * Web'de yalnız sunucu `zorunlu_web` true ise (lansman günü açılır).
//   * LOCAL-FIRST: ağ hatası, zaman aşımı, çevrimdışı ASLA kilitlemez; son bilinen
//     durum geçerli. Önbellek yoksa da kilitlemez (bkz. hafıza: local-first-auth-rule).
//
// auth.js bu dosyayı kendisi yükler (tek tek sayfaya <script> eklemeye gerek yok).
(function () {
  'use strict';
  if (window.Pro) return;

  var RC_ANAHTAR = { ios: 'appl_nVHBzRapCVZKVwFiJmGmxgphPlA', android: 'goog_CejAUjImYpbMQjeQBaOFSZVqKUw' };   // açık SDK anahtarları (gizli değil)
  var ONBELLEK = 'r_abonelik';
  var MUAF = window.PRO_MUAF || ['pro.html', 'ayarlar.html', 'yardim.html', 'login.html', 'reset-password.html', 'google-donus.html',
              'splash.html', '404.html', 'paylas.html'];   // asıl liste auth.js'te (perde de onu kullanır)
  var YONETIM = {
    ios: 'https://apps.apple.com/account/subscriptions',
    android: 'https://play.google.com/store/account/subscriptions?package=app.repertuvar'
  };

  function platform() {
    var C = window.Capacitor;
    return (C && C.isNativePlatform && C.isNativePlatform()) ? C.getPlatform() : 'web';
  }
  function sayfa() { return (location.pathname.split('/').pop() || 'index.html'); }
  function uid() { try { return (typeof getUserId === 'function' && getUserId()) || null; } catch (e) { return null; } }
  function P() { var C = window.Capacitor; return C && C.Plugins && C.Plugins.Purchases; }

  // ── Durum ───────────────────────────────────────────────────────────────
  function onbellek() {
    try {
      var d = JSON.parse(localStorage.getItem(ONBELLEK) || 'null');
      return (d && d._u === uid()) ? d : null;     // başka hesabın durumu kullanılmaz
    } catch (e) { return null; }
  }
  function onbellegeYaz(d) {
    try { localStorage.setItem(ONBELLEK, JSON.stringify(Object.assign({}, d, { _t: Date.now(), _u: uid() }))); } catch (e) {}
  }
  function proMu(d) { return !!d && (d.plan === 'pro' || d.plan === 'edu'); }
  function zorunluMu(d) { return platform() !== 'web' || !!(d && d.zorunlu_web); }

  var _tazeleSoz = null;
  function durumTazele() {
    if (_tazeleSoz) return _tazeleSoz;
    _tazeleSoz = fetch(SUPA_URL + '/rest/v1/rpc/abonelik_durumu', {
      method: 'POST', headers: authHeaders(), body: '{}', signal: AbortSignal.timeout(8000)
    }).then(function (r) {
      if (!r.ok) throw new Error('abonelik_durumu ' + r.status);
      return r.json();
    }).then(function (d) { onbellegeYaz(d); return d; })
      .finally(function () { _tazeleSoz = null; });
    return _tazeleSoz;
  }

  // ── Kilit ───────────────────────────────────────────────────────────────
  function kilitle() {
    location.replace('pro.html?donus=' + encodeURIComponent(sayfa() + location.search));
  }
  // auth.js'in perdesi (durum bilinmeden sayfa görünmesin): karar verilince kalkar; kilitte sayfa zaten değişir.
  function perdeKaldir() { document.documentElement.removeAttribute('data-pro-perde'); }
  var _kontrolEdildi = false;
  async function kontrol() {
    if (_kontrolEdildi || !uid() || MUAF.indexOf(sayfa()) !== -1) { if (!_kontrolEdildi) perdeKaldir(); return; }
    _kontrolEdildi = true;
    var c = onbellek();
    if (c && zorunluMu(c) && !proMu(c)) { kilitle(); return; }
    try {
      var d = await durumTazele();
      if (zorunluMu(d) && !proMu(d)) { kilitle(); return; }
    } catch (e) { /* ağ hatası: kilitleme yok (local-first) */ }
    perdeKaldir();
    if (platform() !== 'web') rcHazirla().catch(function () {});
  }

  // ── RevenueCat (yalnız iOS/Android) ─────────────────────────────────────
  var _rcSoz = null, _rcKullanici = null;
  function rcHazirla() {
    if (platform() === 'web') return Promise.reject(new Error('web'));
    if (!P()) return Promise.reject(new Error('eklenti-yok'));
    var anahtar = RC_ANAHTAR[platform()];
    if (!anahtar) return Promise.reject(new Error('anahtar-yok'));
    var kim = uid();
    if (!kim) return Promise.reject(new Error('oturum-yok'));
    if (_rcSoz && _rcKullanici === kim) return _rcSoz;
    _rcKullanici = kim;
    _rcSoz = (async function () {
      var yapili = false;
      try { yapili = !!(await P().isConfigured()).isConfigured; } catch (e) {}
      if (!yapili) await P().configure({ apiKey: anahtar, appUserID: kim });
      else await P().logIn({ appUserID: kim });   // anonim kullanıcı oluşmasın: daima Supabase kimliği
      return true;
    })().catch(function (e) { _rcSoz = null; _rcKullanici = null; throw e; });
    return _rcSoz;
  }

  // Satın alma ekranı için paketler: yıllık, 6 aylık, aylık + HER PLANIN deneme uygunluğu.
  // (2026-10-17 karar B, kullanıcı: "bir ay kullansın, memnun kalırsa ödesin") — 1 ay ücretsiz deneme ÜÇ PLANDA da var;
  // eskiden (karar A) yalnız aylıkta. Apple denemeyi grup başına bir kez verir; uygunluk ürün ürün sorulur.
  async function teklifler() {
    await rcHazirla();
    var o = await P().getOfferings();
    var cur = o && o.current;
    if (!cur) throw new Error('teklif-yok');
    var paketler = { yillik: cur.annual, alti: cur.sixMonth, aylik: cur.monthly };
    // Deneme tanımlı mı: iOS'ta tanıtım teklifi (introPrice), Play'de varsayılan seçeneğin ücretsiz evresi
    var denemeli = function (pk) {
      var pr = pk && pk.product;
      return !!(pr && (pr.introPrice || (pr.defaultOption && pr.defaultOption.freePhase)));
    };
    var denemeler = { yillik: false, alti: false, aylik: false };
    var adaylar = Object.keys(paketler).filter(function (k) { return denemeli(paketler[k]); });
    if (adaylar.length) {
      if (platform() === 'ios') {
        try {
          var kimlikler = adaylar.map(function (k) { return paketler[k].product.identifier; });
          var m = await P().checkTrialOrIntroductoryPriceEligibility({ productIdentifiers: kimlikler });
          adaylar.forEach(function (k) {
            var s = m && m[paketler[k].product.identifier];
            denemeler[k] = !!s && s.status === 2;   // 2 = INTRO_ELIGIBILITY_STATUS_ELIGIBLE; bilinmiyorsa deneme gösterilmez
          });
        } catch (e) { /* hepsi false kalır */ }
      } else {
        adaylar.forEach(function (k) { denemeler[k] = true; });   // Play yalnız uygun olduğu teklifi döndürür
      }
    }
    var deneme = denemeler.yillik || denemeler.alti || denemeler.aylik;
    return { paketler: paketler, deneme: deneme, denemeler: denemeler };
  }

  async function esitle() {
    var r = await fetch(SUPA_URL + '/functions/v1/abonelik', {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ islem: 'esitle' }), signal: AbortSignal.timeout(15000)
    });
    if (!r.ok) throw new Error('esitle ' + r.status);
    return r.json();
  }

  // Mağaza "Pro var" dediği hâlde sunucu henüz yazmadıysa (webhook/fonksiyon gecikmesi)
  // bu oturum için geçici olarak Pro kabul edilir; sunucu sonra kesinleştirir.
  function rcProVar(ci) { return !!(ci && ci.entitlements && ci.entitlements.active && ci.entitlements.active.pro); }
  async function sonucuIsle(ci) {
    try { await esitle(); } catch (e) {}
    var d = null;
    for (var i = 0; i < 3; i++) {
      try { d = await durumTazele(); } catch (e) {}
      if (proMu(d)) break;
      await new Promise(function (ok) { setTimeout(ok, 1500); });
    }
    if (!proMu(d) && rcProVar(ci)) {
      d = Object.assign({}, d || {}, { plan: 'pro', _gecici: true });
      onbellegeYaz(d);
    }
    return d;
  }

  async function satinAl(paket) {
    await rcHazirla();
    var sonuc;
    try { sonuc = await P().purchasePackage({ aPackage: paket }); }
    catch (e) {
      if (e && (String(e.code) === '1' || e.userCancelled)) return { iptal: true };
      if (e && String(e.code) === '20') return { bekliyor: true };
      throw e;
    }
    var d = await sonucuIsle(sonuc && sonuc.customerInfo);
    return { tamam: proMu(d), durum: d };
  }

  // Aylık aboneyi yıllığa geçir (kullanıcı isteği 2026-10-17). Geçiş DÖNEM SONUNDA başlar:
  //   iOS: grup seviyeleri (Aylık 1 > Yıllık 2) → Apple bunu "alt seviyeye geçiş" sayar, yenilemede başlatır.
  //   Android: DEFERRED değiştirme modu (aynı davranış). Android'de oldProductIdentifier biçimi testte doğrulanacak.
  var BEKLEYEN = 'r_yillik_bekliyor';
  function yilligaGecisBekliyor() {
    try { var b = JSON.parse(localStorage.getItem(BEKLEYEN) || 'null'); return !!b && b.u === uid() && (Date.now() - b.t) < 40 * 86400000; }
    catch (e) { return false; }
  }
  async function yillikTeklif() {
    var t = await teklifler();
    var y = t.paketler.yillik, m = t.paketler.aylik;
    if (!y) throw new Error('teklif-yok');
    var tasarruf = (m && m.product && m.product.price) ? Math.round((1 - y.product.price / (m.product.price * 12)) * 100) : 0;
    return { paket: y, fiyat: y.product.priceString, tasarruf: tasarruf };
  }
  async function yilligaGec(mevcutUrun) {
    await rcHazirla();
    var y = await yillikTeklif();
    var secenek = { aPackage: y.paket };
    if (platform() === 'android' && mevcutUrun) {
      secenek.storeProductChangeInfo = { oldProductIdentifier: String(mevcutUrun).split(':')[0], replacementMode: 'DEFERRED' };
    }
    try { await P().purchasePackage(secenek); }
    catch (e) {
      if (e && (String(e.code) === '1' || e.userCancelled)) return { iptal: true };
      if (e && String(e.code) === '20') return { bekliyor: true };
      throw e;
    }
    try { localStorage.setItem(BEKLEYEN, JSON.stringify({ u: uid(), t: Date.now() })); } catch (e) {}
    try { await esitle(); } catch (e) {}
    return { tamam: true };
  }

  async function geriYukle() {
    await rcHazirla();
    var r = await P().restorePurchases();
    var d = await sonucuIsle(r && r.customerInfo);
    return { tamam: proMu(d), durum: d };
  }

  async function yonetimAdresi() {
    try {
      await rcHazirla();
      var r = await P().getCustomerInfo();
      if (r && r.customerInfo && r.customerInfo.managementURL) return r.customerInfo.managementURL;
    } catch (e) {}
    return YONETIM[platform()] || null;
  }

  // "Aboneliği yönet": iOS'ta Apple'ın uygulama içi penceresi (yerel Magaza eklentisi — web adresi
  // sandbox aboneliklerini göstermiyor, inceleme sandbox'ta yapılır); yoksa mağazanın adresi.
  // Varlık kontrolü şart: kayıtsız eklentiye yapılan çağrının promise'i iOS'ta dönmüyor.
  async function yonet() {
    var C = window.Capacitor;
    if (platform() === 'ios' && C && C.isPluginAvailable && C.isPluginAvailable('Magaza')) {
      try { await C.Plugins.Magaza.abonelikleriYonet(); return 'pencere'; } catch (e) { /* adrese düş */ }
    }
    var url = await yonetimAdresi();
    if (url) { window.open(url, '_blank'); return 'adres'; }
    return null;
  }

  // Hesap silinmeden önce RevenueCat müşteri kaydı (Gizlilik §6–7). Hata silmeyi engellemez.
  async function rcSil() {
    try {
      var r = await fetch(SUPA_URL + '/functions/v1/abonelik', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ islem: 'sil' }), signal: AbortSignal.timeout(10000)
      });
      return r.ok;
    } catch (e) { return false; }
  }

  window.Pro = {
    platform: platform, onbellek: onbellek, durumTazele: durumTazele, proMu: proMu, zorunluMu: zorunluMu,
    kontrol: kontrol, rcHazirla: rcHazirla, teklifler: teklifler, satinAl: satinAl, geriYukle: geriYukle,
    esitle: esitle, yonetimAdresi: yonetimAdresi, yonet: yonet, rcSil: rcSil,
    yillikTeklif: yillikTeklif, yilligaGec: yilligaGec, yilligaGecisBekliyor: yilligaGecisBekliyor
  };

  window.addEventListener('authReady', kontrol);
  if (uid()) setTimeout(kontrol, 0);
})();
