/* ═══════════════════════════════════════════════════════════════════════════
   BİYOMETRİ.JS — Face ID / Touch ID / parmak izi ile giriş         2026-10-29

   Kullanıcı (2026-10-29): "Şimdi yüz tanıma eklensin."

   - Yalnız yerel uygulamada (iOS / Android) ve cihazda biyometri kuruluysa çalışır;
     web'de eklenti yok → hiçbir şey görünmez, hiçbir şey değişmez.
   - Eklenti: @capgo/capacitor-native-biometric (window.Capacitor.Plugins.NativeBiometric).
   - Saklama: e-posta + şifre cihazın güvenli kasasında (iOS Keychain / Android Keystore),
     BIOMETRY_ANY erişim denetimiyle: her okumada Face ID / parmak izi istenir
     (getSecureCredentials). Sunucuya hiçbir şey gitmez.
   - Face ID hatası kullanıcıyı ASLA kilitlemez: her durumda şifre formu kalır. Ağ hatasında
     kayıt silinmez (local-first). Kayıtlı şifreyi sunucu reddederse (şifre değişmiş) kayıt silinir.
   - Çıkışta kayıt KALIR (amaç hızlı yeniden giriş); hesap silinince silinir (ayarlar.html).

   localStorage (hepsi ipucu; asıl kaynak kasa):
     r_biyo_soruldu  '1' → girişten sonra bir kez soruldu, bir daha sorma
     r_biyo_eposta   kasadaki hesabın e-postası (düğmede gösterilir; şifre DEĞİL)

   Kullanım: login.html (teklif + "Face ID ile gir"), ayarlar.html (aç/kapa, şifre değişimi, hesap silme).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var SUNUCU = 'app.repertuvar';
  var K_SORULDU = 'r_biyo_soruldu';
  var K_EPOSTA = 'r_biyo_eposta';
  var BIOMETRY_ANY = 2;   // AccessControl: yeni parmak izi eklenince kayıt silinmesin

  function cev(k, tr) { try { return (window.i18n && window.i18n.t) ? window.i18n.t(k, tr) : tr; } catch (e) { return tr; } }
  function dil() { try { return (window.i18n && window.i18n.dil && window.i18n.dil()) || 'tr'; } catch (e) { return 'tr'; } }
  function oku(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function yaz(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function eklenti() {
    var c = window.Capacitor;
    return (c && c.isNativePlatform && c.isNativePlatform() && c.Plugins && c.Plugins.NativeBiometric) || null;
  }

  // Cümle başında yöntem adı küçük harfle kalmasın ("parmak izi ile…" → "Parmak izi ile…"); Türkçede i → İ.
  function buyukBas(s) {
    if (!s) return s;
    return s.charAt(0).toLocaleUpperCase(dil() === 'tr' ? 'tr-TR' : 'en') + s.slice(1);
  }

  // BiometryType: 1 Touch ID, 2 Face ID, 3 parmak izi, 4 yüz tanıma (Android), 5 iris, 6 birden çok, 7 cihaz şifresi
  function yontemAdi(tur) {
    if (tur === 2) return cev('biyo.faceId', 'Face ID');
    if (tur === 1) return cev('biyo.touchId', 'Touch ID');
    if (tur === 3) return cev('biyo.parmakIzi', 'parmak izi');
    if (tur === 4) return cev('biyo.yuzTanima', 'yüz tanıma');
    return cev('biyo.biyometri', 'biyometrik doğrulama');
  }
  // Metindeki {yontem} yerine yöntem adı; istenirse cümle başı büyük harf
  function metin(anahtar, tr, tur, bas) {
    var s = cev(anahtar, tr).replace(/\{yontem\}/g, yontemAdi(tur));
    return bas ? buyukBas(s) : s;
  }

  var _durum = null;
  // { acik: cihazda biyometri kurulu ve kullanılabilir mi, tur: BiometryType }
  async function durum() {
    if (_durum) return _durum;
    var ek = eklenti();
    if (!ek) return (_durum = { acik: false, tur: 0 });
    try {
      var r = await ek.isAvailable({ useFallback: false });
      _durum = { acik: !!(r && r.isAvailable), tur: (r && r.biometryType) || 0 };
    } catch (e) { _durum = { acik: false, tur: 0 }; }
    return _durum;
  }

  // Kasada bu uygulama için kayıtlı kimlik var mı (istem çıkarmaz)
  async function kayitliMi() {
    var ek = eklenti();
    if (!ek) return false;
    try {
      var r = await ek.isCredentialsSaved({ server: SUNUCU });
      var kayitli = !!(r && r.isSaved);
      if (!kayitli) yaz(K_EPOSTA, null);
      return kayitli;
    } catch (e) { return false; }
  }

  // Kasaya yaz (Android'de parmak izi istemi çıkar; iOS'ta çıkmaz). Hata fırlatabilir.
  async function kaydet(eposta, sifre) {
    var ek = eklenti();
    if (!ek) throw new Error('biyometri-yok');
    await ek.setCredentials({
      username: eposta, password: sifre, server: SUNUCU, accessControl: BIOMETRY_ANY,
      title: cev('biyo.neden', "Repertuvar'a giriş"), negativeButtonText: cev('ortak.iptal', 'İptal')
    });
    yaz(K_EPOSTA, eposta);
    yaz(K_SORULDU, '1');
  }

  // Kasadan oku: Face ID / parmak izi istemi çıkar.
  // Döner: { eposta, sifre } ya da { hata: 'iptal' | 'yok' | 'kullanilamiyor' }
  async function kimlikAl() {
    var ek = eklenti();
    if (!ek) return { hata: 'yok' };
    try {
      var r = await ek.getSecureCredentials({
        server: SUNUCU,
        reason: cev('biyo.neden', "Repertuvar'a giriş"),
        title: cev('biyo.neden', "Repertuvar'a giriş"),
        negativeButtonText: cev('biyo.sifreyleGir', 'Şifreyle gir')
      });
      if (r && r.username && r.password) return { eposta: r.username, sifre: r.password };
      return { hata: 'yok' };
    } catch (e) {
      var kod = String((e && e.code) || '');
      if (kod === '21') { await sil(); return { hata: 'yok' }; }            // korumalı kayıt kalmamış
      if (kod === '16' || kod === '11' || kod === '15' || kod === '17') return { hata: 'iptal' };   // vazgeçti / sistem / "Şifreyle gir"
      return { hata: 'kullanilamiyor' };                                     // kilit, izin kapalı, tanınmadı…
    }
  }

  async function sil() {
    yaz(K_EPOSTA, null);
    var ek = eklenti();
    if (!ek) return;
    try { await ek.deleteCredentials({ server: SUNUCU }); } catch (e) {}
  }

  window.biyometri = {
    durum: durum,
    kayitliMi: kayitliMi,
    kaydet: kaydet,
    kimlikAl: kimlikAl,
    sil: sil,
    yontemAdi: yontemAdi,
    metin: metin,
    kayitliEposta: function () { return oku(K_EPOSTA) || ''; },
    soruldu: function () { return oku(K_SORULDU) === '1'; },
    sorulduIsaretle: function () { yaz(K_SORULDU, '1'); },
    sorulduSifirla: function () { yaz(K_SORULDU, null); }
  };
})();
