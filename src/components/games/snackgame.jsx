import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const GRID_SIZE = 15;
const CELL_SIZE = Math.floor((width - 40) / GRID_SIZE);
const GRID_WIDTH = CELL_SIZE * GRID_SIZE;

const SnakeGame = ({ onComplete }) => {
  const [snake, setSnake] = useState([{ x: 5, y: 5 }]);
  const [food, setFood] = useState({ x: 10, y: 10 });
  const [direction, setDirection] = useState('right');
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(200); // ms between moves
  const [gameStarted, setGameStarted] = useState(false);
  
  const directionRef = useRef(direction);
  const gameTimerRef = useRef(null);

  // Initialize the game
  const initGame = () => {
    setSnake([{ x: 5, y: 5 }]);
    setFood(generateFood());
    setDirection('right');
    directionRef.current = 'right';
    setGameOver(false);
    setPaused(false);
    setScore(0);
    setSpeed(200);
    setGameStarted(true);
  };

  // Generate food at random position
  const generateFood = () => {
    const x = Math.floor(Math.random() * GRID_SIZE);
    const y = Math.floor(Math.random() * GRID_SIZE);
    return { x, y };
  };

  // Main game loop
  useEffect(() => {
    if (!gameStarted || paused || gameOver) return;

    const moveSnake = () => {
      const head = { ...snake[0] };
      const currentDirection = directionRef.current;

      // Move head based on current direction
      switch (currentDirection) {
        case 'up':
          head.y -= 1;
          break;
        case 'down':
          head.y += 1;
          break;
        case 'left':
          head.x -= 1;
          break;
        case 'right':
          head.x += 1;
          break;
      }

      // Check for collision with walls
      if (
        head.x < 0 ||
        head.x >= GRID_SIZE ||
        head.y < 0 ||
        head.y >= GRID_SIZE
      ) {
        setGameOver(true);
        return;
      }

      // Check for collision with self
      for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
          setGameOver(true);
          return;
        }
      }

      // Create new snake array with new head
      const newSnake = [head, ...snake];

      // Check if snake ate the food
      if (head.x === food.x && head.y === food.y) {
        // Increase score and speed
        setScore(prevScore => prevScore + 10);
        if (speed > 50) {
          setSpeed(prevSpeed => Math.max(prevSpeed - 5, 50));
        }
        // Generate new food
        setFood(generateFood());
      } else {
        // Remove tail if no food eaten
        newSnake.pop();
      }

      // Update snake
      setSnake(newSnake);
    };

    // Set interval for game loop
    gameTimerRef.current = setInterval(moveSnake, speed);

    // Cleanup
    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
    };
  }, [snake, food, gameStarted, paused, gameOver, speed]);

  // Update direction ref when direction changes
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  // Change direction handler
  const changeDirection = (newDirection) => {
    // Prevent 180 degree turns
    if (
      (direction === 'up' && newDirection === 'down') ||
      (direction === 'down' && newDirection === 'up') ||
      (direction === 'left' && newDirection === 'right') ||
      (direction === 'right' && newDirection === 'left')
    ) {
      return;
    }
    setDirection(newDirection);
  };

  // Handle game completion
  const handleGameComplete = () => {
    if (onComplete) {
      onComplete('snake', score);
    }
  };

  // Render game grid
  const renderGrid = () => {
    const grid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isSnake = snake.some(segment => segment.x === x && segment.y === y);
        const isHead = snake[0].x === x && snake[0].y === y;
        const isFood = food.x === x && food.y === y;
        
        const cellStyle = {
          position: 'absolute',
          left: x * CELL_SIZE,
          top: y * CELL_SIZE,
          width: CELL_SIZE,
          height: CELL_SIZE,
          backgroundColor: isHead ? '#c60c30' : isSnake ? '#333' : isFood ? '#4CAF50' : 'transparent',
          borderWidth: isSnake || isFood ? 0 : 0.5,
          borderColor: '#ccc',
        };

        grid.push(<View key={`${x}-${y}`} style={cellStyle} />);
      }
    }
    return grid;
  };

  return (
    <View style={styles.container}>
      {!gameStarted ? (
        <View style={styles.startContainer}>
          <Text style={styles.gameTitle}>Snake Game</Text>
          <Text style={styles.instructions}>
            Utilisez les flèches pour diriger le serpent.
            Mangez la nourriture pour grandir.
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={initGame}>
            <Text style={styles.startButtonText}>COMMENCER</Text>
          </TouchableOpacity>
        </View>
      ) : gameOver ? (
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverText}>Partie Terminée!</Text>
          <Text style={styles.scoreText}>Score: {score}</Text>
          <TouchableOpacity style={styles.restartButton} onPress={initGame}>
            <Text style={styles.restartButtonText}>REJOUER</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.completeButton} onPress={handleGameComplete}>
            <Text style={styles.completeButtonText}>TERMINER & GAGNER DES POINTS</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.scoreText}>Score: {score}</Text>
            <TouchableOpacity
              style={styles.pauseButton}
              onPress={() => setPaused(!paused)}
            >
              <Ionicons
                name={paused ? 'play' : 'pause'}
                size={20}
                color="#333"
              />
            </TouchableOpacity>
          </View>

          <View style={[styles.grid, { width: GRID_WIDTH, height: GRID_WIDTH }]}>
            {renderGrid()}
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => changeDirection('up')}
            >
              <Ionicons name="arrow-up" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.controlRow}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => changeDirection('left')}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => changeDirection('down')}
              >
                <Ionicons name="arrow-down" size={24} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => changeDirection('right')}
              >
                <Ionicons name="arrow-forward" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  pauseButton: {
    padding: 5,
    borderRadius: 5,
    backgroundColor: '#ddd',
  },
  grid: {
    position: 'relative',
    borderWidth: 2,
    borderColor: '#333',
    marginVertical: 20,
  },
  controls: {
    alignItems: 'center',
    marginTop: 20,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
  },
  startContainer: {
    alignItems: 'center',
  },
  gameTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  instructions: {
    textAlign: 'center',
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#c60c30',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 5,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
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
  restartButton: {
    backgroundColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 5,
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
    borderRadius: 5,
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default SnakeGame;