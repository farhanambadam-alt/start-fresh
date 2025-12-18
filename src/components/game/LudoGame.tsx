import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LUDO_DATA, PlayerColor } from '@/data/ludoData';
import { useLudoGame } from '@/hooks/useLudoGame';
import Dice3D from './Dice3D';
import Token from './Token';
import VictoryCounter from './VictoryCounter';
import PlayerAvatar from './PlayerAvatar';
import { RotateCcw, Volume2, VolumeX } from 'lucide-react';

const WORLD_SIZE = 1000;
const PLAYERS: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

// Video aspect ratio (we'll use 16:9 as a common default, and update when metadata loads)
const DEFAULT_ASPECT = 16 / 9;

const LudoGame: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [transform, setTransform] = useState({ scale: 1, tx: 0, ty: 0 });
  const [worldHeight, setWorldHeight] = useState(WORLD_SIZE / DEFAULT_ASPECT);
  const [isMuted, setIsMuted] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  
  const {
    tokens,
    currentPlayer,
    diceValue,
    isRolling,
    hasRolled,
    selectedToken,
    gameMessage,
    winner,
    rollDice,
    selectToken,
    getTokenPosition,
    getMovableTokens,
    resetGame,
  } = useLudoGame();

  // Calculate token pixel size
  const tokenPixelSize = (LUDO_DATA.tokenSize / 100) * WORLD_SIZE;

  // Safe Zoom & Pan Engine
  const calculateTransform = useCallback((aspect: number = DEFAULT_ASPECT) => {
    const worldH = WORLD_SIZE / aspect;
    setWorldHeight(worldH);

    const safeW = WORLD_SIZE * (LUDO_DATA.safeLayout.width / 100);
    const safeH = worldH * (LUDO_DATA.safeLayout.height / 100);
    
    const scale = Math.min(
      window.innerWidth / safeW,
      window.innerHeight / safeH
    );

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
        setVideoLoaded(true);
      }
    };

    const video = videoRef.current;
    if (video) {
      video.addEventListener('loadedmetadata', handleVideoLoad);
      video.addEventListener('canplay', handleVideoLoad);
      
      // If already loaded
      if (video.readyState >= 1) {
        handleVideoLoad();
      }
    }
    
    // Initial calculation with default aspect
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

  // Count finished tokens for each player
  const getFinishedCount = (color: PlayerColor): number => {
    return tokens[color].filter((t) => t.isFinished).length;
  };

  // Get last path position for victory counter
  const getFinishPosition = (color: PlayerColor) => {
    const path = LUDO_DATA[color].path;
    return path[path.length - 1];
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 overflow-hidden bg-background"
    >

      {/* Control Buttons */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-3 rounded-full bg-card/90 backdrop-blur-sm border border-border hover:bg-secondary transition-colors"
        >
          {isMuted ? (
            <VolumeX size={20} className="text-foreground" />
          ) : (
            <Volume2 size={20} className="text-foreground" />
          )}
        </button>
        <button
          onClick={resetGame}
          className="p-3 rounded-full bg-card/90 backdrop-blur-sm border border-border hover:bg-secondary transition-colors"
        >
          <RotateCcw size={20} className="text-foreground" />
        </button>
      </div>

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
        {/* Video Background */}
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
          return (
            <PlayerAvatar
              key={`avatar-${color}`}
              color={color}
              x={ui.avatar.x}
              y={ui.avatar.y}
              width={ui.avatar.width}
              height={ui.avatar.height}
              isActive={currentPlayer === color}
            />
          );
        })}

        {/* Dice for each player */}
        {PLAYERS.map((color) => {
          const ui = LUDO_DATA[color].ui;
          const diceSize = (ui.dice.width / 100) * WORLD_SIZE * 0.8;
          const isCurrentPlayer = currentPlayer === color;
          
          return (
            <div
              key={`dice-${color}`}
              className="absolute flex items-center justify-center"
              style={{
                left: `${ui.dice.x}%`,
                top: `${ui.dice.y}%`,
                width: `${ui.dice.width}%`,
                height: `${ui.dice.height}%`,
              }}
            >
              <Dice3D
                value={isCurrentPlayer ? diceValue : 1}
                isRolling={isCurrentPlayer && isRolling}
                size={diceSize}
                color={color}
                onClick={isCurrentPlayer ? rollDice : undefined}
                disabled={!isCurrentPlayer || hasRolled || !!winner}
              />
            </div>
          );
        })}

        {/* Render Tokens */}
        {PLAYERS.map((color) =>
          tokens[color]
            .filter((token) => !token.isFinished)
            .map((token) => {
              const pos = getTokenPosition(token);
              const movableTokens = hasRolled ? getMovableTokens(currentPlayer, diceValue) : [];
              const isSelectable = 
                currentPlayer === color && 
                hasRolled && 
                movableTokens.includes(token.id);
              const isSelected = selectedToken === token.id && currentPlayer === color;
              
              return (
              <Token
                  key={`${color}-${token.id}`}
                  color={color}
                  position={pos}
                  pathIndex={token.pathIndex}
                  path={LUDO_DATA[color].path}
                  size={tokenPixelSize}
                  isActive={isSelected}
                  isSelectable={isSelectable}
                  onClick={() => selectToken(token.id)}
                />
              );
            })
        )}

        {/* Victory Counters */}
        {PLAYERS.map((color) => {
          const count = getFinishedCount(color);
          if (count === 0) return null;
          
          const finishPos = getFinishPosition(color);
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

      {/* Winner Modal */}
      {winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div
            className="p-8 rounded-2xl text-center animate-scale-in"
            style={{
              background: `linear-gradient(135deg, hsl(var(--ludo-${winner})), hsl(var(--card)))`,
              boxShadow: `0 0 60px hsl(var(--ludo-${winner}) / 0.5)`,
            }}
          >
            <h2 className="text-4xl font-bold text-foreground mb-4">
              🎉 {winner.charAt(0).toUpperCase() + winner.slice(1)} Wins! 🎉
            </h2>
            <p className="text-muted-foreground mb-6">
              Congratulations on your victory!
            </p>
            <button
              onClick={resetGame}
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LudoGame;
