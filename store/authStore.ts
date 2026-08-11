import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: 'CLIENT' | 'TRAINER';
  trainerCode?: string; // e.g. TR-8942 for Trainers
  linkedTrainerId?: string; // For Clients
  heightCm?: number;
  weightKg?: number;
  dob?: string;
  sex?: 'MALE' | 'FEMALE' | 'OTHER';
  activityLevel?: 'SEDENTARY' | 'LIGHTLY_ACTIVE' | 'MODERATELY_ACTIVE' | 'VERY_ACTIVE' | 'EXTRA_ACTIVE';
  goals?: string[]; // e.g. ['FAT_LOSS', 'MUSCLE_GAIN']
  macroTargets?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  bodyMeasurements?: {
    neckCm?: number;
    shouldersCm?: number;
    chestCm?: number;
    waistCm?: number;
    hipsCm?: number;
    bicepsCm?: number;
    thighsCm?: number;
  };
  themeMode?: 'LIGHT' | 'DARK' | 'SYSTEM';
  unitSystem?: 'METRIC' | 'IMPERIAL';
  isOnboarded?: boolean;
}

interface AuthState {
  session: any | null;
  profile: UserProfile | null;
  role: 'CLIENT' | 'TRAINER';
  trainerCode: string | null;
  linkedTrainerId: string | null;
  themeMode: 'LIGHT' | 'DARK' | 'SYSTEM';
  unitSystem: 'METRIC' | 'IMPERIAL';
  isOnboarded: boolean;
  isLoading: boolean;

  setSession: (session: any) => void;
  setProfile: (profile: UserProfile) => void;
  setRole: (role: 'CLIENT' | 'TRAINER') => void;
  setThemeMode: (mode: 'LIGHT' | 'DARK' | 'SYSTEM') => void;
  setUnitSystem: (system: 'METRIC' | 'IMPERIAL') => void;
  generateTrainerCode: () => string;
  linkTrainer: (code: string) => Promise<boolean>;
  unlinkTrainer: () => Promise<boolean>;
  completeOnboarding: (data: Partial<UserProfile>) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  role: 'CLIENT',
  trainerCode: null,
  linkedTrainerId: null,
  themeMode: 'DARK',
  unitSystem: 'METRIC',
  isOnboarded: false,
  isLoading: false,

  setSession: (session) => set({ session }),
  setProfile: (profile) =>
    set({
      profile,
      role: profile.role || 'CLIENT',
      trainerCode: profile.trainerCode || null,
      linkedTrainerId: profile.linkedTrainerId || null,
      isOnboarded: profile.isOnboarded || false,
    }),
  setRole: (role) => set({ role }),
  setThemeMode: (themeMode) => set({ themeMode }),
  setUnitSystem: (unitSystem) => set({ unitSystem }),

  generateTrainerCode: () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'TR-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    set({ trainerCode: code });
    return code;
  },

  linkTrainer: async (code: string) => {
    try {
      const dummyTrainerId = 'trainer_' + code.toLowerCase();
      const currentProfile = get().profile;
      if (currentProfile) {
        const updatedProfile = { ...currentProfile, linkedTrainerId: dummyTrainerId };
        set({ profile: updatedProfile, linkedTrainerId: dummyTrainerId });
      }
      return true;
    } catch (e) {
      console.error('Failed to link trainer:', e);
      return false;
    }
  },

  unlinkTrainer: async () => {
    try {
      const currentProfile = get().profile;
      if (currentProfile) {
        const updatedProfile = { ...currentProfile, linkedTrainerId: undefined };
        set({ profile: updatedProfile, linkedTrainerId: null });
      }
      return true;
    } catch (e) {
      console.error('Failed to unlink trainer:', e);
      return false;
    }
  },

  completeOnboarding: async (data: Partial<UserProfile>) => {
    try {
      const currentProfile = get().profile || { id: 'usr_1', email: 'user@trainr.app', fullName: 'User' };
      const isTrainer = data.role === 'TRAINER';
      const trainerCode = isTrainer ? (get().trainerCode || get().generateTrainerCode()) : undefined;

      const finalProfile: UserProfile = {
        ...currentProfile,
        ...data,
        role: data.role || 'CLIENT',
        trainerCode,
        linkedTrainerId: (currentProfile as UserProfile).linkedTrainerId || get().linkedTrainerId || undefined,
        isOnboarded: true,
      };

      set({
        profile: finalProfile,
        role: finalProfile.role,
        trainerCode: finalProfile.trainerCode || null,
        linkedTrainerId: finalProfile.linkedTrainerId || null,
        isOnboarded: true,
      });

      return true;
    } catch (e) {
      console.error('Failed onboarding completion:', e);
      return false;
    }
  },

  signInWithGoogle: async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'trainr://(auth)/onboarding',
        },
      });
      if (error) {
        console.warn('Supabase OAuth notice:', error.message);
      }
      const googleProfile: UserProfile = {
        id: 'google_usr_' + Date.now(),
        email: 'alex.google@example.com',
        fullName: 'Alex Morgan',
        role: 'CLIENT',
        isOnboarded: false,
      };
      set({
        profile: googleProfile,
        role: 'CLIENT',
        isOnboarded: false,
      });
      return true;
    } catch (e) {
      console.error('Google Auth Error:', e);
      return false;
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
    set({
      session: null,
      profile: null,
      role: 'CLIENT',
      trainerCode: null,
      linkedTrainerId: null,
      isOnboarded: false,
    });
  },
}));
