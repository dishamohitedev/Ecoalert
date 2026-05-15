// ── EcoAlert Index Page JS ──
// Firebase imports are dynamic so the page HTML renders instantly first
import { initDarkMode, toggleDarkMode, ISSUE_TYPES, SEVERITY_LEVELS, STATUS_TYPES,
  timeAgo, showToast } from '../utils.js';

// ─── Render immediately (no Firebase needed) ─────────────────
initDarkMode();
renderIssueTypesGrid();   // static, no data needed
setupNavHandlers();

// ─── Then load Firebase lazily ───────────────────────────────
window.addEventListener('load', () => {
  loadFirebaseData();
});

function setupNavHandlers() {
  document.getElementById('hamburger')?.addEventListener('click', () => {
    document.getElementById('navLinks')?.classList.toggle('open');
  });
  document.getElementById('darkToggle')?.addEventListener('click', toggleDarkMode);
}

// ─── Auth (lazy) ─────────────────────────────────────────────
async function loadFirebaseData() {
  try {
    const [{ initAuth, signOutUser }, { openAuthModal }, { fetchReports }] = await Promise.all([
      import('../auth.js'),
      import('../authmodal.js'),
      import('../reports.js')
    ]);

    document.getElementById('loginBtn')?.addEventListener('click', () => openAuthModal('login'));
    document.getElementById('logoutBtn')?.addEventListener('click', signOutUser);

    initAuth((user) => {
      if (user) {
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'flex';
        const avatar = document.getElementById('userAvatar');
        if (avatar) { avatar.src = user.photoURL || ''; avatar.style.display = 'block'; }
      }
    });

    const reports = await fetchReports();
    renderStats(reports);
    updateIssueTypeCounts(reports);
    renderRecentReports(reports.slice(0, 6));
  } catch (e) {
    console.error('Firebase load error:', e);
    // Still show dummy data counts
    animateCount('totalReports', 6);
    animateCount('resolvedCount', 1);
    animateCount('activeCount', 4);
  }
}

// ─── Issue Types Grid (static — no data needed) ───────────────
function renderIssueTypesGrid() {
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

function updateIssueTypeCounts(reports) {
  const typeCounts = {};
  reports.forEach(r => { typeCounts[r.type] = (typeCounts[r.type] || 0) + 1; });
  Object.keys(ISSUE_TYPES).forEach(key => {
    const el = document.getElementById(`count-${key}`);
    if (el) el.textContent = `${typeCounts[key] || 0} reports`;
  });
}

// ─── Stats ───────────────────────────────────────────────────
function renderStats(reports) {
  const total = reports.length;
  const resolved = reports.filter(r => r.status === 'resolved').length;
  const active = reports.filter(r => r.status === 'active').length;
  animateCount('totalReports', total);
  animateCount('resolvedCount', resolved);
  animateCount('activeCount', active);
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 40));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 30);
}

// ─── Recent Reports ──────────────────────────────────────────
function renderRecentReports(reports) {
  const grid = document.getElementById('recentReportsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (!reports.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">🌱</div>
      <div class="empty-title">No reports yet</div>
      <div class="empty-text">Be the first to report an issue in your area!</div>
    </div>`;
    return;
  }

  reports.forEach((report, i) => {
    const cfg = ISSUE_TYPES[report.type] || ISSUE_TYPES.garbage;
    const sev = SEVERITY_LEVELS[report.severity] || SEVERITY_LEVELS.medium;
    const sta = STATUS_TYPES[report.status] || STATUS_TYPES.active;
    const card = document.createElement('div');
    card.className = `report-card fade-in stagger-${Math.min(i + 1, 5)}`;
    card.innerHTML = `
      ${report.imageURL
        ? `<img class="report-card-image" src="${report.imageURL}" alt="Report" loading="lazy" decoding="async" onerror="this.style.display='none'">`
        : `<div class="report-card-image-placeholder">${cfg.icon}</div>`}
      <div class="report-card-body">
        <div class="report-card-header">
          <span class="badge badge-type">${cfg.icon} ${cfg.label}</span>
          <span class="badge badge-severity-${report.severity}">${sev.label}</span>
        </div>
        <p class="report-card-desc">${report.description}</p>
        <div class="report-card-footer">
          <span class="report-card-location">📍 ${report.location?.address || 'Unknown'}</span>
          <div style="display:flex;gap:8px;align-items:center">
            <span class="badge badge-status-${report.status}">${sta.icon} ${sta.label}</span>
            <span style="font-size:0.72rem;color:var(--text-muted)">${timeAgo(report.createdAt)}</span>
          </div>
        </div>
      </div>`;
    card.addEventListener('click', () => {
      window.location.href = `pages/map.html?reportId=${report.id}`;
    });
    grid.appendChild(card);
  });
}