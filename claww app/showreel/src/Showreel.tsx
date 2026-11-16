import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { Canvas, type CanvasStop } from './design/Canvas';
import { EASE_IN_OUT, tween } from './design/motion';
import { AREA } from './design/tokens';
import { SCENES } from './timeline';
import { Sfx } from './Sfx';
import { DecisionScene, EndScene, HookScene, MealsScene, MontageScene, PlanScene, PlayerScene, RecoveryScene, TrackerScene } from './scenes/scenes';

// CLAWW showreel: 45 s, 1920 x 1080, 30 fps. The edit runs on a 120 BPM grid
// (BEAT = 15 frames) and every scene starts on a beat, so the music can be any
// 120 BPM track laid in DaVinci Resolve with the first downbeat at 0:00.

const STOPS: CanvasStop[] = [
  { at: SCENES.hook.from, key: 'ivory' },
  { at: SCENES.decision.from, key: 'engine' },
  { at: SCENES.plan.from, key: 'workouts' },
  { at: SCENES.recovery.from, key: 'recovery' },
  { at: SCENES.player.from, key: 'workouts' },
  { at: SCENES.meals.from, key: 'nutrition' },
  { at: SCENES.tracker.from, key: 'tracker' },
  { at: SCENES.montage.from, key: 'ivory' },
  { at: SCENES.end.from, key: 'brand' },
];

/** A diagonal color sweep that fully covers the frame exactly on the cut. */
const Wipe: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const left = tween(frame, 0, durationInFrames, -3300, 2200, EASE_IN_OUT);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: -100, bottom: -100, left, width: 3000, background: color, transform: 'skewX(-16deg)' }} />
    </AbsoluteFill>
  );
};

const WIPE = 14; // frames; the cover is complete at the midpoint, which is the cut

export const Showreel: React.FC = () => {
  return (
    <AbsoluteFill>
      <Canvas stops={STOPS} />
      <Sfx />

      <Sequence name="1 Hook" from={SCENES.hook.from} durationInFrames={SCENES.hook.dur}>
        <HookScene />
      </Sequence>
      <Sequence name="2 Decision" from={SCENES.decision.from} durationInFrames={SCENES.decision.dur}>
        <DecisionScene />
      </Sequence>
      <Sequence name="3 Adaptive plan" from={SCENES.plan.from} durationInFrames={SCENES.plan.dur}>
        <PlanScene />
      </Sequence>
      <Sequence name="4 Recovery" from={SCENES.recovery.from} durationInFrames={SCENES.recovery.dur}>
        <RecoveryScene />
      </Sequence>
      <Sequence name="5 One tap" from={SCENES.player.from} durationInFrames={SCENES.player.dur}>
        <PlayerScene />
      </Sequence>
      <Sequence name="6 Indian food" from={SCENES.meals.from} durationInFrames={SCENES.meals.dur}>
        <MealsScene />
      </Sequence>
      <Sequence name="7 Proof" from={SCENES.tracker.from} durationInFrames={SCENES.tracker.dur}>
        <TrackerScene />
      </Sequence>
      <Sequence name="8 Montage" from={SCENES.montage.from} durationInFrames={SCENES.montage.dur}>
        <MontageScene />
      </Sequence>
      <Sequence name="9 End card" from={SCENES.end.from} durationInFrames={SCENES.end.dur}>
        <EndScene />
      </Sequence>

      {/* Wipes, centred on each cut, in the incoming scene's color */}
      <Sequence name="Wipe to plan" from={SCENES.plan.from - WIPE / 2} durationInFrames={WIPE}>
        <Wipe color={AREA.engine} />
      </Sequence>
      <Sequence name="Wipe to recovery" from={SCENES.recovery.from - WIPE / 2} durationInFrames={WIPE}>
        <Wipe color={AREA.recovery} />
      </Sequence>
      <Sequence name="Wipe to player" from={SCENES.player.from - WIPE / 2} durationInFrames={WIPE}>
        <Wipe color={AREA.workouts} />
      </Sequence>
      <Sequence name="Wipe to meals" from={SCENES.meals.from - WIPE / 2} durationInFrames={WIPE}>
        <Wipe color={AREA.nutrition} />
      </Sequence>
      <Sequence name="Wipe to tracker" from={SCENES.tracker.from - WIPE / 2} durationInFrames={WIPE}>
        <Wipe color={AREA.sleep} />
      </Sequence>
      <Sequence name="Wipe to end" from={SCENES.end.from - WIPE / 2} durationInFrames={WIPE}>
        <Wipe color={AREA.brand} />
      </Sequence>
    </AbsoluteFill>
  );
};
