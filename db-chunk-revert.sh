#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# db.js — CHUNK'I GERİ AL (tek atomik transaction'a dön)
#
# Neden: chunk'lı replaceAll, yazma sırasında araya giren getAll'a store'u
# YARIM halde gösteriyordu (bazı kayıt silinmiş, yenisi henüz yazılmamış) →
# getAll 0/eksik kayıt dönüyordu. Kanıt: chunk öncesi getAll 2ms→410,
# chunk sonrası 3007ms→0.
#
# Doğru davranış: tek transaction ATOMİKtir — okuma ya eski tam veriyi ya
# yeni tam veriyi görür, asla yarım görmez. (Çakışmayı ise ayrı olarak,
# sync'i render'dan sonraya alarak çözüyoruz — o ikinci script.)
#
# Kullanım (db.js ile aynı klasörde):
#   bash db-chunk-revert.sh
# ═══════════════════════════════════════════════════════════════
set -e

f="db.js"
if [ ! -f "$f" ]; then echo "⚠  db.js yok."; exit 1; fi
cp "$f" "$f.bak"

python3 - <<'PYEOF'
path = "db.js"
s = open(path, encoding='utf-8').read()
orig = s

# ── saveAll'ı tek transaction'a geri döndür ──
chunked_saveall = """    saveAll: (items) => HAS_IDB
      ? _chunkedWrite(storeName, [], items || [], 100)
          .catch((e) => { console.warn('[db] saveAll hatası:', e); })
      : Promise.resolve(),"""
atomic_saveall = """    saveAll: (items) => HAS_IDB
      ? openDB().then((db) => new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          (items || []).forEach((item) => store.put(item));
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        })).catch((e) => { console.warn('[db] saveAll hatası:', e); })
      : Promise.resolve(),"""

if chunked_saveall in s:
    s = s.replace(chunked_saveall, atomic_saveall, 1)
    print("  ✓ saveAll tek transaction'a döndürüldü")
elif "(items || []).forEach((item) => store.put(item));\n          tx.oncomplete" in s:
    print("  •  saveAll zaten atomik, atlandı")
else:
    print("  ⚠  saveAll chunk deseni bulunamadı (belki farklı) — kontrol et")

# ── replaceAll'ı tek transaction'a geri döndür ──
chunked_replaceall = """    replaceAll: (items) => HAS_IDB
      ? storeOp(storeName, 'readonly', (s) => s.getAllKeys()).then((existingKeys) => {
          const newIds = new Set((items || []).map((it) => it.id));
          const toDelete = (existingKeys || []).filter((k) => !newIds.has(k));
          return _chunkedWrite(storeName, toDelete, items || [], 100);
        }).catch((e) => { console.warn('[db] replaceAll hatası:', e); })
      : Promise.resolve(),"""
atomic_replaceall = """    replaceAll: (items) => HAS_IDB
      ? storeOp(storeName, 'readonly', (s) => s.getAllKeys()).then((existingKeys) => {
          const newIds = new Set((items || []).map((it) => it.id));
          const toDelete = (existingKeys || []).filter((k) => !newIds.has(k));
          return openDB().then((db) => new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            toDelete.forEach((k) => store.delete(k));
            (items || []).forEach((item) => store.put(item));
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          }));
        }).catch((e) => { console.warn('[db] replaceAll hatası:', e); })
      : Promise.resolve(),"""

if chunked_replaceall in s:
    s = s.replace(chunked_replaceall, atomic_replaceall, 1)
    print("  ✓ replaceAll tek transaction'a döndürüldü")
elif "toDelete.forEach((k) => store.delete(k));\n            (items || []).forEach" in s:
    print("  •  replaceAll zaten atomik, atlandı")
else:
    print("  ⚠  replaceAll chunk deseni bulunamadı — kontrol et")

# ── _chunkedWrite yardımcısını kaldır (artık kullanılmıyor) ──
import re
# Yorumuyla birlikte tüm fonksiyonu sil
pattern = r"// Yazmayı parçalara bölerek yapar[\s\S]*?\n  return new Promise\(function\(resolve, reject\) \{[\s\S]*?next\(0\);\n  \}\);\n\}\n\n"
new_s = re.sub(pattern, "", s)
if new_s != s:
    s = new_s
    print("  ✓ _chunkedWrite yardımcısı kaldırıldı (artık gereksiz)")
else:
    if "_chunkedWrite" not in s:
        print("  •  _chunkedWrite zaten yok")
    else:
        print("  ⚠  _chunkedWrite hâlâ var ama saveAll/replaceAll kullanmıyor — zararsız, bırakıldı")

if s != orig:
    open(path, 'w', encoding='utf-8').write(s)
    print("  → db.js güncellendi.")
else:
    print("  → db.js değişmedi.")
PYEOF

rm -f "$f.bak"
echo ""
echo "Bitti. saveAll/replaceAll artık tek atomik transaction — getAll asla"
echo "yarım veri görmez. (Çakışma için ayrıca sync'i render'dan sonraya alacağız.)"
