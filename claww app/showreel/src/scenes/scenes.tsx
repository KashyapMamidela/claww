import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { HomeScreen, MealsScreen, PlayerScreen, PrescriptionScreen, RecoveryScreen, RestScreen, TrackerScreen } from '../app/screens';
import { Phone } from '../app/Phone';
import { DISPLAY, UI } from '../design/fonts';
import { countUp, EASE_IN, EASE_IN_OUT, EASE_OUT, pop, settle, tween } from '../design/motion';
import { AREA, AREA_INK, INK, INK_SOFT, rgba } from '../design/tokens';
import { Kicker, RiseWords } from '../design/Type';
import { At, FloatChip, HeroPhone, Push } from './parts';

// Nine scenes, 45 s at 30 fps, every cut on a 120 BPM beat (15 frames).
// Each scene's frame 0 is its own first frame (they sit in <Sequence>s).

/** A slam: big type that lands from slightly bigger and blurred, with a 3-frame shake. */
const Slam: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, children, style }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  const s = tween(t, 0, 7, 1.35, 1, EASE_OUT);
  const blur = tween(t, 0, 6, 16, 0);
  const shake = t >= 6 && t < 10 ? (t % 2 === 0 ? 6 : -6) : 0;
  if (t < 0) return null;
  return <div style={{ scale: String(s), filter: `blur(${blur}px)`, translate: `${shake}px ${-shake / 2}px`, opacity: tween(t, 0, 3, 0, 1), ...style }}>{children}</div>;
};

// ─── 1. Hook (0:00 - 0:03) ──────────────────────────────────────────────────

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Push amount={0.05}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <Slam at={2}>
          <div style={{ fontFamily: DISPLAY, fontSize: 330, lineHeight: 0.9, color: INK, letterSpacing: 2 }}>
            60 KG <span style={{ color: rgba(INK, 0.25) }}>×</span> 10
          </div>
        </Slam>
        <div style={{ height: 30 }} />
        <RiseWords text="Twice." font="serif" size={220} color={AREA_INK.engine} delay={45} style={{ justifyContent: 'center' }} />
      </AbsoluteFill>
      <At x={140} y={960}>
        <div style={{ fontFamily: UI, fontSize: 22, fontWeight: 700, letterSpacing: 4, color: INK_SOFT, opacity: tween(frame, 20, 32, 0, 1) }}>LAST TWO BENCH SESSIONS</div>
      </At>
    </Push>
  );
};

// ─── 2. The decision (0:03 - 0:06) ──────────────────────────────────────────

export const DecisionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pill = pop(frame, fps, 24, 11, 180);
  return (
    <Push amount={0.04}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <Kicker text="SO TODAY" color={AREA_INK.engine} delay={0} size={26} />
        <div style={{ height: 18 }} />
        <div style={{ fontFamily: DISPLAY, fontSize: 380, lineHeight: 0.88, color: INK, fontVariantNumeric: 'tabular-nums', scale: String(tween(frame, 0, 18, 1.12, 1)) }}>
          {countUp(frame, 0, 20, 60, 62.5, 1)}
          <span style={{ fontSize: 160, color: rgba(INK, 0.35) }}> KG</span>
        </div>
        <div style={{ height: 26 }} />
        <div
          style={{
            scale: String(pill),
            opacity: Math.min(1, pill * 2),
            padding: '16px 34px',
            borderRadius: 99,
            background: AREA.engine,
            color: '#fff',
            fontFamily: UI,
            fontWeight: 900,
            fontSize: 34,
            letterSpacing: 4,
            boxShadow: `0 20px 50px ${rgba(AREA.engine, 0.4)}`,
          }}
        >
          WEIGHT UP
        </div>
        <div style={{ height: 34 }} />
        <RiseWords text="CLAWW made the call. You just lift." font="serif" size={64} color={INK_SOFT} delay={40} stagger={2} style={{ justifyContent: 'center' }} />
      </AbsoluteFill>
    </Push>
  );
};

// ─── 3. Adaptive plan (0:06 - 0:13) ─────────────────────────────────────────

export const PlanScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Push>
      <At x={140} y={200} w={900}>
        <Kicker text="ADAPTIVE ENGINE" color={AREA_INK.engine} delay={4} />
        <div style={{ height: 30 }} />
        <RiseWords text="YOUR PLAN" size={170} delay={6} />
        <RiseWords text="REWRITES" size={170} delay={10} color={AREA_INK.workouts} />
        <RiseWords text="ITSELF." size={170} delay={14} color={AREA_INK.workouts} />
        <div style={{ height: 22 }} />
        <RiseWords text="every single session." font="serif" size={88} color={INK_SOFT} delay={30} stagger={3} />
      </At>
      <HeroPhone x={1440} side="right" delay={2}>
        <PrescriptionScreen t={frame - 14} />
      </HeroPhone>
      <FloatChip x={1560} y={720} delay={70} rotate={5}>
        <div style={{ background: '#fff', borderRadius: 22, padding: '18px 24px', boxShadow: '0 24px 60px rgba(40,30,80,0.18)', fontFamily: UI }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 2, color: AREA_INK.engine }}>WHY</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: INK, marginTop: 4 }}>Top of range,</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: INK }}>two sessions running.</div>
        </div>
      </FloatChip>
    </Push>
  );
};

// ─── 4. Recovery (0:13 - 0:19) ──────────────────────────────────────────────

export const RecoveryScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Push>
      <HeroPhone x={500} side="left" delay={2}>
        <RecoveryScreen t={frame - 12} />
      </HeroPhone>
      <At x={930} y={190} w={880}>
        <Kicker text="MUSCLE RECOVERY" color={AREA_INK.recovery} delay={4} />
        <div style={{ height: 30 }} />
        <RiseWords text="IT KNOWS" size={170} delay={6} />
        <RiseWords text="WHAT'S SORE." size={170} delay={12} color={AREA_INK.recovery} />
        <div style={{ height: 20 }} />
        <RiseWords text="muscle by muscle." font="serif" size={84} color={INK_SOFT} delay={30} />
        <div style={{ height: 36 }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 22, opacity: tween(frame, 56, 66, 0, 1) }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 170, color: AREA_INK.recovery, lineHeight: 0.9 }}>{countUp(frame, 56, 90, 0, 65)}</div>
          <div style={{ fontFamily: UI, fontSize: 34, fontWeight: 700, color: INK, lineHeight: 1.25 }}>
            Chest
            <br />
            <span style={{ color: INK_SOFT, fontWeight: 500 }}>Moderate · no progression today</span>
          </div>
        </div>
      </At>
    </Push>
  );
};

// ─── 5. One tap (0:19 - 0:25) ───────────────────────────────────────────────

const DONE_AT = 64;

/** The rest countdown text, matching RestScreen. */
const restLeft = (t: number) => {
  const r = 84 - Math.floor(tween(t, 0, 140, 0, 30, EASE_IN_OUT));
  return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`;
};
const REST_AT = 100;

export const PlayerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const swap = tween(frame, REST_AT, REST_AT + 10, 0, 1, EASE_IN_OUT);
  const ripple = frame - DONE_AT;
  return (
    <Push>
      <At x={140} y={300} w={800}>
        <Kicker text="WORKOUT PLAYER" color={AREA_INK.workouts} delay={4} />
        <div style={{ height: 30 }} />
        <RiseWords text="ONE TAP." size={230} delay={6} />
        <div style={{ height: 6 }} />
        {frame >= DONE_AT - 2 ? (
          <Slam at={DONE_AT}>
            <div style={{ fontFamily: DISPLAY, fontSize: 230, lineHeight: 0.95, color: AREA_INK.workouts }}>DONE.</div>
          </Slam>
        ) : (
          <div style={{ height: 218 }} />
        )}
        <div style={{ height: 30 }} />
        <RiseWords text="Rest starts itself." font="serif" size={88} color={INK_SOFT} delay={REST_AT + 4} />
      </At>
      <HeroPhone x={1420} side="right" delay={2}>
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - swap, translate: `${-swap * 60}px 0` }}>
          <PlayerScreen t={frame - 12} doneAt={DONE_AT - 12} />
        </div>
        {frame >= REST_AT ? (
          <div style={{ position: 'absolute', inset: 0, opacity: swap, translate: `${(1 - swap) * 60}px 0`, background: '#050505' }}>
            <RestScreen t={frame - REST_AT} />
          </div>
        ) : null}
      </HeroPhone>
      {/* tap ripple over the Done button */}
      {ripple >= 0 && ripple < 22 ? (
        <div
          style={{
            position: 'absolute',
            left: 1420 - 60,
            top: 925 - 60,
            width: 120,
            height: 120,
            borderRadius: 99,
            border: `4px solid ${AREA.workouts}`,
            scale: String(0.4 + tween(ripple, 0, 20, 0, 2.2)),
            opacity: tween(ripple, 0, 20, 0.9, 0),
          }}
        />
      ) : null}
      <FloatChip x={1640} y={170} delay={REST_AT + 10} rotate={4}>
        <div style={{ background: '#fff', borderRadius: 22, padding: '16px 22px', boxShadow: '0 24px 60px rgba(30,40,90,0.18)', fontFamily: UI, display: 'flex', alignItems: 'center', gap: 14 }}>
          <Img src={staticFile('claww-icon.png')} style={{ width: 44, height: 44, borderRadius: 12 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: INK_SOFT }}>CLAWW · Rest</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: INK, fontVariantNumeric: 'tabular-nums' }}>{restLeft(frame - REST_AT)} left</div>
          </div>
        </div>
      </FloatChip>
    </Push>
  );
};

// ─── 6. Indian food (0:25 - 0:31) ───────────────────────────────────────────

export const MealsScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Push>
      <HeroPhone x={500} side="left" delay={2}>
        <MealsScreen t={frame - 12} />
      </HeroPhone>
      <At x={930} y={210} w={900}>
        <Kicker text="NUTRITION" color={AREA_INK.nutrition} delay={4} />
        <div style={{ height: 30 }} />
        <RiseWords text="REAL INDIAN" size={165} delay={6} />
        <RiseWords text="FOOD." size={165} delay={12} color={AREA_INK.nutrition} />
        <div style={{ height: 20 }} />
        <RiseWords text="three picks that fit what's left today." font="serif" size={64} color={INK_SOFT} delay={30} stagger={2} />
      </At>
      <FloatChip x={960} y={760} delay={62} rotate={-3}>
        <div style={{ background: '#fff', borderRadius: 24, padding: '20px 26px', boxShadow: '0 30px 70px rgba(20,60,30,0.18)', fontFamily: UI, minWidth: 560 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: INK }}>Paneer besan chilla</div>
            <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 1.5, color: AREA_INK.nutrition, background: rgba(AREA.nutrition, 0.15), padding: '6px 12px', borderRadius: 99 }}>BEST FIT</div>
          </div>
          <div style={{ display: 'flex', gap: 22, marginTop: 10, fontSize: 22, fontWeight: 700, color: INK_SOFT }}>
            <span>{countUp(frame, 64, 90, 0, 520)} kcal</span>
            <span style={{ color: AREA_INK.nutrition }}>{countUp(frame, 64, 90, 0, 34)} g protein</span>
            <span>15 min</span>
          </div>
        </div>
      </FloatChip>
    </Push>
  );
};

// ─── 7. Proof (0:31 - 0:37) ─────────────────────────────────────────────────

export const TrackerScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Push>
      <At x={140} y={260} w={880}>
        <Kicker text="TRACKER" color={AREA_INK.workouts} delay={4} />
        <div style={{ height: 30 }} />
        <RiseWords text="PROOF," size={220} delay={6} />
        <RiseWords text="NOT VIBES." size={220} delay={12} color={AREA_INK.sleep} />
        <div style={{ height: 30 }} />
        <div style={{ display: 'flex', gap: 60, opacity: tween(frame, 44, 56, 0, 1), translate: `0 ${tween(frame, 44, 58, 24, 0)}px` }}>
          {[
            [`+${countUp(frame, 50, 90, 0, 18)}`, 'kg est. 1RM', AREA_INK.workouts],
            [countUp(frame, 54, 94, 0, 31), 'sessions', AREA_INK.workouts],
            [countUp(frame, 58, 98, 0, 96), 'back recovery', AREA_INK.recovery],
          ].map(([v, l, c]) => (
            <div key={l}>
              <div style={{ fontFamily: DISPLAY, fontSize: 120, color: c, lineHeight: 1 }}>{v}</div>
              <div style={{ fontFamily: UI, fontSize: 24, fontWeight: 700, color: INK_SOFT, marginTop: 6 }}>{l}</div>
            </div>
          ))}
        </div>
      </At>
      <HeroPhone x={1440} side="right" delay={2}>
        <TrackerScreen t={frame - 12} />
      </HeroPhone>
    </Push>
  );
};

// ─── 8. Montage (0:37 - 0:41) ───────────────────────────────────────────────

const WORDS: [string, string][] = [
  ['LIFT.', AREA.workouts],
  ['EAT.', AREA.nutrition],
  ['RECOVER.', AREA.recovery],
  ['ADAPT.', AREA.engine],
];

export const MontageScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slide = tween(frame, 0, 120, 160, -160, EASE_IN_OUT);
  const word = Math.min(WORDS.length - 1, Math.floor(frame / 30));
  const local = frame - word * 30;
  const phones: [React.ReactNode, number][] = [
    [<HomeScreen key="h" t={frame} />, 0],
    [<PrescriptionScreen key="p" t={frame - 4} />, 1],
    [<MealsScreen key="m" t={frame - 8} />, 2],
    [<TrackerScreen key="t" t={frame - 12} />, 3],
  ];
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', top: 120, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 70, translate: `${slide}px 0` }}>
        {phones.map(([screen, i]) => {
          const s = settle(frame, fps, i * 3);
          return (
            <div key={i} style={{ opacity: s, translate: `0 ${(1 - s) * 300 + (i % 2 ? 60 : 0)}px`, transform: `perspective(2400px) rotateY(${-10 + i * 7}deg) rotateX(4deg)` }}>
              <Phone scale={0.86} shadow={0.8}>
                {screen}
              </Phone>
            </div>
          );
        })}
      </div>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div
          key={word}
          style={{
            fontFamily: DISPLAY,
            fontSize: 210,
            lineHeight: 1,
            color: '#fff',
            letterSpacing: 4,
            padding: '20px 56px 26px',
            borderRadius: 36,
            background: WORDS[word][1],
            boxShadow: `0 40px 90px ${rgba(WORDS[word][1], 0.45)}`,
            rotate: `${word % 2 ? 3 : -3}deg`,
            scale: String(0.7 + 0.3 * pop(local, fps, 0, 12, 220)),
            opacity: tween(local, 0, 3, 0, 1),
          }}
        >
          {WORDS[word][0]}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── 9. End card (0:41 - 0:45) ──────────────────────────────────────────────

export const EndScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = pop(frame, fps, 4, 12, 150);
  const spin = tween(frame, 4, 30, -120, 0, EASE_OUT);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <Img src={staticFile('claww-mark.png')} style={{ width: 230, scale: String(mark), rotate: `${spin}deg`, filter: 'drop-shadow(0 20px 40px rgba(0,0,40,0.25))' }} />
      <div style={{ height: 36 }} />
      <div style={{ overflow: 'hidden' }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 210, color: '#fff', letterSpacing: tween(frame, 14, 50, 60, 22), lineHeight: 1, translate: `0 ${tween(frame, 14, 30, 110, 0)}%` }}>CLAWW</div>
      </div>
      <div style={{ height: 14 }} />
      <RiseWords text="Lift. Eat. Adapt." font="serif" size={84} color="rgba(255,255,255,0.92)" delay={34} stagger={4} style={{ justifyContent: 'center' }} />
      <div style={{ height: 50 }} />
      <div
        style={{
          fontFamily: UI,
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: 5,
          color: '#fff',
          padding: '16px 34px',
          borderRadius: 99,
          border: '2px solid rgba(255,255,255,0.5)',
          opacity: tween(frame, 60, 72, 0, 1),
          translate: `0 ${tween(frame, 60, 74, 20, 0)}px`,
        }}
      >
        COMING SOON TO ANDROID
      </div>
      <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: tween(frame, 0, 6, 0.5, 0, EASE_IN), pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};
