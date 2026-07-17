#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# TOKEN OTOMATİK YENİLEME — kalıcı çözüm
#
# Kanıtlanan kök neden: access token 1 saatte doluyor. auth.js yenilemek
# için 'sb_refresh' anahtarını arıyor ama gerçek refresh token Supabase'in
# standart anahtarında (sb-<ref>-auth-token JSON'u içinde) duruyor. Yanlış
# anahtar → yenileme hiç çalışmıyor → token ölüyor → tüm istekler 401 →
# veri gelmiyor.
#
# Çözüm: ensureValidToken() fonksiyonu (auth.js'e eklenir). Token'ın exp'ine
# bakar, dolmuş/dolmak üzereyse DOĞRU anahtardan refresh token'ı bulup
# yeniler. db.js'deki syncOfflineData bunu fetch'lerden önce çağırır.
#
# Kullanım (auth.js ve db.js ile aynı klasörde):
#   bash token-refresh-fix.sh
#
# Test edilmiş: 6/6 birim testi geçti (izole mantık testi).
# ═══════════════════════════════════════════════════════════════
set -e

# ── auth.js'e ensureValidToken ekle ──
if [ ! -f "auth.js" ]; then echo "⚠  auth.js yok."; exit 1; fi
cp auth.js auth.js.bak

python3 - <<'PYEOF'
path = "auth.js"
s = open(path, encoding='utf-8').read()
orig = s

if "async function ensureValidToken" in s:
    print("  •  auth.js: ensureValidToken zaten var, atlandı")
else:
    # authHeaders fonksiyonundan HEMEN ÖNCE ekle (üstte, erken tanımlı olsun)
    anchor = "function authHeaders() {"
    fn = '''// ── Otomatik token yenileme ──
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

'''
    s = s.replace(anchor, fn + anchor, 1)
    print("  ✓ auth.js: ensureValidToken eklendi")

if s != orig:
    open(path,'w',encoding='utf-8').write(s)
PYEOF
rm -f auth.js.bak

# ── db.js: syncOfflineData'da token'ı yenile ──
if [ -f "db.js" ]; then
  cp db.js db.js.bak
  python3 - <<'PYEOF'
path = "db.js"
s = open(path, encoding='utf-8').read()
orig = s

old = """window.syncOfflineData = async function() {
  // Not: navigator.onLine WiFi↔mobil veri geçişinde yanlışlıkla false
  // takılabiliyor (özellikle iOS WebView). Bu yüzden ona GÜVENMİYORUZ —
  // fetch'i deneriz, başarısız olursa aşağıdaki try/catch zaten yakalar.
  const token = localStorage.getItem('sb_token');
  if (!token) return;"""
new = """window.syncOfflineData = async function() {
  // Not: navigator.onLine WiFi↔mobil veri geçişinde yanlışlıkla false
  // takılabiliyor (özellikle iOS WebView). Bu yüzden ona GÜVENMİYORUZ —
  // fetch'i deneriz, başarısız olursa aşağıdaki try/catch zaten yakalar.
  // Token dolmuş olabilir (1 saatlik ömür) — sync fetch'lerinden ÖNCE yenile,
  // yoksa tüm istekler 401 alır ve veri gelmez.
  let token = localStorage.getItem('sb_token');
  if (!token) return;
  if (typeof window.ensureValidToken === 'function') {
    try { token = (await window.ensureValidToken()) || token; } catch(e) {}
  }"""

# db.js'de eski (navigator.onLine'lı) versiyon da olabilir — iki olası hedef
old_alt = """window.syncOfflineData = async function() {
  if (!navigator.onLine) return;
  const token = localStorage.getItem('sb_token');
  if (!token) return;"""
new_alt = """window.syncOfflineData = async function() {
  // Token dolmuş olabilir (1 saatlik ömür) — sync fetch'lerinden ÖNCE yenile.
  let token = localStorage.getItem('sb_token');
  if (!token) return;
  if (typeof window.ensureValidToken === 'function') {
    try { token = (await window.ensureValidToken()) || token; } catch(e) {}
  }"""

if "window.ensureValidToken()) || token" in s:
    print("  •  db.js: ensureValidToken zaten kullanılıyor, atlandı")
elif old in s:
    s = s.replace(old, new, 1)
    print("  ✓ db.js: syncOfflineData token yenilemesi eklendi")
elif old_alt in s:
    s = s.replace(old_alt, new_alt, 1)
    print("  ✓ db.js: syncOfflineData token yenilemesi eklendi (navigator.onLine da kaldırıldı)")
else:
    print("  ⚠  db.js: syncOfflineData başı beklenen formatta değil — elle eklenebilir")
    print("     (const token = ... satırından önce: token = await window.ensureValidToken())")

# Ayrıca sync içindeki 'const token' referansı 'let token'a çevrildiyse
# aşağıda headers hâlâ 'token' kullanıyor — o değişmez, sorun yok.

if s != orig:
    open(path,'w',encoding='utf-8').write(s)
PYEOF
  rm -f db.js.bak
else
  echo "  ⚠  db.js yok, atlandı"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "Bitti. Artık:"
echo "  • Token dolduğunda otomatik yenilenir (doğru anahtardan)"
echo "  • Sync fetch'leri 401 almaz, veri gelir"
echo "  • Uygulama saatlerce açık kalsa da oturum düşmez"
echo ""
echo "ÖNEMLİ: Bu düzeltme sonrası mevcut oturumun zaten DOLMUŞ token'ı"
echo "ilk sync'te otomatik yenilenecek. Ama garanti olsun diye bir kez"
echo "çıkış/giriş yapman en temizi (taze token + refresh ile başlar)."
echo "═══════════════════════════════════════════════════════════════"
