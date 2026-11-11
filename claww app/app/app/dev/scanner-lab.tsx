import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BG, COLORS } from '../../lib/theme';
import { SHOW_DEV_TOOLS } from '../../lib/devTools';
import { totalsOf, type ScanItem } from '../../lib/engine';
import { scanPlateLab, type LabResult } from '../../lib/scanner';
import { BackTile } from '../../components/ui/BackTile';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Surface } from '../../components/ui/Surface';

// Scanner lab (dev and preview builds only): one photo, every model one after another, so the models can be compared
// on speed AND on what they found. Needs the function secret SCANNER_LAB=on; without it the function refuses.
// Each row: the model, how long the call took (the function's own time and the whole round trip including the upload),
// how many foods it found, how many did not match the database, and the calories of the matched foods.

const MODELS: { id: string; label: string }[] = [
  { id: 'groq', label: 'Groq Qwen 3.8 27B' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite' },
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
  { id: 'gemma-4-31b-it', label: 'Gemma 4 31B IT' },
];

type Row = { state: 'idle' | 'running' | 'done'; result?: LabResult };

const G = COLORS.green;

function seconds(ms: number | null | undefined) {
  return ms == null ? '–' : `${(ms / 1000).toFixed(1)} s`;
}

function itemLine(i: ScanItem) {
  const name = i.food ? i.food.name : `? ${i.heard}`;
  return `${name} · ${Math.round(i.grams) || '?'} g`;
}

export default function ScannerLab() {
  if (!SHOW_DEV_TOOLS) return <Redirect href="/" />;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [photo, setPhoto] = useState<{ uri: string; base64: string; mime: string } | null>(null);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [truth, setTruth] = useState('');

  const kb = photo ? Math.round((photo.base64.length * 3) / 4 / 1024) : 0;

  const pick = async (camera: boolean) => {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', base64: true, quality: 0.4 };
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    const a = res.assets?.[0];
    if (res.canceled || !a?.base64) return;
    setPhoto({ uri: a.uri, base64: a.base64, mime: a.mimeType ?? 'image/jpeg' });
    setRows({});
    setOpen(null);
  };

  const runAll = async () => {
    if (!photo || running) return;
    setRunning(true);
    setRows(Object.fromEntries(MODELS.map((m) => [m.id, { state: 'idle' } as Row])));
    for (const m of MODELS) {
      setRows((r) => ({ ...r, [m.id]: { state: 'running' } }));
      const result = await scanPlateLab(`data:${photo.mime};base64,${photo.base64}`, m.id);
      setRows((r) => ({ ...r, [m.id]: { state: 'done', result } }));
    }
    setRunning(false);
  };

  const trueKcal = Number(truth);
  const summary = useMemo(
    () =>
      MODELS.map((m) => {
        const res = rows[m.id]?.result;
        if (!res || !res.ok) return null;
        const items = res.items;
        const matched = items.filter((i) => i.food);
        return { id: m.id, kcal: Math.round(totalsOf(items).kcal), found: items.length, unmatched: items.length - matched.length };
      }),
    [rows]
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingTop: insets.top + 6, paddingBottom: 8 }}>
        <BackTile onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.fg, fontSize: 20, fontFamily: BG[800] }}>Scanner lab</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>One photo through every model</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 14 }}>
        {photo ? <Image source={{ uri: photo.uri }} style={{ width: '100%', height: 190, borderRadius: 20 }} resizeMode="cover" accessibilityLabel="Your photo" /> : null}
        {photo ? <Text style={{ color: COLORS.textFaint, fontSize: 12, fontFamily: BG[400] }}>Photo sent at {kb} KB</Text> : null}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button variant="secondary" accent={G} size="md" fullWidth onPress={() => pick(true)} icon={<Icon name="camera" size={16} color={G} />}>Take a photo</Button>
          </View>
          <View style={{ flex: 1 }}>
            <Button variant="secondary" accent={G} size="md" fullWidth onPress={() => pick(false)}>Choose one</Button>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>True calories (optional)</Text>
          <TextInput value={truth} onChangeText={(t) => setTruth(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="e.g. 320" placeholderTextColor={COLORS.textFaint} accessibilityLabel="True calories of the plate" style={{ flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, color: COLORS.fg, paddingHorizontal: 12, fontSize: 16, fontFamily: BG[400] }} />
        </View>

        <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="lg" fullWidth disabled={!photo || running} onPress={runAll}>
          {running ? 'Running the models…' : 'Run every model'}
        </Button>

        <Surface padding={0} radius={22}>
          {MODELS.map((m, idx) => {
            const row = rows[m.id];
            const res = row?.result;
            const sum = summary[idx];
            const err = sum && trueKcal > 0 ? Math.round(((sum.kcal - trueKcal) / trueKcal) * 100) : null;
            return (
              <View key={m.id} style={{ borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: COLORS.border }}>
                <Pressable onPress={() => setOpen((o) => (o === m.id ? null : m.id))} accessibilityRole="button" accessibilityLabel={`${m.label} details`} style={{ paddingVertical: 14, paddingHorizontal: 14, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ flex: 1, color: COLORS.fg, fontSize: 16, fontFamily: BG[700] }}>{m.label}</Text>
                    {row?.state === 'running' ? <ActivityIndicator color={G} size="small" /> : null}
                    {res ? <Text style={{ color: res.ok ? G : '#F87171', fontSize: 15, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>{res.ok ? seconds(res.total) : 'failed'}</Text> : <Text style={{ color: COLORS.textFaint, fontSize: 13, fontFamily: BG[400] }}>{row?.state === 'running' ? 'running' : '–'}</Text>}
                  </View>
                  {res && res.ok && sum ? (
                    <Text style={{ color: COLORS.textMuted, fontSize: 13, fontVariant: ['tabular-nums'], fontFamily: BG[400] }}>
                      {sum.found} found{sum.unmatched ? ` (${sum.unmatched} not in the database)` : ''} · {sum.kcal} kcal{err !== null ? ` · ${err > 0 ? '+' : ''}${err}%` : ''} · model {seconds(res.ms)}
                    </Text>
                  ) : res && !res.ok ? (
                    <Text style={{ color: '#F87171', fontSize: 12, fontFamily: BG[400] }} numberOfLines={open === m.id ? 6 : 2}>{res.reason}</Text>
                  ) : null}
                </Pressable>
                {open === m.id && res && res.ok ? (
                  <View style={{ paddingHorizontal: 14, paddingBottom: 12, gap: 3 }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[700] }}>Looks like: {res.dish}</Text>
                    {res.items.map((i) => (
                      <Text key={i.key} style={{ color: i.food ? COLORS.fg : '#F59E0B', fontSize: 13, fontFamily: BG[400] }}>{itemLine(i)}</Text>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </Surface>
        <Text style={{ color: COLORS.textFaint, fontSize: 12, lineHeight: 17, fontFamily: BG[400] }}>
          Time is the whole round trip from the phone, including the photo upload. "model" is the part spent inside the model. Tap a row for what it found.
        </Text>
      </ScrollView>
    </View>
  );
}
