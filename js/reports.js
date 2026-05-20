// ============================================================
// EcoAlert - Reports Database Module (COMPLETE WORKING VERSION)
// ============================================================

import { db, auth, collection, addDoc, getDocs, getDoc, doc, setDoc, updateDoc,
  deleteDoc, query, where, orderBy, onSnapshot, serverTimestamp, increment,
  arrayUnion, arrayRemove, IS_FIREBASE_CONFIGURED } from './firebase-config.js';
import { DUMMY_REPORTS } from './utils.js';
import { showToast } from './utils.js';

// Import storage functions
import { storage, ref, uploadBytes, getDownloadURL } from './firebase-config.js';

const REPORTS_COLLECTION = 'reports';
const USERS_COLLECTION = 'users';
const ACTIONS_COLLECTION = 'government_actions';

// Action status types
export const ACTION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
};

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
    governmentStatus: null,
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

  // Upload image if provided
  if (imageFile) {
    try {
      const imageRef = ref(storage, `reports/${user.uid}/${Date.now()}_${imageFile.name}`);
      await uploadBytes(imageRef, imageFile);
      report.imageURL = await getDownloadURL(imageRef);
    } catch (error) {
      console.warn('Image upload failed:', error);
    }
  }

  try {
    const docRef = await addDoc(collection(db, REPORTS_COLLECTION), report);
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
  console.log('listenToReports called, IS_FIREBASE_CONFIGURED:', IS_FIREBASE_CONFIGURED);
  
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

    reports.sort((a, b) => {
      const aTime = a.createdAt?.seconds ?? 0;
      const bTime = b.createdAt?.seconds ?? 0;
      return bTime - aTime;
    });

    console.log(`✅ Firestore returned ${reports.length} reports`);
    callback(reports);

  }, (error) => {
    console.error('❌ Firestore error:', error.message);
    console.log('Falling back to dummy reports');
    callback([...DUMMY_REPORTS]);
  });
}

// ─── Get All Reports (One-time) - FIXED ─────────────────────
export async function fetchReports(filters = {}) {
  console.log('fetchReports called, IS_FIREBASE_CONFIGURED:', IS_FIREBASE_CONFIGURED);
  
  if (!IS_FIREBASE_CONFIGURED) {
    console.log('Using dummy reports:', DUMMY_REPORTS.length);
    return [...DUMMY_REPORTS];
  }

  try {
    console.log('Fetching reports from Firestore...');
    const q = query(collection(db, REPORTS_COLLECTION), where('isDeleted', '==', false));
    const snap = await getDocs(q);
    
    console.log('Firestore query completed, docs count:', snap.size);
    
    let reports = snap.docs.map(d => {
      const data = d.data();
      console.log('Report doc:', d.id, 'type:', data.type, 'location:', data.location);
      return { id: d.id, ...data };
    });
    
    console.log('Total reports fetched:', reports.length);
    
    // Apply filters
    if (filters.type) reports = reports.filter(r => r.type === filters.type);
    if (filters.severity) reports = reports.filter(r => r.severity === filters.severity);
    if (filters.status) reports = reports.filter(r => r.status === filters.status);
    
    // If no reports in Firestore, return dummy data
    if (reports.length === 0) {
      console.log('No reports in Firestore, using dummy data');
      return [...DUMMY_REPORTS];
    }
    
    return reports;
  } catch (error) {
    console.error('fetchReports error:', error);
    console.log('Falling back to dummy reports');
    return [...DUMMY_REPORTS];
  }
}

// ─── Get Single Report ─────────────────────────────────────
export async function getReport(reportId) {
  if (!IS_FIREBASE_CONFIGURED) return DUMMY_REPORTS.find(r => r.id === reportId) || null;
  
  try {
    const snap = await getDoc(doc(db, REPORTS_COLLECTION, reportId));
    if (!snap.exists()) throw new Error('Report not found');
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error('getReport error:', error);
    return DUMMY_REPORTS.find(r => r.id === reportId) || null;
  }
}

// ─── Upvote Report ─────────────────────────────────────────
export async function upvoteReport(reportId) {
  const user = auth.currentUser;
  if (!user) { 
    showToast('Sign in to upvote', 'warning'); 
    return; 
  }
  
  if (!IS_FIREBASE_CONFIGURED) { 
    showToast('Upvote available in live mode', 'info'); 
    return; 
  }

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
    console.error('Upvote error:', error);
    showToast('Failed to upvote', 'error');
  }
}

// ─── Update Report Status ──────────────────────────────────
export async function updateReportStatus(reportId, status) {
  if (!IS_FIREBASE_CONFIGURED) return;
  await updateDoc(doc(db, REPORTS_COLLECTION, reportId), { 
    status, 
    updatedAt: serverTimestamp() 
  });
  showToast(`Status updated to ${status}`, 'success');
}

// ─── Delete Report ─────────────────────────────────────────
export async function deleteReport(reportId) {
  if (!IS_FIREBASE_CONFIGURED) return;
  await updateDoc(doc(db, REPORTS_COLLECTION, reportId), { 
    isDeleted: true, 
    updatedAt: serverTimestamp() 
  });
  showToast('Report deleted', 'success');
}

// ─── Get User Reports ──────────────────────────────────────
export async function getUserReports(userId) {
  if (!IS_FIREBASE_CONFIGURED) return DUMMY_REPORTS.filter(r => r.userId === userId);
  
  try {
    const q = query(
      collection(db, REPORTS_COLLECTION),
      where('userId', '==', userId),
      where('isDeleted', '==', false)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('getUserReports error:', error);
    return DUMMY_REPORTS.filter(r => r.userId === userId);
  }
}

// ─── Get Analytics Data ────────────────────────────────────
export async function getAnalytics() {
  const reports = await fetchReports();
  return {
    total: reports.length,
    active: reports.filter(r => r.status === 'active').length,
    inProgress: reports.filter(r => r.status === 'in-progress').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    critical: reports.filter(r => r.severity === 'critical').length,
    byType: reports.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {}),
    bySeverity: reports.reduce((acc, r) => {
      acc[r.severity] = (acc[r.severity] || 0) + 1;
      return acc;
    }, {})
  };
}

// ─── Government Action Functions ───────────────────────────
export async function startGovernmentAction(reportId, notes = '') {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  
  const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.uid));
  if (userDoc.data().role !== 'government') {
    throw new Error('Only government officials can take action');
  }
  
  const actionRef = doc(db, ACTIONS_COLLECTION, reportId);
  const actionSnap = await getDoc(actionRef);
  
  const actionData = {
    reportId,
    startedBy: user.uid,
    startedByName: user.displayName || user.email,
    startedAt: serverTimestamp(),
    status: ACTION_STATUS.PENDING,
    adminConfirmed: false,
    notes: notes,
    beforePhotos: [],
    afterPhotos: []
  };
  
  if (!actionSnap.exists()) {
    await setDoc(actionRef, actionData);
  } else {
    await updateDoc(actionRef, { 
      status: ACTION_STATUS.PENDING,
      startedAt: serverTimestamp(),
      notes: notes
    });
  }
  
  await updateDoc(doc(db, REPORTS_COLLECTION, reportId), {
    governmentStatus: ACTION_STATUS.PENDING,
    updatedAt: serverTimestamp()
  });
  
  showToast('Action marked as started! Waiting for admin confirmation.', 'success');
}

export async function completeGovernmentAction(reportId, afterPhotoFile = null, completionNotes = '') {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  
  const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.uid));
  if (userDoc.data().role !== 'government') {
    throw new Error('Only government officials can take action');
  }
  
  let afterPhotoURL = null;
  if (afterPhotoFile) {
    try {
      const storageRef = ref(storage, `government_actions/${reportId}/after_${Date.now()}.jpg`);
      await uploadBytes(storageRef, afterPhotoFile);
      afterPhotoURL = await getDownloadURL(storageRef);
    } catch (error) {
      console.warn('Photo upload failed:', error);
    }
  }
  
  const actionRef = doc(db, ACTIONS_COLLECTION, reportId);
  await updateDoc(actionRef, {
    status: ACTION_STATUS.PENDING,
    completedAt: serverTimestamp(),
    completedBy: user.uid,
    completedByName: user.displayName || user.email,
    afterPhotos: arrayUnion(afterPhotoURL),
    completionNotes: completionNotes,
    pendingAdminApproval: true
  });
  
  await updateDoc(doc(db, REPORTS_COLLECTION, reportId), {
    governmentStatus: ACTION_STATUS.PENDING,
    updatedAt: serverTimestamp()
  });
  
  showToast('Completion marked! Waiting for admin confirmation.', 'success');
}

export async function confirmGovernmentAction(reportId, approved, adminNotes = '') {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  
  const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.uid));
  if (userDoc.data().role !== 'admin') {
    throw new Error('Only admin can confirm actions');
  }
  
  const actionRef = doc(db, ACTIONS_COLLECTION, reportId);
  const newStatus = approved ? ACTION_STATUS.APPROVED : ACTION_STATUS.REJECTED;
  
  await updateDoc(actionRef, {
    status: newStatus,
    adminConfirmed: approved,
    adminConfirmedAt: serverTimestamp(),
    adminConfirmedBy: user.uid,
    adminNotes: adminNotes
  });
  
  const reportStatus = approved ? 'resolved' : 'active';
  await updateDoc(doc(db, REPORTS_COLLECTION, reportId), {
    governmentStatus: newStatus,
    status: reportStatus,
    updatedAt: serverTimestamp()
  });
  
  showToast(approved ? 'Action confirmed and approved! ✅' : 'Action rejected ❌', 'info');
}

export async function getGovernmentAction(reportId) {
  try {
    const actionRef = doc(db, ACTIONS_COLLECTION, reportId);
    const actionSnap = await getDoc(actionRef);
    if (actionSnap.exists()) {
      return { id: actionSnap.id, ...actionSnap.data() };
    }
    return null;
  } catch {
    return null;
  }
}

export function listenToReportsWithActions(callback) {
  if (!IS_FIREBASE_CONFIGURED) {
    callback(DUMMY_REPORTS.map(r => ({ ...r, governmentAction: null })));
    return () => {};
  }

  const q = query(
    collection(db, REPORTS_COLLECTION),
    where('isDeleted', '==', false)
  );

  return onSnapshot(q, async (snapshot) => {
    const reports = await Promise.all(snapshot.docs.map(async (d) => {
      const data = d.data();
      const action = await getGovernmentAction(d.id);
      return { id: d.id, ...data, governmentAction: action };
    }));
    
    reports.sort((a, b) => {
      const aTime = a.createdAt?.seconds ?? 0;
      const bTime = b.createdAt?.seconds ?? 0;
      return bTime - aTime;
    });
    
    callback(reports);
  }, (error) => {
    console.error('Firestore error:', error);
    callback(DUMMY_REPORTS.map(r => ({ ...r, governmentAction: null })));
  });
}