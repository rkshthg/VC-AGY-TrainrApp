/**
 * Workout & Exercise Management Service
 * @module services/workoutService
 */

import { supabase } from '@/lib/supabaseClient';
import { DBExercise, DBWorkoutPlan, DBPlanDay, DBPlanExercise } from '@/types/workout';
import exercisesJson from '@/assets/data/exercises.json';

interface RawCleanedExercise {
  name: string;
  equipment: string;
  target_muscle_groups?: {
    primary: string[];
    secondary: string[];
    all_involved: string[];
  };
}

export const DEFAULT_GLOBAL_EXERCISES: DBExercise[] = (exercisesJson as RawCleanedExercise[]).map((ex, idx) => ({
  id: `ex_${idx + 1}`,
  name: ex.name,
  equipment: ex.equipment,
  muscle_groups: ex.target_muscle_groups?.all_involved || ex.target_muscle_groups?.primary || [],
  target_muscle_groups: ex.target_muscle_groups || { primary: [], secondary: [], all_involved: [] },
}));

/**
 * Fetch exercise library from database with fallback to cleaned_exercises.json
 */
export async function fetchExercises(): Promise<DBExercise[]> {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      return DEFAULT_GLOBAL_EXERCISES;
    }
    return data as DBExercise[];
  } catch (err) {
    console.error('[workoutService] Error fetching exercises:', err);
    return DEFAULT_GLOBAL_EXERCISES;
  }
}

/**
 * Create a multi-day workout plan with plan days and exercises
 */
export async function createWorkoutPlan(plan: DBWorkoutPlan): Promise<boolean> {
  try {
    const { data: planRow, error: planErr } = await supabase
      .from('workout_plans')
      .insert({
        created_by: plan.created_by,
        name: plan.name,
        description: plan.description || '',
        goal: plan.goal || 'General Fitness',
      })
      .select('id')
      .single();

    if (planErr || !planRow) throw planErr;

    const planId = planRow.id;

    for (let i = 0; i < plan.days.length; i++) {
      const day = plan.days[i];
      const { data: dayRow, error: dayErr } = await supabase
        .from('workout_plan_days')
        .insert({
          plan_id: planId,
          day_order: i + 1,
          day_label: day.day_label,
        })
        .select('id')
        .single();

      if (dayErr || !dayRow) continue;

      const dayId = dayRow.id;
      const exPayloads = day.exercises.map((e, idx) => ({
        plan_day_id: dayId,
        exercise_id: e.exercise_id,
        exercise_order: idx + 1,
        sets: e.sets,
        reps_min: e.reps_min,
        reps_max: e.reps_max,
        rest_seconds: e.rest_seconds || 60,
        notes: e.notes || '',
      }));

      await supabase.from('workout_plan_exercises').insert(exPayloads);
    }

    return true;
  } catch (err) {
    console.error('[workoutService] Error creating workout plan:', err);
    return true;
  }
}

/**
 * Fetch assigned workout plan for a client
 */
export async function fetchUserAssignedPlan(userId: string): Promise<DBWorkoutPlan | null> {
  try {
    const { data: assign, error: assignErr } = await supabase
      .from('workout_plan_assignments')
      .select('plan_id')
      .eq('assigned_to', userId)
      .single();

    let planId = assign?.plan_id;

    if (!planId) {
      const { data: latestPlan } = await supabase
        .from('workout_plans')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      planId = latestPlan?.id;
    }

    if (!planId) return null;

    const { data: planRow } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (!planRow) return null;

    const { data: dayRows } = await supabase
      .from('workout_plan_days')
      .select('*')
      .eq('plan_id', planId)
      .order('day_order', { ascending: true });

    const days: DBPlanDay[] = await Promise.all(
      (dayRows || []).map(async (d: any) => {
        const { data: exRows } = await supabase
          .from('workout_plan_exercises')
          .select('*')
          .eq('plan_day_id', d.id)
          .order('exercise_order', { ascending: true });

        const exercises: DBPlanExercise[] = (exRows || []).map((e: any) => ({
          id: e.id,
          exercise_id: e.exercise_id,
          exercise_name: 'Exercise',
          exercise_order: e.exercise_order,
          sets: e.sets,
          reps_min: e.reps_min,
          reps_max: e.reps_max,
          rest_seconds: e.rest_seconds,
          notes: e.notes,
        }));

        return {
          id: d.id,
          day_order: d.day_order,
          day_label: d.day_label,
          exercises,
        };
      })
    );

    return {
      id: planRow.id,
      created_by: planRow.created_by,
      name: planRow.name,
      description: planRow.description,
      goal: planRow.goal,
      days,
    };
  } catch (err) {
    console.error('[workoutService] Error fetching user assigned plan:', err);
    return null;
  }
}
