// ── EcoAlert Index Page JS (Fixed Dark Mode) ──
import { initDarkMode, toggleDarkMode, ISSUE_TYPES, timeAgo } from '../utils.js';
import { initAuthModal, openAuthModal } from '../authmodal.js';
import { initAuth, signOutUser } from '../auth.js';

// Initialize dark mode FIRST
initDarkMode();

// Initialize auth modal
initAuthModal();

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const darkToggle = document.getElementById('darkToggle');

// === FIX: Dark Mode Toggle ===
if (darkToggle) {
  // Remove old event listeners by cloning
  const newDarkToggle = darkToggle.cloneNode(true);
  darkToggle.parentNode.replaceChild(newDarkToggle, darkToggle);
  
  // Add fresh event listener
  newDarkToggle.addEventListener('click', (e) => {
    e.preventDefault();
    const isDark = toggleDarkMode();
    newDarkToggle.textContent = isDark ? '☀️' : '🌙';
  });
}

// === Sign In Button ===
if (loginBtn) {
  const newLoginBtn = loginBtn.cloneNode(true);
  loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);
  
  newLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal();
  });
}

// === Sign Out Button ===
if (logoutBtn) {
  const newLogoutBtn = logoutBtn.cloneNode(true);
  logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
  
  newLogoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await signOutUser();
  });
}

// Initialize auth
initAuth((user) => {
  const loginBtnElem = document.getElementById('loginBtn');
  const logoutBtnElem = document.getElementById('logoutBtn');
  
  if (user) {
    if (loginBtnElem) loginBtnElem.style.display = 'none';
    if (logoutBtnElem) logoutBtnElem.style.display = 'flex';
  } else {
    if (loginBtnElem) loginBtnElem.style.display = 'flex';
    if (logoutBtnElem) logoutBtnElem.style.display = 'none';
  }
  
  loadDashboardData();
});

// Load data asynchronously
async function loadDashboardData() {
  try {
    const { fetchReports } = await import('../reports.js');
    const reports = await fetchReports();
    
    animateNumber('totalReports', reports.length);
    animateNumber('resolvedCount', reports.filter(r => r.status === 'resolved').length);
    animateNumber('activeCount', reports.filter(r => r.status === 'active').length);
    
    updateTypeCounts(reports);
    renderRecentReports(reports.slice(0, 6));
  } catch (error) {
    console.error('Error loading reports:', error);
    useDummyData();
  }
}

function useDummyData() {
  animateNumber('totalReports', 6);
  animateNumber('resolvedCount', 1);
  animateNumber('activeCount', 4);
}

function animateNumber(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;
  let current = 0;
  const step = Math.ceil(target / 20);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 30);
}

function updateTypeCounts(reports) {
  const typeCounts = {};
  reports.forEach(r => { typeCounts[r.type] = (typeCounts[r.type] || 0) + 1; });
  
  Object.keys(ISSUE_TYPES).forEach(key => {
    const el = document.getElementById(`count-${key}`);
    if (el) el.textContent = `${typeCounts[key] || 0} reports`;
  });
}

function renderRecentReports(reports) {
  const grid = document.getElementById('recentReportsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  
  if (!reports.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1; text-align:center; padding:40px;">
      <div class="empty-icon">🌱</div>
      <div class="empty-title">No reports yet</div>
      <div class="empty-text">Be the first to report an issue!</div>
    </div>`;
    return;
  }
  
  reports.forEach(report => {
    const cfg = ISSUE_TYPES[report.type] || ISSUE_TYPES.garbage;
    const card = document.createElement('div');
    card.className = 'report-card';
    card.style.cursor = 'pointer';
    card.innerHTML = `
      <div class="report-card-body">
        <div class="report-card-header">
          <span class="badge badge-type">${cfg.icon} ${cfg.label}</span>
        </div>
        <p class="report-card-desc">${report.description?.substring(0, 100) || ''}</p>
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

function renderIssueTypesGrid() {
  const issueGrid = document.getElementById('issueTypesGrid');
  if (!issueGrid) return;
  
  issueGrid.innerHTML = '';
  Object.entries(ISSUE_TYPES).forEach(([key, cfg]) => {
    const card = document.createElement('div');
    card.className = 'issue-type-card';
    card.innerHTML = `
      <span class="issue-type-icon">${cfg.icon}</span>
      <div class="issue-type-label">${cfg.label}</div>
      <div class="issue-type-count" id="count-${key}">—</div>`;
    card.addEventListener('click', () => {
      window.location.href = `pages/map.html?type=${key}`;
    });
    issueGrid.appendChild(card);
  });
}

// Initialize
renderIssueTypesGrid();