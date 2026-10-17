// abonelik Edge Function testleri (Node 24: TypeScript tipleri kendiliğinden ayıklanır).
// Çalıştır: node supabase/functions/abonelik/test.mjs
import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const kopya = join(mkdtempSync(join(tmpdir(), 'abonelik-')), 'index.mts');
copyFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.ts'), kopya);
const { kaynakOf, donemOf, satirOf, etkilenenler, isle } = await import(pathToFileURL(kopya).href);

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
function sahteFetch(rcAbonelikler = {}) {
  const cagrilar = [];
  const f = async (url, init = {}) => {
    cagrilar.push({ url: String(url), method: init.method || 'GET', body: init.body, headers: init.headers || {} });
    const u = String(url);
    if (u.startsWith('https://api.revenuecat.com/v1/subscribers/')) {
      if ((init.method || 'GET') === 'DELETE') return new Response('{}', { status: 200 });
      return new Response(JSON.stringify({ subscriber: { subscriptions: rcAbonelikler } }), { status: 200 });
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

console.log(`\n${gecti} test geçti`);
