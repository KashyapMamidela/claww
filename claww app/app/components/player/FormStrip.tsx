import React from 'react';
import { Text, View } from 'react-native';
import { COLORS, FONT } from '../../lib/theme';
import { cueIndexForSet, hasFormContent, type ExerciseForm } from '../../lib/exerciseForm';
import { BodyMap, viewsFor } from '../BodyMap';
import { formMuscles } from '../ExerciseGuideSheet';
import { PressScale } from '../ui/PressScale';

export interface FormStripProps {
  form: ExerciseForm | undefined;
  /** Current set index — the cue advances one per set. */
  setIndex: number;
  /** The first time a user does an exercise: show every step and the common mistake. */
  expanded: boolean;
  onDemo: () => void;
}

/**
 * Slim form strip above the set rows (V2 PHASE 2.6): the exercise's muscles
 * on a body map, one form cue that advances per set, and a Demo button for
 * the full guide. Renders nothing without form content — never an empty strip.
 */
export function FormStrip({ form, setIndex, expanded, onDemo }: FormStripProps) {
  if (!hasFormContent(form)) return null;
  const muscles = formMuscles(form);
  const cue = cueIndexForSet(form.formSteps.length, setIndex);

  return (
    <View style={{ flexDirection: 'row', gap: 12, padding: 12, borderRadius: 16, backgroundColor: '#111113', borderWidth: 1, borderColor: 'rgba(59,130,246,0.18)' }}>
      {muscles.length > 0 ? (
        <View style={{ justifyContent: 'center' }}>
          <BodyMap muscles={muscles} height={expanded ? 84 : 58} views={viewsFor(muscles.map((m) => m.muscle))} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 6 }}>
        {expanded ? (
          <>
            <Text style={{ color: COLORS.blue, fontSize: 10, fontWeight: '800', letterSpacing: 0.7, fontFamily: FONT }}>FIRST TIME · HOW TO</Text>
            {form.formSteps.map((step, i) => (
              <Text key={i} style={{ color: '#fff', fontSize: 12.5, lineHeight: 18, fontFamily: FONT }}>
                <Text style={{ color: COLORS.blue, fontWeight: '800' }}>{i + 1} </Text>
                {step}
              </Text>
            ))}
            {form.commonMistake ? (
              <Text style={{ color: '#A1A1AA', fontSize: 12, lineHeight: 17, fontFamily: FONT }}>
                <Text style={{ color: COLORS.danger, fontWeight: '800' }}>Avoid: </Text>
                {form.commonMistake}
              </Text>
            ) : null}
          </>
        ) : (
          <>
            <Text style={{ color: COLORS.blue, fontSize: 10, fontWeight: '800', letterSpacing: 0.7, fontFamily: FONT }}>
              CUE {cue + 1}/{form.formSteps.length}
            </Text>
            <Text numberOfLines={2} style={{ color: '#fff', fontSize: 13, lineHeight: 18, fontFamily: FONT }}>
              {form.formSteps[cue]}
            </Text>
          </>
        )}
      </View>
      <PressScale onPress={onDemo} accessibilityRole="button" accessibilityLabel="Open the exercise guide" hitSlop={6}>
        <View style={{ paddingHorizontal: 12, height: 34, borderRadius: 10, backgroundColor: 'rgba(59,130,246,0.14)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: COLORS.blue, fontSize: 12, fontWeight: '800', fontFamily: FONT }}>Demo</Text>
        </View>
      </PressScale>
    </View>
  );
}
