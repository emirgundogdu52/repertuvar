#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# db.js — YAZMAYI PARÇALA (chunk) ki okumaları bloke etmesin
#
# Kanıtlanan sorun: saveAll/replaceAll 410 kaydı TEK readwrite
# transaction'da yazıyor. Bu transaction açıkken aynı store'a gelen
# getAll okumaları bekliyor → 3sn timeout → sayfa 6-7sn boş kalıyor.
# (Manuel getAll 2ms'de dönüyordu; fark, açılışta yazma+okuma yarışı.)
#
# Çözüm: yazmayı 100'erlik parçalara böl. Her parça KISA bir transaction;
# parçalar arasında okuma "nefes alır" (araya bir makrotask girer).
# Böylece yazma sürerken bile okuma en fazla bir parça kadar (~ms) bekler.
#
# saveAll ve replaceAll'ın DIŞ imzası aynı kalır (aynı şekilde çağrılır),
# sadece iç yazma mekanizması parçalanır.
#
# Kullanım (db.js ile aynı klasörde):
#   bash db-chunk-write-fix.sh
# ═══════════════════════════════════════════════════════════════
set -e

f="db.js"
if [ ! -f "$f" ]; then echo "⚠  db.js yok."; exit 1; fi
cp "$f" "$f.bak"

python3 - <<'PYEOF'
path = "db.js"
s = open(path, encoding='utf-8').read()
orig = s

# ── 1) _chunkedWrite yardımcısını ekle (makeStore'dan ÖNCE) ──
if "_chunkedWrite" not in s:
    anchor = "function makeStore(storeName) {"
    helper = '''// Yazmayı parçalara bölerek yapar: her parça ayrı, KISA bir readwrite
// transaction. Parçalar arasında araya bir makrotask (setTimeout 0) girer,
// böylece bekleyen okuma (getAll) transaction'lar arasında çalışabilir —
// tek dev transaction okumaları saniyelerce bloke etmez.
// deletes: silinecek anahtarlar (yalnız replaceAll kullanır), puts: yazılacak kayıtlar.
function _chunkedWrite(storeName, deletes, puts, chunkSize) {
  chunkSize = chunkSize || 100;
  deletes = deletes || [];
  puts = puts || [];
  // İş listesi: önce silmeler, sonra yazmalar — sırayla parçalanır.
  var ops = [];
  for (var i = 0; i < deletes.length; i++) ops.push({ del: deletes[i] });
  for (var j = 0; j < puts.length; j++) ops.push({ put: puts[j] });

  function writeChunk(start) {
    return openDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(storeName, 'readwrite');
        var store = tx.objectStore(storeName);
        var end = Math.min(start + chunkSize, ops.length);
        for (var k = start; k < end; k++) {
          var op = ops[k];
          if ('del' in op) store.delete(op.del);
          else store.put(op.put);
        }
        tx.oncomplete = function() { resolve(end); };
        tx.onerror = function() { reject(tx.error); };
      });
    });
  }

  return new Promise(function(resolve, reject) {
    function next(start) {
      if (start >= ops.length) { resolve(); return; }
      writeChunk(start).then(function(end) {
        // Araya makrotask koy: bekleyen okuma bu boşlukta çalışabilir.
        setTimeout(function() { next(end); }, 0);
      }).catch(reject);
    }
    next(0);
  });
}

'''
    s = s.replace(anchor, helper + anchor, 1)
    print("  ✓ _chunkedWrite yardımcısı eklendi")
else:
    print("  •  _chunkedWrite zaten var, atlandı")

# ── 2) saveAll'ı chunk'lı yap ──
old_saveall = """    saveAll: (items) => HAS_IDB
      ? openDB().then((db) => new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          items.forEach((item) => store.put(item));
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        })).catch((e) => { console.warn('[db] saveAll hatası:', e); })
      : Promise.resolve(),"""
new_saveall = """    saveAll: (items) => HAS_IDB
      ? _chunkedWrite(storeName, [], items || [], 100)
          .catch((e) => { console.warn('[db] saveAll hatası:', e); })
      : Promise.resolve(),"""

if "_chunkedWrite(storeName, [], items" in s:
    print("  •  saveAll zaten chunk'lı, atlandı")
elif old_saveall in s:
    s = s.replace(old_saveall, new_saveall, 1)
    print("  ✓ saveAll chunk'lı hale getirildi")
else:
    print("  ✗ saveAll bloğu bulunamadı!")

# ── 3) replaceAll'ı chunk'lı yap ──
old_replaceall = """    replaceAll: (items) => HAS_IDB
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
new_replaceall = """    replaceAll: (items) => HAS_IDB
      ? storeOp(storeName, 'readonly', (s) => s.getAllKeys()).then((existingKeys) => {
          const newIds = new Set((items || []).map((it) => it.id));
          const toDelete = (existingKeys || []).filter((k) => !newIds.has(k));
          return _chunkedWrite(storeName, toDelete, items || [], 100);
        }).catch((e) => { console.warn('[db] replaceAll hatası:', e); })
      : Promise.resolve(),"""

if "return _chunkedWrite(storeName, toDelete" in s:
    print("  •  replaceAll zaten chunk'lı, atlandı")
elif old_replaceall in s:
    s = s.replace(old_replaceall, new_replaceall, 1)
    print("  ✓ replaceAll chunk'lı hale getirildi")
else:
    print("  ✗ replaceAll bloğu bulunamadı!")

if s != orig:
    open(path, 'w', encoding='utf-8').write(s)
    print("  → db.js güncellendi.")
else:
    print("  → db.js değişmedi.")
PYEOF

rm -f "$f.bak"
echo ""
echo "Bitti. Artık sync sırasında yazma okumaları bloke etmez —"
echo "sayfa açılışta local veriyi anında gösterir, 6-7sn boşluk biter."
