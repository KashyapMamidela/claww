import React from 'react';
import { useCurrentFrame } from 'remotion';
import { DISPLAY, SERIF, UI } from './fonts';
import { EASE_IN, EASE_OUT, tween } from './motion';
import { INK } from './tokens';

/**
 * Words rise out of a mask one after another (the "type rising from under a
 * line" look). `delay` is when the first word starts; `stagger` frames between
 * words. `out` is the frame where the words drop away again (optional).
 */
export const RiseWords: React.FC<{
  text: string;
  delay?: number;
  stagger?: number;
  size: number;
  font?: 'display' | 'serif' | 'ui';
  color?: string;
  weight?: number;
  tracking?: number;
  lineHeight?: number;
  out?: number;
  upper?: boolean;
  style?: React.CSSProperties;
}> = ({ text, delay = 0, stagger = 3, size, font = 'display', color = INK, weight, tracking, lineHeight = 0.95, out, upper, style }) => {
  const frame = useCurrentFrame();
  const family = font === 'display' ? DISPLAY : font === 'serif' ? SERIF : UI;
  const words = text.split(' ');
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        columnGap: size * 0.22,
        fontFamily: family,
        fontSize: size,
        fontWeight: weight ?? (font === 'ui' ? 800 : 400),
        letterSpacing: tracking ?? (font === 'display' ? size * 0.005 : font === 'ui' ? -size * 0.03 : -size * 0.01),
        lineHeight,
        color,
        textTransform: upper ? 'uppercase' : undefined,
        ...style,
      }}
    >
      {words.map((w, i) => {
        const start = delay + i * stagger;
        const inY = tween(frame, start, start + 14, 105, 0, EASE_OUT);
        const outY = out !== undefined ? tween(frame, out + i * 1.5, out + i * 1.5 + 9, 0, -105, EASE_IN) : 0;
        return (
          <span key={i} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: size * 0.06, marginBottom: -size * 0.06 }}>
            <span style={{ display: 'inline-block', translate: `0 ${inY + outY}%` }}>{w}</span>
          </span>
        );
      })}
    </div>
  );
};

/** A small label in caps with a colored dot, like the app's section labels. */
export const Kicker: React.FC<{ text: string; color: string; delay?: number; size?: number }> = ({ text, color, delay = 0, size = 22 }) => {
  const frame = useCurrentFrame();
  const o = tween(frame, delay, delay + 10, 0, 1);
  const x = tween(frame, delay, delay + 14, -20, 0);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: o, translate: `${x}px 0`, fontFamily: UI, fontWeight: 800, fontSize: size, letterSpacing: size * 0.18, color }}>
      <div style={{ width: size * 0.45, height: size * 0.45, borderRadius: 99, background: color }} />
      {text}
    </div>
  );
};
