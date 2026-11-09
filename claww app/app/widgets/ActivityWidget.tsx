import React from 'react';
import { FlexWidget } from 'react-native-android-widget';
import { activityView, sizeClass, staleLabel, type WidgetSnapshot } from '../lib/widgetSnapshot';
import { Bar, Card, Grow, Icon, Pill, Rings, SignedOut, Spacer, T } from './parts';
import { F, W } from './theme';

// Today (activity): Home's three rings, read like Apple's activity widget. The rings carry the shape of the day at a
// glance; beside them each ring is named in its own colour with its number, then steps and the streak along the foot.
// Small: just the rings and the Daily goal. Large: adds the session with a Start button.

const COLOR = { workout: W.workout, food: W.food, recovery: W.recovery } as const;

export function ActivityWidget({ snapshot, width, height, now = new Date() }: { snapshot: WidgetSnapshot; width: number; height: number; now?: Date }) {
  const v = activityView(snapshot);
  if (v.signedOut) return <SignedOut />;
  const size = sizeClass(width, height);
  const rings = v.rows.map((r) => ({ pct: r.pct, color: COLOR[r.key] }));
  const stale = staleLabel(snapshot, now);

  if (size === 'small') {
    const ring = Math.min(width, height) - W.pad * 2 - 22;
    return (
      <Card center>
        <Rings size={ring} rings={rings} stroke={10} gap={3}>
          <T text={v.daily} size={Math.round(ring / 5.2)} font={F.xb} />
        </Rings>
        <Spacer h={8} />
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="footprints" color={W.steps} size={13} />
          <Spacer w={5} />
          <T text={`${v.steps} steps`} size={12} font={F.sb} color={W.muted} />
        </FlexWidget>
      </Card>
    );
  }

  const ring = Math.min(132, Math.max(86, (size === 'large' ? 150 : height) - W.pad * 2 - 4));
  const colW = Math.max(100, width - W.pad * 2 - ring - 16);
  return (
    <Card>
      <FlexWidget style={{ width: 'match_parent', flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        <Rings size={ring} rings={rings} stroke={Math.round(ring / 12)} gap={3}>
          <T text={v.daily} size={Math.round(ring / 5.6)} font={F.xb} />
          <T text="of today" size={10} font={F.m} color={W.faint} />
        </Rings>
        <Spacer w={16} />
        <FlexWidget style={{ flex: 1, height: 'match_parent', flexDirection: 'column', justifyContent: 'space-between' }}>
          {v.rows.map((r) => (
            <FlexWidget key={r.key} style={{ flexDirection: 'column' }}>
              <T text={r.label} size={11} font={F.sb} color={COLOR[r.key]} />
              <T text={r.value} size={15} font={F.b} />
            </FlexWidget>
          ))}
          <FlexWidget style={{ flexDirection: 'column' }}>
            <FlexWidget style={{ width: colW, flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="footprints" color={W.steps} size={13} />
              <Spacer w={5} />
              <T text={v.steps} size={13} font={F.b} />
              <T text={` / ${v.stepsGoal}`} size={12} font={F.m} color={W.faint} />
              <Grow />
              {stale ? (
                <T text={stale} size={11} font={F.m} color={W.faint} />
              ) : (
                <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="flame" color={W.streak} size={13} />
                  <Spacer w={3} />
                  <T text={v.streak} size={13} font={F.b} color={W.streak} />
                </FlexWidget>
              )}
            </FlexWidget>
            <Spacer h={5} />
            <Bar width={colW} pct={v.stepsPct} color={W.steps} />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>

      {size === 'large' ? (
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'column' }}>
          <Spacer h={14} />
          <FlexWidget style={{ width: 'match_parent', borderRadius: 18, backgroundColor: W.well, padding: 12, flexDirection: 'row', alignItems: 'center' }}>
            <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
              <T text={snapshot.session ? (snapshot.sessionDone ? 'Session done' : 'Up next') : 'Today'} size={11} font={F.sb} color={W.workout} />
              <T text={v.rows[0].value} size={15} font={F.b} />
            </FlexWidget>
            {snapshot.session && !snapshot.sessionDone ? (
              <Pill text="Start" bg={W.workout} color="#FFFFFF" click="OPEN_URI" data={{ uri: 'claww:///(tabs)/workouts' }} label="Start today's session" height={34} width={84} />
            ) : null}
          </FlexWidget>
        </FlexWidget>
      ) : null}
    </Card>
  );
}
