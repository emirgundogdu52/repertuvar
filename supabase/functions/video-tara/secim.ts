// (2026-11-04) video-tara — saf kısım: sorgu kurma, aday puanlama, "güçlü eşleşme" kararı.
// arac/video-adaylari.html'deki (2026-08-20) puanlamanın sunucu karşılığı + SESLENDİREN eşleşmesi.
// Deno'da index.ts içe aktarır; test.mjs Node'da doğrudan sınar.

export const ADAY_SAYISI = 3;
export const MIN_SANIYE = 90;     // altı Shorts / fragman
export const MAKS_SANIYE = 1800;  // üstü konser / karışık kayıt

const KANAL_ONCELIK: [RegExp, number][] = [
  [/\bTRT\b/i, 3.0], [/arşiv|arsiv|archive/i, 2.0], [/konservatuvar|üniversite/i, 1.5], [/- ?topic$/i, 1.4], [/vevo$/i, 1.4],
];
// Başlıkta bunlar varsa kayıt asıl kayıt değildir: puanı düşer, ASLA otomatik seçilmez.
const OLUMSUZ = /\b(cover|karaoke|enstrumantal|enstrumental|instrumental|altyapi|alt yapi|remix|slowed|sped up|speed up|reverb|8d|nightcore|mashup|tepki|reaction|ders|dersi|nasil calinir|tutorial|lesson|piano|piyano|gitar|guitar|keman|violin|ney|baglama|saz|bateri|drum|bass|nota|tab|akor|chords|parodi|parody|trailer|fragman|teaser|kesit)\b/;

export type Eser = {
  id: number; name: string; seslendiren?: string | null; composer?: string | null;
  source_person?: string | null; lyric_writer?: string | null; tur?: string | null;
};
export type Aday = {
  video_id: string; title: string; channel: string; published_at: string | null;
  view_count: number; duration_seconds: number; score: number; sira: number;
};

export function sade(t: unknown): string {
  return String(t ?? '')
    .toLocaleLowerCase('tr')
    .replace(/[ıİ]/g, 'i').replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c')
    .replace(/[âÂ]/g, 'a').replace(/[îÎ]/g, 'i').replace(/[ûÛ]/g, 'u')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Katalogdaki ad ekleri eşleşmeyi bozar: "Kırmasın (Yasir Miy)", "Ayrılık - Yeni" → "Kırmasın", "Ayrılık"
export function sadeAd(ad: string): string {
  const k = String(ad || '').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/\s+[-–—]\s+.*$/, '').trim();
  return k || String(ad || '');
}

const BELIRSIZ = /anonim|bilinmiyor|bilinmeyen|^yok$|traditional|geleneksel|trt .*md|thm md|tsm md/i;
function gecerliKisi(x: unknown): string {
  const s = String(x ?? '').trim();
  return s && !BELIRSIZ.test(s) ? s : '';
}

export function yabanci(w: Eser): boolean {
  return /yabancı|yabanci|caz|jazz|blues|gospel|hymn|klasik batı|rock$|^pop$/i.test(String(w.tur || '')) && !/türk/i.test(String(w.tur || ''));
}

export function sorguKur(w: Eser): string {
  const kisi = gecerliKisi(w.seslendiren) || gecerliKisi(w.composer) || gecerliKisi(w.source_person) || gecerliKisi(w.lyric_writer);
  return [sadeAd(w.name), kisi].filter(Boolean).join(' ').trim();
}

// 1 = ad başlıkta aynen · 0..1 kelime oranı · 0 hiç (3 harften kısa kelimeler tek başına sayılmaz)
export function baslikUyumu(baslik: string, ad: string): number {
  const b = ' ' + sade(baslik) + ' ', a = sade(sadeAd(ad));
  if (!a || b.trim() === '') return 0;
  if (b.includes(' ' + a + ' ')) return 1;
  const kel = a.split(' ').filter((x) => x.length >= 3);
  if (!kel.length) return 0;
  return kel.filter((k) => b.includes(' ' + k + ' ')).length / kel.length;
}

// Seslendiren başlıkta ya da kanal adında geçiyor mu? (kanal: "Sıla", "SılaVEVO", "Sıla - Topic", "Sıla Official")
export function sanatciUyumu(baslik: string, kanal: string, sanatci: string): boolean {
  const s = sade(sanatci);
  if (!s) return false;
  const b = ' ' + sade(baslik) + ' ';
  if (b.includes(' ' + s + ' ')) return true;
  const k = sade(String(kanal || '').replace(/vevo$/i, '').replace(/-\s*topic$/i, '').replace(/\b(official|resmi|music|müzik|muzik|tv)\b/gi, ''));
  const bitisik = (x: string) => x.replace(/\s/g, '');
  return k === s || bitisik(k) === bitisik(s);
}

// Eser adı ve seslendiren başlıktan çıkarılıp bakılır: adında "Ney", "Saz", "Gitar" geçen eser kendini elemesin.
export function olumsuzMu(baslik: string, w?: Eser): boolean {
  let b = ' ' + sade(baslik) + ' ';
  for (const x of [w && sadeAd(w.name), w && w.seslendiren]) {
    const s = sade(x); if (s) b = b.split(' ' + s + ' ').join(' ');
  }
  return OLUMSUZ.test(b);
}

function kanalCarpani(k: string): number {
  let c = 1;
  for (const [re, x] of KANAL_ONCELIK) if (re.test(k || '')) c = Math.max(c, x);
  return c;
}

export function puan(x: { title: string; channel: string; view_count: number }, w: Eser): number {
  const u = baslikUyumu(x.title, w.name);
  const baslikC = u >= 0.999 ? 1 : (u > 0 ? 0.35 + 0.45 * u : 0.15);
  const ses = gecerliKisi(w.seslendiren);
  const sanatciC = ses ? (sanatciUyumu(x.title, x.channel, ses) ? 1.6 : 0.7) : 1;
  const olumsuzC = olumsuzMu(x.title, w) ? 0.4 : 1;
  return Math.log10((x.view_count || 0) + 10) * kanalCarpani(x.channel) * baslikC * sanatciC * olumsuzC;
}

export function sureSaniye(iso: string | undefined): number {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || '');
  if (!m) return 0;
  return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
}

// videos.list öğelerinden adayları seçer. guclu: otomatik bağlanabilecek video kimliği ya da null.
// GÜÇLÜ = 1. aday · ad başlıkta aynen · seslendiren başlıkta/kanalda · cover/karaoke/ders vb. değil ·
//         ve 2. adayla arasında belirgin fark (ya da 2. aday yok). Seslendireni olmayan eser hiçbir zaman güçlü değildir.
export function adaylariSec(ogeler: any[], w: Eser): { adaylar: Aday[]; guclu: string | null } {
  const adaylar = (ogeler || [])
    .map((it) => ({
      video_id: String(it.id || ''),
      title: String(it.snippet?.title || ''),
      channel: String(it.snippet?.channelTitle || ''),
      published_at: it.snippet?.publishedAt || null,
      view_count: Number(it.statistics?.viewCount || 0),
      duration_seconds: sureSaniye(it.contentDetails?.duration),
      embeddable: !(it.status && it.status.embeddable === false),
      herkese: !(it.status && it.status.privacyStatus && it.status.privacyStatus !== 'public'),
    }))
    .filter((x) => /^[A-Za-z0-9_-]{11}$/.test(x.video_id) && x.embeddable && x.herkese &&
      x.duration_seconds >= MIN_SANIYE && x.duration_seconds <= MAKS_SANIYE)
    .map((x) => ({ ...x, score: puan(x, w) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, ADAY_SAYISI)
    .map(({ embeddable: _e, herkese: _h, ...x }, i) => ({ ...x, score: Number(x.score.toFixed(4)), sira: i + 1 }));
  const ses = gecerliKisi(w.seslendiren);
  const ilk = adaylar[0];
  let guclu: string | null = null;
  // Çok kısa adlar ("1", "Su") başlıkta tesadüfen geçebilir: otomatik seçilmez, Emir'e gider
  if (ilk && ses && sade(sadeAd(w.name)).replace(/\s/g, '').length >= 4 && baslikUyumu(ilk.title, w.name) === 1 && sanatciUyumu(ilk.title, ilk.channel, ses) && !olumsuzMu(ilk.title, w)) {
    const ikinci = adaylar[1];
    const ikinciDeGuclu = ikinci && baslikUyumu(ikinci.title, w.name) === 1 && sanatciUyumu(ikinci.title, ikinci.channel, ses) && !olumsuzMu(ikinci.title, w);
    // İki güçlü aday varsa (ör. klip + canlı) en yüksek puanlı yine güvenle seçilebilir; asıl tehlike 2. adayın
    // FARKLI bir esere ait olması ve ondan çok yüksek puan alması — onu yukarıdaki koşullar zaten eliyor.
    guclu = ikinciDeGuclu || !ikinci || ilk.score >= ikinci.score * 1.15 ? ilk.video_id : null;
  }
  return { adaylar, guclu };
}

export function aramaParametreleri(w: Eser): Record<string, string> {
  const p: Record<string, string> = {
    part: 'snippet', q: sorguKur(w), type: 'video', maxResults: '15', videoEmbeddable: 'true', safeSearch: 'none',
  };
  if (!yabanci(w)) { p.regionCode = 'TR'; p.relevanceLanguage = 'tr'; }
  return p;
}
