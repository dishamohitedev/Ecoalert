// Government Dashboard JS
import { initAuth, signOutUser, getCurrentUser, ROLES } from '../auth.js';
import { initDarkMode, toggleDarkMode, showToast, timeAgo, ISSUE_TYPES, SEVERITY_LEVELS } from '../utils.js';
import { listenToReportsWithActions, startGovernmentAction, completeGovernmentAction, ACTION_STATUS } from '../reports.js';

initDarkMode();

document.getElementById('darkToggle')?.addEventListener('click', toggleDarkMode);
document.getElementById('logoutBtn')?.addEventListener('click', signOutUser);

let allReports = [];
let pendingActionReport = null;
let pendingActionType = null;

initAuth(async (user, role) => {
  if (!user || role !== ROLES.GOVERNMENT) {
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
  const pendingAction = allReports.filter(r => !r.governmentAction || r.governmentAction.status === null).length;
  const waitingConfirm = allReports.filter(r => r.governmentAction?.status === ACTION_STATUS.PENDING).length;
  const completed = allReports.filter(r => r.governmentAction?.status === ACTION_STATUS.APPROVED).length;
  
  document.getElementById('govTotal').textContent = total;
  document.getElementById('govPending').textContent = pendingAction;
  document.getElementById('govWaitingConfirm').textContent = waitingConfirm;
  document.getElementById('govCompleted').textContent = completed;
}

function renderReportsList() {
  const container = document.getElementById('govReportsList');
  const filter = document.getElementById('govFilterStatus')?.value || 'all';
  
  let filtered = [...allReports];
  if (filter === 'pending') {
    filtered = filtered.filter(r => !r.governmentAction || r.governmentAction.status === null);
  } else if (filter === 'waiting') {
    filtered = filtered.filter(r => r.governmentAction?.status === ACTION_STATUS.PENDING);
  } else if (filter === 'completed') {
    filtered = filtered.filter(r => r.governmentAction?.status === ACTION_STATUS.APPROVED);
  }
  
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No reports found</div></div>';
    return;
  }
  
  container.innerHTML = filtered.map(report => {
    const cfg = ISSUE_TYPES[report.type] || ISSUE_TYPES.garbage;
    const sev = SEVERITY_LEVELS[report.severity] || SEVERITY_LEVELS.medium;
    const action = report.governmentAction;
    let actionBadge = '';
    let actionButtons = '';
    
    if (!action || action.status === null) {
      actionBadge = '<span class="badge badge-status-active">⚠️ No Action Taken</span>';
      actionButtons = `<button class="admin-action-btn" onclick="showActionModal('${report.id}', 'start')">🚀 Mark Action Started</button>`;
    } else if (action.status === ACTION_STATUS.PENDING) {
      actionBadge = '<span class="badge badge-status-in-progress">⏳ Waiting Admin Confirmation</span>';
      if (!action.completedAt) {
        actionButtons = `<button class="admin-action-btn resolve" onclick="showActionModal('${report.id}', 'complete')">✅ Mark Completed</button>`;
      }
    } else if (action.status === ACTION_STATUS.APPROVED) {
      actionBadge = '<span class="badge badge-status-resolved">✅ Admin Approved</span>';
    } else if (action.status === ACTION_STATUS.REJECTED) {
      actionBadge = '<span class="badge badge-status-active">❌ Admin Rejected</span>';
      actionButtons = `<button class="admin-action-btn" onclick="showActionModal('${report.id}', 'start')">🔄 Re-submit Action</button>`;
    }
    
    return `<div class="admin-report-card">
      <div class="arc-header">
        <span class="arc-type-icon">${cfg.icon}</span>
        <div class="arc-info">
          <div class="arc-title">${cfg.label} <span class="badge badge-severity-${report.severity}">${sev.label}</span></div>
          <div class="arc-sub">Reported by ${report.userName} · ${timeAgo(report.createdAt)}</div>
        </div>
        <div class="arc-badges">${actionBadge}</div>
      </div>
      <div class="arc-detail">
        <div class="arc-detail-item"><span class="arc-detail-label">Location:</span> ${report.location?.address || 'Unknown'}</div>
        <div class="arc-detail-item"><span class="arc-detail-label">Description:</span> ${report.description}</div>
        ${action?.notes ? `<div class="arc-detail-item"><span class="arc-detail-label">Your Notes:</span> ${action.notes}</div>` : ''}
      </div>
      <div class="arc-actions">${actionButtons}</div>
    </div>`;
  }).join('');
}

window.showActionModal = (reportId, actionType) => {
  pendingActionReport = reportId;
  pendingActionType = actionType;
  const report = allReports.find(r => r.id === reportId);
  const cfg = ISSUE_TYPES[report?.type] || ISSUE_TYPES.garbage;
  
  const modal = document.getElementById('actionModal');
  const title = document.getElementById('actionModalTitle');
  const photoGroup = document.getElementById('photoUploadGroup');
  
  if (actionType === 'start') {
    title.textContent = `🚀 Start Action - ${cfg.label}`;
    photoGroup.style.display = 'none';
  } else {
    title.textContent = `✅ Mark Completed - ${cfg.label}`;
    photoGroup.style.display = 'block';
  }
  
  document.getElementById('actionNotes').value = '';
  document.getElementById('actionPhoto').value = '';
  modal.style.display = 'flex';
};

document.getElementById('closeModalBtn')?.addEventListener('click', () => {
  document.getElementById('actionModal').style.display = 'none';
  pendingActionReport = null;
});

document.getElementById('confirmActionBtn')?.addEventListener('click', async () => {
  if (!pendingActionReport) return;
  
  const notes = document.getElementById('actionNotes').value;
  const photoFile = document.getElementById('actionPhoto')?.files[0];
  
  try {
    if (pendingActionType === 'start') {
      await startGovernmentAction(pendingActionReport, notes);
    } else {
      await completeGovernmentAction(pendingActionReport, photoFile, notes);
    }
    document.getElementById('actionModal').style.display = 'none';
  } catch (error) {
    showToast(error.message, 'error');
  }
});

document.getElementById('govFilterStatus')?.addEventListener('change', () => renderReportsList());