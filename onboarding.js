/* onboarding.js — 2026-10-07: kayıttan hemen sonra tek ekranlık "Müziğini biraz tanıyalım".
 *
 * ÜÇ EKSEN BİRBİRİNDEN BAĞIMSIZ — karıştırma:
 *   1) Arayüz dili   → profiles.ui_lang (+ localStorage uiLang). Tarayıcı dili yalnız bunu ÖNERİR.
 *   2) Müzik türü    → profiles.music_preferences (text[], SABİT anahtarlar: turkish_folk, rock …).
 *   3) Eser dili     → works.dil ('tr', 'en', …). Türle de arayüz diliyle de ilgisi yok.
 * Örnek: Hollanda'da yaşayan, tarayıcısı İngilizce bir THM icracısı → ui_lang='en',
 * music_preferences={turkish_folk}. Arayüz İngilizce, Türkçe eserler aynen erişilebilir.
 *
 * TERCİH HİÇBİR ŞEYİ GİZLEMEZ. Yalnız öneri/sıralama sinyalidir; ileride Eserler'deki
 * Dil/Tür süzgeçlerinin VARSAYILAN önerisi olabilir (TURLER[].turlar: works.tur eşlemesi).
 *
 * KİME: hesabı son 3 günde açılmış + music_preferences NULL (hiç sorulmamış). Bir kez.
 *   NULL = hiç sorulmadı · '{}' = "Şimdilik geç" · dolu = seçim. Ayarlar → Müzik tercihlerim'den değişir.
 * MEVCUT KULLANICILAR hesapları eski olduğu için hiç görmez; hiçbir şey zorunlu değil.
 * SÜTUN YOKSA (SQL çalıştırılmadıysa) PostgREST 400 döner → modül sessizce hiçbir şey yapmaz.
 * Local-first: ağ hatası kaydı kilitlemez; seçim yerelde bekler, sonraki açılışta yeniden yazılır.
 */
(function () {
  var TURLER = [
    { k: 'turkish_folk',      tr: 'Türk Halk Müziği',         turlar: ['THM'] },
    { k: 'turkish_classical', tr: 'Türk Sanat Müziği',        turlar: ['TSM'] },
    { k: 'turkish_pop',       tr: 'Türkçe Pop',               turlar: ['Türk Pop', 'Arabesk / Fantezi'] },
    { k: 'anatolian_rock',    tr: 'Anadolu Rock',             turlar: ['Türk Rock', 'Özgün Müzik'] },
    { k: 'rock',              tr: 'Rock',                     turlar: ['Yabancı Rock'] },
    { k: 'pop',               tr: 'Pop',                      turlar: ['Yabancı Pop'] },
    { k: 'jazz',              tr: 'Jazz',                     turlar: ['Caz / Blues'] },
    { k: 'classical',         tr: 'Klasik Müzik',             turlar: [] },
    { k: 'world_traditional', tr: 'Dünya / Geleneksel Müzik', turlar: ['Folk', 'Gospel / Hymn', 'Spiritual', 'Sea Shanty', 'Christmas', "Children's Song", 'Parlour Song'] },
    { k: 'other',             tr: 'Diğer',                    turlar: ['Diğer', 'Şiir', 'Türkçe Rap / Hip-Hop'] }
  ];
  var ANAHTARLAR = TURLER.map(function (x) { return x.k; });
  var YENI_GUN = 3;                         // hesap bu kadar gün içinde açıldıysa "yeni"
  var ONBELLEK = 'musicPreferences', BEKLEYEN = 'musicPreferencesBekleyen';

  function t(k, tr) { try { return window.i18n ? window.i18n.t(k, tr) : tr; } catch (e) { return tr; } }
  function ad(k) { var x = TURLER.filter(function (y) { return y.k === k; })[0]; return t('musicGenre.' + k, x ? x.tr : k); }
  function uid() { try { return typeof getUserId === 'function' ? getUserId() : null; } catch (e) { return null; } }
  function jeton() { try { return typeof getToken === 'function' ? getToken() : null; } catch (e) { return null; } }
  function temizle(liste) { return (Array.isArray(liste) ? liste : []).filter(function (k, i, a) { return ANAHTARLAR.indexOf(k) !== -1 && a.indexOf(k) === i; }); }

  function yerelOku() { try { var v = JSON.parse(localStorage.getItem(ONBELLEK) || 'null'); return Array.isArray(v) ? v : null; } catch (e) { return null; } }
  function yerelYaz(liste) { try { localStorage.setItem(ONBELLEK, JSON.stringify(liste)); } catch (e) {} }

  // { sutunVar: bool, deger: array|null } — sütun yoksa 400 → sutunVar=false
  async function sunucudanOku() {
    var u = uid(); if (!u || typeof SUPA_URL === 'undefined') return { sutunVar: false, deger: null };
    var r = await fetch(SUPA_URL + '/rest/v1/profiles?id=eq.' + u + '&select=music_preferences',
      { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + (jeton() || '') } });
    if (r.status === 400) return { sutunVar: false, deger: null };
    if (!r.ok) throw new Error('HTTP ' + r.status);
    var j = await r.json();
    if (!j.length) throw new Error('profil yok');
    return { sutunVar: true, deger: Array.isArray(j[0].music_preferences) ? j[0].music_preferences : null };
  }

  // Satır sayısı doğrulanır (RLS engellerse 0 satır döner, başarıyla karışmasın).
  async function kaydet(liste) {
    liste = temizle(liste); yerelYaz(liste);
    try { localStorage.setItem(BEKLEYEN, JSON.stringify(liste)); } catch (e) {}
    var u = uid(); if (!u) return false;
    var r = await fetch(SUPA_URL + '/rest/v1/profiles?id=eq.' + u + '&select=music_preferences', {
      method: 'PATCH',
      headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + (jeton() || ''), 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ music_preferences: liste })
    });
    var satir = r.ok ? await r.json().catch(function () { return []; }) : [];
    if (!r.ok || !satir.length) return false;
    try { localStorage.removeItem(BEKLEYEN); } catch (e) {}
    return true;
  }

  // Ayarlar'daki dilDegistir ile aynı: yerelde uygula, profile yaz, kendi yazdığını önbelleğe al.
  // (2026-10-08) auth.js'teki sıralı ortak yazıcı: hızlı Türkçe→English tıklamalarında profilde SON seçim kalır.
  function dilYaz(k) {
    if (!window.i18n || !i18n.ayarla(k)) return;
    if (typeof profilDiliniYaz === 'function') profilDiliniYaz(k);
  }

  /* Seçilebilir çipler — onboarding penceresi ve Ayarlar ortak kullanır. */
  function cipler(kap, secili, degisti) {
    function ciz() {
      kap.innerHTML = '';
      TURLER.forEach(function (x) {
        var b = document.createElement('button'), on = secili.indexOf(x.k) !== -1;
        b.type = 'button'; b.className = 'mt-cip' + (on ? ' on' : ''); b.dataset.k = x.k;
        b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.textContent = ad(x.k);
        b.onclick = function () {
          var i = secili.indexOf(x.k); if (i === -1) secili.push(x.k); else secili.splice(i, 1);
          ciz(); if (degisti) degisti(secili.slice());
        };
        kap.appendChild(b);
      });
    }
    ciz();
    window.addEventListener('dil-degisti', ciz);
    return { ciz: ciz, secili: function () { return secili.slice(); },
             ayarla: function (liste) { secili.length = 0; temizle(liste).forEach(function (k) { secili.push(k); }); ciz(); } };
  }

  function stilEkle() {
    if (document.getElementById('mtStil')) return;
    var s = document.createElement('style'); s.id = 'mtStil';
    s.textContent =
      '.mt-cip{display:inline-flex;align-items:center;gap:6px;min-height:42px;padding:9px 16px;border-radius:999px;border:1px solid var(--border);' +
      'background:var(--surface2);color:var(--text);font:inherit;font-size:14px;font-weight:600;line-height:1.2;cursor:pointer;' +
      'transition:background-color .15s ease,border-color .15s ease,color .15s ease;-webkit-tap-highlight-color:transparent}' +
      '.mt-cip:hover{border-color:color-mix(in srgb,var(--accent) 55%,var(--border))}' +
      '.mt-cip.on{background:var(--accent,#FFC83D);border-color:var(--accent,#FFC83D);color:#1a1200}' +
      '.mt-cip.on::before{content:"✓";font-weight:800}' +
      '.mt-cip:focus-visible,.ob-btn:focus-visible,.ob-seg button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}' +
      '.mt-cipler{display:flex;flex-wrap:wrap;gap:8px}' +
      '.ob-arka{position:fixed;inset:0;z-index:10000;background:rgba(4,7,15,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);' +
      'display:flex;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom));overflow-y:auto}' +
      '.ob-kart:focus{outline:none}.ob-kart{width:100%;max-width:560px;margin:auto;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:20px;' +
      'padding:28px 24px 20px;box-shadow:0 30px 70px rgba(0,0,0,.35)}' +
      '.ob-ust{margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--accent)}' +
      '.ob-kart h2{margin:0 0 8px;font-size:22px;line-height:1.3;font-weight:700}' +
      '.ob-acik{margin:0 0 18px;font-size:14px;line-height:1.55;color:var(--text2)}' +
      '.ob-dil{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:20px 0 0;padding-top:16px;border-top:1px solid var(--border)}' +
      '.ob-dil span{font-size:13px;font-weight:600;color:var(--text2)}' +
      '.ob-seg{display:flex;gap:2px;padding:3px;border-radius:10px;background:var(--surface2);border:1px solid var(--border)}' +
      '.ob-seg button{border:0;background:none;font:inherit;font-size:13px;font-weight:600;color:var(--text2);padding:6px 12px;border-radius:8px;cursor:pointer}' +
      '.ob-seg button[aria-pressed="true"]{background:var(--accent);color:#1a1200}' +
      '.ob-btn{display:flex;width:100%;align-items:center;justify-content:center;min-height:48px;margin-top:20px;border:0;border-radius:12px;' +
      'background:var(--accent);color:#1a1200;font:inherit;font-size:15px;font-weight:700;cursor:pointer}' +
      '.ob-btn:disabled{opacity:.45;cursor:default}' +
      '.ob-gec{display:block;margin:10px auto 0;border:0;background:none;font:inherit;font-size:14px;font-weight:600;color:var(--text2);padding:8px 12px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}' +
      '.ob-not{margin:6px 0 0;text-align:center;font-size:12px;color:var(--text3)}' +
      '@media (max-width:480px){.ob-kart{padding:22px 16px 16px;border-radius:18px}.ob-kart h2{font-size:20px}.mt-cip{font-size:13.5px;padding:8px 13px}}' +
      '@media (prefers-reduced-motion:reduce){.mt-cip{transition:none}}';
    document.head.appendChild(s);
  }

  /* Pencere: Devam → seçimi yazar; Şimdilik geç / Esc → '{}' yazar (bir daha sorulmaz). Kayıt KİLİTLENMEZ. */
  function pencere() {
    stilEkle();
    var secili = temizle(yerelOku() || []);
    var arka = document.createElement('div'); arka.className = 'ob-arka';
    arka.innerHTML =
      '<div class="ob-kart" role="dialog" aria-modal="true" aria-labelledby="obBaslik" aria-describedby="obAcik" tabindex="-1">' +
        '<p class="ob-ust" data-ob="onboarding.title"></p>' +
        '<h2 id="obBaslik" data-ob="onboarding.musicQuestion"></h2>' +
        '<p class="ob-acik" id="obAcik" data-ob="onboarding.musicDescription"></p>' +
        '<div class="mt-cipler" role="group" aria-labelledby="obBaslik"></div>' +
        '<div class="ob-dil"><span id="obDilEt" data-ob="onboarding.languageLabel"></span><div class="ob-seg" role="group" aria-labelledby="obDilEt"></div></div>' +
        '<button type="button" class="ob-btn" data-ob="onboarding.continue"></button>' +
        '<button type="button" class="ob-gec" data-ob="onboarding.skip"></button>' +
        '<p class="ob-not" data-ob="onboarding.laterHint"></p>' +
      '</div>';
    var METIN = {
      'onboarding.title': 'Müziğini biraz tanıyalım',
      'onboarding.musicQuestion': 'Hangi tür müzikle uğraşıyorsunuz?',
      'onboarding.musicDescription': 'Size uygun eserleri ve içerikleri gösterebilmemiz için bir veya daha fazla seçenek belirleyin.',
      'onboarding.languageLabel': 'Uygulama dili',
      'onboarding.continue': 'Devam Et',
      'onboarding.skip': 'Şimdilik geç',
      'onboarding.laterHint': 'Bunu daha sonra Ayarlar\'dan değiştirebilirsin.'
    };
    var devam = arka.querySelector('.ob-btn'), seg = arka.querySelector('.ob-seg');
    function metinler() {
      arka.querySelectorAll('[data-ob]').forEach(function (el) { var k = el.getAttribute('data-ob'); el.textContent = t(k, METIN[k]); });
      seg.innerHTML = '';
      var diller = (window.i18n && i18n.diller) || { tr: 'Türkçe', en: 'English' }, simdi = window.i18n ? i18n.dil() : 'tr';
      Object.keys(diller).forEach(function (k) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = diller[k]; b.lang = k;
        b.setAttribute('aria-pressed', k === simdi ? 'true' : 'false');
        b.onclick = function () { if (k !== (window.i18n && i18n.dil())) dilYaz(k); };
        seg.appendChild(b);
      });
      devam.disabled = !secili.length;
    }
    var cip = cipler(arka.querySelector('.mt-cipler'), secili, function (s) { secili = s; devam.disabled = !secili.length; });
    window.addEventListener('dil-degisti', metinler);
    metinler();

    return new Promise(function (bitti) {
      function kapat(liste) {
        window.removeEventListener('dil-degisti', metinler);
        document.removeEventListener('keydown', tus);
        arka.remove();
        try { localStorage.setItem('obSoruldu:' + uid(), '1'); } catch (e) {}
        kaydet(liste).catch(function () {});   // ağ yoksa BEKLEYEN'de kalır, sonra yazılır
        bitti(liste);
      }
      function tus(e) { if (e.key === 'Escape') kapat([]); }
      devam.onclick = function () { if (secili.length) kapat(cip.secili()); };
      arka.querySelector('.ob-gec').onclick = function () { kapat([]); };
      document.addEventListener('keydown', tus);
      document.body.appendChild(arka);
      // Odak pencereye (ilk çipe değil: odak halkası çipi seçili gibi gösteriyordu)
      arka.querySelector('.ob-kart').focus({ preventScroll: true });
    });
  }

  function yeniHesap() {
    try {
      var k = typeof getUser === 'function' ? getUser() : null, c = k && k.created_at && Date.parse(k.created_at);
      return !!c && (Date.now() - c) < YENI_GUN * 864e5;
    } catch (e) { return false; }
  }

  /* index.html açılışında: yalnız yeni hesap + hiç sorulmamışsa. */
  async function otomatik() {
    var u = uid(); if (!u || !jeton()) return;
    try { var b = JSON.parse(localStorage.getItem(BEKLEYEN) || 'null'); if (Array.isArray(b) && navigator.onLine !== false) kaydet(b).catch(function () {}); } catch (e) {}
    try { if (localStorage.getItem('obSoruldu:' + u)) return; } catch (e) {}
    if (!yeniHesap() || navigator.onLine === false) return;
    var d;
    try { d = await sunucudanOku(); } catch (e) { return; }   // ağ/yetki sorunu: sorma, sonraki açılışta dene
    if (!d.sutunVar) return;                                    // SQL henüz çalıştırılmadı
    if (d.deger !== null) { yerelYaz(d.deger); try { localStorage.setItem('obSoruldu:' + u, '1'); } catch (e) {} return; }
    pencere();
  }

  window.MuzikTercihi = {
    TURLER: TURLER, ad: ad, yerelOku: yerelOku, sunucudanOku: sunucudanOku, kaydet: kaydet,
    cipler: function (kap, secili, degisti) { stilEkle(); kap.classList.add('mt-cipler'); return cipler(kap, temizle(secili), degisti); },
    pencere: pencere,
    // ileride Eserler'in Tür süzgeci için: seçili türlerin works.tur karşılıkları (VARSAYILAN öneri, süzgeç değil)
    eserTurleri: function (liste) { var s = []; temizle(liste || yerelOku() || []).forEach(function (k) { TURLER.forEach(function (x) { if (x.k === k) s = s.concat(x.turlar); }); }); return s; }
  };

  if (document.body && document.body.dataset.onboarding === 'oto') {
    if (document.readyState === 'complete') setTimeout(otomatik, 600);
    else window.addEventListener('load', function () { setTimeout(otomatik, 600); });
  }
})();
