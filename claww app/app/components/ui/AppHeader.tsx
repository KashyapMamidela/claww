import React from 'react';
import { Image, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT, HEADER_CONTENT_HEIGHT } from '../../lib/theme';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

export interface AppHeaderProps {
  wordmarkAccent: string;
  onBellPress?: () => void;
}

/**
 * Floating translucent header: overlays the scene (see (tabs)/_layout.tsx)
 * so BlurView has real content behind it to blur, matching Apple's nav-bar
 * material. Screens pad their own top content by HEADER_CONTENT_HEIGHT +
 * insets.top so nothing starts out hidden underneath.
 */
export function AppHeader({ wordmarkAccent, onBellPress }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
      <BlurView
        intensity={70}
        tint="dark"
        style={{
          paddingTop: insets.top,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.08)',
          backgroundColor: 'rgba(5,5,5,0.45)',
        }}
      >
        <View
          style={{
            height: HEADER_CONTENT_HEIGHT,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 18,
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
              <Image source={require('../../assets/logo-mark.png')} style={{ width: 15, height: 15 }} resizeMode="contain" />
            </View>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: -0.3, fontFamily: FONT }}>
              CLAW
              <Text style={{ color: wordmarkAccent }}>W</Text>
            </Text>
          </View>
          <IconButton icon={<Icon name="bell" size={15} color="#A1A1AA" />} onPress={onBellPress} />
        </View>
      </BlurView>
    </View>
  );
}
