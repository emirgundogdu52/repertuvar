/* ritim-kes.html kaydetme akışı: sıra, geri alma, kota hatası */
const fs=require('fs');
const D=require(require('path').join(__dirname,'..','dongu.js'));
let hata=0; const yaz=(a,ok,ek='')=>{console.log((ok?'GEÇTİ ':'KALDI ')+a+(ek?'  — '+ek:'')); if(!ok)hata++;};

function ortam(senaryo){
  const ogeler={}; const oge=id=>ogeler[id]||(ogeler[id]={id,value:'',checked:false,disabled:false,textContent:'',className:'',
    classList:{contains:()=>false,add(){},remove(){}},querySelector:()=>({className:''}),addEventListener(){},focus(){}});
  global.document={getElementById:oge, documentElement:{}};
  global.window={devicePixelRatio:1,addEventListener(){}}; global.getComputedStyle=()=>({getPropertyValue:()=>''});
  global.SUPA_URL='https://x.supabase.co'; global.SUPA_KEY='k';
  global.localStorage={getItem:k=>k==='user_group_id'?'g-1':(k==='sb_token'?'tok':null)};
  global.getUserId=()=>'u-1'; global.getToken=()=>'tok';
  global.Blob=class{constructor(p,o){this.p=p;this.type=o&&o.type;}};
  global.crypto={randomUUID:()=>'r-123'};
  global.Dongu=D; global.performance={now:()=>0};
  global.Ses={hazirla:async()=>({ok:true}),ctx:()=>null,cikis:()=>null};
  const istekler=[];
  global.fetch=async(url,opt={})=>{
    istekler.push({url,method:opt.method||'GET',body:opt.body,headers:opt.headers});
    if(url.includes('/rpc/ritim_kullanim')) return {ok:true,json:async()=>({adet:0,adet_limit:50,bayt:0,mb_limit:500})};
    if(url.includes('/storage/') && opt.method==='POST') return senaryo.dosya? {ok:true,text:async()=>''} : {ok:false,text:async()=>'yükleme reddedildi'};
    if(url.includes('/rest/v1/ritimler')) return senaryo.satir? {ok:true,text:async()=>''} : {ok:false,text:async()=>JSON.stringify({message:'Ritim adedi sinirina ulastiniz (50/50).'})};
    if(opt.method==='DELETE') return {ok:true,text:async()=>''};
    return {ok:true,json:async()=>({}),text:async()=>''};
  };
  const html=fs.readFileSync(require('path').join(__dirname,'..','ritim-kes.html'),'utf8');
  const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  // sayfa yüklenmiş gibi: kanalları ve döngüyü elle kur
  const kod=js.replace(/kotaYukle\(\);\s*$/,'')+`
    ;kanallar=[new Float32Array(44100*4),new Float32Array(44100*4)]; sr=44100; toplamSn=4; dosyaAdi='test.wav';
    dongu=D.donguKes(kanallar,sr,0.5,1.0);
    document.getElementById('rkAd').value='Deneme ritmi';
    document.getElementById('rkGrup').checked=${senaryo.grup?'true':'false'};
    global.__kaydet=kaydet; global.__oge=document.getElementById;`;
  eval(kod);
  return {istekler, oge:global.__oge, kaydet:global.__kaydet};
}

const g0=o=>JSON.parse(o.istekler.find(x=>x.url.endsWith('/rest/v1/ritimler')).body);
(async()=>{
  // 1. mutlu yol
  {
    const o=ortam({dosya:true,satir:true,grup:true});
    await o.kaydet();
    const yuk=o.istekler.find(x=>x.url.includes('/storage/v1/object/ritim-loops/') && x.method==='POST');
    const ins=o.istekler.find(x=>x.url.endsWith('/rest/v1/ritimler'));
    yaz('önce dosya, sonra satır', yuk && ins && o.istekler.indexOf(yuk)<o.istekler.indexOf(ins));
    const yolu=yuk.url.split('ritim-loops/')[1];
    yaz('yol <uid>/<id>.wav', /^u-1\/[0-9a-f-]{36}\.wav$/.test(yolu) && g0(o).path===yolu, yolu);
    yaz('içerik türü audio/wav', yuk.headers['Content-Type']==='audio/wav');
    const g=JSON.parse(ins.body);
    yaz('satır alanları tam', ['id','owner_id','group_id','ad','zaman_sayisi','olcu_sayisi','tempo','sure_sn','path','size_bytes','kaynak_dosya'].every(k=>k in g));
    yaz('grup paylaşımı işaretliyse group_id dolu', g.group_id==='g-1');
    yaz('süre 1,000 sn', g.sure_sn===1);
    yaz('başarı mesajı', o.oge('rkDurum').className.includes('tamam'), o.oge('rkDurum').textContent);
    yaz('silme isteği yok', !o.istekler.some(x=>x.method==='DELETE'));
  }
  // 2. satır yazılamazsa (kota) dosya geri silinmeli
  {
    const o=ortam({dosya:true,satir:false,grup:false});
    await o.kaydet();
    const yuk=o.istekler.find(x=>x.url.includes('/storage/v1/object/ritim-loops/') && x.method==='POST');
    const sil=o.istekler.find(x=>x.method==='DELETE' && x.url===yuk.url);
    yaz('kota hatasında dosya geri siliniyor', !!sil);
    yaz('kullanıcıya sunucunun mesajı okunur Türkçe gösteriliyor', o.oge('rkDurum').textContent.includes('Ritim sınırına ulaştın (50/50)'), o.oge('rkDurum').textContent);
    yaz('düğme tekrar etkin', o.oge('rkKaydetBtn').disabled===false);
  }
  // 3. dosya yüklenemezse satır hiç yazılmamalı
  {
    const o=ortam({dosya:false,satir:true});
    await o.kaydet();
    yaz('dosya yüklenemezse satır denenmiyor', !o.istekler.some(x=>x.url.endsWith('/rest/v1/ritimler')));
    yaz('hata gösteriliyor', o.oge('rkDurum').className.includes('hata'));
  }
  // 4. grup işaretsizse group_id boş
  {
    const o=ortam({dosya:true,satir:true,grup:false});
    await o.kaydet();
    const g=JSON.parse(o.istekler.find(x=>x.url.endsWith('/rest/v1/ritimler')).body);
    yaz('grup işaretsizse group_id null', g.group_id===null);
  }

  // 5. Aynı kayıttan ikinci döngü: ad numaralanıyor
  {
    const o=ortam({dosya:true,satir:true});
    await o.kaydet();
    yaz('ilk kayıttan sonra ad "… 2" oldu', o.oge('rkAd').value==='Deneme ritmi 2', o.oge('rkAd').value);
    await o.kaydet();
    yaz('ikinciden sonra "… 3"', o.oge('rkAd').value==='Deneme ritmi 3', o.oge('rkAd').value);
    const adlar=o.istekler.filter(x=>x.url.endsWith('/rest/v1/ritimler')).map(x=>JSON.parse(x.body).ad);
    yaz('sunucuya giden adlar farklı', adlar[0]==='Deneme ritmi' && adlar[1]==='Deneme ritmi 2', adlar.join(' | '));
  }

  console.log(hata? `\n${hata} TEST BAŞARISIZ`:'\nTÜM TESTLER GEÇTİ');
  process.exit(hata?1:0);
})();
