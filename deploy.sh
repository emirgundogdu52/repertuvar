#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────
# Repertuvar — tek komutla deploy (web + www/ + native)
#
# Kullanım:
#   ./deploy.sh "commit mesajı"     → push + www/ + native sync + DOĞRULAMA (VARSAYILAN)
#   ./deploy.sh "mesaj" --run       → yukarıdakiler + simülatöre/cihaza kur
#   ./deploy.sh "mesaj" --web       → SADECE web (native ATLANIR — cihazda eski sürüm kalır!)
#   ./deploy.sh "mesaj" --hizli     → canlı (yayın) doğrulamasını atla
#   ./deploy.sh                     → mesaj vermezsen tarih/saat kullanır
#
# NOT: Cihazda/simülatörde test edeceksen --web KULLANMA.
# İlk sefer:  chmod +x deploy.sh
#
# DEĞİŞİKLİK GÜNLÜĞÜ
# 2026-08-15 — ÜÇ EKSİK KAPATILDI (Emir'in isteği üzerine):
#   (1) ANDROID SESSİZCE ESKİYORDU. Script yalnızca `npx cap sync ios` yapıyor
#       ve doğrulamayı yalnız ios/App/App/public üzerinde çalıştırıyordu; oysa
#       repoda android/app/src/main/assets/public da var. Android'de eski sürüm
#       kalıyor ve bunu söyleyen hiçbir uyarı yoktu. Artık mevcut olan HER
#       platform sync ediliyor ve doğrulamaya giriyor.
#   (2) PUSH SONRASI CANLI DOĞRULAMA YOKTU. Script "kök, www ve native aynı"
#       diyordu ama bu yalnız YERELDEKİ tutarlılık — yayının gerçekten
#       güncellendiğini söylemiyordu. 2026-08-15'te tam bu yüzden defalarca
#       "deploy oldu mu" tartışıldı. Artık canlı service-worker.js çekilip
#       sürüm numarası yereldekiyle karşılaştırılıyor (GitHub Pages ~1-2 dk).
#   (3) BOŞ COMMIT ÜRETİYORDU. Sürüm artırma her çalıştırmada yapıldığı için,
#       başka hiçbir dosya değişmese bile "1 file changed" commit'i çıkıyordu.
#       Bu, 2026-08-15'te teslim dosyası indirilmediği hâlde deploy olmuş
#       izlenimi verdi. Artık önce değişiklik var mı diye bakılıyor.
# ────────────────────────────────────────────────────────────
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO" || { echo "❌ Repo bulunamadı: $REPO"; exit 1; }

MSG=""; RUN_IOS=false; WEB_ONLY=false; SKIP_LIVE=false
for arg in "$@"; do
  case "$arg" in
    --run)   RUN_IOS=true ;;
    --web)   WEB_ONLY=true ;;
    --hizli|--fast) SKIP_LIVE=true ;;
    *) [ -z "$MSG" ] && MSG="$arg" ;;
  esac
done
[ -z "$MSG" ] && MSG="deploy $(date '+%Y-%m-%d %H:%M')"

echo "📁 $REPO"

# --- 0) Değişiklik var mı? ---
# Service worker sürümünü ARTIRMADAN ÖNCE bakıyoruz: yoksa sürüm tek başına
# değişip boş bir commit üretiyor ve "bir şey deploy edildi" izlenimi veriyor.
DEGISIKLIK=false
if [ -n "$(git status --porcelain -- . ':(exclude)service-worker.js')" ]; then
  DEGISIKLIK=true
fi
UNPUSHED=0
if git rev-parse --verify --quiet origin/main >/dev/null; then
  UNPUSHED=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)
fi

# --- 1) Service worker cache sürümü ---
if [ -f service-worker.js ]; then
  if $DEGISIKLIK; then
    perl -i -pe 's/(repertuvar-v)(\d+)/$1.($2+1)/e' service-worker.js
    echo "🔖 Service worker: $(grep -oE 'repertuvar-v[0-9]+' service-worker.js | head -1)"
  else
    echo "🔖 Service worker: $(grep -oE 'repertuvar-v[0-9]+' service-worker.js | head -1) (değişiklik yok — artırılmadı)"
  fi
fi
SW_YEREL="$(grep -oE 'repertuvar-v[0-9]+' service-worker.js 2>/dev/null | head -1)"

# --- 2) Git ---
# 2026-07-29: push HATASINDA ARTIK DURUYOR. Eski hali "git push && echo" idi:
# push reddedilince && kısa devre yapıyor, hata mesajı basılmıyor, script www/ ve
# native sync'e devam edip "N dosya doğrulandı" yeşil mesajını veriyordu. Kök,
# www/ ve native aynı olduğu için doğrulama teknik olarak haklıydı ama WEB'in
# güncellenmediğini söylemiyordu → yanıltıcı yarım deploy.
git add -A
if git diff --cached --quiet; then
  echo "ℹ️  Commit edilecek değişiklik yok."
  if [ "$UNPUSHED" -eq 0 ]; then
    echo "    (Teslim dosyasını proje klasörüne indirmeyi unutmuş olabilir misin?)"
  fi
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

PUSH_EDILDI=false
if [ "$AHEAD" -gt 0 ]; then
  if git push origin main; then
    echo "🚀 Push edildi ($AHEAD commit) — repertuvar.app ~1-2 dk"
    PUSH_EDILDI=true
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
fi

if ! $WEB_ONLY; then
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
  # 2026-08-15: Android eklendi. Hangi platform klasörü VARSA o sync ediliyor;
  # olmayan platform sessizce atlanıyor (repoda yoksa hata değil).
  PLATFORMLAR=()
  [ -d ios ]     && PLATFORMLAR+=("ios")
  [ -d android ] && PLATFORMLAR+=("android")
  if [ ${#PLATFORMLAR[@]} -eq 0 ]; then
    echo "ℹ️  Native platform klasörü yok — cap sync atlandı."
  fi
  for plat in "${PLATFORMLAR[@]:-}"; do
    [ -z "$plat" ] && continue
    echo "🔄 npx cap sync $plat ..."
    if npx cap sync "$plat" >/dev/null 2>&1; then
      echo "   ✓ cap sync $plat"
    else
      echo "❌ cap sync $plat başarısız — Xcode/Android Studio/Capacitor kurulumunu kontrol et"; exit 1
    fi
  done

  # --- 5) DOĞRULAMA: kök → www/ → native ---
  NATIVE_DIRS=()
  [ -d "ios/App/App/public" ]                     && NATIVE_DIRS+=("ios/App/App/public")
  [ -d "android/app/src/main/assets/public" ]     && NATIVE_DIRS+=("android/app/src/main/assets/public")

  FAIL=0; OK=0
  echo ""
  echo "🔍 Doğrulama (kök → www/ → ${NATIVE_DIRS[*]:-native yok})"
  for f in ./*.html ./*.js ./*.css manifest.json; do
    [ -f "$f" ] || continue
    base=$(basename "$f")
    if [ ! -f "www/$base" ]; then
      echo "   ❌ www/$base YOK"; FAIL=$((FAIL+1)); continue
    fi
    if ! diff -q "$f" "www/$base" >/dev/null; then
      echo "   ❌ www/$base kök dosyadan FARKLI"; FAIL=$((FAIL+1)); continue
    fi
    SORUN=0
    for nd in "${NATIVE_DIRS[@]:-}"; do
      [ -z "$nd" ] && continue
      if [ ! -f "$nd/$base" ]; then
        echo "   ❌ $nd/$base YOK"; SORUN=1; continue
      fi
      if ! diff -q "$f" "$nd/$base" >/dev/null; then
        echo "   ❌ $nd/$base kök dosyadan FARKLI"; SORUN=1
      fi
    done
    if [ "$SORUN" -eq 1 ]; then FAIL=$((FAIL+1)); else OK=$((OK+1)); fi
  done

  echo ""
  if [ "$FAIL" -eq 0 ]; then
    echo "✅ $OK dosya doğrulandı — kök, www/ ve native aynı."
  else
    echo "⚠️  $FAIL dosya eşleşmedi, $OK dosya tamam."
    echo "    Bunlar cihazda ESKİ kalır — tekrar çalıştır ya da elle kontrol et."
  fi
fi

# --- 6) CANLI DOĞRULAMA (yayın gerçekten güncellendi mi?) ---
# 2026-08-15: Yereldeki tutarlılık yayının güncellendiğini KANITLAMAZ.
# Canlı service-worker.js'teki sürüm numarası yereldekiyle eşleşene kadar
# bekliyoruz; GitHub Pages tipik olarak 1-2 dakikada yayıyor.
if $PUSH_EDILDI && ! $SKIP_LIVE && [ -n "$SW_YEREL" ]; then
  echo ""
  echo "🌐 Canlı doğrulama — beklenen: $SW_YEREL"
  CANLI=""
  for i in $(seq 1 20); do
    sleep 9
    CANLI="$(curl -fsSL "https://app.repertuvar.app/service-worker.js?nocache=$(date +%s)" 2>/dev/null \
             | grep -oE 'repertuvar-v[0-9]+' | head -1)"
    if [ "$CANLI" = "$SW_YEREL" ]; then
      echo "   ✅ Yayında: $CANLI  (~$((i*9)) sn)"
      break
    fi
    printf '   … %s bekleniyor (canlı: %s)\r' "$SW_YEREL" "${CANLI:-yok}"
  done
  echo ""
  if [ "$CANLI" != "$SW_YEREL" ]; then
    echo "   ⚠️  3 dakikada yayına çıkmadı (canlı: ${CANLI:-okunamadı})."
    echo "      GitHub Actions'ta 'pages build and deployment' başarılı mı bak."
    echo "      DOĞRU REPO: uygulama = repertuvar, landing = repertuvar-site."
  fi
elif $SKIP_LIVE; then
  echo ""
  echo "ℹ️  --hizli: canlı doğrulama atlandı."
fi

# --- 7) İstenirse kur ---
if $RUN_IOS; then
  echo ""
  echo "📲 npx cap run ios ..."
  npx cap run ios
elif ! $WEB_ONLY; then
  echo ""
  echo "➡️  Cihaza kurmak için: Xcode → hedef cihaz → Clean Build Folder → Run"
  echo "   (tek adımda:  ./deploy.sh \"mesaj\" --run)"
fi

[ "${FAIL:-0}" -eq 0 ] || exit 1
