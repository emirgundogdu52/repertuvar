// video-tara testleri — Çalıştır: node supabase/functions/video-tara/test.mjs  (Node 22.18+/24: TS tipleri kendiliğinden ayıklanır)
import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const burasi = dirname(fileURLToPath(import.meta.url));
const g = mkdtempSync(join(tmpdir(), 'video-tara-'));
copyFileSync(join(burasi, 'secim.ts'), join(g, 'secim.ts'));
copyFileSync(join(burasi, 'index.ts'), join(g, 'index.mts'));
const S = await import(pathToFileURL(join(g, 'secim.ts')).href);
const { isle, GUNLUK_SINIR } = await import(pathToFileURL(join(g, 'index.mts')).href);

let gecti = 0;
async function dene(ad, fn) { await fn(); gecti++; console.log('  ✓', ad); }
const oge = (id, title, channel, views = 1000, sure = 'PT3M30S', embeddable = true) =>
  ({ id, snippet: { title, channelTitle: channel, publishedAt: '2020-01-01T00:00:00Z' }, statistics: { viewCount: String(views) }, contentDetails: { duration: sure }, status: { embeddable, privacyStatus: 'public' } });

await dene('sade: Türkçe harfler ve noktalama', () => {
  assert.equal(S.sade('Gözlerine Teslimim!'), 'gozlerine teslimim');
  assert.equal(S.sade('Kâtip Arzuhâlim'), 'katip arzuhalim');
});
await dene('sadeAd: parantez ve " - Yeni" eki atılır', () => {
  assert.equal(S.sadeAd('Kırmasın (Yasir Miy)'), 'Kırmasın');
  assert.equal(S.sadeAd('Ayrılık - Yeni'), 'Ayrılık');
  assert.equal(S.sadeAd('(Hepsi)'), '(Hepsi)');
});
await dene('sorgu: seslendiren öncelikli, anonim/TRT md atlanır', () => {
  assert.equal(S.sorguKur({ name: 'Gözlerine Teslimim', seslendiren: 'Sıla' }), 'Gözlerine Teslimim Sıla');
  assert.equal(S.sorguKur({ name: 'Köprüden Geçti Gelin', composer: 'TRT İstanbul Rd. THM Md.' }), 'Köprüden Geçti Gelin');
  assert.equal(S.sorguKur({ name: 'Allı Turnam', composer: 'Anonim', source_person: 'Neşet Ertaş' }), 'Allı Turnam Neşet Ertaş');
});
await dene('arama: yabancı türde TR bölgesi yok, Türk Rock’ta var', () => {
  assert.equal(S.aramaParametreleri({ name: 'Falling', seslendiren: 'Harry Styles', tur: 'Yabancı Pop' }).regionCode, undefined);
  assert.equal(S.aramaParametreleri({ name: 'Sayın Bayan', seslendiren: 'Duman', tur: 'Türk Rock' }).regionCode, 'TR');
});
await dene('baslikUyumu: tam kelime, "Sen" "Senin" içinde sayılmaz', () => {
  assert.equal(S.baslikUyumu('Sıla - Gözlerine Teslimim (Official Video)', 'Gözlerine Teslimim'), 1);
  assert.equal(S.baslikUyumu('Senin İçin', 'Sen İsen'), 0);
});
await dene('sanatciUyumu: başlık, VEVO, Topic, bitişik kanal adı', () => {
  assert.ok(S.sanatciUyumu('Duman - Sayın Bayan', 'x', 'Duman'));
  assert.ok(S.sanatciUyumu('Gözlerine Teslimim', 'SılaVEVO', 'Sıla'));
  assert.ok(S.sanatciUyumu('Falling', 'Harry Styles - Topic', 'Harry Styles'));
  assert.ok(S.sanatciUyumu('Facia', 'EmirCanIgrek', 'Emir Can İğrek'));
  assert.ok(!S.sanatciUyumu('Facia', 'Rastgele Kanal', 'Emir Can İğrek'));
});
await dene('olumsuz: cover/karaoke elenir; eser adında "Ney" geçen kendini elemez', () => {
  assert.ok(S.olumsuzMu('Sıla - Gözlerine Teslimim (Karaoke)', { name: 'Gözlerine Teslimim', seslendiren: 'Sıla' }));
  assert.ok(S.olumsuzMu('Gözlerine Teslimim Gitar Dersi', { name: 'Gözlerine Teslimim' }));
  assert.ok(!S.olumsuzMu('Mercan Dede - Ney', { name: 'Ney', seslendiren: 'Mercan Dede' }));
});
await dene('güçlü: resmi klip seçilir, cover ve kısa video elenir', () => {
  const w = { id: 1, name: 'Gözlerine Teslimim', seslendiren: 'Sıla', tur: 'Türk Pop' };
  const r = S.adaylariSec([
    oge('AAAAAAAAAAA', 'Gözlerine Teslimim cover', 'Biri', 900000),
    oge('BBBBBBBBBBB', 'Sıla - Gözlerine Teslimim (Official Video)', 'SılaVEVO', 5000000),
    oge('CCCCCCCCCCC', 'Gözlerine Teslimim #shorts', 'Sıla', 9000000, 'PT40S'),
  ], w);
  assert.equal(r.guclu, 'BBBBBBBBBBB');
  assert.equal(r.adaylar[0].video_id, 'BBBBBBBBBBB');
  assert.equal(r.adaylar.length, 2);
  assert.deepEqual(r.adaylar.map((a) => a.sira), [1, 2]);
});
await dene('güçlü değil: seslendiren yok (anonim türkü) → yalnız aday', () => {
  const r = S.adaylariSec([oge('DDDDDDDDDDD', 'Allı Turnam - Neşet Ertaş', 'TRT Arşiv', 300000)], { id: 2, name: 'Allı Turnam' });
  assert.equal(r.guclu, null); assert.equal(r.adaylar.length, 1);
});
await dene('güçlü değil: başlıkta başka sanatçı', () => {
  const r = S.adaylariSec([oge('EEEEEEEEEEE', 'Ayrılık Vakti - Başka Biri', 'Başka Biri', 300000)], { id: 3, name: 'Ayrılık Vakti', seslendiren: 'Nahide Babaşlı' });
  assert.equal(r.guclu, null);
});
await dene('güçlü değil: çok kısa ad ("1")', () => {
  const r = S.adaylariSec([oge('IIIIIIIIIII', 'Suzan Hacıgarip - 1 (Official Video)', 'Suzan Hacıgarip', 300000)], { id: 5, name: '1', seslendiren: 'Suzan Hacıgarip' });
  assert.equal(r.guclu, null); assert.equal(r.adaylar.length, 1);
});
await dene('gömülemeyen ve gizli videolar elenir', () => {
  const kapali = oge('FFFFFFFFFFF', 'Duman - Sayın Bayan', 'Duman', 1, 'PT4M', false);
  const gizli = oge('GGGGGGGGGGG', 'Duman - Sayın Bayan', 'Duman'); gizli.status.privacyStatus = 'unlisted';
  assert.equal(S.adaylariSec([kapali, gizli], { id: 4, name: 'Sayın Bayan', seslendiren: 'Duman' }).adaylar.length, 0);
});

// ── isle(): sahte Supabase + YouTube ──
function sahte({ harcanan = 0, eserler = [], items = [], ytDurum = 200, ytGovde = null, jetonDogru = false }) {
  const kayit = { yaz: [], kota: [], yt: [] };
  let h = harcanan;
  const f = async (url, o = {}) => {
    const u = String(url);
    const js = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
    if (u.includes('/rpc/video_tara_kota_ekle')) { const n = JSON.parse(o.body).n; kayit.kota.push(n); h += n; return js(h); }
    if (u.includes('/rpc/video_tara_jeton_dogru')) return js(jetonDogru);
    if (u.includes('/rpc/video_tara_sec')) return js(eserler.slice(0, JSON.parse(o.body).n));
    if (u.includes('/rpc/video_tara_yaz')) { kayit.yaz.push(JSON.parse(o.body)); return new Response('', { status: 200 }); }
    if (u.includes('googleapis.com/youtube/v3/search')) { kayit.yt.push('search'); return ytGovde ? new Response(ytGovde, { status: ytDurum }) : js({ items: items.map((i) => ({ id: { videoId: i.id } })) }); }
    if (u.includes('googleapis.com/youtube/v3/videos')) { kayit.yt.push('videos'); return js({ items }); }
    throw new Error('beklenmeyen ' + u);
  };
  return { f, kayit };
}
const ORTAM = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'servis', SUPABASE_ANON_KEY: 'anon', YOUTUBE_API_KEY: 'yt' };
const ortam = (k) => ORTAM[k];
const istek = (govde = {}, bas = { Authorization: 'Bearer servis' }) => new Request('https://x/f', { method: 'POST', headers: bas, body: JSON.stringify(govde) });

await dene('isle: yetkisiz 403, jeton biçimi yanlışsa rpc çağrılmaz', async () => {
  const { f } = sahte({});
  assert.equal((await isle(istek({}, { 'x-tara-jeton': 'kisa' }), ortam, f)).status, 403);
});
await dene('isle: cron jetonu kabul', async () => {
  const { f } = sahte({ jetonDogru: true });
  const r = await isle(istek({}, { 'x-tara-jeton': 'a'.repeat(64) }), ortam, f);
  assert.equal(r.status, 200);
});
await dene('isle: güçlü eşleşme bağlanır, kota 101 artar', async () => {
  const w = { id: 7, name: 'Sayın Bayan', seslendiren: 'Duman', tur: 'Türk Rock' };
  const { f, kayit } = sahte({ eserler: [w], items: [oge('HHHHHHHHHHH', 'Duman - Sayın Bayan', 'Duman', 2000000)] });
  const r = await (await isle(istek({ adet: 5 }), ortam, f)).json();
  assert.equal(r.baglanan, 1); assert.equal(r.islenen, 1);
  assert.equal(kayit.yaz[0].secilen, 'HHHHHHHHHHH'); assert.equal(kayit.yaz[0].durum, 'baglandi');
  assert.deepEqual(kayit.kota, [0, 101]);
});
await dene('isle: kuru:true hiçbir şey yazmaz', async () => {
  const w = { id: 7, name: 'Sayın Bayan', seslendiren: 'Duman' };
  const { f, kayit } = sahte({ eserler: [w], items: [oge('HHHHHHHHHHH', 'Duman - Sayın Bayan', 'Duman')] });
  await isle(istek({ kuru: true }), ortam, f);
  assert.equal(kayit.yaz.length, 0);
});
await dene('isle: günlük sınır doluysa YouTube çağrılmaz', async () => {
  const { f, kayit } = sahte({ harcanan: GUNLUK_SINIR - 50, eserler: [{ id: 1, name: 'x' }] });
  const r = await (await isle(istek(), ortam, f)).json();
  assert.equal(r.durum, 'kota-doldu'); assert.equal(kayit.yt.length, 0);
});
await dene('isle: adet kalan kotayla sınırlanır', async () => {
  const eserler = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: 'Eser ' + i }));
  const { f, kayit } = sahte({ harcanan: GUNLUK_SINIR - 250, eserler, items: [] });
  const r = await (await isle(istek({ adet: 10 }), ortam, f)).json();
  assert.equal(r.islenen, 2); assert.equal(kayit.yaz.every((y) => y.durum === 'bos'), true);
});
await dene('isle: YouTube kota hatası → durur, gün kapatılır', async () => {
  const { f, kayit } = sahte({ eserler: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }], ytDurum: 403, ytGovde: '{"error":{"errors":[{"reason":"quotaExceeded"}]}}' });
  const r = await (await isle(istek(), ortam, f)).json();
  assert.equal(r.durum, 'kota-doldu'); assert.equal(kayit.yt.length, 1); assert.equal(kayit.yaz.length, 0);
  assert.equal(r.harcanan, GUNLUK_SINIR);
});
await dene('isle: anahtar hatası → durur, eser işaretlenmez', async () => {
  const { f, kayit } = sahte({ eserler: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }], ytDurum: 400, ytGovde: '{"error":{"message":"API key not valid"}}' });
  const r = await (await isle(istek(), ortam, f)).json();
  assert.equal(r.durum, 'anahtar-hatasi'); assert.equal(kayit.yaz.length, 0);
});
await dene('isle: anahtar yoksa 503', async () => {
  const { f } = sahte({});
  assert.equal((await isle(istek(), (k) => (k === 'YOUTUBE_API_KEY' ? undefined : ORTAM[k]), f)).status, 503);
});
console.log(gecti + ' test geçti');
