import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, AREA_COLORS, FONT, tint } from '../lib/theme';
import { getProfile, getTodayWorkoutStats, saveStepsGoal } from '../lib/data';
import { DEFAULT_STEPS_GOAL } from '../lib/activityMath';
import { burnedKcal, stepsProgress } from '../lib/dayStats';
import type { StepsResult } from '../lib/steps';
import { useAppState } from '../lib/appState';
import { Icon } from './ui/Icon';
import { PressScale } from './ui/PressScale';
import { TintTile } from './ui/TintTile';
import { StepsSheet } from './StepsSheet';
import { StreakSheet } from './StreakSheet';

function Tile({
  icon,
  color,
  label,
  value,
  children,
  onPress,
  a11y,
}: {
  icon: string;
  color: string;
  label: string;
  value: string;
  children: React.ReactNode;
  onPress?: () => void;
  a11y: string;
}) {
  const body = (
    // NG PHASE 1: each tile is a TintTile in its area's colour (glow, tinted border, watermark).
    <TintTile color={color} watermark={icon} padding={11} radius={16} style={{ flex: 1 }}>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Icon name={icon} size={12} color={color} />
          <Text style={{ color, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, fontFamily: FONT }}>{label}</Text>
          {onPress ? <Icon name="chevron-right" size={11} color="#52525B" /> : null}
        </View>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'], fontFamily: FONT }} numberOfLines={1}>
          {value}
        </Text>
        {children}
      </View>
    </TintTile>
  );
  if (!onPress) return <View style={{ flex: 1 }} accessibilityLabel={a11y}>{body}</View>;
  return (
    <PressScale onPress={onPress} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={a11y}>
      {body}
    </PressScale>
  );
}

export interface HomeStatTilesProps {
  userId: string | null;
  steps: StepsResult;
  streak: number;
}

/**
 * V2 PHASE 4.2 — smaller Steps / Burned / Streak tiles, each with a hint of
 * its data. Steps and Streak open elevated detail sheets; Burned doesn't
 * (a phone's burn estimate is rough, and a big chart of it invites distrust).
 */
export function HomeStatTiles({ userId, steps, streak }: HomeStatTilesProps) {
  const [goal, setGoal] = useState(DEFAULT_STEPS_GOAL);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  // Calories of sessions and activities logged today, so Burned counts them (once; see lib/dayStats).
  const [loggedKcal, setLoggedKcal] = useState(0);
  const { streakStats } = useAppState();
  const [stepsOpen, setStepsOpen] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      getProfile(userId).then((p) => {
        if (cancelled) return;
        setGoal(p?.personalization_profile?.stepsGoal ?? DEFAULT_STEPS_GOAL);
        setWeightKg(p?.weight ?? null);
        setHeightCm(p?.height ?? null);
      });
      getProfile(userId).then(async (p) => {
        const stats = await getTodayWorkoutStats(userId, p?.weight ?? null);
        if (!cancelled) setLoggedKcal(stats.calorieBurn);
      });
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  const changeGoal = (g: number) => {
    setGoal(g);
    if (userId) saveStepsGoal(userId, g);
  };

  const pct = stepsProgress(steps.available ? steps.steps : null, goal);
  const burnedResult = burnedKcal({ healthConnectKcal: steps.available ? steps.caloriesBurned : null, steps: steps.available ? steps.steps : null, loggedKcal, weightKg });
  const burned = burnedResult.kcal;
  const week = (streakStats?.grid ?? []).slice(-7).map((d) => d.counts);

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Tile
          icon="footprints"
          color={AREA_COLORS.steps}
          label="STEPS"
          value={steps.available ? steps.steps.toLocaleString() : '—'}
          onPress={() => setStepsOpen(true)}
          a11y={steps.available ? `Steps: ${steps.steps} of ${goal}. Open details.` : 'Steps not connected. Open to connect.'}
        >
          {steps.available ? (
            <View style={{ height: 3, borderRadius: 2, backgroundColor: tint(AREA_COLORS.steps, 0.15), overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${pct}%`, backgroundColor: AREA_COLORS.steps, borderRadius: 2 }} />
            </View>
          ) : (
            <Text style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: FONT }}>{steps.needsHealthConnectInstall ? 'tap to connect' : 'no data yet'}</Text>
          )}
        </Tile>

        <Tile icon="flame" color={AREA_COLORS.burned} label="BURNED" value={burned !== null ? burned.toLocaleString() : '—'} a11y={`Burned ${burned ?? 'unknown'} kilocalories`}>
          <Text style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: FONT }}>
            {burned === null ? 'not tracked yet' : burnedResult.source === 'health-connect' ? 'kcal active' : 'kcal est.'}
          </Text>
        </Tile>

        <Tile
          icon="trending-up"
          color={AREA_COLORS.streak}
          label="STREAK"
          value={`${streak} ${streak === 1 ? 'day' : 'days'}`}
          onPress={() => setStreakOpen(true)}
          a11y={`Streak: ${streak} days. Open details.`}
        >
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {(week.length > 0 ? week : [false, false, false, false, false, false, false]).map((on, i) => (
              <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: on ? AREA_COLORS.streak : tint(AREA_COLORS.streak, 0.15) }} />
            ))}
          </View>
        </Tile>
      </View>

      <StepsSheet visible={stepsOpen} onClose={() => setStepsOpen(false)} steps={steps} goal={goal} onGoalChange={changeGoal} weightKg={weightKg} heightCm={heightCm} />
      <StreakSheet visible={streakOpen} onClose={() => setStreakOpen(false)} stats={streakStats} />
    </>
  );
}
