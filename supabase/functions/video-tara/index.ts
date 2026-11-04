// (2026-11-04, Emir "seslendiren bilgisiyle YouTube'dan linkleri alıp ilgili alana yazabiliriz") VİDEO TARA
//
// Bağlantısı (works.video_link) boş, herkese açık eserler için YouTube'da arar:
//  • GÜÇLÜ eşleşme (ad başlıkta aynen + seslendiren başlıkta/kanalda + cover/karaoke/ders değil) → works.video_link yazılır,
//    adaylar karar='secildi' (karar_veren boş = otomatik) / 'red'.
//  • Kalanlar work_video_candidates'a düşer (karar boş) → Emir arac/video-adaylari.html'den onaylar.
//  • Aday çıkmayan eser video_tara_deneme'ye yazılır, bir daha aranmaz.
// Sıra: önce repertuvarlarda kullanılanlar, sonra seslendireni olan katalog, sonra kalanlar (video_tara_sec()).
//
// KOTA: YouTube ücretsiz günlük 10.000 birim (Pasifik saatiyle gece yarısı sıfırlanır); search=100, videos=1.
// video_tara_kota tablosu günlük harcamayı tutar; GUNLUK_SINIR'a gelince işlev boş döner. pg_cron 15 dakikada bir
// çağırır (her çağrı en çok ADET eser, ~110 sn), gün içinde sınıra kadar sürer.
//
// Kimlik ("Verify JWT" KAPALI): x-tara-jeton başlığı (Vault'taki video_tara_jeton — cron), servis anahtarı ya da admin oturumu.
// Supabase Secrets: YOUTUBE_API_KEY (zorunlu; Google Cloud "repertuvar" projesi, yalnız YouTube Data API v3 kısıtlı).

import { adaylariSec, aramaParametreleri, type Eser } from './secim.ts';

declare const Deno: any;

export const GUNLUK_SINIR = 9600;   // 10.000'in altında pay: telefondaki eski aday sayfası da aynı kotayı kullanır
const ESER_MALIYETI = 101;
const ADET_VARSAYILAN = 10, ADET_EN_COK = 30;
const SURE_SINIRI_MS = 110_000;

type Ortam = (k: string) => string | undefined;

function yanit(durum: number, govde: unknown): Response {
  return new Response(JSON.stringify(govde), { status: durum, headers: { 'Content-Type': 'application/json' } });
}
function esitMi(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let f = 0;
  for (let i = 0; i < a.length; i++) f |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return f === 0;
}

export class KotaBitti extends Error {}
export class AnahtarHatasi extends Error {}   // anahtar geçersiz / API kapalı: tüm çağrı durur, eser işaretlenmez

function rest(ortam: Ortam, f: typeof fetch) {
  const servis = ortam('SUPABASE_SERVICE_ROLE_KEY') || '';
  const H = { apikey: servis, Authorization: 'Bearer ' + servis, 'Content-Type': 'application/json' };
  return {
    rpc: async (ad: string, govde: unknown) => {
      const r = await f(ortam('SUPABASE_URL') + '/rest/v1/rpc/' + ad, { method: 'POST', headers: H, body: JSON.stringify(govde) });
      if (!r.ok) throw new Error('rpc ' + ad + ' ' + r.status + ': ' + (await r.text()).slice(0, 200));
      const t = await r.text();
      return t ? JSON.parse(t) : null;
    },
    get: async (yol: string) => {
      const r = await f(ortam('SUPABASE_URL') + '/rest/v1/' + yol, { headers: H });
      if (!r.ok) return null;
      return r.json();
    },
  };
}

async function yetkili(istek: Request, ortam: Ortam, f: typeof fetch): Promise<boolean> {
  const servis = ortam('SUPABASE_SERVICE_ROLE_KEY') || '';
  const yetki = istek.headers.get('Authorization') || '';
  if (servis && esitMi(yetki, 'Bearer ' + servis)) return true;
  const db = rest(ortam, f);
  const jeton = istek.headers.get('x-tara-jeton') || '';
  if (jeton && /^[0-9a-f]{64}$/.test(jeton)) {
    try { if (await db.rpc('video_tara_jeton_dogru', { j: jeton }) === true) return true; } catch { /* düş */ }
  }
  if (!/^Bearer\s+\S+/.test(yetki)) return false;
  const kr = await f(ortam('SUPABASE_URL') + '/auth/v1/user', { headers: { apikey: ortam('SUPABASE_ANON_KEY') || '', Authorization: yetki } });
  if (!kr.ok) return false;
  const uid = String((await kr.json()).id || '');
  if (!/^[0-9a-f-]{36}$/i.test(uid)) return false;
  const p = await db.get('profiles?select=role&id=eq.' + uid);
  return !!(p && p[0] && p[0].role === 'admin');
}

async function yt(ortam: Ortam, f: typeof fetch, yol: string, params: Record<string, string>): Promise<any> {
  const u = new URL('https://www.googleapis.com/youtube/v3/' + yol);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  u.searchParams.set('key', ortam('YOUTUBE_API_KEY') || '');
  const r = await f(u.toString());
  if (r.status === 403 || r.status === 429) {
    const t = await r.text();
    if (/quota|rateLimit/i.test(t)) throw new KotaBitti('kota');
    throw new AnahtarHatasi('youtube ' + r.status + ': ' + t.slice(0, 200));
  }
  if (r.status === 400) {
    const t = await r.text();
    if (/API key|API_KEY|keyInvalid/i.test(t)) throw new AnahtarHatasi('youtube 400: ' + t.slice(0, 200));
    throw new Error('youtube 400: ' + t.slice(0, 200));
  }
  if (!r.ok) throw new Error('youtube ' + r.status + ': ' + (await r.text()).slice(0, 200));
  return r.json();
}

export async function isle(istek: Request, ortam: Ortam, f: typeof fetch = fetch, simdi: () => number = Date.now): Promise<Response> {
  if (istek.method !== 'POST') return yanit(405, { hata: 'yalniz-post' });
  if (!ortam('SUPABASE_URL') || !ortam('SUPABASE_SERVICE_ROLE_KEY') || !ortam('YOUTUBE_API_KEY')) return yanit(503, { hata: 'yapilandirma-eksik' });
  if (!(await yetkili(istek, ortam, f))) return yanit(403, { hata: 'yetki-yok' });

  let o: Record<string, unknown> = {};
  try { o = await istek.json(); } catch { /* boş gövde: varsayılanlar */ }
  const adet = Math.max(1, Math.min(ADET_EN_COK, Number(o.adet) || ADET_VARSAYILAN));
  const kuru = o.kuru === true;   // yalnız ara ve döndür, hiçbir şey yazma (deneme)
  const db = rest(ortam, f);
  const basla = simdi();

  let harcanan = Number(await db.rpc('video_tara_kota_ekle', { n: 0 })) || 0;
  if (harcanan + ESER_MALIYETI > GUNLUK_SINIR) return yanit(200, { durum: 'kota-doldu', harcanan });

  const sinir = Math.min(adet, Math.floor((GUNLUK_SINIR - harcanan) / ESER_MALIYETI));
  const eserler: Eser[] = Array.isArray(o.work_ids) && o.work_ids.length
    ? (await db.get('works?select=id,name,seslendiren,composer,source_person,lyric_writer,tur&id=in.(' +
        (o.work_ids as unknown[]).map(Number).filter(Number.isFinite).slice(0, ADET_EN_COK).join(',') + ')')) || []
    : await db.rpc('video_tara_sec', { n: sinir });

  const sonuc = { durum: 'tamam', islenen: 0, baglanan: 0, aday: 0, bos: 0, hata: 0, harcanan, ornek: [] as unknown[] };
  for (const w of (eserler || []).slice(0, sinir)) {
    if (simdi() - basla > SURE_SINIRI_MS) { sonuc.durum = 'sure-doldu'; break; }
    try {
      const s = await yt(ortam, f, 'search', aramaParametreleri(w));
      const ids = (s.items || []).map((x: any) => x.id && x.id.videoId).filter(Boolean);
      let v: any = { items: [] };
      if (ids.length) v = await yt(ortam, f, 'videos', { part: 'snippet,contentDetails,statistics,status', id: ids.join(',') });
      harcanan = Number(await db.rpc('video_tara_kota_ekle', { n: ids.length ? 101 : 100 })) || harcanan;
      const { adaylar, guclu } = adaylariSec(v.items || [], w);
      const durum = guclu ? 'baglandi' : adaylar.length ? 'aday' : 'bos';
      if (!kuru) await db.rpc('video_tara_yaz', { wid: w.id, adaylar, secilen: guclu, durum, sorgu: aramaParametreleri(w).q });
      sonuc.islenen++;
      if (durum === 'baglandi') sonuc.baglanan++; else if (durum === 'aday') sonuc.aday++; else sonuc.bos++;
      if (sonuc.ornek.length < 40) sonuc.ornek.push({ id: w.id, ad: w.name, ses: w.seslendiren || null, durum, ilk: adaylar[0] ? adaylar[0].title + ' · ' + adaylar[0].channel : null });
    } catch (e) {
      if (e instanceof KotaBitti) {
        sonuc.durum = 'kota-doldu';
        harcanan = Number(await db.rpc('video_tara_kota_ekle', { n: Math.max(0, GUNLUK_SINIR - harcanan) })) || GUNLUK_SINIR;
        break;
      }
      if (e instanceof AnahtarHatasi) { sonuc.durum = 'anahtar-hatasi'; sonuc.ornek.push({ hata: (e as Error).message }); break; }
      sonuc.hata++;
      // Esere özgü hata: 7 gün sonra yeniden denenir (video_tara_sec); yoksa aynı eser her çağrıda sırayı tıkar.
      if (!kuru) { try { await db.rpc('video_tara_yaz', { wid: w.id, adaylar: [], secilen: null, durum: 'hata', sorgu: aramaParametreleri(w).q }); } catch { /* yok say */ } }
      if (sonuc.ornek.length < 40) sonuc.ornek.push({ id: w.id, ad: w.name, hata: String((e as Error).message || e).slice(0, 160) });
    }
  }
  sonuc.harcanan = harcanan;
  return yanit(200, sonuc);
}

if (typeof Deno !== 'undefined' && Deno.serve) {
  Deno.serve((istek: Request) => isle(istek, (k) => Deno.env.get(k)));
}
