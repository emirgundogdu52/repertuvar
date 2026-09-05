# -*- coding: utf-8 -*-
# repertuvar-site/index.html — TRANSPOZİSYON KARTI (2026-09-05)
# Metin Emir'in onayıyla. İki küçük düzeltme yapıldı ve ayrıca bildirildi:
#   virgül -> nokta, ve "istersen de ... ile de" içindeki fazla "de" atıldı.
import io
P='site-index.html'
s=io.open(P,encoding='utf-8').read(); once=len(s.encode('utf-8'))

TR_BAS = 'Kendi Tonundan Çal'
TR_P   = ('Eseri kendi tonuna transpoze et. Akorları ister A-B-C ile ister Do-Re-Mi ile '
          'okuyabilirsin — hangisine alışkınsan.')
TR_SUB_B = 'Grubun akoru bozulmaz.'
TR_SUB   = (' Yaptığın transpozisyon yalnızca senin kopyanda kalır. Transpozeden sonra '
            'karar rozeti hem yeni hem orijinal kararı gösterir.')

kart = ('<article class="card feature-card"><div class="feature-head">'
        '<span class="feature-icon green"><i class="ti ti-adjustments"></i></span>'
        '<h3>' + TR_BAS + '</h3></div>'
        '<p>' + TR_P + '</p>'
        '<p class="feature-sub"><b>' + TR_SUB_B + '</b>' + TR_SUB + '</p>'
        '<div class="mini-ui"><div class="card" style="padding:14px;width:88%;box-shadow:none">'
        '<b>Acem Kızı</b>'
        '<p style="min-height:auto;margin:12px 0 0">Do (C) · <span style="opacity:.6">orijinal: La (A)</span></p>'
        '</div></div></article>\n        ')

# Grup Senkronizasyonu kartından ÖNCE ekle
old = '<article class="card feature-card"><div class="feature-head"><span class="feature-icon blue"><i class="ti ti-refresh"></i></span><h3>Grup Senkronizasyonu</h3></div>'
assert s.count(old)==1, 'Grup karti: %d'%s.count(old)
s = s.replace(old, kart + old)

# ── EN sözlüğü: landing çeviriyi TÜRKÇE METNİ ANAHTAR alarak yapıyor ──
old = '    "Grup Senkronizasyonu": "Band Sync",'
new = ('    "' + TR_BAS + '": "Play It in Your Key",\n'
       '    "' + TR_P + '":\n'
       '      "Transpose any piece to your own key. Read the chords as A-B-C or as Do-Re-Mi '
       '\u2014 whichever you are used to.",\n'
       '    "' + TR_SUB_B + '": "The band\u2019s chart stays untouched.",\n'
       '    "' + TR_SUB.strip() + '":\n'
       '      "Your transposition lives only in your own copy. After transposing, the '
       'closing-note badge shows both the new and the original tonic.",\n'
       '    "Acem Kızı": "Acem Kızı",\n'
       '    "Do (C) · orijinal: La (A)": "C (Do) \u00b7 original: A (La)",\n'
       + old)
assert s.count(old)==1, 'EN Grup Senkronizasyonu: %d'%s.count(old)
s = s.replace(old, new)

io.open(P,'w',encoding='utf-8').write(s)
print('OK  %d -> %d bayt (+%d)'%(once,len(s.encode('utf-8')),len(s.encode('utf-8'))-once))
