import React, { useState } from 'react';
import { TintTile } from '../ui/TintTile';
import { Text, TextInput, View } from 'react-native';
import { AREA_COLORS, COLORS, FONT, tint, BG, bg } from '../../lib/theme';
import { ACTIVITIES, ACTIVITY_MINUTES_MAX, ACTIVITY_MINUTES_MIN, ACTIVITY_MINUTES_STEP, DEFAULT_ACTIVITY_MINUTES } from '../../lib/activities';
import { logActivity } from '../../lib/data';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { ErrorCard } from '../ui/ErrorCard';
import { Icon } from '../ui/Icon';
import { Stepper } from '../ui/Stepper';

// NG PHASE 12 (screen 06): "Played a sport or walked a lot?" Logs an activity with a duration. It counts for
// calories and recovery and is never a missed or completed plan day.

const C = AREA_COLORS.streak;

export function ActivityCard({ userId, onLogged }: { userId: string | null; onLogged: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [other, setOther] = useState('');
  const [minutes, setMinutes] = useState(DEFAULT_ACTIVITY_MINUTES);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const name = picked === 'Other' ? other.trim() : picked;

  const close = () => {
    setPicked(null);
    setOther('');
    setError(null);
  };

  const save = async () => {
    if (!userId || !name || saving) return;
    setSaving(true);
    setError(null);
    const ok = await logActivity(userId, name, minutes);
    setSaving(false);
    if (!ok) {
      setError('Could not log it. Check your connection and try again.');
      return;
    }
    setDone(`Logged ${name} · ${minutes} min`);
    close();
    setMinutes(DEFAULT_ACTIVITY_MINUTES);
    onLogged();
  };

  return (
    <TintTile color={C} padding={16} radius={20}>
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: tint(C, 0.16), borderWidth: 1, borderColor: tint(C, 0.35) }}>
          <Icon name="zap" size={20} color={C} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800] }}>Played a sport or walked a lot?</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 20, fontFamily: BG[400] }}>Log it as an activity. It counts for calories and recovery, and never as a missed workout.</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {[...ACTIVITIES.map((a) => a.name), 'Other'].map((n) => (
          <Chip key={n} accent={C} onPress={() => setPicked(n)}>
            {n === 'Other' ? '+ Other' : n}
          </Chip>
        ))}
      </View>
      {done ? <Text style={{ color: COLORS.green, fontSize: 15, fontFamily: BG[700] }}>{done}</Text> : null}

      <BottomSheet visible={picked !== null} onClose={close}>
        <View style={{ padding: 20, gap: 14 }}>
          <Text style={{ color: COLORS.fg, fontSize: 20, fontFamily: BG[800] }}>{picked === 'Other' ? 'Log an activity' : `Log ${picked}`}</Text>
          {picked === 'Other' ? (
            <TextInput
              value={other}
              onChangeText={setOther}
              placeholder="What did you play?"
              placeholderTextColor={COLORS.textFaint}
              maxLength={40}
              accessibilityLabel="Activity name"
              style={{ height: 48, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, color: COLORS.fg, fontSize: 17, paddingHorizontal: 14, fontFamily: BG[400] }}
            />
          ) : null}
          <Stepper
            label="Minutes"
            value={String(minutes)}
            unit="min"
            onDecrement={() => setMinutes((m) => Math.max(ACTIVITY_MINUTES_MIN, m - ACTIVITY_MINUTES_STEP))}
            onIncrement={() => setMinutes((m) => Math.min(ACTIVITY_MINUTES_MAX, m + ACTIVITY_MINUTES_STEP))}
            decrementDisabled={minutes <= ACTIVITY_MINUTES_MIN}
            incrementDisabled={minutes >= ACTIVITY_MINUTES_MAX}
          />
          {error ? <ErrorCard message={error} onRetry={save} retrying={saving} /> : null}
          <Button variant="primary" accent={C} size="lg" fullWidth disabled={!name || saving} onPress={save}>
            {saving ? 'Saving…' : 'Log activity'}
          </Button>
        </View>
      </BottomSheet>
    </View>
    </TintTile>
  );
}

/**
 * Premium F1: the same activity logging as a sheet, opened from Quick log. Pick what you played, set the minutes,
 * log it. It counts for calories and recovery and never as a missed workout.
 */
export function ActivitySheet({ visible, userId, onClose, onLogged }: { visible: boolean; userId: string | null; onClose: () => void; onLogged: (message: string) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [other, setOther] = useState('');
  const [minutes, setMinutes] = useState(DEFAULT_ACTIVITY_MINUTES);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = picked === 'Other' ? other.trim() : picked;

  const reset = () => {
    setPicked(null);
    setOther('');
    setError(null);
    setMinutes(DEFAULT_ACTIVITY_MINUTES);
  };
  const close = () => {
    reset();
    onClose();
  };
  const save = async () => {
    if (!userId || !name || saving) return;
    setSaving(true);
    setError(null);
    const ok = await logActivity(userId, name, minutes);
    setSaving(false);
    if (!ok) {
      setError('Could not log it. Check your connection and try again.');
      return;
    }
    const msg = `Logged ${name} · ${minutes} min`;
    reset();
    onClose();
    onLogged(msg);
  };

  return (
    <BottomSheet visible={visible} onClose={close} maxHeightFraction={0.85}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 14 }}>
        <Text style={{ color: COLORS.fg, fontSize: 22, fontFamily: BG[800] }}>Log an activity</Text>
        <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 21, fontFamily: BG[400] }}>Played a sport or walked a lot? It counts for calories and recovery, never as a missed workout.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[...ACTIVITIES.map((a) => a.name), 'Other'].map((n) => (
            <Chip key={n} accent={C} active={picked === n} onPress={() => setPicked(n)}>
              {n === 'Other' ? '+ Other' : n}
            </Chip>
          ))}
        </View>
        {picked === 'Other' ? (
          <TextInput
            value={other}
            onChangeText={setOther}
            placeholder="What did you play?"
            placeholderTextColor={COLORS.textFaint}
            maxLength={40}
            accessibilityLabel="Activity name"
            style={{ height: 48, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, color: COLORS.fg, fontSize: 17, paddingHorizontal: 14, fontFamily: BG[400] }}
          />
        ) : null}
        <Stepper
          label="Minutes"
          value={String(minutes)}
          unit="min"
          onDecrement={() => setMinutes((m) => Math.max(ACTIVITY_MINUTES_MIN, m - ACTIVITY_MINUTES_STEP))}
          onIncrement={() => setMinutes((m) => Math.min(ACTIVITY_MINUTES_MAX, m + ACTIVITY_MINUTES_STEP))}
          decrementDisabled={minutes <= ACTIVITY_MINUTES_MIN}
          incrementDisabled={minutes >= ACTIVITY_MINUTES_MAX}
        />
        {error ? <ErrorCard message={error} onRetry={save} retrying={saving} /> : null}
        <Button variant="primary" accent={C} size="lg" fullWidth disabled={!name || saving} onPress={save}>
          {saving ? 'Saving…' : 'Log activity'}
        </Button>
      </View>
    </BottomSheet>
  );
}
