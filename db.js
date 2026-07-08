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

function makeStore(storeName) {
  return {
    getAll: () => HAS_IDB
      ? storeOp(storeName, 'readonly', (s) => s.getAll()).catch((e) => { console.warn('[db] getAll hatası:', e); return []; })
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
          items.forEach((item) => store.put(item));
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        })).catch((e) => { console.warn('[db] saveAll hatası:', e); })
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
  if (!navigator.onLine) return;
  const token = localStorage.getItem('sb_token');
  if (!token) return;

  try {
    const SUPA_URL = 'https://ehytkzxdhjyjuubizdnl.supabase.co';
    const SUPA_KEY = 'sb_publishable_f_WsYxzN06B5dGROrkGyPQ_UDxKSbtO';
    const headers = { apikey: SUPA_KEY, Authorization: 'Bearer ' + token };

    // group_id veya owner_id'ye göre repertuvar filtresi
    const gid = localStorage.getItem('user_group_id');
    const uid = localStorage.getItem('sb_user') ? JSON.parse(localStorage.getItem('sb_user')).id : null;
    const repFilter = gid
      ? '/rest/v1/repertoires?select=*&order=created_at.desc&group_id=eq.' + gid
      : (uid ? '/rest/v1/repertoires?select=*&order=created_at.desc&or=(owner_id.eq.' + uid + ',is_public.eq.true)' : '/rest/v1/repertoires?select=*&order=created_at.desc&is_public=eq.true');
    const solFilter = gid ? '/rest/v1/solistler?select=*&order=name.asc&group_id=eq.' + gid : '/rest/v1/solistler?select=*&order=name.asc';

    // Eserleri çek ve kaydet
    const [worksRes, repsRes, solRes, itemsRes] = await Promise.all([
      fetch(SUPA_URL + '/rest/v1/works?select=*&order=name.asc&limit=1000', { headers }),
      fetch(SUPA_URL + repFilter, { headers }),
      fetch(SUPA_URL + solFilter, { headers }),
      fetch(SUPA_URL + '/rest/v1/repertoire_items?select=*&order=seq.asc', { headers }),
    ]);

    if (worksRes.ok) await db.works.saveAll(await worksRes.json());
    if (repsRes.ok) await db.repertoires.saveAll(await repsRes.json());
    if (solRes.ok) await db.solistler.saveAll(await solRes.json());
    if (itemsRes.ok) await db.repertoire_items.saveAll(await itemsRes.json());

    await db.meta.set('lastSync', new Date().toISOString());
    console.log('[db] Offline sync tamamlandı:', new Date().toLocaleTimeString('tr-TR'));
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
  console.log('[db] Online — sync başlıyor...');
  syncOfflineData();
});
