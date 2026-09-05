# -*- coding: utf-8 -*-
# stage.html — SAHNEDE YATAY TAŞMA / İŞE YARAMAZ KAYDIRMA (2026-09-05)
import io
P='stage.html'
s=io.open(P,encoding='utf-8').read(); once=len(s.encode('utf-8'))

# ── 1) Masaüstü .wlyrics: fit çarpanı + taşma yerine sarma ───────────────
old=".wlyrics{font-size:calc(clamp(18px,2.8vw,28px) * var(--lyrics-scale,1));"
new=".wlyrics{font-size:calc(clamp(18px,2.8vw,28px) * var(--lyrics-scale,1) * var(--fit-scale,1));"
assert s.count(old)==1,'wlyrics font-size: %d'%s.count(old)
s=s.replace(old,new)

old="box-sizing:border-box;overflow-x:auto;-webkit-overflow-scrolling:touch;}"
new=("box-sizing:border-box;overflow-x:hidden;overflow-wrap:break-word;"
     "-webkit-overflow-scrolling:touch;}")
assert s.count(old)==1,'wlyrics overflow: %d'%s.count(old)
s=s.replace(old,new)

# ── 2) Mobil kuralı ──────────────────────────────────────────────────────
old=".wlyrics { font-size:calc(clamp(14px,4.2vw,20px) * var(--lyrics-scale,1)); line-height:1.8;"
new=".wlyrics { font-size:calc(clamp(14px,4.2vw,20px) * var(--lyrics-scale,1) * var(--fit-scale,1)); line-height:1.8;"
assert s.count(old)==1,'mobil wlyrics: %d'%s.count(old)
s=s.replace(old,new)

# ── 3) Sığdırma motoru ───────────────────────────────────────────────────
old="const LYRICS_SCALE_MIN = 0.75, LYRICS_SCALE_MAX = 1.6;"
new='''/* ── SAHNE SIĞDIRMA (2026-09-05) ────────────────────────────────────────
   Sorun: .wlyrics'te overflow-x:auto vardı. Sahnede yatay kaydırma işe
   yaramaz — müzisyen çalarken yana kaydıramaz, taşan akor görünmez kalır.
   Amaç TAŞMAYI ÖNLEMEK, boşluğu doldurmak değil: ölçek yalnızca küçültür,
   asla büyütmez.
   Kullanıcının sürgüsü ÜSTTE kalır: --fit-scale onun seçtiği --lyrics-scale'i
   çarpar, ezmez. Sürgüyü kısınca sığdırma da gevşer.
   Ölçek ESER BAŞINA hesaplanır (her renderStage'de sıfırlanır), satır başına
   değil — satır başına olsaydı aynı sayfada farklı puntolar olurdu.
   TABAN 14px: bunun altına inmek yerine yatay kaydırma geri açılır; okunmaz
   bir sayfa, kaydırılabilir bir sayfadan kötüdür. */
const FIT_MIN_PX = 14;
let _fitRaf = null;
function fitLyrics() {
  const el = document.querySelector('#stageScreen .wlyrics') || document.querySelector('.wlyrics');
  if (!el) return;
  const root = document.documentElement;
  root.style.setProperty('--fit-scale', 1);
  el.style.overflowX = 'hidden';
  // Taşma yoksa iş bitti — yaygın durum, tek ölçüm.
  if (el.scrollWidth <= el.clientWidth + 1) return;
  const basePx = parseFloat(getComputedStyle(el).fontSize) || 18;
  const minFit = Math.min(1, FIT_MIN_PX / basePx);
  let lo = minFit, hi = 1, best = minFit;
  for (let i = 0; i < 6; i++) {
    const mid = (lo + hi) / 2;
    root.style.setProperty('--fit-scale', mid);
    if (el.scrollWidth <= el.clientWidth + 1) { best = mid; lo = mid; }
    else { hi = mid; }
  }
  root.style.setProperty('--fit-scale', best);
  // Tabana rağmen sığmıyorsa kaydırmayı geri aç (uzun tek kelime, geniş akor).
  if (el.scrollWidth > el.clientWidth + 1) el.style.overflowX = 'auto';
}
function fitLyricsSoon() {
  if (_fitRaf) cancelAnimationFrame(_fitRaf);
  _fitRaf = requestAnimationFrame(() => { _fitRaf = null; fitLyrics(); });
}
window.addEventListener('resize', fitLyricsSoon);
window.addEventListener('orientationchange', fitLyricsSoon);

const LYRICS_SCALE_MIN = 0.75, LYRICS_SCALE_MAX = 1.6;'''
assert s.count(old)==1,'LYRICS_SCALE_MIN: %d'%s.count(old)
s=s.replace(old,new)

# ── 4) Sürgü değişince yeniden sığdır ────────────────────────────────────
old="""  document.documentElement.style.setProperty('--lyrics-scale', scale);
  updateFontSliderUI(scale);
}"""
new="""  document.documentElement.style.setProperty('--lyrics-scale', scale);
  updateFontSliderUI(scale);
  fitLyrics();   // (2026-09-05) sürgü kullanıcının; sığdırma onun üstünde çalışır
}"""
assert s.count(old)==1,'setLyricsFontScale sonu: %d'%s.count(old)
s=s.replace(old,new)

# ── 5) Render sonunda, içerik basıldıktan sonra AYNI KAREDE ──────────────
old="""  setLyricsAlign(savedAlign);
  updateFontSliderUI(savedScale);"""
new="""  setLyricsAlign(savedAlign);
  updateFontSliderUI(savedScale);
  fitLyrics();   // (2026-09-05) eser başına sığdırma — hiza/ölçek ile aynı karede"""
assert s.count(old)==1,'renderStage kuyrugu: %d'%s.count(old)
s=s.replace(old,new)

io.open(P,'w',encoding='utf-8').write(s)
print('OK  %d -> %d bayt (+%d)'%(once,len(s.encode('utf-8')),len(s.encode('utf-8'))-once))
