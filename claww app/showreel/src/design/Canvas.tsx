import React from 'react';
import { AbsoluteFill, interpolate, interpolateColors, useCurrentFrame } from 'remotion';
import { CANVAS } from './tokens';

export type CanvasKey = keyof typeof CANVAS;

export interface CanvasStop {
  /** Global frame where this canvas is fully in. */
  at: number;
  key: CanvasKey;
}

/**
 * The light, living background behind the whole film. Base color and glow
 * crossfade between scene canvases over 8 frames around each stop (in sync
 * with the cuts), two soft glows drift slowly, and a fine moving grain keeps
 * it from looking like flat digital fill.
 */
export const Canvas: React.FC<{ stops: CanvasStop[] }> = ({ stops }) => {
  const frame = useCurrentFrame();

  const frames: number[] = [];
  const bases: string[] = [];
  const glows: string[] = [];
  stops.forEach((s, i) => {
    const prev = i === 0 ? s.at : Math.max(stops[i - 1].at + 1, s.at - 8);
    if (i > 0) {
      frames.push(prev);
      bases.push(CANVAS[stops[i - 1].key].base);
      glows.push(CANVAS[stops[i - 1].key].glow);
    }
    frames.push(s.at);
    bases.push(CANVAS[s.key].base);
    glows.push(CANVAS[s.key].glow);
  });
  const base = frames.length > 1 ? interpolateColors(frame, frames, bases) : bases[0];
  const glow = frames.length > 1 ? interpolateColors(frame, frames, glows) : glows[0];

  const driftA = interpolate(frame, [0, 1350], [0, 1]);
  const ax = 70 + Math.sin(driftA * Math.PI * 2) * 8;
  const ay = 30 + Math.cos(driftA * Math.PI * 2) * 10;
  const bx = 22 + Math.cos(driftA * Math.PI * 3) * 9;
  const by = 78 + Math.sin(driftA * Math.PI * 3) * 7;

  return (
    <AbsoluteFill style={{ backgroundColor: base }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${ax}% ${ay}%, ${glow} 0%, transparent 45%), radial-gradient(circle at ${bx}% ${by}%, ${glow} 0%, transparent 40%)`,
          opacity: 0.9,
        }}
      />
      {/* Grain: a new seed every 2 frames reads as film, not static. */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.09, mixBlendMode: 'multiply' }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={Math.floor(frame / 2) % 50} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};
