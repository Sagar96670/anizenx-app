import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyBwjbxyuXnRrQjPGezSjaAbuNJEm-kgeFw",
  authDomain: "anizenx-e9993.firebaseapp.com",
  projectId: "anizenx-e9993",
  storageBucket: "anizenx-e9993.firebasestorage.app",
  messagingSenderId: "659295794756",
  appId: "1:659295794756:web:aa4c23fbe1a60ea9b32e11",
  firestoreDatabaseId: "ai-studio-remixanimestream-90de7754-8e9f-44c7-8abd-64b62acbeaf8"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Use browser / device language for auth popups
try {
  auth.useDeviceLanguage();
} catch (e) {
  // Ignored if in non-browser context
}

// Enforce browserLocalPersistence to keep user logged in without redirect resets across reloads & sessions
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('[Firebase Auth] Failed to initialize browserLocalPersistence:', err);
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Target our custom Firestore database ID dynamically
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

