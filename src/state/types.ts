/**
 * Shared type definitions for game state
 * 
 * These types match the server's authoritative state format.
 */

export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export type GamePhase = 'ROLL' | 'MOVE' | 'WAITING' | 'END';

export interface Player {
  id: string;
  name: string;
  connected: boolean;
  color?: PlayerColor;
}

export interface Position {
  x: number;
  y: number;
}

// Token position from server is just an index (-1 = base, 0-56 = path position)
export type TokenPositions = Record<string, number[]>;
