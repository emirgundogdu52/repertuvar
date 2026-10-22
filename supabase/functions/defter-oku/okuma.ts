// (2026-10-22) Defter sayfası okuma — saf yardımcılar (index.ts kullanır, test.mjs Node'da sınar).
// Görseldeki söz, akor ve TRT başlık bilgileri tek istekte çıkarılır; sayfa yatıksa düzeltme açısı da gelir.
// Akorlu metin uygulamanın biçiminde: satır içi ChordPro ([Am]söz, {c: Nakarat}).

export const MODEL = 'claude-opus-5-5';
// Karşılaştırma için sunucudan (servis anahtarıyla) seçilebilen modeller; uygulama her zaman MODEL'i kullanır.
// Haiku 5.5'te sunucu tarafı yedek model (fallbacks) yok → o istekte gönderilmez.
export const MODELLER = ['claude-opus-5-5', 'claude-haiku-5-5'];
export const EN_BUYUK_BAYT = 6 * 1024 * 1024;          // base64 çözülmüş görsel üst sınırı
export const TURLER = ['image/jpeg', 'image/png', 'image/webp'];

export const BILGI_ALANLARI = [
  'yore', 'kaynak_kisi', 'derleyen', 'notaya_alan', 'repertuvar_no',
  'makam', 'usul', 'sure', 'ton', 'soz_yazari', 'besteci',
] as const;

export const SEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['baslik', 'soz', 'akorlu', 'bilgiler', 'donus', 'notlar'],
  properties: {
    baslik: { type: 'string' },
    soz: { type: 'string' },
    akorlu: { type: 'string' },
    bilgiler: {
      type: 'object',
      additionalProperties: false,
      required: [...BILGI_ALANLARI],
      properties: Object.fromEntries(BILGI_ALANLARI.map((a) => [a, { type: 'string' }])),
    },
    donus: { type: 'integer', enum: [0, 90, 180, 270] },
    notlar: { type: 'string' },
  },
};

export const SISTEM = `Bir müzisyenin defter sayfasının ya da nota sayfasının fotoğrafını okuyup bir repertuvar uygulamasına aktarıyorsun.

Sayfada ne yazıyorsa onu çıkar. Okuyamadığın yeri tahminle ya da şarkıyı bildiğin için ezberden tamamlama; o yere "…" koy ve notlar alanında belirt. Üstü çizilmiş satırları alma, notlarda belirt.

Alanlar:
- baslik: sayfada yazılı eser adı; yoksa "".
- soz: yalnız söz, sayfadaki satır düzeninde. Kıtalar arasında boş satır. "2X", "Nakarat", "Bağlantı" gibi işaretler sayfada varsa koru. Söz yoksa "".
- akorlu: söz ile akorlar satır içi ChordPro biçiminde. Her akoru, üstünde durduğu hecenin hemen önüne köşeli parantezle koy: "[Am]Sabahtan [G]kalktım". Sözsüz akor satırları (giriş, ara saz): "[Am] [G] [F]". Bölüm adları kendi satırında: "{c: Nakarat}". Küçük harfle yazılmış minör akoru düzelt (am → Am); geri kalanını sayfadaki gibi bırak (B♭ → Bb, Do Re Mi yazılmışsa öyle). Sayfada akor yoksa "".
- bilgiler: yalnız sayfada açıkça yazılı olanlar (TRT nota başlıkları dahil): yöre, kaynak kişi, derleyen, notaya alan, repertuvar no, makam, usul/ölçü, süre, ton, söz yazarı, besteci. Yazılı değilse "".
- donus: sayfanın dik okunması için görselin saat yönünde kaç derece döndürülmesi gerektiği (0, 90, 180, 270).
- notlar: belirsiz ya da okunamayan yerler, kısa ve Türkçe; yoksa "".

Metni sayfadaki dilde bırak, çevirme.`;

// İstemciden gelen gövdeyi denetler → { gorsel, tur } ya da hata kodu
export function govdeDenetle(g: unknown): { gorsel: string; tur: string } | { hata: string } {
  const o = (g && typeof g === 'object') ? g as Record<string, unknown> : {};
  const tur = typeof o.tur === 'string' ? o.tur.toLowerCase() : 'image/jpeg';
  if (!TURLER.includes(tur)) return { hata: 'desteklenmeyen-tur' };
  const gorsel = typeof o.gorsel === 'string' ? o.gorsel.replace(/^data:[^,]*,/, '').replace(/\s+/g, '') : '';
  if (!gorsel || !/^[A-Za-z0-9+/]+={0,2}$/.test(gorsel)) return { hata: 'gorsel-yok' };
  if (Math.floor(gorsel.length * 3 / 4) > EN_BUYUK_BAYT) return { hata: 'gorsel-buyuk' };
  return { gorsel, tur };
}

// Messages API istek gövdesi (index.ts SDK'ya verir)
export function istekOf(gorsel: string, tur: string, model: string = MODEL) {
  const yedek = model === 'claude-opus-5-5' ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {};
  return {
    model,
    max_tokens: 16000,
    ...yedek,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SEMA } },
    system: SISTEM,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: tur, data: gorsel } },
        { type: 'text', text: 'Bu sayfayı oku.' },
      ],
    }],
  };
}

const metin = (v: unknown, enCok = 20000) => (typeof v === 'string' ? v : '').replace(/\r\n?/g, '\n').trim().slice(0, enCok);

// Modelin JSON'unu uygulamanın beklediği biçime getirir; bozuksa null
export function sonucDuzenle(ham: string): Record<string, unknown> | null {
  let o: Record<string, any>;
  try { o = JSON.parse(ham); } catch { return null; }
  if (!o || typeof o !== 'object') return null;
  const b = (o.bilgiler && typeof o.bilgiler === 'object') ? o.bilgiler : {};
  const donus = [0, 90, 180, 270].includes(o.donus) ? o.donus : 0;
  return {
    baslik: metin(o.baslik, 200),
    soz: metin(o.soz),
    akorlu: akorluTemizle(metin(o.akorlu)),
    bilgiler: Object.fromEntries(BILGI_ALANLARI.map((a) => [a, metin(b[a], 200)])),
    donus,
    notlar: metin(o.notlar, 500),
  };
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
