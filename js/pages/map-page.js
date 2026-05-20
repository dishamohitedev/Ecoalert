// ── EcoAlert Map Page JS (Full Redesign) ──
import { initAuth, signOutUser } from '../auth.js';
import { initAuthModal, openAuthModal } from '../authmodal.js';
import { listenToReports } from '../reports.js';
import { initMap, renderMarkers, toggleHeatmap, showUserLocation, panTo,
         checkNearbyAlerts, highlightNearbyReports, clearNearbyHighlights,
         getReportNumber } from '../map.js';
import { initDarkMode, toggleDarkMode, ISSUE_TYPES, SEVERITY_LEVELS, STATUS_TYPES,
         getCurrentLocation, showToast, timeAgo } from '../utils.js';

initDarkMode();
initAuthModal();

// ─── Auth Buttons ────────────────────────────────────────────
const loginBtn    = document.getElementById('loginBtn');
const logoutBtn   = document.getElementById('logoutBtn');
const darkToggle  = document.getElementById('darkToggle');

if (loginBtn) {
  const newLoginBtn = loginBtn.cloneNode(true);
  loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);
  newLoginBtn.addEventListener('click', e => { e.preventDefault(); openAuthModal(); });
}
if (logoutBtn) {
  const newLogoutBtn = logoutBtn.cloneNode(true);
  logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
  newLogoutBtn.addEventListener('click', async e => { e.preventDefault(); await signOutUser(); });
}
if (darkToggle) {
  const newDark = darkToggle.cloneNode(true);
  darkToggle.parentNode.replaceChild(newDark, darkToggle);
  newDark.addEventListener('click', e => {
    e.preventDefault();
    const isDark = toggleDarkMode();
    newDark.textContent = isDark ? '☀️' : '🌙';
  });
}

// ─── State ──────────────────────────────────────────────────
let allReports = [];
let heatmapOn  = false;
let nearbyOn   = false;
let userLocation = null;
let unsubscribe  = null;
let currentNearbyReportIds = [];

const urlParams  = new URLSearchParams(window.location.search);
const filterType = urlParams.get('type') || '';
const deepLinkId = urlParams.get('reportId') || '';
if (filterType) {
  const el = document.getElementById('filterType');
  if (el) el.value = filterType;
}

// ─── Init Map ────────────────────────────────────────────────
const map = initMap('mainMap', { center: [19.076, 72.877], zoom: 12 });

// ─── Start Live Listener ─────────────────────────────────────
function startListening() {
  if (unsubscribe) unsubscribe();
  unsubscribe = listenToReports(reports => {
    allReports = reports;
    applyFiltersAndRender();
    if (deepLinkId) {
      const target = reports.find(r => r.id === deepLinkId);
      if (target?.location) panTo(target.location.lat, target.location.lng, 16);
    }
  });
}

initAuth(user => { startListening(); });

// ─── Filters ────────────────────────────────────────────────
function getFilters() {
  return {
    type:     document.getElementById('filterType')?.value     || '',
    severity: document.getElementById('filterSeverity')?.value || '',
    status:   document.getElementById('filterStatus')?.value   || ''
  };
}

function applyFiltersAndRender() {
  const filters = getFilters();
  const count = renderMarkers(allReports, filters, onMarkerClick, currentNearbyReportIds);
  renderSidebarList(allReports, filters);
  const badge = document.getElementById('reportCountBadge');
  if (badge) badge.textContent = count;
  updateSidebarStats(allReports);
}

['filterType','filterSeverity','filterStatus'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', () => {
    if (nearbyOn) turnOffNearby();
    applyFiltersAndRender();
  });
});

document.getElementById('clearFilters')?.addEventListener('click', () => {
  ['filterType','filterSeverity','filterStatus'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  if (nearbyOn) turnOffNearby();
  applyFiltersAndRender();
});

// ─── Stats ───────────────────────────────────────────────────
function updateSidebarStats(reports) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('msTotal',    reports.length);
  set('msActive',   reports.filter(r => r.status === 'active').length);
  set('msProgress', reports.filter(r => r.status === 'in-progress').length);
  set('msResolved', reports.filter(r => r.status === 'resolved').length);
}

// ─── Sidebar List (with large report numbers) ─────────────────
function renderSidebarList(reports, filters) {
  const list = document.getElementById('sidebarReportList');
  if (!list) return;

  let filtered = reports.filter(r => {
    if (filters.type     && r.type     !== filters.type)     return false;
    if (filters.severity && r.severity !== filters.severity) return false;
    if (filters.status   && r.status   !== filters.status)   return false;
    return true;
  });

  if (!filtered.length) {
    list.innerHTML = `<div style="padding:32px 0;text-align:center;color:var(--text-muted)">
      <div style="font-size:2rem;margin-bottom:8px">🔍</div>
      <div style="font-size:0.85rem;font-weight:600">No reports found</div>
      <div style="font-size:0.75rem;margin-top:4px">Try changing your filters</div>
    </div>`;
    return;
  }

  const sorted = [...filtered].sort((a, b) => {
    const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return bDate - aDate;
  });

  list.innerHTML = sorted.map(r => {
    const cfg = ISSUE_TYPES[r.type] || ISSUE_TYPES.garbage;
    const sev = SEVERITY_LEVELS[r.severity] || SEVERITY_LEVELS.medium;
    const desc = r.description || 'No description';
    const truncDesc = desc.length > 75 ? desc.substring(0, 75) + '…' : desc;
    const isNearby = currentNearbyReportIds.includes(r.id);
    const nearbyClass = isNearby ? 'nearby-report-item' : '';
    const reportNum = getReportNumber(r.id);
    const nearbyBadge = isNearby ? '<div class="nearby-badge-static">⚠️ Nearby</div>' : '';

    return `<div class="sidebar-report-item ${nearbyClass}" data-id="${r.id}" onclick="window.ecoFlyTo('${r.id}')">
      ${nearbyBadge}
      <div class="sri-header">
        <div>
          <div class="sri-report-number">#${reportNum}</div>
          <div class="sri-type" style="margin-top:2px;">${cfg.icon} ${cfg.label}</div>
        </div>
        <span class="sri-severity" style="background:${sev.bg};color:${sev.color};">${sev.label}</span>
      </div>
      <div class="sri-desc">${escapeHtml(truncDesc)}</div>
      <div class="sri-footer">
        <span>📍 ${truncAddr(r.location?.address)}</span>
        <span>🕐 ${timeAgo(r.createdAt)}</span>
      </div>
    </div>`;
  }).join('');
}

function escapeHtml(text) {
  if (!text) return '';
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}
function truncAddr(address) {
  if (!address) return 'Unknown';
  return address.length > 30 ? address.substring(0, 28) + '…' : address;
}

window.ecoFlyTo = id => {
  const r = allReports.find(r => r.id === id);
  if (r?.location) {
    panTo(r.location.lat, r.location.lng, 16);
    const sidebar = document.getElementById('mapSidebar');
    if (sidebar && window.innerWidth <= 768) sidebar.classList.remove('open');
  }
};

function onMarkerClick(report) {
  document.querySelectorAll('.sidebar-report-item').forEach(el => el.classList.remove('highlighted'));
  const el = document.querySelector(`.sidebar-report-item[data-id="${report.id}"]`);
  if (el) { el.classList.add('highlighted'); el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
}

// ─── Nearby ──────────────────────────────────────────────────
async function turnOnNearby() {
  try {
    if (!userLocation) {
      showToast('Getting your location…', 'info', 1500);
      userLocation = await getCurrentLocation();
      showUserLocation(userLocation.lat, userLocation.lng);
    }
    const nearby = checkNearbyAlerts(allReports, userLocation.lat, userLocation.lng, 1000);
    currentNearbyReportIds = nearby.map(r => r.id);

    if (!currentNearbyReportIds.length) {
      showToast('No active reports within 1km 🌿', 'info');
      return false;
    }

    highlightNearbyReports(allReports, currentNearbyReportIds);
    const filters = getFilters();
    renderMarkers(allReports, filters, onMarkerClick, currentNearbyReportIds);
    renderSidebarList(allReports, filters);

    const banner     = document.getElementById('nearbyBanner');
    const bannerText = document.getElementById('nearbyBannerText');
    if (banner && bannerText) {
      bannerText.innerHTML = `${currentNearbyReportIds.length} nearby alert${currentNearbyReportIds.length > 1 ? 's' : ''} within 1km — tap again to clear`;
      banner.style.display = 'flex';
    }

    showToast(`🔔 ${currentNearbyReportIds.length} nearby alert${currentNearbyReportIds.length > 1 ? 's' : ''} found!`, 'warning', 3000);

    // Scroll sidebar to first nearby item
    setTimeout(() => {
      const first = document.querySelector('.nearby-report-item');
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);

    return true;
  } catch (err) {
    console.error('Nearby error:', err);
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

// ─── Tool Buttons ─────────────────────────────────────────────
// Locate Me
const locateMeBtn = document.getElementById('locateMe');
if (locateMeBtn) {
  locateMeBtn.addEventListener('click', async () => {
    try {
      showToast('Getting your location…', 'info', 2000);
      const { lat, lng } = await getCurrentLocation();
      userLocation = { lat, lng };
      showUserLocation(lat, lng);
      locateMeBtn.classList.add('active');
      setTimeout(() => locateMeBtn.classList.remove('active'), 3000);
      showToast('📍 Location found!', 'success');
    } catch {
      showToast('Could not get location. Please allow location access.', 'error');
    }
  });
}

// Heatmap toggle
const toggleHeatmapBtn = document.getElementById('toggleHeatmap');
if (toggleHeatmapBtn) {
  toggleHeatmapBtn.addEventListener('click', function () {
    heatmapOn = !heatmapOn;
    toggleHeatmap(allReports, heatmapOn);
    this.classList.toggle('active', heatmapOn);
    this.querySelector('.tool-label').textContent = heatmapOn ? 'Heatmap ON' : 'Heatmap';
  });
}

// Nearby toggle
const toggleNearbyBtn = document.getElementById('toggleNearby');
if (toggleNearbyBtn) {
  toggleNearbyBtn.addEventListener('click', async function () {
    if (nearbyOn) {
      nearbyOn = false;
      turnOffNearby();
      this.classList.remove('active');
      this.querySelector('.tool-label').textContent = 'Nearby';
    } else {
      this.classList.add('active');
      this.querySelector('.tool-label').textContent = 'Nearby ON';
      const success = await turnOnNearby();
      if (success) {
        nearbyOn = true;
      } else {
        this.classList.remove('active');
        this.querySelector('.tool-label').textContent = 'Nearby';
      }
    }
  });
}

// Close nearby banner → also turns off nearby
document.getElementById('closeNearbyBanner')?.addEventListener('click', () => {
  if (nearbyOn) {
    nearbyOn = false;
    turnOffNearby();
    const btn = document.getElementById('toggleNearby');
    if (btn) {
      btn.classList.remove('active');
      btn.querySelector('.tool-label').textContent = 'Nearby';
    }
  }
  const banner = document.getElementById('nearbyBanner');
  if (banner) banner.style.display = 'none';
});

// ─── Sidebar Mobile ───────────────────────────────────────────
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar       = document.getElementById('mapSidebar');
const sidebarClose  = document.getElementById('sidebarClose');

if (sidebarToggle) sidebarToggle.addEventListener('click', () => sidebar?.classList.add('open'));
if (sidebarClose)  sidebarClose.addEventListener('click',  () => sidebar?.classList.remove('open'));