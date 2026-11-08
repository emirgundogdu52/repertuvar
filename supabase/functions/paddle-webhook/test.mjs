// paddle-webhook testleri (Node 24). Çalıştır: node supabase/functions/paddle-webhook/test.mjs
import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHmac } from 'node:crypto';
const kopya = join(mkdtempSync(join(tmpdir(), 'paddle-')), 'index.mts');
copyFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.ts'), kopya);
const { imzaGecerli, lisansOf, isle } = await import(pathToFileURL(kopya).href);

let gecti = 0;
async function dene(ad, fn) { await fn(); gecti++; console.log('  ✓', ad); }

const CANLI = 'pdl_ntfset_canli_gizli', SANDBOX = 'pdl_ntfset_sandbox_gizli';
const GRP = '11111111-2222-4333-8444-555555555555', UID = '4f965624-e524-4cb0-a351-3368f1297d28';
const imzala = (govde, gizli, ts = Math.floor(Date.now() / 1000)) =>
  `ts=${ts};h1=${createHmac('sha256', gizli).update(ts + ':' + govde).digest('hex')}`;
const abonelik = (ek = {}) => ({
  id: 'sub_01abc', status: 'active', started_at: '2026-11-08T10:00:00Z',
  current_billing_period: { starts_at: '2026-11-08T10:00:00Z', ends_at: '2027-11-08T10:00:00Z' },
  custom_data: { group_id: GRP, user_id: UID },
  items: [{ quantity: 12, price: { id: 'pri_01m6ygarfvjez65a8tmgmwrwy7', product_id: 'pro_01m6yg8nbh68qyhqts2x3hr664' },
            product: { id: 'pro_01m6yg8nbh68qyhqts2x3hr664', custom_data: { plan: 'pro', tur: 'grup' } } }],
  ...ek,
});
const olay = (data, tur = 'subscription.created') => JSON.stringify({ event_id: 'evt_1', event_type: tur, occurred_at: '2026-11-08T10:00:01Z', data });
function ortamYap(ek = {}) {
  const e = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'srk', PADDLE_WEBHOOK_SECRET: CANLI,
              PADDLE_SANDBOX_WEBHOOK_SECRET: SANDBOX, WEB_SANDBOX_IZINLI: '', ...ek };
  return (k) => e[k];
}
function sahteFetch(rpcSonuc = 'yazildi') {
  const cagrilar = [];
  const f = async (url, s) => {
    cagrilar.push({ url, govde: s?.body ? JSON.parse(s.body) : null });
    if (url.includes('/rpc/grup_lisans_yaz')) return new Response(JSON.stringify(rpcSonuc), { status: 200 });
    return new Response('', { status: 201 });
  };
  return { f, cagrilar };
}
const istek = (govde, imza) => new Request('https://x/functions/v1/paddle-webhook', { method: 'POST', body: govde, headers: imza ? { 'Paddle-Signature': imza } : {} });

await dene('imza: doğru / yanlış gizli / süresi geçmiş / başlıksız / gizlisiz', async () => {
  const g = '{"a":1}';
  assert.equal(await imzaGecerli(imzala(g, CANLI), g, CANLI), true);
  assert.equal(await imzaGecerli(imzala(g, 'baska'), g, CANLI), false);
  assert.equal(await imzaGecerli(imzala(g, CANLI, Math.floor(Date.now() / 1000) - 3600), g, CANLI), false);
  assert.equal(await imzaGecerli(null, g, CANLI), false);
  assert.equal(await imzaGecerli(imzala(g, CANLI), g, undefined), false);
  assert.equal(await imzaGecerli(imzala(g, CANLI), g + ' ', CANLI), false);   // gövde değişirse geçersiz
});

await dene('lisansOf: grup, edu, iptal planlı, iptal edilmiş, ödeme sorunu, lisans dışı ürün', () => {
  const a = lisansOf(abonelik());
  assert.deepEqual(a, { dis_kimlik: 'sub_01abc', group_id: GRP, user_id: UID, plan: 'pro', koltuk: 12, durum: 'aktif',
    baslangic: '2026-11-08T10:00:00Z', bitis: '2027-11-08T10:00:00Z' });
  const edu = abonelik({ items: [{ quantity: 30, price: { product_id: 'pro_01m6ygeksc4scecsxq0yxk2ye9' } }] });   // ürün custom_data'sız → kimlikten
  assert.equal(lisansOf(edu).plan, 'edu');
  assert.equal(lisansOf(abonelik({ scheduled_change: { action: 'cancel', effective_at: '2027-11-08T10:00:00Z' } })).durum, 'iptal_edildi');
  const iptal = lisansOf(abonelik({ status: 'canceled', canceled_at: '2027-01-01T00:00:00Z' }));
  assert.equal(iptal.durum, 'suresi_doldu'); assert.equal(iptal.bitis, '2027-01-01T00:00:00Z');
  assert.equal(lisansOf(abonelik({ status: 'past_due' })).durum, 'odeme_sorunu');
  assert.equal(lisansOf(abonelik({ items: [{ quantity: 1, product: { id: 'pro_01m6yfxr81bhcvq4nykw15s49h', custom_data: { plan: 'pro' } } }] })), null);
  assert.equal(lisansOf(abonelik({ custom_data: { group_id: 'x; drop', user_id: UID } })).group_id, null);
});

await dene('isle: imzasız 401, GET 405, sırsız ortamda her istek 401', async () => {
  const { f } = sahteFetch();
  assert.equal((await isle(istek(olay(abonelik())), ortamYap(), f)).status, 401);
  assert.equal((await isle(new Request('https://x', { method: 'GET' }), ortamYap(), f)).status, 405);
  const g = olay(abonelik());
  assert.equal((await isle(istek(g, imzala(g, CANLI)), ortamYap({ PADDLE_WEBHOOK_SECRET: undefined, PADDLE_SANDBOX_WEBHOOK_SECRET: undefined }), f)).status, 401);
});

await dene('isle: canlı grup olayı → grup_lisans_yaz doğru parametrelerle + günlük', async () => {
  const { f, cagrilar } = sahteFetch('yazildi');
  const g = olay(abonelik());
  const r = await isle(istek(g, imzala(g, CANLI)), ortamYap(), f);
  assert.equal(r.status, 200); assert.equal((await r.json()).sonuc, 'yazildi');
  const rpc = cagrilar.find((c) => c.url.includes('/rpc/grup_lisans_yaz')).govde;
  assert.equal(rpc.p_group_id, GRP); assert.equal(rpc.p_user_id, UID); assert.equal(rpc.p_plan, 'pro');
  assert.equal(rpc.p_koltuk, 12); assert.equal(rpc.p_durum, 'aktif'); assert.equal(rpc.p_ortam, 'production');
  assert.equal(rpc.p_olay, '2026-11-08T10:00:01Z');
  const gun = cagrilar.find((c) => c.url.includes('abonelik_olaylari')).govde;
  assert.equal(gun.id, 'paddle:evt_1'); assert.equal(gun.tur, 'subscription.created/yazildi');
});

await dene('isle: edu-onaysiz günlüğe yazılır, 200', async () => {
  const { f, cagrilar } = sahteFetch('edu-onaysiz');
  const g = olay(abonelik({ items: [{ quantity: 8, price: { product_id: 'pro_01m6ygeksc4scecsxq0yxk2ye9' } }] }));
  const r = await isle(istek(g, imzala(g, CANLI)), ortamYap(), f);
  assert.equal(r.status, 200); assert.equal((await r.json()).sonuc, 'edu-onaysiz');
  assert.equal(cagrilar.find((c) => c.url.includes('abonelik_olaylari')).govde.tur, 'subscription.created/edu-onaysiz');
});

await dene('isle: sandbox yalnız izinli alıcıya; lisans dışı ürün ve başka olay yok sayılır; eksik veri yazılmaz', async () => {
  let s = sahteFetch(); const g = olay(abonelik());
  assert.equal((await (await isle(istek(g, imzala(g, SANDBOX)), ortamYap(), s.f)).json()).sonuc, 'sandbox-izinsiz');
  assert.equal(s.cagrilar.some((c) => c.url.includes('/rpc/')), false);
  s = sahteFetch();
  const r = await isle(istek(g, imzala(g, SANDBOX)), ortamYap({ WEB_SANDBOX_IZINLI: 'x,' + UID }), s.f);
  assert.equal((await r.json()).sonuc, 'yazildi');
  assert.equal(s.cagrilar.find((c) => c.url.includes('/rpc/')).govde.p_ortam, 'sandbox');
  s = sahteFetch();
  const g2 = olay(abonelik({ items: [{ quantity: 1, product: { id: 'pro_01m6yfxr81bhcvq4nykw15s49h', custom_data: { plan: 'pro' } } }] }));
  assert.equal((await (await isle(istek(g2, imzala(g2, CANLI)), ortamYap(), s.f)).json()).yok_sayildi, 'lisans-urunu-degil');
  const g3 = JSON.stringify({ event_id: 'e', event_type: 'transaction.completed', data: {} });
  assert.equal((await (await isle(istek(g3, imzala(g3, CANLI)), ortamYap(), s.f)).json()).yok_sayildi, 'transaction.completed');
  s = sahteFetch();
  const g4 = olay(abonelik({ custom_data: {} }));
  assert.equal((await (await isle(istek(g4, imzala(g4, CANLI)), ortamYap(), s.f)).json()).sonuc, 'eksik-veri');
  assert.equal(s.cagrilar.some((c) => c.url.includes('/rpc/')), false);
});

await dene('isle: veritabanı hatası → 502 (Paddle yeniden dener)', async () => {
  const f = async (url) => url.includes('/rpc/') ? new Response('x', { status: 500 }) : new Response('', { status: 201 });
  const g = olay(abonelik());
  assert.equal((await isle(istek(g, imzala(g, CANLI)), ortamYap(), f)).status, 502);
});

console.log(`\n${gecti} test geçti`);
