import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, BG } from '../lib/theme';
import { useAppState } from '../lib/appState';
import { DEFAULT_CONTEXT, type ScanContext } from '../lib/engine';
import { habitContext, lastTimeFor } from '../lib/scanHabit';
import { getPastScans, scanPlate, setScanSession, type ScanOutcome } from '../lib/scanner';
import { pickPictureSize, shrinkPhoto } from '../lib/photo';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { PressScale } from '../components/ui/PressScale';
import { ItemTags, ScanSweep } from '../components/scan/ScanEffects';
import { ScanQuestions } from '../components/scan/ScanQuestions';

// NG PHASE 9, step 1 (screen 16): the scanner starts with context. A viewfinder, the plate read in the background
// while you answer three quick questions (pre-filled from habit), a sweep of light over the photo while it is read and the
// foods it found as tags on the photo. "Check my plate" never waits: the next screen shows the reading if it is not done.
// The photo is shrunk first (lib/photo.ts) so the upload is quick on mobile data.

const G = COLORS.green;

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
  const [photoH, setPhotoH] = useState(300);
  const [pictureSize, setPictureSize] = useState<string | undefined>(undefined);
  const pending = useRef<Promise<ScanOutcome> | null>(null);

  useEffect(() => {
    if (!userId) return;
    getPastScans(userId).then((p) => {
      setPast(p);
      setContext(habitContext(p));
    });
  }, [userId]);

  const start = (uri: string, base64: string, mimeType: string, width?: number, height?: number) => {
    setPhoto({ uri, base64, mimeType });
    setOutcome(null);
    // Shrink first (about 100 to 200 KB), then send: the upload is the slowest part on mobile data.
    const p = shrinkPhoto({ uri, base64, mime: mimeType }, width, height)
      .then((small) => {
        setPhoto((prev) => (prev ? { ...prev, base64: small.base64, mimeType: small.mime } : prev));
        return scanPlate(`data:${small.mime};base64,${small.base64}`);
      })
      .then((o) => {
        setOutcome(o);
        return o;
      });
    pending.current = p;
  };

  const shoot = async () => {
    if (!camera.current || busy) return;
    setBusy(true);
    try {
      const pic = await camera.current.takePictureAsync({ quality: 0.5, base64: true, skipProcessing: false });
      if (pic?.base64) start(pic.uri, pic.base64, 'image/jpeg', pic.width, pic.height);
    } finally {
      setBusy(false);
    }
  };

  const fromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, base64: true });
    const a = res.assets?.[0];
    if (!res.canceled && a?.base64) start(a.uri, a.base64, a.mimeType ?? 'image/jpeg', a.width, a.height);
  };

  const retake = () => {
    setPhoto(null);
    setOutcome(null);
    pending.current = null;
  };

  const ok = outcome && outcome.ok ? outcome.result : null;
  const dish = ok && ok.route === 'ok' ? ok.dish : null;
  const last = dish ? lastTimeFor(dish, past) : null;
  const reading = !!photo && !outcome;
  const tagNames = ok ? ok.items.filter((i) => !i.hidden).map((i) => (i.food ? i.food.name : i.heard)) : [];

  const next = () => {
    if (!photo || !pending.current) return;
    setScanSession({ photoUri: photo.uri, base64: photo.base64, mimeType: photo.mimeType, mealType, pending: pending.current, outcome, context });
    router.push('/scan-check');
  };

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0907' }}>
      <View style={{ height: photo ? '44%' : '100%' }} onLayout={(e) => setPhotoH(e.nativeEvent.layout.height)}>
        {photo ? (
          <Image source={{ uri: photo.uri }} style={{ flex: 1 }} resizeMode="cover" accessibilityLabel="Your photo" />
        ) : permission.granted ? (
          <CameraView
            ref={camera}
            style={{ flex: 1 }}
            facing="back"
            pictureSize={pictureSize}
            onCameraReady={() => {
              // Ask the camera for a plate-sized picture (about 1,280 px) instead of the full 12 MP: a much smaller upload.
              camera.current
                ?.getAvailablePictureSizesAsync()
                .then((sizes) => setPictureSize(pickPictureSize(sizes)))
                .catch(() => {});
            }}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 }}>
            <Icon name="camera" size={34} color={COLORS.textMuted} />
            <Text style={{ color: COLORS.fg, fontSize: 17, textAlign: 'center', fontFamily: BG[800] }}>CLAWW needs the camera to scan a plate</Text>
            <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="md" onPress={requestPermission}>
              Allow the camera
            </Button>
            <Pressable onPress={fromGallery} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: G, fontSize: 15, fontFamily: BG[700] }}>Choose a photo instead</Text>
            </Pressable>
          </View>
        )}

        {photo ? <ScanSweep active={reading} height={photoH} /> : null}

        <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close the scanner" style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={22} color="#fff" />
          </Pressable>
          <View style={{ minHeight: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 15, fontFamily: BG[800] }}>
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
          </View>
        ) : null}

        {/* The foods it found, as tags on the photo, above the panel. */}
        {photo && ok ? (
          <View pointerEvents="none" style={{ position: 'absolute', bottom: 36, left: 12, right: 12 }}>
            <ItemTags names={tagNames} lead={dish} />
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
              <Text style={{ color: '#fff', fontSize: 15, fontFamily: BG[700] }}>Choose a photo instead</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {photo ? (
        <View style={{ flex: 1, backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -26, overflow: 'hidden', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 18, gap: 18 }}>
            <ScanQuestions
              context={context}
              onChange={setContext}
              reading={reading}
              found={tagNames.length || null}
              last={last ? last.context : null}
              onUseLast={last ? () => setContext(last.context) : undefined}
            />
            <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="lg" fullWidth onPress={next} icon={<Icon name="check" size={18} color="#fff" />}>
              Check my plate
            </Button>
            <Pressable onPress={retake} accessibilityRole="button" style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[600] }}>Retake the photo</Text>
            </Pressable>
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
