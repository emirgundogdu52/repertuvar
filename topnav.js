(function() {
  // CSS inject
  const style = document.createElement('style');
  style.textContent = `
    .r-topnav {
      position: sticky; top: 0; z-index: 200;
      height: auto; min-height: 56px;
      background: rgba(7,7,26,0.92);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(120,100,255,0.18);
      display: flex; flex-direction: row; align-items: flex-start;
      padding: 8px 20px;
      padding-top: max(8px, env(safe-area-inset-top));
      gap: 12px;
    }
    .r-topnav img.r-logo {
      height: 75px; width: auto; flex-shrink: 0;
    }
    .r-topnav .r-tn-right {
      margin-left: auto;
      display: flex; flex-direction: row; align-items: flex-start; gap: 8px;
      padding-top: 10px;
    }
    .r-tn-user {
      display: flex; align-items: center; gap: 6px;
      background: rgba(124,111,255,0.12);
      border: 1px solid rgba(124,111,255,0.2);
      border-radius: 20px; padding: 4px 12px 4px 6px;
    }
    .r-tn-avatar {
      width: 26px; height: 26px; border-radius: 50%;
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
      display: none; position: absolute; top: calc(100% + 6px); right: 0;
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
    container.innerHTML = `
      <header class="r-topnav">
        <img src="logo2.png" alt="repertuvar.app" class="r-logo">
        <div class="r-tn-right">
          <div class="r-tn-user" onclick="toggleTnDropdown(event)" id="rTnUser">
            <div class="r-tn-avatar" id="rTnAvatar">—</div>
            <span class="r-tn-uname" id="rTnUserName">—</span>
            <div class="r-tn-dropdown" id="rTnDropdown">
              <button class="r-tn-dd-item danger" onclick="logout()">
                <i class="ti ti-logout" style="font-size:15px;" aria-hidden="true"></i> Çıkış Yap
              </button>
            </div>
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
    // Desktop topbar
    injectDesktopBadge(name, ini);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { render(); setTimeout(fillUser, 400); });
  } else {
    render();
    setTimeout(fillUser, 400);
  }
  window.toggleTnDropdown = function(e) {
    e.stopPropagation();
    const dd = document.getElementById('rTnDropdown');
    if (dd) dd.classList.toggle('open');
  };
  document.addEventListener('click', function() {
    const dd = document.getElementById('rTnDropdown');
    if (dd) dd.classList.remove('open');
    const dtdd = document.getElementById('dtUserDropdown');
    if (dtdd) dtdd.classList.remove('open');
  });
})();
