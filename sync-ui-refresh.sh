#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# SYNC SONRASI OTOMATİK UI TAZELEME
#
# Kanıtlanan durum: veri IndexedDB'de var (REPS local: 12) ama sayfa açılışta
# boş kaldıysa kendini tazelemiyordu. load() manuel çağrılınca liste anında
# doluyor. Yani eksik olan: sync/ağ değişimi bitince UI'a "yeniden çiz" demek.
#
# Çözüm:
#  1) db.js syncOfflineData başarıyla bitince 'data-synced' olayı fırlatır.
#  2) repertoires.js ve stage.html bu olayı (ve 'online'ı) dinleyip kendini
#     tazeler (load / renderPicker).
#
# load() zaten local-first (anında render) olduğundan tekrar çağrılması
# güvenli — sadece listeyi güncel veriyle yeniden çizer.
#
# Kullanım (db.js, repertoires.js, stage.html ile aynı klasörde):
#   bash sync-ui-refresh.sh
# ═══════════════════════════════════════════════════════════════
set -e

# ── 1) db.js: sync bitince 'data-synced' fırlat ──
if [ -f "db.js" ]; then
  cp db.js db.js.bak
  python3 - <<'PYEOF'
path = "db.js"
s = open(path, encoding='utf-8').read()
orig = s

if "new CustomEvent('data-synced')" in s or "'data-synced'" in s:
    print("  •  db.js: data-synced zaten fırlatılıyor, atlandı")
else:
    # 'Offline sync tamamlandı' log satırından hemen sonra event fırlat
    anchor = "console.log('[db] Offline sync tamamlandı:', new Date().toLocaleTimeString('tr-TR'));"
    inject = anchor + """
    // Sync bitti — dinleyen sayfalar (repertuvarlar, sahne) kendini tazelesin.
    try { window.dispatchEvent(new CustomEvent('data-synced')); } catch (e) {}"""
    if anchor in s:
        s = s.replace(anchor, inject, 1)
        print("  ✓ db.js: sync sonrası 'data-synced' olayı eklendi")
    else:
        # Alternatif: lastSync set edildikten sonra
        alt = "await db.meta.set('lastSync', new Date().toISOString());"
        alt_new = alt + """
    try { window.dispatchEvent(new CustomEvent('data-synced')); } catch (e) {}"""
        if alt in s:
            s = s.replace(alt, alt_new, 1)
            print("  ✓ db.js: sync sonrası 'data-synced' olayı eklendi (lastSync sonrası)")
        else:
            print("  ⚠  db.js: sync bitiş noktası bulunamadı — elle eklenebilir")

if s != orig:
    open(path,'w',encoding='utf-8').write(s)
PYEOF
  rm -f db.js.bak
else
  echo "  ⚠  db.js yok"
fi

# ── 2) repertoires.js: data-synced + online dinle → load() ──
if [ -f "repertoires.js" ]; then
  cp repertoires.js repertoires.js.bak
  python3 - <<'PYEOF'
path = "repertoires.js"
s = open(path, encoding='utf-8').read()
orig = s

marker = "// --- SYNC/ONLINE OTOMATİK TAZELEME ---"
if marker in s:
    print("  •  repertoires.js: tazeleme dinleyicileri zaten var, atlandı")
else:
    # init IIFE'sinin sonuna ekle. En güvenli yer: dosya sonuna eklemek.
    listeners = """

// --- SYNC/ONLINE OTOMATİK TAZELEME ---
// Ağ değişince (WiFi↔GSM) veya arka plan sync'i bitince veri IndexedDB'de
// güncellenir; ama sayfa açılışta boş kaldıysa kendini çizmiyordu. Bu
// dinleyiciler o durumda listeyi otomatik tazeler. load() local-first
// olduğundan tekrar çağrılması güvenli.
(function() {
  let _refreshT;
  function _refresh() {
    clearTimeout(_refreshT);
    _refreshT = setTimeout(function() {
      if (typeof load === 'function') load();
    }, 150);
  }
  window.addEventListener('data-synced', _refresh);
  window.addEventListener('online', _refresh);
})();"""
    s = s.rstrip() + "\n" + listeners + "\n"
    print("  ✓ repertoires.js: data-synced + online tazeleme eklendi")

if s != orig:
    open(path,'w',encoding='utf-8').write(s)
PYEOF
  rm -f repertoires.js.bak
else
  echo "  ⚠  repertoires.js yok"
fi

# ── 3) stage.html: data-synced + online dinle → renderPicker() ──
if [ -f "stage.html" ]; then
  cp stage.html stage.html.bak
  python3 - <<'PYEOF'
path = "stage.html"
s = open(path, encoding='utf-8').read()
orig = s

marker = "// --- SYNC/ONLINE OTOMATİK TAZELEME (stage) ---"
if marker in s:
    print("  •  stage.html: tazeleme dinleyicileri zaten var, atlandı")
else:
    # renderPicker fonksiyonundan önce ekle (fonksiyon o noktada tanımlı olmalı;
    # ama dinleyici çalışma anında çağıracağı için tanım sırası önemli değil).
    # En güvenli: init IIFE'sinden önce, script sonuna yakın bir yere.
    # 'function renderPicker' bulunduğu yerin ÖNCESİNE değil, dosyadaki son
    # </script>'ten hemen önce eklemek en güvenlisi.
    listeners = """
// --- SYNC/ONLINE OTOMATİK TAZELEME (stage) ---
// Ağ değişince veya sync bitince picker açıksa listeyi tazele. Sadece picker
// görünürken ve kullanıcı kaydırma yapmıyorken çiz (açık swipe'ı bozmamak için).
(function() {
  let _rt;
  function _refreshPicker() {
    clearTimeout(_rt);
    _rt = setTimeout(function() {
      var picker = document.getElementById('pickerScreen');
      if (picker && !picker.classList.contains('hidden') &&
          typeof renderPicker === 'function' &&
          (typeof _rsSwipe === 'undefined' || !_rsSwipe) &&
          (typeof _rsOpenCard === 'undefined' || !_rsOpenCard)) {
        renderPicker();
      }
    }, 150);
  }
  window.addEventListener('data-synced', _refreshPicker);
  window.addEventListener('online', _refreshPicker);
})();
"""
    # Son </script>'ten önce ekle
    idx = s.rfind("</script>")
    if idx != -1:
        s = s[:idx] + listeners + "\n" + s[idx:]
        print("  ✓ stage.html: data-synced + online tazeleme eklendi")
    else:
        print("  ⚠  stage.html: </script> bulunamadı")

if s != orig:
    open(path,'w',encoding='utf-8').write(s)
PYEOF
  rm -f stage.html.bak
else
  echo "  ⚠  stage.html yok"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "Bitti. Artık ağ değişince / sync bitince:"
echo "  • Repertuvarlar otomatik tazelenir (load)"
echo "  • Sahne Modu picker'ı otomatik tazelenir (açık swipe'ı bozmadan)"
echo "  • Kullanıcı manuel bir şey yapmak zorunda kalmaz"
echo "═══════════════════════════════════════════════════════════════"
