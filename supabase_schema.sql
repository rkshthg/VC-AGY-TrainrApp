-- ====================================================================
-- SUPABASE POSTGRESQL DATABASE MIGRATION SCRIPT FOR TRAINR
-- Real-Time Client Fitness & Coaching Platform
-- Custom Schema: trainr
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom schema for Trainr
CREATE SCHEMA IF NOT EXISTS trainr;

-- Grant usage on trainr schema to Supabase roles
GRANT USAGE ON SCHEMA trainr TO postgres, anon, authenticated, service_role;

-- 1. USERS & PROFILES TABLE
CREATE TABLE IF NOT EXISTS trainr.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('CLIENT', 'TRAINER')),
  trainer_code TEXT UNIQUE, -- e.g. TR-8942 for Trainers
  linked_trainer_id UUID REFERENCES trainr.users(id) ON DELETE SET NULL, -- for Clients
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
CREATE TABLE IF NOT EXISTS trainr.trainer_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES trainr.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES trainr.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'UNLINKED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trainer_id, client_id)
);

-- 3. MACRO TARGETS TABLE
CREATE TABLE IF NOT EXISTS trainr.macro_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES trainr.users(id) ON DELETE CASCADE,
  calories INTEGER NOT NULL DEFAULT 2500,
  protein_g NUMERIC(5,1) NOT NULL DEFAULT 75.0,
  carbs_g NUMERIC(5,1) NOT NULL DEFAULT 250.0,
  fat_g NUMERIC(5,1) NOT NULL DEFAULT 65.0,
  updated_by UUID REFERENCES trainr.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MEAL LOGS TABLE
CREATE TABLE IF NOT EXISTS trainr.meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES trainr.users(id) ON DELETE CASCADE,
  dish_name TEXT NOT NULL,
  category TEXT CHECK (category IN ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS')) DEFAULT 'SNACKS' NOT NULL,
  photo_url TEXT,
  total_calories INTEGER NOT NULL,
  total_protein_g NUMERIC(5,1) NOT NULL,
  total_carbs_g NUMERIC(5,1) NOT NULL,
  total_fat_g NUMERIC(5,1) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MEAL ITEMS BREAKDOWN TABLE
CREATE TABLE IF NOT EXISTS trainr.meal_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_id UUID NOT NULL REFERENCES trainr.meals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT NOT NULL,
  calories INTEGER NOT NULL,
  protein_g NUMERIC(5,1) NOT NULL,
  carbs_g NUMERIC(5,1) NOT NULL,
  fat_g NUMERIC(5,1) NOT NULL
);

-- 6. WORKOUT PLANS TABLE
CREATE TABLE IF NOT EXISTS trainr.workout_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES trainr.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. WORKOUT PLAN DAYS TABLE
CREATE TABLE IF NOT EXISTS trainr.workout_plan_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES trainr.workout_plans(id) ON DELETE CASCADE,
  day_name TEXT NOT NULL,
  day_order INTEGER NOT NULL DEFAULT 1
);

-- 8. WORKOUT PLAN EXERCISES TABLE
CREATE TABLE IF NOT EXISTS trainr.workout_plan_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_id UUID NOT NULL REFERENCES trainr.workout_plan_days(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  target_sets INTEGER NOT NULL DEFAULT 3,
  target_reps TEXT NOT NULL DEFAULT '8-12',
  target_weight_kg NUMERIC(5,2) DEFAULT 20.0
);

-- 9. WORKOUT PLAN ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS trainr.workout_plan_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES trainr.workout_plans(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES trainr.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES trainr.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, client_id)
);

-- 10. COMPLETED WORKOUT LOGS TABLE
CREATE TABLE IF NOT EXISTS trainr.workout_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES trainr.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES trainr.workout_plans(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  total_volume_kg NUMERIC(10,2) NOT NULL,
  exercise_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. WORKOUT LOG SETS TABLE
CREATE TABLE IF NOT EXISTS trainr.workout_log_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_log_id UUID NOT NULL REFERENCES trainr.workout_logs(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT,
  set_number INTEGER NOT NULL,
  weight_kg NUMERIC(5,2) NOT NULL,
  reps INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT TRUE
);

-- 12. BODY MEASUREMENTS TABLE
CREATE TABLE IF NOT EXISTS trainr.body_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES trainr.users(id) ON DELETE CASCADE,
  neck_cm NUMERIC(5,2),
  shoulders_cm NUMERIC(5,2),
  chest_cm NUMERIC(5,2),
  waist_cm NUMERIC(5,2),
  hips_cm NUMERIC(5,2),
  biceps_cm NUMERIC(5,2),
  biceps_l_cm NUMERIC(5,2),
  biceps_r_cm NUMERIC(5,2),
  thighs_cm NUMERIC(5,2),
  thighs_l_cm NUMERIC(5,2),
  thighs_r_cm NUMERIC(5,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. CHECK-IN TRANSFORMATION PHOTOS TABLE
CREATE TABLE IF NOT EXISTS trainr.checkin_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES trainr.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. WEIGHT LOGS TABLE
CREATE TABLE IF NOT EXISTS trainr.weight_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES trainr.users(id) ON DELETE CASCADE,
  weight_kg NUMERIC(5, 2) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. PERSONAL RECORDS (1RM) TABLE
CREATE TABLE IF NOT EXISTS trainr.personal_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES trainr.users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  weight_kg NUMERIC(5, 2) NOT NULL,
  reps INTEGER NOT NULL,
  one_rm_kg NUMERIC(5, 2) NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

-- 16. TRAINER FEED EVENTS TABLE
CREATE TABLE IF NOT EXISTS trainr.trainer_feed_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID REFERENCES trainr.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES trainr.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('LOG_MEAL', 'FINISH_WORKOUT', 'UPLOAD_CHECKIN', 'UPDATE_MEASUREMENTS', 'MISSED_WORKOUT')),
  action_verb TEXT NOT NULL,
  target_title TEXT NOT NULL,
  is_alert BOOLEAN DEFAULT FALSE,
  is_acknowledged BOOLEAN DEFAULT FALSE,
  photo_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE trainr.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.trainer_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.macro_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.workout_plan_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.workout_log_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.checkin_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.trainer_feed_events ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- GRANT PERMISSIONS & DEFAULT PRIVILEGES
-- ====================================================================

GRANT ALL ON ALL TABLES IN SCHEMA trainr TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA trainr TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA trainr GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA trainr GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- ====================================================================
-- REALTIME PUBLICATION SETUP
-- ====================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE trainr.meals;
ALTER PUBLICATION supabase_realtime ADD TABLE trainr.workout_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE trainr.checkin_photos;
ALTER PUBLICATION supabase_realtime ADD TABLE trainr.body_measurements;
ALTER PUBLICATION supabase_realtime ADD TABLE trainr.weight_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE trainr.personal_records;
ALTER PUBLICATION supabase_realtime ADD TABLE trainr.trainer_feed_events;

