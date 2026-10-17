// acilis-logo.js — açılış logo sahnesi (login.html açılışı + splash.html AYNI sahneyi buradan oynatır)
//
// Logo TEK STANDART: resmi logo_dark.png (664×127) beş parçaya kesilir (CSS clip-path, sayfalarda):
//   "repertuvar" (y<98) · sarı çizgi (y≥98, x<456) · nokta (yalnız 462–488 × 48–90) · "app" (y<98) · beyaz çizgi (y≥98)
// Son kare görselin birebir aynısıdır. Kurgu kullanıcının (2026-10-17):
//   1) kelimeler bulanıktan netleşerek süzülür
//   2) beyaz çizgi sola kayıp sarı çizginin ucuna çarpar; TAM O ANDA düz düşen nokta beyaz çizgiye değer (1. vuruş)
//   3) nokta "r"nin ucu hizasına kadar zıplar (39 px: nokta merkezi 67 → r kolu 21–34; %31); çizgi sağa döner, sonra yine sola gelip sarıya çarpar ve
//      yeniden düşen noktayı karşılar (2. vuruş)
//   4) nokta yukarı, çizgi sağa — yerlerine; ardından Dock dalgası
// Yüzdeler parçanın kendi kutusuna (= tüm logo) göre: çizgi 38 px sola (494 → 456, sarı 455'te biter: %5,72),
// nokta 26 px aşağı (nokta altı 75 → çizgi üstü 101: %20,5). Hareketi azalt açıksa sahne atlanır.
//
// (2026-10-17) Aşağı çekip yenileme de bu sahneyi kullanır (db.js; kullanıcı: "ok yerine splash'teki animasyon logoda"):
//   logoParcala(img) sayfadaki logo görselinin tam üstüne beş parçalı bir kopya koyar, logoZipla() 2–4. adımları oynatır.
(function () {
  'use strict';
  const suz = 'cubic-bezier(0.16,1,0.3,1)';                 // uzun, yumuşak yavaşlama
  const dusme = 'cubic-bezier(0.5,0,0.9,0.5)';              // yerçekimi: hızlanarak düşer
  const cikma = 'cubic-bezier(0.25,0.6,0.4,1)';             // yukarı çıkarken yavaşlar
  const sola = 'cubic-bezier(0.45,0,0.8,0.4)';              // çizgi hızlanarak sola
  const carp = 'cubic-bezier(0.2,0,0.2,1)';
  const yay = 'cubic-bezier(0.34,1.56,0.64,1)';
  const sakin = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const oyna = (el, kare, sure, gecikme, egri) => {
    const s = sakin();
    return el.animate(kare, { duration: s ? 1 : sure, delay: s ? 0 : gecikme, easing: egri || suz, fill: 'forwards' })
      .finished.catch(() => {});
  };
  const T = 2700, V1 = .25, ZIRVE = .43, V2 = .61;          // V1 / V2: iki vuruş anı (aynı oran her parçada)
  const CARPMA = 'translateX(-5.72%)', DUS = 'translateY(20.5%)';

  // Parça kesimleri (logo kutusuna göre %) — login.html / splash.html CSS'indeki #sp-* / #word-* ile AYNI değerler.
  const KESIM = {
    rep:  ['polygon(0 0,70.93% 0,70.93% 37.8%,68.67% 37.8%,68.67% 77.17%,0 77.17%)', '35% 100%', 1],
    gold: ['polygon(0 77.17%,68.67% 77.17%,68.67% 100%,0 100%)', '35% 100%', 1],
    dot:  ['polygon(69.58% 37.8%,73.49% 37.8%,73.49% 70.87%,69.58% 70.87%)', '71% 60%', 3],   // nokta çizginin ÖNÜNDE
    app:  ['polygon(73.49% 0,100% 0,100% 77.17%,73.49% 77.17%)', '87% 100%', 1],
    line: ['polygon(73.49% 77.17%,100% 77.17%,100% 100%,73.49% 100%)', '74% 100%', 2]
  };

  // 2–4. adımlar: iki vuruş + yerine dönüş + Dock dalgası. o.dotBas: noktanın başlangıç dönüşümü — verilirse nokta
  // görünür olarak oradan düşer (yenilemede kullanıcı onu yukarı çekmiştir); verilmezse ekranın üstünden süzülerek gelir.
  async function logoZipla(p, o) {
    o = o || {};
    const dotBasi = o.dotBas
      ? [{ opacity: 1, transform: o.dotBas, easing: dusme }]
      : [{ opacity: 0, transform: 'translateY(-330%)', easing: dusme },
         { opacity: 1, transform: 'translateY(-250%)', offset: .07, easing: dusme }];
    await Promise.all([
      oyna(p.line, [
        { transform: 'none', easing: sola },
        { transform: CARPMA, offset: V1, easing: carp },                                   // 1. vuruş
        { transform: `${CARPMA} translateY(6%) scaleX(.96)`, offset: V1 + .03, easing: cikma },
        { transform: 'translateX(.4%)', offset: ZIRVE, easing: sola },                    // sağa döndü
        { transform: CARPMA, offset: V2, easing: carp },                                   // 2. vuruş
        { transform: `${CARPMA} translateY(6%) scaleX(.96)`, offset: V2 + .03, easing: 'cubic-bezier(0.3,0,0.3,1)' },
        { transform: 'translateX(.9%)', offset: .86, easing: 'ease-in-out' },              // yerine (biraz taşar)
        { transform: 'translateX(-.25%)', offset: .94 },
        { transform: 'none' }
      ], T, 0, 'linear'),
      oyna(p.gold, [
        { transform: 'none' },
        { transform: 'none', offset: V1, easing: carp },
        { transform: 'translateX(-1.1%)', offset: V1 + .04, easing: yay },                // çarpmayla itildi
        { transform: 'none', offset: V1 + .16 },
        { transform: 'none', offset: V2, easing: carp },
        { transform: 'translateX(-1.1%)', offset: V2 + .04, easing: yay },
        { transform: 'none', offset: V2 + .16 },
        { transform: 'none' }
      ], T, 0, 'linear'),
      oyna(p.dot, dotBasi.concat([
        { opacity: 1, transform: DUS, offset: V1, easing: carp },                          // 1. vuruş
        { opacity: 1, transform: `${DUS} scale(1.28,.72)`, offset: V1 + .03, easing: cikma },
        { opacity: 1, transform: 'translateY(-31%) scale(.96,1.05)', offset: ZIRVE, easing: dusme },   // "r"nin ucuna kadar zıpladı
        { opacity: 1, transform: DUS, offset: V2, easing: carp },                          // 2. vuruş
        { opacity: 1, transform: `${DUS} scale(1.24,.76)`, offset: V2 + .03, easing: cikma },
        { opacity: 1, transform: 'translateY(-14%) scale(.96,1.05)', offset: .82, easing: 'ease-in-out' }, // yerine (biraz taşar)
        { opacity: 1, transform: 'translateY(3%)', offset: .92 },
        { opacity: 1, transform: 'none' }
      ]), T, 0, 'linear')
    ]);

    // Dock dalgası: parçalar sırayla hafifçe büyüyüp yerine döner (büyüme merkezi parçanın altı — transform-origin)
    if (!sakin()) {
      const dalga = [{ transform: 'none' }, { transform: 'scale(1.07)', offset: .45 }, { transform: 'none' }];
      await Promise.all([[p.rep, p.gold], [p.dot], [p.app, p.line]].map((grup, i) => Promise.all(grup.map(el =>
        el.animate(dalga, { duration: 560, delay: i * 110, easing: 'cubic-bezier(0.45,0,0.55,1)' }).finished.catch(() => {})))));
    }
  }

  window.acilisLogo = async function (p) {   // p: { rep, gold, dot, app, line }
    const gel = dx => [
      { opacity: 0, transform: `translateX(${dx}px) scale(.94)`, filter: 'blur(6px)' },
      { opacity: 1, transform: 'none', filter: 'blur(0)' }
    ];
    oyna(p.rep, gel(-26), 1100, 0);
    oyna(p.gold, gel(-26), 1100, 0);
    oyna(p.app, gel(26), 900, 120);
    await oyna(p.line, gel(26), 900, 120);
    await logoZipla(p);
  };
  window.logoZipla = logoZipla;

  // Sayfadaki logo <img>'inin TAM üstüne beş parçalı kopyasını koyar (görsel o sürede gizlenir) → { rep, gold, dot, app,
  // line, kaldir() }. Kopya body'de position:fixed: üst çubuğun overflow:hidden'ı düşen noktayı kesmesin. Açık temanın koyu
  // plakası (img'nin zemini + gölgesi) kopyaya da verilir. object-fit:contain'de görselin kutudaki gerçek alanı kullanılır.
  window.logoParcala = function (img) {
    const r = img.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const cs = getComputedStyle(img);
    let x = r.left, y = r.top, w = r.width, h = r.height;
    const oran = 664 / 127;
    if (cs.objectFit === 'contain' && Math.abs(w / h - oran) > .01) {
      if (w / h > oran) { const yeniW = h * oran; x += (w - yeniW) / 2; w = yeniW; }
      else { const yeniH = w / oran; y += (h - yeniH) / 2; h = yeniH; }
    }
    const kap = document.createElement('div');
    kap.setAttribute('aria-hidden', 'true');
    kap.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:99999;pointer-events:none;` +
      `background:${cs.backgroundColor};border-radius:${cs.borderRadius};box-shadow:${cs.boxShadow};`;
    const src = (img.currentSrc || img.src).replace(/"/g, '%22');
    const p = {};
    Object.keys(KESIM).forEach(ad => {
      const s = document.createElement('span');
      s.style.cssText = `position:absolute;inset:0;background:url("${src}") 0 0/100% 100% no-repeat;` +
        `clip-path:${KESIM[ad][0]};transform-origin:${KESIM[ad][1]};z-index:${KESIM[ad][2]};`;
      kap.appendChild(s);
      p[ad] = s;
    });
    document.body.appendChild(kap);
    img.style.visibility = 'hidden';
    p.kaldir = () => { kap.remove(); img.style.visibility = ''; };
    return p;
  };
})();
