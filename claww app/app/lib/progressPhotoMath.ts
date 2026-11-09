/** "9 Nov 2026" */
export function photoDateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Days between the oldest and newest photo, for the "N days apart" line. */
export function daysApart(a: string, b: string): number {
  const t = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round(Math.abs(t(a) - t(b)) / 86_400_000);
}
