/**
 * Body Metrics & Progress Check-In State Store
 * @module store/progressStore
 */

import { create } from 'zustand';
import { saveProgressCheckIn, fetchUserProgressCheckIns } from '@/services/progressService';
import { BodyCheckIn } from '@/types/progress';

export type { BodyCheckIn };

interface ProgressState {
  checkIns: BodyCheckIn[];
  isLoading: boolean;
  fetchCheckIns: (userId: string) => Promise<void>;
  addCheckIn: (checkIn: Omit<BodyCheckIn, 'id'>, userId?: string) => Promise<void>;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  checkIns: [],
  isLoading: false,

  fetchCheckIns: async (userId: string) => {
    if (!userId) return;
    set({ isLoading: true });
    const dbCheckIns = await fetchUserProgressCheckIns(userId);
    const formatted: BodyCheckIn[] = (dbCheckIns || []).map((c) => ({
      id: c.id || Math.random().toString(),
      date: c.check_in_date,
      weight_kg: c.weight_kg,
      body_fat_percentage: c.body_fat_pct,
      waist_cm: c.waist_cm,
      chest_cm: c.chest_cm,
      bicep_cm: c.bicep_cm,
      hip_cm: c.hip_cm,
      notes: c.notes,
      bmi: c.bmi,
      ffmi: c.ffmi,
      is_starred: c.is_starred,
    }));
    set({ checkIns: formatted, isLoading: false });
  },

  addCheckIn: async (data, userId) => {
    const tempId = Math.random().toString(36).substring(2, 9);
    const newCheckIn: BodyCheckIn = { ...data, id: tempId };

    set((state) => ({ checkIns: [newCheckIn, ...state.checkIns] }));

    if (userId && userId !== 'current_user') {
      await saveProgressCheckIn({
        user_id: userId,
        check_in_date: data.date,
        weight_kg: data.weight_kg,
        body_fat_pct: data.body_fat_percentage,
        bmi: data.bmi,
        ffmi: data.ffmi,
        photo_uri: data.photo_url,
        notes: data.notes,
      });
    }
  },
}));
