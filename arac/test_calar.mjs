/* RitimCalar: ölçü başında geçiş, üst üste basma, tempo değişimi, durdurma */
import { createRequire } from 'module';
import path from 'path'; import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
const require = createRequire(import.meta.url);
const KOK = process.env.KOK || path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const mjs = path.join(process.env.TMPDIR || '/tmp', 'soundtouch_test2.mjs');
fs.copyFileSync(path.join(KOK, 'soundtouch.js'), mjs);
const ST = await import(pathToFileURL(mjs).href);
const D = require(path.join(KOK, 'dongu.js'));
const RC = require(path.join(KOK, 'ritimcalar.js'));
let hata=0; const yaz=(a,ok,ek='')=>{console.log((ok?'GEÇTİ ':'KALDI ')+a+(ek?'  — '+ek:'')); if(!ok)hata++;};
const sr=44100;

// sahte AudioContext: kaynakların start/stop zamanlarını kaydeder
const olay=[];
const ctx={ t:10, get currentTime(){return this.t;},
  createBuffer:(c,n,r)=>{ const ch=[...Array(c)].map(()=>new Float32Array(n)); return {numberOfChannels:c,length:n,sampleRate:r,duration:n/r,getChannelData:i=>ch[i]}; },
  createBufferSource(){ const s={buffer:null,loop:false,connect(){},disconnect(){},
      start(t,o){ s._bas=t; s._ofs=o||0; olay.push({tur:'bas',t,s}); }, stop(t){ s._son=t; olay.push({tur:'son',t,s}); } }; return s; },
  createGain(){ return {gain:{value:1},connect(){}}; } };
const calar=RC.olustur({ ctx:()=>ctx, cikis:()=>({}), ST, Dongu:D });

// iki ritim: A 85 BPM 2/4 3 ölçü (4.235 sn), B 90 BPM 2/4 2 ölçü
const ritim=(tempo, olcu, zaman=2)=>{ const L=Math.round(olcu*zaman*60/tempo*sr); const k=new Float32Array(L);
  for(let v=0;v<olcu*zaman;v++){const i0=Math.round((0.002+v*60/tempo)*sr); for(let j=0;j<2000&&i0+j<L;j++) k[i0+j]=Math.exp(-j/800)*0.5;}
  return {id:'r'+tempo, ad:'R'+tempo, tempo, zaman_sayisi:zaman, olcu_sayisi:olcu, kanallar:[k,k], sr}; };
calar.yukle([ritim(85,3), ritim(90,2)]);
yaz('iki ritim yüklendi', calar.adet()===2);

// 1. başlat
calar.basla(0);
const A=calar._calan();
yaz('başladı, döngü açık', calar.calisiyorMu() && A.src.loop===true && Math.abs(A.src._bas-10.05)<1e-9);
yaz('kendi temposunda (85): döngü 4,235 sn', Math.abs(A.dongu-3*2*60/85)<0.001, A.dongu.toFixed(4));

// 2. ileri: bir sonraki ölçü başında geçiş
ctx.t = 10.05 + 1.0;                      // 1 sn sonra; ölçü = 1,4118 sn
calar.sonraki();
const B=calar._calan();
const olcuA=A.dongu/3, beklenen=10.05+Math.ceil((1.0+0.03)/olcuA)*olcuA;
yaz('ileri: yeni ritim ölçü başında başlıyor', Math.abs(B.src._bas-beklenen)<1e-9, `${B.src._bas.toFixed(4)} / ${beklenen.toFixed(4)}`);
yaz('eski ritim tam o anda duruyor', Math.abs(A.src._son-beklenen)<1e-9);
yaz('sıra 2. ritimde', calar.sira()===1);

// 3. üst üste basma: bekleyen iptal, yeniden planlanır
ctx.t = B.src._bas - 0.5;                 // geçiş gerçekleşmeden önce tekrar bas
calar.sonraki();                          // 2 ritim var: tekrar A'ya
const C=calar._calan();
yaz('bekleyen geçiş iptal edildi', B.src._son===0);
yaz('tekrar basınca sıra başa döndü', calar.sira()===0 && C.i===0);
yaz('aynı ölçü başı korundu', Math.abs(C.src._bas-beklenen)<1e-9);
// A kaldığı yerden devam: beklenen ofset = (geçiş anı − A başlangıcı) mod döngü
const ofBek=((beklenen-10.05)%A.dongu+A.dongu)%A.dongu;
yaz('duyulan ritme dönünce kaldığı yerden sürüyor', Math.abs(C.src._ofs-ofBek)<1e-9, `ofset ${C.src._ofs.toFixed(4)} sn`);
yaz('ölçü başı hesabı ofseti hesaba katıyor', Math.abs(C.baslangic-10.05)<1e-9);

// 4. tempo değişimi çalarken: yeni gerilmiş tampona ölçü başında geçer
ctx.t = C.src._bas + 2.0;
const onceki=calar._calan();
calar.ayarla(95, 0);
const Dd=calar._calan();
yaz('tempo 95: yeni tampon', Dd!==onceki && Math.abs(Dd.dongu - Math.round(ritim(85,3).kanallar[0].length/(95/85))/sr)<1e-6, Dd.dongu.toFixed(4));
yaz('tempo değişimi de ölçü başında', Math.abs(onceki.src._son - Dd.src._bas)<1e-9);
{ // tempo değişince döngünün başına dönmüyor: aynı ölçüden sürüyor
  const eskiOlcu=onceki.dongu/onceki.olcu;
  const k=((Math.round((Dd.src._bas-onceki.baslangic)/eskiOlcu))%onceki.olcu+onceki.olcu)%onceki.olcu;
  const yeniOlcu=Dd.dongu/Dd.olcu;
  yaz('tempo değişiminde ölçü konumu korunuyor', Math.abs(Dd.src._ofs - k*yeniOlcu)<1e-9, `${k+1}. ölçüden, ofset ${Dd.src._ofs.toFixed(4)} sn`);
}
yaz('hedef tempo hatırlanıyor', calar.hedefTempo()===95);
// iki ritim de aynı hedef tempoya gerildi mi: ölçü süresi = zaman*60/95
const olcuSuresi=i=>calar.tampon(i).duration/[3,2][i];
yaz('iki ritmin ölçüsü aynı sürede (95 BPM)', Math.abs(olcuSuresi(0)-2*60/95)<0.001 && Math.abs(olcuSuresi(1)-2*60/95)<0.001,
    `${olcuSuresi(0).toFixed(4)} / ${olcuSuresi(1).toFixed(4)} sn`);

// 5. durdur
calar.durdur();
yaz('durdur: çalmıyor', !calar.calisiyorMu());
yaz('durdur: kaynak durduruldu', Dd.src._son===0);

// 6. çalmıyorken ileri: yalnız sıra değişir
calar.sonraki();
yaz('çalmıyorken ileri yalnız sırayı değiştirir', !calar.calisiyorMu() && calar.sira()===1);
console.log(hata?`\n${hata} TEST BAŞARISIZ`:'\nTÜM TESTLER GEÇTİ'); process.exit(hata?1:0);
