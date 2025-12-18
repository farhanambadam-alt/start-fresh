import React from 'react';
import { PlayerColor } from '@/data/ludoData';

import avatarRed from '@/assets/avatar-red.png';
import avatarGreen from '@/assets/avatar-green.png';
import avatarYellow from '@/assets/avatar-yellow.png';
import avatarBlue from '@/assets/avatar-blue.png';

export interface PlayerAvatarProps {
  color: PlayerColor;
  x: number;
  y: number;
  width: number;
  height: number;
  isActive: boolean;
  style?: React.CSSProperties;
}

const AVATAR_IMAGES: Record<PlayerColor, string> = {
  red: avatarRed,
  green: avatarGreen,
  yellow: avatarYellow,
  blue: avatarBlue,
};

const PLAYER_COLORS = {
  red: {
    glow: 'hsl(0, 85%, 55%)',
    border: 'hsl(0, 85%, 70%)',
  },
  green: {
    glow: 'hsl(145, 70%, 45%)',
    border: 'hsl(145, 70%, 60%)',
  },
  yellow: {
    glow: 'hsl(45, 100%, 55%)',
    border: 'hsl(45, 100%, 70%)',
  },
  blue: {
    glow: 'hsl(210, 90%, 55%)',
    border: 'hsl(210, 90%, 70%)',
  },
};

const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  color,
  x,
  y,
  width,
  height,
  isActive,
  style,
}) => {
  const colors = PLAYER_COLORS[color];
  
  return (
    <div
      className={`absolute flex items-center justify-center rounded-full overflow-hidden transition-all duration-300 ${
        isActive ? 'scale-110' : 'opacity-70'
      }`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        height: `${height}%`,
        border: `4px solid ${isActive ? colors.border : 'rgba(255,255,255,0.3)'}`,
        boxShadow: isActive ? `0 0 25px ${colors.glow}` : 'none',
        ...style,
      }}
    >
      <img
        src={AVATAR_IMAGES[color]}
        alt={`${color} player avatar`}
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default PlayerAvatar;
