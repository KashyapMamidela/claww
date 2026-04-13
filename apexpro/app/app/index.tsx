import { Redirect } from 'expo-router';

// Temporarily redirect to onboarding for UI testing.
// Replace with auth-gate logic once authentication is wired up.
export default function Index() {
  return <Redirect href="/onboarding" />;
}

