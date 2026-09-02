import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

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
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "ai-studio-remixanimestream-90de7754-8e9f-44c7-8abd-64b62acbeaf8");

