// (2026-10-05) Apple ile Giriş — hesap silinirken Apple belirteçlerini iptal eder
// (App Store kuralı 5.1.1(v): Apple ile Giriş kullanan uygulama, hesap silindiğinde
// kullanıcının Apple belirteçlerini Sign in with Apple REST API ile iptal etmeli).
//
// Akış: iOS uygulaması silmeden hemen önce Apple ile yeniden yetkilendirir ve aldığı
// authorizationCode'u buraya yollar (ayarlar.html → _appleIptal). Burada:
//   1. Oturumdaki kullanıcı Supabase'den doğrulanır (çağıranın kendi JWT'si).
//   2. Kod Apple'da belirtece çevrilir; belirtecin sahibi (sub) bu kullanıcının
//      Apple kimliği değilse hiçbir şey iptal edilmez (başkasının kodu kullanılamaz).
//   3. Belirteç /auth/revoke ile iptal edilir.
//
// Supabase Secrets (Apple üyeliği onaylanınca girilecek):
//   APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (.p8 dosyasının içeriği),
//   APPLE_BUNDLE_ID (com.repertuvar.app), APPLE_SERVICES_ID (app.repertuvar.web)
// SUPABASE_URL ve SUPABASE_ANON_KEY Edge Functions ortamında kendiliğinden gelir.
//
// Dış kütüphane yok (yalnız fetch + WebCrypto): aynı dosya Node'da test edilebiliyor
// (supabase/functions/apple-iptal/test.mjs).

declare const Deno: any;

const APPLE = 'https://appleid.apple.com';
const IZINLI_KOKENLER = [
  'https://app.repertuvar.app',
  'https://repertuvar.app',
  'capacitor://localhost',
  'https://localhost',
];

type Ortam = (anahtar: string) => string | undefined;

export function b64url(veri: Uint8Array | string): string {
  const baytlar = typeof veri === 'string' ? new TextEncoder().encode(veri) : veri;
  let ikili = '';
  for (let i = 0; i < baytlar.length; i++) ikili += String.fromCharCode(baytlar[i]);
  return btoa(ikili).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function jwtGovdesi(jwt: string): Record<string, unknown> {
  const parca = (jwt || '').split('.')[1] || '';
  const b64 = parca.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (parca.length % 4)) % 4);
  const ikili = atob(b64);
  const baytlar = Uint8Array.from(ikili, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(baytlar));
}

function pemdenAnahtar(pem: string): Uint8Array {
  const govde = pem.replace(/-----[^-]+-----/g, '').replace(/\\n/g, '').replace(/\s+/g, '');
  return Uint8Array.from(atob(govde), (c) => c.charCodeAt(0));
}

// Apple client_secret: ES256 imzalı JWT (en fazla 6 ay geçerli; burada 5 dk yeter)
export async function istemciSirri(o: {
  takim: string; anahtarId: string; pem: string; istemci: string; simdi?: number;
}): Promise<string> {
  const iat = Math.floor((o.simdi ?? Date.now()) / 1000);
  const baslik = b64url(JSON.stringify({ alg: 'ES256', kid: o.anahtarId }));
  const yuk = b64url(JSON.stringify({ iss: o.takim, iat, exp: iat + 300, aud: APPLE, sub: o.istemci }));
  const anahtar = await crypto.subtle.importKey(
    'pkcs8', pemdenAnahtar(o.pem), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'],
  );
  // WebCrypto ECDSA imzası zaten JWS'in istediği r||s (64 bayt) biçiminde
  const imza = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, anahtar, new TextEncoder().encode(baslik + '.' + yuk),
  ));
  return baslik + '.' + yuk + '.' + b64url(imza);
}

function corsBasliklari(koken: string | null): Record<string, string> {
  const b: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  if (koken && IZINLI_KOKENLER.includes(koken)) b['Access-Control-Allow-Origin'] = koken;
  return b;
}

function yanit(durum: number, govde: unknown, koken: string | null): Response {
  return new Response(JSON.stringify(govde), {
    status: durum,
    headers: { ...corsBasliklari(koken), 'Content-Type': 'application/json' },
  });
}

export async function isle(istek: Request, ortam: Ortam, f: typeof fetch = fetch): Promise<Response> {
  const koken = istek.headers.get('Origin');
  if (istek.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsBasliklari(koken) });
  if (istek.method !== 'POST') return yanit(405, { hata: 'yalniz-post' }, koken);

  const yetki = istek.headers.get('Authorization') || '';
  if (!/^Bearer\s+\S+/.test(yetki)) return yanit(401, { hata: 'oturum-yok' }, koken);

  const supaUrl = ortam('SUPABASE_URL'), anon = ortam('SUPABASE_ANON_KEY');
  const takim = ortam('APPLE_TEAM_ID'), anahtarId = ortam('APPLE_KEY_ID'), pem = ortam('APPLE_PRIVATE_KEY');
  if (!supaUrl || !anon || !takim || !anahtarId || !pem) return yanit(503, { hata: 'yapilandirma-eksik' }, koken);

  let govde: { code?: string; istemci?: string };
  try { govde = await istek.json(); } catch { return yanit(400, { hata: 'gecersiz-govde' }, koken); }
  if (!govde || typeof govde.code !== 'string' || !govde.code) return yanit(400, { hata: 'kod-yok' }, koken);

  // 1) Kullanıcıyı Supabase'den doğrula (çağıranın JWT'si ile)
  const kr = await f(supaUrl + '/auth/v1/user', { headers: { apikey: anon, Authorization: yetki } });
  if (!kr.ok) return yanit(401, { hata: 'oturum-gecersiz' }, koken);
  const kullanici = await kr.json();
  const kimlik = (kullanici.identities || []).find((k: { provider?: string }) => k.provider === 'apple');
  if (!kimlik) return yanit(200, { iptal: false, neden: 'apple-kimligi-yok' }, koken);
  const appleSub = (kimlik.identity_data && kimlik.identity_data.sub) || kimlik.id;

  // iOS'ta kod uygulamanın paket kimliğiyle, web'de Services ID ile üretilir
  const istemci = govde.istemci === 'web' ? ortam('APPLE_SERVICES_ID') : ortam('APPLE_BUNDLE_ID');
  if (!istemci) return yanit(503, { hata: 'yapilandirma-eksik' }, koken);
  const sir = await istemciSirri({ takim, anahtarId, pem, istemci });

  // 2) Kodu belirtece çevir
  const tr = await f(APPLE + '/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: istemci, client_secret: sir, code: govde.code, grant_type: 'authorization_code' }),
  });
  if (!tr.ok) return yanit(400, { hata: 'kod-gecersiz' }, koken);
  const belirtec = await tr.json();
  let sub = '';
  try { sub = String(jwtGovdesi(belirtec.id_token).sub || ''); } catch { /* aşağıda reddedilir */ }
  if (!sub || sub !== appleSub) return yanit(403, { hata: 'kimlik-eslesmiyor' }, koken);

  // 3) İptal
  const iptalEdilecek = belirtec.refresh_token || belirtec.access_token;
  const ipucu = belirtec.refresh_token ? 'refresh_token' : 'access_token';
  const rv = await f(APPLE + '/auth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: istemci, client_secret: sir, token: iptalEdilecek, token_type_hint: ipucu }),
  });
  return yanit(rv.ok ? 200 : 502, { iptal: rv.ok }, koken);
}

if (typeof Deno !== 'undefined' && Deno.serve) {
  Deno.serve((istek: Request) => isle(istek, (k) => Deno.env.get(k)));
}
