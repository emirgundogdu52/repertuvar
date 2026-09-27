// db.js — IndexedDB helper (offline veri saklama)
// Kullanım: await db.works.getAll(), await db.works.save(data)
//
// DEĞİŞİKLİK GÜNLÜĞÜ
// 2026-08-15 — CANLI KANAL ASKIYA ALINDIKTAN SONRA GERİ BAĞLANIYOR + KOPUKLUK
//              ARTIK SESSİZ DEĞİL. Emir bildirdi: Safari sekmeyi askıya alınca
//              konsolda "WebSocket is closed due to suspension" çıkıyor, kanal
//              düşüyor ve kullanıcı bunu hiç fark etmiyor; ekranda eski veriyle
//              çalışmaya devam ediyor. Mevcut kod (onclose geri çekilmesi,
//              online, visibilitychange, dakikalık bekçi) üç durumu kaçırıyordu:
//              (1) bfcache'ten geri/ileri ile dönüşte `visibilitychange` HİÇ
//                  tetiklenmiyor → `pageshow` (persisted) eklendi;
//              (2) masaüstünde pencere arkaya alınıp öne getirilince (sekme
//                  değişmeden) hiçbir olay yoktu → `focus` eklendi;
//              (3) `gecikme` 60 sn'ye kadar büyümüş olabiliyordu ve sekmeye
//                  dönülse bile sıfırlanmıyordu → kullanıcı ekrandayken bir
//                  dakikaya kadar kopuk kalabiliyordu; artık her uyanışta 2 sn'ye
//                  çekiliyor.
//              Ayrıca: kopukluk 15 saniyeyi geçerse sol altta küçük bir şerit
//              çıkıyor ("Canlı güncelleme kesildi — yeniden bağlanılıyor",
//              dokununca hemen dener), bağlanınca kayboluyor; ve kanal geri
//              geldiğinde kaçırılan değişiklikler için bir kez syncOfflineData()
//              çağrılıyor — yalnız yeniden bağlanmak yetmiyordu, kanal kapalıyken
//              olan değişiklikler bildirim olarak asla gelmiyor.
// 2026-08-03 — window.clearOfflineData() eklendi (çıkışta/hesap değişiminde
//              tüm store'ları temizler; auth.js çağırır).

const DB_NAME = 'RepertuvarDB';
// (2026-08-23) 1 -> 2: Grup/Koro sayfasi tamamen canli fetch uzerineydi;
// cevrimdisi acilinca "Load failed" veriyordu. `groups`, `profiles` ve
// `group_members` store'lari eklendi. Yukseltme guvenli: onupgradeneeded
// yalnizca EKSIK store'lari yaratiyor, mevcut veriye dokunmuyor.
const DB_VERSION = 2;

// Bazı ortamlarda (Safari Isolatiemodus/Lockdown Mode, bazı private-mod durumları,
// eski tarayıcılar) indexedDB global nesnesi hiç mevcut olmayabilir.
// Bu durumda offline önbellekleme sessizce devre dışı kalır, ama site online
// modda (Supabase fetch) çalışmaya devam eder — hiçbir yerde hata fırlatılmaz.
const HAS_IDB = (typeof indexedDB !== 'undefined');
if (!HAS_IDB) {
  console.warn('[db] IndexedDB bu ortamda kullanılamıyor — offline önbellekleme devre dışı, site online modda çalışmaya devam edecek.');
}

let _db = null;

function openDB() {
  if (!HAS_IDB) return Promise.reject(new Error('IndexedDB yok'));
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('works')) {
        db.createObjectStore('works', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('repertoires')) {
        db.createObjectStore('repertoires', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('repertoire_items')) {
        db.createObjectStore('repertoire_items', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('solistler')) {
        db.createObjectStore('solistler', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('groups')) {
        db.createObjectStore('groups', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('profiles')) {
        db.createObjectStore('profiles', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('group_members')) {
        db.createObjectStore('group_members', { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function storeOp(storeName, mode, fn) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

// Bir okuma promise'i verilen süre içinde dönmezse fallback değerle çöz.
// Neden gerekli: aynı store'a açık bir readwrite transaction (ör. replaceAll
// 410 kayıt yazarken) readonly getAll'ı bloke edebiliyor; yavaş ağda bu
// "sonsuz pending"e dönüşüyordu. Kalkan sayesinde UI en fazla `ms` bekler.
// onTimeout: yalnızca süre dolunca çağrılan fonksiyon (fallback değeri döndürür).
function withTimeout(promise, ms, onTimeout) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(onTimeout()), ms))
  ]);
}

function makeStore(storeName) {
  return {
    getAll: () => HAS_IDB
      ? withTimeout(
          storeOp(storeName, 'readonly', (s) => s.getAll()).catch((e) => { console.warn('[db] getAll hatası:', e); return []; }),
          3000,
          () => { console.warn('[db] getAll 3sn timeout (' + storeName + ') — boş dönülüyor, sync arka planda tazeleyecek'); return []; }
        )
      : Promise.resolve([]),
    get: (id) => HAS_IDB
      ? storeOp(storeName, 'readonly', (s) => s.get(id)).catch((e) => { console.warn('[db] get hatası:', e); return undefined; })
      : Promise.resolve(undefined),
    save: (item) => HAS_IDB
      ? storeOp(storeName, 'readwrite', (s) => s.put(item)).catch((e) => { console.warn('[db] save hatası:', e); })
      : Promise.resolve(),
    saveAll: (items) => HAS_IDB
      ? openDB().then((db) => new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          (items || []).forEach((item) => store.put(item));
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        })).catch((e) => { console.warn('[db] saveAll hatası:', e); })
      : Promise.resolve(),
    // Sunucudan gelen TAM (o sorgu kapsamındaki) listeyle local'i eşitler:
    // yeni/güncellenen kayıtları yazar, artık sunucuda olmayanları local'den SİLER.
    // saveAll'dan farkı bu — saveAll asla silmez, bu yüzden silinen/gizli kalan
    // kayıtlar (ör. silinen bir repertuvar) local cache'de sonsuza kadar kalabiliyordu.
    replaceAll: (items) => HAS_IDB
      ? storeOp(storeName, 'readonly', (s) => s.getAllKeys()).then((existingKeys) => {
          const newIds = new Set((items || []).map((it) => it.id));
          const toDelete = (existingKeys || []).filter((k) => !newIds.has(k));
          return openDB().then((db) => new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            toDelete.forEach((k) => store.delete(k));
            (items || []).forEach((item) => store.put(item));
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          }));
        }).catch((e) => { console.warn('[db] replaceAll hatası:', e); })
      : Promise.resolve(),
    delete: (id) => HAS_IDB
      ? storeOp(storeName, 'readwrite', (s) => s.delete(id)).catch((e) => { console.warn('[db] delete hatası:', e); })
      : Promise.resolve(),
    clear: () => HAS_IDB
      ? storeOp(storeName, 'readwrite', (s) => s.clear()).catch((e) => { console.warn('[db] clear hatası:', e); })
      : Promise.resolve(),
  };
}

// Meta store — son sync zamanı vb.
const meta = {
  get: (key) => HAS_IDB
    ? storeOp('meta', 'readonly', (s) => s.get(key)).then((r) => r?.value).catch(() => undefined)
    : Promise.resolve(undefined),
  set: (key, value) => HAS_IDB
    ? storeOp('meta', 'readwrite', (s) => s.put({ key, value })).catch((e) => { console.warn('[db] meta.set hatası:', e); })
    : Promise.resolve(),
};

// Ana export
window.db = {
  works: makeStore('works'),
  repertoires: makeStore('repertoires'),
  repertoire_items: makeStore('repertoire_items'),
  solistler: makeStore('solistler'),
  groups: makeStore('groups'),
  profiles: makeStore('profiles'),
  group_members: makeStore('group_members'),
  meta,
};

// Online/offline durumu
window.isOnline = () => navigator.onLine;

// ── Çıkışta / hesap değişiminde offline veriyi temizle ──────────────────────
// (2026-08-03) Çıkış yapıldığında IndexedDB olduğu gibi kalıyordu: aynı cihazı
// paylaşan ikinci kullanıcı, önceki kullanıcının repertuvarlarını, eserlerini ve
// solistlerini görebiliyordu. auth.js'teki logoutSilent() ve enforceUserScope()
// bu fonksiyonu çağırır. Söz: hata fırlatmaz, her koşulda resolve olur —
// temizlik takılırsa çıkış yine de tamamlanmalı.
window.clearOfflineData = function() {
  if (!HAS_IDB) return Promise.resolve();
  const jobs = [
    db.works.clear(),
    db.repertoires.clear(),
    db.repertoire_items.clear(),
    db.solistler.clear(),
    db.groups.clear(),
    db.profiles.clear(),
    db.group_members.clear(),
    storeOp('meta', 'readwrite', (s) => s.clear()).catch(() => {}),
  ];
  return Promise.all(jobs)
    .then(() => { console.log('[db] Offline veri temizlendi'); })
    .catch((e) => { console.warn('[db] clearOfflineData hatası:', e); });
};

// Sync — sunucudan veri çekip IndexedDB'ye kaydet
window.syncOfflineData = async function() {
  // Token dolmuş olabilir (1 saatlik ömür) — sync fetch'lerinden ÖNCE yenile.
  let token = localStorage.getItem('sb_token');
  if (!token) return;
  // (2026-09-27) "Hazırlanıyor" durumu için: eşitleme sürerken bayrak açık.
  // Aynı anda iki çağrı gelebiliyor (focus + visibilitychange); sayaçla tutuyoruz
  // ki ilki bitince ikincisi sürerken bayrak erken kapanmasın.
  _offSyncBasla();
  if (typeof window.ensureValidToken === 'function') {
    try { token = (await window.ensureValidToken()) || token; } catch(e) {}
  }

  try {
    const SUPA_URL = 'https://ehytkzxdhjyjuubizdnl.supabase.co';
    const SUPA_KEY = 'sb_publishable_f_WsYxzN06B5dGROrkGyPQ_UDxKSbtO';
    const headers = { apikey: SUPA_KEY, Authorization: 'Bearer ' + token };

    // group_id veya owner_id'ye göre repertuvar filtresi
    // ÖNEMLİ: repertoires.js ve stage.html ile AYNI kaynağı kullanmalı (getGroupId/getUserId) —
    // yoksa üçü farklı "gid" değerlerine göre çekip replaceAll ile birbirinin cache'ini
    // ezerek kapsam dışı repertuvarları geri sızdırabilir.
    const gid = (typeof getGroupId === 'function') ? getGroupId() : localStorage.getItem('user_group_id');
    const uid = (typeof getUserId === 'function') ? getUserId() : (localStorage.getItem('sb_user') ? JSON.parse(localStorage.getItem('sb_user')).id : null);
    const repFilter = gid
      ? '/rest/v1/repertoires?select=*&order=created_at.desc&or=(owner_id.eq.' + uid + ',group_id.eq.' + gid + ',is_public.eq.true)'
      : (uid ? '/rest/v1/repertoires?select=*&order=created_at.desc&or=(owner_id.eq.' + uid + ',is_public.eq.true)' : '/rest/v1/repertoires?select=*&order=created_at.desc&is_public=eq.true');
    const solFilter = gid ? '/rest/v1/solistler?select=*&order=name.asc&group_id=eq.' + gid : '/rest/v1/solistler?select=*&order=name.asc';

    // (2026-08-23) Grup verisi de senkronlaniyor. RLS zaten kapsami daraltiyor:
    // group_members yalnizca kendi gruplarimi, profiles yalnizca grup
    // arkadaslarimi donduruyor — istemcide ayrica filtrelemeye gerek yok.
    const [worksRes, repsRes, solRes, itemsRes, grpRes, gmRes, profRes] = await Promise.all([
      // (2026-08-30) Silinmiş eserler ÖNBELLEĞE ALINMASIN: buraya girerse
      // çevrimdışı çalışan her sayfa onları gösterir ve sebebi bulunması zor olur.
      fetch(SUPA_URL + '/rest/v1/works?select=*&deleted_at=is.null&order=name.asc&limit=10000', { headers }),
      fetch(SUPA_URL + repFilter, { headers }),
      fetch(SUPA_URL + solFilter, { headers }),
      fetch(SUPA_URL + '/rest/v1/repertoire_items?select=*&order=seq.asc', { headers }),
      fetch(SUPA_URL + '/rest/v1/groups?select=*', { headers }),
      fetch(SUPA_URL + '/rest/v1/group_members?select=*', { headers }),
      fetch(SUPA_URL + '/rest/v1/profiles?select=id,display_name,email,phone,instrument,instruments,group_id', { headers }),
    ]);

    if (worksRes.ok) await db.works.replaceAll(await worksRes.json());
    if (repsRes.ok) await db.repertoires.replaceAll(await repsRes.json());
    if (solRes.ok) await db.solistler.replaceAll(await solRes.json());
    if (itemsRes.ok) await db.repertoire_items.replaceAll(await itemsRes.json());
    if (grpRes.ok) await db.groups.replaceAll(await grpRes.json());
    if (gmRes.ok) await db.group_members.replaceAll(await gmRes.json());
    if (profRes.ok) await db.profiles.replaceAll(await profRes.json());
    // (2026-09-27, Offline Düzeltme 3) Kişisel katman (akor, ton, not, sahne tercihi).
    // Ayrı try: buradaki bir hata ana eşitlemeyi ve lastSync/lastSyncOk'u bozmasın.
    // Önce çevrimdışı yapılmış kişisel değişiklikleri gönder, SONRA sunucudan çek.
    try { await window.kisiselKuyrukGonder(); } catch (e) { console.warn('[db] kişisel kuyruk gönderilemedi:', e); }
    try { await _kisiselSenkron(SUPA_URL, headers, uid); } catch (e) { console.warn('[db] kişisel katman eşitlenemedi:', e); }

    await db.meta.set('lastSync', new Date().toISOString());
    // (2026-09-27) `lastSync` istek başarısız olsa da yazılıyordu (mevcut davranış,
    // dokunulmadı). Sahne için gereken üç tablonun HEPSİ başarıyla geldiyse ayrıca
    // `lastSyncOk` tutuluyor — Offline Hazır raporunda gösterilir.
    if (worksRes.ok && repsRes.ok && itemsRes.ok) {
      await db.meta.set('lastSyncOk', new Date().toISOString());
    }
    console.log('[db] Offline sync tamamlandı:', new Date().toLocaleTimeString('tr-TR'));
    // Sync bitti — dinleyen sayfalar (repertuvarlar, sahne) kendini tazelesin.
    try { window.dispatchEvent(new CustomEvent('data-synced')); } catch (e) {}
    if (typeof window.realtimeBaglan === 'function') window.realtimeBaglan();
  } catch (e) {
    console.warn('[db] Sync hatası:', e);
  } finally {
    _offSyncBitir();
  }
};

// ── GERÇEK "OFFLINE HAZIR" KONTROLÜ (2026-09-27, Offline Düzeltme 1) ─────────
// Eskiden eserler.html'de "🟢 Offline Hazır" koşulsuz basılan sabit bir metindi.
// Artık IndexedDB'deki GERÇEK kayıtlara bakılıyor. Kapsam (bu adım): sahnede
// gereken METİN verisi. Nota/PDF ve kişisel akor/not bu adımda kriter DEĞİL.
//
// Bir eser "hazır" sayılır: kayıt var, silinmemiş, adı dolu ve söz/akor/makam/
// usul/karar ALANLARI kayıtta mevcut. Alanın BOŞ olması sorun değil (eserin
// gerçekten sözü olmayabilir); ANAHTARIN hiç olmaması "henüz yüklenmedi" demek
// (ör. yalnız hafif liste gelmiş satır).
// Bir repertuvar "hazır" sayılır: kayıt var, satırları okunabildi, en az bir
// satır var, her satırda sıra/potpuri/karar/solist/not alanları mevcut ve her
// satırın eseri yukarıdaki anlamda hazır.
// Ağ isteğinin başarısız olması tek başına hiçbir şeyi "hazır" yapmaz; karar
// yalnızca cihazdaki veriye göre verilir.
const _OFF_ESER_ALANLARI = ['lyrics', 'chords', 'makam', 'measurement', 'closing_note'];
const _OFF_SATIR_ALANLARI = ['seq', 'linked_prev', 'closing_note', 'performer', 'note'];

let _offSyncSayac = 0;
window._offlineSyncing = false;
function _offSyncYay() {
  try { window.dispatchEvent(new CustomEvent('offline-sync-state', { detail: { syncing: window._offlineSyncing } })); } catch (e) {}
}
function _offSyncBasla() { _offSyncSayac++; window._offlineSyncing = true; _offSyncYay(); }
function _offSyncBitir() {
  _offSyncSayac = Math.max(0, _offSyncSayac - 1);
  window._offlineSyncing = _offSyncSayac > 0;
  _offSyncYay();
}

function _eserMetniTamMi(w) {
  if (!w || w.deleted_at) return false;
  if (!String(w.name || '').trim()) return false;
  return _OFF_ESER_ALANLARI.every((k) => k in w);
}

// IndexedDB anahtar tipi sunucudakiyle aynı (works.id sayı, repertoires.id
// metin olabilir); çağıran taraf string verebilir — iki biçimi de dene.
async function _offGet(store, id) {
  let r = await store.get(id);
  if (r === undefined && typeof id === 'string' && /^\d+$/.test(id)) r = await store.get(Number(id));
  if (r === undefined && typeof id === 'number') r = await store.get(String(id));
  return r;
}

window.checkWorkOfflineReady = async function (workId) {
  if (!HAS_IDB) return { status: 'not_ready', reason: 'idb_yok' };
  const w = await _offGet(db.works, workId);
  const kisiselTamam = await _kisiselHazirMi();
  // (2026-09-27, Offline Düzeltme 4) Notası varsa cihazda olmalı; yoksa indir.
  const notaEksik = w ? await _notaEksikler(_notaUrlleri(w)) : [];
  if (notaEksik.length) window.notaIndir('w:' + w.id, notaEksik);
  if (_eserMetniTamMi(w) && kisiselTamam && !notaEksik.length) return { status: 'ready' };
  return { status: window._offlineSyncing ? 'syncing' : 'not_ready',
           reason: !w ? 'eser_yok' : (!_eserMetniTamMi(w) ? 'eksik_alan' : (!kisiselTamam ? 'kisisel_yok' : 'nota_eksik')) };
};

window.checkRepertoireOfflineReady = async function (repId) {
  const sonuc = {
    status: 'not_ready', repId: repId, required: 0, present: 0,
    missingWorks: [], badItems: 0, checkedAt: new Date().toISOString(), lastSyncOk: null
  };
  if (!HAS_IDB) { sonuc.reason = 'idb_yok'; return sonuc; }
  sonuc.lastSyncOk = (await db.meta.get('lastSyncOk')) || null;

  const rep = await _offGet(db.repertoires, repId);
  // getAll'ın 3 sn kalkanı zaman aşımında [] döndürür; o da "satır yok" gibi
  // görünürdü. Burada kalkansız okuyoruz: okunamazsa HAZIR DEĞİL.
  let tumSatirlar = null;
  try { tumSatirlar = await storeOp('repertoire_items', 'readonly', (s) => s.getAll()); } catch (e) { tumSatirlar = null; }

  if (!rep) sonuc.reason = 'repertuvar_yok';
  else if (!Array.isArray(tumSatirlar)) sonuc.reason = 'satir_okunamadi';
  else {
    const satirlar = tumSatirlar.filter((t) => String(t.repertoire_id) === String(repId));
    if (!satirlar.length) {
      sonuc.status = 'empty';
      sonuc.reason = 'satir_yok';
    } else {
      sonuc.badItems = satirlar.filter((t) =>
        t.work_id == null || !_OFF_SATIR_ALANLARI.every((k) => k in t)
      ).length;
      const eserIdleri = [...new Set(satirlar.map((t) => t.work_id).filter((x) => x != null))];
      sonuc.required = eserIdleri.length;
      for (const id of eserIdleri) {
        if (_eserMetniTamMi(await _offGet(db.works, id))) sonuc.present++;
        else sonuc.missingWorks.push(id);
      }
      if (!sonuc.badItems && !sonuc.missingWorks.length) sonuc.status = 'ready';
      else sonuc.reason = sonuc.badItems ? 'satir_eksik_alan' : 'eser_eksik';
    }
  }
  // (2026-09-27, Offline Düzeltme 3) Oturum açık kullanıcının kişisel katmanı
  // (akor/ton/not) cihazda yoksa sahnede ortak akora düşülür → hazır DEĞİL.
  sonuc.kisisel = await _kisiselHazirMi();
  if (sonuc.status === 'ready' && !sonuc.kisisel) { sonuc.status = 'not_ready'; sonuc.reason = 'kisisel_yok'; }
  // (2026-09-27, Offline Düzeltme 4) Repertuvardaki eserlerin nota görselleri ve
  // PDF'leri cihazda olmalı. Eksik varsa arka planda indirilir (notaIndir;
  // başarısız denemeden sonra 60 sn tekrar denenmez) — o sürede "hazırlanıyor".
  if (Array.isArray(tumSatirlar) && rep) {
    const urls = [];
    for (const t of tumSatirlar.filter((x) => String(x.repertoire_id) === String(repId))) {
      _notaUrlleri(await _offGet(db.works, t.work_id)).forEach((u) => { if (urls.indexOf(u) < 0) urls.push(u); });
    }
    const eksik = await _notaEksikler(urls);
    sonuc.notaGerekli = urls.length;
    sonuc.notaVar = urls.length - eksik.length;
    if (eksik.length) {
      window.notaIndir('r:' + repId, eksik);
      if (sonuc.status === 'ready') { sonuc.status = 'not_ready'; sonuc.reason = 'nota_eksik'; }
    }
  }
  // Eksik varken eşitleme sürüyorsa "hazırlanıyor"; bitmişse "hazır değil".
  if (sonuc.status === 'not_ready' && window._offlineSyncing) sonuc.status = 'syncing';

  try {
    await db.meta.set('offlineReady:' + repId, {
      status: sonuc.status, required: sonuc.required, present: sonuc.present,
      checkedAt: sonuc.checkedAt, lastSyncOk: sonuc.lastSyncOk
    });
  } catch (e) {}
  return sonuc;
};

// ── KİŞİSEL KATMAN ÖNBELLEĞİ (2026-09-27, Offline Düzeltme 3) ─────────────────
// Kişisel akor + ton kaydırma (personal_chords), kişisel not (personal_work_notes)
// ve "sahnede kişisel notu göster" tercihi (profiles.sahne_kisisel_not) eskiden
// YALNIZ canlı çekiliyordu; offline'da sessizce ortak akora dönülüyordu.
// Artık mevcut `meta` store'unda tek kayıt: meta['kisisel'] =
//   { uid, chords: {work_id: {chords, transpose}}, notes: {work_id: metin},
//     sahneKisiselNot: bool|null, chordsAt, notesAt }
// Kayıt KULLANICIYA bağlı: uid tutmazsa okunmaz (cihazı paylaşan 2. kullanıcı).
// Çıkışta clearOfflineData zaten meta'yı siliyor. Yeni store / şema değişikliği yok.
const _KISISEL = 'kisisel';
function _aktifUid() {
  try {
    if (typeof getUserId === 'function') return getUserId();
    const u = JSON.parse(localStorage.getItem('sb_user') || 'null');
    return (u && u.id) || null;
  } catch (e) { return null; }
}
window._kisiselAkorSatirlari = function (rows) {
  const c = {};
  (rows || []).forEach((x) => {
    if (x.chords || x.transpose) c[String(x.work_id)] = { chords: x.chords || '', transpose: parseInt(x.transpose) || 0 };
  });
  return c;
};
window._kisiselNotSatirlari = function (rows) {
  const n = {};
  (rows || []).forEach((x) => { if (x.note) n[String(x.work_id)] = x.note; });
  return n;
};
window.kisiselOku = async function () {
  const uid = _aktifUid(); if (!uid) return null;
  const k = await db.meta.get(_KISISEL);
  return (k && k.uid === uid) ? k : null;
};
async function _kisiselTaban(uid) {
  const k = await db.meta.get(_KISISEL);
  return (k && k.uid === uid) ? k : { uid: uid, chords: {}, notes: {}, sahneKisiselNot: null };
}
// Ağdan TAM liste geldiğinde: parçayı (chords/notes/sahneKisiselNot + *At) yazar.
// (2026-09-27, çevrimdışı düzenleme) Sunucudan gelen tam listeye, henüz
// GÖNDERİLMEMİŞ çevrimdışı değişiklikler üstüne uygulanır — yoksa tazeleme
// kullanıcının kuyruktaki düzenlemesini ekrandan silerdi. Birleşik kaydı döndürür.
window.kisiselYaz = async function (parca) {
  const uid = _aktifUid(); if (!uid) return null;
  const k = Object.assign(await _kisiselTaban(uid), parca || {}, { uid: uid });
  const bekleyen = await _kuyrukOku();
  if (bekleyen.length) {
    k.chords = Object.assign({}, k.chords); k.notes = Object.assign({}, k.notes);
    _kuyrukUygula(k, bekleyen.filter((o) => (o.tur === 'not' || o.tur === 'notSil') ? !!(parca && parca.notes) : !!(parca && parca.chords)));
  }
  await db.meta.set(_KISISEL, k);
  return k;
};
// Tek eserlik başarılı yazma/silme sonrası önbelleği aynala. *At bayraklarına
// DOKUNMAZ: tek satır, tam listenin eşitlendiği anlamına gelmez.
window.kisiselGuncelle = async function (fn) {
  const uid = _aktifUid(); if (!uid) return;
  const k = await _kisiselTaban(uid);
  try { fn(k); } catch (e) { return; }
  await db.meta.set(_KISISEL, k);
};

// ── ÇEVRİMDIŞI KİŞİSEL YAZMA KUYRUĞU (2026-09-27) ─────────────────────────────
// Kişisel akor / ton / not yazması AĞ HATASIYLA düşerse işlem kaybolmaz:
// meta['kisiselKuyruk'] = { uid, ops: [{tur, workId, deger, at}] } kuyruğuna
// girer, yerel önbellek hemen güncellenir. Kuyruk syncOfflineData'nın başında
// (bağlantı gelince, sayfa açılınca, sekmeye dönünce) sırayla gönderilir.
// tur: 'akor' | 'ton' | 'akorSil' | 'not' | 'notSil'.
// Aynı eser + aynı tür için yalnız SON işlem tutulur (5 kez ton = 1 istek).
// Sunucu REDDEDERSE (yetki/400) işlem kuyruktan düşer ve konsola yazılır —
// sonsuza dek denenip kuyruğu tıkamasın. Çakışma kuralı: son yazan kazanır
// (veri kişisel; çakışma yalnız aynı kullanıcının iki cihazında olur).
const _KUYRUK = 'kisiselKuyruk';
const _Q_SUPA_URL = 'https://ehytkzxdhjyjuubizdnl.supabase.co';
const _Q_SUPA_KEY = 'sb_publishable_f_WsYxzN06B5dGROrkGyPQ_UDxKSbtO';
function _kuyrukAnahtar(op) {
  const t = op.tur === 'ton' ? 't' : ((op.tur === 'not' || op.tur === 'notSil') ? 'n' : 'a');
  return t + ':' + op.workId;
}
async function _kuyrukOku() {
  const uid = _aktifUid(); if (!uid) return [];
  const k = await db.meta.get(_KUYRUK);
  return (k && k.uid === uid && Array.isArray(k.ops)) ? k.ops : [];
}
async function _kuyrukYaz(ops) {
  const uid = _aktifUid(); if (!uid) return;
  await db.meta.set(_KUYRUK, { uid: uid, ops: ops });
}
function _kuyrukUygula(k, ops) {
  (ops || []).forEach((op) => {
    const w = String(op.workId);
    if (op.tur === 'akor') k.chords[w] = Object.assign({ chords: '', transpose: 0 }, k.chords[w], { chords: op.deger });
    else if (op.tur === 'ton') k.chords[w] = Object.assign({ chords: '', transpose: 0 }, k.chords[w], { transpose: parseInt(op.deger) || 0 });
    else if (op.tur === 'akorSil') delete k.chords[w];
    else if (op.tur === 'not') k.notes[w] = op.deger;
    else if (op.tur === 'notSil') delete k.notes[w];
  });
}
function _kuyrukYay(detay) {
  try { window.dispatchEvent(new CustomEvent('kisisel-kuyruk', { detail: detay })); } catch (e) {}
}
// fetch ağ hatasında TypeError, zaman aşımında AbortError/TimeoutError fırlatır.
window.kisiselAgHatasiMi = function (e) {
  return !!e && (e.name === 'TypeError' || e.name === 'AbortError' || e.name === 'TimeoutError');
};
window.kisiselKuyrugaEkle = async function (op) {
  const uid = _aktifUid(); if (!uid) return;
  op = { tur: op.tur, workId: parseInt(op.workId), deger: op.deger, at: new Date().toISOString() };
  const anahtar = _kuyrukAnahtar(op);
  const ops = (await _kuyrukOku()).filter((o) => _kuyrukAnahtar(o) !== anahtar);
  ops.push(op);
  await _kuyrukYaz(ops);
  await window.kisiselGuncelle((k) => _kuyrukUygula(k, [op]));
  _kuyrukYay({ bekleyen: ops.length });
};
window.kisiselKuyrukSayisi = async function () { return (await _kuyrukOku()).length; };
// Tek işlemi gönder: 'ok' | 'ag' (ağ yok) | 'yetki' (401) | 'red' (sunucu reddetti)
async function _kuyrukIstek(op, jeton) {
  const uid = _aktifUid();
  const H = { apikey: _Q_SUPA_KEY, Authorization: 'Bearer ' + jeton };
  try {
    if (op.tur === 'akorSil' || op.tur === 'notSil') {
      const tablo = op.tur === 'notSil' ? 'personal_work_notes' : 'personal_chords';
      const r = await fetch(_Q_SUPA_URL + '/rest/v1/' + tablo + '?user_id=eq.' + uid + '&work_id=eq.' + op.workId,
        { method: 'DELETE', headers: Object.assign({}, H, { Prefer: 'return=minimal' }) });
      if (r.status === 401) return 'yetki';
      return (r.ok || r.status === 204) ? 'ok' : 'red';
    }
    const tablo = op.tur === 'not' ? 'personal_work_notes' : 'personal_chords';
    const govde = { user_id: uid, work_id: op.workId, updated_at: new Date().toISOString() };
    if (op.tur === 'akor') govde.chords = op.deger;
    else if (op.tur === 'ton') govde.transpose = parseInt(op.deger) || 0;
    else govde.note = op.deger;
    const r = await fetch(_Q_SUPA_URL + '/rest/v1/' + tablo + '?on_conflict=user_id,work_id', {
      method: 'POST',
      headers: Object.assign({}, H, { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' }),
      body: JSON.stringify(govde)
    });
    if (r.status === 401) return 'yetki';
    if (!r.ok) return 'red';
    // 2xx tek başına başarı SAYILMAZ: RLS sessizce engellerse 0 satır döner.
    let satirlar = []; try { satirlar = await r.json(); } catch (e) {}
    return (Array.isArray(satirlar) && satirlar.length) ? 'ok' : 'red';
  } catch (e) { return 'ag'; }
}
let _kuyrukGonderimi = null;
window.kisiselKuyrukGonder = function () {
  if (_kuyrukGonderimi) return _kuyrukGonderimi;
  _kuyrukGonderimi = (async () => {
    const sonuc = { gonderilen: 0, reddedilen: 0, kalan: 0 };
    if (!(await _kuyrukOku()).length) return sonuc;
    let jeton = localStorage.getItem('sb_token');
    if (!jeton) { sonuc.kalan = (await _kuyrukOku()).length; return sonuc; }
    if (typeof window.ensureValidToken === 'function') { try { jeton = (await window.ensureValidToken()) || jeton; } catch (e) {} }
    for (;;) {
      const ops = await _kuyrukOku();          // her turda TAZE oku: arada yeni işlem eklenmiş olabilir
      if (!ops.length) break;
      const op = ops[0];
      let s = await _kuyrukIstek(op, jeton);
      if (s === 'yetki' && typeof window.ensureValidToken === 'function') {
        try { jeton = (await window.ensureValidToken()) || jeton; } catch (e) {}
        s = await _kuyrukIstek(op, jeton);
      }
      if (s === 'ag' || s === 'yetki') break;  // bağlantı / oturum yok: sırayı koru, sonra dene
      if (s === 'red') { sonuc.reddedilen++; console.warn('[kuyruk] sunucu reddetti, atlandı:', op); }
      else sonuc.gonderilen++;
      // Yalnız GÖNDERİLEN işlemi çıkar (aynı anahtarla daha yeni bir işlem geldiyse o kalır).
      const guncel = await _kuyrukOku();
      await _kuyrukYaz(guncel.filter((o) => !(o.at === op.at && _kuyrukAnahtar(o) === _kuyrukAnahtar(op))));
    }
    sonuc.kalan = (await _kuyrukOku()).length;
    if (sonuc.gonderilen || sonuc.reddedilen) _kuyrukYay(sonuc);
    return sonuc;
  })().finally(() => { _kuyrukGonderimi = null; });
  return _kuyrukGonderimi;
};
// syncOfflineData içinden: kişisel katmanı çek. 404 = tablo yok = o katman boş
// (kesin cevap); ağ hatası / diğer HTTP hataları önbelleğe DOKUNMAZ.
async function _kisiselSenkron(base, headers, uid) {
  if (!uid) return;
  const simdi = new Date().toISOString();
  const parca = {};
  let r = await fetch(base + '/rest/v1/personal_chords?select=work_id,chords,transpose&user_id=eq.' + uid, { headers });
  if (!r.ok && r.status !== 404) r = await fetch(base + '/rest/v1/personal_chords?select=work_id,chords&user_id=eq.' + uid, { headers });
  if (r.ok) { parca.chords = window._kisiselAkorSatirlari(await r.json()); parca.chordsAt = simdi; }
  else if (r.status === 404) { parca.chords = {}; parca.chordsAt = simdi; }
  const n = await fetch(base + '/rest/v1/personal_work_notes?select=work_id,note&user_id=eq.' + uid, { headers });
  if (n.ok) { parca.notes = window._kisiselNotSatirlari(await n.json()); parca.notesAt = simdi; }
  else if (n.status === 404) { parca.notes = {}; parca.notesAt = simdi; }
  try {
    const p = await fetch(base + '/rest/v1/profiles?select=sahne_kisisel_not&id=eq.' + uid, { headers });
    if (p.ok) { const rr = await p.json(); parca.sahneKisiselNot = !(rr && rr.length && rr[0].sahne_kisisel_not === false); }
  } catch (e) {}
  if (Object.keys(parca).length) await window.kisiselYaz(parca);
}
// Offline Hazır için: oturum açık kullanıcının kişisel katmanı en az bir kez
// TAM eşitlenmiş mi? Oturum yoksa kişisel katman yoktur → engel değil.
async function _kisiselHazirMi() {
  const uid = _aktifUid(); if (!uid) return true;
  const k = await window.kisiselOku();
  return !!(k && k.chordsAt && k.notesAt);
}

// ── NOTA / PDF ÖNBELLEĞİ (2026-09-27, Offline Düzeltme 4) ─────────────────────
// Nota görselleri ve PDF'ler Supabase Storage'dan (farklı origin) geliyor ve
// eskiden HİÇ önbelleğe alınmıyordu. Artık service worker 'repertuvar-nota'
// önbelleğini kullanıyor (sürümden bağımsız, kalıcı). Burada: açılan repertuvarın
// / eserin notalarını ÖNCEDEN indirme (notaIndir) ve Offline Hazır için "cihazda
// mı?" kontrolü. Ad service-worker.js'teki NOTA_CACHE ile AYNI olmalı.
const _NOTA_CACHE = 'repertuvar-nota';
function _notaUrlleri(w) {
  if (!w) return [];
  const p = Array.isArray(w.nota_pages) ? w.nota_pages.filter(Boolean) : [];
  return p.length ? p : (w.nota_url ? [w.nota_url] : []);
}
async function _notaEksikler(urls) {
  if (typeof caches === 'undefined') return urls.slice();
  const c = await caches.open(_NOTA_CACHE);
  const eksik = [];
  for (const u of urls) { if (!(await c.match(u))) eksik.push(u); }
  return eksik;
}
const _notaIndirme = {};     // anahtar → Promise (aynı anda ikinci kez başlatma)
const _notaSonHata = {};     // anahtar → zaman (başarısızsa 60 sn tekrar deneme yok)
let _notaKalicilikIstendi = false;
window.addEventListener('online', () => { for (const k in _notaSonHata) delete _notaSonHata[k]; });
// urls içinden cihazda olmayanları indirir. Döner: {indirilen, hata, kota}.
window.notaIndir = function (anahtar, urls) {
  if (_notaIndirme[anahtar]) return _notaIndirme[anahtar];
  if (_notaSonHata[anahtar] && Date.now() - _notaSonHata[anahtar] < 60000) return Promise.resolve({ indirilen: 0, hata: 0, atlandi: true });
  if (typeof caches === 'undefined' || !urls || !urls.length) return Promise.resolve({ indirilen: 0, hata: 0 });
  _offSyncBasla();
  _notaIndirme[anahtar] = (async () => {
    const sonuc = { indirilen: 0, hata: 0, kota: false };
    try {
      // Tarayıcıdan kalıcı depolama iste (izin verilirse baskı altında silinmez).
      if (!_notaKalicilikIstendi && navigator.storage && navigator.storage.persist) {
        _notaKalicilikIstendi = true;
        try { await navigator.storage.persist(); } catch (e) {}
      }
      // Depolama %90 dolduysa indirme yapma — kalan yeri tüketmeyelim.
      if (navigator.storage && navigator.storage.estimate) {
        try {
          const e = await navigator.storage.estimate();
          if (e.quota && e.usage / e.quota > 0.9) { sonuc.kota = true; console.warn('[nota] depolama dolu, indirme atlandı'); return sonuc; }
        } catch (e) {}
      }
      const c = await caches.open(_NOTA_CACHE);
      const kuyruk = (await _notaEksikler(urls)).slice();
      const isci = async () => {
        while (kuyruk.length) {
          const u = kuyruk.shift();
          try {
            const r = await fetch(u, { mode: 'cors' });
            if (r.ok) { await c.put(u, r); sonuc.indirilen++; } else sonuc.hata++;
          } catch (e) { sonuc.hata++; }
        }
      };
      await Promise.all([isci(), isci(), isci()]);   // aynı anda en fazla 3 indirme
    } finally {
      if (sonuc.hata || sonuc.kota) _notaSonHata[anahtar] = Date.now(); else delete _notaSonHata[anahtar];
      delete _notaIndirme[anahtar];
      _offSyncBitir();                                // rozetler yeniden kontrol edilir
    }
    return sonuc;
  })();
  return _notaIndirme[anahtar];
};

// Tüm sayfalar aynı metni kullansın diye rozet metni tek yerde.
window.offlineRozetMetni = function (status) {
  const t = (k, v) => { try { return (window.i18n && window.i18n.t) ? window.i18n.t(k, v) : v; } catch (e) { return v; } };
  if (status === 'ready') return t('es.offlineHazir', '🟢 Offline Hazır');
  if (status === 'syncing') return t('es.offlineHazirlaniyor', '🟡 Hazırlanıyor…');
  if (status === 'not_ready') return t('es.offlineHazirDegil', '⚪ Offline hazır değil');
  return '';
};

// ── AŞAĞI ÇEKİP BIRAKARAK TAZELEME (2026-08-06) ──────────────────────────
// Sunucudan veri yalnızca sayfa açılışında ve `online` olayında çekiliyordu;
// başka bir cihazda yapılan değişiklik (sıralama, yeni eser, potpuri) uygulama
// tamamen kapanıp açılana kadar görünmüyordu. Bu, telefonda beklenen hareketi
// getiriyor: liste en üstteyken parmakla aşağı çek, bırak, tazelensin.
// Not: bu yalnızca ÇEKİLDİĞİNDE çalışır — anlık bildirim değil. Değişikliğin
// kendiliğinden düşmesi ayrı bir iş (Supabase Realtime).
(function () {
  if (typeof document === 'undefined') return;
  var ESIK = 70;          // bu kadar piksel çekilince tazeleme tetiklenir
  var MAKS = 110;         // göstergenin inebileceği en fazla mesafe
  var baslangic = null, mesafe = 0, calisiyor = false, gosterge = null;

  function kur() {
    if (gosterge) return;
    gosterge = document.createElement('div');
    gosterge.setAttribute('aria-hidden', 'true');
    gosterge.style.cssText =
      'position:fixed;left:50%;top:0;transform:translate(-50%,-46px);z-index:99999;' +
      'width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;' +
      'background:var(--surface,#19233F);border:1px solid var(--border,rgba(255,255,255,.15));' +
      'box-shadow:0 4px 14px rgba(0,0,0,.35);pointer-events:none;opacity:0;transition:opacity .15s;';
    gosterge.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
      'stroke-linecap="round" style="color:var(--accent,#FFC83D);"><path d="M12 5v14M5 12l7 7 7-7"/></svg>';
    document.body.appendChild(gosterge);
  }

  function ciz(y, donuyor) {
    if (!gosterge) return;
    gosterge.style.opacity = y > 6 ? '1' : '0';
    gosterge.style.transform = 'translate(-50%,' + Math.min(y, MAKS) + 'px)' +
      (donuyor ? ' rotate(180deg)' : '');
  }

  // Sayfanın gerçekten en üstünde miyiz? (iç kaydırma kapları dahil)
  function ustteMi(hedef) {
    var el = hedef;
    while (el && el !== document.body && el.nodeType === 1) {
      var ov = '';
      try { ov = getComputedStyle(el).overflowY; } catch (e) {}
      if ((ov === 'auto' || ov === 'scroll') && el.scrollHeight > el.clientHeight) {
        return el.scrollTop <= 0;
      }
      el = el.parentElement;
    }
    return (window.scrollY || document.documentElement.scrollTop || 0) <= 0;
  }

  document.addEventListener('touchstart', function (e) {
    if (calisiyor || e.touches.length !== 1) { baslangic = null; return; }
    baslangic = ustteMi(e.target) ? e.touches[0].clientY : null;
    mesafe = 0;
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (baslangic === null || calisiyor) return;
    var d = e.touches[0].clientY - baslangic;
    if (d <= 0) { mesafe = 0; ciz(0, false); return; }
    kur();
    mesafe = d * 0.45;                     // direnç hissi
    if (e.cancelable) e.preventDefault();  // sayfa zıplamasın
    ciz(mesafe, mesafe >= ESIK);
  }, { passive: false });

  document.addEventListener('touchend', function () {
    if (baslangic === null || calisiyor) { baslangic = null; return; }
    baslangic = null;
    if (mesafe < ESIK) { ciz(0, false); return; }
    calisiyor = true;
    ciz(46, true);
    var bitir = function () {
      calisiyor = false; mesafe = 0;
      setTimeout(function () { ciz(0, false); }, 250);
    };
    if (typeof window.syncOfflineData === 'function') {
      Promise.resolve(window.syncOfflineData()).then(bitir, bitir);
    } else { bitir(); }
  }, { passive: true });
})();

// ── CANLI GÜNCELLEME (Supabase Realtime, 2026-08-06) ─────────────────────
// Amaç: başka bir cihazda yapılan değişiklik (sıralama, yeni eser, potpuri)
// kullanıcı hiçbir şey yapmadan düşsün. Aşağı çek-bırak tazeleme (yukarıda)
// kullanıcı ŞÜPHELENİRSE işe yarıyor; ama değişiklikten haberi yoksa
// şüphelenmiyor da — asıl çözüm bu.
//
// NEDEN HAM WEBSOCKET: proje supabase-js kullanmıyor, her şey düz `fetch`.
// Kütüphane eklemek her sayfaya ~40KB bindirirdi; Realtime'ın konuştuğu
// Phoenix protokolü ise birkaç JSON mesajından ibaret (join + heartbeat).
//
// SAHNE İSTİSNASI: konser sırasında listenin altından değişmesi kötü sürpriz
// olur. Bu yüzden burada veri OTOMATİK uygulanmıyor; `remote-change` olayı
// yayılıyor ve sahne ekranı "liste değişti" şeridi gösterip kararı kullanıcıya
// bırakıyor. Diğer sayfalarda değişiklik doğrudan çekiliyor.
(function () {
  var RT_URL = 'wss://ehytkzxdhjyjuubizdnl.supabase.co/realtime/v1/websocket';
  var RT_KEY = 'sb_publishable_f_WsYxzN06B5dGROrkGyPQ_UDxKSbtO';
  var TABLOLAR = ['repertoires', 'repertoire_items', 'works', 'solistler', 'group_members'];

  var ws = null, refNo = 0, kalpAtisi = null, yenidenDene = null, gecikme = 2000;
  var topic = 'realtime:repertuvar';
  var bekleyen = null;

  function jetonVar() { try { return localStorage.getItem('sb_token'); } catch (e) { return null; } }

  function gonder(event, payload, konu) {
    if (!ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify({ topic: konu || topic, event: event, payload: payload || {}, ref: String(++refNo) }));
  }

  // Değişiklikler kümelenir: tek bir sürükle-bırak onlarca satır güncelleyebilir,
  // her biri için sync başlatmak anlamsız olur.
  function degisiklikGeldi(tablo) {
    // (2026-08-06) KENDİ YAZDIĞIMIZ DEĞİŞİKLİĞİN YANKISINI YUT.
    // Realtime, bizim gönderdiğimiz PATCH/POST'ları da bize geri bildiriyor.
    // Sıralama gibi ÇOK SATIRLI işlemlerde bu, işlem daha bitmeden sync +
    // yeniden çizim tetikliyordu; ekrandaki liste yarım durumu gösteriyor ve
    // hemen ardından yapılan ikinci taşıma ESKİMİŞ listeye göre hesaplanıp
    // potpuri zincirini bozuyordu. İstemci yazma yaptığında
    // `window._rtSuppressUntil` ileri bir zamana kuruluyor (bkz. repertoires.js
    // dbPost/dbPatch/dbDel); o ana kadar gelen bildirimler yok sayılıyor.
    // Başkasının yaptığı değişiklikler bu pencerenin dışında kaldığı için
    // etkilenmiyor.
    try { if (Date.now() < (window._rtSuppressUntil || 0)) return; } catch (e) {}
    clearTimeout(bekleyen);
    bekleyen = setTimeout(function () {
      var sahnede = !!window._stageActive;
      // (2026-08-12) ROL VE ÜYELİK DEĞİŞİKLİKLERİ ÖNBELLEKTE KALIYORDU.
      // `syncOfflineData` yalnızca works/repertoires/items/solistler çekiyor;
      // kullanıcının rolü ve grup listesi localStorage'da duruyor ve hiç
      // tazelenmiyordu ⇒ biri "üye"yi "yönetici" yaptığında karşı taraf yeni
      // yetkisini ancak yeniden giriş yapınca görüyordu (Emir bildirdi).
      if (tablo === 'group_members' || tablo === 'profiles') {
        try { if (typeof window.loadUserRole === 'function') window.loadUserRole(); } catch (e) {}
        try { if (typeof window.loadMyGroups === 'function') window.loadMyGroups(); } catch (e) {}
      }
      try { window.dispatchEvent(new CustomEvent('remote-change', { detail: { table: tablo, applied: !sahnede } })); } catch (e) {}
      if (!sahnede && typeof window.syncOfflineData === 'function') window.syncOfflineData();
    }, 900);
  }

  // (2026-08-15) CANLI GÜNCELLEME DURUM GÖSTERGESİ.
  // Küçük, köşede duran bir şerit; yalnızca kopukluk 15 saniyeyi geçerse çıkar.
  // Amaç kullanıcıyı korkutmak değil, "ekrandaki veri şu an tazelenmeyebilir"
  // bilgisini vermek — eskiden bu bilgi yalnızca konsoldaydı.
  var kopukMu = false;      // şu an kopuk mu
  var kopuktu = false;      // en az bir kez koptu mu (bağlanınca sync tetikler)
  var durumZaman = null;
  function durumGoster(gorunsun) {
    try {
      var el = document.getElementById('rt-durum');
      if (!gorunsun) { if (el) el.remove(); return; }
      if (el) return;
      el = document.createElement('div');
      el.id = 'rt-durum';
      // (2026-08-23) KONUM DUZELTMESI — Emir bildirdi: native app'te serit alt
      // menunun TAM UZERINE biniyor ve z-index:9998 oldugu icin dokunuslari da
      // yutuyordu; "Ana Sayfa"ya basilamiyordu. Alt menu yuksekligi
      // calc(68px + safe-area-inset-bottom); serit artik onun ustune cikiyor.
      // Masaustunde (>=1024px) alt menu gizli oldugu icin eski 16px'e donuyor.
      var _altMenuVar = window.matchMedia && window.matchMedia('(max-width: 1023px)').matches;
      var _alt = _altMenuVar
        ? 'calc(84px + env(safe-area-inset-bottom, 0px))'   // 68px menu + 16px bosluk
        : '16px';
      el.style.cssText = 'position:fixed;left:16px;bottom:' + _alt + ';z-index:9998;' +
        'max-width:calc(100vw - 32px);box-sizing:border-box;' +
        'background:rgba(249,160,74,.14);border:1px solid rgba(249,160,74,.45);' +
        'color:#F9A04A;padding:7px 13px;border-radius:20px;font-size:12px;' +
        'font-weight:600;font-family:inherit;display:flex;align-items:center;gap:8px;' +
        'box-shadow:0 6px 18px rgba(0,0,0,.35);cursor:pointer;';
      var _ct = function (k, v) { try { return (window.i18n && window.i18n.t) ? window.i18n.t(k, v) : v; } catch (e) { return v; } };
      el.textContent = _ct('ortak.canliKesildi', '⚠️ Canlı güncelleme kesildi — yeniden bağlanılıyor');
      el.title = _ct('ortak.canliKesildiT', 'Dokunursanız hemen yeniden denenir');
      el.onclick = function () { gecikme = 2000; baglan(); };
      document.body.appendChild(el);
    } catch (e) {}
  }

  function baglan() {
    var jeton = jetonVar();
    // (2026-08-12) 🐛 `navigator.onLine` KONTROLÜ KALDIRILDI.
    // Emir'in masaüstünde `navigator.onLine === false` dönüyordu (Brave/ağ
    // yapılandırması yanlış rapor ediyor) — oysa ham WebSocket denemesi
    // sorunsuz açıldı ve abonelik `status:"ok"` + "Subscribed to PostgreSQL"
    // döndü. Bu kontrol yüzünden `baglan()` ilk satırda geri dönüyor, kanal
    // HİÇ KURULMUYORDU (konsolda tek bir [rt] satırı bile yoktu).
    // Gerçekten çevrimdışıysak soket zaten açılmaz; `onclose` üstel geri
    // çekilmeyle yeniden dener. Yanlış "offline" raporu artık engel değil.
    if (!jeton) return;
    if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
    try {
      ws = new WebSocket(RT_URL + '?apikey=' + RT_KEY + '&vsn=1.0.0');
    } catch (e) { return; }

    ws.onopen = function () {
      gecikme = 2000;
      gonder('phx_join', {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
          postgres_changes: TABLOLAR.map(function (t) {
            return { event: '*', schema: 'public', table: t };
          })
        },
        access_token: jetonVar()
      });
      clearInterval(kalpAtisi);
      kalpAtisi = setInterval(function () { gonder('heartbeat', {}, 'phoenix'); }, 25000);
      console.log('[rt] canlı güncelleme bağlandı');
      // (2026-08-15) Kanal geri geldiğinde göstergeyi kaldır ve KAÇIRILAN
      // değişiklikleri bir kez çek. Kanal kapalıyken yapılan değişiklikler
      // hiçbir zaman bildirim olarak gelmez; yalnız yeniden bağlanmak yetmez.
      kopukMu = false;
      durumGoster(false);
      if (kopuktu) {
        kopuktu = false;
        if (typeof window.syncOfflineData === 'function') window.syncOfflineData();
      }
    };

    ws.onmessage = function (ev) {
      var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      // (2026-08-12) TEŞHİS: `phx_reply` HİÇ OKUNMUYORDU. Abonelik sunucuda
      // reddedilirse (RLS, yayın listesi, hatalı yapılandırma) soket "bağlı"
      // görünür ama TEK BİR OLAY BİLE GELMEZ — Emir'in yaşadığı tam bu.
      // Katılma yanıtını ve gelen her olayı konsola yazıyoruz; sorun
      // kapanınca bu blok kaldırılacak.
      if (m.event === 'phx_reply') {
        console.log('[rt] katilma yaniti:', m.payload && m.payload.status,
                    JSON.stringify(m.payload && m.payload.response).slice(0, 400));
      } else if (m.event && m.event !== 'heartbeat') {
        console.log('[rt] olay:', m.event, (m.payload && m.payload.data)
                    ? (m.payload.data.table + '/' + m.payload.data.type) : '');
      }
      if (m.event === 'postgres_changes' && m.payload && m.payload.data) {
        degisiklikGeldi(m.payload.data.table);
      } else if (m.event === 'phx_error' || m.event === 'phx_close') {
        // (2026-08-12) Kanal hatası artık SESSİZ KALMIYOR: soketi kapatıp
        // yeniden kuruyoruz. Eskiden yalnızca konsola yazılıyordu ve kanal
        // ölü kalıyordu — sayfa yenilenene kadar hiçbir değişiklik düşmüyordu.
        console.warn('[rt] kanal kapandı, yeniden bağlanılıyor:', m.event);
        try { ws.close(); } catch (e) {}
      }
    };

    ws.onclose = function () {
      clearInterval(kalpAtisi);
      // (2026-08-15) Kopukluk artık SESSİZ DEĞİL. Emir bildirdi: Safari sekmeyi
      // askıya alınca soket "closed due to suspension" ile düşüyor, kullanıcı
      // bunu hiç fark etmiyor ve ekranda eski veriyle çalışmaya devam ediyor.
      kopukMu = true;
      kopuktu = true;
      // Gösterge hemen çıkmasın — kısa kesintiler (sekme değişimi, ağ zıplaması)
      // zaten saniyeler içinde toparlanıyor, uyarı gereksiz gürültü olurdu.
      clearTimeout(durumZaman);
      durumZaman = setTimeout(function () { if (kopukMu) durumGoster(true); }, 15000);
      // Üstel geri çekilme: sunucu ya da ağ sorunlarında saniyede bir denemeyelim.
      clearTimeout(yenidenDene);
      yenidenDene = setTimeout(baglan, gecikme);
      gecikme = Math.min(gecikme * 2, 60000);
    };

    ws.onerror = function () { try { ws.close(); } catch (e) {} };
  }

  window.realtimeBaglan = baglan;

  // (2026-08-12) 🐛 JETON TAZELEME ARTIK GERÇEKTEN ÇALIŞIYOR.
  // Bu fonksiyon tanımlıydı ama HİÇBİR YERDEN ÇAĞRILMIYORDU. Erişim jetonu
  // 1 saatlik; Realtime kanalı RLS'i o jetona göre uyguladığı için süre
  // dolunca sunucu o kanala DEĞİŞİKLİK GÖNDERMEYİ KESİYOR — soket "bağlı"
  // görünüyor, kanal sessizleşiyor. Uzun süre açık kalan sekmede
  // (Emir'in masaüstü) tablette yapılan değişiklik hiç düşmüyordu.
  window.realtimeJetonTazele = async function () {
    try {
      if (typeof window.ensureValidToken === 'function') await window.ensureValidToken();
    } catch (e) {}
    gonder('access_token', { access_token: jetonVar() });
  };

  // Jetonun ömrü dolmadan düzenli olarak tazele (20 dk < 1 saat).
  setInterval(function () {
    if (ws && ws.readyState === 1) window.realtimeJetonTazele();
  }, 20 * 60 * 1000);

  window.addEventListener('online', function () { gecikme = 2000; baglan(); });

  // (2026-08-15) SAFARI ASKIYA ALMA BOŞLUKLARI KAPATILDI. Üç eksik vardı:
  // (1) Sayfa geri/ileri ile bfcache'ten dönerse `visibilitychange` HİÇ
  //     tetiklenmiyor — `pageshow` (persisted) tek haber veren olay.
  // (2) Sekmeye dönüldüğünde `gecikme` 60 saniyeye kadar büyümüş olabiliyordu;
  //     sıfırlanmadığı için kullanıcı bir dakikaya kadar kopuk kalıyordu.
  //     Kullanıcı ekrana geri döndüyse HEMEN denemek doğru.
  // (3) Masaüstünde pencere arkaya alınıp öne getirildiğinde (sekme değişmeden)
  //     hiçbir olay yoktu — `focus` bunu kapatıyor.
  function uyandir() {
    gecikme = 2000;                       // geri çekilmeyi sıfırla: kullanıcı burada
    if (!ws || ws.readyState > 1) { baglan(); return; }
    window.realtimeJetonTazele();
    if (typeof window.syncOfflineData === 'function') window.syncOfflineData();
  }
  window.addEventListener('pageshow', function (e) { if (e && e.persisted) uyandir(); });
  window.addEventListener('focus', uyandir);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    gecikme = 2000;                       // bkz. uyandir() notu
    if (!ws || ws.readyState > 1) { baglan(); return; }
    // Sekmeye dönüldü ve soket ayakta: jeton bu arada dolmuş olabilir.
    // Ayrıca kaçırılmış değişiklik varsa diye bir kez eşitle.
    window.realtimeJetonTazele();
    if (typeof window.syncOfflineData === 'function') window.syncOfflineData();
  });
  // Oturum açıksa hemen başlat; değilse giriş sonrası ilk sync bunu tetikler.
  setTimeout(baglan, 1500);

  // Bekçi: soket herhangi bir sebeple kapalı kaldıysa dakikada bir dene.
  // `onclose` zaten yeniden bağlanıyor ama hiç açılamamış (ya da sessizce
  // düşmüş) durumlar için ikinci bir güvence.
  setInterval(function () {
    if (!ws || ws.readyState > 1) baglan();
  }, 60000);
})();

// Sayfa yüklenince service worker kaydet ve sync yap
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' }).then((reg) => {
    console.log('[SW] Kayıtlı');
    // Sayfa her açıldığında yeni bir sürüm var mı diye zorla kontrol et
    reg.update();
  }).catch((e) => console.warn('[SW] Kayıt hatası:', e));
}

// Online gelince sync yap
window.addEventListener('online', () => {
  console.log('[db] Online — sync (kısa gecikmeyle) başlıyor...');
  // Gecikme: ağ değişince sayfa büyük olasılıkla o an local'i okuyup çiziyor.
  // Sync'i hemen başlatırsak works store'una yazma, okumayı bloke ediyor.
  // 800ms bekleyip yazmaya başlayınca okuma çoktan bitmiş oluyor.
  setTimeout(() => syncOfflineData(), 800);
});
