/* germe(): gerçek soundtouch.js ile — uzunluk, vuruş zamanlaması, dikiş */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs';
const require = createRequire(import.meta.url);
const KOK = process.env.KOK || path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// soundtouch.js bir ES modülü ama uzantısı .js — Node için geçici .mjs kopyası
const mjs = path.join(process.env.TMPDIR || '/tmp', 'soundtouch_test.mjs');
fs.copyFileSync(path.join(KOK, 'soundtouch.js'), mjs);
const ST = await import(pathToFileURL(mjs).href);
const D = require(path.join(KOK, 'dongu.js'));
const RC = require(path.join(KOK, 'ritimcalar.js'));
let hata=0; const yaz=(a,ok,ek='')=>{console.log((ok?'GEÇTİ ':'KALDI ')+a+(ek?'  — '+ek:'')); if(!ok)hata++;};
const sr=44100, ONPAY=0.002;   // gerçek döngülerde atak başlangıçtan 2 ms sonra

// 2/4, 85 BPM, 3 ölçü = 6 vuruş. basli: klavye ritmi gibi sürekli bas tonu
function dongu(basli, tempo=85, vurus=6){
  const birim=60/tempo, L=Math.round(vurus*birim*sr);
  const Lk=new Float32Array(L), Rk=new Float32Array(L);
  if (basli) for(let i=0;i<L;i++){ const b=0.18*Math.sin(2*Math.PI*110*i/sr); Lk[i]=b; Rk[i]=b; }
  for(let k=0;k<vurus;k++){ const i0=Math.round((ONPAY+k*birim)*sr);
    for(let j=0;j<sr*0.12 && i0+j<L;j++){ const z=Math.exp(-j/sr*40)*Math.sin(2*Math.PI*900*j/sr)*0.6; Lk[i0+j]+=z; Rk[i0+j]+=z; } }
  return {k:[Lk,Rk], L};
}
// Örnek hassasiyetinde atak: beklenen noktanın ±40 ms'sinde tepenin %30'unu ilk aşan örnek
function atak(x, t){ const a=Math.max(0,Math.round((t-0.04)*sr)), b=Math.min(x.length,Math.round((t+0.04)*sr));
  let tepe=0; for(let i=a;i<b;i++) tepe=Math.max(tepe,Math.abs(x[i]));
  for(let i=a;i<b;i++) if(Math.abs(x[i])>=tepe*0.3) return i/sr; return t; }

const temiz=dongu(false), basli=dongu(true);

{
  const g=RC.germe(basli.k, sr, 1, 0, ST, D);
  yaz('oran 1, ton 0: dokunulmuyor', g[0].length===basli.L && g[0][1234]===basli.k[0][1234]);
}
for (const hedef of [95, 76, 110]) {
  const oran=hedef/85, hedefL=Math.round(temiz.L/oran);
  const t0=performance.now();
  const g=RC.germe(temiz.k, sr, oran, 0, ST, D);
  const ms=performance.now()-t0;
  yaz(`${hedef} BPM: uzunluk tam`, g[0].length===hedefL, `${hedefL} örnek, ${ms.toFixed(0)} ms işlem`);
  // İki tur arka arkaya: 12 vuruşun zamanlaması (tur sınırı dahil)
  const iki=new Float32Array(hedefL*2); iki.set(g[0]); iki.set(g[0], hedefL);
  const b=60/hedef, bul=[];
  for(let k=0;k<12;k++) bul.push(atak(iki, ONPAY/oran + k*b));
  const ilk=bul[0];
  const sapma=bul.map((x,k)=>Math.abs((x-ilk)-k*b)*1000);
  yaz(`${hedef} BPM: 12 vuruş ızgarada (tur sınırı dahil)`, Math.max(...sapma)<5,
      `en büyük sapma ${Math.max(...sapma).toFixed(1)} ms`);
  yaz(`${hedef} BPM: ilk vuruş döngünün başında`, Math.abs(ilk - ONPAY/oran)*1000<5,
      `${(ilk*1000).toFixed(1)} ms (beklenen ${(ONPAY/oran*1000).toFixed(1)})`);
  const gb=RC.germe(basli.k, sr, oran, 0, ST, D);
  const s=D.dikisSicramasi(gb);
  yaz(`${hedef} BPM: bas tonlu döngüde dikiş temiz`, s<3, `sıçrama ${s.toFixed(2)}`);
}
{
  const g=RC.germe(basli.k, sr, 1, 3, ST, D);
  yaz('ton +3: süre aynı', g[0].length===basli.L);
  yaz('ton +3: dikiş temiz', D.dikisSicramasi(g)<3, D.dikisSicramasi(g).toFixed(2));
}
{
  const g=RC.germe([basli.k[0]], sr, 1.1, 0, ST, D);
  yaz('mono döngü tek kanal kalıyor', g.length===1 && g[0].length===Math.round(basli.L/1.1));
}
{ // 48 kHz dosya
  const sr48=48000, L=Math.round(6*60/85*sr48), k=new Float32Array(L);
  for(let v=0;v<6;v++){ const i0=Math.round((ONPAY+v*60/85)*sr48); for(let j=0;j<sr48*0.1&&i0+j<L;j++) k[i0+j]=Math.exp(-j/sr48*40)*Math.sin(2*Math.PI*900*j/sr48)*0.6; }
  const g=RC.germe([k,k], sr48, 95/85, 0, ST, D);
  yaz('48 kHz döngü: uzunluk tam', g[0].length===Math.round(L/(95/85)));
}
console.log(hata?`\n${hata} TEST BAŞARISIZ`:'\nTÜM TESTLER GEÇTİ'); process.exit(hata?1:0);
