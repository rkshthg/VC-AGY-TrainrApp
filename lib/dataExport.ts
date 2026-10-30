/**
 * Data Export Service for Trainr (PRD 2.3 / 7.2).
 *
 * Collects the signed-in user's data from Supabase and saves it as files:
 *   Android: the user picks a folder (Storage Access Framework).
 *   iOS:     written to app documents, then the share sheet opens.
 *   Web:     browser downloads.
 */
import { Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

export interface ExportFile {
  name: string;
  mime: string;
  content: string;
}

export function generateUserDataJSON(data: Record<string, any>): string {
  return JSON.stringify({ app: 'Trainr', exportedAt: new Date().toISOString(), ...data }, null, 2);
}

export function generateWorkoutPlansJSON(plans: any[]): string {
  const exportBundle = {
    app: 'Trainr',
    exportedAt: new Date().toISOString(),
    workoutPlans: plans,
  };
  return JSON.stringify(exportBundle, null, 2);
}

/** Plain-text version of workout plans, for reading or printing. */
export function generateWorkoutPlansText(plans: any[]): string {
  const lines: string[] = [`Trainr workout plans — exported ${new Date().toLocaleString()}`, ''];
  plans.forEach((plan) => {
    lines.push(plan.title, '='.repeat(Math.max(4, plan.title.length)));
    (plan.days || []).forEach((day: any) => {
      lines.push(`  ${day.dayName}`);
      if (!day.exercises || day.exercises.length === 0) lines.push('    Rest day');
      (day.exercises || []).forEach((ex: any) => {
        const weight = ex.targetWeightKg ? ` @ ${ex.targetWeightKg} kg` : '';
        lines.push(`    - ${ex.name}: ${ex.targetSets} x ${ex.targetReps}${weight}`);
      });
    });
    lines.push('');
  });
  return lines.join('\n');
}

/** CSV with a header row from the union of keys. */
export function toCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return '';
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const cell = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => cell(r[h])).join(','))].join('\n');
}

/** Everything stored for this user. Throws if a query fails. */
export async function fetchAllUserData(userId: string): Promise<Record<string, any>> {
  const q = async (p: PromiseLike<{ data: any; error: any }>) => {
    const { data, error } = await p;
    if (error) throw error;
    return data || [];
  };

  const [profile, macroTargets, meals, workouts, weightLogs, measurements, checkinPhotos, personalRecords, plans, customExercises] =
    await Promise.all([
      q(supabase.from('users').select('*').eq('id', userId)),
      q(supabase.from('macro_targets').select('*').eq('user_id', userId)),
      q(supabase.from('meals').select('*, meal_items(*)').eq('user_id', userId).order('created_at')),
      q(supabase.from('workout_logs').select('*, workout_log_sets(*)').eq('user_id', userId).order('created_at')),
      q(supabase.from('weight_logs').select('*').eq('user_id', userId).order('recorded_at')),
      q(supabase.from('body_measurements').select('*').eq('user_id', userId).order('recorded_at')),
      q(supabase.from('checkin_photos').select('*').eq('user_id', userId).order('created_at')),
      q(supabase.from('personal_records').select('*').eq('user_id', userId)),
      q(supabase.from('workout_plans')
        .select('*, workout_plan_days(*, workout_plan_exercises(*))')
        .eq('created_by', userId)),
      q(supabase.from('custom_exercises').select('*').eq('created_by', userId)),
    ]);

  return {
    profile: profile[0] || null,
    macroTargets: macroTargets[0] || null,
    meals,
    workouts,
    weightLogs,
    bodyMeasurements: measurements,
    checkinPhotos,
    personalRecords,
    workoutPlans: plans,
    customExercises,
  };
}

/** One JSON file with everything plus CSVs for the main logs. */
export function buildUserDataFiles(data: Record<string, any>): ExportFile[] {
  const stamp = new Date().toISOString().slice(0, 10);
  const mealRows = (data.meals || []).flatMap((m: any) => {
    const items = m.meal_items && m.meal_items.length > 0 ? m.meal_items : [null];
    return items.map((i: any) => ({
      logged_at: m.created_at,
      meal: m.dish_name,
      category: m.category,
      meal_calories: m.total_calories,
      meal_protein_g: m.total_protein_g,
      meal_carbs_g: m.total_carbs_g,
      meal_fat_g: m.total_fat_g,
      item: i?.name ?? '',
      item_quantity: i?.quantity ?? '',
      item_calories: i?.calories ?? '',
      item_protein_g: i?.protein_g ?? '',
      item_carbs_g: i?.carbs_g ?? '',
      item_fat_g: i?.fat_g ?? '',
    }));
  });
  const setRows = (data.workouts || []).flatMap((w: any) =>
    (w.workout_log_sets || []).map((s: any) => ({
      workout_at: w.created_at,
      workout: w.title,
      duration_minutes: w.duration_minutes,
      exercise: s.exercise_name || s.exercise_id,
      set: s.set_number,
      weight_kg: s.weight_kg,
      reps: s.reps,
    }))
  );
  const weightRows = (data.weightLogs || []).map((w: any) => ({ recorded_at: w.recorded_at, weight_kg: w.weight_kg }));
  const measurementRows = (data.bodyMeasurements || []).map(({ id, user_id, ...rest }: any) => rest);

  const files: ExportFile[] = [
    { name: `trainr-data-${stamp}.json`, mime: 'application/json', content: generateUserDataJSON(data) },
  ];
  const csvs: [string, Record<string, any>[]][] = [
    ['meals', mealRows],
    ['workout-sets', setRows],
    ['weight', weightRows],
    ['measurements', measurementRows],
  ];
  csvs.forEach(([name, rows]) => {
    if (rows.length > 0) files.push({ name: `trainr-${name}-${stamp}.csv`, mime: 'text/csv', content: toCsv(rows) });
  });
  return files;
}

/** Save files where the user can get at them. Returns false if they cancelled. */
export async function saveExportFiles(files: ExportFile[]): Promise<boolean> {
  if (Platform.OS === 'web') {
    files.forEach((f) => {
      const blob = new Blob([f.content], { type: f.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    return true;
  }

  if (Platform.OS === 'android') {
    const SAF = FileSystem.StorageAccessFramework;
    const perm = await SAF.requestDirectoryPermissionsAsync();
    if (!perm.granted) return false;
    for (const f of files) {
      const base = f.name.replace(/\.[^.]+$/, '');
      const uri = await SAF.createFileAsync(perm.directoryUri, base, f.mime);
      await FileSystem.writeAsStringAsync(uri, f.content, { encoding: FileSystem.EncodingType.UTF8 });
    }
    return true;
  }

  // iOS: write to documents, then offer the share sheet for each file.
  for (const f of files) {
    const uri = `${FileSystem.documentDirectory}${f.name}`;
    await FileSystem.writeAsStringAsync(uri, f.content, { encoding: FileSystem.EncodingType.UTF8 });
    const result = await Share.share({ url: uri, title: f.name });
    if (result.action === Share.dismissedAction) return false;
  }
  return true;
}
