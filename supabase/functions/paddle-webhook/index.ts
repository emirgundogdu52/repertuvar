// (2026-11-08) Paddle webhook → Grup/Koro ve Edu koltuk lisansı (`grup_lisanslari`).
//
// Bireysel Pro Paddle'dan RevenueCat üzerinden gelir (`abonelik` fonksiyonu); bu fonksiyon YALNIZ ürünü
// custom_data.tur = 'grup' | 'kurum' olan abonelikleri işler, gerisini yok sayar (200).
//
// Güvenlik: "Verify JWT" KAPALI; her istek `Paddle-Signature` (ts=…;h1=…) ile doğrulanır:
//   h1 = HMAC-SHA256(gizli, ts + ':' + ham gövde). Canlı için PADDLE_WEBHOOK_SECRET, sandbox için
//   PADDLE_SANDBOX_WEBHOOK_SECRET. Hangisi tutarsa ortam odur. Sır yoksa ya da imza tutmazsa 401.
//   Sandbox satırı yalnız WEB_SANDBOX_IZINLI (virgüllü uid) listesindeki alıcı için yazılır (abonelik ile aynı kural).
//
// Checkout customData: { group_id, user_id } (gruplar.html). Olaylar: subscription.created / updated /
// activated / canceled / past_due / paused / resumed / trialing. Sıra dışı gelen eski olay SQL'de elenir.
// Edu yalnız Emir'in onayladığı grupta yazılır; onaysızsa yazılmaz, olay günlüğüne 'edu-onaysiz' düşer.
//
// SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY ortamda kendiliğinden gelir. Dış kütüphane yok (test.mjs Node'da çalıştırır).

declare const Deno: any;

type Ortam = (anahtar: string) => string | undefined;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMZA_PAYI_SN = 5 * 60;   // Paddle'ın önerdiği tekrar oynatma payı

// ── Saf yardımcılar (test edilir) ─────────────────────────────────────────

function hex(b: ArrayBuffer): string {
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
function esitMi(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let f = 0;
  for (let i = 0; i < a.length; i++) f |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return f === 0;
}

export async function imzaGecerli(baslik: string | null, govde: string, gizli: string | undefined,
                                  simdiSn = Math.floor(Date.now() / 1000)): Promise<boolean> {
  if (!baslik || !gizli) return false;
  const p: Record<string, string[]> = {};
  for (const parca of baslik.split(';')) {
    const [k, v] = parca.split('=');
    if (k && v) (p[k.trim()] ||= []).push(v.trim());
  }
  const ts = p.ts?.[0];
  if (!ts || !/^\d+$/.test(ts) || Math.abs(simdiSn - Number(ts)) > IMZA_PAYI_SN) return false;
  const anahtar = await crypto.subtle.importKey('raw', new TextEncoder().encode(gizli),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const beklenen = hex(await crypto.subtle.sign('HMAC', anahtar, new TextEncoder().encode(ts + ':' + govde)));
  return (p.h1 || []).some((h) => esitMi(h, beklenen));
}

const DURUM: Record<string, string> = {
  active: 'aktif', trialing: 'aktif', past_due: 'odeme_sorunu', paused: 'askida', canceled: 'suresi_doldu',
};

// Canlı katalog (08.11): ürün custom_data'sı olaya gelmezse ürün kimliğinden tanınır.
const URUN_TURU: Record<string, string> = {
  pro_01m6yg8nbh68qyhqts2x3hr664: 'grup',    // Repertuvar Grup / Koro
  pro_01m6ygeksc4scecsxq0yxk2ye9: 'kurum',   // Repertuvar Edu
};
function turOf(k: any): string | null {
  const t = k?.product?.custom_data?.tur || URUN_TURU[k?.price?.product_id] || URUN_TURU[k?.product?.id];
  return t === 'grup' || t === 'kurum' ? t : null;
}

// Paddle abonelik nesnesinden lisans satırı; lisans ürünü değilse null.
export function lisansOf(abonelik: Record<string, any>) {
  const kalem = (abonelik.items || []).find((k: any) => turOf(k));
  if (!kalem) return null;
  const plan = turOf(kalem) === 'kurum' ? 'edu' : 'pro';
  const cd = abonelik.custom_data || {};
  const iptalPlanli = abonelik.scheduled_change?.action === 'cancel';
  let durum = DURUM[abonelik.status] || 'askida';
  if (durum === 'aktif' && iptalPlanli) durum = 'iptal_edildi';
  const bitis = abonelik.status === 'canceled'
    ? (abonelik.canceled_at || abonelik.current_billing_period?.ends_at || null)
    : (abonelik.current_billing_period?.ends_at || null);
  return {
    dis_kimlik: String(abonelik.id || ''),
    group_id: UUID.test(cd.group_id || '') ? cd.group_id : null,
    user_id: UUID.test(cd.user_id || '') ? cd.user_id : null,
    plan,
    koltuk: Math.max(0, Number(kalem.quantity) || 0),
    durum,
    baslangic: abonelik.started_at || abonelik.first_billed_at || null,
    bitis,
  };
}

// ── Giriş noktası ─────────────────────────────────────────────────────────

function yanit(durum: number, govde: unknown): Response {
  return new Response(JSON.stringify(govde), { status: durum, headers: { 'Content-Type': 'application/json' } });
}

export async function isle(istek: Request, ortam: Ortam, f: typeof fetch = fetch): Promise<Response> {
  if (istek.method !== 'POST') return yanit(405, { hata: 'yontem' });
  const ham = await istek.text();
  const imza = istek.headers.get('Paddle-Signature');
  let ortamAdi: 'production' | 'sandbox' | null = null;
  if (await imzaGecerli(imza, ham, ortam('PADDLE_WEBHOOK_SECRET'))) ortamAdi = 'production';
  else if (await imzaGecerli(imza, ham, ortam('PADDLE_SANDBOX_WEBHOOK_SECRET'))) ortamAdi = 'sandbox';
  if (!ortamAdi) return yanit(401, { hata: 'imza' });

  let olay: Record<string, any>;
  try { olay = JSON.parse(ham); } catch { return yanit(400, { hata: 'json' }); }
  const tur = String(olay.event_type || '');
  if (!tur.startsWith('subscription.')) return yanit(200, { yok_sayildi: tur });
  const l = lisansOf(olay.data || {});
  if (!l) return yanit(200, { yok_sayildi: 'lisans-urunu-degil' });

  const url = ortam('SUPABASE_URL')!, anahtar = ortam('SUPABASE_SERVICE_ROLE_KEY')!;
  const h = { apikey: anahtar, Authorization: 'Bearer ' + anahtar, 'Content-Type': 'application/json' };
  const gunluk = (sonuc: string) => f(url + '/rest/v1/abonelik_olaylari?on_conflict=id', {
    method: 'POST', headers: { ...h, Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({ id: 'paddle:' + (olay.event_id || olay.notification_id), kaynak: 'paddle',
      tur: tur + '/' + sonuc, user_id: l.user_id, govde: olay }),
  }).catch(() => null);

  if (!l.dis_kimlik || !l.group_id || !l.user_id || l.koltuk < 1) {
    await gunluk('eksik-veri');
    console.error('[paddle-webhook] eksik veri', l);
    return yanit(200, { sonuc: 'eksik-veri' });   // tekrar denemek düzeltmez; günlükte kalır
  }
  if (ortamAdi === 'sandbox') {
    const izinli = (ortam('WEB_SANDBOX_IZINLI') || '').split(',').map((s) => s.trim());
    if (!izinli.includes(l.user_id)) { await gunluk('sandbox-izinsiz'); return yanit(200, { sonuc: 'sandbox-izinsiz' }); }
  }

  const r = await f(url + '/rest/v1/rpc/grup_lisans_yaz', {
    method: 'POST', headers: h,
    body: JSON.stringify({
      p_dis_kimlik: l.dis_kimlik, p_group_id: l.group_id, p_user_id: l.user_id, p_plan: l.plan,
      p_koltuk: l.koltuk, p_durum: l.durum, p_baslangic: l.baslangic, p_bitis: l.bitis,
      p_ortam: ortamAdi, p_olay: olay.occurred_at || null, p_ham: olay.data,
    }),
  });
  if (!r.ok) return yanit(502, { hata: 'yaz ' + r.status });   // Paddle yeniden dener
  const sonuc = String(await r.json());
  await gunluk(sonuc);
  if (sonuc !== 'yazildi' && sonuc !== 'eski-olay') console.error('[paddle-webhook]', sonuc, l);
  return yanit(200, { sonuc });
}

if (typeof Deno !== 'undefined' && Deno.serve) {
  Deno.serve((istek: Request) => isle(istek, (k) => Deno.env.get(k)));
}
