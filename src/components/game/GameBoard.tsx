/**
 * Game Board Component
 * 
 * Renders the Ludo board based ENTIRELY on server state.
 * Only sends player intents (roll dice, move token) - never computes game logic.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LUDO_DATA, PlayerColor } from '@/data/ludoData';
import { useGameStore } from '@/state/gameState';
import Dice3D from './Dice3D';
import Token from './Token';
import VictoryCounter from './VictoryCounter';
import PlayerAvatar from './PlayerAvatar';
import { Volume2, VolumeX, LogOut, Wifi, WifiOff, Loader2 } from 'lucide-react';

const WORLD_SIZE = 1000;
const PLAYERS: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];
const DEFAULT_ASPECT = 16 / 9;

interface GameBoardProps {
  onLeave: () => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ onLeave }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [transform, setTransform] = useState({ scale: 1, tx: 0, ty: 0 });
  const [worldHeight, setWorldHeight] = useState(WORLD_SIZE / DEFAULT_ASPECT);
  const [isMuted, setIsMuted] = useState(true);

  // State from store (server-synced)
  const { gameState, connectionState, isRolling, diceAnimationValue, rollDice, moveToken, userId } = useGameStore();
  
  // Safe state derivation with fallbacks (NEVER assume state exists)
  const phase = gameState?.phase ?? 'WAITING';
  const dice = gameState?.dice ?? null;
  const players = gameState?.players ?? [];
  const tokens = gameState?.tokens ?? {};
  const winner = gameState?.winner ?? null;
  const movableTokens = gameState?.movableTokens ?? [];
  
  // Turn-based UI logic (correct)
  const isMyTurn = gameState?.currentTurn === userId && phase !== 'END';
  
  // My color derivation
  const myColor = players.find((p) => p.id === userId)?.color;

  const tokenPixelSize = (LUDO_DATA.tokenSize / 100) * WORLD_SIZE;

  const calculateTransform = useCallback((aspect: number = DEFAULT_ASPECT) => {
    const worldH = WORLD_SIZE / aspect;
    setWorldHeight(worldH);

    const safeW = WORLD_SIZE * (LUDO_DATA.safeLayout.width / 100);
    const safeH = worldH * (LUDO_DATA.safeLayout.height / 100);

    const scale = Math.min(window.innerWidth / safeW, window.innerHeight / safeH);

    const safeCenterX = WORLD_SIZE * ((LUDO_DATA.safeLayout.x + LUDO_DATA.safeLayout.width / 2) / 100);
    const safeCenterY = worldH * ((LUDO_DATA.safeLayout.y + LUDO_DATA.safeLayout.height / 2) / 100);

    const tx = window.innerWidth / 2 - safeCenterX * scale;
    const ty = window.innerHeight / 2 - safeCenterY * scale;

    setTransform({ scale, tx, ty });
  }, []);

  useEffect(() => {
    const handleVideoLoad = () => {
      const video = videoRef.current;
      if (video && video.videoWidth > 0) {
        const aspect = video.videoWidth / video.videoHeight;
        calculateTransform(aspect);
      }
    };

    const video = videoRef.current;
    if (video) {
      video.addEventListener('loadedmetadata', handleVideoLoad);
      video.addEventListener('canplay', handleVideoLoad);
      if (video.readyState >= 1) handleVideoLoad();
    }

    calculateTransform();

    const handleResize = () => {
      const video = videoRef.current;
      if (video && video.videoWidth > 0) {
        calculateTransform(video.videoWidth / video.videoHeight);
      } else {
        calculateTransform();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (video) {
        video.removeEventListener('loadedmetadata', handleVideoLoad);
        video.removeEventListener('canplay', handleVideoLoad);
      }
    };
  }, [calculateTransform]);

  // Convert server token positions to display positions
  const getTokenPosition = (color: PlayerColor, playerId: string, tokenIndex: number) => {
    // Use tokens from local derived state (NEVER gameState.ui.tokens)
    const playerTokens = tokens[playerId] ?? [-1, -1, -1, -1];
    const tokenPathIndex = playerTokens[tokenIndex];
    
    if (tokenPathIndex === -1) {
      return LUDO_DATA[color].base[tokenIndex];
    }
    
    const path = LUDO_DATA[color].path;
    if (tokenPathIndex >= 0 && tokenPathIndex < path.length) {
      return path[tokenPathIndex];
    }
    
    // Token finished
    return path[path.length - 1];
  };

  // Get finished count for a player
  const getFinishedCount = (color: PlayerColor): number => {
    const player = players.find(p => p.color === color);
    if (!player) return 0;
    
    const playerTokens = tokens[player.id] ?? [-1, -1, -1, -1];
    const pathLength = LUDO_DATA[color].path.length;
    return playerTokens.filter(pos => pos >= pathLength - 1).length;
  };

  // Get current player's color (safe access with type validation)
  const rawCurrentPlayerColor = gameState ? 
    players.find(p => p.id === gameState.currentTurn)?.color : 
    undefined;
  
  // Validate that the color is a valid PlayerColor before using
  const currentPlayerColor: PlayerColor | undefined = 
    rawCurrentPlayerColor && ['red', 'green', 'yellow', 'blue'].includes(rawCurrentPlayerColor) 
      ? rawCurrentPlayerColor as PlayerColor 
      : undefined;

  // Handle token click
  const handleTokenClick = (tokenIndex: number) => {
    if (phase === 'MOVE' && isMyTurn && movableTokens.includes(tokenIndex)) {
      moveToken(tokenIndex);
    }
  };

  // Handle dice click
  const handleDiceClick = () => {
    if (phase === 'ROLL' && isMyTurn && !isRolling) {
      rollDice();
    }
  };

  if (!gameState) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden bg-background">
      {/* Control Buttons */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        {/* Connection indicator */}
        <div className={`p-3 rounded-full ${connectionState === 'in_game' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
          {connectionState === 'in_game' ? (
            <Wifi size={20} className="text-green-400" />
          ) : connectionState === 'reconnecting' ? (
            <Loader2 size={20} className="text-yellow-400 animate-spin" />
          ) : (
            <WifiOff size={20} className="text-red-400" />
          )}
        </div>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-3 rounded-full bg-card/90 backdrop-blur-sm border border-border hover:bg-secondary transition-colors"
        >
          {isMuted ? <VolumeX size={20} className="text-foreground" /> : <Volume2 size={20} className="text-foreground" />}
        </button>
        <button
          onClick={onLeave}
          className="p-3 rounded-full bg-card/90 backdrop-blur-sm border border-border hover:bg-secondary transition-colors"
        >
          <LogOut size={20} className="text-foreground" />
        </button>
      </div>

      {/* Turn Indicator */}
      <div className="fixed top-4 left-4 z-50 px-4 py-2 rounded-full bg-card/90 backdrop-blur-sm border border-border">
        <span className={`font-medium capitalize ${isMyTurn ? 'text-green-400' : 'text-muted-foreground'}`}>
          {isMyTurn ? 'Your turn!' : `${currentPlayerColor || 'Waiting'}'s turn`}
        </span>
      </div>

      {/* Reconnecting overlay */}
      {connectionState === 'reconnecting' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="rounded-xl border border-border bg-card/90 px-6 py-4 text-sm text-foreground flex items-center gap-3">
            <Loader2 className="animate-spin" size={20} />
            Reconnecting to game...
          </div>
        </div>
      )}

      {/* Room Info (safe access) */}
      {gameState?.roomCode && (
        <div className="fixed bottom-4 left-4 z-50 px-3 py-1.5 rounded-lg bg-card/90 backdrop-blur-sm border border-border">
          <span className="text-xs text-muted-foreground">Room: </span>
          <span className="text-sm font-mono font-bold text-foreground">{gameState.roomCode}</span>
        </div>
      )}

      {/* Game World */}
      <div
        style={{
          width: WORLD_SIZE,
          height: worldHeight,
          transform: `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
          position: 'absolute',
        }}
      >
        <video
          ref={videoRef}
          src="/ludo-board.mp4"
          autoPlay
          loop
          muted={isMuted}
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Player Avatars */}
        {PLAYERS.map((color) => {
          const ui = LUDO_DATA[color].ui;
          const isPlayerInGame = players.some((p) => p.color === color);

          return (
            <PlayerAvatar
              key={`avatar-${color}`}
              color={color}
              x={ui.avatar.x}
              y={ui.avatar.y}
              width={ui.avatar.width}
              height={ui.avatar.height}
              isActive={currentPlayerColor === color}
              style={{ opacity: isPlayerInGame ? 1 : 0.3 }}
            />
          );
        })}

        {/* Dice - Only for current player's position */}
        {currentPlayerColor && (() => {
          const ui = LUDO_DATA[currentPlayerColor].ui;
          const diceSize = (ui.dice.width / 100) * WORLD_SIZE * 0.8;
          const canClick = isMyTurn && phase === 'ROLL';

          return (
            <div
              className="absolute flex items-center justify-center transition-opacity duration-300"
              style={{
                left: `${ui.dice.x}%`,
                top: `${ui.dice.y}%`,
                width: `${ui.dice.width}%`,
                height: `${ui.dice.height}%`,
              }}
            >
              <Dice3D
                value={isRolling ? diceAnimationValue : (dice ?? 1)}
                isRolling={isRolling}
                size={diceSize}
                color={currentPlayerColor}
                onClick={canClick ? handleDiceClick : undefined}
                disabled={!canClick || phase !== 'ROLL'}
              />
            </div>
          );
        })()}

        {/* Render Tokens for all players (use derived players/tokens state) */}
        {players.map((player) => {
          const color = player.color as PlayerColor;
          if (!color) return null;

          const tokenPositions = tokens[player.id] ?? [-1, -1, -1, -1];
          const pathLength = LUDO_DATA[color].path.length;

          return tokenPositions.map((pathIndex, tokenIndex) => {
            // Skip finished tokens
            if (pathIndex >= pathLength - 1) return null;

            const pos = getTokenPosition(color, player.id, tokenIndex);
            const isSelectable = isMyTurn && player.id === userId && phase === 'MOVE' && movableTokens.includes(tokenIndex);

            return (
              <Token
                key={`${color}-${tokenIndex}`}
                color={color}
                position={pos}
                pathIndex={pathIndex}
                path={LUDO_DATA[color].path}
                size={tokenPixelSize}
                isActive={false}
                isSelectable={isSelectable}
                onClick={() => handleTokenClick(tokenIndex)}
              />
            );
          });
        })}

        {/* Victory Counters */}
        {PLAYERS.map((color) => {
          const count = getFinishedCount(color);
          if (count === 0) return null;

          const path = LUDO_DATA[color].path;
          const finishPos = path[path.length - 1];

          return (
            <VictoryCounter
              key={`victory-${color}`}
              color={color}
              count={count}
              x={finishPos.x}
              y={finishPos.y}
              size={tokenPixelSize}
            />
          );
        })}
      </div>

      {/* Winner Modal (use derived winner state) */}
      {phase === 'END' && winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div
            className="p-8 rounded-2xl text-center animate-scale-in"
            style={{
              background: `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--card)))`,
              boxShadow: `0 0 60px hsl(var(--primary) / 0.5)`,
            }}
          >
            <h2 className="text-4xl font-bold text-foreground mb-4">
              🎉 {winner === userId ? 'You Win!' : 'Game Over'} 🎉
            </h2>
            <p className="text-muted-foreground mb-6">
              {winner === userId ? 'Congratulations!' : 'Better luck next time!'}
            </p>
            <button
              onClick={onLeave}
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
