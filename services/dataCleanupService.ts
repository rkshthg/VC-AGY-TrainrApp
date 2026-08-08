/**
 * Automated 3-Month Data Retention & Storage Cleanup Service
 * @module services/dataCleanupService
 */

import { supabase } from '@/lib/supabaseClient';

/**
 * Executes database cleanup procedure for data older than 90 days
 */
export async function run3MonthDataCleanup(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Calculate cutoff date (90 days ago)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cutoffIso = ninetyDaysAgo.toISOString();
    const cutoffDateStr = cutoffIso.split('T')[0];

    // Try calling RPC if database function exists
    const { error: rpcError } = await supabase.rpc('clean_old_trainr_data');
    
    if (!rpcError) {
      return { success: true, message: '3-month database cleanup completed via RPC.' };
    }

    // Direct fallback queries if RPC function is not created yet
    // Delete meal entries older than 90 days
    await supabase.from('meal_entries').delete().lt('logged_date', cutoffDateStr);

    // Delete unstarred progress photos older than 90 days
    await supabase.from('progress_photos').delete().lt('created_at', cutoffIso).eq('is_starred', false);

    // Delete unstarred check-ins older than 90 days
    await supabase.from('progress_check_ins').delete().lt('check_in_date', cutoffDateStr).eq('is_starred', false);

    return { success: true, message: '3-month fallback data cleanup completed successfully.' };
  } catch (err: any) {
    console.error('[dataCleanupService] Data cleanup error:', err);
    return { success: false, message: err?.message || 'Data cleanup encountered an error.' };
  }
}
