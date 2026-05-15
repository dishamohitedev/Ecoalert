// ============================================================
// EcoAlert - Authentication Module
// ============================================================

import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile,
  signOut, onAuthStateChanged, db, collection, doc, getDoc, getDocs, query, serverTimestamp,
  setDoc, where } from './firebase-config.js';
import { showToast } from './utils.js';

const USERNAME_EMAIL_DOMAIN = '@ecoalert.local';
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,24}$/;

let currentUser = null;

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

export async function registerUser(username, password) {
  const displayName = (username || '').trim();
  const normalizedUsername = normalizeUsername(displayName);
  if (!USERNAME_PATTERN.test(normalizedUsername)) {
    throw new Error('Username must be 3-24 characters and use only letters, numbers, or underscores.');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  if (await isUsernameTaken(normalizedUsername)) {
    throw new Error('That username is already taken. Please log in instead.');
  }

  try {
    const email = usernameToEmail(normalizedUsername);
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName });
    await ensureUserDocument(result.user, displayName);
    showToast('Account created successfully.', 'success');
    return result.user;
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('That username is already taken. Please log in instead.');
    }
    throw error;
  }
}

export async function signInUser(username, password) {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) {
    throw new Error('Please enter your username.');
  }
  if (!password) {
    throw new Error('Please enter your password.');
  }

  const taken = await isUsernameTaken(normalizedUsername);
  if (!taken) {
    throw new Error('No account found for that username. Create an account first.');
  }

  try {
    const result = await signInWithEmailAndPassword(auth, usernameToEmail(normalizedUsername), password);
    showToast('Welcome back to EcoAlert!', 'success');
    return result.user;
  } catch (error) {
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error('Incorrect password. Please try again.');
    }
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found for that username. Create an account first.');
    }
    throw error;
  }
}

export async function isUsernameTaken(username) {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) return false;

  const q = query(
    collection(db, 'users'),
    where('usernameLower', '==', normalizedUsername)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

export async function signOutUser() {
  try {
    await signOut(auth);
    localStorage.removeItem('ecoalert_ui_state');
    showToast('Signed out successfully', 'info');
    window.location.href = getBasePath() + 'index.html';
  } catch {
    showToast('Sign out failed', 'error');
  }
}

export function getCurrentUser() {
  return currentUser || auth.currentUser;
}

async function ensureUserDocument(user, usernameOverride = '') {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    const displayName = (usernameOverride || user.displayName || user.email?.split('@')[0] || 'user').trim();
    const username = normalizeUsername(displayName);

    const payload = {
      uid: user.uid,
      username: displayName,
      usernameLower: username,
      email: user.email || '',
      displayName,
      photoURL: user.photoURL || '',
      role: 'user',
      reportsCount: 0,
      joinedAt: serverTimestamp()
    };

    if (!userSnap.exists()) {
      await setDoc(userRef, payload);
      return;
    }

    await setDoc(userRef, {
      username: userSnap.data().username || displayName,
      usernameLower: userSnap.data().usernameLower || username,
      email: userSnap.data().email || user.email || '',
      displayName: userSnap.data().displayName || displayName,
      photoURL: userSnap.data().photoURL || user.photoURL || '',
      role: userSnap.data().role || 'user',
      reportsCount: userSnap.data().reportsCount || 0
    }, { merge: true });
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
  const guestOnly = document.querySelectorAll('.guest-only');

  if (user) {
    loginBtns.forEach((btn) => btn.style.display = 'none');
    logoutBtns.forEach((btn) => btn.style.display = 'flex');
    userAvatars.forEach((el) => {
      el.src = user.photoURL || 'assets/default-avatar.png';
      el.style.display = 'block';
    });
    userNames.forEach((el) => {
      el.textContent = user.displayName || user.email?.split('@')[0] || 'User';
    });
    authRequired.forEach((el) => { el.style.display = ''; });
    guestOnly.forEach((el) => { el.style.display = 'none'; });
  } else {
    loginBtns.forEach((btn) => btn.style.display = 'flex');
    logoutBtns.forEach((btn) => btn.style.display = 'none');
    userAvatars.forEach((el) => { el.style.display = 'none'; });
    userNames.forEach((el) => { el.textContent = ''; });
    authRequired.forEach((el) => { el.style.display = 'none'; });
    guestOnly.forEach((el) => { el.style.display = ''; });
  }
}

function normalizeUsername(username) {
  return (username || '').trim().toLowerCase();
}

function usernameToEmail(username) {
  return `${normalizeUsername(username)}${USERNAME_EMAIL_DOMAIN}`;
}

function getBasePath() {
  return window.location.pathname.includes('/pages/') ? '../' : '';
}
