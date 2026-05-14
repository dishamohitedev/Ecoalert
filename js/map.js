// ============================================================
// EcoAlert - Map Module (Leaflet.js + OpenStreetMap)
// ============================================================

import { ISSUE_TYPES, SEVERITY_LEVELS, STATUS_TYPES, timeAgo, getDistance, showToast } from './utils.js';

let map = null;
let markers = [];
let heatLayer = null;
let userMarker = null;

// ─── Initialize Map ───────────────────────────────────────────
export function initMap(containerId, options = {}) {
  const defaultCenter = options.center || [19.076, 72.877]; // Mumbai default
  map = L.map(containerId, {
    center: defaultCenter,
    zoom: options.zoom || 12,
    zoomControl: false
  });

  // OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  // Custom zoom control
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Attribution
  map.attributionControl.setPrefix('EcoAlert 🌿');

  return map;
}

// ─── Get Map Instance ─────────────────────────────────────────
export function getMap() { return map; }

// ─── Render Report Markers ────────────────────────────────────
export function renderMarkers(reports, filters = {}, onMarkerClick) {
  clearMarkers();

  const filtered = reports.filter(r => {
    if (filters.type && r.type !== filters.type) return false;
    if (filters.severity && r.severity !== filters.severity) return false;
    if (filters.status && r.status !== filters.status) return false;
    return true;
  });

  filtered.forEach(report => {
    if (!report.location?.lat || !report.location?.lng) return;
    const marker = createReportMarker(report, onMarkerClick);
    if (marker) markers.push(marker);
  });

  return filtered.length;
}

// ─── Create Single Marker ─────────────────────────────────────
function createReportMarker(report, onMarkerClick) {
  const cfg = ISSUE_TYPES[report.type] || ISSUE_TYPES.garbage;
  const sev = SEVERITY_LEVELS[report.severity] || SEVERITY_LEVELS.medium;
  const sta = STATUS_TYPES[report.status] || STATUS_TYPES.active;

  const icon = L.divIcon({
    html: `<div class="map-marker-wrap">
      <div class="map-marker-pin" style="background:${cfg.markerColor};border:3px solid ${sev.color};">
        <span>${cfg.icon}</span>
      </div>
      <div class="map-marker-pulse" style="background:${cfg.markerColor}40;"></div>
    </div>`,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -46]
  });

  const marker = L.marker([report.location.lat, report.location.lng], { icon }).addTo(map);

  // Popup content
  const popup = buildPopupHTML(report, cfg, sev, sta);
  marker.bindPopup(popup, { maxWidth: 320, className: 'eco-popup' });

  marker.on('click', () => {
    if (onMarkerClick) onMarkerClick(report);
  });

  marker.reportId = report.id;
  return marker;
}

// ─── Build Popup HTML ─────────────────────────────────────────
function buildPopupHTML(report, cfg, sev, sta) {
  const img = report.imageURL
    ? `<img src="${report.imageURL}" alt="Report" class="popup-img" onerror="this.style.display='none'">`
    : '';
  return `
    <div class="eco-popup-content">
      ${img}
      <div class="popup-header">
        <span class="popup-type-badge" style="background:${cfg.markerColor}20;color:${cfg.markerColor}">
          ${cfg.icon} ${cfg.label}
        </span>
        <span class="popup-status-badge" style="color:${sta.color}">${sta.icon} ${sta.label}</span>
      </div>
      <p class="popup-description">${report.description}</p>
      <div class="popup-meta">
        <span class="popup-severity" style="background:${sev.bg};color:${sev.color}">
          ⚡ ${sev.label} Severity
        </span>
        <span class="popup-votes">👍 ${report.upvotes || 0}</span>
      </div>
      <div class="popup-footer">
        <span class="popup-location">📍 ${report.location.address || 'Unknown location'}</span>
        <span class="popup-time">🕐 ${timeAgo(report.createdAt)}</span>
      </div>
      <div class="popup-reporter">By ${report.userName || 'Anonymous'}</div>
    </div>`;
}

// ─── Clear All Markers ────────────────────────────────────────
export function clearMarkers() {
  markers.forEach(m => map?.removeLayer(m));
  markers = [];
}

// ─── Toggle Heatmap ───────────────────────────────────────────
export function toggleHeatmap(reports, enabled) {
  if (!map) return;

  // Remove existing
  if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }

  if (!enabled) return;

  if (!window.L.heatLayer) {
    showToast('Heatmap plugin not loaded', 'warning');
    return;
  }

  const points = reports
    .filter(r => r.location?.lat)
    .map(r => {
      const sevWeight = { low: 0.3, medium: 0.6, high: 0.8, critical: 1.0 };
      return [r.location.lat, r.location.lng, sevWeight[r.severity] || 0.5];
    });

  heatLayer = L.heatLayer(points, {
    radius: 30,
    blur: 20,
    maxZoom: 17,
    gradient: { 0.2: '#4CAF50', 0.5: '#FF9800', 0.8: '#F44336', 1.0: '#B71C1C' }
  }).addTo(map);
}

// ─── Show User Location ───────────────────────────────────────
export function showUserLocation(lat, lng) {
  if (!map) return;
  if (userMarker) map.removeLayer(userMarker);

  userMarker = L.marker([lat, lng], {
    icon: L.divIcon({
      html: `<div class="user-location-marker"><div class="user-dot"></div><div class="user-ring"></div></div>`,
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    })
  }).addTo(map);

  map.flyTo([lat, lng], 14, { animate: true, duration: 1.5 });
}

// ─── Pan to Location ─────────────────────────────────────────
export function panTo(lat, lng, zoom = 15) {
  if (map) map.flyTo([lat, lng], zoom, { animate: true, duration: 1.2 });
}

// ─── Check Nearby Alerts ─────────────────────────────────────
export function checkNearbyAlerts(reports, userLat, userLng, radiusMeters = 1000) {
  return reports.filter(r => {
    if (!r.location?.lat || r.status === 'resolved') return false;
    const dist = getDistance(userLat, userLng, r.location.lat, r.location.lng);
    return dist <= radiusMeters;
  });
}

// ─── Enable Click-to-Report ───────────────────────────────────
export function enableClickToReport(callback) {
  if (!map) return;
  map.on('click', (e) => {
    callback(e.latlng.lat, e.latlng.lng);
  });
}
