# -*- coding: utf-8 -*-
# mesajlar.html — iOS ÇİFT DOKUNUŞ ZOOM'U (2026-09-05)
import io
P='mesajlar.html'
s=io.open(P,encoding='utf-8').read(); once=len(s.encode('utf-8'))

old='<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">'
new='<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=no, viewport-fit=cover">'
assert s.count(old)==1, 'viewport bulunamadi: %d'%s.count(old)
s=s.replace(old,new)

# touch-action: mesaj gövdelerinde çift dokunuş büyütmesini kapat.
# Sayfa kaydırması ve tek dokunuş etkilenmez (manipulation).
old='</style>'
new="""
/* (2026-09-05) iOS WKWebView çift dokunuş zoom'u — mesaj gövdelerinde kapalı.
   manipulation: kaydırma ve tek dokunuş çalışmaya devam eder,
   yalnızca çift dokunuş büyütmesi ve 300ms tıklama gecikmesi kalkar. */
.thread-msg, .thread-msg-content, .thread-reply-box, .compose-box,
.thread-msg-header, .thread-actions { touch-action: manipulation; }
</style>"""
assert s.count(old)>=1, 'style kapanisi yok'
s=s.replace(old,new,1)

io.open(P,'w',encoding='utf-8').write(s)
print('OK  %d -> %d bayt'%(once,len(s.encode('utf-8'))))
