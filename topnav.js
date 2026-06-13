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
      display: flex; flex-direction: row; align-items: center;
      padding: 8px 20px;
      padding-top: max(8px, env(safe-area-inset-top));
      gap: 12px;
    }
    .r-topnav img.r-logo {
      height: 75px; width: auto; flex-shrink: 0;
    }
    .r-topnav .r-tn-right {
      margin-left: auto;
      display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
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
    .r-tn-logout {
      background: rgba(124,111,255,0.1);
      border: 1px solid rgba(124,111,255,0.25);
      border-radius: 8px; padding: 5px 12px;
      font-size: 12px; color: #9d9bc4; cursor: pointer;
      font-family: inherit; transition: all .15s;
    }
    .r-tn-logout:hover { border-color: #7c6fff; color: #c4b5fd; }
    @media (min-width: 1024px) { .r-topnav { display: none !important; } }
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
          <div class="r-tn-user">
            <div class="r-tn-avatar" id="rTnAvatar">—</div>
            <span class="r-tn-uname" id="rTnUserName">—</span>
          </div>
          <button class="r-tn-logout" onclick="logout()">↩ Çıkış</button>
        </div>
      </header>
    `;
  }

  // User info fill
  function fillUser() {
    if (typeof getUser !== 'function') return;
    const u = getUser();
    if (!u) return;
    const name = u?.user_metadata?.full_name || u?.email?.split('@')[0] || '—';
    const ini = name.charAt(0).toUpperCase();
    const av = document.getElementById('rTnAvatar');
    const un = document.getElementById('rTnUserName');
    if (av) av.textContent = ini;
    if (un) un.textContent = name;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { render(); setTimeout(fillUser, 400); });
  } else {
    render();
    setTimeout(fillUser, 400);
  }
})();
