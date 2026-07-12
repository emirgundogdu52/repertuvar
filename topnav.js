/* topnav.js — v2026-06-30-switch-unified — sbThemeToggle/rThemeToggle/dtThemeToggle hepsi tek .r-theme-toggle markup'ı kullanır */
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
        font-family: 'Plus Jakarta Sans', sans-serif;
      }
      .sb-brand {
        padding: 18px 16px 14px;
        border-bottom: 1px solid var(--border, rgba(48,58,85,0.38));
        margin-bottom: 10px;
      }
      .sb-nav { flex: 1; padding: 0 10px; display: flex; flex-direction: column; gap: 2px; }
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
    .r-topnav img.r-logo {
      height: 55px; width: auto; max-width: 220px; flex-shrink: 0; object-fit: contain;
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
    .r-tn-dd-item {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; border-radius: 7px;
      font-size: 13px; color: #9d9bc4; cursor: pointer;
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

    /* Input, textarea, select */
    [data-theme="light"] input, [data-theme="light"] textarea, [data-theme="light"] select {
      background: #ffffff !important; color: #111827 !important;
      border-color: rgba(255,200,61,0.25) !important;
    }
    [data-theme="light"] input::placeholder, [data-theme="light"] textarea::placeholder { color: #9390b0 !important; }
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
    .r-theme-toggle {
      position: relative; border: none; border-radius: 16px !important;
      width: 38px !important; height: 20px !important; min-height: 0 !important;
      cursor: pointer; flex-shrink: 0;
      padding: 2px; transition: background .2s;
      background: rgba(255,255,255,0.1);
    }
    [data-theme="light"] .r-theme-toggle { background: rgba(0,0,0,0.08); }
    .r-theme-toggle .toggle-knob {
      position: absolute; top: 2px; left: 2px;
      width: 16px; height: 16px; border-radius: 50%;
      background: linear-gradient(135deg, var(--accent, #FFC83D), var(--accent2, #4DA3FF));
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; transition: left .2s;
    }
    [data-theme="light"] .r-theme-toggle .toggle-knob { left: 20px; }

    /* Desktop topbar'daki switch'e küçük sağ boşluk */
    .v2-desktop-topbar .r-theme-toggle { margin-right: 4px; }
    
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
    return `<button id="${id}" class="r-theme-toggle" title="Tema değiştir"><span class="toggle-knob">${theme === 'light' ? '☀️' : '🌙'}</span></button>`;
  }
  function bindThemeToggle(id) {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', function(e) { e.stopPropagation(); window.toggleTheme(e); });
  }
  function syncThemeToggles(theme) {
    const icon = theme === 'light' ? '☀️' : '🌙';
    document.querySelectorAll('.r-theme-toggle .toggle-knob').forEach(knob => { knob.textContent = icon; });
  }

  // HTML inject
  function render() {
    const container = document.getElementById('r-topnav-container');
    if (!container) return;
    const _theme = localStorage.getItem('r_theme') || 'dark';
    const _logo = _theme === 'light' ? 'logo_light.png' : 'logo_dark.png';
    container.innerHTML = `
      <header class="r-topnav">
        <img src="${_logo}" alt="repertuvar.app" class="r-logo" id="rNavLogo">
        <div class="r-tn-right">
          ${themeToggleMarkup('rThemeToggle', _theme)}
          <div class="r-tn-user" onclick="toggleTnDropdown(event)" id="rTnUser">
            <div class="r-tn-avatar" id="rTnAvatar"><i class="ti ti-user" style="font-size:16px;"></i></div>
          </div>
        </div>
      </header>
    `;
  }

  // Desktop topbar'a user badge inject et
  function injectDesktopBadge(name, ini) {
    const topbar = document.querySelector('.v2-desktop-topbar');
    if (!topbar || topbar.querySelector('.dt-user-badge')) return;
    const badge = document.createElement('div');
    badge.className = 'dt-user-badge';
    badge.id = 'dtUserBadge';
    badge.innerHTML = `
      <div class="dt-user-avatar" id="dtUserAvatar">${ini}</div>
      <span class="dt-user-name" id="dtUserName">${name}</span>
      <div class="dt-user-dropdown" id="dtUserDropdown">
        <button class="dt-user-dd-item danger" onclick="logout()">
          <i class="ti ti-logout" style="font-size:15px;" aria-hidden="true"></i> Çıkış Yap
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
  window.toggleTnDropdown = function(e) {
    e.stopPropagation();
    let dd = document.getElementById('rTnDropdown');
    if (!dd) {
      dd = document.createElement('div');
      dd.id = 'rTnDropdown';
      dd.className = 'r-tn-dropdown';
      dd.innerHTML = `
        <div style="padding:8px 12px 6px;border-bottom:1px solid rgba(255,200,61,0.15);margin-bottom:4px;">
          <div id="rTnUserName" style="font-size:12px;font-weight:600;color:#FFFFFF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;">—</div>
        </div>
        <a href="ayarlar.html" class="r-tn-dd-item">
          <i class="ti ti-settings" style="font-size:15px;"></i> Ayarlar
        </a>
        <button class="r-tn-dd-item danger" onclick="logout()">
          <i class="ti ti-logout" style="font-size:15px;"></i> Çıkış Yap
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
    // User adını güncelle
    const un = document.getElementById('rTnUserName');
    if (un && typeof getUser === 'function') {
      const u = getUser();
      if (u) un.textContent = u?.user_metadata?.full_name || u?.email?.split('@')[0] || '—';
    }
  };

  // ── Sidebar render — tüm sayfalarda otomatik ──
  function renderSidebar() {
    if (window.innerWidth < 1024) return;
    if (document.getElementById('r-sidebar')) return;

    const page = window.location.pathname.split('/').pop() || 'index.html';
    const theme = localStorage.getItem('r_theme') || 'dark';
    const logo = theme === 'light' ? 'logo_light.png' : 'logo_dark.png';

    // localStorage'dan role kontrolü — network beklemeden
    const ADMIN_ID = '4f965624-e524-4cb0-a351-3368f1297d28';
    const savedUser = (() => { try { return JSON.parse(localStorage.getItem('sb_user')); } catch(e) { return null; } })();
    const savedRole = localStorage.getItem('user_role') || '';
    const isAdminNow = savedUser?.id === ADMIN_ID || savedRole === 'admin';
    const isEditorNow = isAdminNow || savedRole === 'editor';

    const navItems = [
      { href: 'index.html',       icon: 'ti-home',        label: 'Ana Sayfa' },
      { href: 'eserler.html',     icon: 'ti-book',        label: 'Eserler' },
      { href: 'repertoires.html', icon: 'ti-playlist',    label: 'Repertuvarlar' },
      { href: 'artiesten.html',   icon: 'ti-microphone',  label: 'Solistler' },
      { href: 'gruplar.html',     icon: 'ti-users-group', label: 'Grup / Koro' },
      { divider: true },
      { href: 'mesajlar.html',    icon: 'ti-message',     label: 'Mesajlar' },
      { href: 'uyeler.html',      icon: 'ti-users',       label: 'Üyeler', adminOnly: true },
      { href: 'ayarlar.html',     icon: 'ti-settings',    label: 'Ayarlar' },
    ];

    const navHtml = navItems.map(item => {
      if (item.divider) return '<div class="sb-divider"></div>';
      const isActive = page === item.href;
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
      <div style="padding:8px 12px 4px;">
        ${themeToggleMarkup('sbThemeToggle', theme)}
      </div>
      <div style="flex:1"></div>
    `;
    document.body.insertBefore(aside, document.body.firstChild);

    bindThemeToggle('sbThemeToggle');

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

    const bnItems = [
      { href: 'index.html',       icon: 'ti-home',     label: 'Ana Sayfa' },
      { href: 'eserler.html',     icon: 'ti-book',     label: 'Eserler' },
      { href: 'repertoires.html', icon: 'ti-playlist', label: 'Repertuvarlar' },
      { href: 'stage.html',       icon: 'ti-music',    label: 'Sahne Modu', stage: true },
      { href: 'mesajlar.html',    icon: 'ti-message',  label: 'Mesajlar' },
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
        img.src = (isLight ? 'logo_light.png' : 'logo_dark.png');
      }
    });


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
        // Üye: kendi gönderdiği, admin cevapladı ama üye okumadı
        countUrl = SUPA_URL + '/rest/v1/messages?from_id=eq.' + uid + '&admin_reply=not.is.null&read_at=is.null&select=id';
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

})();

// ═══ Gerçek nav yüksekliklerini ölç, --topnav-h / --bottom-h değişkenlerine yaz ═══
// Bu değişkenler sayfa CSS'lerinde (örn. .layout{height:calc(100vh - var(--topnav-h))})
// statik varsayılanlarla (56px/68px) kullanılıyordu ama hiç güncellenmiyordu. Safe-area
// (çentik/home indicator) eklendikçe gerçek yükseklik bu varsayılanlardan sapıyor ve
// içerik alanı yanlış hesaplanıyordu.
(function () {
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
