import { create } from 'zustand';
import { Alert, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { queueOfflineTransaction } from '../lib/offlineSync';
import { useAuthStore } from './authStore';
import logger from '../lib/logger';
import { localDateStr, localDayRangeISO } from '../lib/dates';
import { needsUpload, uploadMedia, toDisplayUrls, deleteMedia } from '../lib/photoStorage';

export interface FoodItem {
  id?: string;
  name: string;
  quantity: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MealEntry {
  id: string;
  userId: string;
  dishName: string;
  category: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS';
  timestamp: string; // ISO string
  photoUrl?: string;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  items: FoodItem[];
}

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface NutritionState {
  selectedDate: string;
  macroTargets: MacroTargets;
  todayMeals: MealEntry[];
  allMeals: MealEntry[];
  isAnalyzing: boolean;
  isLoading: boolean;
  pendingScanResult: {
    dishName: string;
    category?: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS';
    items: FoodItem[];
    totalCalories: number;
    totalProteinG: number;
    totalCarbsG: number;
    totalFatG: number;
    photoUri?: string;
  } | null;

  fetchNutritionData: (userId: string, dateStr: string) => Promise<void>;
  fetchTodayMeals: (userId?: string) => Promise<void>;
  fetchAllMeals: (userId: string) => Promise<void>;
  setSelectedDate: (date: string) => void;
  setMacroTargets: (targets: MacroTargets) => void;
  saveMealEntry: (entry: Omit<MealEntry, 'id'>) => Promise<string>;
  deleteMealEntry: (id: string) => Promise<void>;
  setPendingScanResult: (result: NutritionState['pendingScanResult']) => void;
  clearPendingScanResult: () => void;
  reset: () => void;
}

const DEFAULT_MACRO_TARGETS: MacroTargets = { calories: 2500, protein: 75, carbs: 250, fat: 65 };


function mapMealRow(m: any): MealEntry {
  return {
    id: m.id,
    userId: m.user_id,
    dishName: m.dish_name,
    category: m.category as any,
    timestamp: m.created_at,
    photoUrl: m.photo_url,
    totalCalories: m.total_calories,
    totalProteinG: m.total_protein_g,
    totalCarbsG: m.total_carbs_g,
    totalFatG: m.total_fat_g,
    items: (m.meal_items || []).map((i: any) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      calories: i.calories,
      proteinG: i.protein_g,
      carbsG: i.carbs_g,
      fatG: i.fat_g,
    })),
  };
}

/** Map meal rows and swap stored photo refs for viewable URLs. */
export async function mapMealRows(rows: any[]): Promise<MealEntry[]> {
  const meals = rows.map(mapMealRow);
  const urls = await toDisplayUrls(meals.map((m) => m.photoUrl));
  return meals.map((m, i) => ({ ...m, photoUrl: urls[i] }));
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  selectedDate: localDateStr(),
  macroTargets: {
    calories: 2500,
    protein: 75,
    carbs: 250,
    fat: 65,
  },
  todayMeals: [],
  allMeals: [],
  isAnalyzing: false,
  isLoading: false,
  pendingScanResult: null,

  fetchNutritionData: async (userId: string, dateStr: string) => {
    set({ isLoading: true });
    try {
      // Local calendar day (not UTC) for "today"
      const { start, end } = localDayRangeISO(dateStr);

      const [mealsRes, targetsRes] = await Promise.all([
        supabase.from('meals').select('*, meal_items(*)').eq('user_id', userId)
          .gte('created_at', start)
          .lte('created_at', end),
        supabase.from('macro_targets').select('*').eq('user_id', userId).single()
      ]);

      const meals = await mapMealRows(mealsRes.data || []);

      const targets: MacroTargets = targetsRes.data ? {
         calories: targetsRes.data.calories,
         protein: targetsRes.data.protein_g,
         carbs: targetsRes.data.carbs_g,
         fat: targetsRes.data.fat_g
      } : get().macroTargets;

      set({ todayMeals: meals, macroTargets: targets, isLoading: false });
    } catch (e) {
      logger.warn('Failed to fetch nutrition data', e);
      set({ isLoading: false });
    }
  },

  fetchTodayMeals: async (targetUserId?: string) => {
    const userId = targetUserId || useAuthStore.getState().profile?.id;
    if (!userId) return;
    const todayStr = localDateStr();
    await get().fetchNutritionData(userId, todayStr);
  },

  fetchAllMeals: async (userId: string) => {
    try {
      const mealsRes = await supabase
        .from('meals')
        .select('*, meal_items(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      const meals = await mapMealRows(mealsRes.data || []);

      set({ allMeals: meals });
    } catch (e) {
      logger.warn('Failed to fetch all meals:', e);
    }
  },

  setSelectedDate: (selectedDate) => set({ selectedDate }),
  
  setMacroTargets: async (macroTargets) => {
    set({ macroTargets });
    const userId = useAuthStore.getState().profile?.id;
    if (userId) {
       supabase.from('macro_targets').upsert({
         user_id: userId,
         calories: macroTargets.calories,
         protein_g: macroTargets.protein,
         carbs_g: macroTargets.carbs,
         fat_g: macroTargets.fat,
         updated_at: new Date().toISOString()
       }, { onConflict: 'user_id' }).then();
    }
  },

  saveMealEntry: async (entryData) => {
    const tempId = 'meal_' + Date.now();
    const newEntry: MealEntry = {
      ...entryData,
      id: tempId,
    };
    set((state) => ({
      todayMeals: [newEntry, ...state.todayMeals],
      allMeals: [newEntry, ...state.allMeals],
      pendingScanResult: null,
    }));

    const mealPayload = {
      user_id: entryData.userId,
      dish_name: entryData.dishName,
      category: entryData.category,
      photo_url: entryData.photoUrl as string | undefined,
      total_calories: entryData.totalCalories,
      total_protein_g: entryData.totalProteinG,
      total_carbs_g: entryData.totalCarbsG,
      total_fat_g: entryData.totalFatG,
      created_at: entryData.timestamp
    };

    try {
      // Upload the photo first so the saved row points at cloud storage,
      // not a file that only exists on this phone.
      if (needsUpload(mealPayload.photo_url)) {
        try {
          mealPayload.photo_url = await uploadMedia(mealPayload.photo_url, 'meals');
        } catch (uploadErr) {
          logger.warn('Meal photo upload failed, queuing offline:', uploadErr);
          queueOfflineTransaction('LOG_MEAL', { ...mealPayload, items: entryData.items, temp_id: tempId });
          return tempId;
        }
      }

      const { data, error } = await supabase.from('meals').insert(mealPayload).select('id').single();
      if (error || !data) {
        logger.warn('Failed to insert meal into Supabase, queuing offline:', error);
        queueOfflineTransaction('LOG_MEAL', { ...mealPayload, items: entryData.items, temp_id: tempId });
        return tempId;
      }

      const realId = data.id;
      // Swap temporary ID with server UUID so deletes/updates find the row
      set((state) => ({
        todayMeals: state.todayMeals.map((m) => (m.id === tempId ? { ...m, id: realId } : m)),
        allMeals: state.allMeals.map((m) => (m.id === tempId ? { ...m, id: realId } : m)),
      }));

      if (entryData.items && entryData.items.length > 0) {
        const itemsPayload = entryData.items.map(item => ({
          meal_id: realId,
          name: item.name,
          quantity: item.quantity,
          calories: item.calories,
          protein_g: item.proteinG,
          carbs_g: item.carbsG,
          fat_g: item.fatG
        }));
        const { error: itemsError } = await supabase.from('meal_items').insert(itemsPayload);
        if (itemsError) {
          logger.warn('Failed to insert meal items:', itemsError);
        }
      }

      return realId;
    } catch (e) {
      logger.error('Exception in saveMealEntry:', e);
      queueOfflineTransaction('LOG_MEAL', { ...mealPayload, items: entryData.items, temp_id: tempId });
      return tempId;
    }
  },

  deleteMealEntry: async (id: string) => {
    const prevToday = get().todayMeals;
    const prevAll = get().allMeals;
    const photo = [...prevToday, ...prevAll].find((m) => m.id === id)?.photoUrl;

    // Optimistically update
    set((state) => ({
      todayMeals: state.todayMeals.filter((m) => m.id !== id),
      allMeals: state.allMeals.filter((m) => m.id !== id),
    }));

    // Remove from trainer live feed if present
    try {
      const { useTrainerStore } = require('./trainerStore');
      useTrainerStore.getState().removeFeedEventsByMealId(id);
    } catch (e) {
      // ignore
    }

    if (id.startsWith('meal_')) {
      // Local/offline-only entry, already removed from local state
      return;
    }

    try {
      const { error } = await supabase.from('meals').delete().eq('id', id);
      if (!error) deleteMedia(photo);
      if (error) {
        logger.error('Failed to delete meal from Supabase:', error);
        // Rollback state if delete failed
        set({ todayMeals: prevToday, allMeals: prevAll });
        if (Platform.OS === 'web') {
          alert('Failed to delete meal. Please try again.');
        } else {
          Alert.alert('Delete Failed', 'Failed to delete meal from server. Please check your connection.');
        }
      }
    } catch (e) {
      logger.error('Exception deleting meal:', e);
      set({ todayMeals: prevToday, allMeals: prevAll });
    }
  },


  setPendingScanResult: (pendingScanResult) => set({ pendingScanResult }),
  clearPendingScanResult: () => set({ pendingScanResult: null }),

  reset: () =>
    set({
      selectedDate: localDateStr(),
      macroTargets: { ...DEFAULT_MACRO_TARGETS },
      todayMeals: [],
      allMeals: [],
      isAnalyzing: false,
      isLoading: false,
      pendingScanResult: null,
    }),
}));
