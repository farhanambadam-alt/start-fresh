/**
 * Game WebSocket Connection Layer
 * 
 * AUTHENTICATION PROTOCOL:
 * 1. On WebSocket open: Send AUTH with Supabase token
 * 2. Wait for { "authenticated": true } response
 * 3. Only THEN send JOIN_ROOM
 * 4. On reconnect: Repeat AUTH → wait → JOIN_ROOM
 */

import { supabase } from '@/integrations/supabase/client';

// Message types we SEND to server (player intent only)
export type ClientMessage =
  | { type: 'AUTH'; token: string }
  | { type: 'JOIN_ROOM'; roomCode: string }
  | { type: 'ROLL_DICE' }
  | { type: 'MOVE_TOKEN'; tokenIndex: number };

// Validation regex for room codes (4-6 alphanumeric characters, uppercase)
const ROOM_CODE_REGEX = /^[A-Z0-9]{4,6}$/;

/**
 * Validate room code format
 */
export const validateRoomCode = (roomCode: string): boolean => {
  return ROOM_CODE_REGEX.test(roomCode);
};

/**
 * Validate token index (must be 0-3)
 */
export const validateTokenIndex = (tokenIndex: number): boolean => {
  return Number.isInteger(tokenIndex) && tokenIndex >= 0 && tokenIndex <= 3;
};

/**
 * Generate a random 6-character room code using crypto API
 */
export const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const array = new Uint32Array(6);
  crypto.getRandomValues(array);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(array[i] % chars.length);
  }
  return code;
};

// Server state message format (authoritative)
export type ServerGameState = {
  roomCode: string;
  players: Array<{
    id: string;
    name: string;
    connected: boolean;
    color?: string;
  }>;
  currentTurn: string;
  dice: number;
  tokens: Record<string, number[]>;
  phase: 'ROLL' | 'MOVE' | 'WAITING' | 'END';
  winner?: string;
  movableTokens?: number[];
};

// Auth response from server
type AuthResponse = {
  authenticated: boolean;
  error?: string;
};

// Connection state
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'authenticating';

// Callbacks
interface SocketCallbacks {
  onStateUpdate: (state: ServerGameState) => void;
  onConnectionChange: (state: ConnectionState) => void;
  onError: (error: string) => void;
  onAuthRequired: () => void; // Called when auth fails - redirect to login
}

// WebSocket manager class
class GameSocket {
  private ws: WebSocket | null = null;
  private roomCode: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  
  // Authentication state
  private isAuthenticated = false;
  private pendingRoomCode: string | null = null;

  // Callbacks
  private callbacks: SocketCallbacks | null = null;

  constructor() {
    console.log('[GameSocket] Initialized');
  }

  setCallbacks(callbacks: SocketCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Connect to a game room
   * Protocol: Connect → AUTH → wait for authenticated → JOIN_ROOM
   */
  async connect(roomCode: string) {
    // Clean up existing connection
    this.disconnect();

    this.roomCode = roomCode.toUpperCase();
    this.pendingRoomCode = this.roomCode;
    this.reconnectAttempts = 0;
    this.isAuthenticated = false;

    await this.createConnection();
  }

  private async createConnection() {
    if (!this.roomCode) return;

    this.callbacks?.onConnectionChange('connecting');

    // Build WebSocket URL from environment variable
    const baseUrl = import.meta.env.VITE_WS_URL || 'wss://ludo-backend.farhanambadamibadami.workers.dev';
    const wsUrl = `${baseUrl}/room/${this.roomCode}`;

    console.log('[GameSocket] Connecting to:', wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        console.log('[GameSocket] WebSocket opened, sending AUTH...');
        this.callbacks?.onConnectionChange('authenticating');
        this.isAuthenticated = false;

        // Step 1: Get Supabase session token
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          console.error('[GameSocket] No auth token available');
          this.callbacks?.onError('Not authenticated. Please log in.');
          this.callbacks?.onAuthRequired();
          this.disconnect();
          return;
        }

        // Step 2: Send AUTH message FIRST (never JOIN_ROOM before auth)
        this.send({ type: 'AUTH', token });
        console.log('[GameSocket] AUTH sent, waiting for server confirmation...');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[GameSocket] Received:', data);

          // Check for auth response
          if ('authenticated' in data) {
            this.handleAuthResponse(data as AuthResponse);
            return;
          }

          // Check for error messages
          if (data.type === 'error' || data.error) {
            const errorMsg = data.message || data.error || 'Unknown error';
            console.error('[GameSocket] Server error:', errorMsg);
            this.callbacks?.onError(errorMsg);
            
            // If auth error, redirect to login
            if (errorMsg.toLowerCase().includes('auth') || errorMsg.toLowerCase().includes('unauthorized')) {
              this.callbacks?.onAuthRequired();
            }
            return;
          }

          // Game state update (only process if authenticated)
          if (this.isAuthenticated && data.roomCode && data.phase) {
            this.callbacks?.onStateUpdate(data as ServerGameState);
          }
        } catch (err) {
          console.error('[GameSocket] Failed to parse message:', err);
        }
      };

      this.ws.onclose = () => {
        console.log('[GameSocket] Disconnected');
        this.isAuthenticated = false;
        this.handleDisconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[GameSocket] Error:', error);
        this.callbacks?.onError('Connection error');
      };
    } catch (err) {
      console.error('[GameSocket] Failed to create connection:', err);
      this.callbacks?.onError('Failed to connect');
      this.callbacks?.onConnectionChange('disconnected');
    }
  }

  /**
   * Handle authentication response from server
   */
  private handleAuthResponse(response: AuthResponse) {
    if (response.authenticated) {
      console.log('[GameSocket] Authentication successful!');
      this.isAuthenticated = true;
      this.callbacks?.onConnectionChange('connected');

      // Step 3: NOW send JOIN_ROOM (only after successful auth)
      if (this.pendingRoomCode) {
        console.log('[GameSocket] Sending JOIN_ROOM for:', this.pendingRoomCode);
        this.send({ type: 'JOIN_ROOM', roomCode: this.pendingRoomCode });
      }
    } else {
      console.error('[GameSocket] Authentication failed:', response.error);
      this.isAuthenticated = false;
      this.callbacks?.onError(response.error || 'Authentication failed');
      this.callbacks?.onAuthRequired();
      this.disconnect();
    }
  }

  private handleDisconnect() {
    this.isAuthenticated = false;

    // Attempt auto-reconnect
    if (this.roomCode && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.callbacks?.onConnectionChange('reconnecting');

      console.log(`[GameSocket] Reconnecting... attempt ${this.reconnectAttempts}`);

      this.reconnectTimeout = setTimeout(async () => {
        // On reconnect: AUTH → wait → JOIN_ROOM (full protocol)
        await this.createConnection();
      }, 2000 * this.reconnectAttempts);
    } else {
      this.callbacks?.onConnectionChange('disconnected');
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.callbacks?.onError('Connection lost. Please rejoin the game.');
      }
    }
  }

  /**
   * Send a message to the server with input validation
   */
  send(message: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Validate inputs before sending
      if (message.type === 'JOIN_ROOM') {
        if (!validateRoomCode(message.roomCode)) {
          console.error('[GameSocket] Invalid room code format');
          this.callbacks?.onError('Invalid room code format. Must be 4-6 alphanumeric characters.');
          return;
        }
      }
      
      if (message.type === 'MOVE_TOKEN') {
        if (!validateTokenIndex(message.tokenIndex)) {
          console.error('[GameSocket] Invalid token index');
          this.callbacks?.onError('Invalid token selection.');
          return;
        }
      }
      
      console.log('[GameSocket] Sending:', message.type);
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[GameSocket] Cannot send - not connected');
    }
  }

  /**
   * Disconnect from the server
   */
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.reconnectAttempts = this.maxReconnectAttempts;
      this.ws.close();
      this.ws = null;
    }

    this.roomCode = null;
    this.pendingRoomCode = null;
    this.isAuthenticated = false;
    this.callbacks?.onConnectionChange('disconnected');
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated;
  }

  getRoomCode(): string | null {
    return this.roomCode;
  }
}

// Singleton instance
export const gameSocket = new GameSocket();
