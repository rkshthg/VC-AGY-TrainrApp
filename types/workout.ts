/**
 * Workout & Exercise Domain Types
 * @module types/workout
 */

export interface DBExercise {
  id: string;
  name: string;
  muscle_groups: string[];
  target_muscle_groups?: {
    primary: string[];
    secondary: string[];
    all_involved: string[];
  };
  equipment?: string;
  description?: string;
}

export interface DBPlanExercise {
  id?: string;
  exercise_id: string;
  exercise_name: string;
  muscle_groups?: string[];
  exercise_order: number;
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  notes?: string;
}

export interface DBPlanDay {
  id?: string;
  day_order: number;
  day_label: string;
  day_name?: string;
  exercises: DBPlanExercise[];
}

export interface DBWorkoutPlan {
  id?: string;
  created_by: string;
  name: string;
  title?: string;
  description?: string;
  goal: string;
  assigned_to_user_id?: string;
  days: DBPlanDay[];
}

export interface LoggedSet {
  id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  rpe?: number;
  completed: boolean;
  isPR?: boolean;
}

export interface ActiveSessionExercise {
  exercise_id: string;
  exercise_name: string;
  muscle_groups?: string[];
  sets_target: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  completed_sets: LoggedSet[];
}

export interface ActiveWorkoutSession {
  id: string;
  session_name: string;
  started_at: string;
  day_label: string;
  exercises: ActiveSessionExercise[];
  isRestTimerActive: boolean;
  restTimerSeconds: number;
}

export interface CompletedWorkoutSummary {
  id: string;
  title: string;
  date: string;
  duration_minutes: number;
  exercises_count: number;
}

export interface PRCelebration {
  exerciseName: string;
  new1RM: number;
  weightKg: number;
  reps: number;
}
