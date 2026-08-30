// ============================================================================
// repertoires.js — changelog (son değişiklikler üstte)
// 2026-08-20 (c): 🎧 REPERTUVARI DİNLE. Repertuvardaki eserlerin works.video_link
//             bağlantılarından, REPERTUVAR SIRASIYLA bir çalma listesi (Emir'in
//             amacı: ezberleme, "eserlerin tam kafaya yerleşmesi"). İKİ YOL birden:
//             (A) uygulama içi YouTube IFrame oynatıcısı — listeden atlanabiliyor,
//             çalan satır vurgulanıyor; düz <iframe> yerine API kullanıldı çünkü
//             GÖMMESİ KAPALI videoyu (101/150) ancak onError ile anlayıp
//             işaretleyip otomatik atlayabiliyoruz. (B) "YouTube'da Aç" —
//             watch_videos?video_ids=… geçici listesi; gömme kısıtı yok ve
//             YouTube uygulamasında ARKA PLANDA çalar (uygulama içi oynatıcı
//             telefon kilitlenince durar — bu arayüzde de yazıyor). Bağlantısı
//             olmayan eserler SESSİZCE atlanmıyor: "N eserde bağlantı yok" uyarısı,
//             dokununca hangileri olduğu açılıyor (Emir'in tercihi). Yeni:
//             _ytId (youtu.be/watch?v=/embed/shorts/live/çıplak kimlik ayrıştırıcı),
//             _dinleListesi, openDinleSheet/closeDinleSheet, dinleAtla,
//             dinleYouTubedeAc; düğme detay başlığında "Sahneye Çık"ın yanında.
//             AYRICA: _applyWorksRows artık videoLink'i de WL'e koyuyor, ve
//             loadWorksData'daki works okuması ANON'DAN JETONA çevrildi (anon
//             istekte RLS yalnız visibility='public' eserleri veriyordu ⇒ gizli/
//             gruba açık eserler listede "#<id>" kalıyordu; stage.html'de 08-19'da
//             düzeltilen hatanın bu dosyadaki eşi). Anon yedek yol korundu.
// 2026-08-20 (b): YENİ GÖRÜNÜRLÜK MODELİNE GEÇİŞ (3. aşamanın repertoires.js ayağı).
//             Veritabanı 2. aşamada `repertoires.visibility` + `repertoire_group_shares`
//             modeline geçmişti (log-23 561/564/565) ama bu dosya hâlâ `is_public`/
//             `group_id` yazıp okuyordu; 2026-08-17'deki "yeni repertuvarlar gruba
//             görünmüyor" hatasının sebebi buydu. DEĞİŞENLER: (1) tek okuma noktası
//             `repVis(r)` — `visibility`yi okur, yalnız göç öncesi önbellek satırları
//             için eski sütunlara düşer; visChip/openEdit/bölümleme/sheet ikonu hep
//             bunu kullanıyor. (2) load()'daki istemci süzgeci `or=(owner_id,group_id,
//             is_public)` KALDIRILDI — görünürlüğü artık `repertoires_read` politikası
//             belirliyor; eski süzgeç, RLS'ten geçen grup-paylaşımlı ve KİŞİSEL
//             paylaşımlı (repertoire_shares) repertuvarları istemcide eliyordu.
//             (3) Listeye DÖRDÜNCÜ bölüm: "Benimle Paylaşılanlar" — süzgeç kalkınca
//             gelen kişisel paylaşımlar hiçbir bölüme düşmeyip kaybolurdu.
//             (4) saveRep/copyRep/hızlı oluşturma artık `visibility`yi AÇIKÇA yazıyor
//             (sütun varsayılanına bırakmıyor) ve yeni `repGrupPaylasimiUygula()` ile
//             `repertoire_group_shares` satırını ekliyor/siliyor — grup görünürlüğü
//             sütuna değil O SATIRA bağlı. `rgs_write` politikası `is_group_manager`
//             istediği için düz üyede bu yazma başarısız olur: hata YUTULMUYOR,
//             kullanıcıya dürüstçe söyleniyor, ve hızlı oluşturma sheet'indeki
//             "Grupla paylaş" kutusu yalnız grup yöneticisine gösteriliyor.
//             Eski `is_public`/`group_id` sütunları TUTARLI yazılmaya devam ediyor:
//             aynı satırı hâlâ eski modelle okuyan sayfalar var (stage.html,
//             eserler.html) — göç bitene kadar iki model uyumlu tutuluyor.
// 2026-08-20: UZUN BASMA → BAŞKA REPERTUVARA EKLE / YENİ REPERTUVAR OLUŞTUR.
//             Repertuvar detay listesindeki bir esere uzun basınca (500 ms) alttan
//             sheet açılıyor: yönetilebilen diğer repertuvarlar listeleniyor (eser
//             zaten içindeyse satır pasif, "zaten var" yazıyor) + "Yeni repertuvar
//             oluştur" satır içi form. Toplu seçim modu YOK (eserler.html'deki
//             bulkMode buraya taşınmadı) — bu liste sıralı bir program ve onay
//             kutuları sürükleme alanıyla çakışırdı. Sürükle-bırak zaten yalnız ⠿
//             tutamacından başlıyor (2026-08-12), jest çakışması bu yüzden yok;
//             uzun-basma tutamacın üstünde bilerek devreye girmiyor. Repertuvar
//             listesi SUNUCUDAN değil bellekteki `reps`ten geliyor (görünürlük
//             zaten load()'da doğru çözülmüş + çevrimdışı çalışıyor). Sheet DOM'u
//             document.body'ye ekleniyor — #dc her renderDetail'de yeniden çizildiği
//             için panelin içindeki position:fixed katman bozulurdu (lycOverlay
//             ile aynı desen). Yeni: _rlpInit/openRepMoveSheet/rlpAddToRep/
//             rlpCreateAndAdd, dosyanın SONUNDA.
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

// ── 2026-08-30: ÇEVİRİ YARDIMCISI ────────────────────────────────────────
// Bölüm başlıkları, durum etiketleri ve sayaçlar buradan yazılıyor; HTML'deki
// `data-i18n` bunlara ulaşamıyor. `_r()` i18n yoksa Türkçeye düşer, yani
// çeviri motoru yüklenmemiş bir sayfada liste yine dolu görünür.
function _r(anahtar, tr) {
  try { return (window.i18n && window.i18n.t) ? window.i18n.t(anahtar, tr) : tr; }
  catch (e) { return tr; }
}

// (2026-08-30) TEKİL/ÇOĞUL. Türkçede sayıdan sonra ek almaz ("1 eser",
// "18 eser") ama İngilizcede alır ("1 piece", "18 pieces"). Tek anahtar
// kullanınca "1 pieces" çıkıyordu.
function _rBirim(n) {
  return (n === 1) ? _r('rep.eserBirimTekil', 'eser') : _r('rep.eserBirim', 'eser');
}

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
// (2026-08-06) Her yazmadan sonra kısa bir "kendi yankını yut" penceresi.
// Realtime bizim yazdığımızı da bize bildiriyor; sıralama gibi çok satırlı
// işlemlerde araya giren tazeleme listeyi eskitip zincir bozulmasına yol
// açıyordu (bkz. db.js/degisiklikGeldi).
function _rtSustur(ms) {
  try { window._rtSuppressUntil = Date.now() + (ms || 2500); } catch (e) {}
}

async function dbPost(table, data) {
  _rtSustur();
  const r = await fetch(SUPA_URL+'/rest/v1/'+table, {method:'POST',headers:hdrFor(table),body:JSON.stringify(data)});
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
// (2026-08-22) YAZ VE DOĞRULA — `!r.ok` TEK BAŞINA YETMİYOR.
// PostgREST'te RLS bir UPDATE'i engellediğinde istek HATA DÖNMEZ: 200/204 ile
// ama SIFIR SATIR günceller. Eski hâl yalnız `!r.ok`e bakıyordu ⇒ kullanıcı
// "Kaydedildi ✓" görüyor, veritabanında hiçbir şey değişmiyordu. Bu projede
// aynı desen daha önce eserler.html'de yakalanmıştı (yazVeDogrula); burada
// duruyordu. `hdrFor` zaten `Prefer: return=representation` gönderiyor, yani
// dönen diziyi saymak bedava.
async function dbPatch(table, id, data) {
  _rtSustur();
  const r = await fetch(SUPA_URL+'/rest/v1/'+table+'?id=eq.'+id, {method:'PATCH',headers:hdrFor(table),body:JSON.stringify(data)});
  if (!r.ok) throw new Error(await r.text());
  const rows = await r.json().catch(() => null);
  // Dizi gelmediyse (204/boş gövde) doğrulayacak bir şey yok — eski davranış.
  // Dizi geldiyse BOŞ olması sessiz reddin ta kendisidir.
  if (Array.isArray(rows) && rows.length === 0) {
    throw new Error(_r('rep.satirGuncellenmedi','Kaydedilemedi: sunucu hiçbir satır güncellemedi (yetkin olmayabilir).'));
  }
  return rows;
}
async function dbDel(table, id) {
  _rtSustur();
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
    // (2026-08-20) videoLink eklendi — 🎧 Repertuvarı Dinle bunu kullanıyor.
    WL[id] = { name: w.name||'', composer: w.composer||'', makam: w.makam||'', instrument: w.instrument||'', closingNote: w.closing_note||'', lyrics: w.lyrics||'', videoLink: w.video_link||'' };
    WLIST.push({ id, name: w.name||'', composer: w.composer||'', makam: w.makam||'' });
  });
  // customWorks patch (yerel override'lar)
  try {
    const customs = JSON.parse(localStorage.getItem('customWorks') || '[]');
    const deleted = JSON.parse(localStorage.getItem('deletedWorks') || '[]');
    deleted.forEach(function(did){ var sid=String(parseInt(did)); delete WL[sid]; for(var j=WLIST.length-1;j>=0;j--){if(WLIST[j].id===sid){WLIST.splice(j,1);break;}} });
    customs.forEach(function(w){ var sid=String(parseInt(w.id)); if(WL[sid]){if(w.name)WL[sid].name=w.name;if(w.lyrics!==undefined)WL[sid].lyrics=w.lyrics;} else WL[sid]={name:w.name||'',lyrics:w.lyrics||'',composer:w.composer||'',makam:w.makam||'',instrument:w.instrument||'',closingNote:w.closingNote||'',videoLink:w.videoLink||''}; var found=false; for(var k=0;k<WLIST.length;k++){if(WLIST[k].id===sid){if(w.name)WLIST[k].name=w.name;found=true;break;}} if(!found)WLIST.push({id:sid,name:w.name||'',composer:w.composer||'',makam:w.makam||''}); });
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
    // (2026-08-20) ÖNCE OTURUM JETONU, GEREKİRSE ANON'A DÜŞ — stage.html'de
    // 2026-08-19'da alınan dersin aynısı. Eski hâli BİLEREK anon'du (2026-07-17:
    // süresi dolmuş jeton 401 verince eser adları kaybolup yerine numara
    // çıkıyordu). O gerekçe görünürlük modelinden ÖNCE geçerliydi: artık RLS
    // anon isteğe SADECE visibility='public' eserleri veriyor ⇒ repertuvardaki
    // gizli ya da GRUBA AÇIK eserler burada hiç gelmiyor ve satırda yine
    // "#<id>" görünüyordu. Jetonla dene, istek başarısızsa anon ile tekrar
    // dene — hem yetki hem eski dayanıklılık korunuyor.
    // (2026-08-22) ANON'A DÜŞME DARALTILDI — OTURUM VARSA ARTIK DÜŞÜLMÜYOR.
    // Belirti (Emir bildirdi): telefondan eklenen GİZLİ bir eser masaüstünde
    // repertuvar satırında "#<id>" ve "söz eklenmemiş" olarak görünüyordu;
    // çıkış-giriş yapınca düzeldi. Sebep: jeton bayatlayınca istek başarısız
    // oluyor, kod sessizce anon'a düşüyor, anon istekte RLS yalnız
    // visibility='public' eserleri veriyor ⇒ gizli eser WL'e hiç girmiyor.
    // Diğer eserler önbellekten geldiği için arıza "tek eserde" gibi duruyor.
    //
    // KUSUR SESSİZLİKTEYDİ: bir YETKİ sorunu gizlenip yerine YANLIŞ BİLGİ
    // gösteriliyordu ("söz eklenmemiş" — oysa söz var). Üstelik auth.js zaten
    // doğru olanı yapıyor: istekten önce jetonu tazeliyor, 401'de zorla
    // yenileyip isteği BİR KEZ tekrarlıyor, oturum kalıcı ölüyse isteği
    // engelleyip oturumu sonlandırıyor. Anon yedek yolu tam da bu mekanizmayı
    // etkisiz kılıyordu: engellenen istekten sonra anon'la tekrar denenince
    // kullanıcı "girişli" görünmeye devam edip eksik veri görüyordu.
    //
    // Anon yolu KALDIRILMADI, yalnız daraltıldı: oturumu OLMAYAN ziyaretçi
    // (paylaşım bağlantısıyla gelen) genel eserleri görmeye devam etsin.
    const _worksUrl = SUPA_URL+'/rest/v1/works?deleted_at=is.null&order=name&limit=2000';
    const _oturumVar = !!localStorage.getItem('sb_token');
    let r = await fetch(_worksUrl, {
      headers: _oturumVar ? authHeaders() : anonHeaders(),
      signal: AbortSignal.timeout(3500)
    });
    if (!r.ok) {
      if (_oturumVar) {
        // Sessizce eksik veri göstermektense dürüst ol. WL zaten local'den
        // dolu olduğu için ekran boş kalmıyor; yalnız tazeleme atlanıyor.
        console.warn('[repertoires] works alınamadı ('+r.status+') — anon\'a DÜŞÜLMÜYOR, oturum var');
        if (navigator.onLine) {
          try { toast(_r('rep.listeTazelenmedi','Eser listesi tazelenemedi. Oturumun yenilenmemiş olabilir — çıkıp tekrar girmen gerekebilir.'), 'err'); } catch(e) {}
        }
      }
      throw new Error('works fetch '+r.status);
    }
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

// ── (2026-08-20) HANGİ REPERTUVAR HANGİ GRUBA AİT ──────────────────────────
// NİÇİN VAR: Emir bildirdi — "Ezgi Harmanı seçiliyken ANIZ/SOLO grubunun
// repertuvarları da listede". GERİLEMENİN SEBEBİ: bugün istemci süzgeci
// (`or=(owner_id,group_id,is_public)`) kaldırılıp görünürlük tamamen RLS'e
// bırakıldı ve şu VARSAYIM yapıldı: "elimize gelen her visibility='group'
// satırı tanım gereği benim grubumun işi". Bu varsayım TEK GRUPLU kullanıcıda
// doğru, ÇOK GRUPLU kullanıcıda YANLIŞ — RLS üyesi olunan BÜTÜN grupların
// repertuvarlarını döndürür.
//
// AYRIM: RLS'in işi ERİŞİM (kim görebilir), aktif grubun işi BAĞLAM (şu an
// neyle çalışıyorum). İkincisi RLS'e devredilemez; istemcide süzülmeli.
// Karışık liste yalnız kafa karıştırmaz — yanlış grubun repertuvarının durumu
// ya da içeriği yanlışlıkla değiştirilebilir.
//
// Harita `repertoire_group_shares`ten kurulur (RLS zaten yalnız benim
// gruplarımın satırlarını verir). Çevrimdışı ilk çizimde de süzgeç çalışsın
// diye localStorage'a yazılır. Satır gelmezse `repertoires.group_id`'ye
// düşülür (köprü tetikleyicisi onu güncel tutuyor, göç öncesi önbellek
// satırları için de tek kaynak o).
let REP_GRUP = (() => {
  try { return JSON.parse(localStorage.getItem('repGroupMap') || '{}'); }
  catch(e){ return {}; }
})();

function repGrupHaritasiKur(rows){
  if (!Array.isArray(rows)) return;            // çekilemedi → eski harita dursun
  const m = {};
  rows.forEach(x => {
    if (!x || !x.repertoire_id || !x.group_id) return;
    (m[x.repertoire_id] = m[x.repertoire_id] || []).push(x.group_id);
  });
  REP_GRUP = m;
  try { localStorage.setItem('repGroupMap', JSON.stringify(m)); } catch(e){}
}

// Bu repertuvar ŞU AN seçili gruba mı ait? Grup repertuvarı değilse false.
function repAktifGruptaMi(r){
  if (!r || repVis(r) !== 'group') return false;
  const gid = getGroupId();
  if (!gid) return false;                      // grup seçili değilse grup bölümü boş
  const liste = REP_GRUP[r.id];
  if (Array.isArray(liste) && liste.length) return liste.includes(gid);
  return !!r.group_id && r.group_id === gid;   // yedek yol
}

// Erişimim var ama BAŞKA grubumun repertuvarı — listeden çıkarılır, grup
// değiştirilince geri gelir.
function repBaskaGrubunMu(r){
  return !!r && repVis(r) === 'group' && !repAktifGruptaMi(r);
}

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

// ── 2026-08-23: ESER BAZLI KADRO ─────────────────────────────────────────
// Amac: "bu eserde kim, hangi enstrumanla" bilgisini repertuvar satirinda
// tutmak. YENI TABLO ACMADIK — mevcut `repertoire_items.performer` alani
// zaten eser bazli ve repertuvara ozel; tek eksigi enstrumandi.
// Bicim: "Cem Gunes (Gitar), Hulya Ince (Vokal)". Parantezsiz eski kayitlar
// aynen calismaya devam eder.
//
// Enstruman kaynagi: profiles.instruments (bugun eklenen yetenek listesi),
// solistler.member_id uzerinden eslesiyor. Boylece serbest metin yerine
// kisinin GERCEKTEN caldigi enstrumanlar oneriliyor — yazim tutarli kaliyor.
let SOLIST_ENSTRUMAN = {};   // "Ad Soyad" -> ['Gitar','Vokal']

async function _solistEnstrumanKur(solistler) {
  try {
    SOLIST_ENSTRUMAN = {};
    if (!window.db || !db.profiles) return;
    const profiller = await db.profiles.getAll();
    if (!profiller || !profiller.length) return;
    const pMap = {};
    profiller.forEach(p => { pMap[p.id] = p; });
    (solistler || []).forEach(x => {
      if (!x || !x.name) return;
      const p = x.member_id ? pMap[x.member_id] : null;
      let liste = (p && Array.isArray(p.instruments) && p.instruments.length)
        ? p.instruments
        : (p && p.instrument ? [p.instrument] : []);
      if (liste.length) SOLIST_ENSTRUMAN[x.name] = liste;
    });
  } catch (e) { /* enstruman onerisi olmasa da isim secimi calisir */ }
}

// "Cem Gunes (Gitar)" -> onerilerde tekrar cikmasin diye sade ad.
function _pfSadeAd(x) {
  return String(x || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
}

// Bir arama sorgusuna karsilik "ad" ve "ad — enstruman" adaylarini uretir.
function _pfAdaylar(q, secili) {
  const secilenAdlar = (secili || []).map(_pfSadeAd);
  const out = [];
  SOLISTLER.forEach(ad => {
    if (!trMatch(ad, q)) return;
    if (!secilenAdlar.includes(ad)) out.push({ etiket: ad, deger: ad });
    (SOLIST_ENSTRUMAN[ad] || []).forEach(ens => {
      const deger = ad + ' (' + ens + ')';
      if ((secili || []).includes(deger)) return;
      out.push({ etiket: ad + ' — ' + ens, deger: deger });
    });
  });
  return out;
}

function applyRepsData(r, i, s) {
  SOLISTLER = (s||[]).map(x=>x.name).filter(Boolean);
  _solistEnstrumanKur(s);
  const uid = getUserId() || '';
  const myGid = getGroupId() || '';
  // linkedPrev: ilk satırda her zaman false — zincir listenin başında başlayamaz.
  // canManage: sahibiyim VEYA bu benim grubumun repertuvarı ve ben grup owner/admin'iyim.
  // Silme buna DAHİL DEĞİL — silme sahibinde kalır (RLS'te de öyle).
  // (2026-08-20) canManage artık `x.group_id===myGid` ham karşılaştırması yerine
  // `repAktifGruptaMi` üzerinden — paylaşım satırıyla açılmış ama group_id'si boş
  // repertuvarlar da kapsansın, BAŞKA grubun repertuvarı ise kapsam DIŞI kalsın.
  reps = (r||[]).map(x=>({...x, isOwner: x.owner_id===uid || x.user_id===uid, canManage: (x.owner_id===uid || x.user_id===uid) || (isGroupManager() && repAktifGruptaMi(x)), items:(i||[]).filter(t=>t.repertoire_id===x.id).sort((a,b)=>a.seq-b.seq).map((t,ix)=>({...t,workId:String(t.work_id),closingNote:t.closing_note||'',performer:t.performer||'',linkedPrev: ix>0 && !!t.linked_prev}))}));
}

// (2026-08-06) 🐛 `?rep=` YALNIZCA İLK YÜKLEMEDE UYGULANIR.
// Eskiden `load()` HER çağrıldığında adres çubuğundaki `?rep=` okunup seçili
// repertuvar ona çevriliyordu. Adres çubuğu değişmediği için, kullanıcı
// arayüzden başka bir repertuvara geçse bile potpuri bağlama/çözme, sıralama
// ya da eser ekleme gibi `load()` tetikleyen her işlemden sonra ekran ESKİ
// repertuvara ATLIYORDU. Daha kötüsü: atlamayı fark etmeden basılan sonraki
// düğmeler ARTIK O REPERTUVARIN satırlarına uygulanıyordu — potpuri bağının
// başka bir repertuvara "sızması" böyle oluyordu.
let _urlRepUygulandi = false;
function selectUrlRepIfPresent() {
  if (_urlRepUygulandi) return;
  const urlRep=new URLSearchParams(window.location.search).get('rep');
  if(urlRep&&reps.find(x=>x.id===urlRep)){selId=urlRep;}
  _urlRepUygulandi = true;
  // Parametreyi adres çubuğundan da temizle: sayfa yenilense bile artık
  // kullanıcının o an seçtiği repertuvar korunur (geçmişe yeni kayıt eklemez).
  try {
    if (urlRep && window.history && history.replaceState) {
      const u = new URL(window.location.href);
      u.searchParams.delete('rep');
      history.replaceState({}, '', u.pathname + (u.search || '') + u.hash);
    }
  } catch(e) {}
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
  if (!localHadData) sync('spin',_r('rep.yukleniyor','Yükleniyor...'));

  // ── 2) ARKA PLANDA SUNUCUYLA SENKRONİZE ET (timeout'lu — asılı kalmasın) ──
  try{
    const uid2 = getUserId();
    const gid = getGroupId();
    // (2026-08-20) YENİ MODEL: istemci tarafındaki `or=(owner_id,group_id,is_public)`
    // süzgeci KALDIRILDI. Görünürlüğü artık sunucudaki `repertoires_read` politikası
    // belirliyor (public / sahip / visibility='group' ∩ repertoire_group_shares ∩
    // my_group_ids() / repertoire_shares ile kişisel paylaşım — log-23 564/565).
    // Eski süzgeç yalnız `group_id` ve `is_public` sütunlarına bakıyordu; bu yüzden
    // (a) yeni modelde gruba PAYLAŞIM SATIRIYLA açılmış ama `group_id`'si boş bir
    // repertuvar ve (b) `repertoire_shares` ile KİŞİSEL paylaşılmış bir repertuvar
    // RLS'ten geçtiği hâlde istemcide eleniyordu. Süzgeci kaldırmak yalnızca eksileni
    // geri getirir; fazladan hiçbir satır gelmez, çünkü RLS zaten üst sınırdır.
    const repQuery = 'order=created_at&limit=100';
    const solQuery = gid ? 'order=name&group_id=eq.'+gid : 'order=name';
    // Yerel veri zaten ekrandaysa uzun beklemeye gerek yok — 3.5 sn'de gelmezse
    // sessizce local ile devam. Yerel veri yoksa ağa biraz daha şans ver (4.5 sn).
    const timeoutMs = localHadData ? 3500 : 4500;
    // (2026-08-20) Dördüncü istek: hangi repertuvar hangi gruba açılmış.
    // `.catch(()=>null)` ŞART — bu istek başarısız olursa (RLS/ağ) tüm
    // Promise.all düşer ve repertuvar listesi HİÇ gelmezdi; null dönerse
    // yalnızca harita tazelenmez, eski haritayla devam edilir.
    const [r,i,s,gs] = await Promise.all([
      dbGet('repertoires', repQuery, AbortSignal.timeout(timeoutMs)),
      dbGet('repertoire_items','order=seq', AbortSignal.timeout(timeoutMs)),
      dbGet('solistler', solQuery, AbortSignal.timeout(timeoutMs)),
      dbGet('repertoire_group_shares','select=repertoire_id,group_id&limit=2000', AbortSignal.timeout(timeoutMs)).catch(()=>null)
    ]);
    repGrupHaritasiKur(gs);
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
      sync('err', reallyOffline ? _r('rep.cevrimdisiKisa','Çevrimdışı') : _r('rep.baglantiHatasiKisa','Bağlantı hatası'));
    }
    if (reallyOffline) toast(_r('rep.cevrimdisiMod','📵 Çevrimdışı mod — yerel veriler gösteriliyor'), 'ok');
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
  toast(_r('rep.gorunumdenKaldirildi','Görünümünden kaldırıldı'));
  renderList();
}

function renderList(){
  const el=document.getElementById('list');
  if(!reps.length){el.innerHTML='<div style="padding:30px 16px;text-align:center;color:var(--text3);">Henüz repertuvar yok</div>';return;}
  // (2026-08-22) SIRALAMA ARTIK BURADA — KAYNAK NE OLURSA OLSUN AYNI.
  // Belirti (Emir bildirdi): telefon ile tablette repertuvar sırası farklıydı.
  // KANIT: telefonun sırası `created_at` artan (sunucu sırası), tabletinki ise
  // repertuvar KİMLİKLERİNİN (uuid) harf sırası — yani IndexedDB'nin `getAll()`
  // çıktısı, çünkü o kayıtları birincil anahtar sırasında döndürüyor.
  // İki bölümde de (Repertuvarlarım + Genel) bu eşleşme birebir tuttu.
  // `created_at`te eşit/boş değer YOK (21 kayıt, 21 farklı zaman) ⇒ sorun
  // sunucu sıralamasının belirsizliği DEĞİL, listenin gelen sırayı olduğu gibi
  // basmasıydı: yerelden çizilen cihaz uuid sırasında kalıyordu.
  // Çözüm sıralamayı ÇİZİM anına almak; veri nereden gelirse gelsin sonuç aynı.
  const _sira = (a, b) => {
    const ta = Date.parse(a.created_at || '') || 0;
    const tb = Date.parse(b.created_at || '') || 0;
    if (ta !== tb) return ta - tb;                     // eskiden yeniye
    return String(a.name||'').localeCompare(String(b.name||''), 'tr');  // eşitse ada göre
  };
  const filtered = reps.filter(r=>repMatchesSearch(r, repSearchQuery)).sort(_sira);
  if(repSearchQuery && !filtered.length){el.innerHTML='<div style="padding:30px 16px;text-align:center;color:var(--text3);">' + _r('rep.sonucYok','"{q}" için sonuç bulunamadı').replace('{q}', repSearchQuery) + '</div>';return;}
  const sl={concept:_r('rep.taslak','Taslak'),confirmed:_r('rep.onaylandi','Onaylandı'),archive:_r('rep.arsiv','Arşiv')};
  const sc={concept:'sc',confirmed:'sf',archive:'sa'};
  const hiddenIds = getHiddenRepIds();
  // BÖLÜMLEME ÖNCELİĞİ: grup > sahip > public (en özel ilişki kazanır).
  // Grubuma ait bir repertuvar, KİM oluşturmuş olursa olsun (kurucu/admin dahil)
  // "Grubun Repertuvarları" altında toplanır — grup işi tek yerde dursun.
  // "Repertuvarlarım" = yalnızca gruba bağlı OLMAYAN kişisel repertuvarlarım.
  // Her kayıt tek bölümde çıkar; kart içeriği/kaydırma davranışı hâlâ isOwner'a bakar.
  const myGid   = getGroupId();
  // (2026-08-20) YENİ MODEL: bölümleme `visibility` üzerinden. Bir repertuvarın
  // HANGİ gruba açıldığı istemcide bilinmiyor (paylaşım satırları çekilmiyor), ama
  // gerek de yok: RLS yalnızca BENİM grubuma açılmış olanları döndürüyor, dolayısıyla
  // elimize gelen her visibility='group' satırı tanım gereği benim grubumun işi.
  // `group_id` yedek olarak duruyor (göç öncesi önbellek satırları için).
  // (2026-08-20) DÜZELTME: eskiden `inGroup` her visibility='group' satırını
  // "benim grubum" sayıyordu; çok gruba üye olan kullanıcıda İKİ GRUBUN
  // repertuvarları tek listede karışıyordu (bkz. repAktifGruptaMi başlığı).
  // Artık yalnız AKTİF gruba ait olanlar grup bölümüne giriyor; öteki
  // gruplarımın repertuvarları listeden tamamen çıkıyor ve altta sayısı
  // yazılıyor — grup değiştirilince geri gelirler.
  const inGroup = r => repAktifGruptaMi(r);
  const baskaGrup = filtered.filter(repBaskaGrubunMu);
  const gorunur = filtered.filter(r => !repBaskaGrubunMu(r));
  const mine = gorunur.filter(r => r.isOwner && !inGroup(r));
  const grp  = gorunur.filter(r => inGroup(r) && (r.isOwner || !hiddenIds.includes(r.id)));
  const pub  = gorunur.filter(r => !r.isOwner && repVis(r) === 'public' && !inGroup(r) && !hiddenIds.includes(r.id));
  // DÖRDÜNCÜ BÖLÜM (yeni): ne benim, ne grubumun, ne genel — yani `repertoire_shares`
  // ile DOĞRUDAN BANA açılmış repertuvarlar. Eski istemci süzgeci bunları zaten hiç
  // getirmiyordu; süzgeç kalkınca geliyorlar ve bir bölüme yerleşmezlerse listede
  // hiç görünmeden kaybolurlardı.
  const paylasilan = gorunur.filter(r =>
    !r.isOwner && !inGroup(r) && repVis(r) !== 'public' && !hiddenIds.includes(r.id));
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
      <div><div class="rn">${r.name}${repVis(r)==='public'&&r.isOwner?' <i class="ti ti-world" style="font-size:12px;color:#4ade80;vertical-align:-1px;" title="Herkese açık" aria-hidden="true"></i>':''}</div>
      <div class="rm"><span class="sp ${sc[r.status]||'sc'}">${sl[r.status]||'Taslak'}</span>${medleyChip}${r.date?'<span>'+r.date+'</span>':''}</div></div>
      <div class="rc">${(r.items||[]).length} ${_rBirim((r.items||[]).length)}</div>
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
    html += '<div style="padding:8px 12px 4px;font-size:17px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;"><i class="ti ti-playlist" style="font-size:16px;vertical-align:-2px;" aria-hidden="true"></i> ' + _r('rep.benim','Repertuvarlarım') + '</div>';
    html += mine.map(repCard).join('');
  }
  if(grp.length){
    html += '<div style="padding:12px 12px 4px;font-size:17px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;border-top:1px solid var(--border);margin-top:8px;"><i class="ti ti-users-group" style="font-size:16px;vertical-align:-2px;" aria-hidden="true"></i> ' + _r('rep.grubun','Grubun Repertuvarları') + '</div>';
    html += grp.map(repCard).join('');
  }
  if(paylasilan.length){
    html += '<div style="padding:12px 12px 4px;font-size:17px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;border-top:1px solid var(--border);margin-top:8px;"><i class="ti ti-user-share" style="font-size:16px;vertical-align:-2px;" aria-hidden="true"></i> ' + _r('rep.paylasilan','Benimle Paylaşılanlar') + '</div>';
    html += paylasilan.map(repCard).join('');
  }
  if(pub.length){
    html += '<div style="padding:12px 12px 4px;font-size:17px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;border-top:1px solid var(--border);margin-top:8px;"><i class="ti ti-world" style="font-size:16px;vertical-align:-2px;" aria-hidden="true"></i> ' + _r('rep.genelrep','Genel Repertuvarlar') + '</div>';
    html += pub.map(repCard).join('');
  }
  // Öteki gruplarımın repertuvarları listeden çıkarıldı; SESSİZCE kaybolmasınlar —
  // kullanıcı "repertuvarım silinmiş" sanmasın diye sayısı ve nasıl görüleceği yazılı.
  if(baskaGrup.length){
    // (2026-08-30) Bu not ÜSTTEN ayraçlıydı ama ALTTAN açık kalıyordu; kolonun
    // sol çizgisi aşağı devam edince metin boşlukta duruyormuş gibi
    // görünüyordu. Kendi kutusuna alındı: hafif zemin + tam çerçeve, böylece
    // nerede bittiği belli oluyor.
    // Kenar boşluğu YOK: `.ri` kartları da kapsayıcıyı tam dolduruyor
    // (yalnızca margin-bottom var). 10px vermek notu kartlardan dar
    // gösteriyordu — hizasız duruyordu.
    html += '<div style="margin:12px 0 16px;padding:12px 13px;font-size:12.5px;'
         +  'color:var(--text3);line-height:1.6;background:var(--surface2);'
         +  'border:1px solid var(--border);border-radius:10px;">'
         +  '<i class="ti ti-users-group" style="font-size:14px;vertical-align:-2px;" aria-hidden="true"></i> '
         +  _r('rep.baskaGrup1','Diğer gruplarında') + ' <b>' + baskaGrup.length + '</b> '
         +  _r('rep.baskaGrup2','repertuvar daha var. Grubunu değiştirdiğinde görünürler.') + '</div>';
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
  const sl={concept:_r('rep.taslak','Taslak'),confirmed:_r('rep.onaylandi','Onaylandı'),archive:_r('rep.arsiv','Arşiv')};
  const sc={concept:'sc',confirmed:'sf',archive:'sa'};
  const items=rep.items||[];
  // ── POTPURİ: zincir hesapları (linkedPrev ardışık satır zinciri) ──
  // Sıra numarası yalnızca zincir BAŞLARINDA artar; devam satırları "↳" gösterir.
  let _medleyN = 0;
  for(let i=1;i<items.length;i++){ if(items[i].linkedPrev && !items[i-1].linkedPrev) _medleyN++; }
  // (2026-08-06) Başlıkta İKİ SAYI: kaç ESER var ve kaç SIRA (program maddesi).
  // Potpuri zinciri tek madde sayıldığı için bağlı satırlar numara almıyor;
  // "18 eser" yazarken listenin 16'da bitmesi kafa karıştırıyordu (Emir).
  // Fark yoksa ikinci sayı hiç yazılmıyor.
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
    // (2026-08-12) HTML5 drag öznitelikleri KALDIRILDI — sürükleme artık
    // yalnızca ⠿ tutamacından, tek bir pointer tabanlı kodla yapılıyor.
    return `<tr data-idx="${idx}" data-rep="${rep.id}" style="touch-action:pan-y;"${rowClasses?' class="'+rowClasses+'"':''}>
      <td class="sq" style="text-align:center;user-select:none;padding:0 2px;vertical-align:middle;width:48px;">
        <div style="display:flex;align-items:center;justify-content:center;gap:3px;">
          <!-- (2026-08-06) Aktif satırdaki ▶ işareti KALDIRILDI: potpuri zincirinin
               sarı köşeli çizgisiyle aynı dar hücreye binince okunmayan bir şekil
               çıkıyordu (Emir bildirdi). Aktiflik zaten satır vurgusu + accent
               renkli kalın numarayla belli oluyor. -->
          <span style="color:${isActive?'var(--accent)':(linked?'var(--accent2)':'var(--text3)')};font-size:11px;font-weight:${isActive?'800':'600'};min-width:16px;" title="${linked?_r('rep.potpuriT','Potpuri — bir öncekiyle kesintisiz'):''}">${linked?'↳':_no[idx]}</span>
          ${_canM?`<span class="drag-handle" onpointerdown="dragPointerStart(event)" title="Sürükleyerek taşı">⠿</span>`:''}
        </div>
      </td>
      <td style="padding-left:16px;cursor:pointer;" onclick="openLyricsSheet('${it.workId}','${rep.id}','${it.id}')" title="Sözleri göster — düzenlemek için pencerede Düzenle">
        <div class="wn">${linked?'<span class="medley-chip" title="Potpuri devamı">🔗</span> ':''}${w.name||'#'+it.workId}</div>
        <div class="ws">${[w.makam,w.composer].filter(Boolean).join(' · ')}</div>
        ${pf ? '<div style="font-size:11px;color:var(--accent);margin-top:2px;">🎤 '+pf+'</div>' : ''}
      </td>
      <td class="col-kapanis">${cn?'<span class="cn">'+cn+'</span>':''}</td>
      <td class="col-not" style="color:var(--text3);font-size:12px;">${it.note||''}</td>
      <td><div class="ra">
        ${_knotDugme(it.workId)}
        ${_canM?`
        <button class="br${activeItemRepId===rep.id&&activeItemIdx===idx?' active':''}" onclick="mvActive('${rep.id}',${idx},-1)" ${idx===0?'disabled':''}>↑</button>
        <button class="br${activeItemRepId===rep.id&&activeItemIdx===idx?' active':''}" onclick="mvActive('${rep.id}',${idx},1)" ${idx===items.length-1?'disabled':''}>↓</button>
        <button class="br bl${linked?' linked':''}" onclick="toggleLink('${rep.id}','${it.id}')" ${idx===0?'disabled':''} title="${linked?'Potpuri bağını çöz':_r('rep.potpuriYap','Bir öncekiyle potpuri yap (kesintisiz devam)')}">🔗</button>
        <button class="br be" onclick="openItemEdit('${rep.id}','${it.id}')"><i class="ti ti-edit" aria-hidden="true"></i></button>
        <button class="br dl" onclick="rmItem('${rep.id}','${it.id}','${(w.name||'Bu eser').replace(/'/g,"\\'")}')"><i class="ti ti-trash" aria-hidden="true"></i></button>
        `:''}
      </div></td>
    </tr>`;
  }).join(''):`<tr><td colspan="5" class="ei">Henüz eser eklenmedi.</td></tr>`;

  dc.innerHTML=`
    <div class="dh" style="padding:10px 14px 8px;">
      <div class="mobile-back-btn" onclick="goBackToList()" style="display:none;margin:-10px -14px 8px;padding:8px 14px;" id="mobileBackBtn">← Repertuvar Listesi</div>
      <div class="dn" style="font-size:14px;font-weight:600;line-height:1.4;word-break:break-word;margin-bottom:8px;">${rep.name}</div>
      <div class="cta-row">
        <a href="stage.html" class="bstage-primary" onclick="localStorage.setItem('stageRepId','${rep.id}');localStorage.setItem('stageSource','repertoires');localStorage.setItem('stageShowChords','0')"><i class="ti ti-microphone" style="font-size:15px;" aria-hidden="true"></i> Sahneye Çık</a>
        ${(rep.items||[]).length ? `<button class="bi" style="font-size:12px;padding:9px 12px;" onclick="openDinleSheet('${rep.id}')" title="Repertuvarı YouTube bağlantılarından sırayla dinle">🎧 Dinle</button>` : ''}
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
      <div class="ih"><h3>${items.length} Eser${_no.filter(n=>n!==null).length!==items.length?` <span style="font-weight:500;color:var(--text3);font-size:12px;">· ${_no.filter(n=>n!==null).length} sıra</span>`:''}</h3>${rep.canManage?`<button class="baw" onclick="openWM('${rep.id}')">+ Eser Ekle</button>`:''}</div>
      <table><thead><tr><th class="sq" style="text-align:center;">Sıra</th><th>Eser Adı</th><th class="col-kapanis">Kapanış</th><th class="col-not">Not</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
}

// (2026-08-05) Karttaki görünürlük çipi ikili (Public/Private) kalmıştı — modaldaki
// üçlü seçimle (Kişisel/Grup/Genel) uyumsuzdu ve grup repertuvarı "🔒 Private"
// görünüyordu. Artık çip GERÇEK durumu gösteriyor. Tıklayınca doğrudan yayına
// almak yerine düzenleme modalı açılıyor: yanlış paylaşım geri alınamaz (içerik
// görülmüş olur), bu yüzden tek dokunuşla herkese açma bilerek kaldırıldı.
// (2026-08-20) YENİ GÖRÜNÜRLÜK MODELİ — TEK OKUMA NOKTASI.
// Görünürlük artık `repertoires.visibility` ('public'|'group'|'private') sütununda;
// grup erişimi `repertoire_group_shares` tablosundan RLS içinde çözülüyor
// (log-23 561/564/565). Eski `is_public`/`group_id` sütunları tabloda DURUYOR ama
// artık kaynak DEĞİL. Yedek dal yalnızca göçten önce yazılmış IndexedDB önbelleği
// içindir — `visibility` alanı gelen her sunucu satırında var.
function repVis(r){
  const v = r && r.visibility;
  if (v === 'public' || v === 'group' || v === 'private') return v;
  return (r && r.is_public) ? 'public' : ((r && r.group_id) ? 'group' : 'private');
}

function visChip(rep){
  const v = repVis(rep);
  // İkonlar Tabler setinden (projenin standardı) — emoji KULLANILMIYOR.
  // ti-users-group, sol menüdeki "Grup / Koro" öğesiyle AYNI ikon (topnav.js:651).
  const map = {
    public:  ['pub',  'ti-world', 'Genel',   _r('rep.genelT','Herkese açık — değiştirmek için tıkla')],
    group:   ['grp',  'ti-users-group', 'Grup',    _r('rep.grupT','Grup üyeleri görebilir — değiştirmek için tıkla')],
    private: ['priv', 'ti-lock',  _r('rep.kisisel','Kişisel'), _r('rep.kisiselT','Yalnızca sen görebilirsin — değiştirmek için tıkla')]
  };
  const [cls,icon,label,title] = map[v];
  return `<span class="chip-vis ${cls}" onclick="openEdit('${rep.id}')" title="${title}"><i class="ti ${icon}" style="font-size:13px;" aria-hidden="true"></i> ${label}</span>`;
}

async function copyRep(repId){
  const rep=getRep(repId);if(!rep)return;
  const uid=getUserId();
  sync('spin',_r('rep.kopyalaniyor','Kopyalanıyor...'));
  try{
    // Yeni repertuvar oluştur
    const H=authHeaders();
    const r=await fetch(SUPA_URL+'/rest/v1/repertoires',{
      method:'POST',
      headers:{...H,'Prefer':'return=representation'},
      // Kopya her zaman KİŞİSEL doğar (yeni model: visibility='private').
      body:JSON.stringify({name:rep.name+' (kopya)',status:'concept',user_id:uid,owner_id:uid,visibility:'private',is_public:false,group_id:null})
    });
    if(!r.ok)throw new Error(await r.text());
    const [newRep]=await r.json();
    // Eserleri kopyala
    if(rep.items&&rep.items.length){
      // (2026-08-22) Bu isteğin yanıtı HİÇ KONTROL EDİLMİYORDU: eser ekleme
      // başarısız olsa bile (RLS/ağ) altta "Repertuvar kopyalandı!" yazıyor,
      // kullanıcı BOŞ bir repertuvarla kalıyordu. Artık dönen satırlar sayılıyor
      // ve eksik varsa dürüstçe söyleniyor — repertuvarın kendisi oluştu, o
      // yüzden hata FIRLATILMIYOR, yalnız uyarı veriliyor.
      const ri = await fetch(SUPA_URL+'/rest/v1/repertoire_items',{
        method:'POST',
        headers:{...H,'Prefer':'return=representation'},
        body:JSON.stringify(rep.items.map((it,i)=>({repertoire_id:newRep.id,work_id:parseInt(it.workId),seq:i+1,closing_note:it.closingNote||null,note:it.note||null,performer:it.performer||null,linked_prev:i>0&&!!it.linkedPrev})))
      });
      const eklenen = ri.ok ? ((await ri.json().catch(()=>[]))||[]).length : 0;
      if (eklenen < rep.items.length) {
        toast(_r('rep.kismiEklendi','Repertuvar oluştu ama eserlerin {n}/{t} tanesi eklenebildi.').replace('{n}',eklenen).replace('{t}',rep.items.length), 'err');
        await load(); selId = newRep.id; renderList(); renderDetail();
        return;
      }
    }
    toast(_r('rep.kopyalandi','📋 Repertuvar kopyalandı!'));
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
function openEdit(id){const r=getRep(id);if(!r)return;editId=id;document.getElementById('rmt').textContent=_r('rep.duzenle','Düzenle');document.getElementById('fN').value=r.name;document.getElementById('fD').value=r.date||'';document.getElementById('fV').value=r.venue||'';document.getElementById('fS').value=r.status||'concept';document.getElementById('fNo').value=r.notes||'';applyVisOptions();setVisChoice(repVis(r));document.getElementById('rm').style.display='flex';}
function closeRM(){document.getElementById('rm').style.display='none';}

// (2026-08-20) YENİ MODEL — GRUP PAYLAŞIM SATIRI.
// `visibility='group'` TEK BAŞINA yetmiyor: `repertoires_read` politikası grup
// erişimini `repertoire_group_shares` tablosundan okuyor, sütundan değil.
// Satır yoksa repertuvarı yalnız sahibi görür (2026-08-17'deki hata tam buydu).
// ⚠️ `rgs_write` politikası `is_group_manager(group_id)` istiyor: DÜZ ÜYE bu satırı
// yazamaz. O yüzden hata YUTULMUYOR — çağıran taraf kullanıcıya dürüst söylüyor.
// Dönüş: {ok:true} | {ok:false, mesaj:'...'}
async function repGrupPaylasimiUygula(repId, vis, gid){
  if(!repId) return {ok:true};
  try{
    if(vis === 'group'){
      if(!gid) return {ok:false, mesaj:_r('rep.grupBilgiYok','Grup bilgisi bulunamadı — repertuvar grupla paylaşılamadı.')};
      await dbPost('repertoire_group_shares',{repertoire_id:repId, group_id:gid, shared_by:getUserId()||undefined});
    } else {
      // Gruptan geri çekme: satır kalırsa repertuvar kişisel görünse bile grup
      // üyeleri okumaya devam eder.
      await dbDelWhere('repertoire_group_shares','repertoire_id',repId);
    }
    return {ok:true};
  }catch(e){
    const m = String(e && e.message || '');
    // Aynı satır zaten varsa (bileşik birincil anahtar) bu bir hata değil.
    if(/duplicate key|23505|already exists/i.test(m)) return {ok:true};
    console.error('[grup paylaşımı]', m);
    if(vis === 'group') return {ok:false, mesaj:_r('rep.grupPaylasilamadi','Repertuvar oluşturuldu ama GRUPLA PAYLAŞILAMADI (grup yöneticisi yetkisi gerekiyor). Şimdilik yalnızca siz görüyorsunuz.')};
    return {ok:false, mesaj:_r('rep.grupKaldirilamadi','Grup paylaşımı kaldırılamadı — grup üyeleri bu repertuvarı görmeye devam edebilir.')};
  }
}

async function saveRep(){
  const name=document.getElementById('fN').value.trim();
  if(!name){document.getElementById('fN').focus();return;}
  const vis=getVisChoice();
  const myGid=getGroupId()||null;
  const isPublic=(vis==='public');
  // Kişiselde group_id BOŞ yazılır — düzenlemede de gönderiliyor ki bir repertuvar
  // sonradan gruba taşınabilsin ya da gruptan geri çekilebilsin.
  const groupId=(vis==='private')?null:myGid;
  // (2026-08-20) YENİ MODEL: `visibility` ARTIK AÇIKÇA YAZILIYOR. 2026-08-17'deki
  // "yeni repertuvarlar gruba görünmüyor" hatasının sebebi tam olarak buydu —
  // istemci yalnız group_id/is_public yazıyor, `visibility` sütunun varsayılanı
  // ('private') ile kalıyordu. Eski sütunlar da yazılmaya devam ediyor: aynı veriyi
  // hâlâ eski modelle okuyan sayfalar var (stage.html, eserler.html — 3. aşamanın
  // kalan maddesi), göç bitene kadar ikisi tutarlı tutuluyor.
  const data={name,date:document.getElementById('fD').value||null,venue:document.getElementById('fV').value.trim()||null,status:document.getElementById('fS').value,notes:document.getElementById('fNo').value.trim()||null,visibility:vis,is_public:isPublic,group_id:groupId,user_id:getUserId()||undefined,owner_id:editId?undefined:(getUserId()||undefined)};
  sync('spin','Kaydediliyor...');
  try{
    let repId=editId;
    if(editId){await dbPatch('repertoires',editId,data);}
    else{const r=await dbPost('repertoires',data);repId=r[0]?.id||r.id;selId=repId;}
    // Grup görünürlüğü PAYLAŞIM SATIRINA bağlı; sütun tek başına yetmiyor.
    const pay = await repGrupPaylasimiUygula(repId, vis, myGid);
    closeRM();
    toast(pay.ok ? 'Kaydedildi ✓' : pay.mesaj, pay.ok ? 'ok' : 'er');
    await load();
  }catch(e){sync('err','Hata');toast(e.message,'er');}
}

async function delRep(id){
  if(!confirm(_r('rep.silOnay','Bu repertuvarı silmek istiyor musunuz?')))return;
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
  const matches = _pfAdaylar(q, pfSelected);
  if (!matches.length) { pfHideDropdown(); return; }
  dd.innerHTML = matches.slice(0,10).map(m =>
    '<div class="pf-dd-item" onmousedown="event.preventDefault();pfAdd(\''
    + m.deger.replace(/'/g, "\\'") + '\')">' + m.etiket + '</div>'
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

// Düzenle düğmesi için: pencere hangi satırdan açıldıysa onu hatırlıyoruz.
// (2026-08-06) Emir'in geri bildirimi: satır düğmeleri yalnızca üstüne gelince
// beliriyor ve "bulmak için aramak gerekiyor" — esere zaten tıklanmış olduğu
// için düzenlemenin doğru yeri burası.
let _lycRepId = null, _lycItemId = null;

function openLyricsSheet(workId, repId, itemId){
  _lycRepId = repId || null;
  _lycItemId = itemId || null;
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
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
            <button id="lycEditBtn" onclick="lycEdit()" style="display:none;background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;">
              <i class="ti ti-edit" style="font-size:13px;" aria-hidden="true"></i> Düzenle
            </button>
            <button onclick="closeLyricsSheet()" aria-label="Kapat" style="background:none;border:none;color:var(--text3);font-size:22px;line-height:1;cursor:pointer;padding:0 2px;">×</button>
          </div>
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

  // Düzenle yalnızca yetki varsa ve satır bilgisi elimizdeyse görünür
  const eb = document.getElementById('lycEditBtn');
  if (eb) {
    const rep = _lycRepId ? getRep(_lycRepId) : null;
    eb.style.display = (rep && rep.canManage && _lycItemId) ? 'inline-flex' : 'none';
  }
  ov.style.display = 'flex';
}

function lycEdit(){
  const repId = _lycRepId, itemId = _lycItemId;
  closeLyricsSheet();
  if (repId && itemId) openItemEdit(repId, itemId);
}

function closeLyricsSheet(){
  const ov = document.getElementById('lycOverlay');
  if(ov) ov.style.display = 'none';
}

async function addWork(){
  if(!selWId){alert(_r('rep.eserSecin','Lütfen bir eser seçin.'));return;}
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
    // linked_prev açıkça false: kolon varsayılanı `true` olduğu için alan
    // gönderilmezse yeni eser kendiliğinden potpuriye bağlı doğuyordu (2026-08-06)
    await dbPost('repertoire_items',{repertoire_id:addRepId,work_id:selWId,seq:nextSeq,linked_prev:false,closing_note:document.getElementById('fCN').value.trim()||null,note:document.getElementById('fIN').value.trim()||null,performer:pfSelected.length?pfSelected.join(', '):null});
    closeWM();toast('Eser eklendi ✓');await load();
  }catch(e){toast(e.message,'er');}
}

async function rmItem(repId,itemId,workName){
  if(!confirm(_r('rep.cikarOnay','{ad} repertuvardan çıkarılsın mı?').replace('{ad}', workName||_r('rep.buEser','Bu eser'))))return;
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
  if(a.makamAd && a.makamAd===b.makamAd) return {c:0,txt:_r('rep.ayniMakam','aynı makam: {x}').replace('{x}',a.makamAd),lvl:'ok'};
  const d0=Math.abs(a.karar-b.karar)%12;
  const d=Math.min(d0,12-d0);
  if(d===0) return {c:1,txt:_r('rep.ayniKarar','aynı karar: {x}').replace('{x}',_PCNAME[a.karar]),lvl:'ok'};
  if(a.aile && a.aile===b.aile) return {c:1.5,txt:_r('rep.ayniAile','aynı aile: {x}').replace('{x}',a.aile),lvl:'ok'};
  if(d===2||d===5) return {c:2,txt:(d===2?_r('rep.tamSes','tam ses'):_r('rep.dortlu','dörtlü'))+_r('rep.aralik',' aralık'),lvl:'mid'};
  if(d===3||d===4) return {c:3,txt:_r('rep.ucluAralik','üçlü aralık'),lvl:'mid'};
  return {c:5,txt:(d===1?_r('rep.yarimSes','yarım ses'):_r('rep.artikDortlu','artık dörtlü'))+_r('rep.kulagiZorlar',' — kulağı zorlar'),lvl:'bad'};
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
  if(!MAKAMS_OK){ toast(_r('rep.makamTabloYok','Makam tablosu yüklenmedi — makamlar.sql çalıştırıldı mı?'),'er'); return; }
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
  sc.textContent = diff>0.01 ? (_r('rep.gecisPuani','Geçiş puanı {a} → {b} (iyileşme)').replace('{a}',cBefore.toFixed(1)).replace('{b}',cAfter.toFixed(1)))
                 : (diff<-0.01 ? (_r('rep.puanYukseliyor','Bu mod puanı yükseltiyor: {a} → {b}').replace('{a}',cBefore.toFixed(1)).replace('{b}',cAfter.toFixed(1)))
                 : _r('rep.siraUygun','Sıra zaten uygun görünüyor'));
}

async function applySort(){
  const rep=getRep(_sortRepId); if(!rep||!_sortProposal) return;
  const orig=[...rep.items];
  const merged=[..._sortProposal];
  const repId=_sortRepId;
  closeSortSheet();
  await applyReorder(repId, orig, merged, null);
  toast(_r('rep.siralamaUygulandi','Sıralama uygulandı'));
}

// ── SÜRÜKLE-BIRAK (2026-08-12) — TEK KOD, HEM FARE HEM PARMAK ──────────────
// Eskiden İKİ AYRI yol vardı: masaüstü için HTML5 drag (draggable/ondragstart),
// dokunmatik için ontouchstart/move/end. İkisinin de sorunu vardı:
//   1) Masaüstünde sürükleme hiç çalışmıyordu (Emir bildirdi).
//   2) Dokunmatikte ekranın üstünde/altında kalan satırlara ulaşılamıyordu —
//      liste kaymadığı için eseri bırakıp kaydırıp yeniden tutmak gerekiyordu.
// Pointer olayları fare, parmak ve kalemi aynı arayüzle verdiği için tek kod
// yeterli; ayrıca kenara yaklaşınca OTOMATİK KAYDIRMA eklendi.
// Sürükleme yalnızca ⠿ tutamacından başlar: satırın kendisi serbest kalır,
// böylece esere tıklayıp söz penceresini açmak bozulmaz.
let _dragTr = null, _dragScroller = null, _dragRaf = null, _dragHiz = 0;

function _scrollKabi(el) {
  // Tabloyu içeren, gerçekten kaydırılabilir en yakın ata; yoksa sayfa.
  for (let p = el; p && p !== document.body; p = p.parentElement) {
    let ov = '';
    try { ov = getComputedStyle(p).overflowY; } catch (e) {}
    if ((ov === 'auto' || ov === 'scroll') && p.scrollHeight > p.clientHeight + 4) return p;
  }
  return null;   // null = pencere
}

function _dragKaydir() {
  _dragRaf = null;
  if (!_dragTr || !_dragHiz) return;
  // (2026-08-12) Kap SINIRA gelince PENCEREYE devrediyoruz. Emir bildirdi:
  // "listenin başına ve sonuna gelince tablette scroll çalışmıyor" — iç kap
  // (tablo kabı) en üste/en alta dayandığında scrollTop artık değişmiyordu ve
  // sayfa kaydırılmadığı için sürükleme orada takılıyordu.
  var hareket = false;
  if (_dragScroller) {
    var once = _dragScroller.scrollTop;
    _dragScroller.scrollTop += _dragHiz;
    hareket = (_dragScroller.scrollTop !== once);
  }
  if (!hareket) window.scrollBy(0, _dragHiz);
  _dragRaf = requestAnimationFrame(_dragKaydir);
}

function _dragKenarKontrol(y) {
  // Görünür alanın üst/alt 90 pikselinde kaydır; kenara yaklaştıkça hızlan.
  // Hem kabın hem pencerenin kenarı sayılır: parmak ekranın en altındayken
  // kap kutusu daha yukarıda bitiyorsa da kaydırma başlamalı.
  const k = _dragScroller ? _dragScroller.getBoundingClientRect() : null;
  const kutu = {
    top:    k ? Math.max(0, k.top) : 0,
    bottom: k ? Math.min(window.innerHeight, k.bottom) : window.innerHeight
  };
  const esik = 90, maks = 18;
  let hiz = 0;
  if (y < kutu.top + esik)         hiz = -Math.ceil(maks * (kutu.top + esik - y) / esik);
  else if (y > kutu.bottom - esik) hiz =  Math.ceil(maks * (y - (kutu.bottom - esik)) / esik);
  _dragHiz = Math.max(-maks, Math.min(maks, hiz));
  if (_dragHiz && !_dragRaf) _dragRaf = requestAnimationFrame(_dragKaydir);
}

function dragPointerStart(e) {
  if (e.button != null && e.button !== 0) return;   // yalnızca sol tuş
  e.preventDefault();
  e.stopPropagation();
  const tr = e.currentTarget.closest('tr[data-idx]');
  if (!tr) return;

  _dragTr = tr;
  _dragSrcIdx = parseInt(tr.dataset.idx);
  _dragRepId  = tr.dataset.rep;
  _dragScroller = _scrollKabi(tr);

  _touchSrcTr = tr;
  _touchClone = tr.cloneNode(true);
  _touchClone.style.cssText = 'position:fixed;z-index:9999;opacity:.9;pointer-events:none;'
    + 'background:var(--surface2);border:1px solid var(--accent);border-radius:6px;'
    + 'box-shadow:0 8px 24px rgba(0,0,0,.45);width:' + tr.offsetWidth + 'px;transition:none;';
  document.body.appendChild(_touchClone);
  tr.style.opacity = '.3';
  document.body.style.userSelect = 'none';
  _dragKonumla(e.clientX, e.clientY);

  try {
    e.currentTarget.setPointerCapture(e.pointerId);
    // Yakalama düşerse (ör. satır yeniden çizimle silindi) sürükleme biter.
    e.currentTarget.addEventListener('lostpointercapture', _dragIptal, { once: true });
  } catch (err) {}
  document.addEventListener('pointermove', _dragPointerMove, { passive: false });
  document.addEventListener('pointerup', _dragPointerEnd);
  document.addEventListener('pointercancel', _dragPointerEnd);
  window.addEventListener('blur', _dragIptal);
}

function _dragKonumla(x, y) {
  if (!_touchClone) return;
  _touchClone.style.left = (x - _touchClone.offsetWidth / 2) + 'px';
  _touchClone.style.top  = (y - 20) + 'px';
}

function _dragPointerMove(e) {
  if (!_touchClone) return;
  e.preventDefault();
  _dragKonumla(e.clientX, e.clientY);
  _dragKenarKontrol(e.clientY);

  _touchClone.style.display = 'none';
  const el = document.elementFromPoint(e.clientX, e.clientY);
  _touchClone.style.display = '';
  const hedef = el ? el.closest('tr[data-idx]') : null;
  document.querySelectorAll('tr.drag-over').forEach(r => r.classList.remove('drag-over'));
  if (hedef && hedef !== _dragTr) hedef.classList.add('drag-over');
}

// (2026-08-12) 🐛 SÜRÜKLENEN KOPYA EKRANDA ASILI KALIYORDU.
// Emir masaüstünde bir satırı uzunca basılı tutup bıraktı; yarı saydam kopya
// ekranın ortasında takılı kaldı. Konsol sebebi gösterdi: sürükleme sırasında
// arka arkaya `postgres_changes` olayları düşmüş ve liste YENİDEN ÇİZİLMİŞ.
// Tutulan satır DOM'dan silinince pointer yakalaması düşüyor ve bitirici
// hiç çağrılmıyordu. Üç katmanlı savunma: (1) sürükleme sürerken yeniden
// çizim ERTELENİYOR (aşağıdaki _refresh), (2) bitirme birden çok olaydan
// tetikleniyor (pointerup/cancel + lostpointercapture + pencere blur +
// sekme gizlenmesi), (3) temizlik TEK yerde ve her koşulda çalışıyor.
function _dragTemizle() {
  document.removeEventListener('pointermove', _dragPointerMove);
  document.removeEventListener('pointerup', _dragPointerEnd);
  document.removeEventListener('pointercancel', _dragPointerEnd);
  window.removeEventListener('blur', _dragIptal);
  _dragHiz = 0;
  if (_dragRaf) { cancelAnimationFrame(_dragRaf); _dragRaf = null; }
  document.body.style.userSelect = '';
  if (_touchClone) { _touchClone.remove(); _touchClone = null; }
  if (_touchSrcTr) { try { _touchSrcTr.style.opacity = ''; } catch (e) {} _touchSrcTr = null; }
  document.querySelectorAll('tr.drag-over').forEach(r => r.classList.remove('drag-over'));
  // Artık DOM'da olmayan bir satırdan kalmış olabilecek kopyaları da süpür.
  document.querySelectorAll('tr[style*="position:fixed"]').forEach(el => {
    if (el.style.zIndex === '9999') el.remove();
  });
  _dragTr = null; _dragScroller = null;
}

function _dragIptal() {
  if (!_dragTr && !_touchClone) return;
  _dragSrcIdx = null;
  _dragTemizle();
  if (typeof _dragBeklemedeTazele === 'function') _dragBeklemedeTazele();
}

async function _dragPointerEnd(e) {
  if (!_touchClone) { _dragTemizle(); return; }
  const nokta = (e && e.clientX != null) ? { x: e.clientX, y: e.clientY } : null;
  const src = _dragSrcIdx;
  _dragSrcIdx = null;
  _dragTemizle();

  try {
    if (!nokta || src === null) return;
    const el = document.elementFromPoint(nokta.x, nokta.y);
    const hedef = el ? el.closest('tr[data-idx]') : null;
    if (!hedef) return;
    const destIdx = parseInt(hedef.dataset.idx);
    if (src === destIdx) return;
    await mvTo(_dragRepId, src, destIdx);
  } finally {
    // Sürükleme sırasında ertelenen tazeleme varsa şimdi çalışsın.
    if (typeof _dragBeklemedeTazele === 'function') _dragBeklemedeTazele();
  }
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
  normalizeChains(origItems, merged);
  // Güvenlik ağı: zincir HİÇBİR ZAMAN ilk satırdan başlayamaz.
  if (merged[0]) merged[0].linkedPrev = false;
  merged.forEach((it,i)=> it.seq = i+1);
  sync('spin','...');
  _rtSustur(6000);   // çok satırlı işlem: pencere daha geniş
  try{
    // (2026-08-06) 🐛 linked_prev ARTIK HER SATIRA YAZILIYOR.
    // Eskiden yalnızca "önceki duruma göre DEĞİŞMİŞSE" gönderiliyordu. Bu,
    // sunucudaki gerçek değerin elimizdeki anlık görüntüyle aynı olduğunu
    // varsayıyordu — canlı güncelleme açıldıktan sonra araya giren bir
    // tazeleme listeyi eskitince karşılaştırma yanlış çıkıyor ve o satır hiç
    // güncellenmiyordu. Sonuç: veritabanında İLK SATIRIN linked_prev'i true
    // kalabiliyordu (öncesi olmayan bir satır "bir öncekine bağlı" olamaz) ve
    // zincir kopuk görünüyordu. Artık son durum tamamen `merged`'den
    // belirleniyor; ek maliyet yok, aynı sayıda PATCH gidiyor.
    const patches = merged.map(it =>
      dbPatch('repertoire_items', it.id, { seq: it.seq, linked_prev: !!it.linkedPrev })
    );
    await Promise.all(patches);
    _rtSustur(2500);   // yazma bitti; yankı bir süre daha yok sayılsın
    if (activeItemRepId === repId && newActiveIdx != null) activeItemIdx = newActiveIdx;
    await load();
  }catch(e){
    toast(/linked_prev/.test(e.message)?_r('rep.linkedPrevYok','linked_prev kolonu eksik'):e.message,'er');
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
    toast(val?_r('rep.potpuriyeBaglandi','🔗 Potpuriye bağlandı'):_r('rep.bagCozuldu','Bağ çözüldü'));
    await load();
  }catch(e){
    toast(/linked_prev/.test(e.message)?_r('rep.linkedPrevYok','linked_prev kolonu eksik'):e.message,'er');
  }
}

// ↑/↓ butonları — TEK ADIM. Zincir BAŞINDA basılırsa tüm blok komşu bloğun
// üstüne/altına atlar; zincir içindeki satırda tek satır hareket eder.
async function mv(repId,idx,dir){
  const rep=getRep(repId);if(!rep)return;
  const orig=[...rep.items];
  // Bayraklar aşağıda değiştirilmeden ÖNCE geçmişin kopyası (bkz. mvTo notu).
  const origSnap = orig.map(o => ({ id:o.id, name:o.name, linkedPrev: !!o.linkedPrev }));
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
    // (2026-08-06) POTPURİ İÇİNDE SIRA DEĞİŞTİRMEK BAĞI KOPARMASIN.
    // Emir bildirdi: bağlı bir eseri ↑/↓ ile oynatınca eser potpuriden
    // çıkıyordu. Sebep: ilk üye yukarı alınınca zincir BAŞININ üstüne geçmiş
    // sayılıyor ve normalizeChains bağı çözüyordu. Oysa kullanıcının niyeti
    // zinciri bozmak değil, içindeki sırayı değiştirmek. Hedef konum zincir
    // aralığının İÇİNDEYSE (baş konumu dahil) üyelik korunuyor: aralığın ilk
    // satırı zincir başı olur (linkedPrev=false), kalanlar bağlı kalır.
    // Zincirin DIŞINA taşımak ise eskisi gibi bağı çözer — o gerçekten
    // "potpuriden çıkar" demek.
    if(ni>=ca && ni<=cb){
      for(let k=ca;k<=cb;k++){ if(merged[k]) merged[k].linkedPrev = (k!==ca); }
    }
  }
  await applyReorder(repId, origSnap, merged, newActive);
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
  // (2026-08-09) 🐛 ORİJİNALİN ANLIK KOPYASI. `merged` ile `orig` AYNI nesneleri
  // paylaşıyor; aşağıda zincir bayraklarını düzeltince `orig` de değişiyordu ve
  // `normalizeChains` "bu satır eskiden hangi zincirdeydi" sorusuna BOZULMUŞ bir
  // geçmişe bakarak cevap verip zincirin son halkasını koparıyordu (teşhis
  // günlüğüyle görüldü). Kopya, geçmişi değişmez kılıyor.
  const origSnap = orig.map(o => ({ id:o.id, name:o.name, linkedPrev: !!o.linkedPrev }));
  // (2026-08-06) SÜRÜKLE-BIRAKTA DA POTPURİ ÜYELİĞİ KORUNUYOR.
  // ↑/↓ düğmeleri için konan kuralın aynısı (bkz. mv): zincir ÜYESİ, zincirin
  // kendi aralığı İÇİNDE bir yere bırakıldıysa (baş konumu dahil) bu "sırayı
  // değiştirmek"tir, "potpuriden çıkmak" değil. Emir'in bildirdiği durum:
  // 2. ya da 3. eseri 1. sıraya taşıyınca bağ kopuyordu.
  if(!moveBlock && ins>=ca && ins<=cb){
    for(let k=ca;k<=cb;k++){ if(merged[k]) merged[k].linkedPrev = (k!==ca); }
  }
  await applyReorder(repId, origSnap, merged, ins);
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
  const sl={concept:_r('rep.taslak','Taslak'),confirmed:_r('rep.onaylandi','Onaylandı'),archive:_r('rep.arsiv','Arşiv')};
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
  if(!w){ toast(_r('rep.yazdirmaEngellendi','Yazdırma penceresi engellendi — tarayıcı ayarından izin ver'),'er'); return; }
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

// (2026-08-22) BURADA İKİNCİ BİR `dbPatch` TANIMI VARDI — KALDIRILDI.
// `return=minimal` ile yazıyor, gövde okumuyor ve `_rtSustur()` ÇAĞIRMIYORDU;
// dosyanın ilerisinde tanımlandığı için yukarıdaki (satır ~204) sağlam sürümü
// EZİYORDU. İki sonucu vardı: (a) sessiz RLS reddi hiç yakalanamıyordu,
// (b) gerçek zamanlı "kendi yankını yut" penceresi kurulmadığı için çok
// satırlı işlemlerde araya giren tazeleme listeyi eskitebiliyordu.
let iemRepId=null,iemItemId=null,iemPfSelected=[];
let _iemWorkId=null;
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
  _iemWorkId = it.workId;   // "Eser bilgilerini düzenle" düğmesi için
  iemPfSelected=it.performer?it.performer.split(', ').filter(Boolean):[];
  iemPfRender();
  if(el('iem')) el('iem').style.display='flex';
  else console.error('Modal #iem not found in DOM');
}
// (2026-08-06) Eserin KENDİ bilgilerini (söz, akor, nota, besteci…) düzenlemek
// için Eserler sayfasındaki hazır formu açıyoruz — alanları burada tekrarlamak
// yerine. `back` parametresi sayesinde form kapanınca tam bu repertuvara,
// bu esere dönülüyor; kullanıcı için tek akış gibi görünüyor.
function iemOpenWorkEditor(){
  if(_iemWorkId==null) return;
  const repId=iemRepId;
  const back=location.pathname + (repId?('?rep='+encodeURIComponent(repId)):'');
  location.href='eserler.html?edit='+encodeURIComponent(_iemWorkId)+'&back='+encodeURIComponent(back);
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
  const m=_pfAdaylar(q,iemPfSelected);
  if(!m.length){dd.style.display='none';return;}
  dd.innerHTML=m.slice(0,10).map(x=>'<div class="pf-dd-item" onmousedown="event.preventDefault();iemPfAdd(\''+x.deger.replace(/'/g,"\\'")+'\')">'+x.etiket+'</div>').join('');
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
    // (2026-08-22) Bu isteğin yanıtı da kontrol edilmiyordu. Burada sessizlik
    // GÜVENLİK meselesi: iptal başarısız olursa ESKİ bağlantılar geçerli
    // kalıyor, oysa arayüz "tek aktif bağlantı" vaat ediyor — kullanıcı
    // paylaşımı geri çektiğini sanır.
    const _iptal = await fetch(SUPA_URL+'/rest/v1/repertoire_links?repertoire_id=eq.'+repId+'&revoked=is.false', {
      method:'PATCH', headers:{...authHeaders(),'Content-Type':'application/json','Prefer':'return=minimal'},
      body: JSON.stringify({revoked:true})
    });
    if (!_iptal.ok) {
      console.warn('[paylaşım] eski bağlantılar iptal edilemedi:', _iptal.status);
      toast(_r('rep.eskiBaglantiUyari','Uyarı: eski paylaşım bağlantıları iptal edilemedi, hâlâ geçerli olabilir.'), 'err');
    }
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
      <div id="shareQrWrap" style="display:none;text-align:center;margin:10px 14px 4px;">
        <div id="shareQr" style="display:inline-block;background:#fff;padding:12px;border-radius:12px;"></div>
        <div style="font-size:11px;color:var(--text3);margin-top:7px;">Misafir sanatçı kamerayla okutabilir</div>
      </div>
      <div class="share-note">${hours} saat geçerli — ${new Date(expires).toLocaleString('tr-TR')}</div>
      <div class="share-foot">
        <button class="bi" onclick="closeShare()">Kapat</button>
        <button class="baw" id="copyBtn" onclick="copyShareLink()">Kopyala</button>
      </div>`;
    _shareQrCiz(link);
    if(navigator.share){
      const rp = getRep(repId);
      try{ await navigator.share({title:(rp&&rp.name)||'Repertuvar', url:link}); }catch(e){}
    }
  }catch(e){
    if(box) box.innerHTML = '<div class="share-note" style="color:var(--red);">Bağlantı oluşturulamadı: '+e.message+'</div>';
  }
}

// ── 2026-08-23: MISAFIR SANATCI KAREKODU ─────────────────────────────────
// Provaya/konsere disaridan katilan bir muzisyen gruba UYE OLMAMALI: uyelik
// mesajlari, diger repertuvarlari ve uye listesini acar. Misafirin ihtiyaci
// tek bir repertuvari sahnede gorebilmek — mevcut paylasim baglantisi tam
// olarak bunu veriyor, hesap bile gerekmiyor.
// Karekod yeni bir sistem degil: ayni baglantinin provada gosterilebilir hali.
// Guvenlik zaten baglantida: sureli (saat bazinda) ve yeni baglantı uretilince
// eskiler iptal ediliyor.
function _shareQrCiz(link) {
  var wrap = document.getElementById('shareQrWrap');
  var kutu = document.getElementById('shareQr');
  if (!wrap || !kutu) return;
  kutu.innerHTML = '';
  if (typeof QRCode === 'undefined') { wrap.style.display = 'none'; return; }
  try {
    new QRCode(kutu, {
      text: link,
      width: 190, height: 190,
      colorDark: '#000000', colorLight: '#ffffff',
      // Ekrandan okutuluyor; yansima/parlama olabilir, en toleransli seviye.
      correctLevel: QRCode.CorrectLevel.H
    });
    wrap.style.display = '';
  } catch (e) {
    wrap.style.display = 'none';
    console.warn('paylasim karekodu cizilemedi:', e);
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
    if(btn){ btn.textContent=_r('rep.kopyalandiOk','✓ Kopyalandı'); setTimeout(()=>{ if(btn) btn.textContent='Kopyala'; },2000); } };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(link).then(done).catch(()=>fallbackCopy(link,done));
  } else fallbackCopy(link,done);
}
function fallbackCopy(text, done){
  const el=document.createElement('textarea');
  el.value=text; el.style.position='fixed'; el.style.opacity='0';
  document.body.appendChild(el); el.select();
  try{ document.execCommand('copy'); done(); }catch(e){ toast(_r('rep.kopyalanamadi','Kopyalanamadı — bağlantıyı elle seç'),'er'); }
  document.body.removeChild(el);
}


function shareViaEmail() {
  const link = document.getElementById('shareLink').dataset.url;
  const rep = getRep(shareRepId);
  const subject = encodeURIComponent('\u1F3B5 ' + (rep ? rep.name : 'Repertuvar') + ' - Sahne Modu');
  const body = encodeURIComponent(_r('rep.postaGovde','Merhaba,\n\n{ad} repertuvarını sahne modunda görüntülemek için aşağıdaki bağlantıyı kullanabilirsin:\n\n{link}\n\nİyi müzikler!').replace('{ad}', rep ? rep.name : 'Repertuvar').replace('{link}', link));
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
  let _refreshT, _bekleyen = false;
  function _refresh() {
    // (2026-08-12) SÜRÜKLEME SÜRERKEN YENİDEN ÇİZME. Canlı güncelleme açıldıktan
    // sonra araya giren bir tazeleme, tutulan satırı DOM'dan siliyor ve sürükleme
    // yarıda kalıyordu (kopya ekranda asılı kalıyor). Tazeleme sürükleme bitene
    // ertelenir; `_dragBeklemedeTazele` bitişte çağrılır.
    if (_dragTr || _touchClone) { _bekleyen = true; return; }
    clearTimeout(_refreshT);
    _refreshT = setTimeout(function() {
      if (typeof load === 'function') load();
    }, 150);
  }
  window._dragBeklemedeTazele = function () {
    if (!_bekleyen) return;
    _bekleyen = false;
    _refresh();
  };
  window.addEventListener('data-synced', _refresh);

  // (2026-08-12) ÜYELİK/ROL DEĞİŞİKLİĞİ. Bir üyenin rolü değişince (ör. üye →
  // yönetici) sayfadaki düğmeler `canManage`'e bağlı ve bu değer ROLDEN geliyor;
  // ama rol localStorage'da önbellekli ve normal sync onu tazelemiyordu ⇒
  // karşı taraf yeni yetkisini ancak yeniden girdiğinde görüyordu.
  window.addEventListener('remote-change', function (e) {
    const t = e.detail && e.detail.table;
    if (t !== 'group_members' && t !== 'profiles') return;
    try { if (typeof loadMyGroupRole === 'function') loadMyGroupRole(); } catch (err) {}
    try { if (typeof loadMyGroups === 'function') loadMyGroups(); } catch (err) {}
    setTimeout(function () { if (typeof load === 'function') load(); }, 600);
  });
  window.addEventListener('online', _refresh);
})();

// ============================================================================
// (2026-08-20) REPERTUVAR DETAYINDA UZUN BASMA → BAŞKA REPERTUVARA EKLE
// ----------------------------------------------------------------------------
// Emir: eserler.html'de zaten var olan "uzun bas → repertuvara ekle" davranışı
// repertuvar detay listesindeki satırlar için de istendi. Karar (A + C):
//   (A) Sürükle-bırak YALNIZCA ⠿ tutamacından başlar — bu zaten 2026-08-12'de
//       yapılmıştı (HTML5 drag öznitelikleri kaldırılıp dragPointerStart yalnız
//       tutamaca bağlanmıştı), dolayısıyla burada yeni bir şey gerekmedi.
//       Uzun-basma jesti tutamacın ÜSTÜNDE bilerek devreye girmiyor; iki jest
//       aynı satırda ama farklı bölgelerde yaşıyor.
//   (C) Satıra uzun basınca TEK ESER için sheet açılır (Başka repertuvara ekle /
//       Yeni repertuvar oluştur). Toplu seçim modu YOK — eserler.html'deki
//       bulkMode buraya taşınmadı, çünkü bu liste sıralı bir program ve
//       onay kutuları sürükleme alanıyla çakışıyor.
//
// Neden repertuvar listesi SUNUCUDAN çekilmiyor: eserler.html'deki aynı sheet
// hâlâ eski görünürlük modeliyle sorgu kuruyor (group_id / is_public). Buradaki
// `reps` dizisi load() tarafından zaten doğru görünürlükle dolduruluyor ve
// çevrimdışıyken de elimizde — o yüzden kaynak olarak o kullanılıyor. Yeni bir
// okuma yolu açmamak, "3. aşama: tüm okuma yollarını tara" işini büyütmemek için
// de bilinçli bir tercih.
//
// Sheet DOM'u document.body'ye ekleniyor (openLyricsSheet'teki lycOverlay ile
// aynı desen): #dc her renderDetail'de innerHTML ile baştan çiziliyor, panelin
// İÇİNDE duran position:fixed bir katman o yeniden çizimde bozulur.
// ============================================================================

let _rlpTimer = null;         // uzun-basma sayacı
let _rlpFiredAt = 0;          // uzun-basma tetiklendi → ardından gelen click yutulacak
let _rlpStart = null;         // basma başlangıç koordinatı (kaydırma toleransı için)
let _rlpWorkId = null;        // sheet'in üzerinde çalıştığı eser
let _rlpFromRepId = null;     // hangi repertuvardan açıldı (listeden çıkarılacak)

const RLP_DELAY = 500;        // ms — eserler.html ile aynı
const RLP_MOVE_TOL = 10;      // px — bu kadar hareket kaydırma sayılır, sayaç iptal

function _rlpIptal() { clearTimeout(_rlpTimer); _rlpTimer = null; _rlpStart = null; }

function _rlpInit() {
  const dc = document.getElementById('dc');
  if (!dc || dc.dataset.lpBound) return;
  dc.dataset.lpBound = '1';

  // iOS'ta uzun basma metin seçimi + büyüteç açıyor; jestin görünür yan etkisi
  // olmasın diye satırlarda seçim/callout kapatıldı. Ayrı bir CSS dosyasına
  // dokunmamak için stil buradan enjekte ediliyor (tek dosya teslimi).
  if (!document.getElementById('rlp-style')) {
    const st = document.createElement('style');
    st.id = 'rlp-style';
    st.textContent =
      '#dc tbody tr{-webkit-touch-callout:none;}' +
      '#dc tbody tr td:nth-child(2){-webkit-user-select:none;user-select:none;}' +
      '#dc tbody tr.lp-active td{background:rgba(124,111,255,.18)!important;}' +
      '.rlp-sheet{position:fixed;left:0;right:0;bottom:0;z-index:9999;background:var(--surface);' +
      'border-top:1px solid var(--border2);border-radius:16px 16px 0 0;transform:translateY(100%);' +
      'transition:transform .28s cubic-bezier(.32,.72,0,1);max-height:76vh;display:flex;flex-direction:column;' +
      'box-shadow:0 -8px 32px rgba(0,0,0,.45);padding-bottom:env(safe-area-inset-bottom);}' +
      '.rlp-sheet.open{transform:translateY(0);}' +
      '.rlp-ov{position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.55);display:none;}' +
      '.rlp-ov.open{display:block;}' +
      '.rlp-item{display:flex;align-items:center;gap:10px;width:100%;padding:13px 20px;background:none;' +
      'border:none;color:var(--text);font-size:14px;font-family:inherit;text-align:left;cursor:pointer;}' +
      '.rlp-item:disabled{opacity:.4;cursor:default;}' +
      '.rlp-item i{font-size:17px;color:var(--text2);width:20px;text-align:center;flex-shrink:0;}' +
      '.rlp-item .rlp-nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
      '.rlp-item .rlp-hint{font-size:11px;color:var(--text3);flex-shrink:0;}';
    document.head.appendChild(st);
  }

  dc.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;                 // sağ tık başlatmasın
    const tr = e.target.closest && e.target.closest('tr[data-idx]');
    if (!tr) return;
    if (e.target.closest('.drag-handle')) return;                   // (A) sürükleme bölgesi — jestler ayrı
    if (e.target.closest('.ra')) return;                            // satır işlem düğmeleri
    _rlpStart = { x: e.clientX, y: e.clientY, tr };
    clearTimeout(_rlpTimer);
    _rlpTimer = setTimeout(() => {
      _rlpFiredAt = Date.now();
      tr.classList.add('lp-active');
      setTimeout(() => tr.classList.remove('lp-active'), 400);
      try { if (navigator.vibrate) navigator.vibrate(15); } catch (err) {}
      const rep = getRep(tr.dataset.rep);
      const it = rep && (rep.items || [])[parseInt(tr.dataset.idx)];
      if (it) openRepMoveSheet(it.workId, tr.dataset.rep);
    }, RLP_DELAY);
  });

  // Parmak kayarsa (liste kaydırma) uzun-basma iptal. Küçük titremeler
  // tolere ediliyor — eserler.html'de HER pointermove iptal ediyordu, bu da
  // duran parmakta bile jesti bazen düşürüyordu.
  dc.addEventListener('pointermove', (e) => {
    if (!_rlpStart) return;
    if (Math.abs(e.clientX - _rlpStart.x) > RLP_MOVE_TOL ||
        Math.abs(e.clientY - _rlpStart.y) > RLP_MOVE_TOL) _rlpIptal();
  }, { passive: true });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt =>
    dc.addEventListener(evt, _rlpIptal, { passive: true }));

  // Uzun-basmadan SONRA gelen click'i yut: satırın ikinci hücresinde
  // openLyricsSheet çağıran satır içi onclick var, aksi halde sheet'in
  // ardından söz penceresi de açılırdı. Yakalama (capture) aşamasında
  // dinleniyor ki hedefteki satır içi handler'dan ÖNCE çalışsın.
  dc.addEventListener('click', (e) => {
    if (Date.now() - _rlpFiredAt < 700) { e.stopPropagation(); e.preventDefault(); }
  }, true);

  // Dokunmatik cihazda uzun basmanın açtığı sistem menüsü jesti bozuyor.
  dc.addEventListener('contextmenu', (e) => {
    if (!window.matchMedia || !window.matchMedia('(pointer:coarse)').matches) return;
    if (e.target.closest && e.target.closest('tr[data-idx]')) e.preventDefault();
  });
}

function _rlpEsc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function openRepMoveSheet(workId, fromRepId) {
  _rlpWorkId = workId;
  _rlpFromRepId = fromRepId || null;
  const w = WL[String(workId)] || {};

  let ov = document.getElementById('rlpOverlay');
  let sh = document.getElementById('rlpSheet');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'rlpOverlay'; ov.className = 'rlp-ov';
    ov.onclick = closeRepMoveSheet;
    document.body.appendChild(ov);
    sh = document.createElement('div');
    sh.id = 'rlpSheet'; sh.className = 'rlp-sheet';
    document.body.appendChild(sh);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('rlpSheet')?.classList.contains('open')) closeRepMoveSheet();
    });
  }

  // Hedef adaylar: yönetebildiğim ve İÇİNDE BULUNDUĞUM repertuvar dışındakiler.
  const aday = (reps || []).filter(r => r.canManage && String(r.id) !== String(fromRepId));

  const satirlar = aday.length ? aday.map(r => {
    const varMi = (r.items || []).some(it => String(it.workId) === String(workId));
    const ikon = { public:'ti-world', group:'ti-users-group', private:'ti-lock' }[repVis(r)];
    return `<button class="rlp-item" ${varMi ? 'disabled' : ''}
        onclick="rlpAddToRep('${r.id}')">
        <i class="ti ${ikon}" aria-hidden="true"></i>
        <span class="rlp-nm">${_rlpEsc(r.name || '(isimsiz)')}</span>
        <span class="rlp-hint">${varMi ? _r('rep.zatenVarKisa','zaten var') : ((r.items || []).length + ' ' + _rBirim((r.items || []).length))}</span>
      </button>`;
  }).join('')
    : '<div style="padding:18px 20px;color:var(--text3);font-size:13px;">Ekleyebileceğin başka repertuvar yok.</div>';

  // (2026-08-20) YENİ MODEL — hızlı oluşturmada görünürlük.
  // Varsayılan KİŞİSEL (`visibility:'private'`): bir jestin ortasında paylaşım
  // kararı sorulmuyor, kart çipinden sonradan değiştirilebiliyor. "Grupla paylaş"
  // seçeneği YALNIZCA grup yöneticisine gösteriliyor, çünkü `rgs_write` politikası
  // paylaşım satırını yazmayı `is_group_manager(group_id)` ile sınırlıyor — düz
  // üyeye bu kutuyu göstermek, işaretlediğinde sessizce çalışmayan bir söz olurdu.
  const _gid = getGroupId();
  const grupSecenegi = (_gid && typeof isGroupManager === 'function' && isGroupManager())
    ? `<label style="display:flex;align-items:center;gap:8px;margin-top:9px;font-size:13px;color:var(--text2);cursor:pointer;">
         <input type="checkbox" id="rlpNewGroup" style="accent-color:var(--accent);width:15px;height:15px;">
         <i class="ti ti-users-group" style="font-size:15px;" aria-hidden="true"></i> Grupla paylaş
       </label>`
    : '';

  sh.innerHTML = `
    <div style="padding:14px 20px 10px;border-bottom:1px solid var(--border);">
      <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;">Repertuvara Ekle</div>
      <div style="font-size:14px;font-weight:600;color:var(--text);margin-top:4px;line-height:1.35;">${_rlpEsc(w.name || ('#' + workId))}</div>
    </div>
    <div id="rlpList" style="overflow-y:auto;flex:1;padding:4px 0;">${satirlar}</div>
    <div id="rlpMsg" style="display:none;padding:8px 20px 0;font-size:12px;color:var(--text3);"></div>
    <div style="border-top:1px solid var(--border);padding:4px 0 8px;">
      <button class="rlp-item" id="rlpNewBtn" onclick="rlpShowNewForm()">
        <i class="ti ti-playlist-add" aria-hidden="true"></i>
        <span class="rlp-nm" style="color:var(--accent);font-weight:600;">Yeni repertuvar oluştur</span>
      </button>
      <div id="rlpNewForm" style="display:none;padding:4px 20px 8px;">
        <input id="rlpNewName" placeholder="Repertuvar adı" autocomplete="off"
          style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;background:var(--surface2);
                 border:1px solid var(--border);color:var(--text);font-size:14px;font-family:inherit;">
        ${grupSecenegi}
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button onclick="rlpHideNewForm()" style="flex:1;padding:9px;border-radius:8px;background:none;border:1px solid var(--border);color:var(--text2);font-size:13px;font-family:inherit;cursor:pointer;">İptal</button>
          <button onclick="rlpCreateAndAdd()" style="flex:2;padding:9px;border-radius:8px;background:var(--accent);border:none;color:#fff;font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;">Oluştur ve Ekle</button>
        </div>
      </div>
      <button class="rlp-item" onclick="closeRepMoveSheet()">
        <i class="ti ti-x" aria-hidden="true"></i><span class="rlp-nm" style="color:var(--text2);">Kapat</span>
      </button>
    </div>`;

  ov.classList.add('open');
  requestAnimationFrame(() => sh.classList.add('open'));
}

function closeRepMoveSheet() {
  document.getElementById('rlpOverlay')?.classList.remove('open');
  document.getElementById('rlpSheet')?.classList.remove('open');
}

function rlpShowNewForm() {
  const btn = document.getElementById('rlpNewBtn');
  const form = document.getElementById('rlpNewForm');
  if (!form) return;
  if (btn) btn.style.display = 'none';
  form.style.display = 'block';
  setTimeout(() => document.getElementById('rlpNewName')?.focus(), 60);
}

function rlpHideNewForm() {
  const btn = document.getElementById('rlpNewBtn');
  const form = document.getElementById('rlpNewForm');
  if (form) form.style.display = 'none';
  if (btn) btn.style.display = 'flex';
}

function _rlpMsg(text, renk) {
  const m = document.getElementById('rlpMsg');
  if (!m) return;
  m.style.display = 'block';
  m.style.color = renk || 'var(--text3)';
  m.textContent = text;
}

// Var olan repertuvara ekleme. seq/mükerrer mantığı addWork() ile birebir aynı;
// linked_prev AÇIKÇA false (kolon varsayılanı true, gönderilmezse eser kendini
// potpuriye bağlı doğuruyor — 2026-08-06 notu).
async function rlpAddToRep(repId) {
  const hedef = getRep(repId);
  if (!hedef || _rlpWorkId == null) return;
  const items = hedef.items || [];
  if (items.some(i => String(i.workId) === String(_rlpWorkId))) {
    _rlpMsg('Bu eser zaten "' + (hedef.name || '') + '" içinde.', '#e07060');
    return;
  }
  const nextSeq = items.length ? Math.max(...items.map(i => i.seq || 0)) + 1 : 1;
  _rlpMsg('Ekleniyor...');
  try {
    await dbPost('repertoire_items', {
      repertoire_id: repId, work_id: _rlpWorkId, seq: nextSeq, linked_prev: false
    });
    closeRepMoveSheet();
    toast('✓ ' + _r('rep.icineEklendi','"{ad}" içine eklendi').replace('{ad}', hedef.name || 'Repertuvar'));
    await load();
  } catch (e) {
    _rlpMsg('Eklenemedi: ' + (e.message || 'bilinmeyen hata'), '#e07060');
    console.error('[uzun bas → repertuvara ekle]', e);
  }
}

// Yeni repertuvar + eseri içine ekle. Görünürlük varsayılanı openNew() ile aynı:
// grubu olan kullanıcıda Grup, yoksa Kişisel. Sheet'te üç seçenekli görünürlük
// arayüzü BİLEREK yok — hızlı bir jestin ortasında paylaşım kararı sorulmuyor;
// gerekirse sonradan kartın çipinden değiştirilir.
async function rlpCreateAndAdd() {
  const inp = document.getElementById('rlpNewName');
  const name = (inp?.value || '').trim();
  if (!name) { inp?.focus(); return; }
  if (_rlpWorkId == null) return;
  const uid = getUserId() || undefined;
  const grupla = !!document.getElementById('rlpNewGroup')?.checked;
  const gid = grupla ? (getGroupId() || null) : null;
  const vis = (grupla && gid) ? 'group' : 'private';
  _rlpMsg(_r('rep.olusturuluyor','Oluşturuluyor...'));
  try {
    // YENİ MODEL: `visibility` açıkça yazılıyor (sütun varsayılanına bırakılmıyor);
    // eski `is_public`/`group_id` de tutarlı yazılıyor, çünkü aynı satırı hâlâ eski
    // modelle okuyan sayfalar var (stage.html, eserler.html — 3. aşamanın kalanı).
    const r = await dbPost('repertoires', {
      name, status: 'concept', visibility: vis, is_public: false, group_id: gid,
      user_id: uid, owner_id: uid
    });
    const yeni = Array.isArray(r) ? r[0] : r;
    if (!yeni || !yeni.id) throw new Error('repertuvar id dönmedi');
    await dbPost('repertoire_items', {
      repertoire_id: yeni.id, work_id: _rlpWorkId, seq: 1, linked_prev: false
    });
    // Grup görünürlüğü paylaşım satırına bağlı — sütun tek başına yetmiyor.
    const pay = await repGrupPaylasimiUygula(yeni.id, vis, gid);
    closeRepMoveSheet();
    if (pay.ok) toast('✓ ' + _r('rep.olusturuldiEklendi','"{ad}" oluşturuldu ve eser eklendi').replace('{ad}', name));
    else toast(pay.mesaj, 'er');
    await load();
  } catch (e) {
    _rlpMsg(_r('rep.olusturulamadi','Oluşturulamadı: ') + (e.message || 'bilinmeyen hata'), '#e07060');
    console.error('[uzun bas → yeni repertuvar]', e);
  }
}

// #dc HTML'de statik olarak duruyor (yalnız innerHTML'i değişiyor), bu yüzden
// dinleyiciler bir kez bağlanıyor ve her renderDetail'den sonra hayatta kalıyor.
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _rlpInit);
else _rlpInit();

// ============================================================================
// (2026-08-20) 🎧 REPERTUVARI DİNLE — repertuvardaki eserlerin YouTube
// bağlantılarından, REPERTUVAR SIRASIYLA bir çalma listesi.
// ----------------------------------------------------------------------------
// Amaç Emir'in tarifiyle ÖĞRENME/EZBERLEME ("eserlerin tam kafaya yerleşmesi"),
// sahne aracı değil. Bu yüzden İKİ YOL birden var (Emir "ikisi birden" dedi):
//   (A) UYGULAMA İÇİ oynatıcı — ekranda, sıradaki eser görünür, listeden
//       istediğine atlanır. Sınırı: iOS'ta ekran kilitlenince durur, ve bazı
//       videolarda gömme kapalıdır (telifli müzik şirketi yüklemeleri; Türk
//       müziğinde yaygın). Gömme kapalıysa YouTube API 101/150 hatası verir —
//       yutmuyoruz: satır işaretleniyor ve otomatik sonrakine geçiliyor.
//   (B) YOUTUBE'DA AÇ — `watch_videos?video_ids=…` ile geçici çalma listesi.
//       Gömme kısıtı yok ve YouTube uygulamasında ARKA PLANDA çalar (cepte
//       dinleme). Karşılığında uygulamadan çıkılır; bağlantı ~50 video alır.
// Bağlantısı olmayan eserler için Emir "uyarı" istedi: sessizce atlanmıyor,
// başlıkta "N eserde bağlantı yok" yazıyor ve dokununca hangileri olduğu açılıyor.
// ============================================================================

const YT_MAX = 50;              // watch_videos bağlantısının pratik sınırı
let _dnlPlayer = null;          // YT.Player örneği
let _dnlTracks = [];            // {idx,workId,name,makam,vid}
let _dnlHatali = {};            // vid -> hata metni (gömme kapalı vb.)
let _dnlRepId = null;

// YouTube bağlantısından 11 karakterlik kimliği çıkarır. `video_link` serbest
// metin: youtu.be, watch?v=, /embed/, /shorts/, /live/, zaman damgalı ya da
// çıplak kimlik gelebiliyor. Tanıyamazsa null döner (o eser "bağlantı yok"
// sayılır — YouTube dışı bir bağlantı da buraya düşer, bilinçli).
function _ytId(url) {
  if (!url) return null;
  const s = String(url).trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  let m = s.match(/(?:youtube\.com|youtu\.be)\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/|e\/)?([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  m = s.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  return null;
}

// Repertuvarı çalınabilir / bağlantısız diye ikiye ayırır. SIRA repertuvar
// sırasıdır (items zaten seq'e göre); potpuri zinciri burada anlam taşımıyor.
function _dinleListesi(rep) {
  const hepsi = (rep.items || []).map((it, idx) => {
    const w = WL[String(it.workId)] || {};
    return {
      idx, workId: it.workId,
      name: w.name || ('#' + it.workId),
      makam: w.makam || '',
      vid: _ytId(w.videoLink)
    };
  });
  return { calinabilir: hepsi.filter(x => x.vid), eksik: hepsi.filter(x => !x.vid) };
}

function _dnlEsc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _dnlStil() {
  if (document.getElementById('dnl-style')) return;
  const st = document.createElement('style');
  st.id = 'dnl-style';
  st.textContent =
    '#dnlOverlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.72);display:none;align-items:flex-end;justify-content:center;}' +
    '#dnlOverlay.open{display:flex;}' +
    '.dnl-box{background:var(--surface);border:1px solid var(--border2);border-top-left-radius:16px;border-top-right-radius:16px;' +
      'width:100%;max-width:560px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;' +
      'padding-bottom:env(safe-area-inset-bottom);box-shadow:0 -10px 40px rgba(0,0,0,.5);}' +
    '@media(min-width:640px){#dnlOverlay{align-items:center;}.dnl-box{border-radius:16px;}}' +
    '.dnl-head{display:flex;align-items:flex-start;gap:10px;padding:14px 16px 10px;border-bottom:1px solid var(--border);}' +
    '.dnl-x{background:none;border:none;color:var(--text3);font-size:22px;line-height:1;cursor:pointer;padding:0 2px;}' +
    '.dnl-warn{margin:10px 16px 0;padding:8px 10px;border-radius:8px;background:rgba(239,68,68,.10);' +
      'border:1px solid rgba(239,68,68,.32);color:#fca5a5;font-size:12px;cursor:pointer;line-height:1.5;}' +
    '.dnl-warn-list{margin-top:6px;color:var(--text2);font-size:11.5px;display:none;}' +
    '.dnl-warn.acik .dnl-warn-list{display:block;}' +
    '.dnl-player{position:relative;width:100%;aspect-ratio:16/9;background:#000;margin-top:10px;}' +
    '.dnl-player iframe{position:absolute;inset:0;width:100%;height:100%;border:0;}' +
    '.dnl-yt{display:flex;align-items:center;justify-content:center;gap:7px;margin:10px 16px 2px;padding:11px;' +
      'border-radius:10px;background:#ff0033;border:none;color:#fff;font-size:13.5px;font-weight:700;' +
      'font-family:inherit;cursor:pointer;width:calc(100% - 32px);}' +
    '.dnl-yt-not{margin:6px 16px 10px;font-size:11.5px;color:var(--text3);line-height:1.5;}' +
    '.dnl-list{overflow-y:auto;flex:1;padding:4px 0 10px;border-top:1px solid var(--border);}' +
    '.dnl-tr{display:flex;align-items:center;gap:10px;width:100%;padding:10px 16px;background:none;border:none;' +
      'color:var(--text);font-size:13.5px;font-family:inherit;text-align:left;cursor:pointer;}' +
    '.dnl-tr:disabled{cursor:default;}' +
    '.dnl-tr.aktif{background:rgba(124,111,255,.16);}' +
    '.dnl-no{color:var(--text3);font-size:11.5px;min-width:20px;text-align:right;flex-shrink:0;}' +
    '.dnl-tr.aktif .dnl-no{color:var(--accent);font-weight:800;}' +
    '.dnl-nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.dnl-mk{font-size:11px;color:var(--text3);flex-shrink:0;}' +
    '.dnl-err{font-size:11px;color:#fca5a5;flex-shrink:0;}';
  document.head.appendChild(st);
}

// YouTube IFrame API'sini bir kez yükler. Düz <iframe> + playlist parametresi
// de sırayı çalardı; API'yi tercih etmemizin sebebi ONERROR: gömmesi kapalı
// videoyu ancak böyle anlayıp işaretleyebiliyor ve otomatik atlayabiliyoruz.
let _ytApiSoz = null;
function _ytApiYukle() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (_ytApiSoz) return _ytApiSoz;
  _ytApiSoz = new Promise((coz, red) => {
    const oncekiHazir = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof oncekiHazir === 'function') { try { oncekiHazir(); } catch (e) {} }
      coz();
    };
    const sc = document.createElement('script');
    sc.src = 'https://www.youtube.com/iframe_api';
    sc.onerror = () => red(new Error(_r('rep.ytYuklenemedi','YouTube oynatıcısı yüklenemedi')));
    document.head.appendChild(sc);
    setTimeout(() => red(new Error(_r('rep.ytZamanAsimi','YouTube oynatıcısı zaman aşımına uğradı'))), 12000);
  });
  return _ytApiSoz;
}

function openDinleSheet(repId) {
  const rep = getRep(repId);
  if (!rep) return;
  _dnlRepId = repId;
  _dnlHatali = {};
  _dnlStil();

  const { calinabilir, eksik } = _dinleListesi(rep);
  _dnlTracks = calinabilir;

  let ov = document.getElementById('dnlOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'dnlOverlay';
    ov.onclick = (e) => { if (e.target === ov) closeDinleSheet(); };
    document.body.appendChild(ov);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('dnlOverlay')?.classList.contains('open')) closeDinleSheet();
    });
  }

  if (!calinabilir.length) {
    ov.innerHTML = `
      <div class="dnl-box">
        <div class="dnl-head">
          <div style="flex:1;min-width:0;">
            <div style="font-size:15px;font-weight:700;">🎧 Repertuvarı Dinle</div>
            <div style="font-size:12px;color:var(--text3);margin-top:3px;">${_dnlEsc(rep.name)}</div>
          </div>
          <button class="dnl-x" onclick="closeDinleSheet()" aria-label="Kapat">×</button>
        </div>
        <div style="padding:22px 18px;color:var(--text3);font-size:13px;line-height:1.6;">
          Bu repertuvardaki hiçbir eserde YouTube bağlantısı yok.<br>
          Eseri açıp <b>Düzenle</b> deyip <b>Video Bağlantısı</b> alanına ekleyebilirsin.
        </div>
      </div>`;
    ov.classList.add('open');
    return;
  }

  const ids = calinabilir.map(t => t.vid);
  const asildi = ids.length > YT_MAX;

  // Emir'in kararı: bağlantısı olmayanlar SESSİZCE atlanmıyor, sayısı yazılıyor;
  // hangileri olduğu dokununca açılıyor (başlıkta uzun liste yer kaplamasın).
  const uyari = eksik.length ? `
      <div class="dnl-warn" onclick="this.classList.toggle('acik')">
        ⚠️ ${eksik.length} eserde YouTube bağlantısı yok — listeye alınmadı. <u>Hangileri?</u>
        <div class="dnl-warn-list">${eksik.map(x => _dnlEsc(x.name)).join(' · ')}</div>
      </div>` : '';

  ov.innerHTML = `
    <div class="dnl-box">
      <div class="dnl-head">
        <div style="flex:1;min-width:0;">
          <div style="font-size:15px;font-weight:700;">🎧 Repertuvarı Dinle</div>
          <div style="font-size:12px;color:var(--text3);margin-top:3px;">${_dnlEsc(rep.name)} · ${calinabilir.length} eser</div>
        </div>
        <button class="dnl-x" onclick="closeDinleSheet()" aria-label="Kapat">×</button>
      </div>
      ${uyari}
      <div class="dnl-player" id="dnlPlayerWrap"><div id="dnlPlayer"></div></div>
      <button class="dnl-yt" onclick="dinleYouTubedeAc()">
        <i class="ti ti-brand-youtube" style="font-size:18px;" aria-hidden="true"></i> ${_r('rep.ytAc','YouTube\u2019da Aç')}
      </button>
      <div class="dnl-yt-not">
        ${_r('rep.ytNot','Ekran kapalıyken dinlemek için <b>{btn}</b> düğmesini kullan — uygulama içindeki oynatıcı telefon kilitlenince durur.').replace('{btn}', _r('rep.ytAc','YouTube\u2019da Aç'))}${asildi ? _r('rep.ytSinir',' YouTube bağlantısı ilk {n} eseri alır.').replace('{n}', YT_MAX) : ''}

      </div>
      <div class="dnl-list" id="dnlList">${_dnlListeHtml(-1)}</div>
    </div>`;
  ov.classList.add('open');

  _ytApiYukle().then(() => {
    if (!document.getElementById('dnlPlayer')) return;   // bu arada kapatılmış
    _dnlPlayer = new YT.Player('dnlPlayer', {
      host: 'https://www.youtube-nocookie.com',
      playerVars: { playsinline: 1, rel: 0 },
      events: {
        onReady: (e) => { e.target.cuePlaylist(ids.slice(0, 200)); },
        onStateChange: () => _dnlAktifiIsaretle(),
        onError: (e) => _dnlHata(e && e.data)
      }
    });
  }).catch(err => {
    const wrap = document.getElementById('dnlPlayerWrap');
    if (wrap) wrap.innerHTML =
      '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
      'text-align:center;padding:16px;color:var(--text3);font-size:12.5px;line-height:1.6;">' +
      _dnlEsc(err.message) + '<br>Bağlantını kontrol et ya da “YouTube\'da Aç”ı kullan.</div>';
  });
}

function _dnlListeHtml(aktifIdx) {
  return _dnlTracks.map((t, i) => {
    const hata = _dnlHatali[t.vid];
    return `<button class="dnl-tr${i === aktifIdx ? ' aktif' : ''}" onclick="dinleAtla(${i})">
      <span class="dnl-no">${i + 1}</span>
      <span class="dnl-nm">${_dnlEsc(t.name)}</span>
      ${hata ? `<span class="dnl-err">${_dnlEsc(hata)}</span>`
             : (t.makam ? `<span class="dnl-mk">${_dnlEsc(t.makam)}</span>` : '')}
    </button>`;
  }).join('');
}

function _dnlAktifiIsaretle() {
  if (!_dnlPlayer || typeof _dnlPlayer.getPlaylistIndex !== 'function') return;
  const i = _dnlPlayer.getPlaylistIndex();
  const liste = document.getElementById('dnlList');
  if (!liste) return;
  liste.querySelectorAll('.dnl-tr').forEach((el, k) => el.classList.toggle('aktif', k === i));
  const el = liste.querySelector('.dnl-tr.aktif');
  if (el) el.scrollIntoView({ block: 'nearest' });
}

// YouTube hata kodları: 2 geçersiz kimlik, 5 oynatıcı hatası, 100 video yok/özel,
// 101 & 150 GÖMME KAPALI (telifli yüklemelerde çok yaygın). Hata yutulmuyor:
// satır işaretleniyor, kullanıcı neden çalmadığını görüyor ve sonrakine geçiliyor.
function _dnlHata(kod) {
  const i = (_dnlPlayer && typeof _dnlPlayer.getPlaylistIndex === 'function') ? _dnlPlayer.getPlaylistIndex() : -1;
  const t = _dnlTracks[i];
  if (t) {
    _dnlHatali[t.vid] = (kod === 101 || kod === 150) ? _r('rep.gommeKapali','gömme kapalı')
      : (kod === 100 ? 'video yok' : _r('rep.acilamadi','açılamadı'));
    const liste = document.getElementById('dnlList');
    if (liste) { liste.innerHTML = _dnlListeHtml(i); }
  }
  // Sıradakine geç — tek bozuk video bütün dinlemeyi durdurmasın.
  setTimeout(() => {
    try { if (_dnlPlayer && i > -1 && i < _dnlTracks.length - 1) _dnlPlayer.nextVideo(); } catch (e) {}
  }, 900);
}

function dinleAtla(i) {
  if (!_dnlPlayer || typeof _dnlPlayer.playVideoAt !== 'function') return;
  try { _dnlPlayer.playVideoAt(i); } catch (e) {}
  _dnlAktifiIsaretle();
}

// (B) YOUTUBE'DA AÇ — geçici çalma listesi. Gömme kısıtından etkilenmez ve
// YouTube uygulamasında arka planda çalar; ezberlerken asıl kullanılacak yol bu.
function dinleYouTubedeAc() {
  const ids = _dnlTracks.map(t => t.vid).slice(0, YT_MAX);
  if (!ids.length) return;
  // Uygulama içi oynatıcı susturuluyor, yoksa iki ses üst üste biner.
  try { if (_dnlPlayer && _dnlPlayer.pauseVideo) _dnlPlayer.pauseVideo(); } catch (e) {}
  window.open('https://www.youtube.com/watch_videos?video_ids=' + ids.join(','), '_blank', 'noopener');
}

function closeDinleSheet() {
  const ov = document.getElementById('dnlOverlay');
  // Oynatıcı YOK EDİLİYOR — yalnız gizlemek sesi arka planda çalar bırakıyor.
  try { if (_dnlPlayer && _dnlPlayer.destroy) _dnlPlayer.destroy(); } catch (e) {}
  _dnlPlayer = null;
  if (ov) { ov.classList.remove('open'); ov.innerHTML = ''; }
}

// ═══════════════════════════════════════════════════════════════════════════
// (2026-08-21) KİŞİSEL ESER NOTU — repertuvar eser listesinden erişim
// ═══════════════════════════════════════════════════════════════════════════
// NİÇİN BURADA: Emir — "repertuvar için eser seçerken bu notları almak
// gerekebilir". Not zaten eser detayında var (eserler.html), ama akıl çoğu
// zaman repertuvarı kurarken çalışıyor; oraya gitmek akışı bölüyordu.
//
// NİÇİN ALT SAYFA: satırda zaten sıra no, tutamaç, ad, makam, solist, kapanış,
// PAYLAŞILAN not ve beş düğme var — mobilde ikinci bir not alanı sığmıyor.
// Satır altında açılan inline alan uzun notlarda listeyi dağıtırdı. Alt sayfa
// deseni projede zaten var (openRepMoveSheet).
//
// ⚠️ YETKİ: düğme `_canM` (repertuvarı yönetebilme) KAPSAMI DIŞINDA duruyor —
// kişisel not herkesin kendi işi; başkasının repertuvarına bakan bir üye de
// kendi notunu okuyup yazabilmeli.

let PERSONAL_NOTES = {};   // {String(work_id): metin}

function _knotEsc(s){
  return (s == null ? '' : String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Satırdaki düğme. Not varsa turkuaz ve dolu, yoksa soluk — listeye bakarken
// hangi eserde notun olduğu tek bakışta görünsün.
function _knotDugme(workId){
  const varMi = !!PERSONAL_NOTES[String(workId)];
  return '<button class="br knb' + (varMi ? ' dolu' : '') + '" data-knot="' + workId + '"' +
         ' onclick="event.stopPropagation();openKnotSheet(\'' + workId + '\')"' +
         ' title="' + (varMi ? _r('rep.notVarT','Kişisel notun var — okumak/düzenlemek için dokun') : _r('rep.notEkleT','Kişisel not ekle')) + '">' +
         '<i class="ti ti-lock" aria-hidden="true"></i></button>';
}

// Not yükleme sonrası tüm satırları yeniden çizmek yerine yalnız düğmelerin
// durumunu güncelliyoruz — açık bir listede kaydırma konumu bozulmasın.
function _knotDugmeleriTazele(){
  // (2026-08-21 düzeltme) Stil BURADA da kuruluyor. Önce yalnız
  // openKnotSheet() içinde kuruluyordu: düğmeye `dolu` sınıfı geliyordu ama
  // karşılığı olan CSS kuralı sayfada henüz yoktu ⇒ notu olan eserin kilidi
  // SOLUK görünüyordu, alt sayfa bir kez açılana kadar. Emir bildirdi.
  _knotStil();
  document.querySelectorAll('button.knb[data-knot]').forEach(b => {
    const varMi = !!PERSONAL_NOTES[String(b.dataset.knot)];
    b.classList.toggle('dolu', varMi);
    b.title = varMi ? _r('rep.notVarT','Kişisel notun var — okumak/düzenlemek için dokun') : _r('rep.notEkleT','Kişisel not ekle');
  });
}

async function knotYukle(){
  try{
    const uid = (typeof getUserId==='function') ? getUserId() : null;
    if(!uid) return;
    const r = await fetch(SUPA_URL+'/rest/v1/personal_work_notes?select=work_id,note&user_id=eq.'+uid,
                          { headers: hdrFor('personal_work_notes') });
    if(!r.ok){ console.warn('[not] personal_work_notes okunamadı', r.status); return; }
    const rows = await r.json();
    PERSONAL_NOTES = {};
    (rows||[]).forEach(x => { if(x.note) PERSONAL_NOTES[String(x.work_id)] = x.note; });
    _knotDugmeleriTazele();
  }catch(e){ /* çevrimdışı — kişisel not katmanı atlanır */ }
}

function _knotStil(){
  if (document.getElementById('knotStil')) return;
  const st = document.createElement('style');
  st.id = 'knotStil';
  st.textContent =
    // Turkuaz bilinçli: altın (--accent) marka vurgusu ve PAYLAŞILAN alanların
    // rengi; kişisel katman ondan ayrı okunmalı.
    '.br.knb.dolu{color:#2dd4bf;border-color:rgba(45,212,191,.55);}' +
    '.knot-ov{position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.55);display:none;}' +
    '.knot-ov.open{display:block;}' +
    '.knot-sheet{position:fixed;left:0;right:0;bottom:0;z-index:9999;background:var(--surface);' +
      'border-top:1px solid var(--border);border-radius:16px 16px 0 0;padding:16px 18px calc(18px + env(safe-area-inset-bottom));' +
      'transform:translateY(100%);transition:transform .22s ease;max-height:82vh;overflow:auto;}' +
    '.knot-sheet.open{transform:translateY(0);}' +
    '.knot-sheet .ks-bas{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:700;' +
      'color:#5eead4;letter-spacing:.05em;text-transform:uppercase;}' +
    '.knot-sheet .ks-ipuc{font-weight:500;text-transform:none;letter-spacing:0;color:var(--text3);font-size:11px;}' +
    '.knot-sheet .ks-eser{font-size:14px;font-weight:600;color:var(--text);margin:6px 0 10px;line-height:1.35;}' +
    '.knot-sheet textarea{width:100%;box-sizing:border-box;min-height:130px;resize:vertical;padding:10px 11px;' +
      'border-radius:9px;background:var(--surface2);color:var(--text);border:1px solid rgba(45,212,191,.35);' +
      'font-family:inherit;font-size:14px;line-height:1.6;}' +
    '.knot-sheet .ks-alt{display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap;}' +
    '.knot-sheet .ks-durum{font-size:11.5px;color:var(--text3);}';
  document.head.appendChild(st);
}

let _knotAcikWorkId = null;

function openKnotSheet(workId){
  if (typeof getUserId === 'function' && !getUserId()) return;
  _knotStil();
  _knotAcikWorkId = String(workId);
  const w = WL[String(workId)] || {};
  const not = PERSONAL_NOTES[String(workId)] || '';

  let ov = document.getElementById('knotOverlay');
  let sh = document.getElementById('knotSheet');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'knotOverlay'; ov.className = 'knot-ov';
    ov.onclick = closeKnotSheet;
    document.body.appendChild(ov);
    sh = document.createElement('div');
    sh.id = 'knotSheet'; sh.className = 'knot-sheet';
    document.body.appendChild(sh);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('knotSheet')?.classList.contains('open')) closeKnotSheet();
    });
  }

  sh.innerHTML =
    '<div class="ks-bas"><i class="ti ti-lock" aria-hidden="true"></i> Kişisel notum' +
      '<span class="ks-ipuc">— yalnızca sen görürsün</span></div>' +
    '<div class="ks-eser">' + _knotEsc(w.name || ('#' + workId)) + '</div>' +
    '<textarea id="knotAlan" placeholder="Bu eserde kendine hatırlatmak istediklerin…">' + _knotEsc(not) + '</textarea>' +
    '<div class="ks-alt">' +
      '<button class="rbtn rbtn-sm rbtn-primary" onclick="knotSheetKaydet()">Kaydet</button>' +
      '<button class="rbtn rbtn-sm" onclick="closeKnotSheet()">İptal</button>' +
      (not ? '<button class="rbtn rbtn-sm" onclick="knotSheetSil()">Sil</button>' : '') +
      '<span class="ks-durum" id="knotDurum"></span>' +
    '</div>';

  requestAnimationFrame(() => {
    document.getElementById('knotOverlay').classList.add('open');
    document.getElementById('knotSheet').classList.add('open');
    const t = document.getElementById('knotAlan');
    if (t) { t.focus(); t.selectionStart = t.value.length; }
  });
}

function closeKnotSheet(){
  document.getElementById('knotOverlay')?.classList.remove('open');
  document.getElementById('knotSheet')?.classList.remove('open');
  _knotAcikWorkId = null;
}

// Yazma: 204 tek başına başarı SAYILMAZ — dönen satıra bakılır. RLS bir yazmayı
// sessizce engellerse kullanıcı "kaydedildi" yalanı görmesin (bu projede
// defalarca yaşandı).
async function knotSheetKaydet(){
  const id = _knotAcikWorkId; if(!id) return;
  const t = document.getElementById('knotAlan'); if(!t) return;
  const yeni = t.value.trim();
  const d = document.getElementById('knotDurum'); if(d) d.textContent = 'Kaydediliyor…';
  try{
    const uid = getUserId(); if(!uid) throw new Error('Oturum yok');
    if (yeni) {
      const H = Object.assign({}, hdrFor('personal_work_notes'), {
        'Content-Type':'application/json',
        'Prefer':'resolution=merge-duplicates,return=representation'
      });
      const r = await fetch(SUPA_URL+'/rest/v1/personal_work_notes?on_conflict=user_id,work_id', {
        method:'POST', headers:H,
        body: JSON.stringify({ user_id: uid, work_id: parseInt(id), note: yeni, updated_at: new Date().toISOString() })
      });
      if(!r.ok) throw new Error('HTTP '+r.status+' '+(await r.text()).slice(0,120));
      const rows = await r.json();
      if(!Array.isArray(rows) || !rows.length) throw new Error(_r('rep.satirYazilmadi','Sunucu hiçbir satır yazmadı (yetki?)'));
      PERSONAL_NOTES[String(id)] = yeni;
    } else {
      await fetch(SUPA_URL+'/rest/v1/personal_work_notes?user_id=eq.'+uid+'&work_id=eq.'+parseInt(id),
                  { method:'DELETE', headers: hdrFor('personal_work_notes') });
      delete PERSONAL_NOTES[String(id)];
    }
    _knotDugmeleriTazele();
    closeKnotSheet();
  }catch(e){ if(d) d.textContent = 'Kaydedilemedi: ' + e.message; }
}

async function knotSheetSil(){
  const id = _knotAcikWorkId; if(!id) return;
  const d = document.getElementById('knotDurum'); if(d) d.textContent = 'Siliniyor…';
  try{
    const uid = getUserId(); if(!uid) return;
    await fetch(SUPA_URL+'/rest/v1/personal_work_notes?user_id=eq.'+uid+'&work_id=eq.'+parseInt(id),
                { method:'DELETE', headers: hdrFor('personal_work_notes') });
    delete PERSONAL_NOTES[String(id)];
    _knotDugmeleriTazele();
    closeKnotSheet();
  }catch(e){ if(d) d.textContent = 'Silinemedi: ' + e.message; }
}

// Açılışta bir kez — liste çizildikten sonra düğmeler kendini tazeliyor.
// Stil, ilk çizimden önce hazır olsun — düğme rengi ilk bakışta doğru olsun diye.
try { _knotStil(); } catch(e) {}
try { document.addEventListener('DOMContentLoaded', () => { try { _knotStil(); } catch(e) {} }); } catch(e) {}
try { window.addEventListener('load', () => setTimeout(knotYukle, 600)); } catch(e) {}
// Sayfa zaten yüklendikten SONRA çalışıyorsak 'load' bir daha ateşlenmez —
// o durumda doğrudan çağırıyoruz (script'in geç yüklenme ihtimali).
try { if (document.readyState === 'complete') setTimeout(knotYukle, 300); } catch(e) {}
