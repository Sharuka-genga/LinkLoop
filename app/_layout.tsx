import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BG } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/auth-context';

const LinkLoopDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: BG.main,
    card: BG.card,
    border: BG.border,
    primary: '#818CF8',
    text: '#F1F5F9',
  },
};

function RootNavigator() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  // Read the onboarding flag from AsyncStorage once on mount
  useEffect(() => {
    AsyncStorage.getItem('hasSeenOnboarding').then((value) => {
      setHasSeenOnboarding(value === 'true');
      setOnboardingChecked(true);
    });
  }, []);

  useEffect(() => {
    if (loading || !onboardingChecked) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session) {
      // First-time user → show onboarding, then login
      if (!hasSeenOnboarding && !inAuthGroup) {
        router.replace('/(auth)/onboarding' as any);
      } else if (hasSeenOnboarding && !inAuthGroup) {
        // Returning but not logged in → skip onboarding, go to login
        router.replace('/(auth)/login' as any);
      }
    } else if (session && inAuthGroup) {
      // Logged-in user → skip onboarding, go to tabs (interests must be selected)
      const hasCompletedOnboarding =
        profile?.interests && profile.interests.length > 0;
      if (hasCompletedOnboarding) {
        router.replace('/(tabs)' as any);
      }
    }
  }, [session, profile, loading, segments, onboardingChecked, hasSeenOnboarding]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={LinkLoopDark}>
        <RootNavigator />
        <StatusBar style="light" />
      </ThemeProvider>
    </AuthProvider>
  );
}
