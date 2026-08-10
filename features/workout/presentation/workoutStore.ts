/**
 * Workout Routines, Active Session & PR Celebration State Store
 * @module store/workoutStore
 */

import { create } from 'zustand';
import {
  fetchExercises,
  createWorkoutPlan,
  fetchUserAssignedPlan,
  saveWorkoutSession,
  DEFAULT_GLOBAL_EXERCISES,
} from '../data/workoutService';
import { useAuthStore } from '@/features/auth/presentation/authStore';
import { checkPersonalRecord, PRResult } from '../domain/prCalculator';
import {
  DBExercise,
  DBWorkoutPlan,
  DBPlanDay,
  ActiveWorkoutSession,
  ActiveSessionExercise,
  LoggedSet,
  CompletedWorkoutSummary,
  PRCelebration,
} from '../domain/workout';

export type { LoggedSet };


interface WorkoutState {
  exercises: DBExercise[];
  activePlan: DBWorkoutPlan | null;
  activeSession: ActiveWorkoutSession | null;
  completedSessions: CompletedWorkoutSummary[];
  isLoadingPlan: boolean;
  latestPR: PRCelebration | null;
  historical1RMs: Record<string, number>;

  fetchExerciseLibrary: () => Promise<void>;
  fetchPlanForUser: (userId: string) => Promise<void>;
  saveNewPlan: (plan: DBWorkoutPlan) => Promise<boolean>;
  startWorkoutSession: (day: DBPlanDay) => void;
  logCompletedSet: (exerciseId: string, weightKg: number, reps: number, rpe?: number) => PRResult | null;
  startRestTimer: (seconds: number) => void;
  tickRestTimer: () => void;
  stopRestTimer: () => void;
  finishWorkoutSession: () => Promise<void>;
  clearPRCelebration: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  exercises: DEFAULT_GLOBAL_EXERCISES,
  activePlan: null,
  activeSession: null,
  completedSessions: [],
  isLoadingPlan: false,
  latestPR: null,
  historical1RMs: {},

  fetchExerciseLibrary: async () => {
    const list = await fetchExercises();
    set({ exercises: list });
  },

  fetchPlanForUser: async (userId) => {
    if (!userId) return;
    set({ isLoadingPlan: true });
    const plan = await fetchUserAssignedPlan(userId);
    set({ activePlan: plan, isLoadingPlan: false });
  },

  saveNewPlan: async (plan) => {
    const { user } = useAuthStore.getState();
    const success = await createWorkoutPlan(plan, plan.assigned_to_user_id);
    if (success) {
      // Only set as activePlan if created for current logged in user (not when assigning to client)
      if (!plan.assigned_to_user_id || plan.assigned_to_user_id === user?.id) {
        set({ activePlan: plan });
      }
    }
    return success;
  },



  startWorkoutSession: (day) => {
    const dayLabel = day?.day_label || day?.day_name || 'Freestyle Workout';
    const dayExercises = day?.exercises || [];

    const sessionExercises: ActiveSessionExercise[] = dayExercises.map((e) => {
      const match = get().exercises.find((ex) => ex.id === e.exercise_id || ex.name === e.exercise_name);
      return {
        exercise_id: e.exercise_id || 'ex-1',
        exercise_name: match?.name || e.exercise_name || 'Exercise',
        muscle_groups: match?.muscle_groups || ['Strength'],
        sets_target: e.sets || 3,
        reps_min: e.reps_min || 10,
        reps_max: e.reps_max || 12,
        rest_seconds: e.rest_seconds || 60,
        completed_sets: Array.from({ length: e.sets || 3 }).map((_, idx) => ({
          id: Math.random().toString(),
          set_number: idx + 1,
          weight_kg: 0,
          reps: e.reps_min || 10,
          completed: false,
        })),
      };
    });

    const newSession: ActiveWorkoutSession = {
      id: Math.random().toString(),
      session_name: dayLabel,
      started_at: new Date().toISOString(),
      day_label: dayLabel,
      exercises: sessionExercises.length > 0 ? sessionExercises : [
        {
          exercise_id: 'ex-bench',
          exercise_name: 'Bench Press',
          muscle_groups: ['Chest', 'Triceps'],
          sets_target: 3,
          reps_min: 8,
          reps_max: 12,
          rest_seconds: 90,
          completed_sets: [
            { id: '1', set_number: 1, weight_kg: 60, reps: 10, completed: false },
            { id: '2', set_number: 2, weight_kg: 60, reps: 10, completed: false },
            { id: '3', set_number: 3, weight_kg: 60, reps: 10, completed: false },
          ],
        },
      ],
      isRestTimerActive: false,
      restTimerSeconds: 60,
    };

    set({ activeSession: newSession });
  },

  logCompletedSet: (exerciseId, weightKg, reps, rpe) => {
    const session = get().activeSession;
    if (!session) return null;

    const historicalMap = get().historical1RMs;
    const currentHist1RM = historicalMap[exerciseId] || 0;
    const prCheck = checkPersonalRecord('Exercise', weightKg, reps, currentHist1RM, currentHist1RM);

    let foundExerciseName = 'Exercise';

    const updatedExercises = session.exercises.map((ex) => {
      if (ex.exercise_id === exerciseId || ex.exercise_name === exerciseId) {
        foundExerciseName = ex.exercise_name;
        const updatedSets = [...ex.completed_sets];
        const uncompletedIdx = updatedSets.findIndex((s) => !s.completed);
        if (uncompletedIdx !== -1) {
          updatedSets[uncompletedIdx] = {
            ...updatedSets[uncompletedIdx],
            weight_kg: weightKg,
            reps,
            rpe,
            completed: true,
            isPR: prCheck.isNew1RMPR,
          };
        } else {
          updatedSets.push({
            id: Math.random().toString(),
            set_number: updatedSets.length + 1,
            weight_kg: weightKg,
            reps,
            rpe,
            completed: true,
            isPR: prCheck.isNew1RMPR,
          });
        }
        return { ...ex, completed_sets: updatedSets };
      }
      return ex;
    });

    set({
      activeSession: { ...session, exercises: updatedExercises },
    });

    if (prCheck.isNew1RMPR) {
      set({
        historical1RMs: { ...historicalMap, [exerciseId]: prCheck.calculated1RM },
        latestPR: {
          exerciseName: foundExerciseName,
          new1RM: prCheck.calculated1RM,
          weightKg,
          reps,
        },
      });
    }

    return prCheck;
  },

  startRestTimer: (seconds) => {
    const session = get().activeSession;
    if (!session) return;
    set({
      activeSession: {
        ...session,
        isRestTimerActive: true,
        restTimerSeconds: seconds,
      },
    });
  },

  tickRestTimer: () => {
    const session = get().activeSession;
    if (!session || !session.isRestTimerActive) return;
    if (session.restTimerSeconds <= 1) {
      set({
        activeSession: {
          ...session,
          isRestTimerActive: false,
          restTimerSeconds: 0,
        },
      });
    } else {
      set({
        activeSession: {
          ...session,
          restTimerSeconds: session.restTimerSeconds - 1,
        },
      });
    }
  },

  stopRestTimer: () => {
    const session = get().activeSession;
    if (!session) return;
    set({
      activeSession: {
        ...session,
        isRestTimerActive: false,
        restTimerSeconds: 0,
      },
    });
  },

  finishWorkoutSession: async () => {
    const session = get().activeSession;
    if (session) {
      const now = new Date();
      const start = new Date(session.started_at);
      const durationMins = Math.max(1, Math.round((now.getTime() - start.getTime()) / 60000));
      const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const newFinished: CompletedWorkoutSummary = {
        id: session.id,
        title: session.session_name,
        date: `Today at ${formattedTime}`,
        duration_minutes: durationMins,
        exercises_count: session.exercises.length,
      };

      set((state) => ({
        activeSession: null,
        completedSessions: [newFinished, ...state.completedSessions],
      }));

      // Persist to Supabase DB if user is logged in
      const { user } = useAuthStore.getState();
      if (user?.id) {
        await saveWorkoutSession({
          user_id: user.id,
          title: session.session_name,
          duration_minutes: durationMins,
          exercises: session.exercises,
          notes: `${session.exercises.length} exercises completed`,
        });
      }
    } else {
      set({ activeSession: null });
    }
  },

  clearPRCelebration: () => set({ latestPR: null }),
}));

