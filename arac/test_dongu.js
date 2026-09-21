/* dongu.js testleri — sentetik "klavye ritmi" üretip keserek */
const D = require(require('path').join(__dirname,'..','dongu.js'));
let hata=0; const yaz=(a,ok,ek='')=>{console.log((ok?'GEÇTİ ':'KALDI ')+a+(ek?'  — '+ek:'')); if(!ok)hata++;};
const sr=44100;

// Sentetik kayıt: 100 BPM, 4/4, baştan 0.37 sn oda gürültüsü, sonra davul vuruşları
function kayitUret(tempo, sureSn, basGecikme, gurultu=0.004){
  const n=Math.round(sureSn*sr), L=new Float32Array(n), R=new Float32Array(n);
  let tohum=1; const rnd=()=>((tohum=(tohum*16807)%2147483647)/2147483647)*2-1;
  for(let i=0;i<n;i++){ L[i]=rnd()*gurultu; R[i]=rnd()*gurultu; }
  const birim=60/tempo;
  const vuruslar=[];
  for(let t=basGecikme; t<sureSn-0.5; t+=birim){
    vuruslar.push(t);
    const i0=Math.round(t*sr), bas=vuruslar.length%4===1;
    for(let j=0;j<sr*0.25 && i0+j<n;j++){
      const z=Math.exp(-j/sr*(bas?18:40));
      const s=Math.sin(2*Math.PI*(bas?90:420)*j/sr)*z*(bas?0.8:0.45);
      L[i0+j]+=s; R[i0+j]+=s*0.9;
    }
  }
  return {kanallar:[L,R], vuruslar};
}

// 1. döngü süresi
yaz('süre: 100 BPM, 4/4, 8 ölçü = 19,2 sn', Math.abs(D.donguSuresi(100,4,8)-19.2)<1e-9);
yaz('süre: 120 BPM, 9/8, 16 ölçü = 72 sn', Math.abs(D.donguSuresi(120,9,16)-72)<1e-9);
yaz('süre: geçersiz girdi 0 döner', D.donguSuresi(0,4,8)===0);

// 2. atak bulma — tıklama vuruştan 60 ms önce ve 80 ms sonra
const {kanallar, vuruslar}=kayitUret(100, 30, 0.37);
const hedef=vuruslar[4];                       // 5. vuruş
for (const kayma of [-0.06, -0.02, 0, 0.03, 0.08]) {
  const bulunan=D.atakBul(kanallar, sr, hedef+kayma);
  const hataMs=(bulunan-hedef)*1000;
  yaz(`atak: tıklama ${(kayma*1000).toFixed(0)} ms kaymış`, Math.abs(hataMs)<1.5, `bulunan ${hataMs.toFixed(2)} ms sapmayla`);
}
// gürültü içinde (vuruş yok) tıklama → tıklanan nokta döner ya da gerçek vuruşa gider, saçmalamaz
const bos=D.atakBul(kanallar, sr, 0.15);
yaz('atak: vuruşsuz bölgede makul sonuç', bos>=0 && bos<=0.45, `${bos.toFixed(3)} sn`);

// 3. kesme — uzunluk ve dikiş
const bas=D.atakBul(kanallar, sr, hedef);
const sure=D.donguSuresi(100,4,4);            // 4 ölçü = 9.6 sn
const dongu=D.donguKes(kanallar, sr, bas, sure);
yaz('kesme: uzunluk tam', dongu[0].length===Math.round(sure*sr), `${dongu[0].length} örnek`);
yaz('kesme: stereo korunuyor', dongu.length===2);
// döngü başı atağın 2 ms önünde mi
const g=D.genlik(dongu);
let ilkAtak=0; const tepe=Math.max(...g.slice(0,sr*0.05)); for(let i=0;i<g.length;i++){ if(g[i]>=tepe*0.1){ilkAtak=i;break;} }
yaz('kesme: atak dosya başından ~2 ms sonra', Math.abs(ilkAtak/sr*1000-2)<1.5, `${(ilkAtak/sr*1000).toFixed(2)} ms`);

// dikiş: çapraz geçişli ve geçişsiz karşılaştır
// Dikiş sorunu asıl SÜREKLİ sesle ortaya çıkar (klavye ritimlerindeki bas,
// akor, pad). Kayda kesintisiz bir ton ekleyip gerçekten ham kesimle
// (hiçbir işlem yok) çapraz geçişli kesimi karşılaştırıyoruz.
const padli=kanallar.map(ch=>{ const d=new Float32Array(ch); for(let i=0;i<d.length;i++) d[i]+=0.3*Math.sin(2*Math.PI*146.83*i/sr); return d; });
const basP=D.atakBul(padli, sr, hedef);
const gecisli=D.donguKes(padli, sr, basP, sure);
const b0=Math.round(basP*sr)-Math.round(0.002*sr), L=Math.round(sure*sr);
const hamKes=padli.map(ch=>ch.slice(b0, b0+L));                 // gerçekten ham
const dikisli=D.dikisSicramasi(gecisli), ham=D.dikisSicramasi(hamKes);
yaz('dikiş: sürekli seste ham kesim sıçrama yapıyor', ham>3, ham.toFixed(2));
yaz('dikiş: çapraz geçiş sıçramayı ortadan kaldırıyor', dikisli<ham/3 && dikisli<2, `geçişli ${dikisli.toFixed(2)} / ham ${ham.toFixed(2)}`);
yaz('dikiş: sade vuruşlarda da temiz', D.dikisSicramasi(dongu)<3, D.dikisSicramasi(dongu).toFixed(2));

// döngü tekrar edince vuruşlar ızgarada mı: iki tur birleştirip atak aralıklarını ölç
const iki=new Float32Array(dongu[0].length*2); iki.set(dongu[0]); iki.set(dongu[0], dongu[0].length);
const birim=60/100;
let kaymaMax=0;
for(let k=0;k<8;k++){
  const t=0.002+k*birim;                      // ilk 8 vuruş, ikinci tura taşmadan
  const b=D.atakBul([iki], sr, t, 0.05);
  kaymaMax=Math.max(kaymaMax, Math.abs(b-t));
}
// tur sınırındaki vuruş: ikinci turun ilk vuruşu tam sure'de olmalı
const sinir=D.atakBul([iki], sr, sure+0.002, 0.05);
yaz('döngü: tur sınırında vuruş tam zamanında', Math.abs(sinir-(sure+0.002))*1000<1.5,
    `${((sinir-(sure+0.002))*1000).toFixed(2)} ms`);

// 4. sınır durumları
let firladi=false; try{ D.donguKes(kanallar, sr, 28, 9.6); }catch(e){ firladi=true; }
yaz('kesme: kaydın sonunu aşan döngü reddediliyor', firladi);
const basta=D.donguKes(kanallar, sr, 0, 2);   // başlangıçtan önce ses yok → fade-out yolu
yaz('kesme: kayıt başında kesince çökmüyor', basta[0].length===2*sr);

// 5. WAV
const wav=D.wavKodla(dongu, sr);
const v=new DataView(wav);
const s=(o,n)=>String.fromCharCode(...new Uint8Array(wav,o,n));
yaz('wav: başlık RIFF/WAVE', s(0,4)==='RIFF' && s(8,4)==='WAVE');
yaz('wav: 2 kanal, 44100 Hz, 16 bit', v.getUint16(22,true)===2 && v.getUint32(24,true)===44100 && v.getUint16(34,true)===16);
yaz('wav: boyut doğru', wav.byteLength===44+dongu[0].length*2*2, `${(wav.byteLength/1048576).toFixed(2)} MB`);
// geri oku, ilk örnekler eşleşiyor mu
const ilk=v.getInt16(44,true)/0x7fff;
yaz('wav: örnek değeri korunuyor', Math.abs(ilk-dongu[0][0])<1/16000);

// 6. dalga formu
const t=D.tepeler(kanallar[0], 0, kanallar[0].length, 800);
yaz('tepeler: 800 sütun', t.mn.length===800 && t.mx.length===800);
yaz('tepeler: min ≤ max', Array.from(t.mn).every((x,i)=>x<=t.mx[i]));

console.log(hata? `\n${hata} TEST BAŞARISIZ`:'\nTÜM TESTLER GEÇTİ');
process.exit(hata?1:0);
