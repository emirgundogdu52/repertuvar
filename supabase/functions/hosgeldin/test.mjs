// hosgeldin testleri — ağ yok, Resend sahte. Çalıştır: node supabase/functions/hosgeldin/test.mjs (Node 24; 22'de --experimental-strip-types)
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const kopya = join(mkdtempSync(join(tmpdir(), 'hosgeldin-')), 'index.mts');
copyFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.ts'), kopya);
const { isle, atlanirMi, eposta } = await import(pathToFileURL(kopya).href);
const ok = (k, m) => { if (!k) { console.error('HATA:', m); process.exitCode = 1; } else console.log('✓', m); };
const ortam = (acik) => (k) => ({ HOSGELDIN_SIRRI: 's', RESEND_API_KEY: 'x', HOSGELDIN_ACIK: acik }[k]);
let giden = null;
const sahte = async (u, o) => { giden = JSON.parse(o.body); giden._h = o.headers; return new Response('{"id":"1"}', { status: 200 }); };
const ist = (g, sir = 's') => new Request('http://x', { method: 'POST', headers: { 'x-hosgeldin-sirri': sir }, body: JSON.stringify(g) });
const kayit = { id: '2f3d3348-af82-422e-92ee-67a11f0c30e7', email: 'kisi@ornek.com', display_name: 'Mahmut Celiker', ui_lang: 'tr' };

ok(atlanirMi('emirgundogdu+apple@gmail.com') && !atlanirMi('emirgundogdu@gmail.com') && !atlanirMi('kisi@ornek.com'), 'test hesapları atlanıyor, ana hesap atlanmıyor');
ok((await isle(ist({ type: 'INSERT', record: kayit }, 'yanlis'), ortam('true'), sahte)).status === 401, 'yanlış sır → 401');
giden = null; let r = await (await isle(ist({ type: 'INSERT', record: kayit }), ortam('false'), sahte)).json();
ok(r.atlandi === 'kapali' && giden === null, 'kapalıyken gönderilmiyor');
giden = null; r = await (await isle(ist({ type: 'INSERT', record: kayit }), ortam('true'), sahte)).json();
ok(r.gonderildi && giden.to[0] === 'kisi@ornek.com' && giden._h['Idempotency-Key'] === 'hosgeldin/' + kayit.id, 'açıkken gönderiliyor + tekrar koruması');
ok(giden.html.includes('Mahmut!') && giden.subject.startsWith('Nota defterin'), 'TR metin, ilk ad');
giden = null; await isle(ist({ type: 'INSERT', record: { ...kayit, ui_lang: 'en' } }), ortam('true'), sahte);
ok(giden.subject.startsWith('Your sheet music'), 'EN metin');
giden = null; r = await (await isle(ist({ type: 'INSERT', record: { ...kayit, email: 'emirgundogdu+google@gmail.com' } }), ortam('true'), sahte)).json();
ok(r.atlandi === 'adres' && giden === null, 'inceleme hesabına gitmiyor');
giden = null; await isle(ist({ deneme_adresi: 'emirgundogdu+test@gmail.com', record: kayit }), ortam('false'), sahte);
ok(giden && giden.to[0] === 'emirgundogdu+test@gmail.com' && !giden._h['Idempotency-Key'], 'deneme gönderimi kapalıyken de çalışıyor');
ok(eposta('tr', '<b>').html.includes('&lt;b&gt;'), 'ad HTML kaçışlı');

// (2026-11-04) 10 dil + dil bulma
ok(eposta('de', 'Anna').konu.startsWith('Dein Notenheft') && eposta('ar', '').html.includes('dir="rtl"'), 'Almanca konu, Arapça sağdan sola');
ok(eposta('tr', '').text.includes('istediğin an iptal et') && eposta('en', '').text.includes('cancel anytime'), 'deneme satırında iptal cümlesi (tr/en)');
giden = null; await isle(ist({ type: 'INSERT', record: { ...kayit, ui_lang: 'nl' } }), ortam('true'), sahte);
ok(giden && giden.subject.startsWith('Je muziekschrift'), 'ui_lang nl → Hollandaca, hemen');
{ // ui_lang boş → 202, arka planda profilden 'fr' okunur
  let arkaIs = null, beklendi = 0, profilIstek = null;
  const sahte2 = async (u, o) => { if (String(u).includes('/rest/v1/profiles')) { profilIstek = u; return new Response('[{"ui_lang":"fr"}]'); } return sahte(u, o); };
  const ortam2 = (k) => ({ HOSGELDIN_SIRRI: 's', RESEND_API_KEY: 'x', HOSGELDIN_ACIK: 'true', SUPABASE_URL: 'https://p', SUPABASE_SERVICE_ROLE_KEY: 'k' }[k]);
  giden = null;
  const yan = await isle(ist({ type: 'INSERT', record: { ...kayit, ui_lang: null } }), ortam2, sahte2, { bekle: async (ms) => { beklendi = ms; }, arka: (p) => { arkaIs = p; } });
  ok(yan.status === 202 && giden === null, 'dil yoksa webhook hemen 202 alır');
  await arkaIs;
  ok(beklendi === 30000 && profilIstek.includes('id=eq.' + kayit.id) && giden && giden.subject.startsWith('Votre cahier'), 'arka planda profilden dil okunup Fransızca gider');
  giden = null; arkaIs = null;
  const sahte3 = async (u, o) => String(u).includes('/rest/v1/profiles') ? new Response('[{"ui_lang":null}]') : sahte(u, o);
  await isle(ist({ type: 'INSERT', record: { ...kayit, ui_lang: '' } }), ortam2, sahte3, { bekle: async () => {}, arka: (p) => { arkaIs = p; } });
  await arkaIs;
  ok(giden && giden.subject.startsWith('Nota defterin'), 'profilde de dil yoksa Türkçe');
}
