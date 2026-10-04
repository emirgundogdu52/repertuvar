/* ────────────────────────────────────────────────────────────
 * Repertuvar — yeni tasarım (landing tasarım dili) anahtarı
 *
 * Her sayfanın <head>'inde İLK script olarak, senkron yüklenir.
 * Bayrak KAPALIYKEN hiçbir şey yapmaz: sayfa bire bir eski haliyle çalışır.
 * Bayrak AÇIKKEN:
 *   - <html data-tasarim="v3" data-sayfa="..."> → tasarim.css kuralları devreye girer
 *   - Inter Tight fontu ve ince çizgili Tabler ikonları (300) yüklenir
 *   - Arayüzdeki emoji ikonlar Tabler çizgi ikonlarıyla değiştirilir (yalnız DOM'da;
 *     veri, i18n metinleri ve kullanıcı içeriği değişmez)
 *
 * Seçim:  ?tasarim=yeni | ?tasarim=eski  (localStorage 'r_tasarim'e yazılır)
 *         Ayarlar → "Yeni tasarım" anahtarı (window.RTasarim.ayarla)
 * Yalnız AÇIK tercih saklanır; tercih yoksa VARSAYILAN_ACIK geçerlidir —
 * böylece varsayılanı değiştirmek seçim yapmamış herkese ulaşır.
 * ──────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var VARSAYILAN_ACIK = true;
  var ANAHTAR = 'r_tasarim';

  var tercih = null;
  try {
    var q = new URLSearchParams(location.search).get('tasarim');
    if (q === 'yeni' || q === 'eski') localStorage.setItem(ANAHTAR, q);
    tercih = localStorage.getItem(ANAHTAR);
  } catch (e) {}
  var acik = tercih === 'yeni' ? true : tercih === 'eski' ? false : VARSAYILAN_ACIK;

  window.RTasarim = {
    acik: acik,
    varsayilan: VARSAYILAN_ACIK,
    ayarla: function (yeni) {
      try { localStorage.setItem(ANAHTAR, yeni ? 'yeni' : 'eski'); } catch (e) {}
      location.reload();
    }
  };
  if (!acik) return;

  var html = document.documentElement;
  var sayfa = (location.pathname.split('/').pop() || 'index.html').replace(/\.html?$/, '') || 'index';

  try {
    html.setAttribute('data-tasarim', 'v3');
    html.setAttribute('data-sayfa', sayfa);

    // topnav.js 'defer' yükleniyor; büyük sayfalar (eserler) ondan önce boyanabiliyor.
    // Tema özniteliğini erken koy ki yeni renkler ilk karede doğru gelsin.
    // stage (performans ekranı data-theme'i kendisi yönetiyor) ve login hariç.
    var TOPNAV_SAYFALARI = ' index eserler repertoires ayarlar gruplar mesajlar calisma ritim-kes istatistikler onerilerim uyeler yonetim artiesten ';
    if (TOPNAV_SAYFALARI.indexOf(' ' + sayfa + ' ') !== -1 && !html.getAttribute('data-theme')) {
      var tema = 'dark';
      try { tema = localStorage.getItem('r_theme') || 'dark'; } catch (e) {}
      html.setAttribute('data-theme', tema);
    }

    var head = document.head || document.getElementsByTagName('head')[0];
    var linkEkle = function (href) {
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      head.appendChild(l);
    };
    linkEkle('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400..700&display=swap');
    // Tabler'ı hiç yüklemeyen sayfalar: değiştirilen ikonlar görünsün diye temel set de gerekir
    var TABLERSIZ = ' login paylas reset-password toplu-makam form-atama splash ';
    if (TABLERSIZ.indexOf(' ' + sayfa + ' ') !== -1) {
      linkEkle('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.44.0/dist/tabler-icons.min.css');
    }
    linkEkle('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.44.0/dist/tabler-icons-300.min.css');
  } catch (e) {}

  /* ── Emoji → çizgi ikon ──────────────────────────────────── */

  // Değer: Tabler sınıfı | 'nokta:<renk>' (durum noktası) | '' (süs: sil)
  var HARITA = {
    '🎵': 'ti-music', '🎶': 'ti-music', '🎼': 'ti-file-music',
    '🔒': 'ti-lock', '🔓': 'ti-lock-open', '🔑': 'ti-key',
    '📋': 'ti-clipboard', '🔗': 'ti-link', '📄': 'ti-file-text', '📂': 'ti-folder', '📖': 'ti-book',
    '⚠': 'ti-alert-triangle yt-uyari', '❗': 'ti-alert-circle yt-uyari', '❌': 'ti-circle-x yt-hata',
    '👥': 'ti-users', '👤': 'ti-user',
    '🗑': 'ti-trash', '🌐': 'ti-world', '🐞': 'ti-bug', '🐛': 'ti-bug',
    '✉': 'ti-mail', '💬': 'ti-message-circle', '📢': 'ti-speakerphone',
    '📵': 'ti-cloud-off', '🎉': 'ti-confetti', '✨': 'ti-sparkles',
    '🎧': 'ti-headphones', '🎤': 'ti-microphone', '🎸': 'ti-guitar-pick', '🎹': 'ti-piano', '🎭': 'ti-masks-theater',
    '☀': 'ti-sun', '🌙': 'ti-moon', '⚙': 'ti-settings', '🛠': 'ti-tool', '☰': 'ti-menu-2',
    '✏': 'ti-pencil', '✍': 'ti-writing', '📍': 'ti-map-pin', '📷': 'ti-camera',
    '📊': 'ti-chart-bar', '📱': 'ti-device-mobile', '🖥': 'ti-device-desktop',
    '🍎': 'ti-brand-apple', '🤖': 'ti-brand-android', '🖨': 'ti-printer',
    '⏳': 'ti-hourglass', '🕐': 'ti-clock', '📅': 'ti-calendar', 'ℹ': 'ti-info-circle',
    '🏨': 'ti-bed', '🚐': 'ti-bus', '✋': 'ti-hand-stop',
    '🙈': 'ti-eye-off', '👁': 'ti-eye', '🔎': 'ti-search', '💾': 'ti-device-floppy', '➕': 'ti-plus',
    '🟢': 'nokta:yesil', '🟡': 'nokta:sari', '⚪': 'nokta:gri', '🔴': 'nokta:kirmizi',
    '👋': ''
  };
  var anahtarlar = Object.keys(HARITA).sort(function (a, b) { return b.length - a.length; });
  var KALIP = '(?:' + anahtarlar.join('|') + ')[\\uFE0F\\uFE0E]?';
  var VAR_MI = new RegExp(KALIP, 'u');
  var BASTA = new RegExp('^(\\s*)(' + KALIP + ')(\\s*)', 'u');
  // Metnin SONUNDAKİ süs emojisi ("Hoş geldin, Emir 👋", "Bekleyen eser yok 🎉") silinir
  var SONDA_SUS = /\s*(?:👋|🎉)[️︎]?\s*$/u;
  var TUM = new RegExp('\\s*' + KALIP, 'gu');

  // Kullanıcı içeriği ve düzenlenebilir alanlar: asla dokunma.
  var ATLA = [
    'script', 'style', 'textarea', 'input', 'title', 'svg', 'code', 'pre', '.ti',
    '[contenteditable]', '.nota-paste',
    // mesajlar
    '.conv-preview', '.thread-msg-content', '.thread-reply-box', '.ann-content', '#nmText',
    // bildirimler
    '.r-notif-title', '.r-notif-body',
    // eserler
    '.work-name', '.detail-title', '.detail-subtitle', '.lyrics-box', '#lyricsBoxDisplay',
    '.cp-lyric', '.cp-chord', '#ne_lyrics_editor', '#ne_lyrics', '#ne_chords', '#ne_story', '.knot-metin', '.sort-name',
    // repertuvarlar
    '.rn', '.wn', '#wInfoMakam', '#wInfoInstr', '#wInfoComp',
    // sahne
    '.wlyrics',
    // diğer
    '.perf', '#groupNameEl', '.member-name', '.member-email', '.grp-chip', '.group-name',
    '.detail-name', '.card-name', '.card-lyrics', '.co-ad', '.rb-eser-ad', '.oy-soz', '.stt-bar-label'
  ].join(',');
  var OZNITELIKLER = ['title', 'placeholder', 'aria-label', 'data-ipucu'];

  function atlanir(el) {
    try { return !!(el && el.closest && el.closest(ATLA)); } catch (e) { return true; }
  }

  function ikonYap(emoji) {
    var temel = emoji.replace(/[️︎]/g, '');
    var deger = HARITA[temel];
    if (deger === undefined || deger === '') return null;
    var i = document.createElement('i');
    i.setAttribute('aria-hidden', 'true');
    if (deger.indexOf('nokta:') === 0) {
      i.className = 'yt-nokta yt-nokta-' + deger.slice(6);
    } else {
      i.className = 'ti ' + deger + ' yt-ik';
    }
    return i;
  }

  function metinIsle(t) {
    var s = t.nodeValue;
    if (!s || !VAR_MI.test(s)) return;
    var ust = t.parentNode;
    if (!ust || ust.nodeType !== 1 || atlanir(ust)) return;

    if (ust.nodeName === 'OPTION') {          // <option> ikon taşıyamaz: emojiyi sil
      var temiz = s.replace(TUM, '').replace(/^\s+/, '');
      if (temiz !== s) t.nodeValue = temiz;
      return;
    }

    // Baştaki emojiler → ikon. Asıl metin düğümü yerinde kalır (JS'in tuttuğu referans kopmasın).
    var on = [];
    var m;
    while ((m = BASTA.exec(s))) {
      if (m[1]) on.push(document.createTextNode(m[1]));
      var ik = ikonYap(m[2]);
      if (ik) on.push(ik);
      s = (ik ? m[3] : '') + s.slice(m[0].length);
      if (!ik) s = s.replace(/^\s+/, '');
    }
    s = s.replace(SONDA_SUS, '');
    if (on.length) {
      for (var k = 0; k < on.length; k++) ust.insertBefore(on[k], t);
    }
    if (s !== t.nodeValue) t.nodeValue = s;
  }

  function oznitelikteEmojiVar(el) {
    if (!el.getAttribute) return false;
    for (var k = 0; k < OZNITELIKLER.length; k++) {
      var v = el.getAttribute(OZNITELIKLER[k]);
      if (v && VAR_MI.test(v)) return true;
    }
    return false;
  }

  function oznitelikIsle(el) {
    if (!oznitelikteEmojiVar(el) || atlanir(el)) return;
    for (var k = 0; k < OZNITELIKLER.length; k++) {
      var ad = OZNITELIKLER[k];
      var v = el.getAttribute(ad);
      if (v && VAR_MI.test(v)) {
        var yeni = v.replace(TUM, '').replace(/^\s+/, '');
        if (yeni !== v) el.setAttribute(ad, yeni);
      }
    }
  }

  var suzgec = {
    acceptNode: function (n) {
      if (n.nodeType === 1) {
        try { if (n.matches(ATLA)) return NodeFilter.FILTER_REJECT; } catch (e) {}
        return NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  };

  function agacIsle(kok) {
    if (!kok) return;
    if (kok.nodeType === 3) { metinIsle(kok); return; }
    if (kok.nodeType !== 1 && kok.nodeType !== 11) return;
    // Pahalı closest() kontrolü yalnız gerçekten emoji varsa yapılır (oznitelikIsle içinde)
    if (kok.nodeType === 1) oznitelikIsle(kok);
    var alt = kok.querySelectorAll('[title],[placeholder],[aria-label],[data-ipucu]');
    for (var a = 0; a < alt.length; a++) oznitelikIsle(alt[a]);
    if (!VAR_MI.test(kok.textContent || '')) return;
    if (kok.nodeType === 1 && atlanir(kok)) return;
    var w = document.createTreeWalker(kok, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, suzgec);
    var liste = [];
    var n;
    while ((n = w.nextNode())) if (n.nodeType === 3) liste.push(n);
    for (var j = 0; j < liste.length; j++) metinIsle(liste[j]);
  }

  var gozcu = null;
  function kayitlariIsle(kayitlar) {
    try {
      for (var r = 0; r < kayitlar.length; r++) {
        var k = kayitlar[r];
        if (k.type === 'childList') {
          for (var a = 0; a < k.addedNodes.length; a++) {
            var n = k.addedNodes[a];
            if (n.isConnected === false) continue;
            agacIsle(n);
          }
        } else if (k.type === 'attributes') {
          oznitelikIsle(k.target);
        }
      }
      if (gozcu) gozcu.takeRecords();   // kendi yazdıklarımızı tekrar işleme
    } catch (e) {}
  }

  try {
    gozcu = new MutationObserver(kayitlariIsle);
    gozcu.observe(html, { childList: true, subtree: true, attributes: true, attributeFilter: OZNITELIKLER });
    var ilkTarama = function () { try { agacIsle(document.body); gozcu.takeRecords(); } catch (e) {} };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ilkTarama);
    else ilkTarama();
  } catch (e) {}
})();
