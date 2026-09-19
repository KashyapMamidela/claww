import { Redirect } from 'expo-router';

/**
 * Entry point kept at this path so existing `router.push('/workout-setup')`
 * call sites don't need to change. The actual multi-step flow lives under
 * `screens/workout-setup/*` (see Phase 5.1) — no data to prefetch here, so
 * this is a plain redirect with nothing to render in between.
 */
export default function WorkoutSetupEntry() {
  return <Redirect href="/screens/workout-setup/basics" />;
}
