# -*- coding: utf-8 -*-
# Satır başına "YouTube'da dinle" butonu (2026-09-05)
# Emir'in kararı: gömülü oynatıcı YOK, doğrudan YouTube'a gider.
# Gerekçe: telifli yüklemelerde gömme kapalı (101/150) ve Türk müziğinde yaygın;
# tek eserde "sonrakine atla" diye bir kurtarma yolu olmadığı için gömme
# denemesi rastgele boş kutu üretirdi. Bağlantı her zaman çalışır.
import io

# ── A) eserler.html — liste satırı ───────────────────────────────────────
P = 'eserler.html'
s = io.open(P, encoding='utf-8').read(); once = len(s.encode('utf-8'))

# A1) _ytId ayrıştırıcısı (repertoires.js'teki ile AYNI — davranış ayrışmasın)
old = "function toggleFavoriteInline(id) {"
new = '''// (2026-09-05) repertoires.js'teki _ytId ile birebir aynı. İki sayfa aynı
// bağlantıyı farklı yorumlarsa biri "dinlenebilir" öbürü "bağlantı yok" der.
function _ytId(url) {
  if (!url) return null;
  const s = String(url).trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  let m = s.match(/(?:youtube\\.com|youtu\\.be)\\/(?:watch\\?(?:[^#]*&)?v=|embed\\/|shorts\\/|live\\/|v\\/|e\\/)?([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  m = s.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  return null;
}
// Satır butonu: YouTube'u yeni sekmede açar. Satırın kendi onclick'i
// (seç / toplu seç / kaydırma) tetiklenmesin diye olay burada durur.
function dinleAc(url, ev) {
  if (ev) { ev.stopPropagation(); ev.preventDefault(); }
  const id = _ytId(url);
  if (!id) return;
  window.open('https://www.youtube.com/watch?v=' + id, '_blank', 'noopener');
}

function toggleFavoriteInline(id) {'''
assert s.count(old) == 1, 'toggleFavoriteInline: %d' % s.count(old)
s = s.replace(old, new)

# A2) CSS — favori butonuyla aynı ölçüde
old = "  .work-fav { background:none; border:none; font-size:20px; line-height:1; color:var(--text2); cursor:pointer; padding:4px; }"
new = old + """
  /* (2026-09-05) Satır dinle butonu — .work-fav ile aynı kutu ölçüsü. */
  .work-listen { background:none; border:none; font-size:17px; line-height:1; color:var(--text2); cursor:pointer; padding:4px; text-decoration:none; }
  .work-listen:active { color:var(--accent); }"""
assert s.count(old) == 1, 'work-fav CSS: %d' % s.count(old)
s = s.replace(old, new)

# A3) Satıra buton — favorinin soluna
old = ('        <button class="work-fav${isFav?\' active\':\'\'}" onclick="toggleFavorite(${w.id}, event)" '
       'title="Favori" data-i18n-title="es.t_favori" style="display:${bulkMode?\'none\':\'flex\'};">${isFav ? \'★\' : \'☆\'}</button>')
new = ('        ${_ytId(w.videoLink) ? `<button class="work-listen" onclick="dinleAc(\'${w.videoLink}\', event)" '
       'title="${_esCev(\'es.t_dinle\',\'YouTube\\u2019da dinle\')}" data-i18n-title="es.t_dinle" '
       'style="display:${bulkMode?\'none\':\'flex\'};">\\u25B6</button>` : \'\'}\n' + old)
assert s.count(old) == 1, 'work-fav butonu: %d' % s.count(old)
s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8').write(s)
print('eserler.html   %d -> %d bayt' % (once, len(s.encode('utf-8'))))

# ── B) repertoires.js — repertuvar satırı ────────────────────────────────
P = 'repertoires_v2.js'
s = io.open(P, encoding='utf-8').read(); once = len(s.encode('utf-8'))

old = """      <td><div class="ra">
        ${_knotDugme(it.workId)}"""
new = """      <td><div class="ra">
        ${_dinleDugme(it.workId)}
        ${_knotDugme(it.workId)}"""
assert s.count(old) == 1, 'ra hucresi: %d' % s.count(old)
s = s.replace(old, new)

old = "function _ytId(url) {"
new = '''// (2026-09-05) Satır başına tek eser dinleme. Panelden farkı: gömülü oynatıcı
// kurmaz, doğrudan YouTube'a gider — tek eserde gömme kapalıysa (101/150)
// atlanacak bir sonraki eser yok, boş kutu kalırdı.
function _dinleDugme(workId) {
  const w = WL[String(workId)] || {};
  const vid = _ytId(w.videoLink);
  if (!vid) return '';
  return '<a class="br" href="https://www.youtube.com/watch?v=' + vid + '"'
       + ' target="_blank" rel="noopener" onclick="event.stopPropagation();"'
       + ' title="' + _r('rep.dinleT', 'YouTube\\u2019da dinle') + '"'
       + ' style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;">\\u25B6</a>';
}

function _ytId(url) {'''
assert s.count(old) == 1, '_ytId: %d' % s.count(old)
s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8').write(s)
print('repertoires.js %d -> %d bayt' % (once, len(s.encode('utf-8'))))
