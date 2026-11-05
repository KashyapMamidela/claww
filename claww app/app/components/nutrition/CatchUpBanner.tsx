import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONT } from '../../lib/theme';
import { useAppState } from '../../lib/appState';
import { catchUpSlots, momentFor } from '../../lib/dayMoments';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Surface } from '../ui/Surface';

// NG PHASE 10: from 19:30, with breakfast or lunch unanswered, Home and Nutrition offer the quick catch-up (screen 15).
// From 21:30 it also covers dinner and reads as closing the day. Renders nothing the rest of the day.

export function CatchUpBanner() {
  const router = useRouter();
  const { meals } = useAppState();
  const now = new Date();
  const types = meals.map((m) => m.meal_type);
  const moment = momentFor({ hour: now.getHours(), minute: now.getMinutes(), answeredTypes: types });
  if (moment !== 'catch_up' && moment !== 'night_close') return null;
  const n = catchUpSlots(types, now.getHours(), now.getMinutes()).length;
  if (n === 0) return null;
  const closing = moment === 'night_close';
  return (
    <Surface padding={14}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.fg, fontSize: 16, fontWeight: '800', fontFamily: FONT }}>{closing ? 'Close your day in 10 seconds' : 'Quick catch-up'}</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 18, fontFamily: FONT }}>{n === 1 ? 'One meal is not logged.' : `${n} meals are not logged.`} A rough answer is enough.</Text>
        </View>
        <Button variant="primary" accent={COLORS.green} accentDeep={COLORS.greenDeep} size="md" onPress={() => router.push('/catch-up')} icon={<Icon name="check" size={14} color="#fff" />}>
          Catch up
        </Button>
      </View>
    </Surface>
  );
}
