import React from 'react';

interface Dice3DProps {
  value: number;
  isRolling: boolean;
  size?: number;
  color?: 'red' | 'green' | 'yellow' | 'blue';
  onClick?: () => void;
  disabled?: boolean;
}

const PLAYER_COLORS = {
  red: { bg: 'hsl(0, 85%, 55%)', border: 'hsl(0, 85%, 40%)' },
  green: { bg: 'hsl(145, 70%, 45%)', border: 'hsl(145, 70%, 30%)' },
  yellow: { bg: 'hsl(45, 100%, 55%)', border: 'hsl(45, 100%, 40%)' },
  blue: { bg: 'hsl(210, 90%, 55%)', border: 'hsl(210, 90%, 40%)' },
};

const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
};

const getRotationForValue = (value: number): string => {
  const rotations: Record<number, string> = {
    1: 'rotateX(0deg) rotateY(0deg)',
    2: 'rotateX(-90deg) rotateY(0deg)',
    3: 'rotateY(-90deg) rotateX(0deg)',
    4: 'rotateY(90deg) rotateX(0deg)',
    5: 'rotateX(90deg) rotateY(0deg)',
    6: 'rotateX(180deg) rotateY(0deg)',
  };
  return rotations[value] || rotations[1];
};

const DiceFace: React.FC<{
  value: number;
  transform: string;
  offset: number;
  colors: { bg: string; border: string };
}> = ({ value, transform, offset, colors }) => {
  const dots = DOT_POSITIONS[value] || [];
  
  return (
    <div
      className="absolute w-full h-full rounded-lg flex items-center justify-center"
      style={{
        transform,
        backfaceVisibility: 'hidden',
        backgroundColor: colors.bg,
        border: `2px solid ${colors.border}`,
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)',
      }}
    >
      <div className="grid grid-cols-3 grid-rows-3 gap-[8%] w-[70%] h-[70%]">
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => {
            const hasDot = dots.some(([r, c]) => r === row && c === col);
            return (
              <div
                key={`${row}-${col}`}
                className="flex items-center justify-center"
              >
                {hasDot && (
                  <div
                    className="w-full h-full rounded-full"
                    style={{
                      backgroundColor: 'white',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const Dice3D: React.FC<Dice3DProps> = ({
  value,
  isRolling,
  size = 40,
  color = 'red',
  onClick,
  disabled = false,
}) => {
  const offset = size / 2;
  const colors = PLAYER_COLORS[color];
  
  const faces = [
    { value: 1, transform: `translateZ(${offset}px)` },
    { value: 2, transform: `rotateX(90deg) translateZ(${offset}px)` },
    { value: 3, transform: `rotateY(90deg) translateZ(${offset}px)` },
    { value: 4, transform: `rotateY(-90deg) translateZ(${offset}px)` },
    { value: 5, transform: `rotateX(-90deg) translateZ(${offset}px)` },
    { value: 6, transform: `rotateX(180deg) translateZ(${offset}px)` },
  ];

  return (
    <div
      className={`relative cursor-pointer transition-transform hover:scale-110 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={{
        width: size,
        height: size,
        perspective: 600,
      }}
      onClick={disabled ? undefined : onClick}
    >
      <div
        className={isRolling ? 'animate-tumble' : ''}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transition: isRolling ? 'none' : 'transform 0.6s ease-out',
          transform: isRolling ? undefined : getRotationForValue(value),
        }}
      >
        {faces.map((face) => (
          <DiceFace
            key={face.value}
            value={face.value}
            transform={face.transform}
            offset={offset}
            colors={colors}
          />
        ))}
      </div>
    </div>
  );
};

export default Dice3D;
