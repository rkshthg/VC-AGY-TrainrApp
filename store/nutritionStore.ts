/**
 * Nutrition & Daily Meal Tracking State Store
 * @module store/nutritionStore
 */

import { create } from 'zustand';
import { fetchUserMeals, saveMealEntry } from '@/services/nutritionService';
import { analyzeMealImage } from '@/lib/aiVision';
import { MealEntry, MacroTarget } from '@/types/nutrition';

interface NutritionState {
  target: MacroTarget;
  meals: MealEntry[];
  isLoadingMeals: boolean;
  isAnalyzing: boolean;
  fetchMeals: (userId: string, date?: string) => Promise<void>;
  addMeal: (meal: Omit<MealEntry, 'id'>) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  setTarget: (target: MacroTarget) => void;
  analyzeMealPhoto: (photoUri: string, base64Data?: string, userNotes?: string) => Promise<Omit<MealEntry, 'id' | 'user_id' | 'date'>>;
}

const DEFAULT_MOCK_MEALS: MealEntry[] = [
  {
    id: 'm1',
    user_id: 'user1',
    date: new Date().toISOString().split('T')[0],
    logged_time: '08:30 AM',
    meal_type: 'breakfast',
    meal_name: 'Oatmeal with Blueberries & Whey Protein',
    calories: 450,
    protein_g: 35,
    carbs_g: 55,
    fat_g: 8,
    ai_generated: true,
  },
  {
    id: 'm2',
    user_id: 'user1',
    date: new Date().toISOString().split('T')[0],
    logged_time: '01:45 PM',
    meal_type: 'lunch',
    meal_name: 'Kerala Parotta & Beef Roast',
    calories: 680,
    protein_g: 38,
    carbs_g: 78,
    fat_g: 28,
    ai_generated: true,
    analysis_source: 'cloud_ai',
  },
];

export const useNutritionStore = create<NutritionState>((set, get) => ({
  target: {
    user_id: 'user1',
    calories: 2200,
    protein_g: 165,
    carbs_g: 220,
    fat_g: 70,
  },
  meals: [],
  isLoadingMeals: false,
  isAnalyzing: false,

  fetchMeals: async (userId, dateStr) => {
    if (!userId) return;
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    set({ isLoadingMeals: true });
    const dbMeals = await fetchUserMeals(userId, targetDate);

    const formatted: MealEntry[] = (dbMeals || []).map((m) => ({
      id: m.id || Math.random().toString(),
      user_id: m.user_id,
      date: m.logged_date,
      logged_time: m.logged_time || 'Logged',
      meal_type: m.meal_type,
      meal_name: m.meal_name,
      calories: m.calories,
      protein_g: m.protein_g,
      carbs_g: m.carbs_g,
      fat_g: m.fat_g,
      image_url: m.image_url,
      ai_generated: m.ai_generated,
    }));
    set({ meals: formatted, isLoadingMeals: false });
  },

  addMeal: async (mealData) => {
    const tempId = Math.random().toString(36).substring(2, 9);
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMeal: MealEntry = { ...mealData, logged_time: nowTimeStr, id: tempId };

    set((state) => ({ meals: [newMeal, ...state.meals] }));

    if (mealData.user_id && mealData.user_id !== 'current_user') {
      const saved = await saveMealEntry({
        user_id: mealData.user_id,
        logged_date: mealData.date,
        meal_type: mealData.meal_type,
        meal_name: mealData.meal_name,
        calories: mealData.calories,
        protein_g: mealData.protein_g,
        carbs_g: mealData.carbs_g,
        fat_g: mealData.fat_g,
        image_url: mealData.image_url,
        ai_generated: mealData.ai_generated,
      });

      if (saved?.id) {
        set((state) => ({
          meals: state.meals.map((m) => (m.id === tempId ? { ...m, id: saved.id!, logged_time: saved.logged_time || nowTimeStr } : m)),
        }));
      }
    }
  },

  deleteMeal: async (id) => {
    set((state) => ({ meals: state.meals.filter((m) => m.id !== id) }));
  },

  setTarget: (target) => set({ target }),

  analyzeMealPhoto: async (photoUri, base64Data, userNotes) => {
    set({ isAnalyzing: true });
    try {
      const result = await analyzeMealImage(photoUri, base64Data, userNotes);
      set({ isAnalyzing: false });
      return {
        meal_type: 'lunch',
        meal_name: result.meal_name,
        calories: result.calories,
        protein_g: result.protein_g,
        carbs_g: result.carbs_g,
        fat_g: result.fat_g,
        image_url: photoUri,
        ai_generated: true,
        analysis_source: result.analysis_source,
      };
    } catch (err) {
      console.error('[nutritionStore] Error analyzing meal photo:', err);
      set({ isAnalyzing: false });
      return {
        meal_type: 'lunch',
        meal_name: 'Logged Meal',
        calories: 500,
        protein_g: 30,
        carbs_g: 50,
        fat_g: 15,
        image_url: photoUri,
        ai_generated: true,
      };
    }
  },
}));
