#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# db.js — SONSUZ YÜKLEME KALKANI + ONLINE KONTROLÜ DÜZELTMESİ
#
# Kanıtlanan kök neden: syncOfflineData içindeki db.works.replaceAll(410
# kayıt) uzun bir readwrite transaction açıyor. 5G'de yavaş fetch → uzun
# transaction → aynı store'a gelen getAll() okumaları o yazma bitene kadar
# SONSUZ "pending" kalıyor. (deleteDatabase çağrısının kilidi açıp tüm
# bekleyen okumaları boşaltması bunu kanıtladı.)
#
# İki düzeltme:
#  1) getAll'a TIMEOUT KALKANI: okuma 3sn'de dönmezse boş [] ile resolve
#     eder. Böylece UI hiçbir koşulda sonsuz beklemez. (works store yazma
#     yüzünden meşgulse, UI local'i atlar ve arka plan sync'ini bekler —
#     donmaz.)
#  2) syncOfflineData'daki 'if (!navigator.onLine) return;' — WiFi↔5G
#     geçişinde navigator.onLine yanlışlıkla false takılabildiğinden, bu
#     satır sync'i haksız yere bloklayabiliyor. Kaldırıyoruz; zaten fetch
#     başarısız olursa try/catch yakalıyor.
#
# Kullanım (db.js ile aynı klasörde):
#   bash db-timeout-fix.sh
# ═══════════════════════════════════════════════════════════════
set -e

f="db.js"
if [ ! -f "$f" ]; then echo "⚠  db.js bulunamadı."; exit 1; fi
cp "$f" "$f.bak"

python3 - "$f" <<'PYEOF'
import sys
path = sys.argv[1]
s = open(path, encoding='utf-8').read()
orig = s

# ── FIX 1: storeOp'a timeout parametreli sarmalayıcı ekle ──
# getAll çağrılarını timeout'lu bir yardımcıdan geçir.
# storeOp fonksiyonunun hemen ardından withTimeout helper'ı ekle.
anchor_storeop = """function storeOp(storeName, mode, fn) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}"""

helper = """function storeOp(storeName, mode, fn) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

// Bir okuma promise'i verilen süre içinde dönmezse fallback değerle çöz.
// Neden gerekli: aynı store'a açık bir readwrite transaction (ör. replaceAll
// 410 kayıt yazarken) readonly getAll'ı bloke edebiliyor; yavaş ağda bu
// "sonsuz pending"e dönüşüyordu. Kalkan sayesinde UI en fazla `ms` bekler.
// onTimeout: yalnızca süre dolunca çağrılan fonksiyon (fallback değeri döndürür).
function withTimeout(promise, ms, onTimeout) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(onTimeout()), ms))
  ]);
}"""

if "function withTimeout(" in s:
    print("  •  FIX 1: withTimeout zaten var, atlandı")
elif anchor_storeop in s:
    s = s.replace(anchor_storeop, helper, 1)
    print("  ✓ FIX 1a: withTimeout yardımcısı eklendi")
else:
    print("  ✗ FIX 1a: storeOp bloğu bulunamadı!")

# getAll'ı timeout'la sar
old_getall = """    getAll: () => HAS_IDB
      ? storeOp(storeName, 'readonly', (s) => s.getAll()).catch((e) => { console.warn('[db] getAll hatası:', e); return []; })
      : Promise.resolve([]),"""
new_getall = """    getAll: () => HAS_IDB
      ? withTimeout(
          storeOp(storeName, 'readonly', (s) => s.getAll()).catch((e) => { console.warn('[db] getAll hatası:', e); return []; }),
          3000,
          () => { console.warn('[db] getAll 3sn timeout (' + storeName + ') — boş dönülüyor, sync arka planda tazeleyecek'); return []; }
        )
      : Promise.resolve([]),"""

if "withTimeout(\n          storeOp(storeName, 'readonly'" in s:
    print("  •  FIX 1b: getAll zaten timeout'lu, atlandı")
elif old_getall in s:
    s = s.replace(old_getall, new_getall, 1)
    print("  ✓ FIX 1b: getAll timeout kalkanına alındı (3sn)")
else:
    print("  ✗ FIX 1b: getAll bloğu bulunamadı!")

# ── FIX 2: syncOfflineData'daki navigator.onLine erken-return'ünü kaldır ──
old_online = """window.syncOfflineData = async function() {
  if (!navigator.onLine) return;
  const token = localStorage.getItem('sb_token');"""
new_online = """window.syncOfflineData = async function() {
  // Not: navigator.onLine WiFi↔mobil veri geçişinde yanlışlıkla false
  // takılabiliyor (özellikle iOS WebView). Bu yüzden ona GÜVENMİYORUZ —
  // fetch'i deneriz, başarısız olursa aşağıdaki try/catch zaten yakalar.
  const token = localStorage.getItem('sb_token');"""

if "navigator.onLine WiFi↔mobil veri geçişinde" in s:
    print("  •  FIX 2: onLine kontrolü zaten kaldırılmış, atlandı")
elif old_online in s:
    s = s.replace(old_online, new_online, 1)
    print("  ✓ FIX 2: syncOfflineData'daki navigator.onLine erken-return kaldırıldı")
else:
    print("  ✗ FIX 2: syncOfflineData başı bulunamadı!")

if s != orig:
    open(path, 'w', encoding='utf-8').write(s)
    print("  → db.js güncellendi.")
else:
    print("  → db.js değişmedi.")
PYEOF

rm -f "$f.bak"
echo ""
echo "Bitti. Bu düzeltme 'sonsuz yükleme'yi kökten imkansız kılar:"
echo "  • Hiçbir getAll 3 saniyeden fazla UI'ı bekletemez"
echo "  • Sync, navigator.onLine yanlış olsa bile denenir"
