import { describe, expect, it } from 'vitest';
import { coachLine, coachText, sleepText } from './coachLine';
import { clockLabel, heroFor, usualMinutesOf } from './homeMoment';
import { marksFor, shortNote, type PlanMark } from './planMarks';
import { examWeekActive, examWeekFrom, planStreak, streakSentence } from './planStreak';
import { feelNote, newBest, newBestText, sessionTitle, totalVolume, volumeDelta } from './sessionRecap';
import { SHARE_HEIGHT, SHARE_WIDTH, previewScale, shareCaptureOptions, shareFileName } from './shareCard';
import { shortLabel, weekStrip } from './weekStrip';
import { bestRecords, previousVolume } from './recapData';
import type { PrescribedExercise } from './sessionPrescription';

const mark = (over: Partial<PlanMark> = {}): PlanMark => ({ name: 'Bench press', kind: 'weight', oldText: '62.5', newText: '60 kg', note: 'short sleep', direction: 'down', ...over });

describe('coach line', () => {
  const base = { sleepHours: 6 + 10 / 60, sessionPlanned: true, sessionDone: false, marks: [mark(), mark({ name: 'Face pulls', kind: 'sets', direction: 'up' })], proteinLeftG: null as number | null, hour: 7 };
  it('matches screen 01: short sleep, bench holds, an extra set', () => {
    expect(coachText(coachLine(base))).toBe('You slept 6 h 10 min, so today is a little lighter. Bench press holds, face pulls get an extra set.');
    expect(coachLine(base).some((s) => s.bold && s.text === 'today is a little lighter')).toBe(true);
  });
  it('sleep bands', () => {
    expect(coachText(coachLine({ ...base, marks: [], sleepHours: 8 }))).toContain('good day to push');
    expect(coachText(coachLine({ ...base, marks: [], sleepHours: 7 }))).toBe('You slept 7 h, a normal night.');
    expect(coachText(coachLine({ ...base, marks: [], sleepHours: null }))).toContain('Log last night');
  });
  it('mentions protein left in the evening or when nothing else is marked, never tiny amounts', () => {
    expect(coachText(coachLine({ ...base, hour: 19, proteinLeftG: 45 }))).toContain('45 g of protein left');
    expect(coachText(coachLine({ ...base, hour: 7, proteinLeftG: 45 }))).not.toContain('protein');
    expect(coachText(coachLine({ ...base, marks: [], hour: 7, proteinLeftG: 45 }))).toContain('protein');
    expect(coachText(coachLine({ ...base, hour: 19, proteinLeftG: 5 }))).not.toContain('protein');
  });
  it('a done session says so and drops the marks', () => {
    const t = coachText(coachLine({ ...base, sessionDone: true }));
    expect(t).toContain('done');
    expect(t).not.toContain('holds');
  });
  it('formats sleep', () => {
    expect(sleepText(7.5)).toBe('7 h 30 min');
    expect(sleepText(8)).toBe('8 h');
  });
});

describe('hero by moment', () => {
  const i = { hour: 7, minute: 40, sessionPlanned: true, sessionDone: false, mealLeft: true, usualMinutes: 18 * 60 as number | null };
  it('morning shows the session, evening the next meal', () => {
    expect(heroFor(i)).toBe('session');
    expect(heroFor({ ...i, hour: 19, minute: 0, usualMinutes: 7 * 60 })).toBe('meal');
  });
  it('a session due soon keeps the session hero in the evening', () => {
    expect(heroFor({ ...i, hour: 17, minute: 30 })).toBe('session');
    expect(heroFor({ ...i, hour: 17, minute: 30, usualMinutes: null })).toBe('meal');
  });
  it('after the session, the meal; with nothing left, none', () => {
    expect(heroFor({ ...i, sessionDone: true })).toBe('meal');
    expect(heroFor({ ...i, sessionDone: true, mealLeft: false })).toBe('none');
    expect(heroFor({ ...i, sessionPlanned: false, mealLeft: false })).toBe('none');
    expect(heroFor({ ...i, hour: 21, minute: 0, mealLeft: false, usualMinutes: null })).toBe('session');
  });
  it('time helpers', () => {
    expect(usualMinutesOf('18:00')).toBe(1080);
    expect(usualMinutesOf('')).toBeNull();
    expect(usualMinutesOf('25:00')).toBeNull();
    expect(clockLabel(new Date(2026, 10, 4, 7, 40))).toBe('7:40 AM');
    expect(clockLabel(new Date(2026, 10, 4, 0, 5))).toBe('12:05 AM');
    expect(clockLabel(new Date(2026, 10, 4, 18, 0))).toBe('6:00 PM');
  });
});

describe('streak with rest days and exam week', () => {
  // Monday 2 Nov 2026 to Thursday 5 Nov. Plan: Mon, Tue, Thu, Fri (weekdays 0, 1, 3, 4); Wednesday is a rest day.
  const planned = [0, 1, 3, 4];
  it('counts done days and rest days; today is not counted until done', () => {
    const r = planStreak({ today: '2026-11-05', plannedWeekdays: planned, completedDates: new Set(['2026-11-02', '2026-11-03']), examWeek: null, planStart: '2026-11-02' });
    expect(r.days).toBe(3); // Tue done, Wed rest, Mon done; Thursday (today) still to come
    expect(r.since).toBe('2026-11-02');
  });
  it('a missed planned day breaks the streak', () => {
    const r = planStreak({ today: '2026-11-05', plannedWeekdays: planned, completedDates: new Set(['2026-11-03']), examWeek: null, planStart: '2026-10-26' });
    expect(r.days).toBe(2); // Wed rest, Tue done; Monday missed
  });
  it('an exam week protects a missed day without counting it', () => {
    const exam = { from: '2026-11-02', until: '2026-11-02' };
    const r = planStreak({ today: '2026-11-05', plannedWeekdays: planned, completedDates: new Set(['2026-11-03']), examWeek: exam, planStart: '2026-11-02' });
    expect(r.days).toBe(2); // Monday protected: neither counts nor breaks
    const without = planStreak({ today: '2026-11-05', plannedWeekdays: planned, completedDates: new Set(['2026-11-03']), examWeek: null, planStart: '2026-11-01' });
    expect(without.days).toBe(2);
    const longer = planStreak({ today: '2026-11-05', plannedWeekdays: planned, completedDates: new Set(['2026-11-03', '2026-10-30']), examWeek: exam, planStart: '2026-10-26' });
    expect(longer.days).toBeGreaterThan(2); // the run continues through the protected day
  });
  it('finishing today adds it', () => {
    const r = planStreak({ today: '2026-11-05', plannedWeekdays: planned, completedDates: new Set(['2026-11-05', '2026-11-03', '2026-11-02']), examWeek: null, planStart: '2026-11-02' });
    expect(r.days).toBe(4);
    expect(r.since).toBe('2026-11-02');
  });
  it('a plan without weekdays treats every day as planned', () => {
    const r = planStreak({ today: '2026-11-05', plannedWeekdays: null, completedDates: new Set(['2026-11-04', '2026-11-03']), examWeek: null });
    expect(r.days).toBe(2);
  });
  it('words and exam week helpers', () => {
    expect(streakSentence({ days: 6, since: '2026-10-30' }, '2026-11-05')).toBe('Plan followed every day since Friday.');
    expect(streakSentence({ days: 0, since: null }, '2026-11-05')).toContain('streak starts');
    const w = examWeekFrom(new Date(2026, 10, 2));
    expect(w).toEqual({ from: '2026-11-02', until: '2026-11-08' });
    expect(examWeekActive(w, '2026-11-05')).toBe(true);
    expect(examWeekActive(w, '2026-11-09')).toBe(false);
    expect(examWeekActive(null, '2026-11-05')).toBe(false);
  });
});

describe('session recap', () => {
  it('volume and its change against last time (screen 10: +4%)', () => {
    expect(totalVolume([{ name: 'a', weightKg: 60, reps: 8 }, { name: 'b', weightKg: 0, reps: 12 }])).toBe(480);
    expect(volumeDelta(6840, 6577)?.text).toBe('+4%');
    expect(volumeDelta(6000, 6500)?.text).toBe('−8%');
    expect(volumeDelta(6000, null)).toBeNull();
    expect(volumeDelta(6000, 0)).toBeNull();
  });
  it('a new best is a heavier top weight or more reps at the same weight, never a first-ever exercise', () => {
    const done = [
      { name: 'Incline DB press', weightKg: 22.5, reps: 10 },
      { name: 'Incline DB press', weightKg: 22.5, reps: 10 },
      { name: 'Incline DB press', weightKg: 22.5, reps: 10 },
      { name: 'Bench press', weightKg: 60, reps: 8 },
      { name: 'New move', weightKg: 10, reps: 12 },
    ];
    const history = [
      { name: 'Incline DB press', maxWeightKg: 20, repsAtMax: 10 },
      { name: 'Bench press', maxWeightKg: 60, repsAtMax: 8 },
    ];
    const b = newBest(done, history)!;
    expect(b.name).toBe('Incline DB press');
    expect(newBestText(b)).toBe('22.5 kg × 10 on 3 sets');
    expect(newBest([{ name: 'Bench press', weightKg: 60, reps: 9 }], history)?.reps).toBe(9);
    expect(newBest([{ name: 'Bench press', weightKg: 60, reps: 8 }], history)).toBeNull();
    expect(newBest(done.slice(4), history)).toBeNull();
  });
  it('the pen note says what each feel will do', () => {
    expect(feelNote('just_right')).toBe('perfect, next week climbs as planned');
    expect(feelNote('too_hard')).toContain('holds');
    expect(feelNote('too_easy')).toContain('sooner');
  });
  it('title by share of planned sets done', () => {
    expect(sessionTitle(16, 16)).toBe('Strong session');
    expect(sessionTitle(9, 16)).toBe('Good session');
    expect(sessionTitle(3, 16)).toBe('Session done');
    expect(sessionTitle(0, 0)).toBe('Session done');
  });
});

describe('share image', () => {
  it('is 1080 x 1920, a png, a temporary file', () => {
    expect(shareCaptureOptions()).toEqual({ format: 'png', quality: 1, width: 1080, height: 1920, result: 'tmpfile' });
    expect(SHARE_WIDTH / SHARE_HEIGHT).toBeCloseTo(9 / 16, 5);
  });
  it('preview scale and file name', () => {
    expect(previewScale(360)).toBeCloseTo(1 / 3, 5);
    expect(previewScale(5000)).toBe(1);
    expect(shareFileName(new Date(2026, 10, 4))).toBe('claww-session-2026-11-04.png');
  });
});

describe('plan marks', () => {
  const ex = (o: { name?: string; managed?: boolean; isNew?: boolean; weight?: number; sets?: number; reps?: number; planW?: number; planSets?: number; planReps?: number; reason?: string }): PrescribedExercise =>
    ({
      name: o.name ?? 'Bench press',
      managed: o.managed ?? true,
      isNew: o.isNew ?? false,
      meta: null,
      entry: null,
      muscleScore: null,
      state: { next: { weightKg: o.planW ?? 62.5, repTarget: o.planReps ?? 8, sets: o.planSets ?? 4 } },
      prescription: { weightKg: o.weight ?? 60, reps: o.reps ?? 8, sets: o.sets ?? 4, commands: [], reason: o.reason ?? 'Short sleep, so the weight holds back.' },
    }) as unknown as PrescribedExercise;
  it('a lowered weight is a struck old value and a bold new one with a short note', () => {
    expect(marksFor([ex({})])).toEqual([{ name: 'Bench press', kind: 'weight', oldText: '62.5', newText: '60 kg', note: 'short sleep', direction: 'down' }]);
  });
  it('sets and reps marks; nothing for unchanged, new or unmanaged exercises', () => {
    expect(marksFor([ex({ name: 'Face pulls', planW: 20, weight: 20, planSets: 3, sets: 4 })])[0]).toMatchObject({ kind: 'sets', oldText: '3 sets', newText: '4 sets', direction: 'up' });
    expect(marksFor([ex({ weight: 62.5 })])).toEqual([]);
    expect(marksFor([ex({ isNew: true })])).toEqual([]);
    expect(marksFor([ex({ managed: false })])).toEqual([]);
  });
  it('short notes are lower case and at most 42 characters', () => {
    expect(shortNote('Shoulders are fresh, one more set.')).toBe('shoulders are fresh');
    expect(shortNote('')).toBe('');
    expect(shortNote('A very long first clause that keeps going well past the limit of the pen note').length).toBeLessThanOrEqual(42);
  });
});

describe('week strip', () => {
  const days = [
    { day: 'Monday', focus: 'Upper A' },
    { day: 'Tuesday', focus: 'Legs' },
    { day: 'Thursday', focus: 'Push' },
    { day: 'Friday', focus: 'Legs' },
    { day: 'Saturday', focus: 'Pull' },
  ];
  const now = new Date(2026, 10, 5, 9, 0); // Thursday 5 Nov 2026
  const ev = (day: string, date: Date) => ({ dayLabel: day, status: 'completed' as const, createdAt: date.toISOString() });
  it('seven cells Monday to Sunday with rest days, done, missed, today and upcoming', () => {
    const s = weekStrip(days, [ev('Monday', new Date(2026, 10, 2, 18))], now)!;
    expect(s.cells.map((c) => c.state)).toEqual(['done', 'missed', 'rest', 'today', 'upcoming', 'upcoming', 'rest']);
    expect(s.cells.map((c) => c.label)).toEqual(['Upper', 'Legs', 'Rest', 'Push', 'Legs', 'Pull', 'Rest']);
    expect(s.cells[0].dateNumber).toBe(2);
    expect(s.cells[3].planIndex).toBe(2);
    expect(s.cells[2].planIndex).toBeNull();
  });
  it('a missed day gets a pen note', () => {
    expect(weekStrip(days, [], now)!.note).toBe('missed Monday, upper is still open');
    expect(weekStrip(days, [ev('Monday', new Date(2026, 10, 2, 18)), ev('Tuesday', new Date(2026, 10, 3, 18))], now)!.note).toBeNull();
  });
  it('is null for a plan without weekdays; short labels', () => {
    expect(weekStrip([{ day: 'Day 1', focus: 'Push' }], [], now)).toBeNull();
    expect(shortLabel('Full body A')).toBe('Full');
    expect(shortLabel('')).toBe('Session');
  });
});

describe('recap reductions', () => {
  const past = [
    { name: 'Bench press', weightKg: 60, reps: 8, completedAt: new Date(2026, 9, 29, 18, 0).toISOString() },
    { name: 'Bench press', weightKg: 60, reps: 8, completedAt: new Date(2026, 9, 29, 18, 5).toISOString() },
    { name: 'Bench press', weightKg: 57.5, reps: 10, completedAt: new Date(2026, 9, 22, 18, 0).toISOString() },
    { name: 'Bench press', weightKg: 62.5, reps: 5, completedAt: new Date(2026, 9, 15, 18, 0).toISOString() },
  ];
  it('previous volume is the latest earlier day only', () => {
    expect(previousVolume(past)).toBe(960);
    expect(previousVolume([])).toBeNull();
  });
  it('best records keep the heaviest weight and the most reps at it', () => {
    expect(bestRecords(past)).toEqual([{ name: 'Bench press', maxWeightKg: 62.5, repsAtMax: 5 }]);
    expect(bestRecords([...past, { name: 'Bench press', weightKg: 62.5, reps: 6, completedAt: new Date(2026, 9, 8).toISOString() }])[0].repsAtMax).toBe(6);
  });
});
