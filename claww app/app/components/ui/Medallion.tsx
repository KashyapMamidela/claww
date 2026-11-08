import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { tint } from '../../lib/theme';

// Premium P2: an achievement as a medallion. Earned: a metal rim in the badge's colour, a dark disc, a soft glow and a
// light sweep across the top. Locked: the same shape as a dark silhouette, so you can see what is still to earn.

export function Medallion({ icon, color, earned, size = 60 }: { icon: string; color: string; earned: boolean; size?: number }) {
  const rim = Math.max(3, Math.round(size * 0.07));
  return (
    <View
      accessibilityElementsHidden
      style={[
        { width: size, height: size, borderRadius: size / 2 },
        earned ? ({ boxShadow: `0px 6px 16px -4px ${tint(color, 0.7)}` } as object) : null,
      ]}
    >
      <LinearGradient
        colors={earned ? [tint(color, 1), tint(color, 0.35), tint(color, 0.85)] : ['#2A2A2F', '#1B1B1F', '#26262B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, borderRadius: size / 2, padding: rim }}
      >
        <View style={{ flex: 1, borderRadius: size / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: earned ? '#101012' : '#0E0E10' }}>
          {earned ? (
            <LinearGradient colors={[tint(color, 0.3), tint(color, 0)]} start={{ x: 0.2, y: 0 }} end={{ x: 0.6, y: 0.8 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          ) : null}
          <Text style={{ fontSize: size * 0.4, opacity: earned ? 1 : 0.22 }}>{icon}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}
