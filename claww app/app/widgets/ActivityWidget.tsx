import React from 'react';
import { FlexWidget } from 'react-native-android-widget';
import { activityView, sizeClass, staleLabel, type WidgetSnapshot } from '../lib/widgetSnapshot';
import { ringHole } from '../lib/widgetSvg';
import { GlassCard, Grow, Icon, Pill, Rings, SignedOut, Spacer, T } from './parts';
import { F, GLASS, W } from './theme';

// Rings: Home's three rings with the Daily goal in the middle, each ring named in its own colour with its number.
// Steps have their own widget. Small: rings and the Daily goal only. Large: adds the session with a Start button.

const LABEL = { workout: W.workout, food: W.food, recovery: W.recovery } as const;
const RING = { workout: W.ringWorkout, food: W.ringFood, recovery: W.ringRecovery } as const;
const STROKE = 8;
const GAP = 2.5;

export function ActivityWidget({ snapshot, width, height, now = new Date() }: { snapshot: WidgetSnapshot; width: number; height: number; now?: Date }) {
  const v = activityView(snapshot);
  if (v.signedOut) return <SignedOut width={width} height={height} />;
  const size = sizeClass(width, height);
  const rings = v.rows.map((r) => ({ pct: r.pct, color: RING[r.key] }));
  const stale = staleLabel(snapshot, now);
  const [t1, t2] = GLASS.rings;

  if (size === 'small') {
    const ring = Math.max(60, Math.min(width, height) - W.pad * 2);
    const hole = ringHole(ring, 3, STROKE, GAP);
    return (
      <GlassCard width={width} height={height} tint={t1} tint2={t2} center>
        <Rings size={ring} rings={rings} stroke={STROKE} gap={GAP}>
          <T text={v.daily} size={Math.max(12, Math.round(hole * 0.36))} font={F.xb} />
        </Rings>
      </GlassCard>
    );
  }

  const ring = Math.min(132, Math.max(96, (size === 'large' ? 150 : height) - W.pad * 2 - 6));
  const hole = ringHole(ring, 3, STROKE, GAP);
  return (
    <GlassCard width={width} height={height} tint={t1} tint2={t2}>
      <FlexWidget style={{ width: 'match_parent', flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        <Rings size={ring} rings={rings} stroke={STROKE} gap={GAP}>
          <T text={v.daily} size={Math.max(12, Math.round(hole * 0.36))} font={F.xb} />
          {hole >= 60 ? <T text="of today" size={9} font={F.m} color={W.faint} /> : null}
        </Rings>
        <Spacer w={16} />
        <FlexWidget style={{ flex: 1, height: 'match_parent', flexDirection: 'column', justifyContent: 'space-between' }}>
          <FlexWidget style={{ width: 'match_parent', flex: 1, flexDirection: 'column', justifyContent: 'space-around' }}>
            {v.rows.map((r) => (
              <FlexWidget key={r.key} style={{ flexDirection: 'column' }}>
                <T text={r.label} size={11} font={F.sb} color={LABEL[r.key]} />
                <T text={r.value} size={15} font={F.b} />
              </FlexWidget>
            ))}
          </FlexWidget>
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
            {stale ? (
              <T text={stale} size={11} font={F.m} color={W.faint} />
            ) : (
              <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="flame" color="#FB923C" size={14} />
                <Spacer w={4} />
                <T text={`${v.streak} day streak`} size={12} font={F.sb} color={W.streak} />
              </FlexWidget>
            )}
            <Grow />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>

      {size === 'large' ? (
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'column' }}>
          <Spacer h={14} />
          <FlexWidget style={{ width: 'match_parent', borderRadius: 18, backgroundColor: W.track, padding: 12, flexDirection: 'row', alignItems: 'center' }}>
            <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
              <T text={snapshot.session ? (snapshot.sessionDone ? 'Session done' : 'Up next') : 'Today'} size={11} font={F.sb} color={W.workout} />
              <T text={v.rows[0].value} size={15} font={F.b} />
            </FlexWidget>
            {snapshot.session && !snapshot.sessionDone ? (
              <Pill text="Start" bg="#3B82F6" color="#FFFFFF" click="OPEN_URI" data={{ uri: 'claww:///(tabs)/workouts' }} label="Start today's session" height={34} width={84} />
            ) : null}
          </FlexWidget>
        </FlexWidget>
      ) : null}
    </GlassCard>
  );
}
