import { create } from 'zustand';
import exerciseData from '../assets/data/exercises.json';
import { calculate1RM } from '../lib/healthMetrics';

export interface ExerciseDef {
  id: string;
  name: string;
  target_muscle: string;
  category: string;
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

  createPlan: (plan: Omit<WorkoutPlan, 'id'>, assignedClientIds?: string[]) => void;
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
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  exerciseCatalog: exerciseData as ExerciseDef[],
  savedPlans: [
    {
      id: 'plan_1',
      title: 'Hypertrophy Push/Pull/Legs',
      createdBy: 'usr_1',
      days: [
        {
          id: 'day_push',
          dayName: 'Day 1: Push (Chest / Shoulders / Triceps)',
          exercises: [
            { exerciseId: 'ex_01', name: 'Barbell Bench Press', targetSets: 4, targetReps: '8-10', targetWeightKg: 75 },
            { exerciseId: 'ex_28', name: 'Seated Dumbbell Shoulder Press', targetSets: 3, targetReps: '10-12', targetWeightKg: 20 },
            { exerciseId: 'ex_38', name: 'Tricep Rope Pushdown', targetSets: 3, targetReps: '12-15', targetWeightKg: 25 },
          ],
        },
        {
          id: 'day_pull',
          dayName: 'Day 2: Pull (Back / Biceps)',
          exercises: [
            { exerciseId: 'ex_20', name: 'Lat Pulldown (Wide Grip)', targetSets: 4, targetReps: '10-12', targetWeightKg: 55 },
            { exerciseId: 'ex_22', name: 'Single-Arm Dumbbell Row', targetSets: 3, targetReps: '8-10', targetWeightKg: 24 },
            { exerciseId: 'ex_33', name: 'Barbell Bicep Curl', targetSets: 3, targetReps: '10-12', targetWeightKg: 30 },
          ],
        },
      ],
    },
  ],
  activePlanId: 'plan_1',
  activeRoutineDayIndexMap: { plan_1: 0 },
  setActivePlan: (planId: string) => set({ activePlanId: planId }),
  setActiveRoutineDayIndex: (planId: string, dayIndex: number) =>
    set((state) => ({
      activeRoutineDayIndexMap: {
        ...state.activeRoutineDayIndexMap,
        [planId]: dayIndex,
      },
    })),
  activeSession: null,
  workoutHistory: [
    {
      id: 'history_1',
      title: 'Hypertrophy Push',
      date: new Date(Date.now() - 86400000).toISOString(),
      durationMinutes: 48,
      totalVolumeKg: 4250,
      exerciseCount: 4,
    },
  ],
  personalRecords: {
    ex_01: { weightKg: 85, reps: 5, oneRmKg: 99.2, date: new Date().toISOString() },
    ex_07: { weightKg: 110, reps: 5, oneRmKg: 128.3, date: new Date().toISOString() },
  },

  createPlan: (planData, assignedClientIds) => {
    const newPlan: WorkoutPlan = {
      ...planData,
      id: 'plan_' + Date.now(),
      assignedClientIds: assignedClientIds || planData.assignedClientIds || [],
    };
    set((state) => ({
      savedPlans: [newPlan, ...state.savedPlans],
    }));
  },

  updatePlan: (planId, updates) =>
    set((state) => ({
      savedPlans: state.savedPlans.map((p) => (p.id === planId ? { ...p, ...updates } : p)),
    })),

  deletePlan: (planId) =>
    set((state) => ({
      savedPlans: state.savedPlans.filter((p) => p.id !== planId),
    })),

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
      return {
        exerciseId: e.exerciseId,
        exerciseName: e.name,
        targetMuscle: catalogItem ? catalogItem.category : 'General',
        sets: Array.from({ length: e.targetSets }).map((_, idx) => ({
          setId: `set_${e.exerciseId}_${idx}`,
          setNumber: idx + 1,
          weightKg: e.targetWeightKg || 20,
          reps: 10,
          isCompleted: false,
        })),
      };
    }) || [
      {
        exerciseId: 'ex_01',
        exerciseName: 'Barbell Bench Press',
        targetMuscle: 'Chest',
        sets: [
          { setId: 's1', setNumber: 1, weightKg: 60, reps: 10, isCompleted: false },
          { setId: 's2', setNumber: 2, weightKg: 70, reps: 8, isCompleted: false },
          { setId: 's3', setNumber: 3, weightKg: 70, reps: 8, isCompleted: false },
        ],
      },
    ];

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

    // Check PR update
    const calculated1RM = calculate1RM(weightKg, reps);
    const existingPR = get().personalRecords[exerciseId];
    if (!existingPR || calculated1RM > existingPR.oneRmKg) {
      set((state) => ({
        personalRecords: {
          ...state.personalRecords,
          [exerciseId]: {
            weightKg,
            reps,
            oneRmKg: calculated1RM,
            date: new Date().toISOString(),
          },
        },
      }));
    }
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

    const newEx: ActiveExerciseSession = {
      exerciseId: exerciseDef.exerciseId,
      exerciseName: exerciseDef.exerciseName,
      targetMuscle: exerciseDef.targetMuscle || 'General',
      sets: [
        { setId: `s_${Date.now()}_1`, setNumber: 1, weightKg: 20, reps: 10, isCompleted: false },
        { setId: `s_${Date.now()}_2`, setNumber: 2, weightKg: 20, reps: 10, isCompleted: false },
        { setId: `s_${Date.now()}_3`, setNumber: 3, weightKg: 20, reps: 10, isCompleted: false },
      ],
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

    const exerciseLogs: LoggedExerciseDetail[] = active.exercises.map((ex) => {
      const completedSets = ex.sets.filter((s) => s.isCompleted);
      const totalExVolume = completedSets.reduce((acc, s) => acc + s.weightKg * s.reps, 0);
      const maxWeight = completedSets.reduce((max, s) => Math.max(max, s.weightKg), 0);
      const avgReps =
        completedSets.length > 0
          ? Math.round(completedSets.reduce((acc, s) => acc + s.reps, 0) / completedSets.length)
          : 10;

      return {
        name: ex.exerciseName,
        sets: Math.max(1, completedSets.length),
        reps: `${avgReps} reps`,
        targetWeightKg: maxWeight || 20,
        totalVolumeKg: totalExVolume || maxWeight * 10,
      };
    });

    const header: CompletedWorkoutHeader = {
      id: 'history_' + Date.now(),
      title: active.planTitle,
      date: new Date().toISOString(),
      durationMinutes,
      totalVolumeKg,
      exerciseCount: active.exercises.length,
      exerciseLogs,
    };

    // If session belonged to a plan, automatically advance to next workout day in routine!
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

    set((state) => ({
      activeSession: null,
      workoutHistory: [header, ...state.workoutHistory],
    }));

    return header;
  },

  cancelSession: () => set({ activeSession: null }),
}));
