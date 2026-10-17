// arama-temizle.js — arama kutularına sağda "×" (tümünü sil) düğmesi (kullanıcı 2026-10-17)
//
// Kullanım: <input ... data-temizle> + bu betik. Düğme yalnız kutuda yazı varken görünür (CSS :placeholder-shown —
// değer koddan silinse de kendiliğinden gizlenir). Dokununca kutu boşalır, sayfanın kendi 'input' dinleyicileri
// çalışır (liste yenilenir) ve klavye kapanmaz. Kutu bir <span class="ara-kap"> içine alınır; kutunun dış boşluğu
// ve esnek kutu payı bu kaba taşınır, yani sayfa düzeni değişmez. Sonradan eklenen kutular ilk odakta kurulur.
(function () {
  'use strict';
  var SVG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cmask id='m'%3E" +
    "%3Crect width='20' height='20' fill='white'/%3E%3Cpath d='M6.9 6.9l6.2 6.2M13.1 6.9l-6.2 6.2' stroke='black' " +
    "stroke-width='1.9' stroke-linecap='round'/%3E%3C/mask%3E%3Ccircle cx='10' cy='10' r='9' mask='url(%23m)'/%3E%3C/svg%3E\")";
  var css = document.createElement('style');
  css.textContent =
    '.ara-kap{position:relative;display:block;}' +
    '.ara-x{position:absolute;top:50%;right:3px;transform:translateY(-50%);width:34px;height:34px;padding:0;margin:0;' +
    'border:0;background:none;color:var(--text3,#8A93A6);cursor:pointer;display:flex;align-items:center;' +
    'justify-content:center;z-index:2;-webkit-tap-highlight-color:transparent;}' +
    '.ara-x::before{content:"";width:18px;height:18px;background:currentColor;' +
    '-webkit-mask:' + SVG + ' center/contain no-repeat;mask:' + SVG + ' center/contain no-repeat;}' +
    '.ara-x:hover,.ara-x:active{color:var(--text2,#B4BCCB);}' +
    'input:placeholder-shown+.ara-x{display:none;}' +
    'input[data-temizle]::-webkit-search-cancel-button{-webkit-appearance:none;display:none;}';
  (document.head || document.documentElement).appendChild(css);

  function yerlestir(inp) {   // düğme kutunun sağ kenarında dursun (kutu kabı tam doldurmuyorsa da)
    var kap = inp.parentNode, b = inp._araX;
    if (!b || !kap.clientWidth) return;
    b.style.right = Math.max(0, kap.clientWidth - inp.offsetLeft - inp.offsetWidth) + 3 + 'px';
  }

  function kur(inp) {
    if (inp._araX) return;
    var cs = getComputedStyle(inp), ust = inp.parentNode;
    var kap = document.createElement('span');
    kap.className = 'ara-kap';
    kap.style.margin = cs.marginTop + ' ' + cs.marginRight + ' ' + cs.marginBottom + ' ' + cs.marginLeft;
    if (/flex|grid/.test(getComputedStyle(ust).display)) {
      kap.style.flex = cs.flexGrow + ' ' + cs.flexShrink + ' ' + cs.flexBasis;
      kap.style.minWidth = cs.minWidth === 'auto' ? '0' : cs.minWidth;
      inp.style.width = '100%';
    }
    inp.style.margin = '0';
    if (cs.boxSizing !== 'border-box') {   // genişlik aynı kalsın, sağ boşluk düğmeye yer açsın
      var w = inp.offsetWidth;
      inp.style.boxSizing = 'border-box';
      if (w) inp.style.width = w + 'px';
    }
    inp.style.paddingRight = (parseFloat(cs.paddingRight) || 0) + 26 + 'px';
    // Kap konumlu (position:relative) olduğu için kutunun yanındaki mutlak konumlu süs ikonlarının (büyüteç) üstüne
    // çizilirdi — onları bir kat yukarı al
    Array.prototype.forEach.call(ust.children, function (k) {
      var kcs = getComputedStyle(k);
      if (k !== inp && kcs.position === 'absolute' && kcs.zIndex === 'auto') k.style.zIndex = '1';
    });
    ust.insertBefore(kap, inp);
    kap.appendChild(inp);

    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ara-x';
    b.tabIndex = -1;
    b.setAttribute('aria-label', (document.documentElement.lang || '').indexOf('en') === 0 ? 'Clear' : 'Temizle');
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); });   // odak kutuda kalsın (klavye kapanmasın)
    b.addEventListener('mousedown', function (e) { e.preventDefault(); });
    b.addEventListener('click', function () {
      inp.value = '';
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.focus();
    });
    kap.appendChild(b);
    inp._araX = b;
    yerlestir(inp);
  }

  function hepsi() { Array.prototype.forEach.call(document.querySelectorAll('input[data-temizle]'), kur); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hepsi); else hepsi();
  document.addEventListener('focusin', function (e) {
    var t = e.target;
    if (t && t.matches && t.matches('input[data-temizle]')) { kur(t); yerlestir(t); }
  });
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t && t._araX) yerlestir(t);
  });
  addEventListener('resize', function () {
    Array.prototype.forEach.call(document.querySelectorAll('input[data-temizle]'), yerlestir);
  });
})();
