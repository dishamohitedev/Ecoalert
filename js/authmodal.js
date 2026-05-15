// ============================================================
// EcoAlert - Auth Modal (Username + Password)
// ============================================================

import { registerUser, signInUser, isUsernameTaken } from './auth.js';
import { showToast } from './utils.js';

let modalEl = null;
let usernameCheckTimer = null;

// ─── Inject modal HTML into page ─────────────────────────────
export function initAuthModal() {
  if (document.getElementById('authModal')) return;

  const html = `
  <div class="auth-modal-overlay" id="authModalOverlay">
    <div class="auth-modal" id="authModal">
      <button class="auth-modal-close" id="authModalClose">✕</button>
      <div class="auth-modal-logo">🌿</div>
      <h2 class="auth-modal-title">Welcome to EcoAlert</h2>
      <p class="auth-modal-sub">Join the community fighting pollution</p>

      <div class="auth-tabs">
        <button class="auth-tab active" id="tabLogin">Sign In</button>
        <button class="auth-tab" id="tabRegister">Create Account</button>
      </div>

      <!-- Error message -->
      <div class="auth-error-msg" id="authError"></div>

      <!-- Login Form -->
      <div id="loginForm" class="auth-form">
        <div class="auth-input-wrap">
          <span class="auth-input-icon">👤</span>
          <input class="auth-input" id="loginUsername" type="text"
            placeholder="Username" autocomplete="username" spellcheck="false" />
        </div>
        <div class="auth-password-wrap auth-input-wrap">
          <span class="auth-input-icon">🔒</span>
          <input class="auth-input" id="loginPassword" type="password"
            placeholder="Password" autocomplete="current-password" />
          <button class="auth-toggle-pw" data-target="loginPassword" type="button">👁️</button>
        </div>
        <button class="auth-submit" id="loginSubmit">
          <span>Sign In</span>
        </button>
        <div class="auth-switch">
          No account? <button id="switchToRegister">Create one</button>
        </div>
      </div>

      <!-- Register Form -->
      <div id="registerForm" class="auth-form" style="display:none">
        <div>
          <div class="auth-input-wrap">
            <span class="auth-input-icon">👤</span>
            <input class="auth-input" id="regUsername" type="text"
              placeholder="Choose a username" autocomplete="off" spellcheck="false"
              maxlength="24" />
          </div>
          <div class="auth-username-status" id="usernameStatus"></div>
        </div>
        <div class="auth-password-wrap auth-input-wrap">
          <span class="auth-input-icon">🔒</span>
          <input class="auth-input" id="regPassword" type="password"
            placeholder="Set a password (min 6 chars)" autocomplete="new-password" />
          <button class="auth-toggle-pw" data-target="regPassword" type="button">👁️</button>
        </div>
        <div class="auth-password-wrap auth-input-wrap">
          <span class="auth-input-icon">🔒</span>
          <input class="auth-input" id="regConfirm" type="password"
            placeholder="Confirm password" autocomplete="new-password" />
          <button class="auth-toggle-pw" data-target="regConfirm" type="button">👁️</button>
        </div>
        <button class="auth-submit" id="registerSubmit">
          <span>Create Account</span>
        </button>
        <div class="auth-switch">
          Already have an account? <button id="switchToLogin">Sign in</button>
        </div>
      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
  modalEl = document.getElementById('authModalOverlay');
  bindEvents();
}

// ─── Open / Close ─────────────────────────────────────────────
export function openAuthModal(tab = 'login') {
  if (!modalEl) initAuthModal();
  clearErrors();
  showTab(tab);
  modalEl.classList.add('open');
  document.body.style.overflow = 'hidden';
  // Focus first input
  setTimeout(() => {
    const first = modalEl.querySelector(`#${tab === 'login' ? 'loginUsername' : 'regUsername'}`);
    first?.focus();
  }, 300);
}

export function closeAuthModal() {
  modalEl?.classList.remove('open');
  document.body.style.overflow = '';
}

// ─── Tab switching ────────────────────────────────────────────
function showTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('loginForm').style.display = isLogin ? 'flex' : 'none';
  document.getElementById('registerForm').style.display = isLogin ? 'none' : 'flex';
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabRegister').classList.toggle('active', !isLogin);
  clearErrors();
}

// ─── Bind all events ─────────────────────────────────────────
function bindEvents() {
  // Close
  document.getElementById('authModalClose').addEventListener('click', closeAuthModal);
  modalEl.addEventListener('click', (e) => { if (e.target === modalEl) closeAuthModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAuthModal(); });

  // Tabs
  document.getElementById('tabLogin').addEventListener('click', () => showTab('login'));
  document.getElementById('tabRegister').addEventListener('click', () => showTab('register'));
  document.getElementById('switchToRegister').addEventListener('click', () => showTab('register'));
  document.getElementById('switchToLogin').addEventListener('click', () => showTab('login'));

  // Password toggles
  document.querySelectorAll('.auth-toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? '👁️' : '🙈';
    });
  });

  // Username availability check (register)
  document.getElementById('regUsername').addEventListener('input', (e) => {
    clearTimeout(usernameCheckTimer);
    const val = e.target.value.trim();
    const status = document.getElementById('usernameStatus');

    if (!val) { status.textContent = ''; status.className = 'auth-username-status'; return; }
    if (val.length < 3) {
      status.textContent = '⚠ At least 3 characters';
      status.className = 'auth-username-status taken';
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(val)) {
      status.textContent = '⚠ Only letters, numbers, underscores';
      status.className = 'auth-username-status taken';
      return;
    }

    status.textContent = '⏳ Checking...';
    status.className = 'auth-username-status checking';

    usernameCheckTimer = setTimeout(async () => {
      try {
        const taken = await isUsernameTaken(val);
        if (taken) {
          status.textContent = '✗ Username already taken';
          status.className = 'auth-username-status taken';
        } else {
          status.textContent = '✓ Username is available';
          status.className = 'auth-username-status available';
        }
      } catch {
        status.textContent = '';
      }
    }, 500);
  });

  // Login submit
  document.getElementById('loginSubmit').addEventListener('click', handleLogin);
  document.getElementById('loginPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  // Register submit
  document.getElementById('registerSubmit').addEventListener('click', handleRegister);
  document.getElementById('regConfirm').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleRegister();
  });
}

// ─── Handle Login ─────────────────────────────────────────────
async function handleLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  clearErrors();

  if (!username) return showError('Please enter your username.');
  if (!password) return showError('Please enter your password.');

  setLoading('loginSubmit', true, 'Signing in...');
  try {
    await signInUser(username, password);
    closeAuthModal();
  } catch (e) {
    const msg = e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential'
      ? 'Incorrect password. Please try again.'
      : e.message || 'Sign in failed.';
    showError(msg);
  } finally {
    setLoading('loginSubmit', false, 'Sign In');
  }
}

// ─── Handle Register ──────────────────────────────────────────
async function handleRegister() {
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm  = document.getElementById('regConfirm').value;
  clearErrors();

  if (!username || username.length < 3) return showError('Username must be at least 3 characters.');
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return showError('Username: only letters, numbers, underscores.');
  if (!password || password.length < 6) return showError('Password must be at least 6 characters.');
  if (password !== confirm) return showError('Passwords do not match.');

  const status = document.getElementById('usernameStatus');
  if (status.classList.contains('taken')) return showError('That username is already taken.');

  setLoading('registerSubmit', true, 'Creating account...');
  try {
    await registerUser(username, password);
    closeAuthModal();
  } catch (e) {
    showError(e.message || 'Registration failed.');
  } finally {
    setLoading('registerSubmit', false, 'Create Account');
  }
}

// ─── Helpers ──────────────────────────────────────────────────
function showError(msg) {
  const el = document.getElementById('authError');
  el.textContent = '⚠ ' + msg;
  el.classList.add('show');
}
function clearErrors() {
  const el = document.getElementById('authError');
  if (el) { el.textContent = ''; el.classList.remove('show'); }
}
function setLoading(btnId, loading, label) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<span class="spinner-sm"></span> ${label}`
    : `<span>${label}</span>`;
}