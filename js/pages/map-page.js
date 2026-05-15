// ── EcoAlert Map Page JS ──
import { initAuth, signOutUser } from '../auth.js';
import { openAuthModal } from '../authmodal.js';
import { listenToReports, upvoteReport } from '../reports.js';
import { initMap, renderMarkers, toggleHeatmap, showUserLocation, panTo, checkNearbyAlerts } from '../map.js';
import { initDarkMode, toggleDarkMode, ISSUE_TYPES, SEVERITY_LEVELS, STATUS_TYPES,
  getCurrentLocation, showToast, timeAgo, saveUIState, getUIState } from '../utils.js';

initDarkMode();

// ─── Auth ───────────────────────────────────────────────────
document.getElementById('loginBtn')?.addEventListener('click', () => openAuthModal('login'));
document.getElementById('logoutBtn')?.addEventListener('click', signOutUser);
document.getElementById('hamburger')?.addEventListener('click', () => {
  document.getElementById('navLinks')?.classList.toggle('open');
});
document.getElementById('darkToggle')?.addEventListener('click', toggleDarkMode);
document.getElementById('sidebarToggle')?.addEventListener('click', () => {
  document.getElementById('mapSidebar')?.classList.toggle('open');
});
document.getElementById('sidebarClose')?.addEventListener('click', () => {
  document.getElementById('mapSidebar')?.classList.remove('open');
});

initAuth(() => {});

// ─── State ──────────────────────────────────────────────────
let allReports = [];
let heatmapOn = false;
let userLocation = null;
let unsubscribe = null;

// Read URL params for deep-linking
const urlParams = new URLSearchParams(window.location.search);
const filterType = urlParams.get('type') || '';
const deepLinkId = urlParams.get('reportId') || '';
if (filterType) document.getElementById('filterType').value = filterType;

// ─── Init Map ────────────────────────────────────────────────
const map = initMap('mainMap', { center: [19.076, 72.877], zoom: 12 });

// ─── Start Live Listener ─────────────────────────────────────
function startListening() {
  if (unsubscribe) unsubscribe();
  unsubscribe = listenToReports((reports) => {
    allReports = reports;
    applyFiltersAndRender();
    updateSidebarStats(reports);
    if (deepLinkId) {
      const target = reports.find(r => r.id === deepLinkId);
      if (target?.location) panTo(target.location.lat, target.location.lng, 16);
    }
  });
}
startListening();

// ─── Filters ────────────────────────────────────────────────
function getFilters() {
  return {
    type: document.getElementById('filterType').value,
    severity: document.getElementById('filterSeverity').value,
    status: document.getElementById('filterStatus').value
  };
}

function applyFiltersAndRender() {
  const filters = getFilters();
  const count = renderMarkers(allReports, filters, onMarkerClick);
  renderSidebarList(allReports, filters);
  document.getElementById('reportCountBadge').textContent = count;
}

['filterType','filterSeverity','filterStatus'].forEach(id => {
  document.getElementById(id)?.addEventListener('change', applyFiltersAndRender);
});
document.getElementById('clearFilters')?.addEventListener('click', () => {
  document.getElementById('filterType').value = '';
  document.getElementById('filterSeverity').value = '';
  document.getElementById('filterStatus').value = '';
  applyFiltersAndRender();
});

// ─── Sidebar Stats ───────────────────────────────────────────
function updateSidebarStats(reports) {
  document.getElementById('msTotal').textContent = reports.length;
  document.getElementById('msActive').textContent = reports.filter(r => r.status === 'active').length;
  document.getElementById('msProgress').textContent = reports.filter(r => r.status === 'in-progress').length;
  document.getElementById('msResolved').textContent = reports.filter(r => r.status === 'resolved').length;
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
      <div class="sri-desc">${r.description}</div>
      <div class="sri-footer">
        <span>📍 ${r.location?.address || 'Unknown'}</span>
        <span>${timeAgo(r.createdAt)}</span>
      </div>
    </div>`;
  }).join('');
}

// Expose flyTo for inline onclick
window.ecoFlyTo = (id) => {
  const report = allReports.find(r => r.id === id);
  if (report?.location) {
    panTo(report.location.lat, report.location.lng, 16);
    document.getElementById('mapSidebar')?.classList.remove('open');
  }
};

// ─── Marker Click ────────────────────────────────────────────
function onMarkerClick(report) {
  // Highlight in sidebar
  document.querySelectorAll('.sidebar-report-item').forEach(el => el.classList.remove('highlighted'));
  document.querySelector(`.sidebar-report-item[data-id="${report.id}"]`)?.classList.add('highlighted');
}

// ─── Map Tools ───────────────────────────────────────────────
document.getElementById('locateMe')?.addEventListener('click', async () => {
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

document.getElementById('toggleHeatmap')?.addEventListener('click', function () {
  heatmapOn = !heatmapOn;
  toggleHeatmap(allReports, heatmapOn);
  this.classList.toggle('active', heatmapOn);
  showToast(heatmapOn ? 'Heatmap enabled 🔥' : 'Heatmap disabled', 'info');
});

document.getElementById('nearbyAlerts')?.addEventListener('click', async () => {
  try {
    if (!userLocation) {
      showToast('Getting your location first...', 'info', 2000);
      userLocation = await getCurrentLocation();
      showUserLocation(userLocation.lat, userLocation.lng);
    }
    const nearby = checkNearbyAlerts(allReports, userLocation.lat, userLocation.lng, 1000);
    const banner = document.getElementById('nearbyBanner');
    const bannerText = document.getElementById('nearbyBannerText');
    if (nearby.length) {
      bannerText.textContent = `⚠️ ${nearby.length} pollution report${nearby.length > 1 ? 's' : ''} within 1km of you!`;
      banner.style.display = 'flex';
      showToast(`${nearby.length} nearby alert${nearby.length>1?'s':''}!`, 'warning');
    } else {
      showToast('No active reports within 1km 🌿', 'success');
    }
  } catch {
    showToast('Could not get location.', 'error');
  }
});
