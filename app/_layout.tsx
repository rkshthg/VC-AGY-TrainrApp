import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';

export default function RootLayout() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F172A' } }}>
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
    backgroundColor: '#0F172A',
  },
});
