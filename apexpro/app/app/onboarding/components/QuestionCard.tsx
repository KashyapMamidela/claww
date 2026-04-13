import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import OptionButton from './OptionButton';

interface QuestionCardProps {
  question: string;
  subtitle?: string;
  options: string[];
  selected: string | null;
  onSelect: (option: string) => void;
}

export default function QuestionCard({
  question,
  subtitle,
  options,
  selected,
  onSelect,
}: QuestionCardProps) {
  return (
    <View style={styles.cardWrapper}>
      {/* Subtle gradient border effect */}
      <LinearGradient
        colors={['rgba(214,255,0,0.12)', 'rgba(255,255,255,0.03)', 'rgba(214,255,0,0.06)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.borderGradient}
      >
        <View style={styles.card}>
          {/* Inner subtle gradient */}
          <LinearGradient
            colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Accent line */}
          <View style={styles.accentLine} />

          <Text style={styles.question}>{question}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          <View style={styles.options}>
            {options.map((opt) => (
              <OptionButton
                key={opt}
                label={opt}
                selected={selected === opt}
                onPress={() => onSelect(opt)}
              />
            ))}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    width: '100%',
    // Deep shadow for floating effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 16,
  },
  borderGradient: {
    borderRadius: 24,
    padding: 1, // 1px gradient border
  },
  card: {
    backgroundColor: '#0D0D0D',
    borderRadius: 23,
    padding: 24,
    paddingTop: 26,
    width: '100%',
    overflow: 'hidden',
  },
  accentLine: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D6FF00',
    marginBottom: 22,
    opacity: 0.8,
  },
  question: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    color: '#606060',
    marginBottom: 4,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  options: {
    marginTop: 24,
  },
});
