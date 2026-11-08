// Premium H2: the one handwritten line under Home's coach sentence. Rules from the day, never generated, 40 characters or fewer.

export interface PenLineInput {
  sleepHours: number | null;
  sessionPlanned: boolean;
  sessionDone: boolean;
  /** Local hour, 0 to 23. */
  hour: number;
}

export function penLine(i: PenLineInput): string | null {
  if (i.sessionDone) return 'session done, eat well tonight';
  if (i.sleepHours !== null && i.sleepHours < 6) return 'short night, keep today easy';
  if (i.sessionPlanned && i.sleepHours !== null && i.sleepHours >= 7) return 'well rested, make it count';
  if (!i.sessionPlanned) return i.hour >= 18 ? 'rest day, bed early tonight' : 'rest day, a walk helps';
  return null;
}
