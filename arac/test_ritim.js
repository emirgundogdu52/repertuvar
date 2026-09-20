/* test_ritim.js — AŞAMA B testleri
 *
 * Gerçek tarayıcı yok: AudioContext, fetch ve setTimeout sahte.
 * Sanal saat gerçek zamandan bağımsız ilerliyor, böylece 5 dakikalık
 * playback saniyeler içinde sınanıyor.
 */
const fs = require('fs');

function ortam() {
  const o = { t: 0, kuyruk: [], sayac: 0, calinan: [], kaynakSayisi: 0 };
  o.setTimeout = (fn, ms) => { const id = ++o.sayac; o.kuyruk.push({ id, ne: o.t + ms / 1000, fn }); return id; };
  o.clearTimeout = (id) => { o.kuyruk = o.kuyruk.filter(x => x.id !== id); };
  o.ilerlet = (sn, adim = 0.005) => {
    const hedef = o.t + sn;
    while (o.t < hedef) {
      o.t = Math.min(hedef, o.t + adim);
      o.kuyruk.sort((a, b) => a.ne - b.ne);
      while (o.kuyruk.length && o.kuyruk[0].ne <= o.t + 1e-9) o.kuyruk.shift().fn();
    }
  };

  const cikis = { tip: 'master' };
  o.actx = {
    sampleRate: 44100,
    get currentTime() { return o.t; },
    state: 'running',
    createBuffer(ch, n, sr) { return { numberOfChannels: ch, length: n, sampleRate: sr, duration: n / sr, getChannelData: () => new Float32Array(n) }; },
    createBufferSource() {
      o.kaynakSayisi++;
      const s = { buffer: null, playbackRate: { value: 1 }, connect() {}, start(when) { s._when = when; } };
      return s;
    },
    createGain() { const g = { gain: { value: 1 }, connect() {} }; return g; },
    decodeAudioData(ab, ok) { const b = o.actx.createBuffer(1, 1000, 44100); if (ok) { ok(b); return null; } return Promise.resolve(b); }
  };

  global.window = {};
  global.Ses = {
    ctx: () => o.actx,
    cikis: () => cikis,
    hazirla: async () => ({ ok: o.sesAcilir !== false })
  };
  global.setTimeout = o.setTimeout;
  global.clearTimeout = o.clearTimeout;
  global.fetch = async (yol) => {
    o.fetchSayisi = (o.fetchSayisi || 0) + 1;
    if (o.fetchBasarisiz) return { ok: false, status: 404 };
    return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(8) };
  };

  eval(fs.readFileSync('/home/claude/zamanlayici.js', 'utf8'));
  eval(fs.readFileSync('/home/claude/ritim.js', 'utf8'));
  // Tarayıcıda window.X aynı zamanda global X'tir; Node'da değil.
  global.Zamanlayici = o.Zamanlayici = global.window.Zamanlayici;
  global.Ritim = o.Ritim = global.window.Ritim;

  // cal() çağrılarını yakalamak için: motorun kendi cal'ı createBufferSource
  // kullanıyor; olay dizisini görmek adına sarmalıyoruz.
  return o;
}

let hata = 0;
const yaz = (ad, ok, ek = '') => { console.log(`${ok ? 'GEÇTİ ' : 'KALDI '} ${ad}${ek ? '  — ' + ek : ''}`); if (!ok) hata++; };

// Motorun planladığı olayları toplamak için kalıp cal'ını izleyen sarmalayıcı
function motorKur(o, ayar) {
  const m = o.Ritim.olustur(ayar);
  const olaylar = [];
  const asilGorsel = m.gorselAl.bind(m);
  // olayları doğrudan transport üzerinden değil, BufferSource start'larından
  // izlemek için createBufferSource'u sarmalıyoruz
  const asil = o.actx.createBufferSource.bind(o.actx);
  o.actx.createBufferSource = function () {
    const s = asil();
    const asilStart = s.start.bind(s);
    s.start = (when) => { olaylar.push(+when.toFixed(9)); asilStart(when); };
    return s;
  };
  return { m, olaylar, gorselAl: asilGorsel };
}

(async () => {

  // ── 1. Kalıp doğrulaması ────────────────────────────────────────────
  {
    const o = ortam();
    const k = o.Ritim.kaliplar.nim_sofyan;
    yaz('Nim Sofyan kalıbı geçerli', o.Ritim._denetle(k, null) === null);
    const bozuk = JSON.parse(JSON.stringify(k));
    bozuk.olaylar[0].sure = 2;   // toplam 3, ölçü 2
    yaz('bozuk kalıp reddediliyor', o.Ritim._denetle(bozuk, null) !== null,
        o.Ritim._denetle(bozuk, null));
  }

  // ── 2. Olay sırası ve ölçü süresi ───────────────────────────────────
  for (const bpm of [60, 90, 120, 180]) {
    const o = ortam();
    const { m, olaylar } = motorKur(o, { bpm });
    const r = await m.hazirla();
    if (!r.ok) { yaz(`${bpm} bpm hazırlık`, false, r.mesaj); continue; }
    m.basla();
    o.ilerlet(20);
    const birim = 60 / bpm;
    const araliklar = olaylar.slice(1).map((x, i) => x - olaylar[i]);
    const sapma = Math.max(...araliklar.map(x => Math.abs(x - birim)));
    yaz(`${bpm} bpm — olay aralığı ${birim.toFixed(4)} sn`, sapma < 1e-9,
        `en büyük sapma ${(sapma * 1e6).toFixed(3)} µs, ${olaylar.length} olay`);
  }

  // ── 3. DÜM → TEK sırası korunuyor mu ────────────────────────────────
  {
    const o = ortam();
    const m = o.Ritim.olustur({ bpm: 120 });
    const sira = [];
    const asil = o.actx.createGain.bind(o.actx);
    o.actx.createGain = function () { const g = asil(); Object.defineProperty(g, 'gain', { value: { set value(v) { sira.push(v); }, get value() { return 1; } } }); return g; };
    await m.hazirla(); m.basla(); o.ilerlet(10);
    // strong(1.0) ve medium(0.72) dönüşümlü olmalı
    const dogru = sira.length > 8 && sira.every((v, i) => Math.abs(v - (i % 2 === 0 ? 1.0 : 0.72)) < 1e-9);
    yaz('DÜM → TEK sırası ve vurgu', dogru, `${sira.length} olay, ilk 6: ${sira.slice(0,6).join(', ')}`);
  }

  // ── 4. Beş dakika sürekli çalma + drift ─────────────────────────────
  {
    const o = ortam();
    const { m, olaylar } = motorKur(o, { bpm: 100 });
    await m.hazirla(); m.basla();
    o.ilerlet(300, 0.01);
    const birim = 60 / 100;
    const ilk = olaylar[0];
    const beklenen = olaylar.map((_, i) => ilk + i * birim);
    const driftler = olaylar.map((x, i) => x - beklenen[i]);
    const enBuyuk = Math.max(...driftler.map(Math.abs));
    yaz('5 dakika sürekli çalma', olaylar.length > 450 && enBuyuk < 1e-6,
        `${olaylar.length} olay, en büyük drift ${(enBuyuk * 1e9).toFixed(1)} ns`);

    // ölçü sınırında boşluk var mı: her aralık tam birim olmalı
    const arl = olaylar.slice(1).map((x, i) => x - olaylar[i]);
    const enBuyukFark = Math.max(...arl.map(x => Math.abs(x - birim)));
    yaz('ölçü sınırında boşluk yok', enBuyukFark < 1e-9,
        `en büyük aralık sapması ${(enBuyukFark * 1e9).toFixed(1)} ns`);
  }

  // ── 5. Çalarken BPM değişimi ────────────────────────────────────────
  {
    const o = ortam();
    const { m, olaylar } = motorKur(o, { bpm: 90 });
    await m.hazirla(); m.basla();
    o.ilerlet(6); const once = olaylar.length;
    m.bpmYaz(180); o.ilerlet(6);
    const sonAraliklar = olaylar.slice(-6).slice(1).map((x, i) => x - olaylar.slice(-6)[i]);
    const hedef = 60 / 180;
    yaz('çalarken BPM 90→180', sonAraliklar.every(x => Math.abs(x - hedef) < 1e-9),
        `değişimden önce ${once}, sonra ${olaylar.length - once} olay`);
  }

  // ── 6. Stop / yeniden Start / hızlı Start-Stop ──────────────────────
  {
    const o = ortam();
    const { m, olaylar } = motorKur(o, { bpm: 120 });
    await m.hazirla(); m.basla(); o.ilerlet(3);
    const a = olaylar.length;
    m.durdur(); o.ilerlet(5);
    yaz('durdurunca olay planlanmıyor', olaylar.length === a, `${olaylar.length - a} fazla olay`);
    m.basla(); o.ilerlet(3);
    yaz('yeniden başlatma çalışıyor', olaylar.length > a);
    for (let i = 0; i < 40; i++) { m.basla(); o.ilerlet(0.02); m.durdur(); }
    const b = olaylar.length;
    o.ilerlet(3);
    yaz('40 kez hızlı başlat/durdur sonrası sessiz', olaylar.length === b);
  }

  // ── 7. Örnek yalnız bir kez yükleniyor mu ───────────────────────────
  {
    const o = ortam();
    // dosya tabanlı kit ile dene (dev kit fetch kullanmıyor)
    o.Ritim.kitler.bendir.kaynak = 'dosya';
    const m1 = o.Ritim.olustur({}); const m2 = o.Ritim.olustur({});
    await m1.hazirla(); await m2.hazirla();
    m1.basla(); o.ilerlet(10); m1.durdur();
    yaz('kit tek kez fetch/decode ediliyor', o.fetchSayisi === 2,
        `fetch sayısı ${o.fetchSayisi} (2 ses = 2 istek), kaynak düğümü ${o.kaynakSayisi}`);
  }

  // ── 8. Ses/kit hatasında çökmeme ────────────────────────────────────
  {
    const o = ortam();
    o.Ritim.kitler.bendir.kaynak = 'dosya';
    o.fetchBasarisiz = true;
    const m = o.Ritim.olustur({});
    const r = await m.hazirla();
    yaz('sample yüklenemezse düzgün hata', r.ok === false && r.sebep === 'kit', r.mesaj);
    yaz('hazır değilken basla() çalmıyor', m.basla() === false);
    o.ilerlet(3);
    yaz('başarısız yükleme sonrası sessiz', o.kaynakSayisi === 0);
    // sonsuz retry yok: ikinci deneme yeni bir istek yapar, döngüye girmez
    const f1 = o.fetchSayisi; await m.hazirla(); const f2 = o.fetchSayisi;
    yaz('sonsuz retry yok', f2 - f1 <= 2, `ikinci denemede ${f2 - f1} istek`);
  }

  // ── 9. Ses açılmazsa (Lockdown) ─────────────────────────────────────
  {
    const o = ortam();
    o.sesAcilir = false;
    const m = o.Ritim.olustur({});
    const r = await m.hazirla();
    yaz('ses açılmazsa düzgün hata', r.ok === false && r.sebep === 'ses');
  }

  // ── 10. AudioContext askıya alma / geri dönme ───────────────────────
  {
    const o = ortam();
    const { m, olaylar } = motorKur(o, { bpm: 120 });
    await m.hazirla(); m.basla(); o.ilerlet(4);
    const a = olaylar.length;
    o.actx.state = 'suspended';      // arka plana düştü
    o.ilerlet(4);
    o.actx.state = 'running';
    o.ilerlet(4);
    const b = olaylar.length;
    yaz('askıya alma/geri dönme sonrası çalmaya devam', b > a + 5,
        `önce ${a}, sonra ${b} olay`);
    const arl = olaylar.slice(1).map((x, i) => x - olaylar[i]);
    yaz('askıdan dönünce zamanlama bozulmuyor',
        Math.max(...arl.map(x => Math.abs(x - 0.5))) < 1e-9);
  }

  console.log(hata === 0 ? '\nTÜM TESTLER GEÇTİ' : `\n${hata} TEST BAŞARISIZ`);
  process.exit(hata ? 1 : 0);
})();
