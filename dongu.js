/* dongu.js — DÖNGÜ KESME ÇEKİRDEĞİ (2026-09-20)
 *
 * Saf fonksiyonlar: DOM yok, AudioContext yok. Kanal verisi (Float32Array
 * dizisi) alır, kanal verisi ya da sayı döndürür. Böylece hem ritim-kes.html
 * kullanır hem de Node'da test edilir.
 *
 * TEMEL İLKE — KESME NOKTASINI KULLANICI GÖZLE SEÇMEZ.
 * Elle kesilen döngü birkaç turda kayar. Kullanıcı başlangıcı KABACA
 * işaretler; araç en yakın vuruşun atağına oturtur. Bitiş noktası hiç
 * seçilmez: tempo × zaman sayısı × ölçü sayısından HESAPLANIR.
 *
 * DİKİŞ: döngünün sonu başına bağlanırken tık sesi çıkmaması için sondaki
 * birkaç milisaniye, kayıtta başlangıçtan HEMEN ÖNCE gelen sesle harmanlanır
 * (klasik döngü çapraz geçişi). Böylece son örnekten ilk örneğe geçiş,
 * kayıttaki doğal geçişin aynısı olur.
 */
(function (kok) {

  /* Döngü süresi (sn). BPM = dakikadaki birim sayısı — metronom ve ritim
   * motoruyla aynı tanım (9/8'de sekizlik, 4/4'te dörtlük). */
  function donguSuresi(tempo, zamanSayisi, olcuSayisi) {
    if (!(tempo > 0) || !(zamanSayisi > 0) || !(olcuSayisi > 0)) return 0;
    return olcuSayisi * zamanSayisi * 60 / tempo;
  }

  /* Birden çok kanalı tek bir mutlak genlik dizisine indirger (çözümleme için). */
  function genlik(kanallar) {
    const n = kanallar[0].length, c = kanallar.length;
    const g = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let t = 0;
      for (let k = 0; k < c; k++) t += Math.abs(kanallar[k][i]);
      g[i] = t / c;
    }
    return g;
  }

  /* Tıklanan noktanın çevresinde en yakın atağı bulur.
   * Yöntem: 5 ms'lik pencerelerde enerji; enerjideki en büyük YÜKSELİŞ atak
   * adayıdır. Aday bulunduktan sonra, o yükselişin başladığı yer — yerel
   * tepenin %10'unu ilk aşan örnek — atak noktası sayılır. Oda gürültüsü
   * atak sanılmasın diye mutlak eşik yerine YEREL tepeye göre bakılıyor.
   * Dönen değer saniye; bulunamazsa tıklanan nokta aynen döner. */
  function atakBul(kanallar, sr, merkezSn, pencereSn) {
    pencereSn = pencereSn || 0.15;
    const g = genlik(kanallar);
    const n = g.length;
    const bas = Math.max(0, Math.floor((merkezSn - pencereSn) * sr));
    const son = Math.min(n, Math.ceil((merkezSn + pencereSn) * sr));
    const adim = Math.max(1, Math.floor(sr * 0.005));
    if (son - bas < adim * 3) return merkezSn;

    // pencere enerjileri
    const e = [];
    for (let i = bas; i + adim <= son; i += adim) {
      let t = 0;
      for (let j = i; j < i + adim; j++) t += g[j] * g[j];
      e.push({ i: i, e: t / adim });
    }
    // en büyük yükseliş; eşitlikte tıklanan noktaya yakın olan
    let enIyi = -1, enIyiDeger = 0;
    for (let k = 1; k < e.length; k++) {
      const yukselis = e[k].e - e[k - 1].e;
      if (yukselis <= 0) continue;
      const uzaklik = Math.abs(e[k].i / sr - merkezSn) / pencereSn;   // 0..1
      const puan = yukselis * (1 - 0.35 * uzaklik);                    // yakına hafif öncelik
      if (puan > enIyiDeger) { enIyiDeger = puan; enIyi = k; }
    }
    if (enIyi < 1) return merkezSn;

    // yükselişin başladığı yer: önceki pencereden başlayıp yerel tepeye bak
    const tBas = e[enIyi - 1].i;
    const tSon = Math.min(n, e[enIyi].i + adim * 4);
    let tepe = 0;
    for (let i = tBas; i < tSon; i++) if (g[i] > tepe) tepe = g[i];
    if (tepe <= 0) return merkezSn;
    const esik = tepe * 0.10;
    for (let i = tBas; i < tSon; i++) {
      if (g[i] >= esik) return i / sr;
    }
    return e[enIyi].i / sr;
  }

  /* Döngüyü keser ve dikişi hazırlar.
   * basSn : atak noktası (atakBul'un sonucu)
   * sureSn: donguSuresi()
   * onPay : atağın ÖNÜNDE bırakılan pay (transient kesilmesin) — 2 ms
   * caprazMs: dikiş çapraz geçişi — 6 ms
   * Döngünün başlangıcı atak − onPay. Uzunluk TAM sureSn; pay yalnız
   * başlangıcı kaydırır, döngüyü uzatmaz — yoksa tempo kayar. */
  function donguKes(kanallar, sr, basSn, sureSn, onPayMs, caprazMs) {
    onPayMs = onPayMs == null ? 2 : onPayMs;
    caprazMs = caprazMs == null ? 6 : caprazMs;
    const n = kanallar[0].length;
    const uzunluk = Math.round(sureSn * sr);
    let bas = Math.round(basSn * sr) - Math.round(onPayMs / 1000 * sr);
    if (bas < 0) bas = 0;
    if (uzunluk <= 0) throw new Error('döngü süresi sıfır');
    if (bas + uzunluk > n) throw new Error('döngü kaydın sonunu aşıyor');

    const cg = Math.min(Math.round(caprazMs / 1000 * sr), bas, Math.floor(uzunluk / 4));
    return kanallar.map(function (kaynak) {
      const d = new Float32Array(uzunluk);
      d.set(kaynak.subarray(bas, bas + uzunluk));
      if (cg > 0) {
        // Son cg örnek, kayıtta başlangıçtan hemen önceki cg örnekle
        // harmanlanıyor: döngü başa döndüğünde süreklilik korunuyor.
        for (let i = 0; i < cg; i++) {
          const t = (i + 1) / cg;               // 0 → 1
          const son = uzunluk - cg + i;
          d[son] = d[son] * (1 - t) + kaynak[bas - cg + i] * t;
        }
      } else {
        // Başlangıçtan önce yeterli ses yok: kısa bir fade-out ile tıkı önle.
        const f = Math.min(Math.round(0.004 * sr), uzunluk);
        for (let i = 0; i < f; i++) d[uzunluk - 1 - i] *= i / f;
      }
      return d;
    });
  }

  /* Dikişteki sıçrama: son örnekten ilk örneğe geçişteki fark, döngünün
   * kendi içindeki tipik örnekten-örneğe farka oranla. ~1 civarı temiz,
   * büyük değerler tık demektir. Önizleme ekranında gösterilebilir. */
  function dikisSicramasi(kanallar) {
    let sicrama = 0, tipik = 0, say = 0;
    for (const d of kanallar) {
      sicrama = Math.max(sicrama, Math.abs(d[0] - d[d.length - 1]));
      for (let i = 1; i < d.length; i += 7) { tipik += Math.abs(d[i] - d[i - 1]); say++; }
    }
    tipik = tipik / Math.max(1, say);
    return tipik > 0 ? sicrama / tipik : 0;
  }

  /* 16-bit PCM WAV. Stereo korunur. */
  function wavKodla(kanallar, sr) {
    const c = kanallar.length, n = kanallar[0].length;
    const veriBayt = n * c * 2;
    const ab = new ArrayBuffer(44 + veriBayt);
    const v = new DataView(ab);
    let o = 0;
    function yaz(s) { for (let i = 0; i < s.length; i++) v.setUint8(o++, s.charCodeAt(i)); }
    yaz('RIFF'); v.setUint32(o, 36 + veriBayt, true); o += 4; yaz('WAVE');
    yaz('fmt '); v.setUint32(o, 16, true); o += 4;
    v.setUint16(o, 1, true); o += 2;                 // PCM
    v.setUint16(o, c, true); o += 2;
    v.setUint32(o, sr, true); o += 4;
    v.setUint32(o, sr * c * 2, true); o += 4;
    v.setUint16(o, c * 2, true); o += 2;
    v.setUint16(o, 16, true); o += 2;
    yaz('data'); v.setUint32(o, veriBayt, true); o += 4;
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < c; k++) {
        let s = Math.max(-1, Math.min(1, kanallar[k][i]));
        v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2;
      }
    }
    return ab;
  }

  /* Dalga formu için sütun başına min/max. */
  function tepeler(kanal, basOrnek, sonOrnek, sutun) {
    const aralik = Math.max(1, sonOrnek - basOrnek);
    const mn = new Float32Array(sutun), mx = new Float32Array(sutun);
    for (let s = 0; s < sutun; s++) {
      const a = basOrnek + Math.floor(s * aralik / sutun);
      const b = basOrnek + Math.floor((s + 1) * aralik / sutun);
      let lo = 0, hi = 0;
      for (let i = a; i < Math.max(b, a + 1) && i < kanal.length; i++) {
        const x = kanal[i];
        if (x < lo) lo = x; if (x > hi) hi = x;
      }
      mn[s] = lo; mx[s] = hi;
    }
    return { mn: mn, mx: mx };
  }

  const Dongu = { donguSuresi, atakBul, donguKes, dikisSicramasi, wavKodla, tepeler, genlik };
  if (typeof module !== 'undefined' && module.exports) module.exports = Dongu;
  else kok.Dongu = Dongu;
})(typeof window !== 'undefined' ? window : this);
