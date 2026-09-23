/* metronom.js — modülün iki sayfada da kurulabilmesi, kilit kancaları */
const fs=require('fs'), path=require('path');
const KOK=process.env.KOK||path.join(__dirname,'..');
let hata=0; const yaz=(a,ok,ek='')=>{console.log((ok?'GEÇTİ ':'KALDI ')+a+(ek?'  — '+ek:'')); if(!ok)hata++;};

// Sahte DOM
const ogeler={}; const yaratilan=[];
function yeniOge(id){ return {id,style:{},hidden:false,disabled:false,value:'',textContent:'',_html:'',
  get innerHTML(){return this._html}, set innerHTML(v){this._html=v;
    for (const m of v.matchAll(/id="([^"]+)"/g)) ogeler[m[1]]=ogeler[m[1]]||yeniOge(m[1]); },
  classList:{_s:new Set(),add(x){this._s.add(x)},remove(x){this._s.delete(x)},toggle(x,v){v?this._s.add(x):this._s.delete(x)},contains(x){return this._s.has(x)}},
  addEventListener(){}, appendChild(){}, querySelector:()=>null, querySelectorAll:()=>[], setAttribute(){}, removeAttribute(){}, focus(){}, getAttribute:()=>null,
  getBoundingClientRect:()=>({left:0,width:100,top:0,height:100})}; }
function oge(id){ return ogeler[id] || (ogeler[id]=yeniOge(id)); }
// getElementById var olmayan kimlikte NULL dönmeli (gerçek DOM gibi);
// aksi halde "stil zaten var mı" kontrolü hep doğru çıkıyor.
function bul(id){ return ogeler[id] || null; }
global.document={ getElementById:bul, createElement:(t)=>{const e=yeniOge('yeni-'+t); e.tag=t; yaratilan.push(e); return e;},
  head:{appendChild(e){ yaratilan.push(e); }}, body:{}, addEventListener(){}, querySelectorAll:()=>[], querySelector:()=>null,
  visibilityState:'visible' };
global.window={ addEventListener(){}, matchMedia:()=>({matches:false,addEventListener(){}}) };
global.navigator={ wakeLock:null };
global.localStorage={ getItem:()=>null, setItem(){}, removeItem(){} };
global.requestAnimationFrame=()=>{}; global.cancelAnimationFrame=()=>{};
let sesAcilir=true;
global.Ses={ hazirla:async()=>({ok:sesAcilir}), sesSeviyesi:(v)=>v, seviye:()=>0.85, calisiyorMu:()=>true, destekVar:()=>true, ctx:()=>({currentTime:0,createOscillator:()=>({connect(){},start(){},stop(){},frequency:{setValueAtTime(){}},type:''}),
  createGain:()=>({connect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){},value:1}})}), cikis:()=>({}) };
global.Zamanlayici=require(path.join(KOK,'zamanlayici.js')) || window.Zamanlayici;
eval(fs.readFileSync(path.join(KOK,'zamanlayici.js'),'utf8')); global.Zamanlayici=window.Zamanlayici;
eval(fs.readFileSync(path.join(KOK,'metronom.js'),'utf8'));
const M=window.Metronom;

yaz('modül yüklendi', typeof M.kur==='function' && M.kurulduMu()===false);
let izinVerildi=true, durumlar=[];
const kap=oge('kap');   // kapsayıcı elle yaratılır
const m=M.kur(kap, { izin:()=>izinVerildi, durum:(c)=>durumlar.push(c) });
yaz('kurulum arayüzü yazdı', kap.innerHTML.length>3000 && /mx-stage/.test(kap.innerHTML));
yaz('stil bir kez enjekte edildi', new Set(yaratilan.filter(e=>e.id==='metronom-stil')).size===1);
yaz('ikinci kur() aynı örneği döndürüyor', M.kur(kap,{})===m && M.kurulduMu()===true);
yaz('başlangıçta çalmıyor', m.calisiyorMu()===false);

(async()=>{
  // izin verilmezse başlamaz
  izinVerildi=false;
  await oge('play') && null;
  const kaynak=fs.readFileSync(path.join(KOK,'metronom.js'),'utf8');
  yaz('izin kancası start() içinde', /AYAR\.izin && !AYAR\.izin\(\)/.test(kaynak));
  yaz('durum kancası başlat/durdurda', (kaynak.match(/AYAR\.durum\(/g)||[]).length===2);
  yaz('arayüz ve motor tek dosyada', kaynak.includes('mx-stage') && kaynak.includes('function start()'));
  yaz('kendi AudioContext\'ini açmıyor', !/new\s+\(?\s*window\.AudioContext/.test(kaynak) && kaynak.includes('Ses.hazirla'));
  // metronom.html artık ince kabuk
  const kabuk=fs.readFileSync(path.join(KOK,'metronom.html'),'utf8');
  yaz('metronom.html kabuğa indi', kabuk.length<9000 && kabuk.includes("Metronom.kur(document.getElementById('metronomKap')"));
  yaz('kabukta stil ve kopya kod yok', !kabuk.includes('<style>') && !kabuk.includes('function start()'));
  yaz('kabuk metronom.js ve zamanlayici.js yüklüyor', kabuk.includes('metronom.js') && kabuk.includes('zamanlayici.js'));
  // Çalışma Odası
  const cal=fs.readFileSync(path.join(KOK,'calisma.html'),'utf8');
  yaz('Çalışma Odası üçüncü sekmeyi taşıyor', cal.includes("sekmeAc('metronom')") && cal.includes('id="bolumMetronom"'));
  yaz('metronom tembel kuruluyor', /ad === 'metronom' && !rbMetronom/.test(cal));
  yaz('kilit metronomu sayıyor', /rbMetronom && rbMetronom\.calisiyorMu\(\)/.test(cal));
  yaz('kayıt çalarken metronom engelleniyor', /izin: \(\) => \{\s*if \(!oyCaliyor\) return true;/.test(cal));
  yaz('Çalışma Odası metronom.js yüklüyor', cal.includes('<script src="metronom.js">'));
  console.log(hata?`\n${hata} TEST BAŞARISIZ`:'\nTÜM TESTLER GEÇTİ'); process.exit(hata?1:0);
})();
