#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# stage.html — merkeze tıklayınca kartın yarı-kaymış donması düzeltmesi
#
# Kök neden: rsTouchMove kartı translateX ile hareket ettirir. Ama merkeze
# tıklayınca / hafif dokununca parmak birkaç px oynar, dx küçük bir değer
# alır ve kart hafifçe kayar — AMA dir henüz 'h' (yatay) olarak set edilmemiş
# olabilir. O durumda rsTouchEnd ilk satırda `return` ediyor ve kartı
# translateX(0)'a GERİ DÖNDÜRMÜYOR → kart yarı-kaymış donuyor, her iki arka
# plan (Değiştir + Sil) birden görünüyor.
#
# Çözüm: rsTouchEnd'in erken return'ü, çıkmadan önce kartı güvenli konuma
# (açıksa açık, değilse translateX(0)) çeksin — asla yarı-kaymış bırakmasın.
#
# Kullanım (stage.html ile aynı klasörde):
#   bash stage-swipe-merkez-fix.sh
# ═══════════════════════════════════════════════════════════════
set -e

f="stage.html"
if [ ! -f "$f" ]; then echo "⚠  stage.html yok."; exit 1; fi
cp "$f" "$f.bak"

python3 - <<'PYEOF'
path = "stage.html"
s = open(path, encoding='utf-8').read()
orig = s

old = "  if (!_rsSwipe || _rsSwipe.dir !== 'h') { _rsSwipe = null; return; }"
new = """  if (!_rsSwipe) return;
  // Yatay swipe değilse (merkeze tıklama / dikey / belirsiz hareket): kartı
  // yarı-kaymış bırakma — açıksa açık konumuna, değilse translateX(0)'a çek.
  if (_rsSwipe.dir !== 'h') {
    const c = _rsSwipe.card;
    c.style.transition = 'transform .2s ease';
    if (c.classList.contains('swiped-open-left')) {
      c.style.transform = `translateX(${RS_SWIPE_MAX}px)`;
    } else if (c.classList.contains('swiped-open-right')) {
      c.style.transform = `translateX(${-RS_SWIPE_MAX}px)`;
    } else {
      c.style.transform = 'translateX(0)';
      const w = c.closest('.rs-wrap');
      if (w) w.style.setProperty('--swipe-glow', 0);
    }
    _rsSwipe = null;
    return;
  }"""

if "// Yatay swipe değilse (merkeze tıklama" in s:
    print("  •  fix zaten uygulanmış, atlandı")
elif old in s:
    s = s.replace(old, new, 1)
    print("  ✓ rsTouchEnd erken-return artık kartı güvenli konuma çekiyor")
else:
    print("  ✗ hedef satır bulunamadı!")

if s != orig:
    open(path, 'w', encoding='utf-8').write(s)
    print("  → stage.html güncellendi.")
else:
    print("  → değişiklik yok.")
PYEOF

rm -f "$f.bak"
echo ""
echo "Bitti. Merkeze tıklayınca kart artık yarı-kaymış donmaz —"
echo "translateX(0)'a döner (ya da açıksa tam açık konumda kalır)."
