import { create } from 'zustand';

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
  isAnalyzing: boolean;
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
    calories: 2200,
    protein: 150,
    carbs: 220,
    fat: 70,
  },
  todayMeals: [
    {
      id: 'meal_breakfast_1',
      userId: 'usr_1',
      dishName: 'Breakfast',
      category: 'BREAKFAST',
      timestamp: new Date().toISOString(),
      totalCalories: 440,
      totalProteinG: 35,
      totalCarbsG: 48,
      totalFatG: 7,
      items: [
        {
          id: 'item_1',
          name: 'Oatmeal with Berries',
          quantity: '150g',
          calories: 320,
          proteinG: 10,
          carbsG: 45,
          fatG: 5,
        },
        {
          id: 'item_2',
          name: 'Protein Shake',
          quantity: '1 scoop',
          calories: 120,
          proteinG: 25,
          carbsG: 3,
          fatG: 2,
        },
      ],
    },
    {
      id: 'meal_lunch_1',
      userId: 'usr_1',
      dishName: 'Lunch',
      category: 'LUNCH',
      timestamp: new Date().toISOString(),
      totalCalories: 500,
      totalProteinG: 24,
      totalCarbsG: 44,
      totalFatG: 20,
      items: [
        {
          id: 'item_3',
          name: 'Paneer Butter Masala',
          quantity: '200g',
          calories: 340,
          proteinG: 19.8,
          carbsG: 14,
          fatG: 18.2,
        },
        {
          id: 'item_4',
          name: 'Wheat Chapati',
          quantity: '2 pieces (60g)',
          calories: 160,
          proteinG: 4.2,
          carbsG: 30,
          fatG: 1.8,
        },
      ],
    },
  ],
  isAnalyzing: false,
  pendingScanResult: null,

  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setMacroTargets: (macroTargets) => set({ macroTargets }),

  saveMealEntry: (entryData) => {
    const newEntry: MealEntry = {
      ...entryData,
      id: 'meal_' + Date.now(),
    };
    set((state) => ({
      todayMeals: [newEntry, ...state.todayMeals],
      pendingScanResult: null,
    }));
  },

  deleteMealEntry: (id) =>
    set((state) => ({
      todayMeals: state.todayMeals.filter((m) => m.id !== id),
    })),

  setPendingScanResult: (pendingScanResult) => set({ pendingScanResult }),
  clearPendingScanResult: () => set({ pendingScanResult: null }),
}));
