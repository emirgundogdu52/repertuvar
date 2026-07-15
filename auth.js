// auth.js — tüm sayfalarda kullanılan auth yardımcı fonksiyonları
var SUPA_URL = 'https://ehytkzxdhjyjuubizdnl.supabase.co';
var SUPA_KEY = 'sb_publishable_f_WsYxzN06B5dGROrkGyPQ_UDxKSbtO';

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

// ── Otomatik token yenileme ──
// Access token 1 saatte doluyor. Bu fonksiyon token'ın exp'ine bakar; dolmuş
// ya da <60sn kalmışsa refresh token ile yeniler. Refresh token'ı önce
// Supabase'in standart anahtarından (sb-<ref>-auth-token JSON'u), yoksa eski
// sb_refresh anahtarından okur. Data isteklerinden önce çağrılmalı.
var _refreshInFlight = null;
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
async function ensureValidToken() {
  var token = localStorage.getItem('sb_token');
  if (!token) return null;
  var exp = _decodeExp(token);
  if (exp && exp - Date.now() > 60000) return token; // 60sn'den fazla var — taze
  if (_refreshInFlight) return _refreshInFlight;      // zaten yenileniyor
  var refresh = _findRefreshToken();
  if (!refresh) return token;                          // yenileyemiyoruz
  _refreshInFlight = (async function() {
    try {
      var r = await fetch(SUPA_URL + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { apikey: SUPA_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
        signal: AbortSignal.timeout(8000)
      });
      if (!r.ok) return token;
      var data = await r.json();
      _persistNewSession(data);
      console.log('[auth] token yenilendi');
      return data.access_token || token;
    } catch (e) {
      return token;
    } finally {
      _refreshInFlight = null;
    }
  })();
  return _refreshInFlight;
}
window.ensureValidToken = ensureValidToken;

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

function authHeaders() {
  const token = getToken();
  return {
    'apikey': SUPA_KEY,
    'Authorization': 'Bearer ' + (token || SUPA_KEY),
    'Content-Type': 'application/json'
  };
}

async function requireAuth() {
  const token = getToken();
  if (!token) { window.location.href = 'login.html'; return false; }
  // Cached user varsa hemen authReady — UI beklemez
  if (getUser()) window.dispatchEvent(new CustomEvent('authReady'));
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
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + (getToken() || SUPA_KEY) },
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
        'Authorization': 'Bearer ' + (getToken() || SUPA_KEY),
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
        headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + (getToken() || SUPA_KEY) },
        signal: AbortSignal.timeout(6000)
      });
      if (r.ok) {
        const data = await r.json();
        if (data[0]?.group_id) localStorage.setItem('user_group_id', data[0].group_id);
        else localStorage.removeItem('user_group_id');
      }
    } catch(e) {}
    return;
  }
  try {
    const r = await fetch(SUPA_URL + '/rest/v1/profiles?id=eq.' + uid + '&select=role,status,group_id', {
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + (getToken() || SUPA_KEY) },
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
}

// Sayfa yönlendirmesi olmadan sadece localStorage temizler
function logoutSilent() {
  const token = getToken();
  if (token) {
    fetch(SUPA_URL+'/auth/v1/logout', {
      method: 'POST',
      headers: {'apikey': SUPA_KEY, 'Authorization': 'Bearer '+token}
    }).catch(()=>{});
  }
  localStorage.removeItem('sb_token');
  localStorage.removeItem('sb_refresh');
  localStorage.removeItem('sb_user');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_status');
  localStorage.removeItem('user_group_id');
}

function logout() {
  logoutSilent();
  window.location.href = 'login.html?logout=1';
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
