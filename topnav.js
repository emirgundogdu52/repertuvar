/* topnav.js — v2026-08-01-sidebar-account — masaüstü sidebar'da tema düğmesinin ÜSTÜNE
   avatar + hesap menüsü eklendi (.sb-user-x / .sb-user-dropdown / .sb-dd-item, yeni
   toggleSbDropdown + updateSbUserName). "Oturumu Kapat" artık Ayarlar sayfasının içinde
   saklı değil, iki tıkla erişilebilir; menüde Ayarlar da var. Avatar mobil topnav'daki
   ile aynı: yuvarlak altın-mavi degrade + ti-user simgesi. Menü yukarı doğru açılıyor
   (sidebar'ın en altında). .sb-nav'daki flex:1 bloğu zaten dibe ittiği için ek
   konumlandırma gerekmedi. [2026-10-25: menü artık esnemiyor; hesap bloğu ayraçla menünün hemen altında.]
   Önceki: v2026-06-30-switch-unified — sbThemeToggle/rThemeToggle/dtThemeToggle hepsi
   tek .r-theme-toggle markup'ı kullanır */

// (2026-08-30) Menü etiketleri çeviriden geçiyor. `i18n.js` yüklenmemiş bir
// sayfada da çalışsın diye Türkçe yedeğe düşüyor — topnav her sayfada var,
// biri i18n'i almayı unutursa menü boş kalmamalı.
// NOT: bu blok dosyanın AÇILIŞ YORUMUNDAN SONRA durmalı. Önce ilk satır
// sonuna eklenmişti ve yorumun İÇİNE düştü — `_m` tanımsız kaldı, menü hiç
// çizilmedi. Sözdizimi kontrolü bunu yakalayamaz; yorum geçerli koddur.
function _m(anahtar, tr) {
  try { return (window.i18n && window.i18n.t) ? window.i18n.t(anahtar, tr) : tr; }
  catch (e) { return tr; }
}

/* 2026-07-17: SYNC BAR eklendi (dosya sonu) — Supabase /rest/v1 & /auth/v1 fetch'lerinde ekranın en üstünde ince altın ilerleme çubuğu. */
(function() {
  // CSS inject
  const style = document.createElement('style');
  style.textContent = `
    html, body { overflow-x: hidden !important; max-width: 100% !important; }
    /* Yetki sistemi: TEK kaynak — her sayfada, her genişlikte geçerli. authReady'de admin/editör ise gösterilir. */
    .admin-only { display: none; }
    /* ── Sidebar (desktop ≥1024px) ── */
    @media (min-width: 1024px) {
      body { display: flex; }
      .sidebar {
        position: fixed; top: 0; left: 0; bottom: 0; width: 252px;
        background: rgba(9,9,28,0.96);
        backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
        border-right: 1px solid var(--border, rgba(48,58,85,0.38));
        display: flex; flex-direction: column;
        z-index: 300; padding-bottom: 20px;
        /* Üst güvenli alan (status bar) — sayfa içeriği bunu hesaba katıyordu ama
           sidebar top:0'dan başladığı için logo hero bölümünden yukarıda kalıyordu. */
        padding-top: env(safe-area-inset-top, 0px);
        font-family: var(--font-ui, 'Plus Jakarta Sans', sans-serif);
      }
      .sb-brand {
        padding: 18px 16px 14px;
        border-bottom: 1px solid var(--border, rgba(48,58,85,0.38));
        margin-bottom: 10px;
      }
      /* (2026-10-25) Kullanıcı: "üstteki menü grubuyla bloklayalım" — menü flex:1 ile esneyip hesap kutusunu + tema anahtarını
         yan menünün ortasına (1134 px yükseklikte 553 px'e) itiyordu; menü artık içeriği kadar, hesap bloğu ayraçla hemen altında. */
      .sb-nav { flex: none; padding: 0 10px; display: flex; flex-direction: column; gap: 2px; }
      .sb-item {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 12px; border-radius: 10px;
        font-size: 13px; font-weight: 600; color: var(--text2, #9d9bc4);
        text-decoration: none; transition: all .15s; position: relative;
        width: 100%; box-sizing: border-box;
      }
      .sb-item:hover { background: var(--surface, #19233F); color: var(--text, #FFFFFF); }
      .sb-item.active {
        background: rgba(255,200,61,0.12); color: var(--accent3, #8CC5FF);
        border: 1px solid rgba(255,200,61,0.2);
      }
      .sb-item.active::before {
        content: ''; position: absolute; left: 0; top: 20%; bottom: 20%;
        width: 3px; border-radius: 0 3px 3px 0;
        background: linear-gradient(to bottom, var(--accent, #FFC83D), var(--accent2, #4DA3FF));
      }
      .sb-divider { height: 1px; background: var(--border, rgba(48,58,85,0.38)); margin: 8px 10px; }
      .sb-stage {
        margin: 6px 10px 0;
        display: flex; align-items: center; gap: 10px;
        padding: 11px 14px; border-radius: 12px;
        font-size: 13px; font-weight: 700; color: #fff;
        text-decoration: none;
        background: linear-gradient(135deg, var(--accent, #FFC83D), var(--accent2, #4DA3FF));
        box-shadow: 0 4px 16px rgba(255,200,61,0.3);
        transition: opacity .15s;
      }
      .sb-stage:hover { opacity: .9; }
      /* main-wrap'i sidebar genişliği kadar it */
      .main-wrap, .v2-main-wrap { margin-left: 252px; flex: 1; min-width: 0; }
      /* (2026-10-30) Sağdan sola (Arapça; i18n.js html[dir=rtl] koyar): yan menü sağa, içerik sağdan itilir. */
      html[dir="rtl"] .sidebar { left: auto; right: 0; border-right: 0; border-left: 1px solid var(--border, rgba(48,58,85,0.38)); }
      html[dir="rtl"] .main-wrap, html[dir="rtl"] .v2-main-wrap { margin-left: 0; margin-right: 252px; }
      html[dir="rtl"] .sb-item.active::before { left: auto; right: 0; border-radius: 3px 0 0 3px; }
    }
    @media (max-width: 1023px) {
      .sidebar { display: none !important; }
      body { padding-bottom: 68px; }
    }

    .bottom-nav {
      position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important;
      width: 100vw !important; margin: 0 !important; z-index: 200;
      height: calc(68px + env(safe-area-inset-bottom));
      padding-bottom: env(safe-area-inset-bottom);
      background: var(--bg, #07071a);
      backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      border-top: 1px solid var(--border, rgba(48,58,85,0.38));
      display: flex; align-items: center;
      box-sizing: border-box;
    }
    @media (min-width: 1024px) { .bottom-nav { display: none !important; } }
    .bn-items { display: flex; width: 100%; padding: 0 4px; box-sizing: border-box; }
    .bn-item {
      flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 3px; padding: 7px 2px;
      text-decoration: none; color: var(--text3, #5e5c8a);
      border-radius: 10px; transition: color .15s, background .15s; position: relative;
    }
    .bn-item.active { color: var(--accent, #FFC83D); }
    .bn-label { font-size: 9px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; text-align: center; }
    .bn-stage {
      background: linear-gradient(135deg,rgba(255,200,61,0.18),rgba(77,163,255,0.08));
      border: 1px solid rgba(255,200,61,0.25);
      color: var(--accent2, #4DA3FF) !important;
      margin: 5px 2px; border-radius: 11px;
    }

    .r-topnav {
      position: sticky; top: 0; z-index: 200;
      height: auto; min-height: 66px;
      background: rgba(7,11,24,0.92);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255,200,61,0.16);
      display: flex; flex-direction: row; align-items: center;
      padding: 0 16px;
      padding-top: env(safe-area-inset-top);
      gap: 12px;
      width: 100%; box-sizing: border-box; max-width: 100vw; overflow: hidden;
    }
    /* Üst nav'ı GERÇEKTEN sabit (fixed) yap — merkezi kural, tek yerden tüm sayfalar.
       Sadece "doğal sayfa scroll" mimarisi kullanan sayfalara uygulanır (aşağıdaki JS ile
       işaretlenir). Kabuk mimarili sayfalar (eserler/repertoires/stage) body'yi zaten
       position:fixed;inset:0 ile sabitliyor ve kendi iç panellerini kaydırıyor — o sayfalarda
       topnav sticky de kalsa hiç hareket etmiyor, ayrıca onlara padding eklemek kendi
       height:calc(100vh - var(--topnav-h)) hesaplarını bozar. Bu yüzden sadece doğal-scroll
       sayfalarda fixed'e geçiyoruz. */
    html.r-natural-scroll-page .r-topnav {
      position: fixed !important; top: 0; left: 0; right: 0;
    }
    html.r-natural-scroll-page body {
      padding-top: var(--topnav-h, 66px);
    }
    .r-topnav img.r-logo {
      /* Dar telefonlarda taşmayı önle: logo ekranın en fazla %44'ünü kaplasın ve
         gerekirse küçülebilsin (flex-shrink:0 iken sağdaki avatar kesiliyordu). */
      height: 55px; width: auto; max-width: min(220px, 44vw);
      flex-shrink: 1; min-width: 0; object-fit: contain;
    }
    /* iPhone genişlikleri: logo + zil + tema + avatar tek satıra sığsın */
    @media (max-width: 430px) {
      /* (2026-10-04) Yalnız yanlar: "padding: 0 12px" kısaltması yukarıdaki
         padding-top: env(safe-area-inset-top) değerini sıfırlıyordu → iPhone'da (ve WebView
         140+ Android'de) nav durum çubuğunun/Dynamic Island'ın altında kalıyor, avatar
         dokunulamıyordu. */
      .r-topnav { padding-left: 12px; padding-right: 12px; gap: 8px; }
      .r-topnav img.r-logo { height: 40px; }
      .r-topnav .r-tn-right { gap: 6px; }
      .r-tn-bell { padding: 4px; }
      .r-tn-bell i { font-size: 18px; }
    }
    .r-topnav .r-tn-right {
      margin-left: auto;
      display: flex; flex-direction: row; align-items: center; gap: 10px;
    }
    .r-tn-user {
      display: flex; align-items: center;
      background: rgba(255,200,61,0.12);
      border: 1px solid rgba(255,200,61,0.2);
      border-radius: 50%; width: 38px; height: 38px; justify-content: center;
      flex-shrink: 0;
    }
    .r-tn-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: linear-gradient(135deg, #FFC83D, #4DA3FF);
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .r-tn-uname {
      font-size: 13px; font-weight: 600; color: #FFFFFF;
      max-width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .r-tn-user { cursor: pointer; position: relative; }
    .r-tn-dropdown {
      display: none; position: fixed; top: 60px; right: 12px;
      background: #19233F; border: 1px solid rgba(255,200,61,0.25);
      border-radius: 10px; padding: 6px; min-width: 140px; z-index: 9999;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }
    .r-tn-dropdown.open { display: block; }
    /* (2026-10-25) Kullanıcı: "avatar altındaki açılır menünün font büyüklüklerini kontrol et" — öğe 13 px / 32 px (parmak için
       küçük) → 15 px / 44 px; menü başı ad 12 → 14; GRUPLARIM 10 → 12; yan menü (masaüstü) öğesi 12.5 / 31 → 14 / 38 (dokunmatikte 44). */
    .r-tn-dd-item {
      display: flex; align-items: center; gap: 10px; min-height: 44px;
      padding: 10px 14px; border-radius: 8px;
      font-size: 15px; color: #9d9bc4; cursor: pointer;
      font-family: inherit; background: none; border: none; width: 100%;
      text-align: left; transition: all .15s;
    }
    .r-tn-dd-item:hover { background: rgba(255,200,61,0.12); color: #FFFFFF; }
    .r-tn-dd-item.danger { color: #f87171; }
    .r-tn-dd-item.danger:hover { background: rgba(248,113,113,0.1); }
    .r-tn-logout { display: none; }

    /* ── Light Theme ── */
    :root[data-theme="light"],
    [data-theme="light"] {
      --bg:       #f5f4fb;
      --bg2:      #ede9fb;
      --surface:  #ffffff;
      --surface2: #F0F1F5;
      --border:   #E5E7EB;
      --border2:  #D0D3DA;
      --accent:   #E5A900;
      --accent2:  #0B6FDE;
      --accent3:  #8CC5FF;
      --text:     #111827;
      --text2:    #667085;
      --text3:    #9390b0;
      --green:    #00b894;
    }
    [data-theme="light"] body,
    [data-theme="light"] { background: var(--bg); color: var(--text); }
    [data-theme="light"] .r-topnav {
      background: rgba(245,246,250,0.95);
      border-bottom-color: rgba(255,200,61,0.15);
    }
    [data-theme="light"] .r-tn-user { background: rgba(255,200,61,0.08); }
    [data-theme="light"] .r-tn-uname { color: #111827; }
    [data-theme="light"] .r-tn-dropdown { background: #ffffff; box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
    [data-theme="light"] .r-tn-dd-item { color: #667085; }
    [data-theme="light"] .r-tn-dd-item:hover { color: #111827; }
    [data-theme="light"] .sidebar,
    [data-theme="light"] aside.sidebar,
    [data-theme="light"] .v2-sidebar { background: #ffffff !important; border-right-color: rgba(255,200,61,0.15) !important; }
    [data-theme="light"] .v2-sb-divider { background: rgba(255,200,61,0.25) !important; }
    [data-theme="light"] .v2-sb-item { color: #667085 !important; }
    [data-theme="light"] .v2-sb-item:hover { background: rgba(255,200,61,0.08) !important; color: #111827 !important; }
    [data-theme="light"] .v2-sb-item.active { background: rgba(255,200,61,0.1) !important; color: #E5A900 !important; }
    [data-theme="light"] .v2-sb-label { color: #9390b0 !important; }
    [data-theme="light"] .v2-sb-uname { color: #111827 !important; }
    [data-theme="light"] .v2-sb-urole { color: #9390b0 !important; }
    [data-theme="light"] .sb-item { color: #667085 !important; }
    [data-theme="light"] .sb-item:hover { background: rgba(255,200,61,0.08) !important; color: #111827 !important; }
    [data-theme="light"] .sb-item.active { background: rgba(255,200,61,0.1) !important; color: #E5A900 !important; }
    [data-theme="light"] .sb-label { color: #9390b0 !important; }
    [data-theme="light"] .sb-appname { color: #111827 !important; }
    [data-theme="light"] .sb-domain { color: #9390b0 !important; }
    [data-theme="light"] .sb-divider { background: rgba(255,200,61,0.15) !important; }
    [data-theme="light"] .sb-user-x { background: #F0F1F5 !important; border-color: rgba(255,200,61,0.2) !important; }
    [data-theme="light"] .sb-uname { color: #111827 !important; }
    [data-theme="light"] .sb-urole { color: #9390b0 !important; }
    [data-theme="light"] .desktop-topbar { background: rgba(245,246,250,0.95) !important; border-bottom-color: rgba(255,200,61,0.15) !important; }
    [data-theme="light"] .v2-desktop-topbar { background: rgba(245,246,250,0.95) !important; border-bottom-color: rgba(255,200,61,0.15) !important; }
    [data-theme="light"] .dt-crumb { color: #667085 !important; }
    [data-theme="light"] .dt-search { background: #ffffff !important; color: #9390b0 !important; }
    [data-theme="light"] .dt-user-dropdown { background: #ffffff; box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
    [data-theme="light"] .dt-user-name { color: #111827; }
    [data-theme="light"] .dt-user-badge { background: rgba(255,200,61,0.08) !important; }
    [data-theme="light"] .dt-user-dd-item { color: #667085; }
    [data-theme="light"] .dt-user-dd-item:hover { color: #111827; }
    [data-theme="light"] .bottom-nav { background: rgba(245,246,250,0.97) !important; border-top-color: rgba(255,200,61,0.15) !important; }
    [data-theme="light"] .bn-item { color: #9390b0 !important; }
    [data-theme="light"] .bn-item.active { color: #E5A900 !important; }
    [data-theme="light"] .v2-bottom-nav { background: rgba(245,246,250,0.97) !important; border-top-color: rgba(255,200,61,0.15) !important; }
    [data-theme="light"] .v2-bn-item { color: #9390b0 !important; }
    [data-theme="light"] .v2-bn-item.active { color: #E5A900 !important; }
    [data-theme="light"] .v2-topnav { background: rgba(245,246,250,0.95) !important; border-bottom-color: rgba(255,200,61,0.15) !important; }
    [data-theme="light"] .bn-stage { background: rgba(255,200,61,0.1) !important; border-color: rgba(255,200,61,0.2) !important; }

    /* ── Genel sayfa elemanları ── */
    [data-theme="light"] body { background: #f5f4fb !important; color: #111827 !important; }
    [data-theme="light"] .page, [data-theme="light"] .main-wrap, [data-theme="light"] .v2-main-wrap { background: #f5f4fb; }

    /* Kartlar ve yüzeyler */
    [data-theme="light"] .card, [data-theme="light"] .member-card,
    [data-theme="light"] .work-card, [data-theme="light"] .rep-card,
    [data-theme="light"] .sol-card, [data-theme="light"] .settings-card,
    [data-theme="light"] .panel, [data-theme="light"] .detail-panel,
    [data-theme="light"] .stat-pill,
    [data-theme="light"] .work-row, [data-theme="light"] .eser-row,
    [data-theme="light"] .stage-banner { background: #ffffff !important; border-color: rgba(255,200,61,0.18) !important; }
    [data-theme="light"] .active-card { background: #ffffff !important; border: none !important; }

    [data-theme="light"] .work-row:hover, [data-theme="light"] .eser-row:hover { background: #F0F1F5 !important; }
    [data-theme="light"] .work-row.zebra { background: #F0F1F5 !important; }

    /* Input, textarea, select — (2026-10-25) yalnız ESKİ tasarımda: yeni tasarımda (v3) her girdiyi beyaz zemin + soluk sarı
       kenarlığa zorluyordu (gri kutu içinde beyaz kutu, nötr açık paletle uyumsuz). v3'te girdiler sayfanın kendi kurallarındaki
       palet değişkenlerini (--surface2 / --border) kullanır; 17 sayfa tarandı, kural kalkınca koyu kalan girdi yok. */
    html:not([data-tasarim="v3"])[data-theme="light"] input, html:not([data-tasarim="v3"])[data-theme="light"] textarea,
    html:not([data-tasarim="v3"])[data-theme="light"] select {
      background: #ffffff !important; color: #111827 !important;
      border-color: rgba(255,200,61,0.25) !important;
    }
    html:not([data-tasarim="v3"])[data-theme="light"] input::placeholder,
    html:not([data-tasarim="v3"])[data-theme="light"] textarea::placeholder { color: #9390b0 !important; }
    [data-theme="light"] input:focus, [data-theme="light"] textarea:focus, [data-theme="light"] select:focus {
      border-color: #E5A900 !important;
    }

    /* Butonlar */
    [data-theme="light"] .btn, [data-theme="light"] .btn-sm,
    [data-theme="light"] .role-btn, [data-theme="light"] .tab-btn {
      background: #ffffff !important; color: #667085 !important;
      border-color: rgba(255,200,61,0.2) !important;
    }
    [data-theme="light"] .btn:hover, [data-theme="light"] .btn-sm:hover { background: #F0F1F5 !important; }

    /* Metinler */
    [data-theme="light"] h1, [data-theme="light"] h2, [data-theme="light"] h3,
    [data-theme="light"] .sec-title, [data-theme="light"] .card-title,
    [data-theme="light"] .work-name, [data-theme="light"] .member-email,
    [data-theme="light"] .rep-name, [data-theme="light"] .sol-name { color: #111827 !important; }
    [data-theme="light"] .work-sub, [data-theme="light"] .member-meta,
    [data-theme="light"] .rep-meta, [data-theme="light"] .sol-meta,
    [data-theme="light"] .sec-action { color: #667085 !important; }

    /* Topnav mobil */
    [data-theme="light"] .topnav { background: rgba(245,246,250,0.95) !important; border-bottom-color: rgba(255,200,61,0.15) !important; }
    [data-theme="light"] .tn-name { color: #111827 !important; }
    [data-theme="light"] .tn-domain { color: #9390b0 !important; background: #F0F1F5 !important; }
    [data-theme="light"] .tn-user { background: rgba(255,200,61,0.08) !important; border-color: rgba(255,200,61,0.15) !important; }
    [data-theme="light"] .tn-uname { color: #111827 !important; }

    /* Tab nav */
    [data-theme="light"] .tabnav { background: rgba(245,246,250,0.95) !important; border-color: rgba(255,200,61,0.15) !important; }
    [data-theme="light"] .tn-tab { color: #9390b0 !important; }
    [data-theme="light"] .tn-tab.active { color: #E5A900 !important; border-bottom-color: #E5A900 !important; }

    /* Badge, pill, tag */
    [data-theme="light"] .wb { background: #F0F1F5 !important; border-color: rgba(255,200,61,0.2) !important; color: #667085 !important; }
    [data-theme="light"] .wb-key { color: #E5A900 !important; }
    [data-theme="light"] .meta-badge { background: rgba(255,200,61,0.08) !important; color: #E5A900 !important; }
    [data-theme="light"] .role-badge { background: #F0F1F5 !important; color: #E5A900 !important; }

    /* Arama kutusu */
    [data-theme="light"] .search-bar, [data-theme="light"] .search-wrap { background: #ffffff !important; border-color: rgba(255,200,61,0.2) !important; }
    [data-theme="light"] .search-bar input { background: transparent !important; }

    /* Modal / overlay */
    [data-theme="light"] .modal-box, [data-theme="light"] .confirm-box { background: #ffffff !important; border-color: rgba(255,200,61,0.2) !important; }
    [data-theme="light"] .modal-overlay { background: rgba(0,0,0,0.3) !important; }

    /* Divider */
    [data-theme="light"] hr, [data-theme="light"] .divider { border-color: rgba(255,200,61,0.12) !important; }

    /* Chord / lyric area */
    [data-theme="light"] .chord-line { color: #E5A900 !important; }
    [data-theme="light"] .lyric-line { color: #111827 !important; }
    [data-theme="light"] .gufte-area { background: #F5F6FA !important; border-color: rgba(255,200,61,0.15) !important; }

    /* Tabs (eser detay) */
    [data-theme="light"] .tab-bar { background: #F0F1F5 !important; border-color: rgba(255,200,61,0.15) !important; }
    [data-theme="light"] .tab-btn.active { background: #E5A900 !important; color: #fff !important; }

    /* Scrollbar */
    [data-theme="light"] ::-webkit-scrollbar-track { background: #f5f4fb !important; }
    [data-theme="light"] ::-webkit-scrollbar-thumb { background: rgba(255,200,61,0.2) !important; }

    /* ── Theme Toggle Switch ── */
    /* (2026-10-08) Büyütüldü (38×20 → 44×24, top 16 → 20) ve emoji yerine Tabler ikonu: 9px ☀️/🌙 sarı→mavi
       degrade topta iki temada da seçilmiyordu. Top marka sarısı + koyu ikon (iki temada aynı, ~12:1); konum = tema. */
    .r-theme-toggle {
      position: relative; border: none; border-radius: 16px !important;
      width: 44px !important; height: 24px !important; min-height: 0 !important;
      cursor: pointer; flex-shrink: 0;
      padding: 2px; transition: background .2s;
      background: rgba(255,255,255,0.16); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.10);
    }
    [data-theme="light"] .r-theme-toggle { background: rgba(17,23,34,0.12); box-shadow: inset 0 0 0 1px rgba(17,23,34,0.10); }
    .r-theme-toggle .toggle-knob {
      position: absolute; top: 2px; left: 2px;
      width: 20px; height: 20px; border-radius: 50%;
      background: #FFC83D; color: #1A1305; box-shadow: 0 1px 3px rgba(0,0,0,0.30);
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; line-height: 1; transition: left .2s;
    }
    .r-theme-toggle .toggle-knob .ti { font-size: 14px; line-height: 1; }
    [data-theme="light"] .r-theme-toggle .toggle-knob { left: 22px; }

    /* Desktop topbar'daki switch'e küçük sağ boşluk */
    .v2-desktop-topbar .r-theme-toggle { margin-right: 4px; }

    /* ── Sidebar kullanıcı bloğu (avatar + Ayarlar/Çıkış) — tema düğmesinin ÜSTÜNDE ── */
    .sb-user-x {
      display: flex; align-items: center; gap: 9px;
      margin: 4px 12px 6px; padding: 7px 10px;
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--border, rgba(140,120,255,0.28));
      border-radius: 10px; cursor: pointer; position: relative;
      transition: background .15s;
    }
    .sb-user-x:hover { background: rgba(124,111,255,0.12); }
    /* (2026-10-25) Tema anahtarı hesap kutusuyla aynı çerçeveli satırda. Kullanıcı: anahtar kutunun kenarına (12 px) hizalanınca
       "sola kayıyor", avatara (23 px) hizalanınca "sağa kaymış görünüyor" — iki referans çizgi 11 px ayrık. Satır hesap kutusunun
       sınıfını paylaşır (zemin, kenarlık, açık tema): çerçeveler 12 px'te üst üste, anahtar içeride avatarla aynı 23 px çizgide.
       Yükseklik 48 (anahtar 30 + 8 + 8 + kenarlık) = hesap kutusu; satırın tamamı tıklanır. */
    .sb-tema { margin-top: 0; padding-top: 8px; padding-bottom: 8px; }
    .sb-divider-hesap { margin: 8px 20px 4px; }   /* menüdeki ayraçla aynı genişlik (menü iç payı 10 + ayraç payı 10) */
    .sb-user-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: linear-gradient(135deg, #FFC83D, #4DA3FF);
      display: flex; align-items: center; justify-content: center;
      color: #fff; flex-shrink: 0;
    }
    .sb-user-name {
      font-size: 12.5px; font-weight: 600; color: var(--text2, #9d9bc4);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;
    }
    .sb-user-dropdown {
      display: none; position: absolute; bottom: calc(100% + 6px); left: 0; right: 0;
      background: var(--surface, #19233F); border: 1px solid var(--border, rgba(255,200,61,0.25));
      border-radius: 10px; padding: 5px; z-index: 9999;
      box-shadow: 0 8px 24px rgba(0,0,0,0.45);
    }
    .sb-user-dropdown.open { display: block; }
    .sb-dd-item {
      display: flex; align-items: center; gap: 8px;
      min-height: 38px; padding: 8px 12px; border-radius: 8px;
      font-size: 14px; font-weight: 600; color: var(--text2, #9d9bc4);
      text-decoration: none; cursor: pointer; background: none; border: none;
      width: 100%; text-align: left; font-family: inherit; transition: all .15s;
    }
    .sb-dd-item:hover { background: rgba(124,111,255,0.14); color: var(--text, #fff); }
    .sb-dd-item.danger { color: #f87171; }
    .sb-dd-item.danger:hover { background: rgba(248,113,113,0.1); }

    /* ── Grup değiştirici (2026-08-06) — çoklu grup üyeliği ──
       Bir kullanıcı birden fazla gruba üye olabilir; menüdeki bu bölüm
       AKTİF grubu seçer (profiles.group_id). İki grup ya da fazlası yoksa
       hiç çizilmez. */
    @media (hover: none) and (pointer: coarse) { .sb-dd-item { min-height: 44px; } }
    .r-grp-head {
      font-size: 12px; font-weight: 700; letter-spacing: .06em;
      color: var(--text3, #78829A); padding: 6px 11px 4px; text-transform: uppercase;
    }
    .r-grp-sep { height: 1px; background: var(--border, rgba(255,200,61,0.18)); margin: 5px 6px; }
    /* Nokta İKON DEĞİL, CSS ile çiziliyor: ti-circle-check-filled webfont
       sürümümüzde yok ve aktif grupta hiçbir şey görünmüyordu (2026-08-06). */
    .r-grp-dot {
      width: 13px; height: 13px; border-radius: 50%; flex-shrink: 0;
      border: 2px solid var(--text3, #78829A); box-sizing: border-box;
    }
    .r-grp-dot.on {
      border-color: var(--accent, #FFC83D);
      background: var(--accent, #FFC83D);
      box-shadow: 0 0 0 3px rgba(255,200,61,0.18);
    }
    
    @media (min-width: 1024px) { .r-topnav { display: none !important; } }
    @media (min-width: 1024px) {
      .v2-sb-user { display: none !important; }
      .dt-user-badge {
        display: flex; align-items: center; gap: 8px;
        background: rgba(255,200,61,0.08);
        border: 1px solid rgba(255,200,61,0.2);
        border-radius: 20px; padding: 5px 14px 5px 8px;
        cursor: pointer; position: relative;
      }
      .dt-user-badge:hover { background: rgba(255,200,61,0.15); }
      .dt-user-avatar {
        width: 28px; height: 28px; border-radius: 50%;
        background: linear-gradient(135deg, #FFC83D, #4DA3FF);
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0;
      }
      .dt-user-name {
        font-size: 13px; font-weight: 600; color: #FFFFFF;
        max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .dt-user-dropdown {
        display: none; position: absolute; top: calc(100% + 6px); right: 0;
        background: #19233F; border: 1px solid rgba(255,200,61,0.25);
        border-radius: 10px; padding: 6px; min-width: 150px; z-index: 9999;
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      }
      .dt-user-dropdown.open { display: block; }
      .dt-user-dd-item {
        display: flex; align-items: center; gap: 8px;
        padding: 8px 12px; border-radius: 7px;
        font-size: 13px; color: #9d9bc4; cursor: pointer;
        font-family: inherit; background: none; border: none; width: 100%;
        text-align: left; transition: all .15s;
      }
      .dt-user-dd-item:hover { background: rgba(255,200,61,0.12); color: #FFFFFF; }
      .dt-user-dd-item.danger { color: #f87171; }
      .dt-user-dd-item.danger:hover { background: rgba(248,113,113,0.1); }
    }
  `;
  document.head.appendChild(style);

  // ── Theme Toggle: tek standart kaynak ──
  // Tüm sayfalarda (sidebar, mobil header, eski desktop topbar) aynı switch.
  function themeToggleMarkup(id, theme) {
    return `<button id="${id}" class="r-theme-toggle" title="${_m('menu.temaDegistir','Tema değiştir')}" aria-label="${_m('menu.temaDegistir','Tema değiştir')}"><span class="toggle-knob">${temaIkonu(theme)}</span></button>`;
  }
  function bindThemeToggle(id) {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', function(e) { e.stopPropagation(); window.toggleTheme(e); });
  }
  function temaIkonu(theme) {
    return '<i class="ti ti-' + (theme === 'light' ? 'sun' : 'moon') + '" aria-hidden="true"></i>';
  }
  function syncThemeToggles(theme) {
    document.querySelectorAll('.r-theme-toggle .toggle-knob').forEach(knob => { knob.innerHTML = temaIkonu(theme); });
  }

  // (2026-10-08) Yeni tasarımda açık modda da koyu logo — siyah plaka içinde (tasarim.css).
  // logo_light.png açık zeminde silik kalıyordu (sarı .app krem/beyaz üstünde). Eski tasarım aynen.
  // (2026-10-24 deneme, cam barlar) Cam sayfalarında ÜST BAR beyaz camda → açık temada açık logo; yan menü siyah kalır.
  // (2026-10-25) Yan menü açık temada BEYAZ (tasarim.css) → yan menüde açık logo, plakasız — kullanıcı: "açık modda desktopta telefon
  // ve tabletteki logo şeklini kullanalım". Yalnız yan menü (yanMenu); diğer yerler eski kural.
  function logoDosyasi(isLight, ustBar, yanMenu) {
    const h = document.documentElement;
    if (yanMenu && h.getAttribute('data-tasarim') === 'v3') return isLight ? 'logo_light.png' : 'logo_dark.png';
    const koyuZemin = h.getAttribute('data-tasarim') === 'v3' && !(ustBar && h.hasAttribute('data-cam'));
    return (isLight && !koyuZemin) ? 'logo_light.png' : 'logo_dark.png';
  }

  // HTML inject
  function render() {
    const container = document.getElementById('r-topnav-container');
    if (!container) return;
    const _theme = localStorage.getItem('r_theme') || 'dark';
    const _logo = logoDosyasi(_theme === 'light', true);
    container.innerHTML = `
      <header class="r-topnav">
        <img src="${_logo}" alt="repertuvar.app" class="r-logo" id="rNavLogo">
        <div class="r-tn-right">
          <button class="r-tn-bell" id="rTnBell" onclick="toggleNotifPanel(event)" title="${_m('menu.bildirimler','Bildirimler')}" aria-label="${_m('menu.bildirimler','Bildirimler')}"><i class="ti ti-bell"></i><span id="rTnBellBadge"></span></button>
          ${themeToggleMarkup('rThemeToggle', _theme)}
          <div class="r-tn-user" onclick="toggleTnDropdown(event)" id="rTnUser" role="button" tabindex="0" aria-label="${_m('menu.profil','Profil')}">
            <div class="r-tn-avatar" id="rTnAvatar"><i class="ti ti-user" style="font-size:16px;"></i></div>
          </div>
        </div>
      </header>
    `;
  }

  // (2026-10-17) Yerel kaçış — topnav.js bazı sayfalarda auth.js'ten (htmlKac) ÖNCE yükleniyor (uyeler.html)
  function _tnKac(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // Desktop topbar'a user badge inject et
  function injectDesktopBadge(name, ini) {
    const topbar = document.querySelector('.v2-desktop-topbar');
    if (!topbar || topbar.querySelector('.dt-user-badge')) return;
    const badge = document.createElement('div');
    badge.className = 'dt-user-badge';
    badge.id = 'dtUserBadge';
    badge.innerHTML = `
      <div class="dt-user-avatar" id="dtUserAvatar">${_tnKac(ini)}</div>
      <span class="dt-user-name" id="dtUserName">${_tnKac(name)}</span>
      <div class="dt-user-dropdown" id="dtUserDropdown">
        <button class="dt-user-dd-item danger" onclick="logout()">
          <i class="ti ti-logout" style="font-size:15px;" aria-hidden="true"></i> ${_m('menu.cikis','Çıkış Yap')}
        </button>
      </div>
    `;
    badge.addEventListener('click', function(e) {
      e.stopPropagation();
      const dd = document.getElementById('dtUserDropdown');
      if (dd) dd.classList.toggle('open');
    });
    // Tema toggle desktop — standart switch
    if (!topbar.querySelector('.r-theme-toggle')) {
      const theme = document.documentElement.getAttribute('data-theme') || 'dark';
      topbar.insertAdjacentHTML('beforeend', themeToggleMarkup('dtThemeToggle', theme));
      bindThemeToggle('dtThemeToggle');
    }
    topbar.appendChild(badge);
  }

  // User info fill
  function fillUser() {
    if (typeof getUser !== 'function') return;
    const u = getUser();
    if (!u) return;
    const name = u?.user_metadata?.full_name || u?.email?.split('@')[0] || '—';
    const ini = name.charAt(0).toUpperCase();
    // Mobile topnav
    const av = document.getElementById('rTnAvatar');
    const un = document.getElementById('rTnUserName');
    // Avatar ikonu sabit kalır, sadece dropdown'daki ismi güncelle
    if (un) un.textContent = name;
    const dn = document.getElementById('rTnUserNameDisplay');
    if (dn) dn.textContent = name;
    // Desktop topbar
    injectDesktopBadge(name, ini);
  }

  function attachToggle() {
    bindThemeToggle('rThemeToggle');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      render();
      attachToggle();
      applyTheme(localStorage.getItem('r_theme') || 'dark');
      setTimeout(fillUser, 400);
    });
  } else {
    render();
    attachToggle();
    applyTheme(localStorage.getItem('r_theme') || 'dark');
    setTimeout(fillUser, 400);
  }
  // ── Sidebar hesap menüsü (masaüstü) ──────────────────────────────────────
  // Oturumu Kapat artık Ayarlar sayfasının içinde saklı değil; tema düğmesinin
  // üstündeki avatara tıklayınca açılan menüde. Mobil avatar menüsüyle aynı içerik.
  function updateSbUserName() {
    const el = document.getElementById('sbUserName');
    if (!el) return;
    let n = '—';
    try {
      const u = (typeof getUser === 'function') ? getUser() : JSON.parse(localStorage.getItem('sb_user') || 'null');
      if (u) n = u?.user_metadata?.full_name || (u?.email ? u.email.split('@')[0] : '—');
    } catch (e) {}
    el.textContent = n;
  }
  window.toggleSbDropdown = function(e) {
    e.stopPropagation();
    const dd = document.getElementById('sbUserDropdown');
    if (!dd) return;
    // Menü içindeki bağlantıya tıklandıysa kapatma/aç-kapa yapma, gitsin
    if (e.target.closest && e.target.closest('.sb-dd-item')) return;
    dd.classList.toggle('open');
    updateSbUserName();
    try { refreshGroupMenus(); } catch(e) {}
    if (dd.classList.contains('open')) {
      document.addEventListener('click', function _c() {
        dd.classList.remove('open');
        document.removeEventListener('click', _c);
      });
    }
  };

  // ── GRUP DEĞİŞTİRİCİ (2026-08-06) ──────────────────────────────────────
  // Çoklu grup üyeliği: üyelik group_members'ta, AKTİF grup profiles.group_id'de.
  // Menüde yalnızca 2+ grup varsa görünür. Seçim auth.js'teki setActiveGroup()
  // üzerinden gider (profiles PATCH + offline sync), sonra sayfa yenilenir —
  // repertuvar/solist listeleri aktif gruba göre çekildiği için tam tazeleme şart.
  function _grpEsc(s) { return (s == null ? '' : String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function groupMenuHtml(itemClass) {
    const groups = (typeof getMyGroups === 'function') ? getMyGroups() : [];
    if (!groups || groups.length < 2) return '';
    const active = (typeof getGroupId === 'function') ? getGroupId() : null;
    const rows = groups.map(g => {
      const on = g.id === active;
      return '<button class="' + itemClass + '" onclick="rSwitchGroup(\'' + g.id + '\')" title="' + _grpEsc(g.name) + '">'
           + '<span class="r-grp-dot' + (on ? ' on' : '') + '" aria-hidden="true"></span>'
           + '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + _grpEsc(g.name) + '</span>'
           + '</button>';
    }).join('');
    return '<div class="r-grp-head">' + _m('menu.aktifGrup','Aktif grup') + '</div>' + rows + '<div class="r-grp-sep"></div>';
  }

  // (2026-08-06) TELEFONDA YÖNETİM. Sol menü yalnızca >=1024px'te çiziliyor ve
  // alt çubuk zaten dolu; Yönetim girişi telefonda hiçbir yerde görünmüyordu.
  // Metronom'da uygulanan çözümün aynısı: avatar/hesap menüsüne konuyor.
  // Aynı YÜZEYDE tekrar yok — sol menü görünürken bu menüye eklenmiyor.
  function adminMenuHtml() {
    const ADMIN_ID = '4f965624-e524-4cb0-a351-3368f1297d28';
    let u = null;
    try { u = JSON.parse(localStorage.getItem('sb_user')); } catch(e) {}
    const rol = localStorage.getItem('user_role') || '';
    const yetkili = (u && u.id === ADMIN_ID) || rol === 'admin' || rol === 'editor';
    if (!yetkili) return '';
    return '<a href="yonetim.html" class="r-tn-dd-item">'
         + '<i class="ti ti-shield-lock" style="font-size:15px;"></i> '
         + _m('menu.yonetim','Yönetim') + '</a>';
  }

  function refreshGroupMenus() {
    const sb = document.getElementById('sbGroups');
    if (sb) sb.innerHTML = groupMenuHtml('sb-dd-item');
    const tn = document.getElementById('rTnGroups');
    if (tn) tn.innerHTML = groupMenuHtml('r-tn-dd-item');
    const ad = document.getElementById('rTnAdmin');
    if (ad) ad.innerHTML = adminMenuHtml();
  }
  window.refreshGroupMenus = refreshGroupMenus;

  window.rSwitchGroup = async function(gid) {
    if (typeof setActiveGroup !== 'function') return;
    if (typeof getGroupId === 'function' && getGroupId() === gid) return;
    document.querySelectorAll('.sb-user-dropdown, .r-tn-dropdown').forEach(function(d) { d.classList.remove('open'); });
    const ok = await setActiveGroup(gid);
    if (ok) location.reload();
    else alert(_m('menu.grupDegisemedi','Grup değiştirilemedi. Bağlantınızı kontrol edip tekrar deneyin.'));
  };

  // Üyelik listesi arka planda tazelenince menüyü yeniden çiz.
  window.addEventListener('groups-loaded', function() { try { refreshGroupMenus(); } catch(e) {} });

  window.toggleTnDropdown = function(e) {
    e.stopPropagation();
    let dd = document.getElementById('rTnDropdown');
    if (!dd) {
      dd = document.createElement('div');
      dd.id = 'rTnDropdown';
      dd.className = 'r-tn-dropdown';
      dd.innerHTML = `
        <div style="padding:8px 12px 6px;border-bottom:1px solid rgba(255,200,61,0.15);margin-bottom:4px;">
          <div id="rTnUserName" style="font-size:14px;font-weight:600;color:#FFFFFF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;">—</div>
        </div>
        <div id="rTnGroups"></div>
        <div id="rTnAdmin"></div>
        <a href="calisma.html" class="r-tn-dd-item">
          <i class="ti ti-headphones" style="font-size:15px;"></i> ${_m('menu.calismaodasi','Çalışma Odası')}
        </a>
        <a href="ayarlar.html" class="r-tn-dd-item">
          <i class="ti ti-settings" style="font-size:15px;"></i> ${_m('menu.ayarlar','Ayarlar')}
        </a>
        <button class="r-tn-dd-item danger" onclick="logout()">
          <i class="ti ti-logout" style="font-size:15px;"></i> ${_m('menu.cikis','Çıkış Yap')}
        </button>`;
      document.body.appendChild(dd);
      // Dışarı tıklayınca kapat
      document.addEventListener('click', function() { dd.classList.remove('open'); });
    }
    // Pozisyonu avatar'a göre ayarla
    const user = document.getElementById('rTnUser');
    if (user) {
      const rect = user.getBoundingClientRect();
      dd.style.top = (rect.bottom + 6) + 'px';
      dd.style.right = (window.innerWidth - rect.right) + 'px';
    }
    dd.classList.toggle('open');
    try { refreshGroupMenus(); } catch(e) {}
    // User adını güncelle
    const un = document.getElementById('rTnUserName');
    if (un && typeof getUser === 'function') {
      const u = getUser();
      if (u) un.textContent = u?.user_metadata?.full_name || u?.email?.split('@')[0] || '—';
    }
  };

  // ── Ekran döndüğünde/boyut değiştiğinde navigasyonu YENİDEN değerlendir ──
  // Eskiden sidebar/alt menü kararı SAYFA YÜKLENİRKEN bir kez veriliyordu. iPad mini
  // dikeyde 744px (alt menü basılır), yatayda 1133px olur — CSS ≥1024'te alt menüyü
  // ve üst çubuğu gizler ama sidebar hiç oluşturulmadığı için ekranda HİÇ menü kalmaz.
  // Artık iki yön için de eksik olan nav çağrıldığında kurulur.
  let _navResizeT = null;
  function reevaluateNav() {
    clearTimeout(_navResizeT);
    _navResizeT = setTimeout(function() {
      try {
        if (window.innerWidth >= 1024) {
          if (!document.getElementById('r-sidebar')) renderSidebar();
        } else {
          const bn = document.getElementById('r-bottom-nav');
          const wantRoomy = window.innerWidth >= 600 ? '1' : '0';
          // Eşik değiştiyse (telefon ↔ tablet genişliği) listeyi yeniden kur,
          // yoksa Solistler/Grup-Koro öğeleri eski halinde kalır.
          if (bn && bn.dataset.roomy !== wantRoomy) { bn.remove(); renderBottomNav(); }
          else if (!bn) renderBottomNav();
        }
        if (typeof loadMsgBadge === 'function') loadMsgBadge();
        if (typeof loadNotifBadge === 'function') loadNotifBadge();
      } catch (e) { console.warn('[topnav] nav yeniden kurulamadı:', e); }
    }, 150);
  }
  window.addEventListener('resize', reevaluateNav);
  window.addEventListener('orientationchange', reevaluateNav);

  // ── Sidebar render — tüm sayfalarda otomatik ──
  // (2026-08-06) ROL GEÇ GELİRSE MENÜYÜ YENİDEN ÇİZ.
  // Menü ağ beklememek için `localStorage.user_role`'e bakıyor; ama giriş
  // sonrası ilk çizimde bu anahtar HENÜZ YAZILMAMIŞ olabiliyor ve admin
  // "Yönetim" girişini göremiyordu (Emir bildirdi; rol sorulduğunda 'admin'
  // çıkıyordu, yani yalnızca zamanlama sorunuydu). auth.js rolü çekince
  // `user-role-loaded` yayıyor, burada menü tazeleniyor. Ters yön de önemli:
  // rol düşerse (üye olarak giriş) yanlışlıkla görünen giriş kalkıyor.
  let _sonRol = null;
  window.addEventListener('user-role-loaded', function () {
    const yeni = (localStorage.getItem('user_role') || '') + '|' +
                 ((JSON.parse(localStorage.getItem('sb_user') || '{}') || {}).id || '');
    if (yeni === _sonRol) return;          // değişmediyse boşuna çizme
    _sonRol = yeni;
    const eski = document.getElementById('r-sidebar');
    if (eski) { eski.remove(); renderSidebar(); }
    const alt = document.getElementById('r-bottom-nav');   // gerçek id (renderBottomNav :815)
    if (alt && typeof renderBottomNav === 'function') { alt.remove(); renderBottomNav(); }
  });
  // (2026-10-30) Dil sayfa açıkken değişince menü etiketleri eski dilde kalıyordu (Emir: Azerbaycanca seçince alt menü
  // Türkçe). Çoğu durumda i18n.js sayfayı zaten yeniler; yenilenmeyen durumlarda (Sahne Modu, açılıştan sonra profilden
  // gelen dil) yan menü ve alt menü yeni dilde yeniden kurulur.
  window.addEventListener('dil-degisti', function () {
    try {
      const eski = document.getElementById('r-sidebar');
      if (eski) { eski.remove(); renderSidebar(); }
      const alt = document.getElementById('r-bottom-nav');
      if (alt) { const gizli = alt.style.display; alt.remove(); renderBottomNav(); const yeni = document.getElementById('r-bottom-nav'); if (yeni) yeni.style.display = gizli; }
    } catch (e) { console.warn('[topnav] dil değişince menü yeniden kurulamadı:', e); }
  });

  // (2026-10-31) Emir: Ayarlar'da "Ana Sayfa'yı kapat" (uygulamayı iyi tanıyan için). Açıkken Ana Sayfa menülerden kalkar;
  // index.html açılışta eserler.html'e yönlendirir. Ayar cihazda (localStorage anaSayfaKapali), ayarlar.html yazar.
  function _anaSayfaKapali() { try { return localStorage.getItem('anaSayfaKapali') === '1'; } catch (e) { return false; } }

  function renderSidebar() {
    if (window.innerWidth < 1024) return;
    if (document.getElementById('r-sidebar')) return;

    const page = window.location.pathname.split('/').pop() || 'index.html';
    const theme = localStorage.getItem('r_theme') || 'dark';
    const logo = logoDosyasi(theme === 'light', false, true);

    // localStorage'dan role kontrolü — network beklemeden
    const ADMIN_ID = '4f965624-e524-4cb0-a351-3368f1297d28';
    const savedUser = (() => { try { return JSON.parse(localStorage.getItem('sb_user')); } catch(e) { return null; } })();
    const savedRole = localStorage.getItem('user_role') || '';
    const isAdminNow = savedUser?.id === ADMIN_ID || savedRole === 'admin';
    const isEditorNow = isAdminNow || savedRole === 'editor';

    // (2026-10-31) Emir: sıra Grup / Koro, sonra Solistler (alt menüyle aynı).
    const navItems = [
      ...(_anaSayfaKapali() ? [] : [{ href: 'index.html', icon: 'ti-home', label: _m('menu.anasayfa','Ana Sayfa') }]),
      { href: 'eserler.html',     icon: 'ti-book',        label: _m('menu.eserler','Eserler') },
      { href: 'repertoires.html', icon: 'ti-playlist',    label: _m('menu.repertuvarlar','Repertuvarlar') },
      { href: 'gruplar.html',     icon: 'ti-users-group', label: _m('menu.grup','Grup / Koro') },
      { href: 'artiesten.html',   icon: 'ti-microphone',  label: _m('menu.solistler','Solistler') },
      // 2026-08-05: Metronom — bağımsız çalışma aracı, eser/repertuvar kaydına bağlı değil.
      // YERLEŞİM: masaüstü/iPad'de sidebar (burası), TELEFONDA avatar menüsünde.
      // Sebep: alt gezinme çubuğu telefonda zaten dolu (Sahne Modu dahil 5 öğe) ve
      // 6. öğe ikonları okunmaz hale getiriyor. Aynı YÜZEYDE tekrar YOK — sidebar
      // görünürken avatar menüsünde ikinci bir Metronom bağlantısı çıkmıyor.
      // (2026-08-24) Çalışma Odası, Metronom'un yanında: ikisi de İCRA DEĞİL
      // ÇALIŞMA aracı. Sahne ekranına bilerek konmadı — orası güvenilirlik
      // alanı, icra sırasında transpoze/tempo ile oynanmaz.
      // (2026-09-23) Metronom menüden KALDIRILDI: artık Çalışma Odası'nın
      // üçüncü sekmesi. Aynı aracın iki ayrı girişi olması gereksizdi;
      // metronom.html adresi yer imleri için duruyor ve sekmeye yönlendiriyor.
      { href: 'calisma.html',     icon: 'ti-headphones',  label: _m('menu.calismaodasi','Çalışma Odası') },
      { divider: true },
      { href: 'mesajlar.html',    icon: 'ti-message',     label: _m('menu.mesajlar','Mesajlar') },
      // (2026-08-06) "Üyeler" menüden ÇIKARILDI, yerine YÖNETİM geldi. Üyeler
      // artık Yönetim sayfasının altındaki bir bölüm — yönetim işleri tek
      // giriş noktasında toplansın diye (Emir'in kararı).
      { href: 'yonetim.html',     icon: 'ti-shield-lock', label: _m('menu.yonetim','Yönetim'), adminOnly: true },
      // Ayarlar buradan KALDIRILDI (2026-08-01): artık alttaki avatar/hesap menüsünde.
      // Aynı bağlantının hem listede hem menüde durması gereksiz tekrardı.
    ];

    // (2026-10-25) Menüde kendi satırı olmayan alt sayfalarda üst bölüm vurgulu kalsın (Ritim Kes'te menüde hiçbir öğe seçili değildi).
    const UST_SAYFA = { 'ritim-kes.html': 'calisma.html', 'metronom.html': 'calisma.html', 'onerilerim.html': 'eserler.html',
                        'uyeler.html': 'yonetim.html', 'istatistikler.html': 'yonetim.html' };
    const navHtml = navItems.map(item => {
      if (item.divider) return '<div class="sb-divider"></div>';
      const isActive = (UST_SAYFA[page] || page) === item.href;
      // adminOnly ise localStorage'a göre anında göster/gizle
      if (item.adminOnly && !isAdminNow) return '';
      return `<a href="${item.href}" class="sb-item${isActive ? ' active' : ''}"><i class="ti ${item.icon}" style="font-size:16px;width:20px;text-align:center;" aria-hidden="true"></i>${item.label}</a>`;
    }).join('');

    const aside = document.createElement('aside');
    aside.id = 'r-sidebar';
    aside.className = 'sidebar';
    aside.innerHTML = `
      <div class="sb-brand">
        <img src="${logo}" alt="repertuvar.app" style="height:42px;width:auto;max-width:230px;display:block;" data-logo="true">
      </div>
      <nav class="sb-nav">${navHtml}</nav>
      <div class="sb-divider sb-divider-hesap"></div>
      <div class="sb-user-x" id="sbUserX" onclick="toggleSbDropdown(event)" title="${_m('menu.hesap','Hesap')}">
        <div class="sb-user-avatar"><i class="ti ti-user" style="font-size:15px;" aria-hidden="true"></i></div>
        <span class="sb-user-name" id="sbUserName">—</span>
        <i class="ti ti-chevron-up" style="font-size:14px;color:var(--text3,#5e5c8a);" aria-hidden="true"></i>
        <div class="sb-user-dropdown" id="sbUserDropdown">
          <div id="sbGroups"></div>
          <a href="ayarlar.html" class="sb-dd-item"><i class="ti ti-settings" style="font-size:15px;" aria-hidden="true"></i> ${_m('menu.ayarlar','Ayarlar')}</a>
          <button class="sb-dd-item danger" onclick="logout()"><i class="ti ti-logout" style="font-size:15px;" aria-hidden="true"></i> ${_m('menu.oturumKapat','Oturumu Kapat')}</button>
        </div>
      </div>
      <div class="sb-user-x sb-tema" id="sbTemaSatir">
        ${themeToggleMarkup('sbThemeToggle', theme)}
        <span class="sb-user-name">${_m('menu.temaDegistir','Tema değiştir')}</span>
      </div>
      <div style="flex:1"></div>
    `;
    document.body.insertBefore(aside, document.body.firstChild);

    bindThemeToggle('sbThemeToggle');
    // Satırın anahtar dışındaki yerine tıklamak da temayı değiştirir (anahtarın kendi tıklaması yayılmaz).
    const _temaSatir = document.getElementById('sbTemaSatir');
    if (_temaSatir) _temaSatir.addEventListener('click', function () { const b = document.getElementById('sbThemeToggle'); if (b) b.click(); });
    updateSbUserName();

    // Logo, tema değişiminde otomatik güncellenir (bkz. applyTheme)
  }

  // ── Bottom nav render — mobilde otomatik ──
  function renderBottomNav() {
    if (window.innerWidth >= 1024) return;
    if (document.getElementById('r-bottom-nav')) return;

    const page = window.location.pathname.split('/').pop() || 'index.html';
    const ADMIN_ID = '4f965624-e524-4cb0-a351-3368f1297d28';
    const savedUser = (() => { try { return JSON.parse(localStorage.getItem('sb_user')); } catch(e) { return null; } })();
    const savedRole = localStorage.getItem('user_role') || '';
    const isAdminNow = savedUser?.id === ADMIN_ID || savedRole === 'admin';

    // Geniş ekranda (tablet dikey, ≥600px) sidebar'daki Solistler'i alt menüye de
    // ekle — tablet dikeyde sidebar gizli olduğu için bu sayfaya erişim kalmıyordu.
    // Telefonda 7 öğe sıkışacağı için Solistler orada yok (Grup / Koro 2026-10-31'den beri var).
    // (Üyeler ve Ayarlar bilerek dışarıda: Ayarlar zaten avatar menüsünde.)
    const roomyNav = window.innerWidth >= 600;

    // (2026-10-31) Emir: Grup / Koro telefonda da alt menüde, Repertuvarlar'dan hemen sonra; tablette sıra Grup / Koro, sonra
    // Solistler. Ana Sayfa kapalıysa (Ayarlar) Ana Sayfa düğmesi yok. Telefonda 6 düğmede yazı 9,5 px (tasarim.css data-adet).
    const bnItems = [
      ...(_anaSayfaKapali() ? [] : [{ href: 'index.html', icon: 'ti-home', label: _m('menu.anasayfa','Ana Sayfa') }]),
      { href: 'eserler.html',     icon: 'ti-book',     label: _m('menu.eserler','Eserler') },
      { href: 'repertoires.html', icon: 'ti-playlist', label: _m('menu.repertuvarlar','Repertuvarlar') },
      { href: 'gruplar.html',     icon: 'ti-users-group', label: _m('menu.grup','Grup / Koro') },
      ...(roomyNav ? [
        { href: 'artiesten.html', icon: 'ti-microphone',  label: _m('menu.solistler','Solistler') },
      ] : []),
      { href: 'stage.html',       icon: 'ti-music',    label: _m('menu.sahnemodu','Sahne Modu'), stage: true },
      { href: 'mesajlar.html',    icon: 'ti-message',  label: _m('menu.mesajlar','Mesajlar') },
    ];

    const bnHtml = bnItems.map(item => {
      const isActive = page === item.href;
      const stageCls = item.stage ? ' bn-stage' : '';
      return `<a href="${item.href}" class="bn-item${isActive ? ' active' : ''}${stageCls}">
        <i class="ti ${item.icon}" style="font-size:20px;line-height:1;"></i>
        <span class="bn-label">${item.label}</span>
      </a>`;
    }).join('');

    const nav = document.createElement('nav');
    nav.id = 'r-bottom-nav';
    nav.className = 'bottom-nav';
    nav.dataset.roomy = roomyNav ? '1' : '0'; // eşik değişince yeniden kurulabilsin
    nav.dataset.adet = String(bnItems.length);
    nav.innerHTML = `<div class="bn-items">${bnHtml}</div>`;
    document.body.appendChild(nav);

    // Stage modunda gizle
    if (window._stageActive) nav.style.display = 'none';
    window.addEventListener('stageEnter', () => { nav.style.display = 'none'; });
    window.addEventListener('stageExit', () => { nav.style.display = ''; });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { renderSidebar(); renderBottomNav(); });
  } else {
    renderSidebar();
    renderBottomNav();
  }

  // (2026-10-24) ANDROID GERİ TUŞU / JESTİ (yerel uygulama). Dinleyici yoktu: eser detayı, alt pencere ya da modal açıkken
  // geri tuşu sayfadan çıkıyordu. Sıra: sayfanın window.RGeri()'si (en üstteki açık katmanı kapatır, kapattıysa true) →
  // profil menüsü / bildirim paneli → önceki sayfa; ana sayfada uygulamadan çıkış. Dinleyici olmayan sayfalarda (login,
  // paylas, pro) Capacitor'ın varsayılanı (geçmişte geri / çıkış) geçerli.
  (function () {
    const cap = window.Capacitor;
    if (!cap || !cap.isNativePlatform || !cap.isNativePlatform() || cap.getPlatform() !== 'android') return;
    const App = cap.Plugins && cap.Plugins.App;
    if (!App || !App.addListener) return;
    App.addListener('backButton', function (ev) {
      try { if (typeof window.RGeri === 'function' && window.RGeri()) return; } catch (e) {}
      const dd = document.getElementById('rTnDropdown');
      if (dd && dd.classList.contains('open')) { dd.classList.remove('open'); return; }
      const np = document.querySelector('.r-notif-panel.open');
      if (np) { np.classList.remove('open'); return; }
      const anaSayfa = /(^|\/)(index\.html)?$/.test(location.pathname);
      if (anaSayfa) App.exitApp();
      else if (ev && ev.canGoBack) history.back();
      else location.replace('index.html');
    });
  })();

  // (2026-10-24 deneme, cam barlar) iOS klavyesi açılınca sabit alt menü klavyenin üstüne zıplayıp yazı alanını örtüyor →
  // dokunmatik cihazda bir yazı alanı odaktayken alt menü gizlenir (body.klavye-acik, tasarim.css). inputmode=none
  // (yapıştır kutusu) klavye açmaz, sayılmaz.
  (function () {
    if (!document.documentElement.hasAttribute('data-cam')) return;
    if (!(window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches)) return;
    const yaziAlani = el => !!el && el.getAttribute && el.getAttribute('inputmode') !== 'none' &&
      (el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' ||
       (el.tagName === 'INPUT' && !/^(checkbox|radio|range|button|submit|reset|file|color|image|hidden)$/i.test(el.type)));
    document.addEventListener('focusin', e => { if (yaziAlani(e.target)) document.body.classList.add('klavye-acik'); });
    document.addEventListener('focusout', () => setTimeout(() => {
      if (!yaziAlani(document.activeElement)) document.body.classList.remove('klavye-acik');
    }, 60));
  })();

  // (2026-10-30) Kullanıcı: "alt menüyü gizleyelim, scroll yapınca gelsin, gerek olmayınca gizlensin" → aşağı kaydırınca
  // alt menü gizlenir (body.alt-menu-gizli, tasarim.css), yukarı kaydırınca geri gelir; kabın başında ve sonunda hep görünür.
  // Sayfalar farklı kaplarda kayıyor (pencere, Eserler #listCol/.detail, Repertuvarlar .lp/.dp, Sahne .pi) → kaydırma
  // yakalama evresinde dinlenir; ekranın yarısından alçak kaplar (açılır liste, bildirim paneli) sayılmaz. Düğmeye ya da
  // bağlantıya dokununca da menü geri gelir: kısa bir detay açılırsa kaydıracak yer kalmıyor, menü gizli kalmasın.
  (function () {
    if (!document.documentElement.hasAttribute('data-cam')) return;
    if (!(window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches)) return;
    const sonY = new WeakMap();
    const goster = () => document.body.classList.remove('alt-menu-gizli');
    document.addEventListener('scroll', function (e) {
      const kap = e.target === document ? document.scrollingElement : e.target;
      if (!kap || kap.clientHeight < window.innerHeight / 2) return;
      const y = kap.scrollTop;
      if (y <= 40 || y + kap.clientHeight >= kap.scrollHeight - 4) { sonY.set(kap, y); goster(); return; }
      if (!sonY.has(kap)) { sonY.set(kap, y); return; }
      const fark = y - sonY.get(kap);
      if (Math.abs(fark) < 8) return;
      sonY.set(kap, y);
      document.body.classList.toggle('alt-menu-gizli', fark > 0);
    }, { capture: true, passive: true });
    document.addEventListener('click', e => {
      if (e.target.closest && e.target.closest('a, button, [onclick], [role="button"]')) goster();
    }, true);
  })();

  // Theme logic
  window._applyNavTheme = function(theme) { applyTheme(theme); };
  function applyTheme(theme) {
    if (window._stageActive) return;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('r_theme', theme);
    const isLight = theme === 'light';
    // DOM'daki TÜM toggle switch'leri (sidebar, mobil header, eski desktop topbar) tek noktadan güncelle
    syncThemeToggles(theme);

    // CSS variable'ları JS ile override et (sayfa CSS'ini geçersiz kılar)
    const el = document.documentElement;
    el.style.setProperty('--bg',      isLight ? '#F5F6FA' : '#070B18');
    el.style.setProperty('--bg2',     isLight ? '#EEF0F5' : '#10172C');
    el.style.setProperty('--surface', isLight ? '#FFFFFF' : '#19233F');
    el.style.setProperty('--surface2',isLight ? '#F0F1F5' : '#222B45');
    el.style.setProperty('--text',    isLight ? '#111827' : '#FFFFFF');
    el.style.setProperty('--text2',   isLight ? '#667085' : '#B8BFD2');
    el.style.setProperty('--text3',   isLight ? '#98A2B3' : '#78829A');
    el.style.setProperty('--border',  isLight ? '#E5E7EB' : 'rgba(48,58,85,0.6)');
    el.style.setProperty('--border2', isLight ? '#D0D3DA' : 'rgba(48,58,85,0.85)');
    el.style.setProperty('--accent',  isLight ? '#E5A900' : '#FFC83D');
    el.style.setProperty('--accent2', isLight ? '#0B6FDE' : '#4DA3FF');
    el.style.setProperty('--accent3', isLight ? '#8CC5FF' : '#8CC5FF');

    // Logo değiştir
    document.querySelectorAll('img').forEach(img => {
      const src = (img.getAttribute('src') || '') + (img.src || '');
      if (src.includes('logo_dark') || src.includes('logo_light') || src.includes('logo_slogan') || src.includes('Repertuvar_logo')) {
        img.src = logoDosyasi(isLight, !!img.closest('.r-topnav'), !!img.closest('.sb-brand'));
      }
    });

    sistemCubuklariniAyarla(isLight);
  }

  // (2026-10-04) Native: durum/gezinme çubuğu ikonları uygulama temasını izlesin.
  // capacitor.config.json varsayılanı DARK (açık ikon); Capacitor'ın DEFAULT'u telefonun
  // sistem temasını izliyordu → aydınlık moddaki telefonda koyu uygulama üstünde koyu ikon.
  // Android'de Capacitor içeriği yalnız WebView 140+ ve viewport-fit=cover ile çubukların
  // altına uzatır; aksi hâlde çubuk arkasında koyu pencere zemini (styles.xml) kalır → hep DARK.
  function sistemCubuklariniAyarla(isLight) {
    try {
      const cap = window.Capacitor;
      const sb = cap && cap.isNativePlatform && cap.isNativePlatform() && cap.Plugins && cap.Plugins.SystemBars;
      if (!sb) return;
      let kenarKenara = true;   // iOS: contentInset "never", içerik hep çubukların altında
      if (cap.getPlatform() === 'android') {
        const m = navigator.userAgent.match(/Chrome\/(\d+)/);
        const vp = document.querySelector('meta[name=viewport]');
        kenarKenara = !!(m && +m[1] >= 140 && vp && /viewport-fit=cover/.test(vp.content));
      }
      // (2026-10-18) Yeni tasarımda üst çubuk açık modda da koyu (tasarim.css "SİYAH ÇERÇEVE") → simgeler hep açık (DARK).
      // (2026-10-24 deneme) Cam barlarda üst çubuk yok, durum çubuğu içeriğin üstünde → simgeler temayı izler.
      const v3 = document.documentElement.getAttribute('data-tasarim') === 'v3';
      const cam = document.documentElement.hasAttribute('data-cam');
      const p = sb.setStyle({ style: (kenarKenara && isLight && (!v3 || cam)) ? 'LIGHT' : 'DARK' });
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  // Sayfa yüklenince uygula
  const savedTheme = localStorage.getItem('r_theme') || 'dark';
  applyTheme(savedTheme);


  window.toggleTheme = function(e) {
    if (e) e.stopPropagation();
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  };

  document.addEventListener('click', function() {
    const dd = document.getElementById('rTnDropdown');
    if (dd) dd.classList.remove('open');
    const dtdd = document.getElementById('dtUserDropdown');
    if (dtdd) dtdd.classList.remove('open');
  });

  // Okunmamış mesaj badge'i — tüm sayfalarda sidebar + bottom nav
  async function loadMsgBadge() {
    const token = localStorage.getItem('sb_token');
    const uid = localStorage.getItem('sb_user') ? JSON.parse(localStorage.getItem('sb_user')).id : null;
    if (!token || !uid) return;
    const SUPA_URL = 'https://ehytkzxdhjyjuubizdnl.supabase.co';
    const SUPA_KEY = 'sb_publishable_f_WsYxzN06B5dGROrkGyPQ_UDxKSbtO';
    try {
      // Admin: kendisine gelen okunmamış mesajlar (read_at IS NULL, from_id != kendisi)
      // Üye: admin_reply dolu ama read_at null olan mesajlar (kendi gönderdiği, cevaplandı ama okumadı)
      const ADMIN_ID = '4f965624-e524-4cb0-a351-3368f1297d28';
      let countUrl;
      if (uid === ADMIN_ID) {
        // Admin: read_at null olan TÜM mesajlar (üyelerden gelen)
        countUrl = SUPA_URL + '/rest/v1/messages?read_at=is.null&select=id';
      } else {
        // Üye: admin yazdı/yanıtladı ama üye okumadı. (2026-10-24) read_at yerine uye_okudu_at: read_at "admin okudu"
        // demek; admin konuşmayı açınca (ya da Yeni Mesaj kaydı baştan read_at dolu yazıldığı için) sayaç hiç artmıyordu.
        countUrl = SUPA_URL + '/rest/v1/messages?from_id=eq.' + uid + '&admin_reply=not.is.null&uye_okudu_at=is.null&select=id';
      }
      const r = await fetch(countUrl, { headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + token } });
      if (!r.ok) return;
      const msgs = await r.json();
      const count = msgs.length;
      applyMsgBadge(count);
    } catch(e) {}
  }

  function applyMsgBadge(count) {
    const badgeStyle = `
      display:inline-flex;align-items:center;justify-content:center;
      min-width:18px;height:18px;padding:0 5px;border-radius:9px;
      background:#FFC83D;color:#fff;font-size:10px;font-weight:700;
      margin-left:auto;flex-shrink:0;
    `;
    // Sidebar: .v2-sb-item veya .sb-item içinde Mesajlar linki
    document.querySelectorAll('.v2-sb-item, .sb-item, #r-sidebar .sb-item').forEach(el => {
      if (el.href && el.href.includes('mesajlar')) {
        let badge = el.querySelector('.msg-badge');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'msg-badge';
          badge.style.cssText = badgeStyle;
          el.appendChild(badge);
        }
        badge.textContent = count > 0 ? (count > 99 ? '99+' : count) : '';
        badge.style.display = count > 0 ? 'inline-flex' : 'none';
      }
    });
    // Mobile bottom nav
    document.querySelectorAll('.v2-bn-item, .bn-item').forEach(el => {
      if (el.href && el.href.includes('mesajlar')) {
        let dot = el.querySelector('.msg-badge-dot');
        if (!dot) {
          dot = document.createElement('span');
          dot.className = 'msg-badge-dot';
          dot.style.cssText = `
            position:absolute;top:4px;right:calc(50% - 14px);
            min-width:16px;height:16px;padding:0 4px;border-radius:8px;
            background:#FFC83D;color:#fff;font-size:9px;font-weight:700;
            display:flex;align-items:center;justify-content:center;
          `;
          el.style.position = 'relative';
          el.appendChild(dot);
        }
        dot.textContent = count > 0 ? (count > 99 ? '99+' : count) : '';
        dot.style.display = count > 0 ? 'flex' : 'none';
      }
    });
  }

  // ── BİLDİRİM ZİLİ (uygulama içi) — tüm sayfalarda topnav'da ──
  const NOTIF_SUPA_URL = 'https://ehytkzxdhjyjuubizdnl.supabase.co';
  const NOTIF_SUPA_KEY = 'sb_publishable_f_WsYxzN06B5dGROrkGyPQ_UDxKSbtO';
  function _notifAuth() {
    const token = localStorage.getItem('sb_token');
    const uid = localStorage.getItem('sb_user') ? JSON.parse(localStorage.getItem('sb_user')).id : null;
    return (token && uid) ? { token: token, uid: uid } : null;
  }
  function _notifEsc(s){ return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function _notifTime(iso){
    try {
      const d = new Date(iso), diff = (Date.now() - d.getTime())/1000;
      if (diff < 60) return _m('menu.azOnce','az önce');
      if (diff < 3600) return _m('menu.dkOnce','{n} dk önce').replace('{n}', Math.floor(diff/60));
      if (diff < 86400) return _m('menu.saOnce','{n} sa önce').replace('{n}', Math.floor(diff/3600));
      if (diff < 604800) return _m('menu.gunOnce','{n} gün önce').replace('{n}', Math.floor(diff/86400));
      // (2026-09-27) Tarih biçimi dile göre: yerel ayar kodu sözlükten gelir.
      return d.toLocaleDateString(_m('menu.tarihYerel','tr-TR'), {day:'2-digit', month:'short'});
    } catch(e){ return ''; }
  }
  async function loadNotifBadge() {
    const a = _notifAuth(); if (!a) return;
    try {
      const r = await fetch(NOTIF_SUPA_URL + '/rest/v1/notifications?user_id=eq.' + a.uid + '&is_read=eq.false&select=id', { headers: { 'apikey': NOTIF_SUPA_KEY, 'Authorization': 'Bearer ' + a.token } });
      if (!r.ok) return;
      const rows = await r.json();
      applyNotifBadge(rows.length);
    } catch(e) {}
  }
  function applyNotifBadge(count) {
    const b = document.getElementById('rTnBellBadge');
    if (!b) return;
    b.textContent = count > 0 ? (count > 99 ? '99+' : count) : '';
    b.style.display = count > 0 ? 'inline-flex' : 'none';
  }
  window.toggleNotifPanel = function(e) {
    if (e) e.stopPropagation();
    let p = document.getElementById('rNotifPanel');
    if (!p) {
      p = document.createElement('div');
      p.id = 'rNotifPanel';
      p.className = 'r-notif-panel';
      document.body.appendChild(p);
      document.addEventListener('click', function(){ p.classList.remove('open'); });
    }
    const bell = document.getElementById('rTnBell');
    if (bell) {
      const rect = bell.getBoundingClientRect();
      p.style.top = (rect.bottom + 6) + 'px';
      p.style.right = Math.max(8, window.innerWidth - rect.right) + 'px';
    }
    const willOpen = !p.classList.contains('open');
    p.classList.toggle('open');
    if (willOpen) loadNotifList();
  };
  async function loadNotifList() {
    const p = document.getElementById('rNotifPanel');
    const a = _notifAuth();
    if (!p || !a) return;
    const _bBaslik = '<div class="r-notif-head">' + _m('menu.bildirimler','Bildirimler') + '</div>';
    p.innerHTML = _bBaslik + '<div style="padding:16px;color:#9aa4b2;font-size:13px;">' + _m('menu.yukleniyor','Yükleniyor…') + '</div>';
    try {
      const r = await fetch(NOTIF_SUPA_URL + '/rest/v1/notifications?user_id=eq.' + a.uid + '&order=created_at.desc&limit=10&select=id,type,title,body,data,is_read,created_at', { headers: { 'apikey': NOTIF_SUPA_KEY, 'Authorization': 'Bearer ' + a.token } });
      const rows = r.ok ? await r.json() : [];
      if (!rows.length) {
        p.innerHTML = _bBaslik + '<div style="padding:22px 16px;color:#6b7482;font-size:13px;text-align:center;">' + _m('menu.bildirimYok','Henüz bildirim yok.') + '</div>';
        return;
      }
      // (2026-10-24) Duyuru / admin mesajı bildirimleri (veritabanı tetikleyicileri) ilgili sayfaya götürür. Yalnız
      // uygulamanın kendi sayfaları (dış adres yok). Sabit başlıklı türler arayüz diliyle; duyuru başlığı adminin metni.
      const _git = function (n) {
        const u = n && n.data && n.data.url;
        return (typeof u === 'string' && /^[a-z0-9-]+\.html(\?[a-z0-9=&_-]*)?$/i.test(u)) ? u : '';
      };
      const _baslik = function (n) {
        if (n.type === 'admin_message') return _m('menu.bildirimAdminMesaj', n.title);
        return n.title;
      };
      p.innerHTML = _bBaslik + rows.map(function(n){
        const u = _git(n);
        return '<div class="r-notif-item' + (n.is_read ? '' : ' unread') + (u ? ' tiklanir" role="link" tabindex="0" data-url="' + _notifEsc(u) + '"' : '"') + '>' +
          '<div class="r-notif-title">' + _notifEsc(_baslik(n)) + '</div>' +
          (n.body ? '<div class="r-notif-body">' + _notifEsc(n.body) + '</div>' : '') +
          '<div class="r-notif-time">' + _notifTime(n.created_at) + '</div>' +
        '</div>';
      }).join('');
      p.querySelectorAll('.r-notif-item[data-url]').forEach(function (el) {
        el.addEventListener('click', function () { location.href = el.dataset.url; });
      });
      // Panel açıldığında kullanıcının TÜM okunmamış bildirimlerini okundu yap
      // (sadece son 10'u değil — yoksa listede görünmeyen eski okunmamışlar rozeti takar)
      fetch(NOTIF_SUPA_URL + '/rest/v1/notifications?user_id=eq.' + a.uid + '&is_read=eq.false', {
        method: 'PATCH',
        headers: { 'apikey': NOTIF_SUPA_KEY, 'Authorization': 'Bearer ' + a.token, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ is_read: true })
      }).then(function(){ applyNotifBadge(0); }).catch(function(){});
    } catch(e) {
      p.innerHTML = _bBaslik + '<div style="padding:16px;color:#c05444;font-size:13px;">' + _m('menu.yuklenemedi','Yüklenemedi.') + '</div>';
    }
  }
  (function(){
    if (document.getElementById('r-notif-style')) return;
    const st = document.createElement('style');
    st.id = 'r-notif-style';
    st.textContent = `
      .r-tn-bell { position:relative; background:none; border:none; cursor:pointer; color:inherit; display:flex; align-items:center; justify-content:center; padding:6px; }
      .r-tn-bell i { font-size:20px; color:#e6e2ff; }
      [data-theme="light"] .r-tn-bell i { color:#3a3a5a; }
      #rTnBellBadge { position:absolute; top:-2px; right:-2px; min-width:16px; height:16px; padding:0 4px; border-radius:8px; background:#FFC83D; color:#1a1200; font-size:9px; font-weight:800; align-items:center; justify-content:center; display:none; }
      .r-notif-panel { position:fixed; z-index:3000; width:300px; max-width:calc(100vw - 16px); max-height:70vh; overflow-y:auto; background:#141827; border:1px solid rgba(255,200,61,0.18); border-radius:14px; box-shadow:0 12px 32px rgba(0,0,0,0.4); opacity:0; transform:translateY(-6px); pointer-events:none; transition:opacity .15s, transform .15s; }
      .r-notif-panel.open { opacity:1; transform:translateY(0); pointer-events:auto; }
      [data-theme="light"] .r-notif-panel { background:#ffffff; border-color:rgba(0,0,0,0.08); box-shadow:0 12px 32px rgba(0,0,0,0.12); }
      .r-notif-head { padding:12px 14px 8px; font-size:12px; font-weight:800; letter-spacing:.04em; color:#9aa4b2; border-bottom:1px solid rgba(255,255,255,0.06); position:sticky; top:0; background:inherit; }
      .r-notif-item { padding:11px 14px; border-bottom:1px solid rgba(255,255,255,0.05); }
      [data-theme="light"] .r-notif-item { border-bottom-color:rgba(0,0,0,0.05); }
      .r-notif-item.unread { background:rgba(255,200,61,0.07); }
      .r-notif-item.tiklanir { cursor:pointer; }
      .r-notif-item.tiklanir:active { background:rgba(255,200,61,0.12); }
      .r-notif-title { font-size:13px; font-weight:700; color:#e6edf3; }
      [data-theme="light"] .r-notif-title { color:#1a1a2e; }
      .r-notif-body { font-size:12px; color:#9aa4b2; margin-top:2px; line-height:1.4; }
      .r-notif-time { font-size:10px; color:#6b7482; margin-top:4px; }
    `;
    document.head.appendChild(st);
  })();

  // Silme talebi badge'i — sadece admin
  async function loadDeletionBadge() {
    const token = localStorage.getItem('sb_token');
    const uid = localStorage.getItem('sb_user') ? JSON.parse(localStorage.getItem('sb_user')).id : null;
    const ADMIN_ID = '4f965624-e524-4cb0-a351-3368f1297d28';
    if (!token || uid !== ADMIN_ID) return;
    const SUPA_URL = 'https://ehytkzxdhjyjuubizdnl.supabase.co';
    const SUPA_KEY = 'sb_publishable_f_WsYxzN06B5dGROrkGyPQ_UDxKSbtO';
    try {
      const r = await fetch(SUPA_URL + '/rest/v1/profiles?status=eq.deletion_requested&select=id', {
        headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + token }
      });
      if (!r.ok) return;
      const data = await r.json();
      const count = data.length;
      const badgeStyle = `
        display:inline-flex;align-items:center;justify-content:center;
        min-width:18px;height:18px;padding:0 5px;border-radius:9px;
        background:#f87171;color:#fff;font-size:10px;font-weight:700;
        margin-left:auto;flex-shrink:0;
      `;
      document.querySelectorAll('.v2-sb-item, .sb-item').forEach(el => {
        if (el.href && el.href.includes('uyeler')) {
          let badge = el.querySelector('.del-badge');
          if (!badge) {
            badge = document.createElement('span');
            badge.className = 'del-badge';
            badge.style.cssText = badgeStyle;
            el.appendChild(badge);
          }
          badge.textContent = count > 0 ? count : '';
          badge.style.display = count > 0 ? 'inline-flex' : 'none';
        }
      });
    } catch(e) {}
  }

  // Sayfa yüklenince ve authReady'de çalıştır
  window.addEventListener('authReady', () => setTimeout(loadMsgBadge, 300));
  window.addEventListener('authReady', () => setTimeout(loadDeletionBadge, 500));
  window.addEventListener('load', () => setTimeout(loadMsgBadge, 800));
  window.addEventListener('load', () => setTimeout(loadDeletionBadge, 1000));

  // authReady'de admin-only sidebar öğelerini göster
  window.addEventListener('authReady', () => {
    if (typeof isAdmin === 'function' && (isAdmin() || (typeof isEditor === 'function' && isEditor()))) {
      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = '';
      });
    }
  });
  // Her 60 saniyede bir yenile
  setInterval(loadMsgBadge, 60000);
  setInterval(loadDeletionBadge, 60000);
  window.addEventListener('load', () => setTimeout(loadNotifBadge, 900));
  setInterval(loadNotifBadge, 60000);
  // Uygulama/sekme öne gelince ANINDA kontrol et (60sn turunu bekleme, pil yakmaz)
  document.addEventListener('visibilitychange', function(){
    if (!document.hidden) loadNotifBadge();
  });
  window.addEventListener('focus', loadNotifBadge);

})();

// ═══ Gerçek nav yüksekliklerini ölç, --topnav-h / --bottom-h değişkenlerine yaz ═══
// Bu değişkenler sayfa CSS'lerinde (örn. .layout{height:calc(100vh - var(--topnav-h))})
// statik varsayılanlarla (56px/68px) kullanılıyordu ama hiç güncellenmiyordu. Safe-area
// (çentik/home indicator) eklendikçe gerçek yükseklik bu varsayılanlardan sapıyor ve
// içerik alanı yanlış hesaplanıyordu.
(function () {
  // Üst nav'ı sabitleme kuralı SADECE "doğal sayfa scroll" mimarisi kullanan sayfalara
  // uygulanmalı. Kabuk mimarili sayfalar (eserler/repertoires/stage) body'yi kendi CSS'inde
  // position:fixed;inset:0 ile sabitler — bunu tespit edip öyle sayfalara dokunmuyoruz.
  function markScrollArchitecture() {
    try {
      const bodyPos = getComputedStyle(document.body).position;
      if (bodyPos !== 'fixed') {
        document.documentElement.classList.add('r-natural-scroll-page');
      }
    } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', markScrollArchitecture);
  } else {
    markScrollArchitecture();
  }

  function measureNavHeights() {
    const topEl = document.querySelector('.r-topnav');
    const botEl = document.getElementById('r-bottom-nav');
    if (topEl) {
      document.documentElement.style.setProperty('--topnav-h', topEl.offsetHeight + 'px');
    }
    if (botEl && botEl.style.display !== 'none') {
      document.documentElement.style.setProperty('--bottom-h', botEl.offsetHeight + 'px');
    }
  }
  // İlk ölçüm — nav'lar DOM'a eklenir eklenmez
  measureNavHeights();
  // Gerçek boyut değiştiğinde (font/ikon geç yüklenmesi, ekran döndürme, vb.) anında tekrar ölç.
  // Sabit setTimeout gecikmeleri yerine ResizeObserver kullanmak, "bir süre sonra aniden değişiyor"
  // hissi yaratan görünür flaş/sıçramaları ortadan kaldırır.
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(measureNavHeights);
    const attachObserver = () => {
      const topEl = document.querySelector('.r-topnav');
      const botEl = document.getElementById('r-bottom-nav');
      if (topEl) ro.observe(topEl);
      if (botEl) ro.observe(botEl);
    };
    // Nav'lar henüz DOM'da olmayabilir (render() DOMContentLoaded'da çalışıyor) — kısa aralıklarla dene
    attachObserver();
    setTimeout(attachObserver, 50);
    setTimeout(attachObserver, 300);
  }
  window.addEventListener('resize', measureNavHeights);
  window.addEventListener('orientationchange', () => setTimeout(measureNavHeights, 200));
  window.addEventListener('stageExit', () => setTimeout(measureNavHeights, 100));
})();

// ═══ Basit ziyaretçi/sayfa görüntüleme takibi ═══
// Kayıtlar kendi Supabase altyapımızda (page_views). KABA KONUM için IP adresi günde bir kez ipwho.is'e gider (aşağıda,
// GEO_ENABLED) — gizlilik metni §3(d) ve §4 bunu söyler; IP'nin kendisi saklanmaz. (2026-10-17: eski yorum "üçüncü taraf yok,
// IP dışarıya gitmiyor" diyordu — yanlıştı.) Amaç: kullanım ölçümü + TOPLU bölgesel tanıtım planlaması (şehir başına sayılar;
// kişiye yönelik reklam yok). Saklama: 30 gün sonra kimlik/şehir silinir, 180 günde kayıt silinir, kimliksiz günlük şehir
// özeti kalır (sql/istatistik_saklama.sql). Kullanıcı Ayarlar › Kullanım istatistikleri'nden kapatabilir ('r_istatistik').
// Her sayfa yüklendiğinde bir kayıt atar; hata olursa sessizce vazgeçer, kullanıcı deneyimini asla etkilemez.
(function () {
  try {
    if (localStorage.getItem('r_istatistik') === 'kapali') return;   // kullanıcı kapattı: kayıt da konum sorgusu da yok
    const SUPA_URL = 'https://ehytkzxdhjyjuubizdnl.supabase.co';
    const SUPA_KEY = 'sb_publishable_f_WsYxzN06B5dGROrkGyPQ_UDxKSbtO';

    // Oturum ID'si — sekme/oturum başına bir kez üretilir, sayfalar arası aynı kalır.
    // Bu sayede "kaç farklı ziyaret" ile "kaç sayfa görüntüleme" ayrıştırılabilir.
    let sid = sessionStorage.getItem('r_session_id');
    if (!sid) {
      sid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(36).slice(2));
      sessionStorage.setItem('r_session_id', sid);
    }

    const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    const platform = isNative ? ((window.Capacitor.getPlatform && window.Capacitor.getPlatform()) || 'native') : 'web';
    const deviceType = (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) ? 'mobile' : 'desktop';
    let tz = null;
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (e) {}
    const uid = (typeof getUserId === 'function') ? getUserId() : null;

    // ── KONUM (ülke / il / şehir) ───────────────────────────────────────────
    // Saat dilimi yalnızca ülkeyi kabaca söyler ("Europe/Istanbul"). İl bilgisi
    // için IP tabanlı konum çözümlemesi gerekiyor; bu, ziyaretçinin IP'sinin bir
    // DIŞ SERVİSE gitmesi demektir (gizlilik metninde belirtilmeli).
    // Kapatmak istersen: GEO_ENABLED = false yap — diğer her şey aynı çalışır.
    const GEO_ENABLED = true;
    const GEO_TTL = 24 * 60 * 60 * 1000; // günde bir kez sorar, sonuç önbellekte

    function cachedGeo() {
      try {
        const raw = localStorage.getItem('r_geo');
        if (!raw) return null;
        const o = JSON.parse(raw);
        if (!o || (Date.now() - (o.t || 0)) > GEO_TTL) return null;
        return o.g || null;
      } catch (e) { return null; }
    }
    function fetchGeo() {
      // Sonuç dönene kadar kayıt beklemez; ilk görüntülemede konum boş kalabilir,
      // sonraki sayfalarda önbellekten gelir.
      if (!GEO_ENABLED) return Promise.resolve(null);
      return fetch('https://ipwho.is/?fields=success,country,region,city', { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(j => {
          if (!j || j.success === false) return null;
          const g = { country: j.country || null, region: j.region || null, city: j.city || null };
          try { localStorage.setItem('r_geo', JSON.stringify({ t: Date.now(), g: g })); } catch (e) {}
          return g;
        })
        .catch(() => null);
    }

    function sendView(geo) {
      const payload = {
        path: (location.pathname.split('/').pop() || 'index.html'),
        referrer: document.referrer || null,
        user_id: uid || null,
        session_id: sid,
        timezone: tz,
        device_type: deviceType,
        platform: platform,
        country: geo ? geo.country : null,
        region:  geo ? geo.region  : null,
        city:    geo ? geo.city    : null
      };
      fetch(SUPA_URL + '/rest/v1/page_views', {
        method: 'POST',
        headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    }

    const geoNow = cachedGeo();
    if (geoNow || !GEO_ENABLED) {
      sendView(geoNow);
    } else {
      // Konum sorgusu en fazla 1.5sn beklesin; gecikirse kayıt konumsuz gider
      let sent = false;
      const go = g => { if (!sent) { sent = true; sendView(g); } };
      setTimeout(() => go(null), 1500);
      fetchGeo().then(go);
    }
  } catch (e) { /* takip asla sayfayı bozmamalı */ }
})();

/* ─────────────────────────────────────────────────────────────
   SYNC BAR — ince üst ilerleme çubuğu (2026-07-17)
   Supabase (/rest/v1/, /auth/v1/) fetch istekleri sırasında ekranın en
   üstünde marka altınıyla dolan 3px'lik bar. Gerçek yüzde yok (tek istek);
   NProgress mantığı: başlarken ~%90'a kadar yavaşlayarak dolar, bitince
   %100'e atlayıp söner. En az ~450ms görünür ki hızlı sync'lerde flaş olmasın.
   window.fetch'i sarar; auth.js'in fetch sarmalayıcısının ÜSTÜNE zincirlenir
   (auth.js defer'sız önce, topnav.js defer sonra çalışır → çakışma yok).
   ───────────────────────────────────────────────────────────── */
(function () {
  if (window.__syncBarInstalled) return;
  window.__syncBarInstalled = true;

  var css = document.createElement('style');
  css.textContent =
    '#sync-bar{position:fixed;top:env(safe-area-inset-top,0px);left:0;height:3px;width:100%;' +   // yalnız geniş ekran
    'transform:scaleX(0);transform-origin:0 50%;opacity:0;' +
    'background:linear-gradient(90deg,#FFC83D,#FFD972);' +
    'box-shadow:0 0 10px rgba(255,200,61,.65),0 0 4px rgba(255,200,61,.9);' +
    'z-index:2147483647;pointer-events:none;will-change:transform,opacity;' +
    'transition:transform .2s ease,opacity .35s ease;}' +
    '#sync-bar.on{opacity:1;}' +
    // (2026-10-17) Telefon/tablette çubuk YOK, sağda ÜÇ KÜÇÜK NOKTA sırayla zıplar (kullanıcı: logonun sarı çizgisinin
    // yanına ikinci bir sarı çizgi orayı bozuyordu — "daha küçük ve çizgi olmayan"; dönen halkadan sonra "Claude'daki gibi
    // üç nokta"). Sağ grubun SOLUNDA mutlak konumda: görünüp kaybolurken zil/tema/avatar kaymaz; gizliyken display:none.
    '.r-topnav .r-tn-right{position:relative;}' +
    '#sync-halka{position:absolute;right:calc(100% + 10px);top:calc(50% - 8px);height:16px;gap:3px;align-items:center;' +
    'opacity:0;transition:opacity .25s ease;pointer-events:none;display:none;}' +
    '#sync-halka.var{display:flex;}' +
    '#sync-halka.serbest{position:fixed;right:16px;top:calc(env(safe-area-inset-top,0px) + 12px);z-index:2147483647;}' +
    '#sync-halka.on{opacity:1;}' +
    // (2026-10-24) Sahne ekranında üst menü yok: üç nokta sağ üstte serbest (güvenli alanın 12 px altı) "biraz aşağıda sağda"
    // kalıyordu (kullanıcı) → sahnenin üst şeridinin (sayfa noktaları + 1/15) sağ ucunda, sayaçla aynı yükseklikte.
    '#stageScreen .stb-r2{position:relative;}' +
    '#sync-halka.sahnede{right:0;top:calc(50% - 8px);}' +
    // Dar telefonda (≤~400 px) potpuri rozetiyle şerit doluysa noktalar rozetin üstüne binerdi → şeridin hemen altında, sağda.
    '#sync-halka.sahnede.sahne-alt{top:calc(100% + 12px);}' +
    '#sync-halka i{width:5px;height:5px;border-radius:50%;background:#FFC83D;opacity:.45;' +
    'animation:syncZipla 1s ease-in-out infinite;}' +
    '#sync-halka i:nth-child(2){animation-delay:.15s;}' +
    '#sync-halka i:nth-child(3){animation-delay:.3s;}' +
    '[data-theme="light"] #sync-halka i{background:#C98A00;}' +
    '@keyframes syncZipla{0%,60%,100%{transform:translateY(0);opacity:.45;}30%{transform:translateY(-4px);opacity:1;}}' +
    '@media (prefers-reduced-motion: reduce){#sync-halka i{animation-name:syncSolgun;}}' +
    '@keyframes syncSolgun{0%,60%,100%{opacity:.45;}30%{opacity:1;}}';
  (document.head || document.documentElement).appendChild(css);

  var bar = null, prog = 0, trickle = null, count = 0, startedAt = 0;
  var MIN_MS = 450;

  function el() {
    if (!bar || !bar.isConnected) {
      bar = document.getElementById('sync-bar');
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'sync-bar';
      }
      if (!bar.isConnected) (document.body || document.documentElement).appendChild(bar);
    }
    return bar;
  }
  function set(p) {
    prog = Math.max(0, Math.min(1, p));
    el().style.transform = 'scaleX(' + prog + ')';
  }
  // (2026-10-17) Hangi gösterge: üst menü görünüyorsa (telefon/tablet) ya da dar ekransa üç nokta (#sync-halka), geniş ekranda çubuk.
  // Çubuk iPhone'da top:0 durum çubuğu şeridinde kayboluyordu; menünün alt kenarına taşınınca da logonun sarı çizgisiyle
  // yan yana iki sarı çizgi oluyordu — ikisi de kullanıcıyı rahatsız etti.
  var halka = null, halkaModu = false, halkaBekle = 0;
  function halkaGoster() {
    var tn = document.querySelector('.r-topnav');
    var r = tn ? tn.getBoundingClientRect() : null;   // offsetParent DEĞİL: sabit (fixed) menüde hep null döner
    var menuVar = !!(r && r.width > 0 && r.height > 0);
    if (!menuVar && window.innerWidth >= 1024) return false;
    if (!halka) {
      halka = document.createElement('div'); halka.id = 'sync-halka'; halka.setAttribute('aria-hidden', 'true');
      halka.innerHTML = '<i></i><i></i><i></i>';
    }
    var sag = menuVar ? tn.querySelector('.r-tn-right') : null;
    var sahne = null;
    if (!sag) {
      var sr = document.querySelector('#stageScreen:not(.hidden) .stb-r2');
      var srr = sr ? sr.getBoundingClientRect() : null;
      if (srr && srr.width > 0 && srr.height > 0) sahne = sr;   // nota odak kipinde şerit gizli → serbest konum
    }
    if (sag) { if (halka.parentNode !== sag) sag.insertBefore(halka, sag.firstChild); halka.classList.remove('serbest', 'sahnede'); }
    else if (sahne) {
      if (halka.parentNode !== sahne) sahne.appendChild(halka);
      halka.classList.remove('serbest', 'sahne-alt'); halka.classList.add('sahnede', 'var');
      var stp = sahne.querySelector('.stp'), pr = stp ? stp.getBoundingClientRect() : null, hr = halka.getBoundingClientRect();
      if (pr && pr.width > 0 && pr.right > hr.left - 6) halka.classList.add('sahne-alt');
    }
    else if (document.getElementById('r-topnav-container')) {
      // (2026-10-24) Sayfa üst menü kullanıyor ama menü henüz kurulmadı (ör. alt menüden Sahne Modu'na geçişte ilk eşitleme):
      // eskiden sağ üstte serbest konuma — AVATARIN ARKASINA — düşüyor, yarım saniye sonra menüdeki yerine geçiyordu; kullanıcı
      // ikisini birden görüyordu ("hem ortada hem avatarın arkasında"). Serbest gösterme; menü gelince yerine koy (en çok ~3 sn
      // dener; sahnenin nota odak kipinde şerit de menü de gizli → gösterge yok).
      if (halka.parentNode) halka.classList.remove('var', 'on');
      if (halkaBekle < 20) { halkaBekle++; setTimeout(function () { if (count > 0) halkaGoster(); }, 150); }
      return true;   // dar ekranda çubuk da açılmasın
    }
    else { if (halka.parentNode !== document.body) (document.body || document.documentElement).appendChild(halka); halka.classList.remove('sahnede'); halka.classList.add('serbest'); }
    halkaBekle = 0;
    halka.classList.add('var');
    void halka.offsetWidth;
    halka.classList.add('on');
    return true;
  }
  function start() {
    startedAt = Date.now();
    halkaModu = halkaGoster();
    if (halkaModu) return;
    var b = el();
    b.style.transition = 'none';   // görünmezken 0'a çek (animasyonsuz)
    set(0);
    void b.offsetWidth;            // reflow
    b.style.transition = '';       // geçişi geri aç
    b.classList.add('on');
    set(0.08);
    clearInterval(trickle);
    trickle = setInterval(function () {
      if (prog < 0.9) set(prog + (0.9 - prog) * 0.12 + 0.005);
    }, 220);
  }
  function finish() {
    if (count !== 0) return;       // arada yeni istek başladıysa gizleme
    if (halkaModu) {
      if (halka) {
        halka.classList.remove('on');
        setTimeout(function () { if (count === 0 && !halka.classList.contains('on')) halka.classList.remove('var'); }, 300);
      }
      return;
    }
    clearInterval(trickle); trickle = null;
    set(1);
    setTimeout(function () { if (count === 0) el().classList.remove('on'); }, 240);
  }
  function done() {
    var wait = Math.max(0, MIN_MS - (Date.now() - startedAt));
    setTimeout(finish, wait);
  }

  window.__syncBar = {
    inc: function () { count++; if (count === 1) start(); },
    dec: function () { count = Math.max(0, count - 1); if (count === 0) done(); },
    // İstersen elle de tetiklenebilir (ör. IndexedDB işleri için):
    pulse: function () { this.inc(); var s = this; setTimeout(function () { s.dec(); }, 300); }
  };

  var of = window.fetch;
  if (typeof of === 'function') {
    window.fetch = function (input, init) {
      var url = '';
      try { url = (typeof input === 'string') ? input : (input && input.url) || ''; } catch (e) {}
      var track = /\/rest\/v1\/|\/auth\/v1\//.test(url);
      if (track) window.__syncBar.inc();
      var p;
      try { p = of.apply(this, arguments); }
      catch (e) { if (track) window.__syncBar.dec(); throw e; }
      if (track && p && typeof p.then === 'function') {
        p.then(function () { window.__syncBar.dec(); }, function () { window.__syncBar.dec(); });
      }
      return p;
    };
  }
})();
