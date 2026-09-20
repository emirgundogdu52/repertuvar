# /sesler/ — kaynak ve lisans kaydı

Her asset AYRI lisans kontrolünden geçer. Bir kaynağın bazı dosyaları
CC0 olsa bile diğerleri CC BY-NC olabilir; toplu varsayım yapılmaz.

## bendir/ — dum.wav, tek.wav

| alan | değer |
|---|---|
| orijinal dosya | bendir_basicStrokes.wav |
| kaynak | https://freesound.org/people/barisbozkurt/sounds/140291/ |
| yükleyen | barisbozkurt · icra: Eren Ergen · proje: CompMusic |
| lisans | CC0 1.0 |
| indirme tarihi | 2026-09-20 |

Ayrılmış hâlin SHA-256'sı (işlenmeden önce):

    dum.wav  73cd80dae81d897ca815487ab8f90e8345504468819b250ec655fc6a7403eef1
    tek.wav  938e9017555b9b317c26b8ee007ba18462801867b683eb21b9a5a389f90e3d8a

**İşlenmiştir** (2026-09-20): vuruştan önceki ~30 ms oda gürültüsü
atılarak atak dosya başına hizalandı, kuyruk gürültü tabanına ulaştığı
yerde kırpıldı (1755→900 / 1330→650 ms), uçlara klik önleyici kısa fade
kondu, iki dosyaya AYNI kazanç uygulanarak doğal dinamik fark korundu
(7,35 → 7,34 dB), çift mono kayıt tek kanala indirildi.

DİKKAT: Ritim Audio Library paketinin içindeki `sesler/bendir/` klasörü
bu dosyaların İŞLENMEMİŞ hâlini taşıyor (stereo, 30 ms ön gürültülü).
Paket açılırken buradakilerin üzerine YAZILMAMALIDIR.

## darbuka/, tambourine/, shaker/, cajon/

| alan | değer |
|---|---|
| kaynak | FreePats — World percussion, sürüm 2020-09-05 |
| lisans | CC0 1.0 (bkz. FreePats_CC0_LICENSE.txt) |
| biçim | çoğunlukla 48 kHz / 24-bit mono |
| işlem | YOK — dosyalar kaynaktaki hâliyle |

Artikülasyon adları FreePats'in kendi tanımlarından alındı. Cajón için
kaynak yalnızca "Cajón flamenco 1/2/3" diyor; bass/slap/tone gibi adlar
uydurulmadı, iç kimlikler `cajon_1/2/3` olarak bırakıldı.

`darbuka/pa_03_06.wav` kaynak pakette yoktur; PA havuzu altı dosyadır.

## Paketten alınmayanlar

bongos, conga (+high/low/muted), castanets, claves, maracas, hand_clap
klasörleri `kit_mapping.json` içinde tanımlı olmadığı için uygulamaya
dahil edilmedi. İleride kullanılacaksa kit tanımı yazılması gerekir.

Tam dosya listesi, boyut ve SHA-256 değerleri: `asset_manifest.csv`.
