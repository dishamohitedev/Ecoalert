// Admin Dashboard JS
import { initAuth, signOutUser, getCurrentUser, ROLES } from '../auth.js';
import { initDarkMode, toggleDarkMode, showToast, timeAgo, ISSUE_TYPES, SEVERITY_LEVELS } from '../utils.js';
import { listenToReportsWithActions, confirmGovernmentAction, ACTION_STATUS } from '../reports.js';

initDarkMode();

document.getElementById('darkToggle')?.addEventListener('click', toggleDarkMode);
document.getElementById('logoutBtn')?.addEventListener('click', signOutUser);

let allReports = [];
let pendingConfirmReport = null;

initAuth(async (user, role) => {
  if (!user || role !== ROLES.ADMIN) {
    window.location.href = '../index.html';
    return;
  }
  startListening();
});

function startListening() {
  listenToReportsWithActions((reports) => {
    allReports = reports;
    updateStats();
    renderReportsList();
  });
}

function updateStats() {
  const total = allReports.length;
  const pendingGov = allReports.filter(r => !r.governmentAction || r.governmentAction.status === null).length;
  const waitingConfirm = allReports.filter(r => r.governmentAction?.status === ACTION_STATUS.PENDING).length;
  const approved = allReports.filter(r => r.governmentAction?.status === ACTION_STATUS.APPROVED).length;
  
  document.getElementById('adminTotal').textContent = total;
  document.getElementById('adminPendingGov').textContent = pendingGov;
  document.getElementById('adminWaitingConfirm').textContent = waitingConfirm;
  document.getElementById('adminApproved').textContent = approved;
}

function renderReportsList() {
  const container = document.getElementById('adminReportsList');
  const filter = document.getElementById('adminFilterStatus')?.value || 'all';
  
  let filtered = [...allReports];
  if (filter === 'pending_action') {
    filtered = filtered.filter(r => !r.governmentAction || r.governmentAction.status === null);
  } else if (filter === 'waiting_confirmation') {
    filtered = filtered.filter(r => r.governmentAction?.status === ACTION_STATUS.PENDING);
  } else if (filter === 'approved') {
    filtered = filtered.filter(r => r.governmentAction?.status === ACTION_STATUS.APPROVED);
  } else if (filter === 'rejected') {
    filtered = filtered.filter(r => r.governmentAction?.status === ACTION_STATUS.REJECTED);
  }
  
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No reports found</div></div>';
    return;
  }
  
  container.innerHTML = filtered.map(report => {
    const cfg = ISSUE_TYPES[report.type] || ISSUE_TYPES.garbage;
    const sev = SEVERITY_LEVELS[report.severity] || SEVERITY_LEVELS.medium;
    const action = report.governmentAction;
    let statusBadge = '';
    let actionButton = '';
    
    if (!action || action.status === null) {
      statusBadge = '<span class="badge badge-status-active">⚠️ No Government Action</span>';
    } else if (action.status === ACTION_STATUS.PENDING) {
      statusBadge = '<span class="badge badge-status-in-progress" style="background:#FF980020;color:#FF9800">⏳ Pending Admin Confirmation</span>';
      actionButton = `<button class="admin-action-btn" onclick="showConfirmModal('${report.id}')">📋 Review & Confirm</button>`;
      if (action.afterPhotos?.length) {
        actionButton += `<button class="admin-action-btn" onclick="viewPhotos('${report.id}')">📸 View Evidence</button>`;
      }
    } else if (action.status === ACTION_STATUS.APPROVED) {
      statusBadge = '<span class="badge badge-status-resolved">✅ Approved</span>';
    } else if (action.status === ACTION_STATUS.REJECTED) {
      statusBadge = '<span class="badge badge-status-active">❌ Rejected</span>';
    }
    
    return `<div class="admin-report-card">
      <div class="arc-header">
        <span class="arc-type-icon">${cfg.icon}</span>
        <div class="arc-info">
          <div class="arc-title">${cfg.label} <span class="badge badge-severity-${report.severity}">${sev.label}</span></div>
          <div class="arc-sub">Reported by ${report.userName} · ${timeAgo(report.createdAt)}</div>
        </div>
        <div class="arc-badges">${statusBadge}</div>
      </div>
      <div class="arc-detail">
        <div class="arc-detail-item"><span class="arc-detail-label">Location:</span> ${report.location?.address || 'Unknown'}</div>
        <div class="arc-detail-item"><span class="arc-detail-label">Description:</span> ${report.description}</div>
        ${action?.notes ? `<div class="arc-detail-item"><span class="arc-detail-label">Gov Notes:</span> ${action.notes}</div>` : ''}
        ${action?.completionNotes ? `<div class="arc-detail-item"><span class="arc-detail-label">Completion Notes:</span> ${action.completionNotes}</div>` : ''}
      </div>
      <div class="arc-actions">${actionButton}</div>
    </div>`;
  }).join('');
}

window.showConfirmModal = (reportId) => {
  pendingConfirmReport = reportId;
  const report = allReports.find(r => r.id === reportId);
  const action = report?.governmentAction;
  const cfg = ISSUE_TYPES[report?.type] || ISSUE_TYPES.garbage;
  
  document.getElementById('confirmModalTitle').textContent = `Confirm Action - ${cfg.label}`;
  document.getElementById('confirmModalBody').innerHTML = `
    <strong>Government Official:</strong> ${action?.startedByName || 'Unknown'}<br>
    <strong>Notes:</strong> ${action?.notes || 'No notes'}<br>
    ${action?.completionNotes ? `<strong>Completion Notes:</strong> ${action.completionNotes}<br>` : ''}
    ${action?.afterPhotos?.length ? `<strong>Evidence Photos:</strong> ${action.afterPhotos.length} uploaded` : ''}
  `;
  document.getElementById('adminNotes').value = '';
  document.getElementById('confirmModal').style.display = 'flex';
};

window.approveAction = async () => {
  if (!pendingConfirmReport) return;
  const notes = document.getElementById('adminNotes').value;
  await confirmGovernmentAction(pendingConfirmReport, true, notes);
  document.getElementById('confirmModal').style.display = 'none';
  pendingConfirmReport = null;
  showToast('Action approved successfully!', 'success');
};

window.rejectAction = async () => {
  if (!pendingConfirmReport) return;
  const notes = document.getElementById('adminNotes').value;
  await confirmGovernmentAction(pendingConfirmReport, false, notes);
  document.getElementById('confirmModal').style.display = 'none';
  pendingConfirmReport = null;
  showToast('Action rejected', 'info');
};

window.viewPhotos = (reportId) => {
  const report = allReports.find(r => r.id === reportId);
  const action = report?.governmentAction;
  if (action?.afterPhotos?.length) {
    const photoWindow = window.open('', '_blank');
    photoWindow.document.write(`
      <html><head><title>Evidence Photos</title><style>body{background:#0d150d;padding:20px;}img{max-width:100%;margin:10px 0;border-radius:10px;}</style></head>
      <body><h2>Evidence Photos</h2>${action.afterPhotos.map(url => `<img src="${url}">`).join('')}</body></html>
    `);
  }
};

document.getElementById('approveActionBtn')?.addEventListener('click', window.approveAction);
document.getElementById('rejectActionBtn')?.addEventListener('click', window.rejectAction);
document.getElementById('adminFilterStatus')?.addEventListener('change', () => renderReportsList());

// Close modal handlers
document.querySelector('#confirmModal .modal-actions .btn-ghost')?.addEventListener('click', () => {
  document.getElementById('confirmModal').style.display = 'none';
});