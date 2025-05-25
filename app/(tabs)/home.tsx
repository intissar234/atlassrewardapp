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
import { signOut, updatePassword, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, addDoc, doc, getDoc, getFirestore, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import MemoryGame from '../../src/components/games/memorygame.jsx';
import PuzzleGame from '../../src/components/games/puzzlegame.jsx';
import QuizGame from '../../src/components/games/quizgame.jsx';
import SnakeGame from '../../src/components/games/snackgame.jsx';
import TetrisGame from '../../src/components/games/tetrisgame.jsx';
const { width } = Dimensions.get('window');

// Type for user data
interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  pointsBalance: number;
  gamesPlayedToday: number;
  lastPlayedDate: string;
  dailyRewardClaimed: boolean;
  preferredLanguage?: string;
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

// Type for Quiz Question
interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
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

// Quiz questions about Morocco, RAM and CAN 2025
const quizQuestions: QuizQuestion[] = [
  {
    id: 1,
    question: "Quelle est la capitale du Maroc?",
    options: ["Casablanca", "Rabat", "Marrakech", "Fès"],
    correctAnswer: 1
  },
  {
    id: 2,
    question: "En quelle année le Maroc a-t-il remporté la Coupe d'Afrique des Nations pour la première fois?",
    options: ["1976", "1986", "1988", "Le Maroc n'a jamais gagné la CAN"],
    correctAnswer: 0
  },
  {
    id: 3,
    question: "Quelle est l'année de fondation de Royal Air Maroc?",
    options: ["1953", "1957", "1960", "1968"],
    correctAnswer: 1
  },
  {
    id: 4,
    question: "Combien de fois le Maroc s'est-il qualifié pour la Coupe du Monde de football?",
    options: ["3 fois", "5 fois", "6 fois", "8 fois"],
    correctAnswer: 2
  },
  {
    id: 5,
    question: "Quel pays accueille la CAN 2025?",
    options: ["Cameroun", "Égypte", "Maroc", "Sénégal"],
    correctAnswer: 2
  },
  {
    id: 6,
    question: "Quelle est la devise officielle du Maroc?",
    options: ["Dinar marocain", "Dirham marocain", "Riyal marocain", "Franc marocain"],
    correctAnswer: 1
  },
  {
    id: 7,
    question: "Quel est le hub principal de Royal Air Maroc?",
    options: ["Aéroport Marrakech Menara", "Aéroport Fès-Saïs", "Aéroport Mohammed V de Casablanca", "Aéroport Rabat-Salé"],
    correctAnswer: 2
  },
  {
    id: 8,
    question: "Quelle compagnie aérienne est membre de l'alliance Oneworld avec Royal Air Maroc?",
    options: ["Air France", "Emirates", "Qatar Airways", "Iberia"],
    correctAnswer: 2
  },
  {
    id: 9,
    question: "Quel joueur marocain est considéré comme l'un des meilleurs joueurs de l'histoire du football marocain?",
    options: ["Hakim Ziyech", "Achraf Hakimi", "Sofiane Boufal", "Noureddine Naybet"],
    correctAnswer: 3
  },
  {
    id: 10,
    question: "Quel est le nom du programme de fidélité de Royal Air Maroc?",
    options: ["Safar Flyer", "Atlas Miles", "RAM Rewards", "Moroccan Miles"],
    correctAnswer: 0
  },
  {
    id: 11,
    question: "Combien d'équipes participent à la CAN?",
    options: ["16 équipes", "24 équipes", "32 équipes", "36 équipes"],
    correctAnswer: 1
  },
  {
    id: 12,
    question: "Quel est le plus grand stade du Maroc qui accueillera des matchs de la CAN 2025?",
    options: ["Stade Mohammed V", "Stade Adrar", "Grand Stade de Tanger", "Complexe sportif Prince Moulay Abdellah"],
    correctAnswer: 0
  },
  {
    id: 13,
    question: "Quel pays détient le record de victoires à la CAN?",
    options: ["Cameroun", "Égypte", "Ghana", "Nigeria"],
    correctAnswer: 1
  },
  {
    id: 14,
    question: "Quelle est la flotte principale de Royal Air Maroc?",
    options: ["Airbus A320", "Boeing 737", "Boeing 787 Dreamliner", "Embraer E190"],
    correctAnswer: 1
  },
  {
    id: 15,
    question: "Quel est le nom du plus haut sommet du Maroc?",
    options: ["Jbel Toubkal", "Jbel Ayachi", "Jbel Saghro", "Jbel Tidirhine"],
    correctAnswer: 0
  },
  {
    id: 16,
    question: "Quel est le dernier pays à avoir remporté la CAN?",
    options: ["Sénégal", "Algérie", "Côte d'Ivoire", "Cameroun"],
    correctAnswer: 2
  },
  {
    id: 17,
    question: "Quelle est la mascotte officielle de la CAN 2025?",
    options: ["Simba le Lion", "Atlas le Fennec", "Kouba l'Aigle", "Touki l'Éléphant"],
    correctAnswer: 1
  },
  {
    id: 18,
    question: "Dans quelle ville se trouve le siège social de Royal Air Maroc?",
    options: ["Rabat", "Marrakech", "Casablanca", "Tanger"],
    correctAnswer: 2
  },
  {
    id: 19,
    question: "Quelle est l'année où le Maroc a atteint les demi-finales de la Coupe du Monde?",
    options: ["1986", "1998", "2018", "2022"],
    correctAnswer: 3
  },
  {
    id: 20,
    question: "Quel est le slogan de Royal Air Maroc?",
    options: ["Envol vers l'excellence", "Le monde à vos pieds", "Ambassadeur du Maroc", "Rêves sans frontières"],
    correctAnswer: 2
  }
];

export default function HomeScreen() {
 const [userData, setUserData] = useState<UserData>({
   firstName: "",
   lastName: "",
   email: "",
   phone: "",
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
 const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
 const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);
 const [showDeleteAccountModal, setShowDeleteAccountModal] = useState<boolean>(false);
 const [showQuizModal, setShowQuizModal] = useState<boolean>(false);
 const [showTetrisModal, setShowTetrisModal] = useState<boolean>(false);
 const [showMemoryGameModal, setShowMemoryGameModal] = useState<boolean>(false);
 const [showSnakeGameModal, setShowSnakeGameModal] = useState<boolean>(false);
 const [showPuzzleModal, setShowPuzzleModal] = useState<boolean>(false);
 const [selectedPuzzleType, setSelectedPuzzleType] = useState<string>('slider');
 
 const [flightId, setFlightId] = useState<string>('');
 const [currentPassword, setCurrentPassword] = useState<string>('');
 const [newPassword, setNewPassword] = useState<string>('');
 const [confirmPassword, setConfirmPassword] = useState<string>('');
 const [deleteAccountPassword, setDeleteAccountPassword] = useState<string>('');
 
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
 const [currentQuizQuestion, setCurrentQuizQuestion] = useState<number>(0);
 const [quizScore, setQuizScore] = useState<number>(0);
 const [quizComplete, setQuizComplete] = useState<boolean>(false);
 const [quizFailed, setQuizFailed] = useState<boolean>(false);
 
 // Animation for money bag (beztam)
 const moneyBagAnimation = useRef(new Animated.Value(0)).current;

 // Animated values for the beztam
 const moneyBagScale = moneyBagAnimation.interpolate({
   inputRange: [0, 0.5, 1],
   outputRange: [1, 1.1, 1]
 });

 // Function to animate beztam when points are added
 const animateMoneyBag = () => {
   Animated.sequence([
     Animated.spring(moneyBagAnimation, {
       toValue: 1,
       friction: 3,
       tension: 40,
       useNativeDriver: true
     }),
     Animated.timing(moneyBagAnimation, {
       toValue: 0,
       duration: 300,
       useNativeDriver: true
     })
   ]).start();
 };

 // Function to add notification
 const addNotification = (title: string, message: string, type: string) => {
   const newNotification: Notification = {
     id: Date.now().toString(),
     title,
     message,
     date: new Date().toISOString(),
     read: false,
     type
   };
   
   setNotifications(prev => [newNotification, ...prev]);
   setUnreadNotifications(prev => prev + 1);
 };

 // Function to refresh user data
 const refreshUserData = async () => {
   try {
     const data = await getUserProfile();
     if (data) {
       setUserData({
         firstName: data.firstName || "Utilisateur",
         lastName: data.lastName || "",
         email: data.email || "",
         phone: data.phone || "",
         pointsBalance: data.pointsBalance || 0,
         gamesPlayedToday: data.gamesPlayedToday || 0,
         lastPlayedDate: data.lastPlayedDate || todayDate,
         dailyRewardClaimed: data.dailyRewardClaimed || false,
         preferredLanguage: data.preferredLanguage || "fr"
       });
     }
   } catch (error) {
     console.error("Erreur lors de la récupération des données:", error);
   }
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

 // Request camera permissions on mount
 useEffect(() => {
   (async () => {
     const { status } = await Camera.requestCameraPermissionsAsync();
     setHasPermission(status === 'granted');
   })();
 }, []);

 // Fetch user data
useEffect(() => {
  console.log("🔍 === DIAGNOSTIC START ===");
  
  // Écouter les changements d'état d'authentification
  const unsubscribe = auth.onAuthStateChanged(async (user) => {
    console.log("🔄 Auth state changed:", user?.email);
    
    if (user) {
      console.log("👤 User connecté:", user.email);
      console.log("🆔 UID:", user.uid);
      
      try {
        console.log("📞 Appel de getUserProfile...");
        const data = await getUserProfile();
        console.log("📋 Données reçues:", JSON.stringify(data, null, 2));
        
        if (data) {
          console.log("✅ Données trouvées - firstName:", data.firstName);
          console.log("✅ Données trouvées - lastName:", data.lastName);
          
          setUserData({
            firstName: data.firstName || "Utilisateur",
            lastName: data.lastName || "",
            email: data.email || "",
            phone: data.phone || "",
            pointsBalance: data.pointsBalance || 0,
            gamesPlayedToday: data.gamesPlayedToday || 0,
            lastPlayedDate: data.lastPlayedDate || todayDate,
            dailyRewardClaimed: data.dailyRewardClaimed || false,
            preferredLanguage: data.preferredLanguage || "fr"
          });
        } else {
          console.log("❌ Aucune donnée trouvée");
        }
        
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
        console.error("💥 ERREUR:", error);
        Alert.alert("Erreur", "Impossible de charger vos données");
      } finally {
        setLoading(false);
      }
    } else {
      console.log("❌ Aucun utilisateur connecté");
      setLoading(false);
      // Rediriger vers la page de connexion si nécessaire
      // router.replace('/login');
    }
  });

  // Cleanup function
  return () => unsubscribe();
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
     
     // Refresh user data to get updated balance
     await refreshUserData();
     
     // Add notification
     addNotification(
       "Points gagnés!",
       `Vous avez gagné ${points} points en scannant un code QR`,
       "points"
     );
     
     setScreenLoading(false);
     setSuccessPoints(points);
     setSuccessMessage(`Félicitations ! Vous avez gagné ${points} points en scannant ce code QR.`);
     setShowSuccessModal(true);
     animateMoneyBag(); // Animate beztam when points are added
     
   } catch (error) {
     console.error("Erreur lors du scan du QR code:", error);
     setScreenLoading(false);
     setErrorMessage("Une erreur s'est produite lors du traitement du QR code. Veuillez réessayer.");
     setShowErrorModal(true);
   }
 };

 // Function to complete a game and add points
 const completeGame = async (gameType: string, score: number = 0) => {
   try {
     setScreenLoading(true);
     let points = 0;
     
     // Points for different game types
     switch(gameType) {
       case 'tetris':
       case 'snake':
       case 'memory':
         points = 20;
         break;
       case 'quiz':
         points = 10;
         break;
       case 'puzzle':
         points = 30;
         break;
       default:
         points = 15;
     }
     
     // Add bonus points for high scores
     if (score > 0) {
       points += Math.min(Math.floor(score/10), 20);
     }
     
     await addPoints(points, `Jeu: ${gameType}`);
     const newGamesCount = await updateGamesPlayed();
     
     // Refresh user data to get updated balance
     await refreshUserData();
     
     // Add notification
     const gameNames: {[key: string]: string} = {
       'tetris': 'Tetris',
       'snake': 'Snake',
       'memory': 'Memory',
       'quiz': 'Quiz',
       'puzzle': 'Puzzle'
     };
     
     addNotification(
       "Jeu terminé!",
       `Vous avez gagné ${points} points en jouant à ${gameNames[gameType] || gameType}`,
       "game"
     );
     
     animateMoneyBag(); // Animate beztam when points are added
     
     // Close game modals
     setShowTetrisModal(false);
     setShowMemoryGameModal(false);
     setShowSnakeGameModal(false);
     setShowQuizModal(false);
     setShowPuzzleModal(false);
     
     // Show success message
     Alert.alert(
       "Jeu Terminé!", 
       `Félicitations! Vous avez terminé ${gameNames[gameType] || gameType} et gagné ${points} points!`
     );
   } catch (error) {
     console.error(`Erreur lors du jeu ${gameType}:`, error);
     Alert.alert("Erreur", `Impossible de jouer à ${gameType} en ce moment`);
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
     
     // Refresh user data to get updated balance
     await refreshUserData();
     
     // Add notification
     addNotification(
       "Bonus quotidien réclamé!",
       `Vous avez reçu votre bonus quotidien de ${points} points`,
       "bonus"
     );
     
     animateMoneyBag(); // Animate beztam when points are added
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
      // Refresh user data to get updated balance
      await refreshUserData();
      
      // Add notification
      addNotification(
        "Vol enregistré!",
        `Vous avez gagné ${result.points} points pour votre vol ${flightId.toUpperCase()}`,
        "flight"
      );
      
      setScreenLoading(false);
      setSuccessPoints(result.points);
      setSuccessMessage(result.message);
      setShowSuccessModal(true);
      animateMoneyBag(); // Animate beztam when points are added
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
    
    // Refresh user data to get updated balance
    await refreshUserData();
    
    // Add notification
    addNotification(
      "Récompense réclamée!",
      `Vous avez réclamé "${selectedReward.title}" avec le code: ${accessCode}`,
      "reward"
    );
    
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
    
    // Refresh user data to get updated balance
    await refreshUserData();
    
    // Add notification
    addNotification(
      "Match acheté!",
      `Vous pouvez maintenant regarder ${match.teamA} vs ${match.teamB} avec le code: ${streamingCode}`,
      "match"
    );
    
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

// Show profile
const showProfile = () => {
  setShowMenuModal(false);
  setShowProfileModal(true);
};

// Change password
const handleChangePassword = async () => {
  if (newPassword !== confirmPassword) {
    Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
    return;
  }
  
  setScreenLoading(true);
  
  try {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error("User not authenticated");
    
    // Re-authenticate user
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    
    // Update password
    await updatePassword(user, newPassword);
    
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowChangePasswordModal(false);
    
    Alert.alert("Succès", "Votre mot de passe a été mis à jour avec succès");
  } catch (error) {
    console.error("Erreur lors du changement de mot de passe:", error);
    Alert.alert("Erreur", "Impossible de changer le mot de passe. Vérifiez votre mot de passe actuel.");
  } finally {
    setScreenLoading(false);
  }
};

// Delete account
const handleDeleteAccount = async () => {
  setScreenLoading(true);
  
  try {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error("User not authenticated");
    
    // Re-authenticate user
    const credential = EmailAuthProvider.credential(user.email, deleteAccountPassword);
    await reauthenticateWithCredential(user, credential);
    
    // Delete the user account
    await deleteUser(user);
    
    // Navigate to login
    router.replace('/');
  } catch (error) {
    console.error("Erreur lors de la suppression du compte:", error);
    Alert.alert("Erreur", "Impossible de supprimer le compte. Vérifiez votre mot de passe.");
  } finally {
    setScreenLoading(false);
    setDeleteAccountPassword('');
    setShowDeleteAccountModal(false);
  }
};

// Function to play the daily game - Chooses a random game from available games
const playDayGame = () => {
  setShowGamesModal(false);
  setShowMemoryGameModal(true);
};

// Function to play the quick quiz
const playQuickQuiz = async () => {
  setShowGamesModal(false);
  setShowQuizModal(true);
};

// Function to play the puzzle - Chooses a puzzle type
const playPuzzle = (puzzleType: string) => {
  setSelectedPuzzleType(puzzleType);
  setShowGamesModal(false);
  setShowPuzzleModal(true);
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
      
      <View style={styles.titleContainer}>
        <Text style={styles.appTitle}>Atlas Rewards</Text>
        <Text style={styles.proverbText}>اللي لعب على النية، خدا الهدية</Text>
      </View>
      
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
      
      {/* Points balance - Beztam (Moroccan money bag) */}
      <View style={styles.moneyBagContainer}>
        <View style={styles.moneyIconContainer}>
          <Animated.View style={[styles.moneyBag, { transform: [{ scale: moneyBagScale }] }]}>
            <Text style={styles.moneyBagSymbol}>Beztam</Text>
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
      
      {/* Flight ID Input Button */}
      <TouchableOpacity
        style={styles.flightButton}
        onPress={() => setShowFlightIdModal(true)}
      >
        <Ionicons name="airplane" size={32} color="#FFFFFF" />
        <Text style={styles.flightButtonText}>Entrer ID de vol</Text>
        <Text style={styles.flightButtonDescription}>Gagnez des points pour votre vol</Text>
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
      
      {/* Games & Challenges Button */}
      <TouchableOpacity
        style={styles.gamesButton}
        onPress={showGames}
      >
        <Ionicons name="game-controller" size={36} color="#FFFFFF" />
        <Text style={styles.gamesButtonText}>Jeux & Défis</Text>
        <Text style={styles.gamesDescription}>Jouez pour gagner plus de points</Text>
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
    
    {/* Modal for Tetris Game */}
    <Modal
      visible={showTetrisModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowTetrisModal(false)}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: 10,
          borderBottomWidth: 1,
          borderBottomColor: '#e0e0e0'
        }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Tetris</Text>
          <TouchableOpacity onPress={() => setShowTetrisModal(false)}>
            <Ionicons name="close" size={24} color="#c60c30" />
          </TouchableOpacity>
        </View>
        
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <TetrisGame onComplete={(score) => completeGame('tetris', score)} />
        </ScrollView>
      </SafeAreaView>
    </Modal>

    {/* Modal for Memory Game */}
    <Modal
      visible={showMemoryGameModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowMemoryGameModal(false)}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: 10,
          borderBottomWidth: 1,
          borderBottomColor: '#e0e0e0'
        }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Memory Game</Text>
          <TouchableOpacity onPress={() => setShowMemoryGameModal(false)}>
            <Ionicons name="close" size={24} color="#c60c30" />
          </TouchableOpacity>
        </View>
        
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <MemoryGame onComplete={(score) => completeGame('memory', score)} />
        </ScrollView>
      </SafeAreaView>
    </Modal> 
    
    {/* Modal for Snake Game */}
    <Modal
      visible={showSnakeGameModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowSnakeGameModal(false)}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: 10,
          borderBottomWidth: 1,
          borderBottomColor: '#e0e0e0'
        }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Snake Game</Text>
          <TouchableOpacity onPress={() => setShowSnakeGameModal(false)}>
            <Ionicons name="close" size={24} color="#c60c30" />
          </TouchableOpacity>
        </View>
        
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <SnakeGame onComplete={(score) => completeGame('snake', score)} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
    
    {/* Modal for Puzzle Game */}
    <Modal
      visible={showPuzzleModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowPuzzleModal(false)}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: 10,
          borderBottomWidth: 1,
          borderBottomColor: '#e0e0e0'
        }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            {selectedPuzzleType === 'slider' ? 'Slider Puzzle' : 
             selectedPuzzleType === 'jigsaw' ? 'Jigsaw Puzzle' : 'Word Puzzle'}
          </Text>
          <TouchableOpacity onPress={() => setShowPuzzleModal(false)}>
            <Ionicons name="close" size={24} color="#c60c30" />
          </TouchableOpacity>
        </View>
        
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <PuzzleGame onComplete={(score) => completeGame('puzzle', score)} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
    
    {/* Modal for Quiz */}
    <Modal
      visible={showQuizModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowQuizModal(false)}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: 10,
          borderBottomWidth: 1,
          borderBottomColor: '#e0e0e0'
        }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Quiz Rapide</Text>
          <TouchableOpacity onPress={() => setShowQuizModal(false)}>
            <Ionicons name="close" size={24} color="#c60c30" />
          </TouchableOpacity>
        </View>
        
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <QuizGame onComplete={(score) => completeGame('quiz', score)} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
    
    {/* Modal for user profile */}
    <Modal
      visible={showProfileModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowProfileModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Profil Utilisateur</Text>
            <TouchableOpacity onPress={() => setShowProfileModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.profileContent}>
            <View style={styles.profileAvatar}>
              <Ionicons name="person-circle" size={80} color="#c60c30" />
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userData.firstName} {userData.lastName}</Text>
              <Text style={styles.profileEmail}>{userData.email}</Text>
            </View>
            
            {/* User Information Section */}
            <View style={styles.userInfoSection}>
              <Text style={styles.sectionTitle}>Informations personnelles</Text>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Nom:</Text>
                <Text style={styles.infoValue}>{userData.firstName}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Prénom:</Text>
                <Text style={styles.infoValue}>{userData.lastName}</Text>
              </View>
              
              <View style={styles.infoItem}>
               <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{userData.email}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Téléphone:</Text>
                <Text style={styles.infoValue}>{userData.phone || "Non renseigné"}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Solde des points:</Text>
                <Text style={styles.infoValuePoints}>{userData.pointsBalance} milles</Text>
              </View>
            </View>
            
            <View style={styles.profileActions}>
              <TouchableOpacity 
                style={styles.profileActionButton}
                onPress={() => {
                  setShowProfileModal(false);
                  setShowChangePasswordModal(true);
                }}
              >
                <Ionicons name="key" size={24} color="#c60c30" />
                <Text style={styles.profileActionText}>Changer le mot de passe</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.profileActionButton}
                onPress={() => {
                  setShowProfileModal(false);
                  setShowDeleteAccountModal(true);
                }}
              >
                <Ionicons name="trash" size={24} color="#c60c30" />
                <Text style={styles.profileActionText}>Supprimer le compte</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
    
    {/* Modal for change password */}
    <Modal
      visible={showChangePasswordModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowChangePasswordModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Changer le mot de passe</Text>
            <TouchableOpacity onPress={() => setShowChangePasswordModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.formContainer}>
            <Text style={styles.formLabel}>Mot de passe actuel</Text>
            <TextInput 
              style={styles.formInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="Entrez votre mot de passe actuel"
            />
            
            <Text style={styles.formLabel}>Nouveau mot de passe</Text>
            <TextInput 
              style={styles.formInput}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Entrez votre nouveau mot de passe"
            />
            
            <Text style={styles.formLabel}>Confirmer mot de passe</Text>
            <TextInput 
              style={styles.formInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Confirmez votre nouveau mot de passe"
            />
            
            <TouchableOpacity
              style={styles.formSubmitButton}
              onPress={handleChangePassword}
              disabled={!currentPassword || !newPassword || !confirmPassword}
            >
              <Text style={styles.formSubmitButtonText}>CHANGER MOT DE PASSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    
    {/* Modal for delete account */}
    <Modal
      visible={showDeleteAccountModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowDeleteAccountModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Supprimer le compte</Text>
            <TouchableOpacity onPress={() => setShowDeleteAccountModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.formContainer}>
            <Text style={styles.deleteAccountWarning}>
              Attention: Cette action est irréversible. Toutes vos données, y compris votre profil, vos points et votre historique seront définitivement supprimés.
            </Text>
            
            <Text style={styles.formLabel}>Mot de passe</Text>
            <TextInput 
              style={styles.formInput}
              value={deleteAccountPassword}
              onChangeText={setDeleteAccountPassword}
              secureTextEntry
              placeholder="Entrez votre mot de passe pour confirmer"
            />
            
            <TouchableOpacity
              style={styles.deleteAccountButton}
              onPress={handleDeleteAccount}
              disabled={!deleteAccountPassword}
            >
              <Text style={styles.deleteAccountButtonText}>SUPPRIMER MON COMPTE</Text>
            </TouchableOpacity>
          </View>
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
                    {item.type === 'points' && <Ionicons name="star" size={24} color="#FFD700" />}
                    {item.type === 'flight' && <Ionicons name="airplane" size={24} color="#1976D2" />}
                    {item.type === 'reward' && <Ionicons name="trophy" size={24} color="#FF6F00" />}
                    {item.type === 'match' && <Ionicons name="football" size={24} color="#006400" />}
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
          activeOpacity={1}
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
              onPress={showProfile}
            >
              <Ionicons name="person" size={24} color="#c60c30" />
              <Text style={styles.menuItemText}>Mon Profil</Text>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
            
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
              <Text style={styles.gameDescription}>Memory Game - Retournez les cartes pour gagner des points bonus</Text>
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
              onPress={() => playPuzzle('slider')}
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
  backgroundColor: 'linear-gradient(to bottom, #ffffff, #c60c30)',
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
titleContainer: {
  alignItems: 'center',
},
appTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#c60c30',
},
proverbText: {
  fontSize: 12,
  color: '#666',
  marginTop: 2,
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

// Styles pour le beztam (sac d'argent marocain) sans les dollars
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
  backgroundColor: '#8B4513', // Couleur marron pour le beztam (sac marocain)
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: '#A0522D',
},
moneyBagSymbol: {
  fontSize: 12,
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

// Styles pour le bouton Flight ID
flightButton: {
  backgroundColor: '#1976D2', // Bleu pour le thème avion
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
flightButtonText: {
  color: '#fff',
  fontSize: 18,
  fontWeight: 'bold',
  marginTop: 10,
},
flightButtonDescription: {
  color: '#ddd',
  fontSize: 14,
  marginTop: 5,
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

// Styles pour le bouton Jeux & Défis
gamesButton: {
  backgroundColor: '#9C27B0', // Violet pour les jeux
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
gamesButtonText: {
  color: '#fff',
  fontSize: 18,
  fontWeight: 'bold',
  marginTop: 10,
},
gamesDescription: {
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
  borderRadius: 5,
  maxHeight: '100%',
  margin: 5,
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

// Styles pour le profil
profileContent: {
 padding: 20,
},
profileAvatar: {
 alignSelf: 'center',
 marginBottom: 20,
},
profileInfo: {
 alignItems: 'center',
 marginBottom: 30,
},
profileName: {
 fontSize: 24,
 fontWeight: 'bold',
 color: '#333',
 marginBottom: 5,
},
profileEmail: {
 fontSize: 16,
 color: '#666',
},
userInfoSection: {
 marginBottom: 30,
},
sectionTitle: {
 fontSize: 18,
 fontWeight: 'bold',
 color: '#333',
 marginBottom: 15,
},
infoItem: {
 flexDirection: 'row',
 justifyContent: 'space-between',
 alignItems: 'center',
 paddingVertical: 10,
 borderBottomWidth: 1,
 borderBottomColor: '#f0f0f0',
},
infoLabel: {
 fontSize: 16,
 color: '#666',
 fontWeight: '500',
},
infoValue: {
 fontSize: 16,
 color: '#333',
 fontWeight: 'bold',
},
infoValuePoints: {
 fontSize: 16,
 color: '#c60c30',
 fontWeight: 'bold',
},
profileActions: {
 width: '100%',
},
profileActionButton: {
 flexDirection: 'row',
 alignItems: 'center',
 paddingVertical: 15,
 borderBottomWidth: 1,
 borderBottomColor: '#e0e0e0',
},
profileActionText: {
 fontSize: 16,
 color: '#333',
 marginLeft: 15,
},

// Styles pour les formulaires
formContainer: {
 padding: 20,
},
formLabel: {
 fontSize: 16,
 color: '#333',
 marginBottom: 5,
},
formInput: {
 borderWidth: 1,
 borderColor: '#ddd',
 borderRadius: 5,
 padding: 10,
 marginBottom: 20,
 fontSize: 16,
},
formSubmitButton: {
 backgroundColor: '#c60c30',
 padding: 15,
 borderRadius: 5,
 alignItems: 'center',
},
formSubmitButtonText: {
 color: '#fff',
 fontWeight: 'bold',
},
deleteAccountWarning: {
 color: '#F44336',
 fontSize: 16,
 marginBottom: 20,
 textAlign: 'center',
},
deleteAccountButton: {
 backgroundColor: '#F44336',
 padding: 15,
 borderRadius: 5,
 alignItems: 'center',
},
deleteAccountButtonText: {
 color: '#fff',
 fontWeight: 'bold',
},

// Styles pour les notifications et l'historique
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

// Styles pour le menu latéral
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
 width: '80%',
 backgroundColor: '#fff',
 height: '100%',
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
 position: 'absolute',
 bottom: 20,
 left: 0,
 right: 0,
},
logoutButtonText: {
 color: '#fff',
 fontWeight: 'bold',
 marginLeft: 10,
},

// Styles pour les modales de succès et d'erreur
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

// Styles pour la section programme
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

// Styles pour le centre juridique
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

// Styles pour les matchs et récompenses
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
 backgroundColor: '#006400', 
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

// Styles pour l'entrée de l'ID de vol
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
placeholder: {
 width: 28,
}
});