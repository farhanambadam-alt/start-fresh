/**
 * Game State Management
 * 
 * This module manages UI state derived ENTIRELY from server messages.
 * The frontend NEVER computes game logic - it only renders what the server sends.
 * 
 * CRITICAL: On every server message, fully REPLACE local state.
 */

import { create } from 'zustand';
import { ServerGameState, ConnectionState, gameSocket } from '@/network/gameSocket';

// UI-specific state (not game logic)
export type UIState = {
  // Connection
  connectionState: ConnectionState;
  error: string | null;

  // User identity (from Supabase auth)
  userId: string | null;
  authToken: string | null;

  // Server game state (AUTHORITATIVE - never modified locally)
  gameState: ServerGameState | null;

  // UI-only state (animations, etc.)
  isRolling: boolean;
  diceAnimationValue: number;
};

export type GameActions = {
  // Auth
  setAuth: (userId: string, token: string) => void;
  clearAuth: () => void;

  // Connection
  connectToRoom: (roomCode: string) => void;
  disconnect: () => void;

  // Server state sync
  syncServerState: (state: ServerGameState) => void;
  setConnectionState: (state: ConnectionState) => void;
  setError: (error: string | null) => void;

  // Player intents (send to server only)
  rollDice: () => void;
  moveToken: (tokenIndex: number) => void;

  // UI-only actions
  setRolling: (isRolling: boolean) => void;
  animateDice: () => void;
};

export const useGameStore = create<UIState & GameActions>((set, get) => {
  // Initialize socket callbacks
  gameSocket.setCallbacks({
    onStateUpdate: (state) => {
      console.log('[GameState] Syncing server state');
      set({
        gameState: state,
        isRolling: false, // Stop dice animation when we get new state
        diceAnimationValue: state.dice,
      });
    },
    onConnectionChange: (connectionState) => {
      console.log('[GameState] Connection state:', connectionState);
      set({ connectionState });
    },
    onError: (error) => {
      console.log('[GameState] Error:', error);
      set({ error });
    },
    onAuthRequired: () => {
      console.log('[GameState] Auth required - redirecting to login');
      // Clear state and trigger redirect
      set({
        gameState: null,
        error: 'Please log in to play',
      });
      // Redirect will be handled by the component layer
      window.location.href = '/auth';
    },
  });

  return {
    // Initial state
    connectionState: 'disconnected',
    error: null,
    userId: null,
    authToken: null,
    gameState: null,
    isRolling: false,
    diceAnimationValue: 1,

    // Auth actions
    setAuth: (userId, token) => set({ userId, authToken: token }),
    clearAuth: () => set({ userId: null, authToken: null }),

    // Connection actions
    connectToRoom: (roomCode) => {
      set({ error: null });
      // Auth token is now retrieved inside gameSocket from Supabase session
      gameSocket.connect(roomCode);
    },

    disconnect: () => {
      gameSocket.disconnect();
      set({
        gameState: null,
        error: null,
        isRolling: false,
      });
    },

    // Server state sync (FULL REPLACE)
    syncServerState: (state) => {
      set({
        gameState: state,
        isRolling: false,
        diceAnimationValue: state.dice,
      });
    },

    setConnectionState: (connectionState) => set({ connectionState }),
    setError: (error) => set({ error }),

    // Player intents - ONLY send to server, never compute locally
    rollDice: () => {
      const { gameState, userId, isRolling } = get();

      // UI guard only - actual validation is on server
      if (!gameState || gameState.phase !== 'ROLL') return;
      if (gameState.currentTurn !== userId) return;
      if (isRolling) return;

      // Start dice animation
      set({ isRolling: true });

      // Play dice sound
      const diceSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3');
      diceSound.volume = 0.3;
      diceSound.play().catch(() => {});

      // Send intent to server
      gameSocket.send({ type: 'ROLL_DICE' });
    },

    moveToken: (tokenIndex) => {
      const { gameState, userId } = get();

      // UI guard only - actual validation is on server
      if (!gameState || gameState.phase !== 'MOVE') return;
      if (gameState.currentTurn !== userId) return;

      // Send intent to server
      gameSocket.send({ type: 'MOVE_TOKEN', tokenIndex });
    },

    // UI-only actions
    setRolling: (isRolling) => set({ isRolling }),

    animateDice: () => {
      // Random animation value for visual feedback while rolling
      const randomValue = Math.floor(Math.random() * 6) + 1;
      set({ diceAnimationValue: randomValue });
    },
  };
});

// Derived selectors
export const useIsMyTurn = () => {
  const gameState = useGameStore((s) => s.gameState);
  const userId = useGameStore((s) => s.userId);
  return gameState?.currentTurn === userId;
};

export const useCurrentPhase = () => {
  return useGameStore((s) => s.gameState?.phase ?? 'WAITING');
};

export const useMovableTokens = () => {
  return useGameStore((s) => s.gameState?.movableTokens ?? []);
};

export const useMyColor = () => {
  const gameState = useGameStore((s) => s.gameState);
  const userId = useGameStore((s) => s.userId);
  const players = gameState?.players ?? [];
  const player = players.find((p) => p.id === userId);
  return player?.color;
};
