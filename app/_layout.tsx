import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';

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

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login' as any);
    } else if (session && inAuthGroup) {
      // Only redirect to tabs after onboarding is complete (interests selected).
      // New users need to pick interests first.
      const hasCompletedOnboarding =
        profile?.interests && profile.interests.length > 0;
      if (hasCompletedOnboarding) {
        router.replace('/(tabs)' as any);
      }
    }
  }, [session, profile, loading, segments]);

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
