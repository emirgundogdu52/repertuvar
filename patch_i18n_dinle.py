# -*- coding: utf-8 -*-
# Satır dinle butonunun i18n anahtarları (2026-09-05)
# DİKKAT: 'rep.dinleT' ZATEN VARDI ve repertuvarın TAMAMINI sırayla dinleme
# panelinin ipucu metni. Satır butonu onu kullanamaz — ayrı anahtar açıldı.
import io

# ── A) repertoires.js: yanlış anahtarı düzelt ────────────────────────────
P='repertoires.js'
s=io.open(P,encoding='utf-8').read(); once=len(s.encode('utf-8'))
old = "_r('rep.dinleT', 'YouTube\\u2019da dinle')"
assert s.count(old)==1, 'satir butonu anahtari: %d'%s.count(old)
s=s.replace(old, "_r('rep.tekDinleT', 'Bu eseri YouTube\\u2019da dinle')")
io.open(P,'w',encoding='utf-8').write(s)
print('repertoires.js %d -> %d bayt'%(once,len(s.encode('utf-8'))))

# ── B) i18n.js: TR + EN anahtarları ──────────────────────────────────────
P='i18n.js'
s=io.open(P,encoding='utf-8').read(); once=len(s.encode('utf-8'))

for k in ('es.t_dinle','rep.tekDinleT'):
    assert ("'%s'"%k) not in s, 'ZATEN VAR: %s'%k

# es.t_dinle — TR
old = "      'es.t_favori': 'Favori', 'es.t_duzenle': 'Düzenle',"
new = "      'es.t_dinle': 'YouTube\u2019da dinle',\n" + old
assert s.count(old)==1,'TR es.t_favori: %d'%s.count(old)
s=s.replace(old,new)

# es.t_dinle — EN
old = "      'es.t_favori': 'Favourite', 'es.t_duzenle': 'Edit',"
new = "      'es.t_dinle': 'Listen on YouTube',\n" + old
assert s.count(old)==1,'EN es.t_favori: %d'%s.count(old)
s=s.replace(old,new)

# rep.tekDinleT — TR (mevcut rep.dinleT'in hemen ardına, karışmasın diye bitişik)
old = "      'rep.dinleT': 'Repertuvarı YouTube bağlantılarından sırayla dinle',"
new = old + "\n      'rep.tekDinleT': 'Bu eseri YouTube\u2019da dinle',"
assert s.count(old)==1,'TR rep.dinleT: %d'%s.count(old)
s=s.replace(old,new)

# rep.tekDinleT — EN
old = "      'rep.dinleT': 'Play the setlist through its YouTube links, in order',"
new = old + "\n      'rep.tekDinleT': 'Listen to this piece on YouTube',"
assert s.count(old)==1,'EN rep.dinleT: %d'%s.count(old)
s=s.replace(old,new)

io.open(P,'w',encoding='utf-8').write(s)
print('i18n.js        %d -> %d bayt'%(once,len(s.encode('utf-8'))))
