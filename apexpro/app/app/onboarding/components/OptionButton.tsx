import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Animated,
} from 'react-native';

interface OptionButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export default function OptionButton({ label, selected, onPress }: OptionButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const selectionAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Smooth selection color transition
  useEffect(() => {
    Animated.timing(selectionAnim, {
      toValue: selected ? 1 : 0,
      duration: 280,
      useNativeDriver: false,
    }).start();

    // Glow pulse on select
    if (selected) {
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 400,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [selected]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 8,
    }).start();
  };

  // Interpolated colors for smooth transition
  const backgroundColor = selectionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.04)', '#D6FF00'],
  });

  const borderColor = selectionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.08)', 'rgba(214,255,0,0.6)'],
  });

  const textColor = selectionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#C0C0C0', '#050505'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.35],
  });

  return (
    <Animated.View style={{ transform: [{ scale }], marginBottom: 10 }}>
      {/* Glow layer behind button */}
      <Animated.View
        style={[
          styles.glowLayer,
          { opacity: glowOpacity },
        ]}
      />
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={[
            styles.button,
            { backgroundColor, borderColor },
          ]}
        >
          <Animated.Text style={[styles.label, { color: textColor }]}>
            {label}
          </Animated.Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    paddingVertical: 17,
    paddingHorizontal: 22,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#D6FF00',
    borderRadius: 14,
    top: 2,
    bottom: -2,
    left: 4,
    right: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
