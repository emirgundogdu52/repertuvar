#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────
# Repertuvar — tek komutla deploy (web + www/ + native)
#
# Kullanım:
#   ./deploy.sh "commit mesajı"     → push + www/ + native sync + DOĞRULAMA (VARSAYILAN)
#   ./deploy.sh "mesaj" --run       → yukarıdakiler + simülatöre/cihaza kur
#   ./deploy.sh "mesaj" --web       → SADECE web (native ATLANIR — cihazda eski sürüm kalır!)
#   ./deploy.sh                     → mesaj vermezsen tarih/saat kullanır
#
# NOT: Cihazda/simülatörde test edeceksen --web KULLANMA.
# İlk sefer:  chmod +x deploy.sh
# ────────────────────────────────────────────────────────────
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO" || { echo "❌ Repo bulunamadı: $REPO"; exit 1; }

MSG=""; RUN_IOS=false; WEB_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --run) RUN_IOS=true ;;
    --web) WEB_ONLY=true ;;
    *) [ -z "$MSG" ] && MSG="$arg" ;;
  esac
done
[ -z "$MSG" ] && MSG="deploy $(date '+%Y-%m-%d %H:%M')"

echo "📁 $REPO"

# --- 1) Service worker cache sürümü ---
if [ -f service-worker.js ]; then
  perl -i -pe 's/(repertuvar-v)(\d+)/$1.($2+1)/e' service-worker.js
  echo "🔖 Service worker: $(grep -oE 'repertuvar-v[0-9]+' service-worker.js | head -1)"
fi

# --- 2) Git ---
# 2026-07-29: push HATASINDA ARTIK DURUYOR. Eski hali "git push && echo" idi:
# push reddedilince && kısa devre yapıyor, hata mesajı basılmıyor, script www/ ve
# native sync'e devam edip "N dosya doğrulandı" yeşil mesajını veriyordu. Kök,
# www/ ve native aynı olduğu için doğrulama teknik olarak haklıydı ama WEB'in
# güncellenmediğini söylemiyordu → yanıltıcı yarım deploy.
git add -A
if git diff --cached --quiet; then
  echo "ℹ️  Commit edilecek değişiklik yok."
else
  if ! git commit -m "$MSG"; then
    echo "❌ Commit başarısız — deploy durduruldu."; exit 1
  fi
  echo "✅ Commit: $MSG"
fi

if git rev-parse --verify --quiet origin/main >/dev/null; then
  git fetch origin main --quiet || echo "⚠️  git fetch başarısız (ağ?) — ayrışma kontrolü eski bilgiyle yapılıyor"
  AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)
  BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)
else
  echo "ℹ️  origin/main henüz yok — ilk push."
  AHEAD=1; BEHIND=0
fi

# Ayrışma: uzakta burada olmayan commit varsa push zaten reddedilir ("fetch first").
# Tek sebebi GitHub WEB ARAYÜZÜNDEN dosya yüklemek. Push'u denemeden dur ve yolu söyle.
if [ "$BEHIND" -gt 0 ]; then
  echo ""
  echo "❌ AYRIŞMA: origin/main'de bu klasörde olmayan $BEHIND commit var."
  echo "   Sebebi neredeyse her zaman: GitHub web arayüzünden dosya yüklemek."
  echo ""
  echo "   Çözüm (sırayla):"
  echo "     git branch yedek-$(date '+%d%b%H%M')     # güvenlik ağı"
  echo "     git merge origin/main                    # REBASE DEĞİL: rebase'te --ours karşı tarafı seçer"
  echo "     git checkout --ours <çakışan dosya> && git add <çakışan dosya>"
  echo "     git commit --no-edit"
  echo "     ./deploy.sh \"$MSG\""
  echo ""
  echo "   Deploy DURDURULDU — www/ ve native'e dokunulmadı."
  exit 1
fi

if [ "$AHEAD" -gt 0 ]; then
  if git push origin main; then
    echo "🚀 Push edildi ($AHEAD commit) — repertuvar.app ~1-2 dk"
  else
    echo ""
    echo "❌ PUSH BAŞARISIZ — WEB SÜRÜMÜ GÜNCELLENMEDİ (repertuvar.app eski kalır)."
    echo "   Deploy DURDURULDU: www/ ve native'e bilerek dokunulmadı, yoksa"
    echo "   'dosyalar doğrulandı' mesajı yarım deploy'u başarı gibi gösteriyor."
    echo "   Yukarıdaki git hatasını oku; ayrışma diyorsa: git fetch && git merge origin/main"
    exit 1
  fi
else
  echo "ℹ️  Push gerekmiyor — uzak sürüm zaten güncel."
fi

if $WEB_ONLY; then
  echo ""
  echo "⚠️  --web KULLANILDI: www/ ve native GÜNCELLENMEDİ."
  echo "    Cihazda/simülatörde ESKİ sürüm çalışmaya devam eder."
  echo "    Cihazda test için bayraksız çalıştır:  ./deploy.sh \"$MSG\""
  exit 0
fi

# --- 3) Dosyaları www/ içine kopyala ---
mkdir -p www
echo "🔄 www/ güncelleniyor..."
if npm run sync >/dev/null 2>&1; then
  echo "   ✓ npm run sync"
else
  echo "   ⚠️  npm run sync başarısız/eksik — doğrudan kopyalanıyor"
  cp -f ./*.html www/ 2>/dev/null
  cp -f ./*.js   www/ 2>/dev/null
  cp -f ./*.css  www/ 2>/dev/null
  cp -f ./*.png  www/ 2>/dev/null
  cp -f ./*.svg  www/ 2>/dev/null
  [ -f manifest.json ] && cp -f manifest.json www/
  echo "   ✓ manuel kopyalama"
fi

# --- 4) Capacitor → native klasörleri ---
echo "🔄 npx cap sync ios ..."
if npx cap sync ios >/dev/null 2>&1; then
  echo "   ✓ cap sync ios"
else
  echo "❌ cap sync ios başarısız — Xcode/Capacitor kurulumunu kontrol et"; exit 1
fi

# --- 5) DOĞRULAMA: kök → www/ → native ---
NATIVE_DIR="ios/App/App/public"
FAIL=0; OK=0
echo ""
echo "🔍 Doğrulama (kök → www/ → native)"
for f in ./*.html ./*.js ./*.css manifest.json; do
  [ -f "$f" ] || continue
  base=$(basename "$f")
  if [ ! -f "www/$base" ]; then
    echo "   ❌ www/$base YOK"; FAIL=$((FAIL+1)); continue
  fi
  if ! diff -q "$f" "www/$base" >/dev/null; then
    echo "   ❌ www/$base kök dosyadan FARKLI"; FAIL=$((FAIL+1)); continue
  fi
  if [ -d "$NATIVE_DIR" ]; then
    if [ ! -f "$NATIVE_DIR/$base" ]; then
      echo "   ❌ $NATIVE_DIR/$base YOK"; FAIL=$((FAIL+1)); continue
    fi
    if ! diff -q "$f" "$NATIVE_DIR/$base" >/dev/null; then
      echo "   ❌ $NATIVE_DIR/$base kök dosyadan FARKLI"; FAIL=$((FAIL+1)); continue
    fi
  fi
  OK=$((OK+1))
done

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✅ $OK dosya doğrulandı — kök, www/ ve native aynı (web push da tamam)."
else
  echo "⚠️  $FAIL dosya eşleşmedi, $OK dosya tamam."
  echo "    Bunlar cihazda ESKİ kalır — tekrar çalıştır ya da elle kontrol et."
fi

# --- 6) İstenirse kur ---
if $RUN_IOS; then
  echo ""
  echo "📲 npx cap run ios ..."
  npx cap run ios
else
  echo ""
  echo "➡️  Cihaza kurmak için: Xcode → hedef cihaz → Clean Build Folder → Run"
  echo "   (tek adımda:  ./deploy.sh \"mesaj\" --run)"
fi

[ "$FAIL" -eq 0 ] || exit 1
