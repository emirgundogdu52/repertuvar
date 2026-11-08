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
// (2026-10-25) TEK ÖDEME "1 yıl Pro" (Paddle tek seferlik ürün — iDEAL | Wero için; abonelikte iDEAL yok). RevenueCat bu
// alımları `non_subscriptions` altında verir ve SÜRE BİÇMEZ; ürün Pro yetkisine BAĞLANMAZ (bağlansa ömür boyu açık kalırdı).
// Süre burada hesaplanır (tekYilSatiri): alımlar sırayla eklenir, hiç Pro kaydı olmayan kişinin İLK alımı 13 ay.
//
// Supabase Secrets: RC_SECRET_API_KEY (RevenueCat v1 gizli anahtar, sk_…), RC_WEBHOOK_SECRET,
// TEK_YIL_URUNLER (virgüllü RevenueCat ürün kimlikleri — Paddle tek ödeme fiyat kimlikleri, sandbox + canlı).
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

// ── Tek ödeme "1 yıl Pro" ─────────────────────────────────────────────────
// Ürün kimliği ortam listesinde (TEK_YIL_URUNLER) ya da adı "…tek_yil / …1y_once / …yearly_once" ile bitiyorsa.
export function tekYilMi(urun: string, liste: string): boolean {
  const u = (urun || '').trim().toLowerCase();
  if (!u) return false;
  if ((liste || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean).includes(u)) return true;
  return /(^|[.:_-])(tek[-_]?yil|1y[-_]?once|yearly[-_]?once)$/.test(u);
}

// UTC'de ay ekler; ayın günü yoksa ayın son günü (31 Ocak + 1 ay = 28/29 Şubat).
export function ayEkle(ms: number, ay: number): number {
  const d = new Date(ms);
  const hedefAy = d.getUTCMonth() + ay;
  const yil = d.getUTCFullYear() + Math.floor(hedefAy / 12), a = ((hedefAy % 12) + 12) % 12;
  const sonGun = new Date(Date.UTC(yil, a + 1, 0)).getUTCDate();
  return Date.UTC(yil, a, Math.min(d.getUTCDate(), sonGun), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());
}

// İade olayları (abonelik_olaylari): tek seferlik alım iade edilince RevenueCat CANCELLATION (cancel_reason
// CUSTOMER_SUPPORT) gönderir; alım non_subscriptions'ta kalabilir. REFUND_REVERSED iadeyi geri alır. Olay sırasıyla işlenir.
export function iadeEdilenler(olaylar: Record<string, any>[]): Set<string> {
  const set = new Set<string>();
  [...(olaylar || [])].sort((a, b) => Number(a.event_timestamp_ms || 0) - Number(b.event_timestamp_ms || 0)).forEach((o) => {
    const kim = String(o.transaction_id || o.original_transaction_id || '');
    if (!kim) return;
    if (o.type === 'CANCELLATION' && (o.cancel_reason === 'CUSTOMER_SUPPORT' || o.cancel_reason === 'REFUND')) set.add(kim);
    if (o.type === 'REFUND_REVERSED') set.delete(kim);
  });
  return set;
}

// RevenueCat `non_subscriptions[urun]` alımları → tek abonelikler satırı.
// oncekiPro: bu alımlardan ÖNCE başlamış başka bir Pro kaydının (abonelik, deneme, hediye) en erken başlangıcı (ms) ya da null.
// Kural (kullanıcı 2026-10-25): ilk alım, daha önce hiç Pro'su olmayan kişide 13 ay (abonelikteki 1 ay ücretsiz karşılığı),
// sonrakiler 12 ay; süre bitmeden alınan yıl kalan sürenin sonuna eklenir. İade edilen alım sayılmaz.
export function tekYilSatiri(uid: string, urun: string, alimlar: Record<string, any>[], oncekiPro: number | null, simdi = Date.now()) {
  const gecerli = (alimlar || [])
    .filter((a) => a && !a.refunded_at && !isNaN(t(a.purchase_date)))
    .sort((x, y) => t(x.purchase_date) - t(y.purchase_date));
  if (!gecerli.length) return null;
  const kaynak = kaynakOf(gecerli[0].store);
  if (!kaynak) return null;
  const ilk = t(gecerli[0].purchase_date);
  const ilk13 = !(oncekiPro != null && oncekiPro < ilk);
  let bitis = 0;
  gecerli.forEach((a, i) => {
    const bas = Math.max(t(a.purchase_date), bitis);
    bitis = ayEkle(bas, i === 0 && ilk13 ? 13 : 12);
  });
  return {
    user_id: uid,
    kaynak,
    plan: 'pro',
    urun_id: urun,
    donem: 'P1Y',
    durum: bitis > simdi ? 'aktif' : 'suresi_doldu',
    deneme: false,
    otomatik_yenileme: false,
    baslangic: new Date(ilk).toISOString(),
    bitis: new Date(bitis).toISOString(),
    ortam: gecerli.some((a) => a.is_sandbox) ? 'sandbox' : 'production',
    dis_kimlik: 'rc:' + uid + ':' + urun,
    ham: { tek_odeme: true, ilk_13_ay: ilk13, alimlar: gecerli },
    guncellendi: new Date(simdi).toISOString(),
  };
}

// RevenueCat v1 `subscriber.subscriptions[urun]` → abonelikler satırı
export function satirOf(uid: string, urun: string, a: Record<string, any>, simdi = Date.now()) {
  // Play: v1 anahtarı yalnız abonelik kimliği olabilir ("repertuvar_pro"), temel plan ayrı alanda gelir
  if (!urun.includes(':') && a.product_plan_identifier) urun = urun + ':' + a.product_plan_identifier;
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

// Plan değişikliği (aylık → yıllık vb.): mağaza yeni planı eski dönem bitmeden yeniler (Apple sandbox'ta
// ~40 sn, gerçekte 24 saate kadar önce). O anda eski satır hâlâ "aktif" görünür ve bir daha olay gelmezse
// öyle kalır (2026-10-17 cihaz testi). Aynı kaynakta, eski satırın bitişine 25 saat kala ya da sonra
// satın alınmış başka bir Pro satır varsa eski satır devredilmiş sayılır ve kapatılır.
const DEVIR_PAYI = 25 * 3600 * 1000;
export function devredilenleriKapat(satirlar: Record<string, any>[]): Record<string, any>[] {
  const alim = (s: Record<string, any>) => t(s.ham && s.ham.purchase_date);
  return satirlar.map((a) => {
    if (!PRO_DURUMLARI.includes(a.durum)) return a;
    const aBitis = t(a.bitis), aAlim = alim(a);
    const halef = satirlar.some((b) => b !== a && b.kaynak === a.kaynak && b.urun_id !== a.urun_id
      && PRO_DURUMLARI.includes(b.durum) && alim(b) > aAlim && alim(b) >= aBitis - DEVIR_PAYI);
    return halef ? { ...a, durum: 'suresi_doldu', otomatik_yenileme: false } : a;
  });
}

// (2026-10-20) WEB SANDBOX KORUMASI: Paddle sandbox'ında test kartı herkese açık. Mağaza sandbox'ı (Apple inceleme,
// K7) Pro verir; web sandbox'ı YALNIZ izinli test hesaplarında (ortam değişkeni WEB_SANDBOX_IZINLI: virgüllü uid listesi).
// Elenen satır yazılmaz; daha önce yazılmışsa kapat() onu sona erdirir.
export function webSandboxEle(satirlar: Record<string, any>[], izinli: string): Record<string, any>[] {
  const liste = new Set((izinli || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean));
  return satirlar.filter((s) => !(s.kaynak === 'web' && s.ortam === 'sandbox' && !liste.has(String(s.user_id).toLowerCase())));
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
    // Tek ödeme dışındaki Pro kayıtlarının (abonelik / deneme / hediye) en erken başlangıcı — 13 ay hakkı için
    async oncekiProlar(uid: string): Promise<{ dis_kimlik: string, an: number }[]> {
      const r = await f(url + '/rest/v1/abonelikler?user_id=eq.' + uid + '&select=dis_kimlik,baslangic,olusturuldu', { headers: h });
      if (!r.ok) throw new Error('oncekiPro ' + r.status);
      const satirlar = await r.json();
      return (Array.isArray(satirlar) ? satirlar : []).map((s: Record<string, any>) => {
        const b = t(s.baslangic), o = t(s.olusturuldu);
        return { dis_kimlik: String(s.dis_kimlik || ''), an: !isNaN(b) ? b : o };
      }).filter((x) => !isNaN(x.an));
    },
    async olaylar(uid: string): Promise<Record<string, any>[]> {
      const r = await f(url + '/rest/v1/abonelik_olaylari?user_id=eq.' + uid + '&tur=in.(CANCELLATION,REFUND_REVERSED)&select=govde', { headers: h });
      if (!r.ok) throw new Error('olaylar ' + r.status);
      const s = await r.json();
      return (Array.isArray(s) ? s : []).map((x: Record<string, any>) => x.govde || {});
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
  const aboneSatirlari = devredilenleriKapat(Object.entries(abonelikler)
    .map(([urun, a]) => satirOf(uid, urun, a as Record<string, any>))
    .filter(Boolean) as Record<string, any>[]);
  const db = sb(ortam, f);
  // Tek ödeme "1 yıl Pro" alımları (RevenueCat non_subscriptions)
  const tekListe = ortam('TEK_YIL_URUNLER') || '';
  const tekler = Object.entries((veri && veri.subscriber && veri.subscriber.non_subscriptions) || {})
    .filter(([urun]) => tekYilMi(urun, tekListe));
  const tekSatirlari: Record<string, any>[] = [];
  if (tekler.length) {
    const tekKimlikler = new Set(tekler.map(([urun]) => 'rc:' + uid + ':' + urun));
    // Önceki Pro: RevenueCat abonelik başlangıçları + bizim tablodaki diğer kayıtlar (hediye dahil)
    const anlar = aboneSatirlari.map((s) => t(s.baslangic)).filter((x) => !isNaN(x));
    (await db.oncekiProlar(uid)).forEach((x) => { if (!tekKimlikler.has(x.dis_kimlik)) anlar.push(x.an); });
    const oncekiPro = anlar.length ? Math.min(...anlar) : null;
    const iade = iadeEdilenler(await db.olaylar(uid));
    tekler.forEach(([urun, alimlar]) => {
      const isaretli = (alimlar as Record<string, any>[]).map((a) =>
        (iade.has(String(a.store_transaction_id || '')) || iade.has(String(a.id || ''))) ? { ...a, refunded_at: a.refunded_at || 'iade' } : a);
      const s = tekYilSatiri(uid, urun, isaretli, oncekiPro);
      if (s) tekSatirlari.push(s);
    });
  }
  const satirlar = webSandboxEle([...aboneSatirlari, ...tekSatirlari], ortam('WEB_SANDBOX_IZINLI') || '');
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
