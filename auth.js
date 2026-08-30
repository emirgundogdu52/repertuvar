// auth.js — tüm sayfalarda kullanılan auth yardımcı fonksiyonları
var SUPA_URL = 'https://ehytkzxdhjyjuubizdnl.supabase.co';
var SUPA_KEY = 'sb_publishable_f_WsYxzN06B5dGROrkGyPQ_UDxKSbtO';

// ── 2026-08-30: MÜZİK ALANLARI ────────────────────────────────────────────
// (Önceki "gelenek" yaklaşımı kaldırıldı: kullanıcıyı "Türk müziği / Batı
// müziği" diye sınıflandırıyordu. İki sorunu vardı — kimlik dayatması ve
// "Batı'yı seçersem türkü ekleyemez miyim?" korkusu. Yeni ilke: müzisyeni
// sınıflandırma, ALANLARI yapılandır.)
//
// Buradaki liste yalnızca YENİ eserlerin başlangıç görünümü. Mevcut eserler
// kendi `active_music_fields` değerini taşır; bu ayar onları etkilemez.
async function varsayilanAlanlariTazele() {
  const uid = getUserId();
  if (!uid) return;
  try {
    const r = await fetch(SUPA_URL + '/rest/v1/profiles?id=eq.' + uid + '&select=default_music_fields', {
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + (getToken() || '') },
      signal: AbortSignal.timeout(6000)
    });
    if (!r.ok) return;
    const j = await r.json();
    const g = j[0] && j[0].default_music_fields;
    if (Array.isArray(g) && g.length) {
      localStorage.setItem('defaultMusicFields', JSON.stringify(g));
    }
  } catch (e) { /* alınamazsa yerel değer kullanılır */ }
}

function getToken() { return localStorage.getItem('sb_token'); }
function getUser() {
  try { return JSON.parse(localStorage.getItem('sb_user')); } catch(e) { return null; }
}
function getUserId() { return getUser()?.id || null; }
function getUserName() {
  const u = getUser();
  return u?.user_metadata?.full_name || u?.email?.split('@')[0] || 'Kullanıcı';
}
function getGroupId() {
  return localStorage.getItem('user_group_id') || null;
}

// ── AKOR YAZIM SİSTEMİ — ORTAK ÇEVİRİCİ (2026-08-06) ──────────────────────
// İki yazım: A B C (harf) ve Do Re Mi (solfej).
// MUTLAK KURAL — DEPOLAMA HER ZAMAN HARFTİR: ton kaydırma motoru
// (transposeChordPro), akor çizici ve sahne gösterimi harf bekliyor. Solfej
// yalnızca GÖSTERİM/GİRİŞ katmanında yaşar; veriye asla solfej yazılmaz.
// Burada duruyor çünkü hem eserler.html hem stage.html kullanıyor — aynı işi
// iki dosyada ayrı yazmanın bedeli 2026-08-05'te trMatch ile görülmüştü.
// Çeviri YALNIZCA köşeli parantez içindeki simgelere uygulanır; söz metnine,
// akor dışı hiçbir şeye dokunulmaz. "[Bb/D]" gibi bas notalı yazımda iki taraf
// da çevrilir, "m7 / sus4 / add9" gibi ekler olduğu gibi korunur.
var _AKOR_HARF   = { C:'Do', D:'Re', E:'Mi', F:'Fa', G:'Sol', A:'La', B:'Si' };
var _AKOR_SOLFEJ = { Do:'C', Re:'D', Mi:'E', Fa:'F', Sol:'G', La:'A', Si:'B' };

function _cevirSimge(tok, yon) {
  var parcala = function(t) {
    var m;
    if (yon === 'solfej') {
      m = t.match(/^([A-G])([#b]?)(.*)$/);
      return m ? (_AKOR_HARF[m[1]] + m[2] + m[3]) : t;
    }
    m = t.match(/^(Do|Re|Mi|Fa|Sol|La|Si)([#b]?)(.*)$/);
    return m ? (_AKOR_SOLFEJ[m[1]] + m[2] + m[3]) : t;
  };
  return String(tok).split('/').map(parcala).join('/');
}

function cevirAkorMetni(metin, yon) {
  return (metin || '').replace(/\[([^\]]*)\]/g, function(tam, ic) {
    return '[' + _cevirSimge(ic.trim(), yon) + ']';
  });
}

// Tercih KULLANICI BAZLI anahtar (ortak anahtar tuzağı için bkz. 2026-08-01).
// Eser düzenleme ekranında seçilen yazım sahnede de geçerli olsun diye tek anahtar.
function getAkorYazim() {
  try { return localStorage.getItem('akorYazim:' + (getUserId() || 'anon')) || 'abc'; }
  catch(e) { return 'abc'; }
}
function setAkorYazim(yon) {
  try { localStorage.setItem('akorYazim:' + (getUserId() || 'anon'), yon === 'solfej' ? 'solfej' : 'abc'); }
  catch(e) {}
}
// Gösterim kısayolu: kayıtlı harf metnini kullanıcının tercihine çevirir.
function akorGoster(metin) {
  return getAkorYazim() === 'solfej' ? cevirAkorMetni(metin, 'solfej') : (metin || '');
}
try {
  window.cevirAkorMetni = cevirAkorMetni;
  window.getAkorYazim = getAkorYazim;
  window.setAkorYazim = setAkorYazim;
  window.akorGoster = akorGoster;
} catch(e) {}

// ── ÇOKLU GRUP ÜYELİĞİ (2026-08-06) ────────────────────────────────────────
// SÖZLEŞME DEĞİŞİKLİĞİ: `profiles.group_id` artık "üyelik" DEĞİL, yalnızca
// AKTİF/SEÇİLİ GRUP anlamına gelir. Üyeliğin TEK kaynağı `group_members`.
// Sebep (2026-08-05 olayı): bir kullanıcı birden fazla gruba üye olabilmeli;
// eskiden group_members'a satır eklenince trigger profiles.group_id'yi
// koşulsuz eziyordu ve kişi kendi grubunu göremez oluyordu. Trigger düzeltildi
// (artık yalnızca NULL ise yazıyor); bu blok da arayüz tarafını tamamlıyor.
//
// getMyGroups()      → localStorage'daki liste (ağ beklemeden, anında çizim için)
// loadMyGroups()     → sunucudan tazeler, aktif grup geçersizse kendini onarır
// setActiveGroup(id) → aktif grubu değiştirir (profiles PATCH + sync + olay)
function getMyGroups() {
  try { return JSON.parse(localStorage.getItem('user_groups')) || []; } catch(e) { return []; }
}

async function loadMyGroups() {
  const uid = getUserId();
  if (!uid) return [];
  const h = { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + (getToken() || '') };
  try {
    const mr = await fetch(SUPA_URL + '/rest/v1/group_members?user_id=eq.' + uid + '&select=group_id,role,status', {
      headers: h, signal: AbortSignal.timeout(6000)
    });
    if (!mr.ok) return getMyGroups();          // ağ/RLS sorunu — eski listeyi koru
    const rows = await mr.json();
    const active = (rows || []).filter(m => !m.status || m.status === 'active');
    if (!active.length) {
      localStorage.setItem('user_groups', '[]');
      return [];
    }
    const ids = active.map(m => m.group_id).filter(Boolean);
    let nameMap = {};
    try {
      const gr = await fetch(SUPA_URL + '/rest/v1/groups?id=in.(' + ids.join(',') + ')&select=id,name', {
        headers: h, signal: AbortSignal.timeout(6000)
      });
      if (gr.ok) (await gr.json()).forEach(g => { nameMap[g.id] = g.name; });
    } catch(e) {}
    const list = active.map(m => ({
      id: m.group_id,
      name: nameMap[m.group_id] || 'Grup',
      role: m.role || 'member'
    })).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));
    localStorage.setItem('user_groups', JSON.stringify(list));

    // KENDİNİ ONARMA: aktif grup boşsa ya da artık üye OLMADIĞIN bir gruba
    // işaret ediyorsa (gruptan çıkarıldın, grup silindi), ilk üyeliğe düş.
    const cur = getGroupId();
    if (!cur || !list.some(g => g.id === cur)) {
      await setActiveGroup(list[0].id, { silent: true, noSync: true });
    }
    try { window.dispatchEvent(new CustomEvent('groups-loaded', { detail: { groups: list } })); } catch(e) {}
    return list;
  } catch(e) { console.warn('[auth] loadMyGroups:', e); return getMyGroups(); }
}

async function setActiveGroup(gid, opts) {
  opts = opts || {};
  const uid = getUserId();
  if (!uid || !gid) return false;
  try {
    // return=representation: PATCH sessizce 0 satır yazarsa (RLS) bunu GÖRELİM.
    // 2026-08-01 dersi: yanıtı okunmayan profiles PATCH'i "başarılı" sanılıyordu.
    const r = await fetch(SUPA_URL + '/rest/v1/profiles?id=eq.' + uid, {
      method: 'PATCH',
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + (getToken() || ''),
                 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify({ group_id: gid }),
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) throw new Error(await r.text());
    if (!(await r.json()).length) throw new Error('0 satır güncellendi');
    localStorage.setItem('user_group_id', gid);
    // Önbellek hâlâ ESKİ grubun repertuvarlarını tutuyor; sync'in replaceAll'ı
    // kapsam dışı kalanları siler. Bu yüzden geçiş sync bitmeden tamamlanmış
    // sayılmaz (noSync yalnızca açılıştaki sessiz onarımda kullanılır).
    if (!opts.noSync && typeof window.syncOfflineData === 'function') {
      try { await window.syncOfflineData(); } catch(e) {}
    }
    try { window.dispatchEvent(new CustomEvent('group-changed', { detail: { groupId: gid } })); } catch(e) {}
    return true;
  } catch(e) { console.warn('[auth] setActiveGroup:', e); return false; }
}

// ── Otomatik token yenileme ──
// Access token 1 saatte doluyor. Bu fonksiyon token'ın exp'ine bakar; dolmuş
// ya da <60sn kalmışsa refresh token ile yeniler. Refresh token'ı önce
// Supabase'in standart anahtarından (sb-<ref>-auth-token JSON'u), yoksa eski
// sb_refresh anahtarından okur. Data isteklerinden önce çağrılmalı.
//
// (2026-07-30) SÖZLEŞME — eskiden bu fonksiyon HER başarısızlıkta ölü token'ı
// geri veriyordu; yenileme başarısı ile başarısızlığı çağıran hiçbir şekilde
// ayırt edemiyordu. İstek yine de yola çıkıyor, RLS altında 0 satır ya da 401
// dönüyor, kullanıcı hata değil BOŞ LİSTE görüyordu. Artık:
//   ensureValidToken()       → string | null   (eski sözleşme; çağrı yerleri bozulmasın)
//   ensureValidTokenState()  → { token, ok, stale, reason, status }
// Ayrım:
//   ok:true                 → token taze/yenilendi
//   stale:true, token dolu  → GEÇİCİ sorun (ağ, timeout, çevrimdışı, 5xx).
//                             Oturum ölü DEĞİL; eski token'la devam edilir.
//   token:null              → KALICI sorun; auth:expired olayı yayılır.
//
// MUTLAK KURAL (bunu tüketecek olan 3. ve 5. adımlar için):
// navigator.onLine === false iken, ağ hatası/timeout'ta, veya stage.html'de
// ASLA istek engellenmez ve ASLA logout/yönlendirme yapılmaz. Uygulama
// local-first; sahnede sinyalsiz kalan müzisyen giriş ekranına atılamaz.
// Oturum yalnızca sunucunun KESİN reddinde sonlandırılır — bu dosyada o durum
// reason:'server_rejected' (refresh isteğine 400/401/403) olarak işaretlenir.
// stale:true veya reason:'offline'/'network'/'server_error' asla logout sebebi
// değildir.
var _refreshInFlight = null;
var _expiredNotified = false; // auth:expired her "ölü oturum" epizodunda bir kez

function _authState(token, ok, stale, reason, status) {
  return { token: token || null, ok: !!ok, stale: !!stale, reason: reason, status: status || 0 };
}
// Yalnızca KALICI başarısızlıkta çağrılır. Dinleyicisi olmasa da zararsız —
// bu adımda sadece sinyali üretiyoruz, davranışı 3/4/5 değiştirecek.
function _emitAuthExpired(reason, status) {
  if (_expiredNotified) return;         // aynı epizotta tekrar tekrar yayma (yönlendirme döngüsü olmasın)
  _expiredNotified = true;
  console.warn('[auth] oturum yenilenemedi (' + reason + (status ? ' ' + status : '') + ') — istekler yetkisiz gidiyor');
  try {
    window.dispatchEvent(new CustomEvent('auth:expired', {
      detail: { reason: reason, status: status || 0, serverRejected: reason === 'server_rejected' }
    }));
  } catch (e) {}
}
function _decodeExp(jwt) {
  try {
    var payload = JSON.parse(atob(jwt.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : 0;
  } catch (e) { return 0; }
}
function _findRefreshToken() {
  try {
    var ref = SUPA_URL.replace('https://', '').split('.')[0];
    var raw = localStorage.getItem('sb-' + ref + '-auth-token');
    if (raw) {
      var obj = JSON.parse(raw);
      if (obj.refresh_token) return obj.refresh_token;
    }
  } catch (e) {}
  return localStorage.getItem('sb_refresh') || null;
}
function _persistNewSession(data) {
  if (data.access_token) localStorage.setItem('sb_token', data.access_token);
  if (data.refresh_token) localStorage.setItem('sb_refresh', data.refresh_token);
  if (data.user) localStorage.setItem('sb_user', JSON.stringify(data.user));
  try {
    var ref = SUPA_URL.replace('https://', '').split('.')[0];
    var key = 'sb-' + ref + '-auth-token';
    var raw = localStorage.getItem(key);
    var obj = raw ? JSON.parse(raw) : {};
    obj.access_token = data.access_token;
    obj.refresh_token = data.refresh_token;
    if (data.expires_in) obj.expires_at = Math.floor(Date.now() / 1000) + data.expires_in;
    localStorage.setItem(key, JSON.stringify(obj));
  } catch (e) {}
}
// force:true — exp'e bakma, koşulsuz yenile. 401 yakalayıcısı (4) kullanır:
// token kâğıt üstünde taze görünse de sunucu reddetmiş olabilir (hesap silinmiş,
// JWT secret döndürülmüş, oturum iptal edilmiş).
async function ensureValidTokenState(force) {
  var token = localStorage.getItem('sb_token');
  // Hiç oturum yok — bu "süresi doldu" değil, girişsizlik. auth:expired YAYMA;
  // bu durumu requireAuth ele alıyor.
  if (!token) return _authState(null, false, false, 'no_token');
  var exp = _decodeExp(token);
  if (!force && exp && exp - Date.now() > 60000) {     // 60sn'den fazla var — taze
    _expiredNotified = false;                          // sağlıklı oturum: mandalı sıfırla
    return _authState(token, true, false, 'fresh');
  }
  if (_refreshInFlight) return _refreshInFlight;      // zaten yenileniyor
  var refresh = _findRefreshToken();
  if (!refresh) {                                     // yenileyemiyoruz — kalıcı
    _emitAuthExpired('no_refresh', 0);
    return _authState(null, false, false, 'no_refresh');
  }
  // Çevrimdışıyken denemenin anlamı yok: 8sn timeout'u boşuna bekleriz ve daha
  // önemlisi bunu "oturum öldü" sanmak yasak (MUTLAK KURAL). Eski token'la devam.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return _authState(token, false, true, 'offline');
  }
  _refreshInFlight = (async function() {
    try {
      var r = await fetch(SUPA_URL + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { apikey: SUPA_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
        signal: AbortSignal.timeout(8000)
      });
      if (!r.ok) {
        // 400/401/403 → sunucu refresh token'ı KESİN reddetti. GoTrue geçersiz/
        // iptal edilmiş refresh token için invalid_grant'i 400 ile döndürür, bu
        // yüzden 400 de kalıcı sayılır; status detayda taşınıyor ki 5. adım
        // isterse yalnız 401/403'e daha sert davranabilsin.
        if (r.status === 400 || r.status === 401 || r.status === 403) {
          _emitAuthExpired('server_rejected', r.status);
          return _authState(null, false, false, 'server_rejected', r.status);
        }
        // 5xx/429 → sunucu sorunu. Oturum ölü değil, geçici.
        return _authState(token, false, true, 'server_error', r.status);
      }
      var data = await r.json();
      _persistNewSession(data);
      _expiredNotified = false;
      console.log('[auth] token yenilendi');
      return _authState(data.access_token || token, true, false, 'refreshed');
    } catch (e) {
      // Ağ hatası / timeout / abort — KESİN ret DEĞİL. Eski token'la devam.
      return _authState(token, false, true, 'network');
    } finally {
      _refreshInFlight = null;
    }
  })();
  return _refreshInFlight;
}
// Eski sözleşme (string | null) — mevcut çağrı yerleri 'Bearer ' + sonuç yapıyor,
// bu yüzden şekli korunuyor. Ayrıntı gerekenler ensureValidTokenState() kullanır.
async function ensureValidToken() {
  var st = await ensureValidTokenState();
  return st.token;
}
window.ensureValidToken = ensureValidToken;
window.ensureValidTokenState = ensureValidTokenState;

// ── SAYFA MUAFİYETİ ──
// stage.html sahne görünümü: müzisyen çalarken ekranda. Orada ASLA istek
// engellenmez, ASLA yönlendirme yapılmaz — sinyal gitse bile eser ekranda kalır.
function isStagePage() {
  try { return /(^|\/)stage\.html$/i.test(location.pathname); } catch (e) { return false; }
}
window.isStagePage = isStagePage;

// Yönlendirme/engelleme yapmanın yasak olduğu durumlar tek yerde (MUTLAK KURAL).
// 5. adım (requireAuth) da bunu kullanacak.
function authGuardSuspended() {
  if (isStagePage()) return 'stage';
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
  return null;
}
window.authGuardSuspended = authGuardSuspended;

// ── Authorization başlığı okuma/yazma yardımcıları ──
function _authzOf(input, init) {
  try {
    var h = init && init.headers;
    if (h instanceof Headers) { var v = h.get('Authorization'); if (v) return v; }
    else if (h && typeof h === 'object') { var v2 = h.Authorization || h.authorization; if (v2) return v2; }
    if (input && typeof input !== 'string' && input.headers && typeof input.headers.get === 'function') {
      return input.headers.get('Authorization') || '';
    }
  } catch (e) {}
  return '';
}
// Varsayılan: YALNIZCA zaten Authorization taşıyan istekler güncellenir.
// addIfMissing:true ise başlığı olmayana yenisi EKLENİR — çağıran bunu yalnızca
// veri uçları (/rest/v1, /storage) için geçirir. /auth/v1/signup, /recover,
// /verify gibi uçlara bayat kullanıcı token'ı iliştirmek girişi bozardı.
function _setAuthz(init, value, addIfMissing) {
  try {
    if (!init) return false;
    var h = init.headers;
    if (h instanceof Headers) {
      if (!h.has('Authorization') && !addIfMissing) return false;
      h.set('Authorization', value); return true;
    }
    if (h && typeof h === 'object') {
      if (!h.Authorization && !h.authorization && !addIfMissing) return false;
      h.Authorization = value;
      if (h.authorization) delete h.authorization;
      init.headers = h; return true;
    }
  } catch (e) {}
  return false;
}
// Paylaşılan referans verisi (works, makams, regions, composers, lyricists,
// public_profiles) bilerek anon anahtarla çekiliyor — 2026-07-17'de stage.html'de
// token dolunca eser listesi boşalıp eser adı yerine numara çıktığı için. Bu
// istekler oturumdan bağımsız: ne token yazılır, ne engellenir, ne 401 sayılır.
function _isAnonAuthz(v) { return !!v && v === 'Bearer ' + SUPA_KEY; }

// (3) Gönderilmeyen istek için sentetik yanıt. Throw ETMİYORUZ: çağrı yerlerinin
// çoğu .catch()'siz; throw yakalanmamış promise reddi üretirdi. 401 + JSON gövde
// mevcut `if (!r.ok)` dallarıyla uyumlu.
function _blockedResponse(reason) {
  return new Response(
    JSON.stringify({ code: 'PGRST301', message: 'Oturum geçersiz — istek gönderilmedi.', reason: reason }),
    { status: 401, statusText: 'Unauthorized', headers: { 'Content-Type': 'application/json' } }
  );
}

// (4) Oturumu sonlandır. Yalnızca sunucunun KESİN reddinde çağrılır ve
// authGuardSuspended() geçerliyse hiçbir şey yapmaz.
var _sessionEndHandled = false;
function endDeadSession(reason, status) {
  if (_sessionEndHandled) return;
  var suspended = authGuardSuspended();
  if (suspended) {
    console.warn('[auth] oturum ölü (' + reason + ') ama ' + suspended + ' — yönlendirme YOK');
    return;
  }
  _sessionEndHandled = true;
  console.warn('[auth] oturum sonlandırılıyor (' + reason + (status ? ' ' + status : '') + ')');
  try { logoutSilent(); } catch (e) {}
  try { location.replace('login.html?expired=1'); } catch (e) {}
}
window.endDeadSession = endDeadSession;

// ── TÜM SUPABASE FETCH'LERİNE OTOMATİK TOKEN YENİLEME ──
// window.fetch'i sarmalıyoruz: Supabase'e giden her istek, gitmeden önce
// taze token alır. Böylece sayfaların kendi fetch'leri (token yenilemeyi
// bilmeyenler dahil) 401 almaz. Tek noktadan tüm çağrılar korunur.
//
// (2026-07-30) Buraya iki davranış eklendi:
//   (3) Token KALICI olarak yenilenemiyorsa kullanıcı token'lı istek hiç
//       gönderilmez — yetki hatasının "boş liste"ye dönüşmesi böyle kesiliyor.
//   (4) Gerçek 401 gelirse bir kez zorla yenile + bir kez tekrar dene; yenileme
//       de kalıcı olarak başarısızsa oturumu sonlandır.
// Her ikisi de MUTLAK KURAL'a tabi: çevrimdışıyken, ağ hatasında ve stage.html'de
// ne engelleme ne yönlendirme olur. /auth/v1/* tamamen muaf — requireAuth kendi
// kararını verebilsin (5. adımın alanı).
if (!window._supaFetchPatched) {
  window._supaFetchPatched = true;
  var _origFetch = window.fetch.bind(window);
  window.fetch = async function(input, init) {
    var url = '', isSupa = false, isTokenReq = false, isData = false, authz = '';
    try {
      url = (typeof input === 'string') ? input : (input && input.url) || '';
      isSupa = url.indexOf('supabase.co') !== -1;
      isTokenReq = url.indexOf('/auth/v1/token') !== -1;  // refresh'in KENDİSİ — sonsuz döngü olmasın
      // Engelleme (3) ve 401 politikası (4) YALNIZCA veri uçlarında. /auth/v1/user
      // ve /auth/v1/logout token tazelemesini almaya devam eder (requireAuth buna
      // güveniyor) ama kendi 401'ini kendi yorumlar — orası 5. adımın alanı.
      isData = isSupa && url.indexOf('/auth/v1/') === -1;
    } catch (e) {}
    if (!isSupa || isTokenReq) return _origFetch(input, init);

    try {
      authz = _authzOf(input, init);
      if (!_isAnonAuthz(authz) && typeof ensureValidTokenState === 'function') {
        var st = await ensureValidTokenState();
        if (st.token) {
          // Taze ya da stale (çevrimdışı/ağ/5xx) — her iki durumda da istek gider.
          // Veri ucunda başlık hiç yoksa da EKLENİR: authHeaders() token yokken
          // Authorization koymuyor, ama refresh token'dan taze token türetilmişse
          // istek onu taşımalı — yoksa sessizce anon rolüyle gider.
          _setAuthz(init, 'Bearer ' + st.token, isData);
        } else if (isData) {
          // Veri ucu + oturum KALICI olarak ölü ya da token hiç yok.
          // 'no_token' de buraya dahil: requireAuth her sayfanın başında çalışıyor,
          // yani buraya kadar gelip token'ı OLMAYAN kullanıcı girişsiz biri değil,
          // token'ı düşmüş/silinmiş kullanıcıdır — "süreniz doldu" doğru mesaj.
          // Başlıksız istek de [B] sayılır: _isAnonAuthz() yalnızca AÇIKÇA
          // 'Bearer ' + SUPA_KEY taşıyanı anon sayar (bkz. anonHeaders()).
          var suspended = authGuardSuspended();
          if (suspended) {
            console.warn('[auth] oturum ölü (' + st.reason + ') ama ' + suspended + ' — istek engellenmiyor: ' + url);
          } else {
            console.warn('[auth] istek gönderilmedi (' + st.reason + '): ' + url);
            endDeadSession(st.reason, st.status);
            return _blockedResponse(st.reason);
          }
        }
      }
    } catch (e) { /* patch hatası olsa bile isteği engelleme */ }

    var res = await _origFetch(input, init);

    // (4) Merkezî 401. SADECE 401 — PostgREST'te 403 "RLS izin vermedi" demek,
    // oturum sorunu değil; 403'te logout etmek masum kullanıcıyı atardı.
    try {
      if (isData && res.status === 401 && !_isAnonAuthz(authz) && !authGuardSuspended()) {
        var st2 = await ensureValidTokenState(true); // zorla yenile
        var bodyOk = !init || init.body == null || typeof init.body === 'string';
        if (st2.ok && st2.token && bodyOk && _setAuthz(init, 'Bearer ' + st2.token, true)) {
          console.warn('[auth] 401 — token yenilendi, istek bir kez tekrarlanıyor: ' + url);
          res = await _origFetch(input, init);
        } else if (!st2.token && !st2.stale) {
          // Yenileme KALICI olarak başarısız (sunucu reddetti / refresh yok) →
          // 401 kesin. Yenileme geçici sebeple (ağ/5xx) başarısızsa DOKUNMA.
          endDeadSession('rest_401_' + st2.reason, 401);
        }
      }
    } catch (e) {}
    return res;
  };
}


// Uygulama açık kalırken de token dolabilir (1 saatlik ömür). requireAuth yalnızca
// açılışta çalıştığından, açıkken dolan token kimse tarafından yenilenmiyordu.
// Bu zamanlayıcı token'ı periyodik olarak (görünür sekmede) sessizce tazeler.
if (!window._tokenRefreshTimer) {
  window._tokenRefreshTimer = setInterval(function() {
    if (typeof document !== 'undefined' && document.hidden) return; // arka plandaysa boşuna deneme
    if (localStorage.getItem('sb_token') && typeof ensureValidToken === 'function') {
      ensureValidToken().catch(function(){});
    }
  }, 10 * 60 * 1000); // 10 dakikada bir kontrol; ensureValidToken sadece <60sn kalınca gerçekten yeniler
}
// Sekme tekrar öne gelince de bir kez kontrol et (uzun süre arka planda kaldıysa)
if (typeof document !== 'undefined' && !window._tokenVisListener) {
  window._tokenVisListener = true;
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden && localStorage.getItem('sb_token') && typeof ensureValidToken === 'function') {
      ensureValidToken().catch(function(){});
    }
  });
}

// ── (1) BAŞLIK POLİTİKASI ──
// Kullanıcıya özel istekler için başlık. FALLBACK YOK — bilerek.
// Eskiden token yok/ölü iken 'Bearer ' + SUPA_KEY gidiyordu. Bu iki şeyi birden
// bozuyordu:
//   (a) RLS altında istek 0 satır döndürüyor, kullanıcı hata değil BOŞ LİSTE
//       görüyordu ("Henüz bir eser önermediniz", "Bekleyen eser yok 🎉");
//   (b) _isAnonAuthz() bu isteği "paylaşılan referans verisi" sanıp hem engelleme
//       kapısından (3) hem 401 politikasından (4) muaf tutuyordu — yani ölü
//       oturumu görünür kılmak için yazdığımız mekanizmayı tam da en çok
//       gerektiği yerde devre dışı bırakıyordu.
// Artık ölü/eksik oturum görünür 401 üretir.
// Token yoksa Authorization HİÇ konmaz — boş değerli bozuk bir başlık değil.
// Başlıksız istek yine [B]'dir: yama veri ucunda hem token ekler hem kapıya tabi
// tutar (bkz. _setAuthz addIfMissing ve engelleme dalı).
// ── Türkçe duyarsız arama normalizasyonu ───────────────────────────────────
// (2026-08-05) "Hüsnü" yazan bir kaydı "Husnu" diye arayınca bulunamıyordu.
// İki ayrı tuzak var:
//   1. Aksan: ü/ö/ç/ş/ğ/â/î/û — kullanıcı çoğu zaman ASCII yazıyor (klavye,
//      alışkanlık, ya da kaydı giren kişi öyle yazmış).
//   2. NOKTALI/NOKTASIZ i: JavaScript'in toLowerCase()'i Türkçe bilmez —
//      "I" harfini "ı" değil "i" yapar, "İ" içinse birleşik bir karakter üretir.
//      Bu yüzden toLocaleLowerCase('tr') da tek başına yetmiyor: doğru küçültür
//      ama "ı" ile "i" hâlâ farklı kalır, yani "Işık" araması "isik"i bulmaz.
// Çözüm: her iki tarafı da (aranan metin + aranan alan) düz ASCII'ye indirmek.
// Noktalama ve boşluk da atılıyor — "Çeşm-i Siyahım" kaydı "cesmi" ile bulunur.
// NFD ayrıştırması Türkçe dışı aksanları da (é, ï gibi Hollandaca adlar) kapsar.
// NOT: repertoires.js'teki makamNorm() bilerek AYRI kalıyor — o, SQL'deki
// makam_norm() ile bire bir aynı sonucu vermek zorunda; bu ise arayüz araması.
const _TR_FOLD = {'Â':'A','Î':'I','Û':'U','â':'a','î':'i','û':'u','İ':'I','ı':'i',
                  'Ş':'S','ş':'s','Ğ':'G','ğ':'g','Ü':'U','ü':'u','Ö':'O','ö':'o',
                  'Ç':'C','ç':'c'};
function trNorm(t){
  return (t||'').split('').map(c => _TR_FOLD[c] || c).join('')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]/g,'');
}
// Aranan metin boşsa her kayıt eşleşir (süzgeç yok demektir).
function trMatch(haystack, query){
  const q = trNorm(query);
  return !q || trNorm(haystack).includes(q);
}
window.trNorm = trNorm; window.trMatch = trMatch;

function authHeaders() {
  const token = getToken();
  const h = { 'apikey': SUPA_KEY, 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
}

// Paylaşılan referans verisi (works liste okuması, makams, regions, composers,
// lyricists, public_profiles) için kanonik başlık — bilerek anon. _isAnonAuthz()
// tam bu değeri tanıyıp isteği oturum mantığının tamamen dışında tutar; bu
// istekler ne token alır, ne engellenir, ne 401 sayılır.
// (2026-07-17: token dolunca stage.html'de eser adı yerine numara çıkıyordu.)
function anonHeaders() {
  return {
    'apikey': SUPA_KEY,
    'Authorization': 'Bearer ' + SUPA_KEY,
    'Content-Type': 'application/json'
  };
}

// ── BEKLEYEN DAVETİ TÜKET (2026-08-06) ─────────────────────────────────────
// KUSUR: login.html davet token'ını `pending_invite`e yazıyor, ama ZATEN GİRİŞLİ
// bir kullanıcı davet linkine tıklarsa sayfa hemen index.html'e yönlendiriyordu
// ve redeem_invite HİÇ çağrılmıyordu — davet localStorage'da sonsuza kadar asılı
// kalıyor, kişi gruba katılamıyordu. Bu süpürücü, hangi sayfaya düşerse düşsün
// bekleyen daveti kullanır. Ağ isteği YALNIZCA anahtar doluysa yapılır.
async function redeemPendingInvite() {
  const tk = localStorage.getItem('pending_invite');
  if (!tk || !getToken()) return null;
  try {
    const r = await fetch(SUPA_URL + '/rest/v1/rpc/redeem_invite', {
      method: 'POST',
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + getToken(),
                 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: tk }),
      signal: AbortSignal.timeout(8000)
    });
    const d = await r.json().catch(() => null);
    localStorage.removeItem('pending_invite');   // tek deneme — döngüye girmesin
    if (d && d.ok === true) {
      await loadMyGroups();                      // yeni üyelik listeye girsin
      try { window.dispatchEvent(new CustomEvent('invite-redeemed', { detail: d })); } catch(e) {}
    }
    return d;
  } catch(e) {
    console.warn('[auth] redeemPendingInvite:', e);
    return null;   // anahtar DURUYOR — ağ hatasıysa bir sonraki sayfada denenir
  }
}

// ── SON GÖRÜLME (2026-08-06) ──────────────────────────────────────────────
// Uygulamada hiçbir kullanım ölçümü yoktu; Yönetim sayfası yalnızca satır
// sayıyordu. Bu en ucuz ölçüm: profiles.last_seen_at, kullanıcı başına GÜNDE
// BİR KEZ güncelleniyor ⇒ "son 24 saat / 7 gün / 30 günde kaç kişi girdi"
// sorusu cevaplanıyor, ek tablo yok, büyüme yok, çerez/rıza gerekmiyor
// (giriş yapmış kullanıcının kendi kaydı).
// Sessiz çalışır: hata olursa yutulur, hiçbir akışı bloklamaz.
function pingLastSeen() {
  var uid = getUserId();
  if (!uid) return;
  var bugun = new Date().toISOString().slice(0, 10);
  var anahtar = 'lastSeen:' + uid;
  try { if (localStorage.getItem(anahtar) === bugun) return; } catch(e) {}
  try { localStorage.setItem(anahtar, bugun); } catch(e) {}   // önce işaretle: istek düşse de gün içinde tekrar denemesin
  try {
    fetch(SUPA_URL + '/rest/v1/profiles?id=eq.' + uid, {
      method: 'PATCH',
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + (getToken() || ''),
                 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ last_seen_at: new Date().toISOString() })
    }).catch(function(){});
  } catch(e) {}
}

async function requireAuth() {
  const token = getToken();
  if (!token) { window.location.href = 'login.html'; return false; }
  // Cached user varsa hemen authReady — UI beklemez
  if (getUser()) window.dispatchEvent(new CustomEvent('authReady'));
  // Bekleyen davet varsa arka planda tüket (anahtar boşsa hiç istek gitmez).
  // (2026-08-06) Bekleyen davet ARTIK otomatik tüketilmiyor: hangi hesapla
  // kullanılacağı login.html'deki onay ekranında soruluyor (girişli kullanıcı
  // başkasının davetine tıklayıp linki yakabiliyordu). Buradaki süpürücü
  // yalnızca giriş/kayıt akışının bıraktığı daveti işler; onay ekranı
  // `invite_confirmed` bayrağını koyar.
  try {
    if (localStorage.getItem('invite_confirmed') === '1') {
      localStorage.removeItem('invite_confirmed');
      redeemPendingInvite();
    }
  } catch(e) {}
  pingLastSeen();     // günde bir kez; kullanım ölçümü
  try {
    const r = await fetch(SUPA_URL+'/auth/v1/user', {
      headers: {'apikey': SUPA_KEY, 'Authorization': 'Bearer '+token},
      signal: AbortSignal.timeout(6000)
    });
    if (!r.ok) {
      const refresh = localStorage.getItem('sb_refresh');
      if (refresh) {
        const r2 = await fetch(SUPA_URL+'/auth/v1/token?grant_type=refresh_token', {
          method: 'POST',
          headers: {'apikey': SUPA_KEY, 'Content-Type': 'application/json'},
          body: JSON.stringify({refresh_token: refresh}),
          signal: AbortSignal.timeout(6000)
        });
        if (r2.ok) {
          const data = await r2.json();
          localStorage.setItem('sb_token', data.access_token);
          localStorage.setItem('sb_refresh', data.refresh_token);
          localStorage.setItem('sb_user', JSON.stringify(data.user));
          window.dispatchEvent(new CustomEvent('authReady'));
          return true;
        }
      }
      // Sunucu token'ı reddetti VE yenilenemedi — ama cache'de kullanıcı varsa
      // (örn. zayıf sinyalde geçici bir hata olabilir) çevrimdışı devam et, direkt atmayalım.
      const cachedUser = getUser();
      if (cachedUser) { window.dispatchEvent(new CustomEvent('authReady')); return true; }
      logout();
      return false;
    }
    const user = await r.json();
    localStorage.setItem('sb_user', JSON.stringify(user));

    // Profil senkronizasyonu (sadece display_name) ARKA PLANDA — kritik değil, kimse
    // sonucunu senkron beklemiyor. Rol/grup yükleme ise BEKLENİR — çünkü requireAuth()
    // biter bitmez repertoires.js/stage.html gibi sayfalar getGroupId()'i hemen çağırıyor;
    // arka planda bırakırsak henüz güncellenmemiş/boş group_id okuyup yanlış (daha dar)
    // bir sorguya düşebilirler. Timeout'lu olduğu için artık sonsuza dek asılı kalamaz.
    ensureProfile(user).catch(()=>{});
    // Gelenek tercihi de arka planda tazelenir: yerel değer zaten uygulandı,
    // sunucudaki farklıysa (başka cihazda değiştirilmiş olabilir) düzeltilir.
    varsayilanAlanlariTazele().catch(()=>{});
    await loadUserRole();

    // Hesap askıya alınmış veya silinme talep edilmişse engelle (cache'deki son bilinen durum)
    const status = localStorage.getItem('user_status');
    if (status === 'suspended') {
      logoutSilent();
      window.location.href = 'login.html?suspended=1';
      return false;
    }
    if (status === 'deletion_requested') {
      logoutSilent();
      window.location.href = 'login.html?deletion_requested=1&email=' + encodeURIComponent(user.email || '');
      return false;
    }

    window.dispatchEvent(new CustomEvent('authReady'));
    return true;
  } catch(e) {
    // Ağ hatası/timeout (zayıf sinyal, offline) — cache'de kullanıcı varsa çevrimdışı devam et
    const cachedUser = getUser();
    if (!cachedUser) { window.location.href = 'login.html'; return false; }
    window.dispatchEvent(new CustomEvent('authReady'));
    return true;
  }
}

const ADMIN_USER_ID = '4f965624-e524-4cb0-a351-3368f1297d28';
function isAdmin() {
  return getUserId() === ADMIN_USER_ID;
}

function getUserRole() {
  return localStorage.getItem('user_role') || 'member';
}

function isEditor() {
  if (isAdmin()) return true;
  return getUserRole() === 'editor';
}

async function ensureProfile(user) {
  if (!user?.id) return;
  if (user.id === ADMIN_USER_ID) return;
  try {
    // Mevcut profili kontrol et — display_name email dışında bir şeyse koru
    const check = await fetch(SUPA_URL + '/rest/v1/profiles?id=eq.' + user.id + '&select=display_name', {
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + (getToken() || '') },
      signal: AbortSignal.timeout(6000)
    });
    const existing = check.ok ? await check.json() : [];
    const currentName = existing[0]?.display_name || '';
    const hasRealName = currentName && currentName !== user.email;

    // user_metadata.full_name: kayıt sırasında signUp'a yazıldı
    const metaName = user.user_metadata?.full_name || '';

    // Öncelik: metadata > mevcut gerçek isim > email
    const display_name = metaName || (hasRealName ? currentName : user.email);

    await fetch(SUPA_URL + '/rest/v1/profiles', {
      method: 'POST',
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': 'Bearer ' + (getToken() || ''),
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: user.id,
        display_name,
        email: user.email
      }),
      signal: AbortSignal.timeout(6000)
    });
  } catch(e) {}
}

async function loadUserRole() {
  const uid = getUserId();
  if (!uid) return;
  if (isAdmin()) {
    localStorage.setItem('user_role', 'admin');
    try {
      const r = await fetch(SUPA_URL + '/rest/v1/profiles?id=eq.' + uid + '&select=group_id', {
        headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + (getToken() || '') },
        signal: AbortSignal.timeout(6000)
      });
      if (r.ok) {
        const data = await r.json();
        if (data[0]?.group_id) localStorage.setItem('user_group_id', data[0].group_id);
        else localStorage.removeItem('user_group_id');
      }
    } catch(e) {}
    try { window.dispatchEvent(new CustomEvent('user-role-loaded')); } catch(e) {}
    // Çoklu grup: üyelik listesi group_members'tan gelir, profiles.group_id
    // yalnızca AKTİF grubu söyler. Liste boş/geçersizse loadMyGroups onarır.
    try { await loadMyGroups(); } catch(e) {}
    return;
  }
  try {
    const r = await fetch(SUPA_URL + '/rest/v1/profiles?id=eq.' + uid + '&select=role,status,group_id', {
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + (getToken() || '') },
      signal: AbortSignal.timeout(6000)
    });
    if (r.ok) {
      const data = await r.json();
      if (data[0]?.role) localStorage.setItem('user_role', data[0].role);
      if (data[0]?.status) localStorage.setItem('user_status', data[0].status);
      if (data[0]?.group_id) localStorage.setItem('user_group_id', data[0].group_id);
      else localStorage.removeItem('user_group_id');
    }
  } catch(e) { console.log('[auth] loadUserRole error:', e); }
  // Menü rolü localStorage'dan okuyor ve ilk çizimde bu anahtar henüz boş
  // olabiliyor — rol netleşince haber ver, topnav kendini yeniden çizsin.
  try { window.dispatchEvent(new CustomEvent('user-role-loaded')); } catch(e) {}
  try { await loadMyGroups(); } catch(e) {}
}

// Çıkışta silinmesi gereken, KULLANICIYA AİT localStorage anahtarları.
// Buraya SENKRONİZE OLMAYAN yerel veri (ör. customWorks) KONULMAZ — silmek
// veri kaybı olur; onun çözümü anahtarı kullanıcı bazlı yapmaktır.
var USER_SCOPED_KEYS = [
  'sb_token', 'sb_refresh', 'sb_user',
  'user_role', 'user_status', 'user_group_id',
  'user_groups',   // çoklu grup üyelik listesi — cihazı paylaşan 2. kullanıcıya sızmasın
  'myGroupRole',   // repertoires.js + artiesten.html yazıyor; kullanıcı bazlı değil
  'scope_uid'
];

// Sayfa yönlendirmesi olmadan oturumu temizler.
// (2026-08-03) Artık localStorage'ın yanında IndexedDB'yi de temizliyor —
// eskiden çıkış sonrası offline veri cihazda kalıyordu ve aynı cihazı paylaşan
// ikinci kullanıcı önceki kullanıcının repertuvarlarını görebiliyordu.
// Promise döner; temizlik 1.5sn'de bitmezse yine de resolve olur (çıkış asılmasın).
function logoutSilent() {
  const token = getToken();
  if (token) {
    // (2026-08-06) 🐛 `?scope=local` EKLENDİ. Supabase'in çıkış uç noktası
    // VARSAYILAN OLARAK KÜRESEL çalışıyor: kullanıcının TÜM cihazlardaki
    // yenileme jetonlarını iptal ediyor. Emir masaüstünde hesap değiştirince
    // önündeki iPad de düşüp "Oturumunuzun süresi doldu" uyarısı verdi —
    // oysa orada hiçbir şey yapılmamıştı. Çıkış YALNIZCA bu cihazı
    // kapatmalı; sahnede duran ikinci cihazın oturumu düşerse felaket olur.
    fetch(SUPA_URL+'/auth/v1/logout?scope=local', {
      method: 'POST',
      headers: {'apikey': SUPA_KEY, 'Authorization': 'Bearer '+token}
    }).catch(()=>{});
  }
  USER_SCOPED_KEYS.forEach(function(k) { localStorage.removeItem(k); });

  let cleanup = Promise.resolve();
  try {
    if (typeof window.clearOfflineData === 'function') cleanup = window.clearOfflineData();
  } catch (e) { console.warn('[auth] clearOfflineData çağrılamadı:', e); }
  return Promise.race([
    Promise.resolve(cleanup).catch(()=>{}),
    new Promise(function(res) { setTimeout(res, 1500); })
  ]);
}

// Çıkış: temizlik BİTTİKTEN sonra yönlendirir. Eskiden yönlendirme hemen
// yapıldığı için IndexedDB temizliği yarıda kesilebiliyordu.
//
// (2026-08-23) ÇEVRİMDIŞI ÇIKIŞ UYARISI — Emir bildirdi: iPad'de internet
// yokken çıkış yapınca tekrar giriş yapılamıyor ("Load failed"). Giriş
// sunucuya kimlik doğrulatmayı gerektiriyor, çevrimdışı mümkün değil; üstelik
// logoutSilent() yerel veriyi de siliyor. Sahnede/provada wifi yokken
// yanlışlıkla çıkmak, repertuvarı tamamen erişilemez hale getirir.
// Engellemiyoruz — kullanıcı bilerek çıkmak isteyebilir — ama sonucu
// önceden söylüyoruz.
function logout() {
  try { localStorage.removeItem('defaultMusicFields'); } catch (e) {}
  if (!navigator.onLine) {
    var devam = confirm(
      'İnternet bağlantısı yok.\n\n' +
      'Şimdi çıkarsanız internet gelene kadar tekrar giriş yapamazsınız. ' +
      'Yerel verileriniz silinir; bağlantı sağlandığında yeniden yüklenir.\n\n' +
      'Çıkmak istediğinize emin misiniz?'
    );
    if (!devam) return;
  }
  logoutSilent().then(function() {
    window.location.href = 'login.html?logout=1';
  });
}

// ── Hesap değişimi koruması ────────────────────────────────────────────────
// (2026-08-03) localStorage ve IndexedDB kullanıcı bazlı değil. Kullanıcı düzgün
// çıkış yapmadan başka bir hesapla girerse (ya da çıkış yarıda kalırsa) önceki
// kullanıcının rolü ve verisi devrediyordu: 'myGroupRole' eskiden kalınca arayüz
// yanlışlıkla yönetici yetkisi gösterebiliyordu.
// Bu fonksiyon her sayfa yüklemesinde çalışır; oturumdaki uid, en son kaydedilen
// uid'den farklıysa türetilmiş yerel veriyi siler. Sunucu tarafı RLS zaten
// koruyor; bu, arayüzün yanlış bilgiyle çizilmesini engelliyor.
function enforceUserScope() {
  let uid = null;
  try { uid = getUserId(); } catch (e) { return; }
  if (!uid) return;
  const prev = localStorage.getItem('scope_uid');
  if (prev === uid) return;
  if (prev) {
    console.warn('[auth] Hesap değişti — önceki kullanıcıdan devreden yerel veri temizleniyor');
    ['myGroupRole', 'user_role', 'user_status', 'user_group_id'].forEach(function(k) {
      localStorage.removeItem(k);
    });
    // db.js bu noktada henüz yüklenmemiş olabilir (sayfalarda script sırası
    // sabit değil) — o zaman temizliği sayfa yüklenmesine ertele, sessizce atlama.
    try {
      if (typeof window.clearOfflineData === 'function') {
        window.clearOfflineData();
      } else {
        window.addEventListener('load', function() {
          if (typeof window.clearOfflineData === 'function') window.clearOfflineData();
          else console.warn('[auth] clearOfflineData bulunamadı — offline veri temizlenemedi');
        }, { once: true });
      }
    } catch (e) {}
  }
  localStorage.setItem('scope_uid', uid);
}

try { enforceUserScope(); } catch (e) { console.warn('[auth] enforceUserScope hatası:', e); }

// ── Sekmeler arası oturum değişimi ─────────────────────────────────────────
// (2026-08-03) localStorage bütün sekmelerde ORTAK. İkinci bir sekmede başka bir
// hesapla giriş yapıldığında sb_token/sb_user üzerine yazılıyor; ilk sekme bunu
// fark etmediği için ekranda eski kullanıcı görünürken istekler yeni kullanıcının
// token'ıyla gidiyordu — kimlik sessizce el değiştiriyordu.
// Çözüm: sekme açıldığı andaki uid'yi hatırla; localStorage'ta oturum anahtarları
// değişince (storage olayı YALNIZCA diğer sekmelerde tetiklenir) ya da sekme öne
// gelince karşılaştır, farklıysa sayfayı yeniden yükle.
// stage.html İSTİSNA: sahnedeyken zorla yeniden yükleme yapılmaz (performans
// sırasında ekranı sıfırlamak kabul edilemez), sadece konsola uyarı yazılır.
var BOOT_UID = (function() { try { return getUserId(); } catch (e) { return null; } })();

function handleSessionSwitch() {
  let now = null;
  try { now = getUserId(); } catch (e) { return; }
  if (now === BOOT_UID) return;

  // Bu sekme oturumsuz açıldıysa (login sayfası vb.) gösterilen hassas bir şey
  // yok — yeniden yüklemeye gerek kalmadan yeni kimliği benimse.
  if (BOOT_UID === null) { BOOT_UID = now; return; }

  if (/stage\.html/i.test(location.pathname)) {
    console.warn('[auth] Başka bir sekmede oturum değişti — sahne modunda yeniden yükleme yapılmıyor');
    return;
  }
  if (!now) { window.location.href = 'login.html?logout=1'; return; }
  console.warn('[auth] Başka bir sekmede farklı bir hesapla giriş yapıldı — sayfa yenileniyor');
  if (document.hidden) { window._pendingSessionReload = true; return; }
  window.location.reload();
}

if (!window._sessionSwitchWatch) {
  window._sessionSwitchWatch = true;
  window.addEventListener('storage', function(e) {
    if (!e.key || ['sb_user', 'sb_token', 'scope_uid'].indexOf(e.key) === -1) return;
    handleSessionSwitch();
  });
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) return;
    if (window._pendingSessionReload) { window.location.reload(); return; }
    handleSessionSwitch();
  });
  window.addEventListener('focus', handleSessionSwitch);
}

function renderUserBadge(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const name = getUserName();
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-left:auto;">
      <span style="font-size:12px;color:var(--text2);">${name}</span>
      <button onclick="logout()" style="padding:4px 10px;border-radius:6px;border:1px solid var(--border);
        background:none;color:var(--text3);font-size:11px;cursor:pointer;font-family:inherit;"
        onmouseover="this.style.borderColor='var(--red)';this.style.color='var(--red)'"
        onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text3)'">
        Çıkış
      </button>
    </div>`;
}
