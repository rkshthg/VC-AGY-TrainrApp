/**
 * Nutrition & AI Meal Vision Domain Types
 * @module types/nutrition
 */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealEntry {
  id: string;
  user_id: string;
  date: string;
  logged_time?: string;
  created_at?: string;
  meal_type: MealType;
  meal_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  image_url?: string;
  ai_generated?: boolean;
  analysis_source?: 'cloud_ai' | 'local_ai';
}

export interface DBMealEntry {
  id?: string;
  user_id: string;
  logged_date: string;
  logged_time?: string;
  created_at?: string;
  meal_type: MealType;
  meal_name: string;
  image_url?: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  ai_generated?: boolean;
}

export interface MacroTarget {
  user_id: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MealVisionResult {
  meal_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  analysis_source?: 'cloud_ai' | 'local_ai';
}
