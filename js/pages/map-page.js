// ── EcoAlert Map Page JS (Nearby as Toggle - like Heatmap) ──
import { initAuth, signOutUser } from '../auth.js';
import { initAuthModal, openAuthModal } from '../authmodal.js';
import { listenToReports } from '../reports.js';
import { initMap, renderMarkers, toggleHeatmap, showUserLocation, panTo, checkNearbyAlerts, highlightNearbyReports, clearNearbyHighlights } from '../map.js';
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
let nearbyOn = false;
let userLocation = null;
let unsubscribe = null;
let currentNearbyReportIds = [];

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

    if (deepLinkId) {
      const target = reports.find(r => r.id === deepLinkId);
      if (target?.location) panTo(target.location.lat, target.location.lng, 16);
    }
  });
}

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
  const count = renderMarkers(allReports, filters, onMarkerClick, currentNearbyReportIds);
  renderSidebarList(allReports, filters);
  const countBadge = document.getElementById('reportCountBadge');
  if (countBadge) countBadge.textContent = count;
  updateSidebarStats(allReports);
}

const filterTypeElem = document.getElementById('filterType');
const filterSeverityElem = document.getElementById('filterSeverity');
const filterStatusElem = document.getElementById('filterStatus');

if (filterTypeElem) filterTypeElem.addEventListener('change', () => {
  if (nearbyOn) turnOffNearby();
  applyFiltersAndRender();
});
if (filterSeverityElem) filterSeverityElem.addEventListener('change', () => {
  if (nearbyOn) turnOffNearby();
  applyFiltersAndRender();
});
if (filterStatusElem) filterStatusElem.addEventListener('change', () => {
  if (nearbyOn) turnOffNearby();
  applyFiltersAndRender();
});

const clearFiltersBtn = document.getElementById('clearFilters');
if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener('click', () => {
    if (filterTypeElem) filterTypeElem.value = '';
    if (filterSeverityElem) filterSeverityElem.value = '';
    if (filterStatusElem) filterStatusElem.value = '';
    if (nearbyOn) turnOffNearby();
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
      <div class="empty-text">Try changing your filters or submit a new report</div>
    </div>`;
    return;
  }

  const sorted = [...filtered].sort((a, b) => {
    const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
    const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
    return bDate - aDate;
  });

  list.innerHTML = sorted.map(r => {
    const cfg = ISSUE_TYPES[r.type] || ISSUE_TYPES.garbage;
    const sev = SEVERITY_LEVELS[r.severity] || SEVERITY_LEVELS.medium;
    const description = r.description || 'No description provided';
    const truncatedDesc = description.length > 80 ? description.substring(0, 80) + '...' : description;
    const isNearby = currentNearbyReportIds.includes(r.id);
    const nearbyClass = isNearby ? 'nearby-report-item' : '';
    
    return `<div class="sidebar-report-item ${nearbyClass}" data-id="${r.id}" onclick="window.ecoFlyTo('${r.id}')">
      <div class="sri-header">
        <span class="sri-type">${cfg.icon} ${cfg.label}</span>
        <span class="sri-severity" style="background:${sev.bg};color:${sev.color}">${sev.label}</span>
      </div>
      <div class="sri-desc">${escapeHtml(truncatedDesc)}</div>
      <div class="sri-footer">
        <span>📍 ${r.location?.address ? truncateAddress(r.location.address) : 'Unknown location'}</span>
        <span>🕐 ${timeAgo(r.createdAt)}</span>
      </div>
      ${isNearby ? '<div class="nearby-badge-static">⚠️ Nearby Alert</div>' : ''}
    </div>`;
  }).join('');
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncateAddress(address) {
  if (!address) return 'Unknown';
  if (address.length > 35) return address.substring(0, 32) + '...';
  return address;
}

window.ecoFlyTo = (id) => {
  const report = allReports.find(r => r.id === id);
  if (report?.location) {
    panTo(report.location.lat, report.location.lng, 16);
    const sidebar = document.getElementById('mapSidebar');
    if (sidebar && window.innerWidth <= 768) sidebar.classList.remove('open');
  }
};

function onMarkerClick(report) {
  document.querySelectorAll('.sidebar-report-item').forEach(el => el.classList.remove('highlighted'));
  const highlighted = document.querySelector(`.sidebar-report-item[data-id="${report.id}"]`);
  if (highlighted) highlighted.classList.add('highlighted');
}

// ─── Nearby Toggle Functions ─────────────────────────────────
async function turnOnNearby() {
  try {
    if (!userLocation) {
      showToast('Getting your location...', 'info', 1500);
      try {
        userLocation = await getCurrentLocation();
        showUserLocation(userLocation.lat, userLocation.lng);
      } catch {
        showToast('Could not get location. Please enable location services.', 'error');
        return false;
      }
    }
    
    const nearbyReports = checkNearbyAlerts(allReports, userLocation.lat, userLocation.lng, 1000);
    currentNearbyReportIds = nearbyReports.map(r => r.id);
    
    if (currentNearbyReportIds.length > 0) {
      highlightNearbyReports(allReports, currentNearbyReportIds);
      const filters = getFilters();
      renderMarkers(allReports, filters, onMarkerClick, currentNearbyReportIds);
      renderSidebarList(allReports, filters);
      
      const banner = document.getElementById('nearbyBanner');
      const bannerText = document.getElementById('nearbyBannerText');
      if (banner && bannerText) {
        bannerText.innerHTML = `⚠️ ${currentNearbyReportIds.length} nearby report${currentNearbyReportIds.length > 1 ? 's' : ''} found! Click Nearby again to clear`;
        banner.style.display = 'flex';
      }
      
      showToast(`${currentNearbyReportIds.length} nearby alerts found! 🔔`, 'warning', 3000);
      
      const firstNearby = document.querySelector('.nearby-report-item');
      if (firstNearby) firstNearby.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      showToast('No active reports within 1km of your location 🌿', 'info');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Nearby error:', error);
    showToast('Could not check nearby alerts', 'error');
    return false;
  }
}

function turnOffNearby() {
  currentNearbyReportIds = [];
  clearNearbyHighlights();
  const filters = getFilters();
  renderMarkers(allReports, filters, onMarkerClick, []);
  renderSidebarList(allReports, filters);
  
  const banner = document.getElementById('nearbyBanner');
  if (banner) banner.style.display = 'none';
  
  showToast('Nearby mode off', 'info', 1500);
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

// Heatmap button (toggle)
const toggleHeatmapBtn = document.getElementById('toggleHeatmap');
if (toggleHeatmapBtn) {
  toggleHeatmapBtn.addEventListener('click', function () {
    heatmapOn = !heatmapOn;
    toggleHeatmap(allReports, heatmapOn);
    this.classList.toggle('active', heatmapOn);
    this.innerHTML = heatmapOn ? '🔥 Heatmap ON' : '🔥 Heatmap';
  });
}

// Nearby button (toggle - same as heatmap)
const toggleNearbyBtn = document.getElementById('toggleNearby');
if (toggleNearbyBtn) {
  toggleNearbyBtn.addEventListener('click', async function () {
    if (nearbyOn) {
      // Turn OFF nearby
      nearbyOn = false;
      turnOffNearby();
      this.classList.remove('active');
      this.innerHTML = '🔔 Nearby';
    } else {
      // Turn ON nearby
      this.classList.add('active');
      this.innerHTML = '🔔 Nearby ON';
      const success = await turnOnNearby();
      if (success) {
        nearbyOn = true;
      } else {
        // If failed, revert button state
        this.classList.remove('active');
        this.innerHTML = '🔔 Nearby';
      }
    }
  });
}

// Close banner button (also turns off nearby)
const closeNearbyBanner = document.getElementById('closeNearbyBanner');
if (closeNearbyBanner) {
  closeNearbyBanner.addEventListener('click', () => {
    if (nearbyOn) {
      nearbyOn = false;
      turnOffNearby();
      const toggleBtn = document.getElementById('toggleNearby');
      if (toggleBtn) {
        toggleBtn.classList.remove('active');
        toggleBtn.innerHTML = '🔔 Nearby';
      }
    }
    const banner = document.getElementById('nearbyBanner');
    if (banner) banner.style.display = 'none';
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