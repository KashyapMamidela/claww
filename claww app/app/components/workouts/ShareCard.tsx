import React, { forwardRef } from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT, FONT_HAND, SURFACES } from '../../lib/theme';
import { SHARE_HEIGHT, SHARE_WIDTH } from '../../lib/shareCard';

// NG PHASE 12: the share card, laid out at its real 1080 x 1920 pixels (a story-sized image). The session-complete
// screen renders it off to the side at full size, captures it with react-native-view-shot and opens the share sheet.
// It shows the same numbers as the hero and nothing private (no email, no weight of the body).

export interface ShareCardData {
  name: string;
  title: string;
  focus: string;
  minutes: number;
  setsText: string;
  volumeText: string;
  kcal: number;
  bestLine: string | null;
  streakText: string | null;
  dateText: string;
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ width: 440, borderRadius: 40, borderWidth: 2, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(255,255,255,0.10)', padding: 36, gap: 10 }}>
      <Text style={{ color: '#fff', fontSize: 84, fontWeight: '900', letterSpacing: -2, fontFamily: FONT }}>{value}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 34, fontFamily: FONT }}>{label}</Text>
    </View>
  );
}

export const ShareCard = forwardRef<View, { data: ShareCardData }>(function ShareCard({ data }, ref) {
  return (
    <View ref={ref} collapsable={false} style={{ width: SHARE_WIDTH, height: SHARE_HEIGHT, backgroundColor: '#050505', overflow: 'hidden' }}>
      <LinearGradient colors={[...SURFACES.heroBlue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
      <View style={{ flex: 1, padding: 90, justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: '#fff', fontSize: 64, fontWeight: '900', letterSpacing: 2, fontFamily: FONT }}>CLAWW</Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 44, marginTop: 8, fontFamily: FONT }}>{data.dateText}</Text>
        </View>

        <View style={{ gap: 28 }}>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 44, fontWeight: '800', letterSpacing: 3, fontFamily: FONT }}>{`${data.focus.toUpperCase()} · COMPLETE`}</Text>
          <Text style={{ color: '#fff', fontSize: 150, fontWeight: '900', letterSpacing: -4, lineHeight: 156, fontFamily: FONT }}>{`${data.title},\n${data.name || 'you'}.`}</Text>
        </View>

        <View style={{ gap: 28 }}>
          <View style={{ flexDirection: 'row', gap: 40 }}>
            <Tile value={`${data.minutes} min`} label="time" />
            <Tile value={data.setsText} label="sets" />
          </View>
          <View style={{ flexDirection: 'row', gap: 40 }}>
            <Tile value={data.volumeText} label="volume" />
            <Tile value={String(data.kcal)} label="kcal burned" />
          </View>
          {data.bestLine ? (
            <View style={{ borderRadius: 40, borderWidth: 2, borderColor: 'rgba(245,158,11,0.6)', backgroundColor: 'rgba(245,158,11,0.16)', padding: 40 }}>
              <Text style={{ color: COLORS.amber, fontSize: 44, fontWeight: '900', fontFamily: FONT }}>New best</Text>
              <Text style={{ color: '#fff', fontSize: 52, fontWeight: '800', marginTop: 6, fontFamily: FONT }}>{data.bestLine}</Text>
            </View>
          ) : null}
          {data.streakText ? <Text style={{ color: '#fff', fontSize: 64, fontFamily: FONT_HAND }}>{data.streakText}</Text> : null}
        </View>

        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 34, fontFamily: FONT }}>Trained with CLAWW</Text>
      </View>
    </View>
  );
});
