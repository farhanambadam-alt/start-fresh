// Generated from ludoPositions.json - DO NOT EDIT MANUALLY
import ludoPositions from './ludoPositions.json';

export const LUDO_DATA = {
  safeLayout: ludoPositions.safeLayout,
  red: ludoPositions.red,
  green: ludoPositions.green,
  yellow: ludoPositions.yellow,
  blue: ludoPositions.blue,
  tokenSize: ludoPositions.tokenSize
};

export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export interface Position {
  x: number;
  y: number;
  isSafe: boolean;
}

export interface TokenState {
  id: number;
  color: PlayerColor;
  pathIndex: number; // -1 means in base
  isFinished: boolean;
}

export interface PlayerData {
  base: Position[];
  path: Position[];
  ui: {
    avatar: { x: number; y: number; width: number; height: number };
    dice: { x: number; y: number; width: number; height: number };
  };
}
