/* eserler.html nota depo temizliği: saveNotaPages listeden çıkan sayfaların dosyasını depodan siler (2026-10-22) */
const fs=require('fs'), path=require('path');
let hata=0; const yaz=(a,ok,ek='')=>{console.log((ok?'GEÇTİ ':'KALDI ')+a+(ek?'  — '+ek:'')); if(!ok)hata++;};

const html=fs.readFileSync(path.join(__dirname,'..','eserler.html'),'utf8');
// Adı verilen fonksiyonun kaynağını süslü parantezleri sayarak çıkarır
function fonk(ad){
  const m=html.match(new RegExp('(?:async )?function '+ad+'\\('));
  if(!m) throw new Error('fonksiyon yok: '+ad);
  let i=html.indexOf('{',m.index), d=0;
  for(let j=i;j<html.length;j++){ if(html[j]==='{')d++; else if(html[j]==='}'){ d--; if(!d) return html.slice(m.index,j+1); } }
}
const kod=['notaPagesOf','notaPagesById','saveNotaPages','_notaDepodanSil','deleteNotaPage','deleteNota','moveNotaPage'].map(fonk).join('\n');

const P='https://x.supabase.co/storage/v1/object/public/notalar/';
function ortam(sayfalar, senaryo={}){
  const istekler=[];
  global.SUPA_URL='https://x.supabase.co'; global.SUPA_KEY='k';
  global.getToken=()=>'tok'; global.authHeaders=()=>({apikey:'k',Authorization:'Bearer tok'});
  global._esCev=(k,t)=>t; global.confirm=()=>true; global.alert=m=>istekler.push({uyari:m});
  global.selectWork=()=>{}; global.switchDetailTab=()=>{};
  global.DATA=[{id:5, notaPages:sayfalar.slice(), notaUrl:sayfalar[0]||''}];
  global.yazVeDogrula=async(url,method,body)=>{ istekler.push({url,method,body}); return senaryo.yazmaHata?{ok:false,hata:'yetki yok'}:{ok:true,rows:[{}]}; };
  global.fetch=async(url,opt={})=>{ istekler.push({url,method:opt.method||'GET',headers:opt.headers}); return {ok:true}; };
  eval(kod+';global.__f={saveNotaPages,deleteNotaPage,deleteNota,moveNotaPage};');
  return {istekler, ...global.__f};
}
const silinen=o=>o.istekler.filter(x=>x.method==='DELETE').map(x=>x.url.split('/object/notalar/')[1]);
const a=P+'works/5/nota_1_1.jpg', b=P+'works/5/nota_2_2.jpg', c=P+'works/5/nota_3_1.jpg';

(async()=>{
  { // döndür/kırp: b yerine c yazılır
    const o=ortam([a,b]);
    await o.saveNotaPages(5,[a,c]);
    yaz('döndür/kırp: eski dosya siliniyor', JSON.stringify(silinen(o))===JSON.stringify(['works/5/nota_2_2.jpg']), silinen(o).join(','));
    const iPatch=o.istekler.findIndex(x=>x.method==='PATCH'), iSil=o.istekler.findIndex(x=>x.method==='DELETE');
    yaz('silme, liste yazıldıktan SONRA', iPatch>-1 && iSil>iPatch);
    const h=o.istekler[iSil].headers;
    yaz('silme isteği oturum anahtarıyla', h.apikey==='k' && h.Authorization==='Bearer tok');
  }
  { // tek sayfa sil
    const o=ortam([a,b,c]);
    await o.deleteNotaPage(5,1);
    yaz('sayfa silme: yalnız o sayfanın dosyası', JSON.stringify(silinen(o))===JSON.stringify(['works/5/nota_2_2.jpg']), silinen(o).join(','));
  }
  { // notanın tamamını sil
    const o=ortam([a,b]);
    await o.deleteNota(5);
    yaz('tüm nota silme: iki dosya da', silinen(o).length===2);
  }
  { // sıra değiştirme / sona ekleme
    const o=ortam([a,b]);
    await o.moveNotaPage(5,0,1);
    await o.saveNotaPages(5,[b,a,c]);
    yaz('sıra değişimi ve ekleme hiçbir şey silmiyor', silinen(o).length===0);
  }
  { // sunucu yazmayı reddederse
    const o=ortam([a,b],{yazmaHata:true});
    let atti=false; try { await o.saveNotaPages(5,[a]); } catch(e) { atti=true; }
    yaz('yazma hatası çağırana iletiliyor', atti);
    yaz('liste yazılamazsa hiçbir dosya silinmiyor', silinen(o).length===0);
  }
  { // aynı sayfa iki kez: biri çıkınca dosya hâlâ listede
    const o=ortam([a,a,b]);
    await o.saveNotaPages(5,[a,b]);
    yaz('listede kalan adres silinmiyor', silinen(o).length===0);
  }
  { // başka eserin klasörü, en/, dış adres, yol oyunları
    const yabanci=[P+'works/6/nota_1.jpg', P+'en/amazing-grace.png', 'https://baska.site/works/5/x.jpg',
                   P+'works/5/../6/nota_1.jpg', P+'works/5/alt/x.jpg', P+'works/5/x.jpg?t=1', P+'works/50/x.jpg', null, 7];
    const o=ortam([a].concat(yabanci));
    await o.saveNotaPages(5,[a]);
    yaz('başka klasör / dış adres / yol oyunu silinmiyor', silinen(o).length===0, silinen(o).join(','));
  }
  console.log(hata?`\n${hata} test KALDI`:'\nHepsi geçti'); process.exit(hata?1:0);
})();
