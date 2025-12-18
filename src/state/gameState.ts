/**
 * Game State Management - REFACTORED
 * 
 * SINGLE SOURCE OF TRUTH:
 * - ConnectionState: connection lifecycle
 * - GameState: server-authoritative game data
 * 
 * UI is DERIVED from state, never stored in state.
 * Frontend is render + intent ONLY.
 */

import { create } from 'zustand';
import { ServerGameState, ConnectionState, gameSocket } from '@/network/gameSocket';

/**
 * Store State - Minimal, server-authoritative
 */
type StoreState = {
  // Connection state machine
  connectionState: ConnectionState;
  error: string | null;

  // User identity (from Supabase auth)
  userId: string | null;
  authToken: string | null;

  // Server game state (AUTHORITATIVE - never modified locally)
  gameState: ServerGameState | null;

  // UI-only animation state (local only, not game logic)
  isRolling: boolean;
  diceAnimationValue: number;
};

/**
 * Store Actions - Intents only, no game logic
 */
type StoreActions = {
  // Auth
  setAuth: (userId: string, token: string) => void;
  clearAuth: () => void;

  // Connection
  connectToRoom: (roomCode: string) => void;
  disconnect: () => void;

  // Server state sync
  setConnectionState: (state: ConnectionState) => void;
  setError: (error: string | null) => void;

  // Player intents (send to server only)
  rollDice: () => void;
  moveToken: (tokenIndex: number) => void;
};

export const useGameStore = create<StoreState & StoreActions>((set, get) => {
  // Initialize socket callbacks
  gameSocket.setCallbacks({
    onStateUpdate: (state) => {
      console.log('[GameState] Syncing server state');
      set({
        gameState: state,
        isRolling: false,
        diceAnimationValue: state.dice ?? 1,
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
      set({
        gameState: null,
        error: 'Please log in to play',
      });
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

    setConnectionState: (connectionState) => set({ connectionState }),
    setError: (error) => set({ error }),

    // Player intents - ONLY send to server, never compute locally
    rollDice: () => {
      const { gameState, userId, isRolling } = get();

      // UI guard only - actual validation is on server
      if (!gameState) return;
      if (gameState.phase !== 'ROLL') return;
      if (gameState.currentTurn !== userId) return;
      if (isRolling) return;

      // Start dice animation
      set({ isRolling: true });

      // Play dice sound
      const diceSound = new Audio('/sounds/dice-roll.mp3');
      diceSound.volume = 0.3;
      diceSound.play().catch(() => {});

      // Send intent to server
      gameSocket.send({ type: 'ROLL_DICE' });
    },

    moveToken: (tokenIndex) => {
      const { gameState, userId } = get();

      // UI guard only - actual validation is on server
      if (!gameState) return;
      if (gameState.phase !== 'MOVE') return;
      if (gameState.currentTurn !== userId) return;

      // Send intent to server
      gameSocket.send({ type: 'MOVE_TOKEN', tokenIndex });
    },
  };
});
