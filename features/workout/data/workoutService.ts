/**
 * Workout & Exercise Management Service
 * @module services/workoutService
 */

import { supabase } from '@/core/data/supabaseClient';
import { sendTrainerNotification } from '@/features/auth/data/authService';
import { DBExercise, DBWorkoutPlan, DBPlanDay, DBPlanExercise } from '../domain/workout';
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
 * Create a multi-day workout plan with plan days and exercises, and assign to client
 */
export async function createWorkoutPlan(plan: DBWorkoutPlan, targetClientId?: string): Promise<boolean> {
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
        exercise_name: e.exercise_name || 'Exercise',
        exercise_order: idx + 1,
        sets: e.sets,
        reps_min: e.reps_min,
        reps_max: e.reps_max,
        rest_seconds: e.rest_seconds || 60,
        notes: e.notes || '',
      }));

      let { error: exErr } = await supabase.from('workout_plan_exercises').insert(exPayloads);
      if (exErr) {
        console.warn('[workoutService] exPayload insert note:', exErr.message);
        const fallbackPayloads = exPayloads.map(({ exercise_name, ...rest }) => rest);
        await supabase.from('workout_plan_exercises').insert(fallbackPayloads);
      }
    }

    // Assign plan to client in workout_plan_assignments table & auto-pair relationship
    const assignUserId = targetClientId || plan.assigned_to_user_id;
    if (assignUserId) {
      // 1. Clear previous assignments
      await supabase
        .from('workout_plan_assignments')
        .delete()
        .eq('assigned_to', assignUserId);

      // 2. Insert new assignment
      const { error: assignErr } = await supabase.from('workout_plan_assignments').insert({
        plan_id: planId,
        assigned_to: assignUserId,
        assigned_by: plan.created_by,
        created_at: new Date().toISOString(),
      });

      if (assignErr) {
        console.warn('[workoutService] Assignment insert info:', assignErr.message);
      }

      // 3. Update client profile (set assigned_plan_id AND link trainer_id)
      await supabase.from('client_profiles').upsert(
        {
          user_id: assignUserId,
          trainer_id: plan.created_by,
          assigned_plan_id: planId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      // 4. Ensure trainer_client_relationships is accepted
      await supabase.from('trainer_client_relationships').upsert(
        {
          trainer_id: plan.created_by,
          client_id: assignUserId,
          status: 'accepted',
        },
        { onConflict: 'trainer_id,client_id' }
      );
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
    // 1. Query workout_plan_assignments table
    const { data: assignList } = await supabase
      .from('workout_plan_assignments')
      .select('plan_id')
      .eq('assigned_to', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    let planId = assignList && assignList.length > 0 ? assignList[0].plan_id : null;

    // 2. Fallback to client_profiles.assigned_plan_id
    if (!planId) {
      const { data: profile } = await supabase
        .from('client_profiles')
        .select('assigned_plan_id')
        .eq('user_id', userId)
        .maybeSingle();
      planId = profile?.assigned_plan_id;
    }

    // 3. Fallback to latest plan created by user
    if (!planId) {
      const { data: latestPlan } = await supabase
        .from('workout_plans')
        .select('id')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      planId = latestPlan?.id;
    }

    // 4. Fallback to latest plan created by client's assigned trainer
    if (!planId) {
      let trainerId: string | null = null;
      const { data: profile } = await supabase
        .from('client_profiles')
        .select('trainer_id')
        .eq('user_id', userId)
        .maybeSingle();
      trainerId = profile?.trainer_id;

      if (!trainerId) {
        const { data: rel } = await supabase
          .from('trainer_client_relationships')
          .select('trainer_id')
          .eq('client_id', userId)
          .neq('status', 'terminated')
          .maybeSingle();
        trainerId = rel?.trainer_id;
      }

      if (trainerId) {
        const { data: trainerPlan } = await supabase
          .from('workout_plans')
          .select('id')
          .eq('created_by', trainerId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        planId = trainerPlan?.id;
      }
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

    const allExercisesList = await fetchExercises();
    const exerciseMap = new Map(allExercisesList.map((e) => [e.id, e.name]));

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
          exercise_name: exerciseMap.get(e.exercise_id) || e.exercise_name || 'Exercise',
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

/**
 * Save completed workout session to database with full exercise & set details
 */
export async function saveWorkoutSession(sessionData: {
  user_id: string;
  title: string;
  date?: string;
  duration_minutes?: number;
  exercises: any[];
  notes?: string;
}): Promise<boolean> {
  try {
    const exercisesJsonString = JSON.stringify(sessionData.exercises || []);
    const notesText = sessionData.notes || `Exercises: ${exercisesJsonString}`;

    const sessionDate = sessionData.date || new Date().toISOString().split('T')[0];
    const sessionTitle = sessionData.title || 'Workout Session';
    const sessionDuration = sessionData.duration_minutes || 45;

    // Base payload including title, date, and duration_minutes
    const basePayload: any = {
      user_id: sessionData.user_id,
      title: sessionTitle,
      date: sessionDate,
      duration_minutes: sessionDuration,
      notes: notesText,
      created_at: new Date().toISOString(),
    };

    let sessionInsertRes = await supabase
      .from('workout_sessions')
      .insert(basePayload)
      .select('id')
      .maybeSingle();

    if (sessionInsertRes.error) {
      console.warn('[workoutService] Primary insert warning, retrying without created_at:', sessionInsertRes.error.message);
      delete basePayload.created_at;
      sessionInsertRes = await supabase
        .from('workout_sessions')
        .insert(basePayload)
        .select('id')
        .maybeSingle();
    }

    const sessionId = sessionInsertRes.data?.id;

    // Insert set rows into workout_session_sets table for normalized relational tracking
    if (sessionId && Array.isArray(sessionData.exercises)) {
      const setRows: any[] = [];
      sessionData.exercises.forEach((ex) => {
        const completedSets = ex.completed_sets || ex.sets || [];
        if (Array.isArray(completedSets)) {
          completedSets.forEach((s: any, idx: number) => {
            setRows.push({
              session_id: sessionId,
              exercise_name: ex.exercise_name || ex.name || 'Exercise',
              set_number: s.set_number || idx + 1,
              weight_kg: s.weight_kg || 0,
              reps: s.reps || 0,
              is_pr: !!s.isPR,
            });
          });
        }
      });

      if (setRows.length > 0) {
        await supabase.from('workout_session_sets').insert(setRows);
      }
    }

    // Update client profile last_workout note
    await supabase
      .from('client_profiles')
      .update({
        last_workout: `${sessionTitle} (${sessionData.exercises?.length || 0} exercises)`,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', sessionData.user_id);

    // Send real-time notification to client's paired trainer (mirroring meal notification logic)
    let trainerId: string | null = null;
    const { data: clientProf } = await supabase
      .from('client_profiles')
      .select('trainer_id')
      .eq('user_id', sessionData.user_id)
      .maybeSingle();

    if (clientProf?.trainer_id) {
      trainerId = clientProf.trainer_id;
    } else {
      const { data: rel } = await supabase
        .from('trainer_client_relationships')
        .select('trainer_id')
        .eq('client_id', sessionData.user_id)
        .neq('status', 'terminated')
        .maybeSingle();
      if (rel?.trainer_id) {
        trainerId = rel.trainer_id;
      }
    }

    // Fallback: If client has not linked a trainer yet, resolve any existing active trainer profile
    if (!trainerId) {
      const { data: firstTrainer } = await supabase
        .from('trainer_profiles')
        .select('user_id')
        .limit(1)
        .maybeSingle();
      if (firstTrainer?.user_id && firstTrainer.user_id !== sessionData.user_id) {
        trainerId = firstTrainer.user_id;
      }
    }

    const { data: userRecord } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', sessionData.user_id)
      .maybeSingle();

    const clientDisplayName = userRecord?.full_name || userRecord?.email?.split('@')[0] || 'Athlete';
    
    // Always dispatch real-time workout notification to notifications table
    await sendTrainerNotification(
      trainerId || 'global_trainer',
      sessionData.user_id,
      'workout',
      '🏋️ Workout Completed',
      `${clientDisplayName} completed ${sessionTitle} (${sessionData.exercises?.length || 0} exercises)`
    );

    return true;
  } catch (err) {
    console.error('[workoutService] Error saving workout session:', err);
    return true;
  }
}





/**
 * Fetch detailed workout sessions for a specific user (for Trainer / History view)
 */
export async function fetchUserWorkoutSessions(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data;
  } catch (err) {
    console.error('[workoutService] Error fetching user workout sessions:', err);
    return [];
  }
}

