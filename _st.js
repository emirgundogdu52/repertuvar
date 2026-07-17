
const H = {'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json'};

let WL = {}; // Supabase'den yüklenecek

async function loadWL() {
  try {
    let rows = [];
    try {
      const r = await fetch(SUPA_URL+'/rest/v1/works?select=*&order=id&limit=2000', {
        headers: {'apikey': SUPA_KEY, 'Authorization': 'Bearer '+(localStorage.getItem('sb_token')||SUPA_KEY)},
        signal: AbortSignal.timeout(4000)
      });
      rows = await r.json();
      // Online'dan geldi — IndexedDB'yi güncelle
      if (window.db) await db.works.saveAll(rows);
    } catch(fetchErr) {
      console.warn('[stage] Supabase ulaşılamadı, IndexedDB kullanılıyor');
      if (window.db) rows = await db.works.getAll();
    }
    rows.forEach(w => {
      WL[String(w.id)] = {
        name: w.name || '',
        composer: w.composer || '',
        lyricWriter: w.lyric_writer || '',
        makam: w.makam || '',
        instrument: w.instrument || '',
        closingNote: w.closing_note || '',
        tuning: w.tuning || '',
        form: w.form || '',
        measurement: w.measurement || '',
        region: w.region || '',
        lyrics: w.lyrics || '',
        chords: w.chords || '',
        notaUrl: w.nota_url || ''
      };
    });
    // customWorks patch
    try {
      const customs = JSON.parse(localStorage.getItem('customWorks') || '[]');
      customs.forEach(w => {
        const id = String(parseInt(w.id));
        if(WL[id]) Object.assign(WL[id], {name:w.name||WL[id].name, lyrics:w.lyrics!==undefined?w.lyrics:WL[id].lyrics, composer:w.composer||WL[id].composer, notaUrl:w.notaUrl!==undefined?w.notaUrl:WL[id].notaUrl});
        else WL[id] = {name:w.name||'',lyrics:w.lyrics||'',composer:w.composer||'',makam:w.makam||'',instrument:w.instrument||'',closingNote:w.closingNote||'',notaUrl:w.notaUrl||''};
      });
    } catch(e) {}
  } catch(e) { console.error('WL yüklenemedi:', e); }
}let reps=[], selId=null, curRep=null, curIdx=0;

// repertoires.html'deki "Gizle" (hiddenRepIds, sadece client-side) ile tutarlı olsun diye —
// bir repertuvarı orada gizlersen burada da (sahne modunda) görünmemeli.
function getHiddenRepIds() {
  try { return JSON.parse(localStorage.getItem('hiddenRepIds') || '[]'); }
  catch(e) { return []; }
}

function buildRepsFromRaw(r, items) {
  const uid = getUserId();
  const hiddenIds = getHiddenRepIds();
  return (r||[])
    .filter(x => {
      const isOwner = x.owner_id === uid || x.user_id === uid;
      // repertoires.js'deki renderList ile BİREBİR aynı görünürlük: ya kendi repertuvarın,
      // ya da başkasına ait AMA açıkça "public" işaretli VE gizlenmemiş olmalı.
      // Grup içindeki private (is_public=false) repertuvarlar, sahibi olmayanlara hiç gösterilmez.
      return isOwner || (x.is_public === true && !hiddenIds.includes(x.id));
    })
    .map(x=>({...x,items:(items||[]).filter(t=>t.repertoire_id===x.id).sort((a,b)=>a.seq-b.seq).map(t=>({...t,workId:String(t.work_id),closingNote:t.closing_note||''}))}));
}

// repertoires.js ile AYNI görünürlük kapsamı — ikisi farklı mantık kullanırsa
// (biri grup bazlı, diğeri owner/public bazlı) iki sayfa farklı repertuvar listeleri gösterir.
function repVisibilityFilterFn() {
  const uid = getUserId();
  const gid = (typeof getGroupId === 'function') ? getGroupId() : null;
  if (gid) {
    return (x) => x.owner_id === uid || x.user_id === uid || x.group_id === gid || x.is_public === true;
  }
  return (x) => x.owner_id === uid || x.user_id === uid || x.is_public === true;
}
function repVisibilityQuery() {
  const uid = getUserId();
  const gid = (typeof getGroupId === 'function') ? getGroupId() : null;
  return gid
    ? 'or=(owner_id.eq.' + uid + ',group_id.eq.' + gid + ',is_public.eq.true)'
    : 'or=(owner_id.eq.' + uid + ',is_public.eq.true)';
}

async function loadReps(){
  // ── 1) ÖNCELİKLE LOCAL'DEN ANINDA DÖN (sinyal zayıf/yokken bile beklemeden) ──
  let localR = [], localItems = [];
  if (window.db) {
    try {
      const allReps = await db.repertoires.getAll();
      localR = allReps.filter(repVisibilityFilterFn());
      localItems = await db.repertoire_items.getAll();
    } catch(e) { console.warn('[stage] local repertuvar okuma hatası:', e); }
  }

  // ── 2) ARKA PLANDA SUNUCUYLA SENKRONİZE ET, sonucu güncelle ──
  refreshRepsInBackground();

  return buildRepsFromRaw(localR, localItems);
}

async function refreshRepsInBackground(){
  try {
    const [r, items] = await Promise.all([
      fetch(SUPA_URL+'/rest/v1/repertoires?order=created_at&'+repVisibilityQuery(),{headers:H, signal:AbortSignal.timeout(6000)}).then(r=>r.json()),
      fetch(SUPA_URL+'/rest/v1/repertoire_items?order=seq',{headers:H, signal:AbortSignal.timeout(6000)}).then(r=>r.json())
    ]);
    if (window.db) {
      await db.repertoires.replaceAll(r||[]);
      await db.repertoire_items.replaceAll(items||[]);
    }
    reps = buildRepsFromRaw(r, items);
    // Kullanıcı hâlâ seçim ekranındaysa listeyi tazele — sahnedeyken (performans sırasında) ekranı bozma.
    // Ayrıca tam o an bir kartı kaydırıyorsa (parmak hâlâ ekranda) veya bir panel açıksa,
    // DOM'u altından çekip garip bir ara-duruma sokmamak için yeniden çizimi erteliyoruz —
    // bir sonraki etkileşimde (dokunuş bitince) zaten güncel veriyle çizilecek.
    const picker = document.getElementById('pickerScreen');
    if (picker && !picker.classList.contains('hidden') && !_rsSwipe && !_rsOpenCard) {
      renderPicker();
    }
  } catch(e) {
    console.warn('[stage] arka plan senkronizasyonu başarısız (offline/zayıf sinyal):', e);
  }
}

let stageSearchQuery = '';

function onStageSearchInput(val) {
  stageSearchQuery = val || '';
  renderPicker();
}

function stageRepMatchesSearch(r, q) {
  if (!q) return true;
  const norm = s => (s || '').toLocaleLowerCase('tr');
  const nq = norm(q);
  if (norm(r.name).includes(nq)) return true;
  return (r.items || []).some(it => {
    const w = WL[it.workId] || {};
    return norm(w.name).includes(nq);
  });
}

function renderPicker(){
  const el=document.getElementById('rsl');
  if(!reps.length){el.innerHTML='<div style="padding:32px;text-align:center;color:var(--text3);line-height:1.8;">Henüz repertuvar yok.<br><a href="repertoires.html" style="color:var(--accent)">Repertuvar sayfasında</a> repertuvar oluşturun.</div>';return;}
  const filtered = reps.filter(r=>stageRepMatchesSearch(r, stageSearchQuery));
  if(stageSearchQuery && !filtered.length){el.innerHTML='<div style="padding:32px;text-align:center;color:var(--text3);">"'+stageSearchQuery+'" için sonuç bulunamadı</div>';return;}
  const sl={concept:'Taslak',confirmed:'Onaylandı',archive:'Arşiv'};
  const uid = getUserId();
  el.innerHTML=filtered.map(r=>{
    const isOwner = r.owner_id === uid || r.user_id === uid;
    const cardHtml = `<div class="rsi${selId===r.id?' sel':''}" onclick="rsCardClick(event,'${r.id}')" ontouchstart="rsTouchStart(event)" ontouchmove="rsTouchMove(event)" ontouchend="rsTouchEnd(event)" ontouchcancel="rsTouchEnd(event)">
      <div><div class="rsn">${r.name}</div><div class="rsm">${[r.date,r.venue,sl[r.status]].filter(Boolean).join(' · ')}</div></div>
      <div class="rsc">${(r.items||[]).length} eser</div>
    </div>`;
    const editBg = `<div class="rs-edit-bg" onclick="event.stopPropagation();rsCloseOpenCard();window.location.href='repertoires.html?rep=${r.id}'"><i class="ti ti-edit"></i>Değiştir</div>`;
    const rightBg = isOwner
      ? `<div class="rs-delete-bg" onclick="event.stopPropagation();rsCloseOpenCard();rsDeleteRep('${r.id}')"><i class="ti ti-trash"></i>Sil</div>`
      : `<div class="rs-delete-bg rs-hide-bg" onclick="event.stopPropagation();rsCloseOpenCard();rsHideRep('${r.id}')"><i class="ti ti-eye-off"></i>Gizle</div>`;
    return `<div class="rs-wrap">${editBg}${rightBg}${cardHtml}</div>`;
  }).join('');
}

// ── İki yönlü kaydırma (repertuvarlardaki riTouchStart/Move/End deseninin aynısı) ──
const RS_SWIPE_THRESHOLD = 44;
const RS_SWIPE_MAX = 84;
let _rsSwipe = null;
let _rsOpenCard = null;

function rsCloseOpenCard() {
  if (_rsOpenCard) {
    _rsOpenCard.style.transition = 'transform .2s ease';
    _rsOpenCard.style.transform = 'translateX(0)';
    _rsOpenCard.classList.remove('swiped-open-left', 'swiped-open-right');
    const wrap = _rsOpenCard.closest('.rs-wrap');
    if (wrap) { wrap.style.transition = 'opacity .2s ease'; wrap.style.setProperty('--swipe-glow', 0); }
    _rsOpenCard = null;
  }
}

function rsTouchStart(e) {
  if (_rsOpenCard && _rsOpenCard !== e.currentTarget) rsCloseOpenCard();
  const t = e.touches[0];
  _rsSwipe = { card: e.currentTarget, startX: t.clientX, startY: t.clientY, dx: 0, dir: null };
}

function rsTouchMove(e) {
  if (!_rsSwipe || _rsSwipe.card !== e.currentTarget) return;
  const t = e.touches[0];
  const dx = t.clientX - _rsSwipe.startX;
  const dy = t.clientY - _rsSwipe.startY;
  if (_rsSwipe.dir === null) {
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      _rsSwipe.dir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }
  }
  if (_rsSwipe.dir === 'v') { _rsSwipe = null; return; }
  if (_rsSwipe.dir === 'h') {
    e.preventDefault();
    let base = 0;
    if (_rsSwipe.card.classList.contains('swiped-open-right')) base = -RS_SWIPE_MAX;
    else if (_rsSwipe.card.classList.contains('swiped-open-left')) base = RS_SWIPE_MAX;
    const clamped = Math.min(RS_SWIPE_MAX, Math.max(base + dx, -RS_SWIPE_MAX));
    _rsSwipe.dx = clamped;
    _rsSwipe.card.style.transition = 'none';
    _rsSwipe.card.style.transform = `translateX(${clamped}px)`;
    const wrap = _rsSwipe.card.closest('.rs-wrap');
    if (wrap) wrap.style.setProperty('--swipe-glow', Math.min(1, Math.abs(clamped) / RS_SWIPE_MAX));
  }
}

function rsTouchEnd(e) {
  if (!_rsSwipe || _rsSwipe.dir !== 'h') { _rsSwipe = null; return; }
  const card = _rsSwipe.card;
  card.style.transition = 'transform .2s ease';
  if (Math.abs(_rsSwipe.dx) > 5) card.dataset.justSwiped = '1';
  card.classList.remove('swiped-open-left', 'swiped-open-right');
  const wrap = card.closest('.rs-wrap');
  if (_rsSwipe.dx <= -RS_SWIPE_THRESHOLD) {
    card.style.transform = `translateX(${-RS_SWIPE_MAX}px)`;
    card.classList.add('swiped-open-right');
    if (wrap) wrap.style.setProperty('--swipe-glow', 1);
    _rsOpenCard = card;
  } else if (_rsSwipe.dx >= RS_SWIPE_THRESHOLD) {
    card.style.transform = `translateX(${RS_SWIPE_MAX}px)`;
    card.classList.add('swiped-open-left');
    if (wrap) wrap.style.setProperty('--swipe-glow', 1);
    _rsOpenCard = card;
  } else {
    card.style.transform = 'translateX(0)';
    if (wrap) { wrap.style.transition = 'opacity .2s ease'; wrap.style.setProperty('--swipe-glow', 0); }
    if (_rsOpenCard === card) _rsOpenCard = null;
  }
  _rsSwipe = null;
}

function rsCardClick(e, id) {
  const card = e.currentTarget;
  if (card.classList.contains('swiped-open-left') || card.classList.contains('swiped-open-right')) {
    rsCloseOpenCard();
    return;
  }
  if (card.dataset.justSwiped === '1') {
    delete card.dataset.justSwiped;
    return;
  }
  pickRep(id);
}

window.addEventListener('pageshow', () => {
  document.querySelectorAll('.rsi.swiped-open-left, .rsi.swiped-open-right').forEach(card => {
    card.classList.remove('swiped-open-left', 'swiped-open-right');
    card.style.transition = 'none';
    card.style.transform = 'translateX(0)';
    delete card.dataset.justSwiped;
    const wrap = card.closest('.rs-wrap');
    if (wrap) wrap.style.setProperty('--swipe-glow', 0);
  });
  _rsOpenCard = null;
  _rsSwipe = null;
});

// Açık bir swipe kartı varken ekranın herhangi bir yerine tıklanınca (kartın dışına) kapat.
// repertoires.js ve eserler.html'de bu satır vardı, stage.html'de eksikti — kartın
// yarı-açık takılı kalmasının ve iki kartın birden açık kalmasının sebebi buydu.
document.addEventListener('click', (e) => {
  if (_rsOpenCard && !_rsOpenCard.contains(e.target)) rsCloseOpenCard();
});

// Silme/gizleme, repertoires.js'deki delRep/hideRepFromView ile aynı davranışta —
// ama gerçek kullanıcı token'ı gerektiriyor (stage.html'in salt-okunur H'si SUPA_KEY
// kullanıyor, RLS altında silme için yetmez), o yüzden ayrı bir authenticated header.
const RS_AUTH_H = {
  get apikey() { return SUPA_KEY; },
  get Authorization() { return 'Bearer ' + (localStorage.getItem('sb_token') || SUPA_KEY); },
  'Content-Type': 'application/json'
};

async function rsDeleteRep(id) {
  if (!confirm('Bu repertuvarı silmek istiyor musunuz?')) return;
  try {
    const r = await fetch(SUPA_URL + '/rest/v1/repertoires?id=eq.' + id, { method: 'DELETE', headers: RS_AUTH_H });
    if (!r.ok) throw new Error(await r.text());
    if (selId === id) { selId = null; const b = document.getElementById('bstart'); if (b) b.disabled = true; }
    reps = reps.filter(x => x.id !== id);
    if (window.db) db.repertoires.delete(id).catch(()=>{});
    renderPicker();
  } catch (e) {
    alert('Silinirken bir hata oluştu: ' + e.message);
  }
}

function rsHideRep(id) {
  const hiddenIds = getHiddenRepIds();
  if (!hiddenIds.includes(id)) {
    hiddenIds.push(id);
    localStorage.setItem('hiddenRepIds', JSON.stringify(hiddenIds));
  }
  reps = reps.filter(x => x.id !== id);
  renderPicker();
}

function pickRep(id){selId=id;document.getElementById('bstart').disabled=false;renderPicker();}

function setLyricsAlign(align) {
  localStorage.setItem('stageLyricsAlign', align);
  const el = document.querySelector('.wlyrics');
  if (el) el.style.textAlign = align;
  ['left','center','right'].forEach(a => {
    const btn = document.getElementById('align' + a.charAt(0).toUpperCase() + a.slice(1));
    if (!btn) return;
    btn.classList.toggle('active', a === align);
  });
}

const LYRICS_SCALE_MIN = 0.75, LYRICS_SCALE_MAX = 1.6;
function setLyricsFontScale(scale) {
  scale = Math.min(LYRICS_SCALE_MAX, Math.max(LYRICS_SCALE_MIN, +parseFloat(scale).toFixed(2)));
  localStorage.setItem('stageLyricsScale', scale);
  document.documentElement.style.setProperty('--lyrics-scale', scale);
  updateFontSliderUI(scale);
}
function updateFontSliderUI(scale) {
  const slider = document.getElementById('lyricsFontSlider');
  if (!slider) return;
  slider.value = scale;
  const pct = ((scale - LYRICS_SCALE_MIN) / (LYRICS_SCALE_MAX - LYRICS_SCALE_MIN)) * 100;
  slider.style.background = `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, var(--border) ${pct}%, var(--border) 100%)`;
}
// A− / A+ butonları: kaydırıcıyla aynı ölçeği adım adım değiştirir (0.1'lik adım).
function stepLyricsFont(delta) {
  const cur = parseFloat(localStorage.getItem('stageLyricsScale')) || 1;
  setLyricsFontScale(cur + delta);
}

// Bir satırın tamamen akor isimlerinden oluşup oluşmadığını denetler (Cm, Fm, D#, G#m7, A/C# vb.)
// "%%" öneki olmadan girilmiş akor satırlarını da otomatik tanımak için kullanılıyor.
const CHORD_TOKEN_RE = /^[A-G](#|b)?(maj|min|dim|aug|sus|add)?[0-9]*m?[0-9]*(\/[A-G](#|b)?)?$/i;
function looksLikeChordLine(line) {
  const t = line.trim();
  if (!t) return false;
  const tokens = t.split(/\s+/);
  return tokens.every(tok => CHORD_TOKEN_RE.test(tok));
}

function renderStageChords(text) {
  if (!text) return '';
  return text.trim().split('\n').map(line => {
    const isExplicitChordLine = line.startsWith('%%');
    const rawChordContent = isExplicitChordLine ? line.slice(2) : line;
    if (isExplicitChordLine || looksLikeChordLine(line)) {
      return rawChordContent.trim()
        ? `<span style="color:#58A6FF;font-size:0.85em;letter-spacing:.08em;font-family:monospace;display:block;margin-top:8px;white-space:pre;text-align:left;">${rawChordContent.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>`
        : '';
    } else if (line.trim() === '') {
      return '<br>';
    } else {
      return `<span style="display:block;text-align:left;">${line.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>`;
    }
  }).join('');
}


let _stageToolsAutoHide = null;
function scheduleStageToolsHide() {
  clearTimeout(_stageToolsAutoHide);
  _stageToolsAutoHide = setTimeout(() => {
    const panel = document.getElementById('stageToolsPanel');
    if (panel) panel.style.display = 'none';
  }, 4000);
}
function toggleStageTools(e) {
  if (e) e.stopPropagation();
  const panel = document.getElementById('stageToolsPanel');
  const isOpen = panel.style.display === 'flex';
  if (!isOpen) {
    // "Sıradaki" kartıyla çakışmasın diye alt bar'ın (.sb) gerçek yüksekliğine göre konumlan
    const sb = document.querySelector('.sb');
    const sbHeight = sb ? sb.getBoundingClientRect().height : 80;
    panel.style.bottom = (sbHeight + 8) + 'px';
  }
  panel.style.display = isOpen ? 'none' : 'flex';
  panel.style.flexDirection = 'column';
  clearTimeout(_stageToolsAutoHide);
  if (!isOpen) scheduleStageToolsHide(); // az önce açıldıysa geri sayımı başlat
}
document.addEventListener('click', function(e) {
  const toggle = document.getElementById('stageToolsToggle');
  const panel = document.getElementById('stageToolsPanel');
  if (panel && toggle && !toggle.contains(e.target) && !panel.contains(e.target)) {
    panel.style.display = 'none';
    clearTimeout(_stageToolsAutoHide);
  } else if (panel && panel.contains(e.target) && panel.style.display === 'flex') {
    scheduleStageToolsHide(); // panel içinde bir butona basıldıysa süreyi yenile
  }
});
function toggleStageTheme(){
  const t = localStorage.getItem('stageTheme')||'night';
  const next = t==='night' ? 'day' : 'night';
  localStorage.setItem('stageTheme', next);
  applyStageTheme('stage');
}

function applyStageTheme(screen){
  const t = localStorage.getItem('stageTheme') || 'night';
  const isStageDay   = screen === 'stage' && t === 'day';
  const isStageNight = screen === 'stage' && t === 'night';
  document.body.classList.toggle('day-theme', isStageDay);

  function applyVars(){
    const el = document.documentElement;
    if(screen === 'stage') el.removeAttribute('data-theme');
    if(isStageNight){
      el.style.setProperty('--bg',      '#080810');
      el.style.setProperty('--surface', '#0f0f1a');
      el.style.setProperty('--surface2','#161625');
      el.style.setProperty('--border',  '#484860');
      el.style.setProperty('--text',    '#f1f0ff');
      el.style.setProperty('--text2',   '#8b8aa8');
      el.style.setProperty('--text3',   '#3d3d58');
    } else if(isStageDay){
      el.style.setProperty('--bg',      '#f5f4f0');
      el.style.setProperty('--surface', '#fff');
      el.style.setProperty('--surface2','#f0eeea');
      el.style.setProperty('--border',  '#d8d4cc');
      el.style.setProperty('--text',    '#1a1825');
      el.style.setProperty('--text2',   '#5a5670');
      el.style.setProperty('--text3',   '#9d9aae');
    }
  }
  applyVars();
  setTimeout(applyVars, 100);
  setTimeout(applyVars, 500);

  const btn = document.getElementById('stageThemeBtn2');
  if(btn){
    const icon = btn.querySelector('i');
    if(icon) icon.className = t === 'day' ? 'ti ti-moon' : 'ti ti-sun';
    btn.classList.toggle('active', t === 'day');
  }
}
function setTheme(t){
  localStorage.setItem('stageTheme',t);
  const active={background:'rgba(255,200,61,0.12)',borderColor:'rgba(255,200,61,0.4)',color:'#E5A900'};
  const inactive={background:'',borderColor:'rgba(148,148,168,0.18)',color:'#8b8aa8'};
  ['day','night'].forEach(k=>{
    const el=document.getElementById('tc-'+k); if(!el)return;
    const s=k===t?active:inactive;
    el.style.background=s.background; el.style.borderColor=s.borderColor; el.style.color=s.color;
  });
}
function startStage(){
  curRep=reps.find(r=>r.id===selId);
  if(!curRep||(curRep.items||[]).length===0)return;
  curIdx=0;
  if(!localStorage.getItem('stageTheme')) localStorage.setItem('stageTheme','night');
  window._stageActive = true;
  window.dispatchEvent(new Event('stageEnter'));
  applyStageTheme('stage');
  showScreen('stageScreen');
  document.getElementById('strn').textContent=curRep.name;
  // Avatar doldur
  if(typeof getUser==='function'){const u=getUser();if(u){const name=u?.user_metadata?.full_name||u?.email?.split('@')[0]||'—';const av=document.getElementById('stnAvatar');if(av)av.textContent=name.charAt(0).toUpperCase();}}
  renderStage();
}

function renderStage(){
  const items=curRep.items||[];
  const item=items[curIdx];
  if(!item)return;
  const w=WL[item.workId]||{};
  const total=items.length;
  document.getElementById('stc').textContent=(curIdx+1)+'/'+total;
  const pds=document.getElementById('pds');
  if(total<=20){pds.innerHTML=items.map((_,i)=>`<div class="pd ${i<curIdx?'done':i===curIdx?'cur':''}"></div>`).join('');}
  else pds.innerHTML='';
  // Info paneli güncelle
  const panel = document.getElementById('stageInfoPanel');
  if (panel) {
    const rows = [
      w.makam ? `<div class="sip-row"><span class="sip-label">Makam</span><span class="sip-val">${w.makam}</span></div>` : '',
      (item.closingNote||w.closingNote) ? `<div class="sip-row"><span class="sip-label">Kapanış</span><span class="sip-val">${item.closingNote||w.closingNote}</span></div>` : '',
      w.tuning ? `<div class="sip-row"><span class="sip-label">Akort</span><span class="sip-val">${w.tuning}</span></div>` : '',
      w.form ? `<div class="sip-row"><span class="sip-label">Form</span><span class="sip-val">${w.form}</span></div>` : '',
      w.measurement ? `<div class="sip-row"><span class="sip-label">Usul</span><span class="sip-val">${w.measurement}</span></div>` : '',
      w.region ? `<div class="sip-row"><span class="sip-label">Bölge</span><span class="sip-val">${w.region}</span></div>` : '',
      w.composer ? `<div class="sip-row"><span class="sip-label">Besteci</span><span class="sip-val">${w.composer}</span></div>` : '',
      w.lyricWriter ? `<div class="sip-row"><span class="sip-label">Güfte</span><span class="sip-val">${w.lyricWriter}</span></div>` : '',
      w.instrument ? `<div class="sip-row"><span class="sip-label">Enstrüman</span><span class="sip-val">${w.instrument}</span></div>` : '',
      item.note ? `<div class="sip-row"><span class="sip-label">Not</span><span class="sip-val">${item.note}</span></div>` : '',
    ].filter(Boolean).join('');
    panel.innerHTML = rows || '<div style="color:var(--text3);font-size:12px;">Bilgi yok</div>';
    const infoBtn = document.querySelector('.stage-info-btn');
    if (infoBtn) infoBtn.style.display = rows ? 'flex' : 'none';
  }
  const viewMode = getStageViewMode(w);
  let bodyHtml = '';
  if (viewMode === 'nota' && w.notaUrl) {
    bodyHtml = `<div class="wnota"><img src="${w.notaUrl}" alt="Nota" style="max-width:100%;max-height:70vh;border-radius:8px;"></div>`;
  } else if (viewMode === 'chords' && w.chords) {
    bodyHtml = `<div class="wlyrics">${renderStageChords(w.chords)}</div>`;
  } else {
    bodyHtml = w.lyrics ? `<div class="wlyrics">${w.lyrics.replace(/\n/g,'<br>')}</div>` : '';
  }
  document.getElementById('sm').innerHTML=`
    <div class="wnum"></div>
    <div class="wtitle">${w.name||item.workId}</div>
    ${bodyHtml}`;
  updateViewToggleUI(w);
  // Kaydedilmiş hizalamayı uygula
  const savedAlign = localStorage.getItem('stageLyricsAlign') || 'center';
  requestAnimationFrame(() => setLyricsAlign(savedAlign));
  const savedScale = parseFloat(localStorage.getItem('stageLyricsScale')) || 1;
  document.documentElement.style.setProperty('--lyrics-scale', savedScale);
  updateFontSliderUI(savedScale);
  const next=items[curIdx+1];
  const np=document.getElementById('np');
  if(next){const nw=WL[next.workId]||{};document.getElementById('nn').textContent=nw.name||next.workId;document.getElementById('nm').textContent=[nw.makam,nw.measurement,next.closingNote||nw.closingNote].filter(Boolean).join(' · ');np.style.display='block';}
  else np.style.display='none';
}

function nextWork(){
  console.log('nextWork called');
  sideNavNext();
}

function prevWork(){
  sideNavPrev();
}



function initBackBtn() {
  const src = localStorage.getItem('stageSource');
  const backBtn = document.getElementById('btnGoBack');
  if (backBtn && src) {
    const labels = { eserler: 'Eserler', repertoires: 'Repertuvarlar', index: 'Ana Sayfa', artiesten: 'Solistler', uyeler: 'Üyeler', ayarlar: 'Ayarlar' };
    const lbl = backBtn.querySelector('.v2-bn-label');
    if (lbl) lbl.textContent = labels[src] || 'Geri Dön';
  }
  // Not: görünüm etiketi artık her renderStage() çağrısında updateViewToggleUI() ile güncelleniyor
}

// ── Görünüm modu: Söz / Akor / Nota — segmented control ile, repertuvar bazında hatırlanır ──
// Not: eser (work) bazında ayrı bir "varsayılan görünüm" alanı henüz veritabanında yok;
// o katman eklenmek istenirse work_parts/works şemasına bir alan gerekir.
function viewModeStorageKey(){
  const repId = curRep && curRep.id ? curRep.id : 'default';
  return 'stageViewMode_' + repId;
}
function getStageViewMode(w) {
  let mode = localStorage.getItem(viewModeStorageKey()) || 'lyrics';
  // Eserde o modun verisi yoksa güvenli şekilde söze düş
  if (mode === 'chords' && !w.chords) mode = 'lyrics';
  if (mode === 'nota' && !w.notaUrl) mode = 'lyrics';
  return mode;
}

function setViewMode(mode) {
  const item = curRep && curRep.items ? curRep.items[curIdx] : null;
  const w = item ? (WL[item.workId] || {}) : null;
  if (!w) return;
  if (mode === 'chords' && !w.chords) return;
  if (mode === 'nota' && !w.notaUrl) return;
  localStorage.setItem(viewModeStorageKey(), mode);
  renderStage();
}

// Açılır menüyü aç/kapat
function toggleViewModeMenu(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const m = document.getElementById('viewModeMenu');
  if (!m) return;
  m.style.display = (m.style.display === 'none' || !m.style.display) ? 'block' : 'none';
}
function closeViewModeMenu() {
  const m = document.getElementById('viewModeMenu');
  if (m) m.style.display = 'none';
}
// Menü dışında bir yere tıklanınca kapat
document.addEventListener('click', closeViewModeMenu);

function updateViewToggleUI(w) {
  const btn  = document.getElementById('viewModeBtn');
  const menu = document.getElementById('viewModeMenu');
  if (!btn || !menu) return;
  const mode = getStageViewMode(w);
  const available = { lyrics: true, chords: !!w.chords, nota: !!w.notaUrl };
  const icons = { lyrics: 'ti ti-music', chords: 'ti ti-guitar-pick', nota: 'ti ti-file-music' };
  // Üstteki buton ikonunu aktif moda göre değiştir
  const iconEl = document.getElementById('viewModeIcon');
  if (iconEl) iconEl.className = icons[mode] || icons.lyrics;
  // Menü öğelerini işaretle / gerektiğinde kapat
  menu.querySelectorAll('.vm-item').forEach(it => {
    const m = it.dataset.mode;
    it.classList.toggle('active', m === mode);
    it.disabled = !available[m];
  });
  // Buton HER ZAMAN görünür kalır (yalnızca söz olan eserlerde de) —
  // eskiden tek-mod olunca gizleniyordu, "menü kayıp" görünmesinin sebebi buydu.
  // Sadece söz varsa menüde Akor/Nota pasif görünür ama buton yerinde durur.
  btn.style.display = 'flex';
  buildStageToolsRow(mode);
}

// Alt "Görünüm Ayarları" paneli, o an açık olan görünüme göre yeniden kurulur.
// Not: Akor modunda ton değiştirme (± Ton) ve Nota modunda sayfaya/genişliğe sığdırma
// henüz ayrı bir özellik olarak yok — bunlar ileride eklenebilir.
function buildStageToolsRow(mode) {
  const row = document.getElementById('stageToolsRow');
  if (!row) return;
  const themeBtn = `<button onclick="event.stopPropagation();toggleStageTheme()" id="stageThemeBtn2" title="Gece/Gündüz" class="align-btn"><i class="ti ti-sun"></i></button>`;
  const navBtn = `<button onclick="event.stopPropagation();openStageNav()" title="Navigasyon" class="align-btn" style="color:var(--accent);border-color:var(--accent);"><i class="ti ti-list"></i></button>`;
  if (mode === 'nota') {
    row.innerHTML = themeBtn + navBtn;
  } else {
    // lyrics ve chords aynı .wlyrics kutusunu kullandığı için hizalama ikisinde de geçerli
    const alignBtns = `
      <button onclick="event.stopPropagation();setLyricsAlign('left')" id="alignLeft" title="Sola Yasla" class="align-btn"><i class="ti ti-align-left"></i></button>
      <button onclick="event.stopPropagation();setLyricsAlign('center')" id="alignCenter" title="Ortala" class="align-btn"><i class="ti ti-align-center"></i></button>
      <button onclick="event.stopPropagation();setLyricsAlign('right')" id="alignRight" title="Sağa Yasla" class="align-btn"><i class="ti ti-align-right"></i></button>`;
    row.innerHTML = alignBtns + themeBtn + navBtn;
  }
}

function goBack(e) {
  if (e) e.preventDefault();
  const src = localStorage.getItem('stageSource');
  if (src === 'eserler') window.location.href = 'eserler.html';
  else if (src === 'repertoires') window.location.href = 'repertoires.html';
  else if (src === 'index') window.location.href = 'index.html';
  else window.location.href = 'index.html';
}

function openInfoSheet(){
  const sheet = document.getElementById('infoSheet');
  const backdrop = document.getElementById('infoSheetBackdrop');
  if (sheet) sheet.classList.add('open');
  if (backdrop) backdrop.classList.add('open');
}
function closeInfoSheet(){
  const sheet = document.getElementById('infoSheet');
  const backdrop = document.getElementById('infoSheetBackdrop');
  if (sheet) sheet.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
}

function exitStage(e){e.stopPropagation();if(confirm('Sahne modundan çıkmak istiyor musunuz?')){window._stageActive=false;window.dispatchEvent(new Event('stageExit'));applyStageTheme('picker');backToPicker();}}
function showEndScreen(){
  applyStageTheme('picker');
  showScreen('endScreen');
  document.getElementById('ern').textContent = curRep.name || '';
  document.getElementById('erc').textContent = (curRep.items||[]).length + ' eser seslendirdiniz';
  // Paylaşım modunda Ana Sayfa ve Repertuvar Seç butonlarını gizle
  const isShared = !!new URLSearchParams(window.location.search).get('share');
  const btnRep = document.getElementById('btnRepertuvarSec');
  const btnAna = document.getElementById('btnAnaSayfa');
  if(btnRep) btnRep.style.display = isShared ? 'none' : '';
  if(btnAna) btnAna.style.display = isShared ? 'none' : '';
}
function restartStage(){curIdx=0;showScreen('stageScreen');renderStage();}
function backToPicker(){
  // Paylaşım modunda: sadece paylaşılan repertuvarı göster
  const shareToken = new URLSearchParams(window.location.search).get('share');
  if (shareToken && curRep && curRep.id !== 'single') {
    // Paylaşılan repertuvarı picker'da göster
    showScreen('pickerScreen');
    const pi = document.getElementById('pi');
    if (pi) {
      pi.innerHTML = `
        <div class="plogo"><img src="logo_dark.png" alt="repertuvar.app" data-logo="true" style="width:180px;display:block;"></div>
        <h1 class="ptitle">Paylaşılan Repertuvar</h1>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 20px;cursor:pointer;margin-top:16px;"
          onclick="startSharedRep()">
          <div style="font-size:15px;font-weight:600;color:var(--text);">${curRep.name||'Repertuvar'}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:4px;">${(curRep.items||[]).length} eser</div>
        </div>`;
    }
    return;
  }
  selId=null;document.getElementById('bstart').disabled=true;showScreen('pickerScreen');renderPicker();
}

function startSharedRep() {
  curIdx = 0;
  sideIdx = 0;
  showScreen('stageScreen');
  document.getElementById('strn').textContent = curRep.name || '';
  renderStage();
  updateSideButtons();
}
function showScreen(id){
  ['pickerScreen','stageScreen','endScreen'].forEach(s=>document.getElementById(s).classList.toggle('hidden',s!==id));
  const tnav=document.getElementById('v2StageTopnav');if(tnav)tnav.classList.toggle('hidden',id!=='pickerScreen');
  // topnav.js header'ını sahne modunda gizle
  const rTopnav=document.querySelector('.r-topnav');
  if(rTopnav)rTopnav.style.display=id==='stageScreen'?'none':'';
  const bnav=document.getElementById('v2StageBotNav');
  const stageNav=document.getElementById('stageNavStage');
  if(bnav){
    if(id==='stageScreen'){
      bnav.style.display='flex';
      bnav.classList.add('stage-hidden'); // sahne modunda başta gizli
      if(stageNav)stageNav.style.display='flex';
    } else {
      // picker/bitiş ekranlarında kendi nav'ımızı göstermiyoruz —
      // paylaşılan topnav.js alt nav'ı (#r-bottom-nav) zaten burada görünür durumda.
      // İki ayrı nav'ın üst üste binmesi (ve ikonların tutarsız kalması) bu yüzden
      // kaldırıldı — bkz. Eserler/Repertuvarlar ikon karışıklığı bug'ı.
      bnav.style.display='none';
    }
  }
  // Paylaşılan topnav.js header/alt-navbar'ını sahne ekranında CSS ile kesin gizle —
  // giriş yoluna (eserler ?work= vs repertuvar) ve topnav.js'in geç yüklenmesine
  // bakmaksızın çalışır; stageEnter olayının yakalanmasına bağlı kalmaz.
  document.body.classList.toggle('stage-active', id==='stageScreen');
}

document.addEventListener('keydown',e=>{
  if(document.getElementById('stageScreen').classList.contains('hidden'))return;
  if(e.key==='ArrowRight'||e.key===' '||e.key==='ArrowDown'){e.preventDefault();nextWork();}
  if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();prevWork();}
  if(e.key==='Escape')exitStage({stopPropagation:()=>{}});
});

// Yatay swipe → eser geçişi | Swipe up → bottom nav aç (4sn sonra kapan)
let txStart=0, tyStart=0;
let _navTimer=null;
function openStageNav(){
  const bnav=document.getElementById('v2StageBotNav');
  if(!bnav)return;
  bnav.classList.remove('stage-hidden');
  if(_navTimer)clearTimeout(_navTimer);
  _navTimer=setTimeout(()=>bnav.classList.add('stage-hidden'),4000);
}
document.addEventListener('touchstart',e=>{
  if(document.getElementById('stageScreen').classList.contains('hidden'))return;
  txStart=e.touches[0].clientX;
  tyStart=e.touches[0].clientY;
},{passive:true});
document.addEventListener('touchend',e=>{
  if(document.getElementById('stageScreen').classList.contains('hidden'))return;
  const dx=e.changedTouches[0].clientX-txStart;
  const dy=e.changedTouches[0].clientY-tyStart;
  // Yalnızca yatay swipe → eser geçişi. Yukarı swipe ile alt navbar AÇMA kaldırıldı:
  // sahne modunda navbar istenmiyor, güfteyi kaydırırken kazara açılıp alt barı
  // (yazı boyutu kontrolünü) örtüyordu. Çıkış için Görünüm Ayarları (⚙) menüsündeki
  // liste butonu kullanılabilir.
  if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)){
    dx<0?nextWork():prevWork();
  }
},{passive:true});

// ── NAVİGASYON ──
let sideList = [];
let sideIdx  = -1;

function sideNavInit(workId) {
  const stored = localStorage.getItem('stageWorkList');
  if (stored) {
    try { sideList = JSON.parse(stored); } catch(e) { sideList = []; }
    sideIdx = sideList.indexOf(String(workId));
  }
  updateSideButtons();
}

function updateSideButtons() {
  const l = document.getElementById('sideLeft');
  const r = document.getElementById('sideRight');
  if (!l || !r) return;
  const isRepMode = curRep && curRep.items && curRep.items.length > 1;
  const total = isRepMode ? curRep.items.length : sideList.length;
  const cur   = isRepMode ? curIdx : sideIdx;
  l.style.display = r.style.display = total > 1 ? 'flex' : 'none';
  l.classList.toggle('disabled', cur <= 0);
  r.classList.toggle('disabled', cur >= total - 1);
}

function sideNavPrev() {
  if (curRep && curRep.items && curRep.items.length > 1) {
    if (curIdx <= 0) return;
    curIdx--;
    renderStage();
    updateSideButtons();
    return;
  }
  if (sideIdx <= 0) return;
  sideIdx--;
  loadSideWork(sideList[sideIdx]);
}

function sideNavNext() {
  console.log('sideNavNext called, curIdx='+curIdx+', items='+(curRep&&curRep.items?curRep.items.length:0));
  if (curRep && curRep.items && curRep.items.length > 1) {
    if (curIdx >= curRep.items.length - 1) { showEndScreen(); return; }
    curIdx++;
    renderStage();
    updateSideButtons();
    return;
  }
  if (sideIdx >= sideList.length - 1) return;
  sideIdx++;
  loadSideWork(sideList[sideIdx]);
}

function loadSideWork(id) {
  const w = WL[id];
  if (!w) return;
  curRep = { id: 'single', name: w.name||'', items: [{ workId: id, closingNote: w.closingNote||'' }] };
  curIdx = 0;
  sideIdx = sideList.indexOf(String(id));
  document.getElementById('strn').textContent = w.name || '';
  renderStage();
  updateSideButtons();
}
// Init
(async()=>{
  const urlParams = new URLSearchParams(window.location.search);
  const _shareToken = urlParams.get('share');

  // Paylaşım modu: login gerekmez
  if (!_shareToken) {
    if (typeof requireAuth === 'function') {
      const ok = await requireAuth();
      if (!ok) return;
    }
  }

  // Arka planda sync yap (online ise IndexedDB'yi güncelle)
  if (window.syncOfflineData) setTimeout(() => syncOfflineData(), 800);

  // WL (works) yüklemesi: tek-eser (?work=) ve paylaşım (?share=) linkleri WL'ye
  // bağımlı olduğundan onlar için BEKLE; normal picker açılışında ise BEKLEME —
  // picker repertuvarları works olmadan da listelenir, eser adları sonra dolar.
  const _needsWL = urlParams.get('work') || urlParams.get('share');
  if (_needsWL) {
    await loadWL();
  } else {
    loadWL().then(() => {
      const picker = document.getElementById('pickerScreen');
      if (picker && !picker.classList.contains('hidden') && !_rsSwipe && !_rsOpenCard) renderPicker();
    });
  }

  // Paylaşım linki: ?share=token → token'dan rep ID çöz, Supabase'den yükle
  const shareToken = urlParams.get('share');
  if (shareToken) {
    try {
      const repId = atob(shareToken + '=='.slice(0, (4 - shareToken.length % 4) % 4));
      // Supabase'den bu repertuvarı çek (public erişim)
      const [rRes, iRes] = await Promise.all([
        fetch(SUPA_URL+'/rest/v1/repertoires?id=eq.'+repId, {
          headers: {'apikey': SUPA_KEY, 'Authorization': 'Bearer '+SUPA_KEY}
        }),
        fetch(SUPA_URL+'/rest/v1/repertoire_items?repertoire_id=eq.'+repId+'&order=seq', {
          headers: {'apikey': SUPA_KEY, 'Authorization': 'Bearer '+SUPA_KEY}
        })
      ]);
      const reps = await rRes.json();
      const items = await iRes.json();
      if (reps && reps[0]) {
        curRep = {
          ...reps[0],
          items: (items||[]).map(t => ({
            ...t, workId: String(t.work_id), closingNote: t.closing_note||'', performer: t.performer||''
          }))
        };
        curIdx = 0;
        showScreen('stageScreen');
        document.getElementById('strn').textContent = curRep.name || '';
        renderStage();
        // Tüm eserleri sideList'e yükle - önceki/sonraki geçiş için
        // Paylaşım modunda sideList boş bırak - sadece curRep/curIdx kullan
        sideList = [];
        sideIdx = -1;
        updateSideButtons();
        initBackBtn();
        return;
      }
    } catch(e) { console.error('Share token error:', e); }
  }

  const workParam = urlParams.get('work');
  if (workParam) {
    const normalizedId = String(parseInt(workParam));
    const w = WL[normalizedId] || WL[workParam];
    if (w) {
      curRep = {
        id: 'single',
        name: w.name || 'Eser',
        items: [{ workId: normalizedId, closingNote: w.closingNote || '' }]
      };
      curIdx = 0;
      // Repertuvar yolundaki startStage() ile AYNI giriş dizisi — eksik olması,
      // eserler.html'den tek eserle girildiğinde topnav.js'in paylaşılan alt
      // navbar'ı (#r-bottom-nav) gizlememesine yol açıyordu (stageEnter olayı hiç
      // atılmıyordu). Repertuvardan girişte çalışıp buradan çalışmamasının sebebi buydu.
      window._stageActive = true;
      window.dispatchEvent(new Event('stageEnter'));
      applyStageTheme('stage');
      showScreen('stageScreen');
      document.getElementById('strn').textContent = w.name || '';
      renderStage();
      sideNavInit(normalizedId);
      initBackBtn();
      return;
    }
  }

  reps=await loadReps();
  showScreen('pickerScreen');
  renderPicker();
  setTheme(localStorage.getItem('stageTheme')||'night');
  initBackBtn();

  const autoId=localStorage.getItem('stageRepId');
  if(autoId){localStorage.removeItem('stageRepId');const f=reps.find(r=>r.id===autoId);if(f){pickRep(autoId);setTimeout(()=>{startStage();initBackBtn();},100);}}
})();

// ── MOBİL SWIPE DESTEĞİ ──
(function() {
  let touchStartX = 0, touchStartY = 0;
  const sm = document.getElementById('sm') || document.body;
  
  document.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, {passive: true});

  document.addEventListener('touchend', function(e) {
    if (!document.getElementById('stageScreen') || 
        document.getElementById('stageScreen').classList.contains('hidden')) return;
    
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    
    // Yalnızca yatay swipe (dikey scroll değil)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) sideNavNext(); // sola swipe → sonraki
      else sideNavPrev();         // sağa swipe → önceki
    }
  }, {passive: true});
})();



(function(){
  const _sp=new URLSearchParams(window.location.search).get('share');
  if(!_sp && typeof requireAuth==='function'){
    requireAuth().then(()=>{
      const u=getUser&&getUser();if(!u)return;
      const name=u?.user_metadata?.full_name||u?.email?.split('@')[0]||'—';
      const ini=name.charAt(0).toUpperCase();
      const a=document.getElementById('stnAvatar');if(a)a.textContent=ini;
      const n=document.getElementById('stnUserName');if(n)n.textContent=name;
    });
  }
})();

// --- SYNC/ONLINE OTOMATİK TAZELEME (stage) ---
// Ağ değişince veya sync bitince picker açıksa listeyi tazele. Sadece picker
// görünürken ve kullanıcı kaydırma yapmıyorken çiz (açık swipe'ı bozmamak için).
(function() {
  let _rt;
  function _refreshPicker() {
    clearTimeout(_rt);
    _rt = setTimeout(function() {
      var picker = document.getElementById('pickerScreen');
      if (picker && !picker.classList.contains('hidden') &&
          typeof renderPicker === 'function' &&
          (typeof _rsSwipe === 'undefined' || !_rsSwipe) &&
          (typeof _rsOpenCard === 'undefined' || !_rsOpenCard)) {
        renderPicker();
      }
    }, 150);
  }
  window.addEventListener('data-synced', _refreshPicker);
  window.addEventListener('online', _refreshPicker);
})();

