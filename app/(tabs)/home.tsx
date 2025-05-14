import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Alert,
  Modal,
  TextInput,
  FlatList,
  Image,
  Linking,
  Animated
} from 'react-native';
import { 
  getUserProfile, 
  addPoints, 
  updateGamesPlayed, 
  claimDailyReward,
  auth,
  getPointsHistory,
  getClaimedRewards,
  getPurchasedMatches 
} from '../../src/services/firebaseService';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, addDoc, doc, getDoc, getFirestore, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';



const { width } = Dimensions.get('window');

// Type for user data
interface UserData {
  firstName: string;
  pointsBalance: number;
  gamesPlayedToday: number;
  lastPlayedDate: string;
  dailyRewardClaimed: boolean;
}

// Type for rewards
interface Reward {
  id: string;
  title: string;
  description: string;
  pointsRequired: number;
  image: string;
}

// Type for matches
interface Match {
  id: string;
  teamA: string;
  teamB: string;
  date: string;
  time: string;
  stadium: string;
  pointsToWatch: number;
}

// Type for notification
interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: string;
}

// Type for history item
interface HistoryItem {
  id: string;
  points: number;
  source: string;
  timestamp: Date | null;
}

// Type for claimed reward
interface ClaimedReward {
  id: string;
  rewardTitle: string;
  pointsSpent: number;
  accessCode: string;
  claimedAt: Date | null;
  expiresAt: Date | null;
}

// List of valid flight IDs
const VALID_FLIGHT_IDS = [
  "AT100", "AT101", "AT102", "AT103", "AT104", "AT105",
  "AT200", "AT201", "AT202", "AT203", "AT204", "AT205",
  "AT300", "AT301", "AT302", "AT303", "AT304", "AT305",
  "AT400", "AT401", "AT402", "AT403", "AT404", "AT405",
  "AT500", "AT501", "AT502", "AT503", "AT504", "AT505",
  "AT600", "AT601", "AT602", "AT603", "AT604", "AT605",
  "AT700", "AT701", "AT702", "AT703", "AT704", "AT705",
  "AT800", "AT801", "AT802", "AT803", "AT804", "AT805",
  "AT900", "AT901", "AT902", "AT903", "AT904", "AT905"
];

export default function HomeScreen() {
  const [userData, setUserData] = useState<UserData>({
    firstName: "",
    pointsBalance: 0,
    gamesPlayedToday: 0,
    lastPlayedDate: "",
    dailyRewardClaimed: false
  });
  
  const [loading, setLoading] = useState<boolean>(true);
  const [screenLoading, setScreenLoading] = useState<boolean>(false);
  const [todayDate] = useState<string>(new Date().toDateString());
  const [showRewardsModal, setShowRewardsModal] = useState<boolean>(false);
  const [showFlightIdModal, setShowFlightIdModal] = useState<boolean>(false);
  const [showMenuModal, setShowMenuModal] = useState<boolean>(false);
  const [showGamesModal, setShowGamesModal] = useState<boolean>(false);
  const [showHowToEarnModal, setShowHowToEarnModal] = useState<boolean>(false);
  const [showHowToSpendModal, setShowHowToSpendModal] = useState<boolean>(false);
  const [showLegalModal, setShowLegalModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showMatchesModal, setShowMatchesModal] = useState<boolean>(false);
  const [showRewardDetailsModal, setShowRewardDetailsModal] = useState<boolean>(false);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showQRScannerModal, setShowQRScannerModal] = useState<boolean>(false);
  const [flightId, setFlightId] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successPoints, setSuccessPoints] = useState<number>(0);
  const [rewardClaimed, setRewardClaimed] = useState<string>('');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [claimedRewards, setClaimedRewards] = useState<ClaimedReward[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState<boolean>(false);
  
  // Animation for money bag
  const moneyBagAnimation = useRef(new Animated.Value(0)).current;
  const coinAnimation = useRef(new Animated.Value(0)).current;

  // Animated values for the money bag and coins
  const moneyBagScale = moneyBagAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1]
  });
  
  const coinTranslateY = coinAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10]
  });

  // Function to animate money bag when points are added
  const animateMoneyBag = () => {
    Animated.sequence([
      Animated.spring(moneyBagAnimation, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true
      }),
      Animated.timing(coinAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(coinAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(moneyBagAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
  };

  // Reward data
  const rewards: Reward[] = [
    {
      id: '1',
      title: 'Salon VIP',
      description: 'Accès exclusif au salon VIP de RAM dans tous les aéroports pendant 1 an',
      pointsRequired: 1000,
      image: 'salon'
    },
    {
      id: '2',
      title: 'Bagage Supplémentaire',
      description: 'Un bagage supplémentaire gratuit sur votre prochain vol',
      pointsRequired: 500,
      image: 'baggage'
    },
    {
      id: '3',
      title: 'Surclassement',
      description: 'Surclassement en classe supérieure sur votre prochain vol long-courrier',
      pointsRequired: 1500,
      image: 'upgrade'
    },
    {
      id: '4',
      title: 'Billet Match CAN',
      description: 'Un billet pour un match de votre choix lors de la CAN 2025',
      pointsRequired: 2000,
      image: 'ticket'
    },
    {
      id: '5',
      title: 'Accès Zones Exclusives',
      description: 'Meet & greet avec anciens joueurs ou influenceurs sportifs, accès backstage au stade',
      pointsRequired: 3000,
      image: 'vip'
    },
    {
      id: '6',
      title: 'Pack Supporter Exclusif',
      description: 'T-shirt, casquette, drapeau et bracelet de votre équipe préférée + sac à dos collector CAN 2025',
      pointsRequired: 1200,
      image: 'pack'
    },
    {
      id: '7',
      title: 'Carte SIM + Internet gratuit',
      description: 'SIM locale avec 10 Go offerts pour rester connecté pendant la CAN 2025',
      pointsRequired: 800,
      image: 'sim'
    },
  ];
  
  // Match data for CAN
  const matches: Match[] = [
    {
      id: '1',
      teamA: 'Maroc',
      teamB: 'Sénégal',
      date: '15 janvier 2025',
      time: '18:00',
      stadium: 'Stade Mohammed V, Casablanca',
      pointsToWatch: 200
    },
    {
      id: '2',
      teamA: 'Égypte',
      teamB: 'Nigeria',
      date: '17 janvier 2025',
      time: '15:00',
      stadium: 'Stade Adrar, Agadir',
      pointsToWatch: 150
    },
    {
      id: '3',
      teamA: 'Côte d\'Ivoire',
      teamB: 'Cameroun',
      date: '20 janvier 2025',
      time: '20:00',
      stadium: 'Grand Stade de Marrakech',
      pointsToWatch: 180
    },
    {
      id: '4',
      teamA: 'Ghana',
      teamB: 'Algérie',
      date: '22 janvier 2025',
      time: '18:00',
      stadium: 'Stade de Tanger',
      pointsToWatch: 160
    },
  ];

  // Example notifications
  const mockNotifications: Notification[] = [
    {
      id: '1',
      title: 'Bonus quotidien',
      message: 'N\'oubliez pas de réclamer vos 50 points aujourd\'hui!',
      date: new Date().toISOString(),
      read: false,
      type: 'bonus'
    },
    {
      id: '2',
      title: 'Promotion spéciale',
      message: 'Double Miles ce weekend pour tous les vols RAM!',
      date: new Date().toISOString(),
      read: false,
      type: 'promo'
    },
    {
      id: '3',
      title: 'Nouveau jeu disponible',
      message: 'Découvrez notre nouveau quiz sur la CAN 2025!',
      date: new Date().toISOString(),
      read: true,
      type: 'game'
    }
  ];

  // Request camera permissions on mount
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await getUserProfile();
        if (data) {
          setUserData({
            firstName: data.firstName || "Utilisateur",
            pointsBalance: data.pointsBalance || 0,
            gamesPlayedToday: data.gamesPlayedToday || 0,
            lastPlayedDate: data.lastPlayedDate || todayDate,
            dailyRewardClaimed: data.dailyRewardClaimed || false
          });
        }
        
        // Load notifications (in a real app, these would come from your backend)
        setNotifications(mockNotifications);
        setUnreadNotifications(mockNotifications.filter(n => !n.read).length);
        
        // Load history from Firestore
        try {
          const history = await getPointsHistory();
          setHistoryItems(history);
        } catch (error) {
          console.error("Error loading history:", error);
        }
        
        // Load claimed rewards from Firestore
        try {
          const rewards = await getClaimedRewards();
          setClaimedRewards(rewards);
        } catch (error) {
          console.error("Error loading claimed rewards:", error);
        }
        
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
        Alert.alert("Erreur", "Impossible de charger vos données");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Handle QR Code scan
  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    
    // Hide scanner modal
    setShowQRScannerModal(false);
    setScreenLoading(true);
    
    try {
      // Check if QR code data is valid
      if (!data.startsWith('ATLAS_')) {
        setScreenLoading(false);
        setErrorMessage("QR code non valide. Veuillez scanner un code QR Atlas Rewards.");
        setShowErrorModal(true);
        return;
      }
      
      // Extract points from QR code data (format: ATLAS_POINTS_100)
      const parts = data.split('_');
      if (parts.length !== 3 || parts[1] !== 'POINTS') {
        setScreenLoading(false);
        setErrorMessage("Format de QR code non reconnu.");
        setShowErrorModal(true);
        return;
      }
      
      const points = parseInt(parts[2]);
      if (isNaN(points) || points <= 0) {
        setScreenLoading(false);
        setErrorMessage("Valeur de points invalide dans le QR code.");
        setShowErrorModal(true);
        return;
      }
      
      // Ensure this QR code hasn't been scanned before
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      
      const scannedCodesRef = collection(db, "scannedQRCodes");
      const q = query(
        scannedCodesRef, 
        where("userId", "==", user.uid),
        where("qrCode", "==", data)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setScreenLoading(false);
        setErrorMessage("Vous avez déjà scanné ce code QR.");
        setShowErrorModal(true);
        return;
      }
      
      // Record that this user has scanned this QR code
      await addDoc(collection(db, "scannedQRCodes"), {
        userId: user.uid,
        qrCode: data,
        points: points,
        scannedAt: serverTimestamp()
      });
      
      // Add points to user's balance
      await addPoints(points, "Scan QR Code");
      
      // Update local state
      setUserData(prev => ({
        ...prev,
        pointsBalance: prev.pointsBalance + points
      }));
      
      setScreenLoading(false);
      setSuccessPoints(points);
      setSuccessMessage(`Félicitations ! Vous avez gagné ${points} points en scannant ce code QR.`);
      setShowSuccessModal(true);
      animateMoneyBag(); // Animate money bag when points are added
      
    } catch (error) {
      console.error("Erreur lors du scan du QR code:", error);
      setScreenLoading(false);
      setErrorMessage("Une erreur s'est produite lors du traitement du QR code. Veuillez réessayer.");
      setShowErrorModal(true);
    }
  };

  // Function to play the daily game
  const playDayGame = async () => {
    try {
      setScreenLoading(true);
      const points = 20;
      await addPoints(points, "Jeu du jour");
      const newGamesCount = await updateGamesPlayed();
      
      // Update local state
      setUserData(prev => ({
        ...prev,
        pointsBalance: prev.pointsBalance + points,
        gamesPlayedToday: newGamesCount
      }));
      
      animateMoneyBag(); // Animate money bag when points are added
      Alert.alert("Félicitations!", `Vous avez gagné ${points} points!`);
    } catch (error) {
      console.error("Erreur lors du jeu:", error);
      Alert.alert("Erreur", "Impossible de jouer au jeu en ce moment");
    } finally {
      setScreenLoading(false);
    }
  };
  
  // Function to play the quick quiz
  const playQuickQuiz = async () => {
    try {
      setScreenLoading(true);
      const points = 10;
      await addPoints(points, "Quiz Rapide");
      const newGamesCount = await updateGamesPlayed();
      
      setUserData(prev => ({
        ...prev,
        pointsBalance: prev.pointsBalance + points,
        gamesPlayedToday: newGamesCount
      }));
      
      animateMoneyBag(); // Animate money bag when points are added
      Alert.alert("Quiz Terminé!", `Vous avez gagné ${points} points!`);
    } catch (error) {
      console.error("Erreur lors du quiz:", error);
      Alert.alert("Erreur", "Impossible de jouer au quiz en ce moment");
    } finally {
      setScreenLoading(false);
    }
  };
  
  // Function to play the puzzle
  const playPuzzle = async () => {
    try {
      setScreenLoading(true);
      const points = 30;
      await addPoints(points, "Puzzle Minute");
      const newGamesCount = await updateGamesPlayed();
      
      setUserData(prev => ({
        ...prev,
        pointsBalance: prev.pointsBalance + points,
        gamesPlayedToday: newGamesCount
      }));
      
      animateMoneyBag(); // Animate money bag when points are added
      Alert.alert("Puzzle Résolu!", `Vous avez gagné ${points} points!`);
    } catch (error) {
      console.error("Erreur lors du puzzle:", error);
      Alert.alert("Erreur", "Impossible de jouer au puzzle en ce moment");
    } finally {
      setScreenLoading(false);
    }
  };

  // Function to claim daily reward
  const claimDailyChallenge = async () => {
    try {
      setScreenLoading(true);
      const points = 50;
      await claimDailyReward(points);
      
      setUserData(prev => ({
        ...prev,
        pointsBalance: prev.pointsBalance + points,
        dailyRewardClaimed: true
      }));
      
      animateMoneyBag(); // Animate money bag when points are added
      Alert.alert("Félicitations!", `Vous avez reçu votre bonus quotidien de ${points} points!`);
    } catch (error) {
      console.error("Erreur lors de la réclamation:", error);
      Alert.alert("Erreur", "Impossible de réclamer la récompense");
    } finally {
      setScreenLoading(false);
    }
  };
  
  // Function to scan QR code
  const scanQRCode = () => {
    // Open the camera scanner
    setScanned(false);
    setShowQRScannerModal(true);
  };
  
  // Function to verify flight ID
  const verifyFlightId = async (flightId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      
      // Trim and uppercase flight ID for consistent comparison
      const formattedFlightId = flightId.trim().toUpperCase();
      
      // Check if ID exists in our predefined list
      if (!VALID_FLIGHT_IDS.includes(formattedFlightId)) {
        return { isValid: false, points: 0, message: "ID de vol non reconnu" };
      }
      
      // Check if this user has already claimed this flight
      try {
        // Try to search in the claimedFlights collection
        const claimedFlightsRef = collection(db, "claimedFlights");
        const q = query(
          claimedFlightsRef, 
          where("userId", "==", user.uid),
          where("flightId", "==", formattedFlightId)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          return { isValid: false, points: 0, message: "Vous avez déjà réclamé les points pour ce vol" };
        }
      } catch (error) {
        console.log("Collection claimedFlights n'existe peut-être pas encore:", error);
        // Create collection if it doesn't exist
      }
      
      // Flight is valid and hasn't been claimed yet
      // Calculate points based on flight ID (simulation)
      const basePoints: {[key: string]: number} = {
        "AT100": 100, "AT101": 110, "AT102": 120, "AT103": 130, "AT104": 140, "AT105": 150,
        "AT200": 200, "AT201": 210, "AT202": 220, "AT203": 230, "AT204": 240, "AT205": 250,
        "AT300": 150, "AT301": 160, "AT302": 170, "AT303": 180, "AT304": 190, "AT305": 200,
        "AT400": 250, "AT401": 260, "AT402": 270, "AT403": 280, "AT404": 290, "AT405": 300,
        "AT500": 175, "AT501": 185, "AT502": 195, "AT503": 205, "AT504": 215, "AT505": 225,
        "AT600": 225, "AT601": 235, "AT602": 245, "AT603": 255, "AT604": 265, "AT605": 275,
        "AT700": 300, "AT701": 310, "AT702": 320, "AT703": 330, "AT704": 340, "AT705": 350,
        "AT800": 350, "AT801": 360, "AT802": 370, "AT803": 380, "AT804": 390, "AT805": 400,
        "AT900": 400, "AT901": 410, "AT902": 420, "AT903": 430, "AT904": 440, "AT905": 450
      };
      
      let earnedPoints = basePoints[formattedFlightId] || 100;
      
      // Record that this user has claimed this flight
      try {
        await addDoc(collection(db, "claimedFlights"), {
          userId: user.uid,
          flightId: formattedFlightId,
          points: earnedPoints,
          claimedAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Erreur lors de l'enregistrement du vol réclamé:", error);
      }
      
      // Add points to user's balance
      await addPoints(earnedPoints, `Vol ${formattedFlightId}`);
      
      return { 
        isValid: true, 
        points: earnedPoints,
        message: `Félicitations ! Vous avez gagné ${earnedPoints} points avec votre vol ${formattedFlightId}.`
      };
    } catch (error) {
      console.error("Erreur lors de la vérification de l'ID de vol:", error);
      throw error;
    }
  };
  
  // Function to submit flight ID
  const submitFlightId = async () => {
    if (!flightId.trim()) {
      Alert.alert("Erreur", "Veuillez entrer un ID de vol valide");
      return;
    }
    
    setShowFlightIdModal(false);
    setScreenLoading(true);
    
    try {
      // Verify flight ID
      const result = await verifyFlightId(flightId);
      
      if (result.isValid) {
        // Update local balance
        setUserData(prev => ({
          ...prev,
          pointsBalance: prev.pointsBalance + result.points
        }));
        
        setScreenLoading(false);
        setSuccessPoints(result.points);
        setSuccessMessage(result.message);
        setShowSuccessModal(true);
        animateMoneyBag(); // Animate money bag when points are added
      } else {
        // Invalid flight ID
        setScreenLoading(false);
        setErrorMessage(result.message);
        setShowErrorModal(true);
      }
      
      // Reset flight ID
      setFlightId('');
    } catch (error) {
      console.error("Erreur lors de la vérification de l'ID de vol:", error);
      setScreenLoading(false);
      setErrorMessage("Une erreur s'est produite. Veuillez réessayer plus tard.");
      setShowErrorModal(true);
      setFlightId('');
    }
  };
  
  // Function to show reward details
  const showRewardDetails = (reward: Reward) => {
    if (userData.pointsBalance < reward.pointsRequired) {
      Alert.alert(
        "Points insuffisants",
        `Vous avez besoin de ${reward.pointsRequired} points pour cette récompense. Il vous manque ${reward.pointsRequired - userData.pointsBalance} points.`
      );
      return;
    }
    
    setSelectedReward(reward);
    setShowRewardsModal(false);
    setShowRewardDetailsModal(true);
  };
  
  // Function to claim a reward
  const claimReward = async () => {
    if (!selectedReward) return;
    
    setShowRewardDetailsModal(false);
    setScreenLoading(true);
    
    try {
      // Check if user has enough points
      if (userData.pointsBalance < selectedReward.pointsRequired) {
        setScreenLoading(false);
        setErrorMessage(`Points insuffisants. Vous avez besoin de ${selectedReward.pointsRequired} points.`);
        setShowErrorModal(true);
        return;
      }
      
      // Generate a unique access code
      const accessCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Deduct points from user's balance
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      
      // Update balance in Firestore
      await updateDoc(doc(db, "users", user.uid), {
        pointsBalance: increment(-selectedReward.pointsRequired),
        updatedAt: serverTimestamp()
      });
      
      // Record the reward claim
      try {
        await addDoc(collection(db, "claimedRewards"), {
          userId: user.uid,
          rewardId: selectedReward.id,
          rewardTitle: selectedReward.title,
          pointsSpent: selectedReward.pointsRequired,
          accessCode: accessCode,
          claimedAt: serverTimestamp(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days expiration
        });
      } catch (error) {
        console.error("Erreur lors de l'enregistrement de la récompense réclamée:", error);
      }
      
      // Record in points history
      try {
        await addDoc(collection(db, "pointsHistory"), {
          userId: user.uid,
          points: -selectedReward.pointsRequired,
          source: `Réclamation: ${selectedReward.title}`,
          timestamp: serverTimestamp()
        });
      } catch (error) {
        console.error("Erreur lors de l'enregistrement dans l'historique des points:", error);
      }
      
      // Update local balance
      setUserData(prev => ({
        ...prev,
        pointsBalance: prev.pointsBalance - selectedReward.pointsRequired
      }));
      
      // Update history and claimed rewards
      try {
        const history = await getPointsHistory();
        setHistoryItems(history);
        
        const rewards = await getClaimedRewards();
        setClaimedRewards(rewards);
      } catch (error) {
        console.error("Error updating history after claiming reward:", error);
      }
      
      setScreenLoading(false);
      setRewardClaimed(selectedReward.title);
      setSuccessMessage(`Félicitations ! Vous avez réclamé "${selectedReward.title}". Votre code d'accès est: ${accessCode}`);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Erreur lors de la réclamation de la récompense:", error);
      setScreenLoading(false);
      setErrorMessage("Une erreur s'est produite lors de la réclamation de la récompense. Veuillez réessayer plus tard.");
      setShowErrorModal(true);
    }
  };
  
  // Function to watch a match
  const watchMatch = async (match: Match) => {
    if (userData.pointsBalance < match.pointsToWatch) {
      Alert.alert(
        "Points insuffisants",
        `Vous avez besoin de ${match.pointsToWatch} points pour regarder ce match. Il vous manque ${match.pointsToWatch - userData.pointsBalance} points.`
      );
      return;
    }
    
    setShowMatchesModal(false);
    setScreenLoading(true);
    
    try {
      
      // Check if user has enough points
      if (userData.pointsBalance < match.pointsToWatch) {
        setScreenLoading(false);
        setErrorMessage(`Points insuffisants. Vous avez besoin de ${match.pointsToWatch} points.`);
        setShowErrorModal(true);
        return;
      }
      
      // Generate a unique streaming code
      const streamingCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Deduct points from user's balance
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      
      // Update balance in Firestore
      await updateDoc(doc(db, "users", user.uid), {
        pointsBalance: increment(-match.pointsToWatch),
        updatedAt: serverTimestamp()
      });
      
      // Record match purchase
      try {
        await addDoc(collection(db, "matchPurchases"), {
          userId: user.uid,
          matchId: match.id,
          teamA: match.teamA,
          teamB: match.teamB,
          pointsSpent: match.pointsToWatch,
          streamingCode: streamingCode,
          purchasedAt: serverTimestamp(),
          validUntil: new Date(new Date().getTime() + 4 * 60 * 60 * 1000) // Valid for 4 hours
        });
      } catch (error) {
        console.error("Erreur lors de l'enregistrement de l'achat du match:", error);
      }
      
      // Record in points history
      try {
        await addDoc(collection(db, "pointsHistory"), {
          userId: user.uid,
          points: -match.pointsToWatch,
          source: `Match: ${match.teamA} vs ${match.teamB}`,
          timestamp: serverTimestamp()
        });
      } catch (error) {
        console.error("Erreur lors de l'enregistrement dans l'historique des points:", error);
      }
      
      // Update local balance
      setUserData(prev => ({
        ...prev,
        pointsBalance: prev.pointsBalance - match.pointsToWatch
      }));
      
      // Update history
      try {
        const history = await getPointsHistory();
        setHistoryItems(history);
      } catch (error) {
        console.error("Error updating history after watching match:", error);
      }
      
      setScreenLoading(false);
      setSuccessMessage(`Félicitations ! Vous pouvez maintenant regarder le match ${match.teamA} vs ${match.teamB}. Votre code d'accès streaming est: ${streamingCode}`);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Erreur lors de l'achat de l'accès au match:", error);
      setScreenLoading(false);
      setErrorMessage("Une erreur s'est produite lors de l'achat de l'accès au match. Veuillez réessayer plus tard.");
      setShowErrorModal(true);
    }
  };

  // Function to mark notification as read
  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true } 
          : notification
      )
    );
    
    // Update unread count
    setUnreadNotifications(prev => Math.max(0, prev - 1));
  };

  // Navigate to How to earn miles (show modal)
  const showHowToEarn = () => {
    setShowMenuModal(false);
    setShowHowToEarnModal(true);
  };

  // Navigate to How to spend miles (show modal)
  const showHowToSpend = () => {
    setShowMenuModal(false);
    setShowHowToSpendModal(true);
  };

  // Navigate to games and challenges (show modal)
  const showGames = () => {
    setShowMenuModal(false);
    setShowGamesModal(true);
  };

  // Show legal information
  const showLegalInfo = () => {
    setShowMenuModal(false);
    setShowLegalModal(true);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      Alert.alert("Erreur", "Impossible de vous déconnecter");
    }
  };

  const callCustomerService = () => {
    Linking.openURL('tel:+212522489797');
  };

  const sendEmail = () => {
    Linking.openURL('mailto:serviceclient@royalairmaroc.com');
  };

  const openReclaimForm = () => {
    Linking.openURL('https://www.royalairmaroc.com/ma-fr/E-Services/Reclamations');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#c60c30" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>  
      {/* Header with hamburger menu and notifications */}
      <View style={styles.topBar}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setShowMenuModal(true)}
        >
          <Ionicons name="menu" size={28} color="#c60c30" />
        </TouchableOpacity>
        
        <Text style={styles.appTitle}>Atlas Rewards</Text>
        
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => setShowNotificationsModal(true)}
        >
          <Ionicons name="notifications" size={24} color="#c60c30" />
          {unreadNotifications > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationCount}>{unreadNotifications}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        style={styles.scrollView}
      >
        {screenLoading && (
          <View style={styles.overlayLoading}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        )}
        
        {/* Header with greeting */}
        <View style={styles.welcomeHeader}>
          <Text style={styles.welcomeText}>Bonjour, {userData.firstName}!</Text>
          <Text style={styles.canText}>CAN 2025 avec Royal Air Maroc</Text>
        </View>
        
        {/* Points balance - Money bag with coins */}
        <View style={styles.moneyBagContainer}>
          <View style={styles.moneyIconContainer}>
            <Animated.View style={[styles.coinStack, { transform: [{ translateY: coinTranslateY }] }]}>
              <View style={[styles.coin, styles.coin1]}>
                <Text style={styles.coinSymbol}>$</Text>
              </View>
              <View style={[styles.coin, styles.coin2]}>
                <Text style={styles.coinSymbol}>$</Text>
              </View>
              <View style={[styles.coin, styles.coin3]}>
                <Text style={styles.coinSymbol}>$</Text>
              </View>
            </Animated.View>
            <Animated.View style={[styles.moneyBag, { transform: [{ scale: moneyBagScale }] }]}>
              <Text style={styles.moneyBagSymbol}>$</Text>
            </Animated.View>
          </View>
          <View style={styles.moneyTextContainer}>
            <Text style={styles.moneyLabel}>SOLDE DES POINTS</Text>
            <Text style={styles.moneyValue}>{userData.pointsBalance}</Text>
            <Text style={styles.moneyUnit}>MILLES</Text>
          </View>
        </View>
        
        {/* Stats for Games and Points */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userData.gamesPlayedToday}</Text>
            <Text style={styles.statLabel}>Jeux joués aujourd'hui</Text>
          </View>
          <View style={styles.statDivider}></View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userData.pointsBalance}</Text>
            <Text style={styles.statLabel}>Points accumulés</Text>
          </View>
        </View>
        
        {/* CAN 2025 Banner */}
        <TouchableOpacity 
          style={styles.canBanner}
          onPress={() => setShowMatchesModal(true)}
        >
          <View style={styles.canBannerContent}>
            <Text style={styles.canBannerTitle}>CAN 2025</Text>
            <Text style={styles.canBannerDescription}>
              Dépensez vos points pour regarder les matchs en direct!
            </Text>
          </View>
          <View style={styles.viewMatchesButton}>
            <Text style={styles.viewMatchesText}>VOIR</Text>
          </View>
        </TouchableOpacity>
        
        {/* Daily bonus */}
        <TouchableOpacity 
          style={[
            styles.dailyBonusCard,
            userData.dailyRewardClaimed && styles.disabledCard
          ]}
          onPress={claimDailyChallenge}
          disabled={userData.dailyRewardClaimed}
        >
          <View style={styles.cardContent}>
            <View>
              <Text style={styles.cardTitle}>Bonus Quotidien</Text>
              <Text style={styles.cardDescription}>
                Réclamez vos 50 points gratuits du jour!
              </Text>
            </View>
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsBadgeText}>+50</Text>
            </View>
          </View>
          
          {userData.dailyRewardClaimed && (
            <View style={styles.claimedOverlay}>
              <Text style={styles.claimedText}>Réclamé aujourd'hui</Text>
            </View>
          )}
        </TouchableOpacity>
        
        {/* Scan QR Code Button */}
        <TouchableOpacity
          style={styles.qrCodeButton}
          onPress={scanQRCode}
        >
          <Ionicons name="qr-code" size={40} color="#FFFFFF" />
          <Text style={styles.qrCodeButtonText}>Scanner un code QR</Text>
          <Text style={styles.qrCodeDescription}>Scannez pour gagner des points</Text>
        </TouchableOpacity>
      </ScrollView>
      
      {/* QR Code Scanner Modal */}
      <Modal
        visible={showQRScannerModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowQRScannerModal(false)}
      >
        <View style={styles.qrScannerContainer}>
          <View style={styles.qrScannerHeader}>
            <TouchableOpacity 
              onPress={() => setShowQRScannerModal(false)}
              style={styles.qrScannerCloseButton}
            >
              <Ionicons name="close-circle" size={32} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.qrScannerTitle}>Scannez un code QR</Text>
          </View>
          
          {hasPermission === null ? (
            <View style={styles.qrScannerPlaceholder}>
              <Text>Demande de permission pour la caméra...</Text>
            </View>
          ) : hasPermission === false ? (
            <View style={styles.qrScannerPlaceholder}>
              <Text>Aucun accès à la caméra</Text>
              <TouchableOpacity 
                style={styles.permissionButton}
                onPress={async () => {
                  const { status } = await Camera.requestCameraPermissionsAsync();
                  setHasPermission(status === 'granted');
                }}
              >
                <Text style={styles.permissionButtonText}>Autoriser l'accès à la caméra</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <BarCodeScanner
              onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
              style={styles.qrScannerCamera}
            />
          )}
          
          <View style={styles.qrScannerOverlay}>
            <View style={styles.qrScannerFrame} />
          </View>
          
          <View style={styles.qrScannerFooter}>
            <Text style={styles.qrScannerInstructions}>
              Placez le code QR dans le cadre pour le scanner
            </Text>
            
            {scanned && (
              <TouchableOpacity
                style={styles.scanAgainButton}
                onPress={() => setScanned(false)}
              >
                <Text style={styles.scanAgainButtonText}>Scanner à nouveau</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Modal for notifications */}
      <Modal
        visible={showNotificationsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotificationsModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {notifications.length === 0 ? (
              <View style={styles.emptyNotifications}>
                <Ionicons name="notifications-off" size={48} color="#ccc" />
                <Text style={styles.emptyNotificationsText}>Aucune notification</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[
                      styles.notificationItem,
                      !item.read && styles.unreadNotification
                    ]}
                    onPress={() => markNotificationAsRead(item.id)}
                  >
                    <View style={styles.notificationIconContainer}>
                      {item.type === 'bonus' && <Ionicons name="gift" size={24} color="#4CAF50" />}
                      {item.type === 'promo' && <Ionicons name="megaphone" size={24} color="#FFC107" />}
                      {item.type === 'game' && <Ionicons name="game-controller" size={24} color="#2196F3" />}
                    </View>
                    <View style={styles.notificationContent}>
                      <Text style={styles.notificationTitle}>{item.title}</Text>
                      <Text style={styles.notificationMessage}>{item.message}</Text>
                      <Text style={styles.notificationDate}>
                        {new Date(item.date).toLocaleDateString()}
                      </Text>
                    </View>
                    {!item.read && (
                      <View style={styles.unreadDot} />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
            
            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => {
                setShowNotificationsModal(false);
                setShowHistoryModal(true);
              }}
            >
              <Text style={styles.historyButtonText}>VOIR L'HISTORIQUE DES POINTS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Modal for points history */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Historique des Points</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.historyTabs}>
              <TouchableOpacity 
                style={styles.historyTab}
                onPress={() => {}}
              >
                <Text style={styles.historyTabText}>Transactions</Text>
                <View style={styles.activeTab} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.historyTab}
                onPress={() => {}}
              >
                <Text style={styles.historyTabText}>Récompenses</Text>
              </TouchableOpacity>
            </View>
            
            {historyItems.length === 0 ? (
              <View style={styles.emptyHistoryContainer}>
                <Ionicons name="document" size={48} color="#ccc" />
                <Text style={styles.emptyHistoryText}>Aucune transaction</Text>
              </View>
            ) : (
              <FlatList
                data={historyItems}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.historyItem}>
                    <View style={styles.historyItemContent}>
                      <Text style={styles.historyItemSource}>{item.source}</Text>
                     <Text style={styles.historyItemDate}>
  {item.timestamp ? 
    (item.timestamp.seconds !== undefined ? 
      // C'est un timestamp Firestore
      new Date(item.timestamp.seconds * 1000).toLocaleDateString() : 
      // C'est déjà un objet Date standard
      item.timestamp.toLocaleDateString()
    ) : 'Date inconnue'}
</Text>
                    </View>
                    <Text style={[
                      styles.historyItemPoints,
                      item.points > 0 ? styles.positivePoints : styles.negativePoints
                    ]}>
                      {item.points > 0 ? '+' : ''}{item.points}
                    </Text>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
      
      {/* Modal for hamburger menu - Overlay keeps home screen visible */}
      <Modal
        visible={showMenuModal}
        animationType="none"
        transparent={true}
        onRequestClose={() => setShowMenuModal(false)}
      >
        <View style={styles.menuModalContainer}>
          <TouchableOpacity 
            style={styles.menuBackdrop}
            activeOpacity={100}
            onPress={() => setShowMenuModal(false)}
          />
          <View style={[styles.menuModalContent, { height: '100%' }]}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Menu</Text>
              <TouchableOpacity onPress={() => setShowMenuModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
      
            <View style={styles.menuSection}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={showHowToEarn}
              >
                <Ionicons name="information-circle" size={24} color="#c60c30" />
                <Text style={styles.menuItemText}>Programme</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => setShowRewardsModal(true)}
              >
                <Ionicons name="gift" size={24} color="#c60c30" />
                <Text style={styles.menuItemText}>Dépenser mes Miles</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => setShowFlightIdModal(true)}
              >
                <Ionicons name="add-circle" size={24} color="#c60c30" />
                <Text style={styles.menuItemText}>Gagner des Miles</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={showGames}
              >
                <Ionicons name="game-controller" size={24} color="#c60c30" />
                <Text style={styles.menuItemText}>Jeux et défis</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setShowMenuModal(false);
                  setShowHistoryModal(true);
                }}
              >
                <Ionicons name="time" size={24} color="#c60c30" />
                <Text style={styles.menuItemText}>Historique des points</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={showLegalInfo}
              >
                <Ionicons name="document-text" size={24} color="#c60c30" />
                <Text style={styles.menuItemText}>Centre juridique</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setShowMenuModal(false);
                  Alert.alert("Langue", "Options de langue à venir!");
                }}
              >
                <Ionicons name="language" size={24} color="#c60c30" />
                <Text style={styles.menuItemText}>Langue de l'application</Text>
                <Text style={styles.menuItemValue}>Français</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleSignOut}
            >
              <Ionicons name="log-out" size={24} color="#FFFFFF" />
              <Text style={styles.logoutButtonText}>Déconnexion</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Modal for games and challenges */}
      <Modal
        visible={showGamesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGamesModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Jeux et défis</Text>
              <TouchableOpacity onPress={() => setShowGamesModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>Gagnez des points en jouant!</Text>
            
            <View style={styles.gamesGrid}>
              <TouchableOpacity 
                style={styles.gameCardLarge}
                onPress={playDayGame}
              >
                <View style={styles.gameIconContainer}>
                  <Ionicons name="calendar" size={36} color="#c60c30" />
                </View>
                <Text style={styles.gameTitle}>Jeu du jour</Text>
                <Text style={styles.gameDescription}>Jouez au jeu quotidien pour gagner des points bonus</Text>
                <View style={styles.gamePointsBadge}>
                  <Text style={styles.gamePointsText}>+20</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.gameCardLarge}
                onPress={playQuickQuiz}
              >
                <View style={styles.gameIconContainer}>
                  <Ionicons name="help-circle" size={36} color="#c60c30" />
                </View>
                <Text style={styles.gameTitle}>Quiz Rapide</Text>
                <Text style={styles.gameDescription}>Testez vos connaissances sur Royal Air Maroc et la CAN 2025</Text>
                <View style={styles.gamePointsBadge}>
                  <Text style={styles.gamePointsText}>+10</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.gameCardLarge}
                onPress={playPuzzle}
              >
                <View style={styles.gameIconContainer}>
                  <Ionicons name="grid" size={36} color="#c60c30" />
                </View>
                <Text style={styles.gameTitle}>Puzzle Minute</Text>
                <Text style={styles.gameDescription}>Résolvez le puzzle avant l'expiration du temps</Text>
                <View style={styles.gamePointsBadge}>
                  <Text style={styles.gamePointsText}>+30</Text>
                </View>
              </TouchableOpacity>
            </View>
            
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{userData.gamesPlayedToday}</Text>
                <Text style={styles.statLabel}>Jeux joués aujourd'hui</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{userData.pointsBalance}</Text>
                <Text style={styles.statLabel}>Points accumulés</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Modal for "How to earn miles" */}
      <Modal
        visible={showHowToEarnModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHowToEarnModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Programme - Gagner des Miles</Text>
              <TouchableOpacity onPress={() => setShowHowToEarnModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              <View style={styles.programSection}>
                <Ionicons name="airplane" size={40} color="#c60c30" style={styles.programIcon} />
                <Text style={styles.programTitle}>Voyager avec Royal Air Maroc</Text>
                <Text style={styles.programDescription}>
                  Plus vous volez, plus vous gagnez de miles. La classe de voyage, 
                  la distance et le tarif influencent votre cumul.
                </Text>
              </View>
              
              <View style={styles.programSection}>
                <Ionicons name="game-controller" size={40} color="#c60c30" style={styles.programIcon} />
                <Text style={styles.programTitle}>Participer aux jeux et défis</Text>
                <Text style={styles.programDescription}>
                  Des mini-jeux, des quiz et des challenges hebdomadaires vous offrent 
                  des miles bonus ! Jouez régulièrement pour maximiser vos gains.
                </Text>
              </View>
              
              <View style={styles.programSection}>
                <Ionicons name="gift" size={40} color="#c60c30" style={styles.programIcon} />
                <Text style={styles.programTitle}>Bonus quotidiens</Text>
                <Text style={styles.programDescription}>
                  Connectez-vous chaque jour pour recevoir un cadeau surprise : 
                  miles bonus, codes exclusifs, ou accès à des tirages.
                </Text>
              </View>
              
              <View style={styles.programSection}>
                <Ionicons name="qr-code" size={40} color="#c60c30" style={styles.programIcon} />
                <Text style={styles.programTitle}>Scanner les QR codes</Text>
                <Text style={styles.programDescription}>
                  Repérez les affiches "Atlas Rewards" dans les aéroports, 
                  scannez le QR code, et gagnez des miles instantanés.
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.programActionButton}
                onPress={() => {
                  setShowHowToEarnModal(false);
                  setShowHowToSpendModal(true);
                }}
              >
                <Text style={styles.programActionButtonText}>COMMENT DÉPENSER MES MILES</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Modal for "How to spend miles" */}
      <Modal
        visible={showHowToSpendModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHowToSpendModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Programme - Dépenser des Miles</Text>
              <TouchableOpacity onPress={() => setShowHowToSpendModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              <View style={styles.programSection}>
                <Ionicons name="football" size={40} color="#c60c30" style={styles.programIcon} />
                <Text style={styles.programTitle}>Vivez la CAN 2025 avec vos Miles</Text>
                <Text style={styles.programDescription}>
                  Échangez vos miles contre des billets pour les matchs, des packs VIP, 
                  du transport vers le stade et des produits dérivés exclusifs CAN.
                </Text>
              </View>
              
              <View style={styles.programSection}>
                <Ionicons name="airplane" size={40} color="#c60c30" style={styles.programIcon} />
                <Text style={styles.programTitle}>Billets d'avion et surclassements</Text>
                <Text style={styles.programDescription}>
                  Offrez-vous un billet gratuit ou un surclassement en Business Class 
                  pour votre prochain voyage avec Royal Air Maroc.
                </Text>
              </View>
              
              <View style={styles.programSection}>
                <Ionicons name="briefcase" size={40} color="#c60c30" style={styles.programIcon} />
                <Text style={styles.programTitle}>Services personnalisés</Text>
                <Text style={styles.programDescription}>
                  Accédez à des services premium comme le bagage supplémentaire, 
                  l'accès aux salons VIP, et la priorité à l'enregistrement et à l'embarquement.
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.programActionButton}
                onPress={() => {
                  setShowHowToSpendModal(false);
                  setShowRewardsModal(true);
                }}
              >
                <Text style={styles.programActionButtonText}>VOIR LES RÉCOMPENSES DISPONIBLES</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Modal for Legal Center */}
      <Modal
        visible={showLegalModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLegalModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Centre juridique</Text>
              <TouchableOpacity onPress={() => setShowLegalModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              <Text style={styles.legalSectionTitle}>Coordonnées du Service Client</Text>
              
              <TouchableOpacity 
                style={styles.legalContactItem}
                onPress={callCustomerService}
              >
                <Ionicons name="call" size={24} color="#c60c30" />
                <View style={styles.legalContactContent}>
                  <Text style={styles.legalContactTitle}>Téléphone</Text>
                  <Text style={styles.legalContactInfo}>Maroc: 089000 0800 ou 3260</Text>
                  <Text style={styles.legalContactInfo}>International: +212 522 48 97 97</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.legalContactItem}
                onPress={sendEmail}
              >
                <Ionicons name="mail" size={24} color="#c60c30" />
                <View style={styles.legalContactContent}>
                  <Text style={styles.legalContactTitle}>E-mail</Text>
                  <Text style={styles.legalContactInfo}>Principal: callcenter@royalairmaroc.com</Text>
                  <Text style={styles.legalContactInfo}>Réclamations: serviceclient@royalairmaroc.com</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.legalContactItem}
                onPress={openReclaimForm}
              >
                <Ionicons name="document-text" size={24} color="#c60c30" />
                <View style={styles.legalContactContent}>
                  <Text style={styles.legalContactTitle}>Formulaire de réclamation</Text>
                  <Text style={styles.legalContactInfo}>Soumettez votre réclamation en ligne</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </TouchableOpacity>
              
              <Text style={styles.legalSectionTitle}>À propos de Royal Air Maroc</Text>
              <Text style={styles.legalText}>
                Royal Air Maroc est une société anonyme régie par la loi n° 17-95 
                relative aux sociétés anonymes, modifiée par la loi n° 20-05 du 23 mai 2008. 
                Son capital social est de 2.021.984.200,00 DH, détenu à 96,80 % par l'État.
              </Text>
              
              <Text style={styles.legalText}>
                Pour toute question juridique ou litige, vous pouvez contacter le service 
                client aux coordonnées mentionnées ci-dessus. En cas de besoin d'assistance 
                juridique spécifique, il est recommandé de consulter un avocat ou un conseiller juridique.
              </Text>
              
              <Text style={styles.legalSectionTitle}>Adresse Postale</Text>
              <Text style={styles.legalText}>
                Royal Air Maroc
                Aéroport Mohammed V
                Casablanca, Maroc
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Modal for CAN matches */}
      <Modal
        visible={showMatchesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMatchesModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Matchs CAN 2025</Text>
              <TouchableOpacity 
  style={styles.closeButton}
  onPress={() => setShowMatchesModal(false)}
>
  <Text style={styles.closeButton}>✕</Text>
</TouchableOpacity>
           </View>
           
           <Text style={styles.modalSubtitle}>Votre solde: {userData.pointsBalance} milles</Text>
           
           <FlatList
             data={matches}
             keyExtractor={(item) => item.id}
             renderItem={({ item }) => (
               <TouchableOpacity 
                 style={[
                   styles.matchItem,
                   userData.pointsBalance < item.pointsToWatch && styles.disabledMatch
                 ]}
                 onPress={() => watchMatch(item)}
                 disabled={userData.pointsBalance < item.pointsToWatch}
               >
                 <View style={styles.matchDetails}>
                   <Text style={styles.matchTeams}>{item.teamA} vs {item.teamB}</Text>
                   <Text style={styles.matchDateTime}>{item.date} • {item.time}</Text>
                   <Text style={styles.matchStadium}>{item.stadium}</Text>
                 </View>
                 <View style={styles.matchPoints}>
                   <Text style={styles.matchPointsText}>{item.pointsToWatch}</Text>
                   <Text style={styles.matchPointsLabel}>points</Text>
                 </View>
               </TouchableOpacity>
             )}
           />
         </View>
       </View>
     </Modal>
     
     {/* Modal for spending miles */}
     <Modal
       visible={showRewardsModal}
       animationType="slide"
       transparent={true}
       onRequestClose={() => setShowRewardsModal(false)}
     >
       <View style={styles.modalContainer}>
         <View style={styles.modalContent}>
           <View style={styles.modalHeader}>
             <Text style={styles.modalTitle}>Dépenser mes milles</Text>
             <TouchableOpacity onPress={() => setShowRewardsModal(false)}>
               <Text style={styles.closeButton}>✕</Text>
             </TouchableOpacity>
           </View>
           
           <Text style={styles.modalSubtitle}>Votre solde: {userData.pointsBalance} milles</Text>
           
           <FlatList
             data={rewards}
             keyExtractor={(item) => item.id}
             renderItem={({ item }) => (
               <TouchableOpacity 
                 style={[
                   styles.rewardItem,
                   userData.pointsBalance < item.pointsRequired && styles.disabledReward
                 ]}
                 onPress={() => showRewardDetails(item)}
                 disabled={userData.pointsBalance < item.pointsRequired}
               >
                 <View style={styles.rewardImagePlaceholder}>
                   {item.image === 'salon' && <Ionicons name="business" size={36} color="#c60c30" />}
                   {item.image === 'baggage' && <Ionicons name="briefcase" size={36} color="#c60c30" />}
                   {item.image === 'upgrade' && <Ionicons name="arrow-up-circle" size={36} color="#c60c30" />}
                   {item.image === 'ticket' && <Ionicons name="ticket" size={36} color="#c60c30" />}
                   {item.image === 'vip' && <Ionicons name="people" size={36} color="#c60c30" />}
                   {item.image === 'pack' && <Ionicons name="shirt" size={36} color="#c60c30" />}
                   {item.image === 'sim' && <Ionicons name="phone-portrait" size={36} color="#c60c30" />}
                 </View>
                 <View style={styles.rewardInfo}>
                   <Text style={styles.rewardTitle}>{item.title}</Text>
                   <Text style={styles.rewardDescription}>{item.description}</Text>
                 </View>
                 <View style={styles.rewardPoints}>
                   <Text style={styles.rewardPointsText}>{item.pointsRequired}</Text>
                   <Text style={styles.rewardPointsLabel}>points</Text>
                 </View>
               </TouchableOpacity>
             )}
           />
         </View>
       </View>
     </Modal>
     
     {/* Modal for flight ID entry */}
     <Modal
       visible={showFlightIdModal}
       animationType="slide"
       transparent={true}
       onRequestClose={() => setShowFlightIdModal(false)}
     >
       <View style={styles.modalContainer}>
         <View style={styles.modalContent}>
           <View style={styles.modalHeader}>
             <Text style={styles.modalTitle}>Entrez votre ID de vol</Text>
             <TouchableOpacity onPress={() => setShowFlightIdModal(false)}>
               <Text style={styles.closeButton}>✕</Text>
             </TouchableOpacity>
           </View>
           
           <Text style={styles.modalSubtitle}>Gagnez des miles pour votre vol</Text>
           
           <View style={styles.inputContainer}>
             <TextInput
               style={styles.flightIdInput}
               placeholder="Ex: AT123"
               value={flightId}
               onChangeText={setFlightId}
               autoCapitalize="characters"
               autoCorrect={false}
               maxLength={6}
             />
             
             <TouchableOpacity
               style={styles.submitButton}
               onPress={submitFlightId}
               disabled={!flightId.trim()}
             >
               <Text style={styles.submitButtonText}>VÉRIFIER</Text>
             </TouchableOpacity>
           </View>
           
           <View style={styles.flightInstructionsContainer}>
             <Text style={styles.flightInstructionsTitle}>Comment trouver votre ID de vol ?</Text>
             <Text style={styles.flightInstructions}>
               Votre ID de vol se trouve sur votre carte d'embarquement ou votre réservation. 
               Il commence généralement par "AT" suivi de 3 ou 4 chiffres.
             </Text>
           </View>
         </View>
       </View>
     </Modal>
     
     {/* Modal for reward details */}
     <Modal
       visible={showRewardDetailsModal}
       animationType="slide"
       transparent={true}
       onRequestClose={() => setShowRewardDetailsModal(false)}
     >
       <View style={styles.modalContainer}>
         <View style={styles.modalContent}>
           <View style={styles.modalHeader}>
             <Text style={styles.modalTitle}>Détails de la récompense</Text>
             <TouchableOpacity onPress={() => setShowRewardDetailsModal(false)}>
               <Text style={styles.closeButton}>✕</Text>
             </TouchableOpacity>
           </View>
           
           {selectedReward && (
             <View style={styles.rewardDetailsContainer}>
               <View style={styles.rewardImageLarge}>
                 {selectedReward.image === 'salon' && <Ionicons name="business" size={64} color="#c60c30" />}
                 {selectedReward.image === 'baggage' && <Ionicons name="briefcase" size={64} color="#c60c30" />}
                 {selectedReward.image === 'upgrade' && <Ionicons name="arrow-up-circle" size={64} color="#c60c30" />}
                 {selectedReward.image === 'ticket' && <Ionicons name="ticket" size={64} color="#c60c30" />}
                 {selectedReward.image === 'vip' && <Ionicons name="people" size={64} color="#c60c30" />}
                 {selectedReward.image === 'pack' && <Ionicons name="shirt" size={64} color="#c60c30" />}
                 {selectedReward.image === 'sim' && <Ionicons name="phone-portrait" size={64} color="#c60c30" />}
               </View>
               
               <Text style={styles.rewardDetailTitle}>{selectedReward.title}</Text>
               <Text style={styles.rewardDetailDescription}>{selectedReward.description}</Text>
               
               <View style={styles.rewardDetailPoints}>
                 <Text style={styles.rewardDetailPointsLabel}>Coût:</Text>
                 <Text style={styles.rewardDetailPointsValue}>{selectedReward.pointsRequired} points</Text>
               </View>
               
               <Text style={styles.rewardDetailTerms}>
                 Conditions: Cette récompense est soumise à disponibilité. Valable pour une utilisation 
                 dans les 30 jours suivant la réclamation. Code non transférable et non remboursable.
               </Text>
               
               <TouchableOpacity
                 style={styles.claimRewardButton}
                 onPress={claimReward}
               >
                 <Text style={styles.claimRewardButtonText}>RÉCLAMER MAINTENANT</Text>
               </TouchableOpacity>
             </View>
           )}
         </View>
       </View>
     </Modal>
     
     {/* Modal for success message */}
     <Modal
       visible={showSuccessModal}
       animationType="fade"
       transparent={true}
       onRequestClose={() => setShowSuccessModal(false)}
     >
       <View style={styles.overlayModalContainer}>
         <View style={styles.successModalContent}>
           <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
           <Text style={styles.successTitle}>Succès!</Text>
           <Text style={styles.successMessage}>{successMessage}</Text>
           
           {successPoints > 0 && (
             <View style={styles.successPointsContainer}>
               <Text style={styles.successPointsValue}>+{successPoints}</Text>
               <Text style={styles.successPointsLabel}>points</Text>
             </View>
           )}
           
           {rewardClaimed && (
             <View style={styles.successRewardContainer}>
               <Text style={styles.successRewardLabel}>Récompense réclamée:</Text>
               <Text style={styles.successRewardValue}>{rewardClaimed}</Text>
             </View>
           )}
           
           <TouchableOpacity
             style={styles.successCloseButton}
             onPress={() => setShowSuccessModal(false)}
           >
             <Text style={styles.successCloseButtonText}>FERMER</Text>
           </TouchableOpacity>
         </View>
       </View>
     </Modal>
     
     {/* Modal for error message */}
     <Modal
       visible={showErrorModal}
       animationType="fade"
       transparent={true}
       onRequestClose={() => setShowErrorModal(false)}
     >
       <View style={styles.overlayModalContainer}>
         <View style={styles.errorModalContent}>
           <Ionicons name="close-circle" size={64} color="#F44336" />
           <Text style={styles.errorTitle}>Erreur</Text>
           <Text style={styles.errorMessage}>{errorMessage}</Text>
           
           <TouchableOpacity
             style={styles.errorCloseButton}
             onPress={() => setShowErrorModal(false)}
           >
             <Text style={styles.errorCloseButtonText}>FERMER</Text>
           </TouchableOpacity>
         </View>
       </View>
     </Modal>
   </SafeAreaView>
 );
}

// Définition des styles
const styles = StyleSheet.create({
 // Styles généraux
 safeArea: {
   flex: 1,
   backgroundColor: '#f5f5f5',
 },
 loadingContainer: {
   flex: 1,
   justifyContent: 'center',
   alignItems: 'center',
   backgroundColor: '#f5f5f5',
 },
 loadingText: {
   marginTop: 10,
   fontSize: 16,
   color: '#333',
 },
 scrollView: {
   flex: 1,
 },
 scrollContainer: {
   padding: 15,
   paddingBottom: 30,
 },
 overlayLoading: {
   position: 'absolute',
   top: 0,
   left: 0,
   right: 0,
   bottom: 0,
   backgroundColor: 'rgba(0, 0, 0, 0.7)',
   justifyContent: 'center',
   alignItems: 'center',
   zIndex: 999,
 },
 
 // Styles pour la barre de navigation
 topBar: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   alignItems: 'center',
   paddingHorizontal: 15,
   paddingVertical: 10,
   backgroundColor: '#fff',
   borderBottomWidth: 1,
   borderBottomColor: '#e0e0e0',
 },
 menuButton: {
   padding: 5,
 },
 appTitle: {
   fontSize: 20,
   fontWeight: 'bold',
   color: '#c60c30',
 },
 notificationButton: {
   padding: 5,
 },
 notificationBadge: {
   position: 'absolute',
   right: 0,
   top: 0,
   backgroundColor: '#c60c30',
   width: 18,
   height: 18,
   borderRadius: 9,
   justifyContent: 'center',
   alignItems: 'center',
 },
 notificationCount: {
   color: 'white',
   fontSize: 12,
   fontWeight: 'bold',
 },
 
 // Styles pour l'en-tête
 welcomeHeader: {
   marginVertical: 20,
 },
 welcomeText: {
   fontSize: 24,
   fontWeight: 'bold',
   color: '#333',
 },
 canText: {
   fontSize: 16,
   color: '#666',
   marginTop: 5,
 },
 
 // Styles pour le sac d'argent animé
 moneyBagContainer: {
   flexDirection: 'row',
   backgroundColor: '#fff',
   borderRadius: 15,
   padding: 15,
   marginBottom: 20,
   alignItems: 'center',
   elevation: 3,
   shadowColor: '#000',
   shadowOffset: { width: 0, height: 2 },
   shadowOpacity: 0.1,
   shadowRadius: 3,
 },
 moneyIconContainer: {
   position: 'relative',
   width: 80,
   height: 80,
   justifyContent: 'center',
   alignItems: 'center',
 },
 moneyBag: {
   width: 60,
   height: 60,
   borderRadius: 30,
   backgroundColor: '#c60c30',
   justifyContent: 'center',
   alignItems: 'center',
 },
 moneyBagSymbol: {
   fontSize: 30,
   fontWeight: 'bold',
   color: '#fff',
 },
 coinStack: {
   position: 'absolute',
   top: 0,
   left: 20,
   zIndex: 10,
 },
 coin: {
   width: 24,
   height: 24,
   borderRadius: 12,
   backgroundColor: '#FFC107',
   justifyContent: 'center',
   alignItems: 'center',
   marginVertical: 2,
 },
 coin1: {
   transform: [{ translateX: -10 }],
 },
 coin2: {
   transform: [{ translateX: 5 }],
 },
 coin3: {
   transform: [{ translateX: -5 }],
 },
 coinSymbol: {
   fontSize: 14,
   fontWeight: 'bold',
   color: '#fff',
 },
 moneyTextContainer: {
   flex: 1,
   marginLeft: 15,
 },
 moneyLabel: {
   fontSize: 14,
   color: '#666',
 },
 moneyValue: {
   fontSize: 28,
   fontWeight: 'bold',
   color: '#c60c30',
 },
 moneyUnit: {
   fontSize: 14,
   color: '#666',
 },
 
 // Styles pour la barre de statistiques
 statsBar: {
   flexDirection: 'row',
   alignItems: 'center',
   justifyContent: 'space-between',
   marginHorizontal: 0,
   marginBottom: 20,
   backgroundColor: '#fff',
   borderRadius: 15,
   padding: 15,
   elevation: 3,
   shadowColor: '#000',
   shadowOffset: { width: 0, height: 2 },
   shadowOpacity: 0.1,
   shadowRadius: 3,
 },
 statItem: {
   flex: 1,
   alignItems: 'center',
 },
 statValue: {
   fontSize: 20,
   fontWeight: 'bold',
   color: '#c60c30',
   marginBottom: 5,
 },
 statLabel: {
   fontSize: 12,
   color: '#666',
   textAlign: 'center',
 },
 statDivider: {
   width: 1,
   height: '70%',
   backgroundColor: '#e0e0e0',
 },
 
 // Styles pour la bannière CAN
 canBanner: {
   flexDirection: 'row',
   backgroundColor: '#006400', // Vert foncé
   borderRadius: 15,
   padding: 15,
   marginBottom: 20,
   alignItems: 'center',
   justifyContent: 'space-between',
   elevation: 3,
   shadowColor: '#000',
   shadowOffset: { width: 0, height: 2 },
   shadowOpacity: 0.2,
   shadowRadius: 3,
 },
 canBannerContent: {
   flex: 1,
 },
 canBannerTitle: {
   fontSize: 20,
   fontWeight: 'bold',
   color: '#fff',
   marginBottom: 5,
 },
 canBannerDescription: {
   fontSize: 14,
   color: '#fff',
 },
 viewMatchesButton: {
   backgroundColor: 'rgba(255, 255, 255, 0.2)',
   paddingVertical: 8,
   paddingHorizontal: 15,
   borderRadius: 20,
 },
 viewMatchesText: {
   color: '#fff',
   fontWeight: 'bold',
 },
 
 // Styles pour carte de bonus quotidien
 dailyBonusCard: {
   backgroundColor: '#fff',
   borderRadius: 15,
   padding: 15,
   marginBottom: 20,
   elevation: 3,
   shadowColor: '#000',
   shadowOffset: { width: 0, height: 2 },
   shadowOpacity: 0.1,
   shadowRadius: 3,
   overflow: 'hidden',
 },
 disabledCard: {
   opacity: 0.7,
 },
 cardContent: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   alignItems: 'center',
 },
 cardTitle: {
   fontSize: 18,
   fontWeight: 'bold',
   color: '#333',
   marginBottom: 5,
 },
 cardDescription: {
   fontSize: 14,
   color: '#666',
 },
 pointsBadge: {
   backgroundColor: '#4CAF50',
   paddingVertical: 5,
   paddingHorizontal: 10,
   borderRadius: 15,
 },
 pointsBadgeText: {
   color: '#fff',
   fontWeight: 'bold',
 },
 claimedOverlay: {
   position: 'absolute',
   top: 0,
   left: 0,
   right: 0,
   bottom: 0,
   backgroundColor: 'rgba(0, 0, 0, 0.5)',
   justifyContent: 'center',
   alignItems: 'center',
 },
 claimedText: {
   color: '#fff',
   fontWeight: 'bold',
   fontSize: 16,
 },
 
 // Styles pour le bouton QR
 qrCodeButton: {
   backgroundColor: '#000', // Fond noir
   borderRadius: 15,
   padding: 20,
   alignItems: 'center',
   justifyContent: 'center',
   marginBottom: 20,
   elevation: 3,
   shadowColor: '#000',
   shadowOffset: { width: 0, height: 2 },
   shadowOpacity: 0.2,
   shadowRadius: 3,
 },
 qrCodeButtonText: {
   color: '#fff',
   fontSize: 18,
   fontWeight: 'bold',
   marginTop: 10,
 },
 qrCodeDescription: {
   color: '#ddd',
   fontSize: 14,
   marginTop: 5,
 },
 
 // Styles pour le scanner QR
 qrScannerContainer: {
   flex: 1,
   backgroundColor: '#000',
 },
 qrScannerHeader: {
   flexDirection: 'row',
   alignItems: 'center',
   padding: 15,
   backgroundColor: 'rgba(0, 0, 0, 0.7)',
   position: 'absolute',
   top: 0,
   left: 0,
   right: 0,
   zIndex: 10,
 },
 qrScannerCloseButton: {
   marginRight: 15,
 },
 qrScannerTitle: {
   color: '#fff',
   fontSize: 18,
   fontWeight: 'bold',
 },
 qrScannerPlaceholder: {
   flex: 1,
   justifyContent: 'center',
   alignItems: 'center',
   backgroundColor: '#111',
 },
 permissionButton: {
   backgroundColor: '#c60c30',
   padding: 10,
   borderRadius: 5,
   marginTop: 15,
 },
 permissionButtonText: {
   color: '#fff',
   fontWeight: 'bold',
 },
 qrScannerCamera: {
   flex: 1,
 },
 qrScannerOverlay: {
   position: 'absolute',
   top: 0,
   left: 0,
   right: 0,
   bottom: 0,
   justifyContent: 'center',
   alignItems: 'center',
 },
 qrScannerFrame: {
   width: 250,
   height: 250,
   borderWidth: 2,
   borderColor: '#c60c30',
   backgroundColor: 'transparent',
 },
 qrScannerFooter: {
   position: 'absolute',
   bottom: 0,
   left: 0,
   right: 0,
   padding: 20,
   backgroundColor: 'rgba(0, 0, 0, 0.7)',
   alignItems: 'center',
 },
 qrScannerInstructions: {
   color: '#fff',
   fontSize: 16,
   textAlign: 'center',
   marginBottom: 15,
 },
 scanAgainButton: {
   backgroundColor: '#c60c30',
   paddingVertical: 10,
   paddingHorizontal: 20,
   borderRadius: 5,
 },
 scanAgainButtonText: {
   color: '#fff',
   fontWeight: 'bold',
 },
 
 // Styles pour les modales
 modalContainer: {
   flex: 1,
   justifyContent: 'center',
   backgroundColor: 'rgba(0, 0, 0, 0.5)',
 },
 modalContent: {
   backgroundColor: '#fff',
   borderRadius: 10,
   maxHeight: '90%',
   margin: 20,
   overflow: 'hidden',
 },
 modalHeader: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   alignItems: 'center',
   padding: 15,
   borderBottomWidth: 1,
   borderBottomColor: '#e0e0e0',
 },
 modalTitle: {
   fontSize: 18,
   fontWeight: 'bold',
   color: '#333',
 },
 closeButton: {
   fontSize: 24,
   color: '#999',
   padding: 5,
 },
 modalSubtitle: {
   fontSize: 16,
   color: '#666',
   marginTop: 5,
   marginBottom: 15,
   paddingHorizontal: 15,
 },
 
 // Styles pour les notifications
 emptyNotifications: {
   alignItems: 'center',
   justifyContent: 'center',
   padding: 30,
 },
 emptyNotificationsText: {
   marginTop: 10,
   fontSize: 16,
   color: '#999',
 },
 notificationItem: {
   flexDirection: 'row',
   padding: 15,
   borderBottomWidth: 1,
   borderBottomColor: '#e0e0e0',
 },
 unreadNotification: {
   backgroundColor: 'rgba(198, 12, 48, 0.05)',
 },
 notificationIconContainer: {
   marginRight: 15,
   justifyContent: 'center',
 },
 notificationContent: {
   flex: 1,
 },
 notificationTitle: {
   fontSize: 16,
   fontWeight: 'bold',
   color: '#333',
   marginBottom: 5,
 },
 notificationMessage: {
   fontSize: 14,
   color: '#666',
   marginBottom: 5,
 },
 notificationDate: {
   fontSize: 12,
   color: '#999',
 },
 unreadDot: {
   width: 10,
   height: 10,
   borderRadius: 5,
   backgroundColor: '#c60c30',
   marginRight: 5,
   alignSelf: 'center',
 },
 historyButton: {
   backgroundColor: '#c60c30',
   margin: 15,
   padding: 15,
   borderRadius: 5,
   alignItems: 'center',
 },
 historyButtonText: {
   color: '#fff',
   fontWeight: 'bold',
 },
 
 // Styles pour l'historique
 historyTabs: {
   flexDirection: 'row',
   borderBottomWidth: 1,
   borderBottomColor: '#e0e0e0',
 },
 historyTab: {
   flex: 1,
   paddingVertical: 15,
   alignItems: 'center',
   position: 'relative',
 },
 historyTabText: {
   fontSize: 16,
   color: '#333',
 },
 activeTab: {
   position: 'absolute',
   bottom: 0,
   height: 3,
   width: '50%',
   backgroundColor: '#c60c30',
 },
 emptyHistoryContainer: {
   alignItems: 'center',
   justifyContent: 'center',
   padding: 30,
 },
 emptyHistoryText: {
   marginTop: 10,
   fontSize: 16,
   color: '#999',
 },
 historyItem: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   padding: 15,
   borderBottomWidth: 1,
   borderBottomColor: '#e0e0e0',
 },
 historyItemContent: {
   flex: 1,
   marginRight: 10,
 },
 historyItemSource: {
   fontSize: 16,
   color: '#333',
   marginBottom: 5,
 },
 historyItemDate: {
   fontSize: 12,
   color: '#999',
 },
 historyItemPoints: {
   fontSize: 16,
   fontWeight: 'bold',
   alignSelf: 'center',
 },
 positivePoints: {
   color: '#4CAF50',
 },
 negativePoints: {
   color: '#F44336',
 },
 
 // Styles pour le menu
 menuModalContainer: {
   flex: 1,
   flexDirection: 'row',
 },
 menuBackdrop: {
   position: 'absolute',
   top: 0,
   left: 0,
   right: 0,
   bottom: 0,
   backgroundColor: 'rgba(0, 0, 0, 0.3)',
 },
 menuModalContent: {
   width: '100%',
   backgroundColor: '#fff',
   height: '200%',
   position: 'absolute',
   top: 0,
   bottom: 0,
   left: 0,
 },
 menuHeader: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   alignItems: 'center',
   padding: 15,
   borderBottomWidth: 1,
   borderBottomColor: '#e0e0e0',
 },
 menuTitle: {
   fontSize: 18,
   fontWeight: 'bold',
   color: '#333',
 },
 menuSection: {
   marginVertical: 10,
 },
 menuItem: {
   flexDirection: 'row',
   alignItems: 'center',
   padding: 15,
   borderBottomWidth: 1,
   borderBottomColor: '#f0f0f0',
 },
 menuItemText: {
   flex: 1,
   marginLeft: 15,
   fontSize: 16,
   color: '#333',
 },
 menuItemValue: {
   fontSize: 14,
   color: '#999',
   marginRight: 10,
 },
 menuItemArrow: {
   fontSize: 18,
   color: '#999',
 },
 logoutButton: {
   backgroundColor: '#c60c30',
   margin: 15,
   padding: 15,
   borderRadius: 5,
   flexDirection: 'row',
   alignItems: 'center',
   justifyContent: 'center',
 },
 logoutButtonText: {
   color: '#fff',
   fontWeight: 'bold',
   marginLeft: 10,
 },
 
 // Styles pour les jeux
 gamesGrid: {
   marginHorizontal: 15,
   marginTop: 10,
 },
 gameCardLarge: {
   backgroundColor: '#fff',
   borderRadius: 10,
   padding: 15,
   marginBottom: 15,
   borderWidth: 1,
   borderColor: '#e0e0e0',
 },
 gameIconContainer: {
   marginBottom: 10,
 },
 gameTitle: {
   fontSize: 18,
   fontWeight: 'bold',
   color: '#333',
   marginBottom: 5,
 },
 gameDescription: {
   fontSize: 14,
   color: '#666',
   marginBottom: 10,
 },
 gamePointsBadge: {
   position: 'absolute',
   top: 15,
   right: 15,
   backgroundColor: '#4CAF50',
   paddingVertical: 5,
   paddingHorizontal: 10,
   borderRadius: 15,
 },
 gamePointsText: {
   color: '#fff',
   fontWeight: 'bold',
 },
 statsContainer: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   marginHorizontal: 15,
   marginTop: 10,
 },
 statCard: {
  flex: 1,
  backgroundColor: '#f9f9f9',
  padding: 15,
  borderRadius: 10,
  marginHorizontal: 5,
  alignItems: 'center',
},

// Styles pour programme
programSection: {
  padding: 15,
  borderBottomWidth: 1,
  borderBottomColor: '#e0e0e0',
},
programIcon: {
  alignSelf: 'center',
  marginBottom: 10,
},
programTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#333',
  marginBottom: 10,
  textAlign: 'center',
},
programDescription: {
  fontSize: 14,
  color: '#666',
  textAlign: 'center',
},
programActionButton: {
  backgroundColor: '#c60c30',
  margin: 15,
  padding: 15,
  borderRadius: 5,
  alignItems: 'center',
},
programActionButtonText: {
  color: '#fff',
  fontWeight: 'bold',
},

// Styles pour centre juridique
legalSectionTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#333',
  marginTop: 15,
  marginBottom: 10,
  paddingHorizontal: 15,
},
legalText: {
  fontSize: 14,
  color: '#666',
  marginBottom: 10,
  paddingHorizontal: 15,
},
legalContactItem: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: 15,
  borderBottomWidth: 1,
  borderBottomColor: '#e0e0e0',
},
legalContactContent: {
  flex: 1,
  marginLeft: 15,
},
legalContactTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#333',
  marginBottom: 5,
},
legalContactInfo: {
  fontSize: 14,
  color: '#666',
},

// Styles pour matchs
matchItem: {
  backgroundColor: '#fff',
  borderRadius: 10,
  padding: 15,
  marginHorizontal: 15,
  marginBottom: 15,
  flexDirection: 'row',
  justifyContent: 'space-between',
  borderWidth: 1,
  borderColor: '#e0e0e0',
},
disabledMatch: {
  opacity: 0.6,
},
matchDetails: {
  flex: 1,
},
matchTeams: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#333',
  marginBottom: 5,
},
matchDateTime: {
  fontSize: 14,
  color: '#666',
  marginBottom: 5,
},
matchStadium: {
  fontSize: 14,
  color: '#999',
},
matchPoints: {
  backgroundColor: '#006400', // Vert foncé
  paddingVertical: 10,
  paddingHorizontal: 15,
  borderRadius: 8,
  justifyContent: 'center',
  alignItems: 'center',
},
matchPointsText: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#fff',
},
matchPointsLabel: {
  fontSize: 12,
  color: '#fff',
},

// Styles pour récompenses
rewardItem: {
  backgroundColor: '#fff',
  borderRadius: 10,
  padding: 15,
  marginHorizontal: 15,
  marginBottom: 15,
  flexDirection: 'row',
  borderWidth: 1,
  borderColor: '#e0e0e0',
},
disabledReward: {
  opacity: 0.6,
},
rewardImagePlaceholder: {
  width: 60,
  height: 60,
  borderRadius: 30,
  backgroundColor: '#f0f0f0',
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 15,
},
rewardInfo: {
  flex: 1,
  marginRight: 10,
},
rewardTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#333',
  marginBottom: 5,
},
rewardDescription: {
  fontSize: 14,
  color: '#666',
},
rewardPoints: {
  justifyContent: 'center',
  alignItems: 'center',
},
rewardPointsText: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#c60c30',
},
rewardPointsLabel: {
  fontSize: 12,
  color: '#999',
},

// Styles pour détails de récompense
rewardDetailsContainer: {
  padding: 15,
},
rewardImageLarge: {
  width: 100,
  height: 100,
  borderRadius: 50,
  backgroundColor: '#f0f0f0',
  justifyContent: 'center',
  alignItems: 'center',
  alignSelf: 'center',
  marginBottom: 20,
},
rewardDetailTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#333',
  textAlign: 'center',
  marginBottom: 15,
},
rewardDetailDescription: {
  fontSize: 16,
  color: '#666',
  textAlign: 'center',
  marginBottom: 20,
},
rewardDetailPoints: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 20,
},
rewardDetailPointsLabel: {
  fontSize: 16,
  color: '#333',
  marginRight: 5,
},
rewardDetailPointsValue: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#c60c30',
},
rewardDetailTerms: {
  fontSize: 14,
  color: '#999',
  textAlign: 'center',
  marginBottom: 20,
},
claimRewardButton: {
  backgroundColor: '#c60c30',
  padding: 15,
  borderRadius: 5,
  alignItems: 'center',
},
claimRewardButtonText: {
  color: '#fff',
  fontWeight: 'bold',
},

// Styles pour les entrées de texte
inputContainer: {
  flexDirection: 'row',
  marginHorizontal: 15,
  marginVertical: 15,
},
flightIdInput: {
  flex: 1,
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 5,
  padding: 10,
  fontSize: 16,
  marginRight: 10,
},
submitButton: {
  backgroundColor: '#c60c30',
  paddingHorizontal: 15,
  borderRadius: 5,
  alignItems: 'center',
  justifyContent: 'center',
},
submitButtonText: {
  color: '#fff',
  fontWeight: 'bold',
},
flightInstructionsContainer: {
  padding: 15,
},
flightInstructionsTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#333',
  marginBottom: 10,
},
flightInstructions: {
  fontSize: 14,
  color: '#666',
},

// Styles pour modals de statut
overlayModalContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
},
successModalContent: {
  backgroundColor: '#fff',
  borderRadius: 10,
  padding: 20,
  width: '80%',
  alignItems: 'center',
},
successTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#4CAF50',
  marginTop: 10,
  marginBottom: 10,
},
successMessage: {
  fontSize: 16,
  color: '#333',
  textAlign: 'center',
  marginBottom: 15,
},
successPointsContainer: {
  backgroundColor: '#4CAF50',
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 20,
  marginBottom: 15,
  alignItems: 'center',
},
successPointsValue: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#fff',
},
successPointsLabel: {
  fontSize: 14,
  color: '#fff',
},
successRewardContainer: {
  backgroundColor: '#f0f0f0',
  padding: 15,
  borderRadius: 10,
  marginBottom: 15,
  width: '100%',
},
successRewardLabel: {
  fontSize: 14,
  color: '#666',
},
successRewardValue: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#333',
  marginTop: 5,
},
successCloseButton: {
  backgroundColor: '#c60c30',
  padding: 15,
  borderRadius: 5,
  width: '100%',
  alignItems: 'center',
  marginTop: 10,
},
successCloseButtonText: {
  color: '#fff',
  fontWeight: 'bold',
},
errorModalContent: {
  backgroundColor: '#fff',
  borderRadius: 10,
  padding: 20,
  width: '80%',
  alignItems: 'center',
},
errorTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#F44336',
  marginTop: 10,
  marginBottom: 10,
},
errorMessage: {
  fontSize: 16,
  color: '#333',
  textAlign: 'center',
  marginBottom: 15,
},
errorCloseButton: {
  backgroundColor: '#c60c30',
  padding: 15,
  borderRadius: 5,
  width: '100%',
  alignItems: 'center',
  marginTop: 10,
},
errorCloseButtonText: {
  color: '#fff',
  fontWeight: 'bold',
},

// Autres styles complémentaires
placeholder: {
  width: 28,
}
});