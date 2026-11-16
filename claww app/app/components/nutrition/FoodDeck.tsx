import React, { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { COLORS, BG } from '../../lib/theme';
import type { Availability, AvailabilityMap, FoodRow } from '../../lib/resourceDefaults';
import { CardDeck, type CardDeckHandle, type DeckDirection } from '../ui/CardDeck';
import { Icon } from '../ui/Icon';
import { PressScale } from '../ui/PressScale';
import { success, setDone } from '../../lib/haptics';

// "Can you get these?" as a deck of cards: one food on the front, the next two peeking out behind it.
// Swipe up for yes, down for no, tap the card (or the middle button) for sometimes. The buttons below do the same, so
// nothing depends on the gesture. Every food starts with what the setup already guessed, shown on the card.

const G = COLORS.green;
const CARD_H = 300;

const LABEL: Record<Availability, string> = { yes: 'Yes', sometimes: 'Sometimes', no: 'No' };
const TONE: Record<Availability, { bg: string; fg: string; border: string }> = {
  yes: { bg: 'rgba(34,197,94,0.20)', fg: '#86EFAC', border: 'rgba(34,197,94,0.55)' },
  sometimes: { bg: 'rgba(245,158,11,0.20)', fg: '#FCD34D', border: 'rgba(245,158,11,0.55)' },
  no: { bg: 'rgba(255,255,255,0.10)', fg: COLORS.textMuted, border: COLORS.border },
};

export interface FoodDeckProps {
  rows: FoodRow[];
  availability: AvailabilityMap;
  onAnswer: (key: FoodRow['key'], value: Availability) => void;
  /** Called when the last card has gone. */
  onFinished?: () => void;
  groupTitle: (row: FoodRow) => string;
}

export function FoodDeck({ rows, availability, onAnswer, onFinished, groupTitle }: FoodDeckProps) {
  const deck = useRef<CardDeckHandle>(null);
  const pending = useRef<Availability | null>(null);
  const [remaining, setRemaining] = useState(rows.length);
  const [asked, setAsked] = useState<Record<string, Availability>>({});

  const swiped = useCallback(
    (row: FoodRow, dir: DeckDirection) => {
      const value = pending.current ?? (dir === 'up' ? 'yes' : 'no');
      pending.current = null;
      onAnswer(row.key, value);
      setAsked((a) => ({ ...a, [row.key]: value }));
      if (value === 'yes') success();
      else setDone();
    },
    [onAnswer]
  );

  const answer = (value: Availability) => {
    pending.current = value;
    deck.current?.swipe(value === 'no' ? 'down' : 'up');
  };

  const onRemaining = useCallback(
    (left: number) => {
      setRemaining(left);
      if (left === 0) onFinished?.();
    },
    [onFinished]
  );

  const total = rows.length;
  const done = total - remaining;

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
          <View style={{ width: `${total ? Math.round((done / total) * 100) : 100}%`, height: '100%', backgroundColor: G }} />
        </View>
        <Text style={{ color: COLORS.textMuted, fontSize: 13, fontVariant: ['tabular-nums'], fontFamily: BG[700] }}>
          {Math.min(done + 1, total)} of {total}
        </Text>
      </View>

      <CardDeck
        ref={deck}
        items={rows}
        keyOf={(r) => r.key}
        cardHeight={CARD_H}
        onSwiped={swiped}
        onRemaining={onRemaining}
        onPressCard={() => answer('sometimes')}
        renderCard={(row) => {
          const guess = asked[row.key] ?? availability[row.key];
          const tone = TONE[guess];
          return (
            <View
              accessible
              accessibilityLabel={`${row.title}, ${row.sub}. Currently ${LABEL[guess]}. Use the buttons below to answer.`}
              style={{ flex: 1, borderRadius: 28, borderWidth: 1.5, borderColor: tone.border, backgroundColor: '#17171B', padding: 22, justifyContent: 'space-between', boxShadow: '0px 18px 40px -18px rgba(0,0,0,0.9)' }}
            >
              <View style={{ gap: 6 }}>
                <Text style={{ color: G, fontSize: 11, letterSpacing: 1.2, fontFamily: BG[800] }}>{groupTitle(row)}</Text>
                <Text style={{ color: COLORS.fg, fontSize: 36, letterSpacing: -0.8, fontFamily: BG[800] }}>{row.title}</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 16, lineHeight: 22, fontFamily: BG[400] }}>{row.sub}</Text>
              </View>
              <View style={{ gap: 14 }}>
                <View style={{ alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: tone.bg }}>
                  <Text style={{ color: tone.fg, fontSize: 13, fontFamily: BG[800] }}>{asked[row.key] ? `You said ${LABEL[guess]}` : `We guessed ${LABEL[guess]}`}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Hint icon="chevron-up" text="Swipe up: yes" />
                  <Hint icon="chevron-down" text="Down: no" />
                  <Text style={{ color: COLORS.textFaint, fontSize: 12, fontFamily: BG[600] }}>Tap: sometimes</Text>
                </View>
              </View>
            </View>
          );
        }}
        renderEmpty={() => (
          <View style={{ height: CARD_H, borderRadius: 28, borderWidth: 1, borderColor: COLORS.greenBorderMd, backgroundColor: '#17171B', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 }}>
            <Icon name="check" size={34} color={G} strokeWidth={3} />
            <Text style={{ color: COLORS.fg, fontSize: 22, fontFamily: BG[800] }}>That is everything</Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 14, textAlign: 'center', fontFamily: BG[400] }}>Change any answer from the list, or see what you have.</Text>
          </View>
        )}
      />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <AnswerButton label="No" tone="no" onPress={() => answer('no')} disabled={remaining === 0} />
        <AnswerButton label="Sometimes" tone="sometimes" onPress={() => answer('sometimes')} disabled={remaining === 0} />
        <AnswerButton label="Yes" tone="yes" onPress={() => answer('yes')} disabled={remaining === 0} />
      </View>
      <PressScale onPress={() => deck.current?.back()} accessibilityRole="button" accessibilityLabel="Go back to the previous food" style={{ alignSelf: 'center' }}>
        <View style={{ minHeight: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
          <Icon name="chevron-left" size={14} color={COLORS.textMuted} />
          <Text style={{ color: COLORS.textMuted, fontSize: 14, fontFamily: BG[700] }}>Previous food</Text>
        </View>
      </PressScale>
    </View>
  );
}

function Hint({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon name={icon} size={12} color={COLORS.textFaint} />
      <Text style={{ color: COLORS.textFaint, fontSize: 12, fontFamily: BG[600] }}>{text}</Text>
    </View>
  );
}

function AnswerButton({ label, tone, onPress, disabled }: { label: string; tone: Availability; onPress: () => void; disabled: boolean }) {
  const t = TONE[tone];
  return (
    <PressScale onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} style={{ flex: 1 }}>
      <View style={{ minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border, backgroundColor: t.bg, opacity: disabled ? 0.4 : 1 }}>
        <Text style={{ color: t.fg, fontSize: 15, fontFamily: BG[800] }}>{label}</Text>
      </View>
    </PressScale>
  );
}
