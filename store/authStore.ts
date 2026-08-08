/**
 * Authentication & Role Management State Store
 * @module store/authStore
 */

import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabaseClient';
import { getUserRole, saveUserRole } from '@/services/authService';
import { UserRole } from '@/types/user';

type Role = UserRole | null;

interface AuthState {
  session: Session | null;
  user: User | null;
  role: Role;
  onboardingCompleted: boolean;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setRole: (role: Role) => Promise<void>;
  setOnboardingCompleted: (completed: boolean) => void;
  initialize: (session: Session | null, role: Role) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  role: null,
  onboardingCompleted: false,
  isLoading: true,

  setSession: (session) => set({ session, user: session?.user || null }),

  setRole: async (role) => {
    set({ role });
    if (role) {
      await AsyncStorage.setItem('trainr_role', role);
      let currentUser = get().user;
      if (!currentUser) {
        const { data } = await supabase.auth.getUser();
        currentUser = data?.user || null;
      }
      if (currentUser?.id && currentUser.email) {
        await saveUserRole(currentUser.id, currentUser.email, role);
      }
    } else {
      await AsyncStorage.removeItem('trainr_role');
    }
  },

  setOnboardingCompleted: (completed: boolean) => set({ onboardingCompleted: completed }),

  initialize: async (session, fallbackRole) => {
    let activeRole: Role = fallbackRole;
    let completed = false;

    if (session?.user?.id) {
      const res = await getUserRole(session.user.id);
      if (res.role) {
        activeRole = res.role;
        await AsyncStorage.setItem('trainr_role', res.role);
      }
      completed = res.onboardingCompleted;
    }
    set({
      session,
      user: session?.user || null,
      role: activeRole,
      onboardingCompleted: completed,
      isLoading: false,
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem('trainr_role');
    set({ session: null, user: null, role: null, onboardingCompleted: false });
  },
}));
