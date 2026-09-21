/* ritim-kes.html — yeni kayıt açınca önceki durumun temizlenmesi */
const fs=require('fs'), path=require('path');
const KOK=process.env.KOK||path.join(__dirname,'..');
const D=require(path.join(KOK,'dongu.js'));
let hata=0; const yaz=(a,ok,ek='')=>{console.log((ok?'GEÇTİ ':'KALDI ')+a+(ek?'  — '+ek:'')); if(!ok)hata++;};
const sr=44100;
function tampon(sn){ const n=sn*sr, L=new Float32Array(n), R=new Float32Array(n);
  for(let t=0.3;t<sn-0.5;t+=0.6){const i0=Math.round(t*sr);for(let j=0;j<sr*0.1&&i0+j<n;j++){const z=Math.exp(-j/sr*30)*0.6;L[i0+j]=z;R[i0+j]=z;}}
  return {sampleRate:sr,duration:sn,numberOfChannels:2,getChannelData:c=>c?R:L}; }
const W=900, ogeler={};
const tuval=()=>({clientWidth:W,style:{},getAttribute:()=>'100',getContext:()=>new Proxy({},{get:(t,k)=>(k in t)?t[k]:()=>{},set:(t,k,v)=>{t[k]=v;return true;}}),
  getBoundingClientRect:()=>({left:0,width:W}),setPointerCapture(){},releasePointerCapture(){},addEventListener(){}});
const oge=id=>ogeler[id]||(ogeler[id]=Object.assign(/rkGenel|rkYakin|rkDikis/.test(id)?tuval():{value:'',checked:false,disabled:false,hidden:true,textContent:'',className:'',style:{},
  classList:{toggle(){},contains:()=>false,add(){},remove(){}},querySelector:()=>({className:''}),addEventListener(){},focus(){}},{id}));
global.document={getElementById:oge,documentElement:{}};
global.window={devicePixelRatio:1,addEventListener(){}}; global.getComputedStyle=()=>({getPropertyValue:()=>''});
global.requestAnimationFrame=f=>f(); global.SUPA_URL='x'; global.SUPA_KEY='k'; global.localStorage={getItem:()=>null};
global.fetch=async()=>({ok:false}); global.Dongu=D;
let sonrakiSure=20;
global.Ses={hazirla:async()=>({ok:true}),cikis:()=>null,ctx:()=>({decodeAudioData:(ab,ok)=>{ok(tampon(sonrakiSure));return null;}})};
const html=fs.readFileSync(path.join(KOK,'ritim-kes.html'),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/kotaYukle\(\);\s*$/,'');
eval(js+';global.__d={dosyaAc, get ref(){return refTempo}, get zaman(){return zaman}, get tempo(){return tempo}, get toplam(){return toplamSn}, oneriHesapla};');
const d=global.__d;
const dosya=(ad)=>({name:ad, arrayBuffer:async()=>new ArrayBuffer(8)});
(async()=>{
  await d.dosyaAc(dosya('2_4 Kaşıklı Tempo 85.mp3'));
  yaz('ilk dosya: ad dosyadan', oge('rkAd').value==='2_4 Kaşıklı Tempo 85');
  yaz('ilk dosya: referans tempo 85', d.ref===85);
  yaz('"Başka kayıt aç" görünür', oge('rkDegistir').hidden===false);
  oge('rkAd').value='Kendi verdiğim ad 2';
  sonrakiSure=30;
  await d.dosyaAc(dosya('Halay ritmi.wav'));
  yaz('ikinci dosya: ad yenilendi', oge('rkAd').value==='Halay ritmi', oge('rkAd').value);
  yaz('ikinci dosya: eski referans tempo temizlendi', d.ref===null, String(d.ref));
  yaz('ikinci dosya: süre yeni kaydın', d.toplam===30);
  yaz('öneri kutusu gizli', oge('rkOneri').hidden===true);
  yaz('önceki "Kaydedildi" mesajı temizlendi', !oge('rkDurum').className.includes('tamam'));
  console.log(hata?`\n${hata} TEST BAŞARISIZ`:'\nTÜM TESTLER GEÇTİ'); process.exit(hata?1:0);
})();
