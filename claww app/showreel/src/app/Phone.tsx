import React from 'react';
import { APP } from '../design/tokens';
import { UI } from '../design/fonts';

/** Screen size in app points; everything inside a phone is laid out at this size. */
export const SCREEN_W = 390;
export const SCREEN_H = 844;

/**
 * A modern phone: thin black bezel, generous radius, a punch-hole camera and
 * a soft long shadow that reads well on the light canvas. `scale` sizes the
 * whole device; `style` takes the transforms (position, rotate, 3D tilt).
 */
export const Phone: React.FC<{
  children: React.ReactNode;
  scale?: number;
  style?: React.CSSProperties;
  shadow?: number;
}> = ({ children, scale = 1, style, shadow = 1 }) => {
  const bezel = 12;
  return (
    <div
      style={{
        width: (SCREEN_W + bezel * 2) * scale,
        height: (SCREEN_H + bezel * 2) * scale,
        ...style,
      }}
    >
      <div
        style={{
          width: SCREEN_W + bezel * 2,
          height: SCREEN_H + bezel * 2,
          scale: String(scale),
          transformOrigin: 'top left',
          borderRadius: 64,
          background: '#0A0A0B',
          padding: bezel,
          boxShadow: `0 ${50 * shadow}px ${110 * shadow}px rgba(25,22,45,${0.28 * shadow}), 0 ${12 * shadow}px ${30 * shadow}px rgba(25,22,45,${0.18 * shadow}), inset 0 0 0 2px #2A2A2E`,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: SCREEN_W,
            height: SCREEN_H,
            borderRadius: 52,
            overflow: 'hidden',
            background: APP.bg,
            fontFamily: UI,
            color: APP.fg,
          }}
        >
          {children}
          {/* status bar */}
          <div style={{ position: 'absolute', top: 14, left: 30, right: 30, display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 600, color: '#fff' }}>
            <span>18:24</span>
            <span style={{ letterSpacing: 1 }}>5G 82%</span>
          </div>
          <div style={{ position: 'absolute', top: 12, left: SCREEN_W / 2 - 9, width: 18, height: 18, borderRadius: 99, background: '#000', boxShadow: 'inset 0 0 0 3px #111' }} />
        </div>
      </div>
    </div>
  );
};
