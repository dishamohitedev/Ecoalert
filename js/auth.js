// ============================================================
// EcoAlert - Authentication Module (Optimized)
// ============================================================

import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, 
  db, collection, doc, getDoc, setDoc, serverTimestamp } from './firebase-config.js';
import { showToast } from './utils.js';

let currentUser = null;
let authInitialized = false;
let pendingCallbacks = [];

export function initAuth(callback) {
  // Store callback for later if not initialized yet
  if (authInitialized && currentUser !== undefined) {
    callback(currentUser);
    return;
  }
  
  pendingCallbacks.push(callback);
  
  if (authInitialized) return;
  
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    authInitialized = true;
    
    if (user) {
      // Quick profile update without waiting for Firestore
      updateAuthUI(user);
      
      // Update Firestore in background (don't await)
      ensureUserDocument(user).catch(console.error);
    } else {
      updateAuthUI(null);
    }
    
    // Call all pending callbacks
    pendingCallbacks.forEach(cb => cb(user));
    pendingCallbacks = [];
  });
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    currentUser = result.user;
    updateAuthUI(result.user);
    showToast(`Welcome ${result.user.displayName || 'User'}! 🌿`, 'success');
    return result.user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    if (error.code === 'auth/popup-blocked') {
      showToast('Please allow popups for this site', 'error');
    } else if (error.code === 'auth/cancelled-popup-request') {
      // User cancelled, ignore
    } else {
      showToast('Sign in failed. Please try again.', 'error');
    }
    throw error;
  }
}

export async function signOutUser() {
  try {
    await signOut(auth);
    currentUser = null;
    showToast('Signed out successfully', 'info');
    // Redirect to home after sign out
    if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
      window.location.href = '/index.html';
    } else {
      window.location.reload();
    }
  } catch (error) {
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
    
    if (!userSnap.exists()) {
      let username = user.displayName || user.email?.split('@')[0] || 'user';
      username = username.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      
      await setDoc(userRef, {
        uid: user.uid,
        username: username,
        email: user.email || '',
        displayName: user.displayName || username,
        photoURL: user.photoURL || '',
        role: 'user',
        reportsCount: 0,
        joinedAt: serverTimestamp()
      });
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
  
  if (user) {
    loginBtns.forEach((btn) => { if (btn) btn.style.display = 'none'; });
    logoutBtns.forEach((btn) => { if (btn) btn.style.display = 'flex'; });
    userAvatars.forEach((el) => {
      if (el && el.tagName === 'IMG') {
        el.src = user.photoURL || 'assets/default-avatar.png';
        el.style.display = 'block';
      }
    });
  } else {
    loginBtns.forEach((btn) => { if (btn) btn.style.display = 'flex'; });
    logoutBtns.forEach((btn) => { if (btn) btn.style.display = 'none'; });
    userAvatars.forEach((el) => { if (el && el.tagName === 'IMG') el.style.display = 'none'; });
  }
}