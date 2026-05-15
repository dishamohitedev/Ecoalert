// ── EcoAlert Dashboard Page JS ──
import { initAuth, signOutUser } from '../auth.js';
import { openAuthModal } from '../authmodal.js';
import { fetchReports } from '../reports.js';
import { initDarkMode, toggleDarkMode, ISSUE_TYPES, SEVERITY_LEVELS, STATUS_TYPES,
  timeAgo, showToast } from '../utils.js';

initDarkMode();
document.getElementById('loginBtn')?.addEventListener('click', () => openAuthModal('login'));
document.getElementById('logoutBtn')?.addEventListener('click', signOutUser);
document.getElementById('hamburger')?.addEventListener('click', () => {
  document.getElementById('navLinks')?.classList.toggle('open');
});
document.getElementById('darkToggle')?.addEventListener('click', toggleDarkMode);
initAuth(() => {});

let allReports = [];

async function loadDashboard() {
  try {
    allReports = await fetchReports();
    renderStats(allReports);
    renderTypeChart(allReports);
    renderSeverityDonut(allReports);
    renderStatusRings(allReports);
    renderTopIssues(allReports);
    renderRecentActivity(allReports);
    renderTable(allReports);
  } catch (e) {
    showToast('Error loading analytics', 'error');
    console.error(e);
  }
}

// ─── Stats ───────────────────────────────────────────────────
function renderStats(reports) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) animateNum(el, val); };
  set('statTotal', reports.length);
  set('statActive', reports.filter(r => r.status === 'active').length);
  set('statProgress', reports.filter(r => r.status === 'in-progress').length);
  set('statResolved', reports.filter(r => r.status === 'resolved').length);
  set('statCritical', reports.filter(r => r.severity === 'critical').length);
}

function animateNum(el, target) {
  let cur = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const t = setInterval(() => { cur = Math.min(cur + step, target); el.textContent = cur; if (cur >= target) clearInterval(t); }, 40);
}

// ─── Type Bar Chart ──────────────────────────────────────────
function renderTypeChart(reports) {
  const container = document.getElementById('typeChart');
  if (!container) return;
  const counts = {};
  reports.forEach(r => { counts[r.type] = (counts[r.type] || 0) + 1; });
  const max = Math.max(...Object.values(counts), 1);
  container.innerHTML = Object.entries(ISSUE_TYPES).map(([key, cfg]) => {
    const val = counts[key] || 0;
    const pct = Math.round((val / max) * 100);
    return `<div class="bar-row">
      <span class="bar-label">${cfg.icon} ${cfg.label}</span>
      <div class="bar-track"><div class="bar-fill" style="width:0%;background:${cfg.markerColor}" data-pct="${pct}"></div></div>
      <span class="bar-val">${val}</span>
    </div>`;
  }).join('');
  // Animate bars
  setTimeout(() => {
    container.querySelectorAll('.bar-fill').forEach(el => {
      el.style.width = el.dataset.pct + '%';
    });
  }, 100);
}

// ─── Severity Donut ──────────────────────────────────────────
function renderSeverityDonut(reports) {
  const canvas = document.getElementById('severityCanvas');
  const legend = document.getElementById('donutLegend');
  if (!canvas) return;

  const counts = { low: 0, medium: 0, high: 0, critical: 0 };
  reports.forEach(r => { if (counts[r.severity] !== undefined) counts[r.severity]++; });

  const total = reports.length || 1;
  const colors = { low: '#4CAF50', medium: '#FF9800', high: '#F44336', critical: '#B71C1C' };
  const ctx = canvas.getContext('2d');
  const cx = 100, cy = 100, r = 70, innerR = 45;
  let startAngle = -Math.PI / 2;

  ctx.clearRect(0, 0, 200, 200);

  Object.entries(counts).forEach(([key, val]) => {
    const sweep = (val / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + sweep);
    ctx.closePath();
    ctx.fillStyle = colors[key];
    ctx.fill();
    startAngle += sweep;
  });

  // Inner circle
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-card').trim() || '#fff';
  ctx.fill();

  // Center text
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary').trim() || '#1a2e1a';
  ctx.font = 'bold 22px Syne, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(reports.length, cx, cy + 4);
  ctx.font = '11px DM Sans, sans-serif';
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#7a9278';
  ctx.fillText('Total', cx, cy + 18);

  // Legend
  if (legend) {
    legend.innerHTML = Object.entries(counts).map(([key, val]) =>
      `<div class="donut-legend-item">
        <div class="donut-legend-dot" style="background:${colors[key]}"></div>
        <span class="donut-legend-label">${SEVERITY_LEVELS[key].label}</span>
        <span class="donut-legend-val">${val}</span>
      </div>`
    ).join('');
  }
}

// ─── Status Rings ────────────────────────────────────────────
function renderStatusRings(reports) {
  const container = document.getElementById('statusRings');
  if (!container) return;
  const total = reports.length || 1;
  const statuses = [
    { key: 'active', label: 'Active', color: '#F44336' },
    { key: 'in-progress', label: 'In Progress', color: '#FF9800' },
    { key: 'resolved', label: 'Resolved', color: '#4CAF50' }
  ];
  container.innerHTML = statuses.map(s => {
    const count = reports.filter(r => r.status === s.key).length;
    const pct = Math.round((count / total) * 100);
    return `<div class="status-ring-item">
      <div class="status-ring-header">
        <span class="status-ring-label">${s.label}</span>
        <span class="status-ring-val" style="color:${s.color}">${count} (${pct}%)</span>
      </div>
      <div class="status-ring-track">
        <div class="status-ring-fill" style="width:0%;background:${s.color}" data-pct="${pct}"></div>
      </div>
    </div>`;
  }).join('');
  setTimeout(() => {
    container.querySelectorAll('.status-ring-fill').forEach(el => {
      el.style.width = el.dataset.pct + '%';
    });
  }, 100);
}

// ─── Top Issues ──────────────────────────────────────────────
function renderTopIssues(reports) {
  const container = document.getElementById('topIssuesList');
  if (!container) return;
  const counts = {};
  reports.forEach(r => { counts[r.type] = (counts[r.type] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;
  container.innerHTML = sorted.map(([key, val], i) => {
    const cfg = ISSUE_TYPES[key];
    const pct = Math.round((val / max) * 100);
    return `<div class="top-issue-item">
      <span class="top-issue-rank">${i + 1}</span>
      <span class="top-issue-icon">${cfg?.icon || '❓'}</span>
      <div class="top-issue-info">
        <div class="top-issue-label">${cfg?.label || key}</div>
        <div class="top-issue-count">${val} report${val !== 1 ? 's' : ''}</div>
      </div>
      <div class="top-issue-bar">
        <div style="height:6px;background:var(--bg-glass-2);border-radius:100px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${cfg?.markerColor};border-radius:100px;transition:width 1s"></div>
        </div>
      </div>
    </div>`;
  }).join('') || '<div class="empty-state" style="padding:24px"><div class="empty-icon">📊</div><div class="empty-title">No data yet</div></div>';
}

// ─── Recent Activity ─────────────────────────────────────────
function renderRecentActivity(reports) {
  const container = document.getElementById('recentActivity');
  if (!container) return;
  const recent = [...reports].sort((a, b) => {
    const aT = a.createdAt?.toDate?.() || new Date(0);
    const bT = b.createdAt?.toDate?.() || new Date(0);
    return bT - aT;
  }).slice(0, 6);

  container.innerHTML = recent.map(r => {
    const cfg = ISSUE_TYPES[r.type];
    const sta = STATUS_TYPES[r.status];
    return `<div class="activity-item">
      <span class="activity-icon">${cfg?.icon || '📌'}</span>
      <div class="activity-info">
        <div class="activity-text">
          <strong>${r.userName || 'A user'}</strong> reported <strong>${cfg?.label}</strong>
          <span class="badge badge-status-${r.status}" style="margin-left:6px;font-size:0.65rem">${sta?.label}</span>
        </div>
        <div class="activity-time">${timeAgo(r.createdAt)} · ${r.location?.address || 'Unknown'}</div>
      </div>
    </div>`;
  }).join('') || '<div class="empty-state" style="padding:24px"><div class="empty-icon">🕐</div><div class="empty-title">No recent activity</div></div>';
}

// ─── Table ───────────────────────────────────────────────────
function renderTable(reports) {
  const tbody = document.getElementById('reportsTableBody');
  if (!tbody) return;
  const typeFilter = document.getElementById('tableFilterType')?.value;
  const statusFilter = document.getElementById('tableFilterStatus')?.value;

  let filtered = reports;
  if (typeFilter) filtered = filtered.filter(r => r.type === typeFilter);
  if (statusFilter) filtered = filtered.filter(r => r.status === statusFilter);

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:40px;color:var(--text-muted)">No reports found</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(r => {
    const cfg = ISSUE_TYPES[r.type] || {};
    const sev = SEVERITY_LEVELS[r.severity] || {};
    const sta = STATUS_TYPES[r.status] || {};
    const initials = (r.userName || 'U').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
    return `<tr>
      <td><div class="table-type-cell">${cfg.icon || ''} ${cfg.label || r.type}</div></td>
      <td><div class="table-desc" title="${r.description}">${r.description}</div></td>
      <td><span class="badge badge-severity-${r.severity}">${sev.label || r.severity}</span></td>
      <td><span class="badge badge-status-${r.status}">${sta.icon || ''} ${sta.label || r.status}</span></td>
      <td><div class="table-location" title="${r.location?.address}">${r.location?.address || '—'}</div></td>
      <td><div class="table-reporter"><div class="reporter-avatar">${initials}</div>${r.userName || 'Anonymous'}</div></td>
      <td style="white-space:nowrap;font-size:0.75rem;color:var(--text-muted)">${timeAgo(r.createdAt)}</td>
      <td>👍 ${r.upvotes || 0}</td>
    </tr>`;
  }).join('');
}

// Table filter listeners
document.getElementById('tableFilterType')?.addEventListener('change', () => renderTable(allReports));
document.getElementById('tableFilterStatus')?.addEventListener('change', () => renderTable(allReports));

loadDashboard();
