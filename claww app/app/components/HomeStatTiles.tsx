import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AREA_COLORS, FONT, tint } from '../lib/theme';
import { getActivityDays, getProfile, saveStepsGoal } from '../lib/data';
import { DEFAULT_STEPS_GOAL, lastSevenDays, streakStats, type StreakStats } from '../lib/activityMath';
import { estimateCaloriesFromSteps, type StepsResult } from '../lib/steps';
import { Icon } from './ui/Icon';
import { PressScale } from './ui/PressScale';
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
    <View style={{ flex: 1, backgroundColor: '#151517', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Icon name={icon} size={12} color={color} />
        <Text style={{ color, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, fontFamily: FONT }}>{label}</Text>
        {onPress ? <Icon name="chevron-right" size={11} color="#52525B" /> : null}
      </View>
      <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'], fontFamily: FONT }} numberOfLines={1}>
        {value}
      </Text>
      {children}
    </View>
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
  const [week, setWeek] = useState<boolean[]>([false, false, false, false, false, false, false]);
  const [stats, setStats] = useState<StreakStats | null>(null);
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
      getActivityDays(userId).then((days) => {
        if (cancelled) return;
        const now = new Date();
        setWeek(lastSevenDays(days, now));
        setStats(streakStats(days, now));
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

  const pct = steps.available && goal > 0 ? Math.min(100, (steps.steps / goal) * 100) : 0;
  const burned = steps.available ? steps.caloriesBurned ?? estimateCaloriesFromSteps(steps.steps, weightKg) : null;

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
            <Text style={{ color: '#71717A', fontSize: 10, fontFamily: FONT }}>{steps.needsHealthConnectInstall ? 'tap to connect' : 'no data yet'}</Text>
          )}
        </Tile>

        <Tile icon="flame" color={AREA_COLORS.burned} label="BURNED" value={burned !== null ? burned.toLocaleString() : '—'} a11y={`Burned ${burned ?? 'unknown'} kilocalories`}>
          <Text style={{ color: '#71717A', fontSize: 10, fontFamily: FONT }}>
            {burned === null ? 'not tracked yet' : steps.caloriesBurned !== null ? 'kcal active' : 'kcal est.'}
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
            {week.map((on, i) => (
              <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: on ? AREA_COLORS.streak : tint(AREA_COLORS.streak, 0.15) }} />
            ))}
          </View>
        </Tile>
      </View>

      <StepsSheet visible={stepsOpen} onClose={() => setStepsOpen(false)} steps={steps} goal={goal} onGoalChange={changeGoal} weightKg={weightKg} heightCm={heightCm} />
      <StreakSheet visible={streakOpen} onClose={() => setStreakOpen(false)} stats={stats} />
    </>
  );
}
