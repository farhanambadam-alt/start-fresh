import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PlayerColor, Position } from '@/data/ludoData';

import tokenRed from '@/assets/token-red.png';
import tokenGreen from '@/assets/token-green.png';
import tokenYellow from '@/assets/token-yellow.png';
import tokenBlue from '@/assets/token-blue.png';

interface TokenProps {
  color: PlayerColor;
  position: Position;
  pathIndex: number;
  path: Position[];
  size: number;
  isActive?: boolean;
  isSelectable?: boolean;
  onClick?: () => void;
}

const TOKEN_IMAGES: Record<PlayerColor, string> = {
  red: tokenRed,
  green: tokenGreen,
  yellow: tokenYellow,
  blue: tokenBlue,
};

const PLAYER_COLORS = {
  red: {
    glow: '0 0 20px hsla(0, 85%, 55%, 0.9)',
    ring: 'hsl(0, 85%, 55%)',
    ringLight: 'hsl(0, 85%, 70%)',
  },
  green: {
    glow: '0 0 20px hsla(145, 70%, 45%, 0.9)',
    ring: 'hsl(145, 70%, 45%)',
    ringLight: 'hsl(145, 70%, 60%)',
  },
  yellow: {
    glow: '0 0 20px hsla(45, 100%, 55%, 0.9)',
    ring: 'hsl(45, 100%, 55%)',
    ringLight: 'hsl(45, 100%, 70%)',
  },
  blue: {
    glow: '0 0 20px hsla(210, 90%, 55%, 0.9)',
    ring: 'hsl(210, 90%, 55%)',
    ringLight: 'hsl(210, 90%, 70%)',
  },
};

const Token: React.FC<TokenProps> = ({
  color,
  position,
  pathIndex,
  path,
  size,
  isActive = false,
  isSelectable = false,
  onClick,
}) => {
  const colors = PLAYER_COLORS[color];
  const ringSize = size * 1.6;
  
  // Track for step-by-step animation
  const prevPathIndexRef = useRef(pathIndex);
  const [displayPos, setDisplayPos] = useState({ x: position.x, y: position.y });
  const [isHopping, setIsHopping] = useState(false);
  const animatingRef = useRef(false);
  
  // Animate step by step through the path
  const animateSteps = useCallback(async (fromIndex: number, toIndex: number) => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    
    const stepDelay = 150; // ms per step - fast but visible
    
    // Determine direction and range
    const start = Math.max(0, fromIndex);
    const steps = toIndex - start;
    
    if (steps <= 0 || toIndex < 0) {
      // Moving to base or no movement needed
      setDisplayPos({ x: position.x, y: position.y });
      animatingRef.current = false;
      return;
    }
    
    // Animate through each step
    for (let i = 1; i <= steps; i++) {
      const stepIndex = start + i;
      if (stepIndex >= 0 && stepIndex < path.length) {
        const stepPos = path[stepIndex];
        
        // Trigger hop animation
        setIsHopping(true);
        setDisplayPos({ x: stepPos.x, y: stepPos.y });
        
        // Wait for hop to complete
        await new Promise(resolve => setTimeout(resolve, stepDelay));
        setIsHopping(false);
        
        // Small pause between hops
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    // Ensure final position is correct
    setDisplayPos({ x: position.x, y: position.y });
    animatingRef.current = false;
  }, [path, position.x, position.y]);
  
  useEffect(() => {
    const prevIndex = prevPathIndexRef.current;
    const currentIndex = pathIndex;
    
    // Check if token actually moved on the path
    if (prevIndex !== currentIndex && currentIndex >= 0 && prevIndex >= -1) {
      if (prevIndex === -1) {
        // Coming out of base - just hop to first position
        setIsHopping(true);
        setDisplayPos({ x: position.x, y: position.y });
        setTimeout(() => setIsHopping(false), 200);
      } else if (currentIndex > prevIndex) {
        // Moving forward on path - animate step by step
        animateSteps(prevIndex, currentIndex);
      } else {
        // Edge case (shouldn't happen normally) - just update
        setDisplayPos({ x: position.x, y: position.y });
      }
    } else if (prevIndex === currentIndex) {
      // Position might have changed without path change (e.g., base position)
      setDisplayPos({ x: position.x, y: position.y });
    }
    
    prevPathIndexRef.current = currentIndex;
  }, [pathIndex, position.x, position.y, animateSteps]);
  
  // Initial position sync
  useEffect(() => {
    if (!animatingRef.current) {
      setDisplayPos({ x: position.x, y: position.y });
    }
  }, []);
  
  return (
    <div
      className={`absolute cursor-pointer ${
        isActive ? 'token-active' : ''
      } ${isSelectable ? 'hover:scale-110 z-20' : 'z-10'}`}
      style={{
        left: `${displayPos.x}%`,
        top: `${displayPos.y}%`,
        width: size,
        height: size,
        transform: 'translate(-50%, -50%)',
        willChange: isHopping ? 'transform' : 'auto',
      }}
      onClick={isSelectable ? onClick : undefined}
    >
      {/* Spinning ring for selectable tokens */}
      {isSelectable && (
        <div
          className="absolute pointer-events-none animate-spin-ring"
          style={{
            width: ringSize,
            height: ringSize,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            border: `3px solid ${colors.ring}`,
            borderRadius: '50%',
            boxShadow: colors.glow,
          }}
        />
      )}
      
      {/* Token Image with hop animation */}
      <div
        className={`w-full h-full ${isHopping ? 'animate-hop' : ''}`}
      >
        <img
          src={TOKEN_IMAGES[color]}
          alt={`${color} token`}
          className="w-full h-full object-contain"
          style={{
            filter: isSelectable 
              ? `drop-shadow(${colors.glow}) brightness(1.2)` 
              : isActive 
                ? 'brightness(1.15)' 
                : 'none',
          }}
        />
      </div>
    </div>
  );
};

export default Token;
