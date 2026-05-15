// ── EcoAlert Report Page JS ──
import { initAuth, getCurrentUser, signOutUser } from '../auth.js';
import { initAuthModal, openAuthModal } from '../authmodal.js';
import { submitReport } from '../reports.js';
import { initDarkMode, toggleDarkMode, ISSUE_TYPES, getCurrentLocation,
  reverseGeocode, showToast } from '../utils.js';

initDarkMode();
initAuthModal();

const darkToggle = document.getElementById('darkToggle');
if (darkToggle) darkToggle.addEventListener('click', toggleDarkMode);

const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');

if (loginBtn) {
  loginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal('login');
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await signOutUser();
    window.location.reload();
  });
}

initAuth((user) => {
  if (user) {
    const authGate = document.getElementById('authGate');
    const reportForm = document.getElementById('reportForm');
    if (authGate) authGate.style.display = 'none';
    if (reportForm) reportForm.style.display = 'block';
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'flex';
  } else {
    const authGate = document.getElementById('authGate');
    const reportForm = document.getElementById('reportForm');
    if (authGate) authGate.style.display = 'block';
    if (reportForm) reportForm.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
});

const reportSignInBtn = document.getElementById('reportSignInBtn');
if (reportSignInBtn) {
  reportSignInBtn.addEventListener('click', () => openAuthModal('register'));
}

// Rest of your existing report-page.js code remains the same...
// (Build issue type picker, description char count, image upload, map, step navigation, etc.)
// I'm including the key parts but you can keep your existing implementation

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
    });
    picker.appendChild(div);
  });
}

// ... rest of your existing report-page.js code (description char count, image upload, map init, step navigation, submit)
// Keep all your existing implementation for these features