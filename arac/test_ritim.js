/* AŞAMA D — çok örnekli motor testleri (sanal AudioContext) */
const fs=require('fs');
let hata=0; const yaz=(a,ok,ek='')=>{console.log((ok?'GEÇTİ ':'KALDI ')+a+(ek?'  — '+ek:'')); if(!ok)hata++;};

function ortam(){
  const o={t:0,kuyruk:[],sayac:0,calinan:[],fetchler:[],decodeSayisi:0};
  o.setTimeout=(fn,ms)=>{const id=++o.sayac;o.kuyruk.push({id,ne:o.t+ms/1000,fn});return id;};
  o.clearTimeout=(id)=>{o.kuyruk=o.kuyruk.filter(x=>x.id!==id);};
  o.ilerlet=(sn,adim=0.005)=>{const h=o.t+sn;while(o.t<h){o.t=Math.min(h,o.t+adim);
    o.kuyruk.sort((a,b)=>a.ne-b.ne);while(o.kuyruk.length&&o.kuyruk[0].ne<=o.t+1e-9)o.kuyruk.shift().fn();}};
  const cikis={tip:'master'};
  // her tampon hangi dosyadan geldiğini taşısın
  o.actx={ sampleRate:44100, state:'running', get currentTime(){return o.t;},
    createBuffer:(c,n,s)=>({_yol:null,length:n,sampleRate:s}),
    createBufferSource(){ const s={buffer:null,playbackRate:{value:1},connect(){},
      start(w){ o.calinan.push({yol:s.buffer&&s.buffer._yol, zaman:+w.toFixed(9), kazanc:s._g}); }};
      return s; },
    createGain(){ const g={gain:{value:1},connect(hedef){ }}; return g; },
    decodeAudioData(ab,ok){ o.decodeSayisi++; const b={_yol:ab._yol}; if(ok){ok(b);return null;} return Promise.resolve(b); } };
  global.window={}; global.Ses={ctx:()=>o.actx,cikis:()=>cikis,hazirla:async()=>({ok:o.sesAcilir!==false})};
  global.setTimeout=o.setTimeout; global.clearTimeout=o.clearTimeout;
  global.fetch=async(yol)=>{ o.fetchler.push(yol);
    if(o.fetchBasarisiz) return {ok:false,status:404};
    return {ok:true,status:200,arrayBuffer:async()=>({_yol:yol})}; };
  eval(fs.readFileSync('/home/claude/zamanlayici.js','utf8'));
  eval(fs.readFileSync('/home/claude/ritim.js','utf8'));
  global.Zamanlayici=o.Zamanlayici=global.window.Zamanlayici;
  global.Ritim=o.Ritim=global.window.Ritim;
  // gain'i kaydedebilmek için createBufferSource'u sarmala
  const asil=o.actx.createBufferSource.bind(o.actx);
  return o;
}

(async()=>{
  // 1. Veri bütünlüğü
  {
    const o=ortam();
    const k=o.Ritim.kaliplar.nim_sofyan;
    yaz('Nim Sofyan doğrulanmış', k.durum==='dogrulandi');
    yaz('yalnız doğrulanmış kalıplar listeleniyor', o.Ritim.kalipListesi().length===1);
    yaz('kalıp modeli tüm alanları taşıyor',
      ['id','ad','olcu','zaman','birim','gruplama','altBolunme','olaylar','varsayilanBpm','uyumluKitler','tavirlar','varyasyon','durum']
        .every(a=>a in k));
    const kitler=o.Ritim.kitListesi('nim_sofyan').map(x=>x.id);
    yaz('arayüzde Bendir ve Darbuka', JSON.stringify(kitler)===JSON.stringify(['bendir','darbuka']), kitler.join(','));
    yaz('tef/shaker/cajon veri modelinde ama gizli',
      ['tambourine','shaker','cajon'].every(id=>o.Ritim.kitler[id] && !o.Ritim.kitler[id].gosterilsin));
    yaz('darbuka havuz boyutları 12/7/6',
      o.Ritim.kitler.darbuka.sesler.dum.length===12 && o.Ritim.kitler.darbuka.sesler.tek.length===7 &&
      o.Ritim.kitler.darbuka.sesler.pa.length===6);
  }

  // 2. Bendir bozulmadı
  {
    const o=ortam();
    const m=o.Ritim.olustur({kit:'bendir',bpm:120});
    const r=await m.hazirla();
    yaz('bendir hazırlandı', r.ok===true, r.mesaj||'');
    yaz('bendir yalnız 2 dosya indirdi', o.fetchler.length===2, o.fetchler.join(' , '));
    m.basla(); o.ilerlet(10);
    const yollar=o.calinan.map(x=>x.yol);
    const beklenen=['/sesler/bendir/dum.wav','/sesler/bendir/tek.wav'];
    yaz('DÜM→TEK sırası korunuyor', yollar.every((y,i)=>y===beklenen[i%2]), yollar.length+' olay');
    const arl=o.calinan.slice(1).map((x,i)=>x.zaman-o.calinan[i].zaman);
    yaz('120 bpm aralık 0.5 sn', Math.max(...arl.map(x=>Math.abs(x-0.5)))<1e-9);
  }

  // 3. Lazy load: darbuka seçilince yalnız darbuka
  {
    const o=ortam();
    const m=o.Ritim.olustur({kit:'darbuka',bpm:100});
    await m.hazirla();
    yaz('darbuka 25 dosya indirdi (12+7+6)', o.fetchler.length===25, o.fetchler.length+' istek');
    yaz('bendir dosyası indirilmedi', !o.fetchler.some(y=>y.includes('/bendir/')));
    yaz('tef/shaker/cajon indirilmedi',
      !o.fetchler.some(y=>/tambourine|shaker|cajon/.test(y)));
    yaz('decode sayısı fetch ile aynı', o.decodeSayisi===25, o.decodeSayisi+'');
  }

  // 4. Round-robin
  {
    const o=ortam();
    const m=o.Ritim.olustur({kit:'darbuka',bpm:240});
    await m.hazirla(); m.basla(); o.ilerlet(30);
    const dum=o.calinan.filter(x=>x.yol.includes('doom')).map(x=>x.yol);
    const tek=o.calinan.filter(x=>x.yol.includes('tak')).map(x=>x.yol);
    yaz('DÜM havuzundan çok sayıda vuruş', dum.length>50, dum.length+' vuruş');
    yaz('arka arkaya aynı dosya çalmıyor (DÜM)', dum.every((y,i)=>i===0||y!==dum[i-1]));
    yaz('arka arkaya aynı dosya çalmıyor (TEK)', tek.every((y,i)=>i===0||y!==tek[i-1]));
    yaz('12 DÜM örneğinin hepsi kullanılıyor', new Set(dum).size===12, new Set(dum).size+' farklı');
    yaz('7 TEK örneğinin hepsi kullanılıyor', new Set(tek).size===7, new Set(tek).size+' farklı');
  }

  // 5. Round-robin zamanlamayı bozmuyor
  {
    const o=ortam();
    const m=o.Ritim.olustur({kit:'darbuka',bpm:100});
    await m.hazirla(); m.basla(); o.ilerlet(300,0.01);
    const z=o.calinan.map(x=>x.zaman);
    const ilk=z[0], birim=0.6;
    const drift=Math.max(...z.map((x,i)=>Math.abs(x-(ilk+i*birim))));
    yaz('5 dakika darbuka — drift yok', z.length>450 && drift<1e-6,
        `${z.length} olay, drift ${(drift*1e9).toFixed(1)} ns`);
  }

  // 6. Kit değişimi
  {
    const o=ortam();
    const m=o.Ritim.olustur({kit:'bendir',bpm:120});
    await m.hazirla(); m.basla(); o.ilerlet(4);
    const bendirSayisi=o.calinan.length;
    m.durdur();
    m.kitYaz('darbuka');
    yaz('kit değişince hazırlıksız çalmıyor', m.basla()===false);
    const r=await m.hazirla();
    yaz('darbuka hazırlandı', r.ok===true, r.mesaj||'');
    m.basla(); o.ilerlet(4);
    const sonrasi=o.calinan.slice(bendirSayisi).map(x=>x.yol);
    yaz('artık darbuka çalıyor', sonrasi.length>0 && sonrasi.every(y=>y.includes('/darbuka/')));

    // geri dön: bendir havuzu bellekte olmalı, yeniden indirilmemeli
    const oncekiIstek=o.fetchler.length;
    m.durdur(); m.kitYaz('bendir'); await m.hazirla();
    yaz('önceden yüklenen kit yeniden indirilmiyor', o.fetchler.length===oncekiIstek,
        (o.fetchler.length-oncekiIstek)+' yeni istek');
  }

  // 7. Çalarken kit değişimi (arayüzün yaptığı sıra: durdur → değiştir → başlat)
  {
    const o=ortam();
    const m=o.Ritim.olustur({kit:'bendir',bpm:120});
    await m.hazirla(); m.basla(); o.ilerlet(3);
    m.durdur(); m.kitYaz('darbuka'); await m.hazirla(); m.basla(); o.ilerlet(3);
    const son=o.calinan.slice(-5).map(x=>x.yol);
    yaz('çalarken kit değişimi kesintisiz', son.every(y=>y.includes('/darbuka/')));
    const arl=o.calinan.slice(-5).slice(1).map((x,i)=>x.zaman-o.calinan.slice(-5)[i].zaman);
    yaz('kit değişimi sonrası tempo doğru', arl.every(x=>Math.abs(x-0.5)<1e-9));
  }

  // 8. BPM'ler
  for (const bpm of [60,90,120,180]) {
    const o=ortam();
    const m=o.Ritim.olustur({kit:'darbuka',bpm});
    await m.hazirla(); m.basla(); o.ilerlet(20);
    const arl=o.calinan.slice(1).map((x,i)=>x.zaman-o.calinan[i].zaman);
    yaz(`darbuka ${bpm} bpm`, Math.max(...arl.map(x=>Math.abs(x-60/bpm)))<1e-9,
        `${o.calinan.length} olay`);
  }

  // 9. Stop/Start ve hızlı tekrar
  {
    const o=ortam();
    const m=o.Ritim.olustur({kit:'darbuka',bpm:120});
    await m.hazirla(); m.basla(); o.ilerlet(3);
    const a=o.calinan.length; m.durdur(); o.ilerlet(5);
    yaz('durdurunca olay yok', o.calinan.length===a);
    m.basla(); o.ilerlet(3);
    yaz('yeniden başlıyor', o.calinan.length>a);
    for(let i=0;i<40;i++){m.basla();o.ilerlet(0.02);m.durdur();}
    const b=o.calinan.length; o.ilerlet(3);
    yaz('40 hızlı başlat/durdur sonrası sessiz', o.calinan.length===b);
  }

  // 10. Hata durumları
  {
    const o=ortam(); o.fetchBasarisiz=true;
    const m=o.Ritim.olustur({kit:'darbuka'});
    const r=await m.hazirla();
    yaz('havuz indirilemezse düzgün hata', r.ok===false && r.sebep==='kit', r.mesaj);
    yaz('hazır değilken çalmıyor', m.basla()===false);
    o.ilerlet(3); yaz('hata sonrası sessiz', o.calinan.length===0);
  }
  {
    const o=ortam(); o.sesAcilir=false;
    const r=await o.Ritim.olustur({}).hazirla();
    yaz('ses açılmazsa düzgün hata', r.ok===false && r.sebep==='ses');
  }

  console.log(hata? `\n${hata} TEST BAŞARISIZ` : '\nTÜM TESTLER GEÇTİ');
  process.exit(hata?1:0);
})();
