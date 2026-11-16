import React from 'react';
import { useVideoConfig } from 'remotion';
import { APP, AREA } from '../design/tokens';
import { countUp, EASE_IN_OUT, EASE_OUT, pop, tween } from '../design/motion';
import { BodyMap, type Muscle } from './BodyMap';
import { Button, Card, Check, Label, Pill, Ring, Screen, Title } from './ui';

// The app screens in the film, rebuilt from the real app (same copy, colors,
// layout and Inter). Every screen takes `t`: frames since it appeared, so a
// scene can start a screen whenever it wants.

const dropIn = (t: number, fps: number, delay: number) => {
  const p = pop(t, fps, delay, 16, 170);
  return { opacity: Math.min(1, p * 1.6), translate: `0 ${(1 - p) * 26}px`, scale: String(0.96 + 0.04 * p) };
};

// ─── Today's prescription (V2 PHASE 7) ──────────────────────────────────────

const RX = [
  { name: 'Barbell Bench Press', pill: 'WEIGHT UP', tone: APP.green, nums: '62.5 kg · 6 reps × 3 sets', reason: 'Top of range two sessions running (60 kg × 10).' },
  { name: 'Overhead Press', pill: 'REPS UP', tone: APP.green, nums: '35 kg · 9 reps × 3 sets', reason: 'Hit 8 on every set last time.' },
  { name: 'Incline DB Press', pill: 'HOLD', tone: APP.gray, nums: '20 kg · 10 reps × 3 sets', reason: 'Chest is Moderate today, so no progression.' },
  { name: 'Tricep Dips', pill: 'SETS DOWN', tone: APP.amber, nums: 'BW · 10 reps × 2 sets', reason: 'Triceps recovery is Low. 3 sets → 2.' },
];

export const PrescriptionScreen: React.FC<{ t: number }> = ({ t }) => {
  const { fps } = useVideoConfig();
  return (
    <Screen>
      <Label color={AREA.workouts}>TODAY · PUSH</Label>
      <div style={dropIn(t, fps, 0)}>
        <Title>Today's prescription</Title>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', ...dropIn(t, fps, 4) }}>
        {[
          ['Chest 65 · Moderate', AREA.recovery],
          ['Shoulders 88', AREA.recovery],
          ['Triceps 44 · Low', AREA.recovery],
        ].map(([s, c]) => (
          <Pill key={s} color={c}>
            {s}
          </Pill>
        ))}
      </div>
      {RX.map((r, i) => (
        <div key={r.name} style={dropIn(t, fps, 10 + i * 6)}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, fontSize: 15.5, fontWeight: 800 }}>{r.name}</div>
              <Pill color={r.tone}>{r.pill}</Pill>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>{r.nums}</div>
            <div style={{ fontSize: 12.5, color: AREA.engine, marginTop: 6, lineHeight: 1.35 }}>{r.reason}</div>
          </Card>
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <div style={dropIn(t, fps, 38)}>
        <Button>Begin Workout</Button>
      </div>
    </Screen>
  );
};

// ─── Muscle recovery (V2 PHASE 7 / 9) ───────────────────────────────────────

const MUSCLES: { m: Muscle; score: number; band: string }[] = [
  { m: 'back', score: 96, band: 'Excellent' },
  { m: 'shoulders', score: 81, band: 'Good' },
  { m: 'chest', score: 65, band: 'Moderate' },
  { m: 'quads', score: 44, band: 'Low' },
];

export const RecoveryScreen: React.FC<{ t: number }> = ({ t }) => {
  const { fps } = useVideoConfig();
  const level: Partial<Record<Muscle, number>> = {};
  const all: [Muscle, number][] = [
    ['back', 0.96], ['shoulders', 0.81], ['chest', 0.65], ['quads', 0.44], ['biceps', 0.9], ['triceps', 0.7], ['hamstrings', 0.85], ['glutes', 0.78], ['calves', 0.92], ['core', 0.88],
  ];
  all.forEach(([m, v], i) => {
    level[m] = v * tween(t, 8 + i * 3, 22 + i * 3, 0, 1);
  });
  return (
    <Screen>
      <Label color={AREA.recovery}>MUSCLE RECOVERY · ESTIMATED</Label>
      <div style={dropIn(t, fps, 0)}>
        <Title>Ready to train?</Title>
      </div>
      <div style={{ alignSelf: 'center', padding: '16px 0', ...dropIn(t, fps, 4) }}>
        <BodyMap level={level} height={300} color={AREA.recovery} />
      </div>
      {MUSCLES.map((x, i) => {
        const fill = tween(t, 18 + i * 5, 40 + i * 5, 0, x.score / 100, EASE_OUT);
        return (
          <div key={x.m} style={{ ...dropIn(t, fps, 14 + i * 5) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14.5, fontWeight: 700 }}>
              <span>{x.m.charAt(0).toUpperCase() + x.m.slice(1)}</span>
              <span style={{ color: AREA.recovery }}>
                {Math.round(fill * 100)} <span style={{ color: APP.gray, fontWeight: 500 }}>{x.band}</span>
              </span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: 'rgba(45,212,191,0.14)', marginTop: 6 }}>
              <div style={{ height: 5, width: `${fill * 100}%`, borderRadius: 3, background: AREA.recovery }} />
            </div>
          </div>
        );
      })}
      <div style={{ flex: 1 }} />
      <div style={dropIn(t, fps, 40)}>
        <Card accent={AREA.engine}>
          <div style={{ fontSize: 10.5, color: AREA.engine, fontWeight: 800, letterSpacing: 0.8 }}>TODAY · PUSH</div>
          <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 6, lineHeight: 1.35 }}>Chest holds at 60 kg. Triceps does one set fewer. Back is ready for more.</div>
        </Card>
      </div>
    </Screen>
  );
};

// ─── Workout player (V2 PHASE 2) ────────────────────────────────────────────

/** `doneAt`: the frame the Done button is pressed (row 1 turns green). */
export const PlayerScreen: React.FC<{ t: number; doneAt: number; rir?: number }> = ({ t, doneAt, rir = 2 }) => {
  const { fps } = useVideoConfig();
  const press = t >= doneAt && t < doneAt + 6;
  const done = t >= doneAt;
  const rows = [
    { set: 1, last: '60×10' },
    { set: 2, last: '60×10' },
    { set: 3, last: '60×10' },
  ];
  return (
    <Screen>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, color: APP.gray, fontWeight: 700 }}>Push · 2 of 4</div>
        <div style={{ fontSize: 16, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>18:{String(42 + Math.floor(t / 30)).padStart(2, '0')}</div>
      </div>
      <div style={dropIn(t, fps, 0)}>
        <Title size={30}>Barbell Bench Press</Title>
        <div style={{ color: AREA.engine, fontSize: 13.5, fontWeight: 600, marginTop: 6 }}>Weight up · 2 sessions at top of range</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr 44px', fontSize: 11, color: APP.grayDim, fontWeight: 800, letterSpacing: 0.8, padding: '6px 6px 0' }}>
        <span>SET</span>
        <span>LAST</span>
        <span>KG</span>
        <span>REPS</span>
        <span />
      </div>
      {rows.map((r, i) => {
        const isDone = i === 0 && done;
        const current = i === (done ? 1 : 0);
        return (
          <div
            key={r.set}
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 1fr 1fr 44px',
              alignItems: 'center',
              padding: '12px 6px',
              borderRadius: 14,
              background: current ? 'rgba(59,130,246,0.10)' : 'transparent',
              border: `1px solid ${current ? 'rgba(59,130,246,0.35)' : 'transparent'}`,
              fontSize: 18,
              fontWeight: 800,
              ...dropIn(t, fps, 6 + i * 4),
            }}
          >
            <span style={{ color: APP.gray }}>{r.set}</span>
            <span style={{ color: APP.grayDim, fontSize: 14, fontWeight: 600 }}>{r.last}</span>
            <span>62.5</span>
            <span>6</span>
            <div style={{ width: 34, height: 34, borderRadius: 17, background: isDone ? APP.green : 'transparent', border: isDone ? 'none' : `1.5px solid ${current ? AREA.workouts : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', scale: String(isDone ? 0.7 + 0.3 * pop(t, fps, doneAt, 10, 220) : 1) }}>
              {isDone ? <Check size={18} /> : null}
            </div>
          </div>
        );
      })}
      <div style={{ fontSize: 12, color: APP.grayDim, marginTop: 4 }}>Reps left in the tank · optional</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {['0', '1', '2', '3+'].map((v, i) => (
          <div key={v} style={{ flex: 1, height: 42, borderRadius: 12, background: i === rir && t >= doneAt - 18 ? AREA.workouts : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
            {v}
          </div>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ background: '#111113', borderRadius: 14, padding: '12px 14px', display: 'flex', gap: 10, fontSize: 13.5, border: `1px solid ${APP.border}` }}>
        <span style={{ color: APP.grayDimmer, fontSize: 10, fontWeight: 800, letterSpacing: 0.7 }}>UP NEXT</span>
        <span style={{ flex: 1, fontWeight: 700 }}>Overhead Press</span>
        <span style={{ color: APP.gray }}>35 × 9</span>
      </div>
      <Button style={{ height: 64, borderRadius: 20, fontSize: 19, scale: press ? '0.96' : '1', filter: press ? 'brightness(1.15)' : undefined }}>
        <Check size={20} color="#fff" /> Done · 6 × 62.5 kg
      </Button>
    </Screen>
  );
};

export const RestScreen: React.FC<{ t: number }> = ({ t }) => {
  const { fps } = useVideoConfig();
  const remaining = 120 - 36 - Math.floor(tween(t, 0, 140, 0, 30, EASE_IN_OUT));
  const pct = remaining / 120;
  return (
    <Screen>
      <div style={{ fontSize: 13, color: APP.gray, fontWeight: 700 }}>Push · 2 of 4</div>
      <div style={{ ...dropIn(t, fps, 0), alignSelf: 'center', marginTop: 30, position: 'relative', width: 250, height: 250 }}>
        <Ring size={250} stroke={14} pct={pct * tween(t, 0, 18, 0, 1)} color={AREA.workouts} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 15, color: APP.gray, fontWeight: 700 }}>Rest</div>
          <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: -2, fontVariantNumeric: 'tabular-nums' }}>
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 14, color: APP.grayDim }}>of 2:00</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 18, ...dropIn(t, fps, 6) }}>
        {['−15 s', 'Skip', '+15 s'].map((x) => (
          <div key={x} style={{ flex: 1, height: 50, borderRadius: 14, background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
            {x}
          </div>
        ))}
      </div>
      <Card style={{ marginTop: 10, ...dropIn(t, fps, 10) }}>
        <div style={{ fontSize: 11, color: APP.grayDim, fontWeight: 800, letterSpacing: 0.8 }}>NEXT · SET 2 OF 3</div>
        <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>62.5 kg × 6</div>
        <div style={{ fontSize: 13, color: APP.gray, marginTop: 4 }}>Set 1: 6 reps, 2 left. On target.</div>
      </Card>
      <Card style={{ display: 'flex', gap: 12, alignItems: 'center', ...dropIn(t, fps, 16) }}>
        <BodyMap level={{ chest: 1, triceps: 0.4, shoulders: 0.4 }} height={74} color={AREA.workouts} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10.5, color: AREA.workouts, fontWeight: 800, letterSpacing: 0.8 }}>CUE 2/3</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4, lineHeight: 1.35 }}>Lower to mid-chest, elbows about 45° from your body.</div>
        </div>
      </Card>
    </Screen>
  );
};

// ─── Meal suggestions (V2 PHASE 5) ──────────────────────────────────────────

const MEALS = [
  { name: 'Paneer besan chilla, mint chutney', kcal: 520, p: 34, c: 48, f: 20, min: 15, best: true, why: 'Covers a quarter of today’s protein.' },
  { name: 'Ragi dosa with sambar', kcal: 460, p: 18, c: 70, f: 11, min: 20, best: false, why: '460 kcal leaves 1,680 for the rest of the day.' },
  { name: 'Greek yogurt, oats, banana', kcal: 430, p: 27, c: 60, f: 8, min: 5, best: false, why: 'Quickest option, 27 g protein.' },
];

export const MealsScreen: React.FC<{ t: number }> = ({ t }) => {
  const { fps } = useVideoConfig();
  return (
    <Screen>
      <Label color={AREA.nutrition}>SUGGEST BREAKFAST</Label>
      <div style={dropIn(t, fps, 0)}>
        <Card>
          <div style={{ fontSize: 10.5, color: APP.grayDim, fontWeight: 800, letterSpacing: 0.8 }}>LEFT TODAY</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {[
              [countUp(t, 2, 26, 0, 2140), 'KCAL'],
              [`${countUp(t, 2, 26, 0, 128)} g`, 'PROTEIN'],
              [`${countUp(t, 2, 26, 0, 240)} g`, 'CARBS'],
              [`${countUp(t, 2, 26, 0, 62)} g`, 'FAT'],
            ].map(([v, l]) => (
              <div key={l} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                <div style={{ fontSize: 9, color: APP.grayDim, fontWeight: 800, letterSpacing: 0.5 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {['vegetarian', 'South Indian', 'no mushrooms'].map((x) => (
              <Pill key={x} color={AREA.nutrition}>
                {x}
              </Pill>
            ))}
          </div>
        </Card>
      </div>
      {MEALS.map((m, i) => (
        <div key={m.name} style={dropIn(t, fps, 10 + i * 7)}>
          <Card accent={m.best ? AREA.nutrition : undefined}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, fontSize: 15, fontWeight: 800, lineHeight: 1.25 }}>{m.name}</div>
              {m.best ? <Pill color={AREA.nutrition}>BEST FIT</Pill> : <span style={{ fontSize: 12, color: APP.grayDim }}>{m.min} min</span>}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 13, fontWeight: 700 }}>
              <span>{m.kcal} kcal</span>
              <span style={{ color: AREA.nutrition }}>{m.p} g P</span>
              <span style={{ color: APP.gray }}>{m.c} g C</span>
              <span style={{ color: APP.gray }}>{m.f} g F</span>
            </div>
            <div style={{ fontSize: 12, color: APP.gray, marginTop: 6 }}>{m.why}</div>
          </Card>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, ...dropIn(t, fps, 34) }}>
        {['More protein', 'Quicker', 'Something else'].map((x) => (
          <div key={x} style={{ padding: '8px 12px', borderRadius: 99, border: `1px solid ${APP.borderStrong}`, fontSize: 12.5, fontWeight: 600, color: '#D4D4D8' }}>
            {x}
          </div>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={dropIn(t, fps, 40)}>
        <Button color={AREA.nutrition} style={{ color: '#050505' }}>
          Log paneer chilla
        </Button>
      </div>
    </Screen>
  );
};

// ─── Tracker (V2 PHASE 9) ───────────────────────────────────────────────────

const LINE = [58, 60, 61, 61, 64, 66, 70, 76];

export const TrackerScreen: React.FC<{ t: number }> = ({ t }) => {
  const { fps } = useVideoConfig();
  const w = 322;
  const h = 120;
  const pts = LINE.map((v, i) => [8 + (i / (LINE.length - 1)) * (w - 16), h - 8 - ((v - 55) / 25) * (h - 16)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const draw = tween(t, 8, 44, 0, 1, EASE_IN_OUT);
  const gridOn = Math.floor(tween(t, 20, 70, 0, 84, EASE_OUT));
  const pattern = (i: number) => [0, 2, 4].includes(i % 7) && (i * 37) % 11 !== 3;
  return (
    <Screen>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 10, color: APP.grayDimmer, fontWeight: 800, letterSpacing: 1.1 }}>OCT · PERFORMANCE</div>
          <Title size={26}>CLAWW Tracker</Title>
        </div>
        <div style={{ position: 'relative', width: 64, height: 64 }}>
          <Ring size={64} stroke={6} pct={0.64 * tween(t, 0, 30, 0, 1)} color="#fff" />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 15 }}>{countUp(t, 0, 30, 0, 640)}</div>
        </div>
      </div>
      <div style={dropIn(t, fps, 2)}>
        <Card>
          <div style={{ fontSize: 10, color: AREA.workouts, fontWeight: 800, letterSpacing: 0.9 }}>STRENGTH · EST. 1-REP MAX</div>
          <div style={{ fontSize: 16, fontWeight: 800, marginTop: 6 }}>
            Bench Press {countUp(t, 8, 44, 58, 76)} kg <span style={{ color: APP.grayDim, fontSize: 12, fontWeight: 500 }}>+18 kg over 8 weeks</span>
          </div>
          <svg width={w} height={h} style={{ marginTop: 6 }}>
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1={0} x2={w} y1={h * f} y2={h * f} stroke="rgba(255,255,255,0.06)" />
            ))}
            <path d={d} fill="none" stroke={AREA.workouts} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
            {pts.map((p, i) => (i / (pts.length - 1) <= draw + 0.001 ? <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 5 : 3} fill={AREA.workouts} /> : null))}
          </svg>
        </Card>
      </div>
      <div style={dropIn(t, fps, 10)}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, color: AREA.workouts, fontWeight: 800, letterSpacing: 0.9 }}>CONSISTENCY · 12 WEEKS</span>
            <span style={{ fontSize: 11, color: APP.grayDim }}>{countUp(t, 20, 70, 0, 31)} sessions</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridAutoFlow: 'column', gridTemplateRows: 'repeat(7, 1fr)', gap: 4, marginTop: 10 }}>
            {Array.from({ length: 84 }, (_, i) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: 4, background: i < gridOn && pattern(i) ? AREA.workouts : 'rgba(59,130,246,0.12)' }} />
            ))}
          </div>
        </Card>
      </div>
      <div style={dropIn(t, fps, 18)}>
        <Card>
          <div style={{ fontSize: 10, color: AREA.workouts, fontWeight: 800, letterSpacing: 0.9 }}>PERSONAL RECORDS</div>
          {[
            ['Bench Press', '65 kg × 6', '3 Oct'],
            ['Back Squat', '90 kg × 5', '30 Sep'],
            ['Pull-Up', 'BW × 9', '7 Oct'],
          ].map(([a, b, c]) => (
            <div key={a} style={{ display: 'flex', marginTop: 8, fontSize: 13.5 }}>
              <span style={{ flex: 1, fontWeight: 700 }}>{a}</span>
              <span style={{ color: AREA.workouts, fontWeight: 700 }}>{b}</span>
              <span style={{ color: APP.grayDim, marginLeft: 8, width: 46, textAlign: 'right' }}>{c}</span>
            </div>
          ))}
        </Card>
      </div>
    </Screen>
  );
};

// ─── Home (V2 PHASE 1 / 4) ──────────────────────────────────────────────────

export const HomeScreen: React.FC<{ t: number }> = ({ t }) => {
  const { fps } = useVideoConfig();
  const k = tween(t, 0, 36, 0, 1, EASE_OUT);
  return (
    <Screen>
      <Label color={AREA.nutrition}>TODAY</Label>
      <div style={dropIn(t, fps, 0)}>
        <Title size={30}>
          Good evening,
          <br />
          Kashyap.
        </Title>
        <div style={{ fontSize: 13, color: APP.grayDim, marginTop: 8 }}>
          Recovery score <span style={{ color: APP.green, fontWeight: 700 }}>72 · High</span>. Chest is still recovering.
        </div>
      </div>
      <div style={dropIn(t, fps, 6)}>
        <Card style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 120, height: 120 }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <Ring size={120} stroke={9} pct={0.72 * k} color={AREA.recovery} />
            </div>
            <div style={{ position: 'absolute', inset: 14 }}>
              <Ring size={92} stroke={8} pct={0.9 * k} color={AREA.sleep} />
            </div>
            <div style={{ position: 'absolute', inset: 27 }}>
              <Ring size={66} stroke={8} pct={0.7 * k} color={AREA.nutrition} />
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            {[
              ['Recovery', '72', AREA.recovery],
              ['Sleep', '7.2 / 8 h', AREA.sleep],
              ['Nutrition', '70%', AREA.nutrition],
            ].map(([a, b, c]) => (
              <div key={a} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: c, fontWeight: 700 }}>{a}</span>
                <span style={{ fontWeight: 800 }}>{b}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div style={{ display: 'flex', gap: 8, ...dropIn(t, fps, 10) }}>
        {[
          ['STEPS', '6,482', AREA.steps],
          ['BURNED', '412', AREA.burned],
          ['STREAK', '5 days', '#F472B6'],
        ].map(([a, b, c]) => (
          <Card key={a} style={{ flex: 1, padding: '10px 12px' }}>
            <div style={{ fontSize: 9.5, color: c, fontWeight: 800, letterSpacing: 0.5 }}>{a}</div>
            <div style={{ fontSize: 17, fontWeight: 800, marginTop: 4 }}>{b}</div>
          </Card>
        ))}
      </div>
      <div style={dropIn(t, fps, 14)}>
        <Card style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
          <span style={{ color: '#38BDF8', fontWeight: 800 }}>1.25 L</span>
          <span style={{ color: APP.grayDim, fontSize: 12 }}>/ 2 L</span>
          <div style={{ flex: 1, display: 'flex', gap: 3 }}>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < Math.round(5 * k) ? '#38BDF8' : 'rgba(56,189,248,0.15)' }} />
            ))}
          </div>
        </Card>
      </div>
      <div style={dropIn(t, fps, 18)}>
        <Card style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
          <span style={{ fontWeight: 800 }}>7.2 h</span>
          <span style={{ color: APP.green, fontSize: 12, fontWeight: 700 }}>Good</span>
          <span style={{ color: APP.grayDim, fontSize: 12 }}>23:48 – 07:00</span>
          <div style={{ flex: 1, display: 'flex', gap: 3, alignItems: 'flex-end', justifyContent: 'flex-end', height: 26 }}>
            {[6.5, 7, 5.8, 7.4, 8, 6.9, 7.2].map((v, i) => (
              <div key={i} style={{ width: 6, height: (v / 8) * 26 * k, borderRadius: 2, background: i === 6 ? AREA.sleep : 'rgba(129,140,248,0.5)' }} />
            ))}
          </div>
        </Card>
      </div>
      <div style={dropIn(t, fps, 22)}>
        <Card style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', border: 'none' }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.8, opacity: 0.85 }}>YOUR PLAN · THURSDAY · DAY 3 OF 4</div>
          <div style={{ fontSize: 20, fontWeight: 900, marginTop: 6 }}>Push · Chest, Shoulders</div>
          <div style={{ fontSize: 12.5, marginTop: 4, opacity: 0.85 }}>5 exercises · about 45 min</div>
        </Card>
      </div>
    </Screen>
  );
};
