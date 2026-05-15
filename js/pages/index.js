// ── EcoAlert Index Page JS ──
import { initDarkMode, toggleDarkMode, ISSUE_TYPES, timeAgo } from '../utils.js';
import { initAuthModal, openAuthModal } from '../authmodal.js';
import { initAuth, signOutUser, getCurrentUser } from '../auth.js';

// Initialize everything
initDarkMode();
initAuthModal();  // ← IMPORTANT: Initialize the modal

// Setup sign in button
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');

if (loginBtn) {
  loginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openAuthModal();  // ← Open the modal when clicked
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await signOutUser();
    window.location.reload();
  });
}

// Initialize auth to check login state
initAuth((user) => {
  if (user) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'flex';
  } else {
    if (loginBtn) loginBtn.style.display = 'flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
});

// Rest of your code...
renderIssueTypesGrid();

async function renderIssueTypesGrid() {
  const issueGrid = document.getElementById('issueTypesGrid');
  if (!issueGrid) return;
  
  Object.entries(ISSUE_TYPES).forEach(([key, cfg]) => {
    const card = document.createElement('div');
    card.className = 'issue-type-card';
    card.innerHTML = `<span class="issue-type-icon">${cfg.icon}</span>
      <div class="issue-type-label">${cfg.label}</div>
      <div class="issue-type-count" id="count-${key}">—</div>`;
    card.addEventListener('click', () => {
      window.location.href = `pages/map.html?type=${key}`;
    });
    issueGrid.appendChild(card);
  });
}

// Load reports and stats
window.addEventListener('load', async () => {
  try {
    const { fetchReports } = await import('../reports.js');
    const reports = await fetchReports();
    
    // Update stats
    document.getElementById('totalReports').textContent = reports.length;
    document.getElementById('resolvedCount').textContent = reports.filter(r => r.status === 'resolved').length;
    document.getElementById('activeCount').textContent = reports.filter(r => r.status === 'active').length;
    
    // Update type counts
    const typeCounts = {};
    reports.forEach(r => { typeCounts[r.type] = (typeCounts[r.type] || 0) + 1; });
    Object.keys(ISSUE_TYPES).forEach(key => {
      const el = document.getElementById(`count-${key}`);
      if (el) el.textContent = `${typeCounts[key] || 0} reports`;
    });
    
    // Render recent reports
    renderRecentReports(reports.slice(0, 6));
  } catch (e) {
    console.error('Error loading reports:', e);
  }
});

function renderRecentReports(reports) {
  const grid = document.getElementById('recentReportsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  
  if (!reports.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🌱</div><div class="empty-title">No reports yet</div></div>`;
    return;
  }
  
  reports.forEach(report => {
    const cfg = ISSUE_TYPES[report.type] || ISSUE_TYPES.garbage;
    const card = document.createElement('div');
    card.className = 'report-card';
    card.innerHTML = `
      <div class="report-card-body">
        <div class="report-card-header">
          <span class="badge badge-type">${cfg.icon} ${cfg.label}</span>
        </div>
        <p class="report-card-desc">${report.description}</p>
        <div class="report-card-footer">
          <span>📍 ${report.location?.address || 'Unknown'}</span>
          <span>${timeAgo(report.createdAt)}</span>
        </div>
      </div>`;
    card.addEventListener('click', () => {
      window.location.href = `pages/map.html?reportId=${report.id}`;
    });
    grid.appendChild(card);
  });
}