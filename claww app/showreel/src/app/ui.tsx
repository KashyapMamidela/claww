import React from 'react';
import { APP, AREA, rgba } from '../design/tokens';

// Small building blocks that copy the app's look (dark cards, colored
// section labels, pills). Inter comes from the Phone wrapper.

export const Screen: React.FC<{ children: React.ReactNode; top?: number }> = ({ children, top = 58 }) => (
  <div style={{ position: 'absolute', inset: 0, padding: `${top}px 18px 24px`, display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
);

export const Label: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color, fontSize: 11, fontWeight: 800, letterSpacing: 1.1 }}>
    <div style={{ width: 6, height: 6, borderRadius: 3, background: color }} />
    {children}
  </div>
);

export const Title: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 28 }) => (
  <div style={{ fontSize: size, fontWeight: 900, letterSpacing: -0.8, lineHeight: 1.05 }}>{children}</div>
);

export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; accent?: string }> = ({ children, style, accent }) => (
  <div
    style={{
      background: APP.card,
      border: `1px solid ${accent ? rgba(accent, 0.45) : APP.border}`,
      borderRadius: 18,
      padding: '14px 14px',
      ...style,
    }}
  >
    {children}
  </div>
);

export const Pill: React.FC<{ color: string; children: React.ReactNode; solid?: boolean }> = ({ color, children, solid }) => (
  <div
    style={{
      padding: '4px 10px',
      borderRadius: 99,
      background: solid ? color : rgba(color, 0.16),
      color: solid ? '#050505' : color,
      fontSize: 10.5,
      fontWeight: 800,
      letterSpacing: 0.4,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </div>
);

export const Button: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = AREA.workouts, style }) => (
  <div
    style={{
      height: 56,
      borderRadius: 18,
      background: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      fontSize: 17,
      fontWeight: 900,
      color: '#fff',
      ...style,
    }}
  >
    {children}
  </div>
);

/** A thin ring like the app's ProgressRing, drawn with SVG. pct 0..1. */
export const Ring: React.FC<{ size: number; stroke: number; pct: number; color: string; track?: string }> = ({ size, stroke, pct, color, track = 'rgba(255,255,255,0.08)' }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ rotate: '-90deg' }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, pct)))} />
    </svg>
  );
};

/** Check mark icon. */
export const Check: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#050505' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
