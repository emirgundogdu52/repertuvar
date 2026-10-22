// defter-oku Edge Function testleri (Node 24: TypeScript tipleri kendiliğinden ayıklanır; SDK yalnız Deno'da yüklenir).
// Çalıştır: node supabase/functions/defter-oku/test.mjs
import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const burasi = dirname(fileURLToPath(import.meta.url));
const gecici = mkdtempSync(join(tmpdir(), 'defter-oku-'));
copyFileSync(join(burasi, 'okuma.ts'), join(gecici, 'okuma.ts'));
copyFileSync(join(burasi, 'index.ts'), join(gecici, 'index.mts'));
const { govdeDenetle, istekOf, sonucDuzenle, akorluTemizle, SEMA, MODEL, DIKKATLI_MODEL, MODELLER } = await import(pathToFileURL(join(gecici, 'okuma.ts')).href);
const { isle, OkumaHatasi } = await import(pathToFileURL(join(gecici, 'index.mts')).href);

let gecti = 0;
async function dene(ad, fn) { await fn(); gecti++; console.log('  ✓', ad); }

const UID = '11111111-2222-4333-8444-555555555555';
const SERVIS = 'servis-anahtari';
const ORTAM = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: SERVIS, SUPABASE_ANON_KEY: 'anon', ANTHROPIC_API_KEY: 'k' };
const ortam = (ek = {}) => (k) => ({ ...ORTAM, ...ek })[k];
const GORSEL = Buffer.from('jpeg-baytlari').toString('base64');
const IYI = JSON.stringify({
  baslik: 'Sabahın Seherinde', soz: 'Sabahın seherinde\nötüyor kuşlar', akorlu: '[Am]Sabahın se[G]herinde',
  bilgiler: { yore: 'Kastamonu', kaynak_kisi: '', derleyen: '', notaya_alan: '', repertuvar_no: '', makam: '', usul: '', sure: '', ton: '', soz_yazari: '', besteci: '' },
  donuslar: [90], notlar: '',
});
// Sahte Supabase: /auth/v1/user ve profiles
function sahteFetch(rol = 'editor', oturumGecerli = true) {
  return async (url) => {
    if (url.endsWith('/auth/v1/user')) return oturumGecerli ? new Response(JSON.stringify({ id: UID })) : new Response('{}', { status: 401 });
    if (url.includes('/rest/v1/profiles')) return new Response(JSON.stringify(rol ? [{ role: rol }] : []));
    throw new Error('beklenmeyen istek ' + url);
  };
}
function istek(govde, yetki = 'Bearer ' + SERVIS, yontem = 'POST') {
  return new Request('https://x.supabase.co/functions/v1/defter-oku', {
    method: yontem, headers: { Authorization: yetki, Origin: 'capacitor://localhost', 'Content-Type': 'application/json' },
    body: yontem === 'POST' ? JSON.stringify(govde) : undefined,
  });
}
const okuyucu = (metin = IYI, durma = 'end_turn') => { const o = async (p) => { o.son = p; return { metin, durma, girdi: 1500, cikti: 400 }; }; return o; };

await dene('govdeDenetle', () => {
  assert.deepEqual(govdeDenetle({ gorsel: GORSEL }), { gorseller: [GORSEL], tur: 'image/jpeg' });
  assert.deepEqual(govdeDenetle({ gorsel: 'data:image/png;base64,' + GORSEL, tur: 'image/png' }), { gorseller: [GORSEL], tur: 'image/png' });
  assert.deepEqual(govdeDenetle({ gorseller: [GORSEL, GORSEL, GORSEL] }), { gorseller: [GORSEL, GORSEL, GORSEL], tur: 'image/jpeg' });
  assert.equal(govdeDenetle({ gorseller: Array(7).fill(GORSEL) }).hata, 'cok-sayfa');
  assert.equal(govdeDenetle({ gorseller: [GORSEL, 7] }).hata, 'gorsel-yok');
  assert.equal(govdeDenetle({ gorseller: [] }).hata, 'gorsel-yok');
  assert.equal(govdeDenetle({ gorsel: GORSEL, tur: 'image/svg+xml' }).hata, 'desteklenmeyen-tur');
  assert.equal(govdeDenetle({}).hata, 'gorsel-yok');
  assert.equal(govdeDenetle({ gorsel: '<script>' }).hata, 'gorsel-yok');
  assert.equal(govdeDenetle({ gorsel: 'A'.repeat(9 * 1024 * 1024) }).hata, 'gorsel-buyuk');
  assert.equal(govdeDenetle(null).hata, 'gorsel-yok');
});

await dene('istekOf: model, yedek model, yapılandırılmış çıktı, görsel', () => {
  assert.equal(MODEL, 'claude-haiku-5-5');           // kullanıcı kararı "3": varsayılan Haiku
  assert.equal(DIKKATLI_MODEL, 'claude-opus-5-5');   // "Daha dikkatli oku"
  const h = istekOf([GORSEL], 'image/jpeg');
  assert.equal(h.model, MODEL);
  assert.equal(h.fallbacks, undefined);   // Haiku 5.5'te sunucu tarafı yedek model yok
  assert.equal(h.betas, undefined);
  assert.equal(h.output_config.effort, 'medium');
  assert.equal(h.output_config.format.type, 'json_schema');
  assert.equal(h.output_config.format.schema, SEMA);
  assert.equal(h.messages[0].content[0].source.data, GORSEL);
  assert.equal(h.thinking, undefined);    // thinking gönderilmez (ikisinde de adaptive varsayılan)
  const p = istekOf([GORSEL], 'image/jpeg', DIKKATLI_MODEL);
  assert.equal(p.model, 'claude-opus-5-5');
  assert.equal(p.fallbacks, 'default');
  assert.deepEqual(p.betas, ['server-side-fallback-2026-07-01']);
  assert.equal(p.output_config.format.schema, SEMA);
  // şemadaki her nesne additionalProperties:false + tüm alanlar required
  const denetle = (s) => { if (s.type === 'object') { assert.equal(s.additionalProperties, false); assert.deepEqual([...s.required].sort(), Object.keys(s.properties).sort()); Object.values(s.properties).forEach(denetle); } };
  denetle(SEMA);
  assert.deepEqual(MODELLER, ['claude-opus-5-5', 'claude-haiku-5-5']);
  // çok sayfa: her görselden önce "Sayfa i / n" etiketi, sonda birleştirme talimatı
  const c = istekOf(['QQ==', 'Qg==', 'Qw=='], 'image/jpeg').messages[0].content;
  assert.deepEqual(c.filter((b) => b.type === 'image').map((b) => b.source.data), ['QQ==', 'Qg==', 'Qw==']);
  assert.equal(c[0].text, 'Sayfa 1 / 3'); assert.equal(c[2].text, 'Sayfa 2 / 3');
  assert.match(c[c.length - 1].text, /tek eser/);
  assert.equal(h.messages[0].content.length, 2);   // tek sayfada etiket yok
});

await dene('sonucDuzenle + akorluTemizle', () => {
  const s = sonucDuzenle(IYI);
  assert.equal(s.akorlu, '[Am]Sabahın se[G]herinde');
  assert.deepEqual(s.donuslar, [90]);
  assert.equal(s.bilgiler.yore, 'Kastamonu');
  assert.equal(sonucDuzenle('bozuk'), null);
  const z = sonucDuzenle(JSON.stringify({ soz: ' a\r\nb ', donuslar: [45, 90], bilgiler: null }), 3);
  assert.equal(z.soz, 'a\nb'); assert.deepEqual(z.donuslar, [0, 90, 0]);   // sayfa sayısı kadar, geçersiz → 0 assert.equal(z.baslik, ''); assert.equal(z.bilgiler.makam, '');
  assert.equal(akorluTemizle('[Am söz [G]devam'), 'Am söz [G]devam');
  assert.equal(akorluTemizle('söz] [C]x [D'), 'söz [C]x D');
  assert.equal(akorluTemizle('[Am]a\n[[G]]b'), '[Am]a\n[G]b');
});

await dene('isle: CORS / yöntem / yapılandırma', async () => {
  const o = await isle(istek(null, '', 'OPTIONS'), ortam(), okuyucu(), sahteFetch());
  assert.equal(o.status, 204); assert.equal(o.headers.get('Access-Control-Allow-Origin'), 'capacitor://localhost');
  assert.equal((await isle(istek(null, 'Bearer x', 'GET'), ortam(), okuyucu(), sahteFetch())).status, 405);
  const e = await isle(istek({ gorsel: GORSEL }), ortam({ ANTHROPIC_API_KEY: undefined }), okuyucu(), sahteFetch());
  assert.equal(e.status, 503); assert.equal((await e.json()).hata, 'yapilandirma-eksik');
});

await dene('isle: kimlik ve rol', async () => {
  assert.equal((await isle(istek({ gorsel: GORSEL }, ''), ortam(), okuyucu(), sahteFetch())).status, 401);
  assert.equal((await isle(istek({ gorsel: GORSEL }, 'Bearer kullanici'), ortam(), okuyucu(), sahteFetch('editor'))).status, 200);
  assert.equal((await isle(istek({ gorsel: GORSEL }, 'Bearer kullanici'), ortam(), okuyucu(), sahteFetch('admin'))).status, 200);
  assert.equal((await isle(istek({ gorsel: GORSEL }, 'Bearer kullanici'), ortam(), okuyucu(), sahteFetch('user'))).status, 403);
  assert.equal((await isle(istek({ gorsel: GORSEL }, 'Bearer kullanici'), ortam(), okuyucu(), sahteFetch(null))).status, 403);
  assert.equal((await isle(istek({ gorsel: GORSEL }, 'Bearer kullanici'), ortam(), okuyucu(), sahteFetch('editor', false))).status, 403);
  assert.equal((await isle(istek({ gorsel: GORSEL }, 'Bearer kullanici'), ortam({ DEFTER_OKU_IZINLI: 'x, ' + UID.toUpperCase() }), okuyucu(), sahteFetch('user'))).status, 200);
  assert.equal((await isle(istek({ gorsel: GORSEL }, 'Bearer servis-anahtarX'), ortam(), okuyucu(), sahteFetch(null, false))).status, 403);
});

await dene('isle: okuma sonuçları', async () => {
  const ok = okuyucu();
  const r = await isle(istek({ gorsel: GORSEL }), ortam(), ok, sahteFetch());
  const j = await r.json();
  assert.equal(r.status, 200); assert.equal(j.baslik, 'Sabahın Seherinde'); assert.deepEqual(j.kullanim, { girdi: 1500, cikti: 400 });
  assert.equal(ok.son.messages[0].content[0].source.data, GORSEL);
  assert.equal(j.sayfa, 1); assert.deepEqual(j.donuslar, [90]);
  const ok3 = okuyucu(JSON.stringify({ ...JSON.parse(IYI), donuslar: [0, 270] }));
  const j3 = await (await isle(istek({ gorseller: [GORSEL, GORSEL, GORSEL] }), ortam(), ok3, sahteFetch())).json();
  assert.equal(j3.sayfa, 3); assert.deepEqual(j3.donuslar, [0, 270, 0]);
  assert.equal(ok3.son.messages[0].content.filter((b) => b.type === 'image').length, 3);
  assert.equal((await (await isle(istek({ gorseller: Array(7).fill(GORSEL) }), ortam(), okuyucu(), sahteFetch())).json()).hata, 'cok-sayfa');
  assert.equal((await isle(istek({ gorsel: GORSEL }), ortam(), okuyucu(IYI, 'refusal'), sahteFetch())).status, 422);
  assert.equal((await isle(istek({ gorsel: GORSEL }), ortam(), okuyucu(IYI, 'max_tokens'), sahteFetch())).status, 502);
  assert.equal((await (await isle(istek({ gorsel: GORSEL }), ortam(), okuyucu('bozuk'), sahteFetch())).json()).hata, 'yanit-bozuk');
  const hatali = async () => { throw new OkumaHatasi(429, 'cok-istek'); };
  const h = await isle(istek({ gorsel: GORSEL }), ortam(), hatali, sahteFetch());
  assert.equal(h.status, 429); assert.equal((await h.json()).hata, 'cok-istek');
  const beklenmedik = async () => { throw new Error('ağ'); };
  assert.equal((await isle(istek({ gorsel: GORSEL }), ortam(), beklenmedik, sahteFetch())).status, 502);
  assert.equal((await isle(istek({ gorsel: 'x', tur: 'text/html' }), ortam(), okuyucu(), sahteFetch())).status, 400);
});

await dene('isle: model seçimi (varsayılan Haiku, dikkatli → Opus, açık ad yalnız servis)', async () => {
  const k = (govde, yetki) => { const o = okuyucu(); return isle(istek(govde, yetki), ortam(), o, sahteFetch('editor')).then(async (r) => ({ o, j: await r.json() })); };
  let { o, j } = await k({ gorsel: GORSEL }, 'Bearer kullanici');
  assert.equal(o.son.model, 'claude-haiku-5-5'); assert.equal(j.model, 'claude-haiku-5-5');
  ({ o, j } = await k({ gorsel: GORSEL, dikkatli: true }, 'Bearer kullanici'));
  assert.equal(o.son.model, 'claude-opus-5-5'); assert.equal(o.son.fallbacks, 'default'); assert.equal(j.model, 'claude-opus-5-5');
  ({ o } = await k({ gorsel: GORSEL, dikkatli: 'evet' }, 'Bearer kullanici'));
  assert.equal(o.son.model, MODEL);                   // yalnız gerçek true
  ({ o } = await k({ gorsel: GORSEL, model: 'claude-opus-5-5' }, 'Bearer kullanici'));
  assert.equal(o.son.model, MODEL);                   // kullanıcı model adı veremez
  ({ o } = await k({ gorsel: GORSEL, model: 'claude-opus-5-5' }));
  assert.equal(o.son.model, 'claude-opus-5-5');       // servis anahtarı verebilir
  ({ o } = await k({ gorsel: GORSEL, model: 'claude-fable-5-1' }));
  assert.equal(o.son.model, MODEL);                   // listede olmayan model yok sayılır
});

console.log(`\n${gecti} test geçti`);
