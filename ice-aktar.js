/* ice-aktar.js — BAŞKA UYGULAMADAN GEÇİŞ (2026-10-25)
   Kullanıcı: "rakiplerden geçişi kolaylaştıracak yöntemlere bakalım, içe aktar gibi" → "1 ve 2 birlikte":
   (1) dosyadan / yapıştırılan metinden şarkı içe aktarma (eserler.html), (2) şarkı listesinden repertuvar (repertoires.js).
   Rakipler (OnSong, SongbookPro, BandHelper…) şarkıları ortak dil ChordPro (.cho/.chopro/.pro), OnSong metni (.onsong) ya da
   düz metin (.txt — Ultimate Guitar'daki gibi akor sözün üstünde) olarak dışa aktarıyor; çoğu bunları .zip içinde de veriyor.
   Test dosyaları: ../rakip_import/ (00-OKUBENI.md'deki alan eşlemesi burada uygulanıyor; x_makam/x_usul/x_yore/x_karar kayıpsız).
   Saf işlevler — DOM'a dokunmaz (akor-üstte çevirici varsa window.convertChordsAboveToChordPro / _isChordLine kullanılır), node ile de
   sınanabilir: module.exports. */
(function (g) {
  'use strict';

  var UZANTILAR = ['cho', 'chopro', 'chordpro', 'crd', 'pro', 'chord', 'onsong', 'txt', 'text'];
  var BELGE_UZANTI = ['docx', 'odt'];   // Word / LibreOffice belgesi → düz metin → tek şarkı (2026-10-25)

  // Adı bulunamayan eserin varsayılan adı arayüz dilinde (i18n.js yoksa — node sınaması — Türkçe)
  function adsizEser() {
    try { return (g && g.i18n && g.i18n.t) ? g.i18n.t('es.iaAdsizEser', 'Adsız eser') : 'Adsız eser'; } catch (e) { return 'Adsız eser'; }
  }

  // ── Metin çözme: UTF-8 (BOM'lu/BOM'suz), değilse eski Windows Türkçe (1254) ──
  function metinCoz(veri) {
    var b = veri instanceof Uint8Array ? veri : new Uint8Array(veri);
    if (b.length >= 2 && b[0] === 0xFF && b[1] === 0xFE) return new TextDecoder('utf-16le').decode(b.subarray(2));
    if (b.length >= 2 && b[0] === 0xFE && b[1] === 0xFF) return new TextDecoder('utf-16be').decode(b.subarray(2));
    try { return new TextDecoder('utf-8', { fatal: true }).decode(b).replace(/^﻿/, ''); }
    catch (e) {
      try { return new TextDecoder('windows-1254').decode(b); } catch (e2) { return new TextDecoder('utf-8').decode(b); }
    }
  }

  // ── .zip: merkezi dizin + DecompressionStream('deflate-raw') (iOS 16.4+, Chrome 80+). Klasör/__MACOSX/gizli dosya atlanır. ──
  async function zipCoz(veri) {
    var b = veri instanceof Uint8Array ? veri : new Uint8Array(veri);
    var dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    var son = -1;
    for (var i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) { if (dv.getUint32(i, true) === 0x06054b50) { son = i; break; } }
    if (son < 0) throw new Error('zip');
    var adet = dv.getUint16(son + 10, true), p = dv.getUint32(son + 16, true), cikti = [];
    for (var n = 0; n < adet; n++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      var yontem = dv.getUint16(p + 10, true), boy = dv.getUint32(p + 20, true);
      var adBoy = dv.getUint16(p + 28, true), ekBoy = dv.getUint16(p + 30, true), notBoy = dv.getUint16(p + 32, true);
      var yerel = dv.getUint32(p + 42, true);
      var ad = new TextDecoder('utf-8').decode(b.subarray(p + 46, p + 46 + adBoy));
      p += 46 + adBoy + ekBoy + notBoy;
      if (/\/$/.test(ad) || /(^|\/)(__MACOSX|\.)/.test(ad)) continue;
      var yAd = dv.getUint16(yerel + 26, true), yEk = dv.getUint16(yerel + 28, true);
      var bas = yerel + 30 + yAd + yEk, ham = b.subarray(bas, bas + boy), icerik;
      if (yontem === 0) icerik = ham;
      else if (yontem === 8 && typeof DecompressionStream === 'function') {
        icerik = new Uint8Array(await new Response(new Blob([ham]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      } else continue;
      cikti.push({ ad: ad.split('/').pop(), yol: ad, veri: icerik });
    }
    return cikti;
  }

  function uzanti(ad) { var m = /\.([a-z0-9]+)$/i.exec(ad || ''); return m ? m[1].toLowerCase() : ''; }
  function dosyaAdindanBaslik(ad) {
    return (ad || '').replace(/\.[a-z0-9]+$/i, '').replace(/^\d+[\s._-]+/, '').replace(/[_]+/g, ' ').trim();
  }

  // ── Akor yardımcıları ──
  var AKOR_RE = /^[A-H](?:#|b|♯|♭)?(?:maj|min|m|M|dim|aug|sus|add|°|ø|\+|-)?\d{0,2}(?:(?:maj|min|sus|add|b|#|\+|-)\d{1,2})*(?:\/[A-H](?:#|b)?)?$/;
  function akorMu(t) { return AKOR_RE.test(t); }
  function akorSatiriMi(satir) {
    if (typeof g._isChordLine === 'function') return g._isChordLine(satir);
    var t = (satir || '').trim();
    if (!t) return false;
    var parca = t.split(/\s+/);
    return parca.every(function (x) { return akorMu(x.replace(/[()|]/g, '')) || /^[|/x\-.]+$/.test(x); }) && parca.some(akorMu);
  }
  function akorUsttenSatiraCevir(metin) {
    if (typeof g.convertChordsAboveToChordPro === 'function') return g.convertChordsAboveToChordPro(metin);
    // Yedek (node sınaması): akor satırındaki her akoru alttaki söz satırında aynı sütuna [Akor] olarak yerleştir.
    var s = metin.split('\n'), out = [];
    for (var i = 0; i < s.length; i++) {
      if (akorSatiriMi(s[i]) && s[i + 1] !== undefined && s[i + 1].trim() && !akorSatiriMi(s[i + 1])) {
        var soz = s[i + 1], konumlar = [], m, re = /\S+/g;
        while ((m = re.exec(s[i])) !== null) konumlar.push({ k: m.index, a: m[0] });
        for (var j = konumlar.length - 1; j >= 0; j--) {
          var k = Math.min(konumlar[j].k, soz.length);
          soz = soz.slice(0, k) + '[' + konumlar[j].a + ']' + soz.slice(k);
        }
        out.push(soz); i++;
      } else if (akorSatiriMi(s[i])) out.push(s[i].trim().split(/\s+/).map(function (a) { return '[' + a + ']'; }).join(' '));
      else out.push(s[i]);
    }
    return out.join('\n');
  }
  function satirIciAkorVarMi(metin) { return /\[[A-H](?:#|b)?[^\]\s]{0,8}\]/.test(metin); }
  function akorlariSil(satir) { return satir.replace(/\[[^\]]*\]/g, '').replace(/[ \t]{2,}/g, ' ').replace(/\s+$/, ''); }

  // Gövde → { soz, akorlu }. Akor yoksa akorlu boş.
  function govdeTamamla(satirlar) {
    var metin = satirlar.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '');
    if (!satirIciAkorVarMi(metin) && metin.split('\n').some(akorSatiriMi)) metin = akorUsttenSatiraCevir(metin);
    var akorlu = satirIciAkorVarMi(metin) ? metin : '';
    var soz = metin.split('\n').map(function (s) { return akorSatiriMi(s) ? '' : akorlariSil(s); }).join('\n')
      .replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '');
    return { soz: soz, akorlu: akorlu };
  }

  function bolumEtiketi(ad) { ad = (ad || '').trim(); return ad ? '— ' + ad + ' —' : ''; }

  // Ton → karar sesi harfi (Am → A, F#m → F#, Bb → Bb). Batı tonunda kökü verir; x_karar varsa o kullanılır.
  function tondanKarar(ton) { var m = /^\s*([A-H](?:#|b)?)/.exec(ton || ''); return m ? m[1] : ''; }
  function tempoSayi(v) { var m = /(\d{2,3})/.exec(v || ''); return m ? Number(m[1]) : null; }

  var DIREKTIF_ESLEM = { t: 'title', st: 'subtitle', c: 'comment', ci: 'comment', cb: 'comment', soc: 'start_of_chorus',
    eoc: 'end_of_chorus', sov: 'start_of_verse', eov: 'end_of_verse', sob: 'start_of_bridge', eob: 'end_of_bridge',
    sot: 'start_of_tab', eot: 'end_of_tab', ns: 'new_song', np: 'new_page', npp: 'new_physical_page', meta: 'meta' };

  function yeniEser() { return { ad: '', besteci: [], sozYazari: '', makam: '', olcu: '', usul: '', yore: '', karar: '', ton: '', capo: '', tempo: null, soz: '', akorlu: '' }; }

  // ── ChordPro (bir şarkı) ──
  function chordproSarki(metin) {
    var e = yeniEser(), govde = [], tab = false;
    metin.split('\n').forEach(function (satir) {
      if (/^\s*#/.test(satir)) return;                                   // ChordPro yorum satırı
      var d = /^\s*\{\s*([a-zA-Z_]+)(?:[\s:]\s*(.*?))?\s*\}\s*$/.exec(satir);
      if (!d) { if (!tab) govde.push(satir.replace(/\s+$/, '')); return; }
      var ad = d[1].toLowerCase(), deger = (d[2] || '').trim();
      ad = DIREKTIF_ESLEM[ad] || ad;
      if (ad === 'meta') { var mm = /^(\S+)\s+(.*)$/.exec(deger); if (!mm) return; ad = mm[1].toLowerCase(); deger = mm[2]; }
      switch (ad) {
        case 'title': e.ad = e.ad || deger; break;
        case 'artist': case 'composer': if (deger) e.besteci.push(deger); break;
        case 'lyricist': e.sozYazari = deger; break;
        case 'key': e.ton = e.ton || deger; break;
        case 'time': e.olcu = deger; break;
        case 'tempo': e.tempo = tempoSayi(deger); break;
        case 'capo': e.capo = deger; break;
        case 'x_makam': e.makam = deger; break;
        case 'x_usul': e.usul = deger; break;
        case 'x_yore': e.yore = deger; break;
        case 'x_karar': e.karar = deger; break;
        case 'comment': if (deger) govde.push('(' + deger + ')'); break;
        case 'start_of_chorus': govde.push(bolumEtiketi(deger || 'Nakarat')); break;
        case 'start_of_verse': case 'start_of_bridge': if (deger) govde.push(bolumEtiketi(deger)); break;
        case 'end_of_chorus': case 'end_of_verse': case 'end_of_bridge': govde.push(''); break;
        case 'start_of_tab': tab = true; break;
        case 'end_of_tab': tab = false; break;
        default: break;   // define/chord/new_page/bilinmeyen: yok sayılır
      }
    });
    var gv = govdeTamamla(govde);
    e.soz = gv.soz; e.akorlu = gv.akorlu;
    return e;
  }

  // ── OnSong metni / düz metin (Ultimate Guitar) ──
  var BASLIK_ALAN = /^\s*(title|başlık|artist|sanatçı|key|ton|tempo|time|ölçü|capo|duration|süre|tuning|copyright|ccli|author|composer|besteci|lyricist|söz)\s*:\s*(.*)$/i;
  var BOLUM_KOSELI = /^\s*\[([^\]\d][^\]]{0,30})\]\s*$/;                              // [Verse 1], [Chorus], [Nakarat]
  var BOLUM_IKI_NOKTA = /^\s*((?:verse|chorus|refrain|bridge|pre-?chorus|intro|outro|ending|tag|interlude|instrumental|solo|kıta|nakarat|giriş|bitiş|ara)(?:\s*\d+)?)\s*:\s*$/i;
  function metinSarki(metin, dosyaAdi) {
    var e = yeniEser(), satirlar = metin.split('\n'), i = 0;
    while (i < satirlar.length && !satirlar[i].trim()) i++;
    // Üst bilgi bloğu: ilk boş satıra kadar. İlk satır başlık, ikincisi (alan değilse, akor/bölüm değilse) sanatçı.
    var ust = [];
    while (i < satirlar.length && satirlar[i].trim()) { ust.push(satirlar[i]); i++; }
    var govdeBas = i, alanSayisi = 0;
    ust.forEach(function (s) { if (BASLIK_ALAN.test(s)) alanSayisi++; });
    var ustGovdeMi = ust.length > 4 && alanSayisi === 0 && ust.some(function (s) { return akorSatiriMi(s) || BOLUM_KOSELI.test(s); });
    if (ustGovdeMi) { e.ad = (ust[0] || '').trim(); govdeBas = satirlar.indexOf(ust[0]) + 1; }
    else {
      ust.forEach(function (s, n) {
        var m = BASLIK_ALAN.exec(s);
        if (m) {
          var k = m[1].toLowerCase(), v = m[2].trim();
          if (/^(title|başlık)$/.test(k)) e.ad = v;
          else if (/^(artist|sanatçı|author|composer|besteci)$/.test(k)) { if (v) e.besteci.push(v); }
          else if (/^(lyricist|söz)$/.test(k)) e.sozYazari = v;
          else if (/^(key|ton)$/.test(k)) e.ton = v;
          else if (/^(time|ölçü)$/.test(k)) e.olcu = v;
          else if (k === 'tempo') e.tempo = tempoSayi(v);
          else if (k === 'capo') e.capo = v;
          return;
        }
        if (akorSatiriMi(s) || BOLUM_KOSELI.test(s)) return;
        if (!e.ad && n === 0) e.ad = s.trim();
        else if (n === 1 && !e.besteci.length) e.besteci.push(s.trim());
      });
    }
    var govde = satirlar.slice(govdeBas).map(function (s) {
      var m = BOLUM_KOSELI.exec(s) || BOLUM_IKI_NOKTA.exec(s);
      if (m && !akorSatiriMi(s)) return bolumEtiketi(m[1]);
      var a = BASLIK_ALAN.exec(s);
      if (a && /^(key|ton|capo|tempo|tuning|time)$/i.test(a[1])) {           // UG gövdesinde "Capo: 2", "Key: Am"
        var k = a[1].toLowerCase();
        if (k === 'key' || k === 'ton') e.ton = e.ton || a[2].trim();
        else if (k === 'capo') e.capo = a[2].trim();
        else if (k === 'tempo') e.tempo = e.tempo || tempoSayi(a[2]);
        else if (k === 'time') e.olcu = e.olcu || a[2].trim();
        return null;
      }
      return s.replace(/\s+$/, '');
    }).filter(function (s) { return s !== null; });
    var gv = govdeTamamla(govde);
    e.soz = gv.soz; e.akorlu = gv.akorlu;
    if (!e.ad) e.ad = dosyaAdindanBaslik(dosyaAdi);
    return e;
  }

  // ── Giriş noktası: bir dosyanın / yapıştırılan metnin içeriği → eser listesi ──
  function ayristir(metin, dosyaAdi) {
    metin = (metin || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
    if (!metin.trim()) return [];
    var chordpro = /\{\s*(title|t|new_song|ns|start_of_chorus|soc|artist|key|x_makam)\b/i.test(metin);
    var parcalar = chordpro ? metin.split(/^\s*\{\s*(?:new_song|ns)\s*\}\s*$/im) : [metin];
    var cikti = [];
    parcalar.forEach(function (p) {
      if (!p.trim()) return;
      var e = chordpro ? chordproSarki(p) : metinSarki(p, dosyaAdi);
      if (!e.ad) e.ad = dosyaAdindanBaslik(dosyaAdi) || adsizEser();
      if (!e.karar && e.ton) e.karar = tondanKarar(e.ton);
      if (e.soz || e.akorlu || e.ad) cikti.push(e);
    });
    return cikti;
  }

  // ── Ofis belgeleri (2026-10-25) — kullanıcı: "Şarkı listesinden doldur aynı zamanda bir Word ya da Excel dosyası da olabilir mi?"
  // .docx / .xlsx / .odt / .ods aslında zip içinde XML → zipCoz ile açılır, metin etiketlerden sökülür. Çıktı belge sırasıyla
  // parçalar: { p: 'paragraf' } ya da { tr: ['hücre', …], t: tabloNo }. Eski ikili .doc / .xls (OLE) okunmaz → Error('eski').
  function xmlCoz(s) {
    return (s || '').replace(/&#x([0-9a-f]+);/gi, function (m, h) { return String.fromCodePoint(parseInt(h, 16)); })
      .replace(/&#(\d+);/g, function (m, d) { return String.fromCodePoint(Number(d)); })
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  }
  // Word paragrafı: yalnız w:t metni (alan kodu / silinmiş metin dışarıda), sekme ve satır sonu yerinde
  function wParagraf(p) {
    var t = '', re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:(?:br|cr)\b[^>]*\/>/g, m;
    while ((m = re.exec(p))) t += m[1] !== undefined ? m[1] : (m[0].indexOf('tab') > 0 ? '\t' : '\n');
    return xmlCoz(t);
  }
  var W_PAR = /<w:p(?:\s[^>]*)?\/>|<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
  function docxParcalari(xml) {
    var govde = ((/<w:body>([\s\S]*)<\/w:body>/.exec(xml) || [null, xml])[1] || '').replace(/<mc:Fallback>[\s\S]*?<\/mc:Fallback>/g, '');
    var out = [], tNo = -1, re = /<w:tbl>|<w:tr\b[\s\S]*?<\/w:tr>|<w:p(?:\s[^>]*)?\/>|<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, m;
    while ((m = re.exec(govde))) {
      var x = m[0];
      if (x === '<w:tbl>') tNo++;
      else if (x.lastIndexOf('<w:tr', 0) === 0) {
        out.push({ t: tNo, tr: x.split('</w:tc>').slice(0, -1).map(function (h) {
          return (h.match(W_PAR) || []).map(wParagraf).join(' ').replace(/\s+/g, ' ').trim();
        }) });
      } else out.push({ p: wParagraf(x) });
    }
    return out;
  }
  // OpenDocument (LibreOffice) metni: text:s boşluk sayısı, sekme, satır sonu; kalan etiketler sökülür
  function odfMetni(x) {
    return xmlCoz((x || '').replace(/<text:s(?:\s+text:c="(\d+)")?\s*\/>/g, function (m, n) { return ' '.repeat(Number(n || 1)); })
      .replace(/<text:tab\s*\/>/g, '\t').replace(/<text:line-break\s*\/>|<\/text:[ph]>/g, '\n').replace(/<[^>]+>/g, '')).replace(/\n$/, '');
  }
  function odfParcalari(xml) {
    var govde = (/<office:body>([\s\S]*)<\/office:body>/.exec(xml) || [null, xml])[1] || '';
    var out = [], tNo = -1, m,
      re = /<table:table(?=[\s>])[^>]*>|<table:table-row\b[^>]*>[\s\S]*?<\/table:table-row>|<text:[ph]\b[^>]*\/>|<text:p\b[^>]*>[\s\S]*?<\/text:p>|<text:h\b[^>]*>[\s\S]*?<\/text:h>/g;
    while ((m = re.exec(govde))) {
      var x = m[0];
      if (/^<table:table[\s>]/.test(x)) tNo++;
      else if (x.lastIndexOf('<table:table-row', 0) === 0) {
        var hucre = [], cr = /<table:(?:covered-)?table-cell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/table:(?:covered-)?table-cell>)/g, c;
        while ((c = cr.exec(x)) && hucre.length < 60) {
          var tekrar = Math.min(Number((/table:number-columns-repeated="(\d+)"/.exec(c[1]) || [])[1] || 1), 60 - hucre.length);
          var deger = odfMetni(c[2]).replace(/\s+/g, ' ').trim();
          for (var k = 0; k < tekrar; k++) hucre.push(deger);
        }
        out.push({ t: tNo, tr: hucre });
      } else out.push({ p: /\/>$/.test(x) ? '' : odfMetni(x) });
    }
    return out;
  }
  function tMetni(x) {
    var t = '', re = /<t(?:\s[^>]*)?>([^<]*)<\/t>/g, m;
    while ((m = re.exec(x || ''))) t += m[1];
    return xmlCoz(t);
  }
  function sutunNo(harf) { var n = 0; for (var i = 0; i < harf.length; i++) n = n * 26 + harf.charCodeAt(i) - 64; return n - 1; }
  // Çalışma kitabının İLK sayfası (workbook.xml sırası → ilişki dosyası); bulunamazsa en küçük numaralı sheetN.xml
  function ilkSayfa(oku, yollar) {
    var id = (/<sheet\b[^>]*?\br:id="([^"]+)"/.exec(oku('xl/workbook.xml')) || [])[1], rels = oku('xl/_rels/workbook.xml.rels'), m;
    var rl = /<Relationship\b[^>]*>/g;
    while (id && (m = rl.exec(rels))) {
      if (m[0].indexOf('Id="' + id + '"') < 0) continue;
      var hedef = ((/Target="([^"]+)"/.exec(m[0]) || [])[1] || '').replace(/^\//, '');
      if (hedef && hedef.indexOf('xl/') !== 0) hedef = 'xl/' + hedef;
      if (yollar.indexOf(hedef) >= 0) return hedef;
    }
    return yollar.filter(function (y) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(y); })
      .sort(function (a, b) { return parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10); })[0] || '';
  }
  function xlsxParcalari(oku, yollar) {
    var ortak = [], re = /<si\b[^>]*>([\s\S]*?)<\/si>/g, m, ss = oku('xl/sharedStrings.xml');
    while ((m = re.exec(ss))) ortak.push(tMetni(m[1].replace(/<rPh\b[\s\S]*?<\/rPh>/g, '')));
    var xml = oku(ilkSayfa(oku, yollar)), out = [], rr = /<row\b[^>]*>([\s\S]*?)<\/row>/g, r;
    while ((r = rr.exec(xml)) && out.length < 3000) {
      var hucre = [], cr = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, c;
      while ((c = cr.exec(r[1]))) {
        var at = c[1], ic = c[2] || '', tip = (/\bt="([^"]+)"/.exec(at) || [])[1] || 'n';
        var ref = (/\br="([A-Z]+)\d+"/.exec(at) || [])[1], sutun = ref ? sutunNo(ref) : hucre.length;
        var v = (/<v>([\s\S]*?)<\/v>/.exec(ic) || [])[1], deger = '';
        if (tip === 's') deger = ortak[Number(v)] || '';
        else if (tip === 'inlineStr') deger = tMetni(ic);
        else if (tip === 'str' || tip === 'n') deger = v != null ? xmlCoz(v) : '';
        if (sutun >= 0 && sutun < 60) hucre[sutun] = deger.replace(/\s+/g, ' ').trim();
      }
      out.push({ t: 0, tr: Array.from(hucre, function (h) { return h || ''; }) });
    }
    return out;
  }
  // Zip mi, hangi belge? İçeriğe bakılır (iOS Dosyalar'dan uzantısız gelebiliyor).
  async function belgeParcalari(veri) {
    var b = veri instanceof Uint8Array ? veri : new Uint8Array(veri);
    if (b[0] === 0xD0 && b[1] === 0xCF && b[2] === 0x11 && b[3] === 0xE0) throw new Error('eski');
    if (!(b[0] === 0x50 && b[1] === 0x4B)) return null;
    var z = await zipCoz(b), dosya = {};
    z.forEach(function (x) { dosya[x.yol] = x.veri; });
    var oku = function (yol) { return dosya[yol] ? new TextDecoder('utf-8').decode(dosya[yol]) : ''; };
    if (dosya['word/document.xml']) return docxParcalari(oku('word/document.xml'));
    if (dosya['xl/workbook.xml']) return xlsxParcalari(oku, Object.keys(dosya));
    if (dosya['content.xml']) return odfParcalari(oku('content.xml'));
    return null;
  }
  // Belge → düz metin (şarkı içe aktarma için: Word'deki söz/akor). Tablo satırının hücreleri boşlukla yan yana.
  function parcalardanMetin(parcalar) {
    return parcalar.map(function (x) { return x.tr ? x.tr.filter(Boolean).join('    ') : x.p; }).join('\n');
  }

  // Tablo başlığı tanıma — "Şarkı | Sanatçı", "No; Eser Adı; Besteci", "Title, Artist"… (küçük harf, sondaki : . atılmış hâli)
  var AD_BASLIK = ['şarkı', 'şarkı adı', 'şarkının adı', 'eser', 'eser adı', 'eserin adı', 'ad', 'adı', 'isim', 'parça', 'parça adı',
    'başlık', 'türkü', 'türkü adı', 'title', 'song', 'song title', 'song name', 'name', 'track', 'titel', 'nummer', 'naam'];
  var EK_BASLIK = ['sanatçı', 'sanatçı adı', 'besteci', 'bestekar', 'bestekâr', 'beste', 'yorumcu', 'söz', 'söz yazarı', 'söz-müzik',
    'söz - müzik', 'grup', 'artist', 'composer', 'author', 'by', 'artiest', 'componist'];
  var DIGER_BASLIK = ['no', 'sıra', 'sıra no', '#', 'nr', 'ton', 'key', 'süre', 'time', 'duration', 'bpm', 'tempo', 'makam', 'usul',
    'tarih', 'not', 'notlar', 'notes', 'capo', 'açıklama', 'duur', 'toonsoort'];
  var SAYI_RE = /^[\d\s.,:/'"-]+$/;   // sıra no, süre (3:45, 0.15625), tarih — ad olamaz
  function baslikKelimesi(h) { return (h || '').toLocaleLowerCase('tr').replace(/[:.]+$/, '').replace(/\s+/g, ' ').trim(); }
  function baslikSatiriMi(hucreler) {
    var p = hucreler.map(baslikKelimesi).filter(Boolean);
    return p.length > 0 && p.some(function (x) { return AD_BASLIK.indexOf(x) >= 0 || EK_BASLIK.indexOf(x) >= 0; }) &&
      p.every(function (x) { return AD_BASLIK.indexOf(x) >= 0 || EK_BASLIK.indexOf(x) >= 0 || DIGER_BASLIK.indexOf(x) >= 0; });
  }
  // Sayı olmayan hücreler sekmeyle; sondaki sekme tek hücreli satırı da "tablo satırı" yapar (virgüllü ad CSV diye bölünmez).
  function tabloSatiri(r) { var h = r.filter(function (x) { return x && !SAYI_RE.test(x); }); return h.length ? h.join('\t') + '\t' : ''; }
  // Bir tablonun satırları → liste satırları ("Ad<TAB>Sanatçı"). İlk 3 satırda başlık varsa ad/sanatçı sütunu oradan;
  // yoksa sayı olmayan hücreler sırayla (ilki ad, ikincisi sanatçı sayılır).
  function tabloSatirlari(satirlar) {
    satirlar = satirlar.filter(function (r) { return r.some(Boolean); });
    var bas = -1, adS = -1, ekS = -1;
    for (var i = 0; i < Math.min(3, satirlar.length) && bas < 0; i++) {
      satirlar[i].map(baslikKelimesi).forEach(function (h, j) {
        if (adS < 0 && AD_BASLIK.indexOf(h) >= 0) adS = j;
        else if (ekS < 0 && EK_BASLIK.indexOf(h) >= 0) ekS = j;
      });
      if (adS >= 0) bas = i; else ekS = -1;
    }
    if (bas >= 0) return satirlar.slice(bas + 1).map(function (r) {
      var ad = r[adS] || '', ek = ekS >= 0 ? (r[ekS] || '') : '';
      return ad && !SAYI_RE.test(ad) ? ad + '\t' + ek : '';
    }).filter(Boolean);
    return satirlar.map(tabloSatiri).filter(Boolean);
  }
  // Şarkı listesi dosyası (Excel / Word / LibreOffice / CSV / TXT) → textarea'ya konacak metin (her satıra bir şarkı).
  // Belgede en az 3 satırlık tablo varsa yalnız tablolar alınır (üstteki "Düğün repertuvarı – 12 Haziran" gibi başlık satırı karışmasın).
  async function listeDosyasiOku(f) {
    var veri = new Uint8Array(await f.arrayBuffer());
    var parcalar = await belgeParcalari(veri);
    if (!parcalar) {
      if (/\.(doc|xls|pages|numbers|key)$/i.test(f.name || '')) throw new Error('eski');
      return metinCoz(veri);
    }
    var tablolar = {};
    parcalar.forEach(function (x) { if (x.tr) (tablolar[x.t] = tablolar[x.t] || []).push(x.tr); });
    var tabloSat = [];
    Object.keys(tablolar).forEach(function (k) { tabloSat = tabloSat.concat(tabloSatirlari(tablolar[k])); });
    if (tabloSat.length >= 3) return tabloSat.join('\n');
    return parcalar.map(function (x) { return x.tr ? tabloSatiri(x.tr) : x.p; }).join('\n');
  }

  // Dosya listesi (File/Blob) → eser listesi. Zip açılır; desteklenmeyen uzantı ve okunamayan dosya `atlanan`a.
  async function dosyalariAyristir(dosyalar) {
    var eserler = [], atlanan = [];
    for (var i = 0; i < dosyalar.length; i++) {
      var f = dosyalar[i], uz = uzanti(f.name);
      try {
        var veri = new Uint8Array(await f.arrayBuffer());
        if (uz === 'zip') {
          var icerik = await zipCoz(veri);
          for (var j = 0; j < icerik.length; j++) {
            var z = icerik[j], zUz = uzanti(z.ad), zMetin = null;
            if (BELGE_UZANTI.indexOf(zUz) >= 0) { try { var zp = await belgeParcalari(z.veri); zMetin = zp ? parcalardanMetin(zp) : null; } catch (e) { zMetin = null; } }
            else if (UZANTILAR.indexOf(zUz) >= 0) zMetin = metinCoz(z.veri);
            if (zMetin === null) { atlanan.push(z.ad); continue; }
            ayristir(zMetin, z.ad).forEach(function (e) { e.kaynak = f.name + ' › ' + z.ad; eserler.push(e); });
          }
        } else if (BELGE_UZANTI.indexOf(uz) >= 0) {
          var bp = await belgeParcalari(veri);
          if (!bp) atlanan.push(f.name);
          else ayristir(parcalardanMetin(bp), f.name).forEach(function (e) { e.kaynak = f.name; eserler.push(e); });
        } else if (UZANTILAR.indexOf(uz) >= 0 || !uz) {
          ayristir(metinCoz(veri), f.name).forEach(function (e) { e.kaynak = f.name; eserler.push(e); });
        } else atlanan.push(f.name);
      } catch (err) { atlanan.push(f.name); }
    }
    return { eserler: eserler, atlanan: atlanan };
  }

  // ── Şarkı listesi → satırlar (repertuvar içe aktarma). Numara, madde imi, süre, ton ekleri temizlenir. ──
  // (2026-10-25) Sekmeli satır = Excel/Word tablosundan kopyalanan ya da dosyadan okunan satır (ilk metin hücresi ad, ikincisi
  // sanatçı); "No;Şarkı;Sanatçı" gibi başlık satırı ve sayı hücreleri (sıra, süre) atlanır; tırnaklı CSV hücresi doğru bölünür.
  function satirTemizle(t) {
    t = t.replace(/^(?:\d{1,3}\s*[.)\-:]\s*|[-•*·–—]\s+)/, '');           // "1. ", "12) ", "- ", "• "
    t = t.replace(/\s*[\[(](?:\d{1,2}:\d{2}|[A-H](?:#|b)?m?|key[^)\]]*|ton[^)\]]*)[\])]\s*$/i, '');   // "(3:45)", "[Am]"
    return t.replace(/\s+\d{1,2}:\d{2}\s*$/, '').trim();
  }
  function csvBol(t) {
    var out = [], cur = '', q = false;
    for (var i = 0; i < t.length; i++) {
      var c = t[i];
      if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',' || c === ';') { out.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    out.push(cur.trim());
    return out;
  }
  var LISTE_BASLIK = /^(set\s*list|setlist|play\s*list|repertuvar|repertuar|repertoire|(şarkı|eser|parça|konser|çalma|türkü)\s+listesi|liste|program)\s*:?$/i;
  function listeSatirlari(metin) {
    return (metin || '').replace(/\r\n?/g, '\n').split('\n').map(function (s) {
      var t = s.trim();
      if (!t) return null;
      var hucre = s.indexOf('\t') >= 0 ? s.split('\t') : null;
      if (!hucre) {
        t = satirTemizle(t);
        if (!t) return null;
        if (/^"/.test(t) || (/[,;]/.test(t) && t.split(/[,;]/).length <= 6)) hucre = csvBol(t);   // CSV: ilk sütun ad, ikinci sanatçı
      }
      var ad = t, ek = '';
      if (hucre) {
        hucre = hucre.map(function (h) { return h.replace(/\s+/g, ' ').trim(); }).filter(function (h) { return h && !SAYI_RE.test(h); });
        if (!hucre.length || baslikSatiriMi(hucre)) return null;
        ad = satirTemizle(hucre[0]); ek = hucre[1] || '';
      } else {
        var tire = /^(.+?)\s+[-–—|]\s+(.+)$/.exec(t);
        if (tire) { if (baslikSatiriMi([tire[1], tire[2]])) return null; ad = tire[1].trim(); ek = tire[2].trim(); }
        else if (baslikSatiriMi([t])) return null;
      }
      if (!ad || LISTE_BASLIK.test(ad) || /:$/.test(ad)) return null;   // "Konser listesi", "1. bölüm:" gibi başlıklar
      return { ham: s.trim().replace(/\t+/g, ' · '), ad: ad, ek: ek };
    }).filter(Boolean);
  }

  // Satır → en iyi eşleşen eserler (puanlı). norm = Türkçe karakter/işaret duyarsız (auth.js trNorm).
  function eslestir(satir, eserler, norm) {
    norm = norm || function (x) { return (x || '').toLowerCase().replace(/[^a-z0-9]/g, ''); };
    var adaylar = [satir.ad, satir.ek, satir.ham].filter(Boolean).map(norm).filter(function (x) { return x.length >= 2; });
    var kelime = function (x) { return (x || '').toLocaleLowerCase('tr').split(/[^\p{L}\p{N}]+/u).filter(function (k) { return k.length > 1; }).map(norm); };
    var sk = kelime(satir.ad);
    var puanli = [];
    eserler.forEach(function (w) {
      var n = norm(w.name);
      if (!n) return;
      var p = 0;
      adaylar.forEach(function (a, i) {
        var agirlik = i === 0 ? 1 : 0.85;
        if (a === n) p = Math.max(p, 100 * agirlik);
        else if (a.length >= 4 && n.length >= 4 && (n.indexOf(a) === 0 || a.indexOf(n) === 0)) p = Math.max(p, 82 * agirlik);
        else if (a.length >= 5 && n.indexOf(a) >= 0) p = Math.max(p, 70 * agirlik);
      });
      if (p < 70 && sk.length) {
        var wk = kelime(w.name), ortak = sk.filter(function (k) { return wk.indexOf(k) >= 0; }).length;
        var j = ortak / (sk.length + wk.length - ortak);
        if (j >= 0.5) p = Math.max(p, Math.round(60 * j + 20));
      }
      if (p >= 50) puanli.push({ eser: w, puan: p });
    });
    puanli.sort(function (a, b) { return b.puan - a.puan || (a.eser.name || '').length - (b.eser.name || '').length; });
    return puanli.slice(0, 4);
  }

  var api = { UZANTILAR: UZANTILAR, metinCoz: metinCoz, zipCoz: zipCoz, ayristir: ayristir, dosyalariAyristir: dosyalariAyristir,
    listeSatirlari: listeSatirlari, eslestir: eslestir, akorSatiriMi: akorSatiriMi,
    BELGE_UZANTI: BELGE_UZANTI, belgeParcalari: belgeParcalari, listeDosyasiOku: listeDosyasiOku, tabloSatirlari: tabloSatirlari };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  g.IceAktar = api;
})(typeof window !== 'undefined' ? window : globalThis);
