// (2026-10-17) Repertuvar Pro — abonelik eşitleme (RevenueCat → Supabase `abonelikler`)
//
// İki giriş yolu, tek fonksiyon (Supabase'de "Verify JWT" KAPALI; kimlik burada denetlenir):
//   A) RevenueCat webhook'u  → POST ?kaynak=rc, başlık `Authorization: Bearer <RC_WEBHOOK_SECRET>`
//      Olay günlüğe yazılır (abonelik_olaylari, aynı olay iki kez yazılmaz), olaydaki her
//      kullanıcı kimliği için RevenueCat'ten abone durumu YENİDEN okunur ve satırlar baştan
//      hesaplanır. Olay türüne göre ayrı mantık yok: sırasız/tekrarlı olaylara dayanıklı.
//   B) Uygulama (kullanıcının kendi oturumu) → POST, gövde {islem:'esitle'|'sil'}
//      'esitle': satın alma / geri yüklemeden hemen sonra — webhook gecikse de Pro anında açılır.
//      'sil'   : hesap silinmeden önce RevenueCat'teki müşteri kaydı silinir (Gizlilik §6–7).
//
// Pro kararı DAİMA bizim tablomuzda (plan_of): RevenueCat yalnız besleyici; değiştirilirse
// yalnız bu dosya değişir.
//
// Supabase Secrets: RC_SECRET_API_KEY (RevenueCat v1 gizli anahtar, sk_…), RC_WEBHOOK_SECRET.
// SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY ortamda kendiliğinden gelir.
// Dış kütüphane yok — aynı dosya Node'da test edilir (test.mjs).

declare const Deno: any;

const RC = 'https://api.revenuecat.com/v1';
const IZINLI_KOKENLER = [
  'https://app.repertuvar.app',
  'https://repertuvar.app',
  'capacitor://localhost',
  'https://localhost',
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRO_DURUMLARI = ['deneme', 'aktif', 'iptal_edildi', 'odeme_sorunu'];

type Ortam = (anahtar: string) => string | undefined;

// ── Saf yardımcılar (test edilir) ─────────────────────────────────────────

export function kaynakOf(store: string | undefined): 'ios' | 'android' | 'web' | null {
  if (store === 'app_store' || store === 'mac_app_store') return 'ios';
  if (store === 'play_store') return 'android';
  if (store === 'stripe' || store === 'paddle' || store === 'rc_billing') return 'web';
  return null;   // promotional (RevenueCat'te elle verilen) vb. — hediye bizim tablomuzda tutulur
}

export function donemOf(urun: string): 'P1M' | 'P6M' | 'P1Y' | null {
  const u = (urun || '').toLowerCase();
  if (/(^|[.:_-])(yearly|annual|yillik)$/.test(u)) return 'P1Y';
  if (/(6months|six-months|six_months|altiaylik|alti-aylik)$/.test(u)) return 'P6M';
  if (/(^|[.:_-])(monthly|aylik)$/.test(u)) return 'P1M';
  return null;
}

const t = (s: string | null | undefined) => (s ? Date.parse(s) : NaN);

// RevenueCat v1 `subscriber.subscriptions[urun]` → abonelikler satırı
export function satirOf(uid: string, urun: string, a: Record<string, any>, simdi = Date.now()) {
  const kaynak = kaynakOf(a.store);
  if (!kaynak) return null;
  const bitis = t(a.expires_date), ek = t(a.grace_period_expires_date), iade = t(a.refunded_at);
  let durum: string;
  let sonAn = Math.max(isNaN(bitis) ? 0 : bitis, isNaN(ek) ? 0 : ek);
  if (!isNaN(iade)) { durum = 'iade'; sonAn = iade; }
  else if (sonAn > simdi) {
    if (a.billing_issues_detected_at && !isNaN(bitis) && bitis <= simdi) durum = 'odeme_sorunu';
    else if (a.unsubscribe_detected_at) durum = 'iptal_edildi';
    else if (a.period_type === 'trial') durum = 'deneme';
    else durum = 'aktif';
  } else {
    durum = a.billing_issues_detected_at ? 'askida' : 'suresi_doldu';
  }
  return {
    user_id: uid,
    kaynak,
    plan: 'pro',
    urun_id: urun,
    donem: donemOf(urun),
    durum,
    deneme: a.period_type === 'trial',
    otomatik_yenileme: !a.unsubscribe_detected_at && !a.refunded_at,
    baslangic: a.original_purchase_date || a.purchase_date || null,
    bitis: sonAn ? new Date(sonAn).toISOString() : null,
    ortam: a.is_sandbox ? 'sandbox' : 'production',
    dis_kimlik: 'rc:' + uid + ':' + urun,
    ham: a,
    guncellendi: new Date(simdi).toISOString(),
  };
}

// Webhook olayından etkilenen (bizim, UUID biçimli) kullanıcı kimlikleri
export function etkilenenler(olay: Record<string, any>): string[] {
  const hepsi = [olay.app_user_id, olay.original_app_user_id,
    ...(olay.aliases || []), ...(olay.transferred_from || []), ...(olay.transferred_to || [])];
  return [...new Set(hepsi.filter((x) => typeof x === 'string' && UUID.test(x)).map((x) => x.toLowerCase()))];
}

function esitMi(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let fark = 0;
  for (let i = 0; i < a.length; i++) fark |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return fark === 0;
}

// ── Supabase / RevenueCat erişimi ─────────────────────────────────────────

function sb(ortam: Ortam, f: typeof fetch) {
  const url = ortam('SUPABASE_URL')!, anahtar = ortam('SUPABASE_SERVICE_ROLE_KEY')!;
  const h = { apikey: anahtar, Authorization: 'Bearer ' + anahtar, 'Content-Type': 'application/json' };
  return {
    async upsert(satirlar: unknown[]) {
      if (!satirlar.length) return;
      const r = await f(url + '/rest/v1/abonelikler?on_conflict=kaynak,dis_kimlik', {
        method: 'POST', headers: { ...h, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(satirlar),
      });
      if (!r.ok) throw new Error('upsert ' + r.status + ' ' + (await r.text()));
    },
    // RevenueCat'te artık görünmeyen (başka hesaba taşınmış) satırları kapat
    async kapat(uid: string, kalanlar: string[]) {
      let q = url + '/rest/v1/abonelikler?user_id=eq.' + uid + '&kaynak=in.(ios,android,web)'
        + '&durum=in.(' + PRO_DURUMLARI.join(',') + ')';
      if (kalanlar.length) q += '&dis_kimlik=not.in.(' + kalanlar.map((k) => '"' + k + '"').join(',') + ')';
      const r = await f(q, {
        method: 'PATCH', headers: { ...h, Prefer: 'return=minimal' },
        body: JSON.stringify({ durum: 'suresi_doldu', bitis: new Date().toISOString(), guncellendi: new Date().toISOString() }),
      });
      if (!r.ok) throw new Error('kapat ' + r.status);
    },
    async olayYaz(olay: Record<string, any>) {
      await f(url + '/rest/v1/abonelik_olaylari?on_conflict=id', {
        method: 'POST', headers: { ...h, Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify({ id: 'rc:' + olay.id, kaynak: 'revenuecat', tur: olay.type || null,
          user_id: etkilenenler(olay)[0] || null, govde: olay }),
      });
    },
  };
}

export async function yenidenHesapla(uid: string, ortam: Ortam, f: typeof fetch = fetch): Promise<number> {
  const r = await f(RC + '/subscribers/' + encodeURIComponent(uid), {
    headers: { Authorization: 'Bearer ' + ortam('RC_SECRET_API_KEY'), 'Content-Type': 'application/json' },
  });
  if (!r.ok) throw new Error('revenuecat ' + r.status);
  const veri = await r.json();
  const abonelikler = (veri && veri.subscriber && veri.subscriber.subscriptions) || {};
  const satirlar = Object.entries(abonelikler)
    .map(([urun, a]) => satirOf(uid, urun, a as Record<string, any>))
    .filter(Boolean) as Record<string, any>[];
  const db = sb(ortam, f);
  await db.upsert(satirlar);
  await db.kapat(uid, satirlar.map((s) => s.dis_kimlik));
  return satirlar.length;
}

// ── HTTP ──────────────────────────────────────────────────────────────────

function cors(koken: string | null): Record<string, string> {
  const b: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  if (koken && IZINLI_KOKENLER.includes(koken)) b['Access-Control-Allow-Origin'] = koken;
  return b;
}
function yanit(durum: number, govde: unknown, koken: string | null = null): Response {
  return new Response(JSON.stringify(govde), { status: durum, headers: { ...cors(koken), 'Content-Type': 'application/json' } });
}

export async function isle(istek: Request, ortam: Ortam, f: typeof fetch = fetch): Promise<Response> {
  const koken = istek.headers.get('Origin');
  if (istek.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(koken) });
  if (istek.method !== 'POST') return yanit(405, { hata: 'yalniz-post' }, koken);
  if (!ortam('SUPABASE_URL') || !ortam('SUPABASE_SERVICE_ROLE_KEY') || !ortam('RC_SECRET_API_KEY')) {
    return yanit(503, { hata: 'yapilandirma-eksik' }, koken);
  }
  const yetki = istek.headers.get('Authorization') || '';
  const url = new URL(istek.url);

  // A) RevenueCat webhook'u
  if (url.searchParams.get('kaynak') === 'rc') {
    const sir = ortam('RC_WEBHOOK_SECRET');
    if (!sir || !esitMi(yetki, 'Bearer ' + sir)) return yanit(401, { hata: 'yetkisiz' });
    let govde: Record<string, any>;
    try { govde = await istek.json(); } catch { return yanit(400, { hata: 'gecersiz-govde' }); }
    const olay = (govde && govde.event) || {};
    if (!olay.id) return yanit(400, { hata: 'olay-yok' });
    try {
      await sb(ortam, f).olayYaz(olay);
      if (olay.type === 'TEST') return yanit(200, { ok: true, test: true });
      for (const uid of etkilenenler(olay)) await yenidenHesapla(uid, ortam, f);
      return yanit(200, { ok: true });
    } catch (e) {
      // 500 → RevenueCat 5, 10, 20, 40, 80 dk sonra yeniden dener
      return yanit(500, { hata: String((e as Error).message || e) });
    }
  }

  // B) Uygulamanın kendi çağrısı (kullanıcı oturumu)
  if (!/^Bearer\s+\S+/.test(yetki)) return yanit(401, { hata: 'oturum-yok' }, koken);
  const anon = ortam('SUPABASE_ANON_KEY') || '';
  const kr = await f(ortam('SUPABASE_URL') + '/auth/v1/user', { headers: { apikey: anon, Authorization: yetki } });
  if (!kr.ok) return yanit(401, { hata: 'oturum-gecersiz' }, koken);
  const kullanici = await kr.json();
  const uid = String(kullanici.id || '').toLowerCase();
  if (!UUID.test(uid)) return yanit(401, { hata: 'oturum-gecersiz' }, koken);

  let govde: { islem?: string } = {};
  try { govde = await istek.json(); } catch { /* boş gövde = esitle */ }
  try {
    if (govde.islem === 'sil') {
      const r = await f(RC + '/subscribers/' + encodeURIComponent(uid), {
        method: 'DELETE', headers: { Authorization: 'Bearer ' + ortam('RC_SECRET_API_KEY') },
      });
      // 404 = RevenueCat'te hiç kaydı yok — silinecek bir şey yok, başarı sayılır
      return yanit(r.ok || r.status === 404 ? 200 : 502, { silindi: r.ok || r.status === 404 }, koken);
    }
    const adet = await yenidenHesapla(uid, ortam, f);
    return yanit(200, { ok: true, adet }, koken);
  } catch (e) {
    return yanit(502, { hata: String((e as Error).message || e) }, koken);
  }
}

if (typeof Deno !== 'undefined' && Deno.serve) {
  Deno.serve((istek: Request) => isle(istek, (k) => Deno.env.get(k)));
}
