// Premium F2: drawings for the home-screen widgets as SVG strings (a widget cannot run Skia or react-native-svg).

export interface RingSpec {
  /** 0..100 */
  pct: number;
  color: string;
}

/**
 * Concentric progress rings, outermost first, in a 100 x 100 viewBox. Like Apple's activity rings, each track is its own
 * colour, dimmed, so an empty ring still says which ring it is; the bar starts at 12 o'clock and runs clockwise.
 */
export function ringsSvg(rings: RingSpec[], stroke = 9, gap = 4, trackOpacity = 0.2): string {
  const parts: string[] = [];
  rings.forEach((ring, i) => {
    const r = 50 - stroke / 2 - i * (stroke + gap);
    if (r <= 0) return;
    const c = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(100, Number.isFinite(ring.pct) ? ring.pct : 0));
    parts.push(`<circle cx="50" cy="50" r="${r.toFixed(2)}" fill="none" stroke="${ring.color}" stroke-opacity="${trackOpacity}" stroke-width="${stroke}"/>`);
    if (pct > 0) {
      // A sliver under 2 % still shows as a round dot, so progress that has started is visible.
      const dash = Math.max((c * pct) / 100, 0.01);
      parts.push(
        `<circle cx="50" cy="50" r="${r.toFixed(2)}" fill="none" stroke="${ring.color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${dash.toFixed(2)} ${(c + 1).toFixed(2)}" transform="rotate(-90 50 50)"/>`
      );
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${parts.join('')}</svg>`;
}

// Lucide icons (ISC licence), stroke style to match the app's icon set.
const ICONS: Record<string, string> = {
  flame:
    '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  footprints:
    '<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4"/><path d="M4 13h4"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 3 2h3Zm0 0v7"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
};

export function iconSvg(name: keyof typeof ICONS | string, color: string, strokeWidth = 2.2, fill = 'none'): string {
  const body = ICONS[name] ?? ICONS.plus;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="${fill}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}
