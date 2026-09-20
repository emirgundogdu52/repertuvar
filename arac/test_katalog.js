/* Usul kataloğu doğrulaması */
const fs=require('fs');
let hata=0; const yaz=(a,ok,ek='')=>{console.log((ok?'GEÇTİ ':'KALDI ')+a+(ek?'  — '+ek:'')); if(!ok)hata++;};
global.window={}; global.Ses={ctx:()=>null,cikis:()=>null,hazirla:async()=>({ok:true})};
eval(fs.readFileSync('/home/claude/zamanlayici.js','utf8'));
eval(fs.readFileSync('/home/claude/ritim.js','utf8'));
const R=global.window.Ritim;

yaz('katalogda sorun yok', R.sorunlar.length===0, R.sorunlar.join(' | '));

const calinabilir=R.kalipListesi();
console.log('\nÇALINABİLİR (%d):', calinabilir.length);
for (const k of calinabilir){
  const t=k.olaylar.reduce((a,o)=>a+o.sure,0);
  const dizi=k.olaylar.map(o=>`${o.vurus}${o.sure>1?'·'+o.sure:''}@${o.konum}`).join(' ');
  console.log(`  ${k.ad.tr.padEnd(13)} ${k.olcu.padEnd(6)} ${String(k.zaman).padStart(2)} zaman  grup ${(k.gruplama||[]).join('+')||'—'}  toplam ${t}  [${dizi}]`);
  yaz(`  ${k.ad.tr}: süre toplamı = zaman`, t===k.zaman);
}
const metadata=Object.values(R.kaliplar).filter(k=>!k.calinabilir);
console.log('\nMETADATA-ONLY (%d):', metadata.length);
for (const k of metadata) console.log(`  ${k.ad.tr.padEnd(13)} ${k.olcu.padEnd(6)} ${String(k.zaman).padStart(2)} zaman  — ${k.kaynak}`);

// id benzersizliği
const idler=Object.values(R.kaliplar).map(k=>k.id);
yaz('id çakışması yok', new Set(idler).size===idler.length);
// her kalıp tüm alanları taşıyor
const alanlar=['id','ad','olcu','zaman','birim','gruplama','altBolunme','olaylar','varsayilanBpm','uyumluKitler','tavirlar','varyasyon','kaynak','calinabilir'];
yaz('tüm kalıplar veri modeline uyuyor', Object.values(R.kaliplar).every(k=>alanlar.every(a=>a in k)));
// semantik darp korunuyor mu
const as=R.kaliplar.aksak_semai;
yaz('Aksak Semâi KA darbı TEK’e çevrilmemiş', as.olaylar.some(o=>o.vurus==='KA'));
yaz('KA bendir’de tek örneğine çözülüyor', R.kitler.bendir.cozumleme.KA==='tek');
yaz('KA darbuka’da tek örneğine çözülüyor', R.kitler.darbuka.cozumleme.KA==='tek');
// bozuk kalıp reddediliyor mu
const bozuk=JSON.parse(JSON.stringify(R.kaliplar.turk_aksagi)); bozuk.olaylar[0].sure=3;
yaz('süre toplamı aşan kalıp reddediliyor', R._denetle(bozuk,null,null)!==null, R._denetle(bozuk,null,null));
const bosluklu=JSON.parse(JSON.stringify(R.kaliplar.turk_aksagi)); bosluklu.olaylar[1].konum=3;
yaz('konum sırası bozuk kalıp reddediliyor', R._denetle(bosluklu,null,null)!==null, R._denetle(bosluklu,null,null));


// ── Türetilmiş kalıplar ──────────────────────────────────────────────
const birlesimler={devri_hindi:['semai','sofyan'],devri_turan:['sofyan','semai'],
  duyek:['sofyan','sofyan'],aksak:['sofyan','turk_aksagi'],
  raks_aksagi:['turk_aksagi','sofyan'],oynak:['semai','yuruk_semai']};
console.log('\nTÜRETME DOĞRULAMASI');
for (const [id,parcalar] of Object.entries(birlesimler)) {
  const k=R.kaliplar[id];
  yaz(`${k.ad.tr}: çalınabilir`, k.calinabilir===true);
  // parçaların olayları sırayla ve kaydırılmış konumlarla yer almalı
  const beklenen=[]; let kayma=0;
  for (const pid of parcalar) {
    const p=R.kaliplar[pid];
    for (const o of p.olaylar) beklenen.push(`${o.vurus}@${kayma+o.konum}/${o.sure}/${o.vurgu}`);
    kayma+=p.zaman;
  }
  const gercek=k.olaylar.map(o=>`${o.vurus}@${o.konum}/${o.sure}/${o.vurgu}`);
  yaz(`  ${k.ad.tr}: olaylar parçalardan birebir`, JSON.stringify(gercek)===JSON.stringify(beklenen),
      gercek.join(' '));
  yaz(`  ${k.ad.tr}: zaman ${kayma}=${k.zaman}`, kayma===k.zaman);
  yaz(`  ${k.ad.tr}: kaynak türetme notu taşıyor`, /türetildi/.test(k.kaynak));
}
// semantik darplar korunuyor mu
yaz('Sofyan türevlerinde TE/KE korunuyor',
  ['devri_hindi','devri_turan','duyek','aksak','raks_aksagi']
    .every(id=>R.kaliplar[id].olaylar.some(o=>o.vurus==='TE') &&
               R.kaliplar[id].olaylar.some(o=>o.vurus==='KE')));
yaz('hiçbir türevde TE/KE TEK’e çevrilmemiş',
  ['devri_hindi','duyek'].every(id=>!R.kaliplar[id].olaylar.every(o=>o.vurus==='TEK'||o.vurus==='DUM')));
// her çalınabilir kalıp her uyumlu kitte çözülüyor mu
let cozumOk=true;
for (const k of R.kalipListesi())
  for (const kitId of k.uyumluKitler)
    for (const o of k.olaylar)
      if (!R.kitler[kitId].cozumleme[o.vurus]) { cozumOk=false; console.log('   çözülemedi:',k.id,kitId,o.vurus); }
yaz('tüm darplar bendir ve darbukada çözülüyor', cozumOk);
yaz('beklenen 12 çalınabilir usul', R.kalipListesi().length===12, R.kalipListesi().length+'');
yaz('beklenen 3 metadata usul', Object.values(R.kaliplar).filter(k=>!k.calinabilir).length===3);

console.log(hata? `\n${hata} TEST BAŞARISIZ`:'\nTÜM TESTLER GEÇTİ');
process.exit(hata?1:0);
