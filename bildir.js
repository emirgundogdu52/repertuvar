// bildir.js — İÇERİK BİLDİRME VE KULLANICI ENGELLEME (2026-10-09)
//
// NEDEN: Apple App Review, Guideline 1.2 (kullanıcı içeriği). Başkalarının gördüğü kullanıcı içeriği olan
// uygulamada kullanıcı (1) uygunsuz içeriği bildirebilmeli, (2) rahatsız eden kullanıcıyı engelleyebilmeli.
// Sunucu tarafı: sql/bildirme_engelleme.sql (content_reports, user_blocks + adminlere zil bildirimi).
//
// KULLANIM (auth.js'ten SONRA yüklenir; SUPA_URL / authHeaders / getUserId oradan gelir):
//   RB.bildir({ tur:'work'|'user', id, kullanici, etiket })  → sebep seçtiren pencere
//   RB.engelle(kullaniciId, ad)                              → onay penceresi
//   RB.engelKaldir(kullaniciId)
//   RB.islemler({ kullanici, ad })                           → "Bildir / Engelle" seçim penceresi
//   RB.engelliMi(kullaniciId), RB.gizliEserMi(eserId)         → sayfalar listeyi süzerken kullanır
//   RB.engelliler()                                          → [{id, ad}] (Ayarlar listesi)
// Değişiklikten sonra window'a 'rb-degisti' olayı gönderilir; sayfa listesini yeniden çizer.
//
// LOCAL-FIRST: engel listesi ve bildirdiğim eserler localStorage'da da tutulur (kullanıcıya özel anahtar).
// Ağ yoksa son bilinen liste kullanılır; hiçbir hata girişi/oturumu etkilemez.
(function () {
  'use strict';

  // ── Çeviriler (i18n.js varsa sözlüğüne eklenir; yoksa Türkçe varsayılan) ──
  var TR = {
    'rb.bildir': 'Bildir',
    'rb.engelle': 'Engelle',
    'rb.engelKaldir': 'Engeli kaldır',
    'rb.eseriBildir': 'Eseri bildir',
    'rb.kullaniciyiBildir': 'Kullanıcıyı bildir',
    'rb.kullaniciyiEngelle': 'Kullanıcıyı engelle',
    'rb.ekleyeniEngelle': 'Ekleyeni engelle',
    'rb.sebepSec': 'Neden bildiriyorsun?',
    'rb.s_offensive': 'Uygunsuz veya müstehcen içerik',
    'rb.s_harassment': 'Taciz, hakaret veya nefret söylemi',
    'rb.s_copyright': 'Telif hakkı ihlali',
    'rb.s_spam': 'Spam veya yanıltıcı içerik',
    'rb.s_other': 'Diğer',
    'rb.notPh': 'Ek açıklama (isteğe bağlı)',
    'rb.bilgiEser': 'Bildirimin ekibimize iletilir ve 24 saat içinde incelenir. Bu eser artık sana gösterilmez.',
    'rb.bilgiKullanici': 'Bildirimin ekibimize iletilir ve 24 saat içinde incelenir.',
    'rb.ayrcaEngelle': 'Bu kullanıcıyı da engelle',
    'rb.gonder': 'Gönder',
    'rb.vazgec': 'Vazgeç',
    'rb.sebepGerekli': 'Lütfen bir sebep seç.',
    'rb.alindi': 'Bildirimin alındı. Teşekkürler.',
    'rb.zatenBildirildi': 'Bunu zaten bildirdin; ekibimiz inceliyor.',
    'rb.gonderilemedi': 'Gönderilemedi. İnternet bağlantını kontrol edip tekrar dene.',
    'rb.engelBaslik': '{ad} engellensin mi?',
    'rb.engelMetin': 'Bu kişinin eklediği eserler ve paylaştığı repertuvarlar sana gösterilmez. Engeli istediğin zaman Ayarlar > Engellenen kullanıcılar bölümünden kaldırabilirsin.',
    'rb.engellendi': '{ad} engellendi.',
    'rb.engelKalkti': 'Engel kaldırıldı.',
    'rb.engelHata': 'İşlem yapılamadı. İnternet bağlantını kontrol edip tekrar dene.',
    'rb.buKullanici': 'Bu kullanıcı',
    'rb.engelliEtiket': 'Engellendi',
    'rb.kendin': 'Kendini bildiremez veya engelleyemezsin.',
    'rb.engellenenler': 'Engellenen kullanıcılar',
    'rb.engellenenlerAlt': 'Engellediğin kişilerin eserleri ve paylaştığı repertuvarlar sana gösterilmez',
    'rb.engelYok': 'Kimseyi engellemedin.'
  };
  var EN = {
    'rb.bildir': 'Report',
    'rb.engelle': 'Block',
    'rb.engelKaldir': 'Unblock',
    'rb.eseriBildir': 'Report piece',
    'rb.kullaniciyiBildir': 'Report user',
    'rb.kullaniciyiEngelle': 'Block user',
    'rb.ekleyeniEngelle': 'Block the person who added it',
    'rb.sebepSec': 'Why are you reporting this?',
    'rb.s_offensive': 'Offensive or explicit content',
    'rb.s_harassment': 'Harassment, insults or hate speech',
    'rb.s_copyright': 'Copyright infringement',
    'rb.s_spam': 'Spam or misleading content',
    'rb.s_other': 'Other',
    'rb.notPh': 'Additional details (optional)',
    'rb.bilgiEser': 'Your report goes to our team and is reviewed within 24 hours. This piece will no longer be shown to you.',
    'rb.bilgiKullanici': 'Your report goes to our team and is reviewed within 24 hours.',
    'rb.ayrcaEngelle': 'Also block this user',
    'rb.gonder': 'Send',
    'rb.vazgec': 'Cancel',
    'rb.sebepGerekli': 'Please choose a reason.',
    'rb.alindi': 'Thanks, we received your report.',
    'rb.zatenBildirildi': 'You already reported this; our team is reviewing it.',
    'rb.gonderilemedi': 'Could not send. Check your internet connection and try again.',
    'rb.engelBaslik': 'Block {ad}?',
    'rb.engelMetin': 'Pieces added and setlists shared by this person will no longer be shown to you. You can unblock them any time in Settings > Blocked users.',
    'rb.engellendi': '{ad} has been blocked.',
    'rb.engelKalkti': 'User unblocked.',
    'rb.engelHata': 'Something went wrong. Check your internet connection and try again.',
    'rb.buKullanici': 'This user',
    'rb.engelliEtiket': 'Blocked',
    'rb.kendin': 'You cannot report or block yourself.',
    'rb.engellenenler': 'Blocked users',
    'rb.engellenenlerAlt': 'Pieces and setlists from people you block are hidden from you',
    'rb.engelYok': 'You have not blocked anyone.'
  };
  try {
    if (window.i18n && window.i18n.sozluk) {
      var s = window.i18n.sozluk;
      if (s.tr) Object.keys(TR).forEach(function (k) { if (!(k in s.tr)) s.tr[k] = TR[k]; });
      if (s.en) Object.keys(EN).forEach(function (k) { if (!(k in s.en)) s.en[k] = EN[k]; });
    }
  } catch (e) {}
  function _t(k) {
    try { if (window.i18n && window.i18n.t) return window.i18n.t(k, TR[k]); } catch (e) {}
    return TR[k] || k;
  }
  function _esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function _uid() { try { return (typeof getUserId === 'function') ? getUserId() : null; } catch (e) { return null; } }
  function _hdr(extra) {
    var h = (typeof authHeaders === 'function') ? authHeaders() : { 'Content-Type': 'application/json' };
    if (extra) Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
    return h;
  }

  // ── Yerel önbellek (kullanıcıya özel) ──
  var ENGEL = {};   // { kullaniciId: ad }
  var GIZLI = {};   // { eserId: 1 }  (benim bildirdiğim eserler)
  function _anahtar(ad) { return 'rb_' + ad + '_' + (_uid() || 'anon'); }
  function _oku() {
    try { ENGEL = JSON.parse(localStorage.getItem(_anahtar('engel')) || '{}') || {}; } catch (e) { ENGEL = {}; }
    try { GIZLI = JSON.parse(localStorage.getItem(_anahtar('gizli')) || '{}') || {}; } catch (e) { GIZLI = {}; }
  }
  function _yaz() {
    try { localStorage.setItem(_anahtar('engel'), JSON.stringify(ENGEL)); } catch (e) {}
    try { localStorage.setItem(_anahtar('gizli'), JSON.stringify(GIZLI)); } catch (e) {}
  }
  function _duyur() { try { window.dispatchEvent(new CustomEvent('rb-degisti')); } catch (e) {} }
  _oku();

  // Sunucudan tazele (oturum yoksa ya da ağ yoksa sessizce geç)
  async function tazele() {
    if (!_uid() || typeof SUPA_URL === 'undefined') return;
    try {
      var r1 = await fetch(SUPA_URL + '/rest/v1/user_blocks?select=blocked_id&blocker_id=eq.' + _uid(), { headers: _hdr() });
      var r2 = await fetch(SUPA_URL + '/rest/v1/content_reports?select=target_id&target_type=eq.work&reporter_id=eq.' + _uid(), { headers: _hdr() });
      if (!r1.ok || !r2.ok) return;
      var engel = await r1.json(), rap = await r2.json();
      var yeniE = {}, yeniG = {};
      (engel || []).forEach(function (x) { yeniE[x.blocked_id] = ENGEL[x.blocked_id] || ''; });
      (rap || []).forEach(function (x) { yeniG[String(x.target_id)] = 1; });
      var degisti = JSON.stringify(yeniE) !== JSON.stringify(ENGEL) || JSON.stringify(yeniG) !== JSON.stringify(GIZLI);
      ENGEL = yeniE; GIZLI = yeniG; _yaz();
      if (degisti) _duyur();
    } catch (e) {}
  }

  // ── Görünüm (kendi stilleri; style.css değişkenlerini kullanır) ──
  var STIL = '' +
    '.rb-ort{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:100000;display:flex;align-items:flex-end;justify-content:center;padding:0;}' +
    '@media(min-width:600px){.rb-ort{align-items:center;padding:16px;}}' +
    '.rb-kutu{background:var(--surface,#1c2433);color:var(--text,#fff);border:1px solid var(--border,#333);width:100%;max-width:440px;' +
    'border-radius:18px 18px 0 0;padding:20px 18px calc(18px + env(safe-area-inset-bottom));max-height:90vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.4);}' +
    '@media(min-width:600px){.rb-kutu{border-radius:16px;padding:22px;}}' +
    '.rb-bas{font-size:17px;font-weight:700;margin:0 0 4px;}' +
    '.rb-alt{font-size:13px;color:var(--text3,#9aa4b2);margin:0 0 14px;word-break:break-word;}' +
    '.rb-sec{display:flex;align-items:center;gap:10px;padding:11px 12px;border:1px solid var(--border,#333);border-radius:10px;margin-bottom:8px;cursor:pointer;font-size:14px;}' +
    '.rb-sec input{accent-color:var(--accent,#f5c518);width:18px;height:18px;margin:0;flex:none;}' +
    '.rb-sec:has(input:checked){border-color:var(--accent,#f5c518);}' +
    '.rb-not{width:100%;box-sizing:border-box;min-height:70px;margin:6px 0 10px;padding:10px 12px;border-radius:10px;border:1px solid var(--border,#333);' +
    'background:var(--bg2,transparent);color:var(--text,#fff);font:inherit;font-size:14px;resize:vertical;}' +
    '.rb-bilgi{font-size:12px;color:var(--text3,#9aa4b2);line-height:1.45;margin:4px 0 12px;}' +
    '.rb-hata{font-size:13px;color:var(--red,#ef4444);min-height:18px;margin:0 0 8px;}' +
    '.rb-tus{display:flex;gap:10px;justify-content:flex-end;margin-top:6px;}' +
    '.rb-btn{border:1px solid var(--border,#333);background:transparent;color:var(--text,#fff);border-radius:10px;padding:10px 16px;font-size:14px;font-weight:600;cursor:pointer;}' +
    '.rb-btn.ana{background:var(--accent,#f5c518);border-color:transparent;color:#111;}' +
    '.rb-btn.kirmizi{background:var(--red,#ef4444);border-color:transparent;color:#fff;}' +
    '.rb-btn:disabled{opacity:.6;cursor:default;}' +
    '.rb-liste-btn{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:13px 12px;border:0;border-bottom:1px solid var(--border,#333);' +
    'background:transparent;color:var(--text,#fff);font-size:15px;cursor:pointer;}' +
    '.rb-liste-btn:last-of-type{border-bottom:0;}' +
    '.rb-liste-btn.kirmizi{color:var(--red,#ef4444);}' +
    '.rb-kucuk{display:flex;align-items:center;gap:8px;font-size:13px;margin:0 0 10px;cursor:pointer;}' +
    '.rb-kucuk input{accent-color:var(--accent,#f5c518);width:16px;height:16px;margin:0;}' +
    '.rb-toast{position:fixed;left:50%;bottom:calc(90px + env(safe-area-inset-bottom));transform:translateX(-50%);background:#111;color:#fff;' +
    'padding:10px 16px;border-radius:10px;font-size:14px;z-index:100001;max-width:90vw;box-shadow:0 6px 20px rgba(0,0,0,.35);}';
  function _stil() {
    if (document.getElementById('rbStil')) return;
    var st = document.createElement('style'); st.id = 'rbStil'; st.textContent = STIL;
    document.head.appendChild(st);
  }
  function _toast(m) {
    var e = document.createElement('div'); e.className = 'rb-toast'; e.textContent = m;
    document.body.appendChild(e); setTimeout(function () { e.remove(); }, 2800);
  }
  function _pencere(ic) {
    _stil();
    var ort = document.createElement('div'); ort.className = 'rb-ort';
    ort.innerHTML = '<div class="rb-kutu" role="dialog" aria-modal="true">' + ic + '</div>';
    ort.addEventListener('click', function (e) { if (e.target === ort) ort.remove(); });
    document.body.appendChild(ort);
    return ort;
  }

  // ── Bildir ──
  function bildir(o) {
    o = o || {};
    var ben = _uid();
    if (!ben) return;
    if (o.kullanici && o.kullanici === ben) { _toast(_t('rb.kendin')); return; }
    var eser = o.tur === 'work';
    var sebepler = ['offensive', 'harassment', 'copyright', 'spam', 'other'];
    var engelSecenek = (o.kullanici && o.kullanici !== ben && !ENGEL.hasOwnProperty(o.kullanici))
      ? '<label class="rb-kucuk"><input type="checkbox" id="rbEngelDe"> ' + _esc(_t('rb.ayrcaEngelle')) + '</label>' : '';
    var ort = _pencere(
      '<div class="rb-bas">' + _esc(eser ? _t('rb.eseriBildir') : _t('rb.kullaniciyiBildir')) + '</div>' +
      '<div class="rb-alt">' + _esc(o.etiket || '') + '</div>' +
      '<div style="font-size:13px;font-weight:600;margin:0 0 8px;">' + _esc(_t('rb.sebepSec')) + '</div>' +
      sebepler.map(function (s) {
        return '<label class="rb-sec"><input type="radio" name="rbSebep" value="' + s + '"> ' + _esc(_t('rb.s_' + s)) + '</label>';
      }).join('') +
      '<textarea class="rb-not" id="rbNot" maxlength="1000" placeholder="' + _esc(_t('rb.notPh')) + '"></textarea>' +
      engelSecenek +
      '<div class="rb-bilgi">' + _esc(eser ? _t('rb.bilgiEser') : _t('rb.bilgiKullanici')) + '</div>' +
      '<div class="rb-hata" id="rbHata"></div>' +
      '<div class="rb-tus"><button class="rb-btn" id="rbVazgec">' + _esc(_t('rb.vazgec')) + '</button>' +
      '<button class="rb-btn ana" id="rbGonder">' + _esc(_t('rb.gonder')) + '</button></div>'
    );
    ort.querySelector('#rbVazgec').onclick = function () { ort.remove(); };
    ort.querySelector('#rbGonder').onclick = async function () {
      var secili = ort.querySelector('input[name="rbSebep"]:checked');
      var hata = ort.querySelector('#rbHata');
      if (!secili) { hata.textContent = _t('rb.sebepGerekli'); return; }
      var btn = this; btn.disabled = true;
      var not = (ort.querySelector('#rbNot').value || '').trim().slice(0, 1000);
      var govde = {
        target_type: eser ? 'work' : 'user',
        target_id: String(o.id != null ? o.id : (o.kullanici || '')).slice(0, 64),
        target_user_id: o.kullanici || null,
        target_label: (o.etiket || '').slice(0, 200) || null,
        reason: secili.value,
        note: not || null
      };
      var engelDe = !!(ort.querySelector('#rbEngelDe') && ort.querySelector('#rbEngelDe').checked);
      try {
        var r = await fetch(SUPA_URL + '/rest/v1/content_reports', {
          method: 'POST', headers: _hdr({ 'Prefer': 'return=minimal' }), body: JSON.stringify(govde)
        });
        var zaten = (r.status === 409);
        if (!r.ok && !zaten) throw new Error('HTTP ' + r.status);
        if (eser) { GIZLI[String(o.id)] = 1; _yaz(); }
        ort.remove();
        if (engelDe) await _engelYaz(o.kullanici, o.ad || '');
        _toast(zaten ? _t('rb.zatenBildirildi') : _t('rb.alindi'));
        _duyur();
      } catch (e) {
        btn.disabled = false;
        hata.textContent = _t('rb.gonderilemedi');
      }
    };
  }

  // ── Engelle ──
  async function _engelYaz(kid, ad) {
    var r = await fetch(SUPA_URL + '/rest/v1/user_blocks', {
      method: 'POST', headers: _hdr({ 'Prefer': 'return=minimal' }), body: JSON.stringify({ blocked_id: kid })
    });
    if (!r.ok && r.status !== 409) throw new Error('HTTP ' + r.status);
    ENGEL[kid] = ad || ENGEL[kid] || ''; _yaz();
  }
  function engelle(kid, ad) {
    var ben = _uid();
    if (!ben || !kid) return;
    if (kid === ben) { _toast(_t('rb.kendin')); return; }
    var gorunen = ad || _t('rb.buKullanici');
    var ort = _pencere(
      '<div class="rb-bas">' + _esc(_t('rb.engelBaslik').replace('{ad}', gorunen)) + '</div>' +
      '<div class="rb-bilgi" style="font-size:13px;margin-top:8px;">' + _esc(_t('rb.engelMetin')) + '</div>' +
      '<div class="rb-hata" id="rbHata"></div>' +
      '<div class="rb-tus"><button class="rb-btn" id="rbVazgec">' + _esc(_t('rb.vazgec')) + '</button>' +
      '<button class="rb-btn kirmizi" id="rbEngel">' + _esc(_t('rb.engelle')) + '</button></div>'
    );
    ort.querySelector('#rbVazgec').onclick = function () { ort.remove(); };
    ort.querySelector('#rbEngel').onclick = async function () {
      var btn = this; btn.disabled = true;
      try {
        await _engelYaz(kid, ad || '');
        ort.remove();
        _toast(_t('rb.engellendi').replace('{ad}', gorunen));
        _duyur();
      } catch (e) {
        btn.disabled = false;
        ort.querySelector('#rbHata').textContent = _t('rb.engelHata');
      }
    };
  }
  async function engelKaldir(kid) {
    if (!_uid() || !kid) return false;
    try {
      var r = await fetch(SUPA_URL + '/rest/v1/user_blocks?blocker_id=eq.' + _uid() + '&blocked_id=eq.' + encodeURIComponent(kid), {
        method: 'DELETE', headers: _hdr({ 'Prefer': 'return=minimal' })
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      delete ENGEL[kid]; _yaz();
      _toast(_t('rb.engelKalkti'));
      _duyur();
      return true;
    } catch (e) { _toast(_t('rb.engelHata')); return false; }
  }

  // ── "Bildir / Engelle" seçim penceresi (üye listesi gibi yerler için) ──
  function islemler(o) {
    o = o || {};
    if (!o.kullanici || o.kullanici === _uid()) return;
    var engelli = ENGEL.hasOwnProperty(o.kullanici);
    var ort = _pencere(
      '<div class="rb-bas">' + _esc(o.ad || _t('rb.buKullanici')) + '</div><div style="height:8px"></div>' +
      '<button class="rb-liste-btn" id="rbB"><i class="ti ti-flag"></i> ' + _esc(_t('rb.kullaniciyiBildir')) + '</button>' +
      (engelli
        ? '<button class="rb-liste-btn" id="rbK"><i class="ti ti-user-check"></i> ' + _esc(_t('rb.engelKaldir')) + '</button>'
        : '<button class="rb-liste-btn kirmizi" id="rbE"><i class="ti ti-ban"></i> ' + _esc(_t('rb.kullaniciyiEngelle')) + '</button>') +
      '<div class="rb-tus" style="margin-top:12px;"><button class="rb-btn" id="rbVazgec">' + _esc(_t('rb.vazgec')) + '</button></div>'
    );
    ort.querySelector('#rbVazgec').onclick = function () { ort.remove(); };
    ort.querySelector('#rbB').onclick = function () {
      ort.remove();
      bildir({ tur: 'user', id: o.kullanici, kullanici: o.kullanici, etiket: o.ad || '', ad: o.ad || '' });
    };
    if (engelli) ort.querySelector('#rbK').onclick = function () { ort.remove(); engelKaldir(o.kullanici); };
    else ort.querySelector('#rbE').onclick = function () { ort.remove(); engelle(o.kullanici, o.ad || ''); };
  }

  window.RB = {
    bildir: bildir,
    engelle: engelle,
    engelKaldir: engelKaldir,
    islemler: islemler,
    tazele: tazele,
    engelliMi: function (kid) { return !!kid && ENGEL.hasOwnProperty(kid); },
    gizliEserMi: function (id) { return id != null && GIZLI.hasOwnProperty(String(id)); },
    engelliler: function () { return Object.keys(ENGEL).map(function (k) { return { id: k, ad: ENGEL[k] || '' }; }); },
    t: _t
  };

  // Sayfa açılınca sunucudan bir kez tazele (beklemeden; önbellek anında hazır)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { tazele(); });
  else tazele();
})();
