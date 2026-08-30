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

      'ana.hosgeldin': 'Hoş geldiniz 👋',
      'ana.sahnehazir': 'Sahneye hazır',
      'ana.baslik1': 'Sahnedeki En Büyük',
      'ana.baslik2': 'Yardımcın',
      'ana.adim1': 'Eseri seç / kaydet',
      'ana.adim2': 'Repertuvarı oluştur',
      'ana.adim3': 'Sürükle bırak ile sırala',
      'ana.adim4': 'Sayfa çevirme pedalıyla uyumlu',
      'ana.repbak': 'Repertuvarlara Bak →',
      'ana.demo': 'Demo İzle',
      'ana.slogan': 'Müziğe odaklan. Gerisini Repertuvar.app halletsin.',
      'ana.pedalnot': 'Sayfa çevirme pedalıyla uyumlu · pedal ayrıca satın alınır',
      'ana.offlinenot': 'İnternet bağlantınız kopsa bile çalışmaya devam eder.',
      'ana.offline': 'Offline çalışır',
      'ana.pedal': 'Pedalla uyumlu',
      'ana.grupsenk': 'Grup senkronizasyonu',
      'ana.grupsenk_alt': 'Tüm değişiklikler grup üyelerinizle anında senkronize olur.',
      'ana.pdfnota': 'PDF & Nota',
      'ana.pdfnota_alt': 'PDF, akor, not ve sözleri tek yerden görüntüleyin.',
      'ana.neler': 'Neler Yapabilirsiniz?',
      'ana.detay': 'Detay →',
      'ana.sonEklenen': 'Son Eklenen Eserler',
      'ana.tumu': 'Tümü →',
      'ana.ajanda': 'Konser Ajandası',
      'ana.yakinda': 'yakında',
      'ana.eser': 'Eser',
      'ana.grup': 'Grup',

      'ay.hesap': 'Hesap',
      'ay.uye': 'Üye',
      'ay.adsoyad': 'Ad Soyad',
      'ay.adsoyad_alt': 'Eklediğin eserlerde ve grup listelerinde bu isim görünür',
      'ay.sifre': 'Şifre',
      'ay.sifre_alt': 'Hesap şifreni değiştir',
      'ay.degistir': 'Değiştir',
      'ay.eposta': 'E-posta Adresi',
      'ay.eposta_alt': 'Hesap e-posta adresini değiştir',
      'ay.hesapsil': 'Hesabımı Sil',
      'ay.hesapsil_alt': 'Tüm verileriniz kalıcı olarak silinir (GDPR)',
      'ay.muzikalan': 'Müzik Alanları',
      'ay.muzikalan_alt': 'Yeni eserlerde hangi alanlar açık gelsin',
      'ay.sahne': 'Sahne Modu',
      'ay.sahne_alt': 'Sahneye çıkarken kullanılan varsayılan ayarlar',
      'ay.tema': 'Varsayılan Tema',
      'ay.tema_alt': 'Sahne modunda açılış teması',
      'ay.hiza': 'Söz Hizalama',
      'ay.hiza_alt': 'Sahne modunda varsayılan metin hizası',
      'ay.orta': 'Orta', 'ay.sol': 'Sol', 'ay.sag': 'Sağ',
      'ay.akor': 'Akor Görünümü',
      'ay.akor_alt': 'Söz yerine akorları göster',
      'ay.grup': 'Grup / Koro',
      'ay.grup_alt': 'Grup üyeliği ve yönetimi',
      'ay.grupyon': 'Grup Yönetimi',
      'ay.grupyon_alt': 'Üyeler, davet linkleri, roller',
      'ay.grupgit': 'Gruba Git →',
      'ay.yonetim': 'Yönetim',
      'ay.yonetim_alt': 'Sadece adminler görebilir',
      'ay.istat': 'İstatistikler',
      'ay.istat_alt': 'Ziyaret ve kullanım istatistikleri',
      'ay.goruntule': 'Görüntüle →',
      'ay.uyeyon': 'Üye Yönetimi',
      'ay.uyeyon_alt': 'Rolleri düzenle, üye ekle/sil',
      'ay.uyeler': 'Üyeler →',
      'ay.oneriler': 'Bekleyen Öneriler',
      'ay.oneriler_alt': 'Onay bekleyen eser önerileri',
      'ay.incele': 'İncele →',
      'ay.temizle': 'Veri Temizleme',
      'ay.temizle_alt': 'Boş ve hatalı kayıtları temizle',
      'ay.temizlebtn': 'Temizle →',
      'ay.onerilerim': 'Önerilerim',
      'ay.onerilerim_alt': 'Gönderdiğiniz eser önerileri ve onay durumları',
      'ay.onerilerimgor': 'Önerilerimi Görüntüle',
      'ay.davet': 'Arkadaşını Davet Et',
      'ay.davet_alt': "Repertuvar'ı müzisyen arkadaşlarınla paylaş",
      'ay.davetlink': 'Davet Linki',
      'ay.kopyala': '📋 Kopyala',
      'ay.paylas': 'Paylaş',
      'ay.diger': 'Diğer',
      'ay.davetgonder': 'E-posta ile Davet Gönder',
      'ay.gonder': 'Gönder',
      'ay.hakkinda': 'Hakkında',
      'ay.uygulama': 'Uygulama',
      'ay.uygulama_alt': 'Türk müziği repertuvar yönetimi',
      'ay.websitesi': 'Web Sitesi',
      'ay.ziyaret': 'Ziyaret Et →',
      'ay.gizlilik': 'Gizlilik Politikası',
      'ay.gizlilik_alt': 'Verilerinizi nasıl koruyoruz',
      'ay.kosullar': 'Kullanım Koşulları',
      'ay.kosullar_alt': 'Hizmet şartlarımız',
      'ay.iptal': 'İptal',
      'ay.kaydet': 'Kaydet',
      'ay.sil': 'Sil',

      'rep.mevcut': 'Mevcut Repertuvarlar',
      'rep.yeni': '+ Yeni',
      'rep.sec': 'Bir repertuvar seçin',
      'rep.yenirep': 'Yeni Repertuvar',
      'rep.ad': 'Repertuvar Adı',
      'rep.tarih': 'Tarih',
      'rep.lokasyon': 'Lokasyon',
      'rep.durum': 'Durum',
      'rep.taslak': 'Taslak',
      'rep.onaylandi': 'Onaylandı',
      'rep.arsiv': 'Arşiv',
      'rep.notlar': 'Notlar',
      'rep.gorunurluk': 'Görünürlük',
      'rep.kisisel': 'Kişisel',
      'rep.kisisel_alt': '— Sadece sen',
      'rep.grup': 'Grup',
      'rep.grup_alt': '— Grubunun üyeleri',
      'rep.genel': 'Genel',
      'rep.genel_alt': '— Herkes görebilir',
      'rep.eserekle': 'Eser Ekle',
      'rep.zatenvar': 'Bu eser zaten bu repertuvarda mevcut',
      'rep.icracilar': 'İcracı Sanatçılar',
      'rep.karar': 'Karar Sesi',
      'rep.makam': 'Makam',
      'rep.degismez_bilgi': '(değişmez, bilgi amaçlı)',
      'rep.degismez': '(değişmez)',
      'rep.esernotu': 'Eser Notu',
      'rep.ekle': 'Ekle',
      'rep.eserduzenle': 'Eseri Düzenle',
      'rep.eserbilgi': 'Eser bilgilerini düzenle (söz, akor, nota…)',
      'rep.ph_ara': 'Repertuvar veya eser adı ara...',
      'rep.ph_ad': 'örn. THM Eserleri Do Akort',
      'rep.ph_yer': 'Sahne adı veya şehir',
      'rep.ph_eserara': 'Eser adı veya besteci ara...',
      'rep.ph_sanatci': 'Sanatçı ekle...',
      'rep.ph_karar': 'La, Do, Si...',
      'rep.ph_not': 'Sahne notu, tempo...',
      'rep.benim': 'Repertuvarlarım',
      'rep.grubun': 'Grubun Repertuvarları',
      'rep.paylasilan': 'Benimle Paylaşılanlar',
      'rep.genelrep': 'Genel Repertuvarlar',
      'rep.eserBirim': 'eser',
      'rep.eserBirimTekil': 'eser',
      'rep.zatenVarKisa': 'zaten var',
      'rep.baskaGrup1': 'Diğer gruplarında',
      'rep.baskaGrup2': 'repertuvar daha var. Grubunu değiştirdiğinde görünürler.',
      'ay.gunduz': '☀️ Gündüz',
      'ay.gece': '🌙 Gece',
      'alan.makam': 'Makam', 'alan.usul': 'Usul', 'alan.olcu': 'Ölçü',
      'alan.tempo': 'Tempo', 'alan.akort': 'Akort', 'alan.karar': 'Karar Sesi',
      'alan.enstruman': 'Enstrüman', 'alan.yore': 'Yöre/Bölge',
      'alan.kaynak': 'Kaynak Kişi', 'alan.derleyen': 'Derleyen',
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

      'ana.hosgeldin': 'Welcome 👋',
      'ana.sahnehazir': 'Stage ready',
      'ana.baslik1': 'Your Best Helper',
      'ana.baslik2': 'On Stage',
      'ana.adim1': 'Pick or add a piece',
      'ana.adim2': 'Build the setlist',
      'ana.adim3': 'Reorder by dragging',
      'ana.adim4': 'Works with a page-turner pedal',
      'ana.repbak': 'Open Setlists →',
      'ana.demo': 'Watch Demo',
      'ana.slogan': 'Focus on the music. Repertuvar.app takes it from there.',
      'ana.pedalnot': 'Works with a Bluetooth page-turner pedal · sold separately',
      'ana.offlinenot': 'Keeps working even if your connection drops.',
      'ana.offline': 'Works offline',
      'ana.pedal': 'Pedal ready',
      'ana.grupsenk': 'Band sync',
      'ana.grupsenk_alt': 'Every change reaches your group instantly.',
      'ana.pdfnota': 'PDF & Sheet Music',
      'ana.pdfnota_alt': 'Sheet music, chords, notes and lyrics in one place.',
      'ana.neler': 'What You Can Do',
      'ana.detay': 'Details →',
      'ana.sonEklenen': 'Recently Added',
      'ana.tumu': 'See all →',
      'ana.ajanda': 'Concert Calendar',
      'ana.yakinda': 'coming soon',
      'ana.eser': 'Pieces',
      'ana.grup': 'Groups',

      'ay.hesap': 'Account',
      'ay.uye': 'Member',
      'ay.adsoyad': 'Full Name',
      'ay.adsoyad_alt': 'This name appears on pieces you add and in group lists',
      'ay.sifre': 'Password',
      'ay.sifre_alt': 'Change your account password',
      'ay.degistir': 'Change',
      'ay.eposta': 'Email Address',
      'ay.eposta_alt': 'Change your account email address',
      'ay.hesapsil': 'Delete My Account',
      'ay.hesapsil_alt': 'All your data is permanently deleted (GDPR)',
      'ay.muzikalan': 'Music Fields',
      'ay.muzikalan_alt': 'Which fields are shown on new pieces',
      'ay.sahne': 'Stage Mode',
      'ay.sahne_alt': 'Defaults used when you go on stage',
      'ay.tema': 'Default Theme',
      'ay.tema_alt': 'Theme used when Stage Mode opens',
      'ay.hiza': 'Lyrics Alignment',
      'ay.hiza_alt': 'Default text alignment in Stage Mode',
      'ay.orta': 'Center', 'ay.sol': 'Left', 'ay.sag': 'Right',
      'ay.akor': 'Chord View',
      'ay.akor_alt': 'Show chords instead of lyrics',
      'ay.grup': 'Group / Choir',
      'ay.grup_alt': 'Group membership and management',
      'ay.grupyon': 'Group Management',
      'ay.grupyon_alt': 'Members, invite links, roles',
      'ay.grupgit': 'Go to Group →',
      'ay.yonetim': 'Admin',
      'ay.yonetim_alt': 'Visible to admins only',
      'ay.istat': 'Statistics',
      'ay.istat_alt': 'Visit and usage statistics',
      'ay.goruntule': 'View →',
      'ay.uyeyon': 'Member Management',
      'ay.uyeyon_alt': 'Edit roles, add or remove members',
      'ay.uyeler': 'Members →',
      'ay.oneriler': 'Pending Submissions',
      'ay.oneriler_alt': 'Pieces awaiting approval',
      'ay.incele': 'Review →',
      'ay.temizle': 'Data Cleanup',
      'ay.temizle_alt': 'Clear empty and broken records',
      'ay.temizlebtn': 'Clean up →',
      'ay.onerilerim': 'My Submissions',
      'ay.onerilerim_alt': 'Pieces you submitted and their approval status',
      'ay.onerilerimgor': 'View My Submissions',
      'ay.davet': 'Invite a Friend',
      'ay.davet_alt': 'Share Repertuvar with your fellow musicians',
      'ay.davetlink': 'Invite Link',
      'ay.kopyala': '📋 Copy',
      'ay.paylas': 'Share',
      'ay.diger': 'Other',
      'ay.davetgonder': 'Send Invite by Email',
      'ay.gonder': 'Send',
      'ay.hakkinda': 'About',
      'ay.uygulama': 'App',
      'ay.uygulama_alt': 'Repertoire management for musicians',
      'ay.websitesi': 'Website',
      'ay.ziyaret': 'Visit →',
      'ay.gizlilik': 'Privacy Policy',
      'ay.gizlilik_alt': 'How we protect your data',
      'ay.kosullar': 'Terms of Use',
      'ay.kosullar_alt': 'Our terms of service',
      'ay.iptal': 'Cancel',
      'ay.kaydet': 'Save',
      'ay.sil': 'Delete',

      'rep.mevcut': 'Your Setlists',
      'rep.yeni': '+ New',
      'rep.sec': 'Select a setlist',
      'rep.yenirep': 'New Setlist',
      'rep.ad': 'Setlist Name',
      'rep.tarih': 'Date',
      'rep.lokasyon': 'Venue',
      'rep.durum': 'Status',
      'rep.taslak': 'Draft',
      'rep.onaylandi': 'Approved',
      'rep.arsiv': 'Archived',
      'rep.notlar': 'Notes',
      'rep.gorunurluk': 'Visibility',
      'rep.kisisel': 'Private',
      'rep.kisisel_alt': '— Only you',
      'rep.grup': 'Group',
      'rep.grup_alt': '— Members of your group',
      'rep.genel': 'Public',
      'rep.genel_alt': '— Anyone can see it',
      'rep.eserekle': 'Add a Piece',
      'rep.zatenvar': 'This piece is already in this setlist',
      'rep.icracilar': 'Performers',
      'rep.karar': 'Tonic',
      'rep.makam': 'Makam',
      'rep.degismez_bilgi': '(read-only, for reference)',
      'rep.degismez': '(read-only)',
      'rep.esernotu': 'Note for This Piece',
      'rep.ekle': 'Add',
      'rep.eserduzenle': 'Edit Piece',
      'rep.eserbilgi': 'Edit the piece itself (lyrics, chords, sheet music…)',
      'rep.ph_ara': 'Search setlists or pieces...',
      'rep.ph_ad': 'e.g. Jazz Standards in C',
      'rep.ph_yer': 'Venue or city',
      'rep.ph_eserara': 'Search by title or composer...',
      'rep.ph_sanatci': 'Add a performer...',
      'rep.ph_karar': 'A, C, B...',
      'rep.ph_not': 'Stage note, tempo...',
      'rep.benim': 'My Setlists',
      'rep.grubun': "Group Setlists",
      'rep.paylasilan': 'Shared With Me',
      'rep.genelrep': 'Public Setlists',
      'rep.eserBirim': 'pieces',
      'rep.eserBirimTekil': 'piece',
      'rep.zatenVarKisa': 'already added',
      'rep.baskaGrup1': 'You have',
      'rep.baskaGrup2': 'more setlists in your other groups. Switch groups to see them.',
      'ay.gunduz': '☀️ Day',
      'ay.gece': '🌙 Night',
      'alan.makam': 'Makam', 'alan.usul': 'Usul', 'alan.olcu': 'Time signature',
      'alan.tempo': 'Tempo', 'alan.akort': 'Tuning', 'alan.karar': 'Tonic',
      'alan.enstruman': 'Instrument', 'alan.yore': 'Region',
      'alan.kaynak': 'Source person', 'alan.derleyen': 'Collector',
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
