// Repertuvar — Toplu Mail Gönderici (Resend)
// Kullanım: node send-mail.js
// NOT: Bu dosyayı GitHub'a push etme!

const RESEND_API_KEY = 're_VA7XNhi7_9QUEDcLf3pdEHyCS7uWeFiY7';
const FROM = 'noreply@repertuvar.app';

// ——— Alıcılar ———————————————————————————————————————
const recipients = [
  'emirgundogdu+test@gmail.com',
  'hayatikaya61@hotmail.com',
  'cyumurtaci@hotmail.com',
  'aslan_kaysal@hotmail.com',
];

// ——— Mail içeriği ————————————————————————————————————
const subject = 'Repertuvar hesabınız artık aktif';

const body = (email) => `Merhaba,

Repertuvar.app'e kayıt olduğunuz için teşekkürler.

Sistemimizde yaptığımız bir inceleme sırasında hesabınızın teknik bir sorun nedeniyle tam olarak aktif edilemediğini fark ettik. Bu sorunu sizin adınıza düzelttik.

Artık aşağıdaki adresten giriş yapabilirsiniz:
https://app.repertuvar.app/login.html

Şifrenizi hatırlamıyorsanız "Şifremi unuttum" seçeneğini kullanabilirsiniz.

Herhangi bir sorun yaşarsanız bize ulaşabilirsiniz:
✉️  info@repertuvar.app
💬 WhatsApp: +31 621 30 12 22

İyi müzikler,
Emir
Repertuvar.app`;

// ——— Gönderici ———————————————————————————————————————
async function sendMail(to) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject: subject,
      text: body(to),
    }),
  });

  const data = await res.json();
  if (res.ok) {
    console.log(`✓ Gönderildi: ${to} (id: ${data.id})`);
  } else {
    console.error(`✗ Hata (${to}):`, data);
  }
}

async function main() {
  console.log(`${recipients.length} kişiye mail gönderiliyor...\n`);
  for (const email of recipients) {
    await sendMail(email);
    await new Promise(r => setTimeout(r, 500)); // rate limit için
  }
  console.log('\nTamamlandı.');
}

main();
