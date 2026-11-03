import { describe, expect, it } from 'vitest';
import { contrastRatio, MIN_TEXT_CONTRAST } from './contrast';
import { AREA_COLORS, COLORS, SURFACES } from './theme';

// Every colour the app may use for text, against every ground text sits on.
const TEXT_TOKENS: Record<string, string> = {
  fg: COLORS.fg,
  fgGray: COLORS.fgGray,
  textMuted: COLORS.textMuted,
  textFaint: COLORS.textFaint,
  pen: COLORS.pen,
  ratingGood: COLORS.ratingGood,
  ratingOkay: COLORS.ratingOkay,
  ratingPoor: COLORS.ratingPoor,
  workouts: AREA_COLORS.workouts,
  nutrition: AREA_COLORS.nutrition,
  recovery: AREA_COLORS.recovery,
  sleep: AREA_COLORS.sleep,
  steps: AREA_COLORS.steps,
  water: AREA_COLORS.water,
};

const GROUNDS: Record<string, string> = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  card: COLORS.card,
  cardTop: SURFACES.cardTop,
  well: SURFACES.well,
};

describe('contrastRatio', () => {
  it('matches known WCAG values', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
    expect(contrastRatio('#123456', '#123456')).toBe(1);
  });

  it('rejects anything that is not #RRGGBB', () => {
    expect(() => contrastRatio('rgba(0,0,0,1)', '#000000')).toThrow();
  });
});

describe('text tokens', () => {
  for (const [name, color] of Object.entries(TEXT_TOKENS)) {
    for (const [ground, bg] of Object.entries(GROUNDS)) {
      it(`${name} on ${ground} is at least ${MIN_TEXT_CONTRAST}:1`, () => {
        expect(contrastRatio(color, bg)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
      });
    }
  }

  it('the old greys fail, which is why they are icon-only now', () => {
    expect(contrastRatio(COLORS.fgGrayDimmer, COLORS.card)).toBeLessThan(MIN_TEXT_CONTRAST);
    expect(contrastRatio(COLORS.fgGrayDim, SURFACES.cardTop)).toBeLessThan(MIN_TEXT_CONTRAST);
  });
});
