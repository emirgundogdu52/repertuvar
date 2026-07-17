#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# istatistikler.html — "Veriler yükleniyor" takılmasını düzelt
#
# Kök neden: istatistikler.html satır 125-126'da `const SUPA_URL` /
# `const SUPA_KEY` var. Ama auth.js (satır 8'de yüklenen) zaten
# `var SUPA_URL` / `var SUPA_KEY` tanımlıyor. Aynı global isim iki kez
# → tarayıcı "Identifier 'SUPA_URL' has already been declared" verip
# TÜM inline bloğu reddediyor → loadStats hiç tanımlanmıyor → sayfa
# sonsuza kadar "Veriler yükleniyor..." durumunda kalıyor.
#
# Çözüm: istatistikler.html'deki iki çakışan const tanımını sil.
# auth.js global olarak zaten sağlıyor.
#
# Kullanım (istatistikler.html ile aynı klasörde):
#   bash istatistik-fix.sh
# ═══════════════════════════════════════════════════════════════
set -e

f="istatistikler.html"
if [ ! -f "$f" ]; then echo "⚠  istatistikler.html yok."; exit 1; fi
cp "$f" "$f.bak"

python3 - <<'PYEOF'
path = "istatistikler.html"
s = open(path, encoding='utf-8').read()
orig = s

# İki çakışan satırı sil (auth.js zaten sağlıyor).
line1 = "const SUPA_URL = 'https://ehytkzxdhjyjuubizdnl.supabase.co';\n"
line2 = "const SUPA_KEY = 'sb_publishable_f_WsYxzN06B5dGROrkGyPQ_UDxKSbtO';\n"

removed = 0
if line1 in s:
    s = s.replace(line1, "", 1)
    removed += 1
    print("  ✓ const SUPA_URL satırı kaldırıldı (auth.js sağlıyor)")
else:
    print("  •  const SUPA_URL satırı bulunamadı (zaten kaldırılmış olabilir)")

if line2 in s:
    s = s.replace(line2, "", 1)
    removed += 1
    print("  ✓ const SUPA_KEY satırı kaldırıldı (auth.js sağlıyor)")
else:
    print("  •  const SUPA_KEY satırı bulunamadı (zaten kaldırılmış olabilir)")

if s != orig:
    open(path, 'w', encoding='utf-8').write(s)
    print("  → istatistikler.html güncellendi (%d satır kaldırıldı)." % removed)
else:
    print("  → değişiklik yok.")
PYEOF

rm -f "$f.bak"
echo ""
echo "Bitti. Artık SUPA_URL/SUPA_KEY sadece auth.js'de tanımlı — çakışma"
echo "gitti, inline blok çalışacak, loadStats tanımlanacak, sayfa yüklenecek."
