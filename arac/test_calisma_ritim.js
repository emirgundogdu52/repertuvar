/* Çalışma Odası arayüzü — çok kitli sürüm */
const fs=require('fs');
let hata=0; const yaz=(a,ok,ek='')=>{console.log((ok?'GEÇTİ ':'KALDI ')+a+(ek?'  — '+ek:'')); if(!ok)hata++;};
const ogeler={};
function oge(id){ if(!ogeler[id]) ogeler[id]={id,style:{},classList:{_s:new Set(),add(x){this._s.add(x)},remove(x){this._s.delete(x)},toggle(x,v){v?this._s.add(x):this._s.delete(x)},contains(x){return this._s.has(x)}},options:[],_html:'',get innerHTML(){return this._html},set innerHTML(v){this._html=v;this.options=(v.match(/value="([^"]+)"/g)||[]).map(x=>x.slice(7,-1));if(this.options.length&&!this.options.includes(this.value))this.value=this.options[0];},textContent:'',disabled:false,value:'',querySelector:()=>({className:''}),hidden:true}; return ogeler[id]; }
global.document={getElementById:oge,visibilityState:'visible',addEventListener:()=>{}};
global.window={}; global.alert=()=>{}; global._caCev=(k,tr)=>tr; global.oyCaliyor=false;
let durum={kit:null,calisiyor:false};
global.Ritim={
  kaliplar:{nim_sofyan:{id:'nim_sofyan',ad:{tr:'Nim Sofyan'},olcu:'2/4',uyumluKitler:['bendir','darbuka'],durum:'dogrulandi'}},
  kitler:{bendir:{id:'bendir',ad:'Bendir',gosterilsin:true},darbuka:{id:'darbuka',ad:'Darbuka',gosterilsin:true},
          shaker:{id:'shaker',ad:'Shaker',gosterilsin:false}},
  kalipListesi(){return [this.kaliplar.nim_sofyan];},
  kitListesi(kalipId){const k=this.kaliplar[kalipId];return Object.values(this.kitler).filter(x=>x.gosterilsin&&(!k||k.uyumluKitler.includes(x.id)));},
  olustur(a){durum.kit=a.kit||'bendir';return{
    hazirla:async()=>({ok:true}), basla(){durum.calisiyor=true;return true;}, durdur(){durum.calisiyor=false;},
    bpmYaz:v=>v, kalipYaz:()=>true, kitYaz(id){durum.kit=id;return true;} };}
};
const html=fs.readFileSync('/mnt/user-data/outputs/calisma.html','utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
eval(js.slice(js.indexOf('// ── RİTİM (AŞAMA C)')));
(async()=>{
  sekmeAc('ritim');
  yaz('usul listesi dolu', oge('rtUsul').innerHTML.includes('Nim Sofyan'));
  yaz('çalgı listesinde Bendir ve Darbuka',
      oge('rtCalgi').options.join(',')==='bendir,darbuka', oge('rtCalgi').options.join(','));
  yaz('gizli kit listelenmiyor', !oge('rtCalgi').innerHTML.includes('Shaker'));
  await rtCalDurdur();
  yaz('bendir ile başlıyor', durum.calisiyor && durum.kit==='bendir', durum.kit);
  await rtCalgiSec('darbuka');
  yaz('çalarken darbukaya geçiş', durum.calisiyor && durum.kit==='darbuka', durum.kit);
  rtDurdur();
  await rtCalgiSec('bendir');
  yaz('duruyorken kit değişimi çalmaya başlatmıyor', durum.calisiyor===false && durum.kit==='bendir');
  rtUsulSec('nim_sofyan');
  yaz('usul değişince çalgı listesi korunuyor', oge('rtCalgi').options.join(',')==='bendir,darbuka');
  console.log(hata? `\n${hata} TEST BAŞARISIZ`:'\nTÜM TESTLER GEÇTİ');
  process.exit(hata?1:0);
})();
