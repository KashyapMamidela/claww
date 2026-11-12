import React from 'react';
import { TiltLight } from '../ui/TiltLight';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AREA_COLORS, COLORS, FONT, FONT_HAND, tint, BG, bg } from '../../lib/theme';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Surface } from '../ui/Surface';

// Premium H6: one card under Daily progress that answers "what am I training today". Three states, one accent each:
// training (blue), rest day (indigo), done (a quieter blue: green belongs to food, and a finished session
// shouldn't compete with what is still to do). The tile row above stays a quick glance; this card is the detail.

export type SessionCardState = 'training' | 'rest' | 'done';

export interface SessionCardProps {
  state: SessionCardState;
  /** Session name for training and done; the next session's name on a rest day. */
  name: string;
  /** Usual start time, "6:00 pm". */
  timeLabel?: string;
  exercises?: number;
  minutes?: number;
  sets?: number;
  setsDone?: number;
  /** One progression line, e.g. "Bench press 60 > 62.5 kg", and the coach's handwritten note under it. */
  progression?: { name: string; oldText: string; newText: string } | null;
  note?: string | null;
  onStart?: () => void;
  onOpen?: () => void;
  onLogWalk?: () => void;
}

const PALETTE: Record<SessionCardState, { accent: string; kicker: string; top: string; bottom: string }> = {
  training: { accent: AREA_COLORS.workouts, kicker: '#93C5FD', top: '#152445', bottom: '#0E1527' },
  rest: { accent: AREA_COLORS.sleep, kicker: '#A5B4FC', top: '#1B1C36', bottom: '#12132A' },
  done: { accent: AREA_COLORS.workouts, kicker: '#93C5FD', top: '#111A30', bottom: '#0B1120' },
};

const Pill = ({ text }: { text: string }) => (
  <View style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.09)' }}>
    <Text style={{ color: COLORS.fg, fontSize: 13, fontVariant: ['tabular-nums'], fontFamily: BG[700] }}>{text}</Text>
  </View>
);

export function SessionCard(p: SessionCardProps) {
  const c = PALETTE[p.state];
  const kicker = p.state === 'training' ? `TODAY${p.timeLabel ? ` · ${p.timeLabel.toUpperCase()}` : ''}` : p.state === 'rest' ? 'REST DAY' : 'DONE';
  const title = p.state === 'rest' ? 'Walk 20 minutes' : p.name;

  return (
    <Surface
      padding={16}
      radius={20}
      colors={[c.top, c.bottom]}
      borderColor={tint(c.accent, p.state === 'done' ? 0.25 : 0.4)}
      decoration={
        <>
          <LinearGradient
            pointerEvents="none"
            colors={[tint(c.accent, p.state === 'done' ? 0.14 : 0.3), tint(c.accent, 0)]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.3, y: 0.8 }}
            style={StyleSheet.absoluteFill}
          />
          <TiltLight />
        </>
      }
    >
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: c.kicker, fontSize: 12, letterSpacing: 0.96, fontFamily: BG[800] }}>{kicker}</Text>
          {p.state === 'rest' && p.name ? (
            <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>next: {p.name}</Text>
          ) : p.state === 'done' ? (
            <Icon name="check-circle-2" size={18} color={c.accent} />
          ) : null}
        </View>
        <Text style={{ color: COLORS.fg, fontSize: 22, lineHeight: 28, letterSpacing: -0.3, fontFamily: BG[800] }}>{title}</Text>

        {p.state === 'rest' ? (
          <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 21, fontFamily: BG[400] }}>Light movement clears soreness faster than sitting still.</Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {p.exercises ? <Pill text={`${p.exercises} exercise${p.exercises === 1 ? '' : 's'}`} /> : null}
            {p.minutes ? <Pill text={`~${p.minutes} min`} /> : null}
            {p.state === 'done' ? (p.setsDone ? <Pill text={p.sets ? `${p.setsDone} of ${p.sets} sets` : `${p.setsDone} sets done`} /> : null) : p.sets ? <Pill text={`${p.sets} sets`} /> : null}
          </View>
        )}

        {p.state === 'training' && p.progression ? (
          <View>
            <Text style={{ color: '#C4C4CC', fontSize: 15, fontFamily: BG[400] }}>
              {p.progression.name} <Text style={{ color: COLORS.textFaint, textDecorationLine: 'line-through' }}>{p.progression.oldText}</Text>{' '}
              <Text style={{ color: '#fff', fontWeight: '800' }}>{p.progression.newText}</Text>
            </Text>
            {p.note ? <Text style={{ color: COLORS.fg, fontSize: 20, lineHeight: 24, fontFamily: FONT_HAND, fontWeight: '700' }}>{p.note}</Text> : null}
          </View>
        ) : null}

        {p.state === 'training' ? (
          <Button variant="primary" size="lg" fullWidth accent={c.accent} onPress={p.onStart} icon={<Icon name="play" size={14} color="#fff" />}>
            Start session
          </Button>
        ) : p.state === 'rest' ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button variant="primary" size="md" fullWidth accent={c.accent} accentDeep="#4F46E5" onPress={p.onLogWalk} icon={<Icon name="footprints" size={15} color="#fff" />}>
                Log a walk
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button variant="secondary" size="md" fullWidth accent={c.accent} onPress={p.onOpen}>
                See the week
              </Button>
            </View>
          </View>
        ) : (
          <Button variant="secondary" size="md" fullWidth accent={c.accent} onPress={p.onOpen}>
            See the session
          </Button>
        )}
      </View>
    </Surface>
  );
}
