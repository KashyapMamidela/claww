import React from 'react';

// The app's body map (app/components/BodyMap.tsx), the same shapes in plain SVG.

export type Muscle = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core';

const BASE = 'rgba(255,255,255,0.08)';
const NEUTRAL = 'rgba(255,255,255,0.05)';

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export const BodyMap: React.FC<{ level: Partial<Record<Muscle, number>>; height: number; color: string }> = ({ level, height, color }) => {
  const fill = (m: Muscle) => {
    const i = Math.max(0, Math.min(1, level[m] ?? 0));
    return i > 0.01 ? rgba(color, 0.2 + 0.8 * i) : BASE;
  };
  const width = (height * 120) / 124;
  return (
    <svg width={width} height={height} viewBox="0 0 120 124">
      <g>
        <circle cx={30} cy={9} r={6.5} fill={NEUTRAL} />
        <ellipse cx={17} cy={24} rx={6} ry={4.5} fill={fill('shoulders')} />
        <ellipse cx={43} cy={24} rx={6} ry={4.5} fill={fill('shoulders')} />
        <rect x={19.5} y={21} width={10} height={13} rx={4} fill={fill('chest')} />
        <rect x={30.5} y={21} width={10} height={13} rx={4} fill={fill('chest')} />
        <ellipse cx={11.5} cy={37} rx={3.6} ry={7} fill={fill('biceps')} />
        <ellipse cx={48.5} cy={37} rx={3.6} ry={7} fill={fill('biceps')} />
        <ellipse cx={9.5} cy={52} rx={2.8} ry={6.5} fill={NEUTRAL} />
        <ellipse cx={50.5} cy={52} rx={2.8} ry={6.5} fill={NEUTRAL} />
        <rect x={22} y={36} width={16} height={22} rx={5} fill={fill('core')} />
        <ellipse cx={25} cy={74} rx={5} ry={13} fill={fill('quads')} />
        <ellipse cx={35} cy={74} rx={5} ry={13} fill={fill('quads')} />
        <ellipse cx={25} cy={102} rx={3.6} ry={10} fill={fill('calves')} />
        <ellipse cx={35} cy={102} rx={3.6} ry={10} fill={fill('calves')} />
      </g>
      <g transform="translate(60 0)">
        <circle cx={30} cy={9} r={6.5} fill={NEUTRAL} />
        <ellipse cx={17} cy={24} rx={6} ry={4.5} fill={fill('shoulders')} />
        <ellipse cx={43} cy={24} rx={6} ry={4.5} fill={fill('shoulders')} />
        <rect x={20} y={21} width={20} height={26} rx={6} fill={fill('back')} />
        <ellipse cx={11.5} cy={37} rx={3.6} ry={7} fill={fill('triceps')} />
        <ellipse cx={48.5} cy={37} rx={3.6} ry={7} fill={fill('triceps')} />
        <ellipse cx={9.5} cy={52} rx={2.8} ry={6.5} fill={NEUTRAL} />
        <ellipse cx={50.5} cy={52} rx={2.8} ry={6.5} fill={NEUTRAL} />
        <rect x={23} y={48} width={14} height={9} rx={4} fill={NEUTRAL} />
        <ellipse cx={25} cy={63} rx={5.5} ry={5.5} fill={fill('glutes')} />
        <ellipse cx={35} cy={63} rx={5.5} ry={5.5} fill={fill('glutes')} />
        <ellipse cx={25} cy={81} rx={4.6} ry={10} fill={fill('hamstrings')} />
        <ellipse cx={35} cy={81} rx={4.6} ry={10} fill={fill('hamstrings')} />
        <ellipse cx={25} cy={103} rx={4} ry={9} fill={fill('calves')} />
        <ellipse cx={35} cy={103} rx={4} ry={9} fill={fill('calves')} />
      </g>
    </svg>
  );
};
