import React from 'react';
import { Text, View } from 'react-native';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { COLORS, FONT } from '../../lib/theme';
import { useWorkoutSession } from '../../lib/workoutSession';

// Premium B3: the × on a live workout never throws it away in one tap. With sets logged the main
// action saves them; discarding is a separate, plainly red choice.
export function EndWorkoutSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { plan, finishNow, endSession } = useWorkoutSession();
  const done = plan.reduce((n, ex) => n + ex.rows.filter((r) => r.done).length, 0);

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightFraction={0.5}>
      <View style={{ gap: 8, paddingBottom: 8, paddingHorizontal: 24 }}>
        <Text style={{ color: COLORS.fg, fontSize: 22, fontWeight: '800', fontFamily: FONT }}>End workout?</Text>
        <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 21, fontFamily: FONT, marginBottom: 12 }}>
          {done > 0
            ? `You have logged ${done} ${done === 1 ? 'set' : 'sets'}. Finishing saves them and closes the session.`
            : 'Nothing is logged yet, so there is nothing to save.'}
        </Text>
        {done > 0 ? (
          <Button variant="primary" size="lg" fullWidth onPress={() => { onClose(); finishNow(); }}>
            Finish and save
          </Button>
        ) : null}
        <Button variant="ghost" size="lg" fullWidth onPress={onClose}>
          Keep going
        </Button>
        <Button variant="secondary" size="md" fullWidth accent={COLORS.danger} onPress={() => { onClose(); endSession(); }}>
          {done > 0 ? 'Discard this workout' : 'End without saving'}
        </Button>
      </View>
    </BottomSheet>
  );
}
