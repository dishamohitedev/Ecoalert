// ============================================================
// EcoAlert - Auth Modal (Google Sign-In)
// ============================================================

import { signInWithGoogle } from './auth.js';
import { showToast } from './utils.js';

let modalEl = null;

export function initAuthModal() {
  if (document.getElementById('authModalOverlay')) return;

  const html = `
  <div class="auth-modal-overlay" id="authModalOverlay">
    <div class="auth-modal" id="authModal">
      <button class="auth-modal-close" id="authModalClose">✕</button>
      <div class="auth-modal-logo">🌿</div>
      <h2 class="auth-modal-title">Welcome to EcoAlert</h2>
      <p class="auth-modal-sub">Join the community fighting pollution</p>

      <div class="auth-error-msg" id="authError"></div>

      <!-- Google Sign In Button -->
      <button class="google-signin-btn" id="googleSignInBtn">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
        Sign in with Google
      </button>

      <div class="auth-divider">
        <span>🌱 Join the movement</span>
      </div>

      <p class="auth-footer-text">
        By signing in, you agree to help make your community cleaner and safer.
      </p>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
  modalEl = document.getElementById('authModalOverlay');
  bindEvents();
}

export function openAuthModal() {
  if (!modalEl) initAuthModal();
  modalEl.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeAuthModal() {
  if (modalEl) {
    modalEl.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function bindEvents() {
  const closeBtn = document.getElementById('authModalClose');
  const overlay = document.getElementById('authModalOverlay');
  const googleBtn = document.getElementById('googleSignInBtn');
  
  if (closeBtn) closeBtn.addEventListener('click', closeAuthModal);
  if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAuthModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAuthModal(); });
  
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      googleBtn.disabled = true;
      googleBtn.innerHTML = '<div class="spinner-sm"></div> Signing in...';
      try {
        await signInWithGoogle();
        closeAuthModal();
        window.location.reload();
      } catch (error) {
        const errorMsg = document.getElementById('authError');
        if (errorMsg) {
          errorMsg.textContent = '⚠️ ' + (error.message || 'Sign in failed. Please try again.');
          errorMsg.classList.add('show');
        }
      } finally {
        googleBtn.disabled = false;
        googleBtn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" /> Sign in with Google';
      }
    });
  }
}