// koltuk-lisans.js — Grup/Koro ve Edu koltuk lisansı (2026-11-08). Yalnız gruplar.html, yalnız grup yöneticisi.
//
// Kaynak sunucu: rpc/grup_lisans_durumu (lisans + dolu koltuk + Edu onayı). Satın alma Paddle.js ile,
// YALNIZ web'de ve istemci anahtarı varken (Capacitor paketinde satın alma yok — Apple 3.1.1).
// Ödemeden sonra lisansı `paddle-webhook` yazar; customData {group_id, user_id} onun için.
// Koltuk sayısını değiştirmek şimdilik e-postayla (fiyat kademesi değişebildiği için Paddle panelinden elle).
(function () {
  'use strict';

  // Paddle istemci anahtarı (client-side token, gizli değil). Boşken satın alma görünmez.
  // Canlı: Paddle › Developer tools › Authentication › Client-side tokens (live_…); sandbox: test_…
  // (window.REPERTUVAR_PADDLE_ISTEMCI yalnız yerel denemede/testte anahtarı dışarıdan vermek için.)
  var PADDLE_ISTEMCI = window.REPERTUVAR_PADDLE_ISTEMCI || '';
  var DESTEK = 'support@repertuvar.app';
  // Canlı katalog (08.11): [en az, en çok, fiyat kimliği, koltuk başı €]
  var FIYAT = {
    pro: [[5, 19, 'pri_01m6ygarfvjez65a8tmgmwrwy7', 30], [20, 49, 'pri_01m6ygcbv9szndm7ds2jt0xe55', 25], [50, 999999, 'pri_01m6ygdtyjk3jvr35qx31heqpv', 20]],
    edu: [[5, 19, 'pri_01m6yggt2w55cjdycqsdyng9re', 25], [20, 49, 'pri_01m6ygjqa0zmsqpxr8rfd8xe2c', 20], [50, 999999, 'pri_01m6ygmqa7phhejgbd7nqrmwr3', 15]],
  };

  function t(k, tr) { return (typeof _grCev === 'function') ? _grCev(k, tr) : tr; }
  function webMi() { var C = window.Capacitor; return !(C && C.isNativePlatform && C.isNativePlatform()); }
  function satisAcik() { return webMi() && !!PADDLE_ISTEMCI; }
  function kademe(plan, n) { return (FIYAT[plan] || []).find(function (k) { return n >= k[0] && n <= k[1]; }) || null; }
  function para(n) {
    var dil = (typeof _grTarihDili === 'function') ? _grTarihDili() : 'tr-TR';
    if (/^tr/i.test(dil)) return n.toLocaleString('tr-TR') + ' €';   // TDK: sembol sayıdan sonra (Intl "€30" yazar)
    try { return new Intl.NumberFormat(dil, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n); }
    catch (e) { return n + ' €'; }
  }
  function tarih(s) {
    try { return new Date(s).toLocaleDateString((typeof _grTarihDili === 'function') ? _grTarihDili() : 'tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return s; }
  }
  function el(id) { return document.getElementById(id); }
  // gruplar.html'in üst düzey `let` değişkenleri (window'a bağlı değil, ad ile erişilir)
  function grup() { return (typeof currentGroup !== 'undefined') ? currentGroup : null; }
  function uyeler() { return (typeof currentMembers !== 'undefined' && currentMembers) || []; }
  function mailto(konu) { return 'mailto:' + DESTEK + '?subject=' + encodeURIComponent(konu); }

  var durum = null;   // son grup_lisans_durumu yanıtı

  // Koltuk sayan üye sayısı: Grup/Koro'da herkes, Edu'da yalnız 'member' (öğretmen = yönetici saymaz)
  function sayan(plan) {
    return uyeler().filter(function (m) {
      return (m.status || 'active') === 'active' && (plan === 'pro' || m.role === 'member');
    }).length;
  }

  function ciz() {
    var kutu = el('lisansSection');
    if (!kutu || !durum) return;
    var l = durum.lisans;
    var h = '<div class="section-title" data-i18n="gr.lisansBaslik">' + t('gr.lisansBaslik', 'Koltuk lisansı') + '</div>';
    if (l) {
      var planAd = l.plan === 'edu' ? t('gr.lisansPlanEdu', 'Okul ve kurum (Edu)') : t('gr.lisansPlanPro', 'Grup / Koro');
      h += '<div class="lisans-durum"><b>' + planAd + '</b> · <span id="lisansKoltuk">'
        + t('gr.lisansKoltuk', '{dolu}/{koltuk} koltuk dolu').replace('{dolu}', durum.dolu).replace('{koltuk}', l.koltuk) + '</span></div>';
      var alt = l.durum === 'odeme_sorunu' ? t('gr.lisansOdemeSorunu', 'Ödeme alınamadı. Paddle\'ın gönderdiği e-postadaki bağlantıyla ödeme bilgini güncelle.')
        : l.durum === 'iptal_edildi' ? t('gr.lisansSonGun', 'Lisans {t} tarihinde bitiyor, yenilenmeyecek.').replace('{t}', tarih(l.bitis))
        : l.bitis ? t('gr.lisansYenilenme', 'Yenilenme tarihi: {t}').replace('{t}', tarih(l.bitis)) : '';
      if (alt) h += '<div class="lisans-not">' + alt + '</div>';
      if (durum.dolu > l.koltuk) {
        h += '<div class="lisans-not lisans-uyari">' + t('gr.lisansFazla', 'Koltuk sayısından fazla üye var: son katılan {n} kişi lisanstan yararlanamıyor.')
          .replace('{n}', durum.dolu - l.koltuk) + '</div>';
      }
      if (webMi()) {
        h += '<a class="lisans-baglanti" href="' + mailto('Repertuvar koltuk sayısı') + '">'
          + t('gr.lisansKoltukDegistir', 'Koltuk sayısını değiştirmek için bize yaz') + '</a>';
      }
    } else if (satisAcik()) {
      var eduVar = !!durum.edu_onayli;
      h += '<p class="lisans-not">' + t('gr.lisansYok', 'Grubundaki herkes kendi hesabıyla çalışsın: koltuk başına yıllık lisans.') + '</p>'
        + '<div class="lisans-form">'
        + (eduVar ? '<select class="fi" id="lisansPlan"><option value="pro">' + t('gr.lisansPlanPro', 'Grup / Koro') + '</option>'
                    + '<option value="edu">' + t('gr.lisansPlanEdu', 'Okul ve kurum (Edu)') + '</option></select>'
                  : '<input type="hidden" id="lisansPlan" value="pro">')
        + '<label class="lisans-etiket">' + t('gr.lisansKoltukSayisi', 'Koltuk sayısı')
        + ' <input class="fi" type="number" id="lisansAdet" min="5" max="999" step="1"></label>'
        + '<div class="lisans-fiyat" id="lisansFiyat"></div>'
        + '<div class="lisans-not" id="lisansKural"></div>'
        + '<button class="btn btn-primary" id="lisansAl" type="button">' + t('gr.lisansSatinAl', 'Lisansı satın al') + '</button>'
        + '<div class="lisans-not">' + t('gr.lisansOdemeNotu', 'Ödemeyi Paddle alır; vergi ve para birimi ödeme ekranında görünür. Koltuklar dolunca yeni üye katılamaz.') + '</div>'
        + '</div>';
      if (!eduVar) {
        h += '<a class="lisans-baglanti" href="' + mailto('Repertuvar Edu lisansı') + '">'
          + t('gr.lisansEduBasvuru', 'Okulun ya da kursun için Edu lisansı istiyorsan bize yaz; onaydan sonra burada açılır.') + '</a>';
      }
    } else {
      kutu.style.display = 'none';   // lisans yok ve satın alma bu platformda kapalı: hiç gösterme
      return;
    }
    kutu.innerHTML = h;
    kutu.style.display = '';
    var plan = el('lisansPlan'), adet = el('lisansAdet');
    if (adet) {
      var guncelle = function () {
        var p = plan.value, n = Math.max(5, Math.floor(Number(adet.value) || 0));
        var k = kademe(p, n);
        el('lisansFiyat').textContent = k ? t('gr.lisansFiyat', 'Koltuk başına yıllık {f} · toplam {t}').replace('{f}', para(k[3])).replace('{t}', para(k[3] * n)) : '';
        el('lisansKural').textContent = p === 'edu' ? t('gr.lisansNotEdu', 'Öğretmenler (grup yöneticileri) koltuk saymaz. En az 5 koltuk; yalnız yıllık.')
                                                   : t('gr.lisansNotGrup', 'Yönetici de bir koltuk kullanır. En az 5 koltuk; yalnız yıllık.');
      };
      adet.value = Math.max(5, sayan(plan.value));
      adet.addEventListener('input', guncelle);
      if (plan.tagName === 'SELECT') plan.addEventListener('change', function () { adet.value = Math.max(5, sayan(plan.value)); guncelle(); });
      guncelle();
      el('lisansAl').addEventListener('click', function () { satinAl(plan.value, Math.max(5, Math.floor(Number(adet.value) || 0))); });
    }
  }

  function paddleYukle() {
    if (window.Paddle) return Promise.resolve(window.Paddle);
    return new Promise(function (coz, red) {
      var s = document.createElement('script');
      s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      s.onload = function () { coz(window.Paddle); };
      s.onerror = red;
      document.head.appendChild(s);
    });
  }

  function satinAl(plan, n) {
    var k = kademe(plan, n);
    if (!k || !grup()) return;
    var eposta = null;
    try { eposta = JSON.parse(localStorage.getItem('sb_user') || 'null').email || null; } catch (e) {}
    paddleYukle().then(function (P) {
      if (PADDLE_ISTEMCI.indexOf('test_') === 0) P.Environment.set('sandbox');
      P.Initialize({
        token: PADDLE_ISTEMCI,
        eventCallback: function (e) {
          if (e && e.name === 'checkout.completed') {
            if (typeof toast === 'function') toast(t('gr.lisansTamam', 'Ödeme alındı. Lisans birkaç saniye içinde etkinleşir.'));
            setTimeout(yukle, 5000);
          }
        },
      });
      P.Checkout.open({
        items: [{ priceId: k[2], quantity: n }],
        customData: { group_id: grup().id, user_id: (typeof getUserId === 'function') ? getUserId() : null },
        customer: eposta ? { email: eposta } : undefined,
      });
    }).catch(function () {
      if (typeof toast === 'function') toast(t('gr.lisansHata', 'Ödeme ekranı açılamadı. Bağlantını kontrol edip yeniden dene.'), 'err');
    });
  }

  function yukle() {
    var g = grup();
    if (!g || !el('lisansSection')) return;
    fetch(SUPA_URL + '/rest/v1/rpc/grup_lisans_durumu', {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ p_group_id: g.id }), signal: AbortSignal.timeout(8000),
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d) { durum = d; ciz(); } })
      .catch(function () {});
  }

  window.KoltukLisans = { yukle: yukle, _kademe: kademe };
})();
