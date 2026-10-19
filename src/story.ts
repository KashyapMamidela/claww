// The story's shared state. Scroll writes `pos` (0 = empty bar on the hero,
// 1..4 = each plate's chapter, 5 = the finale); the 3D scene and the load
// counter read it every frame. Plain mutable object on purpose: it changes
// every frame and must never trigger a React render.

export const BAR_KG = 20;

export interface Plate {
  kg: number;
  /** Area color from the app's AREA_COLORS. */
  color: string;
  /** Plate radius and thickness in scene units (sized from real plates). */
  radius: number;
  thick: number;
}

/** Per side, in the order they go on. 20 + 2 x (15 + 2.5 + 2.5 + 1.25) = 62.5 kg. */
export const PLATES: Plate[] = [
  { kg: 15, color: '#A855F7', radius: 0.62, thick: 0.13 },
  { kg: 2.5, color: '#2DD4BF', radius: 0.31, thick: 0.06 },
  { kg: 2.5, color: '#3B82F6', radius: 0.31, thick: 0.06 },
  { kg: 1.25, color: '#22C55E', radius: 0.25, thick: 0.048 },
];

export const CHAPTERS = PLATES.length + 2; // hero, four plates, finale

export const store = {
  /** Story position, 0..5, written by scroll. */
  pos: 0,
  /** Pointer in -1..1, for a little parallax. */
  pointerX: 0,
  pointerY: 0,
  reducedMotion: false,
};

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** How far plate i has travelled onto the sleeve (0 = off-screen, 1 = seated). It goes on as its chapter scrolls in. */
export const attachOf = (i: number, pos: number) => smoothstep(i + 0.25, i + 0.9, pos);

/** Total load on the bar at a story position. */
export function loadAt(pos: number): number {
  return BAR_KG + 2 * PLATES.reduce((sum, p, i) => sum + p.kg * attachOf(i, pos), 0);
}

export function formatKg(kg: number): string {
  const r = Math.round(kg * 4) / 4; // plates come in quarter-kilo steps
  return Number.isInteger(r) ? String(r) : r.toFixed(r * 4 % 2 === 0 ? 1 : 2);
}
