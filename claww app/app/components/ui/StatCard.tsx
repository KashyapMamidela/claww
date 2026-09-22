import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { FONT } from '../../lib/theme';

export interface StatCardProps {
  icon?: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  pct?: number;
  color?: string;
  onPress?: () => void;
}

export function StatCard({ icon, label, value, sub, pct, color = '#A1A1AA', onPress }: StatCardProps) {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container
      activeOpacity={onPress ? 0.8 : undefined}
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: '#151517',
        borderWidth: 1,
        borderColor: onPress ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#71717A', fontSize: 10, marginBottom: 3, fontFamily: FONT }}>{label}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', fontFamily: FONT }}>{value}</Text>
            {sub ? <Text style={{ color: '#71717A', fontSize: 10, fontFamily: FONT }}>{sub}</Text> : null}
          </View>
        </View>
        {icon ? (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: `${color}14`,
              borderWidth: 1,
              borderColor: `${color}22`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </View>
        ) : null}
      </View>
      {typeof pct === 'number' && (
        <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 100, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, borderRadius: 100, backgroundColor: color }} />
        </View>
      )}
    </Container>
  );
}
