import { useState, useCallback } from 'react';
import { LUDO_DATA, PlayerColor, TokenState, Position } from '@/data/ludoData';

const PLAYERS: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

const initializeTokens = (): Record<PlayerColor, TokenState[]> => {
  const tokens: Record<PlayerColor, TokenState[]> = {} as any;
  PLAYERS.forEach((color) => {
    tokens[color] = Array.from({ length: 4 }, (_, i) => ({
      id: i,
      color,
      pathIndex: -1, // In base
      isFinished: false,
    }));
  });
  return tokens;
};

export const useLudoGame = () => {
  const [tokens, setTokens] = useState<Record<PlayerColor, TokenState[]>>(initializeTokens);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerColor>('red');
  const [diceValue, setDiceValue] = useState<number>(1);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [hasRolled, setHasRolled] = useState<boolean>(false);
  const [selectedToken, setSelectedToken] = useState<number | null>(null);
  const [gameMessage, setGameMessage] = useState<string>('Red player, roll the dice!');
  const [winner, setWinner] = useState<PlayerColor | null>(null);

  const getPlayerPath = (color: PlayerColor): Position[] => {
    return LUDO_DATA[color].path;
  };

  const getPlayerBase = (color: PlayerColor): Position[] => {
    return LUDO_DATA[color].base;
  };

  const getTokenPosition = (token: TokenState): Position => {
    if (token.isFinished) {
      const path = getPlayerPath(token.color);
      return path[path.length - 1];
    }
    if (token.pathIndex === -1) {
      return getPlayerBase(token.color)[token.id];
    }
    return getPlayerPath(token.color)[token.pathIndex];
  };

  const canMoveToken = (token: TokenState, diceVal: number): boolean => {
    if (token.isFinished) return false;
    
    const path = getPlayerPath(token.color);
    
    // Token in base - needs 6 to come out
    if (token.pathIndex === -1) {
      return diceVal === 6;
    }
    
    // Check if move would go beyond the finish
    const newIndex = token.pathIndex + diceVal;
    return newIndex <= path.length - 1;
  };

  const getMovableTokens = useCallback((color: PlayerColor, diceVal: number): number[] => {
    return tokens[color]
      .filter((token) => canMoveToken(token, diceVal))
      .map((token) => token.id);
  }, [tokens]);

  const checkForCapture = (color: PlayerColor, position: Position): PlayerColor | null => {
    // Check if position is safe
    if (position.isSafe) return null;
    
    // Check all other players' tokens
    for (const otherColor of PLAYERS) {
      if (otherColor === color) continue;
      
      for (const token of tokens[otherColor]) {
        if (token.pathIndex === -1 || token.isFinished) continue;
        
        const tokenPos = getTokenPosition(token);
        if (Math.abs(tokenPos.x - position.x) < 0.1 && Math.abs(tokenPos.y - position.y) < 0.1) {
          return otherColor;
        }
      }
    }
    return null;
  };

  const rollDice = useCallback(() => {
    if (isRolling || hasRolled || winner) return;
    
    setIsRolling(true);
    setSelectedToken(null);
    
    setTimeout(() => {
      const value = Math.floor(Math.random() * 6) + 1;
      setDiceValue(value);
      setIsRolling(false);
      setHasRolled(true);
      
      const movableTokens = getMovableTokens(currentPlayer, value);
      
      if (movableTokens.length === 0) {
        setGameMessage(`${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} rolled ${value} - No moves available!`);
        setTimeout(() => {
          nextTurn(false);
        }, 1500);
      } else if (movableTokens.length === 1) {
        // Auto-select the only movable token
        setSelectedToken(movableTokens[0]);
        setGameMessage(`${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} rolled ${value} - Click your token to move!`);
      } else {
        setGameMessage(`${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} rolled ${value} - Select a token to move!`);
      }
    }, 500);
  }, [isRolling, hasRolled, currentPlayer, getMovableTokens, winner]);

  const nextTurn = useCallback((gotSix: boolean) => {
    if (!gotSix) {
      const nextIndex = (PLAYERS.indexOf(currentPlayer) + 1) % 4;
      setCurrentPlayer(PLAYERS[nextIndex]);
      setGameMessage(`${PLAYERS[nextIndex].charAt(0).toUpperCase() + PLAYERS[nextIndex].slice(1)} player, roll the dice!`);
    } else {
      setGameMessage(`${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} got 6! Roll again!`);
    }
    setHasRolled(false);
    setSelectedToken(null);
  }, [currentPlayer]);

  const moveToken = useCallback((tokenId: number) => {
    if (!hasRolled || winner) return;
    
    const token = tokens[currentPlayer][tokenId];
    if (!canMoveToken(token, diceValue)) return;
    
    const path = getPlayerPath(currentPlayer);
    let newPathIndex: number;
    let gotBonus = false;
    let capturedColor: PlayerColor | null = null;
    
    if (token.pathIndex === -1) {
      // Coming out of base
      newPathIndex = 0;
    } else {
      newPathIndex = token.pathIndex + diceValue;
    }
    
    const newPosition = path[newPathIndex];
    const isFinishing = newPathIndex === path.length - 1;
    
    // Check for capture before moving
    if (!isFinishing) {
      capturedColor = checkForCapture(currentPlayer, newPosition);
    }
    
    setTokens((prev) => {
      const updated = { ...prev };
      
      // Update current player's token
      updated[currentPlayer] = prev[currentPlayer].map((t) =>
        t.id === tokenId
          ? { ...t, pathIndex: newPathIndex, isFinished: isFinishing }
          : t
      );
      
      // Handle capture - send opponent token back to base
      if (capturedColor) {
        updated[capturedColor] = prev[capturedColor].map((t) => {
          if (t.pathIndex === -1 || t.isFinished) return t;
          const tokenPos = getTokenPosition(t);
          if (Math.abs(tokenPos.x - newPosition.x) < 0.1 && Math.abs(tokenPos.y - newPosition.y) < 0.1) {
            gotBonus = true;
            return { ...t, pathIndex: -1 };
          }
          return t;
        });
      }
      
      return updated;
    });
    
    // Check for win
    setTimeout(() => {
      const allFinished = tokens[currentPlayer].every(
        (t) => t.isFinished || (t.id === tokenId && newPathIndex === path.length - 1)
      );
      
      if (allFinished) {
        setWinner(currentPlayer);
        setGameMessage(`🎉 ${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} wins the game! 🎉`);
        return;
      }
      
      if (isFinishing) {
        setGameMessage(`Token reached home! Bonus turn!`);
        gotBonus = true;
      }
      
      if (capturedColor) {
        setGameMessage(`Captured ${capturedColor}'s token! Bonus turn!`);
      }
      
      nextTurn(diceValue === 6 || gotBonus);
    }, 300);
  }, [hasRolled, tokens, currentPlayer, diceValue, nextTurn, winner]);

  const selectToken = useCallback((tokenId: number) => {
    if (!hasRolled || winner) return;
    
    const movableTokens = getMovableTokens(currentPlayer, diceValue);
    if (!movableTokens.includes(tokenId)) return;
    
    if (selectedToken === tokenId) {
      // Double click - move the token
      moveToken(tokenId);
    } else {
      setSelectedToken(tokenId);
      setGameMessage(`Token ${tokenId + 1} selected. Click again to move!`);
    }
  }, [hasRolled, currentPlayer, diceValue, selectedToken, getMovableTokens, moveToken, winner]);

  const resetGame = useCallback(() => {
    setTokens(initializeTokens());
    setCurrentPlayer('red');
    setDiceValue(1);
    setIsRolling(false);
    setHasRolled(false);
    setSelectedToken(null);
    setGameMessage('Red player, roll the dice!');
    setWinner(null);
  }, []);

  return {
    tokens,
    currentPlayer,
    diceValue,
    isRolling,
    hasRolled,
    selectedToken,
    gameMessage,
    winner,
    rollDice,
    selectToken,
    moveToken,
    getTokenPosition,
    getMovableTokens,
    resetGame,
  };
};
