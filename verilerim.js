/* verilerim.js — "VERİLERİMİ İNDİR" (2026-10-25)
   Kullanıcı: "Bizim de toplu dışa aktar fonksiyonu ekleme zorunluluğumuz var mı?" → mağazalar istemiyor, GDPR md. 20 istek üzerine
   1 ay içinde istiyor (gizlilik metni §8) → "evet, Verilerimi indir ekle". Ayarlar › Hesap.
   YALNIZ KULLANICININ KENDİ VERİSİ: eklediği eserler (söz, akor, bilgiler), repertuvarları, kişisel akor/notları, favorileri,
   solistleri, grup üyelikleri, mesajları, ses kaydı / ritim LİSTESİ (dosyalar değil). Ortak katalog eserlerinin sözü / akoru
   DAHİL DEĞİL — yalnız adı, besteci, makam (2026-10-25 "içeriğimizi alıp götüremesin" kararı, sql/icerik_koruma.sql).
   Sunucu değişikliği yok: her istek kullanıcının jetonuyla gider, RLS zaten yalnız izinli satırları verir.
   Paket .zip (sıkıştırmasız, UTF-8 adlar): verilerim.json + eserler/*.cho (ChordPro; x_makam/x_usul/x_yore/x_karar →
   ice-aktar.js kayıpsız geri okur) + repertuvarlar.csv (Excel, ; ayraçlı) + OKUBENI.txt.
   Kaydetme: yerel uygulamada @capacitor/filesystem (önbellek) + @capacitor/share (dosya) → paylaş ekranı ("Dosyalar'a Kaydet",
   e-posta…); tarayıcıda <a download>. API: Verilerim.paketle() → { ad, bayt, ozet } (kaydetmez), Verilerim.indir() → kaydeder. */
(function (g) {
  'use strict';

  // ── ZIP yazıcı (STORE): yerel başlık + merkezi dizin; bit 11 = UTF-8 dosya adı ──
  var CRC = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function bayt(s) { return typeof s === 'string' ? new TextEncoder().encode(s) : s; }
  function zipOlustur(dosyalar) {
    var yerel = [], merkez = [], konum = 0;
    var simdi = new Date(), dt = ((simdi.getHours() << 11) | (simdi.getMinutes() << 5) | (simdi.getSeconds() >> 1)) & 0xFFFF,
      dd = (((simdi.getFullYear() - 1980) << 9) | ((simdi.getMonth() + 1) << 5) | simdi.getDate()) & 0xFFFF;
    dosyalar.forEach(function (f) {
      var ad = bayt(f.ad), veri = bayt(f.veri), crc = crc32(veri);
      var h = new Uint8Array(30 + ad.length), v = new DataView(h.buffer);
      v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true); v.setUint16(8, 0, true);
      v.setUint16(10, dt, true); v.setUint16(12, dd, true); v.setUint32(14, crc, true);
      v.setUint32(18, veri.length, true); v.setUint32(22, veri.length, true); v.setUint16(26, ad.length, true); v.setUint16(28, 0, true);
      h.set(ad, 30);
      var m = new Uint8Array(46 + ad.length), w = new DataView(m.buffer);
      w.setUint32(0, 0x02014b50, true); w.setUint16(4, 20, true); w.setUint16(6, 20, true); w.setUint16(8, 0x0800, true);
      w.setUint16(10, 0, true); w.setUint16(12, dt, true); w.setUint16(14, dd, true); w.setUint32(16, crc, true);
      w.setUint32(20, veri.length, true); w.setUint32(24, veri.length, true); w.setUint16(28, ad.length, true);
      w.setUint32(42, konum, true);
      m.set(ad, 46);
      yerel.push(h, veri); merkez.push(m);
      konum += h.length + veri.length;
    });
    var mBoy = merkez.reduce(function (t, m) { return t + m.length; }, 0);
    var son = new Uint8Array(22), s = new DataView(son.buffer);
    s.setUint32(0, 0x06054b50, true); s.setUint16(8, dosyalar.length, true); s.setUint16(10, dosyalar.length, true);
    s.setUint32(12, mBoy, true); s.setUint32(16, konum, true);
    var parcalar = yerel.concat(merkez, [son]), toplam = parcalar.reduce(function (t, p) { return t + p.length; }, 0);
    var out = new Uint8Array(toplam), o = 0;
    parcalar.forEach(function (p) { out.set(p, o); o += p.length; });
    return out;
  }

  // ── Biçimleyiciler ──
  function dosyaAdi(s) {
    return String(s || 'adsiz').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'adsiz';
  }
  function chordpro(w) {
    var s = ['{title: ' + (w.name || '') + '}'];
    var ek = function (k, v) { if (v != null && String(v).trim() !== '') s.push('{' + k + ': ' + String(v).replace(/[{}\n]/g, ' ').trim() + '}'); };
    ek('artist', w.composer); ek('lyricist', w.lyric_writer); ek('time', w.measurement); ek('tempo', w.metronom);
    ek('x_makam', w.makam); ek('x_usul', w.ritim); ek('x_yore', w.region); ek('x_karar', w.closing_note);
    ek('x_form', w.form); ek('x_kaynak', w.source_person); ek('x_derleyen', w.collector);
    var notalar = Array.isArray(w.nota_pages) ? w.nota_pages : (w.nota_url ? [w.nota_url] : []);
    notalar.forEach(function (u) { if (u) s.push('# Nota: ' + u); });
    if (w.video_link) s.push('# Video: ' + w.video_link);
    s.push('');
    s.push(String(w.chords || w.lyrics || '').replace(/\r\n?/g, '\n'));
    return s.join('\n').replace(/\n+$/, '') + '\n';
  }
  function csvHucre(v) { v = v == null ? '' : String(v); return /[";\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function okubeni(ozet, tarih) {
    return [
      'REPERTUVAR — VERİLERİM (' + tarih + ')',
      '',
      'Bu paket yalnız SENİN verini içerir:',
      '  verilerim.json        — hesabın, eklediğin eserler (söz, akor, bilgiler), repertuvarların, kişisel akor ve notların,',
      '                          favorilerin, solistlerin, grup üyeliklerin, mesajların, ses kaydı ve ritim listesi',
      '  eserler/*.cho         — eklediğin her eser ChordPro biçiminde (şarkı uygulamalarının çoğu ve Repertuvar okur)',
      '  repertuvarlar.csv     — repertuvarların sırasıyla (Excel / Numbers / Google E-Tablolar)',
      '',
      'Ortak katalog eserlerinin sözleri ve akorları bu pakete dahil değildir; repertuvarlarında yalnız adlarıyla geçer.',
      'Başkasının ya da katalogun eserine yaptığın "kişisel kopyam" akorları sözü de içerdiği için yalnız adı ve ton ayarıyla',
      'listelenir; uygulamada görmeye ve kullanmaya devam edersin.',
      'Ses kaydı ve ritim dosyalarının kendisi pakette yok, listesi var; istersen uygulamadan tek tek indirebilirsin.',
      'Sorular: privacy@repertuvar.app',
      '',
      'Özet: ' + ozet.eser + ' eser, ' + ozet.repertuvar + ' repertuvar, ' + ozet.kisiselAkor + ' kişisel akor, ' + ozet.not + ' not.',
      '',
      '---',
      'REPERTUVAR — MY DATA. This package contains only YOUR data: verilerim.json (account, pieces you added with lyrics/chords,',
      'repertoires, personal chords and notes, favourites, soloists, group memberships, messages, list of recordings and rhythms),',
      'eserler/*.cho (each piece you added, ChordPro) and repertuvarlar.csv. Lyrics and chords of shared catalogue pieces are not',
      'included; they appear by name only (also personal chord copies of pieces you did not add). Questions: privacy@repertuvar.app',
      ''
    ].join('\r\n');
  }

  // ── Sunucudan okuma (kullanıcının jetonuyla; RLS süzer) ──
  function al(yol) {
    return fetch(SUPA_URL + '/rest/v1/' + yol, { headers: authHeaders() }).then(function (r) {
      if (!r.ok) throw new Error(yol.split('?')[0] + ' ' + r.status);
      return r.json();
    });
  }
  function alSessiz(yol) { return al(yol).catch(function () { return null; }); }   // isteğe bağlı bölüm: hata paketi durdurmaz
  async function parcaParca(tablo, sutun, idler, ek) {
    var out = [];
    for (var i = 0; i < idler.length; i += 60) {
      var parca = idler.slice(i, i + 60).map(function (x) { return encodeURIComponent(String(x)); }).join(',');
      var r = await al(tablo + '?' + sutun + '=in.(' + parca + ')' + (ek ? '&' + ek : ''));
      out = out.concat(r || []);
    }
    return out;
  }

  async function paketle() {
    var uid = (typeof getUserId === 'function') ? getUserId() : null;
    if (!uid) throw new Error('oturum');
    var u = (typeof getUser === 'function' && getUser()) || {};
    var q = encodeURIComponent(uid);

    var sonuc = await Promise.all([
      al('works?submitted_by=eq.' + q + '&deleted_at=is.null&select=*&order=name.asc'),
      al('repertoires?or=(owner_id.eq.' + q + ',user_id.eq.' + q + ')&select=*&order=created_at.asc'),
      alSessiz('profiles?id=eq.' + q + '&select=*'),
      alSessiz('personal_chords?user_id=eq.' + q + '&select=work_id,chords,transpose,updated_at'),
      alSessiz('personal_work_notes?user_id=eq.' + q + '&select=work_id,note,updated_at'),
      alSessiz('work_favorites?user_id=eq.' + q + '&select=work_id,created_at'),
      alSessiz('solistler?user_id=eq.' + q + '&select=name,phone,email,notes,works,group_id'),
      alSessiz('group_members?user_id=eq.' + q + '&select=group_id,role,status,joined_at'),
      alSessiz('messages?from_id=eq.' + q + '&select=content,created_at,admin_reply,replied_at&order=created_at.asc'),
      alSessiz('work_audio?owner_id=eq.' + q + '&select=work_id,title,duration_sec,size_bytes,created_at'),
      alSessiz('ritimler?owner_id=eq.' + q + '&select=id,ad,zaman_sayisi,olcu_sayisi,tempo,sure_sn,size_bytes,created_at'),
      alSessiz('eser_ritimleri?owner_id=eq.' + q + '&select=work_id,ritim_id,sira,hedef_tempo,ton_kaymasi'),
      alSessiz('user_blocks?blocker_id=eq.' + q + '&select=blocked_id,created_at'),
      alSessiz('content_reports?reporter_id=eq.' + q + '&select=target_type,target_label,reason,note,status,created_at'),
      alSessiz('abonelikler?user_id=eq.' + q + '&select=kaynak,plan,donem,durum,deneme,baslangic,bitis')
    ]);
    var eserler = sonuc[0] || [], reps = sonuc[1] || [], profil = (sonuc[2] || [])[0] || null;
    var akorlar = sonuc[3] || [], notlar = sonuc[4] || [], favoriler = sonuc[5] || [], solistler = sonuc[6] || [];
    var uyelik = sonuc[7] || [], mesajlar = sonuc[8] || [], sesler = sonuc[9] || [], ritimler = sonuc[10] || [];
    var eserRitim = sonuc[11] || [], engel = sonuc[12] || [], bildirim = sonuc[13] || [], abonelik = sonuc[14] || [];

    var repIdler = reps.map(function (r) { return r.id; });
    var satirlar = repIdler.length
      ? await parcaParca('repertoire_items', 'repertoire_id', repIdler, 'select=repertoire_id,seq,work_id,note,closing_note,performer,linked_prev&order=seq.asc')
      : [];
    var grupIdler = uyelik.map(function (m) { return m.group_id; }).filter(Boolean);
    var gruplar = grupIdler.length ? await parcaParca('groups', 'id', grupIdler, 'select=id,name,description,owner_id').catch(function () { return []; }) : [];

    // Başvurulan eserlerin YALNIZ adı / bestecisi / makamı (katalog eserinin sözü/akoru pakete girmez)
    var adlar = {};
    eserler.forEach(function (w) { adlar[String(w.id)] = w; });
    var gerek = {};
    [satirlar, akorlar, notlar, favoriler, sesler, eserRitim].forEach(function (l) {
      l.forEach(function (x) { if (x.work_id != null && !adlar[String(x.work_id)]) gerek[String(x.work_id)] = 1; });
    });
    var digerIdler = Object.keys(gerek).filter(function (x) { return /^\d+$/.test(x); });
    if (digerIdler.length) {
      (await parcaParca('works', 'id', digerIdler, 'select=id,name,composer,makam').catch(function () { return []; }))
        .forEach(function (w) { adlar[String(w.id)] = w; });
    }
    var benim = {};
    eserler.forEach(function (w) { benim[String(w.id)] = 1; });
    var adi = function (id) { var w = adlar[String(id)]; return w ? (w.name || '') : ''; };
    var ritimAdi = {}; ritimler.forEach(function (r) { ritimAdi[r.id] = r.ad; });

    var tarih = new Date().toISOString().slice(0, 10);
    var ESER_ALAN = ['id', 'name', 'composer', 'lyric_writer', 'makam', 'form', 'tur', 'measurement', 'ritim', 'metronom', 'tuning',
      'instrument', 'region', 'source_person', 'collector', 'story', 'closing_note', 'dil', 'video_link', 'lyrics', 'chords',
      'nota_pages', 'nota_url', 'visibility', 'status', 'submitted_at'];
    var json = {
      bicim: 'repertuvar-verilerim/1',
      olusturuldu: new Date().toISOString(),
      hesap: { id: uid, eposta: u.email || null, kayit_tarihi: u.created_at || null,
        ad: (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || null, profil: profil },
      eserlerim: eserler.map(function (w) { var o = {}; ESER_ALAN.forEach(function (k) { if (k in w) o[k] = w[k]; }); return o; }),
      repertuvarlarim: reps.map(function (r) {
        return { id: r.id, ad: r.name, tarih: r.date, yer: r.venue, notlar: r.notes, gorunurluk: r.visibility, olusturuldu: r.created_at,
          eserler: satirlar.filter(function (s) { return s.repertoire_id === r.id; }).sort(function (a, b) { return (a.seq || 0) - (b.seq || 0); })
            .map(function (s) {
              var w = adlar[String(s.work_id)] || {};
              return { sira: s.seq, eser_id: s.work_id, eser_adi: w.name || null, besteci: w.composer || null, makam: w.makam || null,
                not: s.note || null, karar: s.closing_note || null, solist: s.performer || null, oncekine_bagli: !!s.linked_prev };
            }) };
      }),
      // (2026-10-25) Kullanıcı: "eserlerden tek tek kendi kopyasını oluşturup dolaylı yoldan içeriğimizi dışa aktarabilir mi?" —
      // "Kişisel kopyam" akoru katalog eserinin akorlu SÖZÜNÜ içerir (ChordPro, söz satır içinde). Başkasının / katalog eserine
      // yapılan kişisel akorun METNİ pakete girmez; yalnız ad, ton kaydırma, tarih. Kendi eserine yaptığı kişisel akor girer.
      // GDPR md. 20/4: taşınabilirlik başkalarının haklarını (telif) zedeleyemez.
      kisisel_akorlarim: akorlar.map(function (a) {
        var kendi = !!benim[String(a.work_id)];
        return { eser_id: a.work_id, eser_adi: adi(a.work_id), akor: kendi ? a.chords : null, transpoze: a.transpose,
          guncellendi: a.updated_at, akor_dahil_degil: kendi ? undefined : 'katalog/başkasının eseri — söz içerdiği için' };
      }),
      kisisel_notlarim: notlar.map(function (n) { return { eser_id: n.work_id, eser_adi: adi(n.work_id), not: n.note, guncellendi: n.updated_at }; }),
      favorilerim: favoriler.map(function (f) { return { eser_id: f.work_id, eser_adi: adi(f.work_id), eklendi: f.created_at }; }),
      solistlerim: solistler,
      gruplarim: uyelik.map(function (m) {
        var gr = gruplar.filter(function (x) { return x.id === m.group_id; })[0] || {};
        return { grup_id: m.group_id, ad: gr.name || null, aciklama: gr.description || null, rol: m.role, durum: m.status,
          sahibi: gr.owner_id === uid, katildi: m.joined_at };
      }),
      mesajlarim: mesajlar,
      ses_kayitlarim: sesler.map(function (s) { return Object.assign({ eser_adi: adi(s.work_id) }, s); }),
      ritimlerim: ritimler,
      eser_ritimlerim: eserRitim.map(function (e) { return Object.assign({ eser_adi: adi(e.work_id), ritim_adi: ritimAdi[e.ritim_id] || null }, e); }),
      engellediklerim: engel,
      bildirdiklerim: bildirim,
      abonelik: abonelik
    };

    var dosyalar = [];
    var kullanilan = {};
    eserler.forEach(function (w, i) {
      var temel = String(i + 1).padStart(3, '0') + ' ' + dosyaAdi(w.name);
      var ad = temel, n = 2;
      while (kullanilan[ad.toLowerCase()]) ad = temel + ' (' + (n++) + ')';
      kullanilan[ad.toLowerCase()] = 1;
      dosyalar.push({ ad: 'eserler/' + ad + '.cho', veri: chordpro(w) });
    });
    var csv = ['Repertuvar;Tarih;Yer;Sıra;Eser;Besteci;Makam;Karar;Not'];
    json.repertuvarlarim.forEach(function (r) {
      if (!r.eserler.length) csv.push([r.ad, r.tarih, r.yer, '', '', '', '', '', r.notlar].map(csvHucre).join(';'));
      r.eserler.forEach(function (s) { csv.push([r.ad, r.tarih, r.yer, s.sira, s.eser_adi, s.besteci, s.makam, s.karar, s.not].map(csvHucre).join(';')); });
    });
    var ozet = { eser: eserler.length, repertuvar: reps.length, kisiselAkor: akorlar.length, not: notlar.length };
    dosyalar.unshift(
      { ad: 'OKUBENI.txt', veri: '﻿' + okubeni(ozet, tarih) },
      { ad: 'verilerim.json', veri: JSON.stringify(json, null, 2) },
      { ad: 'repertuvarlar.csv', veri: '﻿' + csv.join('\r\n') + '\r\n' }
    );
    return { ad: 'repertuvar-verilerim-' + tarih + '.zip', bayt: zipOlustur(dosyalar), ozet: ozet };
  }

  function base64(b) {
    var s = '';
    for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  }
  // Yerelde: önbelleğe yaz → paylaş ekranı (iOS "Dosyalar'a Kaydet", Android "Drive'a kaydet / e-posta…"). Tarayıcıda: indir.
  async function kaydet(ad, b) {
    var C = g.Capacitor;
    if (C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.Filesystem && C.Plugins.Share) {
      var yazilan = await C.Plugins.Filesystem.writeFile({ path: ad, data: base64(b), directory: 'CACHE' });
      try {
        await C.Plugins.Share.share({ title: ad, files: [yazilan.uri], dialogTitle: ad });
      } catch (e) {
        if (/cancel/i.test(String((e && (e.message || e.code)) || ''))) return 'iptal';
        throw e;
      }
      return 'paylasildi';
    }
    // Yerel uygulamada <a download> hiçbir şey yapmaz (WKWebView / Android WebView) → sessiz kalmak yerine söyle.
    if (C && C.isNativePlatform && C.isNativePlatform()) throw new Error('dosya kaydetme eklentisi yok (uygulamayı güncelle)');
    var url = URL.createObjectURL(new Blob([b], { type: 'application/zip' }));
    var a = document.createElement('a');
    a.href = url; a.download = ad; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    return 'indirildi';
  }

  async function indir() {
    var p = await paketle();
    p.durum = await kaydet(p.ad, p.bayt);
    return p;
  }

  var api = { paketle: paketle, indir: indir, zipOlustur: zipOlustur, chordpro: chordpro };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  g.Verilerim = api;
})(typeof window !== 'undefined' ? window : globalThis);
