// Premium F5: the weekly recap as four cards: sessions, protein days, best lift, streak. Rules only, built from numbers
// the app already has; the copy is short and plain. Pure.

export interface RecapFacts {
  sessionsDone: number;
  sessionsPlanned: number;
  proteinDays: number;
  mealDays: number;
  /** Heaviest set this week, if any was logged. */
  bestLift: { name: string; weightKg: number; reps: number } | null;
  streakDays: number;
}

export interface RecapCard {
  id: 'sessions' | 'protein' | 'lift' | 'streak';
  kicker: string;
  big: string;
  unit: string;
  line: string;
  /** Accent colour of the card. */
  color: string;
}

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

export function buildRecap(f: RecapFacts): RecapCard[] {
  const cards: RecapCard[] = [];
  cards.push({
    id: 'sessions',
    kicker: 'THIS WEEK',
    big: f.sessionsPlanned > 0 ? `${f.sessionsDone} of ${f.sessionsPlanned}` : String(f.sessionsDone),
    unit: plural(f.sessionsDone, 'session'),
    line: f.sessionsPlanned > 0 && f.sessionsDone >= f.sessionsPlanned ? 'Every planned session done.' : f.sessionsDone === 0 ? 'A quiet week. The plan is still there.' : 'You kept showing up.',
    color: '#3B82F6',
  });
  cards.push({
    id: 'protein',
    kicker: 'PROTEIN',
    big: String(f.proteinDays),
    unit: `${plural(f.proteinDays, 'day')} on target`,
    line: f.mealDays === 0 ? 'Log your meals and this fills in.' : `${f.proteinDays} of ${f.mealDays} logged ${plural(f.mealDays, 'day')} hit your protein.`,
    color: '#22C55E',
  });
  if (f.bestLift) {
    const kg = Math.round(f.bestLift.weightKg * 100) / 100;
    cards.push({ id: 'lift', kicker: 'HEAVIEST SET', big: `${kg}`, unit: 'kg', line: `${f.bestLift.name}, ${f.bestLift.reps} ${plural(f.bestLift.reps, 'rep')}.`, color: '#F59E0B' });
  }
  cards.push({
    id: 'streak',
    kicker: 'STREAK',
    big: String(f.streakDays),
    unit: plural(f.streakDays, 'day'),
    line: f.streakDays > 1 ? 'Plan followed, day after day.' : 'Follow the plan today and it starts.',
    color: '#F472B6',
  });
  return cards;
}

export function recapShareText(cards: RecapCard[]): string {
  return `My week on CLAWW: ${cards.map((c) => `${c.big} ${c.unit}`).join(', ')}.`;
}
