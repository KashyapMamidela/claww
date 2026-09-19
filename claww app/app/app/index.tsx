// No content of its own — the root layout's auth-state effect (see
// _layout.tsx) always replaces this route with welcome/onboarding/(tabs)
// once the session check resolves, so this never stays on screen.
export default function Index() {
  return null;
}
