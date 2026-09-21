/* ritim-kes.html — çizgi sürükleme, oturma, tempo türetme, görünüm */
const fs=require('fs'), path=require('path');
const D=require(path.join(process.env.KOK||require('path').join(__dirname,'..'),'dongu.js'));
let hata=0; const yaz=(a,ok,ek='')=>{console.log((ok?'GEÇTİ ':'KALDI ')+a+(ek?'  — '+ek:'')); if(!ok)hata++;};
const sr=44100;

// sentetik kayıt: 100 BPM, ilk vuruş 0.37 sn
function kayit(tempo=100, sure=40, bas=0.37){
  const n=Math.round(sure*sr), L=new Float32Array(n), R=new Float32Array(n);
  let s=1; const r=()=>((s=(s*16807)%2147483647)/2147483647)*2-1;
  for(let i=0;i<n;i++){L[i]=r()*0.004;R[i]=r()*0.004;}
  const v=[]; for(let t=bas;t<sure-0.5;t+=60/tempo){ v.push(t); const i0=Math.round(t*sr);
    for(let j=0;j<sr*0.2&&i0+j<n;j++){const z=Math.exp(-j/sr*25)*Math.sin(2*Math.PI*200*j/sr)*0.7;L[i0+j]+=z;R[i0+j]+=z;} }
  return {k:[L,R], v};
}

function ortam(kayitTempo=100){
  const dinle={}; const W=900;
  const tuval=()=>({clientWidth:W,width:0,height:0,style:{},getAttribute:()=> '120',
    getContext:()=>new Proxy({},{get:(t,k)=> (k in t)? t[k] : ()=>{}, set:(t,k,v)=>{t[k]=v;return true;}}),
    getBoundingClientRect:()=>({left:0,width:W}),
    setPointerCapture(){},releasePointerCapture(){},
    addEventListener(t,f){ (dinle[this.id+':'+t]=f); }});
  const ogeler={};
  const oge=id=>ogeler[id]||(ogeler[id]=Object.assign(
    /rkGenel|rkYakin|rkDikis/.test(id)? tuval() : {value:'',checked:false,disabled:false,textContent:'',className:'',style:{},
      classList:{_s:new Set(),toggle(x,v){v?this._s.add(x):this._s.delete(x)},contains(){return false},add(){},remove(){}},
      querySelector:()=>({className:''}),addEventListener(){},focus(){}}, {id}));
  global.document={getElementById:oge,documentElement:{}};
  global.window={devicePixelRatio:1,addEventListener(){}};
  global.getComputedStyle=()=>({getPropertyValue:()=>''});
  global.requestAnimationFrame=f=>f();
  global.SUPA_URL='x'; global.SUPA_KEY='k';
  global.localStorage={getItem:()=>null};
  global.fetch=async()=>({ok:false});
  global.Dongu=D;
  global.Ses={hazirla:async()=>({ok:true}),ctx:()=>null,cikis:()=>null};
  const html=fs.readFileSync(path.join(process.env.KOK||require('path').join(__dirname,'..'),'ritim-kes.html'),'utf8');
  const js=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/kotaYukle\(\);\s*$/,'');
  const r=kayit(kayitTempo);
  eval(js+`
    ;kanallar=r.k; sr=${sr}; toplamSn=40; tempo=100; zaman=4; olcu=4;
    basSn=D.atakBul(kanallar,sr,0.4,0.5); bitisiHesapla(); gorunumSigdir(); guncelle();
    global.__d = {
      get bas(){return basSn}, get bitis(){return bitisSn}, get tempo(){return tempo},
      get gor(){return {...gorunum}}, get secili(){return secili},
      set bas(v){basSn=v}, set bitis(v){bitisSn=v},
      kaydir, tempoYaz, olcuYaz, cizgiSec, yakinlas, gorunumSigdir, cizHepsi,
      guncelle, oneriUygula, sunucuMesaji, kaydetDurumu,
      get ref(){return refTempo}, set ref(v){refTempo=v},
      set zaman(v){zaman=v}, set olcu(v){olcu=v}, get olcu(){return olcu},
      set kota(v){KOTA=v}, oge:(id)=>document.getElementById(id),
      x:(t)=>document.getElementById('rkYakin')._x(t)
    };`);
  const c=oge('rkYakin');
  const ev=(tur,x)=>dinle['rkYakin:'+tur]({clientX:x,pointerId:1,preventDefault(){},deltaY:0});
  return {d:global.__d, v:r.v, ev, c, dinle};
}

// ── 1. Başlangıç çizgisini sürükle: bitiş yerinde kalmalı ──
{
  const {d,v,ev}=ortam();
  yaz('açılışta başlangıç ilk vuruşta', Math.abs(d.bas-v[0])<0.002, `${(d.bas*1000).toFixed(1)} ms`);
  const gor0=d.gor, bitis0=d.bitis;
  // başlangıç çizgisini tutup ikinci vuruşa doğru biraz kaydırarak bırak
  const x0=d.x(d.bas), hedef=d.x(v[1]-0.02);
  ev('pointerdown',x0); ev('pointermove',x0+5); ev('pointermove',hedef); ev('pointerup',hedef);
  yaz('başlangıç sürüklenip vuruşa oturdu', Math.abs(d.bas-v[1])<0.002, `hedef ${(v[1]*1000).toFixed(1)} → ${(d.bas*1000).toFixed(1)} ms`);
  yaz('bitiş yerinde kaldı', Math.abs(d.bitis-bitis0)<1e-9);
  yaz('görünüm kaymadı (ses yerinde)', d.gor.a===gor0.a && d.gor.b===gor0.b, `${gor0.a.toFixed(3)}–${gor0.b.toFixed(3)}`);
  yaz('tempo iki çizgiden türedi', Math.abs(d.tempo - 4*4*60/(d.bitis-d.bas))<0.01, `tempo ${d.tempo}`);
}

// ── 2. Bitişi bir sonraki turun ilk vuruşuna koy → gerçek tempo ──
{
  const {d,v,ev}=ortam();
  d.tempoYaz(97);                                   // bilerek yanlış tempo
  yaz('yanlış tempoda bitiş kaydı', Math.abs(d.bitis-v[16])>0.05, `bitiş ${(d.bitis).toFixed(3)} / gerçek ${v[16].toFixed(3)}`);
  d.gorunumSigdir(); d.cizHepsi();
  const x0=d.x(d.bitis), hedef=d.x(v[16]+0.015);    // 16 vuruş sonraki atağın biraz sağına bırak
  ev('pointerdown',x0); ev('pointermove',x0-6); ev('pointermove',hedef); ev('pointerup',hedef);
  yaz('bitiş sonraki turun ilk vuruşuna oturdu', Math.abs(d.bitis-v[16])<0.002, `${((d.bitis-v[16])*1000).toFixed(2)} ms sapma`);
  yaz('tempo gerçek değere döndü (100)', Math.abs(d.tempo-100)<0.05, `tempo ${d.tempo}`);
  yaz('bitiş sürüklenince başlangıç yerinde', Math.abs(d.bas-v[0])<0.002);
  yaz('seçili çizgi bitiş oldu', d.secili==='bitis');
}

// ── 3. Boş yeri sürükle: pencere kayar, çizgiler değişmez ──
{
  const {d,ev}=ortam();
  d.yakinlas(0.5, d.bas);                            // yakınlaş ki kaydırılacak yer olsun
  const bas0=d.bas, bitis0=d.bitis, gor0=d.gor;
  const x0=Math.max(2, d.x(d.bas)-30);               // döngünün DIŞI, başlangıcın solu
  ev('pointerdown',x0); ev('pointermove',x0+120); ev('pointerup',x0+120);
  yaz('pencere kaydı', d.gor.a!==gor0.a, `${gor0.a.toFixed(3)} → ${d.gor.a.toFixed(3)}`);
  yaz('pencere genişliği korundu', Math.abs((d.gor.b-d.gor.a)-(gor0.b-gor0.a))<1e-9);
  yaz('çizgiler yerinde', d.bas===bas0 && d.bitis===bitis0);
}

// ── 4. Boş yere dokun: seçili çizgi oraya gelir ──
{
  const {d,v,ev}=ortam();
  d.cizgiSec('bas');
  const hedefX=d.x(v[2]+0.01);
  ev('pointerdown',hedefX); ev('pointerup',hedefX);
  yaz('dokunulan yere seçili çizgi (başlangıç) geldi', Math.abs(d.bas-v[2])<0.002, `${(d.bas*1000).toFixed(1)} / ${(v[2]*1000).toFixed(1)} ms`);
}

// ── 5. İnce ayar düğmeleri seçili çizgiyi taşır ──
{
  const {d}=ortam();
  const bas0=d.bas, bitis0=d.bitis;
  d.cizgiSec('bas'); d.kaydir(0.001);
  yaz('+1 ms başlangıcı taşıdı', Math.abs(d.bas-bas0-0.001)<1e-9 && d.bitis===bitis0);
  d.cizgiSec('bitis'); d.kaydir(-0.010);
  yaz('−10 ms bitişi taşıdı', Math.abs(d.bitis-bitis0+0.010)<1e-9);
  yaz('tempo her ince ayarda türetildi', Math.abs(d.tempo-16*60/(d.bitis-d.bas))<0.01, `tempo ${d.tempo}`);
}

// ── 6. Tempo / ölçü girince bitiş hareket eder, başlangıç kalır ──
{
  const {d}=ortam();
  const bas0=d.bas;
  d.olcuYaz(8);
  yaz('ölçü 8 → bitiş iki katı uzakta', Math.abs((d.bitis-d.bas)-D.donguSuresi(100,4,8))<1e-6, `${(d.bitis-d.bas).toFixed(3)} sn`);
  yaz('başlangıç yerinde', d.bas===bas0);
  const gor=d.gor;
  yaz('bitiş pencere dışına taşınca pencere genişledi', gor.b>=d.bitis);
}

// ── 7. Sınırlar ──
{
  const {d,ev}=ortam();
  // başlangıcı bitişin ötesine sürüklemeye çalış
  const x0=d.x(d.bas);
  ev('pointerdown',x0); ev('pointermove',x0+5); ev('pointermove',d.x(d.bitis)+200); ev('pointerup',d.x(d.bitis)+200);
  yaz('başlangıç bitişi geçemiyor', d.bas < d.bitis - 0.19, `aralık ${(d.bitis-d.bas).toFixed(3)} sn`);
}

// ── 8. Yakınlaştırma merkezi korur ──
{
  const {d}=ortam();
  const m=d.bas; d.yakinlas(0.25, m);
  const g=d.gor;
  yaz('yakınlaşınca merkez görünümde', g.a<=m && m<=g.b, `${g.a.toFixed(3)}–${g.b.toFixed(3)}`);
  d.yakinlas(1000, m);
  yaz('uzaklaşma kaydın boyunu aşmıyor', d.gor.a>=0 && d.gor.b<=40.0001);
}


// ── 9. İki çizginin arasını sürükle: bütün döngü taşınır, tempo aynı ──
{
  const {d,v,ev}=ortam();
  const t0=d.tempo, boy0=d.bitis-d.bas;
  const orta=d.x((d.bas+d.bitis)/2), kayma=d.x(v[3])-d.x(v[0])-4;
  ev('pointerdown',orta); ev('pointermove',orta+6); ev('pointermove',orta+kayma); ev('pointerup',orta+kayma);
  yaz('döngü taşındı ve başlangıç vuruşa oturdu', Math.abs(d.bas-v[3])<0.002, `${(d.bas*1000).toFixed(1)} / ${(v[3]*1000).toFixed(1)} ms`);
  yaz('döngü boyu korundu', Math.abs((d.bitis-d.bas)-boy0)<1e-9);
  yaz('tempo değişmedi', d.tempo===t0, `tempo ${d.tempo}`);
}


// ── 10. Ekran görüntüsündeki durum: 85 BPM, 2/4, seçim 6 vuruş, ölçü 4 girili ──
{
  const {d,v}=ortam(85);
  d.zaman=2; d.olcu=4; d.ref=85;
  d.bas=v[0]; d.bitis=v[6];                         // 6 vuruş = 3 ölçü 2/4
  d.guncelle();
  // Çizgiler taşınmadığı için tempo henüz türetilmedi; türet:
  d.kaydir(0); 
  yaz('yanlış ölçü sayısıyla tempo 113,3 çıkıyor', Math.abs(d.tempo-113.33)<0.1, `tempo ${d.tempo}`);
  const kutu=d.oge('rkOneri');
  yaz('öneri gösteriliyor', kutu.hidden===false, d.oge('rkOneriMetin').textContent);
  yaz('öneri 3 ölçü diyor', /3 ölçü/.test(d.oge('rkOneriMetin').textContent));
  const bas0=d.bas, bitis0=d.bitis;
  d.oneriUygula();
  yaz('öneri uygulanınca ölçü 3', d.olcu===3);
  yaz('öneri uygulanınca tempo 85', Math.abs(d.tempo-85)<0.05, `tempo ${d.tempo}`);
  yaz('öneri çizgileri taşımıyor', d.bas===bas0 && d.bitis===bitis0);
  yaz('öneri kayboldu', d.oge('rkOneri').hidden===true);
}
// ── 11. Doğru girilmişse öneri çıkmamalı ──
{
  const {d,v}=ortam(85);
  d.zaman=2; d.olcu=3; d.ref=85; d.bas=v[0]; d.bitis=v[6]; d.kaydir(0);
  yaz('doğru ölçü sayısında öneri yok', d.oge('rkOneri').hidden===true);
  d.ref=null; d.olcu=4; d.kaydir(0);
  yaz('referans tempo yoksa öneri yok', d.oge('rkOneri').hidden===true);
}
// ── 12. Sunucu mesajları okunur Türkçe ──
{
  const {d}=ortam();
  yaz('adet mesajı çevriliyor', d.sunucuMesaji('{"message":"Ritim adedi sinirina ulastiniz (0/0)."}')==='Ritim sınırına ulaştın (0/0).',
      d.sunucuMesaji('{"message":"Ritim adedi sinirina ulastiniz (0/0)."}'));
  yaz('depolama mesajı çevriliyor', d.sunucuMesaji('{"message":"Depolama siniri asiliyor (500 MB)."}')==='Depolama sınırı aşılıyor (500 MB).');
  yaz('dosya mesajı çevriliyor', d.sunucuMesaji('{"message":"Dosya 25 MB sinirini asiyor."}')==='Dosya 25 MB sınırını aşıyor.');
  yaz('bilinmeyen mesaj olduğu gibi', d.sunucuMesaji('baska bir hata')==='baska bir hata');
}
// ── 13. Plan sınırı 0 ise kaydet pasif ──
{
  const {d}=ortam();
  d.kota={adet:0,adet_limit:0,bayt:0,mb_limit:0}; d.kaydetDurumu();
  yaz('limit 0 iken kaydet pasif', d.oge('rkKaydetBtn').disabled===true);
  d.kota={adet:3,adet_limit:50,bayt:0,mb_limit:500}; d.kaydetDurumu();
  yaz('limit varken kaydet etkin', d.oge('rkKaydetBtn').disabled===false);
}

console.log(hata? `\n${hata} TEST BAŞARISIZ`:'\nTÜM TESTLER GEÇTİ');
process.exit(hata?1:0);
