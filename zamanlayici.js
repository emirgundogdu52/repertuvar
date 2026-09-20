/* zamanlayici.js — ORTAK ZAMANLAYICI / TRANSPORT (2026-09-20)
 *
 * AŞAMA A: metronom.html içindeki scheduler mantığı buraya taşındı.
 * Davranış BİREBİR korundu — LOOKAHEAD, SCHEDULE_AHEAD, başlangıç
 * gecikmesi ve planlama döngüsü aynı. Tek fark: kalıbı artık modül
 * bilmiyor, çağıran veriyor. Ritim Motoru da aynı modülü kullanacak.
 *
 * Neden setTimeout + ileri planlama (Chris Wilson deseni):
 * setTimeout tek başına müzikal zamanlama için güvenilmez — sekme arka
 * plana düştüğünde kısılıyor, ana iş parçacığı meşgulken kayıyor.
 * Burada setTimeout yalnızca 25 ms'de bir UYANMAK için; sesler
 * AudioContext'in kendi saatine göre, 120 ms ilerisi önceden planlanıyor.
 *
 * Ses çekirdeği ses.js'te; bu modül onun context'ini kullanır, kendi
 * AudioContext'ini AÇMAZ.
 *
 * Kullanım:
 *   const t = Zamanlayici.olustur({
 *     adimSayisi: () => pattern.length,      // kaç adımda bir başa döner
 *     adimSuresi: () => 60 / bpm,            // bir adım kaç saniye
 *     cal: (adim, zaman) => click(...)       // sesi O ZAMANA planla
 *   });
 *   t.basla();                               // Ses.hazirla() BAŞARILI olduktan sonra
 *   t.gorselAl().forEach(o => goster(o.adim));   // her karede
 *   t.durdur();
 */
window.Zamanlayici = (function () {
  const LOOKAHEAD = 25;         // ms — zamanlayıcının uyanma sıklığı
  const SCHEDULE_AHEAD = 0.12;  // sn — bu kadar ilerisi önceden planlanır
  const BASLANGIC = 0.06;       // sn — ilk vuruş için küçük pay

  function olustur(ayar) {
    let calisiyor = false, timerId = null;
    let adim = 0, siradakiZaman = 0, kuyruk = [];

    function planla() {
      // durdur() ile zaten ateşlenmiş bir timer arasındaki yarışa karşı:
      // clearTimeout kaçırırsa burada duruyoruz.
      if (!calisiyor) return;
      const actx = Ses.ctx();
      if (!actx) { calisiyor = false; return; }
      while (siradakiZaman < actx.currentTime + SCHEDULE_AHEAD) {
        ayar.cal(adim, siradakiZaman);
        kuyruk.push({ adim: adim, zaman: siradakiZaman });
        siradakiZaman += ayar.adimSuresi();
        const n = Math.max(1, ayar.adimSayisi() | 0);
        adim = (adim + 1) % n;
      }
      timerId = setTimeout(planla, LOOKAHEAD);
    }

    return {
      /* Ses.hazirla() başarılı döndükten SONRA çağrılmalı — context yoksa
       * false döner, sessizce çalışıyormuş gibi yapmaz. */
      basla() {
        if (calisiyor) return true;
        const actx = Ses.ctx();
        if (!actx) return false;
        calisiyor = true;
        adim = 0; kuyruk = [];
        siradakiZaman = actx.currentTime + BASLANGIC;
        planla();
        return true;
      },

      durdur() {
        calisiyor = false;
        clearTimeout(timerId); timerId = null;
        kuyruk = [];
      },

      /* Görsel eşleme: ses planlanan zamanda çalıyor, görsel de aynı zamanı
       * bekliyor. Zamanı gelmiş olayları döndürür, kuyruktan düşürür. */
      gorselAl() {
        const actx = Ses.ctx();
        if (!actx) return [];
        const simdi = actx.currentTime;
        const cikan = [];
        while (kuyruk.length && kuyruk[0].zaman <= simdi) cikan.push(kuyruk.shift());
        return cikan;
      },

      calisiyorMu() { return calisiyor; },
      basaAl() { adim = 0; }
    };
  }

  return { olustur, LOOKAHEAD, SCHEDULE_AHEAD };
})();
