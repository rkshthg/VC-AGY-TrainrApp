/**
 * Over-the-air (EAS Update) banner.
 *
 * The app checks for an update every time it starts (expo-updates "ON_LOAD"),
 * and again here when it comes back to the foreground. A downloaded update
 * normally applies on the next cold start; this banner lets the user restart
 * straight away instead.
 */
import React, { useEffect, useRef } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import { useTheme } from '../lib/theme';
import logger from '../lib/logger';

const FOREGROUND_CHECK_INTERVAL_MS = 30 * 60 * 1000;

export default function UpdateBanner() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isUpdatePending } = Updates.useUpdates();
  const lastCheck = useRef(Date.now());

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active' || Date.now() - lastCheck.current < FOREGROUND_CHECK_INTERVAL_MS) return;
      lastCheck.current = Date.now();
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) await Updates.fetchUpdateAsync();
      } catch (e) {
        // Offline or the update server is unreachable; try again next time.
        logger.warn('Update check failed:', e);
      }
    });
    return () => sub.remove();
  }, []);

  if (!isUpdatePending) return null;

  return (
    <View
      style={[styles.banner, theme.shadow, { backgroundColor: theme.primary, bottom: insets.bottom + 72 }]}
      accessibilityRole="alert"
    >
      <Text style={[styles.text, { color: theme.bg }]}>A new version of Trainr is ready.</Text>
      <Pressable
        onPress={() => Updates.reloadAsync().catch((e) => logger.error('Update reload failed', e))}
        style={[styles.button, { backgroundColor: theme.bg }]}
        accessibilityRole="button"
        accessibilityLabel="Restart to update"
        hitSlop={8}
      >
        <Text style={[styles.buttonText, { color: theme.primary }]}>Restart</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  // Colors come from the theme: page-background text on the primary color, and the reverse for the button.
  text: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  button: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  buttonText: { fontSize: 14, fontWeight: '700' },
});
