/* data-i18n textContent yazıyor: etiketli öğenin İÇİNDE id'li çocuk kalmamalı.
 * Kullanım: node test_i18n_yapi.js [sayfa.html ...]  (varsayılan: calisma.html ritim-kes.html) */
const fs=require('fs'), path=require('path');
let hata=0;
const sayfalar=process.argv.slice(2).length? process.argv.slice(2)
  : ['calisma.html','ritim-kes.html'].map(f=>path.join(__dirname,'..',f));
for (const sayfa of sayfalar){
  if(!fs.existsSync(sayfa)){ console.log('ATLANDI', sayfa); continue; }
  const s=fs.readFileSync(sayfa,'utf8');
  const re=/<(\w+)[^>]*\sdata-i18n="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g;
  let m, bulunan=0, sorun=0;
  while((m=re.exec(s))){
    bulunan++;
    const idler=[...m[3].matchAll(/id="([^"]+)"/g)].map(x=>x[1]);
    if(idler.length){ sorun++; hata++; console.log('KALDI  '+path.basename(sayfa)+': data-i18n="'+m[2]+'" içinde id:', idler.join(',')); }
  }
  if(!sorun) console.log('GEÇTİ  '+path.basename(sayfa)+': '+bulunan+' data-i18n öğesi, içinde id\'li çocuk yok');
}
process.exit(hata?1:0);
