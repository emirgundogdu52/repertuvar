// apple-iptal Edge Function testleri (Node 24: TypeScript tipleri kendiliğinden ayıklanır).
// Çalıştır: node supabase/functions/apple-iptal/test.mjs
import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
// index.ts Supabase'in beklediği adda kalsın; Node ESM olarak yüklesin diye geçici .mts kopyası
const kopya = join(mkdtempSync(join(tmpdir(), 'apple-iptal-')), 'index.mts');
copyFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.ts'), kopya);
const { istemciSirri, jwtGovdesi, b64url, isle } = await import(pathToFileURL(kopya).href);

const anahtar = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', anahtar.privateKey));
const pem = '-----BEGIN PRIVATE KEY-----\n' + Buffer.from(pkcs8).toString('base64').match(/.{1,64}/g).join('\n') + '\n-----END PRIVATE KEY-----';

let gecti = 0;
async function dene(ad, fn) { await fn(); gecti++; console.log('  ✓', ad); }

// 1) client_secret: başlık/yük doğru, imza ortak anahtarla doğrulanıyor
await dene('istemciSirri ES256 imzası ve alanlar', async () => {
  const jwt = await istemciSirri({ takim: 'TAKIM1', anahtarId: 'ANAHTAR1', pem, istemci: 'com.repertuvar.app', simdi: 1_800_000_000_000 });
  const [b, y, s] = jwt.split('.');
  assert.deepEqual(jwtGovdesi('x.' + b + '.x'), { alg: 'ES256', kid: 'ANAHTAR1' });
  const yuk = jwtGovdesi(jwt);
  assert.equal(yuk.iss, 'TAKIM1'); assert.equal(yuk.sub, 'com.repertuvar.app');
  assert.equal(yuk.aud, 'https://appleid.apple.com'); assert.equal(yuk.exp - yuk.iat, 300);
  const imza = Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  assert.equal(imza.length, 64);
  const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, anahtar.publicKey, imza, new TextEncoder().encode(b + '.' + y));
  assert.ok(ok, 'imza doğrulanmalı');
});

// .p8 içeriği Secrets'a tek satır ("\n" kaçışlı) girilirse de çalışmalı
await dene('PEM kaçışlı tek satır', async () => {
  const tekSatir = pem.replace(/\n/g, '\\n');
  const jwt = await istemciSirri({ takim: 'T', anahtarId: 'K', pem: tekSatir, istemci: 'x' });
  assert.equal(jwt.split('.').length, 3);
});

const ortam = (k) => ({ SUPABASE_URL: 'https://supa.test', SUPABASE_ANON_KEY: 'anon', APPLE_TEAM_ID: 'T', APPLE_KEY_ID: 'K', APPLE_PRIVATE_KEY: pem, APPLE_BUNDLE_ID: 'com.repertuvar.app', APPLE_SERVICES_ID: 'app.repertuvar.web' })[k];
const idToken = (sub) => 'h.' + b64url(JSON.stringify({ sub })) + '.s';
function sahteFetch({ kimlikler = [{ provider: 'apple', identity_data: { sub: 'APPLE-SUB-1' } }], tokenSub = 'APPLE-SUB-1', tokenOk = true, revokeOk = true, kullaniciOk = true } = {}) {
  const cagrilar = [];
  const f = async (url, o = {}) => {
    const govde = o.body ? Object.fromEntries(new URLSearchParams(String(o.body))) : null;
    cagrilar.push({ url, govde, basliklar: o.headers });
    if (url.endsWith('/auth/v1/user')) return new Response(JSON.stringify({ id: 'u1', identities: kimlikler }), { status: kullaniciOk ? 200 : 401 });
    if (url.endsWith('/auth/token')) return new Response(JSON.stringify({ id_token: idToken(tokenSub), refresh_token: 'YENILEME-1', access_token: 'ERISIM-1' }), { status: tokenOk ? 200 : 400 });
    if (url.endsWith('/auth/revoke')) return new Response('', { status: revokeOk ? 200 : 400 });
    throw new Error('beklenmeyen adres ' + url);
  };
  return { f, cagrilar };
}
const istek = (govde, basliklar = { Authorization: 'Bearer kullanici-jwt', Origin: 'capacitor://localhost' }, yontem = 'POST') =>
  new Request('https://supa.test/functions/v1/apple-iptal', { method: yontem, headers: basliklar, body: yontem === 'POST' ? JSON.stringify(govde) : undefined });

await dene('başarılı iptal: refresh_token, paket kimliğiyle', async () => {
  const { f, cagrilar } = sahteFetch();
  const r = await isle(istek({ code: 'KOD', istemci: 'ios' }), ortam, f);
  assert.equal(r.status, 200); assert.deepEqual(await r.json(), { iptal: true });
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), 'capacitor://localhost');
  const kullaniciCagrisi = cagrilar[0];
  assert.equal(kullaniciCagrisi.basliklar.Authorization, 'Bearer kullanici-jwt');
  const token = cagrilar.find((c) => c.url.endsWith('/auth/token')).govde;
  assert.equal(token.client_id, 'com.repertuvar.app'); assert.equal(token.code, 'KOD'); assert.equal(token.grant_type, 'authorization_code');
  const revoke = cagrilar.find((c) => c.url.endsWith('/auth/revoke')).govde;
  assert.equal(revoke.token, 'YENILEME-1'); assert.equal(revoke.token_type_hint, 'refresh_token');
});

await dene('web kodu Services ID ile', async () => {
  const { f, cagrilar } = sahteFetch();
  await isle(istek({ code: 'KOD', istemci: 'web' }), ortam, f);
  assert.equal(cagrilar.find((c) => c.url.endsWith('/auth/token')).govde.client_id, 'app.repertuvar.web');
});

await dene('başkasının kodu: kimlik eşleşmiyor → 403, iptal yok', async () => {
  const { f, cagrilar } = sahteFetch({ tokenSub: 'BASKA-SUB' });
  const r = await isle(istek({ code: 'KOD' }), ortam, f);
  assert.equal(r.status, 403);
  assert.ok(!cagrilar.some((c) => c.url.endsWith('/auth/revoke')));
});

await dene('Apple kimliği olmayan kullanıcı → iptal gerekmiyor', async () => {
  const { f, cagrilar } = sahteFetch({ kimlikler: [{ provider: 'google', identity_data: { sub: 'G' } }] });
  const r = await isle(istek({ code: 'KOD' }), ortam, f);
  assert.equal(r.status, 200); assert.deepEqual(await r.json(), { iptal: false, neden: 'apple-kimligi-yok' });
  assert.equal(cagrilar.length, 1);
});

await dene('oturum yok → 401, dışarıya hiç gidilmez', async () => {
  const { f, cagrilar } = sahteFetch();
  const r = await isle(istek({ code: 'KOD' }, { Origin: 'https://app.repertuvar.app' }), ortam, f);
  assert.equal(r.status, 401); assert.equal(cagrilar.length, 0);
});

await dene('geçersiz oturum → 401', async () => {
  const { f } = sahteFetch({ kullaniciOk: false });
  assert.equal((await isle(istek({ code: 'KOD' }), ortam, f)).status, 401);
});

await dene('Apple kodu reddederse → 400, iptal yok', async () => {
  const { f, cagrilar } = sahteFetch({ tokenOk: false });
  assert.equal((await isle(istek({ code: 'KOD' }), ortam, f)).status, 400);
  assert.ok(!cagrilar.some((c) => c.url.endsWith('/auth/revoke')));
});

await dene('yapılandırma eksik (Secrets girilmemiş) → 503', async () => {
  const { f } = sahteFetch();
  const r = await isle(istek({ code: 'KOD' }), (k) => (k === 'APPLE_PRIVATE_KEY' ? undefined : ortam(k)), f);
  assert.equal(r.status, 503);
});

await dene('CORS ön isteği ve izinsiz köken', async () => {
  const r = await isle(istek(null, { Origin: 'https://app.repertuvar.app' }, 'OPTIONS'), ortam, fetch);
  assert.equal(r.status, 204); assert.equal(r.headers.get('Access-Control-Allow-Origin'), 'https://app.repertuvar.app');
  const r2 = await isle(istek(null, { Origin: 'https://kotu.example' }, 'OPTIONS'), ortam, fetch);
  assert.equal(r2.headers.get('Access-Control-Allow-Origin'), null);
});

await dene('kod eksik → 400', async () => {
  const { f } = sahteFetch();
  assert.equal((await isle(istek({}), ortam, f)).status, 400);
});

console.log(`\n${gecti} test geçti`);
