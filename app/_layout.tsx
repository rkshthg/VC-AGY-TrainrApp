import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../lib/theme';

export default function RootLayout() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="nutrition/scan-meal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="nutrition/verify-meal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="workout/builder" options={{ presentation: 'modal' }} />
        <Stack.Screen name="workout/assign-modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="workout/active-session" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="clients/[clientId]" options={{ presentation: 'modal' }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
