import { BEAT } from './design/tokens';

// The edit on a 120 BPM grid (BEAT = 15 frames at 30 fps). Every scene starts
// on a beat; the picture (Showreel.tsx) and the sound (Sfx.tsx) both read this.

export const SCENES = {
  hook: { from: 0, dur: 6 * BEAT },
  decision: { from: 6 * BEAT, dur: 6 * BEAT },
  plan: { from: 12 * BEAT, dur: 14 * BEAT },
  recovery: { from: 26 * BEAT, dur: 12 * BEAT },
  player: { from: 38 * BEAT, dur: 12 * BEAT },
  meals: { from: 50 * BEAT, dur: 12 * BEAT },
  tracker: { from: 62 * BEAT, dur: 12 * BEAT },
  montage: { from: 74 * BEAT, dur: 8 * BEAT },
  end: { from: 82 * BEAT, dur: 8 * BEAT },
} as const;

export const SHOWREEL_FRAMES = 90 * BEAT; // 1350 = 45 s
