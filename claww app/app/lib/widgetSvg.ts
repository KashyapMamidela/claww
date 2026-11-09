// Premium F2: progress rings as an SVG string for the widgets (a widget cannot run Skia). Rings start at 12 o'clock and
// run clockwise, like the rings on Home.

export interface RingSpec {
  /** 0..100 */
  pct: number;
  color: string;
}

const TRACK = '#26262B';

/** Concentric rings, outermost first. viewBox is 100 x 100. */
export function ringsSvg(rings: RingSpec[], stroke = 9, gap = 4): string {
  const parts: string[] = [];
  rings.forEach((ring, i) => {
    const r = 50 - stroke / 2 - i * (stroke + gap);
    if (r <= 0) return;
    const c = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(100, Number.isFinite(ring.pct) ? ring.pct : 0));
    parts.push(`<circle cx="50" cy="50" r="${r.toFixed(2)}" fill="none" stroke="${TRACK}" stroke-width="${stroke}"/>`);
    if (pct > 0) {
      const dash = (c * pct) / 100;
      parts.push(
        `<circle cx="50" cy="50" r="${r.toFixed(2)}" fill="none" stroke="${ring.color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${dash.toFixed(2)} ${(c - dash + 1).toFixed(2)}" transform="rotate(-90 50 50)"/>`
      );
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${parts.join('')}</svg>`;
}
