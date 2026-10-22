/* eserler.html "📒 Defterden ekle" + yapay zekâ okuması (2026-10-22): sayfaları eserlere ayırma, okunanı kartta tutma,
 * kayıtta söz/akor/bilgileri esere yazma. Çalıştır: node arac/test_defter_yapay.js */
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
const kod=[
  au.match(/const _TR_FOLD = \{[\s\S]*?\};/)[0], fonk(au,'trNorm'),
  es.match(/const _defterOkuTempo = [^\n]*/)[0], es.match(/function _esHtml\(s\)\{[^\n]*\}/)[0],
  ...['_defterGrupla','_defterOkunanBirlestir','defterYapayOku','defterEserOlustur','defterKaydet','defterBirlestir',
      '_defterAyniEser','defterAyniAdBirlestir','defterOkunanHtml','defterPdfMi','defterTekrarGeriEkle','defterEkle'].map(a=>fonk(es,a)),
].join('\n');

function ortam({ rol='editor', kartlar=[], cevaplar=[] }={}){
  const olan={ istekler:[], kenarlar:[], kilitliIken:[], olusan:[], govdeler:[], durum:'', cizim:0 };
  const g={ _defter:kartlar, _defterKaydediliyor:false, _defterOkunuyor:0, DATA:[], DEFTER_OKU_EN_COK:6, olan };
  Object.assign(g,{
    _esCev:(k,t)=>t, isAdmin:()=>rol==='admin', isEditor:()=>rol==='admin'||rol==='editor', getUserId:()=>'u1', getUser:()=>({email:'e@x'}),
    defterCiz:()=>{olan.cizim++;}, defterDurum:t=>{olan.durum=t;}, confirm:()=>false, defterDuzenleyebilir:()=>true,
    _defterOkuHataMetni:e=>e.message,
    _defterOkuGorsel:async(f,k)=>{ olan.kenarlar.push(k); return 'B64-'+f.name; },
    notaGorselKucult:async f=>f, _notaUploadToStorage:async(id,f)=>'u/'+id+'/'+f.name, currentNotaPages:async()=>[], saveNotaPages:async()=>{},
    URL:{revokeObjectURL(){}, createObjectURL:f=>'blob:'+f.name}, buildFilters(){}, applyFilters(){}, toastMsg(){}, setDraftOnly(){}, selectWork(){}, switchDetailTab(){},
    document:{ getElementById:()=>null }, SUPA_URL:'https://x', authHeaders:()=>({}), mapWorkRow:x=>x,
    fetch:async(url,opt)=>{ olan.govdeler.push(JSON.parse(opt.body)); return { ok:true, json:async()=>[{ id:200+olan.govdeler.length }] }; },
  });
  // yanıt: dizi → istek sırasıyla; nesne → gönderilen ilk sayfaya göre (paralel istekler için)
  g._defterOkuIste=async(gorseller,dikkatli,mod)=>{ olan.istekler.push({gorseller,dikkatli,mod}); olan.kilitliIken.push(g_kilit());
    olan.yolda=(olan.yolda||0)+1; olan.enCokYolda=Math.max(olan.enCokYolda||0, olan.yolda);
    await new Promise(r=>setTimeout(r,5)); olan.yolda--;
    const c=Array.isArray(cevaplar)?cevaplar[olan.istekler.length-1]:cevaplar[gorseller[0]]; if(c instanceof Error) throw c; return c; };
  g._defterPdfSayfalari=async f=>{ olan.pdf=(olan.pdf||0)+1; return [1,2,3].map(i=>({ name:f.name.replace('.pdf','')+'-s'+i+'.jpg', type:'image/jpeg' })); };
  let g_kilit;
  const f=new Function(...Object.keys(g), kod+`; olan.__kilit=()=>_defterOkunuyor;
    return { ekle:defterEkle, grupla:_defterGrupla, yapayOku:defterYapayOku, olustur:defterEserOlustur, kaydet:defterKaydet, birlestir:defterBirlestir,
             html:defterOkunanHtml, geriEkle:defterTekrarGeriEkle, kartlar:()=>_defter, kilit:()=>_defterOkunuyor };`);
  const api=f(...Object.values(g));
  g_kilit=()=>olan.__kilit();
  return { ...api, olan };
}
const tekSayfa=ad=>({ ad:'', sayfalar:[{ dosya:{name:ad, type:'image/jpeg'}, url:'blob:'+ad }] });
const bos={yore:'',kaynak_kisi:'',derleyen:'',notaya_alan:'',repertuvar_no:'',makam:'',usul:'',sure:'',ton:'',soz_yazari:'',besteci:''};
const eser=(sayfalar,baslik,soz='',akorlu='',b={},tekrarlar=[])=>({ sayfalar, tekrarlar, baslik, soz, akorlu, bilgiler:{...bos,...b}, notlar:'' });

(async()=>{
  { // 6 sayfa → 3 eser (canlı denemedeki gibi)
    const kartlar=['h1','h2','h3','s1','s2','g'].map(tekSayfa);
    const o=ortam({ kartlar, cevaplar:[{ model:'claude-haiku-5-5', donuslar:[0,0,0,0,90,0], eserler:[
      eser([1,2,3],'Hastane Önünde İncir Ağacı','Hastane önünde incir ağacı','',{yore:'Yozgat',sure:'♩ = 50'}),
      eser([4,5],'Sabahın Seherinde','Sabahın seherinde'), eser([6],'Sunflower','but im a sunflower','[C]but im a [F]sunflower') ] }] });
    await o.yapayOku(0);
    const k=o.kartlar();
    yaz('tek parçada tek istek', o.olan.enCokYolda===1);
    yaz('6 sayfa tek istekte, defter kipiyle, 1600 px', o.olan.istekler.length===1 && o.olan.istekler[0].mod==='defter' && o.olan.istekler[0].gorseller.length===6 && o.olan.kenarlar.every(x=>x===1600));
    yaz('okuma sürerken kartlar kilitli, sonra açık', o.olan.kilitliIken[0]===1 && o.kilit()===0);
    yaz('3 esere ayrıldı, sayfalar sırayla', k.map(x=>x.sayfalar.map(s=>s.dosya.name).join('+')).join(' | ')==='h1+h2+h3 | s1+s2 | g');
    yaz('adlar başlıktan', k.map(x=>x.ad).join(' | ')==='Hastane Önünde İncir Ağacı | Sabahın Seherinde | Sunflower');
    yaz('okunan söz/akor kartta', k[2].okunan.akorlu==='[C]but im a [F]sunflower' && k[0].okunan.bilgiler.yore==='Yozgat');
    yaz('yatık sayfaya dönüş açısı', k[1].sayfalar[1].donus===90 && !k[0].sayfalar[0].donus);
    yaz('bitince bilgi verildi', o.olan.durum.includes('3 eser'));
    // kayıt: yeni eserlere söz/akor/bilgiler
    await o.kaydet();
    const g0=o.olan.govdeler[0], g2=o.olan.govdeler[2];
    yaz('kayıtta söz, yöre, metronom', g0.name==='Hastane Önünde İncir Ağacı' && g0.lyrics==='Hastane önünde incir ağacı' && g0.region==='Yozgat' && g0.metronom===50);
    yaz('kayıtta akorlar', g2.chords==='[C]but im a [F]sunflower' && g2.lyrics==='but im a sunflower');
    yaz('3 eser oluştu', o.olan.govdeler.length===3);
  }
  { // eksik gruplama → kartlara dokunulmaz
    const o=ortam({ kartlar:['a','b','c'].map(tekSayfa), cevaplar:[{ model:'m', donuslar:[], eserler:[eser([1,2],'X')] }] });
    await o.yapayOku(0);
    yaz('sayfası açıkta kalan gruplama uygulanmaz', o.kartlar().length===3 && !o.kartlar()[0].okunan);
  }
  { // 8 sayfa → 6 + 2; ikinci parçanın başlıksız ilk eseri öncekinin devamı
    const o=ortam({ kartlar:['1','2','3','4','5','6','7','8'].map(tekSayfa), cevaplar:{
      'B64-1':{ model:'m', donuslar:[], eserler:[eser([1,2],'A','a1'), eser([3,4,5,6],'B','b1')] },
      'B64-7':{ model:'m', donuslar:[], eserler:[eser([1],'','b2'), eser([2],'C','c1')] } } });
    await o.yapayOku(0);
    const k=o.kartlar();
    yaz('iki istek: 6 + 2 sayfa', o.olan.istekler.map(x=>x.gorseller.length).sort().join()==='2,6');
    yaz('iki istek aynı anda yolda (paralel)', o.olan.enCokYolda===2);
    yaz('başlıksız devam öncekine eklendi', k.map(x=>x.ad+':'+x.sayfalar.length).join()==='A:2,B:5,C:1' && k[1].okunan.soz==='b1\n\nb2');
  }
  { // yetki / atlananlar / hata
    const o=ortam({ rol:'user', kartlar:[tekSayfa('a')] });
    await o.yapayOku(0);
    yaz('yönetici/editör değilse okuma yok', o.olan.istekler.length===0);
    const pdf={ ad:'', sayfalar:[{ dosya:{name:'p.pdf', type:'application/pdf'}, url:'x' }] }, bagli={...tekSayfa('m'), eser:7};
    const o2=ortam({ kartlar:[pdf, bagli, tekSayfa('z')], cevaplar:[{ model:'m', donuslar:[], eserler:[eser([1],'Z','z')] }] });
    await o2.yapayOku(0);
    yaz('PDF ve mevcut esere bağlı kart okunmaz', o2.olan.istekler[0].gorseller.join()==='B64-z' && o2.kartlar().length===3 && o2.kartlar()[2].ad==='Z');
    const o3=ortam({ kartlar:[tekSayfa('a')], cevaplar:[new Error('ağ yok')] });
    await o3.yapayOku(0);
    yaz('hata: kart kalır, kilit açılır, kullanıcıya söylenir', o3.kartlar().length===1 && o3.kilit()===0 && o3.olan.durum.includes('ağ yok') && o3.olan.durum.includes('nota olarak'));
  }
  { // elle birleştirme okunanı da birleştirir; kart HTML'i kaçışlı
    const a={ ad:'A', sayfalar:[{dosya:{name:'1'}}], okunan:{ soz:'s1', akorlu:'', bilgiler:{yore:'Tokat'}, notlar:'', model:'m' } };
    const b={ ad:'', sayfalar:[{dosya:{name:'2'}}], okunan:{ soz:'s2', akorlu:'[Am]x', bilgiler:{yore:'', usul:'5/8'}, notlar:'n', model:'m' } };
    const o=ortam({ kartlar:[a,b] });
    o.birlestir(1);
    const k=o.kartlar()[0];
    yaz('birleştirince söz/akor/bilgi birleşti', o.kartlar().length===1 && k.okunan.soz==='s1\n\ns2' && k.okunan.akorlu==='[Am]x' && k.okunan.bilgiler.yore==='Tokat' && k.okunan.bilgiler.usul==='5/8');
    const h=o.html({ ...k, okunan:{ ...k.okunan, soz:'</textarea><img src=x onerror=alert(1)>', notlar:'<b>n</b>' } }, 0, '');
    yaz('kart HTML\'i kaçışlı', !h.includes('<img src=x') && !h.includes('<b>n</b>') && h.includes('&lt;img'));
    yaz('Haiku sonucunda "Daha dikkatli oku" var, Opus\'ta yok', h.includes('Daha dikkatli oku') && !o.html({ ...k, okunan:{ ...k.okunan, model:'claude-opus-5-5' } }, 0, '').includes('Daha dikkatli oku'));
  }
  { // kullanıcının gerçek taraması: önce 2. sayfa, sonra 1. sayfa üç kez (yamuk) → tek eser, sıra [1. sayfa, 2. sayfa], 2 tekrar çıkarıldı
    const o=ortam({ kartlar:['s2','p1a','p1b','p1c'].map(tekSayfa), cevaplar:[{ model:'m', donuslar:[], eserler:[
      eser([3,1],'Benden Selâm Olsun','Benden selâm olsun bolu beyine','',{yore:'Kastamonu'},[2,4]) ] }] });
    await o.yapayOku(0);
    const k=o.kartlar();
    yaz('tek eser, sayfalar okuma sırasıyla', k.length===1 && k[0].sayfalar.map(x=>x.dosya.name).join()==='p1b,s2');
    yaz('tekrar taramalar çıkarıldı ama saklı', k[0].cikarilan.map(x=>x.dosya.name).join()==='p1a,p1c');
    const h=o.html(k[0],0,'');
    o.geriEkle(0);
    yaz('"Geri ekle" çıkarılanları sayfalara ekler', k[0].sayfalar.length===4 && k[0].cikarilan.length===0);
    await o.kaydet();
    yaz('kaydedilen eserde söz ve yöre', o.olan.govdeler.length===1 && o.olan.govdeler[0].region==='Kastamonu' && o.olan.govdeler[0].lyrics.startsWith('Benden'));
  }
  { // masaüstü: bütün defter tek PDF → sayfalara ayrılır ve okunur (yetkili); düz üyede PDF tek kart kalır
    const o=ortam({ cevaplar:{ 'B64-defter-s1.jpg':{ model:'m', donuslar:[], eserler:[eser([1,2],'Hastane','h'), eser([3],'Sabahın','s')] } } });
    await o.ekle([{ name:'defter.pdf', type:'application/pdf' }, { name:'not.txt', type:'text/plain' }]);
    for (let i=0; i<50 && (o.kilit() || !o.olan.istekler.length); i++) await new Promise(r=>setTimeout(r,5));   // okuma arka planda biter
    const k=o.kartlar();
    yaz('PDF sayfalara ayrıldı, okunup 2 esere bölündü', o.olan.pdf===1 && k.map(x=>x.ad+':'+x.sayfalar.map(s=>s.dosya.name).join('+')).join(' | ')==='Hastane:defter-s1.jpg+defter-s2.jpg | Sabahın:defter-s3.jpg');
    yaz('desteklenmeyen dosya alınmadı', !k.some(x=>x.sayfalar.some(s=>s.dosya.name==='not.txt')));
    const u=ortam({ rol:'user' });
    await u.ekle([{ name:'defter.pdf', type:'application/pdf' }]);
    yaz('düz üyede PDF tek kart, okuma yok', !u.olan.pdf && u.kartlar().length===1 && u.olan.istekler.length===0);
  }
  console.log(hata?`\n${hata} test KALDI`:'\nHepsi geçti'); process.exit(hata?1:0);
})();
