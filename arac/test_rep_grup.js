/* repertoires.js — grup değişince yetkilerin tazelenmesi */
const fs=require('fs'), path=require('path');
const KOK=process.env.KOK||path.join(__dirname,'..');
let hata=0; const yaz=(a,ok,ek='')=>{console.log((ok?'GEÇTİ ':'KALDI ')+a+(ek?'  — '+ek:'')); if(!ok)hata++;};
const src=fs.readFileSync(path.join(KOK,'repertoires.js'),'utf8');

// İlgili parçaları tek başına çalıştır: grup/rol mantığı + canManage hesabı
let GID='gA', ROL='owner', UID='u1';
const REP_GRUP={ r1:['gA'], r2:['gB'] };
function getGroupId(){ return GID; }
function getUserId(){ return UID; }
let MY_GROUP_ROLE=ROL;
function isGroupManager(){ return MY_GROUP_ROLE==='owner'||MY_GROUP_ROLE==='admin'; }
function repVis(r){ const v=r&&r.visibility; if(v==='public'||v==='group'||v==='private') return v;
  return (r&&r.is_public)?'public':((r&&r.group_id)?'group':'private'); }
function repAktifGruptaMi(r){ if(!r||repVis(r)!=='group') return false; const gid=getGroupId(); if(!gid) return false;
  const l=REP_GRUP[r.id]; if(Array.isArray(l)&&l.length) return l.includes(gid); return !!r.group_id&&r.group_id===gid; }
const hesapla=x=>({...x, isOwner:x.owner_id===UID, canManage:(x.owner_id===UID)||(isGroupManager()&&repAktifGruptaMi(x))});

const ham=[
  {id:'r1',name:'A grubunun',owner_id:'u9',visibility:'group',group_id:'gA'},
  {id:'r2',name:'B grubunun',owner_id:'u9',visibility:'group',group_id:'gB'},
  {id:'r3',name:'Benim',owner_id:'u1',visibility:'group',group_id:'gB'},
  {id:'r4',name:'Herkese açık başkasının',owner_id:'u9',visibility:'public',group_id:'gC'}];
let reps=ham.map(hesapla);
yaz('gA aktifken A grubunun repertuvarı yönetilebilir', reps[0].canManage===true);
yaz('gA aktifken B grubunun repertuvarı yönetilemez', reps[1].canManage===false);
yaz('kendi repertuvarım her zaman yönetilebilir', reps[2].canManage===true);
yaz('başkasının herkese açık repertuvarı yönetilemez (Karadeniz Esintisi durumu)', reps[3].canManage===false);

// Grup gB'ye geçildi ama liste TAZELENMEDİ: eski hatanın canlandırması
GID='gB';
yaz('tazelenmezse eski yetki kalıyor (hata)', reps[0].canManage===true && repAktifGruptaMi(reps[0])===false);
// Tazelenince düzeliyor
reps=reps.map(hesapla);
yaz('tazelenince A grubunun repertuvarı kapanıyor', reps[0].canManage===false);
yaz('tazelenince B grubunun repertuvarı açılıyor', reps[1].canManage===true);

// Rol sonradan geldiğinde
GID='gA'; MY_GROUP_ROLE=null; reps=ham.map(hesapla);
yaz('rol henüz yüklenmediyse grup repertuvarı kapalı', reps[0].canManage===false);
MY_GROUP_ROLE='owner'; reps=reps.map(hesapla);
yaz('rol gelince açılıyor', reps[0].canManage===true);
MY_GROUP_ROLE='member'; reps=ham.map(hesapla);
yaz('üye rolü yönetemiyor', reps[0].canManage===false && reps[2].canManage===true);

// Kaynak dosyada dinleyiciler ve tazeleme var mı
for (const [ad,ara] of [['pageshow',"addEventListener('pageshow'"],['focus',"addEventListener('focus', grupTazele"],
    ['visibilitychange',"visibilitychange"],['storage',"addEventListener('storage'"],
    ['rol gelince yeniden çizim',"renderList(); renderDetail();"],['çizim grubu kaydı',"_CIZIM_GID = getGroupId()"]])
  yaz('kaynakta '+ad+' bağlı', src.includes(ara)||fs.readFileSync(path.join(KOK,'repertoires.js'),'utf8').includes(ara));


// Salt okunur şerit: yalnız yönetilemeyen repertuvarda, kopya düğmesiyle
const kaynak=fs.readFileSync(path.join(KOK,'repertoires.js'),'utf8');
const stil=fs.readFileSync(path.join(KOK,'repertoires.html'),'utf8');
yaz('şerit yalnız canManage false iken çiziliyor', /\$\{rep\.canManage \? '' : `/.test(kaynak));
yaz('şeritte kopya düğmesi var', /rep-salt-btn[^`]*copyRep/.test(kaynak));
yaz('eski yalın Kopyala düğmesi kaldırıldı', (kaynak.match(/onclick="copyRep\(/g)||[]).length===2, ((kaynak.match(/onclick="copyRep\(/g)||[]).length)+' yerde');
yaz('şerit stili sayfada tanımlı', stil.includes('.rep-salt {') && stil.includes('.rep-salt-btn'));
for (const k of ['rep.saltOkunurBaslik','rep.saltOkunurMetin','rep.kopyamiAl'])
  yaz('metin '+k+' kodda', kaynak.includes("'"+k+"'"));

console.log(hata?`\n${hata} TEST BAŞARISIZ`:'\nTÜM TESTLER GEÇTİ'); process.exit(hata?1:0);
