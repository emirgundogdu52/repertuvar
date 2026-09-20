/* ritim.js — RİTİM MOTORU (2026-09-20, AŞAMA B)
 *
 * Kalıp tabanlı, gerçek zamanlı ritim sequencer'ı. Uzun sabit-BPM loop
 * dosyası YOK: kalıp ritmik olayları tarif ediyor, motor her olayı
 * AudioContext saatine planlıyor, sesler one-shot örneklerden çalıyor.
 * BPM yalnızca olayların zamanlamasını değiştirir — örneklerin perdesi
 * ve hızı sabit kalır.
 *
 * Altyapı ortak: ses.js'teki tek AudioContext ve zamanlayici.js'teki
 * ileri planlamalı transport. Bu modül KENDİ AudioContext'ini açmaz.
 *
 * ── Kalıp biçimi ────────────────────────────────────────────────────────
 * {
 *   id: 'nim_sofyan',
 *   ad: { tr:'Nim Sofyan', en:'Nim Sofyan' },
 *   olcu: '2/4',        // gösterim
 *   zaman: 2,           // ölçüdeki birim sayısı (pay)
 *   birim: 4,           // birimin nota değeri (payda) — 4 dörtlük, 8 sekizlik
 *   gruplama: [1,1],    // toplamı zaman'a eşit olmalı
 *   olaylar: [
 *     { vurus:'DUM', sure:1, vurgu:'strong' },
 *     { vurus:'TEK', sure:1, vurgu:'medium' }
 *   ],
 *   durum: 'aday'       // 'aday' | 'dogrulandi' — müzikolojik onay durumu
 * }
 *
 * Kural: olayların süre toplamı 'zaman'a eşit olmak ZORUNDA. Eşit değilse
 * kalıp reddedilir — ölçü sonunda kayma buradan doğar.
 *
 * BPM tanımı: dakikadaki BİRİM sayısı. 2/4'te dörtlük, 9/8'de sekizlik.
 * Mevcut metronomla aynı kural (orada da her vuruş 60/bpm).
 *
 * ── Kit biçimi ──────────────────────────────────────────────────────────
 * { id:'bendir', ad:'Bendir', kaynak:'dosya'|'dev',
 *   sesler: { DUM:'/sesler/bendir/dum.wav', TEK:'/sesler/bendir/tek.wav' } }
 */
window.Ritim = (function () {

  // ── Vurgu → kazanç ────────────────────────────────────────────────────
  const VURGU = { strong: 1.0, medium: 0.72, weak: 0.5 };

  // ── Kalıp dağarı ──────────────────────────────────────────────────────
  // AŞAMA B'de YALNIZCA Nim Sofyan aktif. Diğer usuller tek tek
  // doğrulanmadan buraya eklenmeyecek.
  const KALIPLAR = {
    nim_sofyan: {
      id: 'nim_sofyan',
      ad: { tr: 'Nim Sofyan', en: 'Nim Sofyan' },
      olcu: '2/4', zaman: 2, birim: 4,
      gruplama: [1, 1],
      olaylar: [
        { vurus: 'DUM', sure: 1, vurgu: 'strong' },
        { vurus: 'TEK', sure: 1, vurgu: 'medium' }
      ],
      durum: 'aday'
    }
  };

  const KITLER = {
    bendir: {
      id: 'bendir', ad: 'Bendir',
      // Gerçek kayıt (CC0). Kaynak ve işlem kaydı: /sesler/bendir/KAYNAK.md
      kaynak: 'dosya',
      sesler: { DUM: '/sesler/bendir/dum.wav', TEK: '/sesler/bendir/tek.wav' }
    }
  };

  /* Kalıbı doğrula: süre toplamı zaman'a eşit mi, sesler kitte var mı. */
  function kalibiDenetle(kalip, tamponlar) {
    if (!kalip || !Array.isArray(kalip.olaylar) || !kalip.olaylar.length)
      return 'kalıp boş';
    const toplam = kalip.olaylar.reduce((t, o) => t + (+o.sure || 0), 0);
    if (Math.abs(toplam - kalip.zaman) > 1e-9)
      return `olay süreleri ${toplam}, ölçü ${kalip.zaman} — eşit değil`;
    if (Array.isArray(kalip.gruplama)) {
      const g = kalip.gruplama.reduce((t, x) => t + x, 0);
      if (Math.abs(g - kalip.zaman) > 1e-9) return `gruplama ${g}, ölçü ${kalip.zaman}`;
    }
    if (tamponlar) {
      for (const o of kalip.olaylar) {
        if (!tamponlar.get(o.vurus)) return `kitte ${o.vurus} sesi yok`;
      }
    }
    return null;
  }

  // ── Örnek deposu ──────────────────────────────────────────────────────
  // Kit başına TEK yükleme. Söz (promise) saklanıyor; aynı kit için ikinci
  // istek aynı sözü alır, ikinci fetch/decode olmaz.
  const depo = new Map();       // kitId → Promise<Map<vurus, AudioBuffer>>
  let sayac = { fetch: 0, decode: 0 };   // testler için

  function decode(actx, ab) {
    // Safari'nin eski geri-çağırmalı biçimi de destekleniyor.
    return new Promise((coz, red) => {
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

    const soz = (async () => {
      const m = new Map();
      for (const [vurus, yol] of Object.entries(kit.sesler)) {
          sayac.fetch++;
        const r = await fetch(yol);
        if (!r.ok) throw new Error(yol + ' yüklenemedi (' + r.status + ')');
        sayac.decode++;
        m.set(vurus, await decode(actx, await r.arrayBuffer()));
      }
      return m;
    })();

    // Başarısız yükleme depoda kalmasın — ama kendiliğinden de tekrar
    // denenmesin. Sonsuz retry olmaması için depo yalnızca çağıran yeniden
    // istediğinde temizlenir.
    soz.catch(() => depo.delete(kitId));
    depo.set(kitId, soz);
    return soz;
  }

  // ── Motor ─────────────────────────────────────────────────────────────
  function olustur(ayar) {
    ayar = ayar || {};
    let kalipId = ayar.kalip || 'nim_sofyan';
    let kitId = ayar.kit || 'bendir';
    let bpm = ayar.bpm || 100;
    let tamponlar = null, transport = null, hazirMi = false;

    /* Kalıbı birim ızgarasına açar: her birim için o birimde başlayan olay
     * (yoksa null). Transport sabit adımlarla ilerliyor, olaylar ızgaraya
     * oturuyor — ölçü sonunda kesintisiz başa dönüyor. */
    function izgara() {
      const k = KALIPLAR[kalipId];
      const g = new Array(k.zaman).fill(null);
      let p = 0;
      for (const o of k.olaylar) {
        if (p < g.length) g[p] = o;
        p += o.sure;
      }
      return g;
    }
    let grid = null;

    function cal(birim, zaman) {
      const o = grid[birim];
      if (!o) return;                       // sessiz birim
      const buf = tamponlar.get(o.vurus);
      if (!buf) return;
      const actx = Ses.ctx();
      const src = actx.createBufferSource();
      src.buffer = buf;
      // BPM örneği HIZLANDIRMAZ: playbackRate'e dokunulmuyor.
      const g = actx.createGain();
      g.gain.value = VURGU[o.vurgu] != null ? VURGU[o.vurgu] : 0.8;
      src.connect(g); g.connect(Ses.cikis());
      src.start(zaman);
    }

    return {
      /* Sesi ve kiti hazırlar. Kullanıcı dokunuşu içinden çağrılmalı.
       * {ok:true} ya da {ok:false, sebep:'...'} döner — çökmez. */
      async hazirla() {
        const r = await Ses.hazirla();
        if (!r.ok) return { ok: false, sebep: 'ses', mesaj: 'Ses açılamadı' };
        if (!KALIPLAR[kalipId]) return { ok: false, sebep: 'kalip', mesaj: 'Kalıp yok: ' + kalipId };
        try {
          tamponlar = await kitYukle(kitId);
        } catch (e) {
          return { ok: false, sebep: 'kit', mesaj: (e && e.message) || 'Kit yüklenemedi' };
        }
        const sorun = kalibiDenetle(KALIPLAR[kalipId], tamponlar);
        if (sorun) return { ok: false, sebep: 'kalip', mesaj: sorun };
        grid = izgara();
        hazirMi = true;
        return { ok: true };
      },

      /* hazirla() başarılı olmadan çalmaz — sessizce "çalışıyor" görünmez. */
      basla() {
        if (!hazirMi) return false;
        if (!transport) {
          transport = Zamanlayici.olustur({
            adimSayisi: () => grid.length,
            adimSuresi: () => 60 / bpm,      // BPM = dakikadaki birim sayısı
            cal: cal
          });
        }
        return transport.basla();
      },

      durdur() { if (transport) transport.durdur(); },
      calisiyorMu() { return !!transport && transport.calisiyorMu(); },

      /* Çalarken değişebilir: bir sonraki planlanan olaydan itibaren geçerli.
       * Örneklerin perdesi etkilenmez. */
      bpmYaz(v) { bpm = Math.min(300, Math.max(30, +v || bpm)); return bpm; },
      bpmOku() { return bpm; },

      kalipYaz(id) {
        if (!KALIPLAR[id]) return false;
        kalipId = id; grid = izgara(); hazirMi = !!tamponlar; return true;
      },

      /* Görsel eşleme için: zamanı gelmiş birimler. */
      gorselAl() { return transport ? transport.gorselAl() : []; },
      kalip() { return KALIPLAR[kalipId]; }
    };
  }

  return {
    olustur, kitYukle,
    kaliplar: KALIPLAR, kitler: KITLER,
    _denetle: kalibiDenetle,
    _sayac: () => sayac,          // testler: kaç kez fetch/decode edildi
    _depoBosalt: () => depo.clear()
  };
})();
