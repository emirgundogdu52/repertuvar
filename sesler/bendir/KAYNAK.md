# /sesler/bendir/ — kaynak ve lisans kaydı

Bu klasördeki ses dosyalarının kaynağı. Her asset AYRI lisans kontrolünden
geçer; aynı yükleyicinin başka kayıtları otomatik olarak kullanılamaz
(bazıları CC BY-NC olabilir ve ticari üründe kullanılamaz).

## dum.wav, tek.wav

| alan | değer |
|---|---|
| orijinal dosya | bendir_basicStrokes.wav |
| kaynak | https://freesound.org/people/barisbozkurt/sounds/140291/ |
| yükleyen | barisbozkurt |
| icra | Eren Ergen |
| proje | CompMusic |
| lisans | Creative Commons 0 (CC0) |
| biçim | WAV, 44.1 kHz, 16-bit, stereo |
| indirme tarihi | (doldurulacak) |
| orijinal SHA-256 | (doldurulacak) |

### Yapılan işlem

Orijinal dosya DÜM ve TEK vuruşlarını tek WAV içinde taşıyor. Production'da
uzun dosya her vuruşta çalınmıyor; iki vuruş ayrı dosyalara kesiliyor:

- DÜM ve TEK başlangıç/bitişleri ayrı ayrı kesildi
- baştaki sessizlik temizlendi, transient kesilmedi
- doğal decay korundu, sondaki gereksiz sessizlik atıldı
- normalize edilirken DÜM/TEK arasındaki doğal dinamik fark korundu
- fade-out yalnızca click oluşmasını engelleyecek kadar kısa

### Durum

DOSYALAR HENÜZ EKLENMEDİ. ritim.js'te bendir kiti `kaynak:'dev'` ile
çalışıyor (sentezlenmiş DEV placeholder, repoda ses dosyası yok).
Gerçek dosyalar bu klasöre konduğunda kit `kaynak:'dosya'` yapılacak ve
placeholder üretimi ritim.js'ten kaldırılacak.
