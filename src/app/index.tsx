import { Redirect } from 'expo-router';

export default function Index() {
  // This file serves as the entry point and lets the root layout handle redirection.
  // By default, we redirect to onboarding, but the RootNavigator in _layout.tsx
  // will immediately override this with the correct destination based on session state.
  return <Redirect href="/(auth)/onboarding" />;
}
