import React from 'react';
import { View } from 'react-native';
import { activeFor, type PenMark as Stored } from '../../lib/engine';
import { dateKey } from '../../lib/planStreak';
import { PenMark } from '../ui/PenMark';

// NG PHASE 11.4: the active nutrition mark for one of today's meals, drawn on its card (screen 14). Keep leaves the
// change, "Use my old plan" puts the old meal back.

export function SlotPenMark({ marks, slot, onDecide }: { marks: Stored[]; slot: string; onDecide: (m: Stored, s: 'kept' | 'undone') => void }) {
  const m = activeFor(marks, dateKey(new Date())).find((x) => x.area === 'nutrition' && x.target.meal === slot);
  if (!m) return null;
  return (
    <View style={{ marginTop: 4 }}>
      <PenMark
        area="nutrition"
        item={slot.charAt(0).toUpperCase() + slot.slice(1)}
        oldValue={m.oldValue}
        newValue={m.newValue}
        note={m.note}
        reason={m.reason}
        onKeep={() => onDecide(m, 'kept')}
        onUseOld={() => onDecide(m, 'undone')}
      />
    </View>
  );
}
