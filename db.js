// db.js — IndexedDB helper (offline veri saklama)
// Kullanım: await db.works.getAll(), await db.works.save(data)

const DB_NAME = 'RepertuvarDB';
const DB_VERSION = 1;

let _db = null;

function openDB() {
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
    getAll: () => storeOp(storeName, 'readonly', (s) => s.getAll()),
    get: (id) => storeOp(storeName, 'readonly', (s) => s.get(id)),
    save: (item) => storeOp(storeName, 'readwrite', (s) => s.put(item)),
    saveAll: (items) => openDB().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      items.forEach((item) => store.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    })),
    delete: (id) => storeOp(storeName, 'readwrite', (s) => s.delete(id)),
    clear: () => storeOp(storeName, 'readwrite', (s) => s.clear()),
  };
}

// Meta store — son sync zamanı vb.
const meta = {
  get: (key) => storeOp('meta', 'readonly', (s) => s.get(key)).then((r) => r?.value),
  set: (key, value) => storeOp('meta', 'readwrite', (s) => s.put({ key, value })),
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

    // Eserleri çek ve kaydet
    const [worksRes, repsRes, solRes] = await Promise.all([
      fetch(SUPA_URL + '/rest/v1/works?select=*&order=name.asc&limit=1000', { headers }),
      fetch(SUPA_URL + '/rest/v1/repertoires?select=*&order=created_at.desc', { headers }),
      fetch(SUPA_URL + '/rest/v1/solistler?select=*&order=name.asc', { headers }),
    ]);

    if (worksRes.ok) await db.works.saveAll(await worksRes.json());
    if (repsRes.ok) await db.repertoires.saveAll(await repsRes.json());
    if (solRes.ok) await db.solistler.saveAll(await solRes.json());

    await db.meta.set('lastSync', new Date().toISOString());
    console.log('[db] Offline sync tamamlandı:', new Date().toLocaleTimeString('tr-TR'));
  } catch (e) {
    console.warn('[db] Sync hatası:', e);
  }
};

// Sayfa yüklenince service worker kaydet ve sync yap
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').then(() => {
    console.log('[SW] Kayıtlı');
  }).catch((e) => console.warn('[SW] Kayıt hatası:', e));
}

// Online gelince sync yap
window.addEventListener('online', () => {
  console.log('[db] Online — sync başlıyor...');
  syncOfflineData();
});
