// @ts-nocheck
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { Timestamp } from 'firebase/firestore';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  increment,
  addDoc
} from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDziboYR0aSl-s3NxDyH-jv2lsqbnN-5pU",
  authDomain: "atlasrewards-31673.firebaseapp.com",
  projectId: "atlasrewards-31673",
  storageBucket: "atlasrewards-31673.appspot.com",
  messagingSenderId: "84479648662",
  appId: "1:84479648662:web:279002616440a0ed00f3b7",
  measurementId: "G-40705XXE0V"
};

// Initialize Firebase only if it hasn't been initialized already
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log("Firebase initialized for the first time");
} else {
  app = getApp(); // Use existing app if already initialized
  console.log("Using existing Firebase app");
}

// Get Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
let analytics = null;

// Conditionally initialize analytics (it will fail in certain environments)
try {
  analytics = getAnalytics(app);
} catch (error) {
  console.log("Analytics failed to initialize:", error);
}

// Create user profile in Firestore
const createUserProfile = async (userData) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user found");
    
    await setDoc(doc(db, "users", user.uid), {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      pointsBalance: 0,
      gamesPlayedToday: 0,
      lastPlayedDate: new Date().toDateString(),
      dailyRewardClaimed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
        
    return true;
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
};

// Get user profile data
const getUserProfile = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user found");
    
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.log("No user profile found");
      return null;
    }
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
};

// Add points to user balance
const addPoints = async (points, source) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user found");
    
    // Update user points balance
    await updateDoc(doc(db, "users", user.uid), {
      pointsBalance: increment(points),
      updatedAt: serverTimestamp()
    });
    
    // Record in points history
    await addDoc(collection(db, "pointsHistory"), {
      userId: user.uid,
      points: points,
      source: source,
      timestamp: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error adding points:", error);
    throw error;
  }
};

// Update games played count
const updateGamesPlayed = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user found");
    
    // Get current user data
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error("User profile not found");
    }
    
    const userData = userDoc.data();
    const today = new Date().toDateString();
    
    // Check if last played date is today
    if (userData.lastPlayedDate === today) {
      // Increment games played today
      await updateDoc(userRef, {
        gamesPlayedToday: increment(1),
        updatedAt: serverTimestamp()
      });
      
      return userData.gamesPlayedToday + 1;
    } else {
      // Reset counter for new day
      await updateDoc(userRef, {
        gamesPlayedToday: 1,
        lastPlayedDate: today,
        updatedAt: serverTimestamp()
      });
      
      return 1;
    }
  } catch (error) {
    console.error("Error updating games played:", error);
    throw error;
  }
};

// Claim daily reward
const claimDailyReward = async (points) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user found");
    
    // Get current user data
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error("User profile not found");
    }
    
    const userData = userDoc.data();
    const today = new Date().toDateString();
    
    // Check if reward already claimed today
    if (userData.lastPlayedDate === today && userData.dailyRewardClaimed) {
      throw new Error("Daily reward already claimed");
    }
    
    // Update user data
    await updateDoc(userRef, {
      pointsBalance: increment(points),
      dailyRewardClaimed: true,
      lastPlayedDate: today,
      updatedAt: serverTimestamp()
    });
    
    // Record in points history
    await addDoc(collection(db, "pointsHistory"), {
      userId: user.uid,
      points: points,
      source: "Daily Reward",
      timestamp: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error claiming daily reward:", error);
    throw error;
  }
};

// Firebase service functions
export {
  app,
  auth,
  db,
  analytics,
  createUserProfile,
  getUserProfile,
  addPoints,
  updateGamesPlayed,
  claimDailyReward
};
// Ajoutez à la fin du fichier:

// Observer pour les changements d'état d'authentification
const observeAuthState = (onAuthStateChanged) => {
  return auth.onAuthStateChanged(onAuthStateChanged);
};

// Exportez cette fonction
export { 
  // ... autres exports
  observeAuthState 
};