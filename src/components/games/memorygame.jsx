import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

// Calculer la taille des cartes en fonction de la largeur de l'écran
const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 80) / 4; // Divise l'espace disponible en 4 colonnes avec de la marge

const MemoryGame = ({ onComplete }) => {
  const [cards, setCards] = useState([]);
  const [flippedIndexes, setFlippedIndexes] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [theme, setTheme] = useState('maroc');

  // Thèmes disponibles
  const themes = {
    'maroc': [
      'drapeau', 'mosquee', 'palmier', 'chameau', 
      'theiere', 'babouche', 'tajine', 'medina'
    ],
    'football': [
      'ballon', 'maillot', 'stade', 'coupe', 
      'sifflet', 'gants', 'but', 'joueur'
    ],
    'ram': [
      'avion', 'pilote', 'hotesse', 'bagages', 
      'billet', 'passport', 'terminal', 'cockpit'
    ]
  };

  // Initialiser le jeu
  useEffect(() => {
    initGame();
  }, []);

  // Initialiser le jeu avec des cartes mélangées
  const initGame = () => {
    const themeItems = themes[theme] || themes['maroc'];
    let cardPairs = [];
    
    // Créer une paire pour chaque élément du thème
    for (let i = 0; i < themeItems.length; i++) {
      cardPairs.push({
        id: i,
        value: themeItems[i],
        flipped: false,
        matched: false
      });
      
      cardPairs.push({
        id: i + themeItems.length,
        value: themeItems[i],
        flipped: false,
        matched: false
      });
    }
    
    // Mélanger les cartes
    shuffleCards(cardPairs);
  };

  // Mélanger les cartes
  const shuffleCards = (cards) => {
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setCards(shuffled);
    setFlippedIndexes([]);
    setMatchedPairs([]);
    setMoves(0);
    setScore(0);
  };

  // Retourner une carte
  const flipCard = (index) => {
    // Ne rien faire si la carte est déjà retournée ou si c'est une paire déjà trouvée
    if (flippedIndexes.length === 2 || cards[index].flipped || matchedPairs.includes(cards[index].value)) {
      return;
    }

    // Mettre à jour l'état des cartes retournées
    const newCards = [...cards];
    newCards[index].flipped = true;
    setCards(newCards);
    
    // Ajouter l'index à la liste des cartes retournées
    const newFlipped = [...flippedIndexes, index];
    setFlippedIndexes(newFlipped);
    
    // Si c'est la deuxième carte retournée
    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      
      // Vérifier si les cartes correspondent
      const firstCardIndex = newFlipped[0];
      const secondCardIndex = newFlipped[1];
      
      if (cards[firstCardIndex].value === cards[secondCardIndex].value) {
        // Match trouvé
        setMatchedPairs(prev => [...prev, cards[firstCardIndex].value]);
        setScore(prev => prev + 20);
        setFlippedIndexes([]);
        
        // Vérifier si le jeu est terminé
        if (matchedPairs.length + 1 === cards.length / 2) {
          // Attendre un peu avant de notifier que le jeu est terminé
          setTimeout(() => {
            if (onComplete) {
              onComplete(score + 20);
            }
          }, 1000);
        }
      } else {
        // Pas de match, retourner les cartes après un délai
        setTimeout(() => {
          const resetCards = [...cards];
          resetCards[firstCardIndex].flipped = false;
          resetCards[secondCardIndex].flipped = false;
          setCards(resetCards);
          setFlippedIndexes([]);
        }, 1000);
        
        // Petite pénalité pour un mauvais match
        setScore(prev => Math.max(0, prev - 5));
      }
    }
  };

  // Afficher les statistiques du jeu
  const renderStats = () => (
    <View style={styles.statsContainer}>
      <Text style={styles.statsText}>Score: {score}</Text>
      <Text style={styles.statsText}>Mouvements: {moves}</Text>
      <Text style={styles.statsText}>Paires: {matchedPairs.length} / {cards.length / 2}</Text>
      <Text style={styles.themeText}>Thème: {theme.charAt(0).toUpperCase() + theme.slice(1)}</Text>
    </View>
  );

  // Afficher les cartes
  const renderCards = () => (
    <View style={styles.cardsContainer}>
      {cards.map((card, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.card,
            card.flipped || matchedPairs.includes(card.value) ? styles.cardFlipped : {}
          ]}
          onPress={() => flipCard(index)}
          disabled={card.flipped || matchedPairs.includes(card.value)}
        >
          <Text style={styles.cardText}>
            {card.flipped || matchedPairs.includes(card.value) ? card.value : '?'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {renderStats()}
      {renderCards()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  statsText: {
    fontSize: 14,
    color: '#333',
  },
  themeText: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    margin: 5,
    backgroundColor: '#c60c30',  // Rouge RAM
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFlipped: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#c60c30',
  },
  cardText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default MemoryGame;