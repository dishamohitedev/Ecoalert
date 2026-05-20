// ============================================================
// EcoAlert - Map Module (With Clear Nearby function)
// ============================================================

import { ISSUE_TYPES, SEVERITY_LEVELS, STATUS_TYPES, timeAgo, getDistance, showToast } from './utils.js';

let map = null;
let markers = [];
let heatLayer = null;
let userMarker = null;
let nearbyHighlightLayer = null;
let nearbyCircles = [];

// ─── Initialize Map ───────────────────────────────────────────
export function initMap(containerId, options = {}) {
  const defaultCenter = options.center || [19.076, 72.877];
  map = L.map(containerId, {
    center: defaultCenter,
    zoom: options.zoom || 12,
    zoomControl: false
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  L.control.zoom({ position: 'bottomright' }).addTo(map);
  map.attributionControl.setPrefix('EcoAlert 🌿');

  return map;
}

export function getMap() { return map; }

// ─── Render Report Markers ────────────────────────────────────
export function renderMarkers(reports, filters = {}, onMarkerClick, highlightReportIds = []) {
  clearMarkers();

  console.log(`🗺️ renderMarkers called with ${reports.length} total reports, highlight:`, highlightReportIds);

  const filtered = reports.filter(r => {
    if (filters.type && r.type !== filters.type) return false;
    if (filters.severity && r.severity !== filters.severity) return false;
    if (filters.status && r.status !== filters.status) return false;
    return true;
  });

  console.log(`🗺️ ${filtered.length} reports after filtering`);

  let placed = 0;
  let skipped = 0;

  filtered.forEach(report => {
    const lat = report.location?.lat;
    const lng = report.location?.lng;

    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
      console.warn(`⚠️ Skipping report ${report.id} — bad location:`, report.location);
      skipped++;
      return;
    }

    const isHighlighted = highlightReportIds.includes(report.id);
    
    console.log(`📍 Placing marker for report ${report.id} at [${lat}, ${lng}], highlighted: ${isHighlighted}`);
    const marker = createReportMarker(report, onMarkerClick, isHighlighted);
    if (marker) { markers.push(marker); placed++; }
  });

  console.log(`✅ Placed ${placed} markers, skipped ${skipped}`);
  
  if (highlightReportIds.length > 0 && markers.length > 0) {
    const highlightedMarkers = markers.filter(m => m.options.highlighted);
    if (highlightedMarkers.length > 0) {
      const group = L.featureGroup(highlightedMarkers);
      map.fitBounds(group.getBounds().pad(0.2));
    }
  }
  
  return filtered.length;
}

// ─── Create Single Marker ─────────────────────────────────────
function createReportMarker(report, onMarkerClick, isHighlighted = false) {
  try {
    const cfg = ISSUE_TYPES[report.type] || ISSUE_TYPES.garbage;
    const sev = SEVERITY_LEVELS[report.severity] || SEVERITY_LEVELS.medium;
    const sta = STATUS_TYPES[report.status] || STATUS_TYPES.active;

    const lat = parseFloat(report.location.lat);
    const lng = parseFloat(report.location.lng);

    if (isNaN(lat) || isNaN(lng)) {
      console.warn('Invalid lat/lng after parseFloat:', report.location);
      return null;
    }

    let iconHtml;
    if (isHighlighted) {
      iconHtml = `<div class="map-marker-wrap">
        <div class="map-marker-pin" style="background:${cfg.markerColor};border:3px solid #FF9800;box-shadow:0 0 0 3px rgba(255,152,0,0.5);">
          <span>${cfg.icon}</span>
        </div>
      </div>`;
    } else {
      iconHtml = `<div class="map-marker-wrap">
        <div class="map-marker-pin" style="background:${cfg.markerColor};border:3px solid ${sev.color};">
          <span>${cfg.icon}</span>
        </div>
      </div>`;
    }

    const icon = L.divIcon({
      html: iconHtml,
      className: '',
      iconSize: [44, 44],
      iconAnchor: [22, 44],
      popupAnchor: [0, -46]
    });

    const marker = L.marker([lat, lng], { icon, highlighted: isHighlighted }).addTo(map);
    const popup = buildPopupHTML(report, cfg, sev, sta);
    marker.bindPopup(popup, { maxWidth: 320, className: 'eco-popup' });

    marker.on('click', () => {
      if (onMarkerClick) onMarkerClick(report);
    });

    marker.reportId = report.id;
    return marker;
  } catch (err) {
    console.error('Error creating marker for report:', report.id, err);
    return null;
  }
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
      <p class="popup-description">${report.description || 'No description provided'}</p>
      <div class="popup-meta">
        <span class="popup-severity" style="background:${sev.bg};color:${sev.color}">
          ⚡ ${sev.label} Severity
        </span>
        <span class="popup-votes">👍 ${report.upvotes || 0}</span>
      </div>
      <div class="popup-footer">
        <span class="popup-location">📍 ${report.location?.address || 'Unknown location'}</span>
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

// ─── Toggle Heatmap ──────────────────────────────────────────
export function toggleHeatmap(reports, enabled) {
  if (!map) return;
  
  if (heatLayer) { 
    map.removeLayer(heatLayer); 
    heatLayer = null; 
  }
  
  if (!enabled) {
    console.log('🔥 Heatmap disabled');
    return;
  }

  if (!window.L.heatLayer) {
    console.error('Leaflet.heat plugin not loaded');
    showToast('Heatmap plugin not loaded', 'warning');
    return;
  }

  const points = [];
  reports.forEach(r => {
    if (r.location?.lat != null && !isNaN(r.location.lat) && r.location.lng != null && !isNaN(r.location.lng)) {
      let weight = 0.5;
      switch(r.severity) {
        case 'low': weight = 0.6; break;
        case 'medium': weight = 0.8; break;
        case 'high': weight = 1.2; break;
        case 'critical': weight = 1.8; break;
        default: weight = 0.7;
      }
      points.push([parseFloat(r.location.lat), parseFloat(r.location.lng), weight]);
    }
  });

  if (points.length === 0) {
    showToast('No reports to display heatmap', 'info');
    return;
  }

  console.log(`🔥 Creating heatmap with ${points.length} points`);
  
  heatLayer = L.heatLayer(points, {
    radius: 40,
    blur: 30,
    maxZoom: 18,
    minOpacity: 0.5,
    gradient: { 
      0.2: '#FFEB3B',
      0.4: '#FFC107',
      0.6: '#FF9800',
      0.8: '#FF5722',
      1.0: '#F44336'
    }
  }).addTo(map);
  
  showToast('Heatmap active - Yellow→Orange→Red shows pollution intensity', 'info', 3000);
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
  const nearby = reports.filter(r => {
    if (r.location?.lat == null || r.status === 'resolved') return false;
    const dist = getDistance(userLat, userLng, r.location.lat, r.location.lng);
    return dist <= radiusMeters;
  });
  
  console.log(`📍 Found ${nearby.length} nearby alerts`);
  return nearby;
}

// ─── Highlight Nearby Reports ─────────────────────────────────
export function highlightNearbyReports(reports, nearbyReportIds) {
  if (!map) return;
  
  console.log(`🌟 Highlighting ${nearbyReportIds.length} nearby reports`);
  
  nearbyCircles.forEach(circle => map.removeLayer(circle));
  nearbyCircles = [];
  
  if (nearbyReportIds.length === 0) return;
  
  reports.forEach(report => {
    if (nearbyReportIds.includes(report.id) && report.location?.lat) {
      const circle = L.circle([report.location.lat, report.location.lng], {
        radius: 200,
        color: '#FF9800',
        fillColor: '#FF9800',
        fillOpacity: 0.2,
        weight: 3
      }).addTo(map);
      nearbyCircles.push(circle);
    }
  });
  
  if (nearbyReportIds.length > 0) {
    const bounds = [];
    reports.forEach(report => {
      if (nearbyReportIds.includes(report.id) && report.location?.lat) {
        bounds.push([report.location.lat, report.location.lng]);
      }
    });
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }
}

// ─── Clear Nearby Highlights (TURN OFF NEARBY) ────────────────
export function clearNearbyHighlights() {
  console.log('🧹 Clearing all nearby highlights');
  nearbyCircles.forEach(circle => map.removeLayer(circle));
  nearbyCircles = [];
  return true;
}

// ─── Enable Click-to-Report ───────────────────────────────────
export function enableClickToReport(callback) {
  if (!map) return;
  map.on('click', (e) => { callback(e.latlng.lat, e.latlng.lng); });
}