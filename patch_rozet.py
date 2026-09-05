# -*- coding: utf-8 -*-
# eserler.html — repertuvar sayısı rozetini isim bloğuna taşı (2026-09-05)
# Gerekçe (Emir): rozet .work-actions içinde ▶ ve ★ ile aynı kümede duruyordu;
# üç öğe yan yana gelince dokunma hedefleri sıkışıyordu. Rozet zaten bir EYLEM
# değil, esere ait bir BİLGİ — eylem kümesinde yeri yoktu.
import io
P='eserler.html'
s=io.open(P,encoding='utf-8').read(); once=len(s.encode('utf-8'))

# 1) Eylem kümesinden çıkar
old = '      <div class="work-actions">\n        ${countBadge}\n'
new = '      <div class="work-actions">\n'
assert s.count(old)==1, 'work-actions countBadge: %d'%s.count(old)
s=s.replace(old,new)

# 2) İsim satırını saran esnek kutu — rozet sağ uçta
old = '        <div class="work-name">'
new = '        <div class="work-name-row">\n        <div class="work-name">'
assert s.count(old)==1, 'work-name acilis: %d'%s.count(old)
s=s.replace(old,new)

old = "👥 Grup</span>' : ''}</div>"
new = "👥 Grup</span>' : ''}</div>${countBadge}</div>"
assert s.count(old)==1, 'work-name kapanis: %d'%s.count(old)
s=s.replace(old,new)

# 3) CSS — isim uzunsa kırpılan isim olsun, rozet değil
old = "  .work-info { flex:1; min-width:0; }"
new = """  .work-info { flex:1; min-width:0; }
  /* (2026-09-05) İsim + repertuvar sayısı rozeti aynı satırda.
     min-width:0 zinciri şart: olmazsa .work-name'in ellipsis'i çalışmaz ve
     uzun eser adı rozeti satırdan dışarı iter. flex-shrink:0 ile kırpılacak
     olan her zaman İSİM olur, rozet değil — rozet yarım görünürse sayı
     okunamaz, oysa kısalmış isim hâlâ tanınabilir. */
  .work-name-row { display:flex; align-items:flex-start; gap:8px; min-width:0; }
  .work-name-row > .work-name { flex:1 1 auto; min-width:0; }
  .work-name-row > .work-count-badge { flex-shrink:0; margin-top:3px; }"""
assert s.count(old)==1, 'work-info CSS: %d'%s.count(old)
s=s.replace(old,new)

io.open(P,'w',encoding='utf-8').write(s)
print('OK  %d -> %d bayt'%(once,len(s.encode('utf-8'))))
