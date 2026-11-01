import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';
import { appConfig } from './app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCurKxOt2Vyc6PMRxvsOXBhxi6Z23NQ990',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ai-twin-conflicts.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ai-twin-conflicts',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ai-twin-conflicts.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '562120240186',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:562120240186:web:3204dac37761415337d903',
};

const isNewApp = getApps().length === 0;
const app: FirebaseApp = isNewApp ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

if (appConfig.useFirebaseEmulator && isNewApp) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}

export { app, auth, db, storage, firebaseConfig };
