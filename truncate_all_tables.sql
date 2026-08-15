-- ====================================================================
-- TRAINR DATABASE TRUNCATE / RESET SCRIPT
-- Truncates all user activity logs, meals, workouts, clients, and profiles
-- Run this script in the Supabase SQL Editor to start with a clean slate.
-- ====================================================================

-- 1. Truncate all tables in trainr schema with CASCADE to handle foreign keys
DO $$
BEGIN
  -- Truncate trainr schema tables if they exist
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'trainr' AND tablename = 'users') THEN
    TRUNCATE TABLE 
      trainr.trainer_feed_events,
      trainr.personal_records,
      trainr.weight_logs,
      trainr.checkin_photos,
      trainr.body_measurements,
      trainr.workout_log_sets,
      trainr.workout_logs,
      trainr.workout_plan_assignments,
      trainr.workout_plan_exercises,
      trainr.workout_plan_days,
      trainr.workout_plans,
      trainr.meal_items,
      trainr.meals,
      trainr.macro_targets,
      trainr.trainer_clients,
      trainr.users
    RESTART IDENTITY CASCADE;
    RAISE NOTICE 'Successfully truncated trainr schema tables.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error truncating trainr schema: %', SQLERRM;
END $$;

-- 2. Truncate public schema tables if created in public schema
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    TRUNCATE TABLE 
      public.trainer_feed_events,
      public.personal_records,
      public.weight_logs,
      public.checkin_photos,
      public.body_measurements,
      public.workout_log_sets,
      public.workout_logs,
      public.workout_plan_assignments,
      public.workout_plan_exercises,
      public.workout_plan_days,
      public.workout_plans,
      public.meal_items,
      public.meals,
      public.macro_targets,
      public.trainer_clients,
      public.users
    RESTART IDENTITY CASCADE;
    RAISE NOTICE 'Successfully truncated public schema tables.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error truncating public schema: %', SQLERRM;
END $$;
