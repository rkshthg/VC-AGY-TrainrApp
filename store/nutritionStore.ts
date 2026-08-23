import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { queueOfflineTransaction } from '../lib/offlineSync';
import { useAuthStore } from './authStore';
import logger from '../lib/logger';

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
  saveMealEntry: (entry: Omit<MealEntry, 'id'>) => void;
  deleteMealEntry: (id: string) => void;
  setPendingScanResult: (result: NutritionState['pendingScanResult']) => void;
  clearPendingScanResult: () => void;
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  selectedDate: new Date().toISOString().split('T')[0],
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
      // Create a date range for "today"
      const startOfDay = new Date(dateStr);
      startOfDay.setHours(0,0,0,0);
      const endOfDay = new Date(dateStr);
      endOfDay.setHours(23,59,59,999);

      const [mealsRes, targetsRes] = await Promise.all([
        supabase.from('meals').select('*, meal_items(*)').eq('user_id', userId)
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString()),
        supabase.from('macro_targets').select('*').eq('user_id', userId).single()
      ]);

      const meals: MealEntry[] = (mealsRes.data || []).map(m => ({
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
           fatG: i.fat_g
        }))
      }));

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
    const todayStr = new Date().toISOString().split('T')[0];
    await get().fetchNutritionData(userId, todayStr);
  },

  fetchAllMeals: async (userId: string) => {
    try {
      const mealsRes = await supabase
        .from('meals')
        .select('*, meal_items(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      const meals: MealEntry[] = (mealsRes.data || []).map((m) => ({
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
      }));

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
    const newEntry: MealEntry = {
      ...entryData,
      id: 'meal_' + Date.now(),
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
      photo_url: entryData.photoUrl,
      total_calories: entryData.totalCalories,
      total_protein_g: entryData.totalProteinG,
      total_carbs_g: entryData.totalCarbsG,
      total_fat_g: entryData.totalFatG,
      created_at: entryData.timestamp
    };

    supabase.from('meals').insert(mealPayload).select('id').single()
      .then(({ data, error }) => {
        if (error) {
           queueOfflineTransaction('LOG_MEAL', { ...mealPayload, items: entryData.items });
        } else if (data && entryData.items.length > 0) {
           const itemsPayload = entryData.items.map(item => ({
             meal_id: data.id,
             name: item.name,
             quantity: item.quantity,
             calories: item.calories,
             protein_g: item.proteinG,
             carbs_g: item.carbsG,
             fat_g: item.fatG
           }));
           supabase.from('meal_items').insert(itemsPayload).then();
        }
      });
  },

  deleteMealEntry: (id) => {
    set((state) => ({
      todayMeals: state.todayMeals.filter((m) => m.id !== id),
      allMeals: state.allMeals.filter((m) => m.id !== id),
    }));
    supabase.from('meals').delete().eq('id', id).then();
  },

  setPendingScanResult: (pendingScanResult) => set({ pendingScanResult }),
  clearPendingScanResult: () => set({ pendingScanResult: null }),
}));
