/* secici.js — eser giriş ekranında makam/yöre/besteci/güftekâr için
   aranabilir seçim + öneri ekleme bileşeni.
   makam  → makams tablosu (KAPALI liste, yeni eklenemez, 29 makam)
   region → regions, composer → composers, lyricWriter → lyricists
            (AÇIK liste: yoksa "+ ekle" ile status='suggested' önerilir)
   RLS: herkes okur; giriş yapmış kullanıcı suggested ekler; admin/editor onaylar. */
(function () {
  'use strict';
  var SUPA_URL = 'https://ehytkzxdhjyjuubizdnl.supabase.co';
  var SUPA_KEY = 'sb_publishable_f_WsYxzN06B5dGROrkGyPQ_UDxKSbtO';

  function tok() { return localStorage.getItem('sb_token') || SUPA_KEY; }
  async function freshTok() {
    if (typeof window.ensureValidToken === 'function') {
      try { return (await window.ensureValidToken()) || tok(); } catch (e) {}
    }
    return tok();
  }
  function hdr(t) { return { apikey: SUPA_KEY, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }; }

  // her alan icin: input id, tablo, kapali mi
  var FIELDS = [
    { id: 'ne_makam',       table: 'makams',    closed: true  },
    { id: 'ne_region',      table: 'regions',   closed: false },
    { id: 'ne_composer',    table: 'composers', closed: false },
    { id: 'ne_lyricWriter', table: 'lyricists', closed: false }
  ];

  var cache = {};  // tablo -> [{ad,status}]

  async function load(table) {
    if (cache[table]) return cache[table];
    var t = await freshTok();
    var col = table === 'makams' ? 'ad' : 'ad,status';
    var url = SUPA_URL + '/rest/v1/' + table + '?select=' + col + '&order=ad.asc';
    try {
      var r = await fetch(url, { headers: hdr(t) });
      if (!r.ok) { console.warn('[secici] ' + table + ' okunamadı', r.status); return []; }
      var rows = await r.json();
      // makams'ta status yok -> hepsi approved say
      cache[table] = rows.map(function (x) { return { ad: x.ad, status: x.status || 'approved' }; });
      return cache[table];
    } catch (e) { console.warn('[secici] ' + table + ' hata', e); return []; }
  }

  async function suggest(table, ad) {
    var t = await freshTok();
    var uid = null;
    try { uid = JSON.parse(localStorage.getItem('sb_user') || 'null'); uid = uid && uid.id; } catch (e) {}
    var body = { ad: ad, status: 'suggested' };
    if (uid) body.added_by = uid;
    try {
      var r = await fetch(SUPA_URL + '/rest/v1/' + table, {
        method: 'POST', headers: hdr(t), body: JSON.stringify(body)
      });
      if (r.ok) {
        if (cache[table]) cache[table].push({ ad: ad, status: 'suggested' });
        return true;
      }
      // 409 = zaten var (unique). sorun degil, sec.
      if (r.status === 409) return true;
      console.warn('[secici] öneri eklenemedi', r.status); return false;
    } catch (e) { console.warn('[secici] öneri hata', e); return false; }
  }

  function norm(s) {
    return (s || '').toString().trim().toLocaleLowerCase('tr')
      .replace(/â/g,'a').replace(/Î/g,'i').replace(/û/g,'u')
      .replace(/[ıi̇]/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u')
      .replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c')
      .replace(/[^a-z0-9]/g,'');
  }

  function attach(field) {
    var input = document.getElementById(field.id);
    if (!input || input.dataset.seciciDone) return;
    input.dataset.seciciDone = '1';
    input.autocomplete = 'off';

    // sarmalayici (input'un konumunu bozmadan)
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    var panel = document.createElement('div');
    panel.style.cssText = 'position:absolute;left:0;right:0;top:100%;z-index:9999;' +
      'background:var(--surface2,#1a1f2b);border:1px solid var(--border,#2a3140);' +
      'border-radius:8px;margin-top:3px;max-height:320px;overflow-y:auto;display:none;scrollbar-width:thin;' +
      'box-shadow:0 12px 28px rgba(0,0,0,.45);';
    wrap.appendChild(panel);

    function close() { panel.style.display = 'none'; }
    function open() { panel.style.display = 'block'; }

    function row(label, sub, onPick) {
      var d = document.createElement('div');
      d.style.cssText = 'padding:8px 11px;cursor:pointer;font-size:13px;color:var(--text,#e8ecf3);' +
        'display:flex;align-items:center;justify-content:space-between;gap:8px;';
      d.onmouseenter = function () { d.style.background = 'rgba(255,200,61,.10)'; };
      d.onmouseleave = function () { d.style.background = ''; };
      var left = document.createElement('span'); left.textContent = label; d.appendChild(left);
      if (sub) {
        var b = document.createElement('span');
        b.textContent = sub;
        b.style.cssText = 'font-size:10px;padding:2px 7px;border-radius:10px;' +
          'background:rgba(120,140,170,.18);color:var(--text2,#9aa6b8);white-space:nowrap;';
        d.appendChild(b);
      }
      d.onmousedown = function (e) { e.preventDefault(); onPick(); };
      return d;
    }

    async function render() {
      var q = input.value.trim();
      var nq = norm(q);
      var list = await load(field.table);
      panel.innerHTML = '';

      var matches = list.filter(function (x) { return !nq || norm(x.ad).indexOf(nq) >= 0; });
      // approved once, suggested sonra; alfabetik
      matches.sort(function (a, b) {
        if (a.status !== b.status) return a.status === 'approved' ? -1 : 1;
        return a.ad.localeCompare(b.ad, 'tr');
      });
      matches.slice(0, 40).forEach(function (m) {
        panel.appendChild(row(m.ad, m.status === 'suggested' ? 'öneri' : '', function () {
          input.value = m.ad; close();
        }));
      });

      // acik liste + tam eslesme yoksa: + ekle
      var exact = list.some(function (x) { return norm(x.ad) === nq; });
      if (!field.closed && q && !exact) {
        var add = row('+ "' + q + '" ekle', 'yeni öneri', async function () {
          var ok = await suggest(field.table, q);
          input.value = q; close();
          if (!ok) alert('Öneri kaydedilemedi, ama alana yazıldı. Kaydettiğinde yine de eklenir.');
        });
        add.style.borderTop = '1px solid var(--border,#2a3140)';
        add.firstChild.style.color = 'var(--accent,#FFC83D)';
        panel.appendChild(add);
      }

      if (!panel.children.length) {
        var empty = document.createElement('div');
        empty.style.cssText = 'padding:9px 11px;font-size:12px;color:var(--text2,#9aa6b8);';
        empty.textContent = field.closed ? 'Eşleşen makam yok' : 'Sonuç yok';
        panel.appendChild(empty);
      }
      open();
    }

    input.addEventListener('focus', render);
    input.addEventListener('input', render);
    input.addEventListener('blur', function () { setTimeout(close, 150); });
  }

  function init() { FIELDS.forEach(attach); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  // form modal sonradan aciliyorsa tekrar dene
  window.seciciInit = init;
})();
