/* calisma.html — ritim bankası arayüzü: banka, eser seçimi, bağlama, çalma, tempo, silme */
import { createRequire } from 'module';
import path from 'path'; import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
const require = createRequire(import.meta.url);
const KOK = process.env.KOK || path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const mjs = path.join(process.env.TMPDIR || '/tmp', 'soundtouch_test3.mjs');
fs.copyFileSync(path.join(KOK, 'soundtouch.js'), mjs);
const STmod = await import(pathToFileURL(mjs).href);
let hata=0; const yaz=(a,ok,ek='')=>{console.log((ok?'GEÇTİ ':'KALDI ')+a+(ek?'  — '+ek:'')); if(!ok)hata++;};
const sr=44100;

// ── Sahte DOM ──
const ogeler={};
function oge(id){ if(!ogeler[id]) ogeler[id]={id,style:{},hidden:false,disabled:false,value:'',textContent:'',_html:'',
  get innerHTML(){return this._html}, set innerHTML(v){this._html=v},
  classList:{_s:new Set(),add(x){this._s.add(x)},remove(x){this._s.delete(x)},toggle(x,v){v?this._s.add(x):this._s.delete(x)},contains(x){return this._s.has(x)}},
  addEventListener(){}, querySelector:()=>({className:''})}; return ogeler[id]; }
let gorunurlukDinleyici=null;
global.document={getElementById:oge, querySelector:()=>({className:''}), visibilityState:'visible', addEventListener(t,f){ if(t==='visibilitychange') gorunurlukDinleyici=f; }};
global.window={}; global.location={search:'',href:''};
global.confirm=()=>true; global.alert=()=>{};
global.SUPA_URL='https://s'; global.SUPA_KEY='k';
global.localStorage={getItem:k=>k==='sb_token'?'tok':null};
global.getUserId=()=>'u-ben'; global.getToken=()=>'tok';
global._caCev=(k,tr)=>tr; global.oyCaliyor=false; global.ESERLER=[{id:42,name:'Ağır Kaşıklı'},{id:43,name:'Halay'}];
global.authHeaders=()=>({apikey:'k',Authorization:'Bearer tok','Content-Type':'application/json'});
global.uid=()=>'u-ben';
global.Dongu=require(path.join(KOK,'dongu.js'));
global.RitimCalar=require(path.join(KOK,'ritimcalar.js'));
global._ST=STmod;

// ── Sahte ses ──
const ritimSesi=(tempo,olcu,zaman)=>{ const L=Math.round(olcu*zaman*60/tempo*sr), k=new Float32Array(L);
  for(let v=0;v<olcu*zaman;v++){const i0=Math.round((0.002+v*60/tempo)*sr); for(let j=0;j<3000&&i0+j<L;j++) k[i0+j]=Math.exp(-j/900)*0.5;} return k; };
const SESLER={'u-ben/a.wav':ritimSesi(85,3,2),'u-ben/b.wav':ritimSesi(90,2,2),'u-diger/c.wav':ritimSesi(100,4,4)};
const baslayanlar=[];
const ctx={ t:5, state:'running', get currentTime(){return this.t;},
  createBuffer:(c,n,r)=>{ const ch=[...Array(c)].map(()=>new Float32Array(n)); return {numberOfChannels:c,length:n,sampleRate:r,duration:n/r,getChannelData:i=>ch[i]}; },
  createBufferSource(){ const s={buffer:null,loop:false,connect(){},disconnect(){},start(t,o){s._bas=t;baslayanlar.push(s);},stop(t){s._son=t==null?0:t;}}; return s; },
  createGain(){ return {gain:{value:1},connect(){}}; },
  decodeAudioData(ab,ok){ const k=SESLER[ab._yol]; ok({numberOfChannels:2,sampleRate:sr,duration:k.length/sr,getChannelData:()=>k}); return null; } };
global.Ses={ hazirla:async()=>({ok:true}), ctx:()=>ctx, cikis:()=>({}) };
global.window.Ses=global.Ses;   // tarayıcıda ses.js window.Ses tanımlıyor

// ── Sahte sunucu ──
const istekler=[];
let RITIMLER=[
  {id:'a',ad:'Ağır kaşıklı',owner_id:'u-ben',group_id:'g1',zaman_sayisi:2,olcu_sayisi:3,tempo:85,sure_sn:4.235,path:'u-ben/a.wav'},
  {id:'b',ad:'Kaşıklı varyasyon',owner_id:'u-ben',group_id:null,zaman_sayisi:2,olcu_sayisi:2,tempo:90,sure_sn:2.667,path:'u-ben/b.wav'},
  {id:'c',ad:'Grubun ritmi',owner_id:'u-diger',group_id:'g1',zaman_sayisi:4,olcu_sayisi:4,tempo:100,sure_sn:9.6,path:'u-diger/c.wav'}];
let BAGLAR=[{id:'l1',owner_id:'u-ben',group_id:'g1',work_id:42,ritim_id:'a',sira:0,hedef_tempo:85,ton_kaymasi:0}];
global.fetch=async(url,opt={})=>{
  const m=opt.method||'GET'; istekler.push({url,m,body:opt.body});
  const tamam=(v)=>({ok:true,status:200,json:async()=>v,text:async()=>JSON.stringify(v),arrayBuffer:async()=>v});
  if(url.includes('/rest/v1/ritimler?select')) return tamam(RITIMLER);
  if(url.includes('/rpc/ritim_kullanim')) return tamam({adet:2,adet_limit:50,bayt:1200000,mb_limit:500});
  if(url.includes('/rest/v1/eser_ritimleri?work_id=eq.42&select')) return tamam(BAGLAR.filter(b=>b.work_id===42));
  if(url.includes('/rest/v1/eser_ritimleri?work_id=eq.43&select')) return tamam([]);
  if(url.endsWith('/rest/v1/eser_ritimleri') && m==='POST'){ const b=JSON.parse(opt.body); BAGLAR.push({id:'l'+(BAGLAR.length+1),...b}); return tamam(null); }
  if(url.includes('/rest/v1/eser_ritimleri?id=eq.') && m==='DELETE'){ const id=url.split('eq.')[1]; BAGLAR=BAGLAR.filter(b=>b.id!==id); return tamam(null); }
  if(url.includes('/rest/v1/eser_ritimleri?id=eq.') && m==='PATCH'){ const id=url.split('eq.')[1]; Object.assign(BAGLAR.find(b=>b.id===id),JSON.parse(opt.body)); return tamam(null); }
  if(url.includes('/rest/v1/eser_ritimleri?work_id=eq.') && m==='PATCH') return tamam(null);
  if(url.includes('/rest/v1/ritimler?id=eq.') && m==='DELETE'){ const id=url.split('eq.')[1]; RITIMLER=RITIMLER.filter(r=>r.id!==id); BAGLAR=BAGLAR.filter(b=>b.ritim_id!==id); return tamam(null); }
  if(url.includes('/object/sign/ritim-loops/')) return tamam({signedURL:'/object/sign/'+url.split('ritim-loops/')[1]});
  if(url.includes('/storage/v1/object/sign/')){ const yol=url.split('/object/sign/')[1]; return tamam({_yol:yol}); }
  if(url.includes('/storage/v1/object/ritim-loops/') && m==='DELETE') return tamam(null);
  return {ok:false,status:404,text:async()=>'yok',json:async()=>({})};
};

// ── Sayfa kodunu yükle ──
const html=fs.readFileSync(path.join(KOK,'calisma.html'),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const bolum=js.slice(js.indexOf('// ── RİTİM BANKASI'));
eval(bolum.replace(/let rtCaliyor/,'var rtCaliyor')+`
;global.__r={ sekmeAc, rbEserFiltre, rbEserSec, rbBagla, rbCalDurdur, rbDurdur, rbSonraki, rbOnceki, rbGit,
  rbTempoKaydir, rbTonKaydir, rbOnizle, rbRitimSil, rbBagKaldir, rbSiraDegistir, rbEserKapat, rtKilitYenile,
  get calar(){return rbCalar}, get bagli(){return rbBagli}, get tempo(){return rbTempo}, get ton(){return rbTon},
  get onizleme(){return rbOnizleme}, get caliyor(){return rtCaliyor} };`);
const r=global.__r;
const bekle=ms=>new Promise(z=>setTimeout(z,ms));

// 1. Sekme açılınca banka
r.sekmeAc('ritim'); await bekle(10);
yaz('bankada 3 ritim', (oge('rbBanka').innerHTML.match(/rb-satir/g)||[]).length===3);
yaz('kota gösteriliyor', oge('rbKota').textContent.startsWith('2 / 50'), oge('rbKota').textContent);
yaz('başkasının ritminde sil düğmesi yok', !/rbRitimSil\('c'\)/.test(oge('rbBanka').innerHTML));
yaz('eser seçilmeden "Esere ekle" yok', !/rbBagla/.test(oge('rbBanka').innerHTML));

// 2. Eser ara ve seç
oge('rbEserAra').value='kaşık'; r.rbEserFiltre();
yaz('arama eseri buluyor', /Ağır Kaşıklı/.test(oge('rbEserListe').innerHTML) && !/Halay/.test(oge('rbEserListe').innerHTML));
await r.rbEserSec('42');
yaz('panel açıldı', oge('rbEserPanel').hidden===false && oge('rbEserAd').textContent==='Ağır Kaşıklı');
yaz('bağlı 1 ritim', r.bagli.length===1 && r.bagli[0].ritim.id==='a');
yaz('tempo eserden: 85', r.tempo===85);
yaz('bağlı ritim bankada "Esere ekle" göstermiyor', !/rbBagla\('a'\)/.test(oge('rbBanka').innerHTML) && /rbBagla\('b'\)/.test(oge('rbBanka').innerHTML));

// 3. Bağla
await r.rbBagla('b');
const post=istekler.filter(x=>x.m==='POST' && x.url.endsWith('/eser_ritimleri')).pop();
const pb=JSON.parse(post.body);
yaz('bağlantı: work_id sayı, sıra 1, sahibi ben', pb.work_id===42 && pb.sira===1 && pb.owner_id==='u-ben');
yaz('bağlantı: eserin temposu taşındı', pb.hedef_tempo===85);
yaz('grupsuz ritim → grupsuz bağlantı', pb.group_id===null);
yaz('artık 2 bağlı ritim', r.bagli.length===2);
await r.rbBagla('c');
const pc=JSON.parse(istekler.filter(x=>x.m==='POST' && x.url.endsWith('/eser_ritimleri')).pop().body);
yaz('grupla paylaşılan ritim → bağlantı da grupta', pc.group_id==='g1');

// 4. Çal
await r.rbCalDurdur();
yaz('çalıyor', r.calar && r.calar.calisiyorMu() && r.caliyor===true);
yaz('çalarken kayıt düğmesi pasif', oge('oyOynatBtn').disabled===true);
yaz('şimdi çalan satırı işaretli', /rb-satir simdi/.test(oge('rbBagliListe').innerHTML));
yaz('döngüler eserin temposuna gerildi (hepsi 85)', r.calar.hedefTempo()===85);
const b2=r.calar.tampon(1);  // 90 BPM, 2 ölçü 2/4 → 85'e gerilince ölçü = 2*60/85
yaz('90 BPM ritim 85e uyarlandı', Math.abs(b2.duration/2 - 2*60/85)<0.002, (b2.duration/2).toFixed(4)+' sn/ölçü');

// 5. İleri
ctx.t+=1; r.rbSonraki();
yaz('ileri: sıra 2. ritimde', r.calar.sira()===1);
yaz('ekranda 2/3', /^2 \/ 3/.test(oge('rbSimdi').textContent), oge('rbSimdi').textContent);

// 6. Tempo — gecikmeli uygulanır ve kaydedilir
r.rbTempoKaydir(5); r.rbTempoKaydir(5);
yaz('tempo 95 gösteriliyor', oge('rbTempo').textContent==='95');
yaz('kayıt temposu notu', /kayıt: 85/.test(oge('rbTempoNot').textContent));
await bekle(450);
const patch=istekler.filter(x=>x.m==='PATCH' && x.url.includes('work_id=eq.42&owner_id=eq.u-ben')).pop();
yaz('tempo esere kaydedildi', patch && JSON.parse(patch.body).hedef_tempo===95);
yaz('çalar yeni tempoda', r.calar.hedefTempo()===95);
yaz('art arda iki basış tek kayıt', istekler.filter(x=>x.m==='PATCH' && x.url.includes('owner_id=eq.u-ben')).length===1);

// 7. Önizleme ana çaları durdurur
await r.rbOnizle('c');
yaz('önizleme başladı', r.onizleme && r.onizleme.id==='c');
yaz('ana çalar durdu', !r.calar.calisiyorMu());
await r.rbOnizle('c');
yaz('ikinci basış önizlemeyi durdurur', r.onizleme===null && r.caliyor===false);

// 8. Kayıt çalarken ritim başlamaz
global.oyCaliyor=true; r.rtKilitYenile();
await r.rbCalDurdur();
yaz('kayıt çalarken ritim başlamıyor', !r.calar.calisiyorMu());
yaz('açıklama gösteriliyor', oge('rbNot').hidden===false && /ses kaydını durdurun/.test(oge('rbNot').textContent));
global.oyCaliyor=false; r.rtKilitYenile();

// 9. Sıra değiştir
await r.rbSiraDegistir(1,-1);
yaz('sıra değişti: b başa geçti', r.bagli[0].ritim.id==='b' && r.bagli[1].ritim.id==='a', r.bagli.map(b=>b.ritim.id).join(','));

// 10. Bağlantıyı kaldır
await r.rbBagKaldir(2);
yaz('bağlantı kaldırıldı', r.bagli.length===2);

// 11. Ritmi bankadan sil: önce satır, sonra dosya
const once=istekler.length;
await r.rbRitimSil('b');
const son=istekler.slice(once);
const iSatir=son.findIndex(x=>x.m==='DELETE' && x.url.includes('/rest/v1/ritimler?id=eq.b'));
const iDosya=son.findIndex(x=>x.m==='DELETE' && x.url.includes('/storage/v1/object/ritim-loops/u-ben/b.wav'));
yaz('önce satır, sonra dosya siliniyor', iSatir>=0 && iDosya>iSatir);
yaz('silinen ritim eserden de kalktı', !r.bagli.some(b=>b.ritim.id==='b'));

// 12. Eser kapat
r.rbEserKapat();
yaz('eser kapatılınca panel gizli', oge('rbEserPanel').hidden===true);

// 13. iPad kilitlenip açılınca: ses açılamıyorsa çalar durur, düğme "Başlat"a döner
await r.rbEserSec('42');
await r.rbCalDurdur();
yaz('kilit öncesi çalıyor', r.calar.calisiyorMu());
ctx.state='suspended'; ctx.resume=()=>Promise.resolve();   // açılamıyor, askıda kalıyor
gorunurlukDinleyici(); await bekle(10);
yaz('kilit sonrası çalar durdu', !r.calar.calisiyorMu() && r.caliyor===false);
yaz('düğme "Başlat" gösteriyor', oge('rbCalMetin').textContent==='Başlat');
ctx.state='running';
await r.rbCalDurdur();
yaz('tek dokunuşla yeniden başlıyor', r.calar.calisiyorMu());
ctx.state='suspended'; ctx.resume=function(){ this.state='running'; return Promise.resolve(); };
gorunurlukDinleyici(); await bekle(10);
yaz('ses geri açılabiliyorsa kesilmiyor', r.calar.calisiyorMu());

console.log(hata?`\n${hata} TEST BAŞARISIZ`:'\nTÜM TESTLER GEÇTİ'); process.exit(hata?1:0);
