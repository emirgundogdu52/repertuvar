/* eserler.html "📷 Defterden oku" (2026-10-22): düğme görünürlüğü, istek, önizleme, forma uygulama.
 * jsdom gerekir (projede bağımlılık değil): NODE_PATH=<jsdom'un kurulu olduğu node_modules> node arac/test_defter_oku.js */
const fs=require('fs'), path=require('path');
const { JSDOM } = require('jsdom');
let hata=0; const yaz=(a,ok,ek='')=>{console.log((ok?'GEÇTİ ':'KALDI ')+a+(ek?'  — '+ek:'')); if(!ok)hata++;};

const html=fs.readFileSync(path.join(__dirname,'..','eserler.html'),'utf8');
const arasi=(bas,son)=>{ const i=html.indexOf(bas), j=html.indexOf(son,i); if(i<0||j<0) throw new Error('bulunamadı: '+bas); return html.slice(i,j); };
const isaret=arasi('<!-- (2026-10-22) DEFTERDEN OKU','<!-- SEKMELER -->');
const kod=arasi('// ── (2026-10-22) DEFTERDEN OKU (DENEME)','// ── (2026-10-18) DEFTERDEN ESER EKLE');
const esHtml=html.match(/function _esHtml\(s\)\{[^\n]*\}/)[0];

const SONUC={ baslik:'Hastane Önünde İncir Ağacı', soz:'Hastane önünde incir ağacı\nDoktor bana bir çare', akorlu:'[Am]Hastane önünde [G]incir ağacı',
  bilgiler:{ yore:'İzmir', kaynak_kisi:'Hüseyin Dalgıç', derleyen:'', notaya_alan:'Muzaffer Sarısözen', repertuvar_no:'2318', makam:'', usul:'9/8', sure:'♩ = 50', ton:'', soz_yazari:'', besteci:'' },
  donus:90, notlar:'2. dize son sözcüğü belirsiz', kullanim:{girdi:1800,cikti:420} };

async function ortam({ rol='editor', duzenlenen=null, cevap={durum:200,govde:SONUC}, form={} }={}){
  const dom=new JSDOM(`<!doctype html><body>${isaret}
    <input id="ne_name"><input id="ne_region"><input id="ne_sourcePerson"><input id="ne_collector"><input id="ne_makam">
    <input id="ne_measurement"><input id="ne_composer"><input id="ne_lyricWriter"><input id="ne_metronom"><textarea id="ne_chords"></textarea></body>`,{runScripts:'outside-only'});
  const w=dom.window, olan={istekler:[], sekme:null, toast:null, alan:0, yuklenen:[], soz:form.soz||''};
  Object.entries(form).forEach(([id,v])=>{ const el=w.document.getElementById(id); if(el) el.value=v; });
  Object.assign(w,{
    _esCev:(k,t)=>t, isAdmin:()=>rol==='admin', isEditor:()=>rol==='admin'||rol==='editor', getToken:()=>'tok',
    SUPA_URL:'https://x.supabase.co', SUPA_KEY:'anon', editingWorkId:duzenlenen,
    getLyricsValue:()=>olan.soz, setLyricsValue:t=>{olan.soz=t;}, alanlariUygula:()=>{olan.alan++;},
    switchNeTab:s=>{olan.sekme=s;}, toastMsg:t=>{olan.toast=t;}, renderNeNotaList:()=>{},
    notaGorselKucult:async(f,d)=>({f,d}), uploadNotaFiles:(id,fs)=>{olan.yuklenen.push({id,fs});},
    fetch:async(url,opt)=>{ olan.istekler.push({url,opt}); return { ok:cevap.durum<300, status:cevap.durum, json:async()=>cevap.govde }; },
  });
  w.eval(esHtml+'\n'+kod+'\n;_defterOkuGorsel=async()=>"QUJD";');
  return {w, d:w.document, olan};
}
const sec=async(o)=>{ await o.w.defterOkuSec({ files:[{name:'sayfa.jpg'}], value:'x' }); };

(async()=>{
  { // görünürlük
    for (const [rol,beklenen] of [['user','none'],['editor','flex'],['admin','flex']]) {
      const o=await ortam({rol}); o.w._defterOkuGoster();
      yaz('düğme '+rol+' için '+beklenen, o.d.getElementById('ne_defterOkuSatir').style.display===beklenen);
    }
  }
  { // boş form: istek + önizleme + uygula
    const o=await ortam({duzenlenen:42});
    await sec(o);
    const ist=o.olan.istekler[0];
    yaz('istek defter-oku işlevine, oturum anahtarıyla', ist && ist.url==='https://x.supabase.co/functions/v1/defter-oku' && ist.opt.headers.Authorization==='Bearer tok');
    yaz('gövdede görsel', ist && JSON.parse(ist.opt.body).gorsel==='QUJD');
    const kap=o.d.getElementById('defterOkuOnizleme');
    yaz('önizleme açıldı', !!kap);
    yaz('söz ve akor kutuları işaretli (form boş)', kap.querySelector('#do_sozYaz').checked && kap.querySelector('#do_akorYaz').checked);
    yaz('not gösteriliyor', kap.textContent.includes('2. dize son sözcüğü belirsiz'));
    yaz('forma girmeyen bilgiler metin olarak', kap.textContent.includes('Repertuvar no: 2318') && kap.textContent.includes('Notaya alan: Muzaffer Sarısözen'));
    yaz('döndürme seçeneği (90°)', kap.querySelector('#do_nota') && kap.textContent.includes('90° döndürülerek'));
    kap.querySelector('#do_akor').value='[Am]Hastane önünde [G]incir ağacı düzeltildi';
    kap.querySelector('#do_nota').checked=true;
    o.w.defterOkuUygula();
    await new Promise(r=>setTimeout(r,0));
    const deg=id=>o.d.getElementById(id).value;
    yaz('söz forma yazıldı', o.olan.soz===SONUC.soz);
    yaz('önizlemedeki düzeltme akora yazıldı', deg('ne_chords').endsWith('düzeltildi'));
    yaz('alanlar dolduruldu', deg('ne_name')===SONUC.baslik && deg('ne_region')==='İzmir' && deg('ne_sourcePerson')==='Hüseyin Dalgıç' && deg('ne_measurement')==='9/8');
    yaz('TRT "SÜRE: ♩ = 50" metronoma sayı olarak', deg('ne_metronom')==='50');
    yaz('boş bilgi alanlara yazılmadı', deg('ne_collector')==='' && deg('ne_makam')==='');
    yaz('nota sayfası döndürülerek eklendi', o.olan.yuklenen.length===1 && o.olan.yuklenen[0].id===42 && o.olan.yuklenen[0].fs[0].d===90);
    yaz('önizleme kapandı, alanlar yeniden çizildi, söz sekmesi', !o.d.getElementById('defterOkuOnizleme') && o.olan.alan===1 && o.olan.sekme==='lyrics');
  }
  { // dolu form: üzerine yazma varsayılan KAPALI
    const o=await ortam({ form:{ soz:'eski söz', ne_chords:'[C]eski', ne_name:'Eski Ad', ne_region:'İzmir' } });
    await sec(o);
    const kap=o.d.getElementById('defterOkuOnizleme');
    yaz('dolu söz/akor kutusu işaretsiz', !kap.querySelector('#do_sozYaz').checked && !kap.querySelector('#do_akorYaz').checked);
    yaz('aynı değerdeki alan listelenmedi', !kap.querySelector('input[data-alan="ne_region"]'));
    yaz('farklı dolu alan işaretsiz, eski değer gösteriliyor', kap.querySelector('input[data-alan="ne_name"]').checked===false && kap.textContent.includes('Eski Ad'));
    yaz('yeni eserde nota seçeneği yok', !kap.querySelector('#do_nota'));
    o.w.defterOkuUygula();
    yaz('dokunulmayanlar korundu', o.olan.soz==='eski söz' && o.d.getElementById('ne_chords').value==='[C]eski' && o.d.getElementById('ne_name').value==='Eski Ad');
    yaz('boş alan yine de dolduruldu', o.d.getElementById('ne_sourcePerson').value==='Hüseyin Dalgıç');
  }
  { // hata
    const o=await ortam({ cevap:{durum:403,govde:{hata:'yetki-yok'}} });
    await sec(o);
    const t=o.d.getElementById('ne_defterOkuDurum').textContent;
    yaz('yetki hatası Türkçe gösterildi', t.includes('yalnız yönetici ve editörlere'), t);
    yaz('önizleme açılmadı, düğme yeniden etkin', !o.d.getElementById('defterOkuOnizleme') && !o.d.getElementById('ne_defterOkuBtn').disabled);
    const o2=await ortam({ cevap:{durum:502,govde:{hata:'yanit-bozuk'}} });
    await sec(o2);
    yaz('bilinmeyen hata kodu gösterildi', o2.d.getElementById('ne_defterOkuDurum').textContent.includes('yanit-bozuk'));
  }
  { // XSS: okunan metin HTML olarak çizilmemeli
    const kotu={...SONUC, baslik:'<img src=x onerror=alert(1)>', notlar:'<b>x</b>'};
    const o=await ortam({ cevap:{durum:200,govde:kotu} });
    await sec(o);
    const kap=o.d.getElementById('defterOkuOnizleme');
    yaz('okunan metin kaçışlı', !kap.querySelector('img') && !kap.querySelector('b + b') && kap.textContent.includes('<img src=x'));
  }
  console.log(hata?`\n${hata} test KALDI`:'\nHepsi geçti'); process.exit(hata?1:0);
})();
