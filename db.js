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
      fetch(SUPA_URL + '/rest/v1/works?select=*&order=name.asc&limit=10000', { headers }),
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

    await db.meta.set('lastSync', new Date().toISOString());
    console.log('[db] Offline sync tamamlandı:', new Date().toLocaleTimeString('tr-TR'));
    // Sync bitti — dinleyen sayfalar (repertuvarlar, sahne) kendini tazelesin.
    try { window.dispatchEvent(new CustomEvent('data-synced')); } catch (e) {}
    if (typeof window.realtimeBaglan === 'function') window.realtimeBaglan();
  } catch (e) {
    console.warn('[db] Sync hatası:', e);
  }
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
      el.textContent = '⚠️ Canlı güncelleme kesildi — yeniden bağlanılıyor';
      el.title = 'Dokunursanız hemen yeniden denenir';
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
