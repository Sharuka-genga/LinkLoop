import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import NavBar from '@/components/nav-bar';
import { BG } from '@/constants/theme';

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: BG.main }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="bookings" />
        <Tabs.Screen name="sos" />
        <Tabs.Screen name="activities" />
        <Tabs.Screen name="profile" />
        <Tabs.Screen name="explore" options={{ href: null }} />
      </Tabs>
      <NavBar />
    </View>
  );
}
