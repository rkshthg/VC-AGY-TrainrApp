/**
 * Light / Dark Mode Theme Store
 * @module store/themeStore
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'dark' | 'light';

interface ThemeState {
  theme: ThemeMode;
  toggleTheme: () => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark', // default to dark theme

  toggleTheme: async () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    set({ theme: nextTheme });
    await AsyncStorage.setItem('trainr_theme', nextTheme);
  },

  setTheme: async (theme) => {
    set({ theme });
    await AsyncStorage.setItem('trainr_theme', theme);
  },

  loadTheme: async () => {
    const saved = await AsyncStorage.getItem('trainr_theme');
    if (saved === 'light' || saved === 'dark') {
      set({ theme: saved });
    }
  },
}));
