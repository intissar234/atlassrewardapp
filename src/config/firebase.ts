// src/config/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDziboYR0aSl-s3NxDyH-jv2lsqbnN-5pU",
  authDomain: "atlasrewards-31673.firebaseapp.com",
  projectId: "atlasrewards-31673",
  storageBucket: "atlasrewards-31673.appspot.com",
  messagingSenderId: "84479648662",
  appId: "1:84479648662:web:279002616440a0ed00f3b7",
  measurementId: "G-40705XXE0V"
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log("✅ Firebase initialized successfully");
} else {
  app = getApps()[0];
  console.log("✅ Using existing Firebase app");
}

// Initialize Auth - Simple approach
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("✅ Auth initialized:", !!auth);
console.log("✅ Firestore initialized:", !!db);

export default app;