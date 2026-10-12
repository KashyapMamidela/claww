import React, { useState } from 'react';
import { Modal, Pressable, Switch, Text, View } from 'react-native';
import { COLORS, FONT } from '../lib/theme';
import { REMINDER_KINDS, type ReminderKind, type ReminderSetting, type ReminderSettings } from '../lib/reminderPlan';
import { Icon } from './ui/Icon';
import { PressScale } from './ui/PressScale';
import { TimeWheelPicker, dateToTimeValue, timeValueToDate, type TimeValue } from './ui/TimeWheelPicker';

const ROWS: Record<ReminderKind, { label: string; icon: string; note: string; color: string }> = {
  workout: { label: 'Workout', icon: 'dumbbell', note: "Names today's session · skipped once you've trained", color: COLORS.blue },
  meals: { label: 'Meals', icon: 'utensils', note: 'Only if that meal isn’t logged yet', color: COLORS.green },
  sleep: { label: 'Sleep log', icon: 'moon', note: "Morning, only if last night isn't logged", color: COLORS.indigo },
  water: { label: 'Water', icon: 'droplets', note: 'Only if you’re under today’s target', color: COLORS.water },
};

function formatTime(s: ReminderSetting): string {
  const d = new Date();
  d.setHours(s.hour, s.minute, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export interface ReminderSettingsCardProps {
  settings: ReminderSettings;
  disabled?: boolean;
  onChange: (next: ReminderSettings) => void;
}

/** Per-type reminder switches and times (V2 PHASE 3.3). At most 2 reminders fire a day, whatever is switched on. */
export function ReminderSettingsCard({ settings, disabled, onChange }: ReminderSettingsCardProps) {
  const [editing, setEditing] = useState<ReminderKind | null>(null);
  const [pending, setPending] = useState<TimeValue | null>(null);

  const openTime = (kind: ReminderKind) => {
    const d = new Date();
    d.setHours(settings[kind].hour, settings[kind].minute, 0, 0);
    setPending(dateToTimeValue(d));
    setEditing(kind);
  };

  const saveTime = () => {
    if (editing && pending) {
      const d = timeValueToDate(pending, new Date());
      onChange({ ...settings, [editing]: { ...settings[editing], hour: d.getHours(), minute: d.getMinutes() } });
    }
    setEditing(null);
  };

  return (
    <View style={{ gap: 2 }}>
      {REMINDER_KINDS.map((kind) => {
        const row = ROWS[kind];
        const s = settings[kind];
        return (
          <View key={kind} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, opacity: disabled ? 0.5 : 1 }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={row.icon} size={16} color={row.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', fontFamily: FONT }}>{row.label}</Text>
              <Text style={{ color: '#71717A', fontSize: 10.5, marginTop: 1, fontFamily: FONT }}>{row.note}</Text>
            </View>
            <PressScale
              onPress={() => openTime(kind)}
              disabled={disabled || !s.enabled}
              accessibilityRole="button"
              accessibilityLabel={`${row.label} reminder time, ${formatTime(s)}`}
              hitSlop={6}
            >
              <View style={{ paddingHorizontal: 10, height: 30, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', opacity: s.enabled ? 1 : 0.4 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'], fontFamily: FONT }}>{formatTime(s)}</Text>
              </View>
            </PressScale>
            <Switch
              value={s.enabled}
              disabled={disabled}
              onValueChange={(enabled) => onChange({ ...settings, [kind]: { ...s, enabled } })}
              accessibilityLabel={`${row.label} reminder`}
            />
          </View>
        );
      })}
      <Text style={{ color: '#52525B', fontSize: 10.5, marginTop: 4, fontFamily: FONT }}>Never more than 2 reminders a day in total.</Text>

      {editing && pending ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setEditing(null)} statusBarTranslucent>
          <Pressable onPress={() => setEditing(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
            <Pressable onPress={() => {}} style={{ backgroundColor: COLORS.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 28, gap: 16 }}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', fontFamily: FONT }}>{ROWS[editing].label} reminder time</Text>
              <TimeWheelPicker initialValue={pending} onChange={setPending} />
              <PressScale onPress={saveTime}>
                <View style={{ height: 50, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: COLORS.blueDeep, fontSize: 14, fontWeight: '800', fontFamily: FONT }}>Save</Text>
                </View>
              </PressScale>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}
