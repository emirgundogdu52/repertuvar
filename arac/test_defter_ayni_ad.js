/* eserler.html "📒 Defterden ekle": ardışık kartlarda aynı ad = tek eser (2026-10-22, kullanıcı: "peşpeşe taradığım iki
 * sayfalık eseri iki eser olarak kabul etti ve kaydetti"). Çalıştır: node arac/test_defter_ayni_ad.js */
const fs=require('fs'), path=require('path');
let hata=0; const yaz=(a,ok,ek='')=>{console.log((ok?'GEÇTİ ':'KALDI ')+a+(ek?'  — '+ek:'')); if(!ok)hata++;};

const oku=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
function fonk(kaynak, ad){
  const m=kaynak.match(new RegExp('(?:async )?function '+ad+'\\('));
  if(!m) throw new Error('fonksiyon yok: '+ad);
  let i=kaynak.indexOf('{',m.index), d=0;
  for(let j=i;j<kaynak.length;j++){ if(kaynak[j]==='{')d++; else if(kaynak[j]==='}'){ d--; if(!d) return kaynak.slice(m.index,j+1); } }
}
const es=oku('eserler.html'), au=oku('auth.js');
const trFold=au.match(/const _TR_FOLD = \{[\s\S]*?\};/)[0];
const kod=[trFold, fonk(au,'trNorm'), ...['_defterAyniEser','_defterOkunanBirlestir','defterAyniAdBirlestir','defterAdDegisti','defterKaydet'].map(a=>fonk(es,a))].join('\n');

function ortam(kartlar){
  const olan={ olusan:[], yuklenen:[], kaydedilen:[], durum:'' };
  const g={ _defter:kartlar, _defterKaydediliyor:false, DATA:[], olan };
  Object.assign(g,{
    _esCev:(k,t)=>t, defterCiz:()=>{}, defterDurum:t=>{olan.durum=t;}, confirm:()=>false, defterDuzenleyebilir:()=>true,
    defterEserOlustur:async ad=>{ olan.olusan.push(ad); return 100+olan.olusan.length; },
    notaGorselKucult:async f=>f, _notaUploadToStorage:async(id,f)=>{ olan.yuklenen.push(id+':'+f); return 'u/'+id+'/'+f; },
    currentNotaPages:async()=>[], saveNotaPages:async(id,s)=>{ olan.kaydedilen.push([id,s]); },
    URL:{revokeObjectURL(){}}, buildFilters(){}, applyFilters(){}, toastMsg(){}, setDraftOnly(){}, selectWork(){}, switchDetailTab(){},
    document:{ getElementById:()=>null },
  });
  const f=new Function(...Object.keys(g), kod+'; return { birlestir:defterAyniAdBirlestir, kaydet:defterKaydet, degisti:defterAdDegisti, kartlar:()=>_defter };');
  return { ...f(...Object.values(g)), olan };
}
const kart=(ad,...sayfalar)=>({ ad, sayfalar:sayfalar.map(d=>({dosya:d, url:'blob:'+d})) });

(async()=>{
  { // telefonda olan: iki taranmış sayfa, ikisine de aynı ad → tek eser, iki sayfa
    const o=ortam([kart('Benden Selam Olsun','s1'), kart('Benden Selam Olsun','s2')]);
    await o.kaydet();
    yaz('aynı adlı iki kart tek eser olarak kaydedildi', o.olan.olusan.length===1 && o.olan.olusan[0]==='Benden Selam Olsun', o.olan.olusan.join(' | '));
    yaz('iki sayfa aynı esere, sırayla', JSON.stringify(o.olan.kaydedilen)==='[[101,["u/101/s1","u/101/s2"]]]', JSON.stringify(o.olan.kaydedilen));
  }
  { const o=ortam([kart('Benden Selam Olsun','a'), kart('  benden SELAM olsun ','b'), kart('BENDEN SELÂM OLSUN','c')]);
    o.birlestir();
    yaz('büyük/küçük harf, boşluk ve şapka farkı aynı sayılır', o.kartlar().length===1 && o.kartlar()[0].sayfalar.map(s=>s.dosya).join()==='a,b,c'); }
  { const o=ortam([kart('Hastane','a'), kart('Sabahın Seherinde','b'), kart('Hastane','c')]);
    o.birlestir();
    yaz('ardışık olmayan aynı ad birleşmez', o.kartlar().length===3); }
  { const o=ortam([kart('','a'), kart('','b')]);
    o.birlestir();
    yaz('boş adlar birleşmez', o.kartlar().length===2); }
  { const k1={...kart('X','a'), eser:5}, k2={...kart('X','b'), eser:6};
    const o=ortam([k1,k2]); o.birlestir();
    yaz('farklı mevcut eserlere bağlı kartlar birleşmez', o.kartlar().length===2); }
  { const k1={...kart('X','a'), eser:5}, k2=kart('x','b');
    const o=ortam([k1,k2]); o.birlestir();
    yaz('bağlı kart + aynı adlı bağsız kart → bağlı esere tek kart', o.kartlar().length===1 && o.kartlar()[0].eser===5); }
  { const k1={...kart('X','a'), id:9}, k2=kart('X','b');
    const o=ortam([k1,k2]); o.birlestir();
    yaz('kaydı yarıda kalmış kart (id) birleşmez', o.kartlar().length===2); }
  { const o=ortam([kart('A','1'), kart('B','2'), kart('B','3'), kart('C','4')]);
    o.degisti();
    yaz('ad değişince anında birleşir, kullanıcıya söylenir', o.kartlar().map(k=>k.ad+':'+k.sayfalar.length).join()==='A:1,B:2,C:1' && o.olan.durum.includes('tek eser')); }
  { const o=ortam([kart('A','1'), kart('B','2')]);
    await o.kaydet();
    yaz('farklı adlar yine ayrı eser', o.olan.olusan.join()==='A,B'); }
  console.log(hata?`\n${hata} test KALDI`:'\nHepsi geçti'); process.exit(hata?1:0);
})();
