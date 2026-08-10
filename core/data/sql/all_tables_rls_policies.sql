-- ================================================================
-- 0. SCHEMA MIGRATION & COLUMN SAFETY
-- Ensure all tables and required columns exist before applying RLS policies
-- ================================================================

-- client_profiles columns
ALTER TABLE public.client_profiles
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS trainer_id UUID,
  ADD COLUMN IF NOT EXISTS assigned_plan_id UUID,
  ADD COLUMN IF NOT EXISTS last_workout TEXT;

-- client_invites columns
ALTER TABLE public.client_invites
  ADD COLUMN IF NOT EXISTS trainer_id UUID;

-- trainer_client_relationships columns
ALTER TABLE public.trainer_client_relationships
  ADD COLUMN IF NOT EXISTS trainer_id UUID,
  ADD COLUMN IF NOT EXISTS client_id UUID;

-- notifications table & columns
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID,
  client_id UUID,
  type TEXT,
  title TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS trainer_id UUID,
  ADD COLUMN IF NOT EXISTS client_id UUID,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 1. USERS TABLE
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read users" ON public.users;
CREATE POLICY "Allow authenticated read users" ON public.users
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow users insert own row" ON public.users;
CREATE POLICY "Allow users insert own row" ON public.users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users update own row" ON public.users;
CREATE POLICY "Allow users update own row" ON public.users
  FOR UPDATE TO authenticated USING (auth.uid() = id);


-- 2. TRAINER PROFILES TABLE
ALTER TABLE public.trainer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read trainer profiles" ON public.trainer_profiles;
CREATE POLICY "Allow read trainer profiles" ON public.trainer_profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Trainers manage own profile" ON public.trainer_profiles;
CREATE POLICY "Trainers manage own profile" ON public.trainer_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 3. CLIENT PROFILES TABLE
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow view client profile" ON public.client_profiles;
CREATE POLICY "Allow view client profile" ON public.client_profiles
  FOR SELECT TO authenticated USING (
    auth.uid() = user_id OR auth.uid() = trainer_id
  );

DROP POLICY IF EXISTS "Allow manage client profile" ON public.client_profiles;
CREATE POLICY "Allow manage client profile" ON public.client_profiles
  FOR ALL TO authenticated USING (
    auth.uid() = user_id OR auth.uid() = trainer_id
  ) WITH CHECK (
    auth.uid() = user_id OR auth.uid() = trainer_id
  );


-- 4. TRAINER CLIENT RELATIONSHIPS TABLE
ALTER TABLE public.trainer_client_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow view relationships" ON public.trainer_client_relationships;
CREATE POLICY "Allow view relationships" ON public.trainer_client_relationships
  FOR SELECT TO authenticated USING (
    auth.uid() = trainer_id OR auth.uid() = client_id
  );

DROP POLICY IF EXISTS "Allow insert relationship" ON public.trainer_client_relationships;
CREATE POLICY "Allow insert relationship" ON public.trainer_client_relationships
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = trainer_id OR auth.uid() = client_id
  );

DROP POLICY IF EXISTS "Allow update relationship" ON public.trainer_client_relationships;
CREATE POLICY "Allow update relationship" ON public.trainer_client_relationships
  FOR UPDATE TO authenticated USING (
    auth.uid() = trainer_id OR auth.uid() = client_id
  );


-- 5. CLIENT INVITES TABLE
ALTER TABLE public.client_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read invites" ON public.client_invites;
CREATE POLICY "Allow read invites" ON public.client_invites
  FOR SELECT TO authenticated USING (
    auth.uid() = trainer_id OR status = 'pending'
  );

DROP POLICY IF EXISTS "Allow insert invites" ON public.client_invites;
CREATE POLICY "Allow insert invites" ON public.client_invites
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = trainer_id
  );

DROP POLICY IF EXISTS "Allow update invites" ON public.client_invites;
CREATE POLICY "Allow update invites" ON public.client_invites
  FOR UPDATE TO authenticated USING (
    auth.uid() = trainer_id OR status = 'pending'
  );


-- 6. MEAL ENTRIES TABLE
ALTER TABLE public.meal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow view meal entries" ON public.meal_entries;
CREATE POLICY "Allow view meal entries" ON public.meal_entries
  FOR SELECT TO authenticated USING (
    auth.uid() = user_id 
    OR auth.uid() IN (SELECT trainer_id FROM client_profiles WHERE user_id = meal_entries.user_id)
    OR auth.uid() IN (SELECT trainer_id FROM trainer_client_relationships WHERE client_id = meal_entries.user_id AND status = 'accepted')
  );

DROP POLICY IF EXISTS "Allow insert own meals" ON public.meal_entries;
CREATE POLICY "Allow insert own meals" ON public.meal_entries
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Allow update own meals" ON public.meal_entries;
CREATE POLICY "Allow update own meals" ON public.meal_entries
  FOR UPDATE TO authenticated USING (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Allow delete own meals" ON public.meal_entries;
CREATE POLICY "Allow delete own meals" ON public.meal_entries
  FOR DELETE TO authenticated USING (
    auth.uid() = user_id
  );


-- 7. MACRO TARGETS TABLE
ALTER TABLE public.macro_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow view macro targets" ON public.macro_targets;
CREATE POLICY "Allow view macro targets" ON public.macro_targets
  FOR SELECT TO authenticated USING (
    auth.uid() = user_id 
    OR auth.uid() IN (SELECT trainer_id FROM client_profiles WHERE user_id = macro_targets.user_id)
    OR auth.uid() IN (SELECT trainer_id FROM trainer_client_relationships WHERE client_id = macro_targets.user_id AND status = 'accepted')
  );

DROP POLICY IF EXISTS "Allow manage macro targets" ON public.macro_targets;
CREATE POLICY "Allow manage macro targets" ON public.macro_targets
  FOR ALL TO authenticated USING (
    auth.uid() = user_id 
    OR auth.uid() IN (SELECT trainer_id FROM client_profiles WHERE user_id = macro_targets.user_id)
    OR auth.uid() IN (SELECT trainer_id FROM trainer_client_relationships WHERE client_id = macro_targets.user_id AND status = 'accepted')
  );


-- 8. EXERCISES TABLE
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read exercises" ON public.exercises;
CREATE POLICY "Allow read exercises" ON public.exercises
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow create exercises" ON public.exercises;
CREATE POLICY "Allow create exercises" ON public.exercises
  FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');


-- 9. WORKOUT PLANS & ASSIGNMENTS
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow view workout plans" ON public.workout_plans;
CREATE POLICY "Allow view workout plans" ON public.workout_plans
  FOR SELECT TO authenticated USING (
    auth.uid() = created_by 
    OR auth.uid() IN (SELECT assigned_to FROM workout_plan_assignments WHERE plan_id = workout_plans.id)
    OR auth.uid() IN (SELECT user_id FROM client_profiles WHERE assigned_plan_id = workout_plans.id)
    OR auth.uid() IN (SELECT client_id FROM trainer_client_relationships WHERE trainer_id = workout_plans.created_by)
    OR auth.uid() IN (SELECT user_id FROM client_profiles WHERE trainer_id = workout_plans.created_by)
  );

DROP POLICY IF EXISTS "Allow manage workout plans" ON public.workout_plans;
CREATE POLICY "Allow manage workout plans" ON public.workout_plans
  FOR ALL TO authenticated USING (
    auth.uid() = created_by
  ) WITH CHECK (
    auth.uid() = created_by
  );

ALTER TABLE public.workout_plan_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow manage plan assignments" ON public.workout_plan_assignments;
CREATE POLICY "Allow manage plan assignments" ON public.workout_plan_assignments
  FOR ALL TO authenticated USING (
    auth.uid() = assigned_to OR auth.uid() = assigned_by
  ) WITH CHECK (
    auth.uid() = assigned_to OR auth.uid() = assigned_by
  );


-- 10. WORKOUT PLAN DAYS & EXERCISES
ALTER TABLE public.workout_plan_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow manage plan days" ON public.workout_plan_days;
CREATE POLICY "Allow manage plan days" ON public.workout_plan_days
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.workout_plan_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow manage plan exercises" ON public.workout_plan_exercises;
CREATE POLICY "Allow manage plan exercises" ON public.workout_plan_exercises
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 11. WORKOUT SESSIONS & SETS
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow manage workout sessions" ON public.workout_sessions;
CREATE POLICY "Allow manage workout sessions" ON public.workout_sessions
  FOR ALL TO authenticated USING (
    auth.uid() = user_id 
    OR auth.uid() IN (SELECT trainer_id FROM client_profiles WHERE user_id = workout_sessions.user_id)
    OR auth.uid() IN (SELECT trainer_id FROM trainer_client_relationships WHERE client_id = workout_sessions.user_id)
    OR auth.uid() IN (SELECT assigned_by FROM workout_plan_assignments WHERE assigned_to = workout_sessions.user_id)
  ) WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT trainer_id FROM client_profiles WHERE user_id = workout_sessions.user_id)
    OR auth.uid() IN (SELECT trainer_id FROM trainer_client_relationships WHERE client_id = workout_sessions.user_id)
  );

ALTER TABLE public.workout_session_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow manage workout session sets" ON public.workout_session_sets;
CREATE POLICY "Allow manage workout session sets" ON public.workout_session_sets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 12. PROGRESS CHECK INS TABLE
ALTER TABLE public.progress_check_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow view check-ins" ON public.progress_check_ins;
CREATE POLICY "Allow view check-ins" ON public.progress_check_ins
  FOR SELECT TO authenticated USING (
    auth.uid() = user_id 
    OR auth.uid() IN (SELECT trainer_id FROM client_profiles WHERE user_id = progress_check_ins.user_id)
    OR auth.uid() IN (SELECT trainer_id FROM trainer_client_relationships WHERE client_id = progress_check_ins.user_id AND status = 'accepted')
  );

DROP POLICY IF EXISTS "Allow manage check-ins" ON public.progress_check_ins;
CREATE POLICY "Allow manage check-ins" ON public.progress_check_ins
  FOR ALL TO authenticated USING (
    auth.uid() = user_id
  ) WITH CHECK (
    auth.uid() = user_id
  );


-- 13. BODY MEASUREMENTS TABLE
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow manage body measurements" ON public.body_measurements;
CREATE POLICY "Allow manage body measurements" ON public.body_measurements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 14. PROGRESS PHOTOS TABLE
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow view progress photos" ON public.progress_photos;
CREATE POLICY "Allow view progress photos" ON public.progress_photos
  FOR SELECT TO authenticated USING (
    auth.uid() = user_id 
    OR auth.uid() IN (SELECT trainer_id FROM client_profiles WHERE user_id = progress_photos.user_id)
    OR auth.uid() IN (SELECT trainer_id FROM trainer_client_relationships WHERE client_id = progress_photos.user_id AND status = 'accepted')
  );

DROP POLICY IF EXISTS "Allow manage progress photos" ON public.progress_photos;
CREATE POLICY "Allow manage progress photos" ON public.progress_photos
  FOR ALL TO authenticated USING (
    auth.uid() = user_id
  ) WITH CHECK (
    auth.uid() = user_id
  );


-- 15. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL,
  client_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated insert notifications" ON public.notifications;
CREATE POLICY "Allow authenticated insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read notifications" ON public.notifications;
CREATE POLICY "Allow authenticated read notifications" ON public.notifications
  FOR SELECT TO authenticated USING (
    auth.uid() = trainer_id OR auth.uid() = client_id
  );


