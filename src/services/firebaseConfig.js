import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || '';

// Validate required environment variables
const requiredEnvVars = [
  ['VITE_FIREBASE_API_KEY', firebaseConfig.apiKey],
  ['VITE_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain],
  ['VITE_FIREBASE_PROJECT_ID', firebaseConfig.projectId],
  ['VITE_FIREBASE_APP_ID', firebaseConfig.appId]
];

const missingVars = requiredEnvVars.filter(([, val]) => !val).map(([name]) => name);

export const isFirebaseConfigured = Boolean(
  missingVars.length === 0 &&
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'your_api_key_here'
);

let app = null;
let db = null;
let auth = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = databaseId && databaseId !== '(default)' ? getFirestore(app, databaseId) : getFirestore(app);
    auth = getAuth(app);
    console.info('[Firebase] Initialized with project:', firebaseConfig.projectId, 'Database ID:', databaseId || '(default)');

    // Validate Firestore connection on boot
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error('[Firebase] Please check your Firebase connection / rules.');
        }
      }
    };
    testConnection();
  } catch (error) {
    console.warn('[Firebase] Initialization error:', error.message);
  }
} else {
  if (missingVars.length > 0) {
    console.error(
      `[Firebase Error] Missing required Firebase environment variables in .env: ${missingVars.join(', ')}. Please ensure all VITE_FIREBASE_* variables are set.`
    );
  } else {
    console.error('[Firebase Error] Firebase is not properly configured. Check your VITE_FIREBASE_* environment variables.');
  }
}

export { app, db, auth };
export default firebaseConfig;

