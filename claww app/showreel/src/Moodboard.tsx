import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { HomeScreen, PrescriptionScreen } from './app/screens';
import { Phone } from './app/Phone';
import { DISPLAY, SERIF, UI } from './design/fonts';
import { AREA, CANVAS, INK, INK_SOFT, IVORY } from './design/tokens';

// One-page moodboard for the CLAWW ad: palette, type, motion rules and the
// product look, rendered from the same tokens and components as the film.

const Swatch: React.FC<{ color: string; name: string; note: string; dark?: boolean }> = ({ color, name, note, dark }) => (
  <div style={{ width: 150 }}>
    <div style={{ height: 96, borderRadius: 18, background: color, boxShadow: dark ? 'none' : 'inset 0 0 0 1px rgba(0,0,0,0.06)' }} />
    <div style={{ fontFamily: UI, fontSize: 16, fontWeight: 800, color: INK, marginTop: 10 }}>{name}</div>
    <div style={{ fontFamily: UI, fontSize: 13, color: INK_SOFT, marginTop: 2 }}>{note}</div>
  </div>
);

export const Moodboard: React.FC = () => (
  <AbsoluteFill style={{ background: IVORY, padding: 80, fontFamily: UI }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 5, color: INK_SOFT }}>CLAWW · SHOWREEL MOODBOARD</div>
        <div style={{ fontFamily: DISPLAY, fontSize: 118, color: INK, lineHeight: 0.95, marginTop: 12 }}>
          LIGHT CANVAS.
          <br />
          <span style={{ color: AREA.brand }}>DARK PRODUCT.</span>
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 48, color: INK_SOFT, marginTop: 4 }}>numbers are the hero, color means an area.</div>
      </div>
      <Img src={staticFile('claww-icon.png')} style={{ width: 150, height: 150, borderRadius: 36 }} />
    </div>

    <div style={{ display: 'flex', gap: 20, marginTop: 34 }}>
      <Swatch color={CANVAS.ivory.base} name="Ivory" note="hook, montage" />
      <Swatch color={CANVAS.engine.base} name="Lilac" note="the decision" />
      <Swatch color={CANVAS.workouts.base} name="Ice blue" note="plan, player" />
      <Swatch color={CANVAS.recovery.base} name="Mint" note="recovery" />
      <Swatch color={CANVAS.nutrition.base} name="Sage" note="food" />
      <Swatch color={AREA.engine} name="Engine" note="decisions, why" dark />
      <Swatch color={AREA.brand} name="CLAWW blue" note="end card" dark />
      <Swatch color={INK} name="Ink" note="all display type" dark />
    </div>

    <div style={{ display: 'flex', gap: 50, marginTop: 40, alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 4, color: INK_SOFT }}>TYPE</div>
        <div style={{ fontFamily: DISPLAY, fontSize: 96, color: INK, lineHeight: 1, marginTop: 8 }}>60 KG × 10</div>
        <div style={{ fontSize: 15, color: INK_SOFT }}>Anton · tall condensed · slams, numbers, headlines</div>
        <div style={{ fontFamily: SERIF, fontSize: 58, color: INK, marginTop: 12 }}>every single session.</div>
        <div style={{ fontSize: 15, color: INK_SOFT }}>Instrument Serif italic · the soft counterpoint line</div>
        <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: -1, color: INK, marginTop: 12 }}>Today's prescription</div>
        <div style={{ fontSize: 15, color: INK_SOFT }}>Inter · the app's own font, every app screen</div>
      </div>
      <div style={{ width: 500 }}>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 4, color: INK_SOFT }}>MOTION RULES</div>
        {[
          'Cuts on a 120 BPM grid: one beat = 15 frames.',
          'Type rises out of a mask, word by word.',
          'Numbers slam in: 135% to 100%, blur to sharp, 3-frame shake.',
          'Phones rise with a 3D tilt that settles, then breathe.',
          'Diagonal wipe in the next area color, covering on the cut.',
          'Background crossfades with the scene, live grain on top.',
          'Ease-out for entries, ease-in for exits, never linear.',
        ].map((r) => (
          <div key={r} style={{ fontSize: 19, color: INK, marginTop: 10, lineHeight: 1.3 }}>
            {r}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 24, marginTop: -100 }}>
        <div style={{ transform: 'perspective(2000px) rotateY(10deg) rotateX(4deg)' }}>
          <Phone scale={0.54}>
            <HomeScreen t={200} />
          </Phone>
        </div>
        <div style={{ transform: 'perspective(2000px) rotateY(-10deg) rotateX(4deg)', marginTop: 60 }}>
          <Phone scale={0.54}>
            <PrescriptionScreen t={200} />
          </Phone>
        </div>
      </div>
    </div>
  </AbsoluteFill>
);
