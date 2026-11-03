// WCAG 2.1 contrast, used by tests to keep every text token readable (NG PHASE 1,
// build plan section 6 rule 10: 4.5:1 or better for text).

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of `#RRGGBB`. */
export function luminance(hex: string): number {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) throw new Error(`Not a #RRGGBB colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** Contrast ratio between two `#RRGGBB` colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export const MIN_TEXT_CONTRAST = 4.5;
