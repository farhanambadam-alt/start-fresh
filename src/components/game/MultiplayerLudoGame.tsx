/**
 * Multiplayer Ludo Game - Main Entry Component
 * 
 * UI DERIVATION RULES (THIS IS LAW):
 * - if (connectionState === "authenticating") showAuth()
 * - else if (connectionState === "joining") showWaitingRoom()
 * - else if (connectionState === "in_game" && gameState) showBoard()
 * - else if (gameState?.winner) showResult()
 * 
 * ❌ Never store screen in state
 * ❌ Never read ui from server
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
    error
  } = useGameStore();

  // Use Supabase auth for user identification
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setAuth(session.user.id, session.access_token);
      } else {
        navigate('/auth');
      }
    };

    initAuth();

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

  // UI DERIVATION - Derive screen from connectionState (NEVER from stored screen state)
  
  // Show GameBoard when:
  // - joining (waiting for game state from server)
  // - in_game (actively playing)
  // - reconnecting (trying to reconnect)
  if (connectionState === 'joining' || connectionState === 'in_game' || connectionState === 'reconnecting') {
    return <GameBoard onLeave={handleLeaveGame} />;
  }

  // Default: show lobby (disconnected, connecting, authenticating, error states)
  return <GameLobby onJoinRoom={handleJoinRoom} />;
};

export default MultiplayerLudoGame;
