import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import logger from './logger';

// Custom Storage adapter using expo-secure-store for native platforms (iOS/Android)
// with safe fallback to AsyncStorage for Web only.
// SECURITY: On native platforms, auth tokens are NEVER stored in unencrypted storage.
const LargeSecureStore = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      });
    } catch (e) {
      // SECURITY: Do NOT fall back to AsyncStorage for auth tokens on native.
      // AsyncStorage is unencrypted and readable via file system inspection on
      // rooted/jailbroken devices. If SecureStore fails (e.g. value exceeds
      // ~2KB limit), we surface the error but do not store the token insecurely.
      logger.error('SecureStore setItem failed — token NOT stored (security policy)', e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Best-effort cleanup
      logger.warn('SecureStore removeItem failed for key:', key);
    }
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'trainr',
  },
  auth: {
    storage: LargeSecureStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
