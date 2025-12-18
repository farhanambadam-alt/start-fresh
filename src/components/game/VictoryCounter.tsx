import React from 'react';
import { Star } from 'lucide-react';
import { PlayerColor } from '@/data/ludoData';

interface VictoryCounterProps {
  color: PlayerColor;
  count: number;
  x: number;
  y: number;
  size: number;
}

const PLAYER_COLORS = {
  red: 'hsl(0, 85%, 55%)',
  green: 'hsl(145, 70%, 45%)',
  yellow: 'hsl(45, 100%, 55%)',
  blue: 'hsl(210, 90%, 55%)',
};

const VictoryCounter: React.FC<VictoryCounterProps> = ({
  color,
  count,
  x,
  y,
  size,
}) => {
  if (count === 0) return null;
  
  return (
    <div
      className="absolute flex items-center justify-center victory-star"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size * 1.5,
        height: size * 1.5,
        transform: 'translate(-50%, -50%)',
        color: PLAYER_COLORS[color],
      }}
    >
      <Star
        size={size * 1.5}
        fill={PLAYER_COLORS[color]}
        stroke={color === 'yellow' ? 'hsl(45, 100%, 30%)' : 'white'}
        strokeWidth={1.5}
      />
      <span
        className="absolute font-bold"
        style={{
          color: color === 'yellow' ? 'hsl(45, 100%, 20%)' : 'white',
          fontSize: size * 0.6,
          textShadow: '0 1px 2px rgba(0,0,0,0.4)',
        }}
      >
        {count}
      </span>
    </div>
  );
};

export default VictoryCounter;
