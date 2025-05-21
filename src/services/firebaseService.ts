// @ts-nocheck
import { auth, db } from '../config/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  increment, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy
} from 'firebase/firestore';

/**
 * Get the current user profile
 * @returns {Promise<Object|null>} User data or null if not found
 */
export const getUserProfile = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      return userDoc.data();
    } else {
      console.log("No user profile found");
      return null;
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};

/**
 * Add points to user balance
 * @param {number} points - Points to add to the user's balance
 * @param {string} source - Source of the points (e.g., "Quiz", "Game")
 * @returns {Promise<boolean>} Success or failure
 */
export const addPoints = async (points, source) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const userDocRef = doc(db, "users", user.uid);
    
    // Update the user's point balance
    await updateDoc(userDocRef, {
      pointsBalance: increment(points),
      updatedAt: serverTimestamp()
    });

    // Log this transaction in pointsHistory collection
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

/**
 * Update games played counter for the current day
 * @returns {Promise<number>} New count of games played today
 */
export const updateGamesPlayed = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data();
    
    if (!userData) {
      throw new Error("User data not found");
    }
    
    const today = new Date().toDateString();
    let gamesPlayedToday = 0;
    
    // Reset counter if it's a new day
    if (userData.lastPlayedDate !== today) {
      await updateDoc(userDocRef, {
        gamesPlayedToday: 1,
        lastPlayedDate: today,
        updatedAt: serverTimestamp()
      });
      gamesPlayedToday = 1;
    } else {
      // Increment counter for today
      gamesPlayedToday = (userData.gamesPlayedToday || 0) + 1;
      await updateDoc(userDocRef, {
        gamesPlayedToday: gamesPlayedToday,
        updatedAt: serverTimestamp()
      });
    }
    
    return gamesPlayedToday;
  } catch (error) {
    console.error("Error updating games played:", error);
    throw error;
  }
};

/**
 * Claim daily reward if not already claimed today
 * @param {number} points - Points to add as daily reward
 * @returns {Promise<boolean>} Success or failure
 */
export const claimDailyReward = async (points) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data();
    
    if (!userData) {
      throw new Error("User data not found");
    }
    
    const today = new Date().toDateString();
    
    // Check if already claimed today
    if (userData.lastPlayedDate === today && userData.dailyRewardClaimed) {
      throw new Error("Daily reward already claimed");
    }
    
    // Update reward status and add points
    await updateDoc(userDocRef, {
      pointsBalance: increment(points),
      dailyRewardClaimed: true,
      lastPlayedDate: today,
      updatedAt: serverTimestamp()
    });
    
    // Log this in pointsHistory
    await addDoc(collection(db, "pointsHistory"), {
      userId: user.uid,
      points: points,
      source: "Bonus Quotidien",
      timestamp: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error claiming daily reward:", error);
    throw error;
  }
};

/**
 * Verify if a flight ID is valid
 * @param {string} flightId - The flight ID to verify
 * @returns {Promise<{isValid: boolean, points: number}>} Result object with validation status and points
 */
export const verifyFlightId = async (flightId) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    
    // Trim and uppercase flight ID for consistent comparison
    const formattedFlightId = flightId.trim().toUpperCase();
    
    // Query the flightData collection for this flightId
    const flightQuery = query(
      collection(db, "flightData"),
      where("flightId", "==", formattedFlightId)
    );
    
    const querySnapshot = await getDocs(flightQuery);
    
    // Check if this flight ID exists and is valid
    if (querySnapshot.empty) {
      return { isValid: false, points: 0, message: "ID de vol non reconnu" };
    }
    
    // Get flight data
    const flightData = querySnapshot.docs[0].data();
    
    // Check if this flight has already been claimed by this user
    const claimedQuery = query(
      collection(db, "claimedFlights"),
      where("userId", "==", user.uid),
      where("flightId", "==", formattedFlightId)
    );
    
    const claimedSnapshot = await getDocs(claimedQuery);
    
    if (!claimedSnapshot.empty) {
      return { isValid: false, points: 0, message: "Vous avez déjà réclamé les points pour ce vol" };
    }
    
    // Flight is valid and not yet claimed
    // Calculate points based on flight information
    // In a real app, this would use real flight data metrics like distance
    let earnedPoints = flightData.basePoints || 100;
    
    // Record that this user has claimed this flight
    await addDoc(collection(db, "claimedFlights"), {
      userId: user.uid,
      flightId: formattedFlightId,
      points: earnedPoints,
      claimedAt: serverTimestamp()
    });
    
    // Add the points to the user's balance
    await addPoints(earnedPoints, `Vol ${formattedFlightId}`);
    
    return { 
      isValid: true, 
      points: earnedPoints,
      message: `Félicitations ! Vous avez gagné ${earnedPoints} points avec votre vol ${formattedFlightId}.`
    };
  } catch (error) {
    console.error("Error verifying flight ID:", error);
    throw error;
  }
};

/**
 * Claim a reward from the rewards catalog
 * @param {string} rewardId - ID of the reward being claimed
 * @returns {Promise<{success: boolean, code: string, message: string}>} Result of the claim
 */
export const claimReward = async (rewardId) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    
    // Get user data to check points balance
    const userData = await getUserProfile();
    if (!userData) {
      throw new Error("User data not found");
    }
    
    // Get reward details
    const rewardDocRef = doc(db, "rewards", rewardId);
    const rewardDoc = await getDoc(rewardDocRef);
    
    if (!rewardDoc.exists()) {
      return { success: false, message: "Récompense non trouvée" };
    }
    
    const rewardData = rewardDoc.data();
    
    // Check if user has enough points
    if (userData.pointsBalance < rewardData.pointsRequired) {
      return { 
        success: false, 
        message: `Points insuffisants. Vous avez besoin de ${rewardData.pointsRequired} points.` 
      };
    }
    
    // Generate a unique access code (in real app, this would be more secure)
    const accessCode = generateUniqueCode();
    
    // Deduct points from user's balance
    await updateDoc(doc(db, "users", user.uid), {
      pointsBalance: increment(-rewardData.pointsRequired),
      updatedAt: serverTimestamp()
    });
    
    // Record the reward claim in a separate collection
    await addDoc(collection(db, "claimedRewards"), {
      userId: user.uid,
      rewardId: rewardId,
      rewardTitle: rewardData.title,
      pointsSpent: rewardData.pointsRequired,
      accessCode: accessCode,
      claimedAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days expiry
    });
    
    // Log this in pointsHistory
    await addDoc(collection(db, "pointsHistory"), {
      userId: user.uid,
      points: -rewardData.pointsRequired,
      source: `Réclamation: ${rewardData.title}`,
      timestamp: serverTimestamp()
    });
    
    return { 
      success: true, 
      code: accessCode,
      message: `Félicitations ! Vous avez réclamé "${rewardData.title}". Votre code d'accès est: ${accessCode}`
    };
  } catch (error) {
    console.error("Error claiming reward:", error);
    throw error;
  }
};

/**
 * Purchase access to watch a match
 * @param {string} matchId - ID of the match to watch
 * @returns {Promise<{success: boolean, streamingCode: string, message: string}>} Result
 */
export const purchaseMatchAccess = async (matchId) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    
    // Get user data to check points balance
    const userData = await getUserProfile();
    if (!userData) {
      throw new Error("User data not found");
    }
    
    // Get match details
    const matchDocRef = doc(db, "matches", matchId);
    const matchDoc = await getDoc(matchDocRef);
    
    if (!matchDoc.exists()) {
      return { success: false, message: "Match non trouvé" };
    }
    
    const matchData = matchDoc.data();
    
    // Check if user has enough points
    if (userData.pointsBalance < matchData.pointsToWatch) {
      return { 
        success: false, 
        message: `Points insuffisants. Vous avez besoin de ${matchData.pointsToWatch} points.` 
      };
    }
    
    // Generate a unique streaming code
    const streamingCode = generateUniqueCode();
    
    // Deduct points from user's balance
    await updateDoc(doc(db, "users", user.uid), {
      pointsBalance: increment(-matchData.pointsToWatch),
      updatedAt: serverTimestamp()
    });
    
    // Record the match purchase
    await addDoc(collection(db, "matchPurchases"), {
      userId: user.uid,
      matchId: matchId,
      teamA: matchData.teamA,
      teamB: matchData.teamB,
      pointsSpent: matchData.pointsToWatch,
      streamingCode: streamingCode,
      purchasedAt: serverTimestamp(),
      validUntil: new Date(new Date(matchData.date + " " + matchData.time).getTime() + 4 * 60 * 60 * 1000) // Valid until 4 hours after match start
    });
    
    // Log this in pointsHistory
    await addDoc(collection(db, "pointsHistory"), {
      userId: user.uid,
      points: -matchData.pointsToWatch,
      source: `Match: ${matchData.teamA} vs ${matchData.teamB}`,
      timestamp: serverTimestamp()
    });
    
    return { 
      success: true, 
      streamingCode: streamingCode,
      message: `Félicitations ! Vous pouvez maintenant regarder le match ${matchData.teamA} vs ${matchData.teamB}. Votre code d'accès streaming est: ${streamingCode}`
    };
  } catch (error) {
    console.error("Error purchasing match access:", error);
    throw error;
  }
};

/**
 * Get user's points history
 * @returns {Promise<Array>} Array of points transactions
 */
export const getPointsHistory = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    
    const historyQuery = query(
      collection(db, "pointsHistory"),
      where("userId", "==", user.uid)
    );
    
    const querySnapshot = await getDocs(historyQuery);
    
    const history = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      history.push({
        id: doc.id,
        points: data.points,
        source: data.source,
        timestamp: data.timestamp ? data.timestamp.toDate() : null
      });
    });
    
    // Sort by timestamp, newest first
    return history.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Error getting points history:", error);
    throw error;
  }
};

/**
 * Get user's claimed rewards
 * @returns {Promise<Array>} Array of claimed rewards
 */
export const getClaimedRewards = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    
    const rewardsQuery = query(
      collection(db, "claimedRewards"),
      where("userId", "==", user.uid)
    );
    
    const querySnapshot = await getDocs(rewardsQuery);
    
    const rewards = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      rewards.push({
        id: doc.id,
        rewardTitle: data.rewardTitle,
        pointsSpent: data.pointsSpent,
        accessCode: data.accessCode,
        claimedAt: data.claimedAt ? data.claimedAt.toDate() : null,
        expiresAt: data.expiresAt ? data.expiresAt.toDate() : null
      });
    });
    
    // Sort by claimed date, newest first
    return rewards.sort((a, b) => b.claimedAt - a.claimedAt);
  } catch (error) {
    console.error("Error getting claimed rewards:", error);
    throw error;
  }
};

/**
 * Get user's purchased matches
 * @returns {Promise<Array>} Array of purchased matches
 */
export const getPurchasedMatches = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    
    const matchesQuery = query(
      collection(db, "matchPurchases"),
      where("userId", "==", user.uid)
    );
    
    const querySnapshot = await getDocs(matchesQuery);
    
    const matches = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      matches.push({
        id: doc.id,
        teamA: data.teamA,
        teamB: data.teamB,
        pointsSpent: data.pointsSpent,
        streamingCode: data.streamingCode,
        purchasedAt: data.purchasedAt ? data.purchasedAt.toDate() : null,
        validUntil: data.validUntil ? data.validUntil.toDate() : null
      });
    });
    
    // Sort by purchase date, newest first
    return matches.sort((a, b) => b.purchasedAt - a.purchasedAt);
  } catch (error) {
    console.error("Error getting purchased matches:", error);
    throw error;
  }
};

/**
 * Generate a unique access code
 * @returns {string} Unique code
 */
function generateUniqueCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * Get user notifications
 * @returns {Promise<Array>} Array of notifications
 */
export const getUserNotifications = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );
    
    const querySnapshot = await getDocs(notificationsQuery);
    
    const notifications = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        title: data.title,
        message: data.message,
        type: data.type,
        read: data.read || false,
        date: data.date ? data.date.toDate() : null
      });
    });
    
    return notifications;
  } catch (error) {
    console.error("Error getting notifications:", error);
    throw error;
  }
};

/**
 * Mark a notification as read
 * @param {string} notificationId - ID of the notification to mark as read
 * @returns {Promise<boolean>} Success status
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    
    await updateDoc(doc(db, "notifications", notificationId), {
      read: true,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

/**
 * Update user language preference
 * @param {string} language - Language code (e.g., 'fr', 'en', 'ar')
 * @returns {Promise<boolean>} Success status
 */
export const updateUserLanguage = async (language) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    
    await updateDoc(doc(db, "users", user.uid), {
      preferredLanguage: language,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error updating user language:", error);
    throw error;
  }
};

/**
 * Validate a QR code and add points
 * @param {string} qrData - QR code data
 * @returns {Promise<{success: boolean, points: number, message: string}>} Result
 */
export const validateQRCode = async (qrData) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    
    // Check if this is a valid Atlas Rewards QR code
    if (!qrData.startsWith('ATLAS_REWARDS:')) {
      return { 
        success: false, 
        points: 0, 
        message: "Ce n'est pas un code QR Atlas Rewards valide"
      };
    }
    
    // Parse the QR code data
    const qrParts = qrData.replace('ATLAS_REWARDS:', '').split(':');
    const qrCodeId = qrParts[0];
    const pointsValue = parseInt(qrParts[1]);
    
    // Check if this code has already been scanned by this user
    const scannedCodesQuery = query(
      collection(db, "scannedQRCodes"),
      where("userId", "==", user.uid),
      where("qrCodeId", "==", qrCodeId)
    );
    
    const scannedSnapshot = await getDocs(scannedCodesQuery);
    
    if (!scannedSnapshot.empty) {
      return { 
        success: false, 
        points: 0, 
        message: "Vous avez déjà scanné ce code QR"
      };
    }
    
    // Record this code as scanned
    await addDoc(collection(db, "scannedQRCodes"), {
      userId: user.uid,
      qrCodeId: qrCodeId,
      pointsEarned: pointsValue,
      scannedAt: serverTimestamp()
    });
    
    // Add points to user's balance
    await addPoints(pointsValue, "Scan QR Code");
    
    return {
      success: true,
      points: pointsValue,
      message: `Félicitations ! Vous avez gagné ${pointsValue} points en scannant ce code QR.`
    };
  } catch (error) {
    console.error("Error validating QR code:", error);
    throw error;
  }
};

/**
 * Récupérer la liste des jeux disponibles
 * @returns {Promise<Array>} Liste des jeux
 */
export const getAvailableGames = async () => {
  try {
    const gamesQuery = query(collection(db, "games"), where("active", "==", true));
    const querySnapshot = await getDocs(gamesQuery);
    
    const games = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      games.push({
        id: doc.id,
        title: data.title,
        description: data.description,
        type: data.type,
        pointsReward: data.pointsReward,
        gameData: data.gameData
      });
    });
    
    return games;
  } catch (error) {
    console.error("Error getting games:", error);
    throw error;
  }
};

/**
 * Sauvegarde le résultat d'un jeu
 */
export const saveGameResult = async (gameType, score, pointsEarned) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    
    // Enregistrer le résultat du jeu
    await addDoc(collection(db, "gameResults"), {
      userId: user.uid,
      gameType: gameType,
      score: score,
      pointsEarned: pointsEarned,
      playedAt: serverTimestamp()
    });
    
    // Ajouter les points gagnés
    await addPoints(pointsEarned, `Jeu: ${gameType}`);
    
    // Mettre à jour le compteur de jeux joués aujourd'hui
    await updateGamesPlayed();
    
    return true;
  } catch (error) {
    console.error("Error saving game result:", error);
    throw error;
  }
};

/**
 * Sauvegarde le résultat d'un quiz
 */
export const saveQuizResult = async (score, totalQuestions, pointsEarned) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    
    // Enregistrer le résultat du quiz
    await addDoc(collection(db, "quizResults"), {
      userId: user.uid,
      score: score,
      totalQuestions: totalQuestions,
      pointsEarned: pointsEarned,
      completedAt: serverTimestamp()
    });
    
    // Mettre à jour la date du dernier quiz complété
    await updateDoc(doc(db, "users", user.uid), {
      lastQuizDate: new Date().toDateString(),
      updatedAt: serverTimestamp()
    });
    
    // Ajouter les points gagnés
    await addPoints(pointsEarned, `Quiz Rapide`);
    
    // Mettre à jour le compteur de jeux joués aujourd'hui
    await updateGamesPlayed();
    
    return true;
  } catch (error) {
    console.error("Error saving quiz result:", error);
    throw error;
  }
};

/**
 * Vérifie si l'utilisateur peut jouer au quiz aujourd'hui
 */
export const canPlayQuizToday = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();
    
    if (!userData) return true;
    
    const lastQuizDate = userData.lastQuizDate;
    const today = new Date().toDateString();
    
    // Si la date du dernier quiz n'est pas aujourd'hui, l'utilisateur peut jouer
    return lastQuizDate !== today;
  } catch (error) {
    console.error("Error checking quiz availability:", error);
    throw error;
  }
};

/**
 * Met à jour le profil utilisateur
 */
export const updateUserProfile = async (userData) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    
    await updateDoc(doc(db, "users", user.uid), {
      ...userData,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

// Export auth for convenience
export { auth };