import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCCZJtUvp0SIxjvHCFB5csKbCLtYshjLks",
  authDomain: "amplified-eon-4xctm.firebaseapp.com",
  projectId: "amplified-eon-4xctm",
  storageBucket: "amplified-eon-4xctm.firebasestorage.app",
  messagingSenderId: "409521098058",
  appId: "1:409521098058:web:7e068138a90a037c9c05b3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Target our custom Firestore database ID dynamically
export const db = getFirestore(app, "ai-studio-remixanimestream-90de7754-8e9f-44c7-8abd-64b62acbeaf8");
