// ── EcoAlert Report Page JS ──
import { initAuth, getCurrentUser, signOutUser } from '../auth.js';
import { openAuthModal } from '../authmodal.js';
import { submitReport } from '../reports.js';
import { initDarkMode, toggleDarkMode, ISSUE_TYPES, getCurrentLocation,
  reverseGeocode, showToast } from '../utils.js';

initDarkMode();

document.getElementById('loginBtn')?.addEventListener('click', () => openAuthModal('login'));
document.getElementById('logoutBtn')?.addEventListener('click', signOutUser);
document.getElementById('hamburger')?.addEventListener('click', () => {
  document.getElementById('navLinks')?.classList.toggle('open');
});
document.getElementById('darkToggle')?.addEventListener('click', toggleDarkMode);

// ─── Auth Gate ───────────────────────────────────────────────
initAuth((user) => {
  if (user) {
    document.getElementById('authGate').style.display = 'none';
    document.getElementById('reportForm').style.display = 'block';
  } else {
    document.getElementById('authGate').style.display = 'block';
    document.getElementById('reportForm').style.display = 'none';
  }
});

document.getElementById('reportSignInBtn')?.addEventListener('click', async () => {
  openAuthModal('register');
});

// ─── Build Issue Type Picker ─────────────────────────────────
const picker = document.getElementById('issueTypePicker');
if (picker) {
  Object.entries(ISSUE_TYPES).forEach(([key, cfg]) => {
    const div = document.createElement('div');
    div.className = 'type-option';
    div.dataset.type = key;
    div.innerHTML = `<span class="type-icon">${cfg.icon}</span><span class="type-name">${cfg.label}</span>`;
    div.addEventListener('click', () => {
      picker.querySelectorAll('.type-option').forEach(o => o.classList.remove('selected'));
      div.classList.add('selected');
      document.getElementById('selectedType').value = key;
    });
    picker.appendChild(div);
  });
}

// ─── Description char count ──────────────────────────────────
document.getElementById('description')?.addEventListener('input', function () {
  document.getElementById('descCharCount').textContent = this.value.length;
});

// ─── Image Upload ────────────────────────────────────────────
let selectedFile = null;
const photoInput = document.getElementById('photoInput');
const uploadZone = document.getElementById('uploadZone');
const uploadPreview = document.getElementById('uploadPreview');
const previewImg = document.getElementById('previewImg');

photoInput?.addEventListener('change', function () {
  handleFileSelect(this.files[0]);
});
uploadZone?.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone?.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone?.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  handleFileSelect(e.dataTransfer.files[0]);
});

function handleFileSelect(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('Image too large. Max 5MB.', 'error'); return; }
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    uploadPreview.style.display = 'block';
    uploadZone.querySelector('.upload-icon').style.display = 'none';
    uploadZone.querySelector('.upload-text').style.display = 'none';
  };
  reader.readAsDataURL(file);
  updateSummary();
}

document.getElementById('removePhoto')?.addEventListener('click', (e) => {
  e.stopPropagation();
  selectedFile = null;
  previewImg.src = '';
  uploadPreview.style.display = 'none';
  uploadZone.querySelector('.upload-icon').style.display = 'block';
  uploadZone.querySelector('.upload-text').style.display = 'block';
  photoInput.value = '';
});

// ─── Map for Location ────────────────────────────────────────
let reportMap = null;
let locationMarker = null;
let selectedLocation = null;

function initReportMap() {
  if (reportMap) return;
  reportMap = L.map('reportMap', { center: [19.076, 72.877], zoom: 12, zoomControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' }).addTo(reportMap);
  reportMap.on('click', async (e) => {
    setLocation(e.latlng.lat, e.latlng.lng);
    const addr = await reverseGeocode(e.latlng.lat, e.latlng.lng);
    document.getElementById('locationAddress').value = addr;
    updateSummary();
  });
}

function setLocation(lat, lng) {
  selectedLocation = { lat, lng };
  document.getElementById('locationLat').value = lat;
  document.getElementById('locationLng').value = lng;
  if (locationMarker) reportMap.removeLayer(locationMarker);
  locationMarker = L.marker([lat, lng]).addTo(reportMap);
  reportMap.setView([lat, lng], 15);
  document.getElementById('locationStatus').innerHTML = `✅ Location pinned: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

document.getElementById('autoLocateBtn')?.addEventListener('click', async () => {
  const btn = document.getElementById('autoLocateBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Locating...';
  try {
    const { lat, lng } = await getCurrentLocation();
    setLocation(lat, lng);
    const addr = await reverseGeocode(lat, lng);
    document.getElementById('locationAddress').value = addr;
    showToast('Location detected!', 'success');
    updateSummary();
  } catch {
    showToast('Could not detect location. Allow location access or click the map.', 'error');
    document.getElementById('locationStatus').innerHTML = `❌ Location not available`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>📍</span> Auto-detect Location';
  }
});

// ─── Step Navigation ─────────────────────────────────────────
let currentStep = 1;

function goToStep(step) {
  document.querySelectorAll('.form-step').forEach(el => el.style.display = 'none');
  document.getElementById(`step${step}`).style.display = 'block';
  document.querySelectorAll('.step').forEach((el, i) => {
    el.classList.toggle('active', i + 1 === step);
    el.classList.toggle('done', i + 1 < step);
  });
  currentStep = step;
  if (step === 2 && !reportMap) {
    setTimeout(initReportMap, 100);
  }
  if (step === 3) updateSummary();
}

document.getElementById('nextToStep2')?.addEventListener('click', () => {
  if (!document.getElementById('selectedType').value) {
    showToast('Please select an issue type', 'warning');
    return;
  }
  if (!document.getElementById('description').value.trim()) {
    showToast('Please add a description', 'warning');
    return;
  }
  goToStep(2);
});

document.getElementById('nextToStep3')?.addEventListener('click', () => {
  if (!selectedLocation) {
    showToast('Please set a location', 'warning');
    return;
  }
  goToStep(3);
});

document.getElementById('backToStep1')?.addEventListener('click', () => goToStep(1));
document.getElementById('backToStep2')?.addEventListener('click', () => goToStep(2));

// ─── Summary ─────────────────────────────────────────────────
function updateSummary() {
  const type = document.getElementById('selectedType').value;
  const severity = document.querySelector('input[name="severity"]:checked')?.value;
  const desc = document.getElementById('description').value;
  const address = document.getElementById('locationAddress').value;

  const summaryEl = document.getElementById('reportSummary');
  const contentEl = document.getElementById('summaryContent');
  if (!type || !severity) { summaryEl.style.display = 'none'; return; }

  const cfg = ISSUE_TYPES[type];
  contentEl.innerHTML = `
    <div class="summary-item"><div class="summary-item-label">Type</div><div class="summary-item-value">${cfg?.icon} ${cfg?.label}</div></div>
    <div class="summary-item"><div class="summary-item-label">Severity</div><div class="summary-item-value">${severity.toUpperCase()}</div></div>
    <div class="summary-item" style="grid-column:1/-1"><div class="summary-item-label">Description</div><div class="summary-item-value">${desc.slice(0,100)}${desc.length>100?'...':''}</div></div>
    <div class="summary-item" style="grid-column:1/-1"><div class="summary-item-label">Location</div><div class="summary-item-value">${address || selectedLocation ? `${selectedLocation?.lat?.toFixed(4)}, ${selectedLocation?.lng?.toFixed(4)}` : 'Not set'}</div></div>
  `;
  summaryEl.style.display = 'block';
}

// ─── Submit ──────────────────────────────────────────────────
document.getElementById('reportForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner-sm"></span> Submitting...';

  try {
    await submitReport({
      type: document.getElementById('selectedType').value,
      description: document.getElementById('description').value,
      severity: document.querySelector('input[name="severity"]:checked')?.value || 'medium',
      lat: selectedLocation?.lat,
      lng: selectedLocation?.lng,
      address: document.getElementById('locationAddress').value
    }, selectedFile);

    document.querySelectorAll('.form-step').forEach(s => s.style.display = 'none');
    document.getElementById('reportSuccess').style.display = 'block';
    document.querySelector('.step-indicator').style.display = 'none';
  } catch (err) {
    showToast('Failed to submit: ' + (err.message || 'Unknown error'), 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>🚀</span> Submit Report';
  }
});

document.getElementById('reportAnother')?.addEventListener('click', () => {
  window.location.reload();
});
