import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT } from '../lib/theme';
import { useAppState, type MealType } from '../lib/appState';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';

const G = { deep: COLORS.greenDeep, bright: COLORS.green, border: COLORS.greenBorder };

export default function MealLogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mealType } = useLocalSearchParams<{ mealType: string }>();
  const { addMeal } = useAppState();
  const [text, setText] = useState('');
  const [photoAttached, setPhotoAttached] = useState(false);
  const canSubmit = text.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    addMeal((mealType as MealType) ?? 'Snack', text.trim());
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingTop: insets.top + 26,
          paddingHorizontal: 20,
          paddingBottom: 4,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: '#151517',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="x" size={16} color="#A1A1AA" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: FONT }}>Log {mealType || 'a Meal'}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: G.bright }} />
          <Text style={{ color: G.bright, fontSize: 10, fontWeight: '700', letterSpacing: 0.9, fontFamily: FONT }}>WHAT DID YOU EAT?</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -0.5, marginBottom: 16, lineHeight: 29, fontFamily: FONT }}>
          Just tell us — in your own words.
        </Text>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="e.g. grilled chicken with rice"
          placeholderTextColor="#52525B"
          multiline
          numberOfLines={3}
          autoFocus
          style={{
            backgroundColor: '#151517',
            borderWidth: 1,
            borderColor: text.length > 0 ? G.border : 'rgba(255,255,255,0.12)',
            borderRadius: 18,
            color: '#fff',
            fontSize: 17,
            fontWeight: '500',
            padding: 16,
            minHeight: 96,
            textAlignVertical: 'top',
            fontFamily: FONT,
            lineHeight: 24,
          }}
        />
        <Text style={{ color: '#52525B', fontSize: 11, marginTop: 8, marginHorizontal: 2, fontFamily: FONT }}>
          Portion size, brand, or a rough guess all work — CLAWW AI fills in the rest.
        </Text>

        <View style={{ marginTop: 22 }}>
          <Button
            variant="primary"
            accent={G.bright}
            accentDeep={G.deep}
            size="lg"
            fullWidth
            disabled={!canSubmit}
            onPress={handleSubmit}
            icon={<Icon name="sparkles" size={17} color="#fff" />}
          >
            Log This Meal
          </Button>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22, marginBottom: 16 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <Text style={{ color: '#52525B', fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, fontFamily: FONT }}>OR</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setPhotoAttached((p) => !p)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: photoAttached ? G.border : 'rgba(255,255,255,0.14)',
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 13,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: 'rgba(255,255,255,0.05)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={photoAttached ? 'check' : 'camera'} size={16} color={photoAttached ? G.bright : '#71717A'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: photoAttached ? G.bright : '#A1A1AA', fontSize: 12.5, fontWeight: '600', fontFamily: FONT }}>
              {photoAttached ? 'Photo attached' : 'Attach a photo instead'}
            </Text>
            <Text style={{ color: '#52525B', fontSize: 10.5, fontFamily: FONT }}>Optional — helps CLAWW AI double-check portions</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
