// ── EcoAlert Admin Page JS ──
import { initAuth, signOutUser, isAdmin, getCurrentUser } from '../auth.js';
import { listenToReports, updateReportStatus, deleteReport } from '../reports.js';
import { initDarkMode, toggleDarkMode, ISSUE_TYPES, SEVERITY_LEVELS, STATUS_TYPES,
  timeAgo, showToast } from '../utils.js';

initDarkMode();
document.getElementById('logoutBtn')?.addEventListener('click', signOutUser);
document.getElementById('hamburger')?.addEventListener('click', () => {
  document.getElementById('navLinks')?.classList.toggle('open');
});
document.getElementById('darkToggle')?.addEventListener('click', toggleDarkMode);

let allReports = [];
let pendingAction = null;
let unsubscribe = null;

initAuth(async (user) => {
  if (!user) {
    document.getElementById('adminContent').style.display = 'none';
    document.getElementById('adminAccessDenied').style.display = 'block';
    return;
  }

  // For demo: allow any logged-in user to see admin panel
  // In production: check isAdmin(user.uid)
  const admin = true; // await isAdmin(user.uid);
  if (!admin) {
    document.getElementById('adminContent').style.display = 'none';
    document.getElementById('adminAccessDenied').style.display = 'block';
    return;
  }

  document.getElementById('adminContent').style.display = 'block';
  document.getElementById('adminAccessDenied').style.display = 'none';
  startListening();
});

function startListening() {
  if (unsubscribe) unsubscribe();
  unsubscribe = listenToReports((reports) => {
    allReports = reports;
    renderAdminStats(reports);
    renderAdminReports(reports);
  });
}

function renderAdminStats(reports) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('adminTotal', reports.length);
  set('adminPending', reports.filter(r => r.status === 'active').length);
  const today = new Date(); today.setHours(0,0,0,0);
  set('adminResolved', reports.filter(r => {
    const d = r.updatedAt?.toDate?.() || r.createdAt?.toDate?.() || new Date(0);
    return r.status === 'resolved' && d >= today;
  }).length);
  set('adminUsers', new Set(reports.map(r => r.userId)).size);
}

function getFilters() {
  return {
    type: document.getElementById('adminFilterType')?.value || '',
    status: document.getElementById('adminFilterStatus')?.value || '',
    severity: document.getElementById('adminFilterSeverity')?.value || ''
  };
}

function renderAdminReports(reports) {
  const filters = getFilters();
  const filtered = reports.filter(r => {
    if (filters.type && r.type !== filters.type) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.severity && r.severity !== filters.severity) return false;
    return true;
  });

  const container = document.getElementById('adminReportsList');
  if (!container) return;

  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state" style="padding:60px"><div class="empty-icon">🌿</div><div class="empty-title">No reports found</div></div>`;
    return;
  }

  container.innerHTML = filtered.map(r => {
    const cfg = ISSUE_TYPES[r.type] || {};
    const sev = SEVERITY_LEVELS[r.severity] || {};
    const sta = STATUS_TYPES[r.status] || {};
    const cardClass = r.severity === 'critical' ? 'critical-card' : r.severity === 'high' ? 'high-card' : '';

    return `<div class="admin-report-card ${cardClass}">
      <div class="arc-header">
        <span class="arc-type-icon">${cfg.icon || '📌'}</span>
        <div class="arc-info">
          <div class="arc-title">
            ${cfg.label || r.type}
            <span class="badge badge-severity-${r.severity}">${sev.label}</span>
          </div>
          <div class="arc-sub">By ${r.userName || 'Anonymous'} · ${r.location?.address || 'Unknown'} · ${timeAgo(r.createdAt)}</div>
        </div>
        <div class="arc-badges">
          <span class="badge badge-status-${r.status}">${sta.icon} ${sta.label}</span>
          <span style="font-size:0.75rem;color:var(--text-muted)">👍 ${r.upvotes || 0}</span>
        </div>
      </div>
      ${r.imageURL ? `<img class="arc-image" src="${r.imageURL}" alt="report" loading="lazy">` : ''}
      <div class="arc-detail">
        <div class="arc-detail-item"><span class="arc-detail-label">Description:</span><span class="arc-detail-val">${r.description?.slice(0, 120) || '—'}${r.description?.length > 120 ? '...' : ''}</span></div>
        <div class="arc-detail-item"><span class="arc-detail-label">ID:</span><span class="arc-detail-val" style="font-size:0.68rem;font-family:monospace">${r.id}</span></div>
      </div>
      <div class="arc-actions">
        ${r.status !== 'in-progress' ? `<button class="admin-action-btn progress" onclick="adminAction('progress','${r.id}')">🟡 Mark In Progress</button>` : ''}
        ${r.status !== 'resolved' ? `<button class="admin-action-btn resolve" onclick="adminAction('resolve','${r.id}')">✅ Mark Resolved</button>` : ''}
        ${r.status !== 'active' ? `<button class="admin-action-btn" onclick="adminAction('active','${r.id}')">🔴 Reopen</button>` : ''}
        <button class="admin-action-btn delete" onclick="adminAction('delete','${r.id}')">🗑️ Delete</button>
      </div>
    </div>`;
  }).join('');
}

// Expose to inline onclick
window.adminAction = (action, id) => {
  const report = allReports.find(r => r.id === id);
  const cfg = ISSUE_TYPES[report?.type] || {};
  pendingAction = { action, id };

  const titles = { resolve: '✅ Mark as Resolved', progress: '🟡 Mark In Progress', active: '🔴 Reopen Report', delete: '🗑️ Delete Report' };
  const bodies = {
    resolve: `Mark "${cfg.label || 'this report'}" as resolved? This indicates the issue has been fixed.`,
    progress: `Mark "${cfg.label || 'this report'}" as in-progress? This indicates authorities are working on it.`,
    active: `Reopen "${cfg.label || 'this report'}"? This will mark it as active again.`,
    delete: `⚠️ Delete this report permanently? This cannot be undone. Only delete fake or inappropriate reports.`
  };

  document.getElementById('modalTitle').textContent = titles[action] || 'Confirm';
  document.getElementById('modalBody').textContent = bodies[action] || 'Are you sure?';
  document.getElementById('confirmModal').style.display = 'flex';
  const confirmBtn = document.getElementById('modalConfirm');
  confirmBtn.className = action === 'delete' ? 'btn btn-danger' : 'btn btn-primary';
};

document.getElementById('modalCancel')?.addEventListener('click', () => {
  document.getElementById('confirmModal').style.display = 'none';
  pendingAction = null;
});

document.getElementById('modalConfirm')?.addEventListener('click', async () => {
  if (!pendingAction) return;
  const { action, id } = pendingAction;
  document.getElementById('confirmModal').style.display = 'none';
  pendingAction = null;

  try {
    if (action === 'delete') {
      await deleteReport(id);
      showToast('Report deleted', 'success');
    } else {
      const statusMap = { resolve: 'resolved', progress: 'in-progress', active: 'active' };
      await updateReportStatus(id, statusMap[action]);
      showToast(`Status updated to ${statusMap[action]}`, 'success');
    }
  } catch (e) {
    // Demo mode — update locally
    const report = allReports.find(r => r.id === id);
    if (report) {
      if (action === 'delete') allReports = allReports.filter(r => r.id !== id);
      else { const statusMap = { resolve: 'resolved', progress: 'in-progress', active: 'active' }; report.status = statusMap[action]; }
      renderAdminReports(allReports);
      renderAdminStats(allReports);
      showToast('Updated (demo mode)', 'info');
    }
  }
});

['adminFilterType','adminFilterStatus','adminFilterSeverity'].forEach(id => {
  document.getElementById(id)?.addEventListener('change', () => renderAdminReports(allReports));
});
