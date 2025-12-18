/**
 * Game WebSocket Connection Layer
 * 
 * This module handles ALL WebSocket communication with the Cloudflare Workers backend.
 * The frontend NEVER stores game state - it only forwards player intent and renders server state.
 * 
 * WebSocket endpoint: wss://ludo-backend.farhanambadamibadami.workers.dev/room/{ROOM_CODE}
 */

// Message types we SEND to server (player intent only)
export type ClientMessage =
  | { type: 'AUTH'; token: string }
  | { type: 'CREATE_ROOM' }
  | { type: 'JOIN_ROOM'; roomCode: string }
  | { type: 'ROLL_DICE' }
  | { type: 'MOVE_TOKEN'; tokenIndex: number };

/**
 * Generate a random 6-character room code
 */
export const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like 0, O, 1, I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
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
  tokens: Record<string, number[]>; // userId -> [position, position, position, position]
  phase: 'ROLL' | 'MOVE' | 'WAITING' | 'END';
  winner?: string;
  movableTokens?: number[];
};

// Connection state
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// WebSocket manager class
export class GameSocket {
  private ws: WebSocket | null = null;
  private roomCode: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private authToken: string | null = null;

  // Callbacks
  private onStateUpdate: ((state: ServerGameState) => void) | null = null;
  private onConnectionChange: ((state: ConnectionState) => void) | null = null;
  private onError: ((error: string) => void) | null = null;

  constructor() {
    console.log('[GameSocket] Initialized');
  }

  /**
   * Set callbacks for state updates
   */
  setCallbacks(callbacks: {
    onStateUpdate: (state: ServerGameState) => void;
    onConnectionChange: (state: ConnectionState) => void;
    onError: (error: string) => void;
  }) {
    this.onStateUpdate = callbacks.onStateUpdate;
    this.onConnectionChange = callbacks.onConnectionChange;
    this.onError = callbacks.onError;
  }

  /**
   * Connect to a game room
   */
  connect(roomCode: string, authToken?: string) {
    // Clean up existing connection
    this.disconnect();

    this.roomCode = roomCode.toUpperCase();
    this.authToken = authToken || null;
    this.reconnectAttempts = 0;

    this.createConnection();
  }

  private createConnection() {
    if (!this.roomCode) return;

    this.onConnectionChange?.('connecting');

    // Build WebSocket URL from environment variable
    const baseUrl = import.meta.env.VITE_WS_URL || 'wss://ludo-backend.farhanambadamibadami.workers.dev';
    const wsUrl = `${baseUrl}/room/${this.roomCode}`;

    console.log('[GameSocket] Connecting to:', wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[GameSocket] Connected');
        this.onConnectionChange?.('connected');
        this.reconnectAttempts = 0;

        // Send AUTH if we have a token
        if (this.authToken) {
          this.send({ type: 'AUTH', token: this.authToken });
        }

        // Send JOIN_ROOM
        if (this.roomCode) {
          this.send({ type: 'JOIN_ROOM', roomCode: this.roomCode });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ServerGameState;
          console.log('[GameSocket] Received state:', data);

          // CRITICAL: Fully replace local state with server state
          this.onStateUpdate?.(data);
        } catch (err) {
          console.error('[GameSocket] Failed to parse message:', err);
        }
      };

      this.ws.onclose = () => {
        console.log('[GameSocket] Disconnected');
        this.handleDisconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[GameSocket] Error:', error);
        this.onError?.('Connection error');
      };
    } catch (err) {
      console.error('[GameSocket] Failed to create connection:', err);
      this.onError?.('Failed to connect');
      this.onConnectionChange?.('disconnected');
    }
  }

  private handleDisconnect() {
    // Attempt auto-reconnect
    if (this.roomCode && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.onConnectionChange?.('reconnecting');

      console.log(`[GameSocket] Reconnecting... attempt ${this.reconnectAttempts}`);

      this.reconnectTimeout = setTimeout(() => {
        this.createConnection();
      }, 2000 * this.reconnectAttempts); // Exponential backoff
    } else {
      this.onConnectionChange?.('disconnected');
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.onError?.('Connection lost. Please rejoin the game.');
      }
    }
  }

  /**
   * Send a message to the server (player intent only)
   */
  send(message: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[GameSocket] Sending:', message);
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
      this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
      this.ws.close();
      this.ws = null;
    }

    this.roomCode = null;
    this.authToken = null;
    this.onConnectionChange?.('disconnected');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get current room code
   */
  getRoomCode(): string | null {
    return this.roomCode;
  }
}

// Singleton instance
export const gameSocket = new GameSocket();
