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

  const handleJoinRoom = (roomCode: string) => {
    connectToRoom(roomCode);
  };

  const handleLeaveGame = () => {
    disconnect();
  };

  // Derive screen from connectionState (NEVER from gameState.ui)
  // AUTH screen: connecting or authenticating
  if (connectionState === 'connecting' || connectionState === 'authenticating') {
    return <GameLobby onJoinRoom={handleJoinRoom} />;
  }

  // WAITING_ROOM screen: joining
  if (connectionState === 'joining') {
    return <GameBoard onLeave={handleLeaveGame} />;
  }

  // GAME screen: in_game
  if (connectionState === 'in_game') {
    // RESULT screen: winner exists
    if (gameState?.winner) {
      return <GameBoard onLeave={handleLeaveGame} />;
    }
    return <GameBoard onLeave={handleLeaveGame} />;
  }

  // Default: show lobby (disconnected, error, reconnecting states)
  return <GameLobby onJoinRoom={handleJoinRoom} />;
};

export default MultiplayerLudoGame;
