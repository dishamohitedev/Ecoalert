// ============================================================
// EcoAlert - Authentication Module (Role-based)
// ============================================================

import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword,
  db, collection, doc, getDoc, setDoc, serverTimestamp } from './firebase-config.js';
import { showToast } from './utils.js';

let currentUser = null;
let currentUserRole = null;
let authInitialized = false;
let pendingCallbacks = [];

// Role constants
export const ROLES = {
  USER: 'user',
  GOVERNMENT: 'government',
  ADMIN: 'admin'
};

export function initAuth(callback) {
  if (authInitialized && currentUser !== undefined) {
    callback(currentUser, currentUserRole);
    return;
  }
  
  pendingCallbacks.push(callback);
  
  if (authInitialized) return;
  
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    currentUserRole = null;
    
    if (user) {
      await ensureUserDocument(user);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      currentUserRole = userDoc.exists() ? userDoc.data().role : ROLES.USER;
      updateAuthUI(user, currentUserRole);
    } else {
      updateAuthUI(null, null);
    }
    
    authInitialized = true;
    pendingCallbacks.forEach(cb => cb(currentUser, currentUserRole));
    pendingCallbacks = [];
  });
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    currentUser = result.user;
    await ensureUserDocument(result.user);
    const userDoc = await getDoc(doc(db, 'users', result.user.uid));
    currentUserRole = userDoc.exists() ? userDoc.data().role : ROLES.USER;
    showToast(`Welcome ${result.user.displayName || 'User'}!`, 'success');
    
    // Redirect based on role
    redirectBasedOnRole(currentUserRole);
    return result.user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    showToast('Sign in failed. Please try again.', 'error');
    throw error;
  }
}

// Government/Admin email/password login
export async function signInWithEmail(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    currentUser = result.user;
    const userDoc = await getDoc(doc(db, 'users', result.user.uid));
    currentUserRole = userDoc.exists() ? userDoc.data().role : ROLES.USER;
    
    // Check if user has government or admin role
    if (currentUserRole !== ROLES.GOVERNMENT && currentUserRole !== ROLES.ADMIN) {
      await signOut(auth);
      showToast('Unauthorized access. Please use the correct portal.', 'error');
      return null;
    }
    
    showToast(`Welcome ${currentUserRole === ROLES.ADMIN ? 'Admin' : 'Government Official'}!`, 'success');
    redirectBasedOnRole(currentUserRole);
    return result.user;
  } catch (error) {
    showToast('Invalid email or password', 'error');
    throw error;
  }
}

export async function signOutUser() {
  try {
    await signOut(auth);
    currentUser = null;
    currentUserRole = null;
    showToast('Signed out successfully', 'info');
    window.location.href = '/index.html';
  } catch (error) {
    showToast('Sign out failed', 'error');
  }
}

export function getCurrentUser() {
  return currentUser || auth.currentUser;
}

export function getCurrentUserRole() {
  return currentUserRole;
}

async function ensureUserDocument(user) {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      let username = user.displayName || user.email?.split('@')[0] || 'user';
      username = username.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      
      // Determine role based on email domain or special emails
      let role = ROLES.USER;
      const email = user.email || '';
      
      if (email === 'admin@ecoalert.com') {
        role = ROLES.ADMIN;
      } else if (email.endsWith('@gov.in') || email.endsWith('@mcgm.gov.in')) {
        role = ROLES.GOVERNMENT;
      }
      
      await setDoc(userRef, {
        uid: user.uid,
        username: username,
        email: email,
        displayName: user.displayName || username,
        photoURL: user.photoURL || '',
        role: role,
        reportsCount: 0,
        actionsCount: 0,
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
    return userSnap.exists() && userSnap.data().role === ROLES.ADMIN;
  } catch {
    return false;
  }
}

export async function isGovernment(uid) {
  try {
    const userRef = doc(db, 'users', uid || auth.currentUser?.uid);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() && userSnap.data().role === ROLES.GOVERNMENT;
  } catch {
    return false;
  }
}

function redirectBasedOnRole(role) {
  if (role === ROLES.ADMIN) {
    window.location.href = '/pages/admin-dashboard.html';
  } else if (role === ROLES.GOVERNMENT) {
    window.location.href = '/pages/government-dashboard.html';
  } else {
    window.location.href = '/pages/user-dashboard.html';
  }
}

function updateAuthUI(user, role) {
  const loginBtns = document.querySelectorAll('.btn-login');
  const logoutBtns = document.querySelectorAll('.btn-logout');
  
  if (user) {
    loginBtns.forEach((btn) => { if (btn) btn.style.display = 'none'; });
    logoutBtns.forEach((btn) => { if (btn) btn.style.display = 'flex'; });
  } else {
    loginBtns.forEach((btn) => { if (btn) btn.style.display = 'flex'; });
    logoutBtns.forEach((btn) => { if (btn) btn.style.display = 'none'; });
  }
}