// ============================================================
// EcoAlert - Firebase Configuration
// ============================================================
// SETUP: Replace these values with your Firebase project config.
// Get them from: Firebase Console → Project Settings → Your Apps
// ============================================================

const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ============================================================
// Firestore Schema Reference (for documentation purposes)
// ============================================================
//
// Collection: reports
// Document fields:
// {
//   id: string (auto-generated),
//   userId: string,
//   userName: string,
//   userPhotoURL: string,
//   type: string,           // "garbage" | "waterlogging" | "smell" | "air" | "drainage" | "road" | "smoke"
//   description: string,
//   severity: string,       // "low" | "medium" | "high" | "critical"
//   status: string,         // "active" | "in-progress" | "resolved"
//   imageURL: string,
//   location: {
//     lat: number,
//     lng: number,
//     address: string
//   },
//   upvotes: number,
//   upvotedBy: array<string>,
//   createdAt: Timestamp,
//   updatedAt: Timestamp,
//   isDeleted: boolean
// }
//
// Collection: users
// Document fields:
// {
//   uid: string,
//   email: string,
//   displayName: string,
//   photoURL: string,
//   role: string,           // "user" | "admin"
//   reportsCount: number,
//   joinedAt: Timestamp
// }
//
// Collection: analytics (optional - auto-computed)
// ============================================================

// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, increment, arrayUnion, arrayRemove }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, storage, googleProvider, signInWithPopup, signOut, onAuthStateChanged,
  collection, addDoc, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, query, where, orderBy,
  limit, onSnapshot, serverTimestamp, increment, arrayUnion, arrayRemove, ref, uploadBytes,
  getDownloadURL, GoogleAuthProvider };
