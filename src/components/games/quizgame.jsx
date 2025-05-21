import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Quiz questions about Morocco, RAM and CAN 2025
const quizQuestions = [
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

const QuizGame = ({ onComplete }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [quizFailed, setQuizFailed] = useState(false);
  
  const totalQuestions = 10; // We'll use 10 random questions from the full set
  
  // Initialize the game
  const initGame = () => {
    // Shuffle and pick 10 random questions
    const shuffledQuestions = shuffleArray(quizQuestions).slice(0, totalQuestions);
    
    setQuestions(shuffledQuestions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setGameOver(false);
    setStartTime(new Date());
    setEndTime(null);
    setSelectedOption(null);
    setIsAnswerCorrect(null);
    setGameStarted(true);
    setQuizFailed(false);
  };
  
  // Shuffle array using Fisher-Yates algorithm
  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };
  
  // Handle answer selection
  const handleOptionPress = (optionIndex) => {
    // Prevent multiple selections
    if (selectedOption !== null) return;
    
    setSelectedOption(optionIndex);
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = optionIndex === currentQuestion.correctAnswer;
    
    setIsAnswerCorrect(isCorrect);
    
    if (isCorrect) {
      setScore(score + 1);
    } else {
      // Option: set quizFailed to true for wrong answers - depends on how strict you want the game to be
      // setQuizFailed(true);
    }
    
    // After a delay, move to next question or end game
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedOption(null);
        setIsAnswerCorrect(null);
      } else {
        // Game over
        setGameOver(true);
        setEndTime(new Date());
      }
    }, 1500);
  };
  
  // Handle game completion
  const handleGameComplete = () => {
    if (onComplete) {
      // Base points for quiz plus bonus for correct answers
      const basePoints = 10;
      const bonusPoints = score * 2;
      
      onComplete('quiz', basePoints + bonusPoints);
    }
  };
  
  // If no questions loaded yet, show loading
  if (gameStarted && questions.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Chargement des questions...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!gameStarted ? (
        <View style={styles.startContainer}>
          <Text style={styles.gameTitle}>Quiz Rapide</Text>
          <Text style={styles.instructions}>
            Testez vos connaissances sur le Maroc, Royal Air Maroc et la CAN 2025!
            Répondez à {totalQuestions} questions pour gagner des points.
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={initGame}>
            <Text style={styles.startButtonText}>COMMENCER</Text>
          </TouchableOpacity>
        </View>
      ) : gameOver ? (
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverText}>Quiz Terminé!</Text>
          <Text style={styles.scoreText}>
            Vous avez obtenu {score} bonnes réponses sur {questions.length}
          </Text>
          <Text style={styles.timeText}>
            Temps: {Math.floor((endTime - startTime) / 1000)} secondes
          </Text>
          <View style={styles.resultContainer}>
            <View style={styles.resultCircle}>
              <Text style={styles.resultPercent}>{Math.round((score / questions.length) * 100)}%</Text>
            </View>
            <Text style={styles.resultText}>
              {score >= questions.length * 0.7 
                ? 'Excellent! Vous êtes un expert!' 
                : score >= questions.length * 0.5 
                ? 'Bien joué! Continuez à vous améliorer.' 
                : 'Continuez à apprendre pour faire mieux la prochaine fois.'}
            </Text>
          </View>
          <TouchableOpacity style={styles.restartButton} onPress={initGame}>
            <Text style={styles.restartButtonText}>REJOUER</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.completeButton} onPress={handleGameComplete}>
            <Text style={styles.completeButtonText}>TERMINER & GAGNER DES POINTS</Text>
          </TouchableOpacity>
        </View>
      ) : quizFailed ? (
        <View style={styles.failedContainer}>
          <Ionicons name="close-circle" size={64} color="#F44336" />
          <Text style={styles.failedTitle}>Dommage!</Text>
          <Text style={styles.failedMessage}>
            Vous avez manqué une question critique. Réessayez demain!
          </Text>
          <TouchableOpacity style={styles.failedButton} onPress={() => initGame()}>
            <Text style={styles.failedButtonText}>RÉESSAYER</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.quizContainer}>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Question {currentQuestionIndex + 1}/{questions.length}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }
                ]} 
              />
            </View>
          </View>
          
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>
              {questions[currentQuestionIndex].question}
            </Text>
            
            <View style={styles.optionsContainer}>
              {questions[currentQuestionIndex].options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    selectedOption === index && styles.selectedOption,
                    selectedOption === index && isAnswerCorrect && styles.correctOption,
                    selectedOption === index && !isAnswerCorrect && styles.wrongOption,
                    selectedOption !== null && 
                      index === questions[currentQuestionIndex].correctAnswer && 
                      styles.correctOption
                  ]}
                  onPress={() => handleOptionPress(index)}
                  disabled={selectedOption !== null}
                >
                  <View style={styles.optionContent}>
                    <View style={styles.optionCircle}>
                      <Text style={styles.optionLetter}>
                        {String.fromCharCode(65 + index)}
                      </Text>
                    </View>
                    <Text style={[
                      styles.optionText,
                      selectedOption === index && styles.selectedOptionText
                    ]}>
                      {option}
                    </Text>
                  </View>
                  
                  {selectedOption === index && isAnswerCorrect && (
                    <Ionicons name="checkmark-circle" size={24} color="#fff" style={styles.resultIcon} />
                  )}
                  {selectedOption === index && !isAnswerCorrect && (
                    <Ionicons name="close-circle" size={24} color="#fff" style={styles.resultIcon} />
                  )}
                  {selectedOption !== null && 
                    index === questions[currentQuestionIndex].correctAnswer && 
                    selectedOption !== index && (
                    <Ionicons name="checkmark-circle" size={24} color="#fff" style={styles.resultIcon} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.scoreContainer}>
            <Text style={styles.currentScoreText}>Score: {score}/{currentQuestionIndex + (selectedOption !== null ? 1 : 0)}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  startContainer: {
    alignItems: 'center',
  },
  gameTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#c60c30',
  },
  instructions: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  startButton: {
    backgroundColor: '#c60c30',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  quizContainer: {
    width: '100%',
  },
  progressContainer: {
    marginBottom: 20,
    width: '100%',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#c60c30',
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  optionsContainer: {
    width: '100%',
  },
  optionButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#f5f5f5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedOption: {
    borderColor: '#c60c30',
  },
  correctOption: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  wrongOption: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  optionLetter: {
    color: '#666',
    fontWeight: 'bold',
  },
  optionText: {
    color: '#333',
    flex: 1,
  },
  selectedOptionText: {
    fontWeight: 'bold',
  },
  resultIcon: {
    marginLeft: 10,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  currentScoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#c60c30',
  },
  gameOverContainer: {
    alignItems: 'center',
  },
  gameOverText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#c60c30',
  },
  scoreText: {
    fontSize: 18,
    marginBottom: 5,
    color: '#333',
  },
  timeText: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
  },
  resultContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resultCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#c60c30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultPercent: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  resultText: {
    textAlign: 'center',
    color: '#666',
  },
  restartButton: {
    backgroundColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 10,
  },
  restartButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  failedContainer: {
    alignItems: 'center',
  },
  failedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F44336',
    marginVertical: 10,
  },
  failedMessage: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  failedButton: {
    backgroundColor: '#F44336',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  failedButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
export default QuizGame;