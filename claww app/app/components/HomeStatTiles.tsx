import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, AREA_COLORS, FONT, tint, BG, bg } from '../lib/theme';
import { getProfile, saveStepsGoal } from '../lib/data';
import { DEFAULT_STEPS_GOAL } from '../lib/activityMath';
import { stepsProgress } from '../lib/dayStats';
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
  // Premium H5: the three tiles are identical in build and height: an icon chip, an uppercase label, the number and a
  // bar on the last line, so nothing sits at a different height or truncates next to its neighbour.
  const body = (
    <TintTile color={color} watermark={icon} padding={12} radius={18} style={{ flex: 1, height: 112 }}>
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: tint(color, 0.2) }}>
            <Icon name={icon} size={13} color={color} />
          </View>
          <Text style={{ color, fontSize: 11, letterSpacing: 0.6, fontFamily: BG[800] }} numberOfLines={1}>{label}</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 20, lineHeight: 24, fontVariant: ['tabular-nums'], fontFamily: BG[800] }} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <View style={{ height: 6, justifyContent: 'center' }}>{children}</View>
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

const Bar = ({ pct, color }: { pct: number; color: string }) => (
  <View style={{ height: 5, borderRadius: 3, backgroundColor: tint(color, 0.16), overflow: 'hidden' }}>
    <View style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color, borderRadius: 3 }} />
  </View>
);

export interface HomeStatTilesProps {
  userId: string | null;
  steps: StepsResult;
  streak: number;
  /** Polish step 4: the Session tile replaces Burned (Burned is now the outer ring). */
  session: { value: string; sub: string; onPress?: () => void; /** 0-100, how much of today's session is done */ pct?: number };
}

/**
 * V2 PHASE 4.2 — smaller Steps / Burned / Streak tiles, each with a hint of
 * its data. Steps and Streak open elevated detail sheets; Burned doesn't
 * (a phone's burn estimate is rough, and a big chart of it invites distrust).
 */
export function HomeStatTiles({ userId, steps, streak, session }: HomeStatTilesProps) {
  const [goal, setGoal] = useState(DEFAULT_STEPS_GOAL);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);
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
          <Bar pct={steps.available ? pct : 0} color={AREA_COLORS.steps} />
        </Tile>

        <Tile
          icon={session.value === 'Rest' ? 'moon' : session.value === 'Done' ? 'check' : 'dumbbell'}
          color={session.value === 'Rest' ? AREA_COLORS.sleep : AREA_COLORS.workouts}
          label="TODAY"
          value={session.value}
          onPress={session.onPress}
          a11y={`Today: ${session.value}, ${session.sub}`}
        >
          <Bar
            pct={session.value === 'Rest' ? 100 : session.value === 'Done' ? 100 : session.pct ?? 0}
            color={session.value === 'Rest' ? AREA_COLORS.sleep : AREA_COLORS.workouts}
          />
        </Tile>

        <Tile
          icon="flame"
          color={AREA_COLORS.streak}
          label="STREAK"
          value={`${streak} ${streak === 1 ? 'day' : 'days'}`}
          onPress={() => setStreakOpen(true)}
          a11y={`Streak: ${streak} days. Open details.`}
        >
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {(week.length > 0 ? week : [false, false, false, false, false, false, false]).map((on, i) => (
              <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: on ? AREA_COLORS.streak : tint(AREA_COLORS.streak, 0.16) }} />
            ))}
          </View>
        </Tile>
      </View>

      <StepsSheet visible={stepsOpen} onClose={() => setStepsOpen(false)} steps={steps} goal={goal} onGoalChange={changeGoal} weightKg={weightKg} heightCm={heightCm} />
      <StreakSheet visible={streakOpen} onClose={() => setStreakOpen(false)} stats={streakStats} />
    </>
  );
}
