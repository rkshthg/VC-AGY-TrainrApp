-- ====================================================================
-- SUPABASE RLS POLICIES FOR TRAINR
-- ====================================================================

-- 1. Enable RLS on all trainr tables
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

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users read own profile" ON trainr.users;
DROP POLICY IF EXISTS "Users update own profile" ON trainr.users;
DROP POLICY IF EXISTS "Users insert own profile" ON trainr.users;
DROP POLICY IF EXISTS "Trainer clients select" ON trainr.trainer_clients;
DROP POLICY IF EXISTS "Trainer clients insert delete" ON trainr.trainer_clients;
DROP POLICY IF EXISTS "Macro targets select own or trainer" ON trainr.macro_targets;
DROP POLICY IF EXISTS "Macro targets insert own" ON trainr.macro_targets;
DROP POLICY IF EXISTS "Macro targets update own" ON trainr.macro_targets;
DROP POLICY IF EXISTS "Meals owner or trainer select" ON trainr.meals;
DROP POLICY IF EXISTS "Meals insert own" ON trainr.meals;
DROP POLICY IF EXISTS "Meal items select own or trainer" ON trainr.meal_items;
DROP POLICY IF EXISTS "Meal items insert own" ON trainr.meal_items;
DROP POLICY IF EXISTS "Workout plan assignments select" ON trainr.workout_plan_assignments;
DROP POLICY IF EXISTS "Workout plan assignments insert update delete" ON trainr.workout_plan_assignments;
DROP POLICY IF EXISTS "Workout logs owner or trainer select" ON trainr.workout_logs;
DROP POLICY IF EXISTS "Workout logs insert own" ON trainr.workout_logs;
DROP POLICY IF EXISTS "Workout log sets select own or trainer" ON trainr.workout_log_sets;
DROP POLICY IF EXISTS "Workout log sets insert own" ON trainr.workout_log_sets;
DROP POLICY IF EXISTS "Body measurements select own or trainer" ON trainr.body_measurements;
DROP POLICY IF EXISTS "Body measurements insert own" ON trainr.body_measurements;
DROP POLICY IF EXISTS "Checkin photos owner or trainer select" ON trainr.checkin_photos;
DROP POLICY IF EXISTS "Checkin photos insert own" ON trainr.checkin_photos;
DROP POLICY IF EXISTS "Weight logs owner or trainer select" ON trainr.weight_logs;
DROP POLICY IF EXISTS "Weight logs insert own" ON trainr.weight_logs;
DROP POLICY IF EXISTS "Personal records owner or trainer select" ON trainr.personal_records;
DROP POLICY IF EXISTS "Personal records insert own" ON trainr.personal_records;
DROP POLICY IF EXISTS "Trainer feed events select" ON trainr.trainer_feed_events;
DROP POLICY IF EXISTS "Trainer feed events insert update" ON trainr.trainer_feed_events;

-- 3. Create RLS Policies

-- Users
CREATE POLICY "Users read own profile" ON trainr.users
  FOR SELECT USING (
    auth.uid() = id 
    OR id IN (SELECT client_id FROM trainr.trainer_clients WHERE trainer_id = auth.uid())
    OR role = 'TRAINER'
  );

CREATE POLICY "Users update own profile" ON trainr.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users insert own profile" ON trainr.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trainer Clients
CREATE POLICY "Trainer clients select" ON trainr.trainer_clients
  FOR SELECT USING (auth.uid() = trainer_id OR auth.uid() = client_id);

CREATE POLICY "Trainer clients insert delete" ON trainr.trainer_clients
  FOR ALL USING (auth.uid() = trainer_id OR auth.uid() = client_id);

-- Macro Targets
CREATE POLICY "Macro targets select own or trainer" ON trainr.macro_targets
  FOR SELECT USING (auth.uid() = user_id OR user_id IN (SELECT client_id FROM trainr.trainer_clients WHERE trainer_id = auth.uid()));

CREATE POLICY "Macro targets insert own" ON trainr.macro_targets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Macro targets update own" ON trainr.macro_targets
  FOR UPDATE USING (auth.uid() = user_id);

-- Meals
CREATE POLICY "Meals owner or trainer select" ON trainr.meals
  FOR SELECT USING (auth.uid() = user_id OR user_id IN (SELECT client_id FROM trainr.trainer_clients WHERE trainer_id = auth.uid()));

CREATE POLICY "Meals insert own" ON trainr.meals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Meal Items
CREATE POLICY "Meal items select own or trainer" ON trainr.meal_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainr.meals
      WHERE meals.id = meal_items.meal_id
      AND (meals.user_id = auth.uid() OR meals.user_id IN (SELECT client_id FROM trainr.trainer_clients WHERE trainer_id = auth.uid()))
    )
  );

CREATE POLICY "Meal items insert own" ON trainr.meal_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainr.meals
      WHERE meals.id = meal_items.meal_id
      AND meals.user_id = auth.uid()
    )
  );

-- Workout Plans
DROP POLICY IF EXISTS "Workout plans select" ON trainr.workout_plans;
DROP POLICY IF EXISTS "Workout plans insert update delete" ON trainr.workout_plans;

CREATE POLICY "Workout plans select" ON trainr.workout_plans
  FOR SELECT USING (
    auth.uid() = created_by 
    OR id IN (SELECT plan_id FROM trainr.workout_plan_assignments WHERE client_id = auth.uid() OR trainer_id = auth.uid())
  );

CREATE POLICY "Workout plans insert update delete" ON trainr.workout_plans
  FOR ALL USING (auth.uid() = created_by);

-- Workout Plan Days
DROP POLICY IF EXISTS "Workout plan days select" ON trainr.workout_plan_days;
DROP POLICY IF EXISTS "Workout plan days insert update delete" ON trainr.workout_plan_days;

CREATE POLICY "Workout plan days select" ON trainr.workout_plan_days
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainr.workout_plans
      WHERE workout_plans.id = workout_plan_days.plan_id
      AND (
        workout_plans.created_by = auth.uid() 
        OR workout_plans.id IN (SELECT plan_id FROM trainr.workout_plan_assignments WHERE client_id = auth.uid() OR trainer_id = auth.uid())
      )
    )
  );

CREATE POLICY "Workout plan days insert update delete" ON trainr.workout_plan_days
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trainr.workout_plans
      WHERE workout_plans.id = workout_plan_days.plan_id
      AND workout_plans.created_by = auth.uid()
    )
  );

-- Workout Plan Exercises
DROP POLICY IF EXISTS "Workout plan exercises select" ON trainr.workout_plan_exercises;
DROP POLICY IF EXISTS "Workout plan exercises insert update delete" ON trainr.workout_plan_exercises;

CREATE POLICY "Workout plan exercises select" ON trainr.workout_plan_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainr.workout_plan_days
      JOIN trainr.workout_plans ON workout_plans.id = workout_plan_days.plan_id
      WHERE workout_plan_days.id = workout_plan_exercises.day_id
      AND (
        workout_plans.created_by = auth.uid()
        OR workout_plans.id IN (SELECT plan_id FROM trainr.workout_plan_assignments WHERE client_id = auth.uid() OR trainer_id = auth.uid())
      )
    )
  );

CREATE POLICY "Workout plan exercises insert update delete" ON trainr.workout_plan_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trainr.workout_plan_days
      JOIN trainr.workout_plans ON workout_plans.id = workout_plan_days.plan_id
      WHERE workout_plan_days.id = workout_plan_exercises.day_id
      AND workout_plans.created_by = auth.uid()
    )
  );

-- Workout Plan Assignments
CREATE POLICY "Workout plan assignments select" ON trainr.workout_plan_assignments
  FOR SELECT USING (auth.uid() = client_id OR auth.uid() = trainer_id);

CREATE POLICY "Workout plan assignments insert update delete" ON trainr.workout_plan_assignments
  FOR ALL USING (auth.uid() = trainer_id);

-- Workout Logs
CREATE POLICY "Workout logs owner or trainer select" ON trainr.workout_logs
  FOR SELECT USING (auth.uid() = user_id OR user_id IN (SELECT client_id FROM trainr.trainer_clients WHERE trainer_id = auth.uid()));

CREATE POLICY "Workout logs insert own" ON trainr.workout_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Workout Log Sets
CREATE POLICY "Workout log sets select own or trainer" ON trainr.workout_log_sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainr.workout_logs
      WHERE workout_logs.id = workout_log_sets.workout_log_id
      AND (workout_logs.user_id = auth.uid() OR workout_logs.user_id IN (SELECT client_id FROM trainr.trainer_clients WHERE trainer_id = auth.uid()))
    )
  );

CREATE POLICY "Workout log sets insert own" ON trainr.workout_log_sets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainr.workout_logs
      WHERE workout_logs.id = workout_log_sets.workout_log_id
      AND workout_logs.user_id = auth.uid()
    )
  );

-- Body Measurements
CREATE POLICY "Body measurements select own or trainer" ON trainr.body_measurements
  FOR SELECT USING (auth.uid() = user_id OR user_id IN (SELECT client_id FROM trainr.trainer_clients WHERE trainer_id = auth.uid()));

CREATE POLICY "Body measurements insert own" ON trainr.body_measurements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Check-in Photos
CREATE POLICY "Checkin photos owner or trainer select" ON trainr.checkin_photos
  FOR SELECT USING (auth.uid() = user_id OR user_id IN (SELECT client_id FROM trainr.trainer_clients WHERE trainer_id = auth.uid()));

CREATE POLICY "Checkin photos insert own" ON trainr.checkin_photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Weight Logs
CREATE POLICY "Weight logs owner or trainer select" ON trainr.weight_logs
  FOR SELECT USING (auth.uid() = user_id OR user_id IN (SELECT client_id FROM trainr.trainer_clients WHERE trainer_id = auth.uid()));

CREATE POLICY "Weight logs insert own" ON trainr.weight_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Personal Records
CREATE POLICY "Personal records owner or trainer select" ON trainr.personal_records
  FOR SELECT USING (auth.uid() = user_id OR user_id IN (SELECT client_id FROM trainr.trainer_clients WHERE trainer_id = auth.uid()));

CREATE POLICY "Personal records insert own" ON trainr.personal_records
  FOR ALL USING (auth.uid() = user_id);

-- Trainer Feed Events
CREATE POLICY "Trainer feed events select" ON trainr.trainer_feed_events
  FOR SELECT USING (auth.uid() = trainer_id OR auth.uid() = client_id OR client_id IN (SELECT client_id FROM trainr.trainer_clients WHERE trainer_id = auth.uid()));

CREATE POLICY "Trainer feed events insert update" ON trainr.trainer_feed_events
  FOR ALL USING (auth.uid() = trainer_id OR auth.uid() = client_id);
