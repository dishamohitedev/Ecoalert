// ============================================================
// EcoAlert - Reports Database Module
// ============================================================

import { db, storage, auth, collection, addDoc, getDocs, getDoc, doc, updateDoc,
  deleteDoc, query, where, orderBy, onSnapshot, serverTimestamp, increment,
  arrayUnion, arrayRemove, ref, uploadBytes, getDownloadURL } from './firebase-config.js';
import { DUMMY_REPORTS } from './utils.js';
import { showToast } from './utils.js';

const REPORTS_COLLECTION = 'reports';
const USERS_COLLECTION = 'users';

// ─── Upload Image to Firebase Storage ────────────────────────
export async function uploadReportImage(file, userId) {
  const ext = file.name.split('.').pop();
  const filename = `reports/${userId}/${Date.now()}.${ext}`;
  const storageRef = ref(storage, filename);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

// ─── Submit New Report ────────────────────────────────────────
export async function submitReport(reportData, imageFile) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  let imageURL = '';
  if (imageFile) {
    imageURL = await uploadReportImage(imageFile, user.uid);
  }

  const report = {
    userId: user.uid,
    userName: user.displayName,
    userPhotoURL: user.photoURL || '',
    type: reportData.type,
    description: reportData.description,
    severity: reportData.severity,
    status: 'active',
    imageURL,
    location: {
      lat: parseFloat(reportData.lat),
      lng: parseFloat(reportData.lng),
      address: reportData.address || ''
    },
    upvotes: 0,
    upvotedBy: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isDeleted: false
  };

  const docRef = await addDoc(collection(db, REPORTS_COLLECTION), report);

  // Increment user report count
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  await updateDoc(userRef, { reportsCount: increment(1) });

  return docRef.id;
}

// ─── Get All Reports (Live) ───────────────────────────────────
export function listenToReports(callback, filters = {}) {
  let q = query(
    collection(db, REPORTS_COLLECTION),
    where('isDeleted', '==', false),
    orderBy('createdAt', 'desc')
  );

  // Apply optional filters
  if (filters.type) q = query(q, where('type', '==', filters.type));
  if (filters.severity) q = query(q, where('severity', '==', filters.severity));
  if (filters.status) q = query(q, where('status', '==', filters.status));

  return onSnapshot(q, (snapshot) => {
    const reports = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(reports);
  }, (error) => {
    console.warn('Firestore listener error, using demo data:', error);
    callback(DUMMY_REPORTS);
  });
}

// ─── Get All Reports (One-time) ───────────────────────────────
export async function fetchReports(filters = {}) {
  try {
    let q = query(
      collection(db, REPORTS_COLLECTION),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    let reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Client-side filtering
    if (filters.type) reports = reports.filter(r => r.type === filters.type);
    if (filters.severity) reports = reports.filter(r => r.severity === filters.severity);
    if (filters.status) reports = reports.filter(r => r.status === filters.status);

    return reports;
  } catch (error) {
    console.warn('Using demo data:', error);
    return DUMMY_REPORTS;
  }
}

// ─── Get Single Report ────────────────────────────────────────
export async function getReport(reportId) {
  const demo = DUMMY_REPORTS.find(r => r.id === reportId);
  if (demo) return demo;
  const snap = await getDoc(doc(db, REPORTS_COLLECTION, reportId));
  if (!snap.exists()) throw new Error('Report not found');
  return { id: snap.id, ...snap.data() };
}

// ─── Upvote Report ────────────────────────────────────────────
export async function upvoteReport(reportId) {
  const user = auth.currentUser;
  if (!user) { showToast('Sign in to upvote', 'warning'); return; }

  const reportRef = doc(db, REPORTS_COLLECTION, reportId);
  const snap = await getDoc(reportRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const hasUpvoted = data.upvotedBy?.includes(user.uid);

  if (hasUpvoted) {
    await updateDoc(reportRef, {
      upvotes: increment(-1),
      upvotedBy: arrayRemove(user.uid)
    });
    showToast('Upvote removed', 'info');
  } else {
    await updateDoc(reportRef, {
      upvotes: increment(1),
      upvotedBy: arrayUnion(user.uid)
    });
    showToast('Report verified! 👍', 'success');
  }
}

// ─── Update Report Status (Admin) ────────────────────────────
export async function updateReportStatus(reportId, status) {
  await updateDoc(doc(db, REPORTS_COLLECTION, reportId), {
    status,
    updatedAt: serverTimestamp()
  });
}

// ─── Delete Report (Admin) ────────────────────────────────────
export async function deleteReport(reportId) {
  await updateDoc(doc(db, REPORTS_COLLECTION, reportId), {
    isDeleted: true,
    updatedAt: serverTimestamp()
  });
}

// ─── Get User Reports ─────────────────────────────────────────
export async function getUserReports(userId) {
  try {
    const q = query(
      collection(db, REPORTS_COLLECTION),
      where('userId', '==', userId),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    return DUMMY_REPORTS.filter(r => r.userId === userId);
  }
}

// ─── Get Analytics Data ───────────────────────────────────────
export async function getAnalytics() {
  const reports = await fetchReports();
  const analytics = {
    total: reports.length,
    active: reports.filter(r => r.status === 'active').length,
    inProgress: reports.filter(r => r.status === 'in-progress').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    critical: reports.filter(r => r.severity === 'critical').length,
    byType: {},
    bySeverity: {},
    recent: reports.slice(0, 5)
  };
  reports.forEach(r => {
    analytics.byType[r.type] = (analytics.byType[r.type] || 0) + 1;
    analytics.bySeverity[r.severity] = (analytics.bySeverity[r.severity] || 0) + 1;
  });
  return analytics;
}
