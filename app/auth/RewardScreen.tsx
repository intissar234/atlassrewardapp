import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Animated,
  Dimensions,
  SafeAreaView,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../src/config/firebase';
import { I18n } from 'i18n-js';
const i18n = new I18n();
const { width } = Dimensions.get('window');

// Type pour les récompenses
interface Reward {
  id: string;
  title: string;
  description: string;
  pointsRequired: number;
  image: string;
  category: string;
}

interface RewardScreenProps {
  visible: boolean;
  userData: {
    pointsBalance: number;
  };
  updateUserBalance: (newBalance: number) => void;
  onClose: () => void;
}

const RewardScreen: React.FC<RewardScreenProps> = ({ visible, userData, updateUserBalance, onClose }) => {
  const [activeTab, setActiveTab] = useState<'spend' | 'earn'>('spend');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [screenLoading, setScreenLoading] = useState<boolean>(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [showRewardDetailsModal, setShowRewardDetailsModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [rewardClaimed, setRewardClaimed] = useState<string>('');
  const [flightId, setFlightId] = useState<string>('');
  const [showQRInfoModal, setShowQRInfoModal] = useState<boolean>(false);
  
  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // Références pour les animations de confettis
  const confettiAnimations = useRef([...Array(30)].map(() => ({
    position: new Animated.ValueXY({ x: 0, y: 0 }),
    opacity: new Animated.Value(0),
    scale: new Animated.Value(0),
    rotate: new Animated.Value(0),
  }))).current;

  // Base de données des IDs de vol valides (à synchroniser avec Firebase plus tard)
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

  // Données de récompenses
  const rewards: Reward[] = [
    {
      id: '1',
      title: 'Salon VIP',
      description: 'Accès exclusif au salon VIP de RAM dans tous les aéroports pendant 1 an',
      pointsRequired: 1000,
      image: 'salon',
      category: 'airport'
    },
    {
      id: '2',
      title: 'Bagage Supplémentaire',
      description: 'Un bagage supplémentaire gratuit sur votre prochain vol',
      pointsRequired: 500,
      image: 'baggage',
      category: 'flight'
    },
    {
      id: '3',
      title: 'Surclassement',
      description: 'Surclassement en classe supérieure sur votre prochain vol long-courrier',
      pointsRequired: 1500,
      image: 'upgrade',
      category: 'flight'
    },
    {
      id: '4',
      title: 'Billet Match CAN',
      description: 'Un billet pour un match de votre choix lors de la CAN 2025',
      pointsRequired: 2000,
      image: 'ticket',
      category: 'can'
    },
    {
      id: '5',
      title: 'Accès Zones Exclusives',
      description: 'Meet & greet avec anciens joueurs ou influenceurs sportifs, accès backstage au stade',
      pointsRequired: 3000,
      image: 'vip',
      category: 'can'
    },
    {
      id: '6',
      title: 'Pack Supporter Exclusif',
      description: 'T-shirt, casquette, drapeau et bracelet de votre équipe préférée + sac à dos collector CAN 2025',
      pointsRequired: 1200,
      image: 'pack',
      category: 'can'
    },
    {
      id: '7',
      title: 'Carte SIM + Internet gratuit',
      description: 'SIM locale avec 10 Go offerts pour rester connecté pendant la CAN 2025',
      pointsRequired: 800,
      image: 'sim',
      category: 'special'
    },
    {
      id: '8',
      title: 'Repas Gratuit à Bord',
      description: 'Un repas gratuit pour votre prochain vol long-courrier',
      pointsRequired: 300,
      image: 'food',
      category: 'flight'
    },
    {
      id: '9',
      title: 'Embarquement Prioritaire',
      description: 'Embarquement prioritaire sur vos 5 prochains vols',
      pointsRequired: 400,
      image: 'priority',
      category: 'airport'
    },
    {
      id: '10',
      title: 'Tour de Casablanca',
      description: 'Une visite guidée de Casablanca pour 2 personnes',
      pointsRequired: 1800,
      image: 'tour',
      category: 'special'
    },
  ];

  // Animation pour changer d'onglet
  useEffect(() => {
    Animated.parallel([
      Animated.timing(tabIndicatorAnim, {
        toValue: activeTab === 'spend' ? 0 : 1,
        duration: 300,
        useNativeDriver: false
      }),
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true
        })
      ])
    ]).start();
  }, [activeTab]);

  // Récupérer les catégories uniques des récompenses
  const categories = ['all', ...new Set(rewards.map(reward => reward.category))];

  // Fonction pour filtrer les récompenses selon la catégorie active
  const getFilteredRewards = () => {
    if (activeCategory === 'all') return rewards;
    return rewards.filter(reward => reward.category === activeCategory);
  };

    // Animation de confettis pour le succès
  const animateConfetti = () => {
    confettiAnimations.forEach((confetti, index) => {
      const delay = Math.random() * 500;
      const duration = 1500 + Math.random() * 1000;
      const randomX = width / 2 - 150 + Math.random() * 300;
      const randomDestX = randomX + (-100 + Math.random() * 200);
      
      confetti.position.setValue({ 
        x: randomX, 
        y: 100 
      });
      
      Animated.parallel([
        Animated.timing(confetti.position.y, {
          toValue: 400 + Math.random() * 200,
          duration,
          useNativeDriver: true,
          delay
        }),
        Animated.timing(confetti.position.x, {
          toValue: randomDestX,
          duration,
          useNativeDriver: true,
          delay
        }),
        Animated.timing(confetti.opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          delay
        }),
        Animated.timing(confetti.scale, {
          toValue: 0.5 + Math.random() * 1,
          duration: 300,
          useNativeDriver: true,
          delay
        }),
        Animated.timing(confetti.rotate, {
          toValue: Math.random() * 10,
          duration,
          useNativeDriver: true,
          delay
        }),
        Animated.sequence([
          Animated.delay(delay + duration - 300),
          Animated.timing(confetti.opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true
          })
        ])
      ]).start();
    });
  };

  // Fonction pour afficher les détails d'une récompense
  const showRewardDetails = (reward: Reward) => {
    if (userData.pointsBalance < reward.pointsRequired) {
      Alert.alert(
        i18n.t('rewards.insufficientPoints'),
        i18n.t('rewards.insufficientPointsMessage', {
          required: reward.pointsRequired,
          missing: reward.pointsRequired - userData.pointsBalance
        })
      );
      return;
    }
    
    // Animation de pulsation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true
      })
    ]).start();
    
    setSelectedReward(reward);
    setShowRewardDetailsModal(true);
  };
  
  // Fonction pour réclamer une récompense
  const claimReward = async () => {
    if (!selectedReward) return;
    
    setShowRewardDetailsModal(false);
    setScreenLoading(true);
    
    try {
      // Vérifier si l'utilisateur a assez de points
      if (userData.pointsBalance < selectedReward.pointsRequired) {
        setScreenLoading(false);
        Alert.alert(
          i18n.t('rewards.insufficientPoints'),
          i18n.t('rewards.insufficientPointsMessage', {
            required: selectedReward.pointsRequired,
            missing: selectedReward.pointsRequired - userData.pointsBalance
          })
        );
        return;
      }
      
      // Générer un code d'accès unique
      const accessCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Déduire les points du solde de l'utilisateur
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      
      // Mise à jour du solde dans Firestore
      await updateDoc(doc(db, "users", user.uid), {
        pointsBalance: increment(-selectedReward.pointsRequired),
        updatedAt: serverTimestamp()
      });
      
      // Enregistrer la réclamation de récompense
      try {
        await addDoc(collection(db, "claimedRewards"), {
          userId: user.uid,
          rewardId: selectedReward.id,
          rewardTitle: selectedReward.title,
          pointsSpent: selectedReward.pointsRequired,
          accessCode: accessCode,
          claimedAt: serverTimestamp(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 jours d'expiration
        });
      } catch (error) {
        console.error("Erreur lors de l'enregistrement de la récompense réclamée:", error);
      }
      
      // Enregistrer dans l'historique des points
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
      
      // Mise à jour du solde local via la fonction de callback
      updateUserBalance(userData.pointsBalance - selectedReward.pointsRequired);
      
      setScreenLoading(false);
      setRewardClaimed(selectedReward.title);
      setSuccessMessage(`Félicitations ! Vous avez réclamé "${selectedReward.title}". Votre code d'accès est: ${accessCode}`);
      setShowSuccessModal(true);
      
      // Lancer l'animation de confettis
      animateConfetti();
    } catch (error) {
      console.error("Erreur lors de la réclamation de la récompense:", error);
      setScreenLoading(false);
      Alert.alert(
        "Erreur",
        "Une erreur s'est produite lors de la réclamation de la récompense. Veuillez réessayer plus tard."
      );
    }
  };

  // Fonction pour vérifier un ID de vol
  const verifyFlightId = async (flightId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      
      // Trim et mise en majuscules de l'ID de vol pour une comparaison cohérente
      const formattedFlightId = flightId.trim().toUpperCase();
      
      // Vérifier si l'ID existe dans notre liste prédéfinie
      if (!VALID_FLIGHT_IDS.includes(formattedFlightId)) {
        return { isValid: false, points: 0, message: i18n.t('flightId.invalidError') };
      }
      
      // Vérifier si cet utilisateur a déjà réclamé ce vol
      try {
        // Essayer de rechercher dans la collection claimedFlights
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
      }
      
      // Le vol est valide et n'a pas encore été réclamé
      // Calculer les points en fonction de l'ID du vol
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
      
      // Enregistrer que cet utilisateur a réclamé ce vol dans Firebase
      await addDoc(collection(db, "claimedFlights"), {
        userId: user.uid,
        flightId: formattedFlightId,
        points: earnedPoints,
        claimedAt: serverTimestamp()
      });
      
      // Ajouter les points au solde de l'utilisateur dans Firebase
      await updateDoc(doc(db, "users", user.uid), {
        pointsBalance: increment(earnedPoints),
        updatedAt: serverTimestamp()
      });
      
      // Enregistrer dans l'historique des points
      await addDoc(collection(db, "pointsHistory"), {
        userId: user.uid,
        points: earnedPoints,
        source: `Vol ${formattedFlightId}`,
        timestamp: serverTimestamp()
      });
      
      return { 
        isValid: true, 
        points: earnedPoints,
        message: i18n.t('flightId.success', { points: earnedPoints, id: formattedFlightId })
      };
    } catch (error) {
      console.error("Erreur lors de la vérification de l'ID de vol:", error);
      throw error;
    }
  };
  
  // Fonction pour soumettre l'ID de vol
  const submitFlightId = async () => {
    if (!flightId.trim()) {
      Alert.alert("Erreur", i18n.t('flightId.emptyError'));
      return;
    }
    
    setScreenLoading(true);
    
    try {
      // Vérifier l'ID de vol
      const result = await verifyFlightId(flightId);
      
      if (result.isValid) {
        // Mise à jour du solde local
        updateUserBalance(userData.pointsBalance + result.points);
        
        setScreenLoading(false);
        setSuccessMessage(result.message);
        setShowSuccessModal(true);
        
        // Lancer l'animation de confettis
        animateConfetti();
      } else {
        // ID de vol non valide
        setScreenLoading(false);
        Alert.alert("Erreur", result.message);
      }
      
      // Réinitialiser l'ID de vol
      setFlightId('');
    } catch (error) {
      console.error("Erreur lors de la vérification de l'ID de vol:", error);
      setScreenLoading(false);
      Alert.alert("Erreur", i18n.t('flightId.genericError'));
      setFlightId('');
    }
  };

  // Afficher les confettis pour le modal de succès
  const renderConfetti = () => {
    return confettiAnimations.map((confetti, index) => {
      const colors = ['#E30613', '#FFD700', '#4CAF50', '#03A9F4', '#9C27B0'];
      return (
        <Animated.View
          key={index}
          style={{
            position: 'absolute',
            width: 10,
            height: 10,
            backgroundColor: colors[index % colors.length],
            borderRadius: index % 2 === 0 ? 5 : 0,
            transform: [
              { translateX: confetti.position.x },
              { translateY: confetti.position.y },
              { scale: confetti.scale },
              { rotate: confetti.rotate.interpolate({
                  inputRange: [0, 10],
                  outputRange: ['0deg', '360deg']
                })
              }
            ],
            opacity: confetti.opacity,
            zIndex: 1100
          }}
        />
      );
    });
  };

  // Rendu du contenu pour dépenser des miles
  const renderSpendMilesContent = () => (
    <Animated.View 
      style={[
        { flex: 1 },
        { opacity: fadeAnim }
      ]}
    >
      <View style={styles.balanceHeader}>
        <Text style={styles.subtitle}>
          {i18n.t('rewards.yourBalance', { balance: userData.pointsBalance })}
        </Text>
      </View>
      
      <View style={styles.categoriesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScrollContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                activeCategory === category && styles.activeCategoryButton
              ]}
              onPress={() => setActiveCategory(category)}
            >
              <Text 
                style={[
                  styles.categoryButtonText,
                  activeCategory === category && styles.activeCategoryButtonText
                ]}
              >
                {category === 'all' ? 'Tous' :
                 category === 'flight' ? 'Vol' :
                 category === 'airport' ? 'Aéroport' :
                 category === 'can' ? 'CAN 2025' : 'Spécial'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <FlatList
        data={getFilteredRewards()}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.rewardsList}
        renderItem={({ item }) => (
          <Animated.View
            style={[
              { transform: [{ scale: selectedReward?.id === item.id ? scaleAnim : 1 }] }
            ]}
          >
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
                {item.image === 'food' && <Ionicons name="restaurant" size={36} color="#c60c30" />}
                {item.image === 'priority' && <Ionicons name="flag" size={36} color="#c60c30" />}
                {item.image === 'tour' && <Ionicons name="map" size={36} color="#c60c30" />}
              </View>
              <View style={styles.rewardInfo}>
                <Text style={styles.rewardTitle}>{item.title}</Text>
                <Text numberOfLines={2} style={styles.rewardDescription}>{item.description}</Text>
                
                <View style={styles.rewardCategoryBadge}>
                  <Text style={styles.rewardCategoryText}>
                    {item.category === 'flight' ? 'Vol' :
                     item.category === 'airport' ? 'Aéroport' :
                     item.category === 'can' ? 'CAN 2025' : 'Spécial'}
                  </Text>
                </View>
              </View>
              <View style={styles.rewardPoints}>
                <Text style={styles.rewardPointsText}>{item.pointsRequired}</Text>
                <Text style={styles.rewardPointsLabel}>points</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
      />
    </Animated.View>
  );

  // Rendu du contenu pour gagner des miles
  const renderEarnMilesContent = () => (
    <Animated.View 
      style={[
        { flex: 1 },
        { opacity: fadeAnim }
      ]}
    >
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.balanceHeader}>
          <Text style={styles.subtitle}>
            {i18n.t('rewards.yourBalance', { balance: userData.pointsBalance })}
          </Text>
        </View>
        
        <View style={styles.earnSection}>
          <LinearGradient
            colors={['#c60c30', '#8f0923']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.earnCard}
          >
            <Ionicons name="airplane" size={40} color="#FFFFFF" />
            <Text style={styles.earnCardTitle}>{i18n.t('rewards.addFlightId')}</Text>
            <Text style={styles.earnCardDescription}>
              {i18n.t('rewards.flightIdDesc')}
            </Text>
            
            <TextInput
              style={styles.flightIdInput}
              value={flightId}
              onChangeText={setFlightId}
              placeholder={i18n.t('flightId.placeholder')}
              placeholderTextColor="rgba(255,255,255,0.7)"
              autoCapitalize="characters"
            />
            
            <TouchableOpacity
              style={styles.submitButton}
              onPress={submitFlightId}
            >
              <Text style={styles.submitButtonText}>{i18n.t('common.submit')}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
        
        <View style={styles.earnSection}>
          <TouchableOpacity 
            style={styles.qrCodeCard}
            onPress={() => setShowQRInfoModal(true)}
          >
            <View style={styles.qrIconContainer}>
              <Ionicons name="qr-code" size={60} color="#000000" />
            </View>
            <Text style={styles.qrCardTitle}>{i18n.t('rewards.scanQR')}</Text>
            <Text style={styles.qrCardDescription}>
              {i18n.t('rewards.scanQRDesc')}
            </Text>
            
            <TouchableOpacity
              style={styles.qrCardButton}
              onPress={() => setShowQRInfoModal(true)}
            >
              <Text style={styles.qrCardButtonText}>{i18n.t('common.learn_more')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
        
        <View style={styles.earnSection}>
          <LinearGradient
            colors={['#4CAF50', '#2E7D32']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.earnCard}
          >
            <Ionicons name="game-controller" size={40} color="#FFFFFF" />
            <Text style={styles.earnCardTitle}>{i18n.t('rewards.games')}</Text>
            <Text style={styles.earnCardDescription}>
              {i18n.t('rewards.gamesDesc')}
            </Text>
            
            <TouchableOpacity
              style={styles.earnCardButton}
              onPress={() => {
                onClose();
                // Navigation vers GameScreen à implémenter
              }}
            >
              <Text style={styles.earnCardButtonText}>{i18n.t('rewards.playNow')}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
        
        <View style={styles.earnTips}>
          <Text style={styles.earnTipsTitle}>{i18n.t('rewards.tipTitle')}</Text>
          <View style={styles.tipItem}>
            <Ionicons name="time" size={20} color="#c60c30" />
            <Text style={styles.tipText}>Connectez-vous chaque jour pour recevoir votre bonus quotidien</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="calendar" size={20} color="#c60c30" />
            <Text style={styles.tipText}>Participez aux événements spéciaux de la CAN 2025 pour des points bonus</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="share-social" size={20} color="#c60c30" />
            <Text style={styles.tipText}>Partagez l'application avec vos amis pour gagner 100 points par parrainage</Text>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );

  // Animation pour l'indicateur d'onglet
  const tabIndicatorPosition = tabIndicatorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '50%']
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={['#FFFFFF', '#f9f7f5']}
          style={styles.gradient}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{i18n.t('rewards.title')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {/* Onglets */}
          <View style={styles.tabContainer}>
            <View style={styles.tabButtonsContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'spend' && styles.activeTab]}
                onPress={() => setActiveTab('spend')}
              >
                <Text style={[styles.tabText, activeTab === 'spend' && styles.activeTabText]}>
                  {i18n.t('rewards.spend')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'earn' && styles.activeTab]}
                onPress={() => setActiveTab('earn')}
              >
                <Text style={[styles.tabText, activeTab === 'earn' && styles.activeTabText]}>
                  {i18n.t('rewards.earn')}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Indicateur d'onglet animé */}
            <Animated.View 
              style={[
                styles.tabIndicator,
                { left: tabIndicatorPosition }
              ]}
            />
          </View>
          
          {/* Afficher le loading overlay si nécessaire */}
          {screenLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          )}
          
          {/* Contenu selon l'onglet actif */}
          {activeTab === 'spend' ? renderSpendMilesContent() : renderEarnMilesContent()}
          
          {/* Modal pour les détails de récompense */}
          <Modal
            visible={showRewardDetailsModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowRewardDetailsModal(false)}
          >
            {selectedReward && (
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{i18n.t('rewards.rewardDetails')}</Text>
                    <TouchableOpacity onPress={() => setShowRewardDetailsModal(false)}>
                      <Text style={styles.closeButtonSmall}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.rewardDetailImageContainer}>
                    <LinearGradient
                      colors={['#f8f9fa', '#e9ecef']}
                      style={styles.rewardDetailImageGradient}
                    >
                      {selectedReward.image === 'salon' && <Ionicons name="business" size={80} color="#c60c30" />}
                      {selectedReward.image === 'baggage' && <Ionicons name="briefcase" size={80} color="#c60c30" />}
                      {selectedReward.image === 'upgrade' && <Ionicons name="arrow-up-circle" size={80} color="#c60c30" />}
                      {selectedReward.image === 'ticket' && <Ionicons name="ticket" size={80} color="#c60c30" />}
                      {selectedReward.image === 'vip' && <Ionicons name="people" size={80} color="#c60c30" />}
                      {selectedReward.image === 'pack' && <Ionicons name="shirt" size={80} color="#c60c30" />}
                      {selectedReward.image === 'sim' && <Ionicons name="phone-portrait" size={80} color="#c60c30" />}
                      {selectedReward.image === 'food' && <Ionicons name="restaurant" size={80} color="#c60c30" />}
                      {selectedReward.image === 'priority' && <Ionicons name="flag" size={80} color="#c60c30" />}
                      {selectedReward.image === 'tour' && <Ionicons name="map" size={80} color="#c60c30" />}
                    </LinearGradient>
                  </View>
                  
                  <Text style={styles.rewardDetailTitle}>{selectedReward.title}</Text>
                  <Text style={styles.rewardDetailDescription}>{selectedReward.description}</Text>
                  
                  <View style={styles.rewardDetailPointsContainer}>
                    <Text style={styles.rewardDetailPointsLabel}>{i18n.t('rewards.pointsRequired')}</Text>
                    <Text style={styles.rewardDetailPointsValue}>{selectedReward.pointsRequired}</Text>
                  </View>
                  
                  <Text style={styles.rewardDetailInfo}>
                    {i18n.t('rewards.currentBalance', { balance: userData.pointsBalance })}
                  </Text>
                  
                  <TouchableOpacity
                    style={styles.claimRewardButton}
                    onPress={claimReward}
                  >
                    <Text style={styles.claimRewardButtonText}>{i18n.t('rewards.claimNow')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Modal>
          
          {/* Modal de succès */}
          <Modal
            visible={showSuccessModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowSuccessModal(false)}
          >
            <View style={styles.modalContainer}>
              {/* Confettis */}
              {renderConfetti()}
              
              <View style={styles.successModalContent}>
                <View style={styles.successIconContainer}>
                  <View style={styles.successIcon}>
                    <Text style={styles.successIconText}>✓</Text>
                  </View>
                </View>
                
                <Text style={styles.successTitle}>
                  {i18n.t('common.congratulations')}
                </Text>
                
                {rewardClaimed && (
                  <View>
                    <Text style={styles.successRewardText}>
                      {i18n.t('rewards.successClaim')}
                    </Text>
                    <Text style={styles.claimedRewardName}>{rewardClaimed}</Text>
                  </View>
                )}
                
                <Text style={styles.successMessageText}>{successMessage}</Text>
                
                <TouchableOpacity
                  style={styles.okButton}
                  onPress={() => {
                    setShowSuccessModal(false);
                    setSuccessMessage('');
                    setRewardClaimed('');
                  }}
                >
                  <Text style={styles.okButtonText}>{i18n.t('common.ok')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Modal pour information QR Code */}
          <Modal
            visible={showQRInfoModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowQRInfoModal(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{i18n.t('rewards.scanQR')}</Text>
                  <TouchableOpacity onPress={() => setShowQRInfoModal(false)}>
                    <Text style={styles.closeButtonSmall}>✕</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.qrInfoIconContainer}>
                  <Ionicons name="qr-code" size={100} color="#000000" />
                </View>
                
                <Text style={styles.qrInfoTitle}>{i18n.t('rewards.qrHowTo')}</Text>
                
                <View style={styles.qrInfoStep}>
                  <View style={styles.qrInfoStepNumber}>
                    <Text style={styles.qrInfoStepNumberText}>1</Text>
                  </View>
                  <Text style={styles.qrInfoStepText}>
                    Repérez les affiches "Atlas Rewards" dans les aéroports Royal Air Maroc
                  </Text>
                </View>
                
                <View style={styles.qrInfoStep}>
                  <View style={styles.qrInfoStepNumber}>
                    <Text style={styles.qrInfoStepNumberText}>2</Text>
                  </View>
                  <Text style={styles.qrInfoStepText}>
                    Ouvrez l'application et appuyez sur "Scanner un QR Code"
                  </Text>
                </View>
                
                <View style={styles.qrInfoStep}>
                  <View style={styles.qrInfoStepNumber}>
                    <Text style={styles.qrInfoStepNumberText}>3</Text>
                  </View>
                  <Text style={styles.qrInfoStepText}>
                    Pointez votre appareil vers le QR code pour le scanner
                  </Text>
                </View>
                
                <View style={styles.qrInfoStep}>
                  <View style={styles.qrInfoStepNumber}>
                    <Text style={styles.qrInfoStepNumberText}>4</Text>
                  </View>
                  <Text style={styles.qrInfoStepText}>
                    Recevez instantanément des points bonus sur votre compte!
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={styles.qrScanButton}
                  onPress={() => {
                    setShowQRInfoModal(false);
                    // Fonction pour scanner un QR code à implémenter
                    Alert.alert("Scanner un QR Code", "Fonctionnalité à venir ! Scannez les codes QR pour gagner des points.");
                  }}
                >
                  <Text style={styles.qrScanButtonText}>{i18n.t('rewards.scanNow')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </LinearGradient>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#999',
  },
  closeButtonSmall: {
    fontSize: 20,
    color: '#999',
    padding: 5,
  },
  tabContainer: {
    position: 'relative',
    backgroundColor: '#f8f9fa',
    borderRadius: 30,
    margin: 16,
    marginTop: 8,
    height: 50,
  },
  tabButtonsContainer: {
    flexDirection: 'row',
    height: '100%',
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  activeTab: {
    // Style handled by indicator
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  tabIndicator: {
    position: 'absolute',
    width: '50%',
    height: '100%',
    backgroundColor: '#c60c30',
    borderRadius: 30,
    zIndex: 1,
  },
  balanceHeader: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  categoriesContainer: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoriesScrollContent: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activeCategoryButton: {
    backgroundColor: '#c60c30',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
  },
  activeCategoryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  rewardsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  rewardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  rewardImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f2f2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  rewardCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  rewardCategoryText: {
    fontSize: 10,
    color: '#666',
  },
  rewardPoints: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  rewardPointsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#c60c30',
  },
  rewardPointsLabel: {
    fontSize: 12,
    color: '#666',
  },
  disabledReward: {
    opacity: 0.6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  rewardDetailImageContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  rewardDetailImageGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardDetailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  rewardDetailDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  rewardDetailPointsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  rewardDetailPointsLabel: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  rewardDetailPointsValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#c60c30',
  },
  rewardDetailInfo: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  claimRewardButton: {
    backgroundColor: '#c60c30',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  claimRewardButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  successModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '85%',
    maxWidth: 340,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  successRewardText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  claimedRewardName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#c60c30',
    marginVertical: 8,
    textAlign: 'center',
  },
  successMessageText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 22,
  },
  okButton: {
    backgroundColor: '#c60c30',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
    marginTop: 8,
  },
  okButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  earnSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  earnCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  earnCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
  },
  earnCardDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.9,
    lineHeight: 20,
  },
  flightIdInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  submitButtonText: {
    color: '#c60c30',
    fontWeight: 'bold',
    fontSize: 16,
  },
  qrCodeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  qrIconContainer: {
    width: 120,
    height: 120,
    backgroundColor: '#f9f9f9',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  qrCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  qrCardDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  qrCardButton: {
    backgroundColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  qrCardButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  earnCardButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  earnCardButtonText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 16,
  },
  earnTips: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 20,
  },
  earnTipsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tipText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  qrInfoIconContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  qrInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  qrInfoStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  qrInfoStepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#c60c30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  qrInfoStepNumberText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  qrInfoStepText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    paddingTop: 5,
    lineHeight: 20,
  },
  qrScanButton: {
    backgroundColor: '#c60c30',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  qrScanButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default RewardScreen;