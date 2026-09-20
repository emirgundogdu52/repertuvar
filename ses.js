/* ses.js — ORTAK SES ÇEKİRDEĞİ (2026-09-20)
 *
 * Neden ayrı dosya: metronom ve (yakında) ritim aracı aynı AudioContext'i
 * paylaşmalı. İki ayrı context açılırsa tarayıcı ikisini ayrı zaman
 * çizelgesinde çalıştırır; loop çalarken metronomu üstüne açtığında
 * birbirlerine göre kayarlar. Tek context = tek saat.
 *
 * Burada SADECE altyapı var: context, ana kazanç (master), sınırlayıcı,
 * ses seviyesi ve iOS/Lockdown resume yönetimi. Klik üretimi, usul
 * kütüphanesi ve zamanlayıcı metronomun kendi dosyasında kalır.
 *
 * Kullanım:
 *   const r = await Ses.hazirla();        // MUTLAKA kullanıcı dokunuşundan
 *   if (!r.ok) { ...uyarı göster... }     // iOS başka türlü izin vermez
 *   osc.connect(Ses.cikis());             // her ses master'a bağlanır
 */
window.Ses = (function () {
  let actx = null, master = null, limiter = null;
  let vol = 0.85;          // 0-1; hazırlanmadan önce de ayarlanabilsin diye burada durur
  let sonHata = null;

  function destekVar() {
    return !!(window.AudioContext || window.webkitAudioContext);
  }

  function kur() {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain();
    master.gain.value = vol;
    limiter = actx.createDynamicsCompressor();   // seviye yüksekken çatlamasın
    limiter.threshold.value = -8; limiter.ratio.value = 6;
    limiter.attack.value = 0.002; limiter.release.value = 0.12;
    master.connect(limiter); limiter.connect(actx.destination);
  }

  /* Sesi çalmaya hazır hale getirir. Kullanıcı dokunuşu içinden çağrılmalı.
   * Dönen değer: {ok:true} ya da {ok:false, sebep:'destekyok'|'engellendi'}
   *
   * Eskiden buradaki resume() try/catch'siz duruyordu: Lockdown Mode açık
   * Safari'de reddediliyor, fonksiyon sessizce ölüyor, düğme tepkisiz
   * görünüyordu. Artık hata yakalanıp çağırana bildiriliyor.
   */
  async function hazirla() {
    if (!destekVar()) { sonHata = 'destekyok'; return { ok: false, sebep: 'destekyok' }; }
    try {
      if (!actx) kur();
      if (actx.state === 'suspended') await actx.resume();   // iOS: dokunuş şart
      if (actx.state !== 'running') { sonHata = 'engellendi'; return { ok: false, sebep: 'engellendi' }; }
      sonHata = null;
      return { ok: true };
    } catch (e) {
      sonHata = 'engellendi';
      return { ok: false, sebep: 'engellendi', hata: e };
    }
  }

  function ctx()   { return actx; }
  function cikis() { return master; }          // sesler buraya bağlanır
  function zaman() { return actx ? actx.currentTime : 0; }
  function calisiyorMu() { return !!actx && actx.state === 'running'; }
  function sonSorun()    { return sonHata; }

  /* Ses seviyesi çalarken de anında etki etsin; context henüz yoksa
   * değeri saklayıp kurulumda uygular. */
  function sesSeviyesi(v) {
    vol = Math.min(1, Math.max(0, v));
    if (master && actx) master.gain.setTargetAtTime(vol, actx.currentTime, 0.01);
    return vol;
  }
  function seviye() { return vol; }

  /* Arka plandan dönünce context askıya alınmış olabiliyor (özellikle iOS).
   * Sessizce geri açmayı dener; başarısız olursa kullanıcı tekrar başlatır. */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && actx && actx.state === 'suspended') {
      actx.resume().catch(() => {});
    }
  });

  return { hazirla, ctx, cikis, zaman, sesSeviyesi, seviye, calisiyorMu, destekVar, sonSorun };
})();
