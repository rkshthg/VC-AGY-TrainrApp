import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import exerciseData from '../assets/data/exercises.json';
import { calculate1RM } from '../lib/healthMetrics';
import { supabase } from '../lib/supabase';
import { queueOfflineTransaction } from '../lib/offlineSync';
import { useAuthStore } from './authStore';
import logger from '../lib/logger';

export interface ExerciseDef {
  id: string;
  name: string;
  target_muscle: string;
  category: string;
  isCustom?: boolean;
}

export interface PlanExercise {
  exerciseId: string;
  name: string;
  targetSets: number;
  targetReps: string; // e.g. "8-12"
  targetWeightKg?: number;
}

export interface PlanDay {
  id: string;
  dayName: string; // e.g. "Day 1: Push"
  exercises: PlanExercise[];
}

export interface WorkoutPlan {
  id: string;
  title: string;
  createdBy: string;
  isAssignedToClient?: boolean;
  assignedClientIds?: string[];
  days: PlanDay[];
}

export interface ActiveSetLog {
  setId: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  isCompleted: boolean;
}

export interface ActiveExerciseSession {
  exerciseId: string;
  exerciseName: string;
  targetMuscle: string;
  lastWeightKg?: number;
  lastReps?: number;
  sets: ActiveSetLog[];
}

export interface ActiveWorkoutSession {
  sessionId: string;
  planId?: string;
  planTitle: string;
  startTime: number; // Date.now()
  exercises: ActiveExerciseSession[];
  isFinished: boolean;
}

export interface LoggedExerciseDetail {
  name: string;
  sets: number;
  reps: string;
  targetWeightKg: number;
  totalVolumeKg: number;
}

/** Sets from the most recent session that included an exercise. */
export interface LastPerformance {
  date: string;
  sets: { weightKg: number; reps: number }[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CompletedWorkoutHeader {
  id: string;
  title: string;
  date: string;
  durationMinutes: number;
  totalVolumeKg: number;
  exerciseCount: number;
  exerciseLogs?: LoggedExerciseDetail[];
}

interface WorkoutState {
  exerciseCatalog: ExerciseDef[];
  savedPlans: WorkoutPlan[];
  activePlanId: string | null;
  activeRoutineDayIndexMap: Record<string, number>;
  activeSession: ActiveWorkoutSession | null;
  workoutHistory: CompletedWorkoutHeader[];
  personalRecords: Record<string, { weightKg: number; reps: number; oneRmKg: number; date: string }>;
  lastPerformance: Record<string, LastPerformance>;
  isLoading: boolean;

  fetchWorkoutData: (userId: string) => Promise<void>;
  createPlan: (plan: Omit<WorkoutPlan, 'id'>, assignedClientIds?: string[]) => Promise<string | undefined>;
  updatePlan: (planId: string, updates: Partial<WorkoutPlan>) => void;
  deletePlan: (planId: string) => void;
  setActivePlan: (planId: string) => void;
  setActiveRoutineDayIndex: (planId: string, dayIndex: number) => void;
  startSession: (plan?: WorkoutPlan, dayIndex?: number) => void;
  toggleSetCompleted: (exerciseId: string, setIndex: number, weightKg: number, reps: number) => void;
  updateSetValues: (exerciseId: string, setIndex: number, weightKg: number, reps: number) => void;
  addSetToExercise: (exerciseId: string) => void;
  removeSetFromExercise: (exerciseId: string, setIndex: number) => void;
  addExerciseToActiveSession: (exerciseDef: { exerciseId: string; exerciseName: string; targetMuscle: string }) => void;
  removeExerciseFromActiveSession: (exerciseId: string) => void;
  finishSession: () => CompletedWorkoutHeader | null;
  cancelSession: () => void;
  addCustomExercise: (name: string, target_muscle: string, category: string) => Promise<ExerciseDef>;
  reset: () => void;
}

export const useWorkoutStore = create<WorkoutState>()(persist((set, get) => ({
  exerciseCatalog: exerciseData as ExerciseDef[],
  savedPlans: [],
  activePlanId: null,
  activeRoutineDayIndexMap: {},
  setActivePlan: (planId: string) => set({ activePlanId: planId }),
  setActiveRoutineDayIndex: (planId: string, dayIndex: number) =>
    set((state) => ({
      activeRoutineDayIndexMap: {
        ...state.activeRoutineDayIndexMap,
        [planId]: dayIndex,
      },
    })),
  activeSession: null,
  workoutHistory: [],
  personalRecords: {},
  lastPerformance: {},
  isLoading: false,

  fetchWorkoutData: async (userId: string) => {
    set({ isLoading: true });
    try {
      const role = useAuthStore.getState().role;

      const [logsRes, prsRes, plansRes, assignmentsRes, customExRes] = await Promise.all([
        supabase.from('workout_logs').select(`
          *,
          workout_log_sets (*)
        `).eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('personal_records').select('*').eq('user_id', userId),
        supabase.from('workout_plans').select(`
          id,
          title,
          created_by,
          created_at,
          workout_plan_days (
            id,
            day_name,
            day_order,
            workout_plan_exercises (
              id,
              exercise_id,
              exercise_name,
              target_sets,
              target_reps,
              target_weight_kg
            )
          ),
          workout_plan_assignments (
            client_id,
            trainer_id
          )
        `).order('created_at', { ascending: false }),
        supabase.from('workout_plan_assignments').select('plan_id').eq('client_id', userId),
        supabase.from('custom_exercises').select('*').eq('created_by', userId),
      ]);

      const workoutHistory: CompletedWorkoutHeader[] = (logsRes.data || []).map(log => {
        const rawSets = (log.workout_log_sets || []).filter((s: any) => s.is_completed !== false);
        const exerciseGroupMap: Record<string, any[]> = {};
        rawSets.forEach((s: any) => {
          const exName = s.exercise_name || 'Exercise';
          if (!exerciseGroupMap[exName]) exerciseGroupMap[exName] = [];
          exerciseGroupMap[exName].push(s);
        });

        const exerciseLogs: LoggedExerciseDetail[] = Object.keys(exerciseGroupMap).map(exName => {
          const setsArr = exerciseGroupMap[exName];
          const totalVol = setsArr.reduce((acc: number, s: any) => acc + (Number(s.weight_kg) * Number(s.reps)), 0);
          const maxWeight = setsArr.reduce((max: number, s: any) => Math.max(max, Number(s.weight_kg)), 0);
          const avgReps = Math.round(setsArr.reduce((acc: number, s: any) => acc + Number(s.reps), 0) / setsArr.length);

          return {
            name: exName,
            sets: setsArr.length,
            reps: `${avgReps} reps`,
            targetWeightKg: maxWeight,
            totalVolumeKg: totalVol,
          };
        });

        return {
          id: log.id,
          title: log.title,
          date: log.created_at,
          durationMinutes: log.duration_minutes,
          totalVolumeKg: log.total_volume_kg,
          exerciseCount: log.exercise_count || exerciseLogs.length,
          exerciseLogs,
        };
      });

      const lastPerformance: Record<string, LastPerformance> = {};
      (logsRes.data || []).forEach((log: any) => {
        const byExercise: Record<string, any[]> = {};
        (log.workout_log_sets || [])
          .filter((s: any) => s.is_completed !== false)
          .forEach((s: any) => {
            (byExercise[s.exercise_id] = byExercise[s.exercise_id] || []).push(s);
          });
        Object.entries(byExercise).forEach(([exId, sets]) => {
          if (lastPerformance[exId]) return; // logs are newest first
          lastPerformance[exId] = {
            date: log.created_at,
            sets: sets
              .sort((a, b) => a.set_number - b.set_number)
              .map((s) => ({ weightKg: Number(s.weight_kg), reps: Number(s.reps) })),
          };
        });
      });

      const personalRecords: Record<string, any> = {};
      (prsRes.data || []).forEach(pr => {
        personalRecords[pr.exercise_id] = {
          weightKg: pr.weight_kg,
          reps: pr.reps,
          oneRmKg: pr.one_rm_kg,
          date: pr.achieved_at
        };
      });

      const clientAssignedPlanIds = new Set((assignmentsRes.data || []).map((a: any) => a.plan_id));

      const fetchedPlans: WorkoutPlan[] = (plansRes.data || [])
        .filter((p: any) => {
          if (role === 'TRAINER') {
            return p.created_by === userId || (p.workout_plan_assignments || []).some((a: any) => a.trainer_id === userId);
          } else {
            return p.created_by === userId || clientAssignedPlanIds.has(p.id);
          }
        })
        .map((p: any) => {
          const days: PlanDay[] = (p.workout_plan_days || [])
            .sort((a: any, b: any) => (a.day_order || 0) - (b.day_order || 0))
            .map((d: any) => ({
              id: d.id,
              dayName: d.day_name,
              exercises: (d.workout_plan_exercises || []).map((ex: any) => ({
                exerciseId: ex.exercise_id,
                name: ex.exercise_name,
                targetSets: ex.target_sets,
                targetReps: ex.target_reps,
                targetWeightKg: Number(ex.target_weight_kg) || 0,
              })),
            }));

          const assignedClientIds = (p.workout_plan_assignments || []).map((a: any) => a.client_id);

          return {
            id: p.id,
            title: p.title,
            createdBy: p.created_by,
            isAssignedToClient: assignedClientIds.length > 0,
            assignedClientIds,
            days,
          };
        });

      const baseCatalog = exerciseData as ExerciseDef[];
      const customExercises: ExerciseDef[] = (customExRes?.data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        target_muscle: c.target_muscle,
        category: c.equipment || 'Other',
        isCustom: true,
      }));

      if (customExercises.length > 0) {
        AsyncStorage.setItem('@trainr_custom_exercises', JSON.stringify(customExercises)).catch(() => {});
      }

      const mergedCatalog = [...baseCatalog];
      customExercises.forEach((c) => {
        if (!mergedCatalog.some((e) => e.id === c.id)) {
          mergedCatalog.push(c);
        }
      });

      set({
        workoutHistory,
        personalRecords,
        lastPerformance,
        // Trust the server when the query worked (even if it returned no
        // plans); keep local plans only if it failed (e.g. offline).
        savedPlans: plansRes.error ? get().savedPlans : fetchedPlans,
        exerciseCatalog: mergedCatalog,
        isLoading: false,
      });
    } catch (e) {
      logger.warn('Failed to fetch workout data', e);
      set({ isLoading: false });
    }
  },

  createPlan: async (planData, assignedClientIds) => {
    const clientsList = assignedClientIds || planData.assignedClientIds || [];
    const tempId = 'plan_' + Date.now();

    let userId = useAuthStore.getState().profile?.id;
    if (!userId) {
      const { data: authData } = await supabase.auth.getUser();
      userId = authData?.user?.id;
    }

    const newPlan: WorkoutPlan = {
      ...planData,
      createdBy: userId || planData.createdBy,
      id: tempId,
      assignedClientIds: clientsList,
      isAssignedToClient: clientsList.length > 0 || planData.isAssignedToClient || false,
    };

    set((state) => ({
      savedPlans: [newPlan, ...state.savedPlans],
    }));

    if (userId) {
      try {
        const { data: insertedPlan, error: planErr } = await supabase
          .from('workout_plans')
          .insert({
            title: planData.title,
            created_by: userId,
          })
          .select('id')
          .single();

        if (planErr || !insertedPlan) {
          logger.error('Failed inserting workout_plan into Supabase:', planErr);
          return tempId;
        }

        const realPlanId = insertedPlan.id;

        for (let dayIdx = 0; dayIdx < planData.days.length; dayIdx++) {
          const day = planData.days[dayIdx];
          const { data: insertedDay, error: dayErr } = await supabase
            .from('workout_plan_days')
            .insert({
              plan_id: realPlanId,
              day_name: day.dayName,
              day_order: dayIdx + 1,
            })
            .select('id')
            .single();

          if (dayErr) {
            logger.error('Failed inserting workout_plan_days into Supabase:', dayErr);
          }

          if (insertedDay && day.exercises && day.exercises.length > 0) {
            const exPayloads = day.exercises.map((ex) => ({
              day_id: insertedDay.id,
              exercise_id: ex.exerciseId,
              exercise_name: ex.name,
              target_sets: ex.targetSets,
              target_reps: ex.targetReps || '8-10',
              target_weight_kg: ex.targetWeightKg || 0,
            }));
            const { error: exErr } = await supabase.from('workout_plan_exercises').insert(exPayloads);
            if (exErr) {
              logger.error('Failed inserting workout_plan_exercises into Supabase:', exErr);
            }
          }
        }

        if (clientsList.length > 0) {
          const assignPayloads = clientsList.map((cId) => ({
            plan_id: realPlanId,
            trainer_id: userId,
            client_id: cId,
          }));
          const { error: assignErr } = await supabase.from('workout_plan_assignments').insert(assignPayloads);
          if (assignErr) {
            logger.error('Failed inserting workout_plan_assignments into Supabase:', assignErr);
          }
        }

        set((state) => ({
          savedPlans: state.savedPlans.map((p) =>
            p.id === tempId ? { ...p, id: realPlanId } : p
          ),
          activePlanId: state.activePlanId === tempId ? realPlanId : state.activePlanId,
        }));
        return realPlanId;
      } catch (err) {
        logger.error('Error persisting workout plan to Supabase:', err);
      }
    } else {
      logger.warn('Cannot persist workout_plan to Supabase: No active authenticated user ID found.');
    }
    return tempId;
  },

  updatePlan: async (planId, updates) => {
    const myId = useAuthStore.getState().profile?.id;
    const original = get().savedPlans.find((p) => p.id === planId);
    if (original && myId && UUID_RE.test(original.createdBy) && original.createdBy !== myId) {
      // Someone else's plan (assigned by a trainer). Only the creator can
      // change it, so save the client's edits as their own copy (PRD 3.4).
      const copyId = await get().createPlan({
        title: updates.title && updates.title !== original.title ? updates.title : `${original.title} (My Version)`,
        createdBy: myId,
        days: updates.days || original.days,
      });
      if (copyId && get().activePlanId === planId) set({ activePlanId: copyId });
      return;
    }

    const isAssignedNow = (updates.assignedClientIds && updates.assignedClientIds.length > 0) || updates.isAssignedToClient;
    const currentActiveId = get().activePlanId;
    const currentRole = useAuthStore.getState().role;

    set((state) => ({
      savedPlans: state.savedPlans.map((p) => (p.id === planId ? { ...p, ...updates } : p)),
      activePlanId: (isAssignedNow && currentActiveId === planId && currentRole === 'TRAINER') ? null : state.activePlanId,
    }));

    const userId = useAuthStore.getState().profile?.id;
    if (!userId || planId.startsWith('plan_')) return;

    try {
      if (updates.title) {
        await supabase.from('workout_plans').update({ title: updates.title }).eq('id', planId);
      }

      if (updates.days) {
        await supabase.from('workout_plan_days').delete().eq('plan_id', planId);

        for (let dayIdx = 0; dayIdx < updates.days.length; dayIdx++) {
          const day = updates.days[dayIdx];
          const { data: insertedDay } = await supabase
            .from('workout_plan_days')
            .insert({
              plan_id: planId,
              day_name: day.dayName,
              day_order: dayIdx + 1,
            })
            .select('id')
            .single();

          if (insertedDay && day.exercises && day.exercises.length > 0) {
            const exPayloads = day.exercises.map((ex) => ({
              day_id: insertedDay.id,
              exercise_id: ex.exerciseId,
              exercise_name: ex.name,
              target_sets: ex.targetSets,
              target_reps: ex.targetReps || '8-10',
              target_weight_kg: ex.targetWeightKg || 0,
            }));
            await supabase.from('workout_plan_exercises').insert(exPayloads);
          }
        }
      }

      if (updates.assignedClientIds !== undefined) {
        await supabase.from('workout_plan_assignments').delete().eq('plan_id', planId);
        if (updates.assignedClientIds.length > 0) {
          const assignPayloads = updates.assignedClientIds.map((cId) => ({
            plan_id: planId,
            trainer_id: userId,
            client_id: cId,
          }));
          await supabase.from('workout_plan_assignments').insert(assignPayloads);
        }
      }
    } catch (e) {
      logger.warn('Failed updating workout plan in Supabase:', e);
    }
  },

  deletePlan: async (planId) => {
    const plan = get().savedPlans.find((p) => p.id === planId);
    const prevPlans = get().savedPlans;
    const prevActive = get().activePlanId;
    set((state) => ({
      savedPlans: state.savedPlans.filter((p) => p.id !== planId),
      activePlanId: state.activePlanId === planId ? null : state.activePlanId,
    }));

    if (planId.startsWith('plan_')) return;

    const myId = useAuthStore.getState().profile?.id;
    // A plan someone else created (a trainer's assigned plan) can't be deleted
    // by the client; instead drop the client's assignment so it leaves their list.
    const isSomeoneElses = !!plan && !!myId && UUID_RE.test(plan.createdBy) && plan.createdBy !== myId;
    try {
      const { error } = isSomeoneElses
        ? await supabase
            .from('workout_plan_assignments')
            .delete()
            .eq('plan_id', planId)
            .eq('client_id', myId!)
        : await supabase.from('workout_plans').delete().eq('id', planId);
      if (error) throw error;
    } catch (e) {
      logger.warn('Failed deleting workout plan from Supabase:', e);
      set({ savedPlans: prevPlans, activePlanId: prevActive });
      Alert.alert('Could Not Delete', 'The routine could not be removed. Check your connection and try again.');
    }
  },

  startSession: (plan, dayIndex) => {
    const targetDayIndex =
      dayIndex !== undefined
        ? dayIndex
        : plan
        ? get().activeRoutineDayIndexMap[plan.id] || 0
        : 0;

    const selectedDay = plan && plan.days.length > 0
      ? plan.days[targetDayIndex % plan.days.length]
      : null;

    const defaultExercises: ActiveExerciseSession[] = selectedDay?.exercises.map((e) => {
      const catalogItem = get().exerciseCatalog.find(
        (c) => c.id === e.exerciseId || c.name.toLowerCase() === e.name.toLowerCase()
      );
      const last = get().lastPerformance[e.exerciseId];
      const top = last ? topSet(last) : undefined;
      return {
        exerciseId: e.exerciseId,
        exerciseName: e.name,
        targetMuscle: catalogItem ? catalogItem.category : 'General',
        lastWeightKg: top?.weightKg,
        lastReps: top?.reps,
        sets: Array.from({ length: e.targetSets }).map((_, idx) => {
          const prev = last?.sets[idx] || last?.sets[last.sets.length - 1];
          return {
            setId: `set_${e.exerciseId}_${idx}`,
            setNumber: idx + 1,
            weightKg: prev?.weightKg ?? (e.targetWeightKg || 20),
            reps: prev?.reps ?? (parseInt(String(e.targetReps), 10) || 10),
            isCompleted: false,
          };
        }),
      };
    }) || [];

    const session: ActiveWorkoutSession = {
      sessionId: 'session_' + Date.now(),
      planId: plan?.id,
      planTitle: plan
        ? `${plan.title} (${selectedDay?.dayName.split('(')[0] || 'Day 1'})`
        : 'Freestyle Workout',
      startTime: Date.now(),
      exercises: defaultExercises,
      isFinished: false,
    };

    set({ activeSession: session });
  },

  toggleSetCompleted: (exerciseId, setIndex, weightKg, reps) => {
    const active = get().activeSession;
    if (!active) return;

    const updatedExercises = active.exercises.map((ex) => {
      if (ex.exerciseId !== exerciseId) return ex;
      const updatedSets = ex.sets.map((s, idx) => {
        if (idx !== setIndex) return s;
        return {
          ...s,
          weightKg,
          reps,
          isCompleted: !s.isCompleted,
        };
      });
      return { ...ex, sets: updatedSets };
    });

    set({
      activeSession: {
        ...active,
        exercises: updatedExercises,
      },
    });

    // Personal records are calculated in finishSession from completed sets.
  },

  updateSetValues: (exerciseId, setIndex, weightKg, reps) => {
    const active = get().activeSession;
    if (!active) return;

    const updatedExercises = active.exercises.map((ex) => {
      if (ex.exerciseId !== exerciseId) return ex;
      const updatedSets = ex.sets.map((s, idx) => {
        if (idx !== setIndex) return s;
        return { ...s, weightKg, reps };
      });
      return { ...ex, sets: updatedSets };
    });

    set({
      activeSession: {
        ...active,
        exercises: updatedExercises,
      },
    });
  },

  addSetToExercise: (exerciseId) => {
    const active = get().activeSession;
    if (!active) return;

    const updatedExercises = active.exercises.map((ex) => {
      if (ex.exerciseId !== exerciseId) return ex;
      const lastSet = ex.sets[ex.sets.length - 1];
      const newSet: ActiveSetLog = {
        setId: `set_${exerciseId}_${Date.now()}`,
        setNumber: ex.sets.length + 1,
        weightKg: lastSet ? lastSet.weightKg : 20,
        reps: lastSet ? lastSet.reps : 10,
        isCompleted: false,
      };
      return { ...ex, sets: [...ex.sets, newSet] };
    });

    set({
      activeSession: {
        ...active,
        exercises: updatedExercises,
      },
    });
  },

  removeSetFromExercise: (exerciseId, setIndex) => {
    const active = get().activeSession;
    if (!active) return;

    const updatedExercises = active.exercises.map((ex) => {
      if (ex.exerciseId !== exerciseId) return ex;
      const updatedSets = ex.sets
        .filter((_, idx) => idx !== setIndex)
        .map((s, newIdx) => ({ ...s, setNumber: newIdx + 1 }));
      return { ...ex, sets: updatedSets };
    });

    set({
      activeSession: {
        ...active,
        exercises: updatedExercises,
      },
    });
  },

  addExerciseToActiveSession: (exerciseDef) => {
    const active = get().activeSession;
    if (!active) return;

    const last = get().lastPerformance[exerciseDef.exerciseId];
    const top = last ? topSet(last) : undefined;
    const setCount = last ? Math.max(1, last.sets.length) : 3;
    const newEx: ActiveExerciseSession = {
      exerciseId: exerciseDef.exerciseId,
      exerciseName: exerciseDef.exerciseName,
      targetMuscle: exerciseDef.targetMuscle || 'General',
      lastWeightKg: top?.weightKg,
      lastReps: top?.reps,
      sets: Array.from({ length: setCount }).map((_, i) => ({
        setId: `s_${Date.now()}_${i + 1}`,
        setNumber: i + 1,
        weightKg: last?.sets[i]?.weightKg ?? 20,
        reps: last?.sets[i]?.reps ?? 10,
        isCompleted: false,
      })),
    };

    set({
      activeSession: {
        ...active,
        exercises: [...active.exercises, newEx],
      },
    });
  },

  removeExerciseFromActiveSession: (exerciseId) => {
    const active = get().activeSession;
    if (!active) return;

    set({
      activeSession: {
        ...active,
        exercises: active.exercises.filter((ex) => ex.exerciseId !== exerciseId),
      },
    });
  },

  finishSession: () => {
    const active = get().activeSession;
    if (!active) return null;

    const durationMinutes = Math.max(1, Math.round((Date.now() - active.startTime) / 60000));
    let totalVolumeKg = 0;

    active.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.isCompleted) {
          totalVolumeKg += s.weightKg * s.reps;
        }
      });
    });

    // Filter to strictly include ONLY exercises with at least 1 completed set
    const exercisesToLog = active.exercises.filter((ex) =>
      ex.sets.some((s) => s.isCompleted)
    );

    const exerciseLogs: LoggedExerciseDetail[] = exercisesToLog.map((ex) => {
      const completedSets = ex.sets.filter((s) => s.isCompleted);
      const totalExVolume = completedSets.reduce((acc, s) => acc + s.weightKg * s.reps, 0);
      const maxWeight = completedSets.reduce((max, s) => Math.max(max, s.weightKg), 0);
      const avgReps =
        completedSets.length > 0
          ? Math.round(completedSets.reduce((acc, s) => acc + s.reps, 0) / completedSets.length)
          : 0;

      return {
        name: ex.exerciseName,
        sets: completedSets.length,
        reps: `${avgReps} reps`,
        targetWeightKg: maxWeight,
        totalVolumeKg: totalExVolume,
      };
    });

    const header: CompletedWorkoutHeader = {
      id: 'history_' + Date.now(),
      title: active.planTitle,
      date: new Date().toISOString(),
      durationMinutes,
      totalVolumeKg,
      exerciseCount: exercisesToLog.length,
      exerciseLogs,
    };

    // If session belonged to a plan, automatically advance to next workout day in routine
    if (active.planId) {
      const planId = active.planId;
      const plan = get().savedPlans.find((p) => p.id === planId);
      if (plan && plan.days.length > 0) {
        const currentIdx = get().activeRoutineDayIndexMap[planId] || 0;
        const nextIdx = (currentIdx + 1) % plan.days.length;
        set((state) => ({
          activeRoutineDayIndexMap: {
            ...state.activeRoutineDayIndexMap,
            [planId]: nextIdx,
          },
        }));
      }
    }

    // Personal records: best estimated 1RM per exercise from completed sets.
    const newPRs: Record<string, { weightKg: number; reps: number; oneRmKg: number; date: string }> = {};
    exercisesToLog.forEach((ex) => {
      ex.sets.filter((s) => s.isCompleted && s.reps > 0 && s.weightKg > 0).forEach((s) => {
        const oneRm = calculate1RM(s.weightKg, s.reps);
        const best = newPRs[ex.exerciseId] || get().personalRecords[ex.exerciseId];
        if (!best || oneRm > best.oneRmKg) {
          newPRs[ex.exerciseId] = { weightKg: s.weightKg, reps: s.reps, oneRmKg: oneRm, date: header.date };
        }
      });
    });

    const newLast: Record<string, LastPerformance> = {};
    exercisesToLog.forEach((ex) => {
      newLast[ex.exerciseId] = {
        date: header.date,
        sets: ex.sets.filter((s) => s.isCompleted).map((s) => ({ weightKg: s.weightKg, reps: s.reps })),
      };
    });

    set((state) => ({
      activeSession: null,
      workoutHistory: [header, ...state.workoutHistory],
      personalRecords: { ...state.personalRecords, ...newPRs },
      lastPerformance: { ...state.lastPerformance, ...newLast },
    }));

    // Sync to Supabase
    const userId = useAuthStore.getState().profile?.id;
    if (userId) {
      const logPayload = {
        user_id: userId,
        plan_id: active.planId && UUID_RE.test(active.planId) ? active.planId : null,
        title: header.title,
        duration_minutes: header.durationMinutes,
        total_volume_kg: header.totalVolumeKg,
        exercise_count: header.exerciseCount,
        created_at: header.date
      };
      const setRows: any[] = [];
      exercisesToLog.forEach((ex) => {
        ex.sets.filter((s) => s.isCompleted).forEach((s) => {
          setRows.push({
            exercise_id: ex.exerciseId,
            exercise_name: ex.exerciseName,
            set_number: s.setNumber,
            weight_kg: s.weightKg,
            reps: s.reps,
            is_completed: true,
          });
        });
      });

      (async () => {
        try {
          const { data, error } = await supabase.from('workout_logs').insert(logPayload).select('id').single();
          if (error || !data) {
            queueOfflineTransaction('FINISH_WORKOUT', { log: logPayload, sets: setRows });
            return;
          }
          if (setRows.length > 0) {
            const { error: setsError } = await supabase
              .from('workout_log_sets')
              .insert(setRows.map((r) => ({ ...r, workout_log_id: data.id })));
            if (setsError) logger.warn('Failed to save workout sets:', setsError.message);
          }
        } catch {
          queueOfflineTransaction('FINISH_WORKOUT', { log: logPayload, sets: setRows });
        }
      })();

      Object.entries(newPRs).forEach(([exerciseId, pr]) => {
        const payload = {
          user_id: userId,
          exercise_id: exerciseId,
          weight_kg: pr.weightKg,
          reps: pr.reps,
          one_rm_kg: pr.oneRmKg,
          achieved_at: pr.date,
        };
        supabase.from('personal_records').upsert(payload, { onConflict: 'user_id,exercise_id' })
          .then(({ error }) => {
            if (error) queueOfflineTransaction('ADD_PR', payload);
          });
      });
    }

    return header;
  },

  cancelSession: () => set({ activeSession: null }),

  addCustomExercise: async (name: string, target_muscle: string, category: string) => {
    const userId = useAuthStore.getState().profile?.id;
    const tempId = 'custom_' + Date.now();
    const newEx: ExerciseDef = {
      id: tempId,
      name: name.trim(),
      target_muscle: target_muscle.trim(),
      category: category.trim() || 'Other',
      isCustom: true,
    };

    set((state) => ({
      exerciseCatalog: [...state.exerciseCatalog, newEx],
    }));

    try {
      const stored = await AsyncStorage.getItem('@trainr_custom_exercises');
      const existing: ExerciseDef[] = stored ? JSON.parse(stored) : [];
      await AsyncStorage.setItem('@trainr_custom_exercises', JSON.stringify([...existing, newEx]));
    } catch {}

    if (userId) {
      try {
        const { data, error } = await supabase
          .from('custom_exercises')
          .insert({
            created_by: userId,
            name: newEx.name,
            target_muscle: newEx.target_muscle,
            equipment: newEx.category,
          })
          .select()
          .single();

        if (!error && data) {
          set((state) => ({
            exerciseCatalog: state.exerciseCatalog.map((ex) =>
              ex.id === tempId ? { ...ex, id: data.id } : ex
            ),
          }));
          return { ...newEx, id: data.id };
        }
        if (error) logger.warn('Failed to save custom exercise:', error.message);
      } catch (err) {
        logger.error('Failed to save custom exercise to Supabase', err);
      }
    }
    return newEx;
  },

  reset: () =>
    set({
      exerciseCatalog: exerciseData as ExerciseDef[],
      savedPlans: [],
      activePlanId: null,
      activeRoutineDayIndexMap: {},
      activeSession: null,
      workoutHistory: [],
      personalRecords: {},
      lastPerformance: {},
      isLoading: false,
    }),
}), {
  // Keep an in-progress workout (and routine position) if the app is closed.
  name: '@trainr_workout_session',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({
    activeSession: state.activeSession,
    activePlanId: state.activePlanId,
    activeRoutineDayIndexMap: state.activeRoutineDayIndexMap,
  }),
}));

/** Heaviest set from a previous session (ties broken by reps). */
function topSet(last: LastPerformance): { weightKg: number; reps: number } | undefined {
  return last.sets.reduce<{ weightKg: number; reps: number } | undefined>(
    (best, s) => (!best || s.weightKg > best.weightKg || (s.weightKg === best.weightKg && s.reps > best.reps) ? s : best),
    undefined
  );
}
