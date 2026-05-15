// ── EcoAlert Report Page JS (Complete Working Version) ──
import { initAuth, getCurrentUser, signOutUser } from '../auth.js';
import { initAuthModal, openAuthModal } from '../authmodal.js';
import { submitReport } from '../reports.js';
import { initDarkMode, toggleDarkMode, ISSUE_TYPES, getCurrentLocation,
  reverseGeocode, showToast } from '../utils.js';

// Initialize
initDarkMode();
initAuthModal();

// DOM Elements
const darkToggle = document.getElementById('darkToggle');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const reportSignInBtn = document.getElementById('reportSignInBtn');

// Dark Mode Toggle
if (darkToggle) {
  const newDarkToggle = darkToggle.cloneNode(true);
  darkToggle.parentNode.replaceChild(newDarkToggle, darkToggle);
  newDarkToggle.addEventListener('click', (e) => {
    e.preventDefault();
    const isDark = toggleDarkMode();
    newDarkToggle.textContent = isDark ? '☀️' : '🌙';
  });
}

// Auth Buttons
if (loginBtn) {
  const newLoginBtn = loginBtn.cloneNode(true);
  loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);
  newLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal();
  });
}

if (logoutBtn) {
  const newLogoutBtn = logoutBtn.cloneNode(true);
  logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
  newLogoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await signOutUser();
  });
}

if (reportSignInBtn) {
  reportSignInBtn.addEventListener('click', () => openAuthModal());
}

// Auth State
initAuth((user) => {
  const authGate = document.getElementById('authGate');
  const reportForm = document.getElementById('reportForm');
  const loginBtnElem = document.getElementById('loginBtn');
  const logoutBtnElem = document.getElementById('logoutBtn');
  
  if (user) {
    if (authGate) authGate.style.display = 'none';
    if (reportForm) reportForm.style.display = 'block';
    if (loginBtnElem) loginBtnElem.style.display = 'none';
    if (logoutBtnElem) logoutBtnElem.style.display = 'flex';
  } else {
    if (authGate) authGate.style.display = 'block';
    if (reportForm) reportForm.style.display = 'none';
    if (loginBtnElem) loginBtnElem.style.display = 'flex';
    if (logoutBtnElem) logoutBtnElem.style.display = 'none';
  }
});

// ─── Build Issue Type Picker ───
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
      const selectedType = document.getElementById('selectedType');
      if (selectedType) selectedType.value = key;
      updateSummary();
    });
    picker.appendChild(div);
  });
}

// ─── Description char count ───
const descriptionInput = document.getElementById('description');
if (descriptionInput) {
  descriptionInput.addEventListener('input', function () {
    const countSpan = document.getElementById('descCharCount');
    if (countSpan) countSpan.textContent = this.value.length;
    updateSummary();
  });
}

// ─── Severity change listener ───
const severityRadios = document.querySelectorAll('input[name="severity"]');
severityRadios.forEach(radio => {
  radio.addEventListener('change', () => updateSummary());
});

// ─── Image Upload ───
let selectedFile = null;
const photoInput = document.getElementById('photoInput');
const uploadZone = document.getElementById('uploadZone');
const uploadPreview = document.getElementById('uploadPreview');
const previewImg = document.getElementById('previewImg');

if (photoInput) {
  photoInput.addEventListener('change', function () {
    handleFileSelect(this.files[0]);
  });
}

if (uploadZone) {
  uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    handleFileSelect(e.dataTransfer.files[0]);
  });
}

function handleFileSelect(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { 
    showToast('Image too large. Max 5MB.', 'error'); 
    return; 
  }
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    if (previewImg) previewImg.src = e.target.result;
    if (uploadPreview) uploadPreview.style.display = 'block';
    const uploadIcon = uploadZone?.querySelector('.upload-icon');
    const uploadText = uploadZone?.querySelector('.upload-text');
    if (uploadIcon) uploadIcon.style.display = 'none';
    if (uploadText) uploadText.style.display = 'none';
  };
  reader.readAsDataURL(file);
  updateSummary();
}

const removePhoto = document.getElementById('removePhoto');
if (removePhoto) {
  removePhoto.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedFile = null;
    if (previewImg) previewImg.src = '';
    if (uploadPreview) uploadPreview.style.display = 'none';
    const uploadIcon = uploadZone?.querySelector('.upload-icon');
    const uploadText = uploadZone?.querySelector('.upload-text');
    if (uploadIcon) uploadIcon.style.display = 'block';
    if (uploadText) uploadText.style.display = 'block';
    if (photoInput) photoInput.value = '';
    updateSummary();
  });
}

// ─── Map for Location ───
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
    const addressInput = document.getElementById('locationAddress');
    if (addressInput) addressInput.value = addr;
    updateSummary();
  });
}

function setLocation(lat, lng) {
  selectedLocation = { lat, lng };
  const latInput = document.getElementById('locationLat');
  const lngInput = document.getElementById('locationLng');
  if (latInput) latInput.value = lat;
  if (lngInput) lngInput.value = lng;
  if (locationMarker && reportMap) reportMap.removeLayer(locationMarker);
  locationMarker = L.marker([lat, lng]).addTo(reportMap);
  if (reportMap) reportMap.setView([lat, lng], 15);
  const locationStatus = document.getElementById('locationStatus');
  if (locationStatus) locationStatus.innerHTML = `✅ Location pinned: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

const autoLocateBtn = document.getElementById('autoLocateBtn');
if (autoLocateBtn) {
  autoLocateBtn.addEventListener('click', async () => {
    const btn = autoLocateBtn;
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Locating...';
    try {
      const { lat, lng } = await getCurrentLocation();
      setLocation(lat, lng);
      const addr = await reverseGeocode(lat, lng);
      const addressInput = document.getElementById('locationAddress');
      if (addressInput) addressInput.value = addr;
      showToast('Location detected!', 'success');
      updateSummary();
    } catch {
      showToast('Could not detect location. Allow location access or click the map.', 'error');
      const locationStatus = document.getElementById('locationStatus');
      if (locationStatus) locationStatus.innerHTML = '❌ Location not available';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>📍</span> Auto-detect Location';
    }
  });
}

// ─── Step Navigation ───
let currentStep = 1;

function goToStep(step) {
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  const stepIndicators = document.querySelectorAll('.step');
  
  if (step1) step1.style.display = step === 1 ? 'block' : 'none';
  if (step2) step2.style.display = step === 2 ? 'block' : 'none';
  if (step3) step3.style.display = step === 3 ? 'block' : 'none';
  
  stepIndicators.forEach((el, i) => {
    el.classList.toggle('active', i + 1 === step);
    el.classList.toggle('done', i + 1 < step);
  });
  
  currentStep = step;
  if (step === 2 && !reportMap) {
    setTimeout(initReportMap, 100);
  }
  if (step === 3) updateSummary();
}

const nextToStep2 = document.getElementById('nextToStep2');
if (nextToStep2) {
  nextToStep2.addEventListener('click', () => {
    const selectedType = document.getElementById('selectedType');
    const description = document.getElementById('description');
    if (!selectedType?.value) {
      showToast('Please select an issue type', 'warning');
      return;
    }
    if (!description?.value.trim()) {
      showToast('Please add a description', 'warning');
      return;
    }
    goToStep(2);
  });
}

const nextToStep3 = document.getElementById('nextToStep3');
if (nextToStep3) {
  nextToStep3.addEventListener('click', () => {
    if (!selectedLocation) {
      showToast('Please set a location', 'warning');
      return;
    }
    goToStep(3);
  });
}

const backToStep1 = document.getElementById('backToStep1');
if (backToStep1) backToStep1.addEventListener('click', () => goToStep(1));

const backToStep2 = document.getElementById('backToStep2');
if (backToStep2) backToStep2.addEventListener('click', () => goToStep(2));

// ─── Summary ───
function updateSummary() {
  const type = document.getElementById('selectedType')?.value;
  const severity = document.querySelector('input[name="severity"]:checked')?.value;
  const desc = document.getElementById('description')?.value || '';
  const address = document.getElementById('locationAddress')?.value || '';
  const summaryEl = document.getElementById('reportSummary');
  const contentEl = document.getElementById('summaryContent');
  
  if (!type || !severity || !summaryEl || !contentEl) return;
  
  const cfg = ISSUE_TYPES[type];
  summaryEl.style.display = 'block';
  contentEl.innerHTML = `
    <div class="summary-item"><div class="summary-item-label">Type</div><div class="summary-item-value">${cfg?.icon} ${cfg?.label || type}</div></div>
    <div class="summary-item"><div class="summary-item-label">Severity</div><div class="summary-item-value">${severity.toUpperCase()}</div></div>
    <div class="summary-item" style="grid-column:1/-1"><div class="summary-item-label">Description</div><div class="summary-item-value">${desc.substring(0, 100)}${desc.length > 100 ? '...' : ''}</div></div>
    <div class="summary-item" style="grid-column:1/-1"><div class="summary-item-label">Location</div><div class="summary-item-value">${address || (selectedLocation ? `${selectedLocation.lat?.toFixed(4)}, ${selectedLocation.lng?.toFixed(4)}` : 'Not set')}</div></div>
  `;
}

// ─── Submit Report ───
const reportForm = document.getElementById('reportForm');
if (reportForm) {
  reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    if (!submitBtn) return;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-sm"></span> Submitting...';

    try {
      await submitReport({
        type: document.getElementById('selectedType')?.value,
        description: document.getElementById('description')?.value,
        severity: document.querySelector('input[name="severity"]:checked')?.value || 'medium',
        lat: selectedLocation?.lat,
        lng: selectedLocation?.lng,
        address: document.getElementById('locationAddress')?.value
      }, selectedFile);

      const step1 = document.getElementById('step1');
      const step2 = document.getElementById('step2');
      const step3 = document.getElementById('step3');
      const reportSuccess = document.getElementById('reportSuccess');
      const stepIndicator = document.querySelector('.step-indicator');
      
      if (step1) step1.style.display = 'none';
      if (step2) step2.style.display = 'none';
      if (step3) step3.style.display = 'none';
      if (reportSuccess) reportSuccess.style.display = 'block';
      if (stepIndicator) stepIndicator.style.display = 'none';
      
      showToast('Report submitted successfully!', 'success');
    } catch (err) {
      showToast('Failed to submit: ' + (err.message || 'Unknown error'), 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>🚀</span> Submit Report';
    }
  });
}

const reportAnother = document.getElementById('reportAnother');
if (reportAnother) {
  reportAnother.addEventListener('click', () => {
    window.location.reload();
  });
}