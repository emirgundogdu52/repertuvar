#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Swipe çerçeve + Sil paneli renk/kalınlık eşitleme
# eserler.html · repertoires.html · stage.html
#
# Kullanım:  proje klasöründe (bu 3 dosyanın olduğu yerde) çalıştır:
#   bash swipe-cerceve-esitle.sh
#
# Standart: çerçeve #4DA3FF→#FF5A5F, padding:2.5px, Sil paneli #FF5A5F
# Radius'lara DOKUNULMAZ (eserler 16px, repertuvar/sahne 10px kendi kartına uygun)
# ─────────────────────────────────────────────────────────────
set -e

py() { python3 "$@"; }

patch_file() {
  local file="$1"; shift
  if [ ! -f "$file" ]; then
    echo "  ⚠  $file bulunamadı, atlanıyor."
    return
  fi
  cp "$file" "$file.bak"
  python3 - "$file" "$@" <<'PYEOF'
import sys
path = sys.argv[1]
pairs = sys.argv[2:]
s = open(path, encoding='utf-8').read()
orig = s
# pairs: OLD1 NEW1 OLD2 NEW2 ...
for i in range(0, len(pairs), 2):
    old, new = pairs[i], pairs[i+1]
    if old in s:
        s = s.replace(old, new)
        print(f"  ✓ değişti: {old[:48]}...")
    else:
        print(f"  •  bulunamadı (zaten uygulanmış olabilir): {old[:48]}...")
if s != orig:
    open(path, 'w', encoding='utf-8').write(s)
    print(f"  → {path} güncellendi.")
else:
    print(f"  → {path} değişmedi.")
PYEOF
  rm -f "$file.bak"
}

echo "1) eserler.html"
patch_file "eserler.html" \
  "border-radius:16px; padding:2px;
    background:linear-gradient(90deg,var(--accent2),#FF5A5F);" \
  "border-radius:16px; padding:2.5px;
    background:linear-gradient(90deg,#4DA3FF,#FF5A5F);"

echo "2) repertoires.html"
patch_file "repertoires.html" \
  "border-radius:10px; padding:2px;
  background:linear-gradient(90deg,var(--accent2,#4DA3FF),#e5484d);" \
  "border-radius:10px; padding:2.5px;
  background:linear-gradient(90deg,#4DA3FF,#FF5A5F);" \
  ".ri-delete-bg{position:absolute;top:0;right:0;bottom:0;width:84px;background:#e5484d;color:#fff;" \
  ".ri-delete-bg{position:absolute;top:0;right:0;bottom:0;width:84px;background:#FF5A5F;color:#fff;"

echo "3) stage.html"
patch_file "stage.html" \
  "border-radius:10px; padding:2px;
  background:linear-gradient(90deg,#4DA3FF,#e5484d);" \
  "border-radius:10px; padding:2.5px;
  background:linear-gradient(90deg,#4DA3FF,#FF5A5F);" \
  ".rs-delete-bg{right:0;background:#e5484d;}" \
  ".rs-delete-bg{right:0;background:#FF5A5F;}"

echo ""
echo "Bitti. Kontrol için:  grep -n 'padding:2.5px\|#FF5A5F' eserler.html repertoires.html stage.html"
