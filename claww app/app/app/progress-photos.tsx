import React, { useCallback, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BG, COLORS } from '../lib/theme';
import { useAppState } from '../lib/appState';
import { getProfile } from '../lib/data';
import { addProgressPhoto, daysApart, deleteProgressPhoto, listProgressPhotos, photoDateLabel, signedProgressUrls, type ProgressPhoto } from '../lib/progressPhotos';
import { success, tick } from '../lib/haptics';
import { BackTile } from '../components/ui/BackTile';
import { Button } from '../components/ui/Button';
import { Display } from '../components/ui/Typography';
import { Icon } from '../components/ui/Icon';
import { Skeleton } from '../components/ui/Skeleton';
import { Surface } from '../components/ui/Surface';
import { Rise } from '../components/ui/Rise';
import { useToast } from '../components/ui/Toast';

// Premium F7: progress photos. Your own photos, private to you (a private bucket, one folder per user). Add one with
// the camera or from the gallery; the first and the latest sit side by side with the days and kilos between them.

const G = COLORS.green;

export default function ProgressPhotosScreen() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { userId } = useAppState();
  const [photos, setPhotos] = useState<ProgressPhoto[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const list = await listProgressPhotos(userId);
    setUrls(await signedProgressUrls(list.map((p) => p.path)));
    setPhotos(list);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const add = async (source: 'camera' | 'library') => {
    if (!userId || busy) return;
    const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.show({ message: `Allow ${source === 'camera' ? 'the camera' : 'photo access'} to add a photo` });
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', base64: true, quality: 0.6, allowsEditing: false };
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = res.canceled ? null : res.assets?.[0];
    if (!asset?.base64) return;
    setBusy(true);
    const profile = await getProfile(userId);
    const row = await addProgressPhoto(userId, asset.base64, asset.mimeType ?? 'image/jpeg', profile?.weight ?? null);
    setBusy(false);
    if (!row) {
      toast.show({ message: 'Could not save the photo. Check your connection and try again.' });
      return;
    }
    success();
    toast.show({ message: 'Photo added' });
    load();
  };

  const remove = (p: ProgressPhoto) => {
    Alert.alert('Delete this photo?', `${photoDateLabel(p.takenOn)}. It will be removed for good.`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          tick();
          if (await deleteProgressPhoto(p)) load();
          else toast.show({ message: 'Could not delete. Try again.' });
        },
      },
    ]);
  };

  const gap = 10;
  const cell = (width - 32 - gap * 2) / 3;
  const half = (width - 32 - gap) / 2;
  const first = photos && photos.length >= 2 ? photos[photos.length - 1] : null;
  const latest = photos && photos.length >= 2 ? photos[0] : null;
  const delta = first && latest && first.weightKg != null && latest.weightKg != null ? Math.round((latest.weightKg - first.weightKg) * 10) / 10 : null;

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, gap: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <BackTile onPress={() => router.back()} />
          <Display>Progress photos</Display>
        </View>

        <Text style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 20, fontFamily: BG[500] }}>Only you can see these. Same spot, same light, once a month works best.</Text>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button variant="primary" size="lg" fullWidth accent={G} accentDeep={COLORS.greenDeep} disabled={busy} onPress={() => add('camera')}>
              {busy ? 'Saving…' : 'Take a photo'}
            </Button>
          </View>
          <View style={{ flex: 1 }}>
            <Button variant="secondary" size="lg" fullWidth disabled={busy} onPress={() => add('library')}>
              From gallery
            </Button>
          </View>
        </View>

        {photos === null ? (
          <View style={{ flexDirection: 'row', gap }}>
            <Skeleton width={cell} height={cell * 1.3} borderRadius={14} />
            <Skeleton width={cell} height={cell * 1.3} borderRadius={14} />
            <Skeleton width={cell} height={cell * 1.3} borderRadius={14} />
          </View>
        ) : photos.length === 0 ? (
          <Surface radius={20} padding={22}>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Icon name="camera" size={28} color={COLORS.textMuted} />
              <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[700] }}>No photos yet</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 14, textAlign: 'center', fontFamily: BG[500] }}>Add your first one today. In a month you can put the two side by side.</Text>
            </View>
          </Surface>
        ) : (
          <>
            {first && latest ? (
              <Rise i={0}>
                <Surface radius={20} padding={14}>
                  <View style={{ flexDirection: 'row', gap }}>
                    {[first, latest].map((p, i) => (
                      <View key={p.id} style={{ width: half - 14 }}>
                        <Image source={{ uri: urls[p.path] }} style={{ width: half - 14, height: (half - 14) * 1.3, borderRadius: 12, backgroundColor: '#111' }} />
                        <Text style={{ color: COLORS.fg, fontSize: 13, marginTop: 6, fontFamily: BG[700] }}>{i === 0 ? 'First' : 'Latest'}</Text>
                        <Text style={{ color: COLORS.textMuted, fontSize: 12, fontFamily: BG[500] }}>
                          {photoDateLabel(p.takenOn)}
                          {p.weightKg != null ? ` · ${p.weightKg} kg` : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Text style={{ color: COLORS.fgGray, fontSize: 15, marginTop: 12, fontFamily: BG[600] }}>
                    {daysApart(first.takenOn, latest.takenOn)} days apart{delta != null && delta !== 0 ? `, ${delta > 0 ? '+' : ''}${delta} kg` : ''}
                  </Text>
                </Surface>
              </Rise>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
              {photos.map((p) => (
                <Pressable key={p.id} onLongPress={() => remove(p)} accessibilityRole="button" accessibilityLabel={`Photo from ${photoDateLabel(p.takenOn)}. Long press to delete.`} style={{ width: cell }}>
                  <Image source={{ uri: urls[p.path] }} style={{ width: cell, height: cell * 1.3, borderRadius: 14, backgroundColor: '#111' }} />
                  <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 4, fontFamily: BG[500] }}>{photoDateLabel(p.takenOn)}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ color: COLORS.textFaint, fontSize: 12, fontFamily: BG[500] }}>Long press a photo to delete it.</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}
