#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# LOCAL-FIRST YÜKLEME STANDARDİZASYONU
# repertoires.js · stage.html · eserler.html
#
# Sorun: repertoires ve stage, works verisini (loadWorksData/loadWL)
# AWAIT ederek tüm UI'ı bekletiyordu. Ağır works sorgusu (limit 2000-10000)
# yavaşsa liste/picker geç geliyor ya da "sonsuz yükleniyor" görünüyordu.
#
# Çözüm: works yüklemesini await'ten çıkar. Önce UI'ı çiz (local repertuvarlar
# zaten anında geliyor), works arka planda gelince eser adlarını tazele.
# Kum saati yalnızca gerçekten hiç veri yokken (ilk kurulum) görünür.
#
# Kullanım (üç dosyanın olduğu klasörde):
#   bash local-first-standardize.sh
# ═══════════════════════════════════════════════════════════════
set -e

patch() {
  local file="$1" old="$2" new="$3" label="$4"
  if [ ! -f "$file" ]; then echo "  ⚠  $file yok, atlandı"; return; fi
  python3 - "$file" "$old" "$new" "$label" <<'PYEOF'
import sys
path, old, new, label = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
s = open(path, encoding='utf-8').read()
if new.strip() and new in s:
    print(f"  •  {label}: zaten uygulanmış, atlandı")
elif old in s:
    s = s.replace(old, new, 1)
    open(path,'w',encoding='utf-8').write(s)
    print(f"  ✓ {label}")
else:
    print(f"  ✗ {label}: hedef bulunamadı!")
PYEOF
}

echo "① repertoires.js"
# init: works'ü await etme; önce load(), works arka planda gelince tazele
patch "repertoires.js" \
'  if (window.syncOfflineData) syncOfflineData();
  await loadWorksData();
  load();
})();' \
'  if (window.syncOfflineData) syncOfflineData();
  // works verisini BEKLEME — repertuvar listesi works olmadan da çizilir (eser adları
  // sonra dolar). Önce local repertuvarları göster, works arka planda gelince tazele.
  load();
  loadWorksData().then(() => { renderList(); renderDetail(); });
})();' \
'init: await loadWorksData kaldırıldı, arka plana alındı'

echo ""
echo "② stage.html"
# init IIFE: loadWL()'yi SADECE picker açılışında arka plana al.
# ?share= ve ?work= dalları WL'ye bağımlı (tek eser gösterirler) — onlar için
# WL'nin hazır olması şart, o yüzden o senaryolarda await'i koruyoruz.
# Çözüm: share/work parametresi varsa await et, yoksa arka plana al.
patch "stage.html" \
'  // Önce Supabase'"'"'den WL'"'"'yi yükle
  await loadWL();' \
'  // WL (works) yüklemesi: tek-eser (?work=) ve paylaşım (?share=) linkleri WL'"'"'ye
  // bağımlı olduğundan onlar için BEKLE; normal picker açılışında ise BEKLEME —
  // picker repertuvarları works olmadan da listelenir, eser adları sonra dolar.
  const _needsWL = urlParams.get('"'"'work'"'"') || urlParams.get('"'"'share'"'"');
  if (_needsWL) {
    await loadWL();
  } else {
    loadWL().then(() => {
      const picker = document.getElementById('"'"'pickerScreen'"'"');
      if (picker && !picker.classList.contains('"'"'hidden'"'"') && !_rsSwipe && !_rsOpenCard) renderPicker();
    });
  }' \
'init: loadWL sadece picker açılışında arka plana alındı (work/share korundu)'

echo ""
echo "③ eserler.html"
# eserler zaten sync'i arka planda yapıyor; sadece loadRepertoireCounts zaten await'siz.
# Ek bir değişiklik gerekmiyor — doğrula.
if [ -f "eserler.html" ]; then
  if grep -q "await loadWorksFromSupabase();" eserler.html && grep -q "loadRepertoireCounts(); // arka planda" eserler.html; then
    echo "  •  eserler.html zaten local-first (sync arka planda) — değişiklik gerekmiyor"
  else
    echo "  •  eserler.html: beklenen desen bulunamadı, elle kontrol edilmeli"
  fi
else
  echo "  ⚠  eserler.html yok, atlandı"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "Bitti. Beklenen davranış:"
echo "  • Repertuvarlar/Sahne: local veri anında görünür (kum saati yok)"
echo "  • Eser adları works arka planda gelince (0.5-4sn) otomatik dolar"
echo "  • Hiç local yoksa (ilk kurulum) yalnızca o zaman kısa yükleme"
echo "═══════════════════════════════════════════════════════════════"
