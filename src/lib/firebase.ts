import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfigJSON from '../../firebase-applet-config.json';

const readEnv = (val: unknown): string =>
  typeof val === 'string' ? val.trim() : '';

const firebaseConfig = {
  apiKey: readEnv(import.meta.env.VITE_FIREBASE_API_KEY) || firebaseConfigJSON?.apiKey,
  authDomain: readEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) || firebaseConfigJSON?.authDomain,
  projectId: readEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID) || firebaseConfigJSON?.projectId,
  storageBucket: readEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) || firebaseConfigJSON?.storageBucket,
  messagingSenderId: readEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) || firebaseConfigJSON?.messagingSenderId,
  appId: readEnv(import.meta.env.VITE_FIREBASE_APP_ID) || firebaseConfigJSON?.appId,
};

const databaseId =
  readEnv(import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID) ||
  (firebaseConfigJSON as any).firestoreDatabaseId;

// Initialize Firebase safely
const app =
  !getApps().length && firebaseConfig.apiKey
    ? initializeApp(firebaseConfig)
    : getApps().length
    ? getApp()
    : null;

function createFirestore(): Firestore {
  if (!app) return null as any;
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      databaseId
    );
  } catch (err) {
    // Fallback if Firestore was already initialized or IndexedDB is unavailable
    return getFirestore(app, databaseId);
  }
}

export const db = createFirestore();
export const auth = app ? getAuth(app) : (null as any);
export const storage = app ? getStorage(app) : (null as any);
