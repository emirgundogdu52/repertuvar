# /sesler/bendir/ — kaynak ve lisans kaydı

Her asset AYRI lisans kontrolünden geçer. Aynı yükleyicinin başka
kayıtları otomatik olarak kullanılamaz — bazıları CC BY-NC olabilir ve
ticari üründe kullanılamaz.

## dum.wav, tek.wav

| alan | değer |
|---|---|
| orijinal dosya | bendir_basicStrokes.wav |
| kaynak | https://freesound.org/people/barisbozkurt/sounds/140291/ |
| yükleyen | barisbozkurt |
| icra | Eren Ergen |
| proje | CompMusic |
| lisans | Creative Commons 0 (CC0) |
| orijinal biçim | WAV, 44.1 kHz, 16-bit, stereo |
| indirme tarihi | 2026-09-20 |

### Kesilmiş dosyaların SHA-256'sı (kesim öncesi, Emir'in ayırdığı hâl)

    dum.wav  73cd80dae81d897ca815487ab8f90e8345504468819b250ec655fc6a7403eef1
    tek.wav  938e9017555b9b317c26b8ee007ba18462801867b683eb21b9a5a389f90e3d8a

### Yapılan işlem (2026-09-20)

Orijinal kayıt DÜM ve TEK vuruşlarını tek WAV içinde taşıyordu; iki vuruş
ayrı dosyalara ayrıldı. Ardından:

- **Atak hizalandı.** İki dosyada da vuruştan önce ~30 ms oda gürültüsü
  vardı (dum 29,8 ms / tek 32,7 ms). 100 BPM'de bu, vuruşun ızgaradan
  %5 geç duyulması demekti; ayrıca iki ses arasında ~3 ms fark vardı.
  Atak noktası (tepenin %10'u) her iki dosyada da başlangıçtan 2 ms
  sonraya alındı. Transient kesilmedi.
- **Kuyruk kırpıldı.** Sönüm gürültü tabanına (~−53 dBFS) ulaştığı yerde
  kesildi: dum 1755 → 900 ms, tek 1330 → 650 ms. Doğal decay korundu,
  yalnız gürültü atıldı.
- **Fade.** Başta 0,5 ms, sonda 20 ms — yalnızca klik oluşmasını
  engelleyecek kadar. Uç örnekler sıfır.
- **Normalize.** Her iki dosyaya AYNI kazanç uygulandı (×2,342 / +7,39 dB),
  böylece DÜM ile TEK arasındaki doğal dinamik fark korundu: önce 7,35 dB,
  sonra 7,34 dB. Tepeler: dum −3,00 dBFS, tek −10,34 dBFS. Kırpma yok.
- **Mono.** Kanallar arası fark sıfırdı (çift mono), tek kanala indirildi.
  309.628 + 234.580 bayt → 79.424 + 57.374 bayt.
