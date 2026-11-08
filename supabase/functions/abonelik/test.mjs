// abonelik Edge Function testleri (Node 24: TypeScript tipleri kendiliğinden ayıklanır).
// Çalıştır: node supabase/functions/abonelik/test.mjs
import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const kopya = join(mkdtempSync(join(tmpdir(), 'abonelik-')), 'index.mts');
copyFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.ts'), kopya);
const { kaynakOf, donemOf, satirOf, devredilenleriKapat, etkilenenler, isle, webSandboxEle, tekYilMi, ayEkle, tekYilSatiri, iadeEdilenler } = await import(pathToFileURL(kopya).href);

let gecti = 0;
async function dene(ad, fn) { await fn(); gecti++; console.log('  ✓', ad); }

const UID = '4f965624-e524-4cb0-a351-3368f1297d28';
const UID2 = '11111111-2222-4333-8444-555555555555';
const SIMDI = Date.parse('2026-10-17T12:00:00Z');
const gun = (n) => new Date(SIMDI + n * 86400000).toISOString();

await dene('kaynakOf / donemOf', () => {
  assert.equal(kaynakOf('app_store'), 'ios');
  assert.equal(kaynakOf('play_store'), 'android');
  assert.equal(kaynakOf('stripe'), 'web');
  assert.equal(kaynakOf('promotional'), null);
  assert.equal(donemOf('com.repertuvar.app.pro.monthly'), 'P1M');
  assert.equal(donemOf('com.repertuvar.app.pro.6months'), 'P6M');
  assert.equal(donemOf('com.repertuvar.app.pro.yearly'), 'P1Y');
  assert.equal(donemOf('repertuvar_pro:monthly'), 'P1M');
  assert.equal(donemOf('repertuvar_pro:six-months'), 'P6M');
  assert.equal(donemOf('repertuvar_pro:yearly'), 'P1Y');
  assert.equal(donemOf('repertuvar_pro:aylik'), 'P1M');
  assert.equal(donemOf('repertuvar_pro:alti-aylik'), 'P6M');
  assert.equal(donemOf('repertuvar_pro:yillik'), 'P1Y');
});

await dene('webSandboxEle: Paddle sandbox yalnız izinli hesapta; mağaza sandbox\'ı ve web üretimi dokunulmaz', () => {
  const paddle = { store: 'paddle', expires_date: gun(30), purchase_date: gun(0), period_type: 'trial', is_sandbox: true };
  const web = satirOf(UID, 'pri_01m5d6geb3354gp25c08088fkw', paddle, SIMDI);
  const webUretim = satirOf(UID, 'pri_x', { ...paddle, is_sandbox: false }, SIMDI);
  const iosSandbox = satirOf(UID, 'com.repertuvar.app.pro.yearly', { ...paddle, store: 'app_store' }, SIMDI);
  assert.equal(web.kaynak, 'web'); assert.equal(web.ortam, 'sandbox');
  assert.deepEqual(webSandboxEle([web, webUretim, iosSandbox], ''), [webUretim, iosSandbox]);
  assert.deepEqual(webSandboxEle([web], ' ' + UID2 + ' , ' + UID.toUpperCase()), [web]);
  assert.deepEqual(webSandboxEle([web], UID2), []);
});

await dene('satirOf: Play anahtarı temel plansız gelirse product_plan_identifier eklenir', () => {
  const play = { store: 'play_store', purchase_date: gun(-1), period_type: 'trial', expires_date: gun(29) };
  const yalin = satirOf(UID, 'repertuvar_pro', { ...play, product_plan_identifier: 'alti-aylik' }, SIMDI);
  assert.equal(yalin.kaynak, 'android'); assert.equal(yalin.urun_id, 'repertuvar_pro:alti-aylik');
  assert.equal(yalin.donem, 'P6M'); assert.equal(yalin.dis_kimlik, 'rc:' + UID + ':repertuvar_pro:alti-aylik');
  const tam = satirOf(UID, 'repertuvar_pro:yillik', { ...play, product_plan_identifier: 'yillik' }, SIMDI);
  assert.equal(tam.urun_id, 'repertuvar_pro:yillik'); assert.equal(tam.donem, 'P1Y');
  const ios = satirOf(UID, 'com.repertuvar.app.pro.monthly', { ...play, store: 'app_store', product_plan_identifier: null }, SIMDI);
  assert.equal(ios.urun_id, 'com.repertuvar.app.pro.monthly');
});

await dene('satirOf: deneme / aktif / iptal / ödeme sorunu / bitti / iade', () => {
  const temel = { store: 'app_store', purchase_date: gun(-3), original_purchase_date: gun(-3), is_sandbox: true };
  const deneme = satirOf(UID, 'com.repertuvar.app.pro.monthly', { ...temel, period_type: 'trial', expires_date: gun(27) }, SIMDI);
  assert.equal(deneme.durum, 'deneme'); assert.equal(deneme.deneme, true); assert.equal(deneme.ortam, 'sandbox');
  assert.equal(deneme.kaynak, 'ios'); assert.equal(deneme.donem, 'P1M'); assert.equal(deneme.otomatik_yenileme, true);
  assert.equal(deneme.dis_kimlik, 'rc:' + UID + ':com.repertuvar.app.pro.monthly');

  const aktif = satirOf(UID, 'com.repertuvar.app.pro.yearly', { ...temel, period_type: 'normal', expires_date: gun(300) }, SIMDI);
  assert.equal(aktif.durum, 'aktif'); assert.equal(aktif.deneme, false);

  const iptal = satirOf(UID, 'x.yearly', { ...temel, period_type: 'normal', expires_date: gun(10), unsubscribe_detected_at: gun(-1) }, SIMDI);
  assert.equal(iptal.durum, 'iptal_edildi'); assert.equal(iptal.otomatik_yenileme, false);

  const ek = satirOf(UID, 'x.monthly', { ...temel, period_type: 'normal', expires_date: gun(-1),
    grace_period_expires_date: gun(5), billing_issues_detected_at: gun(-1) }, SIMDI);
  assert.equal(ek.durum, 'odeme_sorunu'); assert.equal(ek.bitis, gun(5));

  const askida = satirOf(UID, 'x.monthly', { ...temel, period_type: 'normal', expires_date: gun(-10), billing_issues_detected_at: gun(-10) }, SIMDI);
  assert.equal(askida.durum, 'askida');

  const bitti = satirOf(UID, 'x.monthly', { ...temel, period_type: 'normal', expires_date: gun(-2) }, SIMDI);
  assert.equal(bitti.durum, 'suresi_doldu');

  const iade = satirOf(UID, 'x.yearly', { ...temel, period_type: 'normal', expires_date: gun(200), refunded_at: gun(-1) }, SIMDI);
  assert.equal(iade.durum, 'iade'); assert.equal(iade.bitis, gun(-1));

  assert.equal(satirOf(UID, 'x', { store: 'promotional', expires_date: gun(5) }, SIMDI), null);
});

await dene('devredilenleriKapat: aylık → yıllık (yenileme dönem bitmeden geldi)', () => {
  // 2026-10-17 sandbox: aylık 07:57:35 yenilendi, 08:03:21 biter; yıllık 08:02:38'de başladı
  const an = Date.parse('2026-10-17T08:02:40Z');
  const aylik = satirOf(UID, 'com.repertuvar.app.pro.monthly', { store: 'app_store', period_type: 'normal',
    purchase_date: '2026-10-17T07:57:35Z', expires_date: '2026-10-17T08:03:21Z' }, an);
  const yillik = satirOf(UID, 'com.repertuvar.app.pro.yearly', { store: 'app_store', period_type: 'normal',
    purchase_date: '2026-10-17T08:02:38Z', expires_date: '2026-10-17T09:03:21Z' }, an);
  assert.equal(aylik.durum, 'aktif');                       // tek başına bakınca hâlâ aktif
  const [a, y] = devredilenleriKapat([aylik, yillik]);
  assert.equal(a.durum, 'suresi_doldu'); assert.equal(a.otomatik_yenileme, false);
  assert.equal(y.durum, 'aktif');
  // başka kaynaktaki satır ve uzak geçmişte alınmış satır devir sayılmaz
  const android = { ...yillik, kaynak: 'android' };
  assert.equal(devredilenleriKapat([aylik, android])[0].durum, 'aktif');
  const eski = { ...yillik, ham: { purchase_date: '2026-09-01T00:00:00Z' } };
  assert.equal(devredilenleriKapat([aylik, eski])[0].durum, 'aktif');
});

await dene('etkilenenler: yalnız UUID, tekrarsız, transfer dahil', () => {
  const k = etkilenenler({ app_user_id: UID, original_app_user_id: '$RCAnonymousID:abc', aliases: [UID],
    transferred_from: [UID2.toUpperCase()], transferred_to: [UID] });
  assert.deepEqual(k.sort(), [UID, UID2].sort());
});

// ── isle(): sahte fetch ile uçtan uca
function ortam(ek = {}) {
  const o = { SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_ROLE_KEY: 'srv', SUPABASE_ANON_KEY: 'anon',
    RC_SECRET_API_KEY: 'sk_test', RC_WEBHOOK_SECRET: 'gizli-123', ...ek };
  return (k) => o[k];
}
let sahteOlaylar = [];
function sahteFetch(rcAbonelikler = {}, rcTekler = {}, dbSatirlar = []) {
  const cagrilar = [];
  const f = async (url, init = {}) => {
    cagrilar.push({ url: String(url), method: init.method || 'GET', body: init.body, headers: init.headers || {} });
    const u = String(url);
    if (u.startsWith('https://api.revenuecat.com/v1/subscribers/')) {
      if ((init.method || 'GET') === 'DELETE') return new Response('{}', { status: 200 });
      return new Response(JSON.stringify({ subscriber: { subscriptions: rcAbonelikler, non_subscriptions: rcTekler } }), { status: 200 });
    }
    if (u.startsWith('https://sb.test/rest/v1/abonelikler?') && (init.method || 'GET') === 'GET') {
      return new Response(JSON.stringify(dbSatirlar), { status: 200 });
    }
    if (u.startsWith('https://sb.test/rest/v1/abonelik_olaylari?') && (init.method || 'GET') === 'GET') {
      return new Response(JSON.stringify(sahteOlaylar), { status: 200 });
    }
    if (u.startsWith('https://sb.test/auth/v1/user')) {
      return (init.headers && init.headers.Authorization === 'Bearer kullanici-jwt')
        ? new Response(JSON.stringify({ id: UID }), { status: 200 }) : new Response('{}', { status: 401 });
    }
    if (u.startsWith('https://sb.test/rest/v1/')) return new Response('', { status: 201 });
    return new Response('?', { status: 404 });
  };
  return { f, cagrilar };
}
const istek = (yol, govde, yetki) => new Request('https://fn.test/abonelik' + yol, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(yetki ? { Authorization: yetki } : {}) },
  body: JSON.stringify(govde),
});

await dene('webhook: yanlış sır → 401, hiçbir şey yazılmaz', async () => {
  const { f, cagrilar } = sahteFetch();
  const r = await isle(istek('?kaynak=rc', { event: { id: 'e1', type: 'INITIAL_PURCHASE', app_user_id: UID } }, 'Bearer yanlis'), ortam(), f);
  assert.equal(r.status, 401); assert.equal(cagrilar.length, 0);
});

await dene('webhook: TEST olayı günlüğe yazılır, RevenueCat sorgulanmaz', async () => {
  const { f, cagrilar } = sahteFetch();
  const r = await isle(istek('?kaynak=rc', { event: { id: 'e0', type: 'TEST', app_user_id: UID } }, 'Bearer gizli-123'), ortam(), f);
  assert.equal(r.status, 200);
  assert.ok(cagrilar.some((c) => c.url.includes('/rest/v1/abonelik_olaylari')));
  assert.ok(!cagrilar.some((c) => c.url.includes('revenuecat')));
});

await dene('webhook: satın alma → olay + RevenueCat okuma + upsert + eski satırları kapatma', async () => {
  const { f, cagrilar } = sahteFetch({ 'com.repertuvar.app.pro.monthly': {
    store: 'app_store', period_type: 'trial', expires_date: gun(30), purchase_date: gun(0), is_sandbox: true } });
  const r = await isle(istek('?kaynak=rc', { event: { id: 'e2', type: 'INITIAL_PURCHASE', app_user_id: UID } }, 'Bearer gizli-123'), ortam(), f);
  assert.equal(r.status, 200);
  const up = cagrilar.find((c) => c.url.includes('/rest/v1/abonelikler?on_conflict'));
  const satir = JSON.parse(up.body)[0];
  assert.equal(satir.user_id, UID); assert.equal(satir.durum, 'deneme'); assert.equal(satir.urun_id, 'com.repertuvar.app.pro.monthly');
  const kapat = cagrilar.find((c) => c.method === 'PATCH');
  assert.ok(kapat.url.includes('dis_kimlik=not.in.'));
  assert.ok(kapat.url.includes('kaynak=in.(ios,android,web)'), 'hediye satırlarına dokunulmaz');
});

await dene('webhook: transfer → iki kullanıcı da yeniden hesaplanır', async () => {
  const { f, cagrilar } = sahteFetch({});
  const r = await isle(istek('?kaynak=rc', { event: { id: 'e3', type: 'TRANSFER', transferred_from: [UID2], transferred_to: [UID] } }, 'Bearer gizli-123'), ortam(), f);
  assert.equal(r.status, 200);
  const rc = cagrilar.filter((c) => c.url.includes('api.revenuecat.com'));
  assert.equal(rc.length, 2);
});

await dene('uygulama: oturumsuz 401, oturumla esitle 200', async () => {
  const { f } = sahteFetch({});
  assert.equal((await isle(istek('', { islem: 'esitle' }), ortam(), f)).status, 401);
  assert.equal((await isle(istek('', { islem: 'esitle' }, 'Bearer baskasi'), ortam(), f)).status, 401);
  const r = await isle(istek('', { islem: 'esitle' }, 'Bearer kullanici-jwt'), ortam(), f);
  assert.equal(r.status, 200);
});

await dene('uygulama: sil → RevenueCat DELETE yalnız kendi kimliği için', async () => {
  const { f, cagrilar } = sahteFetch({});
  const r = await isle(istek('', { islem: 'sil' }, 'Bearer kullanici-jwt'), ortam(), f);
  assert.equal(r.status, 200);
  const del = cagrilar.find((c) => c.method === 'DELETE');
  assert.ok(del.url.endsWith('/subscribers/' + UID));
});

await dene('yapılandırma eksik → 503', async () => {
  const { f } = sahteFetch({});
  const r = await isle(istek('', {}, 'Bearer kullanici-jwt'), ortam({ RC_SECRET_API_KEY: undefined }), f);
  assert.equal(r.status, 503);
});

// ── Tek ödeme "1 yıl Pro" (2026-10-25) ───────────────────────────────────
const TEK = 'pri_01tekyil000000000000000000';
const alim = (gunu, ek = {}) => ({ id: 'n' + gunu, purchase_date: gun(gunu), store: 'paddle', is_sandbox: false, ...ek });

await dene('tekYilMi: ortam listesi ya da ad sonu', () => {
  assert.equal(tekYilMi(TEK, ' pri_x , ' + TEK.toUpperCase()), true);
  assert.equal(tekYilMi('repertuvar_pro:tek_yil', ''), true);
  assert.equal(tekYilMi('com.repertuvar.app.pro.yearly', ''), false);
  assert.equal(tekYilMi('pri_01m5d6geb3354gp25c08088fkw', TEK), false);
});

await dene('ayEkle: ay sonu taşmaz, saat korunur', () => {
  assert.equal(new Date(ayEkle(Date.parse('2026-01-31T10:00:00Z'), 1)).toISOString(), '2026-02-28T10:00:00.000Z');
  assert.equal(new Date(ayEkle(Date.parse('2027-12-15T00:00:00Z'), 13)).toISOString(), '2029-01-15T00:00:00.000Z');
  assert.equal(new Date(ayEkle(Date.parse('2026-10-25T08:30:00Z'), 12)).toISOString(), '2027-10-25T08:30:00.000Z');
});

await dene('tekYilSatiri: ilk Pro → 13 ay, aktif, yenilenmez', () => {
  const s = tekYilSatiri(UID, TEK, [alim(-1)], null, SIMDI);
  assert.equal(s.kaynak, 'web'); assert.equal(s.durum, 'aktif'); assert.equal(s.otomatik_yenileme, false);
  assert.equal(s.donem, 'P1Y'); assert.equal(s.deneme, false); assert.equal(s.ham.ilk_13_ay, true);
  assert.equal(s.bitis, new Date(ayEkle(Date.parse(gun(-1)), 13)).toISOString());
  assert.equal(s.dis_kimlik, 'rc:' + UID + ':' + TEK);
});

await dene('tekYilSatiri: daha önce Pro (deneme/abonelik/hediye) → 12 ay', () => {
  const s = tekYilSatiri(UID, TEK, [alim(-1)], Date.parse(gun(-60)), SIMDI);
  assert.equal(s.ham.ilk_13_ay, false);
  assert.equal(s.bitis, new Date(ayEkle(Date.parse(gun(-1)), 12)).toISOString());
  // tek ödemeden SONRA başlayan abonelik 13 ayı geri almaz
  assert.equal(tekYilSatiri(UID, TEK, [alim(-1)], Date.parse(gun(5)), SIMDI).ham.ilk_13_ay, true);
});

await dene('tekYilSatiri: süre bitmeden ikinci yıl üstüne eklenir; bittikten sonra alım bugünden başlar', () => {
  const ust = tekYilSatiri(UID, TEK, [alim(-200), alim(-10)], null, SIMDI);
  assert.equal(ust.bitis, new Date(ayEkle(ayEkle(Date.parse(gun(-200)), 13), 12)).toISOString());
  const ara = tekYilSatiri(UID, TEK, [alim(-800), alim(-3)], null, SIMDI);   // ilki (13 ay) bitmiş, ikincisi bugünden 12 ay
  assert.equal(ara.bitis, new Date(ayEkle(Date.parse(gun(-3)), 12)).toISOString());
  assert.equal(ara.durum, 'aktif');
  // sıra karışık gelse de aynı sonuç
  assert.equal(tekYilSatiri(UID, TEK, [alim(-10), alim(-200)], null, SIMDI).bitis, ust.bitis);
});

await dene('tekYilSatiri: iade edilen alım sayılmaz; hepsi iadeyse satır yok; süresi dolan → suresi_doldu', () => {
  const s = tekYilSatiri(UID, TEK, [alim(-10), alim(-5, { refunded_at: gun(-4) })], null, SIMDI);
  assert.equal(s.ham.alimlar.length, 1);
  assert.equal(tekYilSatiri(UID, TEK, [alim(-5, { refunded_at: gun(-4) })], null, SIMDI), null);
  assert.equal(tekYilSatiri(UID, TEK, [alim(-500)], null, SIMDI).durum, 'suresi_doldu');
  assert.equal(tekYilSatiri(UID, TEK, [alim(-1, { is_sandbox: true })], null, SIMDI).ortam, 'sandbox');
});

await dene('webhook NON_RENEWING_PURCHASE: tek ödeme satırı yazılır; önceki hediye 13 ayı kapatır; liste dışı ürün yok sayılır', async () => {
  const { f, cagrilar } = sahteFetch({}, { [TEK]: [alim(-1)], 'pri_baska': [alim(-1)] },
    [{ dis_kimlik: 'hediye:' + UID, baslangic: gun(-90), olusturuldu: gun(-90) }]);
  const r = await isle(istek('?kaynak=rc', { event: { id: 'e9', type: 'NON_RENEWING_PURCHASE', app_user_id: UID } }, 'Bearer gizli-123'),
    ortam({ TEK_YIL_URUNLER: TEK }), f);
  assert.equal(r.status, 200);
  const yaz = cagrilar.find((c) => c.method === 'POST' && c.url.includes('/rest/v1/abonelikler?on_conflict'));
  const satirlar = JSON.parse(yaz.body);
  assert.equal(satirlar.length, 1);
  assert.equal(satirlar[0].urun_id, TEK); assert.equal(satirlar[0].ham.ilk_13_ay, false);
  assert.equal(satirlar[0].bitis, new Date(ayEkle(Date.parse(gun(-1)), 12)).toISOString());
});

await dene('webhook: tek ödemenin kendi eski satırı 13 ay hakkını bozmaz (yeniden hesapta aynı sonuç)', async () => {
  const { f, cagrilar } = sahteFetch({}, { [TEK]: [alim(-1)] },
    [{ dis_kimlik: 'rc:' + UID + ':' + TEK, baslangic: gun(-1), olusturuldu: gun(-1) }]);
  await isle(istek('?kaynak=rc', { event: { id: 'e10', type: 'NON_RENEWING_PURCHASE', app_user_id: UID } }, 'Bearer gizli-123'),
    ortam({ TEK_YIL_URUNLER: TEK }), f);
  const satirlar = JSON.parse(cagrilar.find((c) => c.method === 'POST' && c.url.includes('/rest/v1/abonelikler?on_conflict')).body);
  assert.equal(satirlar[0].ham.ilk_13_ay, true);
});

await dene('webhook: tek ödeme yoksa abonelikler tablosu okunmaz (eski davranış)', async () => {
  const { f, cagrilar } = sahteFetch({});
  await isle(istek('?kaynak=rc', { event: { id: 'e11', type: 'RENEWAL', app_user_id: UID } }, 'Bearer gizli-123'), ortam(), f);
  assert.equal(cagrilar.filter((c) => c.method === 'GET' && c.url.includes('/rest/v1/abonelikler?')).length, 0);
});

await dene('iade: CANCELLATION (CUSTOMER_SUPPORT) alımı düşürür, REFUND_REVERSED geri getirir', async () => {
  const set = iadeEdilenler([
    { type: 'CANCELLATION', cancel_reason: 'CUSTOMER_SUPPORT', transaction_id: 'txn_1', event_timestamp_ms: 1 },
    { type: 'CANCELLATION', cancel_reason: 'UNSUBSCRIBE', transaction_id: 'txn_2', event_timestamp_ms: 2 },
    { type: 'CANCELLATION', cancel_reason: 'CUSTOMER_SUPPORT', transaction_id: 'txn_3', event_timestamp_ms: 3 },
    { type: 'REFUND_REVERSED', transaction_id: 'txn_3', event_timestamp_ms: 4 },
  ]);
  assert.deepEqual([...set], ['txn_1']);
  sahteOlaylar = [{ govde: { type: 'CANCELLATION', cancel_reason: 'CUSTOMER_SUPPORT', transaction_id: 'txn_b', event_timestamp_ms: 5 } }];
  const { f, cagrilar } = sahteFetch({}, { [TEK]: [alim(-20, { store_transaction_id: 'txn_a' }), alim(-2, { store_transaction_id: 'txn_b' })] });
  await isle(istek('?kaynak=rc', { event: { id: 'e12', type: 'CANCELLATION', app_user_id: UID } }, 'Bearer gizli-123'),
    ortam({ TEK_YIL_URUNLER: TEK }), f);
  const satirlar = JSON.parse(cagrilar.find((c) => c.method === 'POST' && c.url.includes('/rest/v1/abonelikler?on_conflict')).body);
  assert.equal(satirlar[0].ham.alimlar.length, 1);
  assert.equal(satirlar[0].bitis, new Date(ayEkle(Date.parse(gun(-20)), 13)).toISOString());
  sahteOlaylar = [];
});

console.log(`\n${gecti} test geçti`);
