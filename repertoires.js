
const H = {
  get apikey() { return SUPA_KEY; },
  get Authorization() { return 'Bearer ' + (localStorage.getItem('sb_token') || SUPA_KEY); },
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};
async function dbGet(table, qs='') {
  const r = await fetch(SUPA_URL+'/rest/v1/'+table+'?'+qs, {headers:H});
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function dbPost(table, data) {
  const r = await fetch(SUPA_URL+'/rest/v1/'+table, {method:'POST',headers:H,body:JSON.stringify(data)});
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function dbPatch(table, id, data) {
  const r = await fetch(SUPA_URL+'/rest/v1/'+table+'?id=eq.'+id, {method:'PATCH',headers:H,body:JSON.stringify(data)});
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function dbDel(table, id) {
  const r = await fetch(SUPA_URL+'/rest/v1/'+table+'?id=eq.'+id, {method:'DELETE',headers:H});
  if (!r.ok) throw new Error(await r.text());
  return true;
}
async function dbDelWhere(table, col, val) {
  const r = await fetch(SUPA_URL+'/rest/v1/'+table+'?'+col+'=eq.'+val, {method:'DELETE',headers:H});
  if (!r.ok) throw new Error(await r.text());
  return true;
}


let WL = {};
let WLIST = [];
let repSearchQuery = '';

function onRepSearchInput(val) {
  repSearchQuery = val || '';
  renderList();
}

function repMatchesSearch(r, q) {
  if (!q) return true;
  const norm = s => (s || '').toLocaleLowerCase('tr');
  const nq = norm(q);
  if (norm(r.name).includes(nq)) return true;
  return (r.items || []).some(it => {
    const w = WL[it.workId] || {};
    return norm(w.name).includes(nq);
  });
}

// "Diğer İşlemler" menüsü dışına tıklanınca kapat
document.addEventListener('click', (e) => {
  document.querySelectorAll('.ov-menu[open]').forEach(d => {
    if (!d.contains(e.target)) d.removeAttribute('open');
  });
});

async function loadWorksData() {
  try {
    let rows = [];
    try {
      const r = await fetch(SUPA_URL+'/rest/v1/works?order=name&limit=2000', {
        headers: {'apikey': SUPA_KEY, 'Authorization': 'Bearer '+SUPA_KEY},
        signal: AbortSignal.timeout(4000)
      });
      rows = await r.json();
      if (window.db) await db.works.saveAll(rows);
    } catch(fetchErr) {
      console.warn('[repertoires] Works offline, IndexedDB kullanılıyor');
      if (window.db) rows = await db.works.getAll();
    }
    rows.forEach(w => {
      const id = String(w.id);
      WL[id] = { name: w.name||'', composer: w.composer||'', makam: w.makam||'', instrument: w.instrument||'', closingNote: w.closing_note||'', lyrics: w.lyrics||'' };
      WLIST.push({ id, name: w.name||'', composer: w.composer||'', makam: w.makam||'' });
    });
    // customWorks patch
    try {
      const customs = JSON.parse(localStorage.getItem('customWorks') || '[]');
      const deleted = JSON.parse(localStorage.getItem('deletedWorks') || '[]');
      deleted.forEach(function(did){ var sid=String(parseInt(did)); delete WL[sid]; for(var j=WLIST.length-1;j>=0;j--){if(WLIST[j].id===sid){WLIST.splice(j,1);break;}} });
      customs.forEach(function(w){ var sid=String(parseInt(w.id)); if(WL[sid]){if(w.name)WL[sid].name=w.name;if(w.lyrics!==undefined)WL[sid].lyrics=w.lyrics;} else WL[sid]={name:w.name||'',lyrics:w.lyrics||'',composer:w.composer||'',makam:w.makam||'',instrument:w.instrument||'',closingNote:w.closingNote||''}; var found=false; for(var k=0;k<WLIST.length;k++){if(WLIST[k].id===sid){if(w.name)WLIST[k].name=w.name;found=true;break;}} if(!found)WLIST.push({id:sid,name:w.name||'',composer:w.composer||'',makam:w.makam||''}); });
    } catch(e) {}
  } catch(e) { console.error('Works yüklenemedi:', e); }
}
let reps=[], selId=null, editId=null, selWId=null, addRepId=null, activeItemIdx=null, activeItemRepId=null;

function dbg(msg){ /* debug removed */ }

function sync(s,t){const d=document.getElementById('dot');const sl=document.getElementById('sl');if(d)d.className='dot '+s;if(sl)sl.textContent=t;}
function toast(m,t='ok'){const e=document.createElement('div');e.className='toast '+t;e.textContent=m;document.body.appendChild(e);setTimeout(()=>e.remove(),2500);}

let SOLISTLER = []; // sanatçı listesi

async function load(){
  sync('spin','Yükleniyor...');
  dbg('load() başladı');
  try{
    let r, i, s;
    try {
      const uid2 = getUserId();
      const gid = getGroupId();
      const repQuery = gid
        ? 'order=created_at&limit=100&group_id=eq.'+gid
        : (uid2
          ? 'order=created_at&limit=100&or=(owner_id.eq.'+uid2+',is_public.eq.true)'
          : 'order=created_at&limit=100&is_public=eq.true');
      const solQuery = gid ? 'order=name&group_id=eq.'+gid : 'order=name';
      [r,i,s] = await Promise.all([
        dbGet('repertoires', repQuery),
        dbGet('repertoire_items','order=seq'),
        dbGet('solistler', solQuery)
      ]);
      dbg('rep sayısı: '+(r||[]).length+' | items: '+(i||[]).length);
      if (window.db) {
        await db.repertoires.saveAll(r||[]);
        await db.solistler.saveAll(s||[]);
      }
    } catch(fetchErr) {
      if (window.db) {
        r = await db.repertoires.getAll();
        i = await db.repertoire_items.getAll();
        s = await db.solistler.getAll();
      } else { r=[]; i=[]; s=[]; dbg('db yok, boş liste'); }
      toast('📵 Çevrimdışı mod', 'ok');
    }
    SOLISTLER = (s||[]).map(x=>x.name).filter(Boolean);
    const uid = getUserId() || '';
    reps = r.map(x=>({...x, isOwner: x.owner_id===uid || x.user_id===uid, items:(i||[]).filter(t=>t.repertoire_id===x.id).sort((a,b)=>a.seq-b.seq).map(t=>({...t,workId:String(t.work_id),closingNote:t.closing_note||'',performer:t.performer||''}))}));
    sync('ok','Senkronize');
    renderList();
    const urlRep=new URLSearchParams(window.location.search).get('rep');
    if(urlRep&&reps.find(x=>x.id===urlRep)){selId=urlRep;}else if(!selId&&reps.length){selId=reps[0].id;}
    renderList();renderDetail();
    setTimeout(fixMobileHeight, 100);
  }catch(e){sync('err','Bağlantı hatası');toast(e.message,'er');}
}

function fixMobileHeight() {
  if (window.innerWidth >= 768) return;
  const topnav = document.querySelector('.r-topnav') || document.querySelector('.v2-topnav');
  const botnav = document.querySelector('.r-bottom-nav') || document.querySelector('.v2-bottom-nav');
  const lp = document.querySelector('.lp');
  const ls = document.getElementById('list');
  if (!lp || !ls) return;
  const topH = topnav ? topnav.offsetHeight : 56;
  const botH = botnav ? botnav.offsetHeight : 68;
  const available = window.innerHeight - topH - botH;
  lp.style.height = available + 'px';
  lp.style.maxHeight = available + 'px';
  const lph = lp.querySelector('.lph');
  const lphH = lph ? lph.offsetHeight : 50;
  ls.style.height = (available - lphH) + 'px';
  ls.style.overflowY = 'scroll';
}

function renderList(){
  const el=document.getElementById('list');
  if(!reps.length){el.innerHTML='<div style="padding:30px 16px;text-align:center;color:var(--text3);">Henüz repertuvar yok</div>';return;}
  const filtered = reps.filter(r=>repMatchesSearch(r, repSearchQuery));
  if(repSearchQuery && !filtered.length){el.innerHTML='<div style="padding:30px 16px;text-align:center;color:var(--text3);">"'+repSearchQuery+'" için sonuç bulunamadı</div>';return;}
  const sl={concept:'Taslak',confirmed:'Onaylandı',archive:'Arşiv'};
  const sc={concept:'sc',confirmed:'sf',archive:'sa'};
  const mine = filtered.filter(r=>r.isOwner);
  const pub  = filtered.filter(r=>!r.isOwner && r.is_public);
  function repCard(r, _zi){
    return `<div class="ri${selId===r.id?' active':''}" onclick="sel('${r.id}')">
      <div><div class="rn">${r.name}${r.is_public&&r.isOwner?' <span style="font-size:10px;color:#4ade80;font-weight:600;">🌐</span>':''}</div>
      <div class="rm"><span class="sp ${sc[r.status]||'sc'}">${sl[r.status]||'Taslak'}</span>${r.date?'<span>'+r.date+'</span>':''}</div></div>
      <div class="rc">${(r.items||[]).length} eser</div>
    </div>`;
  }
  let html = '';
  if(mine.length){
    html += '<div style="padding:8px 12px 4px;font-size:20px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;">📁 Repertuvarlarım</div>';
    html += mine.map(repCard).join('');
  }
  if(pub.length){
    html += '<div style="padding:12px 12px 4px;font-size:20px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;border-top:1px solid var(--border);margin-top:8px;">🌐 Genel Repertuvarlar</div>';
    html += pub.map(repCard).join('');
  }
  el.innerHTML = html;
}

function sel(id){
  selId=id;
  renderList();
  renderDetail();
  if(window.innerWidth < 768){
    const lp=document.querySelector('.lp');
    const dp=document.getElementById('dp');
    if(lp) lp.classList.add('mobile-hidden');
    if(dp) dp.classList.add('mobile-open');
    const btn=document.getElementById('mobileBackBtn');
    if(btn) btn.style.display='flex';
  }
}

function goBackToList(){
  const lp=document.querySelector('.lp');
  const dp=document.getElementById('dp');
  if(lp) lp.classList.remove('mobile-hidden');
  if(dp) dp.classList.remove('mobile-open');
  const btn=document.getElementById('mobileBackBtn');
  if(btn) btn.style.display='none';
}
function getRep(id){return reps.find(r=>r.id===id);}

function renderDetail(){
  const rep=getRep(selId);
  document.getElementById('es').style.display=rep?'none':'flex';
  const dc=document.getElementById('dc');
  dc.style.display=rep?'block':'none';
  if(!rep)return;
  const sl={concept:'Taslak',confirmed:'Onaylandı',archive:'Arşiv'};
  const sc={concept:'sc',confirmed:'sf',archive:'sa'};
  const items=rep.items||[];
  const rows=items.length?items.map((it,idx)=>{
    const w=WL[it.workId]||{};
    const cn=it.closingNote||w.closingNote||'';
    const pf = it.performer || '';
    const isActive = activeItemRepId===rep.id && activeItemIdx===idx;
    const rowClasses=[idx%2===1?'zebra-tr':'',isActive?'item-active':''].filter(Boolean).join(' ');
    return `<tr draggable="true" data-idx="${idx}" data-rep="${rep.id}" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondrop="dragDrop(event)" ondragend="dragEnd(event)" style="touch-action:pan-y;"${rowClasses?' class="'+rowClasses+'"':''}>
      <td class="sq" style="text-align:center;user-select:none;padding:0 2px;vertical-align:middle;width:48px;">
        <div style="display:flex;align-items:center;justify-content:center;gap:3px;">
          <span style="color:${isActive?'var(--accent)':'var(--text3)'};font-size:11px;font-weight:${isActive?'700':'600'};min-width:16px;">${isActive?'▶ ':''}${idx+1}</span>
          <span class="drag-handle" ontouchstart="touchDragStart(event)" ontouchmove="touchDragMove(event)" ontouchend="touchDragEnd(event)">⠿</span>
        </div>
      </td>
      <td style="padding-left:16px;">
        <div class="wn">${w.name||'#'+it.workId}</div>
        <div class="ws">${[w.makam,w.composer].filter(Boolean).join(' · ')}</div>
        ${pf ? '<div style="font-size:11px;color:var(--accent);margin-top:2px;">🎤 '+pf+'</div>' : ''}
      </td>
      <td class="col-kapanis">${cn?'<span class="cn">'+cn+'</span>':''}</td>
      <td class="col-not" style="color:var(--text3);font-size:12px;">${it.note||''}</td>
      <td><div class="ra">
        <button class="br${activeItemRepId===rep.id&&activeItemIdx===idx?' active':''}" onclick="mvActive('${rep.id}',${idx},-1)" ${idx===0?'disabled':''}>↑</button>
        <button class="br${activeItemRepId===rep.id&&activeItemIdx===idx?' active':''}" onclick="mvActive('${rep.id}',${idx},1)" ${idx===items.length-1?'disabled':''}>↓</button>
        <button class="br be" onclick="openItemEdit('${rep.id}','${it.id}')"><i class="ti ti-edit" aria-hidden="true"></i></button>
        <button class="br dl" onclick="rmItem('${rep.id}','${it.id}','${(w.name||'Bu eser').replace(/'/g,"\\'")}')"><i class="ti ti-trash" aria-hidden="true"></i></button>
      </div></td>
    </tr>`;
  }).join(''):`<tr><td colspan="5" class="ei">Henüz eser eklenmedi.</td></tr>`;

  dc.innerHTML=`
    <div class="dh" style="padding:10px 14px 8px;">
      <div class="mobile-back-btn" onclick="goBackToList()" style="display:none;margin:-10px -14px 8px;padding:8px 14px;" id="mobileBackBtn">← Repertuvar Listesi</div>
      <div class="dn" style="font-size:14px;font-weight:600;line-height:1.4;word-break:break-word;margin-bottom:8px;">${rep.name}</div>
      <div class="cta-row">
        <a href="stage.html" class="bstage-primary" onclick="localStorage.setItem('stageRepId','${rep.id}');localStorage.setItem('stageSource','repertoires');localStorage.setItem('stageShowChords','0')"><i class="ti ti-microphone" style="font-size:15px;" aria-hidden="true"></i> Sahneye Çık</a>
        ${rep.isOwner ? `
        <details class="ov-menu">
          <summary class="bi" style="font-size:12px;padding:9px 12px;">⋯ Diğer</summary>
          <div class="ov-menu-body">
            <button onclick="openEdit('${rep.id}')"><i class="ti ti-edit" aria-hidden="true"></i> Düzenle</button>
            <button onclick="shareRep('${rep.id}')"><i class="ti ti-share" aria-hidden="true"></i> Paylaş</button>
            <button onclick="printR('${rep.id}')"><i class="ti ti-printer" aria-hidden="true"></i> Yazdır</button>
            <button class="ov-danger" onclick="delRep('${rep.id}')"><i class="ti ti-trash" aria-hidden="true"></i> Sil</button>
          </div>
        </details>
        ` : `
        <button class="baw" style="font-size:12px;padding:9px 12px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;" onclick="copyRep('${rep.id}')"><i class="ti ti-copy" style="font-size:14px;" aria-hidden="true"></i> Kopyala</button>
        `}
      </div>
      <div class="dmr" style="gap:8px;padding-bottom:4px;flex-wrap:nowrap;overflow-x:auto;">
        <div class="mc"><span class="sp ${sc[rep.status]||'sc'}">${sl[rep.status]||'Taslak'}</span></div>
        ${rep.date?`<div class="mc" style="white-space:nowrap;">📅 <strong>${rep.date}</strong>${rep.venue?` &nbsp;📍 <strong>${rep.venue}</strong>`:''}</div>`:''}
        ${!rep.date&&rep.venue?`<div class="mc" style="white-space:nowrap;">📍 <strong>${rep.venue}</strong></div>`:''}
        ${rep.isOwner?`<div class="mc"><span class="chip-vis ${rep.is_public?'pub':'priv'}" onclick="togglePublic('${rep.id}')" title="${rep.is_public?'Public — tıkla gizle':'Private — tıkla herkese aç'}">${rep.is_public?'🌐 Public':'🔒 Private'}</span></div>`:''}
        ${rep.notes?`<div class="mc" style="color:var(--text3);white-space:nowrap;display:flex;align-items:center;gap:4px;"><i class="ti ti-pencil-plus" style="font-size:13px;" aria-hidden="true"></i> ${rep.notes}</div>`:''}
      </div>
    </div>
    <div class="is">
      <div class="ih"><h3>${items.length} Eser</h3><button class="baw" onclick="openWM('${rep.id}')">+ Eser Ekle</button></div>
      <table><thead><tr><th class="sq" style="text-align:center;">Sıra</th><th>Eser Adı</th><th class="col-kapanis">Kapanış</th><th class="col-not">Not</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
}

async function togglePublic(repId){
  const rep=getRep(repId);if(!rep)return;
  const newVal=!rep.is_public;
  try{
    await dbPatch('repertoires',repId,{is_public:newVal});
    toast(newVal?'🌐 Repertuvar herkese açık':'🔒 Repertuvar gizlendi');
    await load();
  }catch(e){toast(e.message,'er');}
}

async function copyRep(repId){
  const rep=getRep(repId);if(!rep)return;
  const uid=getUserId();
  sync('spin','Kopyalanıyor...');
  try{
    // Yeni repertuvar oluştur
    const H=authHeaders();
    const r=await fetch(SUPA_URL+'/rest/v1/repertoires',{
      method:'POST',
      headers:{...H,'Prefer':'return=representation'},
      body:JSON.stringify({name:rep.name+' (kopya)',status:'concept',user_id:uid,owner_id:uid,is_public:false})
    });
    if(!r.ok)throw new Error(await r.text());
    const [newRep]=await r.json();
    // Eserleri kopyala
    if(rep.items&&rep.items.length){
      await fetch(SUPA_URL+'/rest/v1/repertoire_items',{
        method:'POST',
        headers:{...H,'Prefer':'return=minimal'},
        body:JSON.stringify(rep.items.map((it,i)=>({repertoire_id:newRep.id,work_id:parseInt(it.workId),seq:i+1,closing_note:it.closingNote||null,note:it.note||null,performer:it.performer||null})))
      });
    }
    toast('📋 Repertuvar kopyalandı!');
    await load();
    selId=newRep.id;
    renderList();renderDetail();
  }catch(e){sync('err','Hata');toast(e.message,'er');}
}

function openNew(){editId=null;document.getElementById('rmt').textContent='Yeni Repertuvar';['fN','fD','fV','fNo'].forEach(x=>document.getElementById(x).value='');document.getElementById('fS').value='concept';document.getElementById('fVisPublic').checked=true;document.getElementById('rm').style.display='flex';setTimeout(()=>document.getElementById('fN').focus(),50);}
function openEdit(id){const r=getRep(id);if(!r)return;editId=id;document.getElementById('rmt').textContent='Düzenle';document.getElementById('fN').value=r.name;document.getElementById('fD').value=r.date||'';document.getElementById('fV').value=r.venue||'';document.getElementById('fS').value=r.status||'concept';document.getElementById('fNo').value=r.notes||'';if(r.is_public){document.getElementById('fVisPublic').checked=true;}else{document.getElementById('fVisPrivate').checked=true;}document.getElementById('rm').style.display='flex';}
function closeRM(){document.getElementById('rm').style.display='none';}

async function saveRep(){
  const name=document.getElementById('fN').value.trim();
  if(!name){document.getElementById('fN').focus();return;}
  const isPublic=document.getElementById('fVisPublic').checked;
  const data={name,date:document.getElementById('fD').value||null,venue:document.getElementById('fV').value.trim()||null,status:document.getElementById('fS').value,notes:document.getElementById('fNo').value.trim()||null,is_public:isPublic,user_id:getUserId()||undefined,owner_id:editId?undefined:(getUserId()||undefined),group_id:editId?undefined:(getGroupId()||undefined)};
  sync('spin','Kaydediliyor...');
  try{
    if(editId){await dbPatch('repertoires',editId,data);}
    else{const r=await dbPost('repertoires',data);selId=r[0]?.id||r.id;}
    closeRM();toast('Kaydedildi ✓');await load();
  }catch(e){sync('err','Hata');toast(e.message,'er');}
}

async function delRep(id){
  if(!confirm('Bu repertuvarı silmek istiyor musunuz?'))return;
  try{await dbDel('repertoires',id);if(selId===id)selId=null;toast('Silindi');await load();}catch(e){toast(e.message,'er');}
}

function openWM(repId){addRepId=repId;selWId=null;document.getElementById('ws').value='';document.getElementById('fCN').value='';document.getElementById('fIN').value='';document.getElementById('wpl').style.maxHeight='';const dw=document.getElementById('wDupWarn');if(dw)dw.style.display='none';filterW();document.getElementById('wm').style.display='flex';setTimeout(()=>document.getElementById('ws').focus(),50);}

// ── İCRACILAR TAG UI ──
let pfSelected = []; // seçili sanatçılar

function pfRender() {
  const container = document.getElementById('pfTags');
  const input = document.getElementById('pfInput');
  // Remove old tags
  container.querySelectorAll('.pf-tag').forEach(el => el.remove());
  // Insert tags before input
  pfSelected.forEach(name => {
    const tag = document.createElement('span');
    tag.className = 'pf-tag';
    tag.innerHTML = name + '<button type="button" onclick="pfRemove(\''+name+'\')">×</button>';
    container.insertBefore(tag, input);
  });
}

function pfAdd(name) {
  name = name.trim();
  if (!name || pfSelected.includes(name)) return;
  pfSelected.push(name);
  pfRender();
  document.getElementById('pfInput').value = '';
  pfHideDropdown();
}

function pfRemove(name) {
  pfSelected = pfSelected.filter(n => n !== name);
  pfRender();
}

function pfKeydown(e) {
  const val = e.target.value.trim();
  if ((e.key === 'Enter' || e.key === ',') && val) {
    e.preventDefault();
    pfAdd(val);
  } else if (e.key === 'Backspace' && !val && pfSelected.length) {
    pfRemove(pfSelected[pfSelected.length - 1]);
  }
}

function pfSuggest(q) {
  const dd = document.getElementById('pfDropdown');
  if (!q) { pfHideDropdown(); return; }
  const matches = SOLISTLER.filter(n => n.toLowerCase().includes(q.toLowerCase()) && !pfSelected.includes(n));
  if (!matches.length) { pfHideDropdown(); return; }
  dd.innerHTML = matches.slice(0,8).map(n =>
    '<div class="pf-dd-item" onmousedown="event.preventDefault();pfAdd(\''+n+'\')">' + n + '</div>'
  ).join('');
  dd.style.display = 'block';
}

function pfHideDropdown() {
  document.getElementById('pfDropdown').style.display = 'none';
}

function pfReset() {
  pfSelected = [];
  pfRender();
  const inp = document.getElementById('pfInput');
  if (inp) inp.value = '';
  pfHideDropdown();
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('#pfTags') && !e.target.closest('#pfDropdown')) pfHideDropdown();
});
function closeWM(){
  document.getElementById('wm').style.display='none';
  selWId=null; addRepId=null;
  ['fCN','fIN','fMK','ws'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
  pfReset();
  var box=document.getElementById('wInfoBox');if(box)box.style.display='none';
}
function filterW(){
  const q=document.getElementById('ws').value.toLowerCase().trim();
  const list=q?WLIST.filter(w=>(w.name+w.composer+w.makam).toLowerCase().includes(q)):WLIST;
  document.getElementById('wpl').innerHTML=list.slice(0,80).map(w=>`<div class="wpi${selWId===w.id?' sel':''}" onclick="pickW('${w.id}')"><div class="wpn">${w.name}</div><div class="wps">${[w.composer,w.makam].filter(Boolean).join(' · ')}</div></div>`).join('')||'<div style="padding:16px;text-align:center;color:var(--text3);">Bulunamadı</div>';
}
function pickW(id){
  selWId=id;
  const dw=document.getElementById('wDupWarn');if(dw)dw.style.display='none';
  const w=WL[id];
  if(!w) return filterW();
  // Eser adını arama kutusuna yaz
  document.getElementById('ws').value = w.name;
  // Kapanış notasını doldur (boşsa)
  if(w.closingNote && !document.getElementById('fCN').value)
    document.getElementById('fCN').value = w.closingNote;
  // Makamı doldur (readonly)
  document.getElementById('fMK').value = w.makam || '—';
  // Eser bilgi kutusunu göster
  const box = document.getElementById('wInfoBox');
  document.getElementById('wInfoMakam').textContent = w.makam ? '🎵 ' + w.makam : '';
  document.getElementById('wInfoInstr').textContent = w.instrument ? '🎸 ' + w.instrument : '';
  document.getElementById('wInfoComp').textContent = w.composer ? '✍️ ' + w.composer : '';
  box.style.display = (w.makam||w.instrument||w.composer) ? 'block' : 'none';
  // Seçilince listeyi daralt
  document.getElementById("wpl").style.maxHeight = "60px";
  filterW();
}

async function addWork(){
  if(!selWId){alert('Lütfen bir eser seçin.');return;}
  const rep=getRep(addRepId);if(!rep)return;
  const items=rep.items||[];
  if(items.some(i=>String(i.workId)===String(selWId))){
    const dw=document.getElementById('wDupWarn');
    if(dw)dw.style.display='block';
    return;
  }
  const nextSeq=items.length?Math.max(...items.map(i=>i.seq))+1:1;
  sync('spin','Ekleniyor...');
  try{
    await dbPost('repertoire_items',{repertoire_id:addRepId,work_id:selWId,seq:nextSeq,closing_note:document.getElementById('fCN').value.trim()||null,note:document.getElementById('fIN').value.trim()||null,performer:pfSelected.length?pfSelected.join(', '):null});
    closeWM();toast('Eser eklendi ✓');await load();
  }catch(e){toast(e.message,'er');}
}

async function rmItem(repId,itemId,workName){
  if(!confirm((workName||'Bu eser')+' repertuvardan çıkarılsın mı?'))return;
  try{await dbDel('repertoire_items',itemId);toast('Silindi');await load();}catch(e){toast(e.message,'er');}
}


// ── DRAG & DROP (desktop + touch) ──
let _dragSrcIdx = null;
let _dragRepId  = null;
let _touchClone = null;
let _touchSrcTr = null;

// ── Desktop drag ──
function dragStart(e) {
  const tr = e.currentTarget;
  _dragSrcIdx = parseInt(tr.dataset.idx);
  _dragRepId  = tr.dataset.rep;
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => tr.style.opacity = '0.4', 0);
}
function dragEnd(e) {
  e.currentTarget.style.opacity = '';
  document.querySelectorAll('tr.drag-over').forEach(r => r.classList.remove('drag-over'));
}
function dragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('tr.drag-over').forEach(r => r.classList.remove('drag-over'));
  e.currentTarget.classList.add('drag-over');
}
async function dragDrop(e) {
  e.preventDefault();
  const tr = e.currentTarget;
  const destIdx = parseInt(tr.dataset.idx);
  tr.classList.remove('drag-over');
  if (_dragSrcIdx === null || _dragSrcIdx === destIdx) return;
  await mv(_dragRepId, _dragSrcIdx, destIdx - _dragSrcIdx);
  _dragSrcIdx = null;
}

// ── Touch drag ──
let _touchTimer = null;
function touchDragStart(e) {
  e.stopPropagation();
  const handle = e.currentTarget;
  const tr = handle.closest('tr[data-idx]');
  const t = e.touches[0];
  const startX = t.clientX, startY = t.clientY;

  _touchTimer = setTimeout(() => {
    _dragSrcIdx = parseInt(tr.dataset.idx);
    _dragRepId  = tr.dataset.rep;
    _touchSrcTr = tr;

    _touchClone = tr.cloneNode(true);
    _touchClone.style.cssText = 'position:fixed;z-index:9999;opacity:0.85;pointer-events:none;background:var(--surface2);border:1px solid var(--accent);border-radius:6px;width:'+tr.offsetWidth+'px;transition:none;';
    document.body.appendChild(_touchClone);
    tr.style.opacity = '0.3';
    _touchClone.style.left = (startX - tr.offsetWidth/2) + 'px';
    _touchClone.style.top  = (startY - 20) + 'px';
  }, 300);
}

function touchDragMove(e) {
  if (!_touchClone) return;
  e.preventDefault();
  const t = e.touches[0];
  _touchClone.style.left = (t.clientX - _touchClone.offsetWidth/2) + 'px';
  _touchClone.style.top  = (t.clientY - 20) + 'px';

  // Altındaki satırı bul
  _touchClone.style.display = 'none';
  const el = document.elementFromPoint(t.clientX, t.clientY);
  _touchClone.style.display = '';
  const targetTr = el ? el.closest('tr[data-idx]') : null;
  document.querySelectorAll('tr.drag-over').forEach(r => r.classList.remove('drag-over'));
  if (targetTr) targetTr.classList.add('drag-over');
}

async function touchDragEnd(e) {
  clearTimeout(_touchTimer);
  if (!_touchClone) return;
  _touchClone.remove(); _touchClone = null;
  if (_touchSrcTr) _touchSrcTr.style.opacity = '';
  document.querySelectorAll('tr.drag-over').forEach(r => r.classList.remove('drag-over'));

  const t = e.changedTouches[0];
  const el = document.elementFromPoint(t.clientX, t.clientY);
  const targetTr = el ? el.closest('tr[data-idx]') : null;
  if (!targetTr) { _dragSrcIdx = null; return; }
  const destIdx = parseInt(targetTr.dataset.idx);
  if (_dragSrcIdx === null || _dragSrcIdx === destIdx) { _dragSrcIdx = null; return; }
  await mv(_dragRepId, _dragSrcIdx, destIdx - _dragSrcIdx);
  _dragSrcIdx = null;
}

function mvActive(repId, idx, dir) {
  // Aktif eser varsa onu taşı, yoksa bu idx'i akifleştir ve taşı
  if (activeItemRepId === repId && activeItemIdx !== null) {
    setActiveItem(repId, activeItemIdx);
    mv(repId, activeItemIdx, dir);
  } else {
    setActiveItem(repId, idx);
    mv(repId, idx, dir);
  }
}

function setActiveItem(repId, idx) {
  activeItemRepId = repId;
  activeItemIdx = idx;
}

async function mv(repId,idx,dir){
  const rep=getRep(repId);if(!rep)return;
  const items=[...rep.items];
  const ni=idx+dir;
  if(ni<0||ni>=items.length)return;
  // Drag-drop: splice to destination
  const [moved]=items.splice(idx,1);
  items.splice(ni,0,moved);
  items.forEach((it,i)=>it.seq=i+1);
  sync('spin','...');
  try{
    await Promise.all(items.map(it=>dbPatch('repertoire_items',it.id,{seq:it.seq})));
    if(activeItemRepId===repId) activeItemIdx = ni;
    await load();
    // activeItemIdx zaten set edildi, renderDetail load içinde çağrılıyor
  }catch(e){toast(e.message,'er');}
}

async function chSeq(repId,idx,val){
  const rep=getRep(repId);if(!rep)return;
  const items=[...rep.items];
  const ns=parseInt(val);
  if(isNaN(ns)||ns<1||ns>items.length){renderDetail();return;}
  const [moved]=items.splice(idx,1);
  items.splice(ns-1,0,moved);
  items.forEach((it,i)=>it.seq=i+1);
  sync('spin','...');
  try{
    await Promise.all(items.map(it=>dbPatch('repertoire_items',it.id,{seq:it.seq})));
    await load();
  }catch(e){toast(e.message,'er');}
}

function printR(repId){
  const rep=getRep(repId);if(!rep)return;
  const items=rep.items||[];
  const sl={concept:'Taslak',confirmed:'Onaylandı',archive:'Arşiv'};
  const rows=items.map(it=>{const w=WL[String(it.workId)]||{};const cn=it.closingNote||w.closingNote||'';return`<tr><td style="width:40px;color:#888;text-align:center;">${it.seq}</td><td style="padding:9px 12px;"><div style="font-weight:500;color:#111;">${w.name||it.workId}</div><div style="font-size:11px;color:#666;">${[w.composer,w.makam].filter(Boolean).join(' · ')}</div></td><td style="width:80px;text-align:center;color:#444;">${cn}</td><td style="width:120px;font-size:12px;color:#666;">${it.note||''}</td></tr>`;}).join('');
  const win=window.open('','_blank','width=800,height=900');
  const printCSS = '*{margin:0;padding:0;box-sizing:border-box;}body{font-family:\'DM Sans\',sans-serif;font-size:14px;color:#111;padding:32px 40px;}h1{font-family:\'Playfair Display\',serif;font-size:28px;font-weight:400;margin-bottom:8px;}hr{border:none;border-top:2px solid #111;margin:16px 0;}table{width:100%;border-collapse:collapse;}th{font-size:10px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:#888;text-align:left;padding:6px 12px;border-bottom:1px solid #ddd;}td{padding:9px 12px;border-bottom:1px solid #eee;vertical-align:middle;}';
  const printHTML = '<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>' + rep.name + '</title><style>' + printCSS + '</style><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"></head><body>'
    + '<div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:.1em;margin-bottom:24px;">Repertuvar — ' + new Date().toLocaleDateString('tr-TR') + '</div>'
    + '<h1>' + rep.name + '</h1>'
    + '<div style="display:flex;gap:16px;font-size:12px;color:#666;margin-bottom:16px;">' + (rep.date?'\uD83D\uDCC5 '+rep.date:'') + (rep.venue?' \uD83D\uDCCD '+rep.venue:'') + (rep.status?' \u25CF '+sl[rep.status]:'') + ' \uD83C\uDFBC ' + items.length + ' eser</div>'
    + '<hr><table><thead><tr><th>#</th><th>Eser Ad\u0131</th><th>Kapan\u0131\u015f</th><th>Not</th></tr></thead><tbody>' + rows + '</tbody></table>'
    + '<' + 'script>window.onload=function(){setTimeout(function(){window.print();},400);}' + '<\/script>'
    + '</body></html>';
  win.document.write(printHTML);
  win.document.close();
}

document.getElementById('rm').addEventListener('click',e=>{if(e.target.id==='rm')closeRM();});
document.getElementById('wm').addEventListener('click',e=>{if(e.target.id==='wm')closeWM();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeRM();closeWM();}});

// customWorks patch
(function(){
  try {
    var customs = JSON.parse(localStorage.getItem('customWorks') || '[]');
    var deleted = JSON.parse(localStorage.getItem('deletedWorks') || '[]');
    var i, sid;
    for(i=0;i<deleted.length;i++){
      sid = String(parseInt(deleted[i]));
      for(var j=WLIST.length-1;j>=0;j--){ if(WLIST[j].id===sid){WLIST.splice(j,1);break;} }
      delete WL[sid];
    }
    for(i=0;i<customs.length;i++){
      var w = customs[i];
      sid = String(parseInt(w.id));
      var found = false;
      for(var k=0;k<WLIST.length;k++){
        if(WLIST[k].id===sid){
          if(w.name) WLIST[k].name = w.name;
          if(w.composer) WLIST[k].composer = w.composer;
          if(w.makam) WLIST[k].makam = w.makam;
          found = true; break;
        }
      }
      if(!found) WLIST.push({id:sid, name:w.name||'', composer:w.composer||'', makam:w.makam||''});
      if(WL[sid]){
        if(w.name) WL[sid].name = w.name;
        if(w.lyrics !== undefined) WL[sid].lyrics = w.lyrics;
        if(w.composer) WL[sid].composer = w.composer;
      } else {
        WL[sid] = {name:w.name||'',lyrics:w.lyrics||'',composer:w.composer||'',makam:w.makam||'',instrument:w.instrument||'',closingNote:w.closingNote||''};
      }
    }
  } catch(e){ console.warn('patch err',e); }
})();

async function dbPatch(table, id, data) {
  const r = await fetch(SUPA_URL+'/rest/v1/'+table+'?id=eq.'+id, {
    method: 'PATCH',
    headers: {...H, 'Prefer': 'return=minimal'},
    body: JSON.stringify(data)
  });
  if (!r.ok) throw new Error(await r.text());
}
let iemRepId=null,iemItemId=null,iemPfSelected=[];
function openItemEdit(repId,itemId){
  iemRepId=repId;iemItemId=itemId;
  const rep=getRep(repId);if(!rep)return;
  const it=(rep.items||[]).find(x=>x.id===itemId);if(!it)return;
  const w=WL[it.workId]||{};
  const el=function(id){return document.getElementById(id);};
  if(el('iemWorkName')) el('iemWorkName').textContent=w.name||'#'+it.workId;
  if(el('iemWorkInfo')) el('iemWorkInfo').textContent=[w.makam,w.composer].filter(Boolean).join(' · ');
  if(el('iemMK')) el('iemMK').value=w.makam||'—';
  if(el('iemCN')) el('iemCN').value=it.closingNote||w.closingNote||'';
  if(el('iemNote')) el('iemNote').value=it.note||'';
  iemPfSelected=it.performer?it.performer.split(', ').filter(Boolean):[];
  iemPfRender();
  if(el('iem')) el('iem').style.display='flex';
  else console.error('Modal #iem not found in DOM');
}
function closeIEM(){
  document.getElementById('iem').style.display='none';
  iemRepId=null;iemItemId=null;iemPfSelected=[];iemPfRender();
  const inp=document.getElementById('iemPfInput');if(inp)inp.value='';
}
async function saveIEM(){
  try{
    const data={
      closing_note:document.getElementById('iemCN').value.trim()||null,
      note:document.getElementById('iemNote').value.trim()||null,
      performer:iemPfSelected.length?iemPfSelected.join(', '):null
    };
    await dbPatch('repertoire_items',iemItemId,data);
    closeIEM();toast('Kaydedildi ✓');await load();
  }catch(e){toast(e.message,'er');}
}
function iemPfRender(){
  const c=document.getElementById('iemPfTags');if(!c)return;
  const inp=document.getElementById('iemPfInput');
  c.querySelectorAll('.pf-tag').forEach(el=>el.remove());
  iemPfSelected.forEach(name=>{
    const t=document.createElement('span');t.className='pf-tag';
    t.innerHTML=name+'<button type="button" onclick="iemPfRemove(\''+name+'\')">×</button>';
    c.insertBefore(t,inp);
  });
}
function iemPfAdd(name){
  name=name.trim();if(!name||iemPfSelected.includes(name))return;
  iemPfSelected.push(name);iemPfRender();
  document.getElementById('iemPfInput').value='';
  document.getElementById('iemPfDropdown').style.display='none';
}
function iemPfRemove(name){iemPfSelected=iemPfSelected.filter(n=>n!==name);iemPfRender();}
function iemPfKeydown(e){
  const val=e.target.value.trim();
  if((e.key==='Enter'||e.key===',')&&val){e.preventDefault();iemPfAdd(val);}
  else if(e.key==='Backspace'&&!val&&iemPfSelected.length)iemPfRemove(iemPfSelected[iemPfSelected.length-1]);
}
function iemPfSuggest(q){
  const dd=document.getElementById('iemPfDropdown');
  if(!q){dd.style.display='none';return;}
  const m=SOLISTLER.filter(n=>n.toLowerCase().includes(q.toLowerCase())&&!iemPfSelected.includes(n));
  if(!m.length){dd.style.display='none';return;}
  dd.innerHTML=m.slice(0,8).map(n=>'<div class="pf-dd-item" onmousedown="event.preventDefault();iemPfAdd(\''+n+'\')">'+n+'</div>').join('');
  dd.style.display='block';
}
document.addEventListener('click',function(e){
  if(!e.target.closest('#iemPfTags')&&!e.target.closest('#iemPfDropdown')){
    const dd=document.getElementById('iemPfDropdown');if(dd)dd.style.display='none';
  }
});


// ── PAYLAŞIM ──
let shareRepId = null;

function shareRep(repId) {
  shareRepId = repId;
  const rep = getRep(repId);
  if (!rep) return;
  
  // Basit token: rep ID'sini base64'e çevir (yeterince güvenli)
  const token = btoa(repId).replace(/=/g,'');
  const baseUrl = window.location.origin + window.location.pathname.replace('repertoires.html','');
  const link = baseUrl + 'stage.html?share=' + token;
  
  document.getElementById('shareRepName').textContent = rep.name;
  document.getElementById('shareLink').textContent = link;
  document.getElementById('shareLink').dataset.url = link;
  document.getElementById('copyBtn').textContent = 'Kopyala';
  document.getElementById('shareModal').classList.add('open');
}

function closeShare() {
  document.getElementById('shareModal').classList.remove('open');
  shareRepId = null;
}

function copyShareLink() {
  const link = document.getElementById('shareLink').dataset.url;
  navigator.clipboard.writeText(link).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = '✓ Kopyalandı';
    btn.style.background = '#4ade80';
    setTimeout(() => { btn.textContent = 'Kopyala'; btn.style.background = ''; }, 2000);
  }).catch(() => {
    // Fallback for older browsers
    const el = document.createElement('textarea');
    el.value = link;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    document.getElementById('copyBtn').textContent = '✓ Kopyalandı';
  });
}

function shareViaEmail() {
  const link = document.getElementById('shareLink').dataset.url;
  const rep = getRep(shareRepId);
  const subject = encodeURIComponent('\u1F3B5 ' + (rep ? rep.name : 'Repertuvar') + ' - Sahne Modu');
  const body = encodeURIComponent('Merhaba,\n\n' + (rep ? rep.name : 'Repertuvar') + ' repertuvarini sahne modunda goruntulelemek icin asagidaki baglantıyı kullanabilirsin:\n\n' + link + '\n\nIyi muzikler!');
  window.open('mailto:?subject=' + subject + '&body=' + body, '_blank');
}

function shareViaWhatsApp() {
  const link = document.getElementById('shareLink').dataset.url;
  const rep = getRep(shareRepId);
  const text = '🎵 ' + (rep ? rep.name : 'Repertuvar') + ' — Sahne modunda görüntüle:\n' + link;
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}

(async function() {
  const ok = await requireAuth();
  if(!ok) return;
  if (window.syncOfflineData) syncOfflineData();
  await loadWorksData();
  load();
})();
