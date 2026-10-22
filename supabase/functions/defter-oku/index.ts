// (2026-10-22) Repertuvar — defter sayfası okuma (DENEME)
//
// Uygulama, eser formundaki "📷 Defterden oku" düğmesiyle sayfanın fotoğrafını (base64 JPEG) gönderir;
// bu fonksiyon Claude'a okutur ve { baslik, soz, akorlu (ChordPro), bilgiler, donus, notlar } döner.
// Hiçbir şey kaydedilmez: kullanıcı önizlemede bakıp formu kendisi doldurur ve kaydeder.
//
// Kimlik ("Verify JWT" KAPALI, burada denetlenir): kullanıcının Supabase oturumu. Deneme süresince yalnız
// admin/editör rolü ya da DEFTER_OKU_IZINLI (virgülle uid) listesindekiler; ayrıca servis anahtarı
// (sunucudan deneme). Herkese açmak ürün kararı (ücret, kota, gizlilik beyanı).
//
// Supabase Secrets: ANTHROPIC_API_KEY (zorunlu), DEFTER_OKU_IZINLI (isteğe bağlı).
// SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY ortamda kendiliğinden gelir.
// Saf kısım okuma.ts'de; SDK yalnız Deno'da yüklenir, test.mjs Node'da sahte okuyucuyla sınar.

import { govdeDenetle, istekOf, sonucDuzenle } from './okuma.ts';

declare const Deno: any;

const IZINLI_KOKENLER = [
  'https://app.repertuvar.app',
  'https://repertuvar.app',
  'capacitor://localhost',
  'https://localhost',
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ortam = (anahtar: string) => string | undefined;
// Okuyucu: Messages API çağrısı. Hata durumunda { durum, hata } taşıyan Error fırlatır.
export type Okuyucu = (istek: ReturnType<typeof istekOf>) => Promise<{
  metin: string; durma: string | null; girdi: number; cikti: number;
}>;

export class OkumaHatasi extends Error {
  durum: number; kod: string;
  constructor(durum: number, kod: string) { super(kod); this.durum = durum; this.kod = kod; }
}

function cors(koken: string | null): Record<string, string> {
  const b: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  if (koken && IZINLI_KOKENLER.includes(koken)) b['Access-Control-Allow-Origin'] = koken;
  return b;
}
function yanit(durum: number, govde: unknown, koken: string | null): Response {
  return new Response(JSON.stringify(govde), { status: durum, headers: { ...cors(koken), 'Content-Type': 'application/json' } });
}
function esitMi(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let fark = 0;
  for (let i = 0; i < a.length; i++) fark |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return fark === 0;
}

// Oturumdaki kişi okuma yapabilir mi? → uid ya da null
async function yetkili(yetki: string, ortam: Ortam, f: typeof fetch): Promise<string | null> {
  const servis = ortam('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (servis && esitMi(yetki, 'Bearer ' + servis)) return 'servis';
  const kr = await f(ortam('SUPABASE_URL') + '/auth/v1/user', { headers: { apikey: ortam('SUPABASE_ANON_KEY') || '', Authorization: yetki } });
  if (!kr.ok) return null;
  const uid = String((await kr.json()).id || '').toLowerCase();
  if (!UUID.test(uid)) return null;
  const izinli = (ortam('DEFTER_OKU_IZINLI') || '').toLowerCase().split(',').map((s) => s.trim());
  if (izinli.includes(uid)) return uid;
  const pr = await f(ortam('SUPABASE_URL') + '/rest/v1/profiles?select=role&id=eq.' + uid, {
    headers: { apikey: servis, Authorization: 'Bearer ' + servis },
  });
  if (!pr.ok) return null;
  const satir = (await pr.json())[0];
  return satir && (satir.role === 'admin' || satir.role === 'editor') ? uid : null;
}

export async function isle(istek: Request, ortam: Ortam, oku: Okuyucu, f: typeof fetch = fetch): Promise<Response> {
  const koken = istek.headers.get('Origin');
  if (istek.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(koken) });
  if (istek.method !== 'POST') return yanit(405, { hata: 'yalniz-post' }, koken);
  if (!ortam('SUPABASE_URL') || !ortam('SUPABASE_SERVICE_ROLE_KEY') || !ortam('ANTHROPIC_API_KEY')) {
    return yanit(503, { hata: 'yapilandirma-eksik' }, koken);
  }
  const yetki = istek.headers.get('Authorization') || '';
  if (!/^Bearer\s+\S+/.test(yetki)) return yanit(401, { hata: 'oturum-yok' }, koken);
  const uid = await yetkili(yetki, ortam, f);
  if (!uid) return yanit(403, { hata: 'yetki-yok' }, koken);

  let govde: unknown;
  try { govde = await istek.json(); } catch { return yanit(400, { hata: 'gecersiz-govde' }, koken); }
  const g = govdeDenetle(govde);
  if ('hata' in g) return yanit(400, { hata: g.hata }, koken);

  try {
    const r = await oku(istekOf(g.gorsel, g.tur));
    if (r.durma === 'refusal') return yanit(422, { hata: 'okuma-reddedildi' }, koken);
    if (r.durma === 'max_tokens') return yanit(502, { hata: 'yanit-kesildi' }, koken);
    const sonuc = sonucDuzenle(r.metin);
    if (!sonuc) return yanit(502, { hata: 'yanit-bozuk' }, koken);
    return yanit(200, { ...sonuc, kullanim: { girdi: r.girdi, cikti: r.cikti } }, koken);
  } catch (e) {
    if (e instanceof OkumaHatasi) return yanit(e.durum, { hata: e.kod }, koken);
    return yanit(502, { hata: 'okuma-hatasi' }, koken);
  }
}

if (typeof Deno !== 'undefined' && Deno.serve) {
  const { default: Anthropic } = await import('npm:@anthropic-ai/sdk@0.137.0');
  const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY'), timeout: 120_000, maxRetries: 1 });
  const oku: Okuyucu = async (params) => {
    try {
      const m = await client.beta.messages.create(params as any);
      const metin = m.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
      return { metin, durma: m.stop_reason, girdi: m.usage?.input_tokens || 0, cikti: m.usage?.output_tokens || 0 };
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) throw new OkumaHatasi(503, 'anahtar-gecersiz');
      if (e instanceof Anthropic.RateLimitError) throw new OkumaHatasi(429, 'cok-istek');
      if (e instanceof Anthropic.BadRequestError) throw new OkumaHatasi(400, 'istek-reddedildi');
      if (e instanceof Anthropic.APIError) throw new OkumaHatasi(502, 'servis-hatasi');
      throw e;
    }
  };
  Deno.serve((istek: Request) => isle(istek, (k) => Deno.env.get(k), oku));
}
