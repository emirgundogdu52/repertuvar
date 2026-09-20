/* test_zamanlayici.js — AŞAMA A regression testi
 *
 * Eski (metronom.html içi) scheduler ile yeni zamanlayici.js'i AYNI sanal
 * saat üzerinde çalıştırıp planlanan olayları karşılaştırır.
 * Gerçek ses yok; amaç zamanlamanın birebir aynı kalması.
 */
const fs = require('fs');

// ── Sanal saat + sanal setTimeout ───────────────────────────────────────
function ortam() {
  const o = { t: 0, kuyruk: [], sayac: 0 };
  o.setTimeout = (fn, ms) => { const id = ++o.sayac; o.kuyruk.push({ id, ne: o.t + ms / 1000, fn }); return id; };
  o.clearTimeout = (id) => { o.kuyruk = o.kuyruk.filter(x => x.id !== id); };
  o.ilerlet = (sn, adim = 0.001) => {
    const hedef = o.t + sn;
    while (o.t < hedef) {
      o.t = Math.min(hedef, o.t + adim);
      o.kuyruk.sort((a, b) => a.ne - b.ne);
      while (o.kuyruk.length && o.kuyruk[0].ne <= o.t + 1e-9) o.kuyruk.shift().fn();
    }
  };
  return o;
}

// ── ESKİ: canlı metronom.html'den birebir alınan döngü ──────────────────
function eski(o, durum) {
  const LOOKAHEAD = 25, SCHEDULE_AHEAD = 0.12;
  let nextNoteTime = 0, beatIndex = 0;
  const olaylar = [];
  function scheduler() {
    while (nextNoteTime < o.t + SCHEDULE_AHEAD) {
      const level = durum.pattern[beatIndex] ?? 1;
      olaylar.push([beatIndex, +nextNoteTime.toFixed(9), level]);
      nextNoteTime += 60 / durum.bpm;
      beatIndex = (beatIndex + 1) % durum.pattern.length;
    }
    o.setTimeout(scheduler, LOOKAHEAD);
  }
  return { basla() { beatIndex = 0; nextNoteTime = o.t + 0.06; scheduler(); }, olaylar };
}

// ── YENİ: zamanlayici.js ────────────────────────────────────────────────
function yeni(o, durum) {
  global.window = {};
  global.Ses = { ctx: () => ({ currentTime: o.t }) };
  global.setTimeout = o.setTimeout;
  global.clearTimeout = o.clearTimeout;
  eval(fs.readFileSync('/home/claude/zamanlayici.js', 'utf8'));
  const olaylar = [];
  const t = global.window.Zamanlayici.olustur({
    adimSayisi: () => durum.pattern.length,
    adimSuresi: () => 60 / durum.bpm,
    cal: (adim, zaman) => olaylar.push([adim, +zaman.toFixed(9), durum.pattern[adim] ?? 1])
  });
  return { basla() { t.basla(); }, olaylar, t };
}

// ── Senaryolar ──────────────────────────────────────────────────────────
function kosu(senaryo) {
  const sonuc = [];
  for (const yap of [eski, yeni]) {
    const o = ortam();
    const durum = { bpm: 96, pattern: [2, 1, 1, 1] };
    const m = yap(o, durum);
    m.basla();
    senaryo(o, durum);
    sonuc.push(m.olaylar);
  }
  return sonuc;
}

const senaryolar = {
  'sabit 96 bpm, 4 vuruş, 10 sn': (o) => o.ilerlet(10),
  'çalarken tempo 96→144': (o, d) => { o.ilerlet(4); d.bpm = 144; o.ilerlet(6); },
  'çalarken kalıp 4→9 zamana': (o, d) => { o.ilerlet(4); d.pattern = [2,1,1,2,1,1,2,1,1]; o.ilerlet(6); },
  'çok yavaş tempo (30 bpm)': (o, d) => { d.bpm = 30; o.ilerlet(12); },
  'çok hızlı tempo (300 bpm)': (o, d) => { d.bpm = 300; o.ilerlet(8); },
  'tek vuruşluk kalıp': (o, d) => { d.pattern = [2]; o.ilerlet(6); },
};

let hata = 0;
for (const [ad, sen] of Object.entries(senaryolar)) {
  const [a, b] = kosu(sen);
  const ayni = JSON.stringify(a) === JSON.stringify(b);
  if (!ayni) {
    hata++;
    console.log(`FARKLI  ${ad}`);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) {
        console.log(`   ilk fark #${i}: eski=${JSON.stringify(a[i])} yeni=${JSON.stringify(b[i])}`);
        break;
      }
    }
  } else {
    console.log(`AYNI    ${ad}  (${a.length} olay)`);
  }
}

// Zamanlama doğruluğu: 96 bpm'de vuruş aralığı tam 0.625 sn olmalı
{
  const o = ortam(); const d = { bpm: 96, pattern: [2,1,1,1] };
  const m = yeni(o, d); m.basla(); o.ilerlet(20);
  const araliklar = m.olaylar.slice(1).map((e, i) => e[1] - m.olaylar[i][1]);
  const enBuyukSapma = Math.max(...araliklar.map(x => Math.abs(x - 0.625)));
  console.log(`\nvuruş aralığı sapması (20 sn, 96 bpm): ${(enBuyukSapma * 1e6).toFixed(3)} µs`);
  if (enBuyukSapma > 1e-9) hata++;
}

// durdur() sonrası olay planlanmamalı
{
  const o = ortam(); const d = { bpm: 120, pattern: [2,1] };
  const m = yeni(o, d); m.basla(); o.ilerlet(3);
  const oncesi = m.olaylar.length;
  m.t.durdur(); o.ilerlet(5);
  console.log(`durdur() sonrası yeni olay: ${m.olaylar.length - oncesi} (0 olmalı)`);
  if (m.olaylar.length !== oncesi) hata++;
}

console.log(hata === 0 ? '\nTÜM TESTLER GEÇTİ' : `\n${hata} TEST BAŞARISIZ`);
process.exit(hata ? 1 : 0);
