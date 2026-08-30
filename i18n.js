/* ═══════════════════════════════════════════════════════════════════════════
   I18N.JS — ARAYÜZ DİLİ                                          2026-08-30

   NİÇİN VAR
   ---------
   Uygulama tamamen Türkçe sabit metinlerle yazıldı. Türk müziği çalan yabancı
   müzisyenler (Codarts örneği) ve yurtdışındaki karma ekipler için arayüz
   engel oluşturuyor.

   TASARIM KARARLARI
   -----------------
   1) DİL, ALAN GÖRÜNÜRLÜĞÜNDEN BAĞIMSIZ. İngilizce arayüz kullanan biri makam
      müziği çalışıyor olabilir; Türkçe kullanan biri yalnız caz çalıyor
      olabilir. Bu yüzden dilden müzikal çıkarım YAPILMIYOR.
      (bkz. music fields belgesi, 11. madde)

   2) ÇEVİRİ DOM ÜZERİNDE. Sayfalar tek tek elden geçirilecek; her metni
      JS'e taşımak 380 KB'lık dosyalarda pratik değil. `data-i18n` özniteliği
      olan öğeler çevriliyor, olmayanlar Türkçe kalıyor. Böylece kademeli
      geçiş mümkün: bir sayfa yarım çevrilse bile uygulama çalışır.

   3) VERİ ÇEVRİLMEZ. Eser adları, makam adları (Hicaz, Uşşak), yöre adları,
      usul adları — bunlar veri, arayüz değil. Makam adları uluslararası
      literatürde zaten Türkçe geçiyor.

   4) EKSİK ÇEVİRİ SESSİZCE TÜRKÇEYE DÜŞER. Anahtar bulunamazsa öğenin mevcut
      içeriği korunur. Boş metin göstermektense Türkçe göstermek iyidir.

   KULLANIM
   --------
   <span data-i18n="ortak.kaydet">Kaydet</span>
   <input data-i18n-ph="giris.eposta_ph" placeholder="E-posta">
   <button data-i18n-title="ortak.sil" title="Sil">
   JS içinden:  t('ortak.kaydet')
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const DILLER = { tr: 'Türkçe', en: 'English' };

  const SOZLUK = {
    tr: {
      'ortak.kaydet': 'Kaydet',
      'ortak.iptal': 'İptal',
      'ortak.sil': 'Sil',
      'ortak.duzenle': 'Düzenle',
      'ortak.kapat': 'Kapat',
      'ortak.ara': 'Ara…',
      'ortak.yukleniyor': 'Yükleniyor…',
      'ortak.devam': 'Devam',
      'ortak.geri': 'Geri',
      'ortak.evet': 'Evet',
      'ortak.hayir': 'Hayır',

      'giris.baslik': 'Giriş Yap',
      'giris.altbaslik': 'Sahne ve repertuvar yönetimi',
      'giris.eposta': 'E-posta',
      'giris.eposta_ph': 'ornek@eposta.com',
      'giris.sifre': 'Şifre',
      'giris.sifre_ph': 'Şifreniz',
      'giris.girisyap': 'Giriş Yap',
      'giris.kayitol': 'Kayıt Ol',
      'giris.hesabinyok': 'Hesabın yok mu?',
      'giris.hesabinvar': 'Zaten hesabın var mı?',
      'giris.sifreunuttum': 'Şifremi unuttum',
      'giris.adsoyad': 'Ad Soyad',
      'giris.adsoyad_ph': 'Adınız ve soyadınız',
      'giris.sifretekrar': 'Şifre (tekrar)',
      'giris.bekleyin': 'Lütfen bekleyin…',
      'giris.sifre_min': 'En az 6 karakter',
      'giris.slogan1': 'Modern Müzisyenler İçin',
      'giris.slogan2': 'Akıllı Sahne ve Repertuvar Yönetimi',
      'giris.google': 'Google ile devam et',
      'giris.veya': 'veya',

      'menu.anasayfa': 'Ana Sayfa',
      'menu.eserler': 'Eserler',
      'menu.repertuvarlar': 'Repertuvarlar',
      'menu.solistler': 'Solistler',
      'menu.grup': 'Grup / Koro',
      'menu.calismaodasi': 'Çalışma Odası',
      'menu.metronom': 'Metronom',
      'menu.mesajlar': 'Mesajlar',
      'menu.yonetim': 'Yönetim',
      'menu.ayarlar': 'Ayarlar',
      'menu.cikis': 'Çıkış Yap',
      'menu.sahnemodu': 'Sahne Modu',

      'ayar.dil': 'Arayüz Dili',
      'ayar.dil_alt': 'Uygulamanın gösterileceği dil',
    },
    en: {
      'ortak.kaydet': 'Save',
      'ortak.iptal': 'Cancel',
      'ortak.sil': 'Delete',
      'ortak.duzenle': 'Edit',
      'ortak.kapat': 'Close',
      'ortak.ara': 'Search…',
      'ortak.yukleniyor': 'Loading…',
      'ortak.devam': 'Continue',
      'ortak.geri': 'Back',
      'ortak.evet': 'Yes',
      'ortak.hayir': 'No',

      'giris.baslik': 'Sign In',
      'giris.altbaslik': 'Stage and repertoire management',
      'giris.eposta': 'Email',
      'giris.eposta_ph': 'you@example.com',
      'giris.sifre': 'Password',
      'giris.sifre_ph': 'Your password',
      'giris.girisyap': 'Sign In',
      'giris.kayitol': 'Sign Up',
      'giris.hesabinyok': "Don't have an account?",
      'giris.hesabinvar': 'Already have an account?',
      'giris.sifreunuttum': 'Forgot password',
      'giris.adsoyad': 'Full Name',
      'giris.adsoyad_ph': 'Your full name',
      'giris.sifretekrar': 'Password (repeat)',
      'giris.bekleyin': 'Please wait…',
      'giris.sifre_min': 'At least 6 characters',
      'giris.slogan1': 'For the Modern Musician',
      'giris.slogan2': 'Smart Stage and Repertoire Management',
      'giris.google': 'Continue with Google',
      'giris.veya': 'or',

      'menu.anasayfa': 'Home',
      'menu.eserler': 'Works',
      'menu.repertuvarlar': 'Repertoires',
      'menu.solistler': 'Soloists',
      'menu.grup': 'Group / Choir',
      'menu.calismaodasi': 'Practice Room',
      'menu.metronom': 'Metronome',
      'menu.mesajlar': 'Messages',
      'menu.yonetim': 'Admin',
      'menu.ayarlar': 'Settings',
      'menu.cikis': 'Sign Out',
      'menu.sahnemodu': 'Stage Mode',

      'ayar.dil': 'Interface Language',
      'ayar.dil_alt': 'Language the app is shown in',
    }
  };

  // ── Dil seçimi ───────────────────────────────────────────────────────────
  // Sıra: kullanıcının açık tercihi → tarayıcı dili → Türkçe.
  // Tarayıcı dili yalnızca İLK açılışta bakılır; kullanıcı bir kez seçtiyse
  // cihaz dili değişse bile tercihi korunur.
  function dilBelirle() {
    try {
      const kayitli = localStorage.getItem('uiLang');
      if (kayitli && DILLER[kayitli]) return kayitli;
    } catch (e) {}
    try {
      const n = (navigator.language || 'tr').slice(0, 2).toLowerCase();
      if (DILLER[n]) return n;
      // Türkçe olmayan her dil için İngilizce daha iyi bir tahmin:
      // Hollandaca konuşan birine Türkçe göstermek yardımcı olmaz.
      return 'en';
    } catch (e) {}
    return 'tr';
  }

  let DIL = dilBelirle();

  function t(anahtar, varsayilan) {
    const s = SOZLUK[DIL] && SOZLUK[DIL][anahtar];
    if (s != null) return s;
    const tr = SOZLUK.tr && SOZLUK.tr[anahtar];
    // Eksik çeviri: Türkçeye düş. Boş göstermekten iyidir.
    return (tr != null) ? tr : (varsayilan != null ? varsayilan : anahtar);
  }

  function uygula(kok) {
    const alan = kok || document;
    alan.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      const v = t(k, null);
      if (v !== k) el.textContent = v;
    });
    alan.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const k = el.getAttribute('data-i18n-ph');
      const v = t(k, null);
      if (v !== k) el.setAttribute('placeholder', v);
    });
    alan.querySelectorAll('[data-i18n-title]').forEach(el => {
      const k = el.getAttribute('data-i18n-title');
      const v = t(k, null);
      if (v !== k) el.setAttribute('title', v);
    });
    try { document.documentElement.setAttribute('lang', DIL); } catch (e) {}
  }

  function dilAyarla(yeni) {
    if (!DILLER[yeni]) return false;
    DIL = yeni;
    try { localStorage.setItem('uiLang', yeni); } catch (e) {}
    uygula();
    // Sayfalar kendi metinlerini yeniden çizmek isteyebilir.
    try { window.dispatchEvent(new CustomEvent('dil-degisti', { detail: { dil: yeni } })); } catch (e) {}
    return true;
  }

  // Sayfa çizilmeden uygula: metinler bir an Türkçe görünüp değişmesin.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => uygula());
  } else {
    uygula();
  }

  window.i18n = {
    t: t,
    dil: () => DIL,
    diller: DILLER,
    ayarla: dilAyarla,
    uygula: uygula,
    sozluk: SOZLUK          // sayfalar kendi anahtarlarını ekleyebilsin
  };
  window.t = t;             // kısayol
})();
