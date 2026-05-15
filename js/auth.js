// ============================================================
// EcoAlert - Authentication Module (Google Auth)
// ============================================================

import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, 
  db, collection, doc, getDoc, setDoc, serverTimestamp } from './firebase-config.js';
import { showToast } from './utils.js';

let currentUser = null;

export function initAuth(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await ensureUserDocument(user);
      updateAuthUI(user);
      showToast(`Welcome ${user.displayName || 'User'}! 🌿`, 'success');
    } else {
      currentUser = null;
      updateAuthUI(null);
    }
    if (callback) callback(user);
  });
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    showToast(`Welcome ${result.user.displayName || 'User'}!`, 'success');
    return result.user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    if (error.code === 'auth/popup-blocked') {
      showToast('Popup was blocked. Please allow popups for this site.', 'error');
    } else {
      showToast('Sign in failed. Please try again.', 'error');
    }
    throw error;
  }
}

export async function signOutUser() {
  try {
    await signOut(auth);
    showToast('Signed out successfully', 'info');
    window.location.href = getBasePath() + 'index.html';
  } catch {
    showToast('Sign out failed', 'error');
  }
}

export function getCurrentUser() {
  return currentUser || auth.currentUser;
}

async function ensureUserDocument(user) {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    // Generate username from email (remove @gmail.com and special chars)
    let username = user.displayName || user.email?.split('@')[0] || 'user';
    username = username.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

    const payload = {
      uid: user.uid,
      username: username,
      email: user.email || '',
      displayName: user.displayName || username,
      photoURL: user.photoURL || '',
      role: 'user',
      reportsCount: 0,
      joinedAt: serverTimestamp()
    };

    if (!userSnap.exists()) {
      await setDoc(userRef, payload);
    } else {
      // Update existing user
      await setDoc(userRef, {
        displayName: user.displayName || userSnap.data().displayName,
        photoURL: user.photoURL || userSnap.data().photoURL,
        lastLoginAt: serverTimestamp()
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error creating user document:', error);
  }
}

export async function isAdmin(uid) {
  try {
    const userRef = doc(db, 'users', uid || auth.currentUser?.uid);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() && userSnap.data().role === 'admin';
  } catch {
    return false;
  }
}

function updateAuthUI(user) {
  const loginBtns = document.querySelectorAll('.btn-login');
  const logoutBtns = document.querySelectorAll('.btn-logout');
  const userAvatars = document.querySelectorAll('.user-avatar');
  const userNames = document.querySelectorAll('.user-name');
  const authRequired = document.querySelectorAll('.auth-required');

  if (user) {
    loginBtns.forEach((btn) => btn.style.display = 'none');
    logoutBtns.forEach((btn) => btn.style.display = 'flex');
    userAvatars.forEach((el) => {
      if (el.tagName === 'IMG') {
        el.src = user.photoURL || 'assets/default-avatar.png';
        el.style.display = 'block';
      }
    });
    userNames.forEach((el) => {
      el.textContent = user.displayName || user.email?.split('@')[0] || 'User';
    });
    authRequired.forEach((el) => { el.style.display = ''; });
  } else {
    loginBtns.forEach((btn) => btn.style.display = 'flex');
    logoutBtns.forEach((btn) => btn.style.display = 'none');
    userAvatars.forEach((el) => { if (el.tagName === 'IMG') el.style.display = 'none'; });
    userNames.forEach((el) => { el.textContent = ''; });
    authRequired.forEach((el) => { el.style.display = 'none'; });
  }
}

function getBasePath() {
  return window.location.pathname.includes('/pages/') ? '../' : '';
}