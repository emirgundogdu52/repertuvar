/* ritimcalar.js — RİTİM BANKASI ÇALARI (2026-09-21)
 *
 * Kullanıcının kestiği döngüleri (ritimler tablosu, ritim-loops kovası)
 * bir esere bağlı olarak çalar:
 *   • döngüyü eserin temposuna GERER (perde değişmeden) ve istenirse tonunu
 *     kaydırır — SoundTouch ile, çalmadan ÖNCE, bir kez
 *   • gerilmiş döngüyü Web Audio'nun kendi döngüsüyle çalar: örnek
 *     hassasiyetinde, boşluksuz
 *   • ileri/geri basınca bir sonraki ÖLÇÜ BAŞINDA diğer varyasyona geçer,
 *     klavyedeki gibi
 *
 * NEDEN ÖNCEDEN GERME: SoundTouch'ın canlı oynatıcısı (PitchShifter) döngü
 * bilmiyor ve ölçü başında geçiş için zaman planlaması yapılamıyor. Kısa bir
 * döngüyü bir kez işleyip hazır tampon olarak çalmak hem kusursuz dönüyor
 * hem de her şeyi AudioContext saatine bağlıyor.
 *
 * DİKİŞ: Zaman germe algoritması başta ve sonda bağlam bulamayınca bozulur.
 * Bu yüzden döngü ARKA ARKAYA ÜÇ KEZ işleniyor ve ortadaki kopya alınıyor —
 * iki yanında da gerçek bağlam var. Sonra dongu.js'in çapraz geçişi
 * uygulanıyor; döngü sonu başına kayıttaki doğal geçişle bağlanıyor.
 *
 * Bağımlılıklar: dongu.js (Dongu), ses.js (Ses) ve dinamik import edilen
 * soundtouch.js (ES modülü). Kendi AudioContext'ini AÇMAZ.
 */
(function (kok) {

  /* Döngüyü gerer ve/veya tonunu kaydırır.
   *   kanallar: Float32Array[]  (1 ya da 2 kanal)
   *   oran    : hedefTempo / orijinalTempo  (1.1 = %10 hızlı)
   *   yarimTon: -12..12
   *   ST      : soundtouch.js modülü
   * Dönen: Float32Array[] — uzunluğu TAM olarak round(L / oran). */
  function germe(kanallar, sr, oran, yarimTon, ST, DonguMod) {
    const L = kanallar[0].length;
    const hedefL = Math.round(L / oran);
    if (Math.abs(oran - 1) < 1e-6 && !yarimTon) return kanallar.map(function (c) { return c.slice(); });

    const sol = kanallar[0], sag = kanallar[kanallar.length > 1 ? 1 : 0];
    const uc = function (k) { const d = new Float32Array(L * 3); d.set(k, 0); d.set(k, L); d.set(k, 2 * L); return d; };
    const ucSol = uc(sol), ucSag = uc(sag);
    const kaynak = { numberOfChannels: 2, length: 3 * L,
                     getChannelData: function (c) { return c ? ucSag : ucSol; } };

    const st = new ST.SoundTouch();
    // Vurmalı içerik için ayar (ms): dizi 20, arama 8, bindirme 6.
    // Varsayılan (otomatik) ayarlar vuruşları 2,4-7,4 ms oynatıyordu; bu
    // ayarla en fazla ~4 ms (ölçüldü: test_germe). Daha kısa dizi (10 ms)
    // kaymayı ~1,7 ms'ye indiriyor ama bastaki pesleri (55-110 Hz, periyodu
    // 9-18 ms) pürüzlendiriyor — klavye ritimlerinde bas olduğu için 20'de
    // bırakıldı. Örnekleme hızı da gerçeğine ayarlanıyor (varsayılan 44100
    // sabit; 48 kHz dosyada ms pencereleri kayıyordu).
    st.stretch.setParameters(sr, 20, 8, 6);
    st.tempo = oran;
    st.pitchSemitones = yarimTon || 0;
    const filtre = new ST.SimpleFilter(new ST.WebAudioBufferSource(kaynak), st);

    const PARCA = 8192;
    const ara = new Float32Array(PARCA * 2);
    const cikSol = new Float32Array(3 * hedefL + sr);
    const cikSag = new Float32Array(3 * hedefL + sr);
    let n = 0;
    for (;;) {
      const k = filtre.extract(ara, PARCA);
      if (!k) break;
      for (let i = 0; i < k && n < cikSol.length; i++, n++) {
        cikSol[n] = ara[i * 2]; cikSag[n] = ara[i * 2 + 1];
      }
      if (n >= cikSol.length) break;
    }
    // Ortadaki kopya: kuramsal olarak çıkışta L/oran'da başlar. AMA SoundTouch
    // sabit olmayan bir gecikme ekliyor (tempoya göre 5-45 ms ölçtük) ve bu,
    // döngünün ilk vuruşunu kaydırıyor. Gerçek başlangıcı zarf korelasyonuyla
    // buluyoruz: orijinal döngünün (gerilmiş zamana ölçeklenmiş) enerji
    // zarfını çıkışın zarfıyla ±250 ms içinde karşılaştırıp en iyi uyan
    // kaymayı alıyoruz. Vuruşa değil ZARFA baktığı için atağı belirsiz
    // döngülerde de çalışır.
    const bas = hedefL + gecikmeBul(sol, L, cikSol, n, hedefL, oran, sr);
    if (bas < 0 || bas + hedefL > n) {
      // SoundTouch son kısmı boşaltmaz; yine de ortadaki kopya tam gelmeliydi.
      throw new Error('germe: çıktı kısa (' + n + ' < ' + (bas + hedefL) + ')');
    }
    const cikis = kanallar.length > 1 ? [cikSol.subarray(0, n), cikSag.subarray(0, n)]
                                      : [cikSol.subarray(0, n)];
    // Çapraz geçiş: sondaki birkaç ms, orta kopyadan hemen önceki (1. kopyanın
    // sonu) sesle harmanlanıyor. onPay 0: başlangıç tam downbeat'te.
    return DonguMod.donguKes(cikis, sr, bas / sr, hedefL / sr, 0, 6);
  }

  /* 1 ms'lik RMS zarfı. */
  function zarf(ch, bas, son, adim) {
    const say = Math.max(0, Math.floor((son - bas) / adim));
    const e = new Float32Array(say);
    for (let i = 0; i < say; i++) {
      let t = 0;
      const a = bas + i * adim;
      for (let j = a; j < a + adim; j++) t += ch[j] * ch[j];
      e[i] = Math.sqrt(t / adim);
    }
    return e;
  }

  /* Çıkıştaki orta kopyanın kuramsal başlangıcına göre gerçek kayma (örnek).
   * Normalize çapraz korelasyon, 1 ms çözünürlük, ±250 ms arama. */
  function gecikmeBul(giris, L, cikis, n, hedefL, oran, sr) {
    const adim = Math.max(1, Math.round(sr * 0.001));
    const eGir = zarf(giris, 0, L, adim);
    const nGir = eGir.length;
    if (!nGir) return 0;
    // gerilmiş zamana ölçeklenmiş beklenen zarf (bir döngü boyu)
    const nBek = Math.floor(hedefL / adim);
    const bek = new Float32Array(nBek);
    for (let k = 0; k < nBek; k++) bek[k] = eGir[Math.floor(k * oran) % nGir];
    const ARA = Math.round(250 / 1);            // ±250 bin (ms)
    const b0 = Math.floor(hedefL / adim);
    const eCik = zarf(cikis, 0, n, adim);
    let enIyi = 0, enIyiPuan = -Infinity;
    let bekOrt = 0; for (let k = 0; k < nBek; k++) bekOrt += bek[k]; bekOrt /= nBek;
    for (let lag = -ARA; lag <= ARA; lag++) {
      const bas = b0 + lag;
      if (bas < 0 || bas + nBek > eCik.length) continue;
      let cikOrt = 0; for (let k = 0; k < nBek; k++) cikOrt += eCik[bas + k]; cikOrt /= nBek;
      let pay = 0, p1 = 0, p2 = 0;
      for (let k = 0; k < nBek; k++) {
        const a = eCik[bas + k] - cikOrt, b = bek[k] - bekOrt;
        pay += a * b; p1 += a * a; p2 += b * b;
      }
      const puan = (p1 > 0 && p2 > 0) ? pay / Math.sqrt(p1 * p2) : 0;
      if (puan > enIyiPuan) { enIyiPuan = puan; enIyi = lag; }
    }
    return enIyi * adim;
  }

  // ── Çalar ────────────────────────────────────────────────────────────
  /* ayar: { ctx: () => AudioContext, cikis: () => AudioNode, ST, Dongu }
   * Ritimler: [{ id, ad, tempo, zaman_sayisi, olcu_sayisi, kanallar, sr }] */
  function olustur(ayar) {
    let liste = [];            // yüklü ritimler (orijinal kanallarıyla)
    let hazir = [];            // her ritmin gerilmiş AudioBuffer'ı
    let hedefTempo = null;     // null → her ritim kendi temposunda
    let yarimTon = 0;
    let sira = 0;
    let calan = null;          // {src, gain, baslangic, dongu, olcu, i}
    let bekleyen = null;       // ölçü başını bekleyen geçiş
    let dinleyici = function () {};

    function tamponYap(i) {
      const r = liste[i];
      const oran = hedefTempo ? hedefTempo / r.tempo : 1;
      const gerilmis = germe(r.kanallar, r.sr, oran, yarimTon, ayar.ST, ayar.Dongu);
      const actx = ayar.ctx();
      const buf = actx.createBuffer(gerilmis.length, gerilmis[0].length, r.sr);
      gerilmis.forEach(function (d, c) { buf.getChannelData(c).set(d); });
      return buf;
    }
    function hepsiniHazirla() { hazir = liste.map(function (_, i) { return tamponYap(i); }); }

    /* ofset: döngünün içinden başlama noktası (sn). Kaynağın "sanal"
     * başlangıcı zaman − ofset sayılır; ölçü başı hesabı buna göre yapılır. */
    function kaynakBaslat(i, zaman, ofset) {
      ofset = ofset || 0;
      const actx = ayar.ctx();
      const src = actx.createBufferSource();
      src.buffer = hazir[i];
      src.loop = true;
      const g = actx.createGain();
      src.connect(g); g.connect(ayar.cikis());
      src.start(zaman, ofset);
      return { src: src, gain: g, baslangic: zaman - ofset, dongu: hazir[i].duration,
               olcu: Math.max(1, liste[i].olcu_sayisi || 1), i: i };
    }
    function kaynakDurdur(k, zaman) {
      if (!k) return;
      try { k.src.stop(zaman); } catch (e) {}
      const src = k.src;
      src.onended = function () { try { src.disconnect(); } catch (e) {} };
    }

    /* Bir sonraki ölçü başı (AudioContext saati). En az 30 ms ileride —
     * planlama için pay. */
    function sonrakiOlcuBasi() {
      const actx = ayar.ctx();
      const simdi = actx.currentTime + 0.03;
      const olcuSuresi = calan.dongu / calan.olcu;
      const gecen = simdi - calan.baslangic;
      return calan.baslangic + Math.ceil(gecen / olcuSuresi) * olcuSuresi;
    }

    /* Ölçü başında geçiş.
     * Üst üste basılırsa (geçiş henüz gerçekleşmeden): Web Audio'da planlanmış
     * bir stop() GERİ ALINAMIYOR — duyulan ritim o ölçü başında zaten
     * susacak. Bu yüzden aynı ölçü başı korunuyor, yalnız GELECEK kaynak
     * değiştiriliyor. Kullanıcı duyduğu ritme geri dönmek isterse, o ritim
     * aynı anda kaldığı yerden (döngü içindeki konumundan) yeniden başlatılıyor
     * — müzikte kopukluk olmuyor. */
    function gecisPlanla(yeniI) {
      if (!calan) { sira = yeniI; dinleyici(); return; }
      const actx = ayar.ctx();
      if (bekleyen && actx.currentTime < bekleyen.zaman) {
        kaynakDurdur(bekleyen.k, 0);        // henüz başlamamıştı
        const t = bekleyen.zaman, eski = bekleyen.eski;
        let yeni;
        if (yeniI === eski.i && hazir[yeniI] === eski.src.buffer) {
          const ofset = ((t - eski.baslangic) % eski.dongu + eski.dongu) % eski.dongu;
          yeni = kaynakBaslat(yeniI, t, ofset);
        } else {
          yeni = kaynakBaslat(yeniI, t);
        }
        bekleyen.k = yeni;
        calan = yeni; sira = yeniI;
        dinleyici({ gecis: t, eski: eski.i, yeni: yeniI });
        return;
      }
      const t = sonrakiOlcuBasi();
      let ofset = 0;
      if (yeniI === calan.i) {
        // Aynı ritim, yeni tampon (tempo/ton değişti): döngünün BAŞINA
        // dönmesin, o anda hangi ölçüdeyse yeni tamponda da oradan sürsün.
        const eskiOlcu = calan.dongu / calan.olcu;
        const k = ((Math.round((t - calan.baslangic) / eskiOlcu)) % calan.olcu + calan.olcu) % calan.olcu;
        ofset = k * (hazir[yeniI].duration / Math.max(1, liste[yeniI].olcu_sayisi || 1));
      }
      const yeni = kaynakBaslat(yeniI, t, ofset);
      kaynakDurdur(calan, t);
      const eski = calan;
      bekleyen = { k: yeni, zaman: t, eski: eski };
      calan = yeni; sira = yeniI;
      dinleyici({ gecis: t, eski: eski.i, yeni: yeniI });
    }

    return {
      /* Ritimleri yükler ve gerer. Çalıyorsa durdurur. */
      yukle(ritimler) {
        this.durdur();
        liste = ritimler.slice();
        sira = 0;
        hepsiniHazirla();
      },
      basla(i) {
        if (!liste.length) return false;
        if (i != null) sira = Math.max(0, Math.min(liste.length - 1, i));
        this.durdur();
        calan = kaynakBaslat(sira, ayar.ctx().currentTime + 0.05);
        bekleyen = null;
        dinleyici();
        return true;
      },
      durdur() {
        if (bekleyen) { kaynakDurdur(bekleyen.k, 0); bekleyen = null; }
        if (calan) { kaynakDurdur(calan, 0); calan = null; }
        dinleyici();
      },
      sonraki() { if (liste.length > 1) gecisPlanla((sira + 1) % liste.length); },
      onceki() { if (liste.length > 1) gecisPlanla((sira - 1 + liste.length) % liste.length); },
      git(i) { if (i >= 0 && i < liste.length && i !== sira) gecisPlanla(i); },

      /* Tempo/ton değişince tamponlar yeniden gerilir; çalıyorsa bir sonraki
       * ölçü başında yeni tampona geçilir, müzik kesilmez. */
      ayarla(tempo, ton) {
        hedefTempo = tempo || null;
        yarimTon = ton || 0;
        if (!liste.length) return;
        hepsiniHazirla();
        if (calan) gecisPlanla(sira);
      },

      calisiyorMu() { return !!calan; },
      sira() { return sira; },
      adet() { return liste.length; },
      hedefTempo() { return hedefTempo; },
      tampon(i) { return hazir[i]; },
      _calan() { return calan; },
      dinle(f) { dinleyici = f || function () {}; }
    };
  }

  const RitimCalar = { germe: germe, olustur: olustur };
  if (typeof module !== 'undefined' && module.exports) module.exports = RitimCalar;
  else kok.RitimCalar = RitimCalar;
})(typeof window !== 'undefined' ? window : this);
