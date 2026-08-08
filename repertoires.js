// ============================================================================
// repertoires.js — changelog (son değişiklikler üstte)
// 2026-08-05 (b): TÜRKÇE DUYARSIZ ARAMA. "Hüsnü" kaydı "Husnu" yazınca
//             bulunamıyordu. Dosyada üç ayrı yöntem vardı: toLowerCase()
//             (eser/solist arama), toLocaleLowerCase('tr') (repertuvar arama),
//             makamNorm (yalnız makam). Artık arama yapan yerler auth.js'teki
//             ortak trMatch()'i kullanıyor; makamNorm SQL makam_norm() ile
//             eşleşmek zorunda olduğu için BİLEREK dokunulmadı.
// 2026-08-05: KARTTAKİ GÖRÜNÜRLÜK ÇİPİ ÜÇLÜ OLDU. 2026-08-01 (c)'de modal üçe
//             çıkmıştı ama kart çipi hâlâ is_public'e bakan ikili toggle'dı:
//             grup repertuvarı kartta "🔒 Private" görünüyordu ve kullanıcıda
//             "grup seçeneği yok" izlenimi bırakıyordu. Yeni visChip() gerçek
//             durumu gösterir (Kişisel / Grup / Genel); tıklayınca togglePublic
//             yerine openEdit açılır — tek dokunuşla herkese açma kaldırıldı.
//             İkonlar Tabler setinden: ti-lock / ti-users-group / ti-world.
//             ti-users-group, sol menüdeki "Grup / Koro" ile aynı ikon.
//             Aynı geçiş LİSTE BÖLÜM BAŞLIKLARINDA da yapıldı (Repertuvarlarım /
//             Grubun Repertuvarları / Genel Repertuvarlar → ti-playlist /
//             ti-users-group / ti-world) ve satırdaki "herkese açık" rozetinde.
// 2026-08-01 (d): GRUP YÖNETİCİSİ ARTIK GRUP REPERTUVARINI DÜZENLEYEBİLİYOR (arayüz,
//             sunucudaki repertoires_group_write + items_group_manage'in karşılığı).
//             Sorun: tüm düğmeler rep.isOwner'a bakıyordu, bu yüzden grup kurucusu/
//             admini başkasının oluşturduğu grup repertuvarında yalnızca "Kopyala"
//             görüyordu. Yeni: MY_GROUP_ROLE (group_members'tan çekilir, localStorage'a
//             yazılır — çevrimdışı ilk çizimde düğmeler kaybolmasın), isGroupManager(),
//             ve her repertuvarda canManage = isOwner || (grup yöneticisiyim &&
//             r.group_id === grubum). canManage'e bağlananlar: 🎼 Sırala, ⋯ Diğer menüsü
//             (Düzenle/Paylaş/Yazdır/Kopyala), satır işlem düğmeleri (↑↓/🔗/düzenle/sil),
//             sürükle-bırak + tutamaç, "+ Eser Ekle". SİLME ve görünürlük çipi (Public/
//             Private) yalnızca SAHİPTE kaldı — RLS'te de DELETE owner_id'ye bağlı.
//             Sahibi olmayan yönetici Kopyala'yı menü içinden görür.
// 2026-08-01 (c): GÖRÜNÜRLÜK ÜÇE ÇIKTI — Kişisel / Grup / Genel (repertoires.html v14).
//             Sorun: "Private" yalnızca is_public=false yapıyordu, group_id yine
//             otomatik doluyordu ⇒ gruba üye olan herkesin HER repertuvarı grup
//             repertuvarı oluyordu, "Repertuvarlarım" hiç dolmuyordu ve kişisel
//             taslak tüm gruba (yeni RLS ile grup admininin DÜZENLEMESİNE) açıktı.
//             Yeni: getVisChoice/setVisChoice/applyVisOptions yardımcıları;
//             Kişisel→group_id null, Grup→group_id=grubum, Genel→is_public true.
//             group_id artık DÜZENLEMEDE de gönderiliyor (eskiden editId?undefined:…),
//             böylece repertuvar sonradan kişisel↔grup taşınabiliyor.
//             openNew varsayılanı: grubu olan Grup, olmayan Kişisel (eskiden Genel'di).
//             Kopyalama artık KİŞİSEL kopya üretiyor (group_id:null) — kopya çalışma
//             nüshası, sahibinin kendi alanında başlasın.
// 2026-08-01 (b): BÖLÜMLEME ÖNCELİĞİ "sahip > grup" iken "GRUP > SAHİP" oldu.
//             Eskiden kendi oluşturduğum grup repertuvarım "Repertuvarlarım"da
//             kalıyordu; kurucu/admin ile üye aynı gruba baksa bile grup listeleri
//             farklı görünüyordu. Artık group_id benim grubumsa kayıt — kim
//             oluşturmuş olursa olsun — YALNIZCA "Grubun Repertuvarları"nda çıkar
//             (mine'a !inGroup şartı eklendi, grp'den !r.isOwner kaldırıldı).
//             "Repertuvarlarım" = gruba bağlı olmayan kişisel repertuvarlar.
//             hiddenIds süzgeci kendi kayıtlarıma uygulanmıyor (sahip gizlemez, siler).
//             Kart içeriği ve kaydırma (Sil/Gizle) hâlâ isOwner'a göre.
// 2026-08-01: ÜÇÜNCÜ BÖLÜM — "👥 Grubun Repertuvarları". Sunucu sorgusu grup
//             repertuvarlarını zaten getiriyordu (or=(owner_id,group_id,is_public))
//             ama renderList yalnızca mine/pub diye ikiye ayırıyordu: grup üyesi,
//             is_public=false olan grup repertuvarını HİÇ göremiyordu — satır reps'e
//             giriyor, iki kümeye de düşmediği için html'e hiç eklenmiyordu.
//             Sıra: Repertuvarlarım → Grubun Repertuvarları → Genel Repertuvarlar.
//             Hem grup hem public olan kayıt YALNIZCA grup bölümünde (pub'a
//             !inGroup(r) şartı eklendi) — aksi hâlde iki bölümde birden çıkardı.
//             Boş bölümün başlığı hiç basılmaz (grubu olmayan boş başlık görmesin).
// 2026-07-19 (e): "Diğer" menüsündeki PAYLAŞ ve YAZDIR düzeltildi — ikisi de
//             sessizce TypeError atıyordu. Paylaş: sayfada hiç olmayan #shareModal
//             /#shareRepName/#shareLink/#copyBtn elemanlarını arıyordu; modal artık
//             JS ile kuruluyor (#shareOverlay), telefonda önce navigator.share
//             deneniyor, pano kopyalama için execCommand yedeği var. Yazdır:
//             window.open('','_blank') açılır pencere engelleyicisinde/Capacitor
//             WebView'de null dönüyor, ardından win.document.write patlıyordu;
//             artık gizli iframe'e yazılıp oradan print ediliyor (printViaIframe),
//             o da olmazsa yeni sekme yedeği (printFallback).
// 2026-07-19 (d): MAKAMA GÖRE SIRALAMA MOTORU. makams tablosu + kişisel ton
//             kaydırmaları loadMakams() ile çekilir. workProfile() her satırın
//             makam/aile/karar profilini çıkarır (karar önceliği: satır kapanışı >
//             eser kapanışı > makamın kuramsal kararı, üstüne transpose eklenir).
//             transitionCost() ardışık iki eser arasına puan verir (aynı makam 0,
//             aynı karar 1, aynı aile 1.5, tam ses/dörtlü 2, üçlü 3, yarım ses/
//             artık dörtlü 5). proposeOrder(items,mode) üç mod: akilli (en yakın
//             komşu + 2-opt), makam, karar. Potpuri zincirleri TEK ATOM; açılış
//             atomu sabit; makamı bilinmeyen eserler yerlerinde kalır. Sonuç
//             DOĞRUDAN UYGULANMAZ — 🎼 Sırala butonu önizleme açar (satır araları
//             geçiş gerekçesiyle etiketli), Uygula denince applyReorder() çalışır.
// 2026-07-19 (c): Potpuri İÇEREN repertuvarlar listede ve detay başlığında 🔗
//             rozetiyle işaretleniyor (.rep-medley). Liste kartında sadece "🔗"
//             (birden fazla zincir varsa "🔗 2"), detayda "🔗 N Potpuri".
//             Zincir sayısı = ardışık linkedPrev bloklarının sayısı.
// 2026-07-19 (b): POTPURİ SÜRÜKLE-BIRAK DÜZELTMESİ. Hata: sürükle-bırak da mv()'yi
//             çağırıyordu (dir = hedef - kaynak) ama mv'nin blok dalı dir'i TEK ADIM
//             sanıyordu — zincir başı sürüklenince blok hedefe değil bir komşu kadar
//             kayıyordu; zincir üyesi dışarı sürüklendiğinde ise linked_prev true
//             kalıp altın şerit "kopmuş gibi" duruyordu. Çözüm: sıralama tek yoldan
//             geçiyor — applyReorder() + normalizeChains(). TEK KURAL: bir satırın
//             bağı, YENİ üstündeki satır o satırın ORİJİNAL zincirindense korunur,
//             değilse çözülür. Yeni mvTo(repId,src,dest) sürükle-bırak (ve chSeq)
//             için; mv() yalnız ↑/↓ tek adım. linked_prev PATCH'i yalnız DEĞİŞEN
//             satırlar için gönderilir.
// 2026-07-19: POTPURİ (medley) desteği. repertoire_items'a linked_prev boolean
//             kolonu eklendi: bir satır "bir öncekiyle kesintisiz devam ediyor"
//             demek. Potpuri = linked_prev=true olan ARDIŞIK satır zinciri
//             (ayrı grup id'si YOK — sürükle-bırak sıralamayı bozmasın diye).
//             Yeni: chainRange()/isChainHead() yardımcıları, toggleLink() (🔗
//             butonu, satırı öncekine bağlar/çözer), zincir satırlarında sol
//             altın şerit + "↳" numara, mv() zincir BAŞINA basıldığında tüm
//             bloğu taşır. idx===0 satırında linked_prev her zaman yok sayılır
//             (zincir asla listenin başında başlayamaz).
// 2026-07-17: (1) loadWorksData local-first yapıldı — eser adları/güftesi artık
//             IndexedDB'den anında geliyor, "#37" numara-yerine-ad regresyonu bitti.
//             (2) "Çevrimdışı mod" toast'ı yalnızca navigator.onLine===false iken
//             gösteriliyor — online'ken sync timeout'u artık sessiz.
//             (3) Arka plan sync timeout 6000→3500ms (ağ geçişinde asılı kalma azaldı).
// ============================================================================

// ── [A]/[B] AYRIMI ──
// Bu dosyanin db* yardimcilari jeneriktir: ayni fonksiyon hem paylasilan referans
// tablosunu (makams) hem kullaniciya ozel tablolari (repertoires, repertoire_items,
// solistler, personal_chords) okuyor. Tek bir baslikla ikisini birden dogru
// yapmak mumkun degil, o yuzden basligi TABLO belirliyor.
//   [A] referans  -> anonHeaders(): oturumdan bagimsiz, engelleme/401 disinda.
//   [B] digerleri -> authHeaders(): fallback yok; olu oturumda gorunur 401.
// Eskiden hepsi 'Bearer ' + (sb_token || SUPA_KEY) ile gidiyordu; token olunce
// repertuvarlar/solistler RLS altinda 0 satir donuyor, kullanici hata degil BOS
// LISTE goruyordu.
const REFERENCE_TABLES = new Set(['makams','regions','composers','lyricists','public_profiles']);
function hdrFor(table) {
  const base = REFERENCE_TABLES.has(table) ? anonHeaders() : authHeaders();
  return { ...base, 'Prefer': 'return=representation' };
}
async function dbGet(table, qs='', signal) {
  const r = await fetch(SUPA_URL+'/rest/v1/'+table+'?'+qs, {headers: hdrFor(table), signal});
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function dbPost(table, data) {
  const r = await fetch(SUPA_URL+'/rest/v1/'+table, {method:'POST',headers:hdrFor(table),body:JSON.stringify(data)});
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function dbPatch(table, id, data) {
  const r = await fetch(SUPA_URL+'/rest/v1/'+table+'?id=eq.'+id, {method:'PATCH',headers:hdrFor(table),body:JSON.stringify(data)});
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function dbDel(table, id) {
  const r = await fetch(SUPA_URL+'/rest/v1/'+table+'?id=eq.'+id, {method:'DELETE',headers:hdrFor(table)});
  if (!r.ok) throw new Error(await r.text());
  return true;
}
async function dbDelWhere(table, col, val) {
  const r = await fetch(SUPA_URL+'/rest/v1/'+table+'?'+col+'=eq.'+val, {method:'DELETE',headers:hdrFor(table)});
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
  // (2026-08-05) Eskiden toLocaleLowerCase('tr') kullanılıyordu: doğru küçültüyor
  // ama aksanı katlamıyordu ⇒ "Hüsnü" kaydı "Husnu" ile bulunamıyordu.
  // auth.js'teki ortak trMatch artık her iki tarafı da ASCII'ye indiriyor.
  if (trMatch(r.name, q)) return true;
  return (r.items || []).some(it => trMatch((WL[it.workId] || {}).name, q));
}

// ── Swipe-to-delete + swipe-to-değiştir (Repertuvarlar listesi) ──
const RI_SWIPE_THRESHOLD = 44;   // bu kadar kaydırınca "açık" sayılır
const RI_SWIPE_MAX = 84;         // silme/değiştir butonunun genişliği kadar
let _riSwipe = null;
let _riOpenCard = null; // o an açık (buton görünür) kart

function riCloseOpenCard() {
  if (_riOpenCard) {
    _riOpenCard.style.transition = 'transform .2s ease';
    _riOpenCard.style.transform = 'translateX(0)';
    _riOpenCard.classList.remove('swiped-open-left', 'swiped-open-right');
    const wrap = _riOpenCard.closest('.ri-wrap');
    if (wrap) { wrap.style.transition = 'opacity .2s ease'; wrap.style.setProperty('--swipe-glow', 0); }
    _riOpenCard = null;
  }
}

function riTouchStart(e) {
  if (_riOpenCard && _riOpenCard !== e.currentTarget) riCloseOpenCard();
  const t = e.touches[0];
  _riSwipe = { card: e.currentTarget, startX: t.clientX, startY: t.clientY, dx: 0, dir: null };
}

function riTouchMove(e) {
  if (!_riSwipe || _riSwipe.card !== e.currentTarget) return;
  const t = e.touches[0];
  const dx = t.clientX - _riSwipe.startX;
  const dy = t.clientY - _riSwipe.startY;
  if (_riSwipe.dir === null) {
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      _riSwipe.dir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }
  }
  if (_riSwipe.dir === 'v') { _riSwipe = null; return; }
  if (_riSwipe.dir === 'h') {
    e.preventDefault();
    let base = 0;
    if (_riSwipe.card.classList.contains('swiped-open-right')) base = -RI_SWIPE_MAX; // sil/gizle paneli açıktı
    else if (_riSwipe.card.classList.contains('swiped-open-left')) base = RI_SWIPE_MAX; // değiştir paneli açıktı
    const clamped = Math.min(RI_SWIPE_MAX, Math.max(base + dx, -RI_SWIPE_MAX));
    _riSwipe.dx = clamped;
    _riSwipe.card.style.transition = 'none';
    _riSwipe.card.style.transform = `translateX(${clamped}px)`;
    const wrap = _riSwipe.card.closest('.ri-wrap');
    if (wrap) wrap.style.setProperty('--swipe-glow', Math.min(1, Math.abs(clamped) / RI_SWIPE_MAX));
  }
}

function riTouchEnd(e) {
  if (!_riSwipe || _riSwipe.dir !== 'h') { _riSwipe = null; return; }
  const card = _riSwipe.card;
  card.style.transition = 'transform .2s ease';
  // Gerçek bir yatay hareket olduysa (ne kadar küçük olursa olsun), bunu takip eden
  // "click" olayını görmezden gel — bir swipe denemesi asla kart seçimine dönüşmemeli.
  if (Math.abs(_riSwipe.dx) > 5) card.dataset.justSwiped = '1';
  card.classList.remove('swiped-open-left', 'swiped-open-right');
  const wrap = card.closest('.ri-wrap');
  if (_riSwipe.dx <= -RI_SWIPE_THRESHOLD) {
    card.style.transform = `translateX(${-RI_SWIPE_MAX}px)`;
    card.classList.add('swiped-open-right'); // sağdaki (Sil/Gizle) panel açık
    if (wrap) wrap.style.setProperty('--swipe-glow', 1);
    _riOpenCard = card;
  } else if (_riSwipe.dx >= RI_SWIPE_THRESHOLD) {
    card.style.transform = `translateX(${RI_SWIPE_MAX}px)`;
    card.classList.add('swiped-open-left'); // soldaki (Değiştir) panel açık
    if (wrap) wrap.style.setProperty('--swipe-glow', 1);
    _riOpenCard = card;
  } else {
    card.style.transform = 'translateX(0)';
    if (wrap) { wrap.style.transition = 'opacity .2s ease'; wrap.style.setProperty('--swipe-glow', 0); }
    if (_riOpenCard === card) _riOpenCard = null;
  }
  _riSwipe = null;
}

function riCardClick(e, id) {
  const card = e.currentTarget;
  if (card.classList.contains('swiped-open-left') || card.classList.contains('swiped-open-right')) {
    riCloseOpenCard();
    return;
  }
  if (card.dataset.justSwiped === '1') {
    delete card.dataset.justSwiped;
    return;
  }
  sel(id);
}

// Sayfa bfcache'den (geri/ileri önbelleği) geri geldiğinde önceki kaydırma durumu
// donmuş halde kalabiliyor (özellikle ilk kartın "silmeye hazır" görünmesi). Her
// pageshow'da (hem normal yükleme hem bfcache restore) temiz duruma sıfırla.
window.addEventListener('pageshow', () => {
  document.querySelectorAll('.ri.swiped-open-left, .ri.swiped-open-right').forEach(card => {
    card.classList.remove('swiped-open-left', 'swiped-open-right');
    card.style.transition = 'none';
    card.style.transform = 'translateX(0)';
    delete card.dataset.justSwiped;
    const wrap = card.closest('.ri-wrap');
    if (wrap) wrap.style.setProperty('--swipe-glow', 0);
  });
  _riOpenCard = null;
  _riSwipe = null;
});

// "Diğer İşlemler" menüsü dışına tıklanınca kapat
document.addEventListener('click', (e) => {
  document.querySelectorAll('.ov-menu[open]').forEach(d => {
    if (!d.contains(e.target)) d.removeAttribute('open');
  });
  if (_riOpenCard && !_riOpenCard.contains(e.target)) riCloseOpenCard();
});

// WL/WLIST'i verilen works satırlarından (yerel ya da sunucu) sıfırdan kurar.
// Her çağrıda resetler ki local→sunucu tazelemesinde WLIST'te çift kayıt olmasın.
function _applyWorksRows(rows) {
  WL = {}; WLIST = [];
  (rows||[]).forEach(w => {
    const id = String(w.id);
    WL[id] = { name: w.name||'', composer: w.composer||'', makam: w.makam||'', instrument: w.instrument||'', closingNote: w.closing_note||'', lyrics: w.lyrics||'' };
    WLIST.push({ id, name: w.name||'', composer: w.composer||'', makam: w.makam||'' });
  });
  // customWorks patch (yerel override'lar)
  try {
    const customs = JSON.parse(localStorage.getItem('customWorks') || '[]');
    const deleted = JSON.parse(localStorage.getItem('deletedWorks') || '[]');
    deleted.forEach(function(did){ var sid=String(parseInt(did)); delete WL[sid]; for(var j=WLIST.length-1;j>=0;j--){if(WLIST[j].id===sid){WLIST.splice(j,1);break;}} });
    customs.forEach(function(w){ var sid=String(parseInt(w.id)); if(WL[sid]){if(w.name)WL[sid].name=w.name;if(w.lyrics!==undefined)WL[sid].lyrics=w.lyrics;} else WL[sid]={name:w.name||'',lyrics:w.lyrics||'',composer:w.composer||'',makam:w.makam||'',instrument:w.instrument||'',closingNote:w.closingNote||''}; var found=false; for(var k=0;k<WLIST.length;k++){if(WLIST[k].id===sid){if(w.name)WLIST[k].name=w.name;found=true;break;}} if(!found)WLIST.push({id:sid,name:w.name||'',composer:w.composer||'',makam:w.makam||''}); });
  } catch(e) {}
}

async function loadWorksData() {
  // ── 1) ÖNCE LOCAL (IndexedDB): WL'i anında doldur, beklemeden çiz ──
  //     Böylece eser adları/güftesi ağ beklemeden gelir; "#37" görünmez.
  if (window.db) {
    try {
      const localRows = await db.works.getAll();
      if ((localRows||[]).length) {
        _applyWorksRows(localRows);
        try { renderList(); renderDetail(); } catch(e) {}
      }
    } catch(e) { console.warn('[repertoires] works local okuma hatası:', e); }
  }
  // ── 2) ARKA PLANDA sunucudan tazele (asılı kalmasın diye kısa timeout) ──
  try {
    const r = await fetch(SUPA_URL+'/rest/v1/works?order=name&limit=2000', {
      // [A] works liste okumasi bilerek anon — 2026-07-17'de token dolunca eser
      // adlari kaybolup yerine numara ciktigi icin.
      headers: anonHeaders(),
      signal: AbortSignal.timeout(3500)
    });
    if (!r.ok) throw new Error('works fetch '+r.status);
    const rows = await r.json();
    if ((rows||[]).length) {
      if (window.db) { try { await db.works.saveAll(rows); } catch(e) {} }
      _applyWorksRows(rows);
      try { renderList(); renderDetail(); } catch(e) {}
    }
  } catch(fetchErr) {
    // Sunucudan tazeleyemedik — sorun değil, WL zaten local'den dolu.
    console.warn('[repertoires] Works sunucudan tazelenemedi, local kullanılıyor:', fetchErr.message);
  }
}
let reps=[], selId=null, editId=null, selWId=null, addRepId=null, activeItemIdx=null, activeItemRepId=null;

function dbg(msg){ /* debug removed */ }

function sync(s,t){const d=document.getElementById('dot');const sl=document.getElementById('sl');if(d)d.className='dot '+s;if(sl)sl.textContent=t;}
function toast(m,t='ok'){const e=document.createElement('div');e.className='toast '+t;e.textContent=m;document.body.appendChild(e);setTimeout(()=>e.remove(),2500);}

let SOLISTLER = []; // sanatçı listesi

// ── Grup rolü: grup owner/admin'i, sahibi olmasa da grup repertuvarını yönetebilir ──
// (sunucuda karşılığı: repertoires_group_write + items_group_manage politikaları)
// localStorage'da tutuluyor ki çevrimdışı/ilk çizimde düğmeler kaybolmasın.
let MY_GROUP_ROLE = localStorage.getItem('myGroupRole') || null;
function isGroupManager(){ return MY_GROUP_ROLE==='owner' || MY_GROUP_ROLE==='admin'; }
async function loadMyGroupRole(){
  const uid=getUserId(), gid=getGroupId();
  if(!uid||!gid){ MY_GROUP_ROLE=null; localStorage.removeItem('myGroupRole'); return; }
  try{
    const rows=await dbGet('group_members','select=role&user_id=eq.'+uid+'&group_id=eq.'+gid, AbortSignal.timeout(3500));
    const role=(rows&&rows[0]&&rows[0].role)||null;
    if(role){ MY_GROUP_ROLE=role; localStorage.setItem('myGroupRole',role); }
  }catch(e){ /* rolü tazeleyemedik — localStorage'daki son değerle devam */ }
}

function applyRepsData(r, i, s) {
  SOLISTLER = (s||[]).map(x=>x.name).filter(Boolean);
  const uid = getUserId() || '';
  const myGid = getGroupId() || '';
  // linkedPrev: ilk satırda her zaman false — zincir listenin başında başlayamaz.
  // canManage: sahibiyim VEYA bu benim grubumun repertuvarı ve ben grup owner/admin'iyim.
  // Silme buna DAHİL DEĞİL — silme sahibinde kalır (RLS'te de öyle).
  reps = (r||[]).map(x=>({...x, isOwner: x.owner_id===uid || x.user_id===uid, canManage: (x.owner_id===uid || x.user_id===uid) || (isGroupManager() && !!x.group_id && x.group_id===myGid), items:(i||[]).filter(t=>t.repertoire_id===x.id).sort((a,b)=>a.seq-b.seq).map((t,ix)=>({...t,workId:String(t.work_id),closingNote:t.closing_note||'',performer:t.performer||'',linkedPrev: ix>0 && !!t.linked_prev}))}));
}

function selectUrlRepIfPresent() {
  const urlRep=new URLSearchParams(window.location.search).get('rep');
  if(urlRep&&reps.find(x=>x.id===urlRep)){selId=urlRep;}
}

async function load(){
  dbg('load() başladı');
  let localHadData = false;
  loadMyGroupRole(); // fire-and-forget: rol gelince bir sonraki çizimde düğmeler doğrulanır

  // ── 1) ÖNCELİKLE LOCAL'DEN ANINDA GÖSTER (sinyal zayıf/yokken bile beklemeden) ──
  if (window.db) {
    try {
      const [rLocal, iLocal, sLocal] = await Promise.all([
        db.repertoires.getAll(),
        db.repertoire_items.getAll(),
        db.solistler.getAll()
      ]);
      if ((rLocal||[]).length) {
        applyRepsData(rLocal, iLocal, sLocal);
        localHadData = true;
        sync('ok','Yerel veri');
        selectUrlRepIfPresent();
        renderList(); renderDetail();
        setTimeout(fixMobileHeight, 100);
        dbg('local\'den anında gösterildi: '+rLocal.length+' repertuvar');
      }
    } catch(e) { dbg('local okuma hatası: '+e.message); }
  }
  if (!localHadData) sync('spin','Yükleniyor...');

  // ── 2) ARKA PLANDA SUNUCUYLA SENKRONİZE ET (timeout'lu — asılı kalmasın) ──
  try{
    const uid2 = getUserId();
    const gid = getGroupId();
    const repQuery = gid
      ? 'order=created_at&limit=100&or=(owner_id.eq.'+uid2+',group_id.eq.'+gid+',is_public.eq.true)'
      : (uid2
        ? 'order=created_at&limit=100&or=(owner_id.eq.'+uid2+',is_public.eq.true)'
        : 'order=created_at&limit=100&is_public=eq.true');
    const solQuery = gid ? 'order=name&group_id=eq.'+gid : 'order=name';
    // Yerel veri zaten ekrandaysa uzun beklemeye gerek yok — 3.5 sn'de gelmezse
    // sessizce local ile devam. Yerel veri yoksa ağa biraz daha şans ver (4.5 sn).
    const timeoutMs = localHadData ? 3500 : 4500;
    const [r,i,s] = await Promise.all([
      dbGet('repertoires', repQuery, AbortSignal.timeout(timeoutMs)),
      dbGet('repertoire_items','order=seq', AbortSignal.timeout(timeoutMs)),
      dbGet('solistler', solQuery, AbortSignal.timeout(timeoutMs))
    ]);
    dbg('sunucudan geldi — rep sayısı: '+(r||[]).length+' | items: '+(i||[]).length);
    if (window.db) {
      await db.repertoires.replaceAll(r||[]);
      await db.solistler.replaceAll(s||[]);
      await db.repertoire_items.replaceAll(i||[]);
    }
    applyRepsData(r, i, s);
    sync('ok','Senkronize');
    selectUrlRepIfPresent();
    if (!_riSwipe && !_riOpenCard) { renderList(); renderDetail(); }
    setTimeout(fixMobileHeight, 100);
  }catch(fetchErr){
    dbg('sunucu senkronizasyonu başarısız (offline/zayıf sinyal): '+fetchErr.message);
    if (!localHadData) {
      // Local'de de veri yoktu, ağ da başarısız oldu — boş liste göster
      renderList(); renderDetail();
    }
    // navigator.onLine === false → cihaz GERÇEKTEN çevrimdışı (güvenilir negatif sinyal).
    // Online'ken sync sadece timeout olduysa yerel veri zaten ekranda; kullanıcıyı
    // "çevrimdışısın" diye yanıltma.
    const reallyOffline = (navigator.onLine === false);
    if (localHadData) {
      sync('ok', reallyOffline ? 'Çevrimdışı — yerel veri' : 'Senkronize edilemedi');
    } else {
      sync('err', reallyOffline ? 'Çevrimdışı' : 'Bağlantı hatası');
    }
    if (reallyOffline) toast('📵 Çevrimdışı mod — yerel veriler gösteriliyor', 'ok');
  }
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

function getHiddenRepIds() {
  try { return JSON.parse(localStorage.getItem('hiddenRepIds') || '[]'); }
  catch (e) { return []; }
}
function hideRepFromView(id) {
  const hidden = getHiddenRepIds();
  if (!hidden.includes(id)) hidden.push(id);
  localStorage.setItem('hiddenRepIds', JSON.stringify(hidden));
  toast('Görünümünden kaldırıldı');
  renderList();
}

function renderList(){
  const el=document.getElementById('list');
  if(!reps.length){el.innerHTML='<div style="padding:30px 16px;text-align:center;color:var(--text3);">Henüz repertuvar yok</div>';return;}
  const filtered = reps.filter(r=>repMatchesSearch(r, repSearchQuery));
  if(repSearchQuery && !filtered.length){el.innerHTML='<div style="padding:30px 16px;text-align:center;color:var(--text3);">"'+repSearchQuery+'" için sonuç bulunamadı</div>';return;}
  const sl={concept:'Taslak',confirmed:'Onaylandı',archive:'Arşiv'};
  const sc={concept:'sc',confirmed:'sf',archive:'sa'};
  const hiddenIds = getHiddenRepIds();
  // BÖLÜMLEME ÖNCELİĞİ: grup > sahip > public (en özel ilişki kazanır).
  // Grubuma ait bir repertuvar, KİM oluşturmuş olursa olsun (kurucu/admin dahil)
  // "Grubun Repertuvarları" altında toplanır — grup işi tek yerde dursun.
  // "Repertuvarlarım" = yalnızca gruba bağlı OLMAYAN kişisel repertuvarlarım.
  // Her kayıt tek bölümde çıkar; kart içeriği/kaydırma davranışı hâlâ isOwner'a bakar.
  const myGid   = getGroupId();
  const inGroup = r => !!myGid && !!r.group_id && r.group_id === myGid;
  const mine = filtered.filter(r => r.isOwner && !inGroup(r));
  const grp  = filtered.filter(r => inGroup(r) && (r.isOwner || !hiddenIds.includes(r.id)));
  const pub  = filtered.filter(r => !r.isOwner && r.is_public && !inGroup(r) && !hiddenIds.includes(r.id));
    // POTPURİ sayacı — repertuvarda kaç ayrı zincir var (ardışık linkedPrev blokları)
  function medleyCount(r){
    const its=r.items||[]; let n=0;
    for(let i=1;i<its.length;i++){ if(its[i].linkedPrev && !its[i-1].linkedPrev) n++; }
    return n;
  }
  function repCard(r, _zi){
    const mc = medleyCount(r);
    const medleyChip = mc ? `<span class="rep-medley" title="${mc===1?'Bu repertuvarda bir potpuri var':'Bu repertuvarda '+mc+' potpuri var'}">🔗${mc>1?' '+mc:''}</span>` : '';
    const touchAttrs = `ontouchstart="riTouchStart(event)" ontouchmove="riTouchMove(event)" ontouchend="riTouchEnd(event)" ontouchcancel="riTouchEnd(event)"`;
    const cardHtml = `<div class="ri${selId===r.id?' active':''}" onclick="riCardClick(event,'${r.id}')" ${touchAttrs}>
      <div><div class="rn">${r.name}${r.is_public&&r.isOwner?' <i class="ti ti-world" style="font-size:12px;color:#4ade80;vertical-align:-1px;" title="Herkese açık" aria-hidden="true"></i>':''}</div>
      <div class="rm"><span class="sp ${sc[r.status]||'sc'}">${sl[r.status]||'Taslak'}</span>${medleyChip}${r.date?'<span>'+r.date+'</span>':''}</div></div>
      <div class="rc">${(r.items||[]).length} eser</div>
    </div>`;
    // Kendi repertuvarında: gerçekten SİL (kırmızı). Başkasınınkinde: sadece kendi
    // görünümünden GİZLE (mavi) — orijinal veriye, sahibine ya da gruba hiç dokunmuyor.
    // Sağa kaydırınca (her ikisinde de) DEĞİŞTİR (mavi, sol) — kartı tıklamakla aynı.
    const editBg = `<div class="ri-edit-bg" onclick="event.stopPropagation();riCloseOpenCard();sel('${r.id}')"><i class="ti ti-edit"></i>Değiştir</div>`;
    if (r.isOwner) {
      return `<div class="ri-wrap">
        ${editBg}
        <div class="ri-delete-bg" onclick="event.stopPropagation();riCloseOpenCard();delRep('${r.id}')"><i class="ti ti-trash"></i>Sil</div>
        ${cardHtml}
      </div>`;
    }
    return `<div class="ri-wrap">
      ${editBg}
      <div class="ri-delete-bg ri-hide-bg" onclick="event.stopPropagation();riCloseOpenCard();hideRepFromView('${r.id}')"><i class="ti ti-eye-off"></i>Gizle</div>
      ${cardHtml}
    </div>`;
  }
  let html = '';
  if(mine.length){
    html += '<div style="padding:8px 12px 4px;font-size:17px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;"><i class="ti ti-playlist" style="font-size:16px;vertical-align:-2px;" aria-hidden="true"></i> Repertuvarlarım</div>';
    html += mine.map(repCard).join('');
  }
  if(grp.length){
    html += '<div style="padding:12px 12px 4px;font-size:17px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;border-top:1px solid var(--border);margin-top:8px;"><i class="ti ti-users-group" style="font-size:16px;vertical-align:-2px;" aria-hidden="true"></i> Grubun Repertuvarları</div>';
    html += grp.map(repCard).join('');
  }
  if(pub.length){
    html += '<div style="padding:12px 12px 4px;font-size:17px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;border-top:1px solid var(--border);margin-top:8px;"><i class="ti ti-world" style="font-size:16px;vertical-align:-2px;" aria-hidden="true"></i> Genel Repertuvarlar</div>';
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
  // ── POTPURİ: zincir hesapları (linkedPrev ardışık satır zinciri) ──
  // Sıra numarası yalnızca zincir BAŞLARINDA artar; devam satırları "↳" gösterir.
  let _medleyN = 0;
  for(let i=1;i<items.length;i++){ if(items[i].linkedPrev && !items[i-1].linkedPrev) _medleyN++; }
  const _no = []; let _n = 0;
  items.forEach((it,ix)=>{ if(!(ix>0 && it.linkedPrev)) _n++; _no[ix] = (ix>0 && it.linkedPrev) ? null : _n; });
  const _canM = !!rep.canManage;
  const rows=items.length?items.map((it,idx)=>{
    const w=WL[it.workId]||{};
    const cn=it.closingNote||w.closingNote||'';
    const pf = it.performer || '';
    const isActive = activeItemRepId===rep.id && activeItemIdx===idx;
    const linked   = idx>0 && !!it.linkedPrev;                 // öncekine bağlı mı
    const hasNext  = !!(items[idx+1] && items[idx+1].linkedPrev); // sonraki bu satıra bağlı mı
    const inChain  = linked || hasNext;
    const chainCls = inChain ? (linked && hasNext ? ' medley-mid' : (linked ? ' medley-end' : ' medley-head')) : '';
    const rowClasses=[idx%2===1?'zebra-tr':'',isActive?'item-active':'',inChain?'medley-row':'',chainCls.trim()].filter(Boolean).join(' ');
    return `<tr ${_canM?`draggable="true" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondrop="dragDrop(event)" ondragend="dragEnd(event)"`:''} data-idx="${idx}" data-rep="${rep.id}" style="touch-action:pan-y;"${rowClasses?' class="'+rowClasses+'"':''}>
      <td class="sq" style="text-align:center;user-select:none;padding:0 2px;vertical-align:middle;width:48px;">
        <div style="display:flex;align-items:center;justify-content:center;gap:3px;">
          <span style="color:${isActive?'var(--accent)':(linked?'var(--accent2)':'var(--text3)')};font-size:11px;font-weight:${isActive?'700':'600'};min-width:16px;" title="${linked?'Potpuri — bir öncekiyle kesintisiz':''}">${isActive?'▶ ':''}${linked?'↳':_no[idx]}</span>
          ${_canM?`<span class="drag-handle" ontouchstart="touchDragStart(event)" ontouchmove="touchDragMove(event)" ontouchend="touchDragEnd(event)">⠿</span>`:''}
        </div>
      </td>
      <td style="padding-left:16px;cursor:pointer;" onclick="openLyricsSheet('${it.workId}')" title="Sözleri göster">
        <div class="wn">${linked?'<span class="medley-chip" title="Potpuri devamı">🔗</span> ':''}${w.name||'#'+it.workId}</div>
        <div class="ws">${[w.makam,w.composer].filter(Boolean).join(' · ')}</div>
        ${pf ? '<div style="font-size:11px;color:var(--accent);margin-top:2px;">🎤 '+pf+'</div>' : ''}
      </td>
      <td class="col-kapanis">${cn?'<span class="cn">'+cn+'</span>':''}</td>
      <td class="col-not" style="color:var(--text3);font-size:12px;">${it.note||''}</td>
      <td>${_canM?`<div class="ra">
        <button class="br${activeItemRepId===rep.id&&activeItemIdx===idx?' active':''}" onclick="mvActive('${rep.id}',${idx},-1)" ${idx===0?'disabled':''}>↑</button>
        <button class="br${activeItemRepId===rep.id&&activeItemIdx===idx?' active':''}" onclick="mvActive('${rep.id}',${idx},1)" ${idx===items.length-1?'disabled':''}>↓</button>
        <button class="br bl${linked?' linked':''}" onclick="toggleLink('${rep.id}','${it.id}')" ${idx===0?'disabled':''} title="${linked?'Potpuri bağını çöz':'Bir öncekiyle potpuri yap (kesintisiz devam)'}">🔗</button>
        <button class="br be" onclick="openItemEdit('${rep.id}','${it.id}')"><i class="ti ti-edit" aria-hidden="true"></i></button>
        <button class="br dl" onclick="rmItem('${rep.id}','${it.id}','${(w.name||'Bu eser').replace(/'/g,"\\'")}')"><i class="ti ti-trash" aria-hidden="true"></i></button>
      </div>`:''}</td>
    </tr>`;
  }).join(''):`<tr><td colspan="5" class="ei">Henüz eser eklenmedi.</td></tr>`;

  dc.innerHTML=`
    <div class="dh" style="padding:10px 14px 8px;">
      <div class="mobile-back-btn" onclick="goBackToList()" style="display:none;margin:-10px -14px 8px;padding:8px 14px;" id="mobileBackBtn">← Repertuvar Listesi</div>
      <div class="dn" style="font-size:14px;font-weight:600;line-height:1.4;word-break:break-word;margin-bottom:8px;">${rep.name}</div>
      <div class="cta-row">
        <a href="stage.html" class="bstage-primary" onclick="localStorage.setItem('stageRepId','${rep.id}');localStorage.setItem('stageSource','repertoires');localStorage.setItem('stageShowChords','0')"><i class="ti ti-microphone" style="font-size:15px;" aria-hidden="true"></i> Sahneye Çık</a>
        ${rep.canManage && (rep.items||[]).length>2 ? `<button class="bi" style="font-size:12px;padding:9px 12px;" onclick="openSortSheet('${rep.id}')" title="Makam geçişlerine göre sıralama önerisi">🎼 Sırala</button>` : ''}
        ${rep.canManage ? `
        <details class="ov-menu">
          <summary class="bi" style="font-size:12px;padding:9px 12px;">⋯ Diğer</summary>
          <div class="ov-menu-body">
            <button onclick="openEdit('${rep.id}')"><i class="ti ti-edit" aria-hidden="true"></i> Düzenle</button>
            <button onclick="shareRep('${rep.id}')"><i class="ti ti-share" aria-hidden="true"></i> Paylaş</button>
            <button onclick="printR('${rep.id}')"><i class="ti ti-printer" aria-hidden="true"></i> Yazdır</button>
            <button onclick="copyRep('${rep.id}')"><i class="ti ti-copy" aria-hidden="true"></i> Kopyala</button>
            ${rep.isOwner ? `<button class="ov-danger" onclick="delRep('${rep.id}')"><i class="ti ti-trash" aria-hidden="true"></i> Sil</button>` : ''}
          </div>
        </details>
        ` : `
        <button class="baw" style="font-size:12px;padding:9px 12px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;" onclick="copyRep('${rep.id}')"><i class="ti ti-copy" style="font-size:14px;" aria-hidden="true"></i> Kopyala</button>
        `}
      </div>
      <div class="dmr" style="gap:8px;padding-bottom:4px;flex-wrap:nowrap;overflow-x:auto;">
        <div class="mc"><span class="sp ${sc[rep.status]||'sc'}">${sl[rep.status]||'Taslak'}</span></div>
        ${_medleyN?`<div class="mc"><span class="rep-medley" title="Potpuri: kesintisiz çalınan eser zinciri">🔗 ${_medleyN} Potpuri</span></div>`:''}
        ${rep.date?`<div class="mc" style="white-space:nowrap;">📅 <strong>${rep.date}</strong>${rep.venue?` &nbsp;📍 <strong>${rep.venue}</strong>`:''}</div>`:''}
        ${!rep.date&&rep.venue?`<div class="mc" style="white-space:nowrap;">📍 <strong>${rep.venue}</strong></div>`:''}
        ${rep.isOwner?`<div class="mc">${visChip(rep)}</div>`:''}
        ${rep.notes?`<div class="mc" style="color:var(--text3);white-space:nowrap;display:flex;align-items:center;gap:4px;"><i class="ti ti-pencil-plus" style="font-size:13px;" aria-hidden="true"></i> ${rep.notes}</div>`:''}
      </div>
    </div>
    <div class="is">
      <div class="ih"><h3>${items.length} Eser</h3>${rep.canManage?`<button class="baw" onclick="openWM('${rep.id}')">+ Eser Ekle</button>`:''}</div>
      <table><thead><tr><th class="sq" style="text-align:center;">Sıra</th><th>Eser Adı</th><th class="col-kapanis">Kapanış</th><th class="col-not">Not</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
}

// (2026-08-05) Karttaki görünürlük çipi ikili (Public/Private) kalmıştı — modaldaki
// üçlü seçimle (Kişisel/Grup/Genel) uyumsuzdu ve grup repertuvarı "🔒 Private"
// görünüyordu. Artık çip GERÇEK durumu gösteriyor. Tıklayınca doğrudan yayına
// almak yerine düzenleme modalı açılıyor: yanlış paylaşım geri alınamaz (içerik
// görülmüş olur), bu yüzden tek dokunuşla herkese açma bilerek kaldırıldı.
function visChip(rep){
  const v = rep.is_public ? 'public' : (rep.group_id ? 'group' : 'private');
  // İkonlar Tabler setinden (projenin standardı) — emoji KULLANILMIYOR.
  // ti-users-group, sol menüdeki "Grup / Koro" öğesiyle AYNI ikon (topnav.js:651).
  const map = {
    public:  ['pub',  'ti-world', 'Genel',   'Herkese açık — değiştirmek için tıkla'],
    group:   ['grp',  'ti-users-group', 'Grup',    'Grup üyeleri görebilir — değiştirmek için tıkla'],
    private: ['priv', 'ti-lock',  'Kişisel', 'Yalnızca sen görebilirsin — değiştirmek için tıkla']
  };
  const [cls,icon,label,title] = map[v];
  return `<span class="chip-vis ${cls}" onclick="openEdit('${rep.id}')" title="${title}"><i class="ti ${icon}" style="font-size:13px;" aria-hidden="true"></i> ${label}</span>`;
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
      body:JSON.stringify({name:rep.name+' (kopya)',status:'concept',user_id:uid,owner_id:uid,is_public:false,group_id:null})
    });
    if(!r.ok)throw new Error(await r.text());
    const [newRep]=await r.json();
    // Eserleri kopyala
    if(rep.items&&rep.items.length){
      await fetch(SUPA_URL+'/rest/v1/repertoire_items',{
        method:'POST',
        headers:{...H,'Prefer':'return=minimal'},
        body:JSON.stringify(rep.items.map((it,i)=>({repertoire_id:newRep.id,work_id:parseInt(it.workId),seq:i+1,closing_note:it.closingNote||null,note:it.note||null,performer:it.performer||null,linked_prev:i>0&&!!it.linkedPrev})))
      });
    }
    toast('📋 Repertuvar kopyalandı!');
    await load();
    selId=newRep.id;
    renderList();renderDetail();
  }catch(e){sync('err','Hata');toast(e.message,'er');}
}

// ── Görünürlük seçimi: Kişisel / Grup / Genel ──────────────────────────────
// Kişisel = group_id boş, is_public false  → yalnızca sahibi görür
// Grup    = group_id benim grubum          → grup üyeleri görür
// Genel   = is_public true (+ grubum)      → herkes görür, üyeler GRUBUN altında
function applyVisOptions(){ const gl=document.getElementById('visGroupLabel'); if(gl) gl.style.display = getGroupId() ? 'flex' : 'none'; }
function setVisChoice(v){ if(v==='group' && !getGroupId()) v='private'; const el=document.getElementById(v==='public'?'fVisPublic':(v==='group'?'fVisGroup':'fVisPrivate')); if(el) el.checked=true; }
function getVisChoice(){ const el=document.querySelector('input[name="fVisibility"]:checked'); return el?el.value:'private'; }

function openNew(){editId=null;document.getElementById('rmt').textContent='Yeni Repertuvar';['fN','fD','fV','fNo'].forEach(x=>document.getElementById(x).value='');document.getElementById('fS').value='concept';applyVisOptions();setVisChoice(getGroupId()?'group':'private');document.getElementById('rm').style.display='flex';setTimeout(()=>document.getElementById('fN').focus(),50);}
function openEdit(id){const r=getRep(id);if(!r)return;editId=id;document.getElementById('rmt').textContent='Düzenle';document.getElementById('fN').value=r.name;document.getElementById('fD').value=r.date||'';document.getElementById('fV').value=r.venue||'';document.getElementById('fS').value=r.status||'concept';document.getElementById('fNo').value=r.notes||'';applyVisOptions();setVisChoice(r.is_public?'public':(r.group_id?'group':'private'));document.getElementById('rm').style.display='flex';}
function closeRM(){document.getElementById('rm').style.display='none';}

async function saveRep(){
  const name=document.getElementById('fN').value.trim();
  if(!name){document.getElementById('fN').focus();return;}
  const vis=getVisChoice();
  const myGid=getGroupId()||null;
  const isPublic=(vis==='public');
  // Kişiselde group_id BOŞ yazılır — düzenlemede de gönderiliyor ki bir repertuvar
  // sonradan gruba taşınabilsin ya da gruptan geri çekilebilsin.
  const groupId=(vis==='private')?null:myGid;
  const data={name,date:document.getElementById('fD').value||null,venue:document.getElementById('fV').value.trim()||null,status:document.getElementById('fS').value,notes:document.getElementById('fNo').value.trim()||null,is_public:isPublic,group_id:groupId,user_id:getUserId()||undefined,owner_id:editId?undefined:(getUserId()||undefined)};
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
  const matches = SOLISTLER.filter(n => trMatch(n, q) && !pfSelected.includes(n));
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
  const q=document.getElementById('ws').value.trim();
  // Türkçe duyarsız: "Gülşen" kaydı "gulsen", "Çeşm-i" kaydı "cesmi" ile bulunur.
  const list=q?WLIST.filter(w=>trMatch((w.name||'')+' '+(w.composer||'')+' '+(w.makam||''), q)):WLIST;
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

// ── SÖZ PENCERESİ (2026-08-06) ────────────────────────────────────────
// Repertuvar satırındaki esere tıklayınca sözü OKUMA amaçlı gösterir.
// Düzenleme burada YOK — satırın sağındaki kalem düğmesi zaten o iş için.
// Veri `WL` önbelleğinden geliyor (lyrics orada zaten yükleniyor), ek istek yok.
function _lycEsc(t){ return (t==null?'':String(t)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function openLyricsSheet(workId){
  const w = WL[String(workId)] || {};
  let ov = document.getElementById('lycOverlay');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'lycOverlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9998;display:none;align-items:center;justify-content:center;padding:20px;';
    ov.onclick = (e)=>{ if(e.target===ov) closeLyricsSheet(); };
    ov.innerHTML = `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;max-width:620px;width:100%;max-height:82vh;display:flex;flex-direction:column;box-shadow:0 18px 48px rgba(0,0,0,.5);">
        <div style="display:flex;align-items:flex-start;gap:12px;padding:16px 18px 12px;border-bottom:1px solid var(--border);">
          <div style="flex:1;min-width:0;">
            <div id="lycName" style="font-size:16px;font-weight:700;color:var(--text);line-height:1.35;"></div>
            <div id="lycMeta" style="font-size:12px;color:var(--text3);margin-top:3px;"></div>
          </div>
          <button onclick="closeLyricsSheet()" aria-label="Kapat" style="background:none;border:none;color:var(--text3);font-size:22px;line-height:1;cursor:pointer;padding:0 2px;">×</button>
        </div>
        <div id="lycBody" style="padding:16px 18px 20px;overflow:auto;font-size:15px;line-height:1.85;color:var(--text);white-space:pre-wrap;"></div>
      </div>`;
    document.body.appendChild(ov);
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeLyricsSheet(); });
  }
  document.getElementById('lycName').textContent = w.name || ('#'+workId);
  document.getElementById('lycMeta').textContent =
    [w.makam, w.composer, w.closingNote ? 'Karar: '+w.closingNote : ''].filter(Boolean).join(' · ');
  const body = document.getElementById('lycBody');
  const t = (w.lyrics||'').trim();
  body.innerHTML = t
    ? _lycEsc(t)
    : '<span style="color:var(--text3);font-size:13px;">Bu eser için söz eklenmemiş.</span>';
  body.scrollTop = 0;
  ov.style.display = 'flex';
}

function closeLyricsSheet(){
  const ov = document.getElementById('lycOverlay');
  if(ov) ov.style.display = 'none';
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


// ═══════════════════════════════════════════════════════════════════════════
// MAKAMA GÖRE SIRALAMA MOTORU — 2026-07-19
// Kurgu: iki ardışık eser arasına bir GEÇİŞ MALİYETİ verilir, toplam maliyeti
// en düşük dizilim aranır. Sonuç doğrudan uygulanmaz — önizleme çıkar, sen
// onaylarsın.
//
// Kurallar:
//   • Potpuri zincirleri TEK ATOM — bölünmez, blok olarak yerleşir.
//   • Açılış eseri (ilk atom) yerinde kalır — repertuvarın girişi senin kararın.
//   • Makamı tanınmayan eserler SABİT kalır; diğerleri onların arasına dizilir.
//   • Karar sesi önceliği: repertuvar satırındaki kapanış > eserin kapanışı >
//     makamın kuramsal kararı. Üstüne eserin ton kaydırması (transpose) eklenir.
// ═══════════════════════════════════════════════════════════════════════════

let MAKAMS = {};          // norm(ad|alias) -> {ad, aile, kararLatin, ...}
let MAKAMS_OK = false;    // makams tablosu yüklendi mi
let TRANSPOSE_R = {};     // work_id -> yarım ton

const _TRMAP = {'Â':'A','Î':'I','Û':'U','â':'a','î':'i','û':'u','İ':'I','ı':'i',
                'Ş':'S','ş':'s','Ğ':'G','ğ':'g','Ü':'U','ü':'u','Ö':'O','ö':'o','Ç':'C','ç':'c'};
// SQL'deki makam_norm() ile AYNI sonucu verir
function makamNorm(t){
  return (t||'').split('').map(c=>_TRMAP[c]||c).join('').toLowerCase().replace(/[^a-z0-9]/g,'');
}

const _PC = {'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,'E':4,'F':5,'F#':6,'GB':6,
             'G':7,'G#':8,'AB':8,'A':9,'A#':10,'BB':10,'B':11};
// Solfej + perde adları → pitch class. Perdeler yaklaşık karşılıktır (koma sesleri
// 12 eşit aralığa oturmaz) — yalnızca sıralama hesabında kullanılır.
const _PC_TR = {
  'do':0,'reb':1,'re':2,'mib':3,'mi':4,'fa':5,'fad':6,'sol':7,'lab':8,'la':9,'sib':10,'si':11,
  'rast':7,'dugah':9,'segah':11,'cargah':0,'neva':2,'huseyni':4,'acem':5,'evic':6,
  'gerdaniye':7,'yegah':2,'muhayyer':9,'tizsegah':11,'acemasiran':5,'hicaz':10,'kurdi':10
};
function pitchOf(txt){
  if(!txt) return null;
  const raw=String(txt).trim().replace('♭','b').replace('♯','#');
  const up=raw.toUpperCase().replace(/\s+/g,'');
  if(_PC[up]!==undefined) return _PC[up];
  const n=makamNorm(raw);
  if(_PC_TR[n]!==undefined) return _PC_TR[n];
  return null;
}

async function loadMakams(){
  try{
    const rows=await dbGet('makams','select=ad,aile,karar_perde,karar_latin,guclu_perde,seyir,aliases');
    MAKAMS={};
    (rows||[]).forEach(m=>{
      const rec={ad:m.ad,aile:m.aile||'',kararPerde:m.karar_perde||'',karar:pitchOf(m.karar_latin||m.karar_perde)};
      MAKAMS[makamNorm(m.ad)]=rec;
      (m.aliases||[]).forEach(a=>{ const k=makamNorm(a); if(k && !MAKAMS[k]) MAKAMS[k]=rec; });
    });
    MAKAMS_OK=Object.keys(MAKAMS).length>0;
  }catch(e){ MAKAMS_OK=false; }
  // Kişisel ton kaydırmaları (varsa) — karar sesi hesabı kaydırılmış hâli kullanır
  try{
    const uid=getUserId();
    if(uid){
      const pc=await dbGet('personal_chords','select=work_id,transpose&user_id=eq.'+uid);
      TRANSPOSE_R={}; (pc||[]).forEach(r=>{ if(r.transpose) TRANSPOSE_R[String(r.work_id)]=r.transpose; });
    }
  }catch(e){ TRANSPOSE_R={}; }
}

// Bir repertuvar satırının makam/karar profili
function workProfile(it){
  const w=WL[it.workId]||{};
  const mk=MAKAMS[makamNorm(w.makam)]||null;
  const tr=TRANSPOSE_R[String(it.workId)]||0;
  // Karar önceliği: satır kapanışı > eser kapanışı > makamın kuramsal kararı
  let base=pitchOf(it.closingNote); if(base===null) base=pitchOf(w.closingNote);
  if(base===null||base===undefined) base=mk?mk.karar:null;
  const karar=(base===null||base===undefined)?null:(((base+tr)%12)+12)%12;
  return {name:w.name||('#'+it.workId), makamAd:mk?mk.ad:'', aile:mk?mk.aile:'',
          karar, bilinmiyor:!mk && (base===null||base===undefined), kararTxt:it.closingNote||w.closingNote||(mk?mk.kararPerde:'')};
}

const _PCNAME=['Do','Reb','Re','Mib','Mi','Fa','Fa#','Sol','Lab','La','Sib','Si'];
// İki profil arası geçiş maliyeti + insan okunur gerekçe
function transitionCost(a,b){
  if(a.karar===null||b.karar===null) return {c:2.5,txt:'karar sesi bilinmiyor',lvl:'na'};
  if(a.makamAd && a.makamAd===b.makamAd) return {c:0,txt:'aynı makam: '+a.makamAd,lvl:'ok'};
  const d0=Math.abs(a.karar-b.karar)%12;
  const d=Math.min(d0,12-d0);
  if(d===0) return {c:1,txt:'aynı karar: '+_PCNAME[a.karar],lvl:'ok'};
  if(a.aile && a.aile===b.aile) return {c:1.5,txt:'aynı aile: '+a.aile,lvl:'ok'};
  if(d===2||d===5) return {c:2,txt:(d===2?'tam ses':'dörtlü')+' aralık',lvl:'mid'};
  if(d===3||d===4) return {c:3,txt:'üçlü aralık',lvl:'mid'};
  return {c:5,txt:(d===1?'yarım ses':'artık dörtlü')+' — kulağı zorlar',lvl:'bad'};
}

// Atomlar: potpuri zinciri tek atom, tek eser tek atom
function buildAtoms(items){
  const atoms=[];
  for(let i=0;i<items.length;i++){
    if(i>0 && items[i].linkedPrev){ atoms[atoms.length-1].items.push(items[i]); continue; }
    atoms.push({items:[items[i]]});
  }
  atoms.forEach(a=>{
    a.inP=workProfile(a.items[0]);
    a.outP=workProfile(a.items[a.items.length-1]);
    a.fixed=a.items.every(it=>workProfile(it).bilinmiyor);   // makamı bilinmeyen atom sabit kalır
  });
  return atoms;
}

function totalCost(order){
  let t=0;
  for(let i=1;i<order.length;i++) t+=transitionCost(order[i-1].outP,order[i].inP).c;
  return t;
}

// En yakın komşu + 2-opt. Açılış atomu sabittir.
function optimizeAtoms(movable){
  if(movable.length<3) return movable.slice();
  const head=movable[0];
  let rest=movable.slice(1);
  const order=[head];
  while(rest.length){
    let bi=0,bc=Infinity;
    rest.forEach((a,i)=>{ const c=transitionCost(order[order.length-1].outP,a.inP).c; if(c<bc){bc=c;bi=i;} });
    order.push(rest.splice(bi,1)[0]);
  }
  let improved=true,guard=0;
  while(improved && guard++<60){
    improved=false;
    for(let i=1;i<order.length-1;i++){
      for(let j=i+1;j<order.length;j++){
        const cand=order.slice(0,i).concat(order.slice(i,j+1).reverse(),order.slice(j+1));
        if(totalCost(cand)<totalCost(order)-1e-9){ order.splice(0,order.length,...cand); improved=true; }
      }
    }
  }
  return order;
}

// mode: 'akilli' | 'makam' | 'karar'
function proposeOrder(items, mode){
  const atoms=buildAtoms(items);
  const slots=[]; const movable=[];
  atoms.forEach((a,i)=>{ if(a.fixed) return; slots.push(i); movable.push(a); });
  let sorted;
  if(mode==='makam'){
    sorted=movable.slice().sort((x,y)=> (x.inP.makamAd||'zzz').localeCompare(y.inP.makamAd||'zzz','tr'));
  }else if(mode==='karar'){
    sorted=movable.slice().sort((x,y)=> (x.inP.karar??99)-(y.inP.karar??99));
  }else{
    sorted=optimizeAtoms(movable);
  }
  const out=atoms.slice();
  slots.forEach((s,k)=> out[s]=sorted[k]);
  return out.reduce((acc,a)=>acc.concat(a.items),[]);
}

// ── ÖNİZLEME EKRANI ────────────────────────────────────────────────────────
let _sortRepId=null, _sortProposal=null;

function openSortSheet(repId){
  if(!MAKAMS_OK){ toast('Makam tablosu yüklenmedi — makamlar.sql çalıştırıldı mı?','er'); return; }
  const rep=getRep(repId); if(!rep||!(rep.items||[]).length) return;
  _sortRepId=repId;
  const ov=document.getElementById('sortOverlay');
  ov.style.display='flex';
  ov.innerHTML=`
    <div class="sort-box">
      <div class="sort-head">
        <div>🎼 Sıralama Önerisi</div>
        <button class="sort-x" onclick="closeSortSheet()">✕</button>
      </div>
      <div class="sort-modes">
        <button class="sort-mode active" data-mode="akilli" onclick="runSort('akilli')">Akıllı akış</button>
        <button class="sort-mode" data-mode="makam" onclick="runSort('makam')">Makama göre</button>
        <button class="sort-mode" data-mode="karar" onclick="runSort('karar')">Karar sesine göre</button>
      </div>
      <div class="sort-body" id="sortBody"></div>
      <div class="sort-foot">
        <span id="sortScore" class="sort-score"></span>
        <button class="bi" onclick="closeSortSheet()">Vazgeç</button>
        <button class="baw" onclick="applySort()">Uygula</button>
      </div>
    </div>`;
  runSort('akilli');
}
function closeSortSheet(){
  const ov=document.getElementById('sortOverlay');
  if(ov){ ov.style.display='none'; ov.innerHTML=''; }
  _sortRepId=null; _sortProposal=null;
}

function runSort(mode){
  const rep=getRep(_sortRepId); if(!rep) return;
  document.querySelectorAll('.sort-mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  const before=rep.items;
  const after=proposeOrder(before,mode);
  _sortProposal=after;
  const cBefore=totalCost(buildAtoms(before)), cAfter=totalCost(buildAtoms(after));
  const body=document.getElementById('sortBody');
  let html='';
  after.forEach((it,i)=>{
    const p=workProfile(it);
    const linked=i>0 && it.linkedPrev;
    if(i>0 && !linked){
      const t=transitionCost(workProfile(after[i-1]),p);
      html+=`<div class="sort-tr ${t.lvl}">${t.lvl==='bad'?'⚠':(t.lvl==='ok'?'✓':'·')} ${t.txt}</div>`;
    }
    html+=`<div class="sort-row${linked?' chained':''}">
      <span class="sort-no">${linked?'↳':(i+1)}</span>
      <span class="sort-name">${linked?'🔗 ':''}${p.name}</span>
      <span class="sort-mk">${p.makamAd||'<i>makam ?</i>'}${p.kararTxt?' · '+p.kararTxt:''}</span>
    </div>`;
  });
  body.innerHTML=html;
  const sc=document.getElementById('sortScore');
  const diff=cBefore-cAfter;
  sc.textContent = diff>0.01 ? ('Geçiş puanı '+cBefore.toFixed(1)+' → '+cAfter.toFixed(1)+' (iyileşme)')
                 : (diff<-0.01 ? ('Bu mod puanı yükseltiyor: '+cBefore.toFixed(1)+' → '+cAfter.toFixed(1))
                 : 'Sıra zaten uygun görünüyor');
}

async function applySort(){
  const rep=getRep(_sortRepId); if(!rep||!_sortProposal) return;
  const orig=[...rep.items];
  const merged=[..._sortProposal];
  const repId=_sortRepId;
  closeSortSheet();
  await applyReorder(repId, orig, merged, null);
  toast('Sıralama uygulandı');
}

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
  await mvTo(_dragRepId, _dragSrcIdx, destIdx);
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
  await mvTo(_dragRepId, _dragSrcIdx, destIdx);
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

// ══ POTPURİ (medley) ══════════════════════════════════════════════════════
// Model: repertoire_items.linked_prev = "bu eser bir öncekiyle KESİNTİSİZ devam eder".
// Potpuri = linked_prev=true olan ARDIŞIK satırların zinciri. Ayrı grup tablosu/id
// yok; böylece sürükle-bırak sıralaması hiçbir tutarlılık kontrolü gerektirmiyor.

// idx'in içinde bulunduğu zincirin [başlangıç, bitiş] aralığı (tek başınaysa [idx,idx])
function chainRange(items, idx){
  let a = idx, b = idx;
  while (a > 0 && items[a].linkedPrev) a--;
  while (b + 1 < items.length && items[b+1].linkedPrev) b++;
  return [a, b];
}
function isChainHead(items, idx){ return !(idx > 0 && items[idx].linkedPrev); }

// ── ZİNCİR NORMALİZASYONU (2026-07-19 b — sürükle-bırak hatası düzeltmesi) ──
// TEK KURAL: bir satırın bağı (linkedPrev) ancak YENİ üstündeki satır, o satırın
// ORİJİNAL zincirinden geliyorsa korunur. Aksi halde bağ otomatik çözülür.
// Bu tek kural şunların hepsini doğru yapar:
//   • zincirden bir parçayı dışarı sürüklemek  → bağ çözülür (altın şerit kalmaz)
//   • zincir İÇİNDE sıra değiştirmek           → bağ korunur
//   • tüm bloğu taşımak                        → bağlar korunur
//   • zincirin ortasına yabancı eser bırakmak  → zincir orada KOPAR (eseri yutmaz)
//   • bir satırın listenin en başına gelmesi   → bağ çözülür (zincir baştan başlayamaz)
function normalizeChains(origItems, merged){
  const chainIdOf = new Map();
  origItems.forEach((it,i)=>{ const [a]=chainRange(origItems,i); chainIdOf.set(String(it.id), String(origItems[a].id)); });
  merged.forEach((it,i)=>{
    if (i === 0) { it.linkedPrev = false; return; }
    if (!it.linkedPrev) return;
    const prev = merged[i-1];
    if (chainIdOf.get(String(prev.id)) !== chainIdOf.get(String(it.id))) it.linkedPrev = false;
  });
}

// Yeni sıralamayı uygula: normalize et, seq'leri yaz, DEĞİŞEN linked_prev'leri yaz.
async function applyReorder(repId, origItems, merged, newActiveIdx){
  const before = new Map(origItems.map(it => [String(it.id), !!it.linkedPrev]));
  normalizeChains(origItems, merged);
  merged.forEach((it,i)=> it.seq = i+1);
  sync('spin','...');
  try{
    const patches = merged.map(it => {
      const body = { seq: it.seq };
      if (before.get(String(it.id)) !== !!it.linkedPrev) body.linked_prev = !!it.linkedPrev;
      return dbPatch('repertoire_items', it.id, body);
    });
    await Promise.all(patches);
    if (activeItemRepId === repId && newActiveIdx != null) activeItemIdx = newActiveIdx;
    await load();
  }catch(e){
    toast(/linked_prev/.test(e.message)?'linked_prev kolonu eksik — SQL\'i çalıştır':e.message,'er');
  }
}

// 🔗 butonu — satırı bir öncekine bağlar / bağı çözer
async function toggleLink(repId, itemId){
  const rep=getRep(repId); if(!rep) return;
  const idx=(rep.items||[]).findIndex(x=>String(x.id)===String(itemId));
  if(idx<=0) return;                       // ilk satır zincir başlatamaz
  const it=rep.items[idx];
  const val=!it.linkedPrev;
  sync('spin','...');
  try{
    await dbPatch('repertoire_items', it.id, {linked_prev: val});
    toast(val?'🔗 Potpuriye bağlandı':'Bağ çözüldü');
    await load();
  }catch(e){
    toast(/linked_prev/.test(e.message)?'linked_prev kolonu eksik — SQL\'i çalıştır':e.message,'er');
  }
}

// ↑/↓ butonları — TEK ADIM. Zincir BAŞINDA basılırsa tüm blok komşu bloğun
// üstüne/altına atlar; zincir içindeki satırda tek satır hareket eder.
async function mv(repId,idx,dir){
  const rep=getRep(repId);if(!rep)return;
  const orig=[...rep.items];
  const [ca,cb]=chainRange(orig,idx);
  const isHead=isChainHead(orig,idx);
  let merged, newActive;
  if(isHead && cb>ca){
    const block=orig.slice(ca,cb+1);
    const rest=[...orig.slice(0,ca),...orig.slice(cb+1)];
    let insertAt;
    if(dir<0){
      if(ca===0) return;
      const [pa]=chainRange(orig,ca-1); insertAt=pa;
    }else{
      if(cb===orig.length-1) return;
      const [,nb]=chainRange(orig,cb+1); insertAt=nb-block.length+1;
    }
    merged=[...rest.slice(0,insertAt),...block,...rest.slice(insertAt)];
    newActive=insertAt;
  }else{
    const ni=idx+dir;
    if(ni<0||ni>=orig.length)return;
    merged=[...orig];
    const [moved]=merged.splice(idx,1);
    merged.splice(ni,0,moved);
    newActive=ni;
  }
  await applyReorder(repId, orig, merged, newActive);
}

// SÜRÜKLE-BIRAK — kaynak satırı hedef sıraya taşır.
// Zincir BAŞI sürüklenirse tüm blok birlikte gider; zincir ÜYESİ sürüklenirse
// yalnız o satır gider ve normalizeChains bağını otomatik çözer.
async function mvTo(repId, srcIdx, destIdx){
  const rep=getRep(repId); if(!rep) return;
  const orig=[...rep.items];
  if(srcIdx==null||destIdx==null||srcIdx<0||srcIdx>=orig.length||destIdx<0||destIdx>=orig.length||srcIdx===destIdx) return;
  const [ca,cb]=chainRange(orig,srcIdx);
  const isHead=isChainHead(orig,srcIdx);
  const moveBlock = isHead && cb>ca;
  const block = moveBlock ? orig.slice(ca,cb+1) : [orig[srcIdx]];
  const from  = moveBlock ? ca : srcIdx;
  const rest  = moveBlock ? [...orig.slice(0,ca),...orig.slice(cb+1)]
                          : [...orig.slice(0,srcIdx),...orig.slice(srcIdx+1)];
  // Hedef satırın kalan listedeki yeri; aşağı taşımada onun ALTINA bırakılır.
  const destItem = orig[destIdx];
  let ins = rest.findIndex(x => String(x.id) === String(destItem.id));
  if (ins < 0) ins = Math.min(from, rest.length);      // hedef, sürüklenen bloğun içindeyse
  else if (destIdx > from) ins = ins + 1;
  const merged=[...rest.slice(0,ins),...block,...rest.slice(ins)];
  await applyReorder(repId, orig, merged, ins);
}

async function chSeq(repId,idx,val){
  const rep=getRep(repId);if(!rep)return;
  const items=[...rep.items];
  const ns=parseInt(val);
  if(isNaN(ns)||ns<1||ns>items.length){renderDetail();return;}
  await mvTo(repId, idx, ns-1);
  return;
}

function printR(repId){
  const rep=getRep(repId);if(!rep)return;
  const items=rep.items||[];
  const sl={concept:'Taslak',confirmed:'Onaylandı',archive:'Arşiv'};
  const rows=items.map(it=>{const w=WL[String(it.workId)]||{};const cn=it.closingNote||w.closingNote||'';return`<tr><td style="width:40px;color:#888;text-align:center;">${it.seq}</td><td style="padding:9px 12px;"><div style="font-weight:500;color:#111;">${w.name||it.workId}</div><div style="font-size:11px;color:#666;">${[w.composer,w.makam].filter(Boolean).join(' · ')}</div></td><td style="width:80px;text-align:center;color:#444;">${cn}</td><td style="width:120px;font-size:12px;color:#666;">${it.note||''}</td></tr>`;}).join('');

  const printCSS = '*{margin:0;padding:0;box-sizing:border-box;}body{font-family:\'DM Sans\',sans-serif;font-size:14px;color:#111;padding:32px 40px;}h1{font-family:\'Playfair Display\',serif;font-size:28px;font-weight:400;margin-bottom:8px;}hr{border:none;border-top:2px solid #111;margin:16px 0;}table{width:100%;border-collapse:collapse;}th{font-size:10px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:#888;text-align:left;padding:6px 12px;border-bottom:1px solid #ddd;}td{padding:9px 12px;border-bottom:1px solid #eee;vertical-align:middle;}';
  const printHTML = '<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>' + rep.name + '</title><style>' + printCSS + '</style><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"></head><body>'
    + '<div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:.1em;margin-bottom:24px;">Repertuvar — ' + new Date().toLocaleDateString('tr-TR') + '</div>'
    + '<h1>' + rep.name + '</h1>'
    + '<div style="display:flex;gap:16px;font-size:12px;color:#666;margin-bottom:16px;">' + (rep.date?'\uD83D\uDCC5 '+rep.date:'') + (rep.venue?' \uD83D\uDCCD '+rep.venue:'') + (rep.status?' \u25CF '+sl[rep.status]:'') + ' \uD83C\uDFBC ' + items.length + ' eser</div>'
    + '<hr><table><thead><tr><th>#</th><th>Eser Ad\u0131</th><th>Kapan\u0131\u015f</th><th>Not</th></tr></thead><tbody>' + rows + '</tbody></table>'
    + '</body></html>';
  printViaIframe(printHTML, rep.name);
}

// 2026-07-19 düzeltme: eskiden window.open('','_blank') kullanılıyordu — Brave/Safari
// açılır pencere engelleyicisi ve Capacitor WebView bunu null döndürüyor, sonraki
// win.document.write satırı TypeError atıyordu (menüde hiçbir şey olmuyor gibi
// görünüyordu). Artık gizli bir iframe'e yazılıp oradan yazdırılıyor; iframe de
// engellenirse yeni sekme denenir.
function printViaIframe(html, title){
  try{
    const old=document.getElementById('printFrame');
    if(old) old.remove();
    const f=document.createElement('iframe');
    f.id='printFrame';
    f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(f);
    const d=f.contentWindow.document;
    d.open(); d.write(html); d.close();
    setTimeout(()=>{ try{ f.contentWindow.focus(); f.contentWindow.print(); }catch(e){ printFallback(html); } }, 500);
  }catch(e){ printFallback(html); }
}
function printFallback(html){
  const w=window.open('','_blank');
  if(!w){ toast('Yazdırma penceresi engellendi — tarayıcı ayarından izin ver','er'); return; }
  w.document.open(); w.document.write(html); w.document.close();
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
    headers: {...hdrFor(table), 'Prefer': 'return=minimal'},
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
  const m=SOLISTLER.filter(n=>trMatch(n,q)&&!iemPfSelected.includes(n));
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

// ── PAYLAŞ (2026-08-01: SÜRELİ MİSAFİR BAĞLANTISI) ─────────────────────────
// ESKİ HAL: link = stage.html?share=btoa(repId) — yani "token" repertuvar id'sinin
// base64'ü, sır değil, herkes üretebilir; üstelik stage.html giriş istediği için
// misafirde zaten çalışmıyordu.
// YENİ: repertoire_links tablosunda gerçek rastgele token + son kullanma zamanı.
// Misafir paylas.html?t=<token> açar, sunucudaki get_shared_repertoire(token) RPC'si
// token/iptal/süre kontrolünü yapıp içeriği döndürür (akor DAHİL DEĞİL).
// Repertuvar başına TEK aktif bağlantı: yeni üretilince eskiler revoked=true olur.
function randomToken(){
  const a = new Uint8Array(24);
  (window.crypto || window.msCrypto).getRandomValues(a);
  return Array.from(a).map(b=>b.toString(16).padStart(2,'0')).join('');
}

function shareBaseUrl(){
  return window.location.origin.startsWith('http')
    ? window.location.origin + window.location.pathname.replace(/repertoires\.html.*$/,'')
    : 'https://app.repertuvar.app/';
}

async function shareRep(repId) {
  const rep = getRep(repId);
  if (!rep) return;
  shareRepId = repId;
  openShareModal(rep.name);
}

function openShareModal(name){
  let ov = document.getElementById('shareOverlay');
  if(!ov){ ov = document.createElement('div'); ov.id='shareOverlay'; document.body.appendChild(ov);
           ov.addEventListener('click', e=>{ if(e.target===ov) closeShare(); }); }
  ov.innerHTML = `
    <div class="share-box">
      <div class="share-head"><span>🔗 Misafir Bağlantısı</span><button class="sort-x" onclick="closeShare()">✕</button></div>
      <div class="share-name">${name}</div>
      <div class="share-note">Bağlantıyı açan kişi repertuvarı <b>salt okunur</b> görür — giriş yapmasına gerek yok. Süre dolunca bağlantı ölür. Akorlar paylaşılmaz.</div>
      <div class="share-foot" style="justify-content:flex-start;gap:8px;">
        <button class="bi" onclick="createShareLink(12)">12 saat</button>
        <button class="baw" onclick="createShareLink(24)">24 saat</button>
      </div>
      <div id="shareResult"></div>
    </div>`;
  ov.style.display='flex';
}

async function createShareLink(hours){
  const repId = shareRepId;
  if(!repId) return;
  const box = document.getElementById('shareResult');
  if(box) box.innerHTML = '<div class="share-note">Bağlantı oluşturuluyor…</div>';
  try{
    // Tek aktif bağlantı: bu repertuvarın eski bağlantılarını iptal et
    await fetch(SUPA_URL+'/rest/v1/repertoire_links?repertoire_id=eq.'+repId+'&revoked=is.false', {
      method:'PATCH', headers:{...authHeaders(),'Content-Type':'application/json','Prefer':'return=minimal'},
      body: JSON.stringify({revoked:true})
    });
    const token = randomToken();
    const expires = new Date(Date.now() + hours*3600*1000).toISOString();
    const r = await fetch(SUPA_URL+'/rest/v1/repertoire_links', {
      method:'POST', headers:{...authHeaders(),'Content-Type':'application/json','Prefer':'return=minimal'},
      body: JSON.stringify({repertoire_id:repId, token:token, created_by:getUserId(), expires_at:expires})
    });
    if(!r.ok) throw new Error(await r.text());
    const link = shareBaseUrl() + 'paylas.html?t=' + token;
    if(box) box.innerHTML = `
      <div class="share-link" id="shareLink" data-url="${link}">${link}</div>
      <div class="share-note">${hours} saat geçerli — ${new Date(expires).toLocaleString('tr-TR')}</div>
      <div class="share-foot">
        <button class="bi" onclick="closeShare()">Kapat</button>
        <button class="baw" id="copyBtn" onclick="copyShareLink()">Kopyala</button>
      </div>`;
    if(navigator.share){
      const rp = getRep(repId);
      try{ await navigator.share({title:(rp&&rp.name)||'Repertuvar', url:link}); }catch(e){}
    }
  }catch(e){
    if(box) box.innerHTML = '<div class="share-note" style="color:var(--red);">Bağlantı oluşturulamadı: '+e.message+'</div>';
  }
}

function closeShare() {
  const ov=document.getElementById('shareOverlay');
  if(ov){ ov.style.display='none'; ov.innerHTML=''; }
  shareRepId = null;
}

function copyShareLink() {
  const el=document.getElementById('shareLink');
  const link=el?el.dataset.url:'';
  const done=()=>{ const btn=document.getElementById('copyBtn');
    if(btn){ btn.textContent='✓ Kopyalandı'; setTimeout(()=>{ if(btn) btn.textContent='Kopyala'; },2000); } };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(link).then(done).catch(()=>fallbackCopy(link,done));
  } else fallbackCopy(link,done);
}
function fallbackCopy(text, done){
  const el=document.createElement('textarea');
  el.value=text; el.style.position='fixed'; el.style.opacity='0';
  document.body.appendChild(el); el.select();
  try{ document.execCommand('copy'); done(); }catch(e){ toast('Kopyalanamadı — bağlantıyı elle seç','er'); }
  document.body.removeChild(el);
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
  // Önce local'den oku ve çiz (load), SONRA sync'i gecikmeyle başlat —
  // böylece açılış okuması, sync'in works yazmasıyla çakışmaz.
  load();
  loadWorksData().then(() => { renderList(); renderDetail(); });
  loadMakams();   // 2026-07-19: makam referans tablosu + kişisel ton kaydırmaları
  if (window.syncOfflineData) setTimeout(() => syncOfflineData(), 800);
})();


// --- SYNC/ONLINE OTOMATİK TAZELEME ---
// Ağ değişince (WiFi↔GSM) veya arka plan sync'i bitince veri IndexedDB'de
// güncellenir; ama sayfa açılışta boş kaldıysa kendini çizmiyordu. Bu
// dinleyiciler o durumda listeyi otomatik tazeler. load() local-first
// olduğundan tekrar çağrılması güvenli.
(function() {
  let _refreshT;
  function _refresh() {
    clearTimeout(_refreshT);
    _refreshT = setTimeout(function() {
      if (typeof load === 'function') load();
    }, 150);
  }
  window.addEventListener('data-synced', _refresh);
  window.addEventListener('online', _refresh);
})();
