import React from 'react';
import { Text, View } from 'react-native';
import { COLORS, FONT, SURFACES, tint, BG, bg } from '../../lib/theme';
import { Button } from './Button';
import { Icon } from './Icon';
import { Surface } from './Surface';

// NG PHASE 1: the designed states from screen 19 ("When things aren't perfect").
// Loading is not here: use Skeleton in the real layout, never a spinner on a blank page.
//
//   first-day  "Hi Kashyap. Your plan starts tomorrow." + one thing to do today
//   offline    amber banner: what is saved on the phone, and that it will sync
//   error      what failed, what still works, Try again + a way to keep going
//   empty      an empty screen that offers the one-tap answer
//   unsure     the scanner isn't sure: ask one question instead of guessing

export type StateVariant = 'first-day' | 'offline' | 'error' | 'empty' | 'unsure';

export interface StateAction {
  label: string;
  onPress: () => void;
}

export interface StateViewProps {
  variant: StateVariant;
  title?: string;
  body?: string;
  /** The main answer: "Try again", "Yes, as planned", "Log tonight's dinner". */
  primary?: StateAction;
  /** Second choices: "Keep using saved plan", "Something else", "Skipped". */
  secondary?: StateAction[];
  /** Small label above the title ("DAY 0", "FOOD DIARY · TODAY"). */
  label?: string;
  /** Screen accent for the primary button and the label; nutrition screens pass green. */
  accent?: string;
  accentDeep?: string;
  /** Extra content between the text and the buttons (first day's tomorrow card, the scanner's choices). */
  children?: React.ReactNode;
}

export function StateView({ variant, title, body, primary, secondary = [], label, accent = COLORS.blue, accentDeep = COLORS.blueDeep, children }: StateViewProps) {
  if (variant === 'offline') {
    return (
      <View
        accessibilityRole="alert"
        style={{
          flexDirection: 'row',
          gap: 10,
          alignItems: 'center',
          padding: 14,
          borderRadius: 16,
          backgroundColor: tint(COLORS.amber, 0.1),
          borderWidth: 1,
          borderColor: tint(COLORS.amber, 0.35),
        }}
      >
        <Icon name="wifi-off" size={16} color={COLORS.amber} />
        <Text style={{ flex: 1, color: COLORS.ratingOkay, fontSize: 13, lineHeight: 19, fontFamily: BG[600] }}>
          {body ?? 'No signal. Everything you log is saved on your phone and syncs when you’re back.'}
        </Text>
      </View>
    );
  }

  const centered = variant === 'error' || variant === 'empty';

  return (
    <Surface padding={18} accessibilityLabel={title}>
      <View style={{ gap: 12, alignItems: centered ? 'center' : 'stretch' }}>
        {variant === 'error' ? (
          <View style={{ width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: SURFACES.well, borderWidth: 1, borderColor: COLORS.borderStrong }}>
            <Icon name="x" size={22} color={COLORS.fgGray} strokeWidth={2.2} />
          </View>
        ) : null}
        {label ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: accent }} />
            <Text style={{ color: accent, fontSize: 11, letterSpacing: 0.9, fontFamily: BG[700] }}>{label}</Text>
          </View>
        ) : null}
        {title ? (
          <Text
            accessibilityRole="header"
            style={{
              color: COLORS.fg,
              fontSize: variant === 'first-day' ? 21 : 17,
              lineHeight: variant === 'first-day' ? 25 : 22,
              fontFamily: BG[800],
              textAlign: centered ? 'center' : 'left',
            }}
          >
            {title}
          </Text>
        ) : null}
        {body ? (
          <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 19, fontFamily: BG[400], textAlign: centered ? 'center' : 'left' }}>{body}</Text>
        ) : null}
        {children}
        {primary || secondary.length ? (
          <View style={{ gap: 8, alignSelf: 'stretch', marginTop: 4 }}>
            {primary ? (
              <Button size="lg" fullWidth accent={accent} accentDeep={accentDeep} onPress={primary.onPress} icon={variant === 'empty' ? <Icon name="check" size={16} color="#fff" strokeWidth={3} /> : undefined}>
                {primary.label}
              </Button>
            ) : null}
            {secondary.length ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {secondary.map((a) => (
                  <View key={a.label} style={{ flex: 1 }}>
                    <Button variant="ghost" size="md" fullWidth onPress={a.onPress}>
                      {a.label}
                    </Button>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </Surface>
  );
}
