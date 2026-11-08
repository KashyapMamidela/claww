import React, { useRef, useState } from 'react';
import { MealTypePicker, mealForClock } from '../components/nutrition/MealTypePicker';
import { Linking, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BG, COLORS, AREA_COLORS } from '../lib/theme';
import { useAppState, type MealType } from '../lib/appState';
import { lookupBarcode, portion, type BarcodeProduct } from '../lib/barcode';
import { success } from '../lib/haptics';
import { BackTile } from '../components/ui/BackTile';
import { BottomSheet } from '../components/ui/BottomSheet';
import { Button } from '../components/ui/Button';
import { Stepper } from '../components/ui/Stepper';
import { useToast } from '../components/ui/Toast';

// Premium F9: scan the barcode on a packet. The product comes from Open Food Facts; you set how much you ate and log it.

const G = AREA_COLORS.nutrition;

export default function BarcodeScreen() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { saveMeal } = useAppState();
  const [permission, requestPermission] = useCameraPermissions();
  const busy = useRef(false);
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [grams, setGrams] = useState(100);
  const [message, setMessage] = useState('Point the camera at the barcode');
  const [saving, setSaving] = useState(false);
  // A packet is usually a snack; the clock decides, and you can change it.
  const [mealType, setMealType] = useState<MealType>(mealForClock(new Date().getHours()));

  const onCode = async ({ data }: { data: string }) => {
    if (busy.current || product) return;
    busy.current = true;
    setMessage('Looking it up…');
    const p = await lookupBarcode(data);
    if (!p) {
      setMessage('Not found. Try another packet, or log it by name.');
      setTimeout(() => {
        busy.current = false;
        setMessage('Point the camera at the barcode');
      }, 2200);
      return;
    }
    success();
    setGrams(p.servingG ?? 100);
    setProduct(p);
  };

  const close = () => {
    setProduct(null);
    busy.current = false;
    setMessage('Point the camera at the barcode');
  };

  const log = async () => {
    if (!product || saving) return;
    setSaving(true);
    const n = portion(product, grams);
    const row = await saveMeal(mealType, { description: `${product.name}${product.brand ? ` (${product.brand})` : ''} ${grams} g`, ...n, planStatus: 'extra' });
    setSaving(false);
    close();
    if (row) {
      success();
      toast.show({ message: `Logged ${product.name}`, actionLabel: undefined });
      router.back();
    }
  };

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {permission.granted ? (
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={product ? undefined : onCode}
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 }}>
          <Text style={{ color: COLORS.fg, fontSize: 20, textAlign: 'center', fontFamily: BG[800] }}>CLAWW needs the camera to read a barcode</Text>
          {permission.canAskAgain ? (
            <Button variant="primary" size="lg" accent={G} accentDeep={COLORS.greenDeep} onPress={requestPermission}>
              Allow the camera
            </Button>
          ) : (
            <Button variant="primary" size="lg" accent={G} accentDeep={COLORS.greenDeep} onPress={() => Linking.openSettings()}>
              Open settings
            </Button>
          )}
        </View>
      )}
      <View style={{ position: 'absolute', top: insets.top + 10, left: 16 }}>
        <BackTile onPress={() => router.back()} />
      </View>
      {permission.granted ? (
        <>
          {/* A frame to aim with. */}
          <View pointerEvents="none" style={{ position: 'absolute', top: '32%', left: '12%', right: '12%', height: 170, borderRadius: 24, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)' }} />
          <View pointerEvents="none" style={{ position: 'absolute', bottom: insets.bottom + 60, left: 0, right: 0, alignItems: 'center' }}>
            <View style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.6)' }}>
              <Text style={{ color: COLORS.fg, fontSize: 15, fontFamily: BG[600] }}>{message}</Text>
            </View>
          </View>
        </>
      ) : null}

      <BottomSheet visible={!!product} onClose={close} maxHeightFraction={0.7}>
        {product ? (
          <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 14 }}>
            <View>
              <Text style={{ color: COLORS.fg, fontSize: 22, lineHeight: 28, fontFamily: BG[800] }} numberOfLines={2}>{product.name}</Text>
              {product.brand ? <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>{product.brand}</Text> : null}
            </View>
            <View style={{ marginHorizontal: -20 }}>
              <MealTypePicker value={mealType} onChange={setMealType} />
            </View>
            <Stepper
              label="Amount"
              value={String(grams)}
              unit="g"
              onDecrement={() => setGrams((g) => Math.max(10, g - 10))}
              onIncrement={() => setGrams((g) => Math.min(2000, g + 10))}
              decrementDisabled={grams <= 10}
              incrementDisabled={grams >= 2000}
            />
            {(() => {
              const n = portion(product, grams);
              return (
                <Text style={{ color: COLORS.fgGray, fontSize: 17, fontFamily: BG[600], fontVariant: ['tabular-nums'] }}>
                  {n.calories} kcal · P {n.protein_g} g · C {n.carbs_g} g · F {n.fats_g} g
                </Text>
              );
            })()}
            <Button variant="primary" size="lg" fullWidth accent={G} accentDeep={COLORS.greenDeep} disabled={saving} onPress={log}>
              {saving ? 'Saving…' : `Log as ${mealType.toLowerCase()}`}
            </Button>
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}
