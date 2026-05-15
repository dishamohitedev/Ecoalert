// ============================================================
// EcoAlert - Firebase Configuration (Google Auth)
// ============================================================

// 🔥 YOUR FIREBASE CONFIG
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBQS61kPTHCbdrBOsR-bosYSoPApQ7mPHw",
  authDomain: "ecoalert-fd6a8.firebaseapp.com",
  projectId: "ecoalert-fd6a8",
  storageBucket: "ecoalert-fd6a8.firebasestorage.app",
  messagingSenderId: "778987310995",
  appId: "1:778987310995:web:e087c4f339b48da9b2e266"
};

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, increment, arrayUnion, arrayRemove }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

console.log("✅ Firebase initialized with Google Auth!");

export { 
  auth, db, storage, googleProvider,
  signInWithPopup, signOut, onAuthStateChanged,
  collection, addDoc, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, increment, arrayUnion, arrayRemove,
  ref, uploadBytes, getDownloadURL
};