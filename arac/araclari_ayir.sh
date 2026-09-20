#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────
# araclari_ayir.sh — geliştirme araçlarını uygulama kökünden ayırır
#
# Neden: deploy.sh kökteki ./*.js dosyalarının HEPSİNİ www/ içine ve
# oradan native pakete kopyalıyor (deploy.sh satır 151-152). Kökte
# duran bir test dosyası böylece iOS/Android uygulamasının içine
# giriyor. Alt klasörler kopyalanmıyor — bu yüzden araçların yeri
# arac/ klasörü.
#
# Ne yapar: test_*.js ve *.py dosyalarını repo kökünden arac/ altına
# taşır, git'te kayıtlıysa git mv ile (geçmiş korunur), değilse mv ile.
#
# Kullanım:
#   chmod +x araclari_ayir.sh
#   ./araclari_ayir.sh            # ne yapacağını gösterir, dokunmaz
#   ./araclari_ayir.sh --uygula   # gerçekten taşır ve commit eder
# ────────────────────────────────────────────────────────────
set -uo pipefail

REPO="/Users/emirgundogdu/Projects/Repertuvar/app"
ESKI_ARAC="/Users/emirgundogdu/Projects/Repertuvar/Araçlar"
HEDEF="arac"

UYGULA=false
[ "${1:-}" = "--uygula" ] && UYGULA=true

cd "$REPO" || { echo "❌ Repo bulunamadı: $REPO"; exit 1; }
git rev-parse --git-dir >/dev/null 2>&1 || { echo "❌ Burası git reposu değil: $REPO"; exit 1; }

echo "📁 Repo: $REPO"
$UYGULA || echo "🔍 DENEME MODU — hiçbir dosya taşınmayacak (--uygula ile çalıştır)"
echo

# ── 1) Kökteki araç dosyalarını bul ─────────────────────────────────
# Uygulamanın parçası olan .js dosyalarına DOKUNULMAZ; yalnızca
# test_ ile başlayanlar ve .py uzantılılar araç sayılır.
mapfile -t BULUNAN < <(find . -maxdepth 1 -type f \
  \( -name 'test_*.js' -o -name '*.py' \) -exec basename {} \; | sort)

if [ ${#BULUNAN[@]} -eq 0 ]; then
  echo "✓ Kökte taşınacak araç dosyası yok."
else
  echo "Kökte bulunan araç dosyaları:"
  printf '   - %s\n' "${BULUNAN[@]}"
fi
echo

# ── 2) Taşı ─────────────────────────────────────────────────────────
if [ ${#BULUNAN[@]} -gt 0 ] && $UYGULA; then
  mkdir -p "$HEDEF"
  for f in "${BULUNAN[@]}"; do
    if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
      git mv -f "$f" "$HEDEF/$f" && echo "   git mv  $f → $HEDEF/"
    else
      mv -f "$f" "$HEDEF/$f" && echo "   mv      $f → $HEDEF/  (git'te değildi)"
    fi
  done
  echo
fi

# ── 3) Eski Araçlar klasöründekileri de içeri al ────────────────────
if [ -d "$ESKI_ARAC" ]; then
  echo "📦 Sürüm takibi dışındaki klasör: $ESKI_ARAC"
  find "$ESKI_ARAC" -maxdepth 1 -type f \( -name '*.py' -o -name '*.js' -o -name '*.csv' \) \
    -exec basename {} \; | sed 's/^/   - /'
  if $UYGULA; then
    mkdir -p "$HEDEF"
    find "$ESKI_ARAC" -maxdepth 1 -type f \( -name '*.py' -o -name '*.js' \) \
      -exec cp -f {} "$HEDEF/" \;
    echo "   ✓ arac/ içine kopyalandı (orijinaller yerinde bırakıldı)"
  fi
  echo
fi

# ── 4) Doğrulama: kökte test dosyası kalmamalı ──────────────────────
KALAN=$(find . -maxdepth 1 -type f \( -name 'test_*.js' -o -name '*.py' \) | wc -l | tr -d ' ')
echo "🔍 Kökte kalan araç dosyası: $KALAN"
if [ "$KALAN" != "0" ] && $UYGULA; then
  echo "   ⚠️  Beklenmedik — elle bak."
fi

# arac/ klasörünün deploy'a karışmadığını göster
echo "🔍 deploy.sh yalnızca kökteki dosyaları kopyalıyor:"
grep -n 'cp -f \./\*' deploy.sh | sed 's/^/   /'
echo "   → alt klasör olduğu için arac/ www/ ve native pakete GİRMEZ."
echo

# ── 5) Commit ───────────────────────────────────────────────────────
if $UYGULA; then
  if [ -n "$(git status --porcelain)" ]; then
    git add -A "$HEDEF" 2>/dev/null
    git add -A 2>/dev/null
    git commit -m "araclar arac/ klasorune tasindi (uygulama paketinden cikarildi)" \
      && git push && echo "✅ Gönderildi."
  else
    echo "✓ Değişiklik yok, commit gerekmedi."
  fi
else
  echo "Devam etmek için:  ./araclari_ayir.sh --uygula"
fi
