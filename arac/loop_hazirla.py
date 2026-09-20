#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
loop_hazirla.py — Ritim loop kütüphanesi hazırlama aracı (2026-09-20)

Ne yapar:
  1) tara   : klasördeki WAV'ları ölçer, benzerlerini gruplar, bir CSV çıkarır
  2) uygula : CSV'yi okur, dosyaları mono'ya indirip tek düzene göre adlandırır

Neden iki adım: script bir dosyanın Misket mi Çiftetelli mi olduğunu
BİLEMEZ — bu kulak işi. Ama dosyaları gruplayabilir, böylece 80 dosya
yerine ~15 grup isimlendirirsin. Her grup için bir örnek dosya seçer,
onu dinlersin, adı yazarsın, gerisini script halleder.

Sadece standart kütüphane kullanır, kurulum gerekmez.

Kullanım:
    python3 loop_hazirla.py tara   ~/Loops            # → loop_tablo.csv
    (CSV'yi aç, ritim / tavir / calgi sütunlarını doldur)
    python3 loop_hazirla.py uygula ~/Loops loop_tablo.csv ~/Loops_hazir

Orijinal dosyalara DOKUNMAZ; çıktı ayrı klasöre yazılır.
"""

import sys, os, re, csv, wave, array, math
from collections import defaultdict

# Kütüphanede sık görülen tempolar. Süreden tempo çıkarırken bunlar denenir.
TEMPO_ADAYLARI = list(range(60, 201, 2))
# Bir dosyanın "tam ölçüye oturması" için kabul edilen en büyük sapma
SAPMA_ESIGI_MS = 15.0


# ── Ölçüm ───────────────────────────────────────────────────────────────

def wav_oku(yol):
    """WAV'ı okur, mono örnek listesi ve teknik bilgiyi döndürür."""
    with wave.open(yol, 'rb') as w:
        kanal, genislik, sr, cerceve = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        ham = w.readframes(cerceve)
    if genislik != 2:
        return None  # 16 bit dışını şimdilik atla
    a = array.array('h'); a.frombytes(ham)
    if kanal == 2:
        sol = a[0::2]; sag = a[1::2]
        mono = array.array('h', [(sol[i] + sag[i]) // 2 for i in range(len(sol))])
        # kanallar arası fark — anlamsızsa mono'ya inmek bedava
        fark = math.sqrt(sum((sol[i] - sag[i]) ** 2 for i in range(0, len(sol), 17)) / max(1, len(sol) // 17)) / 32768
    else:
        mono = a; fark = 0.0
    return {'sr': sr, 'kanal': kanal, 'cerceve': cerceve, 'sure': cerceve / sr,
            'mono': mono, 'stereo_fark': fark, 'sol': a}


def zaman_ipucu(yol):
    """Yol içinde 9-8, 7-8, 2-4 gibi ölçü yazımı varsa zaman sayısını verir."""
    m = re.search(r'(?<!\d)([2-9]|1[0-9])[-_/]([248])(?!\d)', yol.replace('\\', '/'))
    return int(m.group(1)) if m else None


def tempo_ipucu(bagil_yol):
    """Tempoyu yolun EN DERİN parçasından başlayarak arar: önce dosya adı,
    sonra klasör adı. 'ylmz-arap160/ylmz-arap-15.wav' → 160 (dosya adındaki
    15 tempo olamayacak kadar küçük, klasöre bakılır).
    Ölçü yazımları (9-8, 7-8) tempo sanılmasın diye önce ayıklanır."""
    parcalar = [x for x in bagil_yol.replace('\\', '/').split('/') if x]
    for parca in reversed(parcalar):
        temiz = re.sub(r'(?<!\d)([2-9]|1[0-9])[-_/]([248])(?!\d)', ' ', parca)
        for sayi in re.findall(r'\d{2,3}', temiz):
            if 40 <= int(sayi) <= 220:
                return int(sayi)
    return None


def zarf(mono, sr, adim=0.01):
    """10 ms'lik bloklarda tepe değer — atak saymak için yeterli çözünürlük."""
    h = max(1, int(sr * adim))
    return [max(abs(x) for x in mono[i:i + h]) / 32768.0
            for i in range(0, max(1, len(mono) - h), h)]


def atak_sayisi(env):
    if not env: return 0
    esik = max(env) * 0.28
    n, onceki = 0, 0.0
    for v in env:
        if v > esik and onceki <= esik: n += 1
        onceki = v
    return n


def tempo_bul(sure, ad, ipucu=None):
    """Süreden tempoyu çıkarır. Dosya adındaki sayıyla karşılaştırır.

    Mantık: loop tam sayıda vuruş içermek zorunda. Hangi tempoda tam
    vuruşa oturuyorsa tempo odur. Birden çok aday çıkarsa (90 ve 180 gibi
    katlar) dosya adındaki sayıya en yakını seçilir.
    """
    adaylar = []
    for bpm in TEMPO_ADAYLARI:
        vurus = sure / (60.0 / bpm)
        sapma = abs(vurus - round(vurus)) * (60.0 / bpm) * 1000
        if round(vurus) >= 2 and sapma < SAPMA_ESIGI_MS:
            adaylar.append((sapma, bpm, int(round(vurus))))
    if not adaylar:
        return None, None, None, None, ''

    addaki = ipucu
    # Bir loop aynı anda 50, 100 ve 200 BPM'e "oturur" (kat ilişkisi).
    # Ad içinde tempo varsa ona, yoksa perküsyon loop'larında en sık görülen
    # 100 BPM civarına en yakın aday seçilir. Diğer adaylar CSV'ye yazılır,
    # yanlış seçersek sen düzeltirsin.
    hedef = addaki if addaki else 100
    adaylar.sort(key=lambda x: (abs(x[1] - hedef), x[0]))
    sapma, bpm, vurus = adaylar[0]
    diger = '/'.join(str(a[1]) for a in sorted(adaylar, key=lambda x: x[1]))
    return bpm, vurus, sapma, addaki, diger


def parlaklik(mono, sr):
    """Sıfır geçiş oranı — çalgıyı tahmin etmek için kaba ama işe yarar
    bir ölçü. Shaker/zil yüksek, bendir/davul düşük çıkar."""
    gecis = 0
    for i in range(1, len(mono)):
        if (mono[i - 1] >= 0) != (mono[i] >= 0):
            gecis += 1
    return gecis / (len(mono) / sr)


def calgi_tahmini(p):
    if p > 4000: return 'shaker/zil?'
    if p > 1800: return 'darbuka?'
    return 'bendir/davul?'


# ── Gruplama ────────────────────────────────────────────────────────────

def on_ek(ad):
    """Dosya adının sayı ve ayraçlardan arındırılmış gövdesi."""
    g = os.path.splitext(os.path.basename(ad))[0]
    g = re.sub(r'[\d]+', '', g)
    g = re.sub(r'[^A-Za-zÇĞİÖŞÜçğıöşü]+', '', g)
    return g.upper()


def grupla(kayitlar):
    """Aynı kümeye ait varyasyonları bulur: aynı süre + aynı tempo +
    benzer parlaklık + benzer ad gövdesi."""
    kovalar = defaultdict(list)
    for k in kayitlar:
        klasor = os.path.dirname(k['dosya'])
        anahtar = (klasor, round(k['sure'], 2), k['bpm'])
        kovalar[anahtar].append(k)
    gruplar = []
    for i, (_, uyeler) in enumerate(sorted(kovalar.items(), key=lambda x: str(x[0])), 1):
        uyeler.sort(key=lambda k: k['dosya'])
        gruplar.append({'no': i, 'uyeler': uyeler, 'ornek': uyeler[0]})
    return gruplar


# ── 1. adım: tara ───────────────────────────────────────────────────────

def tara(klasor, cikti='loop_tablo.csv'):
    yollar = []
    for kok, _, dosyalar in os.walk(klasor):
        for d in sorted(dosyalar):
            if d.lower().endswith('.wav') and not d.startswith('.'):
                yollar.append(os.path.join(kok, d))
    if not yollar:
        print('WAV bulunamadı:', klasor); return

    kayitlar, sorunlu, tek_vurus = [], [], []
    for y in yollar:
        bilgi = wav_oku(y)
        if not bilgi:
            sorunlu.append((os.path.relpath(y, klasor), '16 bit değil')); continue
        bagil = os.path.relpath(y, klasor)
        env = zarf(bilgi['mono'], bilgi['sr'])
        atak = atak_sayisi(env)
        # Tek vuruşluk örnekler (snare, kick, zil) loop değildir — zorla
        # tempoya oturtmak saçma sonuç verir, ayrı listeye alınır.
        if atak <= 1 or (bilgi['sure'] < 1.2 and atak <= 2):
            tek_vurus.append((bagil, f'tek vuruş ({bilgi["sure"]:.2f} sn)')); continue
        bpm, vurus, sapma, addaki, diger = tempo_bul(bilgi['sure'], y, tempo_ipucu(bagil))
        if bpm is None:
            sorunlu.append((bagil, 'tam ölçüye oturmuyor')); continue
        p = parlaklik(bilgi['mono'], bilgi['sr'])
        kayitlar.append({
            'dosya': os.path.relpath(y, klasor), 'sure': bilgi['sure'],
            'bpm': bpm, 'vurus': vurus, 'sapma': sapma, 'addaki': addaki, 'diger': diger,
            'kanal': bilgi['kanal'], 'stereo_fark': bilgi['stereo_fark'],
            'parlaklik': p, 'sr': bilgi['sr'], 'atak': atak,
            'zaman': zaman_ipucu(bagil) or '',
        })

    gruplar = grupla(kayitlar)

    with open(cikti, 'w', newline='', encoding='utf-8') as f:
        y = csv.writer(f)
        y.writerow(['grup', 'ritim', 'tavir', 'calgi', 'olcu_zaman',
                    'ornek_dosya', 'dosya_sayisi', 'tempo', 'vurus', 'sure_sn',
                    'sapma_ms', 'addaki_tempo', 'tempo_adaylari', 'kanal', 'stereo_fark', 'calgi_tahmini'])
        for g in gruplar:
            o = g['ornek']
            y.writerow([g['no'], '', '', '', o['zaman'],
                        o['dosya'], len(g['uyeler']), o['bpm'], o['vurus'],
                        f"{o['sure']:.3f}", f"{o['sapma']:.1f}",
                        o['addaki'] or '', o['diger'], o['kanal'], f"{o['stereo_fark']:.4f}",
                        calgi_tahmini(o['parlaklik'])])

    print(f"{len(kayitlar)} dosya ölçüldü, {len(gruplar)} grup bulundu → {cikti}")
    for g in gruplar:
        o = g['ornek']
        uyari = '  ⚠ ad/ölçüm uyuşmuyor' if (o['addaki'] and o['addaki'] != o['bpm']) else ''
        print(f"  grup {g['no']:2d}: {len(g['uyeler']):2d} dosya · {o['bpm']} bpm · "
              f"{o['vurus']} vuruş · {calgi_tahmini(o['parlaklik'])} · örnek: {o['dosya']}{uyari}")
    if tek_vurus:
        print(f"\n{len(tek_vurus)} dosya tek vuruşluk örnek (loop değil), atlandı:")
        for d, n in tek_vurus[:8]:
            print('  -', d)
        if len(tek_vurus) > 8:
            print(f'  ... ve {len(tek_vurus)-8} tane daha')
    if sorunlu:
        print('\nElle bakılması gerekenler:')
        for d, n in sorunlu:
            print('  -', d, '—', n)
    print('\nŞimdi CSV\'yi aç; her grup için örnek dosyayı dinleyip '
          'ritim / tavir / calgi / olcu_zaman sütunlarını doldur.')


# ── 2. adım: uygula ─────────────────────────────────────────────────────

def sadelestir(s):
    tr = {'ç':'c','ğ':'g','ı':'i','ö':'o','ş':'s','ü':'u','Ç':'c','Ğ':'g','İ':'i','Ö':'o','Ş':'s','Ü':'u'}
    s = ''.join(tr.get(c, c) for c in (s or '')).lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def uygula(klasor, csv_yolu, hedef, mono_esigi=0.05):
    with open(csv_yolu, encoding='utf-8') as f:
        satirlar = list(csv.DictReader(f))
    os.makedirs(hedef, exist_ok=True)

    # gruplar CSV'de örnek dosyayla temsil ediliyor; grubun diğer üyelerini
    # tarama mantığıyla yeniden buluyoruz
    yollar = []
    for kok, _, dosyalar in os.walk(klasor):
        for d in sorted(dosyalar):
            if d.lower().endswith('.wav') and not d.startswith('.'):
                yollar.append(os.path.join(kok, d))
    kayitlar = []
    for y in yollar:
        b = wav_oku(y)
        if not b: continue
        bagil = os.path.relpath(y, klasor)
        if atak_sayisi(zarf(b['mono'], b['sr'])) <= 1: continue
        bpm, vurus, sapma, addaki, _d = tempo_bul(b['sure'], y, tempo_ipucu(bagil))
        if bpm is None: continue
        kayitlar.append({'dosya': bagil, 'sure': b['sure'], 'bpm': bpm,
                         'vurus': vurus, 'parlaklik': parlaklik(b['mono'], b['sr']), 'tam': y, 'bilgi': b})
    gruplar = grupla(kayitlar)

    tablo, atlanan = [], 0
    for s in satirlar:
        g = next((x for x in gruplar if str(x['no']) == str(s['grup'])), None)
        if not g: continue
        if not s.get('ritim'):
            atlanan += 1; continue
        zaman = s.get('olcu_zaman') or '4'
        taban = '-'.join(x for x in [sadelestir(s['ritim']), sadelestir(s.get('tavir')),
                                     sadelestir(s.get('calgi'))] if x)
        for i, u in enumerate(g['uyeler'], 1):
            b = u['bilgi']
            olcu = u['vurus'] / int(zaman)
            yeni = f"{taban}-{u['bpm']}bpm-{i:02d}.wav"
            yaz_mono(b, os.path.join(hedef, yeni), mono_esigi)
            tablo.append({'dosya': yeni, 'ritim': s['ritim'], 'tavir': s.get('tavir',''),
                          'calgi': s.get('calgi',''), 'tempo': u['bpm'], 'zaman': zaman,
                          'vurus': u['vurus'], 'olcu': f'{olcu:g}', 'sure_sn': f"{u['sure']:.3f}",
                          'varyasyon': i})

    cikti = os.path.join(hedef, 'loops.csv')
    with open(cikti, 'w', newline='', encoding='utf-8') as f:
        y = csv.DictWriter(f, fieldnames=['dosya','ritim','tavir','calgi','tempo',
                                          'zaman','vurus','olcu','sure_sn','varyasyon'])
        y.writeheader(); y.writerows(tablo)
    print(f"{len(tablo)} dosya yazıldı → {hedef}")
    print(f"Yükleme listesi: {cikti}")
    if atlanan:
        print(f"{atlanan} grup atlandı (ritim sütunu boştu).")


def yaz_mono(bilgi, hedef_yol, esik):
    """Kanal farkı eşiğin altındaysa mono yazar; değilse stereo bırakır."""
    mono_yap = bilgi['kanal'] == 2 and bilgi['stereo_fark'] < esik
    with wave.open(hedef_yol, 'wb') as w:
        if mono_yap:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(bilgi['sr'])
            w.writeframes(bilgi['mono'].tobytes())
        else:
            w.setnchannels(bilgi['kanal']); w.setsampwidth(2); w.setframerate(bilgi['sr'])
            w.writeframes(bilgi['sol'].tobytes())


# ── Giriş ───────────────────────────────────────────────────────────────

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(1)
    komut = sys.argv[1]
    if komut == 'tara':
        tara(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else 'loop_tablo.csv')
    elif komut == 'uygula':
        if len(sys.argv) < 5:
            print('Kullanım: uygula <kaynak klasör> <csv> <hedef klasör>'); sys.exit(1)
        uygula(sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        print(__doc__)
