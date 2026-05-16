// ── EcoAlert Map Page JS ──
import { initAuth, signOutUser } from '../auth.js';
import { initAuthModal, openAuthModal } from '../authmodal.js';
import { listenToReports } from '../reports.js';
import { initMap, renderMarkers, toggleHeatmap, showUserLocation, panTo, checkNearbyAlerts } from '../map.js';
import { initDarkMode, toggleDarkMode, ISSUE_TYPES, SEVERITY_LEVELS, STATUS_TYPES,
  getCurrentLocation, showToast, timeAgo } from '../utils.js';

initDarkMode();
initAuthModal();

// ─── Auth Buttons ────────────────────────────────────────────
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const darkToggle = document.getElementById('darkToggle');

if (loginBtn) {
  const newLoginBtn = loginBtn.cloneNode(true);
  loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);
  newLoginBtn.addEventListener('click', (e) => { e.preventDefault(); openAuthModal(); });
}

if (logoutBtn) {
  const newLogoutBtn = logoutBtn.cloneNode(true);
  logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
  newLogoutBtn.addEventListener('click', async (e) => { e.preventDefault(); await signOutUser(); });
}

if (darkToggle) {
  const newDarkToggle = darkToggle.cloneNode(true);
  darkToggle.parentNode.replaceChild(newDarkToggle, darkToggle);
  newDarkToggle.addEventListener('click', (e) => {
    e.preventDefault();
    const isDark = toggleDarkMode();
    newDarkToggle.textContent = isDark ? '☀️' : '🌙';
  });
}

// ─── State ──────────────────────────────────────────────────
let allReports = [];
let heatmapOn = false;
let userLocation = null;
let unsubscribe = null;

const urlParams = new URLSearchParams(window.location.search);
const filterType = urlParams.get('type') || '';
const deepLinkId = urlParams.get('reportId') || '';
if (filterType) {
  const filterTypeSelect = document.getElementById('filterType');
  if (filterTypeSelect) filterTypeSelect.value = filterType;
}

// ─── Init Map ────────────────────────────────────────────────
const map = initMap('mainMap', { center: [19.076, 72.877], zoom: 12 });

// ─── Start Live Listener ─────────────────────────────────────
function startListening() {
  if (unsubscribe) unsubscribe();

  unsubscribe = listenToReports((reports) => {
    console.log('📍 map-page received reports:', reports.length);
    allReports = reports;
    applyFiltersAndRender();
    updateSidebarStats(reports);

    if (deepLinkId) {
      const target = reports.find(r => r.id === deepLinkId);
      if (target?.location) panTo(target.location.lat, target.location.lng, 16);
    }
  });
}

// ─── Wait for auth before starting listener ──────────────────
// If Firestore rules require auth, firing before auth resolves causes
// a silent permission-denied error and falls back to dummy data.
initAuth((user) => {
  console.log('🔐 Auth resolved:', user ? user.email : 'anonymous');
  startListening();
});

// ─── Filters ────────────────────────────────────────────────
function getFilters() {
  return {
    type: document.getElementById('filterType')?.value || '',
    severity: document.getElementById('filterSeverity')?.value || '',
    status: document.getElementById('filterStatus')?.value || ''
  };
}

function applyFiltersAndRender() {
  const filters = getFilters();
  const count = renderMarkers(allReports, filters, onMarkerClick);
  renderSidebarList(allReports, filters);
  const countBadge = document.getElementById('reportCountBadge');
  if (countBadge) countBadge.textContent = count;
}

const filterTypeElem = document.getElementById('filterType');
const filterSeverityElem = document.getElementById('filterSeverity');
const filterStatusElem = document.getElementById('filterStatus');

if (filterTypeElem) filterTypeElem.addEventListener('change', applyFiltersAndRender);
if (filterSeverityElem) filterSeverityElem.addEventListener('change', applyFiltersAndRender);
if (filterStatusElem) filterStatusElem.addEventListener('change', applyFiltersAndRender);

const clearFiltersBtn = document.getElementById('clearFilters');
if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener('click', () => {
    if (filterTypeElem) filterTypeElem.value = '';
    if (filterSeverityElem) filterSeverityElem.value = '';
    if (filterStatusElem) filterStatusElem.value = '';
    applyFiltersAndRender();
  });
}

// ─── Sidebar Stats ───────────────────────────────────────────
function updateSidebarStats(reports) {
  const totalEl = document.getElementById('msTotal');
  const activeEl = document.getElementById('msActive');
  const progressEl = document.getElementById('msProgress');
  const resolvedEl = document.getElementById('msResolved');

  if (totalEl) totalEl.textContent = reports.length;
  if (activeEl) activeEl.textContent = reports.filter(r => r.status === 'active').length;
  if (progressEl) progressEl.textContent = reports.filter(r => r.status === 'in-progress').length;
  if (resolvedEl) resolvedEl.textContent = reports.filter(r => r.status === 'resolved').length;
}

// ─── Sidebar List ────────────────────────────────────────────
function renderSidebarList(reports, filters) {
  const list = document.getElementById('sidebarReportList');
  if (!list) return;

  let filtered = reports.filter(r => {
    if (filters.type && r.type !== filters.type) return false;
    if (filters.severity && r.severity !== filters.severity) return false;
    if (filters.status && r.status !== filters.status) return false;
    return true;
  });

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state" style="padding:32px 16px">
      <div class="empty-icon">🔍</div>
      <div class="empty-title">No reports found</div>
    </div>`;
    return;
  }

  list.innerHTML = filtered.map(r => {
    const cfg = ISSUE_TYPES[r.type] || ISSUE_TYPES.garbage;
    const sev = SEVERITY_LEVELS[r.severity] || SEVERITY_LEVELS.medium;
    return `<div class="sidebar-report-item" data-id="${r.id}" onclick="window.ecoFlyTo('${r.id}')">
      <div class="sri-header">
        <span class="sri-type">${cfg.icon} ${cfg.label}</span>
        <span class="sri-severity badge" style="background:${sev.bg};color:${sev.color}">${sev.label}</span>
      </div>
      <div class="sri-desc">${r.description?.substring(0, 80) || ''}${r.description?.length > 80 ? '...' : ''}</div>
      <div class="sri-footer">
        <span>📍 ${r.location?.address || 'Unknown'}</span>
        <span>${timeAgo(r.createdAt)}</span>
      </div>
    </div>`;
  }).join('');
}

window.ecoFlyTo = (id) => {
  const report = allReports.find(r => r.id === id);
  if (report?.location) {
    panTo(report.location.lat, report.location.lng, 16);
    const sidebar = document.getElementById('mapSidebar');
    if (sidebar) sidebar.classList.remove('open');
  }
};

// ─── Marker Click ────────────────────────────────────────────
function onMarkerClick(report) {
  document.querySelectorAll('.sidebar-report-item').forEach(el => el.classList.remove('highlighted'));
  const highlighted = document.querySelector(`.sidebar-report-item[data-id="${report.id}"]`);
  if (highlighted) highlighted.classList.add('highlighted');
}

// ─── Map Tools ───────────────────────────────────────────────
const locateMeBtn = document.getElementById('locateMe');
if (locateMeBtn) {
  locateMeBtn.addEventListener('click', async () => {
    try {
      showToast('Getting your location...', 'info', 2000);
      const { lat, lng } = await getCurrentLocation();
      userLocation = { lat, lng };
      showUserLocation(lat, lng);
      showToast('Location found!', 'success');
    } catch {
      showToast('Could not get location. Please allow location access.', 'error');
    }
  });
}

const toggleHeatmapBtn = document.getElementById('toggleHeatmap');
if (toggleHeatmapBtn) {
  toggleHeatmapBtn.addEventListener('click', function () {
    heatmapOn = !heatmapOn;
    toggleHeatmap(allReports, heatmapOn);
    this.classList.toggle('active', heatmapOn);
    showToast(heatmapOn ? 'Heatmap enabled 🔥' : 'Heatmap disabled', 'info');
  });
}

const nearbyAlertsBtn = document.getElementById('nearbyAlerts');
if (nearbyAlertsBtn) {
  nearbyAlertsBtn.addEventListener('click', async () => {
    try {
      if (!userLocation) {
        showToast('Getting your location first...', 'info', 2000);
        userLocation = await getCurrentLocation();
        showUserLocation(userLocation.lat, userLocation.lng);
      }
      const nearby = checkNearbyAlerts(allReports, userLocation.lat, userLocation.lng, 1000);
      const banner = document.getElementById('nearbyBanner');
      const bannerText = document.getElementById('nearbyBannerText');
      if (nearby.length && banner && bannerText) {
        bannerText.textContent = `⚠️ ${nearby.length} pollution report${nearby.length > 1 ? 's' : ''} within 1km of you!`;
        banner.style.display = 'flex';
        showToast(`${nearby.length} nearby alert${nearby.length > 1 ? 's' : ''}!`, 'warning');
      } else {
        showToast('No active reports within 1km 🌿', 'success');
      }
    } catch {
      showToast('Could not get location.', 'error');
    }
  });
}

const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('mapSidebar');
const sidebarClose = document.getElementById('sidebarClose');

if (sidebarToggle) {
  sidebarToggle.addEventListener('click', () => { if (sidebar) sidebar.classList.add('open'); });
}
if (sidebarClose) {
  sidebarClose.addEventListener('click', () => { if (sidebar) sidebar.classList.remove('open'); });
}