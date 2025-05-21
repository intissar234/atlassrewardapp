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

// Jeux du jour - Tetris implémentation
const tetrisGame = `
class Tetris {
  constructor(width = 10, height = 20) {
    this.width = width;
    this.height = height;
    this.grid = this.createGrid();
    this.shapes = [
      [[1, 1, 1, 1]],                            // I
      [[1, 1], [1, 1]],                          // O
      [[0, 1, 0], [1, 1, 1]],                    // T
      [[1, 0], [1, 0], [1, 1]],                  // L
      [[0, 1], [0, 1], [1, 1]],                  // J
      [[1, 1, 0], [0, 1, 1]],                    // Z
      [[0, 1, 1], [1, 1, 0]]                     // S
    ];
    this.colors = ['cyan', 'yellow', 'purple', 'orange', 'blue', 'red', 'green'];
    this.currentShape = null;
    this.currentColor = null;
    this.currentPosition = { x: 0, y: 0 };
    this.score = 0;
    this.gameOver = false;
    this.nextShape = null;
    this.nextColor = null;
    this.createNewShape();
  }

  createGrid() {
    return Array(this.height).fill().map(() => Array(this.width).fill(0));
  }

  createNewShape() {
    if (this.nextShape === null) {
      const randomIndex = Math.floor(Math.random() * this.shapes.length);
      this.nextShape = this.shapes[randomIndex];
      this.nextColor = this.colors[randomIndex];
    }
    
    this.currentShape = this.nextShape;
    this.currentColor = this.nextColor;
    
    const randomIndex = Math.floor(Math.random() * this.shapes.length);
    this.nextShape = this.shapes[randomIndex];
    this.nextColor = this.colors[randomIndex];
    
    // Position la pièce au milieu en haut
    this.currentPosition = {
      x: Math.floor((this.width - this.currentShape[0].length) / 2),
      y: 0
    };
    
    // Vérifie si la pièce peut être placée (game over check)
    if (!this.isValidMove(this.currentPosition.x, this.currentPosition.y, this.currentShape)) {
      this.gameOver = true;
    }
  }

  isValidMove(x, y, shape = this.currentShape) {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const newX = x + col;
          const newY = y + row;
          
          // Vérification des bords et collision
          if (newX < 0 || newX >= this.width || newY >= this.height) {
            return false;
          }
          
          // Vérification de collision avec les pièces existantes
          if (newY >= 0 && this.grid[newY][newX]) {
            return false;
          }
        }
      }
    }
    return true;
  }

  moveLeft() {
    if (this.isValidMove(this.currentPosition.x - 1, this.currentPosition.y)) {
      this.currentPosition.x--;
      return true;
    }
    return false;
  }

  moveRight() {
    if (this.isValidMove(this.currentPosition.x + 1, this.currentPosition.y)) {
      this.currentPosition.x++;
      return true;
    }
    return false;
  }

  moveDown() {
    if (this.isValidMove(this.currentPosition.x, this.currentPosition.y + 1)) {
      this.currentPosition.y++;
      return true;
    }
    // La pièce ne peut pas descendre, on la fixe
    this.lockShape();
    return false;
  }

  rotateShape() {
    const newShape = [];
    for (let col = 0; col < this.currentShape[0].length; col++) {
      const newRow = [];
      for (let row = this.currentShape.length - 1; row >= 0; row--) {
        newRow.push(this.currentShape[row][col]);
      }
      newShape.push(newRow);
    }
    
    if (this.isValidMove(this.currentPosition.x, this.currentPosition.y, newShape)) {
      this.currentShape = newShape;
      return true;
    }
    return false;
  }

  lockShape() {
    for (let row = 0; row < this.currentShape.length; row++) {
      for (let col = 0; col < this.currentShape[row].length; col++) {
        if (this.currentShape[row][col]) {
          const gridY = this.currentPosition.y + row;
          const gridX = this.currentPosition.x + col;
          
          // Ignore les parties au-dessus de la grille
          if (gridY >= 0) {
            this.grid[gridY][gridX] = { value: 1, color: this.currentColor };
          }
        }
      }
    }
    
    this.clearRows();
    this.createNewShape();
  }

  clearRows() {
    let rowsCleared = 0;
    
    for (let row = 0; row < this.height; row++) {
      if (this.grid[row].every(cell => cell !== 0)) {
        // Supprime la ligne et ajoute une nouvelle ligne vide en haut
        this.grid.splice(row, 1);
        this.grid.unshift(Array(this.width).fill(0));
        rowsCleared++;
      }
    }
    
    // Mise à jour du score
    if (rowsCleared > 0) {
      // Points différents selon le nombre de lignes effacées
      const points = [0, 40, 100, 300, 1200][rowsCleared];
      this.score += points;
    }
  }

  hardDrop() {
    while (this.moveDown()) {
      // Continue à descendre jusqu'à ce que ça ne soit plus possible
    }
    return true;
  }

  getState() {
    return {
      grid: this.getGridWithCurrentShape(),
      score: this.score,
      nextShape: this.nextShape,
      nextColor: this.nextColor,
      gameOver: this.gameOver
    };
  }

  getGridWithCurrentShape() {
    // Crée une copie de la grille
    const gridCopy = this.grid.map(row => [...row]);
    
    // Ajoute la pièce courante
    for (let row = 0; row < this.currentShape.length; row++) {
      for (let col = 0; col < this.currentShape[row].length; col++) {
        if (this.currentShape[row][col]) {
          const gridY = this.currentPosition.y + row;
          const gridX = this.currentPosition.x + col;
          
          // Vérifie que la cellule est dans la grille
          if (gridY >= 0 && gridY < this.height && gridX >= 0 && gridX < this.width) {
            gridCopy[gridY][gridX] = { value: 1, color: this.currentColor, current: true };
          }
        }
      }
    }
    
    return gridCopy;
  }
}

// Start the game
const game = new Tetris();
`;

// Jeu du jour - Snake implémentation
const snakeGame = `
class Snake {
  constructor(width = 20, height = 20) {
    this.width = width;
    this.height = height;
    this.grid = this.createGrid();
    this.snake = [{x: 10, y: 10}]; // Position initiale du serpent
    this.direction = 'right';
    this.nextDirection = 'right';
    this.food = this.generateFood();
    this.score = 0;
    this.gameOver = false;
    this.speed = 150; // Vitesse initiale (milliseconds)
  }
  
  createGrid() {
    return Array(this.height).fill().map(() => Array(this.width).fill(0));
  }
  
  generateFood() {
    let food = {
      x: Math.floor(Math.random() * this.width),
      y: Math.floor(Math.random() * this.height)
    };
    
    // S'assurer que la nourriture n'apparaît pas sur le serpent
    while (this.snake.some(segment => segment.x === food.x && segment.y === food.y)) {
      food = {
        x: Math.floor(Math.random() * this.width),
        y: Math.floor(Math.random() * this.height)
      };
    }
    
    return food;
  }
  
  changeDirection(newDirection) {
    // Éviter de faire demi-tour
    const opposites = {
      'up': 'down',
      'down': 'up',
      'left': 'right',
      'right': 'left'
    };
    
    if (newDirection !== opposites[this.direction]) {
      this.nextDirection = newDirection;
    }
  }
  
  move() {
    if (this.gameOver) return false;
    
    // Mettre à jour la direction
    this.direction = this.nextDirection;
    
    // Calculer la nouvelle tête du serpent
    const head = {...this.snake[0]};
    
    switch(this.direction) {
      case 'up':
        head.y--;
        break;
      case 'down':
        head.y++;
        break;
      case 'left':
        head.x--;
        break;
      case 'right':
        head.x++;
        break;
    }
    
    // Vérifier les collisions avec les murs
    if (head.x < 0 || head.x >= this.width || head.y < 0 || head.y >= this.height) {
      this.gameOver = true;
      return false;
    }
    
    // Vérifier les collisions avec le serpent lui-même
    if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
      this.gameOver = true;
      return false;
    }
    
    // Ajouter la nouvelle tête
    this.snake.unshift(head);
    
    // Vérifier si le serpent a mangé la nourriture
    if (head.x === this.food.x && head.y === this.food.y) {
      // Augmenter le score
      this.score += 10;
      
      // Augmenter la vitesse
      this.speed = Math.max(50, this.speed - 5);
      
      // Générer une nouvelle nourriture
      this.food = this.generateFood();
    } else {
      // Retirer la queue si pas de nourriture mangée
      this.snake.pop();
    }
    
    return true;
  }
  
  getState() {
    // Créer une copie de la grille
    const gridCopy = this.createGrid();
    
    // Ajouter le serpent
    this.snake.forEach((segment, index) => {
      if (segment.y >= 0 && segment.y < this.height && segment.x >= 0 && segment.x < this.width) {
        gridCopy[segment.y][segment.x] = {
          value: index === 0 ? 2 : 1, // 2 pour la tête, 1 pour le corps
          type: index === 0 ? 'head' : 'body'
        };
      }
    });
    
    // Ajouter la nourriture
    if (this.food.y >= 0 && this.food.y < this.height && this.food.x >= 0 && this.food.x < this.width) {
      gridCopy[this.food.y][this.food.x] = {
        value: 3,
        type: 'food'
      };
    }
    
    return {
      grid: gridCopy,
      score: this.score,
      gameOver: this.gameOver,
      speed: this.speed
    };
  }
  
  restart() {
    this.snake = [{x: 10, y: 10}];
    this.direction = 'right';
    this.nextDirection = 'right';
    this.food = this.generateFood();
    this.score = 0;
    this.gameOver = false;
    this.speed = 150;
  }
}

// Start the game
const game = new Snake();
`;

// Jeu du jour - Memory Game implémentation
const memoryGame = `
class MemoryGame {
  constructor(theme = 'maroc', size = 4) { // taille de la grille: 4x4 = 16 cartes = 8 paires
    this.theme = theme;
    this.size = size;
    this.cards = [];
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.moves = 0;
    this.gameStarted = false;
    this.gameOver = false;
    this.score = 0;
    this.startTime = null;
    this.endTime = null;
    
    // Thèmes disponibles
    this.themes = {
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
    
    this.initGame();
  }
  
  initGame() {
    // Créer les paires de cartes
    const themeItems = this.themes[this.theme] || this.themes['maroc'];
    let cardPairs = [];
    
    // Crée une paire pour chaque élément du thème
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
    this.cards = this.shuffleCards(cardPairs);
  }
  
  shuffleCards(cards) {
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }
  
  flipCard(cardIndex) {
    // Vérifier si la partie est déjà terminée
    if (this.gameOver) return false;
    
    // Démarrer le chrono au premier coup
    if (!this.gameStarted) {
      this.gameStarted = true;
      this.startTime = new Date();
    }
    
    const card = this.cards[cardIndex];
    
    // Vérifier si la carte est déjà retournée ou déjà matchée
    if (card.flipped || card.matched) return false;
    
    // Vérifier si on a déjà retourné 2 cartes
    if (this.flippedCards.length === 2) return false;
    
    // Retourner la carte
    card.flipped = true;
    this.flippedCards.push(cardIndex);
    
    // Si c'est la deuxième carte retournée
    if (this.flippedCards.length === 2) {
      this.moves++;
      
      const card1 = this.cards[this.flippedCards[0]];
      const card2 = this.cards[this.flippedCards[1]];
      
      // Vérifier si les cartes correspondent
      if (card1.value === card2.value) {
        // Match trouvé
        card1.matched = true;
        card2.matched = true;
        this.matchedPairs++;
        this.flippedCards = [];
        
        // Calcul du score: bonus pour match trouvé
        this.score += 20;
        
        // Vérifier si le jeu est terminé
        if (this.matchedPairs === this.size * this.size / 2) {
          this.gameOver = true;
          this.endTime = new Date();
          
          // Bonus de score basé sur le temps et nombre de mouvements
          const timeBonus = Math.max(0, 100 - Math.floor((this.endTime - this.startTime) / 1000));
          const movesBonus = Math.max(0, 50 - (this.moves - this.size * this.size / 2) * 5);
          
          this.score += timeBonus + movesBonus;
        }
      } else {
        // Pas de match, on retournera les cartes après un délai
        // Dans une vraie implémentation, il y aurait un setTimeout
        // Pour les besoins de cette simulation, on retourne immédiatement
        
        // Légère pénalité pour erreur
        this.score = Math.max(0, this.score - 5);
        
        // Retourner les cartes
        setTimeout(() => {
          card1.flipped = false;
          card2.flipped = false;
          this.flippedCards = [];
        }, 1000);
      }
    }
    
    return true;
  }
  
  getState() {
    return {
      cards: this.cards,
      moves: this.moves,
      matchedPairs: this.matchedPairs,
      totalPairs: this.size * this.size / 2,
      gameOver: this.gameOver,
      score: this.score,
      theme: this.theme
    };
  }
  
  restart() {
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.moves = 0;
    this.gameStarted = false;
    this.gameOver = false;
    this.score = 0;
    this.startTime = null;
    this.endTime = null;
    
    // Réinitialiser les cartes
    this.initGame();
  }
  
  changeTheme(newTheme) {
    if (this.themes[newTheme]) {
      this.theme = newTheme;
      this.restart();
    }
  }
}

// Start the game
const game = new MemoryGame();
`;

// Puzzle - Slider Puzzle implémentation
const sliderPuzzleGame = `
class SliderPuzzle {
  constructor(size = 3) {
    this.size = size;
    this.grid = [];
    this.emptyTile = { row: size - 1, col: size - 1 };
    this.moves = 0;
    this.gameStarted = false;
    this.gameOver = false;
    this.score = 0;
    this.startTime = null;
    this.endTime = null;
    
    this.initPuzzle();
  }
  
  initPuzzle() {
    // Initialiser la grille résolue
    this.grid = [];
    for (let row = 0; row < this.size; row++) {
      const rowArray = [];
      for (let col = 0; col < this.size; col++) {
        // La dernière case est vide (0)
        if (row === this.size - 1 && col === this.size - 1) {
          rowArray.push(0);
        } else {
          rowArray.push(row * this.size + col + 1);
        }
      }
      this.grid.push(rowArray);
    }
    
    // Position de la case vide
    this.emptyTile = { row: this.size - 1, col: this.size - 1 };
    
    // Mélanger le puzzle
    this.shuffle();
  }
  shuffle() {
    // Nombre de mouvements aléatoires pour mélanger
    const numShuffles = this.size * this.size * 10;
    
    for (let i = 0; i < numShuffles; i++) {
      // Obtenir tous les mouvements possibles
      const possibleMoves = this.getPossibleMoves();
      
      // Sélectionner un mouvement aléatoire
      const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
      
      // Déplacer une tuile aléatoire
      this.moveTile(randomMove.row, randomMove.col);
    }
    
    // Réinitialiser les statistiques
    this.moves = 0;
    this.gameStarted = false;
    this.gameOver = false;
    this.score = 0;
    this.startTime = null;
    this.endTime = null;
  }
  
  getPossibleMoves() {
    const moves = [];
    
    // Vérifier les quatre directions
    const directions = [
      { row: -1, col: 0 }, // haut
      { row: 1, col: 0 },  // bas
      { row: 0, col: -1 }, // gauche
      { row: 0, col: 1 }   // droite
    ];
    
    for (const dir of directions) {
      const newRow = this.emptyTile.row + dir.row;
      const newCol = this.emptyTile.col + dir.col;
      
      // Vérifier si la nouvelle position est valide
      if (newRow >= 0 && newRow < this.size && newCol >= 0 && newCol < this.size) {
        moves.push({ row: newRow, col: newCol });
      }
    }
    
    return moves;
  }
  
  moveTile(row, col) {
    // Vérifier si le mouvement est valide
    if (!this.canMoveTile(row, col)) {
      return false;
    }
    
    // Commencer le chrono au premier mouvement
    if (!this.gameStarted) {
      this.gameStarted = true;
      this.startTime = new Date();
    }
    
    // Échanger la tuile avec la case vide
    const tileValue = this.grid[row][col];
    this.grid[row][col] = 0;
    this.grid[this.emptyTile.row][this.emptyTile.col] = tileValue;
    
    // Mettre à jour la position de la case vide
    this.emptyTile = { row, col };
    
    // Incrémenter le nombre de mouvements
    this.moves++;
    
    // Vérifier si le puzzle est résolu
    if (this.isSolved()) {
      this.gameOver = true;
      this.endTime = new Date();
      
      // Calculer le score
      const timeTaken = Math.floor((this.endTime - this.startTime) / 1000);
      const timeBonus = Math.max(0, 300 - timeTaken);
      const movesPenalty = Math.max(0, this.moves - (this.size * this.size));
      
      this.score = 1000 + timeBonus - movesPenalty * 5;
    }
    
    return true;
  }
  
  canMoveTile(row, col) {
    // Vérifier si la tuile est adjacente à la case vide
    return (
      (Math.abs(row - this.emptyTile.row) === 1 && col === this.emptyTile.col) ||
      (Math.abs(col - this.emptyTile.col) === 1 && row === this.emptyTile.row)
    );
  }
  
  isSolved() {
    // Vérifier si la grille est dans l'état résolu
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        // La dernière case doit être vide
        if (row === this.size - 1 && col === this.size - 1) {
          if (this.grid[row][col] !== 0) {
            return false;
          }
        } else {
          // Les autres cases doivent avoir la valeur row * size + col + 1
          if (this.grid[row][col] !== row * this.size + col + 1) {
            return false;
          }
        }
      }
    }
    return true;
  }
  
  getState() {
    return {
      grid: this.grid,
      size: this.size,
      moves: this.moves,
      gameOver: this.gameOver,
      score: this.score
    };
  }
  
  restart() {
    this.initPuzzle();
  }
}

// Start the game
const game = new SliderPuzzle();
`;

// Puzzle - Jigsaw Puzzle implémentation
const jigsawPuzzleGame = `
class JigsawPuzzle {
  constructor(imageTheme = 'maroc', difficulty = 'medium') {
    this.imageTheme = imageTheme;
    this.difficulty = difficulty;
    
    // Définir la taille en fonction de la difficulté
    switch(difficulty) {
      case 'easy':
        this.rows = 3;
        this.cols = 3;
        break;
      case 'medium':
        this.rows = 4;
        this.cols = 4;
        break;
      case 'hard':
        this.rows = 5;
        this.cols = 5;
        break;
      default:
        this.rows = 4;
        this.cols = 4;
    }
    
    this.pieces = [];
    this.solvedPieces = 0;
    this.moves = 0;
    this.gameStarted = false;
    this.gameOver = false;
    this.score = 0;
    this.startTime = null;
    this.endTime = null;
    
    // Thèmes d'images disponibles
    this.themes = {
      'maroc': [
        'casablanca', 'marrakech', 'fes', 'rabat',
        'atlas', 'desert', 'medina', 'plage'
      ],
      'football': [
        'stade', 'equipe', 'supporters', 'victoire',
        'coupe', 'match', 'entrainement', 'celebration'
      ],
      'ram': [
        'avion', 'equipage', 'aeroport', 'vol',
        'siege', 'business', 'cockpit', 'service'
      ]
    };
    
    this.selectedImage = this.selectRandomImage();
    this.initPuzzle();
  }
  
  selectRandomImage() {
    const themeImages = this.themes[this.imageTheme] || this.themes['maroc'];
    return themeImages[Math.floor(Math.random() * themeImages.length)];
  }
  
  initPuzzle() {
    // Créer les pièces du puzzle
    this.pieces = [];
    const totalPieces = this.rows * this.cols;
    
    for (let i = 0; i < totalPieces; i++) {
      const row = Math.floor(i / this.cols);
      const col = i % this.cols;
      
      this.pieces.push({
        id: i,
        correctPosition: i,
        currentPosition: i,
        row: row,
        col: col,
        solved: false
      });
    }
    
    // Mélanger les pièces
    this.shuffle();
  }
  
  shuffle() {
    // Création d'un tableau d'indices mélangés
    const positions = Array.from({ length: this.pieces.length }, (_, i) => i);
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    
    // Appliquer les nouvelles positions
    this.pieces.forEach((piece, index) => {
      piece.currentPosition = positions[index];
      piece.solved = false;
    });
    
    // Réinitialiser les statistiques
    this.solvedPieces = 0;
    this.moves = 0;
    this.gameStarted = false;
    this.gameOver = false;
    this.score = 0;
    this.startTime = null;
    this.endTime = null;
  }
  
  movePiece(pieceId, newPosition) {
    // Vérifier si le jeu est déjà terminé
    if (this.gameOver) return false;
    
    // Commencer le chrono au premier mouvement
    if (!this.gameStarted) {
      this.gameStarted = true;
      this.startTime = new Date();
    }
    
    // Trouver les pièces à échanger
    const pieceToMove = this.pieces.find(p => p.id === pieceId);
    const pieceAtPosition = this.pieces.find(p => p.currentPosition === newPosition);
    
    if (!pieceToMove || !pieceAtPosition) return false;
    
    // Échanger les positions
    const tempPosition = pieceToMove.currentPosition;
    pieceToMove.currentPosition = newPosition;
    pieceAtPosition.currentPosition = tempPosition;
    
    // Incrémenter le nombre de mouvements
    this.moves++;
    
    // Vérifier si des pièces sont correctement placées
    this.pieces.forEach(piece => {
      if (piece.currentPosition === piece.correctPosition && !piece.solved) {
        piece.solved = true;
        this.solvedPieces++;
      } else if (piece.currentPosition !== piece.correctPosition && piece.solved) {
        piece.solved = false;
        this.solvedPieces--;
      }
    });
    
    // Vérifier si le puzzle est résolu
    if (this.solvedPieces === this.pieces.length) {
      this.gameOver = true;
      this.endTime = new Date();
      
      // Calculer le score
      const timeTaken = Math.floor((this.endTime - this.startTime) / 1000);
      const difficultyMultiplier = this.getDifficultyMultiplier();
      const timeBonus = Math.max(0, 300 - timeTaken);
      
this.score = (1000 * difficultyMultiplier) + timeBonus - this.moves;
   }
   
   return true;
 }
 
 getDifficultyMultiplier() {
   switch(this.difficulty) {
     case 'easy': return 1;
     case 'medium': return 1.5;
     case 'hard': return 2;
     default: return 1.5;
   }
 }
 
 getState() {
   return {
     pieces: this.pieces,
     rows: this.rows,
     cols: this.cols,
     solvedPieces: this.solvedPieces,
     totalPieces: this.pieces.length,
     moves: this.moves,
     gameOver: this.gameOver,
     score: this.score,
     imageTheme: this.imageTheme,
     selectedImage: this.selectedImage,
     difficulty: this.difficulty
   };
 }
 
 restart() {
   this.shuffle();
 }
 
 changeImage() {
   this.selectedImage = this.selectRandomImage();
   this.restart();
 }
 
 changeDifficulty(newDifficulty) {
   if (['easy', 'medium', 'hard'].includes(newDifficulty)) {
     this.difficulty = newDifficulty;
     
     // Mettre à jour la taille du puzzle
     switch(newDifficulty) {
       case 'easy':
         this.rows = 3;
         this.cols = 3;
         break;
       case 'medium':
         this.rows = 4;
         this.cols = 4;
         break;
       case 'hard':
         this.rows = 5;
         this.cols = 5;
         break;
     }
     
     // Réinitialiser le puzzle avec la nouvelle taille
     this.initPuzzle();
   }
 }
}

// Start the game
const game = new JigsawPuzzle();
`;

// Puzzle - Word Puzzle implémentation
const wordPuzzleGame = `
class WordPuzzle {
 constructor(theme = 'maroc', difficulty = 'medium') {
   this.theme = theme;
   this.difficulty = difficulty;
   this.words = [];
   this.grid = [];
   this.foundWords = [];
   this.score = 0;
   this.gameStarted = false;
   this.gameOver = false;
   this.startTime = null;
   this.endTime = null;
   
   // Thèmes disponibles avec mots
   this.themes = {
     'maroc': [
       'CASABLANCA', 'MARRAKECH', 'RABAT', 'FES',
       'ATLAS', 'SAHARA', 'DIRHAM', 'TAJINE',
       'MEDINA', 'SOUK', 'KASBAH', 'MOSQUE',
       'BERBERE', 'CHAMEAU', 'PALMIER', 'DATTIER'
     ],
     'football': [
       'BALLON', 'STADE', 'ARBITRE', 'PENALTY',
       'EQUIPE', 'GARDIEN', 'JOUEUR', 'ATTAQUANT',
       'DEFENSE', 'COUPE', 'VICTOIRE', 'FINALE',
       'CORNER', 'FAUTE', 'CARTON', 'MATCH'
     ],
     'ram': [
       'AVION', 'PILOTE', 'HOTESSE', 'AEROPORT',
       'BILLET', 'BAGAGES', 'VOYAGE', 'ESCALE',
       'DECOLLAGE', 'COCKPIT', 'BUSINESS', 'PASSAGER',
       'CABINE', 'SIEGE', 'TERMINAL', 'EQUIPAGE'
     ]
   };
   
   // Taille de la grille selon la difficulté
   switch(difficulty) {
     case 'easy':
       this.gridSize = 8;
       this.wordsToFind = 6;
       break;
     case 'medium':
       this.gridSize = 10;
       this.wordsToFind = 8;
       break;
     case 'hard':
       this.gridSize = 12;
       this.wordsToFind = 10;
       break;
     default:
       this.gridSize = 10;
       this.wordsToFind = 8;
   }
   
   this.initPuzzle();
 }
 
 initPuzzle() {
   // Sélectionner les mots à trouver
   this.selectWords();
   
   // Créer une grille vide
   this.grid = [];
   for (let i = 0; i < this.gridSize; i++) {
     this.grid.push(Array(this.gridSize).fill(''));
   }
   
   // Placer les mots dans la grille
   this.placeWords();
   
   // Remplir les espaces vides avec des lettres aléatoires
   this.fillEmptySpaces();
   
   // Réinitialiser les statistiques
   this.foundWords = [];
   this.score = 0;
   this.gameStarted = false;
   this.gameOver = false;
   this.startTime = null;
   this.endTime = null;
 }
 
 selectWords() {
   // Sélectionner des mots aléatoires du thème choisi
   const themeWords = this.themes[this.theme] || this.themes['maroc'];
   
   // Mélanger les mots
   const shuffledWords = [...themeWords].sort(() => Math.random() - 0.5);
   
   // Sélectionner le nombre de mots en fonction de la difficulté
   this.words = shuffledWords.slice(0, this.wordsToFind)
     .map(word => ({
       word: word,
       found: false,
       // Les positions seront définies lors du placement
       startRow: -1,
       startCol: -1,
       endRow: -1,
       endCol: -1,
       direction: ''
     }));
 }
 
 placeWords() {
   // Directions possibles pour placer les mots
   const directions = [
     { name: 'horizontal', rowDelta: 0, colDelta: 1 },
     { name: 'vertical', rowDelta: 1, colDelta: 0 },
     { name: 'diagonal', rowDelta: 1, colDelta: 1 }
   ];
   
   for (const wordObj of this.words) {
     const word = wordObj.word;
     let placed = false;
     
     // Essayer de placer le mot jusqu'à 50 fois
     for (let attempt = 0; attempt < 50 && !placed; attempt++) {
       // Choisir une direction aléatoire
       const direction = directions[Math.floor(Math.random() * directions.length)];
       
       // Choisir une position de départ aléatoire
       const startRow = Math.floor(Math.random() * this.gridSize);
       const startCol = Math.floor(Math.random() * this.gridSize);
       
       // Vérifier si le mot peut être placé à cette position et direction
       if (this.canPlaceWord(word, startRow, startCol, direction)) {
         // Placer le mot
         this.placeWord(wordObj, startRow, startCol, direction);
         placed = true;
       }
     }
     
     // Si impossible de placer le mot après 50 essais, reinitialiser la grille et recommencer
     if (!placed) {
       this.initPuzzle();
       return;
     }
   }
 }
 
 canPlaceWord(word, startRow, startCol, direction) {
   // Vérifier si le mot dépasse de la grille
   const endRow = startRow + direction.rowDelta * (word.length - 1);
   const endCol = startCol + direction.colDelta * (word.length - 1);
   
   if (endRow >= this.gridSize || endCol >= this.gridSize) {
     return false;
   }
   
   // Vérifier si le mot chevauche d'autres mots de manière incorrecte
   for (let i = 0; i < word.length; i++) {
     const row = startRow + direction.rowDelta * i;
     const col = startCol + direction.colDelta * i;
     
     if (this.grid[row][col] !== '' && this.grid[row][col] !== word[i]) {
       return false;
     }
   }
   
   return true;
 }
 
 placeWord(wordObj, startRow, startCol, direction) {
   const word = wordObj.word;
   
   for (let i = 0; i < word.length; i++) {
     const row = startRow + direction.rowDelta * i;
     const col = startCol + direction.colDelta * i;
     
     this.grid[row][col] = word[i];
   }
   
   // Enregistrer les positions du mot
   wordObj.startRow = startRow;
   wordObj.startCol = startCol;
   wordObj.endRow = startRow + direction.rowDelta * (word.length - 1);
   wordObj.endCol = startCol + direction.colDelta * (word.length - 1);
   wordObj.direction = direction.name;
 }
 
 fillEmptySpaces() {
   // Remplir les espaces vides avec des lettres aléatoires
   const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
   
   for (let row = 0; row < this.gridSize; row++) {
     for (let col = 0; col < this.gridSize; col++) {
       if (this.grid[row][col] === '') {
         const randomLetter = letters[Math.floor(Math.random() * letters.length)];
         this.grid[row][col] = randomLetter;
       }
     }
   }
 }
 
 findWord(startRow, startCol, endRow, endCol) {
   // Vérifier si le jeu est déjà terminé
   if (this.gameOver) return false;
   
   // Commencer le chrono au premier mouvement
   if (!this.gameStarted) {
     this.gameStarted = true;
     this.startTime = new Date();
   }
   
   // Calculer la direction
   const rowDelta = endRow - startRow;
   const colDelta = endCol - startCol;
   
   // Normaliser pour obtenir la direction
   const length = Math.max(
     Math.abs(rowDelta),
     Math.abs(colDelta)
   ) + 1;
   
   const dirRowDelta = rowDelta === 0 ? 0 : rowDelta / Math.abs(rowDelta);
   const dirColDelta = colDelta === 0 ? 0 : colDelta / Math.abs(colDelta);
   
   // Extraire le mot sélectionné
   let selectedWord = '';
   for (let i = 0; i < length; i++) {
     const row = startRow + dirRowDelta * i;
     const col = startCol + dirColDelta * i;
     selectedWord += this.grid[row][col];
   }
   
   // Vérifier si le mot est dans la liste des mots à trouver
   const wordObj = this.words.find(w => 
     w.word === selectedWord && !w.found &&
     w.startRow === startRow && w.startCol === startCol &&
     w.endRow === endRow && w.endCol === endCol
   );
   
   if (wordObj) {
     wordObj.found = true;
     this.foundWords.push(wordObj.word);
     
     // Mettre à jour le score
     this.score += wordObj.word.length * 10;
     
     // Vérifier si tous les mots ont été trouvés
     if (this.foundWords.length === this.words.length) {
       this.gameOver = true;
       this.endTime = new Date();
       
       // Bonus de score pour la fin du jeu
       const timeTaken = Math.floor((this.endTime - this.startTime) / 1000);
       const timeBonus = Math.max(0, 300 - timeTaken);
       const difficultyMultiplier = this.getDifficultyMultiplier();
       
       this.score += timeBonus * difficultyMultiplier;
     }
     
     return true;
   }
   
   return false;
 }
 
 getDifficultyMultiplier() {
   switch(this.difficulty) {
     case 'easy': return 1;
     case 'medium': return 1.5;
     case 'hard': return 2;
     default: return 1.5;
   }
 }
 
 getState() {
   return {
     grid: this.grid,
     words: this.words.map(w => ({ ...w, word: w.found ? w.word : '?' })),
     foundWords: this.foundWords,
     totalWords: this.words.length,
     score: this.score,
     gameOver: this.gameOver,
     theme: this.theme,
     difficulty: this.difficulty
   };
 }
 
 restart() {
   this.initPuzzle();
 }
 
 changeTheme(newTheme) {
   if (this.themes[newTheme]) {
     this.theme = newTheme;
     this.restart();
   }
 }
 
 changeDifficulty(newDifficulty) {
   if (['easy', 'medium', 'hard'].includes(newDifficulty)) {
     this.difficulty = newDifficulty;
     
     // Mettre à jour les paramètres de difficulté
     switch(newDifficulty) {
       case 'easy':
         this.gridSize = 8;
         this.wordsToFind = 6;
         break;
       case 'medium':
         this.gridSize = 10;
         this.wordsToFind = 8;
         break;
       case 'hard':
         this.gridSize = 12;
         this.wordsToFind = 10;
         break;
     }
     
     this.restart();
   }
 }
}

// Start the game
const game = new WordPuzzle();
`;

export default function HomeScreen() {
 const [userData, setUserData] = useState<UserData>({
   firstName: "",
   lastName: "",
   email: "",
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
 const coinAnimation = useRef(new Animated.Value(0)).current;

 // Animated values for the beztam and coins
 const moneyBagScale = moneyBagAnimation.interpolate({
   inputRange: [0, 0.5, 1],
   outputRange: [1, 1.1, 1]
 });
 
 const coinTranslateY = coinAnimation.interpolate({
   inputRange: [0, 1],
   outputRange: [0, -10]
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
           lastName: data.lastName || "",
           email: data.email || "",
           pointsBalance: data.pointsBalance || 0,
           gamesPlayedToday: data.gamesPlayedToday || 0,
           lastPlayedDate: data.lastPlayedDate || todayDate,
           dailyRewardClaimed: data.dailyRewardClaimed || false,
           preferredLanguage: data.preferredLanguage || "fr"
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
     animateMoneyBag(); // Animate beztam when points are added
     
   } catch (error) {
     console.error("Erreur lors du scan du QR code:", error);
     setScreenLoading(false);
     setErrorMessage("Une erreur s'est produite lors du traitement du QR code. Veuillez réessayer.");
     setShowErrorModal(true);
   }
 };

 // Function to answer quiz question
 const answerQuizQuestion = (selectedOptionIndex: number) => {
   const currentQuestion = quizQuestions[currentQuizQuestion];
   
   if (selectedOptionIndex === currentQuestion.correctAnswer) {
     // Correct answer
     setQuizScore(prevScore => prevScore + 1);
     
     if (currentQuizQuestion < quizQuestions.length - 1) {
       // Move to next question
       setCurrentQuizQuestion(prevQuestion => prevQuestion + 1);
     } else {
       // Quiz completed successfully
       setQuizComplete(true);
       // Award points for completing the quiz
       handleQuizCompletion();
     }
   } else {
     // Wrong answer - quiz failed
     setQuizFailed(true);
   }
 };
 
 // Function to handle quiz completion
 const handleQuizCompletion = async () => {
   try {
     const points = 10;
     await addPoints(points, "Quiz Rapide");
     await updateGamesPlayed();
     
     setUserData(prev => ({
       ...prev,
       pointsBalance: prev.pointsBalance + points,
       gamesPlayedToday: prev.gamesPlayedToday + 1
     }));
     
     animateMoneyBag();
   } catch (error) {
     console.error("Erreur lors de la complétion du quiz:", error);
     Alert.alert("Erreur", "Impossible d'attribuer les points pour le quiz");
   }
 };
 
 // Reset quiz state
 const resetQuiz = () => {
   setCurrentQuizQuestion(0);
   setQuizScore(0);
   setQuizComplete(false);
   setQuizFailed(false);
   setShowQuizModal(false);
 };

 // Function to play the daily game - Chooses a random game from available games
 const playDayGame = () => {
   const games = ['tetris', 'memory', 'snake'];
   const randomGame = games[Math.floor(Math.random() * games.length)];
   
   switch(randomGame) {
     case 'tetris':
       setShowGamesModal(false);
       setShowTetrisModal(true);
       break;
case 'memory':
       setShowGamesModal(false);
       setShowMemoryGameModal(true);
       break;
     case 'snake':
       setShowGamesModal(false);
       setShowSnakeGameModal(true);
       break;
   }
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
       points += Math.min(score/10, 20);
     }
     
     await addPoints(points, `Jeu: ${gameType}`);
     const newGamesCount = await updateGamesPlayed();
     
     setUserData(prev => ({
       ...prev,
       pointsBalance: prev.pointsBalance + points,
       gamesPlayedToday: newGamesCount
     }));
     
     animateMoneyBag(); // Animate beztam when points are added
     
     // Close game modals
     setShowTetrisModal(false);
     setShowMemoryGameModal(false);
     setShowSnakeGameModal(false);
     setShowQuizModal(false);
     setShowPuzzleModal(false);
     
     // Show success message
     const gameNames: {[key: string]: string} = {
       'tetris': 'Tetris',
       'snake': 'Snake',
       'memory': 'Memory',
       'quiz': 'Quiz',
       'puzzle': 'Puzzle'
     };
     
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
     
     setUserData(prev => ({
       ...prev,
       pointsBalance: prev.pointsBalance + points,
       dailyRewardClaimed: true
     }));
     
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
       // Update local balance
       setUserData(prev => ({
         ...prev,
         pointsBalance: prev.pointsBalance + result.points
       }));
       
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
       
       {/* Points balance - Beztam (Moroccan money bag) with coins */}
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
  transparent={true}
  onRequestClose={() => setShowTetrisModal(false)}
>
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Tetris</Text>
        <TouchableOpacity onPress={() => setShowTetrisModal(false)}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.tetrisContainer}>
          <TetrisGame onComplete={(score) => completeGame('tetris', score)} />
        </View>
      </ScrollView>
    </View>
  </View>
</Modal>
     <Modal
  visible={showMemoryGameModal}
  animationType="slide"
  transparent={false} // Passez à false pour utiliser tout l'écran
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
       transparent={true}
       onRequestClose={() => setShowSnakeGameModal(false)}
     >
       <View style={styles.modalContainer}>
         <View style={styles.modalContent}>
           <View style={styles.modalHeader}>
             <Text style={styles.modalTitle}>Snake Game</Text>
             <TouchableOpacity onPress={() => setShowSnakeGameModal(false)}>
               <Text style={styles.closeButton}>✕</Text>
             </TouchableOpacity>
           </View>
           
           <View style={styles.snakeGameContainer}>
             <SnakeGame onComplete={(score) => completeGame('snake', score)} />
           </View>
         </View>
       </View>
     </Modal>
     
     {/* Modal for Puzzle Game */}
     <Modal
       visible={showPuzzleModal}
       animationType="slide"
       transparent={true}
       onRequestClose={() => setShowPuzzleModal(false)}
     >
       <View style={styles.modalContainer}>
         <View style={styles.modalContent}>
           <View style={styles.modalHeader}>
             <Text style={styles.modalTitle}>
               {selectedPuzzleType === 'slider' ? 'Slider Puzzle' : 
                selectedPuzzleType === 'jigsaw' ? 'Jigsaw Puzzle' : 'Word Puzzle'}
             </Text>
             <TouchableOpacity onPress={() => setShowPuzzleModal(false)}>
               <Text style={styles.closeButton}>✕</Text>
             </TouchableOpacity>
           </View>
           
           <View style={styles.puzzleContainer}>
             <PuzzleGame onComplete={(score) => completeGame('puzzle', score)} />
           </View>
         </View>
       </View>
     </Modal>
     
     {/* Modal for Quiz */}
     <Modal
       visible={showQuizModal}
       animationType="slide"
       transparent={true}
       onRequestClose={() => resetQuiz()}
     >
       <View style={styles.modalContainer}>
         <View style={styles.modalContent}>
           <View style={styles.modalHeader}>
             <Text style={styles.modalTitle}>Quiz Rapide</Text>
             <TouchableOpacity onPress={() => resetQuiz()}>
               <Text style={styles.closeButton}>✕</Text>
             </TouchableOpacity>
           </View>
           
           <View style={styles.quizContainer}>
             <QuizGame onComplete={(score) => completeGame('quiz', score)} />
           </View>
         </View>
       </View>
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
           
           <View style={styles.profileContent}>
             <View style={styles.profileAvatar}>
               <Ionicons name="person-circle" size={80} color="#c60c30" />
             </View>
             
             <View style={styles.profileInfo}>
               <Text style={styles.profileName}>{userData.firstName} {userData.lastName}</Text>
               <Text style={styles.profileEmail}>{userData.email}</Text>
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
           </View>
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
 
 // Styles pour le beztam (sac d'argent marocain) animé
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
   fontSize: 14,
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
   borderWidth: 1,
   borderColor: '#FFD700',
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
 
 // Styles pour les containeurs de jeux
 tetrisContainer: {
   alignItems: 'center',
   justifyContent: 'center',
   padding: 10,
 },
 memoryGameContainer: {
   alignItems: 'center',
   justifyContent: 'center',
   padding: 10,
 },
 snakeGameContainer: {
   alignItems: 'center',
   justifyContent: 'center',
   padding: 10,
 },
 puzzleContainer: {
   alignItems: 'center',
   justifyContent: 'center',
   padding: 10,
 },
 quizContainer: {
   padding: 10,
 },
 
 // Autres styles (modales, statuts, etc.)
 // ... (les autres styles sont préservés)
 // Styles pour le profil
profileContent: {
  padding: 20,
  alignItems: 'center',
},
profileAvatar: {
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