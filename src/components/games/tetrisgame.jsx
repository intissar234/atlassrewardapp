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
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_SIZE = Math.floor((width - 60) / BOARD_WIDTH);
const BOARD_PIXEL_WIDTH = CELL_SIZE * BOARD_WIDTH;
const BOARD_PIXEL_HEIGHT = CELL_SIZE * BOARD_HEIGHT;

const SHAPES = [
  // I
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  // O
  [
    [1, 1],
    [1, 1]
  ],
  // T
  [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  // L
  [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ],
  // J
  [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  // Z
  [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ],
  // S
  [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ]
];

const COLORS = [
  '#00BFFF', // I - cyan
  '#FFFF00', // O - yellow
  '#800080', // T - purple
  '#FFA500', // L - orange
  '#0000FF', // J - blue
  '#FF0000', // Z - red
  '#00FF00'  // S - green
];

const TetrisGame = ({ onComplete }) => {
  const [board, setBoard] = useState(createEmptyBoard());
  const [currentShape, setCurrentShape] = useState(null);
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });
  const [currentShapeIndex, setCurrentShapeIndex] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [paused, setPaused] = useState(false);
  const [nextShape, setNextShape] = useState(null);
  const [nextShapeIndex, setNextShapeIndex] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  
  const gameTimerRef = useRef(null);

  // Create empty game board
  function createEmptyBoard() {
    return Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
  }

  // Initialize game
  const initGame = () => {
    setBoard(createEmptyBoard());
    const firstShapeIndex = Math.floor(Math.random() * SHAPES.length);
    const secondShapeIndex = Math.floor(Math.random() * SHAPES.length);
    
    setCurrentShapeIndex(firstShapeIndex);
    setCurrentShape(SHAPES[firstShapeIndex]);
    setNextShapeIndex(secondShapeIndex);
    setNextShape(SHAPES[secondShapeIndex]);
    
    const startX = Math.floor((BOARD_WIDTH - SHAPES[firstShapeIndex][0].length) / 2);
    setCurrentPosition({ x: startX, y: 0 });
    
    setScore(0);
    setLevel(1);
    setLines(0);
    setGameOver(false);
    setPaused(false);
    setGameStarted(true);
  };

  // Game loop
  useEffect(() => {
    if (!gameStarted || paused || gameOver) return;

    const speed = Math.max(100, 800 - ((level - 1) * 50));
    
    const moveDown = () => {
      if (!canMoveDown()) {
        // Lock the piece in place
        placeShape();
        
        // Check for completed lines
        checkLines();
        
        // Get next shape
        const nextShapeIndex = Math.floor(Math.random() * SHAPES.length);
        setCurrentShape(nextShape);
        setCurrentShapeIndex(nextShapeIndex);
        setNextShape(SHAPES[nextShapeIndex]);
        setNextShapeIndex(nextShapeIndex);
        
        const startX = Math.floor((BOARD_WIDTH - nextShape[0].length) / 2);
        setCurrentPosition({ x: startX, y: 0 });
        
        // Check if game over
        if (!canPlace(nextShape, { x: startX, y: 0 })) {
          setGameOver(true);
        }
      } else {
        // Move piece down
        setCurrentPosition(prev => ({ ...prev, y: prev.y + 1 }));
      }
    };

    gameTimerRef.current = setInterval(moveDown, speed);

    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
    };
  }, [gameStarted, currentShape, currentPosition, nextShape, level, paused, gameOver]);

  // Check if shape can move down
  const canMoveDown = () => {
    return canPlace(currentShape, { x: currentPosition.x, y: currentPosition.y + 1 });
  };

  // Check if shape can move left
  const canMoveLeft = () => {
    return canPlace(currentShape, { x: currentPosition.x - 1, y: currentPosition.y });
  };

  // Check if shape can move right
  const canMoveRight = () => {
    return canPlace(currentShape, { x: currentPosition.x + 1, y: currentPosition.y });
  };

  // Check if shape can be placed at a position
  const canPlace = (shape, position) => {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardX = position.x + x;
          const boardY = position.y + y;
          
          // Check bounds
          if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
            return false;
          }
          
          // Check collision with locked pieces
          if (boardY >= 0 && board[boardY][boardX]) {
            return false;
          }
        }
      }
    }
    return true;
  };

  // Place current shape on the board
  const placeShape = () => {
    const newBoard = [...board];
    
    for (let y = 0; y < currentShape.length; y++) {
      for (let x = 0; x < currentShape[y].length; x++) {
        if (currentShape[y][x]) {
          const boardX = currentPosition.x + x;
          const boardY = currentPosition.y + y;
          
          // Ensure we're not out of bounds
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            newBoard[boardY][boardX] = currentShapeIndex + 1; // +1 so it's not 0 (empty)
          }
        }
      }
    }
    
    setBoard(newBoard);
  };

  // Check for completed lines
  const checkLines = () => {
    const newBoard = [...board];
    let completedLines = 0;
    
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      // Check if line is complete
      if (newBoard[y].every(cell => cell > 0)) {
        // Remove the line
        for (let y2 = y; y2 > 0; y2--) {
          newBoard[y2] = [...newBoard[y2 - 1]];
        }
        newBoard[0] = Array(BOARD_WIDTH).fill(0);
        completedLines++;
        y++; // Check this line again
      }
    }
    
    if (completedLines > 0) {
      // Update score
      const linePoints = [0, 40, 100, 300, 1200]; // Points for 0, 1, 2, 3, 4 lines
      setScore(prev => prev + linePoints[completedLines] * level);
      setLines(prev => {
        const newLines = prev + completedLines;
        const newLevel = Math.floor(newLines / 10) + 1;
        if (newLevel > level) {
          setLevel(newLevel);
        }
        return newLines;
      });
      
      setBoard(newBoard);
    }
  };

  // Rotate the current shape
  const rotateShape = () => {
    const rotated = [];
    for (let y = 0; y < currentShape[0].length; y++) {
      rotated[y] = [];
      for (let x = 0; x < currentShape.length; x++) {
        rotated[y][x] = currentShape[currentShape.length - 1 - x][y];
      }
    }
    
    if (canPlace(rotated, currentPosition)) {
      setCurrentShape(rotated);
    }
  };

  // Move left
  const moveLeft = () => {
    if (canMoveLeft()) {
      setCurrentPosition(prev => ({ ...prev, x: prev.x - 1 }));
    }
  };

  // Move right
  const moveRight = () => {
    if (canMoveRight()) {
      setCurrentPosition(prev => ({ ...prev, x: prev.x + 1 }));
    }
  };

  // Move down (soft drop)
  const moveDown = () => {
    if (canMoveDown()) {
      setCurrentPosition(prev => ({ ...prev, y: prev.y + 1 }));
      setScore(prev => prev + 1); // Small score boost for soft drop
    }
  };

  // Hard drop
  const hardDrop = () => {
    let newY = currentPosition.y;
    while (canPlace(currentShape, { x: currentPosition.x, y: newY + 1 })) {
      newY++;
      setScore(prev => prev + 2); // Double score for hard drop
    }
    
    setCurrentPosition(prev => ({ ...prev, y: newY }));
    
    // Immediately place and get next piece
    placeShape();
    checkLines();
    
    const nextShapeIndex = Math.floor(Math.random() * SHAPES.length);
    setCurrentShape(nextShape);
    setCurrentShapeIndex(nextShapeIndex);
    setNextShape(SHAPES[nextShapeIndex]);
    setNextShapeIndex(nextShapeIndex);
    
    const startX = Math.floor((BOARD_WIDTH - nextShape[0].length) / 2);
    setCurrentPosition({ x: startX, y: 0 });
    
    // Check if game over
    if (!canPlace(nextShape, { x: startX, y: 0 })) {
      setGameOver(true);
    }
  };

  // Handle game completion
  const handleGameComplete = () => {
    if (onComplete) {
      onComplete(score);
    }
  };

  // Render the game board
  const renderBoard = () => {
    // Create a copy of the board with the current piece
    const displayBoard = JSON.parse(JSON.stringify(board));
    
    // Add current piece to display board
    if (currentShape) {
      for (let y = 0; y < currentShape.length; y++) {
        for (let x = 0; x < currentShape[y].length; x++) {
          if (currentShape[y][x]) {
            const boardX = currentPosition.x + x;
            const boardY = currentPosition.y + y;
            
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = currentShapeIndex + 1;
            }
          }
        }
      }
    }
    
    // Render each cell
    return displayBoard.map((row, y) => (
      <View key={y} style={styles.row}>
        {row.map((cell, x) => (
          <View 
            key={`${y}-${x}`} 
            style={[
              styles.cell,
              cell > 0 && { backgroundColor: COLORS[cell - 1] }
            ]}
          />
        ))}
      </View>
    ));
  };

  // Render next shape
  const renderNextShape = () => {
    if (!nextShape) return null;
    
    return (
      <View style={styles.nextShapeContainer}>
        {nextShape.map((row, y) => (
          <View key={y} style={styles.nextShapeRow}>
            {row.map((cell, x) => (
              <View 
                key={`${y}-${x}`} 
                style={[
                  styles.nextShapeCell,
                  cell > 0 && { backgroundColor: COLORS[nextShapeIndex] }
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {!gameStarted ? (
        <View style={styles.startContainer}>
          <Text style={styles.gameTitle}>Tetris</Text>
          <Text style={styles.instructions}>
            Complétez des lignes pour marquer des points.
            Contrôlez les pièces avec les boutons en bas.
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={initGame}>
            <Text style={styles.startButtonText}>COMMENCER</Text>
          </TouchableOpacity>
        </View>
      ) : gameOver ? (
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverText}>Partie Terminée!</Text>
          <Text style={styles.scoreText}>Score: {score}</Text>
          <Text style={styles.levelText}>Niveau: {level}</Text>
          <Text style={styles.linesText}>Lignes: {lines}</Text>
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
            <View>
              <Text style={styles.scoreText}>Score: {score}</Text>
              <Text style={styles.levelText}>Niveau: {level}</Text>
              <Text style={styles.linesText}>Lignes: {lines}</Text>
            </View>
            <View>
              <Text style={styles.nextText}>Suivant:</Text>
              {renderNextShape()}
            </View>
            <TouchableOpacity
              style={styles.pauseButton}
              onPress={() => setPaused(!paused)}
            >
              <Ionicons name={paused ? 'play' : 'pause'} size={20} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.boardContainer}>
            <View style={styles.board}>
              {renderBoard()}
            </View>
          </View>

          <View style={styles.controls}>
            <View style={styles.controlRow}>
              <TouchableOpacity style={styles.controlButton} onPress={rotateShape}>
                <Ionicons name="refresh" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={hardDrop}>
                <Ionicons name="arrow-down-circle" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.controlRow}>
              <TouchableOpacity style={styles.controlButton} onPress={moveLeft}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={moveDown}>
                <Ionicons name="arrow-down" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={moveRight}>
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
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 10,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  levelText: {
    fontSize: 16,
  },
  linesText: {
    fontSize: 16,
  },
  nextText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  nextShapeContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 5,
    backgroundColor: '#f9f9f9',
  },
  nextShapeRow: {
    flexDirection: 'row',
  },
  nextShapeCell: {
    width: CELL_SIZE / 2,
    height: CELL_SIZE / 2,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  pauseButton: {
    padding: 5,
    borderRadius: 5,
    backgroundColor: '#ddd',
  },
  boardContainer: {
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: '#f0f0f0',
  },
  board: {
    width: BOARD_PIXEL_WIDTH,
    height: BOARD_PIXEL_HEIGHT,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  controls: {
    marginTop: 20,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 5,
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
  }
});

export default TetrisGame;