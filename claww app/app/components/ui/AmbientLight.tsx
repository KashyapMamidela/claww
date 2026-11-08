import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ambientGlow } from '../../lib/ambient';

/** Premium X3: a soft light from the top of the screen, in the tab's colour tinted by the time of day. Re-checked every 10 minutes. */
export function AmbientLight({ tabColor }: { tabColor: string }) {
  const [hour, setHour] = useState(new Date().getHours());
  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { bottom: undefined, height: 380 }]}>
      <LinearGradient colors={[ambientGlow(hour, tabColor, 0.2), ambientGlow(hour, tabColor, 0)]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
    </View>
  );
}
