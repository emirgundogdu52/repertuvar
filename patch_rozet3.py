# -*- coding: utf-8 -*-
# eserler.html — rozet kartın sağ üst köşesine (2026-09-05)
# Emir: ★'ın köşesinde fazla yakın duruyordu; artık kartın kendi çerçevesine
# göre konumlanıyor, eylem kümesiyle hiç temas etmiyor.
import io
P='eserler.html'
s=io.open(P,encoding='utf-8').read(); once=len(s.encode('utf-8'))

# 1) ★ sarmalayıcısını kaldır, düğmeyi eski sade haline döndür
old = ('        <span class="work-fav-wrap" style="display:${bulkMode?\'none\':\'inline-flex\'};">'
       '<button class="work-fav${isFav?\' active\':\'\'}" onclick="toggleFavorite(${w.id}, event)" '
       'title="Favori" data-i18n-title="es.t_favori">${isFav ? \'★\' : \'☆\'}</button>'
       '${countBadge}</span>')
new = ('        <button class="work-fav${isFav?\' active\':\'\'}" onclick="toggleFavorite(${w.id}, event)" '
       'title="Favori" data-i18n-title="es.t_favori" style="display:${bulkMode?\'none\':\'flex\'};">${isFav ? \'★\' : \'☆\'}</button>')
assert s.count(old)==1,'fav-wrap: %d'%s.count(old)
s=s.replace(old,new)

# 2) Rozeti kartın DOĞRUDAN çocuğu yap (konumlanma .work-item'a göre olsun)
old='      ${checkbox}'
new='      ${countBadge}\n      ${checkbox}'
assert s.count(old)==1,'checkbox: %d'%s.count(old)
s=s.replace(old,new)

# 3) CSS
old="""  .work-fav-wrap { position:relative; display:inline-flex; align-items:center; }
  .work-fav-wrap > .work-count-badge {
    position:absolute; top:-4px; right:-5px;
    min-width:16px; height:16px; padding:0 4px; border-radius:8px;
    background:var(--accent); color:#1a1200; font-size:10px; font-weight:800;
    pointer-events:none;
  }
"""
new="""  /* Kartın sağ üst köşesi. .work-item zaten position:relative — konumlanma
     ona göre. pointer-events:none: rozet bir bilgi, dokunma hedefi değil;
     üstünde kalan alan kartın kendi tıklamasına geçsin. */
  .work-item > .work-count-badge {
    position:absolute; top:8px; right:10px;
    min-width:18px; height:18px; padding:0 5px; border-radius:9px;
    background:rgba(255,200,61,.16); color:var(--accent);
    font-size:10px; font-weight:800; pointer-events:none; z-index:1;
  }
"""
assert s.count(old)==1,'fav-wrap CSS: %d'%s.count(old)
s=s.replace(old,new)

io.open(P,'w',encoding='utf-8').write(s)
print('OK  %d -> %d bayt'%(once,len(s.encode('utf-8'))))
