import React from 'react';
import { Text, View } from 'react-native';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { COLORS, FONT, BG, bg } from '../../lib/theme';
import { useWorkoutSession } from '../../lib/workoutSession';
import { useToast } from '../ui/Toast';

// Premium B3: the × on a live workout never throws it away in one tap. With sets logged the main
// action saves them; discarding is a separate, plainly red choice.
export function EndWorkoutSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { plan, finishNow, closeSession } = useWorkoutSession();
  const toast = useToast();
  const done = plan.reduce((n, ex) => n + ex.rows.filter((r) => r.done).length, 0);

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightFraction={0.5}>
      <View style={{ gap: 8, paddingBottom: 8, paddingHorizontal: 24 }}>
        <Text style={{ color: COLORS.fg, fontSize: 22, fontFamily: BG[800] }}>End workout?</Text>
        <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 21, fontFamily: BG[400], marginBottom: 12 }}>
          {done > 0
            ? `You have logged ${done} ${done === 1 ? 'set' : 'sets'}. Finishing marks today as done and updates your next targets. Closing leaves the logged sets saved but today stays open.`
            : 'Nothing is logged yet.'}
        </Text>
        {done > 0 ? (
          <Button variant="primary" size="lg" fullWidth onPress={() => { onClose(); finishNow(); }}>
            Finish and save
          </Button>
        ) : null}
        <Button variant="ghost" size="lg" fullWidth onPress={onClose}>
          Keep going
        </Button>
        <Button variant="secondary" size="md" fullWidth accent={COLORS.danger} onPress={() => {
          onClose();
          const restore = closeSession();
          toast.show({ message: 'Workout closed', actionLabel: 'Undo', onAction: restore });
        }}>
          Close without finishing
        </Button>
      </View>
    </BottomSheet>
  );
}
