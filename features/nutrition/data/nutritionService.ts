/**
 * Nutrition & Meal Management Service
 * @module services/nutritionService
 */

import { supabase } from '@/core/data/supabaseClient';
import { sendTrainerNotification } from '@/features/auth/data/authService';
import { DBMealEntry } from '../domain/nutrition';


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

    // Send real-time notification to client's paired trainer
    let trainerId: string | null = null;
    const { data: clientProf } = await supabase
      .from('client_profiles')
      .select('trainer_id')
      .eq('user_id', mealData.user_id)
      .maybeSingle();

    if (clientProf?.trainer_id) {
      trainerId = clientProf.trainer_id;
    } else {
      const { data: rel } = await supabase
        .from('trainer_client_relationships')
        .select('trainer_id')
        .eq('client_id', mealData.user_id)
        .neq('status', 'terminated')
        .maybeSingle();
      if (rel?.trainer_id) {
        trainerId = rel.trainer_id;
      }
    }

    if (!trainerId) {
      const { data: firstTrainer } = await supabase
        .from('trainer_profiles')
        .select('user_id')
        .limit(1)
        .maybeSingle();
      if (firstTrainer?.user_id && firstTrainer.user_id !== mealData.user_id) {
        trainerId = firstTrainer.user_id;
      }
    }

    const { data: userRecord } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', mealData.user_id)
      .maybeSingle();

    const clientDisplayName = userRecord?.full_name || userRecord?.email?.split('@')[0] || 'Athlete';
    await sendTrainerNotification(
      trainerId || 'global_trainer',
      mealData.user_id,
      'meal',
      '🥗 Nutrition Logged',
      `${clientDisplayName} logged ${mealData.meal_name} (${mealData.calories} kcal, ${mealData.protein_g}g P)`
    );

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
