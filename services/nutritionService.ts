/**
 * Nutrition & Meal Management Service
 * @module services/nutritionService
 */

import { supabase } from '@/lib/supabaseClient';
import { DBMealEntry } from '@/types/nutrition';

/**
 * Fetch user meal entries for a specific date
 */
export async function fetchUserMeals(userId: string, date: string): Promise<DBMealEntry[]> {
  try {
    const { data, error } = await supabase
      .from('meal_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('logged_date', date)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((m: any) => {
      const createdAtDate = m.created_at ? new Date(m.created_at) : new Date();
      const timeStr = createdAtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        ...m,
        calories: m.calories_kcal ?? m.calories ?? 0,
        logged_time: timeStr,
      };
    }) as DBMealEntry[];
  } catch (err) {
    console.error('[nutritionService] Error fetching user meals:', err);
    return [];
  }
}

/**
 * Save new meal entry to Supabase DB with fallback column handling
 */
export async function saveMealEntry(mealData: DBMealEntry): Promise<DBMealEntry | null> {
  try {
    const payload: any = {
      user_id: mealData.user_id,
      logged_date: mealData.logged_date,
      meal_type: mealData.meal_type,
      meal_name: mealData.meal_name,
      image_url: mealData.image_url || null,
      calories_kcal: mealData.calories,
      protein_g: mealData.protein_g,
      carbs_g: mealData.carbs_g,
      fat_g: mealData.fat_g,
      ai_generated: mealData.ai_generated ?? true,
    };

    let { data, error } = await supabase
      .from('meal_entries')
      .insert(payload)
      .select('*')
      .single();

    if (error && (error.message?.includes('calories_kcal') || error.message?.includes('schema cache'))) {
      delete payload.calories_kcal;
      payload.calories = mealData.calories;
      const res = await supabase.from('meal_entries').insert(payload).select('*').single();
      data = res.data;
      error = res.error;
    }

    if (error) throw error;

    const createdAtDate = data?.created_at ? new Date(data.created_at) : new Date();
    const timeStr = createdAtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      ...data,
      calories: data?.calories_kcal ?? data?.calories ?? mealData.calories,
      logged_time: timeStr,
    } as DBMealEntry;
  } catch (err) {
    console.error('[nutritionService] Error saving meal entry:', err);
    return null;
  }
}

/**
 * Subscribe to Supabase Realtime changes on meal_entries table
 */
export function subscribeToClientMeals(onMealUpdated: () => void) {
  const channel = supabase
    .channel('meal_entries_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'meal_entries' },
      () => {
        onMealUpdated();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
