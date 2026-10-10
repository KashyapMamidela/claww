export type Greeting = 'Good morning' | 'Good afternoon' | 'Good evening' | 'Good night';

/** Picks the greeting from the device's local time: morning 05:00–11:59,
 * afternoon 12:00–16:59, evening 17:00–21:59, night 22:00–04:59. */
export function greetingFor(date: Date): Greeting {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Good night';
}
