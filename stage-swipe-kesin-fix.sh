#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Sahne Modu (stage.html) picker kart takılması — KESİN düzeltme
#
# Neden takılıyordu: repertoires.js ve eserler.html'de açık kartı "dışarı
# tıklayınca kapatan" bir global click dinleyicisi var. stage.html'de bu YOK.
# Bu script o eksik dinleyiciyi — çalışan koddaki satırın BİREBİR aynısını —
# ekler.
#
# Kullanım (stage.html ile aynı klasörde):
#   bash stage-swipe-kesin-fix.sh
#
# Not: Daha önce yanlışlıkla eklenmiş 'touchstart' tabanlı geçici blok
# varsa onu da temizler.
# ─────────────────────────────────────────────────────────────
set -e

f="stage.html"
if [ ! -f "$f" ]; then
  echo "⚠  $f bulunamadı. Scripti stage.html ile aynı klasörde çalıştır."
  exit 1
fi

cp "$f" "$f.bak"

python3 - "$f" <<'PYEOF'
import sys, re
path = sys.argv[1]
s = open(path, encoding='utf-8').read()
orig = s

# ── 0) Önceki yanlış 'touchstart' geçici bloğunu temizle (varsa) ──
stray = """// Açık bir swipe kartı varken picker ekranının BOŞ bir yerine (kartın dışına) dokununca kapat.
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
if stray in s:
    s = s.replace(stray, "")
    print("  ✓ önceki geçici touchstart bloğu temizlendi")

# Daha esnek temizlik: yorumu farklı yazılmış olabilir — touchstart+rsCloseOpenCard içeren
# bizim eklediğimiz bloğu regex ile de dene
s = re.sub(
    r"// Açık bir swipe kartı varken picker[\s\S]*?rsCloseOpenCard\(\);\s*\}, \{passive:true\}\);\n\n",
    "",
    s
)

# ── 1) justSwiped eşiğini çalışan kod ile aynı yap (10 -> 5), önceki fix bunu değiştirmişse geri al ──
if "if (Math.abs(_rsSwipe.dx) > 10) card.dataset.justSwiped = '1';" in s:
    s = s.replace(
        "if (Math.abs(_rsSwipe.dx) > 10) card.dataset.justSwiped = '1';",
        "if (Math.abs(_rsSwipe.dx) > 5) card.dataset.justSwiped = '1';"
    )
    print("  ✓ justSwiped eşiği çalışan kod ile aynı (5px) yapıldı")

# ── 2) ASIL FIX: dışarı-TIKLA-kapat dinleyicisi (repertoires.js'in birebir aynısı) ──
# pageshow bloğunun kapanışından sonra ekle.
anchor = """  _rsOpenCard = null;
  _rsSwipe = null;
});"""

listener = """

// Açık bir swipe kartı varken ekranın herhangi bir yerine tıklanınca (kartın dışına) kapat.
// repertoires.js ve eserler.html'de bu satır vardı, stage.html'de eksikti — kartın
// yarı-açık takılı kalmasının ve iki kartın birden açık kalmasının sebebi buydu.
document.addEventListener('click', (e) => {
  if (_rsOpenCard && !_rsOpenCard.contains(e.target)) rsCloseOpenCard();
});"""

if "if (_rsOpenCard && !_rsOpenCard.contains(e.target)) rsCloseOpenCard();" in s:
    print("  •  dışarı-tıkla-kapat zaten var, atlandı")
elif anchor in s:
    s = s.replace(anchor, anchor + listener, 1)
    print("  ✓ dışarı-tıkla-kapat dinleyicisi eklendi (repertoires.js ile birebir)")
else:
    print("  ✗ pageshow bloğu bulunamadı — anchor eşleşmedi!")

if s != orig:
    open(path, 'w', encoding='utf-8').write(s)
    print("  → stage.html güncellendi.")
else:
    print("  → stage.html değişmedi.")
PYEOF

rm -f "$f.bak"
echo ""
echo "Bitti. Test:"
echo "  - Karta kısa dokun-bırak → yarı açık kalmamalı"
echo "  - Bir kart açıkken başka yere/karta dokun → kapanmalı"
echo "  - Aynı anda iki kart açık kalmamalı"
