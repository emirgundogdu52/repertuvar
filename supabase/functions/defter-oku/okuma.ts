// (2026-10-22) Defter sayfası okuma — saf yardımcılar (index.ts kullanır, test.mjs Node'da sınar).
// Görseldeki söz, akor ve TRT başlık bilgileri tek istekte çıkarılır; sayfa yatıksa düzeltme açısı da gelir.
// Akorlu metin uygulamanın biçiminde: satır içi ChordPro ([Am]söz, {c: Nakarat}).

// (2026-10-22) Kullanıcı kararı "3" önce Haiku 5.5 varsayılan + "Daha dikkatli oku" = Opus idi. Aynı gün TRT tarzı (söz yalnız
// notanın altında hece hece) sayfada Haiku sözcük birleştirmede hata yaptı, Opus yapmadı → kullanıcı: "Test süresince Opus'a geç;
// 100 kullanıcı 500 sayfayı geçerse Haiku'yu ya da ücretlendirmeyi yeniden değerlendiririz" (izleme: defter_okuma_kayit).
// Opus ~5 ¢/sayfa, Haiku ~0,2 ¢. Varsayılan Opus iken "Daha dikkatli oku" düğmesi görünmez.
export const MODEL = 'claude-opus-5-5';
export const DIKKATLI_MODEL = 'claude-opus-5-5';
// Sunucudan (servis anahtarıyla) karşılaştırma için açıkça seçilebilen modeller.
// Haiku 5.5'te sunucu tarafı yedek model (fallbacks) yok → o istekte gönderilmez.
export const MODELLER = ['claude-opus-5-5', 'claude-haiku-5-5'];
export const EN_BUYUK_BAYT = 6 * 1024 * 1024;          // base64 çözülmüş görsel (sayfa) üst sınırı
// Çok sayfalı eser tek istekte okunur (model sayfaları tek eser olarak birleştirir). Sınır: işlev 150 sn'de yanıt vermeli.
export const EN_COK_SAYFA = 6;
export const TURLER = ['image/jpeg', 'image/png', 'image/webp'];

export const BILGI_ALANLARI = [
  'yore', 'kaynak_kisi', 'derleyen', 'notaya_alan', 'repertuvar_no',
  'makam', 'usul', 'sure', 'ton', 'soz_yazari', 'besteci',
] as const;

const BILGILER_SEMA = {
  type: 'object',
  additionalProperties: false,
  required: [...BILGI_ALANLARI],
  properties: Object.fromEntries(BILGI_ALANLARI.map((a) => [a, { type: 'string' }])),
};
const DONUSLAR_SEMA = { type: 'array', items: { type: 'integer', enum: [0, 90, 180, 270] } };

export const SEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['baslik', 'soz', 'akorlu', 'bilgiler', 'donuslar', 'notlar'],
  properties: {
    baslik: { type: 'string' },
    soz: { type: 'string' },
    akorlu: { type: 'string' },
    bilgiler: BILGILER_SEMA,
    donuslar: DONUSLAR_SEMA,
    notlar: { type: 'string' },
  },
};

// (2026-10-22) "📒 Defterden ekle" kipi — kullanıcı: "sözleri yerine yazmamış, onu da ayırıp yazdığını sanıyordum".
// Art arda taranan defter sayfaları eserlere ayrılır; her eser hangi sayfalarda (1'den), adı, sözü, akoru, bilgileri.
export const DEFTER_SEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['eserler', 'donuslar'],
  properties: {
    eserler: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['sayfalar', 'tekrarlar', 'baslik', 'soz', 'akorlu', 'bilgiler', 'notlar'],
        properties: {
          sayfalar: { type: 'array', items: { type: 'integer' } },
          tekrarlar: { type: 'array', items: { type: 'integer' } },
          baslik: { type: 'string' },
          soz: { type: 'string' },
          akorlu: { type: 'string' },
          bilgiler: BILGILER_SEMA,
          notlar: { type: 'string' },
        },
      },
    },
    donuslar: DONUSLAR_SEMA,
  },
};

const OKUMA_KURALI = `Sayfada ne yazıyorsa onu çıkar. Okuyamadığın yeri tahminle ya da şarkıyı bildiğin için ezberden tamamlama; o yere "…" koy ve notlar alanında belirt. Üstü çizilmiş satırları alma, notlarda belirt. Söz hem notanın altında hece hece hem de sayfada düz metin (kıtalar) olarak yazılıysa sözü düz metinden al.

Söz çoğu zaman yalnız notanın altında hece hece yazılıdır; o zaman sözü hecelerden kur:
- Heceleri birleştirip sözcükleri doğru yaz (HAS TA NE Ö NÜN DE → Hastane önünde); tire ve boşlukla bölünmüş heceleri ayırma.
- Notanın altında üst üste birden çok söz satırı varsa her satır ayrı bir kıtadır: 1. satırları sırayla birleştirerek 1. kıtayı, 2. satırları birleştirerek 2. kıtayı kur; satırları birbirine karıştırma. Satırın altında " ya da ″ gibi aynen işareti varsa üstteki sözü tekrarla.
- Dizeleri müzik cümlelerine göre böl (genelde bir dize bir ya da iki porte satırıdır); dönüş ve ev (1., 2.) işaretleri yüzünden sözü iki kez yazma.
- "Saz" ya da sözsüz bölümleri söze katma. Kıta numaralarını ayrı satır olarak yazma.`;

const ALAN_KURALLARI = `- baslik: sayfada yazılı eser adı; yoksa "".
- soz: yalnız söz, sayfadaki satır düzeninde. Kıtalar arasında boş satır. "2X", "Nakarat", "Bağlantı" gibi işaretler sayfada varsa koru. Söz yoksa "".
- akorlu: söz ile akorlar satır içi ChordPro biçiminde. Her akoru, üstünde durduğu hecenin hemen önüne köşeli parantezle koy: "[Am]Sabahtan [G]kalktım". Sözsüz akor satırları (giriş, ara saz): "[Am] [G] [F]". Bölüm adları kendi satırında: "{c: Nakarat}". Küçük harfle yazılmış minör akoru düzelt (am → Am); geri kalanını sayfadaki gibi bırak (B♭ → Bb, Do Re Mi yazılmışsa öyle). Sayfada akor yoksa "".
- bilgiler: yalnız sayfada açıkça yazılı olanlar (TRT nota başlıkları dahil): yöre, kaynak kişi, derleyen, notaya alan, repertuvar no, makam, usul/ölçü, süre, ton, söz yazarı, besteci. Yazılı değilse "".
- notlar: belirsiz ya da okunamayan yerler, kısa ve Türkçe; yoksa "".`;

const DONUS_KURALI = `- donuslar: her görsel için, gönderilme sırasıyla, sayfanın dik okunması için saat yönünde kaç derece döndürülmesi gerektiği (0, 90, 180, 270).`;

export const SISTEM = `Bir müzisyenin defter sayfasının ya da nota sayfasının fotoğrafını okuyup bir repertuvar uygulamasına aktarıyorsun.

Birden çok görsel gelirse bunlar aynı eserin sırayla sayfalarıdır: tek eser olarak birleştir (söz ve akorlar sayfa sırasıyla devam eder, sayfa sonunda bölünmüş satırı birleştir; başlık bilgileri genelde ilk sayfadadır).

${OKUMA_KURALI}

Alanlar:
${ALAN_KURALLARI}
${DONUS_KURALI}

Metni sayfadaki dilde bırak, çevirme.`;

export const DEFTER_SISTEM = `Bir müzisyenin defterinden art arda taranmış sayfaları okuyup repertuvar uygulamasına eser eser aktarıyorsun.

Sayfaları eserlere ayır. Bir eser bir sayfa olabilir ya da birkaç sayfaya yayılabilir; bir sayfada birden çok eser de olabilir. Yeni bir başlıkla başlayan sayfa yeni eserdir; başlıksız ve önceki sayfanın devamı görünen sayfa önceki esere aittir. Aynı başlığı ya da "(sayfa 2)", "devam" gibi bir işareti taşıyan sayfa o eserin parçasıdır; sayfalar karışık sırada taranmış olabilir. İlk sayfa başlıksızsa ve bir şeyin devamı gibi görünüyorsa onu başlıksız ayrı bir eser olarak ver ve notlarda "önceki sayfanın devamı olabilir" yaz. Aynı sayfa birden çok kez taranmışsa (tekrar tarama) en düzgün ve okunaklı olanını sayfalar'a, diğerlerini tekrarlar'a yaz. Her sayfa bir esere ait olmalı.

${OKUMA_KURALI}

Her eser için:
- sayfalar: eserin sayfalarının numaraları (gönderilme sırasıyla 1'den numaralanır), eserin kendi okuma sırasıyla (ör. 2. sayfası önce taranmışsa [4, 3]).
- tekrarlar: aynı sayfanın fazladan taranmış kopyalarının numaraları; yoksa [].
${ALAN_KURALLARI}

Ayrıca:
${DONUS_KURALI}

Metni sayfadaki dilde bırak, çevirme.`;

// İstemciden gelen gövdeyi denetler → { gorseller, tur } ya da hata kodu. Tek sayfa: gorsel, çok sayfa: gorseller[]
export function govdeDenetle(g: unknown): { gorseller: string[]; tur: string } | { hata: string } {
  const o = (g && typeof g === 'object') ? g as Record<string, unknown> : {};
  const tur = typeof o.tur === 'string' ? o.tur.toLowerCase() : 'image/jpeg';
  if (!TURLER.includes(tur)) return { hata: 'desteklenmeyen-tur' };
  const ham = Array.isArray(o.gorseller) ? o.gorseller : (o.gorsel !== undefined ? [o.gorsel] : []);
  if (!ham.length) return { hata: 'gorsel-yok' };
  if (ham.length > EN_COK_SAYFA) return { hata: 'cok-sayfa' };
  const gorseller: string[] = [];
  for (const v of ham) {
    const b64 = typeof v === 'string' ? v.replace(/^data:[^,]*,/, '').replace(/\s+/g, '') : '';
    if (!b64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return { hata: 'gorsel-yok' };
    if (Math.floor(b64.length * 3 / 4) > EN_BUYUK_BAYT) return { hata: 'gorsel-buyuk' };
    gorseller.push(b64);
  }
  return { gorseller, tur };
}

// Messages API istek gövdesi (index.ts SDK'ya verir)
// mod 'defter': sayfalar eserlere ayrılır (DEFTER_SEMA); yoksa hepsi tek eser (SEMA)
export function istekOf(gorseller: string[], tur: string, model: string = MODEL, mod = '') {
  const defter = mod === 'defter';
  const yedek = model === 'claude-opus-5-5' ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {};
  const son = defter ? 'Bu defter sayfalarını eserlere ayırarak oku.'
    : gorseller.length > 1 ? 'Bu sayfaları tek eser olarak oku.' : 'Bu sayfayı oku.';
  return {
    model,
    max_tokens: 16000,
    ...yedek,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: defter ? DEFTER_SEMA : SEMA } },
    system: defter ? DEFTER_SISTEM : SISTEM,
    messages: [{
      role: 'user',
      content: [
        ...gorseller.flatMap((data, i) => [
          ...(gorseller.length > 1 || defter ? [{ type: 'text', text: `Sayfa ${i + 1} / ${gorseller.length}` }] : []),
          { type: 'image', source: { type: 'base64', media_type: tur, data } },
        ]),
        { type: 'text', text: son },
      ],
    }],
  };
}

const metin = (v: unknown, enCok = 20000) => (typeof v === 'string' ? v : '').replace(/\r\n?/g, '\n').trim().slice(0, enCok);

// Modelin JSON'unu uygulamanın beklediği biçime getirir; bozuksa null
export function sonucDuzenle(ham: string, sayfa = 1): Record<string, unknown> | null {
  let o: Record<string, any>;
  try { o = JSON.parse(ham); } catch { return null; }
  if (!o || typeof o !== 'object') return null;
  const b = (o.bilgiler && typeof o.bilgiler === 'object') ? o.bilgiler : {};
  const gelen = Array.isArray(o.donuslar) ? o.donuslar : [];
  const donuslar = Array.from({ length: sayfa }, (_, i) => ([0, 90, 180, 270].includes(gelen[i]) ? gelen[i] : 0));
  return {
    baslik: metin(o.baslik, 200),
    soz: metin(o.soz),
    akorlu: akorluTemizle(metin(o.akorlu)),
    bilgiler: Object.fromEntries(BILGI_ALANLARI.map((a) => [a, metin(b[a], 200)])),
    donuslar,
    notlar: metin(o.notlar, 500),
  };
}

// Defter kipi: eser içi sayfa sırası modelinki (karışık taranmış olabilir), eserler en küçük sayfa numarasına göre; bir sayfa
// tek esere; tekrar taramalar ayrı (tekrarlar); hiçbir esere düşmeyen sayfa öncekine eklenir
export function defterSonucDuzenle(ham: string, sayfa: number): Record<string, unknown> | null {
  let o: Record<string, any>;
  try { o = JSON.parse(ham); } catch { return null; }
  if (!o || typeof o !== 'object' || !Array.isArray(o.eserler)) return null;
  const eserler = o.eserler.map((e: any) => {
    const tek = sonucDuzenle(JSON.stringify({ ...(e || {}), donuslar: [] }), 0) as Record<string, unknown>;
    const gecerli = (v: unknown): number[] => (Array.isArray(v) ? v : [])
      .filter((n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= sayfa) as number[];
    const sayfalar = gecerli(e && e.sayfalar).filter((n, i, a) => a.indexOf(n) === i);   // eserin okuma sırası korunur
    return { sayfalar, tekrarlar: gecerli(e && e.tekrarlar), baslik: tek.baslik, soz: tek.soz, akorlu: tek.akorlu, bilgiler: tek.bilgiler, notlar: tek.notlar };
  }).filter((e: any) => e.sayfalar.length);
  // Bir sayfa yalnız bir esere: önce gelen eser alır; tekrar olarak işaretlenen ama bir eserin sayfası olan atılır
  const alinan = new Set<number>();
  for (const e of eserler) { e.sayfalar = e.sayfalar.filter((n: number) => !alinan.has(n)); e.sayfalar.forEach((n: number) => alinan.add(n)); }
  for (const e of eserler) { e.tekrarlar = e.tekrarlar.filter((n: number) => !alinan.has(n)).filter((n: number, i: number, a: number[]) => a.indexOf(n) === i); e.tekrarlar.forEach((n: number) => alinan.add(n)); }
  const enKucuk = (e: any) => Math.min(...e.sayfalar, ...e.tekrarlar);
  const sirali = eserler.filter((e: any) => e.sayfalar.length).sort((a: any, b: any) => enKucuk(a) - enKucuk(b));
  for (let n = 1; n <= sayfa; n++) {
    if (alinan.has(n)) continue;
    const once = [...sirali].reverse().find((e: any) => enKucuk(e) < n);
    if (once) once.sayfalar.push(n);
    else sirali.unshift({ sayfalar: [n], tekrarlar: [], baslik: '', soz: '', akorlu: '', bilgiler: Object.fromEntries(BILGI_ALANLARI.map((a) => [a, ''])), notlar: '' });
    alinan.add(n);
  }
  const eserlerSon = sirali;
  const gelen = Array.isArray(o.donuslar) ? o.donuslar : [];
  const donuslar = Array.from({ length: sayfa }, (_, i) => ([0, 90, 180, 270].includes(gelen[i]) ? gelen[i] : 0));
  return { eserler: eserlerSon, donuslar };
}

// Kapanmamış köşeli parantez ChordPro çiziciyi bozmasın: satırda eşleşmeyen '[' ve ']' kaldırılır
// (yeni '[' gelince açık kalan öncekisi eşleşmemiş sayılır)
export function akorluTemizle(s: string): string {
  return s.split('\n').map((satir) => {
    let acik = -1, cikti = '';
    for (const ch of satir) {
      if (ch === '[') {
        if (acik >= 0) cikti = cikti.slice(0, acik) + cikti.slice(acik + 1);
        acik = cikti.length; cikti += ch;
      } else if (ch === ']') {
        if (acik < 0) continue;
        acik = -1; cikti += ch;
      } else cikti += ch;
    }
    if (acik >= 0) cikti = cikti.slice(0, acik) + cikti.slice(acik + 1);
    return cikti;
  }).join('\n');
}
