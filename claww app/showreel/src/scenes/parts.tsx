import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Phone } from '../app/Phone';
import { EASE_IN, settle, tween } from '../design/motion';

/**
 * A hero phone that rises in with a 3D tilt that settles, then breathes
 * (slow drift and float) until the scene ends, and leaves fast on `exitAt`.
 * `side` sets which way it leans.
 */
export const HeroPhone: React.FC<{
  children: React.ReactNode;
  x: number;
  y?: number;
  scale?: number;
  side?: 'left' | 'right';
  delay?: number;
  exitAt?: number;
}> = ({ children, x, y = 540, scale = 1.05, side = 'right', delay = 0, exitAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = settle(frame, fps, delay);
  const dir = side === 'right' ? -1 : 1;
  const tiltY = dir * (22 * (1 - s) + 7);
  const tiltX = 10 * (1 - s) + 3;
  const float = Math.sin((frame / fps) * 1.4) * 6;
  const exit = exitAt !== undefined ? tween(frame, exitAt, exitAt + 10, 0, 1, EASE_IN) : 0;
  const w = 414 * scale;
  const h = 868 * scale;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - w / 2,
        top: y - h / 2,
        opacity: Math.min(1, s * 2) * (1 - exit),
        translate: `0 ${(1 - s) * 420 + float - exit * 260}px`,
        transform: `perspective(2200px) rotateY(${tiltY + Math.sin(frame / 40) * 1.5}deg) rotateX(${tiltX}deg)`,
      }}
    >
      <Phone scale={scale}>{children}</Phone>
    </div>
  );
};

/** Slow push-in on the whole scene so nothing is ever perfectly static. */
export const Push: React.FC<{ children: React.ReactNode; amount?: number }> = ({ children, amount = 0.035 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return <AbsoluteFill style={{ scale: String(1 + (frame / Math.max(1, durationInFrames)) * amount) }}>{children}</AbsoluteFill>;
};

/** Absolute block positioned from the left/top of the 1920 x 1080 frame. */
export const At: React.FC<{ x: number; y: number; children: React.ReactNode; w?: number; style?: React.CSSProperties }> = ({ x, y, children, w, style }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, ...style }}>{children}</div>
);

/** A floating chip that pops in next to the phone and bobs. */
export const FloatChip: React.FC<{ x: number; y: number; delay: number; children: React.ReactNode; rotate?: number }> = ({ x, y, delay, children, rotate = -4 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = settle(frame, fps, delay);
  const bob = Math.sin((frame - delay) / 14) * 5;
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: s, scale: String(0.85 + 0.15 * s), translate: `0 ${(1 - s) * 30 + bob}px`, rotate: `${rotate}deg` }}>{children}</div>
  );
};
