import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { COLORS, FONT, BG, bg } from '../../lib/theme';

// Shared type scale — replaces the per-screen habit of hand-writing
// fontSize/letterSpacing/lineHeight on every Text. Tracking tightens and
// leading loosens as size goes up, per Apple's size-specific type rules
// (a fixed letter-spacing value is wrong at some size no matter what you pick).

interface TypographyProps extends TextProps {
  children: React.ReactNode;
  color?: string;
  style?: TextStyle | TextStyle[];
}

function makeVariant(base: TextStyle) {
  return function Variant({ children, color, style, ...rest }: TypographyProps) {
    return (
      <Text style={[base, color ? { color } : null, style]} {...rest}>
        {children}
      </Text>
    );
  };
}

/** Page-level title — "Workouts", "Good morning, X." 28-32px. */
export const Display = makeVariant({
  fontSize: 28,
  letterSpacing: -0.6,
  lineHeight: 30,
  color: COLORS.fg,
  fontFamily: BG[800],
});

/** Card/hero headline — "Upper Body Hypertrophy", section-level heading. 20-22px. */
export const Heading = makeVariant({
  fontSize: 20,
  letterSpacing: -0.3,
  lineHeight: 25,
  color: COLORS.fg,
  fontFamily: BG[800],
});

/** Card title / list item title — "Water Intake", exercise names. 14-15px. */
export const Title = makeVariant({
  fontSize: 15,
  letterSpacing: -0.04,
  lineHeight: 18,
  color: COLORS.fg,
  fontFamily: BG[700],
});

/** Running/body text — descriptions, helper copy. 13px. */
export const Body = makeVariant({
  fontSize: 13,
  letterSpacing: 0,
  lineHeight: 19,
  color: COLORS.fgGray,
  fontFamily: BG[500],
});

/** Small uppercase section label — "YOUR PLAN", "TODAY". 10-11px. Prefer SectionLabel when a leading dot is wanted. */
export const Eyebrow = makeVariant({
  fontSize: 11,
  letterSpacing: 0.6,
  color: COLORS.fgGray,
  fontFamily: BG[700],
  textTransform: 'uppercase',
});

/** Smallest meta text — timestamps, sub-labels, disclaimers. 10-11px. */
export const Caption = makeVariant({
  fontSize: 11,
  letterSpacing: 0.05,
  lineHeight: 15,
  color: COLORS.textMuted,
  fontFamily: BG[400],
});

// ── Premium S7: the type scale from docs/premium-plan.md section 1.1 ────────────────────────────────────────────
// Large title 34 · Title 1 28 · Title 2 22 · Headline 17 · Body 17 · Callout 15 · Footnote 13 · Label 12 · Tab 11.
// New code uses these; old screens move over as they are touched. Numbers that change use tabular figures.

export const LargeTitle = makeVariant({ fontSize: 34, lineHeight: 40, letterSpacing: -0.8, color: COLORS.fg, fontFamily: BG[800] });
export const Title1 = makeVariant({ fontSize: 28, lineHeight: 34, letterSpacing: -0.5, color: COLORS.fg, fontFamily: BG[800] });
export const Title2 = makeVariant({ fontSize: 22, lineHeight: 28, letterSpacing: -0.3, color: COLORS.fg, fontFamily: BG[800] });
export const Headline = makeVariant({ fontSize: 17, lineHeight: 22, color: COLORS.fg, fontFamily: BG[700] });
export const BodyText = makeVariant({ fontSize: 17, lineHeight: 24, color: COLORS.fgGray, fontFamily: BG[500] });
export const Callout = makeVariant({ fontSize: 15, lineHeight: 21, color: COLORS.fgGray, fontFamily: BG[500] });
export const Footnote = makeVariant({ fontSize: 13, lineHeight: 18, color: COLORS.textMuted, fontFamily: BG[500] });
export const Label = makeVariant({ fontSize: 12, lineHeight: 16, letterSpacing: 0.96, color: COLORS.textMuted, fontFamily: BG[800], textTransform: 'uppercase' });
export const BigNumber = makeVariant({ fontSize: 44, lineHeight: 48, letterSpacing: -1, color: COLORS.fg, fontFamily: BG[800], fontVariant: ['tabular-nums'] });
