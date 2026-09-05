# -*- coding: utf-8 -*-
# eserler.html — rozet isim satırından ★'ın sağ üst köşesine (2026-09-05)
import io
P='eserler.html'
s=io.open(P,encoding='utf-8').read(); once=len(s.encode('utf-8'))

# 1) İsim satırı sarmalayıcısını geri al
old='        <div class="work-name-row">\n        <div class="work-name">'
new='        <div class="work-name">'
assert s.count(old)==1,'name-row acilis: %d'%s.count(old)
s=s.replace(old,new)

old="👥 Grup</span>' : ''}</div>${countBadge}</div>"
new="👥 Grup</span>' : ''}</div>"
assert s.count(old)==1,'name-row kapanis: %d'%s.count(old)
s=s.replace(old,new)

# 2) Artık kullanılmayan CSS'i sil
old="""  /* (2026-09-05) İsim + repertuvar sayısı rozeti aynı satırda.
     min-width:0 zinciri şart: olmazsa .work-name'in ellipsis'i çalışmaz ve
     uzun eser adı rozeti satırdan dışarı iter. flex-shrink:0 ile kırpılacak
     olan her zaman İSİM olur, rozet değil — rozet yarım görünürse sayı
     okunamaz, oysa kısalmış isim hâlâ tanınabilir. */
  .work-name-row { display:flex; align-items:flex-start; gap:8px; min-width:0; }
  .work-name-row > .work-name { flex:1 1 auto; min-width:0; }
  .work-name-row > .work-count-badge { flex-shrink:0; margin-top:3px; }
"""
assert s.count(old)==1,'name-row CSS: %d'%s.count(old)
s=s.replace(old,'')

# 3) Rozet ★'ın köşesine — sarmalayıcı kutu
old = ('        <button class="work-fav${isFav?\' active\':\'\'}" onclick="toggleFavorite(${w.id}, event)" '
       'title="Favori" data-i18n-title="es.t_favori" style="display:${bulkMode?\'none\':\'flex\'};">${isFav ? \'★\' : \'☆\'}</button>')
new = ('        <span class="work-fav-wrap" style="display:${bulkMode?\'none\':\'inline-flex\'};">'
       '<button class="work-fav${isFav?\' active\':\'\'}" onclick="toggleFavorite(${w.id}, event)" '
       'title="Favori" data-i18n-title="es.t_favori">${isFav ? \'★\' : \'☆\'}</button>'
       '${countBadge}</span>')
assert s.count(old)==1,'fav butonu: %d'%s.count(old)
s=s.replace(old,new)

# 4) CSS — köşe rozeti
old="  .work-count-badge {"
new="""  /* (2026-09-05) Repertuvar sayısı rozeti ★'ın sağ ÜST köşesinde.
     pointer-events:none KRİTİK: rozet yıldızın dokunma alanının üstünde
     duruyor; olmazsa favori düğmesinin köşesine basınca hiçbir şey olmaz.
     Rozet dışa taşıyor (top/right negatif) ki yıldızın kendisini örtmesin. */
  .work-fav-wrap { position:relative; display:inline-flex; align-items:center; }
  .work-fav-wrap > .work-count-badge {
    position:absolute; top:-4px; right:-5px;
    min-width:16px; height:16px; padding:0 4px; border-radius:8px;
    background:var(--accent); color:#1a1200; font-size:10px; font-weight:800;
    pointer-events:none;
  }
  .work-count-badge {"""
assert s.count(old)==1,'count-badge CSS: %d'%s.count(old)
s=s.replace(old,new)

io.open(P,'w',encoding='utf-8').write(s)
print('OK  %d -> %d bayt'%(once,len(s.encode('utf-8'))))
