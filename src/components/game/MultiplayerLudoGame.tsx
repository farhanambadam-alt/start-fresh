/**
 * Multiplayer Ludo Game - Main Entry Component
 * 
 * This component orchestrates the game flow:
 * 1. Login (Supabase Auth)
 * 2. Lobby (join room by code)
 * 3. Game Board (render server state)
 * 
 * CRITICAL: This is a UI-only component. All game logic runs on the backend.
 */

import React, { useEffect } from 'react';
import { useGameStore } from '@/state/gameState';
import GameLobby from './GameLobby';
import GameBoard from './GameBoard';

const MultiplayerLudoGame: React.FC = () => {
  const { 
    gameState, 
    connectionState, 
    connectToRoom, 
    disconnect,
    setAuth,
    userId 
  } = useGameStore();

  // For now, generate a simple user ID (in production, use Supabase auth)
  useEffect(() => {
    // Generate or retrieve user ID from localStorage
    let storedUserId = localStorage.getItem('ludo:userId');
    if (!storedUserId) {
      storedUserId = `user_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('ludo:userId', storedUserId);
    }
    setAuth(storedUserId, ''); // No auth token for now
  }, [setAuth]);

  // Determine current view based on state
  const isInGame = gameState?.phase && gameState.phase !== 'WAITING' && gameState.phase !== 'END';
  const isInWaitingRoom = gameState?.phase === 'WAITING';

  const handleJoinRoom = (roomCode: string) => {
    connectToRoom(roomCode);
  };

  const handleLeaveGame = () => {
    disconnect();
  };

  // Show game board if we're in an active game
  if (isInGame || (isInWaitingRoom && gameState)) {
    return <GameBoard onLeave={handleLeaveGame} />;
  }

  // Show lobby for joining
  return <GameLobby onJoinRoom={handleJoinRoom} />;
};

export default MultiplayerLudoGame;
