// ============================================================
// EcoAlert - Authentication Module
// ============================================================

import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged,
  db, doc, getDoc, setDoc, serverTimestamp } from './firebase-config.js';
import { showToast } from './utils.js';

// Current user state
let currentUser = null;

// ─── Auth State Observer ──────────────────────────────────────
export function initAuth(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await ensureUserDocument(user);
      updateAuthUI(user);
    } else {
      currentUser = null;
      updateAuthUI(null);
    }
    if (callback) callback(user);
  });
}

// ─── Sign In with Google ──────────────────────────────────────
export async function signInWithGoogle() {
  try {
    showLoadingState(true);
    const result = await signInWithPopup(auth, googleProvider);
    showToast('Welcome to EcoAlert! 🌿', 'success');
    return result.user;
  } catch (error) {
    console.error('Sign in error:', error);
    if (error.code !== 'auth/popup-closed-by-user') {
      showToast('Sign in failed. Please try again.', 'error');
    }
    return null;
  } finally {
    showLoadingState(false);
  }
}

// ─── Sign Out ─────────────────────────────────────────────────
export async function signOutUser() {
  try {
    await signOut(auth);
    localStorage.removeItem('ecoalert_ui_state');
    showToast('Signed out successfully', 'info');
    window.location.href = getBasePath() + 'index.html';
  } catch (error) {
    showToast('Sign out failed', 'error');
  }
}

// ─── Get Current User ─────────────────────────────────────────
export function getCurrentUser() {
  return currentUser || auth.currentUser;
}

// ─── Ensure User Document in Firestore ───────────────────────
async function ensureUserDocument(user) {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: 'user',
        reportsCount: 0,
        joinedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error creating user document:', error);
  }
}

// ─── Check if Admin ──────────────────────────────────────────
export async function isAdmin(uid) {
  try {
    const userRef = doc(db, 'users', uid || auth.currentUser?.uid);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() && userSnap.data().role === 'admin';
  } catch {
    return false;
  }
}

// ─── Update Auth UI Elements ─────────────────────────────────
function updateAuthUI(user) {
  const loginBtns = document.querySelectorAll('.btn-login');
  const logoutBtns = document.querySelectorAll('.btn-logout');
  const userAvatars = document.querySelectorAll('.user-avatar');
  const userNames = document.querySelectorAll('.user-name');
  const authRequired = document.querySelectorAll('.auth-required');
  const guestOnly = document.querySelectorAll('.guest-only');

  if (user) {
    loginBtns.forEach(btn => btn.style.display = 'none');
    logoutBtns.forEach(btn => btn.style.display = 'flex');
    userAvatars.forEach(el => {
      el.src = user.photoURL || 'assets/default-avatar.png';
      el.style.display = 'block';
    });
    userNames.forEach(el => el.textContent = user.displayName?.split(' ')[0] || 'User');
    authRequired.forEach(el => el.style.display = '');
    guestOnly.forEach(el => el.style.display = 'none');
  } else {
    loginBtns.forEach(btn => btn.style.display = 'flex');
    logoutBtns.forEach(btn => btn.style.display = 'none');
    userAvatars.forEach(el => el.style.display = 'none');
    userNames.forEach(el => el.textContent = '');
    authRequired.forEach(el => el.style.display = 'none');
    guestOnly.forEach(el => el.style.display = '');
  }
}

function showLoadingState(loading) {
  const btn = document.querySelector('.btn-google-signin');
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? '<span class="spinner-sm"></span> Signing in...'
    : '<img src="../assets/google-icon.svg" alt="G"> Sign in with Google';
}

function getBasePath() {
  return window.location.pathname.includes('/pages/') ? '../' : '';
}
