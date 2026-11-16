import React from 'react';
import { Audio } from '@remotion/media';
import { Sequence, staticFile } from 'remotion';
import { SCENES } from './timeline';

// First-pass sound design, every cue tied to the frame of the animation it
// belongs to. Sources: Kenney sound packs (CC0, see public/sfx/KENNEY-LICENSE.txt)
// and our own synthesized whooshes, swell, sub boom and riser
// (scripts/synth_sfx.py). Rendered to its own WAV so it can be rebalanced or
// replaced in DaVinci Resolve.

const sfx = (name: string) => staticFile(`sfx/${name}.wav`);

/** Master level for the whole layer: peaks sit around -6 dBFS, leaving room for voice and music. */
const MASTER = 0.6;

/** One sound at a global frame. */
const Cue: React.FC<{ at: number; name: string; volume?: number; rate?: number; label: string }> = ({ at, name, volume = 1, rate = 1, label }) => (
  <Sequence name={label} from={Math.max(0, Math.round(at))} durationInFrames={90} layout="none">
    <Audio src={sfx(name)} volume={volume * MASTER} playbackRate={rate} />
  </Sequence>
);

/** Fast ticks while a number counts up. */
const Ticks: React.FC<{ from: number; to: number; every: number; volume: number; label: string }> = ({ from, to, every, volume, label }) => (
  <>
    {Array.from({ length: Math.floor((to - from) / every) + 1 }, (_, i) => (
      <Cue key={i} at={from + i * every} name={i % 2 ? 'tick_002' : 'tick_001'} volume={volume * (0.75 + 0.25 * (i / Math.max(1, (to - from) / every)))} label={`${label} ${i + 1}`} />
    ))}
  </>
);

/** The whoosh peaks about 9 frames in, so it starts 9 frames before the cut it sits on. */
const WHOOSH_PEAK = 9;

export const Sfx: React.FC = () => {
  const { hook, decision, plan, recovery, player, meals, tracker, montage, end } = SCENES;
  return (
    <>
      {/* 1. Hook: plate-and-sub slam, then a swell into "Twice." */}
      <Cue label="Hook slam sub" at={hook.from + 2} name="sub" volume={0.75} />
      <Cue label="Hook slam plate" at={hook.from + 2} name="impactPlate_heavy_000" volume={0.6} />
      <Cue label="Swell into Twice" at={hook.from + 27} name="swell" volume={0.4} />
      <Cue label="Twice lands" at={hook.from + 45} name="glass_002" volume={0.35} />

      {/* 2. Decision: counter ticks 60 -> 62.5, then the pill pops */}
      <Ticks label="62.5 count" from={decision.from} to={decision.from + 20} every={2} volume={0.35} />
      <Cue label="Weight up pop" at={decision.from + 24} name="pluck_001" volume={0.7} />
      <Cue label="Weight up chime" at={decision.from + 25} name="confirmation_001" volume={0.45} />

      {/* Wipes */}
      <Cue label="Whoosh to plan" at={plan.from - WHOOSH_PEAK} name="whoosh" volume={0.55} />
      <Cue label="Whoosh to recovery" at={recovery.from - WHOOSH_PEAK} name="whoosh" volume={0.55} rate={1.05} />
      <Cue label="Whoosh to player" at={player.from - WHOOSH_PEAK} name="whoosh" volume={0.55} rate={0.95} />
      <Cue label="Whoosh to meals" at={meals.from - WHOOSH_PEAK} name="whoosh" volume={0.55} rate={1.08} />
      <Cue label="Whoosh to tracker" at={tracker.from - WHOOSH_PEAK} name="whoosh" volume={0.55} />
      <Cue label="Big whoosh to end" at={end.from - 23} name="whoosh_big" volume={0.6} />

      {/* 3. Plan: four prescription cards drop, the WHY card floats in */}
      <Cue label="Card 1" at={plan.from + 24} name="tick_002" volume={0.45} />
      <Cue label="Card 2" at={plan.from + 30} name="tick_002" volume={0.45} rate={1.05} />
      <Cue label="Card 3" at={plan.from + 36} name="tick_002" volume={0.45} rate={1.1} />
      <Cue label="Card 4" at={plan.from + 42} name="tick_002" volume={0.45} rate={1.15} />
      <Cue label="WHY card" at={plan.from + 70} name="drop_002" volume={0.5} />

      {/* 4. Recovery: the body map lights up, the score counts */}
      <Cue label="Map glow 1" at={recovery.from + 20} name="glass_002" volume={0.35} />
      <Cue label="Map glow 2" at={recovery.from + 27} name="glass_002" volume={0.3} rate={1.12} />
      <Cue label="Map glow 3" at={recovery.from + 34} name="glass_002" volume={0.28} rate={1.25} />
      <Ticks label="Score 65 count" from={recovery.from + 56} to={recovery.from + 89} every={3} volume={0.25} />

      {/* 5. Player: the Done tap + DONE. slam, rest screen, notification */}
      <Cue label="Done tap" at={player.from + 64} name="click_002" volume={0.7} />
      <Cue label="Done select" at={player.from + 64} name="select_002" volume={0.45} />
      <Cue label="DONE slam plate" at={player.from + 64} name="impactPlate_heavy_001" volume={0.55} />
      <Cue label="DONE slam sub" at={player.from + 64} name="sub" volume={0.45} />
      <Cue label="Rest screen" at={player.from + 100} name="drop_002" volume={0.4} />
      <Cue label="Rest notification" at={player.from + 110} name="confirmation_001" volume={0.5} />

      {/* 6. Food: three cards, then the best-fit card */}
      <Cue label="Meal 1" at={meals.from + 22} name="tick_002" volume={0.45} />
      <Cue label="Meal 2" at={meals.from + 29} name="tick_002" volume={0.45} rate={1.06} />
      <Cue label="Meal 3" at={meals.from + 36} name="tick_002" volume={0.45} rate={1.12} />
      <Cue label="Best fit card" at={meals.from + 62} name="pluck_001" volume={0.6} />
      <Cue label="Best fit sparkle" at={meals.from + 63} name="glass_002" volume={0.35} />
      <Ticks label="kcal count" from={meals.from + 64} to={meals.from + 89} every={3} volume={0.2} />

      {/* 7. Tracker: riser with the strength line, counters */}
      <Cue label="Strength riser" at={tracker.from + 20} name="riser" volume={0.32} />
      <Ticks label="Stats count" from={tracker.from + 50} to={tracker.from + 92} every={3} volume={0.22} />

      {/* 8. Montage: a plate hit per word, each a little higher */}
      <Cue label="LIFT" at={montage.from} name="impactPlate_heavy_000" volume={0.75} />
      <Cue label="LIFT sub" at={montage.from} name="sub" volume={0.4} />
      <Cue label="EAT" at={montage.from + 30} name="impactPlate_heavy_001" volume={0.75} rate={1.06} />
      <Cue label="RECOVER" at={montage.from + 60} name="impactPlate_heavy_002" volume={0.75} rate={1.12} />
      <Cue label="ADAPT" at={montage.from + 90} name="impactPlate_heavy_003" volume={0.8} rate={1.18} />
      <Cue label="ADAPT sub" at={montage.from + 90} name="sub" volume={0.45} />

      {/* 9. End card: the logo lands, then the tagline */}
      <Cue label="Logo lands sub" at={end.from + 6} name="sub" volume={0.7} />
      <Cue label="Logo shimmer" at={end.from + 4} name="glass_002" volume={0.4} />
      <Cue label="Tagline" at={end.from + 34} name="confirmation_001" volume={0.4} rate={0.9} />
    </>
  );
};
