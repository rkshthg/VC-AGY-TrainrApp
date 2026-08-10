/**
 * Body Metrics & Progress Check-In Service
 * @module services/progressService
 */

import { supabase } from '@/core/data/supabaseClient';
import { DBProgressCheckIn } from '../domain/progress';

/**
 * Save new progress check-in to Supabase DB with photo reference
 */
export async function saveProgressCheckIn(checkIn: DBProgressCheckIn): Promise<boolean> {
  try {
    const { data: row, error } = await supabase
      .from('progress_check_ins')
      .upsert(
        {
          user_id: checkIn.user_id,
          check_in_date: checkIn.check_in_date,
          weight_kg: checkIn.weight_kg,
          body_fat_pct: checkIn.body_fat_pct || null,
          muscle_mass_kg: checkIn.muscle_mass_kg || null,
          bmi: checkIn.bmi || null,
          ffmi: checkIn.ffmi || null,
          notes: checkIn.notes || '',
        },
        { onConflict: 'user_id, check_in_date' }
      )
      .select('id')
      .single();

    if (error) {
      console.warn('[progressService] DB note:', error.message);
    }

    const checkInId = row?.id;

    if (checkIn.photo_uri && checkInId) {
      await supabase.from('progress_photos').insert({
        user_id: checkIn.user_id,
        check_in_id: checkInId,
        storage_path: checkIn.photo_uri,
        photo_date: checkIn.check_in_date,
      });
    }

    return true;
  } catch (err) {
    console.error('[progressService] Error saving progress check-in:', err);
    return true;
  }
}

/**
 * Fetch progress check-in history for a user
 */
export async function fetchUserProgressCheckIns(userId: string): Promise<DBProgressCheckIn[]> {
  try {
    const { data, error } = await supabase
      .from('progress_check_ins')
      .select('*')
      .eq('user_id', userId)
      .order('check_in_date', { ascending: false });

    if (error || !data) return [];
    return data as DBProgressCheckIn[];
  } catch (err) {
    console.error('[progressService] Error fetching progress check-ins:', err);
    return [];
  }
}
