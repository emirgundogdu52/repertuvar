/* ritim.js — RİTİM MOTORU (2026-09-20)
 *
 * Kalıp tabanlı sequencer + çok örnekli one-shot çalıcı.
 * Uzun sabit-BPM loop YOK: kalıp ritmik olayları tarif ediyor, motor her
 * olayı AudioContext saatine planlıyor. BPM yalnız zamanlamayı değiştirir;
 * örneklerin perdesi ve hızı sabit kalır.
 *
 * Altyapı ortak: ses.js (tek AudioContext) + zamanlayici.js (ileri
 * planlamalı transport). Bu modül KENDİ AudioContext'ini açmaz.
 *
 * ── TEMEL AYRIM: USUL VERİSİ ≠ ÖRNEK ADI ────────────────────────────────
 * Kalıptaki darp SEMANTİKTİR: DUM, TEK, TE, KE, KA, PA.
 * Kitteki artikülasyon FİZİKSELDİR: bendir'de dum/tek, darbuka'da
 * dum/tek/pa. İkisini `cozumleme` tablosu bağlar.
 * Yani KA, kitte karşılığı olmadığı için TEK'e ÇEVRİLİP KAYDEDİLMEZ;
 * kalıpta KA olarak kalır, çözümleyici onu o kitin uygun örneğine
 * yönlendirir. Kudüm gibi doğru artikülasyonlu bir kit eklendiğinde
 * kalıplara dokunmadan yeni eşleme yazılır.
 *
 * Darbın uzunluğu ADINDA değil, `sure` alanındadır: DÜÜM = DUM/sure 2,
 * TEEK = TEK/sure 2, KAA = KA/sure 2.
 *
 * ── Kalıp biçimi ────────────────────────────────────────────────────────
 * id, ad{tr,en}, olcu (meter), zaman (totalUnits), birim (payda),
 * gruplama, altBolunme, olaylar[{vurus, konum, sure, vurgu}],
 * varsayilanBpm, uyumluKitler, tavirlar, varyasyon, kaynak, calinabilir
 *
 * calinabilir=false olan kalıp katalogda DURUR ama kullanıcıya
 * gösterilmez ve çalınmaz — müzikolojik doğrulaması tamamlanmamış demektir.
 *
 * `birlesim` alanı varsa olaylar, adı geçen usullerin olaylarından
 * türetilir (ör. Devr-i Hindî = Semâi + Sofyan). Parçalardan biri
 * çalınabilir değilse türetilmiş kalıp da çalınabilir olmaz.
 *
 * USUL ≠ ÖLÇÜ ≠ TAVIR. 9/8 kendiliğinden Aksak, Roman, Karşılama ya da
 * Zeybek demek değildir; 7/8 da Devr-i Hindî demek değildir.
 */
window.Ritim = (function () {

  const VURGU = { strong: 1.0, medium: 0.72, weak: 0.5 };

  // ── USUL KATALOĞU ─────────────────────────────────────────────────────
  // calinabilir:true olanların olay dizisi Emir tarafından açıkça
  // verilmiştir. Diğerleri metadata olarak duruyor; darp dizisi
  // doğrulanmadan TAHMİN EDİLMEZ.
  const KALIPLAR = {

    nim_sofyan: {
      id: 'nim_sofyan', ad: { tr: 'Nim Sofyan', en: 'Nim Sofyan' },
      olcu: '2/4', zaman: 2, birim: 4, gruplama: [1, 1], altBolunme: 1,
      olaylar: [
        { vurus: 'DUM', konum: 0, sure: 1, vurgu: 'strong' },
        { vurus: 'TEK', konum: 1, sure: 1, vurgu: 'medium' }
      ],
      varsayilanBpm: 100, uyumluKitler: ['bendir', 'darbuka'],
      tavirlar: [], varyasyon: 'basic',
      kaynak: 'Emir Gündoğdu, 2026-09-20 — doğrulanmış',
      calinabilir: true
    },

    turk_aksagi: {
      id: 'turk_aksagi', ad: { tr: 'Türk Aksağı', en: 'Turkish Aksak' },
      olcu: '5/8', zaman: 5, birim: 8, gruplama: [2, 3], altBolunme: 1,
      olaylar: [
        { vurus: 'DUM', konum: 0, sure: 2, vurgu: 'strong' },   // DÜÜM
        { vurus: 'TEK', konum: 2, sure: 2, vurgu: 'medium' },   // TEEK
        { vurus: 'TEK', konum: 4, sure: 1, vurgu: 'weak' }
      ],
      varsayilanBpm: 120, uyumluKitler: ['bendir', 'darbuka'],
      tavirlar: [], varyasyon: 'basic',
      kaynak: 'Emir Gündoğdu, 2026-09-20 — doğrulanmış',
      calinabilir: true
    },

    aksak_semai: {
      id: 'aksak_semai', ad: { tr: 'Aksak Semâi', en: 'Aksak Semai' },
      olcu: '10/8', zaman: 10, birim: 8, gruplama: [2, 1, 2, 2, 2, 1], altBolunme: 1,
      olaylar: [
        { vurus: 'DUM', konum: 0, sure: 2, vurgu: 'strong' },   // DÜÜM
        { vurus: 'TE',  konum: 2, sure: 1, vurgu: 'weak' },
        { vurus: 'KA',  konum: 3, sure: 2, vurgu: 'medium' },   // KAA
        { vurus: 'DUM', konum: 5, sure: 2, vurgu: 'strong' },   // DÜÜM
        { vurus: 'TEK', konum: 7, sure: 2, vurgu: 'medium' },   // TEEK
        { vurus: 'TEK', konum: 9, sure: 1, vurgu: 'weak' }
      ],
      varsayilanBpm: 120, uyumluKitler: ['bendir', 'darbuka'],
      tavirlar: [], varyasyon: 'basic',
      kaynak: 'Emir Gündoğdu, 2026-09-20 — doğrulanmış',
      calinabilir: true
    },

    // ── Olay dizisi BEKLENİYOR ──────────────────────────────────────────
    // Zaman sayısı, ölçü ve gruplama biliniyor; darp dizisi verilmedi.
    // Tahmin edilmedi. Emir darpları verdiğinde olaylar yazılıp
    // calinabilir:true yapılacak.
    semai: {
      id: 'semai', ad: { tr: 'Semâi', en: 'Semai' },
      olcu: '3/4', zaman: 3, birim: 4, gruplama: [1, 1, 1], altBolunme: 1,
      olaylar: [                                              // Düm – Tek – Tek
        { vurus: 'DUM', konum: 0, sure: 1, vurgu: 'strong' },
        { vurus: 'TEK', konum: 1, sure: 1, vurgu: 'medium' },
        { vurus: 'TEK', konum: 2, sure: 1, vurgu: 'weak' }
      ],
      varsayilanBpm: 100, uyumluKitler: ['bendir', 'darbuka'],
      tavirlar: [], varyasyon: 'basic',
      kaynak: 'MEB, Türk Müziğinde Ritim Yazısı ve Uygulamaları-I',
      calinabilir: true
    },
    sofyan: {
      id: 'sofyan', ad: { tr: 'Sofyan', en: 'Sofyan' },
      // Dört eşit vuruş DEĞİL: 2+1+1. İlk darp iki zaman sürer.
      olcu: '4/4', zaman: 4, birim: 4, gruplama: [2, 1, 1], altBolunme: 1,
      olaylar: [                                              // Düüm – Te – Ke
        { vurus: 'DUM', konum: 0, sure: 2, vurgu: 'strong' },
        { vurus: 'TE',  konum: 2, sure: 1, vurgu: 'medium' },
        { vurus: 'KE',  konum: 3, sure: 1, vurgu: 'weak' }
      ],
      varsayilanBpm: 100, uyumluKitler: ['bendir', 'darbuka'],
      tavirlar: [], varyasyon: 'basic',
      kaynak: 'İstanbul Üniversitesi, Temel Usul Bilgisi',
      calinabilir: true
    },
    yuruk_semai: {
      id: 'yuruk_semai', ad: { tr: 'Yürük Semâi', en: 'Yuruk Semai' },
      // Süre çelişkisi çözüldü: uzun olan SON darp (Teek=2), ikinci DÜM
      // tek zamanlık. 1+1+1+1+2 = 6.
      olcu: '6/8', zaman: 6, birim: 8, gruplama: [1, 1, 1, 1, 2], altBolunme: 1,
      olaylar: [                                   // Düm – Tek – Tek – Düm – Teek
        { vurus: 'DUM', konum: 0, sure: 1, vurgu: 'strong' },
        { vurus: 'TEK', konum: 1, sure: 1, vurgu: 'medium' },
        { vurus: 'TEK', konum: 2, sure: 1, vurgu: 'weak' },
        { vurus: 'DUM', konum: 3, sure: 1, vurgu: 'strong' },
        { vurus: 'TEK', konum: 4, sure: 2, vurgu: 'medium' }
      ],
      varsayilanBpm: 110, uyumluKitler: ['bendir', 'darbuka'],
      tavirlar: [], varyasyon: 'basic',
      kaynak: 'MEB, TSM Teori ve Uygulaması + akademik Yürük Semâi usul çalışması',
      calinabilir: true
    },

    // ── Birleşimden türetilecekler ──────────────────────────────────────
    // Parçaların olayları geldiğinde kendiliğinden üretilirler.
    devri_hindi: {
      id: 'devri_hindi', ad: { tr: 'Devr-i Hindî', en: 'Devr-i Hindi' },
      olcu: '7/8', zaman: 7, birim: 8, gruplama: [3, 4], altBolunme: 1,
      birlesim: ['semai', 'sofyan'], olaylar: [],
      varsayilanBpm: 110, uyumluKitler: ['bendir', 'darbuka'],
      tavirlar: [], varyasyon: 'basic',
      kaynak: 'Semâi + Sofyan (3+4)', calinabilir: false
    },
    devri_turan: {
      id: 'devri_turan', ad: { tr: 'Devr-i Tûran', en: 'Devr-i Turan' },
      olcu: '7/8', zaman: 7, birim: 8, gruplama: [4, 3], altBolunme: 1,
      birlesim: ['sofyan', 'semai'], olaylar: [],
      varsayilanBpm: 110, uyumluKitler: ['bendir', 'darbuka'],
      tavirlar: [], varyasyon: 'basic',
      kaynak: 'Sofyan + Semâi (4+3) — Devr-i Hindî’nin ters kuruluşu',
      calinabilir: false
    },
    duyek: {
      id: 'duyek', ad: { tr: 'Düyek', en: 'Duyek' },
      olcu: '8/8', zaman: 8, birim: 8, gruplama: [4, 4], altBolunme: 1,
      birlesim: ['sofyan', 'sofyan'], olaylar: [],
      varsayilanBpm: 110, uyumluKitler: ['bendir', 'darbuka'],
      tavirlar: [], varyasyon: 'basic',
      kaynak: 'iki Sofyan', calinabilir: false
    },
    aksak: {
      id: 'aksak', ad: { tr: 'Aksak', en: 'Aksak' },
      olcu: '9/8', zaman: 9, birim: 8, gruplama: [4, 5], altBolunme: 1,
      birlesim: ['sofyan', 'turk_aksagi'], olaylar: [],
      varsayilanBpm: 120, uyumluKitler: ['bendir', 'darbuka'],
      tavirlar: [], varyasyon: 'basic',
      kaynak: 'Sofyan + Türk Aksağı (4+5)', calinabilir: false
    },
    raks_aksagi: {
      id: 'raks_aksagi', ad: { tr: 'Raks Aksağı', en: 'Raks Aksagi' },
      olcu: '9/8', zaman: 9, birim: 8, gruplama: [5, 4], altBolunme: 1,
      birlesim: ['turk_aksagi', 'sofyan'], olaylar: [],
      varsayilanBpm: 120, uyumluKitler: ['bendir', 'darbuka'],
      tavirlar: [], varyasyon: 'basic',
      kaynak: 'Türk Aksağı + Sofyan (5+4) — Aksak’ın ters kuruluşu',
      calinabilir: false
    },
    oynak: {
      id: 'oynak', ad: { tr: 'Oynak', en: 'Oynak' },
      olcu: '9/8', zaman: 9, birim: 8, gruplama: [3, 6], altBolunme: 1,
      birlesim: ['semai', 'yuruk_semai'], olaylar: [],
      varsayilanBpm: 120, uyumluKitler: ['bendir', 'darbuka'],
      tavirlar: [], varyasyon: 'basic',
      kaynak: 'Semâi + Yürük Semâi (3+6)', calinabilir: false
    },

    // ── Yalnız metadata (Emir'in kararı) ────────────────────────────────
    musemmen: {
      id: 'musemmen', ad: { tr: 'Müsemmen', en: 'Musemmen' },
      olcu: '8/8', zaman: 8, birim: 8, gruplama: null, altBolunme: 1,
      olaylar: [], varsayilanBpm: 110, uyumluKitler: ['bendir', 'darbuka'],
      tavirlar: [], varyasyon: 'basic',
      kaynak: 'bağımsız usul; Düyek ile yalnız zaman sayısı ortak',
      calinabilir: false
    },
    evfer: {
      id: 'evfer', ad: { tr: 'Evfer', en: 'Evfer' },
      olcu: '9/8', zaman: 9, birim: 8, gruplama: null, altBolunme: 1,
      olaylar: [], varsayilanBpm: 110, uyumluKitler: ['bendir', 'darbuka'],
      tavirlar: [], varyasyon: 'basic',
      kaynak: 'bağımsız usul; Aksak ile yalnız zaman sayısı ortak',
      calinabilir: false
    },
    curcuna: {
      id: 'curcuna', ad: { tr: 'Curcuna', en: 'Curcuna' },
      olcu: '10/16', zaman: 10, birim: 16, gruplama: null, altBolunme: 1,
      olaylar: [], varsayilanBpm: 120, uyumluKitler: ['bendir', 'darbuka'],
      tavirlar: [], varyasyon: 'basic',
      kaynak: 'kaynaklar arasında farklı kuruluşlar var; tek şema doğru kabul edilmedi',
      calinabilir: false
    }
  };

  /* Birleşimden olay türetme: parçaların olayları arka arkaya eklenir,
   * ikinci parçanın konumları birincinin uzunluğu kadar kaydırılır.
   * Parçalardan biri çalınabilir değilse türetme YAPILMAZ. */
  function birlesimleriUret() {
    let degisti = true, tur = 0;
    while (degisti && tur++ < 5) {      // zincirli birleşimler için birkaç tur
      degisti = false;
      for (const id of Object.keys(KALIPLAR)) {
        const k = KALIPLAR[id];
        if (!k.birlesim || k.calinabilir || (k.olaylar && k.olaylar.length)) continue;
        const parcalar = k.birlesim.map(function (p) { return KALIPLAR[p]; });
        if (!parcalar.every(function (p) { return p && p.calinabilir && p.olaylar.length; })) continue;
        const olaylar = []; let kayma = 0;
        for (const p of parcalar) {
          for (const o of p.olaylar) {
            olaylar.push({ vurus: o.vurus, konum: kayma + o.konum, sure: o.sure, vurgu: o.vurgu });
          }
          kayma += p.zaman;
        }
        if (kayma !== k.zaman) continue;   // toplam tutmuyorsa üretme
        k.olaylar = olaylar; k.calinabilir = true;
        k.kaynak = k.kaynak + ' — parçalardan türetildi';
        degisti = true;
      }
    }
  }

  // ── Örnek havuzları ───────────────────────────────────────────────────
  // FreePats World Percussion (CC0) + Freesound bendir_basicStrokes (CC0).
  // Kaynak ve lisans kaydı: /sesler/KAYNAK.md
  const SESLER = {
    bendir: { dum: ['/sesler/bendir/dum.wav'], tek: ['/sesler/bendir/tek.wav'] },
    darbuka: {
      dum: ['doom_01_01','doom_01_02','doom_01_03','doom_01_04','doom_01_05','doom_01_06',
            'doom_01_07','doom_01_08','doom_01_09','doom_01_10','doom_01_11','doom_01_12']
           .map(function (n) { return '/sesler/darbuka/' + n + '.wav'; }),
      tek: ['tak_02_01','tak_02_02','tak_02_03','tak_02_04','tak_02_05','tak_02_06','tak_02_07']
           .map(function (n) { return '/sesler/darbuka/' + n + '.wav'; }),
      // pa_03_06 kaynak pakette YOK — havuz altı dosya, eksiklik değil.
      pa:  ['pa_03_01','pa_03_02','pa_03_03','pa_03_04','pa_03_05','pa_03_07']
           .map(function (n) { return '/sesler/darbuka/' + n + '.wav'; })
    },
    tambourine: {
      hit:  ['01_01','02_01','03_01','04_01','05','06','07','08','09','10']
            .map(function (n) { return '/sesler/tambourine/' + n + '.wav'; }),
      fast: ['fast_03','fast_04','fast_05','fast_06','fast_07','fast_08','fast_09','fast_10',
             'fast_11','fast_12','fast_13','fast_14','fast_15','fast_16']
            .map(function (n) { return '/sesler/tambourine/' + n + '.wav'; })
    },
    shaker: {
      slow: Array.from({ length: 14 }, function (_, i) { return '/sesler/shaker/slow_' + String(i + 1).padStart(2, '0') + '.wav'; }),
      fast: Array.from({ length: 12 }, function (_, i) { return '/sesler/shaker/fast_' + String(i + 1).padStart(2, '0') + '.wav'; }),
      soft: Array.from({ length: 14 }, function (_, i) { return '/sesler/shaker/soft_' + String(i + 1).padStart(2, '0') + '.wav'; })
    },
    cajon: {
      // FreePats yalnız "Cajón flamenco 1/2/3" diyor; bass/slap/tone gibi
      // adlar UYDURULMADI.
      cajon_1: ['101','102','216','201','214','104','219','105','103','221','202']
               .map(function (n) { return '/sesler/cajon/' + n + '.wav'; }),
      cajon_2: ['106','107','109','110','115','203','206','205','212','111','204','222','211','208','209','210']
               .map(function (n) { return '/sesler/cajon/' + n + '.wav'; }),
      cajon_3: ['217','218'].map(function (n) { return '/sesler/cajon/' + n + '.wav'; })
    }
  };

  // cozumleme: SEMANTİK darp → kitteki fiziksel artikülasyon.
  // Kudüm gibi TE/KE/KA ayrımı olan bir kit eklendiğinde yalnız bu tablo
  // değişir, kalıplara dokunulmaz.
  const KITLER = {
    bendir: {
      id: 'bendir', ad: 'Bendir', lisans: 'CC0', kazanc: 1.0, gosterilsin: true,
      cozumleme: { DUM: 'dum', TEK: 'tek', TE: 'tek', KE: 'tek', KA: 'tek', PA: 'tek' },
      sesler: SESLER.bendir
    },
    darbuka: {
      id: 'darbuka', ad: 'Darbuka', lisans: 'CC0', kazanc: 1.0, gosterilsin: true,
      cozumleme: { DUM: 'dum', TEK: 'tek', TE: 'tek', KE: 'tek', KA: 'tek', PA: 'pa' },
      sesler: SESLER.darbuka
    },
    // Veri modelinde hazır, arayüzde henüz gösterilmiyor.
    tambourine: {
      id: 'tambourine', ad: 'Tef', lisans: 'CC0', kazanc: 1.0, gosterilsin: false,
      cozumleme: { DUM: 'hit', TEK: 'fast', TE: 'fast', KE: 'fast', KA: 'fast', PA: 'fast' },
      sesler: SESLER.tambourine
    },
    shaker: {
      id: 'shaker', ad: 'Shaker', lisans: 'CC0', kazanc: 1.0, gosterilsin: false,
      cozumleme: { DUM: 'slow', TEK: 'fast', TE: 'fast', KE: 'fast', KA: 'soft', PA: 'soft' },
      sesler: SESLER.shaker
    },
    cajon: {
      id: 'cajon', ad: 'Cajón', lisans: 'CC0', kazanc: 1.0, gosterilsin: false,
      cozumleme: { DUM: 'cajon_1', TEK: 'cajon_2', TE: 'cajon_2', KE: 'cajon_2', KA: 'cajon_3', PA: 'cajon_3' },
      sesler: SESLER.cajon
    }
  };

  // ── Doğrulama ─────────────────────────────────────────────────────────
  /* Bir kalıbı denetler. Dönen değer: sorun metni ya da null.
   * Çalınabilir bir kalıp bu denetimden geçmeden listeye alınmaz. */
  function kalibiDenetle(kalip, kit, havuzlar) {
    if (!kalip) return 'kalıp yok';
    if (!Array.isArray(kalip.olaylar) || !kalip.olaylar.length) return 'olay dizisi boş';

    const toplam = kalip.olaylar.reduce(function (t, o) { return t + (+o.sure || 0); }, 0);
    if (Math.abs(toplam - kalip.zaman) > 1e-9)
      return 'olay süreleri ' + toplam + ', ölçü ' + kalip.zaman + ' — eşit değil';

    // Konumlar: sıralı, boşluksuz, çakışmasız
    let bekle = 0;
    for (const o of kalip.olaylar) {
      if (o.konum == null) return 'olayda konum yok: ' + o.vurus;
      if (Math.abs(o.konum - bekle) > 1e-9)
        return 'konum sırası bozuk: ' + o.vurus + ' @' + o.konum + ', beklenen ' + bekle;
      if (!(o.sure > 0)) return 'süre pozitif değil: ' + o.vurus;
      bekle += o.sure;
    }

    if (Array.isArray(kalip.gruplama)) {
      const g = kalip.gruplama.reduce(function (t, x) { return t + x; }, 0);
      if (Math.abs(g - kalip.zaman) > 1e-9) return 'gruplama ' + g + ', ölçü ' + kalip.zaman;
    }

    if (kit) {
      for (const o of kalip.olaylar) {
        const art = kit.cozumleme[o.vurus];
        if (!art) return kit.ad + ' kitinde ' + o.vurus + ' darbının karşılığı yok';
        if (!kit.sesler[art]) return kit.ad + '/' + art + ' havuzu tanımsız';
        if (havuzlar && !(havuzlar[art] && havuzlar[art].length))
          return kit.ad + '/' + art + ' örneği yüklenemedi';
      }
    }
    return null;
  }

  /* Tüm katalog + kit eşlemeleri. Açılışta bir kez çalışır; bozuk kalıp
   * çalınabilir listesinden düşer. */
  function katalogDenetle() {
    const sorunlar = [];
    const gorulen = {};
    for (const id of Object.keys(KALIPLAR)) {
      const k = KALIPLAR[id];
      if (k.id !== id) sorunlar.push(id + ': id alanı anahtarla uyuşmuyor (' + k.id + ')');
      if (gorulen[k.id]) sorunlar.push('yinelenen id: ' + k.id);
      gorulen[k.id] = true;
      if (!k.calinabilir) continue;
      const s = kalibiDenetle(k, null, null);
      if (s) { sorunlar.push(k.id + ': ' + s); k.calinabilir = false; continue; }
      for (const kitId of (k.uyumluKitler || [])) {
        const ks = kalibiDenetle(k, KITLER[kitId], null);
        if (ks) sorunlar.push(k.id + ' × ' + kitId + ': ' + ks);
      }
    }
    return sorunlar;
  }

  birlesimleriUret();
  const KATALOG_SORUNLARI = katalogDenetle();

  /* Kullanıcıya yalnız çalınabilir kalıplar gösterilir. */
  function kalipListesi() {
    return Object.keys(KALIPLAR).map(function (id) { return KALIPLAR[id]; })
      .filter(function (k) { return k.calinabilir; });
  }
  function kitListesi(kalipId) {
    const k = KALIPLAR[kalipId];
    return Object.keys(KITLER).map(function (id) { return KITLER[id]; })
      .filter(function (kit) {
        return kit.gosterilsin && (!k || !k.uyumluKitler || k.uyumluKitler.indexOf(kit.id) >= 0);
      });
  }

  // ── Örnek deposu — KİT BAŞINA tembel yükleme ──────────────────────────
  const depo = new Map();
  let sayac = { fetch: 0, decode: 0 };

  function decode(actx, ab) {
    return new Promise(function (coz, red) {
      const s = actx.decodeAudioData(ab, coz, red);
      if (s && typeof s.then === 'function') s.then(coz, red);
    });
  }

  function kitYukle(kitId) {
    if (depo.has(kitId)) return depo.get(kitId);
    const kit = KITLER[kitId];
    const actx = Ses.ctx();
    if (!kit) return Promise.reject(new Error('kit yok: ' + kitId));
    if (!actx) return Promise.reject(new Error('ses hazır değil'));

    const soz = (async function () {
      const cikan = {};
      for (const art of Object.keys(kit.sesler)) {
        // Bir dosya düşerse tüm kit düşer: yarım havuzla çalıp sessiz
        // vuruş üretmekten iyidir.
        cikan[art] = await Promise.all(kit.sesler[art].map(async function (yol) {
          sayac.fetch++;
          const r = await fetch(yol);
          if (!r.ok) throw new Error(yol + ' yüklenemedi (' + r.status + ')');
          sayac.decode++;
          return decode(actx, await r.arrayBuffer());
        }));
      }
      return cikan;
    })();

    soz.catch(function () { depo.delete(kitId); });   // sonsuz retry yok
    depo.set(kitId, soz);
    return soz;
  }

  // ── Motor ─────────────────────────────────────────────────────────────
  function olustur(ayar) {
    ayar = ayar || {};
    let kalipId = ayar.kalip || 'nim_sofyan';
    let kitId = ayar.kit || 'bendir';
    let bpm = ayar.bpm || (KALIPLAR[kalipId] && KALIPLAR[kalipId].varsayilanBpm) || 100;
    let havuzlar = null, transport = null, hazirMi = false, grid = null;
    let sira = {};   // round-robin sayaçları

    /* Kalıbı birim ızgarasına açar: her birimde o birimde BAŞLAYAN olay
     * (yoksa null). Uzun darplar (DÜÜM = 2 birim) izleyen birimde sessiz
     * kalır; ses zaten kendi doğal boyunca çalar. */
    function izgara() {
      const k = KALIPLAR[kalipId];
      const g = new Array(k.zaman).fill(null);
      for (const o of k.olaylar) if (o.konum < g.length) g[o.konum] = o;
      return g;
    }

    function siradakiOrnek(art) {
      const havuz = havuzlar ? havuzlar[art] : null;
      if (!havuz || !havuz.length) return null;
      if (havuz.length === 1) return havuz[0];
      if (sira[art] == null) sira[art] = Math.floor(Math.random() * havuz.length);
      else sira[art] = (sira[art] + 1) % havuz.length;
      return havuz[sira[art]];
    }

    /* Örnek SEÇİMİ burada, ama planlanan ZAMANA dokunulmuyor. */
    function cal(birim, zaman) {
      const o = grid[birim];
      if (!o) return;
      const kit = KITLER[kitId];
      const buf = siradakiOrnek(kit.cozumleme[o.vurus]);
      if (!buf) return;
      const actx = Ses.ctx();
      const src = actx.createBufferSource();
      src.buffer = buf;                        // playbackRate'e DOKUNULMUYOR
      const g = actx.createGain();
      const v = VURGU[o.vurgu] != null ? VURGU[o.vurgu] : 0.8;
      g.gain.value = v * (kit.kazanc != null ? kit.kazanc : 1);
      src.connect(g); g.connect(Ses.cikis());
      src.start(zaman);
    }

    return {
      async hazirla() {
        const r = await Ses.hazirla();
        if (!r.ok) return { ok: false, sebep: 'ses', mesaj: 'Ses açılamadı' };
        const k = KALIPLAR[kalipId];
        if (!k) return { ok: false, sebep: 'kalip', mesaj: 'Usul yok: ' + kalipId };
        if (!k.calinabilir) return { ok: false, sebep: 'kalip', mesaj: k.ad.tr + ' henüz çalınabilir değil' };
        if (!KITLER[kitId]) return { ok: false, sebep: 'kit', mesaj: 'Çalgı yok: ' + kitId };
        try {
          havuzlar = await kitYukle(kitId);
        } catch (e) {
          return { ok: false, sebep: 'kit', mesaj: (e && e.message) || 'Çalgı yüklenemedi' };
        }
        const sorun = kalibiDenetle(k, KITLER[kitId], havuzlar);
        if (sorun) return { ok: false, sebep: 'kalip', mesaj: sorun };
        grid = izgara(); sira = {}; hazirMi = true;
        return { ok: true };
      },

      basla() {
        if (!hazirMi) return false;
        if (!transport) {
          transport = Zamanlayici.olustur({
            adimSayisi: function () { return grid.length; },
            adimSuresi: function () { return 60 / bpm; },   // BPM = dakikadaki birim
            cal: cal
          });
        }
        return transport.basla();
      },

      durdur() { if (transport) transport.durdur(); },
      calisiyorMu() { return !!transport && transport.calisiyorMu(); },
      bpmYaz(v) { bpm = Math.min(300, Math.max(30, +v || bpm)); return bpm; },
      bpmOku() { return bpm; },

      kalipYaz(id) {
        const k = KALIPLAR[id];
        if (!k || !k.calinabilir) return false;
        kalipId = id; grid = izgara();
        hazirMi = !!havuzlar && !kalibiDenetle(k, KITLER[kitId], havuzlar);
        return true;
      },

      /* Kit değişimi yeni havuz gerektirir: hazirla() tekrar çağrılmalı. */
      kitYaz(id) {
        if (!KITLER[id]) return false;
        kitId = id; havuzlar = null; hazirMi = false; sira = {};
        return true;
      },

      gorselAl() { return transport ? transport.gorselAl() : []; },
      kalip() { return KALIPLAR[kalipId]; },
      kit() { return KITLER[kitId]; }
    };
  }

  return {
    olustur: olustur, kitYukle: kitYukle,
    kitListesi: kitListesi, kalipListesi: kalipListesi,
    kaliplar: KALIPLAR, kitler: KITLER,
    sorunlar: KATALOG_SORUNLARI,
    _denetle: kalibiDenetle,
    _katalogDenetle: katalogDenetle,
    _sayac: function () { return sayac; },
    _depoBosalt: function () { depo.clear(); }
  };
})();
