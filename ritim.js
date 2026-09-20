/* ritim.js — RİTİM MOTORU (2026-09-20)
 *
 * Kalıp tabanlı sequencer + çok örnekli (multi-sample) one-shot çalıcı.
 * Uzun sabit-BPM loop dosyası YOK: kalıp ritmik olayları tarif ediyor,
 * motor her olayı AudioContext saatine planlıyor. BPM yalnızca olayların
 * zamanlamasını değiştirir — örneklerin perdesi ve hızı sabit kalır.
 *
 * Altyapı ortak: ses.js (tek AudioContext) + zamanlayici.js (ileri
 * planlamalı transport). Bu modül KENDİ AudioContext'ini açmaz.
 *
 * ── Kalıp biçimi ────────────────────────────────────────────────────────
 * id            benzersiz kimlik
 * ad            {tr, en}
 * olcu          gösterim ('2/4')
 * zaman         ölçüdeki birim sayısı (pay)
 * birim         birimin nota değeri (payda): 4 dörtlük, 8 sekizlik
 * gruplama      toplamı zaman'a eşit dizi
 * altBolunme    bir birimin kaç parçaya bölündüğü (şimdilik 1)
 * olaylar       [{vurus, sure, vurgu}] — süre toplamı zaman'a EŞİT olmalı
 * varsayilanBpm
 * uyumluKitler  bu kalıbın çalınabileceği kit kimlikleri
 * tavirlar      üslup etiketleri — USUL DEĞİLDİR, boş bırakılabilir
 * varyasyon     'basic' | 'full' …
 * durum         'dogrulandi' | 'aday' — yalnız doğrulanmış olanlar gösterilir
 *
 * ÖNEMLİ: usul ≠ tavır, ölçü ≠ tavır. 9/8 kendiliğinden Roman değildir.
 * Müzikolojik olarak doğrulanmamış DÜM/TEK dizileri TAHMİN EDİLMEZ;
 * doğrulanan kalıplar tek tek 'dogrulandi' yapılır.
 *
 * ── Kit biçimi ──────────────────────────────────────────────────────────
 * esleme       kalıptaki olay adı → kitteki artikülasyon ('DUM' → 'dum')
 * sesler       artikülasyon → dosya havuzu (round-robin)
 * kazanc       kit seviyesi çarpanı (1.0 = dokunma)
 * gosterilsin  arayüzde listelensin mi
 */
window.Ritim = (function () {

  const VURGU = { strong: 1.0, medium: 0.72, weak: 0.5 };

  // ── Kalıplar ──────────────────────────────────────────────────────────
  // Production'da YALNIZCA Nim Sofyan. Diğer usuller müzikolojik
  // doğrulamadan geçmeden buraya eklenmeyecek.
  const KALIPLAR = {
    nim_sofyan: {
      id: 'nim_sofyan',
      ad: { tr: 'Nim Sofyan', en: 'Nim Sofyan' },
      olcu: '2/4', zaman: 2, birim: 4,
      gruplama: [1, 1], altBolunme: 1,
      olaylar: [
        { vurus: 'DUM', sure: 1, vurgu: 'strong' },
        { vurus: 'TEK', sure: 1, vurgu: 'medium' }
      ],
      varsayilanBpm: 100,
      uyumluKitler: ['bendir', 'darbuka'],
      tavirlar: [],
      varyasyon: 'basic',
      durum: 'dogrulandi'
    }
  };

  // ── Örnek havuzları ───────────────────────────────────────────────────
  // FreePats World Percussion (CC0) + Freesound bendir_basicStrokes (CC0).
  // Kaynak ve lisans kaydı: /sesler/KAYNAK.md
  const SESLER = {
    bendir: {
      dum: ['/sesler/bendir/dum.wav'],
      tek: ['/sesler/bendir/tek.wav']
    },
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
      // FreePats bu artikülasyonları yalnız "Cajón flamenco 1/2/3" diye
      // tanımlıyor; bass/slap/tone gibi adlar UYDURULMADI.
      cajon_1: ['101','102','216','201','214','104','219','105','103','221','202']
               .map(function (n) { return '/sesler/cajon/' + n + '.wav'; }),
      cajon_2: ['106','107','109','110','115','203','206','205','212','111','204','222','211','208','209','210']
               .map(function (n) { return '/sesler/cajon/' + n + '.wav'; }),
      cajon_3: ['217','218'].map(function (n) { return '/sesler/cajon/' + n + '.wav'; })
    }
  };

  const KITLER = {
    bendir: {
      id: 'bendir', ad: 'Bendir', lisans: 'CC0', kazanc: 1.0, gosterilsin: true,
      esleme: { DUM: 'dum', TEK: 'tek' }, sesler: SESLER.bendir
    },
    darbuka: {
      id: 'darbuka', ad: 'Darbuka', lisans: 'CC0', kazanc: 1.0, gosterilsin: true,
      // PA ileride daha zengin varyasyonlarda kullanılacak.
      esleme: { DUM: 'dum', TEK: 'tek', PA: 'pa' }, sesler: SESLER.darbuka
    },
    // Veri modelinde hazır, arayüzde henüz gösterilmiyor.
    tambourine: {
      id: 'tambourine', ad: 'Tef', lisans: 'CC0', kazanc: 1.0, gosterilsin: false,
      esleme: { DUM: 'hit', TEK: 'fast' }, sesler: SESLER.tambourine
    },
    shaker: {
      id: 'shaker', ad: 'Shaker', lisans: 'CC0', kazanc: 1.0, gosterilsin: false,
      esleme: { DUM: 'slow', TEK: 'fast' }, sesler: SESLER.shaker
    },
    cajon: {
      id: 'cajon', ad: 'Cajón', lisans: 'CC0', kazanc: 1.0, gosterilsin: false,
      esleme: { DUM: 'cajon_1', TEK: 'cajon_2' }, sesler: SESLER.cajon
    }
  };

  /* Arayüzde gösterilecek kitler: görünür VE bu kalıpla uyumlu olanlar. */
  function kitListesi(kalipId) {
    const k = KALIPLAR[kalipId];
    return Object.keys(KITLER).map(function (id) { return KITLER[id]; })
      .filter(function (kit) {
        return kit.gosterilsin && (!k || !k.uyumluKitler || k.uyumluKitler.indexOf(kit.id) >= 0);
      });
  }
  function kalipListesi() {
    return Object.keys(KALIPLAR).map(function (id) { return KALIPLAR[id]; })
      .filter(function (k) { return k.durum === 'dogrulandi'; });
  }

  /* Kalıp + kit denetimi. Süre toplamı ölçüye eşit değilse ölçü sonunda
   * kayma doğar — sessizce düzeltmek yerine reddediyoruz. */
  function kalibiDenetle(kalip, kit, havuzlar) {
    if (!kalip || !Array.isArray(kalip.olaylar) || !kalip.olaylar.length) return 'kalıp boş';
    const toplam = kalip.olaylar.reduce(function (t, o) { return t + (+o.sure || 0); }, 0);
    if (Math.abs(toplam - kalip.zaman) > 1e-9)
      return 'olay süreleri ' + toplam + ', ölçü ' + kalip.zaman + ' — eşit değil';
    if (Array.isArray(kalip.gruplama)) {
      const g = kalip.gruplama.reduce(function (t, x) { return t + x; }, 0);
      if (Math.abs(g - kalip.zaman) > 1e-9) return 'gruplama ' + g + ', ölçü ' + kalip.zaman;
    }
    if (kit) {
      for (const o of kalip.olaylar) {
        const art = kit.esleme[o.vurus];
        if (!art) return kit.ad + ' kitinde ' + o.vurus + ' karşılığı yok';
        if (havuzlar && !(havuzlar[art] && havuzlar[art].length))
          return kit.ad + '/' + art + ' örneği yüklenemedi';
      }
    }
    return null;
  }

  // ── Örnek deposu — KİT BAŞINA tembel yükleme ──────────────────────────
  // Paketteki dosyaların tamamı açılışta çözülmez; yalnız seçilen kitin
  // havuzu indirilip decode edilir ve bellekte kalır.
  const depo = new Map();   // kitId → Promise<{artikülasyon: AudioBuffer[]}>
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
      const adlar = Object.keys(kit.sesler);
      for (const art of adlar) {
        // Havuz paralel indiriliyor. Bir dosya düşerse tüm kit düşer:
        // yarım havuzla çalıp sessiz vuruş üretmekten iyidir.
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

    // Başarısız yükleme depoda kalmasın; kendiliğinden de tekrar
    // denenmesin — retry ancak kullanıcı yeniden başlatınca olur.
    soz.catch(function () { depo.delete(kitId); });
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
    // Round-robin: artikülasyon başına sıradaki örnek. Başlangıç noktası
    // rastgele, ilerleyiş deterministik — aynı vuruş peş peşe geldiğinde
    // aynı dosya iki kez çalmaz.
    let sira = {};

    function izgara() {
      const k = KALIPLAR[kalipId];
      const g = new Array(k.zaman).fill(null);
      let p = 0;
      for (const o of k.olaylar) { if (p < g.length) g[p] = o; p += o.sure; }
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

    /* Örnek SEÇİMİ burada yapılıyor ama planlanan ZAMANA dokunulmuyor:
     * zaman zamanlayici.js'ten geliyor, seçim onu değiştirmiyor. */
    function cal(birim, zaman) {
      const o = grid[birim];
      if (!o) return;
      const kit = KITLER[kitId];
      const buf = siradakiOrnek(kit.esleme[o.vurus]);
      if (!buf) return;
      const actx = Ses.ctx();
      const src = actx.createBufferSource();
      src.buffer = buf;                          // playbackRate'e DOKUNULMUYOR
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
        if (!KALIPLAR[kalipId]) return { ok: false, sebep: 'kalip', mesaj: 'Kalıp yok: ' + kalipId };
        if (!KITLER[kitId]) return { ok: false, sebep: 'kit', mesaj: 'Çalgı yok: ' + kitId };
        try {
          havuzlar = await kitYukle(kitId);
        } catch (e) {
          return { ok: false, sebep: 'kit', mesaj: (e && e.message) || 'Çalgı yüklenemedi' };
        }
        const sorun = kalibiDenetle(KALIPLAR[kalipId], KITLER[kitId], havuzlar);
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
        if (!KALIPLAR[id]) return false;
        kalipId = id; grid = izgara();
        // Kit uyumu kalıba göre değişebilir: yeniden denetle.
        hazirMi = !!havuzlar && !kalibiDenetle(KALIPLAR[id], KITLER[kitId], havuzlar);
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
    _denetle: kalibiDenetle,
    _sayac: function () { return sayac; },
    _depoBosalt: function () { depo.clear(); }
  };
})();
