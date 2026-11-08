// Premium X3: the colour of the light at the top of the screen follows the time of day, mixed with the tab's own colour.
// Pure so it can be tested.

/** Hour 0-23 to the time-of-day glow: dawn amber, day neutral (the tab colour alone), dusk orange, night indigo. */
export function dayLight(hour: number): { color: string; mix: number } {
  if (hour >= 5 && hour < 9) return { color: '#F59E0B', mix: 0.5 };
  if (hour >= 9 && hour < 17) return { color: '#60A5FA', mix: 0.15 };
  if (hour >= 17 && hour < 20) return { color: '#FB923C', mix: 0.5 };
  return { color: '#818CF8', mix: 0.5 };
}

const parse = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** The glow as an rgba string: the tab colour blended with the time-of-day colour, at the given opacity. */
export function ambientGlow(hour: number, tabColor: string, alpha = 0.2): string {
  const { color, mix } = dayLight(hour);
  const a = parse(tabColor);
  const b = parse(color);
  const m = a.map((v, i) => Math.round(v * (1 - mix) + b[i] * mix));
  return `rgba(${m[0]}, ${m[1]}, ${m[2]}, ${alpha})`;
}
