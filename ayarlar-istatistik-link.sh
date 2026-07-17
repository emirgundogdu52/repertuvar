#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# ayarlar.html — Yönetim bölümüne İstatistikler linki ekle
#
# İstatistikler dashboard'una (istatistikler.html) uygulama içinden erişim
# yoktu; sadece tarayıcıdan açılabiliyordu. Bu link Ayarlar > Yönetim
# (admin-only) bölümüne, mevcut linklerle aynı desende eklenir. Sadece
# admin görür (admin-only class'ı isAdmin()'de kaldırılıyor).
#
# Kullanım (ayarlar.html ile aynı klasörde):
#   bash ayarlar-istatistik-link.sh
# ═══════════════════════════════════════════════════════════════
set -e

f="ayarlar.html"
if [ ! -f "$f" ]; then echo "⚠  ayarlar.html yok."; exit 1; fi
cp "$f" "$f.bak"

python3 - <<'PYEOF'
path = "ayarlar.html"
s = open(path, encoding='utf-8').read()
orig = s

if 'href="istatistikler.html"' in s:
    print("  •  İstatistikler linki zaten var, atlandı")
else:
    # "Üye Yönetimi" setting-row'unun HEMEN ÖNCESİNE ekle (Yönetim'in ilk maddesi olsun).
    anchor = """      <div class="setting-row">
        <div>
          <div class="setting-label">Üye Yönetimi</div>"""
    new_link = """      <div class="setting-row">
        <div>
          <div class="setting-label">İstatistikler</div>
          <div class="setting-desc">Ziyaret ve kullanım istatistikleri</div>
        </div>
        <a href="istatistikler.html" class="setting-btn">Görüntüle →</a>
      </div>
      <div class="setting-row">
        <div>
          <div class="setting-label">Üye Yönetimi</div>"""

    if anchor in s:
        s = s.replace(anchor, new_link, 1)
        print("  ✓ İstatistikler linki Yönetim bölümüne eklendi (ilk sırada)")
    else:
        print("  ✗ 'Üye Yönetimi' satırı bulunamadı — yapı değişmiş olabilir")

if s != orig:
    open(path, 'w', encoding='utf-8').write(s)
    print("  → ayarlar.html güncellendi.")
else:
    print("  → değişiklik yok.")
PYEOF

rm -f "$f.bak"
echo ""
echo "Bitti. Ayarlar > Yönetim bölümünde 'İstatistikler → Görüntüle' linki"
echo "artık var (sadece adminler görür)."
