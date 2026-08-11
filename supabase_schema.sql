-- ====================================================================
-- SUPABASE POSTGRESQL DATABASE MIGRATION SCRIPT FOR TRAINR
-- Real-Time Client Fitness & Coaching Platform
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('CLIENT', 'TRAINER')),
  trainer_code TEXT UNIQUE, -- e.g. TR-8942 for Trainers
  linked_trainer_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- for Clients
  height_cm NUMERIC(5, 2),
  weight_kg NUMERIC(5, 2),
  dob DATE,
  sex TEXT CHECK (sex IN ('MALE', 'FEMALE', 'OTHER')),
  activity_level TEXT CHECK (activity_level IN ('SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE', 'EXTRA_ACTIVE')),
  goals TEXT[],
  theme_mode TEXT DEFAULT 'DARK' CHECK (theme_mode IN ('LIGHT', 'DARK', 'SYSTEM')),
  unit_system TEXT DEFAULT 'METRIC' CHECK (unit_system IN ('METRIC', 'IMPERIAL')),
  is_onboarded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TRAINER-CLIENT LINKING RELATIONSHIPS
CREATE TABLE IF NOT EXISTS public.trainer_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'UNLINKED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trainer_id, client_id)
);

-- 3. MACRO TARGETS TABLE
CREATE TABLE IF NOT EXISTS public.macro_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  calories INTEGER NOT NULL DEFAULT 2200,
  protein_g NUMERIC(5,1) NOT NULL DEFAULT 150.0,
  carbs_g NUMERIC(5,1) NOT NULL DEFAULT 220.0,
  fat_g NUMERIC(5,1) NOT NULL DEFAULT 70.0,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MEAL LOGS TABLE
CREATE TABLE IF NOT EXISTS public.meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  dish_name TEXT NOT NULL,
  photo_url TEXT,
  total_calories INTEGER NOT NULL,
  total_protein_g NUMERIC(5,1) NOT NULL,
  total_carbs_g NUMERIC(5,1) NOT NULL,
  total_fat_g NUMERIC(5,1) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MEAL ITEMS BREAKDOWN TABLE
CREATE TABLE IF NOT EXISTS public.meal_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT NOT NULL,
  calories INTEGER NOT NULL,
  protein_g NUMERIC(5,1) NOT NULL,
  carbs_g NUMERIC(5,1) NOT NULL,
  fat_g NUMERIC(5,1) NOT NULL
);

-- 6. WORKOUT PLANS TABLE
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. WORKOUT PLAN DAYS TABLE
CREATE TABLE IF NOT EXISTS public.workout_plan_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  day_name TEXT NOT NULL,
  day_order INTEGER NOT NULL DEFAULT 1
);

-- 8. WORKOUT PLAN EXERCISES TABLE
CREATE TABLE IF NOT EXISTS public.workout_plan_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_id UUID NOT NULL REFERENCES public.workout_plan_days(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  target_sets INTEGER NOT NULL DEFAULT 3,
  target_reps TEXT NOT NULL DEFAULT '8-12',
  target_weight_kg NUMERIC(5,2) DEFAULT 20.0
);

-- 9. WORKOUT PLAN ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.workout_plan_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, client_id)
);

-- 10. COMPLETED WORKOUT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.workout_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  total_volume_kg NUMERIC(10,2) NOT NULL,
  exercise_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. WORKOUT LOG SETS TABLE
CREATE TABLE IF NOT EXISTS public.workout_log_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_log_id UUID NOT NULL REFERENCES public.workout_logs(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  weight_kg NUMERIC(5,2) NOT NULL,
  reps INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT TRUE
);

-- 12. BODY MEASUREMENTS TABLE
CREATE TABLE IF NOT EXISTS public.body_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  neck_cm NUMERIC(5,2),
  shoulders_cm NUMERIC(5,2),
  chest_cm NUMERIC(5,2),
  waist_cm NUMERIC(5,2),
  hips_cm NUMERIC(5,2),
  biceps_cm NUMERIC(5,2),
  thighs_cm NUMERIC(5,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. CHECK-IN TRANSFORMATION PHOTOS TABLE
CREATE TABLE IF NOT EXISTS public.checkin_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.macro_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plan_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_log_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_photos ENABLE ROW LEVEL SECURITY;

-- Policy Helpers: Users read own data, Trainers read data of linked clients
CREATE POLICY "Users read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id OR id IN (SELECT client_id FROM public.trainer_clients WHERE trainer_id = auth.uid()));

CREATE POLICY "Users update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Trainer clients select" ON public.trainer_clients
  FOR SELECT USING (auth.uid() = trainer_id OR auth.uid() = client_id);

CREATE POLICY "Trainer clients insert delete" ON public.trainer_clients
  FOR ALL USING (auth.uid() = trainer_id OR auth.uid() = client_id);

CREATE POLICY "Meals owner or trainer select" ON public.meals
  FOR SELECT USING (auth.uid() = user_id OR user_id IN (SELECT client_id FROM public.trainer_clients WHERE trainer_id = auth.uid()));

CREATE POLICY "Meals insert own" ON public.meals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Workout logs owner or trainer select" ON public.workout_logs
  FOR SELECT USING (auth.uid() = user_id OR user_id IN (SELECT client_id FROM public.trainer_clients WHERE trainer_id = auth.uid()));

CREATE POLICY "Workout logs insert own" ON public.workout_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Checkin photos owner or trainer select" ON public.checkin_photos
  FOR SELECT USING (auth.uid() = user_id OR user_id IN (SELECT client_id FROM public.trainer_clients WHERE trainer_id = auth.uid()));

-- ====================================================================
-- REALTIME PUBLICATION SETUP
-- ====================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.meals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.checkin_photos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.body_measurements;
