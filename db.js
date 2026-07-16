// db.js — IndexedDB helper (offline veri saklama)
// Kullanım: await db.works.getAll(), await db.works.save(data)

const DB_NAME = 'RepertuvarDB';
const DB_VERSION = 1;

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
  meta,
};

// Online/offline durumu
window.isOnline = () => navigator.onLine;

// Sync — sunucudan veri çekip IndexedDB'ye kaydet
window.syncOfflineData = async function() {
  // Token dolmuş olabilir (1 saatlik ömür) — sync fetch'lerinden ÖNCE yenile.
  let token = localStorage.getItem('sb_token');
  if (!token) return;
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

    // Eserleri çek ve kaydet
    const [worksRes, repsRes, solRes, itemsRes] = await Promise.all([
      fetch(SUPA_URL + '/rest/v1/works?select=*&order=name.asc&limit=10000', { headers }),
      fetch(SUPA_URL + repFilter, { headers }),
      fetch(SUPA_URL + solFilter, { headers }),
      fetch(SUPA_URL + '/rest/v1/repertoire_items?select=*&order=seq.asc', { headers }),
    ]);

    if (worksRes.ok) await db.works.replaceAll(await worksRes.json());
    if (repsRes.ok) await db.repertoires.replaceAll(await repsRes.json());
    if (solRes.ok) await db.solistler.replaceAll(await solRes.json());
    if (itemsRes.ok) await db.repertoire_items.replaceAll(await itemsRes.json());

    await db.meta.set('lastSync', new Date().toISOString());
    console.log('[db] Offline sync tamamlandı:', new Date().toLocaleTimeString('tr-TR'));
    // Sync bitti — dinleyen sayfalar (repertuvarlar, sahne) kendini tazelesin.
    try { window.dispatchEvent(new CustomEvent('data-synced')); } catch (e) {}
  } catch (e) {
    console.warn('[db] Sync hatası:', e);
  }
};

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
