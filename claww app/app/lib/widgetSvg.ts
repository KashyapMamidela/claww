// Premium F2: drawings for the home-screen widgets as SVG strings (a widget cannot run Skia or react-native-svg).


const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * An SVG arc path: start angle in degrees (0 = 3 o'clock, 90 = 6 o'clock, 270 = 12 o'clock), clockwise, sweeping
 * `sweep` degrees. Paths are used instead of dashed circles because the widget's SVG renderer does not start a dashed
 * circle where browsers do, which drew the rings from the wrong place on the phone.
 */
export function arcPath(cx: number, cy: number, r: number, startDeg: number, sweepDeg: number): string {
  const end = startDeg + sweepDeg;
  const x1 = cx + r * Math.cos(rad(startDeg));
  const y1 = cy + r * Math.sin(rad(startDeg));
  const x2 = cx + r * Math.cos(rad(end));
  const y2 = cy + r * Math.sin(rad(end));
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${sweepDeg > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

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
    if (pct >= 99.9) {
      parts.push(`<circle cx="50" cy="50" r="${r.toFixed(2)}" fill="none" stroke="${ring.color}" stroke-width="${stroke}"/>`);
    } else if (pct > 0) {
      // A sliver still shows as a round dot, so progress that has started is visible.
      parts.push(`<path d="${arcPath(50, 50, r, -90, Math.max((360 * pct) / 100, 0.5))}" fill="none" stroke="${ring.color}" stroke-width="${stroke}" stroke-linecap="round"/>`);
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
  barcode: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 7v10"/><path d="M12 7v10"/><path d="M17 7v10"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
};

export function iconSvg(name: keyof typeof ICONS | string, color: string, strokeWidth = 2.2, fill = 'none'): string {
  const body = ICONS[name] ?? ICONS.plus;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="${fill}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

/**
 * The "liquid glass" card behind a widget. A widget is a RemoteViews picture, so it cannot blur the wallpaper; this is
 * the closest honest version: a smoked, partly see-through pane (the wallpaper shows through), two soft pools of the
 * widget's colour, a specular sheen across the top, and a rim that is bright at the top left and fades round the card.
 */
export function glassSvg(width: number, height: number, tint: string, tint2: string, radius = 26): string {
  const w = Math.max(10, Math.round(width));
  const h = Math.max(10, Math.round(height));
  const r = Math.min(radius, w / 2, h / 2);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="none">` +
    '<defs>' +
    `<radialGradient id="a" cx="0.12" cy="0" r="0.95"><stop offset="0" stop-color="${tint}" stop-opacity="0.34"/><stop offset="1" stop-color="${tint}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="b" cx="1" cy="1" r="0.85"><stop offset="0" stop-color="${tint2}" stop-opacity="0.2"/><stop offset="1" stop-color="${tint2}" stop-opacity="0"/></radialGradient>` +
    '<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.12"/><stop offset="0.42" stop-color="#FFFFFF" stop-opacity="0.02"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="e" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.42"/><stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0.06"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.16"/></linearGradient>' +
    '</defs>' +
    `<rect width="${w}" height="${h}" rx="${r}" fill="#08090C" fill-opacity="0.78"/>` +
    `<rect width="${w}" height="${h}" rx="${r}" fill="url(#a)"/>` +
    `<rect width="${w}" height="${h}" rx="${r}" fill="url(#b)"/>` +
    `<rect width="${w}" height="${h}" rx="${r}" fill="url(#s)"/>` +
    `<rect x="0.75" y="0.75" width="${w - 1.5}" height="${h - 1.5}" rx="${r - 0.75}" fill="none" stroke="url(#e)" stroke-width="1.5"/>` +
    '</svg>'
  );
}

/**
 * The steps gauge: a 270 degree arc (open at the bottom) with a warm gradient, a soft halo under the filled part and a
 * bright knob where today's count has reached. viewBox 100 x 100.
 */
export function stepsGaugeSvg(pct: number, from = '#FBBF24', to = '#F97316'): string {
  const p = Math.max(0, Math.min(1, Number.isFinite(pct) ? pct : 0));
  const r = 40;
  // The arc starts at 135 degrees (bottom left) and runs clockwise 270 degrees to 45 degrees (bottom right).
  const angle = rad(135 + 270 * p);
  const kx = 50 + r * Math.cos(angle);
  const ky = 50 + r * Math.sin(angle);
  const track = arcPath(50, 50, r, 135, 270);
  const fill = arcPath(50, 50, r, 135, Math.max(270 * p, 0.5));
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">' +
    `<defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>` +
    `<path d="${track}" fill="none" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="9" stroke-linecap="round"/>` +
    (p > 0
      ? `<path d="${fill}" fill="none" stroke="${to}" stroke-opacity="0.22" stroke-width="17" stroke-linecap="round"/>` +
        `<path d="${fill}" fill="none" stroke="url(#g)" stroke-width="9" stroke-linecap="round"/>` +
        `<circle cx="${kx.toFixed(2)}" cy="${ky.toFixed(2)}" r="6.5" fill="#FFFFFF"/><circle cx="${kx.toFixed(2)}" cy="${ky.toFixed(2)}" r="3" fill="${to}"/>`
      : '') +
    '</svg>'
  );
}

/** Inside size of three rings, so the number in the middle never touches the innermost ring. */
export function ringHole(sizeDp: number, rings: number, stroke: number, gap: number): number {
  const holeRadius = 50 - rings * stroke - (rings - 1) * gap;
  return Math.max(0, (holeRadius / 100) * sizeDp * 2);
}
