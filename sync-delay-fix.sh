#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# SYNC'İ RENDER'DAN SONRAYA AL — okuma/yazma çakışmasını bitir
#
# Kanıtlanan sorun: syncOfflineData works store'una yazarken (replaceAll),
# aynı anda sayfanın açılış getAll okuması geliyor → okuma yazmayı bekliyor
# → 3sn timeout → boş veri → 6sn boş ekran.
#
# Atomik transaction (chunk-revert) yarım-veri sorununu çözdü; bu script de
# ÇAKIŞMAYI çözer: sync'i, sayfa local'i okuyup çizsin diye kısa bir gecikmeyle
# (800ms) başlatır. Okuma birkaç ms sürdüğünden, 800ms fazlasıyla yeter.
#
# Dört tetikleme noktası:
#   • db.js — 'online' event handler (ağ değişince hemen yazıyordu)
#   • repertoires.js — init'te sync + hemen ardından okuma
#   • stage.html — init'te sync
#   (eserler.html syncOfflineData kullanmıyor; 'online' handler'ı onu da korur)
#
# Kullanım (db.js, repertoires.js, stage.html ile aynı klasörde):
#   bash sync-delay-fix.sh
# ═══════════════════════════════════════════════════════════════
set -e

# ── 1) db.js: online handler'da sync'i geciktir ──
if [ -f "db.js" ]; then
  cp db.js db.js.bak
  python3 - <<'PYEOF'
path = "db.js"
s = open(path, encoding='utf-8').read()
orig = s

old = """window.addEventListener('online', () => {
  console.log('[db] Online — sync başlıyor...');
  syncOfflineData();
});"""
new = """window.addEventListener('online', () => {
  console.log('[db] Online — sync (kısa gecikmeyle) başlıyor...');
  // Gecikme: ağ değişince sayfa büyük olasılıkla o an local'i okuyup çiziyor.
  // Sync'i hemen başlatırsak works store'una yazma, okumayı bloke ediyor.
  // 800ms bekleyip yazmaya başlayınca okuma çoktan bitmiş oluyor.
  setTimeout(() => syncOfflineData(), 800);
});"""

if "setTimeout(() => syncOfflineData(), 800)" in s:
    print("  •  db.js: online sync gecikmesi zaten var, atlandı")
elif old in s:
    s = s.replace(old, new, 1)
    print("  ✓ db.js: online sync 800ms geciktirildi")
else:
    print("  ⚠  db.js: online handler beklenen formatta değil")

if s != orig:
    open(path,'w',encoding='utf-8').write(s)
PYEOF
  rm -f db.js.bak
fi

# ── 2) repertoires.js: init'te sync'i render'dan SONRA ve gecikmeli çağır ──
if [ -f "repertoires.js" ]; then
  cp repertoires.js repertoires.js.bak
  python3 - <<'PYEOF'
path = "repertoires.js"
s = open(path, encoding='utf-8').read()
orig = s

old = """  if (window.syncOfflineData) syncOfflineData();
  // works verisini BEKLEME — repertuvar listesi works olmadan da çizilir (eser adları
  // sonra dolar). Önce local repertuvarları göster, works arka planda gelince tazele.
  load();
  loadWorksData().then(() => { renderList(); renderDetail(); });"""
new = """  // Önce local'den oku ve çiz (load), SONRA sync'i gecikmeyle başlat —
  // böylece açılış okuması, sync'in works yazmasıyla çakışmaz.
  load();
  loadWorksData().then(() => { renderList(); renderDetail(); });
  if (window.syncOfflineData) setTimeout(() => syncOfflineData(), 800);"""

if "setTimeout(() => syncOfflineData(), 800)" in s:
    print("  •  repertoires.js: sync gecikmesi zaten var, atlandı")
elif old in s:
    s = s.replace(old, new, 1)
    print("  ✓ repertoires.js: sync render'dan sonraya + 800ms geciktirildi")
else:
    print("  ⚠  repertoires.js: init bloğu beklenen formatta değil")

if s != orig:
    open(path,'w',encoding='utf-8').write(s)
PYEOF
  rm -f repertoires.js.bak
fi

# ── 3) stage.html: init'te sync'i geciktir ──
if [ -f "stage.html" ]; then
  cp stage.html stage.html.bak
  python3 - <<'PYEOF'
path = "stage.html"
s = open(path, encoding='utf-8').read()
orig = s

old = "  if (window.syncOfflineData) syncOfflineData();"
new = "  if (window.syncOfflineData) setTimeout(() => syncOfflineData(), 800);"

# Sadece ilk eşleşmeyi değiştir (init'teki)
if "setTimeout(() => syncOfflineData(), 800)" in s:
    print("  •  stage.html: sync gecikmesi zaten var, atlandı")
elif old in s:
    s = s.replace(old, new, 1)
    print("  ✓ stage.html: init sync'i 800ms geciktirildi")
else:
    print("  ⚠  stage.html: sync çağrısı beklenen formatta değil")

if s != orig:
    open(path,'w',encoding='utf-8').write(s)
PYEOF
  rm -f stage.html.bak
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "Bitti. Artık sync, sayfa local'i okuyup çizdikten SONRA başlar —"
echo "works store yazması açılış okumasını bloke etmez, 6sn boşluk kapanır."
echo "═══════════════════════════════════════════════════════════════"
