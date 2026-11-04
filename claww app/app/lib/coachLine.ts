// NG PHASE 12: the coach line under Home's greeting, built by rules from the day: last night's sleep, what the
// engine changed in today's session, and the protein still to eat. Never generated. Pure.

import type { PlanMark } from './planMarks';

export interface CoachSegment {
  text: string;
  bold?: boolean;
}

export interface CoachInput {
  sleepHours: number | null;
  sessionPlanned: boolean;
  sessionDone: boolean;
  marks: PlanMark[];
  /** Grams of protein left against today's target; null when there is no target. */
  proteinLeftG: number | null;
  /** Local hour, 0 to 23. */
  hour: number;
}

export function sleepText(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

const LOW_SLEEP = 6.5;
const GOOD_SLEEP = 7.5;
const PROTEIN_MENTION_G = 15;

function markSentence(marks: PlanMark[]): string {
  const parts = marks.slice(0, 2).map((m) => {
    const verb = m.kind === 'weight' ? (m.direction === 'down' ? 'holds' : 'goes up') : m.kind === 'sets' ? (m.direction === 'up' ? 'gets an extra set' : 'loses a set') : m.direction === 'up' ? 'gets an extra rep' : 'eases off';
    const plural = /s$/i.test(m.name.trim()) && !/press$/i.test(m.name.trim());
    const fixed = plural ? verb.replace(/^holds$/, 'hold').replace(/^goes up$/, 'go up').replace(/^gets /, 'get ').replace(/^loses /, 'lose ').replace(/^eases off$/, 'ease off') : verb;
    return `${m.name} ${fixed}`;
  });
  return parts.length === 0 ? '' : ` ${parts[0]}${parts[1] ? `, ${parts[1].charAt(0).toLowerCase()}${parts[1].slice(1)}` : ''}.`;
}

export function coachLine(i: CoachInput): CoachSegment[] {
  const out: CoachSegment[] = [];
  if (i.sleepHours === null) {
    out.push({ text: "Log last night's sleep and today's session will fit it." });
  } else if (i.sleepHours < LOW_SLEEP) {
    out.push({ text: `You slept ${sleepText(i.sleepHours)}, so ` }, { text: 'today is a little lighter', bold: true }, { text: '.' });
  } else if (i.sleepHours >= GOOD_SLEEP) {
    out.push({ text: `You slept ${sleepText(i.sleepHours)}, so ` }, { text: 'today is a good day to push', bold: true }, { text: '.' });
  } else {
    out.push({ text: `You slept ${sleepText(i.sleepHours)}, a normal night.` });
  }

  if (i.sessionPlanned && !i.sessionDone && i.marks.length > 0) {
    out.push({ text: markSentence(i.marks) });
  } else if (i.sessionDone) {
    out.push({ text: ' Today\'s session is done.' });
  }

  if (i.proteinLeftG !== null && i.proteinLeftG >= PROTEIN_MENTION_G && (i.hour >= 15 || i.marks.length === 0)) {
    out.push({ text: ` ${Math.round(i.proteinLeftG)} g of protein left today.` });
  }
  return out;
}

export function coachText(segments: CoachSegment[]): string {
  return segments.map((s) => s.text).join('');
}
