// (2026-10-20) Hoş geldin e-postası — HAZIR, DEPLOY EDİLMEDİ, KAPALI. Lansman günü açılır (bkz. _not.md 2026-10-20).
//
// Tetik: Supabase Database Webhook — public.profiles INSERT → POST bu fonksiyon.
//   Profil, e-posta kodu girildikten SONRA oluşuyor (ör. Mahmut Celiker: onay 01:44:21, profil 01:44:25),
//   Google / Apple ile girişte de oluşuyor ⇒ tek tetik hepsini kapsıyor, kod e-postasıyla karışmıyor.
//   Webhook'a özel başlık: `x-hosgeldin-sirri: <HOSGELDIN_SIRRI>` (Verify JWT KAPALI; kimlik burada denetlenir).
//
// Supabase Secrets: RESEND_API_KEY, HOSGELDIN_SIRRI, HOSGELDIN_ACIK ("true" olmadıkça HİÇ e-posta gitmez).
// Gönderen no-reply@repertuvar.app (Resend'de doğrulanmış kök alan), yanıt support@repertuvar.app.
// Aynı kullanıcıya iki kez gitmez: Resend `Idempotency-Key` = hosgeldin/<uid> (webhook tekrar denese de).
// Atlananlar: emirgundogdu+…@gmail.com (test / mağaza inceleme hesapları), e-postasız profiller.
// Dil: profiles.ui_lang === 'en' → İngilizce, aksi hâlde Türkçe.
//
// İÇERİK KURALI: e-posta yalnız kullanıcının O AN uygulamada göreceği şeyi vaat eder. Nota tarama + "1 ay ücretsiz"
// satırı ancak mağaza sürümü + web paket ekranı (abonelik_zorunlu_web=true) yayındayken doğru. Bu yüzden lansmanla açılır.

declare const Deno: any;

const GONDEREN = 'Repertuvar <no-reply@repertuvar.app>';
const YANIT = 'support@repertuvar.app';
const LOGO = 'https://repertuvar.app/assets/logo.png';
const UYGULAMA = 'https://app.repertuvar.app/login.html';

type Ortam = (k: string) => string | undefined;

export function atlanirMi(eposta: string): boolean {
  const e = (eposta || '').toLowerCase().trim();
  if (!e || !e.includes('@')) return true;
  return /^emirgundogdu\+[^@]*@gmail\.com$/.test(e);
}

function kacis(s: string): string {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

const METIN = {
  tr: {
    konu: 'Nota defterin artık cebinde 🎵',
    selam: (ad: string) => ad ? `Aramıza hoş geldin, ${ad}!` : 'Aramıza hoş geldin!',
    giris: "Repertuvar'a katıldığın için teşekkürler. Nota defterini yanında taşımana artık gerek yok:",
    adimlar: [
      ['Tara', 'Nota sayfalarını telefonunla tara.'],
      ['Eşleştir', 'Her nota, eserin sözlerinin yanına eklenir.'],
      ['Sahnede çal', 'Eller serbest; eserler arasında pedalla geç.'],
    ],
    deneme: 'Tüm planlarda ilk ay ücretsiz. Sana uyan planı seç, bir ay boyunca hiçbir ücret ödemeden dene; istediğin an iptal et.',
    dugme: 'Uygulamayı Aç',
    kapanis: 'Bir sorun ya da önerin olursa bu e-postayı yanıtlaman yeterli. Bizi nereden duyduğunu yazarsan çok seviniriz.',
    imza: 'Repertuvar ekibi',
  },
  en: {
    konu: 'Your sheet music, now in your pocket 🎵',
    selam: (ad: string) => ad ? `Welcome aboard, ${ad}!` : 'Welcome aboard!',
    giris: 'Thanks for joining Repertuvar. No more carrying your sheet music binder around:',
    adimlar: [
      ['Scan', 'Scan your sheet music pages with your phone.'],
      ['Match', 'Each page is attached right next to the song’s lyrics.'],
      ['Play on stage', 'Hands free — switch songs with a pedal.'],
    ],
    deneme: 'Every plan starts with a free first month. Pick the plan that suits you and try it for a month at no cost — cancel anytime.',
    dugme: 'Open the app',
    kapanis: 'Questions or ideas? Just reply to this email. We’d love to hear how you found us.',
    imza: 'The Repertuvar team',
  },
  de: {
    konu: 'Dein Notenheft – jetzt in deiner Tasche 🎵',
    selam: (ad: string) => ad ? `Willkommen an Bord, ${ad}!` : 'Willkommen an Bord!',
    giris: 'Danke, dass du bei Repertuvar bist. Dein Notenheft musst du nicht mehr mit dir herumtragen:',
    adimlar: [
      ['Scannen', 'Scanne deine Notenseiten mit dem Handy.'],
      ['Zuordnen', 'Jede Seite landet direkt neben dem Liedtext des Stücks.'],
      ['Auf der Bühne spielen', 'Hände frei – wechsle die Stücke mit dem Pedal.'],
    ],
    deneme: 'Jeder Plan beginnt mit einem kostenlosen ersten Monat. Wähle den passenden Plan und teste ihn einen Monat lang kostenlos – jederzeit kündbar.',
    dugme: 'App öffnen',
    kapanis: 'Fragen oder Ideen? Antworte einfach auf diese E-Mail. Wir freuen uns zu hören, wie du auf uns gestoßen bist.',
    imza: 'Dein Repertuvar-Team',
  },
  nl: {
    konu: 'Je muziekschrift, nu in je broekzak 🎵',
    selam: (ad: string) => ad ? `Welkom, ${ad}!` : 'Welkom!',
    giris: 'Bedankt dat je Repertuvar gebruikt. Je hoeft je muziekschrift niet meer mee te slepen:',
    adimlar: [
      ['Scannen', 'Scan je bladmuziek met je telefoon.'],
      ['Koppelen', 'Elke pagina komt direct naast de songtekst van het stuk.'],
      ['Spelen op het podium', 'Handen vrij – wissel van stuk met een pedaal.'],
    ],
    deneme: 'Elk abonnement begint met een gratis eerste maand. Kies het abonnement dat bij je past en probeer het een maand gratis – altijd opzegbaar.',
    dugme: 'Open de app',
    kapanis: 'Vragen of ideeën? Beantwoord gewoon deze e-mail. We horen graag hoe je ons hebt gevonden.',
    imza: 'Het Repertuvar-team',
  },
  fr: {
    konu: 'Votre cahier de partitions, désormais dans votre poche 🎵',
    selam: (ad: string) => ad ? `Bienvenue, ${ad} !` : 'Bienvenue !',
    giris: 'Merci d’avoir rejoint Repertuvar. Plus besoin de transporter votre cahier de partitions :',
    adimlar: [
      ['Numériser', 'Numérisez vos pages de partitions avec votre téléphone.'],
      ['Associer', 'Chaque page est placée juste à côté des paroles du morceau.'],
      ['Jouer sur scène', 'Mains libres : passez d’un morceau à l’autre avec une pédale.'],
    ],
    deneme: 'Chaque formule commence par un premier mois gratuit. Choisissez celle qui vous convient et essayez-la gratuitement pendant un mois — résiliable à tout moment.',
    dugme: 'Ouvrir l’application',
    kapanis: 'Une question ou une idée ? Répondez simplement à cet e-mail. Nous serions ravis de savoir comment vous nous avez connus.',
    imza: 'L’équipe Repertuvar',
  },
  es: {
    konu: 'Tu cuaderno de partituras, ahora en tu bolsillo 🎵',
    selam: (ad: string) => ad ? `¡Te damos la bienvenida, ${ad}!` : '¡Te damos la bienvenida!',
    giris: 'Gracias por unirte a Repertuvar. Ya no tienes que cargar con tu cuaderno de partituras:',
    adimlar: [
      ['Escanea', 'Escanea tus páginas de partituras con el móvil.'],
      ['Asocia', 'Cada página queda justo al lado de la letra de la obra.'],
      ['Toca en el escenario', 'Manos libres: cambia de obra con un pedal.'],
    ],
    deneme: 'Todos los planes empiezan con un primer mes gratis. Elige el que mejor te encaje y pruébalo un mes sin pagar nada; cancela cuando quieras.',
    dugme: 'Abrir la app',
    kapanis: '¿Preguntas o ideas? Responde a este correo. Nos encantará saber cómo nos conociste.',
    imza: 'El equipo de Repertuvar',
  },
  it: {
    konu: 'Il tuo quaderno di spartiti, ora in tasca 🎵',
    selam: (ad: string) => ad ? `Ti diamo il benvenuto, ${ad}!` : 'Ti diamo il benvenuto!',
    giris: 'Grazie per aver scelto Repertuvar. Non devi più portarti dietro il quaderno di spartiti:',
    adimlar: [
      ['Scansiona', 'Scansiona le pagine degli spartiti con il telefono.'],
      ['Abbina', 'Ogni pagina finisce proprio accanto al testo del brano.'],
      ['Suona sul palco', 'Mani libere: cambia brano con un pedale.'],
    ],
    deneme: 'Ogni piano inizia con un primo mese gratuito. Scegli quello giusto per te e provalo gratis per un mese; puoi disdire in qualsiasi momento.',
    dugme: "Apri l'app",
    kapanis: 'Domande o idee? Rispondi a questa email. Ci farebbe piacere sapere come ci hai conosciuto.',
    imza: 'Il team di Repertuvar',
  },
  pt: {
    konu: 'Seu caderno de partituras, agora no seu bolso 🎵',
    selam: (ad: string) => ad ? `Boas-vindas, ${ad}!` : 'Boas-vindas!',
    giris: 'Obrigado por entrar no Repertuvar. Você não precisa mais carregar seu caderno de partituras:',
    adimlar: [
      ['Digitalize', 'Digitalize as páginas das suas partituras com o celular.'],
      ['Associe', 'Cada página fica bem ao lado da letra da música.'],
      ['Toque no palco', 'Mãos livres: troque de música com um pedal.'],
    ],
    deneme: 'Todos os planos começam com o primeiro mês grátis. Escolha o que combina com você e teste por um mês sem pagar nada; cancele quando quiser.',
    dugme: 'Abrir o app',
    kapanis: 'Dúvidas ou ideias? É só responder este e-mail. Vamos adorar saber como você nos conheceu.',
    imza: 'Equipe Repertuvar',
  },
  ar: {
    konu: 'دفتر نوتاتك الآن في جيبك 🎵',
    selam: (ad: string) => ad ? `أهلًا بك، ${ad}!` : 'أهلًا بك!',
    giris: 'شكرًا لانضمامك إلى Repertuvar. لم تعد بحاجة إلى حمل دفتر النوتات معك:',
    adimlar: [
      ['امسح', 'امسح صفحات النوتة بهاتفك.'],
      ['اربط', 'تُضاف كل صفحة بجانب كلمات المقطوعة مباشرة.'],
      ['اعزف على المسرح', 'يداك حرّتان: انتقل بين المقطوعات بدوّاسة.'],
    ],
    deneme: 'كل الخطط تبدأ بشهر أول مجاني. اختر الخطة التي تناسبك وجرّبها شهرًا دون أي رسوم، وألغِ متى شئت.',
    dugme: 'افتح التطبيق',
    kapanis: 'لديك سؤال أو فكرة؟ يكفي أن ترد على هذه الرسالة. يسعدنا أن نعرف كيف وصلت إلينا.',
    imza: 'فريق Repertuvar',
  },
  az: {
    konu: 'Not dəftərin artıq cibində 🎵',
    selam: (ad: string) => ad ? `Aramıza xoş gəldin, ${ad}!` : 'Aramıza xoş gəldin!',
    giris: 'Repertuvar-a qoşulduğun üçün təşəkkürlər. Not dəftərini yanında gəzdirməyinə artıq ehtiyac yoxdur:',
    adimlar: [
      ['Skan et', 'Not səhifələrini telefonunla skan et.'],
      ['Uyğunlaşdır', 'Hər səhifə əsərin sözlərinin yanına əlavə olunur.'],
      ['Səhnədə çal', 'Əllər sərbəst; əsərlər arasında pedalla keç.'],
    ],
    deneme: 'Bütün planlarda ilk ay pulsuzdur. Sənə uyğun planı seç, bir ay heç bir ödəniş etmədən sına; istədiyin vaxt ləğv et.',
    dugme: 'Tətbiqi aç',
    kapanis: 'Sualın və ya təklifin olsa, bu e-poçta cavab yazman kifayətdir. Bizi haradan eşitdiyini yazsan çox sevinərik.',
    imza: 'Repertuvar komandası',
  },
};

// (2026-11-04) Dil: profiles.ui_lang; INSERT anında çoğunlukla boş → arka planda bekleyip yeniden okunur (dilBul).
export type Dil = keyof typeof METIN;
export function dilMi(x: unknown): x is Dil { return typeof x === 'string' && Object.prototype.hasOwnProperty.call(METIN, x); }
export async function dilBul(uid: string, ortam: Ortam, f: typeof fetch, bekle: (ms: number) => Promise<unknown>): Promise<Dil> {
  const url = ortam('SUPABASE_URL'), anahtar = ortam('SUPABASE_SERVICE_ROLE_KEY');
  if (!uid || !url || !anahtar) return 'tr';
  await bekle(30000);
  try {
    const r = await f(url + '/rest/v1/profiles?select=ui_lang&id=eq.' + encodeURIComponent(uid), { headers: { apikey: anahtar, Authorization: 'Bearer ' + anahtar } });
    const d = r.ok ? await r.json() : [];
    return dilMi(d[0] && d[0].ui_lang) ? d[0].ui_lang : 'tr';
  } catch { return 'tr'; }
}

export function eposta(dil: Dil, ad: string): { konu: string; html: string; text: string } {
  const m = METIN[dil];
  const adimHtml = m.adimlar.map(([b, a]) => `
      <tr><td style="padding:0 0 10px;">
        <div style="border:1px solid #F5C542;border-radius:12px;padding:12px 16px;">
          <div style="color:#F5C542;font-weight:700;font-size:15px;margin-bottom:2px;">${b}</div>
          <div style="color:#d7d7de;font-size:14px;line-height:1.5;">${a}</div>
        </div>
      </td></tr>`).join('');
  const html = `<!doctype html><html lang="${dil}"${dil === 'ar' ? ' dir="rtl"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#0b0b0d;">
<div style="background:#0b0b0d;padding:32px 12px;font-family:'Plus Jakarta Sans',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#141417;border:1px solid #2a2a30;border-radius:18px;">
    <tr><td style="padding:32px 28px 8px;text-align:center;">
      <img src="${LOGO}" alt="Repertuvar" width="180" style="width:180px;height:auto;">
    </td></tr>
    <tr><td style="padding:16px 28px 0;">
      <div style="color:#ffffff;font-size:26px;font-weight:800;line-height:1.15;">${kacis(m.selam(ad))}</div>
      <p style="color:#c9c9d1;font-size:15px;line-height:1.6;margin:12px 0 20px;">${m.giris}</p>
    </td></tr>
    <tr><td style="padding:0 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${adimHtml}</table></td></tr>
    <tr><td style="padding:8px 28px 0;">
      <div style="background:#F5C542;color:#1a1400;border-radius:12px;padding:12px 16px;font-size:14px;font-weight:700;line-height:1.5;">🎁 ${m.deneme}</div>
    </td></tr>
    <tr><td style="padding:24px 28px;text-align:center;">
      <a href="${UYGULAMA}" style="display:inline-block;background:#F5C542;color:#1a1400;font-weight:800;font-size:15px;text-decoration:none;padding:13px 32px;border-radius:999px;">${m.dugme}</a>
    </td></tr>
    <tr><td style="padding:0 28px 28px;">
      <p style="color:#9a9aa6;font-size:13px;line-height:1.6;margin:0 0 12px;">${m.kapanis}</p>
      <p style="color:#ffffff;font-size:13px;font-weight:700;margin:0;">${m.imza}</p>
    </td></tr>
  </table>
  <p style="color:#6f6f7a;font-size:11px;text-align:center;margin:18px 0 0;">© 2026 Repertuvar · <a href="https://repertuvar.app" style="color:#F5C542;text-decoration:none;">repertuvar.app</a></p>
</div></body></html>`;
  const text = [m.selam(ad), '', m.giris, ...m.adimlar.map(([b, a]) => `• ${b}: ${a}`), '', m.deneme, '',
    `${m.dugme}: ${UYGULAMA}`, '', m.kapanis, '', m.imza].join('\n');
  return { konu: m.konu, html, text };
}

function yanit(durum: number, govde: unknown): Response {
  return new Response(JSON.stringify(govde), { status: durum, headers: { 'Content-Type': 'application/json' } });
}

type Secenek = { bekle?: (ms: number) => Promise<unknown>; arka?: (p: Promise<unknown>) => void };
const varsayilanArka = (p: Promise<unknown>) => {
  const er = (globalThis as any).EdgeRuntime;
  if (er && er.waitUntil) er.waitUntil(p); else p.catch(() => {});
};

export async function isle(istek: Request, ortam: Ortam, f: typeof fetch = fetch, sec: Secenek = {}): Promise<Response> {
  const bekle = sec.bekle || ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const arka = sec.arka || varsayilanArka;
  if (istek.method !== 'POST') return yanit(405, { hata: 'yontem' });
  const sir = ortam('HOSGELDIN_SIRRI') || '';
  if (!sir || istek.headers.get('x-hosgeldin-sirri') !== sir) return yanit(401, { hata: 'yetkisiz' });

  let g: any = {};
  try { g = await istek.json(); } catch { return yanit(400, { hata: 'govde' }); }
  // Database Webhook gövdesi: { type:'INSERT', table:'profiles', record:{...} }. Elle deneme: { record:{ id, email, ... } }
  const k = g.record || {};
  const uid = String(k.id || '');
  const adres = String(k.email || '');
  if (g.type && g.type !== 'INSERT') return yanit(200, { atlandi: 'tur' });
  if (atlanirMi(adres) && !g.deneme_adresi) return yanit(200, { atlandi: 'adres' });
  if (ortam('HOSGELDIN_ACIK') !== 'true' && !g.deneme_adresi) return yanit(200, { atlandi: 'kapali' });

  const ad = String(k.display_name || k.full_name || '').trim().split(/\s+/)[0] || '';
  // Deneme gönderimi: { deneme_adresi:'emirgundogdu+test@gmail.com', record:{...} } — kapalıyken de çalışır, idempotency yok.
  const alici = g.deneme_adresi || adres;
  const gonder = async (dil: Dil) => {
  const e = eposta(dil, ad);
  const r = await f('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + (ortam('RESEND_API_KEY') || ''),
      'Content-Type': 'application/json',
      ...(g.deneme_adresi ? {} : { 'Idempotency-Key': 'hosgeldin/' + uid }),
    },
    body: JSON.stringify({ from: GONDEREN, to: [alici], reply_to: YANIT, subject: e.konu, html: e.html, text: e.text }),
  });
  if (!r.ok) return yanit(502, { hata: 'resend', durum: r.status, ayrinti: await r.text() });
  return yanit(200, { gonderildi: true, alici, dil });
  };
  // Dil biliniyorsa (ya da deneme gönderimiyse) hemen; bilinmiyorsa webhook beklemesin: 202 dön, arka planda dili bulup gönder.
  if (dilMi(k.ui_lang)) return gonder(k.ui_lang);
  if (g.deneme_adresi) return gonder(dilMi(g.dil) ? g.dil : 'tr');
  arka(dilBul(uid, ortam, f, bekle).then(gonder));
  return yanit(202, { kuyrukta: true, alici });
}

if (typeof Deno !== 'undefined' && Deno.serve) {
  Deno.serve((istek: Request) => isle(istek, (k) => Deno.env.get(k)));
}
