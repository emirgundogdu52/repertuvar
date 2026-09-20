/* data-i18n textContent yazıyor: etiketli öğenin İÇİNDE id'li çocuk kalmamalı */
const fs=require('fs');
let hata=0;
const s=fs.readFileSync('/mnt/user-data/outputs/calisma.html','utf8');
const re=/<(\w+)[^>]*\sdata-i18n="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g;
let m, bulunan=0;
while((m=re.exec(s))){
  bulunan++;
  const idler=[...m[3].matchAll(/id="([^"]+)"/g)].map(x=>x[1]);
  if(idler.length){
    hata++;
    console.log('KALDI  data-i18n="'+m[2]+'" içinde id var:', idler.join(','));
  }
}
console.log(`GEÇTİ  ${bulunan} data-i18n öğesi tarandı, içinde id'li çocuk yok`);
// yeniKayit dayanıklılık: ykMaxMb yokken de katman açılmalı
const js=s.match(/<script>([\s\S]*?)<\/script>/)[1];
const govde=js.slice(js.indexOf('function yeniKayit'), js.indexOf('function ykKapat'));
const sira=[govde.indexOf('ykMaxMb'), govde.indexOf("classList.add('acik')")];
console.log((govde.includes('_mx &&')||govde.includes('&& _mx')) ? 'GEÇTİ  ykMaxMb null kontrolü var' : (hata++, 'KALDI  null kontrolü yok'));
process.exit(hata?1:0);
