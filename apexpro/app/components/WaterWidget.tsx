import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { FONT } from '../lib/theme';
import { useAppState } from '../lib/appState';
import { getTodaysWaterMl, logWater } from '../lib/data';
import { Icon } from './ui/Icon';

const WATER_TARGET_ML = 2000;
const TAP_ADD_ML = 250;
const PRESETS = [250, 500, 1000];
const WATER = '#38BDF8';
const WATER_DEEP = '#2563EB';

function formatMl(ml: number): string {
  return ml >= 1000 ? `${(ml / 1000).toFixed(2)}L` : `${ml}ml`;
}

interface BottleProps {
  width: number;
  height: number;
  fillAnim: Animated.Value;
  scaleAnim: Animated.Value;
}

function Bottle({ width, height, fillAnim, scaleAnim }: BottleProps) {
  const neckWidth = width * 0.42;
  const neckHeight = height * 0.12;

  return (
    <Animated.View style={{ alignItems: 'center', transform: [{ scale: scaleAnim }] }}>
      <View
        style={{
          width: neckWidth,
          height: neckHeight,
          borderWidth: 1.5,
          borderBottomWidth: 0,
          borderColor: 'rgba(56,189,248,0.45)',
          borderTopLeftRadius: 5,
          borderTopRightRadius: 5,
          backgroundColor: 'rgba(255,255,255,0.03)',
        }}
      />
      <View
        style={{
          width,
          height,
          borderRadius: width * 0.22,
          borderWidth: 1.5,
          borderColor: 'rgba(56,189,248,0.45)',
          backgroundColor: 'rgba(255,255,255,0.03)',
          overflow: 'hidden',
          justifyContent: 'flex-end',
        }}
      >
        <Animated.View
          style={{
            width: '100%',
            height: fillAnim.interpolate({ inputRange: [0, 1], outputRange: [0, height] }),
          }}
        >
          <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.55)' }} />
          <LinearGradient colors={[WATER, WATER_DEEP]} style={{ flex: 1 }} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

interface WaterWidgetProps {
  compact?: boolean;
  onOpenFull?: () => void;
}

export function WaterWidget({ compact = false, onOpenFull }: WaterWidgetProps) {
  const { userId } = useAppState();
  const [waterMl, setWaterMl] = useState(0);
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const fillAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const popAnim = useRef(new Animated.Value(0)).current;
  const [popLabel, setPopLabel] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      getTodaysWaterMl(userId).then((ml) => {
        if (!cancelled) setWaterMl(ml);
      });
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  const pct = Math.min(waterMl / WATER_TARGET_ML, 1);

  useEffect(() => {
    Animated.timing(fillAnim, { toValue: pct, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct, fillAnim]);

  const playFeedback = (ml: number) => {
    scaleAnim.setValue(0.9);
    Animated.spring(scaleAnim, { toValue: 1, friction: 3.5, tension: 140, useNativeDriver: true }).start();
    setPopLabel(`+${formatMl(ml)}`);
    popAnim.setValue(0);
    Animated.sequence([
      Animated.timing(popAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(popAnim, { toValue: 0, duration: 260, delay: 260, useNativeDriver: true }),
    ]).start();
  };

  const addWater = async (ml: number) => {
    if (!userId || ml <= 0) return;
    playFeedback(ml);
    setWaterMl((prev) => prev + ml);
    const ok = await logWater(userId, ml);
    if (!ok) setWaterMl((prev) => Math.max(0, prev - ml));
  };

  const handleCustomSubmit = () => {
    const ml = Math.round(Number(customValue));
    if (ml > 0) addWater(ml);
    setCustomValue('');
    setCustomOpen(false);
  };

  const bottleWidth = compact ? 34 : 60;
  const bottleHeight = compact ? 56 : 108;

  const popStyle = {
    opacity: popAnim,
    transform: [{ translateY: popAnim.interpolate({ inputRange: [0, 1], outputRange: [6, -14] }) }],
  };

  if (compact) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onOpenFull}
        style={{
          backgroundColor: '#151517',
          borderWidth: 1,
          borderColor: 'rgba(56,189,248,0.28)',
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <TouchableOpacity activeOpacity={0.8} onPress={() => addWater(TAP_ADD_ML)} style={{ position: 'relative' }}>
          <Bottle width={bottleWidth} height={bottleHeight} fillAnim={fillAnim} scaleAnim={scaleAnim} />
          <Animated.Text
            style={[
              { position: 'absolute', top: -6, left: '50%', marginLeft: -20, width: 40, textAlign: 'center', color: WATER, fontSize: 11, fontWeight: '800', fontFamily: FONT },
              popStyle,
            ]}
          >
            {popLabel}
          </Animated.Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONT }}>Water</Text>
          <Text style={{ color: '#71717A', fontSize: 11, marginTop: 2, fontFamily: FONT }}>
            {formatMl(waterMl)} <Text style={{ color: '#52525B' }}>/ {formatMl(WATER_TARGET_ML)}</Text>
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => addWater(TAP_ADD_ML)}
            style={{
              alignSelf: 'flex-start',
              marginTop: 7,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: 'rgba(56,189,248,0.14)',
              borderWidth: 1,
              borderColor: 'rgba(56,189,248,0.3)',
              borderRadius: 100,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Icon name="plus" size={11} color={WATER} />
            <Text style={{ color: WATER, fontSize: 10.5, fontWeight: '700', fontFamily: FONT }}>{TAP_ADD_ML}ml</Text>
          </TouchableOpacity>
        </View>
        <Icon name="droplets" size={18} color={WATER} />
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={{
        backgroundColor: '#151517',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        borderRadius: 20,
        padding: 16,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONT }}>Water Intake</Text>
        <View
          style={{
            backgroundColor: waterMl > 0 ? 'rgba(56,189,248,0.14)' : 'rgba(255,255,255,0.06)',
            borderWidth: 1,
            borderColor: waterMl > 0 ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.1)',
            borderRadius: 8,
            paddingHorizontal: 9,
            paddingVertical: 3,
          }}
        >
          <Text style={{ color: waterMl > 0 ? WATER : '#71717A', fontSize: 11, fontWeight: '700', fontFamily: FONT }}>
            {formatMl(waterMl)} / {formatMl(WATER_TARGET_ML)}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22 }}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => addWater(TAP_ADD_ML)} style={{ position: 'relative' }}>
          <Bottle width={bottleWidth} height={bottleHeight} fillAnim={fillAnim} scaleAnim={scaleAnim} />
          <Animated.Text
            style={[
              { position: 'absolute', top: -10, left: '50%', marginLeft: -24, width: 48, textAlign: 'center', color: WATER, fontSize: 13, fontWeight: '800', fontFamily: FONT },
              popStyle,
            ]}
          >
            {popLabel}
          </Animated.Text>
          <Text style={{ color: '#52525B', fontSize: 9.5, textAlign: 'center', marginTop: 8, fontFamily: FONT }}>Tap to add</Text>
        </TouchableOpacity>

        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p}
                activeOpacity={0.8}
                onPress={() => addWater(p)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 9,
                  borderRadius: 11,
                  backgroundColor: 'rgba(56,189,248,0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(56,189,248,0.25)',
                }}
              >
                <Text style={{ color: WATER, fontSize: 11.5, fontWeight: '700', fontFamily: FONT }}>+{formatMl(p)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {customOpen ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TextInput
                value={customValue}
                onChangeText={setCustomValue}
                placeholder="Custom ml"
                placeholderTextColor="#52525B"
                keyboardType="numeric"
                autoFocus
                onSubmitEditing={handleCustomSubmit}
                style={{
                  flex: 1,
                  height: 38,
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderWidth: 1,
                  borderColor: 'rgba(56,189,248,0.3)',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 12.5,
                  paddingHorizontal: 12,
                  fontFamily: FONT,
                }}
              />
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleCustomSubmit}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: 'rgba(56,189,248,0.18)',
                  borderWidth: 1,
                  borderColor: 'rgba(56,189,248,0.35)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="check" size={15} color={WATER} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity activeOpacity={0.8} onPress={() => setCustomOpen(true)} style={{ alignSelf: 'flex-start' }}>
              <Text style={{ color: '#71717A', fontSize: 11.5, fontWeight: '600', fontFamily: FONT }}>+ Custom amount</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
