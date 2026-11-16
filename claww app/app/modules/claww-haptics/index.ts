import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

// The dial's haptics (see android/.../ClawwHapticsModule.kt). Optional on purpose: on iOS, on web, or in a build made
// before this module existed, `nativeHaptics` is null and lib/haptics.ts falls back to expo-haptics / Vibration.

export type DialHapticKind = 'tick' | 'major' | 'grab' | 'edge' | 'click';

export interface HapticCapabilities {
  sdk: number;
  hasVibrator: boolean;
  amplitudeControl: boolean;
  primitives: number[];
  effectTick: boolean;
  effectClick: boolean;
}

interface NativeModule {
  play(kind: DialHapticKind, intensity: number): void;
  capabilities(): HapticCapabilities;
}

export const nativeHaptics: NativeModule | null = Platform.OS === 'android' ? requireOptionalNativeModule<NativeModule>('ClawwHaptics') : null;
