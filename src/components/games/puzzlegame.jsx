import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

// Obtenir les dimensions de l'écran
const { width } = Dimensions.get('window');
const TILE_SIZE = width / 4; // Ajuster selon vos besoins

const PuzzleGame = ({ onComplete }) => {
  const [puzzleType, setPuzzleType] = useState('slider');
  const [grid, setGrid] = useState([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [emptyTile, setEmptyTile] = useState({ row: 2, col: 2 }); // Pour le slider puzzle
  
  // Timer pour le jeu
  useEffect(() => {
    let timer;
    if (gameStarted && !gameOver) {
      timer = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameStarted, gameOver]);

  // Initialiser le jeu au démarrage
  useEffect(() => {
    initGame();
  }, [puzzleType]);

  // Initialiser le jeu
  const initGame = () => {
    setMoves(0);
    setTime(0);
    setGameStarted(false);
    setGameOver(false);
    
    if (puzzleType === 'slider') {
      initSliderPuzzle();
    } else if (puzzleType === 'jigsaw') {
      initJigsawPuzzle();
    } else if (puzzleType === 'mots') {
      initWordPuzzle();
    }
  };

  // Initialiser le Slider Puzzle
  const initSliderPuzzle = () => {
    // Créer une grille 3x3 ordonnée
    const newGrid = [];
    let count = 1;
    
    for (let i = 0; i < 3; i++) {
      const row = [];
      for (let j = 0; j < 3; j++) {
        if (i === 2 && j === 2) {
          row.push(0); // Case vide
        } else {
          row.push(count++);
        }
      }
      newGrid.push(row);
    }
    
    setGrid(newGrid);
    setEmptyTile({ row: 2, col: 2 });
    
    // Mélanger le puzzle après un court délai
    setTimeout(() => {
      shuffleGrid(newGrid);
    }, 500);
  };

  // Mélanger la grille du puzzle
  const shuffleGrid = (originalGrid) => {
    const newGrid = JSON.parse(JSON.stringify(originalGrid)); // Copie profonde
    let newEmptyTile = { ...emptyTile };
    
    // Effectuer des mouvements aléatoires valides pour mélanger
    const moves = 100; // Nombre de mouvements aléatoires
    
    for (let i = 0; i < moves; i++) {
      const possibleMoves = [];
      
      // Vérifier les mouvements possibles (haut, bas, gauche, droite)
      if (newEmptyTile.row > 0) possibleMoves.push({ row: newEmptyTile.row - 1, col: newEmptyTile.col }); // Haut
      if (newEmptyTile.row < 2) possibleMoves.push({ row: newEmptyTile.row + 1, col: newEmptyTile.col }); // Bas
      if (newEmptyTile.col > 0) possibleMoves.push({ row: newEmptyTile.row, col: newEmptyTile.col - 1 }); // Gauche
      if (newEmptyTile.col < 2) possibleMoves.push({ row: newEmptyTile.row, col: newEmptyTile.col + 1 }); // Droite
      
      // Choisir un mouvement aléatoire
      const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
      
      // Effectuer le mouvement
      newGrid[newEmptyTile.row][newEmptyTile.col] = newGrid[randomMove.row][randomMove.col];
      newGrid[randomMove.row][randomMove.col] = 0;
      newEmptyTile = { row: randomMove.row, col: randomMove.col };
    }
    
    setGrid(newGrid);
    setEmptyTile(newEmptyTile);
  };

  // Initialiser le Jigsaw Puzzle
  const initJigsawPuzzle = () => {
    // Placeholder pour le moment
    const newGrid = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9]
    ];
    setGrid(newGrid);
  };

  // Initialiser le Word Puzzle
  const initWordPuzzle = () => {
    // Placeholder pour le moment
    const newGrid = [
      ['A', 'B', 'C'],
      ['D', 'E', 'F'],
      ['G', 'H', 'I']
    ];
    setGrid(newGrid);
  };

  // Déplacer une tuile (pour le Slider Puzzle)
  const moveTile = (row, col) => {
    if (!gameStarted) {
      setGameStarted(true);
    }
    
    // Vérifier si la tuile peut être déplacée
    if (
      (Math.abs(row - emptyTile.row) === 1 && col === emptyTile.col) ||
      (Math.abs(col - emptyTile.col) === 1 && row === emptyTile.row)
    ) {
      // Copier la grille actuelle
      const newGrid = [...grid.map(r => [...r])];
      
      // Déplacer la tuile
      newGrid[emptyTile.row][emptyTile.col] = newGrid[row][col];
      newGrid[row][col] = 0;
      
      // Mettre à jour l'état
      setGrid(newGrid);
      setEmptyTile({ row, col });
      setMoves(moves + 1);
      
      // Vérifier si le puzzle est résolu
      checkIfSolved(newGrid);
    }
  };

  // Vérifier si le puzzle est résolu
  const checkIfSolved = (currentGrid) => {
    let solved = true;
    let count = 1;
    
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (i === 2 && j === 2) {
          if (currentGrid[i][j] !== 0) {
            solved = false;
            break;
          }
        } else if (currentGrid[i][j] !== count++) {
          solved = false;
          break;
        }
      }
      if (!solved) break;
    }
    
    if (solved) {
      setGameOver(true);
      if (onComplete) {
        // Calculer le score basé sur le nombre de mouvements et le temps
        const score = Math.max(0, 1000 - (moves * 5) - (time * 2));
        onComplete(score);
      }
    }
  };

  // Rendu des onglets de type de puzzle
  const renderPuzzleTabs = () => (
    <View style={styles.puzzleTabs}>
      <TouchableOpacity
        style={[styles.puzzleTab, puzzleType === 'slider' && styles.activeTab]}
        onPress={() => setPuzzleType('slider')}
      >
        <Text style={styles.puzzleTabText}>Slider</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.puzzleTab, puzzleType === 'jigsaw' && styles.activeTab]}
        onPress={() => setPuzzleType('jigsaw')}
      >
        <Text style={styles.puzzleTabText}>Jigsaw</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.puzzleTab, puzzleType === 'mots' && styles.activeTab]}
        onPress={() => setPuzzleType('mots')}
      >
        <Text style={styles.puzzleTabText}>Mots</Text>
      </TouchableOpacity>
    </View>
  );

  // Rendu des statistiques
  const renderStats = () => (
    <View style={styles.statsContainer}>
      <Text style={styles.statsText}>Mouvements: {moves}</Text>
      <Text style={styles.statsText}>Temps: {time}</Text>
    </View>
  );

  // Rendu du Slider Puzzle
  const renderSliderPuzzle = () => (
    <View style={styles.gridContainer}>
      {grid.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((tile, colIndex) => (
            <TouchableOpacity
              key={`tile-${rowIndex}-${colIndex}`}
              style={[
                styles.tile,
                tile === 0 && styles.emptyTile
              ]}
              onPress={() => moveTile(rowIndex, colIndex)}
              disabled={tile === 0}
            >
              {tile !== 0 && <Text style={styles.tileText}>{tile}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );

  // Rendu du jeu selon le type
  const renderPuzzle = () => {
    switch (puzzleType) {
      case 'slider':
        return renderSliderPuzzle();
      case 'jigsaw':
        return (
          <View style={styles.comingSoon}>
            <Text style={styles.comingSoonText}>À venir prochainement!</Text>
          </View>
        );
      case 'mots':
        return (
          <View style={styles.comingSoon}>
            <Text style={styles.comingSoonText}>À venir prochainement!</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderPuzzleTabs()}
      {renderStats()}
      {renderPuzzle()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  puzzleTabs: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  puzzleTab: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#c60c30',
  },
  puzzleTabText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statsText: {
    fontSize: 16,
    color: '#333',
  },
  gridContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  tile: {
    width: TILE_SIZE - 10,
    height: TILE_SIZE - 10,
    margin: 5,
    backgroundColor: '#c60c30',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTile: {
    backgroundColor: 'transparent',
  },
  tileText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  comingSoon: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  comingSoonText: {
    fontSize: 18,
    color: '#666',
  },
});

export default PuzzleGame;