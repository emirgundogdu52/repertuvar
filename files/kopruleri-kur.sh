set -e
cd "$HOME/Desktop/Yeni Repertuvar/Repertuvar App Claude/repertuvar-site"

cat > service-worker.js <<'SWEOF'
/*
  KENDINI IMHA EDEN SERVICE WORKER — 2026-07-21
  Bu origin eskiden UYGULAMAYI sunuyordu; ziyaretcilerin tarayicisinda repertuvar-vN
  onbellegiyle bir service worker kaldi. Bu dosya onun yerine gecer, tum onbellekleri
  siler, kaydini iptal eder ve acik sekmeleri bir kez yeniler. Kendisi onbellek tutmaz.
*/
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(event){
  event.waitUntil((async function(){
    var names = await caches.keys();
    await Promise.all(names.map(function(n){ return caches.delete(n); }));
    await self.registration.unregister();
    var list = await self.clients.matchAll({ type: 'window' });
    list.forEach(function(c){ c.navigate(c.url); });
  })());
});
SWEOF

cat > _kopru.tpl <<'TPLEOF'
<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Yonlendiriliyor...</title>
<link rel="canonical" href="https://app.repertuvar.app/__PAGE__">
<script>
  window.location.replace('https://app.repertuvar.app/__PAGE__' + window.location.search + window.location.hash);
</script>
<meta http-equiv="refresh" content="0; url=https://app.repertuvar.app/__PAGE__">
<style>
  body{background:#070a0f;color:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,sans-serif;
       display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px;}
  a{color:#FFC83D;}
</style>
</head>
<body>
  <div>
    <p>Uygulama yeni adresine tasindi.</p>
    <p><a href="https://app.repertuvar.app/__PAGE__">app.repertuvar.app adresine git</a></p>
  </div>
</body>
</html>
TPLEOF

for p in stage eserler repertoires gruplar mesajlar login ayarlar artiesten uyeler istatistikler onerilerim reset-password; do
  sed "s|__PAGE__|$p.html|g" _kopru.tpl > "$p.html"
done
rm _kopru.tpl

cat > 404.html <<'F4EOF'
<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Sayfa bulunamadi — Repertuvar</title>
<script>
  var p = window.location.pathname.replace(/^\//, '');
  if (/\.html$/.test(p)) {
    window.location.replace('https://app.repertuvar.app/' + p + window.location.search + window.location.hash);
  }
</script>
<style>
  body{background:#070a0f;color:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,sans-serif;
       display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px;}
  h1{font-size:52px;margin:0 0 8px;}
  a{color:#FFC83D;}
</style>
</head>
<body>
  <div>
    <h1>404</h1>
    <p>Aradigin sayfa burada degil.</p>
    <p><a href="/">Ana sayfaya don</a> &middot; <a href="https://app.repertuvar.app/">Uygulamayi ac</a></p>
  </div>
</body>
</html>
F4EOF

echo "--- olusan dosyalar ---"
ls -1
