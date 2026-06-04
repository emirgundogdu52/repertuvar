// auth.js — tüm sayfalarda kullanılan auth yardımcı fonksiyonları
var SUPA_URL = 'https://ehytkzxdhjyjuubizdnl.supabase.co';
var SUPA_KEY = 'sb_publishable_f_WsYxzN06B5dGROrkGyPQ_UDxKSbtO';

const ADMIN_USER_ID = '4f965624-e524-4cb0-a351-3368f1297d28';

function getToken() { return localStorage.getItem('sb_token'); }
function getUser() {
  try { return JSON.parse(localStorage.getItem('sb_user')); } catch(e) { return null; }
}
function getUserId() { return getUser()?.id || null; }
function getUserName() {
  const u = getUser();
  return u?.user_metadata?.full_name || u?.email?.split('@')[0] || 'Kullanıcı';
}
function isAdmin() {
  return getUserId() === ADMIN_USER_ID;
}

function authHeaders() {
  const token = getToken();
  return {
    'apikey': SUPA_KEY,
    'Authorization': 'Bearer ' + (token || SUPA_KEY),
    'Content-Type': 'application/json'
  };
}

async function requireAuth() {
  const token = getToken();
  if (!token) { window.location.href = 'login.html'; return false; }
  try {
    const r = await fetch(SUPA_URL+'/auth/v1/user', {
      headers: {'apikey': SUPA_KEY, 'Authorization': 'Bearer '+token}
    });
    if (!r.ok) {
      const refresh = localStorage.getItem('sb_refresh');
      if (refresh) {
        const r2 = await fetch(SUPA_URL+'/auth/v1/token?grant_type=refresh_token', {
          method: 'POST',
          headers: {'apikey': SUPA_KEY, 'Content-Type': 'application/json'},
          body: JSON.stringify({refresh_token: refresh})
        });
        if (r2.ok) {
          const data = await r2.json();
          localStorage.setItem('sb_token', data.access_token);
          localStorage.setItem('sb_refresh', data.refresh_token);
          localStorage.setItem('sb_user', JSON.stringify(data.user));
          return true;
        }
      }
      logout();
      return false;
    }
    const user = await r.json();
    localStorage.setItem('sb_user', JSON.stringify(user));
    return true;
  } catch(e) {
    const cachedUser = getUser();
    if (!cachedUser) { window.location.href = 'login.html'; return false; }
    return true;
  }
}

function logout() {
  const token = getToken();
  if (token) {
    fetch(SUPA_URL+'/auth/v1/logout', {
      method: 'POST',
      headers: {'apikey': SUPA_KEY, 'Authorization': 'Bearer '+token}
    }).catch(()=>{});
  }
  localStorage.removeItem('sb_token');
  localStorage.removeItem('sb_refresh');
  localStorage.removeItem('sb_user');
  window.location.href = 'login.html?logout=1';
}

function renderUserBadge(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const name = getUserName();
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-left:auto;">
      <span style="font-size:12px;color:var(--text2);">${name}</span>
      <button onclick="logout()" style="padding:4px 10px;border-radius:6px;border:1px solid var(--border);
        background:none;color:var(--text3);font-size:11px;cursor:pointer;font-family:inherit;"
        onmouseover="this.style.borderColor='var(--red)';this.style.color='var(--red)'"
        onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text3)'">
        Çıkış
      </button>
    </div>`;
}
