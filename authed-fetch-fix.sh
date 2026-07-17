#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# TÜM SUPABASE FETCH'LERİNE OTOMATİK TOKEN YENİLEME (fetch monkey-patch)
#
# Sorun: Sayfaların kendi fetch'leri (syncWorksFromServer, loadRepertoireCounts,
# updatePendingCount, vb. — toplam ~118 çağrı) token yenilemeyi atlıyordu.
# Token dolunca ya da ağ geçişinde 401 alıyorlardı → sayfa 5-6sn boş kalıp
# başarısız denemelerden sonra ancak local'i gösteriyordu.
#
# Çözüm: window.fetch'i sarmalayan tek bir katman (auth.js'e, ensureValidToken'
# dan hemen sonra). Supabase'e giden HER isteği, gitmeden önce taze token'la
# donatır. 118 çağrının hiçbiri elle değişmez.
#
# Güvenlik:
#   • Sadece supabase.co isteklerine dokunur, başka fetch'e değil
#   • /auth/v1/token (refresh'in kendisi) MUAF → sonsuz döngü yok
#   • Authorization header'ı olmayan isteklere dokunmaz
#   • ensureValidToken yoksa orijinal fetch'e düşer (güvenli)
#
# Kullanım (auth.js ile aynı klasörde):
#   bash authed-fetch-fix.sh
# ═══════════════════════════════════════════════════════════════
set -e

f="auth.js"
if [ ! -f "$f" ]; then echo "⚠  auth.js yok."; exit 1; fi
cp "$f" "$f.bak"

python3 - <<'PYEOF'
path = "auth.js"
s = open(path, encoding='utf-8').read()
orig = s

if "window.fetch = " in s and "_supaFetchPatched" in s:
    print("  •  fetch monkey-patch zaten var, atlandı")
else:
    # ensureValidToken global export'undan HEMEN SONRA ekle
    anchor = "window.ensureValidToken = ensureValidToken;"
    patch = '''window.ensureValidToken = ensureValidToken;

// ── TÜM SUPABASE FETCH'LERİNE OTOMATİK TOKEN YENİLEME ──
// window.fetch'i sarmalıyoruz: Supabase'e giden her istek, gitmeden önce
// taze token alır. Böylece sayfaların kendi fetch'leri (token yenilemeyi
// bilmeyenler dahil) 401 almaz. Tek noktadan tüm çağrılar korunur.
if (!window._supaFetchPatched) {
  window._supaFetchPatched = true;
  var _origFetch = window.fetch.bind(window);
  window.fetch = async function(input, init) {
    try {
      var url = (typeof input === 'string') ? input : (input && input.url) || '';
      // Sadece Supabase REST/diğer istekleri; refresh'in KENDİSİ muaf (sonsuz döngü olmasın).
      var isSupa = url.indexOf('supabase.co') !== -1;
      var isTokenReq = url.indexOf('/auth/v1/token') !== -1;
      if (isSupa && !isTokenReq && typeof ensureValidToken === 'function') {
        var fresh = await ensureValidToken();
        if (fresh) {
          init = init || {};
          var h = init.headers;
          // headers Headers nesnesi olabilir ya da düz obje — ikisini de yönet.
          if (h instanceof Headers) {
            // Yalnızca zaten Authorization taşıyan istekleri güncelle (SUPA_KEY-only olanlara dokunma).
            if (h.has('Authorization')) h.set('Authorization', 'Bearer ' + fresh);
          } else if (h && typeof h === 'object') {
            if (h.Authorization || h.authorization) {
              h.Authorization = 'Bearer ' + fresh;
              if (h.authorization) delete h.authorization;
            }
            init.headers = h;
          }
        }
      }
    } catch (e) { /* patch hatası olsa bile isteği engelleme */ }
    return _origFetch(input, init);
  };
}
'''
    if anchor in s:
        s = s.replace(anchor, patch, 1)
        print("  ✓ fetch monkey-patch eklendi (tüm Supabase istekleri token yeniler)")
    else:
        print("  ✗ 'window.ensureValidToken = ensureValidToken;' bulunamadı!")
        print("     token-refresh-fix.sh önce çalıştırılmalı.")

if s != orig:
    open(path, 'w', encoding='utf-8').write(s)
    print("  → auth.js güncellendi.")
else:
    print("  → auth.js değişmedi.")
PYEOF

rm -f "$f.bak"
echo ""
echo "Bitti. Artık auth.js yüklü HER sayfada, Supabase'e giden tüm istekler"
echo "otomatik taze token kullanır — 401 ve buna bağlı 5-6sn boşluk biter."
echo ""
echo "NOT: login.html, istatistikler.html gibi auth.js YÜKLEMEYEN sayfalar"
echo "bu patch'in dışında. Onlar zaten token yenilemeye ihtiyaç duymayabilir"
echo "(login zaten token ALIR). Bir sorun görürsen ayrıca ele alırız."
