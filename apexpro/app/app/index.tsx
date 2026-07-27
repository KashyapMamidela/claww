import { Redirect } from 'expo-router';

// Redirect to the new auth welcome screen
// Replace with proper auth-gate logic later
export default function Index() {
  return <Redirect href="/screens/auth/welcome" />;
}

