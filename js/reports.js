// ============================================================
// EcoAlert - Reports Database Module (FIXED: Dummy data always available)
// ============================================================

import { db, auth, collection, addDoc, getDocs, getDoc, doc, updateDoc,
  deleteDoc, query, where, orderBy, onSnapshot, serverTimestamp, increment,
  arrayUnion, arrayRemove, IS_FIREBASE_CONFIGURED } from './firebase-config.js';
import { DUMMY_REPORTS } from './utils.js';
import { showToast } from './utils.js';

const REPORTS_COLLECTION = 'reports';
const USERS_COLLECTION = 'users';

// ─── Submit New Report ────────────────────────────────────
export async function submitReport(reportData, imageFile) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  showToast('Submitting report...', 'info', 2000);

  const report = {
    userId: user.uid,
    userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
    userPhotoURL: user.photoURL || '',
    type: reportData.type,
    description: reportData.description,
    severity: reportData.severity,
    status: 'active',
    imageURL: '',
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

  console.log('📝 Submitting report with location:', report.location);

  try {
    const docRef = await addDoc(collection(db, REPORTS_COLLECTION), report);
    console.log('✅ Report saved to Firestore with ID:', docRef.id);

    try {
      const userRef = doc(db, USERS_COLLECTION, user.uid);
      await updateDoc(userRef, { reportsCount: increment(1) });
    } catch (userError) {
      console.warn('Could not update user count:', userError);
    }

    showToast('Report submitted successfully! ✅', 'success');
    return docRef.id;
  } catch (error) {
    console.error('Submit error:', error);
    showToast('Failed to submit: ' + error.message, 'error');
    throw error;
  }
}

// ─── Get All Reports (Live) ─────────────────────────────────
export function listenToReports(callback) {
  if (!IS_FIREBASE_CONFIGURED) {
    console.log('⚠️ Firebase not configured — using dummy reports:', DUMMY_REPORTS.length);
    callback([...DUMMY_REPORTS]);
    return () => {};
  }

  console.log('🔥 Setting up Firestore onSnapshot listener...');

  const q = query(
    collection(db, REPORTS_COLLECTION),
    where('isDeleted', '==', false)
  );

  return onSnapshot(q, (snapshot) => {
    const reports = snapshot.docs.map(d => {
      const data = d.data();
      return { id: d.id, ...data };
    });

    // Sort newest first client-side
    reports.sort((a, b) => {
      const aTime = a.createdAt?.seconds ?? 0;
      const bTime = b.createdAt?.seconds ?? 0;
      return bTime - aTime;
    });

    console.log(`✅ Firestore returned ${reports.length} reports`);
    
    // Merge with dummy data if needed (for demo)
    if (reports.length === 0) {
      callback([...DUMMY_REPORTS]);
    } else {
      callback(reports);
    }

  }, (error) => {
    console.error('❌ Firestore onSnapshot error:', error.code, error.message);
    
    if (error.code === 'permission-denied') {
      console.error('Fix: Go to Firebase Console → Firestore → Rules and allow reads.');
      showToast('Firestore rules blocking reads — using demo data', 'warning', 5000);
    } else {
      showToast('Firestore error: ' + error.message, 'error', 8000);
    }

    // Fall back to dummy data so map isn't blank
    callback([...DUMMY_REPORTS]);
  });
}

// ─── Get All Reports (One-time) ─────────────────────────────
export async function fetchReports(filters = {}) {
  if (!IS_FIREBASE_CONFIGURED) return [...DUMMY_REPORTS];

  try {
    const q = query(
      collection(db, REPORTS_COLLECTION),
      where('isDeleted', '==', false)
    );
    const snap = await getDocs(q);
    let reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    reports.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));

    if (filters.type) reports = reports.filter(r => r.type === filters.type);
    if (filters.severity) reports = reports.filter(r => r.severity === filters.severity);
    if (filters.status) reports = reports.filter(r => r.status === filters.status);

    return reports.length > 0 ? reports : [...DUMMY_REPORTS];
  } catch (error) {
    console.warn('fetchReports failed:', error);
    return [...DUMMY_REPORTS];
  }
}

// ─── Get Single Report ─────────────────────────────────────
export async function getReport(reportId) {
  if (!IS_FIREBASE_CONFIGURED) return DUMMY_REPORTS.find(r => r.id === reportId) || null;
  const snap = await getDoc(doc(db, REPORTS_COLLECTION, reportId));
  if (!snap.exists()) throw new Error('Report not found');
  return { id: snap.id, ...snap.data() };
}

// ─── Upvote Report ─────────────────────────────────────────
export async function upvoteReport(reportId) {
  const user = auth.currentUser;
  if (!user) { showToast('Sign in to upvote', 'warning'); return; }
  if (!IS_FIREBASE_CONFIGURED) { showToast('Upvote available in live mode', 'info'); return; }

  try {
    const reportRef = doc(db, REPORTS_COLLECTION, reportId);
    const snap = await getDoc(reportRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const hasUpvoted = data.upvotedBy?.includes(user.uid);

    if (hasUpvoted) {
      await updateDoc(reportRef, { upvotes: increment(-1), upvotedBy: arrayRemove(user.uid) });
      showToast('Upvote removed', 'info');
    } else {
      await updateDoc(reportRef, { upvotes: increment(1), upvotedBy: arrayUnion(user.uid) });
      showToast('Report verified! 👍', 'success');
    }
  } catch (error) {
    showToast('Failed to upvote', 'error');
  }
}

// ─── Update Report Status (Admin) ─────────────────────────
export async function updateReportStatus(reportId, status) {
  if (!IS_FIREBASE_CONFIGURED) return;
  await updateDoc(doc(db, REPORTS_COLLECTION, reportId), { status, updatedAt: serverTimestamp() });
}

// ─── Delete Report (Admin) ────────────────────────────────
export async function deleteReport(reportId) {
  if (!IS_FIREBASE_CONFIGURED) return;
  await updateDoc(doc(db, REPORTS_COLLECTION, reportId), { isDeleted: true, updatedAt: serverTimestamp() });
}

// ─── Get User Reports ─────────────────────────────────────
export async function getUserReports(userId) {
  if (!IS_FIREBASE_CONFIGURED) return DUMMY_REPORTS.filter(r => r.userId === userId);
  try {
    const q = query(
      collection(db, REPORTS_COLLECTION),
      where('userId', '==', userId),
      where('isDeleted', '==', false)
    );
    const snap = await getDocs(q);
    const reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return reports.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  } catch {
    return DUMMY_REPORTS.filter(r => r.userId === userId);
  }
}

// ─── Get Analytics Data ───────────────────────────────────
export async function getAnalytics() {
  const reports = await fetchReports();
  const analytics = {
    total: reports.length,
    active: reports.filter(r => r.status === 'active').length,
    inProgress: reports.filter(r => r.status === 'in-progress').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    critical: reports.filter(r => r.severity === 'critical').length,
    byType: {}, bySeverity: {},
    recent: reports.slice(0, 5)
  };
  reports.forEach(r => {
    analytics.byType[r.type] = (analytics.byType[r.type] || 0) + 1;
    analytics.bySeverity[r.severity] = (analytics.bySeverity[r.severity] || 0) + 1;
  });
  return analytics;
}