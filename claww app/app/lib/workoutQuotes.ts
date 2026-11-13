// The line shown when a workout starts. Written for CLAWW (not borrowed), short, in a coach's voice, and matched to the
// kind of session: push, pull, legs, core, cardio, mobility or anything else. A pick never repeats the one before it.
// Pure apart from the module-level memory of the last pick, so Vitest can test the matching.

export type QuoteKind = 'push' | 'pull' | 'legs' | 'core' | 'cardio' | 'mobility' | 'any';

export const QUOTES: Record<QuoteKind, string[]> = {
  push: [
    "Every rep pushes yesterday's limit a little further back.",
    'Press like the floor owes you something.',
    'Chest up, shoulders down, nothing to prove but today.',
    'Heavy is just a word until you move it.',
    "You don't need a perfect day. You need a set.",
    'Push the weight, not the excuses.',
  ],
  pull: [
    "Pull yourself up to the person you said you'd be.",
    'Strong backs carry quietly. Build one.',
    "Every row is a vote for who you're becoming.",
    'Squeeze at the top. Own the pause.',
    'Stand tall tonight. You earned the posture.',
    'Reach, pull, repeat. Simple is strong.',
  ],
  legs: [
    'Legs are the engine. Fuel it, then run it hot.',
    "Nobody regrets leg day once it's done.",
    'Drive through the floor and the rest follows.',
    'Deep breath, brace, go down, come back stronger.',
    'The hard sets are the ones that count. Go find them.',
    'Your future self is leaning on these squats.',
  ],
  core: [
    'A steady core makes every other lift easier. Brace.',
    'Breathe, brace, hold. Then hold a little longer.',
    'Strong in the middle, steady everywhere.',
  ],
  cardio: [
    'Find your pace, then find one more gear.',
    'Every minute here is a minute your heart remembers.',
    'Easy start, honest finish.',
  ],
  mobility: [
    'Slow is smooth, smooth is strong. Breathe into it.',
    "Move gently. You're building room to move for years.",
    'Nothing to beat today. Just loosen up and arrive.',
  ],
  any: [
    'Show up, set the first rep, let momentum do the rest.',
    'Small sets, stacked daily, change everything.',
    "You came. That's the hardest rep already done.",
    'Strong is a habit. This is the habit.',
    'Quiet work today, loud results later.',
    'Be a little better than your last session. That is the whole plan.',
  ],
};

/** Which kind of session a plan day's name describes. "Push B", "Legs (2)", "Full body", "Yoga flow", "Cardio". */
export function quoteKind(focus: string): QuoteKind {
  const f = focus.toLowerCase();
  if (/yoga|mobility|stretch|flow|recover/.test(f)) return 'mobility';
  if (/cardio|run|walk|cycle|cycling|swim|hiit|conditioning/.test(f)) return 'cardio';
  if (/push|chest|press|shoulder|tricep/.test(f)) return 'push';
  if (/pull|back|row|bicep|lat/.test(f)) return 'pull';
  if (/leg|squat|lower|glute|quad|hamstring|calf/.test(f)) return 'legs';
  if (/core|abs|abdominal/.test(f)) return 'core';
  return 'any';
}

let last: string | null = null;

/**
 * A random line for the session. About one in three picks comes from the general pool so a push day is not always a
 * push line; the one just shown is never picked twice in a row. `random` is injectable for tests.
 */
export function pickQuote(focus: string, random: () => number = Math.random): string {
  const kind = quoteKind(focus);
  const pool = kind !== 'any' && random() > 0.34 ? QUOTES[kind] : QUOTES.any;
  const options = pool.filter((q) => q !== last);
  const pick = options[Math.floor(random() * options.length) % options.length] ?? pool[0];
  last = pick;
  return pick;
}

/** For tests: forget the last pick. */
export function resetQuoteMemory(): void {
  last = null;
}
