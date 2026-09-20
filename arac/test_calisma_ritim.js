/* AŞAMA C — arayüz mantığı testleri (sahte DOM) */
const fs=require('fs');
let hata=0; const yaz=(a,ok,ek='')=>{console.log((ok?'GEÇTİ ':'KALDI ')+a+(ek?'  — '+ek:'')); if(!ok)hata++;};

// Sahte DOM
const ogeler={};
function oge(id){ if(!ogeler[id]) ogeler[id]={id,style:{},classList:{_s:new Set(),add(x){this._s.add(x)},remove(x){this._s.delete(x)},toggle(x,v){v?this._s.add(x):this._s.delete(x)},contains(x){return this._s.has(x)}},options:[],innerHTML:'',textContent:'',disabled:false,value:'',querySelector:()=>({className:''}),hidden:true}; return ogeler[id]; }
global.document={ getElementById:oge, visibilityState:'visible', addEventListener:()=>{} };
global.window={};
global.alert=(m)=>{ global._sonAlert=m; };
global._caCev=(k,tr)=>tr;

// Motor sahtesi
let motorDurum={hazir:true, calisiyor:false, bpm:100};
global.Ritim={
  kaliplar:{ nim_sofyan:{id:'nim_sofyan',ad:{tr:'Nim Sofyan'},olcu:'2/4'} },
  kitler:{ bendir:{id:'bendir',ad:'Bendir'} },
  olustur(){ return {
    hazirla: async()=> motorDurum.hazir?{ok:true}:{ok:false,mesaj:'Kit yüklenemedi'},
    basla(){ motorDurum.calisiyor=true; return true; },
    durdur(){ motorDurum.calisiyor=false; },
    bpmYaz(v){ motorDurum.bpm=v; return v; },
    kalipYaz(){ return true; }
  };}
};
global.oyCaliyor=false;

// Arayüz kodunu calisma.html'den çıkar
const html=fs.readFileSync('/mnt/user-data/outputs/calisma.html','utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const bolum=js.slice(js.indexOf('// ── RİTİM (AŞAMA C)'));
eval(bolum);

(async()=>{
  // 1. sekme geçişi
  sekmeAc('ritim');
  yaz('sekme: ritim açılıyor', oge('bolumRitim').style.display==='' && oge('bolumKayit').style.display==='none');
  yaz('sekme: ritim sekmesi aktif', oge('sekRitim').classList.contains('aktif') && !oge('sekKayit').classList.contains('aktif'));
  sekmeAc('kayit');
  yaz('sekme: kayıtlara dönüş', oge('bolumKayit').style.display==='' && oge('bolumRitim').style.display==='none');

  // 2. seçenekler veriden
  sekmeAc('ritim');
  yaz('usul listesi veriden dolduruldu', oge('rtUsul').innerHTML.includes('Nim Sofyan') && oge('rtUsul').innerHTML.includes('2/4'));
  yaz('çalgı listesi veriden dolduruldu', oge('rtCalgi').innerHTML.includes('Bendir'));

  // 3. BPM
  rtBpmYaz(140); yaz('BPM yazma', oge('rtBpmDeger').textContent===140 && oge('rtBpm').value===140);
  rtBpmYaz(999); yaz('BPM üst sınır 300', oge('rtBpmDeger').textContent===300);
  rtBpmYaz(1);   yaz('BPM alt sınır 30', oge('rtBpmDeger').textContent===30);
  rtBpmKaydir(5);yaz('BPM adım', oge('rtBpmDeger').textContent===35);

  // 4. çal/durdur
  rtBpmYaz(100);
  await rtCalDurdur();
  yaz('ritim başladı', motorDurum.calisiyor===true && oge('rtCalMetin').textContent==='Durdur');
  yaz('başlarken motora BPM verildi', motorDurum.bpm===100);
  await rtCalDurdur();
  yaz('ritim durdu', motorDurum.calisiyor===false && oge('rtCalMetin').textContent==='Başlat');

  // 5. çakışma kilidi — kayıt çalarken ritim
  global.oyCaliyor=true; rtKilitYenile();
  yaz('kayıt çalarken ritim düğmesi pasif', oge('rtCalBtn').disabled===true);
  await rtCalDurdur();
  yaz('pasifken ritim başlamıyor', motorDurum.calisiyor===false);
  yaz('kullanıcıya açıklama gösteriliyor', oge('rtNot').hidden===false &&
      oge('rtNot').textContent==='Ritmi kullanmak için mevcut ses kaydını durdurun.');
  yaz('açıklama hata gibi görünmüyor', oge('rtNot').classList.contains('hata')===false);

  // 6. ters yön — ritim çalarken kayıt
  global.oyCaliyor=false; rtKilitYenile();
  await rtCalDurdur();
  yaz('ritim yeniden başladı', motorDurum.calisiyor===true);
  yaz('ritim çalarken kayıt düğmesi pasif', oge('oyOynatBtn').disabled===true);

  // 7. kit hatası
  rtDurdur(); rtMotor=null; motorDurum.hazir=false;
  await rtCalDurdur();
  yaz('kit hatasında çalmıyor ve hata gösteriyor',
      motorDurum.calisiyor===false && oge('rtNot').classList.contains('hata')===true, oge('rtNot').textContent);
  motorDurum.hazir=true;

  // 8. tap tempo
  rtMotor=null; rtTapZamanlari=[];
  let t=1000000; const eskiNow=Date.now; Date.now=()=>t;
  for (let i=0;i<5;i++){ rtTap(); t+=500; }        // 500 ms = 120 bpm
  yaz('tap tempo 120 bpm', oge('rtBpmDeger').textContent===120, 'ölçülen '+oge('rtBpmDeger').textContent);
  // Uzun aradan sonra ölçüm sıfırlanmalı: tek dokunuş tempoyu DEĞİŞTİRMEMELİ,
  // sonraki dokunuş yeni aralığı vermeli. (Dizinin kendisi eval kapsamında
  // kaldığı için davranıştan sınıyoruz.)
  t+=5000; rtTap();
  yaz('uzun aradan sonra tek dokunuş tempoyu değiştirmiyor', oge('rtBpmDeger').textContent===120,
      'şimdi '+oge('rtBpmDeger').textContent);
  t+=300; rtTap();                                  // 300 ms = 200 bpm
  yaz('sıfırlama sonrası yeni ölçüm geçerli', oge('rtBpmDeger').textContent===200,
      'ölçülen '+oge('rtBpmDeger').textContent);
  Date.now=eskiNow;

  console.log(hata? '\n'+hata+' TEST BAŞARISIZ' : '\nTÜM TESTLER GEÇTİ');
  process.exit(hata?1:0);
})();
