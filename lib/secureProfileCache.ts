/**
 * Secure Profile Cache for Trainr
 *
 * Uses expo-secure-store (hardware-backed encryption) on native platforms
 * to cache user profile data. Falls back to AsyncStorage only on web
 * where the browser security model is different.
 *
 * Handles expo-secure-store's ~2KB value size limit by chunking large
 * profile payloads across multiple secure keys.
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from './logger';

const PROFILE_KEY = '@trainr_profile';
const PROFILE_CHUNKS_COUNT_KEY = '@trainr_profile_chunks';
const CHUNK_SIZE = 1800; // Stay under SecureStore's ~2KB limit

/**
 * Store a profile object securely.
 * Native: uses expo-secure-store with chunking for large values.
 * Web: uses AsyncStorage (acceptable for web security model).
 */
export async function secureSetProfile(profile: any): Promise<void> {
  const json = JSON.stringify(profile);

  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(PROFILE_KEY, json);
    return;
  }

  try {
    if (json.length <= CHUNK_SIZE) {
      // Single chunk — store directly
      await SecureStore.setItemAsync(PROFILE_KEY, json, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      });
      // Clear any previous chunk data
      await _clearChunks();
    } else {
      // Multi-chunk — split and store each piece
      const chunks = _splitIntoChunks(json, CHUNK_SIZE);
      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(`${PROFILE_KEY}_chunk_${i}`, chunks[i], {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
        });
      }
      await SecureStore.setItemAsync(PROFILE_CHUNKS_COUNT_KEY, String(chunks.length), {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      });
      // Clear the single-key entry if it existed
      await SecureStore.deleteItemAsync(PROFILE_KEY).catch(() => {});
    }
  } catch (e) {
    logger.warn('SecureStore: Failed to cache profile securely', e);
    // Do NOT fall back to AsyncStorage — this is a security-critical path.
    // The app will still work, it just won't have a cached profile on next cold start.
  }
}

/**
 * Retrieve the cached profile object.
 * Native: reads from expo-secure-store (single or chunked).
 * Web: reads from AsyncStorage.
 */
export async function secureGetProfile(): Promise<any | null> {
  if (Platform.OS === 'web') {
    const data = await AsyncStorage.getItem(PROFILE_KEY);
    return data ? JSON.parse(data) : null;
  }

  try {
    // Try single-key read first
    const single = await SecureStore.getItemAsync(PROFILE_KEY);
    if (single) {
      return JSON.parse(single);
    }

    // Try chunked read
    const countStr = await SecureStore.getItemAsync(PROFILE_CHUNKS_COUNT_KEY);
    if (countStr) {
      const count = parseInt(countStr, 10);
      let assembled = '';
      for (let i = 0; i < count; i++) {
        const chunk = await SecureStore.getItemAsync(`${PROFILE_KEY}_chunk_${i}`);
        if (chunk) {
          assembled += chunk;
        } else {
          logger.warn(`SecureStore: Missing profile chunk ${i}, cache is corrupt`);
          return null;
        }
      }
      return JSON.parse(assembled);
    }

    return null;
  } catch (e) {
    logger.warn('SecureStore: Failed to read cached profile', e);
    return null;
  }
}

/**
 * Remove the cached profile from secure storage.
 */
export async function secureRemoveProfile(): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(PROFILE_KEY);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(PROFILE_KEY).catch(() => {});
    await _clearChunks();
  } catch (e) {
    logger.warn('SecureStore: Failed to remove cached profile', e);
  }
}

// --- Internal helpers ---

function _splitIntoChunks(str: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks;
}

async function _clearChunks(): Promise<void> {
  try {
    const countStr = await SecureStore.getItemAsync(PROFILE_CHUNKS_COUNT_KEY);
    if (countStr) {
      const count = parseInt(countStr, 10);
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(`${PROFILE_KEY}_chunk_${i}`).catch(() => {});
      }
      await SecureStore.deleteItemAsync(PROFILE_CHUNKS_COUNT_KEY).catch(() => {});
    }
  } catch {
    // Best-effort cleanup
  }
}
