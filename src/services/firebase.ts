import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyCCZJtUvp0SIxjvHCFB5csKbCLtYshjLks",
  authDomain: "amplified-eon-4xctm.firebaseapp.com",
  projectId: "amplified-eon-4xctm",
  storageBucket: "amplified-eon-4xctm.firebasestorage.app",
  messagingSenderId: "409521098058",
  appId: "1:409521098058:web:7e068138a90a037c9c05b3",
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

