import React from 'react';
import { Text, View } from 'react-native';
import { COLORS, FONT } from '../../lib/theme';
import { useWorkoutSession } from '../../lib/workoutSession';
import { PressScale } from '../ui/PressScale';
import { RestCountdown } from './clocks';

/** Rest strip shown above the set rows while resting. */
export function RestPanel() {
  const { clock, skipRest, lastCompletedSet } = useWorkoutSession();
  if (!clock) return null;
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: 'rgba(245,158,11,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.3)',
      }}
    >
      <View style={{ flex: 1 }}>
        <RestCountdown clock={clock} prefix="Rest " style={{ color: COLORS.amber, fontSize: 18, fontWeight: '900', fontFamily: FONT }} />
        {lastCompletedSet ? (
          <Text style={{ color: '#A1A1AA', fontSize: 11.5, fontFamily: FONT }}>
            Set {lastCompletedSet.setNumber}/{lastCompletedSet.totalSets} logged
          </Text>
        ) : null}
      </View>
      <PressScale onPress={skipRest} accessibilityRole="button" accessibilityLabel="Skip rest">
        <View style={{ paddingHorizontal: 16, height: 40, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.22)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: COLORS.amber, fontSize: 13, fontWeight: '800', fontFamily: FONT }}>Skip</Text>
        </View>
      </PressScale>
    </View>
  );
}
