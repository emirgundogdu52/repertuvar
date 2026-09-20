/* Kilit/arka plan sonrası durum düzeltmesi testi */
const fs=require('fs');
let hata=0; const yaz=(a,ok,ek='')=>{console.log((ok?'GEÇTİ ':'KALDI ')+a+(ek?'  — '+ek:'')); if(!ok)hata++;};
const ogeler={};
function oge(id){ if(!ogeler[id]) ogeler[id]={id,style:{},classList:{_s:new Set(),add(x){this._s.add(x)},remove(x){this._s.delete(x)},toggle(x,v){v?this._s.add(x):this._s.delete(x)},contains(x){return this._s.has(x)}},options:[],innerHTML:'',textContent:'',disabled:false,value:'',querySelector:()=>({className:''}),hidden:true}; return ogeler[id]; }
let dinleyici=null;
global.document={ getElementById:oge, visibilityState:'visible',
  addEventListener:(t,f)=>{ if(t==='visibilitychange') dinleyici=f; } };
const actx={ state:'running', resume(){ this.state=this._acilir?'running':'suspended'; return Promise.resolve(); } };
global.window={ Ses:{ ctx:()=>actx } }; global.Ses=global.window.Ses;
global.alert=()=>{}; global._caCev=(k,tr)=>tr; global.oyCaliyor=false;
let calisiyor=false;
global.Ritim={ kaliplar:{nim_sofyan:{id:'nim_sofyan',ad:{tr:'Nim Sofyan'},olcu:'2/4'}}, kitler:{bendir:{id:'bendir',ad:'Bendir'}},
  olustur(){ return { hazirla:async()=>({ok:true}), basla(){calisiyor=true;return true;}, durdur(){calisiyor=false;}, bpmYaz:v=>v, kalipYaz:()=>true };}};

const html=fs.readFileSync('/mnt/user-data/outputs/calisma.html','utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
eval(js.slice(js.indexOf('// ── RİTİM (AŞAMA C)')));

(async()=>{
  sekmeAc('ritim'); await rtCalDurdur();
  yaz('ritim çalıyor', calisiyor && oge('rtCalMetin').textContent==='Durdur');

  // 1. kilit → ses askıda, geri dönüşte açılamıyor
  actx.state='suspended'; actx._acilir=false;
  await dinleyici(); await new Promise(r=>setTimeout(r,10));
  yaz('ses açılamıyorsa düğme "Başlat"a dönüyor', oge('rtCalMetin').textContent==='Başlat', 'düğme: '+oge('rtCalMetin').textContent);
  yaz('motor da durduruldu', calisiyor===false);
  yaz('kayıt düğmesi tekrar etkin', oge('oyOynatBtn').disabled===false);

  // 2. tek dokunuşla devam
  await rtCalDurdur();
  yaz('tek dokunuşla yeniden başlıyor', calisiyor===true && oge('rtCalMetin').textContent==='Durdur');

  // 3. kesinti olmadan geri dönüş — hiçbir şey değişmemeli
  actx.state='running';
  await dinleyici(); await new Promise(r=>setTimeout(r,10));
  yaz('kesinti yoksa çalmaya devam', calisiyor===true && oge('rtCalMetin').textContent==='Durdur');

  // 4. askıya alınmış ama geri açılabiliyorsa devam etsin
  actx.state='suspended'; actx._acilir=true;
  await dinleyici(); await new Promise(r=>setTimeout(r,10));
  yaz('ses geri açılabiliyorsa kesilmiyor', calisiyor===true && oge('rtCalMetin').textContent==='Durdur');

  // 5. ritim çalmıyorken olay gelirse bir şey yapmamalı
  rtDurdur(); actx.state='suspended'; actx._acilir=false;
  await dinleyici(); await new Promise(r=>setTimeout(r,10));
  yaz('ritim kapalıyken etkisiz', calisiyor===false);

  console.log(hata? '\n'+hata+' TEST BAŞARISIZ':'\nTÜM TESTLER GEÇTİ');
  process.exit(hata?1:0);
})();
