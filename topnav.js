(function() {
  // CSS inject
  const style = document.createElement('style');
  style.textContent = `
    html, body { overflow-x: hidden !important; max-width: 100% !important; }
    /* ── Sidebar (desktop ≥1024px) ── */
    @media (min-width: 1024px) {
      body { display: flex; }
      .sidebar {
        position: fixed; top: 0; left: 0; bottom: 0; width: 220px;
        background: rgba(9,9,28,0.96);
        backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
        border-right: 1px solid var(--border, rgba(140,120,255,0.38));
        display: flex; flex-direction: column;
        z-index: 300; padding-bottom: 20px;
        font-family: 'Plus Jakarta Sans', sans-serif;
      }
      .sb-brand {
        padding: 18px 16px 14px;
        border-bottom: 1px solid var(--border, rgba(140,120,255,0.38));
        margin-bottom: 10px;
      }
      .sb-nav { flex: 1; padding: 0 10px; display: flex; flex-direction: column; gap: 2px; }
      .sb-item {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 12px; border-radius: 10px;
        font-size: 13px; font-weight: 600; color: var(--text2, #9d9bc4);
        text-decoration: none; transition: all .15s; position: relative;
      }
      .sb-item:hover { background: var(--surface, #12123a); color: var(--text, #e2e0ff); }
      .sb-item.active {
        background: rgba(124,111,255,0.12); color: var(--accent3, #c4b5fd);
        border: 1px solid rgba(124,111,255,0.2);
      }
      .sb-item.active::before {
        content: ''; position: absolute; left: 0; top: 20%; bottom: 20%;
        width: 3px; border-radius: 0 3px 3px 0;
        background: linear-gradient(to bottom, var(--accent, #7c6fff), var(--accent2, #a78bfa));
      }
      .sb-divider { height: 1px; background: var(--border, rgba(140,120,255,0.38)); margin: 8px 10px; }
      .sb-stage {
        margin: 6px 10px 0;
        display: flex; align-items: center; gap: 10px;
        padding: 11px 14px; border-radius: 12px;
        font-size: 13px; font-weight: 700; color: #fff;
        text-decoration: none;
        background: linear-gradient(135deg, var(--accent, #7c6fff), var(--accent2, #a78bfa));
        box-shadow: 0 4px 16px rgba(124,111,255,0.3);
        transition: opacity .15s;
      }
      .sb-stage:hover { opacity: .9; }
      .admin-only { display: none; }
      /* main-wrap'i sidebar genişliği kadar it */
      .main-wrap { margin-left: 220px; flex: 1; min-width: 0; }
    }
    @media (max-width: 1023px) {
      .sidebar { display: none !important; }
    }

    .r-topnav {
      position: sticky; top: 0; z-index: 200;
      height: auto; min-height: 56px;
      background: rgba(7,7,26,0.92);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(120,100,255,0.18);
      display: flex; flex-direction: row; align-items: center;
      padding: 0 16px;
      padding-top: env(safe-area-inset-top);
      gap: 12px;
      width: 100%; box-sizing: border-box; max-width: 100vw; overflow: hidden;
    }
    .r-topnav img.r-logo {
      height: 38px; width: auto; flex-shrink: 0;
    }
    .r-topnav .r-tn-right {
      margin-left: auto;
      display: flex; flex-direction: row; align-items: center; gap: 8px;
    }
    .r-tn-user {
      display: flex; align-items: center; gap: 6px;
      background: rgba(124,111,255,0.12);
      border: 1px solid rgba(124,111,255,0.2);
      border-radius: 50%; padding: 2px; width: 38px; height: 38px; justify-content: center;
    }
    .r-tn-avatar {
      width: 30px; height: 30px; border-radius: 50%;
      background: linear-gradient(135deg, #7c6fff, #a78bfa);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .r-tn-uname {
      font-size: 13px; font-weight: 600; color: #e2e0ff;
      max-width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .r-tn-user { cursor: pointer; position: relative; }
    .r-tn-dropdown {
      display: none; position: fixed; top: 60px; right: 12px;
      background: #12123a; border: 1px solid rgba(120,100,255,0.25);
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
    .r-tn-dd-item:hover { background: rgba(124,111,255,0.12); color: #e2e0ff; }
    .r-tn-dd-item.danger { color: #f87171; }
    .r-tn-dd-item.danger:hover { background: rgba(248,113,113,0.1); }
    .r-tn-logout { display: none; }

    /* ── Light Theme ── */
    :root[data-theme="light"],
    [data-theme="light"] {
      --bg:       #f5f4fb;
      --bg2:      #ede9fb;
      --surface:  #ffffff;
      --surface2: #f0eeff;
      --border:   rgba(124,111,255,0.18);
      --border2:  rgba(124,111,255,0.32);
      --accent:   #6c5ce7;
      --accent2:  #8b7af0;
      --accent3:  #5541d7;
      --text:     #1a1733;
      --text2:    #4a4570;
      --text3:    #9390b0;
      --green:    #00b894;
    }
    [data-theme="light"] body,
    [data-theme="light"] { background: var(--bg); color: var(--text); }
    [data-theme="light"] .r-topnav {
      background: rgba(245,244,251,0.95);
      border-bottom-color: rgba(124,111,255,0.15);
    }
    [data-theme="light"] .r-tn-user { background: rgba(124,111,255,0.08); }
    [data-theme="light"] .r-tn-uname { color: #1a1733; }
    [data-theme="light"] .r-tn-dropdown { background: #ffffff; box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
    [data-theme="light"] .r-tn-dd-item { color: #4a4570; }
    [data-theme="light"] .r-tn-dd-item:hover { color: #1a1733; }
    [data-theme="light"] .sidebar,
    [data-theme="light"] aside.sidebar,
    [data-theme="light"] .v2-sidebar { background: #ffffff !important; border-right-color: rgba(124,111,255,0.15) !important; }
    [data-theme="light"] .v2-sb-divider { background: rgba(124,111,255,0.25) !important; }
    [data-theme="light"] .v2-sb-item { color: #4a4570 !important; }
    [data-theme="light"] .v2-sb-item:hover { background: rgba(124,111,255,0.08) !important; color: #1a1733 !important; }
    [data-theme="light"] .v2-sb-item.active { background: rgba(124,111,255,0.1) !important; color: #6c5ce7 !important; }
    [data-theme="light"] .v2-sb-label { color: #9390b0 !important; }
    [data-theme="light"] .v2-sb-uname { color: #1a1733 !important; }
    [data-theme="light"] .v2-sb-urole { color: #9390b0 !important; }
    [data-theme="light"] .sb-item { color: #4a4570 !important; }
    [data-theme="light"] .sb-item:hover { background: rgba(124,111,255,0.08) !important; color: #1a1733 !important; }
    [data-theme="light"] .sb-item.active { background: rgba(124,111,255,0.1) !important; color: #6c5ce7 !important; }
    [data-theme="light"] .sb-label { color: #9390b0 !important; }
    [data-theme="light"] .sb-appname { color: #1a1733 !important; }
    [data-theme="light"] .sb-domain { color: #9390b0 !important; }
    [data-theme="light"] .sb-divider { background: rgba(124,111,255,0.15) !important; }
    [data-theme="light"] .sb-user-x { background: #f0eeff !important; border-color: rgba(124,111,255,0.2) !important; }
    [data-theme="light"] .sb-uname { color: #1a1733 !important; }
    [data-theme="light"] .sb-urole { color: #9390b0 !important; }
    [data-theme="light"] .desktop-topbar { background: rgba(245,244,251,0.95) !important; border-bottom-color: rgba(124,111,255,0.15) !important; }
    [data-theme="light"] .v2-desktop-topbar { background: rgba(245,244,251,0.95) !important; border-bottom-color: rgba(124,111,255,0.15) !important; }
    [data-theme="light"] .dt-crumb { color: #4a4570 !important; }
    [data-theme="light"] .dt-search { background: #ffffff !important; color: #9390b0 !important; }
    [data-theme="light"] .dt-user-dropdown { background: #ffffff; box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
    [data-theme="light"] .dt-user-name { color: #1a1733; }
    [data-theme="light"] .dt-user-badge { background: rgba(124,111,255,0.08) !important; }
    [data-theme="light"] .dt-user-dd-item { color: #4a4570; }
    [data-theme="light"] .dt-user-dd-item:hover { color: #1a1733; }
    [data-theme="light"] .bottom-nav { background: rgba(245,244,251,0.97) !important; border-top-color: rgba(124,111,255,0.15) !important; }
    [data-theme="light"] .bn-item { color: #9390b0 !important; }
    [data-theme="light"] .bn-item.active { color: #6c5ce7 !important; }
    [data-theme="light"] .v2-bottom-nav { background: rgba(245,244,251,0.97) !important; border-top-color: rgba(124,111,255,0.15) !important; }
    [data-theme="light"] .v2-bn-item { color: #9390b0 !important; }
    [data-theme="light"] .v2-bn-item.active { color: #6c5ce7 !important; }
    [data-theme="light"] .v2-topnav { background: rgba(245,244,251,0.95) !important; border-bottom-color: rgba(124,111,255,0.15) !important; }
    [data-theme="light"] .bn-stage { background: rgba(124,111,255,0.1) !important; border-color: rgba(124,111,255,0.2) !important; }

    /* ── Genel sayfa elemanları ── */
    [data-theme="light"] body { background: #f5f4fb !important; color: #1a1733 !important; }
    [data-theme="light"] .page, [data-theme="light"] .main-wrap { background: #f5f4fb; }

    /* Kartlar ve yüzeyler */
    [data-theme="light"] .card, [data-theme="light"] .member-card,
    [data-theme="light"] .work-card, [data-theme="light"] .rep-card,
    [data-theme="light"] .sol-card, [data-theme="light"] .settings-card,
    [data-theme="light"] .panel, [data-theme="light"] .detail-panel,
    [data-theme="light"] .stat-pill,
    [data-theme="light"] .work-row, [data-theme="light"] .eser-row,
    [data-theme="light"] .stage-banner { background: #ffffff !important; border-color: rgba(124,111,255,0.18) !important; }
    [data-theme="light"] .active-card { background: #ffffff !important; border: none !important; }

    [data-theme="light"] .work-row:hover, [data-theme="light"] .eser-row:hover { background: #f0eeff !important; }
    [data-theme="light"] .work-row.zebra { background: #f0eeff !important; }

    /* Input, textarea, select */
    [data-theme="light"] input, [data-theme="light"] textarea, [data-theme="light"] select {
      background: #ffffff !important; color: #1a1733 !important;
      border-color: rgba(124,111,255,0.25) !important;
    }
    [data-theme="light"] input::placeholder, [data-theme="light"] textarea::placeholder { color: #9390b0 !important; }
    [data-theme="light"] input:focus, [data-theme="light"] textarea:focus, [data-theme="light"] select:focus {
      border-color: #6c5ce7 !important;
    }

    /* Butonlar */
    [data-theme="light"] .btn, [data-theme="light"] .btn-sm,
    [data-theme="light"] .role-btn, [data-theme="light"] .tab-btn {
      background: #ffffff !important; color: #4a4570 !important;
      border-color: rgba(124,111,255,0.2) !important;
    }
    [data-theme="light"] .btn:hover, [data-theme="light"] .btn-sm:hover { background: #f0eeff !important; }

    /* Metinler */
    [data-theme="light"] h1, [data-theme="light"] h2, [data-theme="light"] h3,
    [data-theme="light"] .sec-title, [data-theme="light"] .card-title,
    [data-theme="light"] .work-name, [data-theme="light"] .member-email,
    [data-theme="light"] .rep-name, [data-theme="light"] .sol-name { color: #1a1733 !important; }
    [data-theme="light"] .work-sub, [data-theme="light"] .member-meta,
    [data-theme="light"] .rep-meta, [data-theme="light"] .sol-meta,
    [data-theme="light"] .sec-action { color: #4a4570 !important; }

    /* Topnav mobil */
    [data-theme="light"] .topnav { background: rgba(245,244,251,0.95) !important; border-bottom-color: rgba(124,111,255,0.15) !important; }
    [data-theme="light"] .tn-name { color: #1a1733 !important; }
    [data-theme="light"] .tn-domain { color: #9390b0 !important; background: #f0eeff !important; }
    [data-theme="light"] .tn-user { background: rgba(124,111,255,0.08) !important; border-color: rgba(124,111,255,0.15) !important; }
    [data-theme="light"] .tn-uname { color: #1a1733 !important; }

    /* Tab nav */
    [data-theme="light"] .tabnav { background: rgba(245,244,251,0.95) !important; border-color: rgba(124,111,255,0.15) !important; }
    [data-theme="light"] .tn-tab { color: #9390b0 !important; }
    [data-theme="light"] .tn-tab.active { color: #6c5ce7 !important; border-bottom-color: #6c5ce7 !important; }

    /* Badge, pill, tag */
    [data-theme="light"] .wb { background: #f0eeff !important; border-color: rgba(124,111,255,0.2) !important; color: #4a4570 !important; }
    [data-theme="light"] .wb-key { color: #6c5ce7 !important; }
    [data-theme="light"] .meta-badge { background: rgba(124,111,255,0.08) !important; color: #6c5ce7 !important; }
    [data-theme="light"] .role-badge { background: #f0eeff !important; color: #6c5ce7 !important; }

    /* Arama kutusu */
    [data-theme="light"] .search-bar, [data-theme="light"] .search-wrap { background: #ffffff !important; border-color: rgba(124,111,255,0.2) !important; }
    [data-theme="light"] .search-bar input { background: transparent !important; }

    /* Modal / overlay */
    [data-theme="light"] .modal-box, [data-theme="light"] .confirm-box { background: #ffffff !important; border-color: rgba(124,111,255,0.2) !important; }
    [data-theme="light"] .modal-overlay { background: rgba(0,0,0,0.3) !important; }

    /* Divider */
    [data-theme="light"] hr, [data-theme="light"] .divider { border-color: rgba(124,111,255,0.12) !important; }

    /* Chord / lyric area */
    [data-theme="light"] .chord-line { color: #6c5ce7 !important; }
    [data-theme="light"] .lyric-line { color: #1a1733 !important; }
    [data-theme="light"] .gufte-area { background: #faf9ff !important; border-color: rgba(124,111,255,0.15) !important; }

    /* Tabs (eser detay) */
    [data-theme="light"] .tab-bar { background: #f0eeff !important; border-color: rgba(124,111,255,0.15) !important; }
    [data-theme="light"] .tab-btn.active { background: #6c5ce7 !important; color: #fff !important; }

    /* Scrollbar */
    [data-theme="light"] ::-webkit-scrollbar-track { background: #f5f4fb !important; }
    [data-theme="light"] ::-webkit-scrollbar-thumb { background: rgba(124,111,255,0.2) !important; }

    /* ── Theme Toggle Button ── */
    .r-theme-toggle {
      width: 38px; height: 38px; min-width: 38px; min-height: 38px; border-radius: 50%;
      border: 1px solid rgba(124,111,255,0.25);
      background: rgba(124,111,255,0.1);
      color: #a78bfa; font-size: 16px; line-height: 1;
      display: inline-flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all .2s; flex-shrink: 0;
      padding: 0; box-sizing: border-box;
    }
    .r-theme-toggle:hover { background: rgba(124,111,255,0.2); }
    [data-theme="light"] .r-theme-toggle { color: #6c5ce7; background: rgba(124,111,255,0.08); }

    .dt-theme-toggle {
      width: 30px; height: 30px; border-radius: 50%;
      border: 1px solid rgba(124,111,255,0.25);
      background: rgba(124,111,255,0.08);
      color: #a78bfa; font-size: 14px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all .2s; flex-shrink: 0; margin-right: 4px;
    }
    .dt-theme-toggle:hover { background: rgba(124,111,255,0.18); }
    [data-theme="light"] .dt-theme-toggle { color: #6c5ce7; }
    
    @media (min-width: 1024px) { .r-topnav { display: none !important; } }
    @media (min-width: 1024px) {
      .v2-sb-user { display: none !important; }
      .dt-user-badge {
        display: flex; align-items: center; gap: 8px;
        background: rgba(124,111,255,0.08);
        border: 1px solid rgba(124,111,255,0.2);
        border-radius: 20px; padding: 5px 14px 5px 8px;
        cursor: pointer; position: relative;
      }
      .dt-user-badge:hover { background: rgba(124,111,255,0.15); }
      .dt-user-avatar {
        width: 28px; height: 28px; border-radius: 50%;
        background: linear-gradient(135deg, #7c6fff, #a78bfa);
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0;
      }
      .dt-user-name {
        font-size: 13px; font-weight: 600; color: #e2e0ff;
        max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .dt-user-dropdown {
        display: none; position: absolute; top: calc(100% + 6px); right: 0;
        background: #12123a; border: 1px solid rgba(120,100,255,0.25);
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
      .dt-user-dd-item:hover { background: rgba(124,111,255,0.12); color: #e2e0ff; }
      .dt-user-dd-item.danger { color: #f87171; }
      .dt-user-dd-item.danger:hover { background: rgba(248,113,113,0.1); }
    }
  `;
  document.head.appendChild(style);

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
          <button class="r-theme-toggle" id="rThemeToggle" title="Tema değiştir">🌙</button>
          <div class="r-tn-user" onclick="toggleTnDropdown(event)" id="rTnUser">
            <div class="r-tn-avatar" id="rTnAvatar">—</div>
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
    // Tema toggle desktop
    if (!topbar.querySelector('.dt-theme-toggle')) {
      const themeBtn = document.createElement('button');
      themeBtn.className = 'dt-theme-toggle';
      themeBtn.id = 'dtThemeToggle';
      themeBtn.title = 'Tema değiştir';
      themeBtn.innerHTML = document.documentElement.getAttribute('data-theme') === 'light' ? '🌙' : '☀️';
      themeBtn.addEventListener('click', function(e) { toggleTheme(e); });
      topbar.appendChild(themeBtn);
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
    if (av) av.textContent = ini;
    if (un) un.textContent = name;
    const dn = document.getElementById('rTnUserNameDisplay');
    if (dn) dn.textContent = name;
    // Desktop topbar
    injectDesktopBadge(name, ini);
  }

  function attachToggle() {
    const btn = document.getElementById('rThemeToggle');
    if (btn) btn.addEventListener('click', function(e) { e.stopPropagation(); window.toggleTheme(e); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      render();
      attachToggle();
      setTimeout(() => { fillUser(); applyTheme(localStorage.getItem('r_theme') || 'dark'); }, 400);
    });
  } else {
    render();
    attachToggle();
    setTimeout(() => { fillUser(); applyTheme(localStorage.getItem('r_theme') || 'dark'); }, 400);
  }
  window.toggleTnDropdown = function(e) {
    e.stopPropagation();
    let dd = document.getElementById('rTnDropdown');
    if (!dd) {
      dd = document.createElement('div');
      dd.id = 'rTnDropdown';
      dd.className = 'r-tn-dropdown';
      dd.innerHTML = `
        <div style="padding:8px 12px 6px;border-bottom:1px solid rgba(120,100,255,0.15);margin-bottom:4px;">
          <div id="rTnUserName" style="font-size:12px;font-weight:600;color:#e2e0ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;">—</div>
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
      { divider: true },
      { href: 'stage.html',       icon: 'ti-music',       label: 'Sahne Modu', stage: true },
    ];

    const navHtml = navItems.map(item => {
      if (item.divider) return '<div class="sb-divider"></div>';
      const isActive = page === item.href;
      const adminCls = item.adminOnly ? ' admin-only' : '';
      if (item.stage) {
        return `<a href="${item.href}" class="sb-stage${adminCls}"><i class="ti ${item.icon}" style="font-size:16px;width:20px;text-align:center;"></i>${item.label}</a>`;
      }
      return `<a href="${item.href}" class="sb-item${isActive ? ' active' : ''}${adminCls}"><i class="ti ${item.icon}" style="font-size:16px;width:20px;text-align:center;" aria-hidden="true"></i>${item.label}</a>`;
    }).join('');

    const aside = document.createElement('aside');
    aside.id = 'r-sidebar';
    aside.className = 'sidebar';
    aside.innerHTML = `
      <div class="sb-brand">
        <img src="${logo}" alt="repertuvar.app" style="height:38px;width:auto;display:block;" data-logo="true">
      </div>
      <nav class="sb-nav">${navHtml}</nav>
      <div style="flex:1"></div>
    `;
    document.body.insertBefore(aside, document.body.firstChild);

    // Tema değişiminde logoyu güncelle
    new MutationObserver(() => {
      const t = document.documentElement.getAttribute('data-theme') || 'dark';
      const img = document.querySelector('#r-sidebar img[data-logo]');
      if (img) img.src = t === 'light' ? 'logo_light.png' : 'logo_dark.png';
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderSidebar);
  } else {
    renderSidebar();
  }

  // Theme logic
  window._applyNavTheme = function(theme) { window._stageActive = false; applyTheme(theme); };
  function applyTheme(theme) {
    if (window._stageActive) return;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('r_theme', theme);
    const icon = theme === 'light' ? '🌙' : '☀️';
    const mb = document.getElementById('rThemeToggle');
    if (mb) mb.innerHTML = icon;
    const db = document.getElementById('dtThemeToggle');
    if (db) db.innerHTML = icon;

    // CSS variable'ları JS ile override et (sayfa CSS'ini geçersiz kılar)
    const isLight = theme === 'light';
    const el = document.documentElement;
    el.style.setProperty('--bg',      isLight ? '#f5f4fb' : '#07071a');
    el.style.setProperty('--bg2',     isLight ? '#ede9fb' : '#0f0f2e');
    el.style.setProperty('--surface', isLight ? '#ffffff' : '#12123a');
    el.style.setProperty('--surface2',isLight ? '#f0eeff' : '#1a1a4a');
    el.style.setProperty('--text',    isLight ? '#1a1733' : '#e2e0ff');
    el.style.setProperty('--text2',   isLight ? '#4a4570' : '#9d9bc4');
    el.style.setProperty('--text3',   isLight ? '#9390b0' : '#5e5c8a');
    el.style.setProperty('--border',  isLight ? 'rgba(124,111,255,0.18)' : 'rgba(140,120,255,0.38)');
    el.style.setProperty('--border2', isLight ? 'rgba(124,111,255,0.32)' : 'rgba(140,120,255,0.58)');
    el.style.setProperty('--accent',  isLight ? '#6c5ce7' : '#7c6fff');
    el.style.setProperty('--accent2', isLight ? '#8b7af0' : '#a78bfa');
    el.style.setProperty('--accent3', isLight ? '#5541d7' : '#c4b5fd');

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
      background:#7c6fff;color:#fff;font-size:10px;font-weight:700;
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
            background:#7c6fff;color:#fff;font-size:9px;font-weight:700;
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
  // Her 60 saniyede bir yenile
  setInterval(loadMsgBadge, 60000);
  setInterval(loadDeletionBadge, 60000);

  // Offline sync - authReady'de, 30 dakikada bir
  window.addEventListener('authReady', () => {
    const SYNC_INTERVAL = 30 * 60 * 1000; // 30 dakika
    const lastSync = parseInt(localStorage.getItem('lastSyncTime') || '0');
    const now = Date.now();
    if (now - lastSync > SYNC_INTERVAL) {
      if (typeof syncOfflineData === 'function') {
        syncOfflineData().then(() => {
          localStorage.setItem('lastSyncTime', String(now));
        }).catch(e => console.warn('Sync hatası:', e));
      }
    }
  });

})();
