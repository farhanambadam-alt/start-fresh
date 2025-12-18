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
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/state/gameState';
import { supabase } from '@/integrations/supabase/client';
import GameLobby from './GameLobby';
import GameBoard from './GameBoard';

const MultiplayerLudoGame: React.FC = () => {
  const navigate = useNavigate();
  const { 
    gameState, 
    connectionState, 
    connectToRoom, 
    disconnect,
    setAuth,
    userId,
    error
  } = useGameStore();

  // Use Supabase auth for user identification
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setAuth(session.user.id, session.access_token);
      } else {
        // No session - redirect to auth
        navigate('/auth');
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setAuth(session.user.id, session.access_token);
      } else if (event === 'SIGNED_OUT') {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [setAuth, navigate]);

  // Handle auth required error from WebSocket
  useEffect(() => {
    if (error === 'Please log in to play') {
      navigate('/auth');
    }
  }, [error, navigate]);

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
