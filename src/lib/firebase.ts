import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Firebase config is read from Vite environment variables.
// Copy .env.example to .env, fill in your Firebase project's values
// (Project Settings > General > Your apps > SDK setup and configuration),
// then restart `npm run dev` / rebuild for production.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// The app runs perfectly fine WITHOUT Firebase configured (falls back to
// browser localStorage, exactly like before) so that it never breaks during
// local development/preview. Once real keys are provided, it automatically
// switches to Firestore + Storage for real, shared, persistent data.
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (err) {
    console.error('Gagal inisialisasi Firebase, fallback ke penyimpanan lokal (localStorage).', err);
    app = null;
    db = null;
    storage = null;
  }
}

export { app, db, storage };
