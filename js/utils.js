// ============================================================
// EcoAlert - Utilities Module
// ============================================================

// ─── Issue Types Config ───────────────────────────────────────
export const ISSUE_TYPES = {
  garbage:    { label: 'Garbage Dump',   icon: '🗑️',  color: '#8B5E3C', markerColor: '#A0522D' },
  waterlogging: { label: 'Waterlogging', icon: '💧',  color: '#1565C0', markerColor: '#1E88E5' },
  smell:      { label: 'Bad Smell',      icon: '😷',  color: '#6A1B9A', markerColor: '#8E24AA' },
  air:        { label: 'Air Pollution',  icon: '🌫️', color: '#455A64', markerColor: '#607D8B' },
  drainage:   { label: 'Open Drainage',  icon: '🚰',  color: '#00695C', markerColor: '#00897B' },
  road:       { label: 'Unsafe Road',    icon: '⚠️',  color: '#E65100', markerColor: '#FB8C00' },
  smoke:      { label: 'Smoke Pollution',icon: '🏭',  color: '#212121', markerColor: '#546E7A' }
};

export const SEVERITY_LEVELS = {
  low:      { label: 'Low',      color: '#4CAF50', bg: 'rgba(76,175,80,0.15)' },
  medium:   { label: 'Medium',   color: '#FF9800', bg: 'rgba(255,152,0,0.15)' },
  high:     { label: 'High',     color: '#F44336', bg: 'rgba(244,67,54,0.15)' },
  critical: { label: 'Critical', color: '#B71C1C', bg: 'rgba(183,28,28,0.2)' }
};

export const STATUS_TYPES = {
  active:      { label: 'Active',      color: '#F44336', icon: '🔴' },
  'in-progress': { label: 'In Progress', color: '#FF9800', icon: '🟡' },
  resolved:    { label: 'Resolved',    color: '#4CAF50', icon: '🟢' }
};

// ─── Sample Dummy Data ────────────────────────────────────────
export const DUMMY_REPORTS = [
  {
    id: 'demo_1',
    userId: 'demo_user',
    userName: 'Priya Sharma',
    userPhotoURL: '',
    type: 'garbage',
    description: 'Large illegal dumping site near the main road. Multiple bags of household waste piled up.',
    severity: 'high',
    status: 'active',
    imageURL: 'https://images.unsplash.com/photo-1604187351574-c75ca79f5807?w=400&q=80',
    location: { lat: 19.076, lng: 72.877, address: 'Andheri East, Mumbai' },
    upvotes: 14,
    upvotedBy: [],
    createdAt: { toDate: () => new Date(Date.now() - 3600000 * 5) },
    isDeleted: false
  },
  {
    id: 'demo_2',
    userId: 'demo_user2',
    userName: 'Rohan Mehta',
    userPhotoURL: '',
    type: 'waterlogging',
    description: 'Severe waterlogging after rain. Road completely flooded, vehicles stuck.',
    severity: 'critical',
    status: 'in-progress',
    imageURL: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=400&q=80',
    location: { lat: 19.082, lng: 72.868, address: 'Kurla West, Mumbai' },
    upvotes: 32,
    upvotedBy: [],
    createdAt: { toDate: () => new Date(Date.now() - 3600000 * 12) },
    isDeleted: false
  },
  {
    id: 'demo_3',
    userId: 'demo_user3',
    userName: 'Aisha Khan',
    userPhotoURL: '',
    type: 'air',
    description: 'Factory nearby releasing black smoke. Visibility reduced. Strong chemical odor.',
    severity: 'critical',
    status: 'active',
    imageURL: 'https://images.unsplash.com/photo-1611270629569-8b357cb88da9?w=400&q=80',
    location: { lat: 19.065, lng: 72.900, address: 'Chembur, Mumbai' },
    upvotes: 28,
    upvotedBy: [],
    createdAt: { toDate: () => new Date(Date.now() - 3600000 * 2) },
    isDeleted: false
  },
  {
    id: 'demo_4',
    userId: 'demo_user4',
    userName: 'Vikram Patel',
    userPhotoURL: '',
    type: 'road',
    description: 'Huge pothole in the middle of the road. Multiple accidents reported.',
    severity: 'high',
    status: 'active',
    imageURL: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
    location: { lat: 19.095, lng: 72.855, address: 'Bandra West, Mumbai' },
    upvotes: 19,
    upvotedBy: [],
    createdAt: { toDate: () => new Date(Date.now() - 3600000 * 8) },
    isDeleted: false
  },
  {
    id: 'demo_5',
    userId: 'demo_user5',
    userName: 'Sneha Joshi',
    userPhotoURL: '',
    type: 'drainage',
    description: 'Open drainage with overflowing sewage. Health hazard for nearby residents.',
    severity: 'high',
    status: 'resolved',
    imageURL: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&q=80',
    location: { lat: 19.058, lng: 72.835, address: 'Dharavi, Mumbai' },
    upvotes: 7,
    upvotedBy: [],
    createdAt: { toDate: () => new Date(Date.now() - 3600000 * 48) },
    isDeleted: false
  },
  {
    id: 'demo_6',
    userId: 'demo_user6',
    userName: 'Arjun Reddy',
    userPhotoURL: '',
    type: 'smoke',
    description: 'Burning of plastic waste in open ground. Toxic fumes spreading in the area.',
    severity: 'medium',
    status: 'active',
    imageURL: 'https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=400&q=80',
    location: { lat: 19.110, lng: 72.890, address: 'Malad East, Mumbai' },
    upvotes: 11,
    upvotedBy: [],
    createdAt: { toDate: () => new Date(Date.now() - 3600000 * 1) },
    isDeleted: false
  }
];

// ─── Toast Notifications ─────────────────────────────────────
export function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span class="toast-msg">${message}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-show'));
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  document.body.appendChild(container);
  return container;
}

// ─── Time Formatting ──────────────────────────────────────────
export function timeAgo(date) {
  if (!date) return 'Unknown';
  const d = date.toDate ? date.toDate() : new Date(date);
  const seconds = Math.floor((new Date() - d) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds/60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds/3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds/86400)}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDate(date) {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Geolocation Helper ───────────────────────────────────────
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// ─── Reverse Geocode ─────────────────────────────────────────
export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
    const data = await res.json();
    return data.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

// ─── Distance Calculation ─────────────────────────────────────
export function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ─── Dark Mode ────────────────────────────────────────────────
export function initDarkMode() {
  const saved = localStorage.getItem('ecoalert_darkmode');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved !== null ? saved === 'true' : prefersDark;
  setDarkMode(isDark);
  return isDark;
}

export function toggleDarkMode() {
  const isDark = !document.body.classList.contains('dark');
  setDarkMode(isDark);
  localStorage.setItem('ecoalert_darkmode', isDark);
  return isDark;
}

function setDarkMode(isDark) {
  document.body.classList.toggle('dark', isDark);
  const toggles = document.querySelectorAll('.dark-mode-toggle');
  toggles.forEach(btn => btn.textContent = isDark ? '☀️' : '🌙');
}

// ─── LocalStorage UI State ────────────────────────────────────
export function saveUIState(key, value) {
  try {
    const state = JSON.parse(localStorage.getItem('ecoalert_ui_state') || '{}');
    state[key] = value;
    localStorage.setItem('ecoalert_ui_state', JSON.stringify(state));
  } catch {}
}

export function getUIState(key, defaultValue = null) {
  try {
    const state = JSON.parse(localStorage.getItem('ecoalert_ui_state') || '{}');
    return state[key] ?? defaultValue;
  } catch { return defaultValue; }
}

// ─── Debounce ────────────────────────────────────────────────
export function debounce(fn, delay) {
  let timeout;
  return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => fn(...args), delay); };
}

// ─── Generate Avatar Initials ────────────────────────────────
export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

// ─── Create Marker HTML for Leaflet ─────────────────────────
export function createMarkerIcon(type, severity) {
  const cfg = ISSUE_TYPES[type] || ISSUE_TYPES.garbage;
  const sev = SEVERITY_LEVELS[severity] || SEVERITY_LEVELS.medium;
  return `<div class="map-marker" style="background:${cfg.markerColor};box-shadow:0 0 0 3px ${sev.color}40;">
    <span>${cfg.icon}</span>
  </div>`;
}
