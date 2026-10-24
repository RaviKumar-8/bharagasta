import React, { useEffect, useState, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Alert, LayoutAnimation } from 'react-native';
import { socket as defaultSocket } from '../socket';
import { feedback } from '../utils/feedback';

const screenWidth = Dimensions.get('window').width;
const cellSize = screenWidth * 0.095;
const boardSize = cellSize * 7;
const tokenSize = cellSize * 0.42;

const triangleWidth = cellSize * 1.6;
const triangleHeight = cellSize * 1.5;

// Exact matrix layout (Total 35 cells: 0 to 34, index 34 is Home [3,3])
const PATHS = {
  red: [
    [6,3], [6,4], [6,5], [6,6], [5,6], [4,6], [3,6], [2,6], [1,6], [0,6], 
    [0,5], [0,4], [0,3], [0,2], [0,1], [0,0], [1,0], [2,0], [3,0], [4,0], 
    [5,0], [6,0], [6,1], [6,2],
    [5,1], [4,1], [3,1], [2,1], [1,1], [1,2], [1,3], [1,4], [1,5], [2,5], 
    [3,5], [4,5], [5,5], [5,4], [5,3], [5,2], [4,2], [3,2], [2,2], [2,3], 
    [2,4], [3,4], [4,4], [4,3], [3,3]
  ],
  yellow: [
    [3,6], [2,6], [1,6], [0,6], [0,5], [0,4], [0,3], [0,2], [0,1], [0,0], 
    [1,0], [2,0], [3,0], [4,0], [5,0], [6,0], [6,1], [6,2], [6,3], [6,4], 
    [6,5], [6,6], [5,6], [4,6],
    [5,5], [5,4], [5,3], [5,2], [5,1], [4,1], [3,1], [2,1], [1,1], [1,2], 
    [1,3], [1,4], [1,5], [2,5], [3,5], [4,5], [4,4], [4,3], [4,2], [3,2], 
    [2,2], [2,3], [2,4], [3,4], [3,3]
  ],
  green: [
    [0,3], [0,2], [0,1], [0,0], [1,0], [2,0], [3,0], [4,0], [5,0], [6,0], 
    [6,1], [6,2], [6,3], [6,4], [6,5], [6,6], [5,6], [4,6], [3,6], [2,6], 
    [1,6], [0,6], [0,5], [0,4],
    [1,5], [2,5], [3,5], [4,5], [5,5], [5,4], [5,3], [5,2], [5,1], [4,1], 
    [3,1], [2,1], [1,1], [1,2], [1,3], [1,4], [2,4], [3,4], [4,4], [4,3], 
    [4,2], [3,2], [2,2], [2,3], [3,3]
  ],
  blue: [
    [3,0], [4,0], [5,0], [6,0], [6,1], [6,2], [6,3], [6,4], [6,5], [6,6], 
    [5,6], [4,6], [3,6], [2,6], [1,6], [0,6], [0,5], [0,4], [0,3], [0,2], 
    [0,1], [0,0], [1,0], [2,0],
    [1,1], [1,2], [1,3], [1,4], [1,5], [2,5], [3,5], [4,5], [5,5], [5,4], 
    [5,3], [5,2], [5,1], [4,1], [3,1], [2,1], [2,2], [2,3], [2,4], [3,4], 
    [4,4], [4,3], [4,2], [3,2], [3,3]
  ]
};

const isSafeZone = (row, col) => {
  return (row === 3 && col === 3) || (row === 0 && col === 3) || 
         (row === 1 && col === 1) || (row === 1 && col === 5) || 
         (row === 2 && col === 3) || (row === 4 && col === 3) || 
         (row === 6 && col === 3) || (row === 3 && col === 0) || 
         (row === 3 && col === 2) || (row === 3 && col === 4) || 
         (row === 5 && col === 1) || (row === 5 && col === 5) || 
         (row === 3 && col === 6);
};

const COLOR_CONFIG = {
  red: { hex: '#D32F2F', light: '#FFCDD2' },
  green: { hex: '#388E3C', light: '#C8E6C9' },
  yellow: { hex: '#FBC02D', light: '#FFF9C4' },
  blue: { hex: '#1976D2', light: '#BBDEFB' }
};

const generateInitialTokens = (activeColors) => {
  const initial = [];
  activeColors.forEach(color => {
    for (let i = 1; i <= 6; i++) {
      initial.push({ id: `${color}-${i}`, color, status: 'base', pathIndex: -1 });
    }
  });
  return initial;
};

export default function GameScreen({ navigation, playerName, gameConfig = {}, onLogout }) {
  const { 
    mode = 'online', 
    roomId = null, 
    playerColor = 'red', 
    roomData = null, 
    socket = defaultSocket,
    settings = {}
  } = gameConfig;

  const showHighlights = settings.showHighlights !== false;
  const isLocalOrAI = mode === 'ai' || mode === 'local';

  const playersList = roomData?.players || [];
  const isTwoPlayer = roomData?.targetPlayers === 2 || playersList.length === 2;
  const activeColors = isTwoPlayer ? ['red', 'green'] : ['red', 'yellow', 'green', 'blue'];

  const [diceResult, setDiceResult] = useState('Tap to Roll');
  const [diceValue, setDiceValue] = useState(null);
  const [carriedRoll, setCarriedRoll] = useState(null);

  const [tokens, setTokens] = useState(generateInitialTokens(activeColors));
  const [currentPlayer, setCurrentPlayer] = useState('red');
  const [turnTimer, setTurnTimer] = useState(20);
  const [hasRolled, setHasRolled] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasCapturedMap, setHasCapturedMap] = useState(
    roomData?.hasCaptured || { red: false, yellow: false, green: false, blue: false }
  );

  const tokensRef = useRef(tokens);
  useEffect(() => { tokensRef.current = tokens; }, [tokens]);

  const hasCapturedMapRef = useRef(hasCapturedMap);
  useEffect(() => { hasCapturedMapRef.current = hasCapturedMap; }, [hasCapturedMap]);

  const currentPlayerRef = useRef(currentPlayer);
  useEffect(() => { currentPlayerRef.current = currentPlayer; }, [currentPlayer]);

  const hasRolledRef = useRef(hasRolled);
  useEffect(() => { hasRolledRef.current = hasRolled; }, [hasRolled]);

  const diceValueRef = useRef(diceValue);
  useEffect(() => { diceValueRef.current = diceValue; }, [diceValue]);

  const carriedRollRef = useRef(carriedRoll);
  useEffect(() => { carriedRollRef.current = carriedRoll; }, [carriedRoll]);

  const isAnimatingRef = useRef(isAnimating);
  useEffect(() => { isAnimatingRef.current = isAnimating; }, [isAnimating]);

  const getBoardRotation = () => {
    if (isLocalOrAI) return '0deg';
    switch (playerColor) {
      case 'yellow': return '90deg';
      case 'green':  return '180deg';
      case 'blue':   return '270deg';
      case 'red':
      default:       return '0deg';
    }
  };

  const boardRotationDeg = getBoardRotation();

  // Evaluates legal moves
  const getMovableTokens = (tokensList, rollVal, activeColor) => {
    if (!rollVal) return [];
    const myTokens = tokensList.filter(t => t.color === activeColor);
    const path = PATHS[activeColor] || [];
    const hasCapture = Boolean(hasCapturedMapRef.current?.[activeColor]);

    return myTokens.filter(token => {
      // Base tokens can only exit on roll = 6
      if (token.status === 'base') {
        if (rollVal !== 6) return false;
        // Block release if entrance cell (index 0) has a friendly active token
        return !tokensList.some(
          t => t.id !== token.id && t.color === activeColor && t.status === 'active' && t.pathIndex === 0
        );
      }

      // Active tokens on grid
      if (token.status === 'active') {
        const dest = token.pathIndex + rollVal;

        // Cannot cross into inner spiral without a capture
        if (!hasCapture && dest > 23) return false;
        // Cannot overshoot Home Pod (last coordinate)
        if (dest > path.length - 1) return false;

        const targetCoord = path[dest];
        if (!targetCoord) return false;

        // Friendly collision check: Home Pod allows friendly tokens, other cells do not
        const isTargetHomePod = targetCoord[0] === 3 && targetCoord[1] === 3;
        if (!isTargetHomePod) {
          const friendlyCollision = tokensList.some(t => {
            if (t.id === token.id || t.color !== activeColor || t.status !== 'active') return false;
            const c = PATHS[t.color]?.[t.pathIndex];
            return c && c[0] === targetCoord[0] && c[1] === targetCoord[1];
          });
          if (friendlyCollision) return false;
        }

        return true;
      }

      return false;
    });
  };

  const rotateTurnLocal = () => {
    const turnOrder = isTwoPlayer ? ['red', 'green'] : ['red', 'yellow', 'green', 'blue'];
    const currentIdx = turnOrder.indexOf(currentPlayerRef.current);
    const nextColor = turnOrder[(currentIdx + 1) % turnOrder.length];
    setCurrentPlayer(nextColor);
    setHasRolled(false);
    setCarriedRoll(null);
    setDiceValue(null);
    setDiceResult('Tap to Roll');
    setTurnTimer(20);
  };

  // Local/AI timer
  useEffect(() => {
    if (!isLocalOrAI) return;

    const timer = setInterval(() => {
      setTurnTimer(prev => {
        if (prev <= 1) {
          rotateTurnLocal();
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLocalOrAI, currentPlayer]);

  // AI bot logic
  useEffect(() => {
    if (mode !== 'ai') return;
    if (currentPlayer === playerColor || isAnimating) return;

    const botRollTimer = setTimeout(() => {
      if (hasRolledRef.current) return;
      const rollPool1 = [0, 1, 2, 3];
      const rollPool2 = [0, 1, 2, 3];
      const botRoll1 = rollPool1[Math.floor(Math.random() * rollPool1.length)];
      const botRoll2 = rollPool2[Math.floor(Math.random() * rollPool2.length)];
      
      let botRoll = 0;
      if (botRoll1 === 0 && botRoll2 === 0) {
        botRoll = 12;
      } else {
        botRoll = botRoll1 + botRoll2;
      }

      feedback.playSound('roll');
      setDiceValue(botRoll);
      setTurnTimer(20);

      const activeOnBoard = tokensRef.current.filter(t => t.color === currentPlayer && t.status === 'active');

      // Bank 12 if no active tokens on the board
      if (activeOnBoard.length === 0 && botRoll === 12) {
        setCarriedRoll(12);
        setDiceResult(`Bot rolled 12! Banked for release.`);
        feedback.playSound('bonus');
        setHasRolled(false);
        return;
      }

      const movable = getMovableTokens(tokensRef.current, botRoll, currentPlayer);

      if (movable.length === 0) {
        if (botRoll === 6 || botRoll === 12) {
          setTimeout(() => {
            feedback.playSound('bonus');
            setHasRolled(false);
            setDiceValue(null);
            setDiceResult(`Bonus Roll (${botRoll})!`);
          }, 1200);
        } else {
          setCarriedRoll(null);
          setTimeout(() => {
            rotateTurnLocal();
          }, 1200);
        }
        return;
      }

      setHasRolled(true);
      setDiceResult(`Bot rolled: ${botRoll}`);

      const chosenToken = movable[0];

      setTimeout(() => {
        handleExecuteMoveLocal(chosenToken.id, botRoll, currentPlayer);
      }, 700);

    }, 800);

    return () => clearTimeout(botRollTimer);
  }, [mode, currentPlayer, hasRolled, isAnimating]);

  // Multiplayer Socket listeners
  useEffect(() => {
    if (isLocalOrAI) return;

    const handleTimerTick = ({ timeLeft }) => setTurnTimer(timeLeft);

    const handleDiceResult = ({ result, playerColor: rollerColor }) => {
      feedback.playSound('roll');
      setDiceValue(result);
      setDiceResult(`Result: ${result}`);
      setHasRolled(true);

      if (rollerColor === playerColor) {
        setTimeout(() => {
          const currentTokens = tokensRef.current;
          const movable = getMovableTokens(currentTokens, result, playerColor);

          if (movable.length === 1 && !isAnimatingRef.current) {
            socket.emit('MAKE_MOVE', { roomId, tokenId: movable[0].id });
          }
        }, 400);
      }
    };

    const handleTurnRotated = ({ currentPlayer: nextPlayer }) => {
      setCurrentPlayer(nextPlayer);
      setHasRolled(false);
      setCarriedRoll(null);
      setDiceValue(null);
      setDiceResult('Tap to Roll');
    };

    const handleBonusRollGranted = ({ message }) => {
      feedback.playSound('bonus');
      feedback.triggerHaptic('success');
      setDiceResult(message);
      setHasRolled(false);
      setDiceValue(null);
    };

    const handleCaptureUnlocked = ({ playerColor: unlockedColor, message }) => {
      feedback.playSound('bonus');
      feedback.triggerHaptic('success');
      setHasCapturedMap(prev => ({ ...prev, [unlockedColor]: true }));
      Alert.alert('🔓 Inner Gate Unlocked!', message);
    };

    const handleInvalidMove = ({ message }) => {
      feedback.triggerHaptic('warning');
      Alert.alert('Move Blocked', message);
    };

    const handleTurnTimeout = ({ currentPlayer: nextPlayer, message }) => {
      feedback.triggerHaptic('warning');
      Alert.alert('Turn Expired', message);
      setCurrentPlayer(nextPlayer);
      setHasRolled(false);
      setCarriedRoll(null);
      setDiceValue(null);
      setDiceResult('Tap to Roll');
    };

    const handleMoveConfirmed = (data) => {
      const { tokenId, startIdx, targetIdx, finalStatus, enemyCapturedId, nextPlayer, isBonusTurn } = data;

      const resetTurnState = () => {
        if (!isBonusTurn) {
          setCurrentPlayer(nextPlayer);
          setHasRolled(false);
          setCarriedRoll(null);
          setDiceValue(null);
          setDiceResult('Tap to Roll');
        } else {
          feedback.playSound('bonus');
          feedback.triggerHaptic('success');
          setHasRolled(false);
          setDiceValue(null);
          setDiceResult('Bonus Turn! Roll Again');
        }
      };

      if (startIdx === -1 && targetIdx === 0) {
        feedback.playSound('step');
        feedback.triggerHaptic('medium');
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, status: 'active', pathIndex: 0 } : t));
        resetTurnState();
        return;
      }

      animateTokenMovement(tokenId, startIdx, targetIdx, finalStatus, enemyCapturedId, resetTurnState);
    };

    const handleGameOver = ({ winnerColor, winnerName }) => {
      feedback.playSound('win');
      feedback.triggerHaptic('heavy');
      Alert.alert(
        '🏆 BHARAGASTA VICTORY!',
        `Player ${winnerName || winnerColor.toUpperCase()} has moved all 6 tokens HOME!`,
        [{ text: 'Back to Dashboard', onPress: () => navigation.navigate('dashboard') }]
      );
    };

    socket.on('TIMER_TICK', handleTimerTick);
    socket.on('DICE_RESULT', handleDiceResult);
    socket.on('TURN_ROTATED', handleTurnRotated);
    socket.on('BONUS_ROLL_GRANTED', handleBonusRollGranted);
    socket.on('CAPTURE_UNLOCKED', handleCaptureUnlocked);
    socket.on('INVALID_MOVE', handleInvalidMove);
    socket.on('TURN_TIMEOUT', handleTurnTimeout);
    socket.on('MOVE_CONFIRMED', handleMoveConfirmed);
    socket.on('GAME_OVER', handleGameOver);

    return () => {
      socket.off('TIMER_TICK', handleTimerTick);
      socket.off('DICE_RESULT', handleDiceResult);
      socket.off('TURN_ROTATED', handleTurnRotated);
      socket.off('BONUS_ROLL_GRANTED', handleBonusRollGranted);
      socket.off('CAPTURE_UNLOCKED', handleCaptureUnlocked);
      socket.off('INVALID_MOVE', handleInvalidMove);
      socket.off('TURN_TIMEOUT', handleTurnTimeout);
      socket.off('MOVE_CONFIRMED', handleMoveConfirmed);
      socket.off('GAME_OVER', handleGameOver);
    };
  }, [isLocalOrAI]);

  const handleRoll = () => {
    if (isAnimating || hasRolled) return;

    feedback.playSound('roll');
    feedback.triggerHaptic('medium');

    if (isLocalOrAI) {
      if (mode === 'ai' && currentPlayer !== playerColor) return;

      const rollPool1 = [0, 1, 2, 3];
      const rollPool2 = [0, 1, 2, 3];
      const roll1 = rollPool1[Math.floor(Math.random() * rollPool1.length)];
      const roll2 = rollPool2[Math.floor(Math.random() * rollPool2.length)];

      let roll = 0;
      if (roll1 === 0 && roll2 === 0) {
        roll = 12;
      } else {
        roll = roll1 + roll2;
      }
      
      setDiceValue(roll);
      setTurnTimer(20);

      const activeOnBoard = tokensRef.current.filter(t => t.color === currentPlayer && t.status === 'active');

      // 12 Bank Rule: When no active tokens on board, bank 12 and prompt for 6
      if (activeOnBoard.length === 0 && roll === 12) {
        setCarriedRoll(12);
        setHasRolled(false);
        setDiceResult('Rolled 12! Banked. Roll again for 6 to release token!');
        feedback.playSound('bonus');
        return;
      }

      const movable = getMovableTokens(tokensRef.current, roll, currentPlayer);

      if (movable.length === 0) {
        if (roll === 6 || roll === 12) {
          setTimeout(() => {
            feedback.playSound('bonus');
            setHasRolled(false);
            setDiceValue(null);
            setDiceResult(`Rolled ${roll}! Bonus roll granted.`);
          }, 1200);
        } else {
          setCarriedRoll(null);
          setDiceResult(`Rolled ${roll}. Turn skipped.`);
          setTimeout(() => {
            rotateTurnLocal();
          }, 1200);
        }
        return;
      }

      setHasRolled(true);
      setDiceResult(carriedRollRef.current ? `Result: ${roll} (+ Banked ${carriedRollRef.current})` : `Result: ${roll}`);

      // Auto-move if exactly 1 token can legally move
      if (movable.length === 1) {
        setTimeout(() => {
          if (!isAnimatingRef.current) {
            handleExecuteMoveLocal(movable[0].id, roll, currentPlayer);
          }
        }, 350);
      }
      return;
    }

    if (playerColor && currentPlayer !== playerColor) {
      Alert.alert('Wait Your Turn', `It is currently ${currentPlayer.toUpperCase()}'s turn.`);
      return;
    }
    socket.emit('ROLL_DICE', { roomId });
  };

  const handleExecuteMoveLocal = (tokenId, roll, activeColor) => {
    const token = tokensRef.current.find(t => t.id === tokenId);
    if (!token) return;

    const path = PATHS[token.color] || [];
    let startIdx = token.pathIndex;
    let targetIdx = startIdx;
    let finalStatus = token.status;
    let enemyCaptured = null;
    const bankedBonus = carriedRollRef.current;

    if (token.status === 'base') {
      finalStatus = 'active';
      // If 12 was banked, release at 0 and move directly to tile 12
      targetIdx = bankedBonus ? bankedBonus : 0;
      setCarriedRoll(null);
    } else if (token.status === 'active') {
      targetIdx = token.pathIndex + roll;
      if (targetIdx >= path.length - 1) {
        targetIdx = path.length - 1;
        finalStatus = 'home';
      }
    }

    if (finalStatus === 'active') {
      const targetCoord = path[targetIdx];
      if (targetCoord && !isSafeZone(targetCoord[0], targetCoord[1])) {
        enemyCaptured = tokensRef.current.find(t => {
          if (t.color === token.color || t.status !== 'active') return false;
          const enemyCoord = PATHS[t.color]?.[t.pathIndex];
          return enemyCoord && enemyCoord[0] === targetCoord[0] && enemyCoord[1] === targetCoord[1];
        });

        if (enemyCaptured) {
          enemyCaptured.status = 'base';
          enemyCaptured.pathIndex = -1;
          setHasCapturedMap(prev => ({ ...prev, [token.color]: true }));
          feedback.playSound('capture');
          feedback.triggerHaptic('heavy');
          Alert.alert('⚔️ Capture!', `${token.color.toUpperCase()} knocked out an enemy! Inner gate unlocked!`);
        }
      }
    }

    // BONUS TURN RULES:
    // 1. Roll 6 or 12
    // 2. Used a banked 12
    // 3. Captured an enemy piece
    // 4. Token reached the center Home Pod (finalStatus === 'home')
    const reachedHome = finalStatus === 'home';
    const isBonus = roll === 6 || roll === 12 || Boolean(bankedBonus) || Boolean(enemyCaptured) || reachedHome;

    const resetTurn = () => {
      // Direct count check: calculate existing home tokens plus 1 if this token just reached home
      const existingHomeCount = tokensRef.current.filter(t => t.color === token.color && t.id !== token.id && t.status === 'home').length;
      const totalHomeTokens = existingHomeCount + (reachedHome ? 1 : 0);

      if (totalHomeTokens >= 6) {
        feedback.playSound('win');
        feedback.triggerHaptic('heavy');
        Alert.alert('🏆 VICTORY!', `Player ${token.color.toUpperCase()} has moved all 6 tokens HOME!`, [
          { text: 'Back to Dashboard', onPress: () => navigation.navigate('dashboard') }
        ]);
        return;
      }

      if (!isBonus) {
        rotateTurnLocal();
      } else {
        feedback.playSound('bonus');
        feedback.triggerHaptic('success');
        setHasRolled(false);
        setDiceValue(null);
        if (reachedHome) {
          setDiceResult('🌟 Home Reached! Bonus Turn Granted.');
        } else if (enemyCaptured) {
          setDiceResult('⚔️ Capture! Bonus Turn Granted.');
        } else {
          setDiceResult('Bonus Turn! Roll Again');
        }
      }
    };

    // If released without banked 12, drop directly onto tile 0
    if (startIdx === -1 && targetIdx === 0) {
      feedback.playSound('step');
      feedback.triggerHaptic('medium');
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, status: 'active', pathIndex: 0 } : t));
      resetTurn();
      return;
    }

    // Step-by-step walk: starts from entrance (0) if releasing with banked 12
    animateTokenMovement(tokenId, startIdx === -1 ? 0 : startIdx, targetIdx, finalStatus, enemyCaptured ? enemyCaptured.id : null, resetTurn);
  };

  const handleTokenPress = (tokenId) => {
    if (isAnimating || !hasRolled) return;

    const token = tokens.find(t => t.id === tokenId);
    if (!token || token.status === 'home') return;

    if (mode === 'online' && token.color !== playerColor) {
      Alert.alert('Wrong Token', `You can only control your own tokens (${playerColor.toUpperCase()}).`);
      return;
    }

    if (token.color !== currentPlayer) {
      Alert.alert('Not Your Turn', `It is ${currentPlayer.toUpperCase()}'s turn.`);
      return;
    }

    if (isLocalOrAI) {
      handleExecuteMoveLocal(tokenId, diceValue, currentPlayer);
    } else {
      socket.emit('MAKE_MOVE', { roomId, tokenId });
    }
  };

  const animateCapture = (capturedId, onComplete) => {
    const enemy = tokensRef.current.find(t => t.id === capturedId);
    if (!enemy) return onComplete && onComplete();

    let step = enemy.pathIndex;
    const interval = setInterval(() => {
      step--;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTokens(prev => prev.map(t => t.id === capturedId ? { ...t, pathIndex: step, status: step < 0 ? 'base' : 'active' } : t));

      if (step < 0) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 40);
  };

  const animateTokenMovement = (tokenId, startIdx, targetIdx, finalStatus, enemyCapturedId, onFinish) => {
    setIsAnimating(true);
    let currentStep = startIdx;

    const interval = setInterval(() => {
      currentStep++;
      feedback.playSound('step');
      feedback.triggerHaptic('light');
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      setTokens(prev => prev.map(t => {
        if (t.id === tokenId) {
          return {
            ...t,
            pathIndex: currentStep,
            status: currentStep >= targetIdx ? finalStatus : 'active'
          };
        }
        return t;
      }));

      if (currentStep >= targetIdx) {
        clearInterval(interval);
        if (enemyCapturedId) {
          animateCapture(enemyCapturedId, () => {
            setIsAnimating(false);
            if (onFinish) onFinish();
          });
        } else {
          setIsAnimating(false);
          if (onFinish) onFinish();
        }
      }
    }, 180);
  };

  const handleExitGame = () => {
    Alert.alert(
      'Exit Match',
      'Are you sure you want to quit and return to Dashboard?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave Game',
          style: 'destructive',
          onPress: () => {
            if (mode === 'online' && socket) {
              socket.emit('LEAVE_ROOM', { roomId });
            }
            navigation.navigate('dashboard');
          }
        }
      ]
    );
  };

  const PinToken = ({ color, isElevated, styleOverrides = {} }) => {
    const counterRotate = `-${boardRotationDeg}`;
    return (
      <View
        style={[
          styles.pinToken,
          {
            backgroundColor: COLOR_CONFIG[color]?.hex || color,
            transform: [{ rotate: '45deg' }, { rotate: counterRotate }]
          },
          isElevated && styles.elevatedToken,
          styleOverrides
        ]}
      >
        <View style={styles.pinInnerCircle} />
      </View>
    );
  };

  const renderBase = (teamColor, rotationDeg) => {
    if (!activeColors.includes(teamColor)) {
      return <View style={styles.triangleBoundingBox} />;
    }

    const baseTokens = tokens.filter(t => t.color === teamColor && t.status === 'base');
    const pyramidSpots = [[0], [1, 2], [3, 4, 5]];
    const isCurrentTeam = teamColor === currentPlayer;
    const shouldElevateBase = isCurrentTeam && diceValue === 6 && hasRolled;
    const baseColorHex = COLOR_CONFIG[teamColor]?.light || '#FFCDD2';

    return (
      <View style={[styles.triangleBoundingBox, { transform: [{ rotate: rotationDeg }] }]}>
        <View style={[styles.triangle, { borderBottomColor: baseColorHex }]} />
        <View style={styles.pyramidContainer}>
          {pyramidSpots.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.pyramidRow}>
              {row.map(spotIndex => {
                const t = baseTokens[spotIndex];
                return t ? (
                  <TouchableOpacity key={t.id} onPress={() => handleTokenPress(t.id)}>
                    <PinToken color={t.color} isElevated={shouldElevateBase} styleOverrides={{ margin: 2 }} />
                  </TouchableOpacity>
                ) : (
                  <View key={`empty-${spotIndex}`} style={{ width: tokenSize, height: tokenSize, margin: 2 }} />
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderHomePod = () => {
    const homeTokens = tokens.filter(t => t.status === 'home');

    if (isTwoPlayer) {
      const matchColors = ['red', 'green'];
      return (
        <View style={styles.homePodContainer2P}>
          {matchColors.map((col, idx) => {
            const count = homeTokens.filter(t => t.color === col).length;
            return (
              <View
                key={col}
                style={[
                  styles.homePodSection2P,
                  { backgroundColor: COLOR_CONFIG[col]?.light || '#FFF' },
                  idx === 0 && { borderBottomWidth: 1, borderBottomColor: '#4A148C' }
                ]}
              >
                {count > 0 ? (
                  <View style={styles.homeTokenBadge}>
                    <View style={[styles.homeMiniPin, { backgroundColor: COLOR_CONFIG[col]?.hex || col }]} />
                    <Text style={styles.homeBadgeText}>{count}</Text>
                  </View>
                ) : (
                  <Text style={styles.homeCrownIcon}>⭐</Text>
                )}
              </View>
            );
          })}
        </View>
      );
    }

    const fourColors = ['red', 'yellow', 'green', 'blue'];
    return (
      <View style={styles.homePodContainer4P}>
        {fourColors.map(col => {
          const count = homeTokens.filter(t => t.color === col).length;
          return (
            <View
              key={col}
              style={[
                styles.homePodSection4P,
                { backgroundColor: COLOR_CONFIG[col]?.light || '#FFF' }
              ]}
            >
              {count > 0 ? (
                <View style={styles.homeTokenBadge}>
                  <View style={[styles.homeMiniPin, { backgroundColor: COLOR_CONFIG[col]?.hex || col }]} />
                  <Text style={styles.homeBadgeText}>{count}</Text>
                </View>
              ) : (
                <Text style={styles.homeCrownIcon}>⭐</Text>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  // Target highlight calculation
  const highlightedCells = useMemo(() => {
    if (!showHighlights || !hasRolled || isAnimating || currentPlayer !== playerColor || !diceValue) {
      return new Set();
    }

    const movable = getMovableTokens(tokens, diceValue, playerColor);
    const validCoords = new Set();
    const myPath = PATHS[playerColor] || [];
    const bankedBonus = carriedRoll;

    movable.forEach(t => {
      if (t.status === 'base') {
        const dest = bankedBonus ? bankedBonus : 0;
        const coord = myPath[dest];
        if (coord) validCoords.add(`${coord[0]}-${coord[1]}`);
      } else if (t.status === 'active') {
        const destIdx = t.pathIndex + diceValue;
        const coord = myPath[destIdx];
        if (coord) validCoords.add(`${coord[0]}-${coord[1]}`);
      }
    });

    return validCoords;
  }, [showHighlights, hasRolled, isAnimating, currentPlayer, playerColor, diceValue, tokens, carriedRoll]);

  const renderCell = (row, col) => {
    if (row === 3 && col === 3) {
      return (
        <View key="3-3" style={[styles.cell, { width: cellSize, height: cellSize, padding: 0 }]}>
          {renderHomePod()}
        </View>
      );
    }

    const isTargetTile = highlightedCells.has(`${row}-${col}`);
    let cellColor = '#FFFFFF';
    let cellText = isSafeZone(row, col) ? '❌' : '';

    if (row === 0 && col === 3) cellColor = COLOR_CONFIG.green.light;
    if (row === 1 && col === 5) cellColor = COLOR_CONFIG.green.light;
    if (row === 2 && col === 3) cellColor = COLOR_CONFIG.green.light;

    if (row === 6 && col === 3) cellColor = COLOR_CONFIG.red.light;
    if (row === 5 && col === 1) cellColor = COLOR_CONFIG.red.light;
    if (row === 4 && col === 3) cellColor = COLOR_CONFIG.red.light;

    if (row === 3 && col === 0) cellColor = COLOR_CONFIG.blue.light;
    if (row === 1 && col === 1) cellColor = COLOR_CONFIG.blue.light;
    if (row === 3 && col === 2) cellColor = COLOR_CONFIG.blue.light;

    if (row === 3 && col === 6) cellColor = COLOR_CONFIG.yellow.light;
    if (row === 5 && col === 5) cellColor = COLOR_CONFIG.yellow.light;
    if (row === 3 && col === 4) cellColor = COLOR_CONFIG.yellow.light;

    return (
      <View
        key={`${row}-${col}`}
        style={[
          styles.cell,
          { backgroundColor: cellColor, width: cellSize, height: cellSize },
          isTargetTile && styles.highlightedCell
        ]}
      >
        <Text style={[styles.cellText, isTargetTile && styles.highlightedText]}>
          {isTargetTile ? '🎯' : cellText}
        </Text>
      </View>
    );
  };

  const renderBoard = () => {
    const board = [];
    for (let r = 0; r < 7; r++) {
      const row = [];
      for (let c = 0; c < 7; c++) {
        row.push(renderCell(r, c));
      }
      board.push(<View key={r} style={styles.row}>{row}</View>);
    }
    return board;
  };

  const activeTokens = tokens.filter(t => t.status === 'active');
  const cellTokenMap = {};
  activeTokens.forEach(token => {
    const pathArr = PATHS[token.color] || [];
    const coord = pathArr[token.pathIndex];
    if (!coord) return;
    const key = `${coord[0]}-${coord[1]}`;
    if (!cellTokenMap[key]) cellTokenMap[key] = [];
    cellTokenMap[key].push(token);
  });

  const getPlayerCardData = (targetColor) => {
    if (!targetColor) return null;
    const isUser = targetColor === playerColor;
    const found = playersList.find(p => p.color === targetColor);

    let defaultName = 'Bot';
    if (targetColor === 'yellow') defaultName = 'Bot 1';
    else if (targetColor === 'green') defaultName = isTwoPlayer ? 'Bot 1' : 'Bot 2';
    else if (targetColor === 'blue') defaultName = 'Bot 3';

    const displayName = isUser ? `You (${playerName || 'Player'})` : (found?.username || defaultName);
    return { color: targetColor, displayName, isTurn: currentPlayer === targetColor };
  };

  const pBottomLeft = getPlayerCardData('red');
  const pBottomRight = !isTwoPlayer ? getPlayerCardData('yellow') : null;
  const pUpperRight = !isTwoPlayer ? getPlayerCardData('green') : null;
  const pUpperLeft = isTwoPlayer ? getPlayerCardData('green') : getPlayerCardData('blue');

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.exitBtn} onPress={handleExitGame}>
          <Text style={styles.exitBtnText}>← Exit</Text>
        </TouchableOpacity>

        <View style={[styles.timerCircle, turnTimer <= 5 && { borderColor: '#D32F2F', backgroundColor: '#FFEBEE' }]}>
          <Text style={[styles.timerCircleText, turnTimer <= 5 && { color: '#D32F2F' }]}>{turnTimer}s</Text>
        </View>

        <Text style={styles.modeBadge}>
          {mode === 'ai' ? '🤖 AI' : mode === 'local' ? '📱 Local' : '🌐 Online'} ({isTwoPlayer ? '2P' : '4P'})
        </Text>
      </View>

      {/* Top Players Row */}
      <View style={styles.topPlayersRow}>
        {pUpperLeft ? (
          <View style={[styles.cornerPlayerCard, pUpperLeft.isTurn && { borderColor: COLOR_CONFIG[pUpperLeft.color]?.hex, borderWidth: 2 }]}>
            <View style={[styles.colorIndicator, { backgroundColor: COLOR_CONFIG[pUpperLeft.color]?.hex }]} />
            <View>
              <Text numberOfLines={1} style={styles.cornerPlayerName}>{pUpperLeft.displayName}</Text>
              <Text style={[styles.cornerPlayerStatus, { color: COLOR_CONFIG[pUpperLeft.color]?.hex }]}>
                {pUpperLeft.color.toUpperCase()} {pUpperLeft.isTurn ? '• TURN' : ''}
              </Text>
            </View>
          </View>
        ) : <View style={{ width: 135 }} />}

        {pUpperRight ? (
          <View style={[styles.cornerPlayerCard, pUpperRight.isTurn && { borderColor: COLOR_CONFIG[pUpperRight.color]?.hex, borderWidth: 2 }]}>
            <View style={[styles.colorIndicator, { backgroundColor: COLOR_CONFIG[pUpperRight.color]?.hex }]} />
            <View>
              <Text numberOfLines={1} style={styles.cornerPlayerName}>{pUpperRight.displayName}</Text>
              <Text style={[styles.cornerPlayerStatus, { color: COLOR_CONFIG[pUpperRight.color]?.hex }]}>
                {pUpperRight.color.toUpperCase()} {pUpperRight.isTurn ? '• TURN' : ''}
              </Text>
            </View>
          </View>
        ) : <View style={{ width: 135 }} />}
      </View>

      {/* Dynamic Oriented Board */}
      <View style={[styles.gameLayout, { transform: [{ rotate: boardRotationDeg }] }]}>
        {renderBase('green', '0deg')}

        <View style={styles.middleRow}>
          {renderBase('blue', '-90deg')}

          <View style={styles.boardContainer}>
            {renderBoard()}

            {Object.entries(cellTokenMap).map(([key, tokensOnCell]) => {
              const [rStr, cStr] = key.split('-');
              const r = parseInt(rStr, 10);
              const c = parseInt(cStr, 10);
              const totalOnCell = tokensOnCell.length;

              return tokensOnCell.map((token, index) => {
                const isCurrent = token.color === currentPlayer;
                const shouldElevateGridToken = isCurrent && hasRolled;

                let offsetX = 0;
                let offsetY = 0;
                let scaleOverride = 1;

                if (totalOnCell > 1) {
                  const angle = (index / totalOnCell) * 2 * Math.PI - Math.PI / 2;
                  const radius = cellSize * 0.22;
                  offsetX = Math.cos(angle) * radius;
                  offsetY = Math.sin(angle) * radius;
                  scaleOverride = 0.82;
                }

                return (
                  <TouchableOpacity
                    key={token.id}
                    onPress={() => handleTokenPress(token.id)}
                    style={{
                      position: 'absolute',
                      top: (r * cellSize) + offsetY,
                      left: (c * cellSize) + offsetX,
                      width: cellSize,
                      height: cellSize,
                      justifyContent: 'center',
                      alignItems: 'center',
                      zIndex: isCurrent ? 60 : 10 + index
                    }}
                  >
                    <PinToken 
                      color={token.color} 
                      isElevated={shouldElevateGridToken} 
                      styleOverrides={totalOnCell > 1 ? { transform: [{ scale: scaleOverride }] } : {}}
                    />
                  </TouchableOpacity>
                );
              });
            })}
          </View>

          {renderBase('yellow', '90deg')}
        </View>

        {renderBase('red', '180deg')}
      </View>

      {/* Bottom Players & Controls Strip */}
      <View style={styles.bottomSection}>
        {/* Bottom Players Row: Bottom-Left (Red) & Bottom-Right (Yellow) */}
        <View style={styles.bottomPlayersRow}>
          {pBottomLeft ? (
            <View style={[styles.cornerPlayerCard, pBottomLeft.isTurn && { borderColor: COLOR_CONFIG[pBottomLeft.color]?.hex, borderWidth: 2 }]}>
              <View style={[styles.colorIndicator, { backgroundColor: COLOR_CONFIG[pBottomLeft.color]?.hex }]} />
              <View>
                <Text numberOfLines={1} style={styles.cornerPlayerName}>{pBottomLeft.displayName}</Text>
                <Text style={[styles.cornerPlayerStatus, { color: COLOR_CONFIG[pBottomLeft.color]?.hex }]}>
                  {pBottomLeft.color.toUpperCase()} {pBottomLeft.isTurn ? '• TURN' : ''}
                </Text>
              </View>
            </View>
          ) : <View style={{ width: 135 }} />}

          {pBottomRight ? (
            <View style={[styles.cornerPlayerCard, pBottomRight.isTurn && { borderColor: COLOR_CONFIG[pBottomRight.color]?.hex, borderWidth: 2 }]}>
              <View style={[styles.colorIndicator, { backgroundColor: COLOR_CONFIG[pBottomRight.color]?.hex }]} />
              <View>
                <Text numberOfLines={1} style={styles.cornerPlayerName}>{pBottomRight.displayName}</Text>
                <Text style={[styles.cornerPlayerStatus, { color: COLOR_CONFIG[pBottomRight.color]?.hex }]}>
                  {pBottomRight.color.toUpperCase()} {pBottomRight.isTurn ? '• TURN' : ''}
                </Text>
              </View>
            </View>
          ) : <View style={{ width: 135 }} />}
        </View>

        {/* Turn Indicator & Roll Button */}
        <View style={styles.controlsContainer}>
          <Text style={[styles.turnIndicator, { color: COLOR_CONFIG[currentPlayer]?.hex }]}>
            {currentPlayer === playerColor ? 'YOUR TURN' : `${currentPlayer.toUpperCase()}'S TURN`}
          </Text>

          <Text style={styles.diceText}>{diceResult}</Text>

          <TouchableOpacity
            onPress={handleRoll}
            style={[
              styles.rollButton, 
              (isAnimating || hasRolled || (mode !== 'local' && currentPlayer !== playerColor)) && { backgroundColor: '#A5D6A7' }
            ]}
            disabled={isAnimating || hasRolled || (mode !== 'local' && currentPlayer !== playerColor)}
          >
            <Text style={styles.rollButtonText}>
              {currentPlayer !== playerColor && mode !== 'local' 
                ? 'WAITING FOR TURN...' 
                : (hasRolled ? 'MAKE YOUR MOVE' : 'ROLL DICE')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5', justifyContent: 'center', alignItems: 'center', padding: 15 },
  headerRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 6
  },
  topPlayersRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4
  },
  bottomSection: {
    width: '100%',
    marginTop: 8,
    alignItems: 'center'
  },
  bottomPlayersRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4
  },
  cornerPlayerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    width: 135
  },
  cornerPlayerName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    maxWidth: 95
  },
  cornerPlayerStatus: {
    fontSize: 10,
    fontWeight: '800'
  },
  colorIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6
  },
  timerCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center'
  },
  timerCircleText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1976D2'
  },
  exitBtn: {
    backgroundColor: '#ECEFF1',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CFD8DC'
  },
  exitBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#455A64'
  },
  modeBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#78909C'
  },
  gameLayout: { alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  middleRow: { flexDirection: 'row', alignItems: 'center' },
  boardContainer: { width: boardSize + 4, height: boardSize + 4, borderWidth: 2, borderColor: '#333', backgroundColor: '#FFF' },
  triangleBoundingBox: { width: triangleWidth, height: triangleHeight, justifyContent: 'flex-end', alignItems: 'center' },
  triangle: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: triangleWidth / 2, borderRightWidth: triangleWidth / 2, borderBottomWidth: triangleHeight, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  pyramidContainer: { position: 'absolute', bottom: cellSize * 0.1, alignItems: 'center' },
  pyramidRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  row: { flex: 1, flexDirection: 'row' },
  cell: { borderWidth: 0.5, borderColor: '#999', justifyContent: 'center', alignItems: 'center' },
  cellText: { fontSize: 16 },
  highlightedCell: {
    borderColor: '#FFD700',
    borderWidth: 2,
    backgroundColor: '#FFF9C4',
    elevation: 3,
    shadowColor: '#F57F17',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 2,
  },
  highlightedText: {
    fontSize: 14,
    transform: [{ scale: 1.15 }],
  },
  homePodContainer2P: { width: '100%', height: '100%', flexDirection: 'column', borderWidth: 1.5, borderColor: '#4A148C' },
  homePodSection2P: { width: '100%', height: '50%', justifyContent: 'center', alignItems: 'center' },
  homePodContainer4P: { width: '100%', height: '100%', flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1.5, borderColor: '#4A148C' },
  homePodSection4P: { width: '50%', height: '50%', justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: '#7E57C2' },
  homeCrownIcon: { fontSize: 9 },
  homeTokenBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  homeMiniPin: { width: 6, height: 6, borderRadius: 3, marginRight: 2 },
  homeBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#333' },
  pinToken: {
    width: tokenSize,
    height: tokenSize,
    borderTopLeftRadius: tokenSize / 2,
    borderTopRightRadius: tokenSize / 2,
    borderBottomLeftRadius: tokenSize / 2,
    borderBottomRightRadius: 0,
    borderWidth: 1.5,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4
  },
  elevatedToken: {
    borderWidth: 2.5,
    borderColor: '#000',
    elevation: 8,
    transform: [{ scale: 1.1 }]
  },
  pinInnerCircle: {
    width: tokenSize * 0.4,
    height: tokenSize * 0.4,
    borderRadius: tokenSize * 0.2,
    backgroundColor: 'rgba(255, 255, 255, 0.75)'
  },
  controlsContainer: { alignItems: 'center', width: '100%' },
  turnIndicator: { fontSize: 17, fontWeight: '900', marginBottom: 2, letterSpacing: 1 },
  diceText: { fontSize: 19, marginBottom: 6, fontWeight: 'bold', color: '#333' },
  rollButton: { backgroundColor: '#4CAF50', paddingVertical: 11, paddingHorizontal: 36, borderRadius: 8, elevation: 3 },
  rollButtonText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' }
});