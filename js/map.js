// ============================================================
// EcoAlert - Map Module (Full Redesign)
// ============================================================

import { ISSUE_TYPES, SEVERITY_LEVELS, STATUS_TYPES, timeAgo, getDistance, showToast } from './utils.js';

let map = null;
let markers = [];
let heatLayer = null;
let userMarker = null;
let nearbyCircles = [];

// ─── Report number counter (for large report numbers in sidebar) ──
let reportNumberMap = {};

// ─── Initialize Map ───────────────────────────────────────────
export function initMap(containerId, options = {}) {
  const defaultCenter = options.center || [19.076, 72.877];
  map = L.map(containerId, {
    center: defaultCenter,
    zoom: options.zoom || 12,
    zoomControl: false,
    attributionControl: false   // hide the attribution bar entirely
  });

  // Use a visually richer tile layer (CartoDB Voyager — clean & modern)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  return map;
}

export function getMap() { return map; }

// ─── Assign stable report numbers ─────────────────────────────
function assignReportNumbers(reports) {
  const sorted = [...reports].sort((a, b) => {
    const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return aDate - bDate; // oldest gets lowest number
  });
  reportNumberMap = {};
  sorted.forEach((r, i) => { reportNumberMap[r.id] = i + 1; });
}

export function getReportNumber(reportId) {
  return reportNumberMap[reportId] || '—';
}

// ─── Render Report Markers ────────────────────────────────────
export function renderMarkers(reports, filters = {}, onMarkerClick, highlightReportIds = []) {
  clearMarkers();
  assignReportNumbers(reports);

  const filtered = reports.filter(r => {
    if (filters.type && r.type !== filters.type) return false;
    if (filters.severity && r.severity !== filters.severity) return false;
    if (filters.status && r.status !== filters.status) return false;
    return true;
  });

  let placed = 0;
  filtered.forEach(report => {
    const lat = report.location?.lat;
    const lng = report.location?.lng;
    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return;

    const isHighlighted = highlightReportIds.includes(report.id);
    const marker = createReportMarker(report, onMarkerClick, isHighlighted);
    if (marker) { markers.push(marker); placed++; }
  });

  return filtered.length;
}

// ─── Create Single Marker (no white backgrounds!) ─────────────
function createReportMarker(report, onMarkerClick, isHighlighted = false) {
  try {
    const cfg = ISSUE_TYPES[report.type] || ISSUE_TYPES.garbage;
    const sev = SEVERITY_LEVELS[report.severity] || SEVERITY_LEVELS.medium;
    const sta = STATUS_TYPES[report.status] || STATUS_TYPES.active;

    const lat = parseFloat(report.location.lat);
    const lng = parseFloat(report.location.lng);
    if (isNaN(lat) || isNaN(lng)) return null;

    const markerColor = cfg.markerColor || '#2d7a2d';
    const upvoteCount = report.upvotes || 0;

    // Nearby: pulsing orange ring; Normal: severity-colored ring
    const ringHtml = isHighlighted
      ? `<div class="map-marker-nearby-ring"></div>`
      : '';

    // Upvote badge (only if > 0)
    const upvoteHtml = upvoteCount > 0
      ? `<div class="marker-upvote-bubble">${upvoteCount > 99 ? '99+' : upvoteCount}</div>`
      : '';

    // Pin — solid colour, no white background
    const borderColor = isHighlighted ? '#f59e0b' : sev.color;
    const borderWidth = isHighlighted ? '3px' : '2.5px';
    const iconHtml = `
      <div class="map-marker-wrap">
        ${ringHtml}
        <div class="map-marker-pin" style="background:${markerColor};border:${borderWidth} solid ${borderColor};box-shadow:0 3px 14px rgba(0,0,0,0.4);">
          <span style="font-size:1.1rem;line-height:1;">${cfg.icon}</span>
        </div>
        ${upvoteHtml}
      </div>`;

    const icon = L.divIcon({
      html: iconHtml,
      className: '',   // <-- critical: empty className prevents Leaflet's white default wrapper
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -26]
    });

    const marker = L.marker([lat, lng], { icon, highlighted: isHighlighted }).addTo(map);
    marker.bindPopup(buildPopupHTML(report, cfg, sev, sta), {
      maxWidth: 320,
      className: 'eco-popup'
    });

    marker.on('click', () => { if (onMarkerClick) onMarkerClick(report); });
    marker.reportId = report.id;
    return marker;
  } catch (err) {
    console.error('Error creating marker:', report.id, err);
    return null;
  }
}

// ─── Build Popup HTML ─────────────────────────────────────────
function buildPopupHTML(report, cfg, sev, sta) {
  const img = report.imageURL
    ? `<img src="${report.imageURL}" alt="Report photo" class="popup-img" onerror="this.style.display='none'">`
    : '';
  const reportNum = getReportNumber(report.id);
  return `
    <div class="eco-popup-content">
      ${img}
      <div class="popup-body">
        <div class="popup-header">
          <span class="popup-type-badge" style="background:${cfg.markerColor}22;color:${cfg.markerColor};">
            ${cfg.icon} ${cfg.label}
          </span>
          <span class="popup-status-badge" style="color:${sta.color}">${sta.icon} ${sta.label}</span>
        </div>
        <p class="popup-description">${report.description || 'No description provided'}</p>
        <div class="popup-meta">
          <span class="popup-severity" style="background:${sev.bg};color:${sev.color};">⚡ ${sev.label} Severity</span>
          <span class="popup-votes">👍 ${report.upvotes || 0}</span>
        </div>
        <div class="popup-footer">
          <span class="popup-location">📍 ${(report.location?.address || 'Unknown location').substring(0, 55)}</span>
          <span class="popup-time">🕐 ${timeAgo(report.createdAt)}</span>
        </div>
        <div class="popup-reporter">By ${report.userName || 'Anonymous'} · #${reportNum}</div>
      </div>
    </div>`;
}

// ─── Clear All Markers ────────────────────────────────────────
export function clearMarkers() {
  markers.forEach(m => map?.removeLayer(m));
  markers = [];
}

// ─── Toggle Heatmap (vivid rainbow palette) ──────────────────
export function toggleHeatmap(reports, enabled) {
  if (!map) return;

  if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
  if (!enabled) return;

  if (!window.L.heatLayer) {
    showToast('Heatmap plugin not loaded', 'warning');
    return;
  }

  const points = [];
  reports.forEach(r => {
    const lat = r.location?.lat;
    const lng = r.location?.lng;
    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return;
    let weight = 0.4;
    switch (r.severity) {
      case 'low':      weight = 0.5; break;
      case 'medium':   weight = 0.85; break;
      case 'high':     weight = 1.3; break;
      case 'critical': weight = 2.0; break;
    }
    // Upvote bonus
    weight = Math.min(2.5, weight + Math.min(0.6, (r.upvotes || 0) / 25));
    points.push([parseFloat(lat), parseFloat(lng), weight]);
  });

  if (!points.length) { showToast('No data for heatmap', 'info'); return; }

  heatLayer = L.heatLayer(points, {
    radius: 40,
    blur: 28,
    maxZoom: 18,
    minOpacity: 0.45,
    // Vivid multi-stop gradient: deep-blue → cyan → lime → orange → crimson
    gradient: {
      0.0:  '#6366f1',   // indigo  — very low density
      0.25: '#06b6d4',   // cyan    — low
      0.45: '#22c55e',   // green   — moderate
      0.65: '#f59e0b',   // amber   — high
      0.85: '#ef4444',   // red     — very high
      1.0:  '#7f1d1d'    // dark-red — hotspot
    }
  }).addTo(map);

  showToast('🔥 Heatmap on — Indigo → Cyan → Green → Amber → Red shows intensity', 'info', 3500);
}

// ─── Show User Location (with double pulse ring) ──────────────
export function showUserLocation(lat, lng) {
  if (!map) return;
  if (userMarker) map.removeLayer(userMarker);

  userMarker = L.marker([lat, lng], {
    icon: L.divIcon({
      html: `<div class="user-location-marker">
               <div class="user-dot"></div>
               <div class="user-ring"></div>
               <div class="user-ring-2"></div>
             </div>`,
      className: '',
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    })
  }).addTo(map);

  // Locate Me: just fly to user, DON'T zoom out to fit all reports
  map.flyTo([lat, lng], 15, { animate: true, duration: 1.4 });
}

// ─── Pan to Location ─────────────────────────────────────────
export function panTo(lat, lng, zoom = 15) {
  if (map) map.flyTo([lat, lng], zoom, { animate: true, duration: 1.2 });
}

// ─── Check Nearby Alerts ─────────────────────────────────────
export function checkNearbyAlerts(reports, userLat, userLng, radiusMeters = 1000) {
  return reports.filter(r => {
    if (r.location?.lat == null || r.status === 'resolved') return false;
    const dist = getDistance(userLat, userLng, r.location.lat, r.location.lng);
    return dist <= radiusMeters;
  });
}

// ─── Highlight Nearby Reports (ZOOM IN on hotspots) ──────────
export function highlightNearbyReports(reports, nearbyReportIds) {
  if (!map) return;

  // Remove old circles
  nearbyCircles.forEach(c => map.removeLayer(c));
  nearbyCircles = [];

  if (!nearbyReportIds.length) return;

  const bounds = [];
  reports.forEach(r => {
    if (!nearbyReportIds.includes(r.id) || !r.location?.lat) return;
    bounds.push([r.location.lat, r.location.lng]);

    // Glowing pulsing circle per nearby report
    const circle = L.circle([r.location.lat, r.location.lng], {
      radius: 150,
      color: '#f59e0b',
      fillColor: '#fbbf24',
      fillOpacity: 0.18,
      weight: 2.5,
      dashArray: '6 4',
      className: 'nearby-area-circle'
    }).addTo(map);
    nearbyCircles.push(circle);

    // Outer soft glow ring
    const outerCircle = L.circle([r.location.lat, r.location.lng], {
      radius: 350,
      color: '#f59e0b',
      fillColor: '#f59e0b',
      fillOpacity: 0.06,
      weight: 1,
      className: 'nearby-area-circle'
    }).addTo(map);
    nearbyCircles.push(outerCircle);
  });

  if (bounds.length > 0) {
    // Zoom IN to show the nearby polluted areas tightly
    map.fitBounds(bounds, { padding: [70, 70], maxZoom: 16 });
  }
}

// ─── Clear Nearby Highlights ──────────────────────────────────
export function clearNearbyHighlights() {
  nearbyCircles.forEach(c => map?.removeLayer(c));
  nearbyCircles = [];
}

// ─── Enable Click-to-Report ───────────────────────────────────
export function enableClickToReport(callback) {
  if (!map) return;
  map.on('click', e => callback(e.latlng.lat, e.latlng.lng));
}