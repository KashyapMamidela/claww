import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT } from '../lib/theme';
import { useAppState } from '../lib/appState';
import { DEFAULT_CONTEXT, type Oil, type Place, type Portion, type ScanContext } from '../lib/engine';
import { contextText, habitContext, lastTimeFor } from '../lib/scanHabit';
import { getPastScans, scanPlate, setScanSession, type ScanOutcome } from '../lib/scanner';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { PressScale } from '../components/ui/PressScale';
import { SectionLabel } from '../components/ui/SectionLabel';
import { Segmented } from '../components/ui/Segmented';

// NG PHASE 9, step 1 (screen 16): the scanner starts with context. A viewfinder, the first read of the plate as a
// "Looks like ..." tag, and three quick questions pre-filled from habit (or "last time with this dish: Use").
// "Photos can't see oil or portion", so the answers decide the oil line and the size; the numbers come from the database.

const G = COLORS.green;

const PLACES: { value: Place; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'mess', label: 'Mess' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'street', label: 'Street' },
];
const OILS: { value: Oil; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'normal', label: 'Normal' },
  { value: 'heavy', label: 'Heavy' },
];
const PORTIONS: { value: Portion; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'regular', label: 'Regular' },
  { value: 'large', label: 'Large' },
  { value: 'shared', label: 'Shared' },
];

const mealForHour = (h: number) => (h < 11 ? 'Breakfast' : h < 16 ? 'Lunch' : h < 19 ? 'Snack' : 'Dinner');

function Corner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const base = { position: 'absolute' as const, width: 36, height: 36, borderColor: '#fff' };
  const style = {
    tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 },
    tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 },
    br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12 },
  }[pos];
  return <View style={[base, style]} />;
}

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAppState();
  const { mealType: mealParam } = useLocalSearchParams<{ mealType?: string }>();
  const now = useMemo(() => new Date(), []);
  const mealType = mealParam || mealForHour(now.getHours());
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [photo, setPhoto] = useState<{ uri: string; base64: string; mimeType: string } | null>(null);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [context, setContext] = useState<ScanContext>(DEFAULT_CONTEXT);
  const [past, setPast] = useState<Awaited<ReturnType<typeof getPastScans>>>([]);
  const [busy, setBusy] = useState(false);
  const pending = useRef<Promise<ScanOutcome> | null>(null);

  useEffect(() => {
    if (!userId) return;
    getPastScans(userId).then((p) => {
      setPast(p);
      setContext(habitContext(p));
    });
  }, [userId]);

  const start = (uri: string, base64: string, mimeType: string) => {
    setPhoto({ uri, base64, mimeType });
    setOutcome(null);
    const p = scanPlate(`data:${mimeType};base64,${base64}`).then((o) => {
      setOutcome(o);
      return o;
    });
    pending.current = p;
  };

  const shoot = async () => {
    if (!camera.current || busy) return;
    setBusy(true);
    try {
      const pic = await camera.current.takePictureAsync({ quality: 0.4, base64: true, skipProcessing: false });
      if (pic?.base64) start(pic.uri, pic.base64, 'image/jpeg');
    } finally {
      setBusy(false);
    }
  };

  const fromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.4, base64: true });
    const a = res.assets?.[0];
    if (!res.canceled && a?.base64) start(a.uri, a.base64, a.mimeType ?? 'image/jpeg');
  };

  const retake = () => {
    setPhoto(null);
    setOutcome(null);
    pending.current = null;
  };

  const dish = outcome && outcome.ok && outcome.result.route === 'ok' ? outcome.result.dish : null;
  const last = dish ? lastTimeFor(dish, past) : null;
  const reading = !!photo && !outcome;

  const next = () => {
    if (!photo || !pending.current) return;
    setScanSession({ photoUri: photo.uri, base64: photo.base64, mimeType: photo.mimeType, mealType, pending: pending.current, outcome, context });
    router.push('/scan-check');
  };

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0907' }}>
      <View style={{ height: photo ? '38%' : '100%' }}>
        {photo ? (
          <Image source={{ uri: photo.uri }} style={{ flex: 1 }} resizeMode="cover" accessibilityLabel="Your photo" />
        ) : permission.granted ? (
          <CameraView ref={camera} style={{ flex: 1 }} facing="back" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 }}>
            <Icon name="camera" size={34} color={COLORS.textMuted} />
            <Text style={{ color: COLORS.fg, fontSize: 17, fontWeight: '800', textAlign: 'center', fontFamily: FONT }}>CLAWW needs the camera to scan a plate</Text>
            <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="md" onPress={requestPermission}>
              Allow the camera
            </Button>
            <Pressable onPress={fromGallery} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: G, fontSize: 15, fontWeight: '700', fontFamily: FONT }}>Choose a photo instead</Text>
            </Pressable>
          </View>
        )}

        <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close the scanner" style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={22} color="#fff" />
          </Pressable>
          <View style={{ minHeight: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', fontFamily: FONT }}>
              {mealType} · {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </Text>
          </View>
          <View style={{ width: 48 }} />
        </View>

        {permission.granted || photo ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: '22%', left: '16%', right: '16%', aspectRatio: 1 }}>
            <Corner pos="tl" />
            <Corner pos="tr" />
            <Corner pos="bl" />
            <Corner pos="br" />
            {dish ? (
              <View style={{ position: 'absolute', bottom: -18, alignSelf: 'center', minHeight: 36, paddingHorizontal: 16, borderRadius: 18, backgroundColor: G, justifyContent: 'center' }}>
                <Text style={{ color: '#052e16', fontSize: 15, fontWeight: '800', fontFamily: FONT }}>Looks like {dish.toLowerCase()}</Text>
              </View>
            ) : reading ? (
              <View style={{ position: 'absolute', bottom: -18, alignSelf: 'center', minHeight: 36, paddingHorizontal: 16, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={{ color: '#fff', fontSize: 15, fontFamily: FONT }}>Reading the plate…</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {!photo && permission.granted ? (
          <View style={{ position: 'absolute', bottom: insets.bottom + 28, left: 0, right: 0, alignItems: 'center', gap: 14 }}>
            <PressScale onPress={shoot} accessibilityRole="button" accessibilityLabel="Take the photo" disabled={busy}>
              <View style={{ width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' }} />
              </View>
            </PressScale>
            <Pressable onPress={fromGallery} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: FONT }}>Choose a photo instead</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {photo ? (
        <View style={{ flex: 1, backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -26, overflow: 'hidden' }}>
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 18, gap: 14 }}>
            {last ? (
              <Pressable
                onPress={() => setContext(last.context)}
                accessibilityRole="button"
                accessibilityLabel={`Use last time's answers: ${contextText(last.context)}`}
                style={{ minHeight: 72, borderRadius: 16, borderWidth: 1, borderColor: COLORS.greenBorderMd, backgroundColor: 'rgba(34,197,94,0.08)', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: FONT }}>Last time with this dish</Text>
                  <Text style={{ color: COLORS.fg, fontSize: 17, fontWeight: '800', fontFamily: FONT }}>{contextText(last.context)}</Text>
                </View>
                <Text style={{ color: G, fontSize: 17, fontWeight: '800', fontFamily: FONT }}>Use</Text>
              </Pressable>
            ) : null}

            <View>
              <Text style={{ color: COLORS.fg, fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'], fontFamily: FONT }}>{last ? 'Or answer two quick questions' : 'Two quick questions'}</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 21, marginTop: 4, fontFamily: FONT }}>Photos cannot see oil or portion. This makes the numbers honest.</Text>
            </View>

            <SectionLabel color={G}>WHERE IS IT FROM?</SectionLabel>
            <Segmented options={PLACES} value={context.place} onChange={(place) => setContext((c) => ({ ...c, place }))} accent={G} accentDeep={COLORS.greenDeep} accessibilityLabel="Where it is from" />
            <SectionLabel color={G}>HOW OILY?</SectionLabel>
            <Segmented options={OILS} value={context.oil} onChange={(oil) => setContext((c) => ({ ...c, oil }))} accent={G} accentDeep={COLORS.greenDeep} accessibilityLabel="How oily" />
            <SectionLabel color={G}>PORTION</SectionLabel>
            <Segmented options={PORTIONS} value={context.portion} onChange={(portion) => setContext((c) => ({ ...c, portion }))} accent={G} accentDeep={COLORS.greenDeep} accessibilityLabel="Portion" />

            <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="lg" fullWidth onPress={next} disabled={reading} icon={<Icon name="chevron-right" size={16} color="#fff" />}>
              {reading ? 'Reading the plate…' : 'Check the items'}
            </Button>
            <Pressable onPress={retake} accessibilityRole="button" style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 15, fontWeight: '600', fontFamily: FONT }}>Retake the photo</Text>
            </Pressable>
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
