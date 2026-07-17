
const SUPA_URL = 'https://ehytkzxdhjyjuubizdnl.supabase.co';
const SUPA_KEY = 'sb_publishable_f_WsYxzN06B5dGROrkGyPQ_UDxKSbtO';

let sttRows = [];
let sttChart = null;

function sttHeaders() {
  const token = localStorage.getItem('sb_token') || SUPA_KEY;
  return { apikey: SUPA_KEY, Authorization: 'Bearer ' + token };
}

async function loadStats() {
  try {
    const r = await fetch(SUPA_URL + '/rest/v1/page_views?select=path,referrer,user_id,session_id,timezone,device_type,platform,created_at&order=created_at.desc&limit=20000', { headers: sttHeaders() });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    sttRows = await r.json();
    document.getElementById('sttLoading').style.display = 'none';
    document.getElementById('sttContent').style.display = 'block';
    renderStats(7);
  } catch (e) {
    document.getElementById('sttLoading').textContent = 'Veriler yüklenemedi: ' + e.message;
  }
}

function filterByDays(days) {
  if (!days) return sttRows;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return sttRows.filter(r => new Date(r.created_at).getTime() >= cutoff);
}

function bar(label, count, max) {
  const pct = max ? Math.max(4, Math.round((count / max) * 100)) : 0;
  return `<div class="stt-bar-row">
    <div class="stt-bar-label" title="${label}">${label}</div>
    <div class="stt-bar-track"><div class="stt-bar-fill" style="width:${pct}%"></div></div>
    <div class="stt-bar-count">${count}</div>
  </div>`;
}

function topN(rows, field, n) {
  const counts = {};
  rows.forEach(r => { const v = r[field] || '—'; counts[v] = (counts[v]||0) + 1; });
  return Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, n);
}

function renderStats(days) {
  const rows = filterByDays(days);
  const rangeLabel = days === 1 ? 'bugün' : days === 7 ? 'son 7 gün' : days === 30 ? 'son 30 gün' : 'tüm zamanlar';
  document.getElementById('sttSub').textContent = rows.length + ' görüntüleme — ' + rangeLabel;

  const sessions = new Set(rows.map(r => r.session_id));
  const mobileCount = rows.filter(r => r.device_type === 'mobile').length;
  const loggedInCount = rows.filter(r => r.user_id).length;

  document.getElementById('sttTotalViews').textContent = rows.length;
  document.getElementById('sttUniqueSessions').textContent = sessions.size;
  document.getElementById('sttMobileRatio').textContent = rows.length ? Math.round(mobileCount/rows.length*100) + '%' : '—';
  document.getElementById('sttLoggedInRatio').textContent = rows.length ? Math.round(loggedInCount/rows.length*100) + '%' : '—';

  const pages = topN(rows, 'path', 8);
  const pagesMax = pages.length ? pages[0][1] : 0;
  document.getElementById('sttTopPages').innerHTML = pages.length
    ? pages.map(([p,c]) => bar(p, c, pagesMax)).join('')
    : '<div class="stt-empty">Henüz veri yok</div>';

  const regions = topN(rows, 'timezone', 8);
  const regionsMax = regions.length ? regions[0][1] : 0;
  document.getElementById('sttRegions').innerHTML = regions.length
    ? regions.map(([tz,c]) => bar(tz === '—' ? 'Bilinmiyor' : tz.replace('_',' '), c, regionsMax)).join('')
    : '<div class="stt-empty">Henüz veri yok</div>';

  const devices = topN(rows, 'device_type', 4);
  const devicesMax = devices.length ? devices[0][1] : 0;
  const deviceLabels = { mobile: '📱 Mobil', desktop: '🖥️ Masaüstü' };
  document.getElementById('sttDevices').innerHTML = devices.length
    ? devices.map(([d,c]) => bar(deviceLabels[d] || d, c, devicesMax)).join('')
    : '<div class="stt-empty">Henüz veri yok</div>';

  const platforms = topN(rows, 'platform', 4);
  const platformsMax = platforms.length ? platforms[0][1] : 0;
  const platformLabels = { web: '🌐 Web', ios: '🍎 iOS', android: '🤖 Android' };
  document.getElementById('sttPlatforms').innerHTML = platforms.length
    ? platforms.map(([p,c]) => bar(platformLabels[p] || p, c, platformsMax)).join('')
    : '<div class="stt-empty">Henüz veri yok</div>';

  renderTrendChart(rows, days);
}

function renderTrendChart(rows, days) {
  const bucketDays = days === 1 ? 1 : (days || 30);
  const buckets = {};
  const now = new Date();
  for (let i = bucketDays - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0,10);
    buckets[key] = 0;
  }
  rows.forEach(r => {
    const key = r.created_at.slice(0,10);
    if (key in buckets) buckets[key]++;
    else if (!days) buckets[key] = (buckets[key]||0) + 1;
  });
  const labels = Object.keys(buckets).sort();
  const data = labels.map(k => buckets[k]);
  const displayLabels = labels.map(l => { const d = new Date(l); return d.getDate() + '.' + (d.getMonth()+1); });

  const ctx = document.getElementById('sttTrendChart').getContext('2d');
  if (sttChart) sttChart.destroy();
  sttChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: displayLabels,
      datasets: [{
        data, fill: true, tension: 0.35,
        borderColor: '#FFC83D', backgroundColor: 'rgba(255,200,61,0.12)',
        pointRadius: 0, pointHoverRadius: 4, borderWidth: 2
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#78829A', font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: '#78829A', font: { size: 10 }, precision: 0 }, grid: { color: 'rgba(120,130,154,0.12)' } }
      }
    }
  });
}

document.getElementById('sttRange').addEventListener('click', (e) => {
  const btn = e.target.closest('.stt-range-btn');
  if (!btn) return;
  document.querySelectorAll('.stt-range-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderStats(parseInt(btn.dataset.days));
});

(async function init() {
  const ok = await requireAuth(); if (!ok) return;
  if (!isAdmin()) {
    document.querySelector('.page').innerHTML = '<div class="stt-empty" style="padding:80px 20px;">Bu sayfayı görüntüleme yetkin yok.</div>';
    return;
  }
  loadStats();
})();
