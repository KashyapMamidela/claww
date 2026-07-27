import React from 'react';
import { Text, View } from 'react-native';
import { FONT } from '../../lib/theme';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

export interface AppHeaderProps {
  wordmarkAccent: string;
  onBellPress?: () => void;
}

/** Sticky app header: logo tile + CLAW(W) wordmark, second W tinted per section. */
export function AppHeader({ wordmarkAccent, onBellPress }: AppHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 9,
        paddingHorizontal: 18,
        backgroundColor: 'rgba(5,5,5,0.93)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: wordmarkAccent,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.22)',
            shadowColor: wordmarkAccent,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 5,
          }}
        >
          <Text style={{ fontSize: 14 }}>🦅</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: -0.3, fontFamily: FONT }}>
          CLAW
          <Text style={{ color: wordmarkAccent }}>W</Text>
        </Text>
      </View>
      <IconButton icon={<Icon name="bell" size={15} color="#A1A1AA" />} onPress={onBellPress} />
    </View>
  );
}
