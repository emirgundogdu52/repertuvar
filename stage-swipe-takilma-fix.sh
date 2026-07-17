#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Sahne Modu (stage.html) — picker kartının yarı-açık takılması düzeltmesi
#
# Kullanım:  stage.html'in olduğu proje klasöründe:
#   bash stage-swipe-takilma-fix.sh
#
# İki düzeltme:
#  1) Açık kart varken ekranın boş yerine (kart dışına) dokununca kapanır.
#  2) justSwiped flag'i minik dokunuş titremesinde (5px) değil, gerçek
#     kaydırmada (10px) set edilir → normal tık artık kartı yarı-açmıyor.
# ─────────────────────────────────────────────────────────────
set -e

f="stage.html"
if [ ! -f "$f" ]; then
  echo "⚠  $f bulunamadı. Scripti stage.html ile aynı klasörde çalıştır."
  exit 1
fi

cp "$f" "$f.bak"

python3 - "$f" <<'PYEOF'
import sys
path = sys.argv[1]
s = open(path, encoding='utf-8').read()
orig = s

# ── FIX 1: dışarı dokununca açık kartı kapat ──
anchor = "function rsCardClick(e, id) {"
listener = """// Açık bir swipe kartı varken picker ekranının BOŞ bir yerine (kartın dışına) dokununca kapat.
// rsTouchStart yalnızca kartın üstündeki dokunuşu yakalıyordu; kart dışına dokunuşta
// açık kart kapanmıyor, yarı-açık takılı kalıyordu.
document.addEventListener('touchstart', function(e) {
  if (!_rsOpenCard) return;
  const picker = document.getElementById('pickerScreen');
  if (!picker || picker.classList.contains('hidden')) return;
  if (_rsOpenCard.contains(e.target)) return;
  rsCloseOpenCard();
}, {passive:true});

"""
if "if (_rsOpenCard.contains(e.target)) return;" in s:
    print("  •  FIX 1 zaten var, atlandı")
elif anchor in s:
    s = s.replace(anchor, listener + anchor, 1)
    print("  ✓ FIX 1: dışarı-dokun-kapat eklendi")
else:
    print("  ✗ FIX 1: 'function rsCardClick' bulunamadı!")

# ── FIX 2: justSwiped eşiğini 5px → 10px ──
old = "if (Math.abs(_rsSwipe.dx) > 5) card.dataset.justSwiped = '1';"
new = "if (Math.abs(_rsSwipe.dx) > 10) card.dataset.justSwiped = '1';"
if old in s:
    s = s.replace(old, new, 1)
    print("  ✓ FIX 2: justSwiped eşiği 5px → 10px")
elif new in s:
    print("  •  FIX 2 zaten uygulanmış, atlandı")
else:
    print("  ✗ FIX 2: justSwiped satırı bulunamadı!")

if s != orig:
    open(path, 'w', encoding='utf-8').write(s)
    print("  → stage.html güncellendi.")
else:
    print("  → stage.html değişmedi.")
PYEOF

rm -f "$f.bak"
echo ""
echo "Bitti. Deploy edip Sahne Modu picker'ında test et:"
echo "  - Karta kısa dokun-bırak → yarı açık kalmamalı"
echo "  - Sürükle → normal açılmalı"
echo "  - Açıkken boşluğa dokun → kapanmalı"
