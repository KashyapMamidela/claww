import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Rect } from 'react-native-svg';
import { COLORS } from '../lib/theme';

/** The major muscle list the catalog uses (V2 PHASE 6.2). */
export type Muscle = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core';

export const MUSCLES: Muscle[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'core'];

export interface MuscleIntensity {
  muscle: Muscle;
  /** 0..1 — how strongly this muscle is lit. */
  intensity: number;
}

export interface BodyMapProps {
  muscles: MuscleIntensity[];
  /** Height in px; width follows the 2-figure aspect ratio. */
  height?: number;
  color?: string;
  /** Show only the side(s) that contain lit muscles. Default shows both. */
  views?: 'both' | 'front' | 'back';
}

const BASE = 'rgba(255,255,255,0.08)';
const NEUTRAL = 'rgba(255,255,255,0.05)';

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Which side of the body each muscle is drawn on. */
const FRONT: Muscle[] = ['shoulders', 'chest', 'biceps', 'core', 'quads', 'calves'];
const BACK: Muscle[] = ['shoulders', 'back', 'triceps', 'glutes', 'hamstrings', 'calves'];

/**
 * A simple front-and-back body map with each major muscle lit by intensity
 * (V2 PHASE 2.6). One component for the player's form strip, the exercise
 * guide and the Tracker's recovery map (V2 PHASE 9) — pass any list of
 * muscles and 0..1 intensities. Stylized on purpose; the shapes are a
 * placeholder for a designer's version.
 */
export function BodyMap({ muscles, height = 64, color = COLORS.blue, views = 'both' }: BodyMapProps) {
  const level = new Map<Muscle, number>();
  for (const m of muscles) level.set(m.muscle, Math.max(level.get(m.muscle) ?? 0, Math.max(0, Math.min(1, m.intensity))));
  const fill = (muscle: Muscle) => {
    const i = level.get(muscle) ?? 0;
    return i > 0 ? hexToRgba(color, 0.25 + 0.75 * i) : BASE;
  };

  const showFront = views !== 'back';
  const showBack = views !== 'front';
  const figures = (showFront ? 1 : 0) + (showBack ? 1 : 0);
  const vbWidth = 60 * figures;
  const width = (height * vbWidth) / 124;

  const front = (x: number) => (
    <G key="front" x={x}>
      <Circle cx={30} cy={9} r={6.5} fill={NEUTRAL} />
      <Ellipse cx={17} cy={24} rx={6} ry={4.5} fill={fill('shoulders')} />
      <Ellipse cx={43} cy={24} rx={6} ry={4.5} fill={fill('shoulders')} />
      <Rect x={19.5} y={21} width={10} height={13} rx={4} fill={fill('chest')} />
      <Rect x={30.5} y={21} width={10} height={13} rx={4} fill={fill('chest')} />
      <Ellipse cx={11.5} cy={37} rx={3.6} ry={7} fill={fill('biceps')} />
      <Ellipse cx={48.5} cy={37} rx={3.6} ry={7} fill={fill('biceps')} />
      <Ellipse cx={9.5} cy={52} rx={2.8} ry={6.5} fill={NEUTRAL} />
      <Ellipse cx={50.5} cy={52} rx={2.8} ry={6.5} fill={NEUTRAL} />
      <Rect x={22} y={36} width={16} height={22} rx={5} fill={fill('core')} />
      <Ellipse cx={25} cy={74} rx={5} ry={13} fill={fill('quads')} />
      <Ellipse cx={35} cy={74} rx={5} ry={13} fill={fill('quads')} />
      <Ellipse cx={25} cy={102} rx={3.6} ry={10} fill={fill('calves')} />
      <Ellipse cx={35} cy={102} rx={3.6} ry={10} fill={fill('calves')} />
    </G>
  );

  const back = (x: number) => (
    <G key="back" x={x}>
      <Circle cx={30} cy={9} r={6.5} fill={NEUTRAL} />
      <Ellipse cx={17} cy={24} rx={6} ry={4.5} fill={fill('shoulders')} />
      <Ellipse cx={43} cy={24} rx={6} ry={4.5} fill={fill('shoulders')} />
      <Rect x={20} y={21} width={20} height={26} rx={6} fill={fill('back')} />
      <Ellipse cx={11.5} cy={37} rx={3.6} ry={7} fill={fill('triceps')} />
      <Ellipse cx={48.5} cy={37} rx={3.6} ry={7} fill={fill('triceps')} />
      <Ellipse cx={9.5} cy={52} rx={2.8} ry={6.5} fill={NEUTRAL} />
      <Ellipse cx={50.5} cy={52} rx={2.8} ry={6.5} fill={NEUTRAL} />
      <Rect x={23} y={48} width={14} height={9} rx={4} fill={NEUTRAL} />
      <Ellipse cx={25} cy={63} rx={5.5} ry={5.5} fill={fill('glutes')} />
      <Ellipse cx={35} cy={63} rx={5.5} ry={5.5} fill={fill('glutes')} />
      <Ellipse cx={25} cy={81} rx={4.6} ry={10} fill={fill('hamstrings')} />
      <Ellipse cx={35} cy={81} rx={4.6} ry={10} fill={fill('hamstrings')} />
      <Ellipse cx={25} cy={103} rx={4} ry={9} fill={fill('calves')} />
      <Ellipse cx={35} cy={103} rx={4} ry={9} fill={fill('calves')} />
    </G>
  );

  return (
    <View style={{ width, height }} accessibilityRole="image">
      <Svg width={width} height={height} viewBox={`0 0 ${vbWidth} 124`}>
        {showFront ? front(0) : null}
        {showBack ? back(showFront ? 60 : 0) : null}
      </Svg>
    </View>
  );
}

/** Which body-map views are worth showing for a set of muscles (only the side(s) they're on). */
export function viewsFor(muscles: Muscle[]): 'both' | 'front' | 'back' {
  const onFront = muscles.some((m) => FRONT.includes(m) && m !== 'shoulders' && m !== 'calves');
  const onBack = muscles.some((m) => BACK.includes(m) && m !== 'shoulders' && m !== 'calves');
  if (onFront && !onBack) return 'front';
  if (onBack && !onFront) return 'back';
  return 'both';
}
