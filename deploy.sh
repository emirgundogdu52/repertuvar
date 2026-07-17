#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────
# Repertuvar — tek komutla deploy + native sync
#
# Kullanım:
#   ./deploy.sh "commit mesajı"          → push + www sync + cap sync ios
#   ./deploy.sh "mesaj" --run            → yukarıdakiler + iPad/simülatöre kur
#   ./deploy.sh "mesaj" --web            → sadece git push (web testi; native atlanır)
#   ./deploy.sh                          → mesaj vermezsen tarih/saat kullanır
#
# İlk sefer çalıştırılabilir yap:  chmod +x deploy.sh
# ────────────────────────────────────────────────────────────
set -uo pipefail

# --- Repo klasörü (gerekirse burayı kendi yolunla değiştir) ---
REPO="$HOME/Desktop/Yeni Repertuvar/Repertuvar App Claude/Repertuvar"
cd "$REPO" || { echo "❌ Repo bulunamadı: $REPO"; exit 1; }

# --- Argümanları ayrıştır (mesaj + bayraklar herhangi bir sırada) ---
MSG=""
RUN_IOS=false
WEB_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --run) RUN_IOS=true ;;
    --web) WEB_ONLY=true ;;
    *) [ -z "$MSG" ] && MSG="$arg" ;;
  esac
done
[ -z "$MSG" ] && MSG="deploy $(date '+%Y-%m-%d %H:%M')"

echo "📁 $REPO"

# --- 1) Service worker cache sürümünü otomatik artır (repertuvar-vN) ---
if [ -f service-worker.js ]; then
  perl -i -pe 's/(repertuvar-v)(\d+)/$1.($2+1)/e' service-worker.js
  NEWV=$(grep -oE 'repertuvar-v[0-9]+' service-worker.js | head -1)
  echo "🔖 Service worker sürümü: ${NEWV:-?}"
fi

# --- 2) Git: ekle, commit, push ---
git add -A
if git diff --cached --quiet; then
  echo "ℹ️  Commit edilecek değişiklik yok."
else
  git commit -m "$MSG" && echo "✅ Commit: $MSG"
  git push origin main && echo "🚀 Push edildi (web ~1-2 dk içinde güncellenir)"
fi

# --- Sadece web testi isteniyorsa burada dur ---
if $WEB_ONLY; then
  echo "🌐 --web: native sync atlandı. repertuvar.app'ten test edebilirsin."
  exit 0
fi

# --- 3) www/ güncelle + Capacitor sync ---
echo "🔄 npm run sync ..."
npm run sync   || { echo "❌ npm run sync başarısız"; exit 1; }
echo "🔄 npx cap sync ios ..."
npx cap sync ios || { echo "❌ cap sync ios başarısız"; exit 1; }

# --- 4) www/ gerçekten güncellendi mi hızlı doğrulama ---
for f in repertoires.js stage.html eserler.html; do
  if [ -f "$f" ] && [ -f "www/$f" ]; then
    if diff -q "$f" "www/$f" >/dev/null; then
      echo "✅ www/$f güncel"
    else
      echo "⚠️  www/$f kök dosyayla FARKLI — sync'i kontrol et!"
    fi
  fi
done

# --- 5) İstenirse cihaza/simülatöre kur ---
if $RUN_IOS; then
  echo "📲 npx cap run ios (cihaz/simülatör seç) ..."
  npx cap run ios
else
  echo ""
  echo "✅ Bitti. Cihaza kurmak için: Xcode → hedef cihaz → Clean Build Folder → Run"
  echo "   Sonraki sefer tek adımda kurmak istersen:  ./deploy.sh \"mesaj\" --run"
fi
