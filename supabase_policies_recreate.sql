-- ====================================================================
-- SUPABASE RLS POLICIES FOR TRAINR
-- Safe to re-run: drops every existing policy in the trainr schema and
-- recreates the full set inside one transaction.
-- Run AFTER supabase_schema.sql.
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- 0. Lock down table access
--    Logged-out users (anon) get nothing. Logged-in users go through RLS.
-- --------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA trainr FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA trainr FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA trainr REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA trainr REVOKE ALL ON SEQUENCES FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA trainr TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA trainr TO service_role;

-- trainer_clients rows are created only by link_trainer_by_code().
-- Either party may only change the status column (to unlink).
REVOKE INSERT, UPDATE, DELETE ON trainr.trainer_clients FROM authenticated;
GRANT UPDATE (status) ON trainr.trainer_clients TO authenticated;

-- Trainers may only flip the acknowledgement fields on feed events.
REVOKE UPDATE ON trainr.trainer_feed_events FROM authenticated;
GRANT UPDATE (is_acknowledged, acknowledged_at) ON trainr.trainer_feed_events TO authenticated;

-- --------------------------------------------------------------------
-- 1. Enable RLS on every trainr table
-- --------------------------------------------------------------------
ALTER TABLE trainr.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.trainer_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.macro_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.workout_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.workout_plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.workout_plan_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.workout_log_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.checkin_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.trainer_feed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainr.custom_exercises ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- 2. Helper functions
--    SECURITY DEFINER so policies can check relationships without
--    recursing through other tables' RLS.
-- --------------------------------------------------------------------

-- True when the caller is the ACTIVE trainer of p_client_id.
CREATE OR REPLACE FUNCTION trainr.is_active_trainer_of(p_client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trainr.trainer_clients tc
    WHERE tc.trainer_id = auth.uid()
      AND tc.client_id = p_client_id
      AND tc.status = 'ACTIVE'
  );
$$;

-- The caller's current ACTIVE trainer, or NULL.
CREATE OR REPLACE FUNCTION trainr.my_active_trainer_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT tc.trainer_id FROM trainr.trainer_clients tc
  WHERE tc.client_id = auth.uid() AND tc.status = 'ACTIVE'
  ORDER BY tc.created_at DESC
  LIMIT 1;
$$;

-- True when the caller created the plan.
CREATE OR REPLACE FUNCTION trainr.owns_plan(p_plan_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trainr.workout_plans wp
    WHERE wp.id = p_plan_id AND wp.created_by = auth.uid()
  );
$$;

-- Link the caller (as client) to the trainer that owns p_code.
-- Replaces the old client-side lookup, so trainer profiles no longer
-- need to be publicly readable. Enforces one active trainer per client.
CREATE OR REPLACE FUNCTION trainr.link_trainer_by_code(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_trainer trainr.users%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_trainer FROM trainr.users
  -- Ignore case, spaces and the dash, so "ab 12cd" finds "AB-12CD".
  WHERE replace(trainer_code, '-', '') = regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g')
    AND role = 'TRAINER';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid Trainer Code or Trainer not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_trainer.id = v_uid THEN
    RAISE EXCEPTION 'You cannot link to your own Trainer Code.' USING ERRCODE = '22023';
  END IF;

  UPDATE trainr.trainer_clients
     SET status = 'UNLINKED'
   WHERE client_id = v_uid AND trainer_id <> v_trainer.id AND status = 'ACTIVE';

  INSERT INTO trainr.trainer_clients (trainer_id, client_id, status)
  VALUES (v_trainer.id, v_uid, 'ACTIVE')
  ON CONFLICT (trainer_id, client_id) DO UPDATE SET status = 'ACTIVE';

  UPDATE trainr.users SET linked_trainer_id = v_trainer.id WHERE id = v_uid;

  RETURN json_build_object(
    'id', v_trainer.id,
    'full_name', v_trainer.full_name,
    'trainer_code', v_trainer.trainer_code
  );
END;
$$;

-- When a relationship is unlinked (by either side), clear the client's
-- linked_trainer_id so the client app stops showing that trainer.
CREATE OR REPLACE FUNCTION trainr.handle_trainer_unlink()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'UNLINKED' AND OLD.status IS DISTINCT FROM 'UNLINKED' THEN
    UPDATE trainr.users
       SET linked_trainer_id = NULL
     WHERE id = NEW.client_id AND linked_trainer_id = NEW.trainer_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trainer_clients_unlink ON trainr.trainer_clients;
CREATE TRIGGER trainer_clients_unlink
  AFTER UPDATE OF status ON trainr.trainer_clients
  FOR EACH ROW EXECUTE FUNCTION trainr.handle_trainer_unlink();

REVOKE ALL ON FUNCTION trainr.is_active_trainer_of(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION trainr.my_active_trainer_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION trainr.owns_plan(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION trainr.link_trainer_by_code(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION trainr.handle_trainer_unlink() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION trainr.is_active_trainer_of(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION trainr.my_active_trainer_id() TO authenticated;
GRANT EXECUTE ON FUNCTION trainr.owns_plan(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION trainr.link_trainer_by_code(TEXT) TO authenticated;

-- --------------------------------------------------------------------
-- 3. Drop every existing policy in the schema
-- --------------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'trainr' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON trainr.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- --------------------------------------------------------------------
-- 4. Policies
--    Rule of thumb: you own your rows; your ACTIVE trainer can read them.
-- --------------------------------------------------------------------

-- Users: yourself, your active clients, and your active trainer.
CREATE POLICY "Users select" ON trainr.users
  FOR SELECT TO authenticated USING (
    id = auth.uid()
    OR trainr.is_active_trainer_of(id)
    OR id = trainr.my_active_trainer_id()
  );

CREATE POLICY "Users insert own" ON trainr.users
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "Users update own" ON trainr.users
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Trainer-client links: both parties can see and unlink (status only,
-- enforced by the column grant above). New links only via the function.
CREATE POLICY "Trainer clients select" ON trainr.trainer_clients
  FOR SELECT TO authenticated USING (auth.uid() IN (trainer_id, client_id));

CREATE POLICY "Trainer clients unlink" ON trainr.trainer_clients
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (trainer_id, client_id))
  WITH CHECK (auth.uid() IN (trainer_id, client_id) AND status = 'UNLINKED');

-- Macro targets: owner, plus the active trainer may set them (PRD 2.1).
CREATE POLICY "Macro targets select" ON trainr.macro_targets
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR trainr.is_active_trainer_of(user_id));

CREATE POLICY "Macro targets insert" ON trainr.macro_targets
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR trainr.is_active_trainer_of(user_id));

CREATE POLICY "Macro targets update" ON trainr.macro_targets
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR trainr.is_active_trainer_of(user_id))
  WITH CHECK (user_id = auth.uid() OR trainr.is_active_trainer_of(user_id));

-- Meals
CREATE POLICY "Meals select" ON trainr.meals
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR trainr.is_active_trainer_of(user_id));

CREATE POLICY "Meals insert own" ON trainr.meals
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Meals update own" ON trainr.meals
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Meals delete own" ON trainr.meals
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Meal items (follow the parent meal)
CREATE POLICY "Meal items select" ON trainr.meal_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM trainr.meals m
      WHERE m.id = meal_items.meal_id
        AND (m.user_id = auth.uid() OR trainr.is_active_trainer_of(m.user_id))
    )
  );

CREATE POLICY "Meal items insert own" ON trainr.meal_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM trainr.meals m WHERE m.id = meal_items.meal_id AND m.user_id = auth.uid())
  );

CREATE POLICY "Meal items delete own" ON trainr.meal_items
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM trainr.meals m WHERE m.id = meal_items.meal_id AND m.user_id = auth.uid())
  );

-- Workout plans: creator has full control; assigned clients can read.
CREATE POLICY "Workout plans select" ON trainr.workout_plans
  FOR SELECT TO authenticated USING (
    created_by = auth.uid()
    OR id IN (SELECT a.plan_id FROM trainr.workout_plan_assignments a WHERE a.client_id = auth.uid())
  );

CREATE POLICY "Workout plans write own" ON trainr.workout_plans
  FOR ALL TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- Workout plan days
CREATE POLICY "Workout plan days select" ON trainr.workout_plan_days
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM trainr.workout_plans wp WHERE wp.id = workout_plan_days.plan_id)
  );

CREATE POLICY "Workout plan days write own" ON trainr.workout_plan_days
  FOR ALL TO authenticated
  USING (trainr.owns_plan(plan_id))
  WITH CHECK (trainr.owns_plan(plan_id));

-- Workout plan exercises
CREATE POLICY "Workout plan exercises select" ON trainr.workout_plan_exercises
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM trainr.workout_plan_days d WHERE d.id = workout_plan_exercises.day_id)
  );

CREATE POLICY "Workout plan exercises write own" ON trainr.workout_plan_exercises
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM trainr.workout_plan_days d
    WHERE d.id = workout_plan_exercises.day_id AND trainr.owns_plan(d.plan_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM trainr.workout_plan_days d
    WHERE d.id = workout_plan_exercises.day_id AND trainr.owns_plan(d.plan_id)
  ));

-- Plan assignments: a trainer may assign only their OWN plans to their
-- ACTIVE clients.
CREATE POLICY "Workout plan assignments select" ON trainr.workout_plan_assignments
  FOR SELECT TO authenticated USING (auth.uid() IN (client_id, trainer_id));

CREATE POLICY "Workout plan assignments insert" ON trainr.workout_plan_assignments
  FOR INSERT TO authenticated WITH CHECK (
    trainer_id = auth.uid()
    AND trainr.owns_plan(plan_id)
    AND trainr.is_active_trainer_of(client_id)
  );

-- The trainer can unassign; the client can remove an assigned plan from
-- their own list (the trainer's plan itself is untouched).
CREATE POLICY "Workout plan assignments delete" ON trainr.workout_plan_assignments
  FOR DELETE TO authenticated USING (auth.uid() IN (trainer_id, client_id));

-- Workout logs
CREATE POLICY "Workout logs select" ON trainr.workout_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR trainr.is_active_trainer_of(user_id));

CREATE POLICY "Workout logs insert own" ON trainr.workout_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Workout log sets (follow the parent log)
CREATE POLICY "Workout log sets select" ON trainr.workout_log_sets
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM trainr.workout_logs l
      WHERE l.id = workout_log_sets.workout_log_id
        AND (l.user_id = auth.uid() OR trainr.is_active_trainer_of(l.user_id))
    )
  );

CREATE POLICY "Workout log sets insert own" ON trainr.workout_log_sets
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM trainr.workout_logs l WHERE l.id = workout_log_sets.workout_log_id AND l.user_id = auth.uid())
  );

-- Body measurements
CREATE POLICY "Body measurements select" ON trainr.body_measurements
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR trainr.is_active_trainer_of(user_id));

CREATE POLICY "Body measurements insert own" ON trainr.body_measurements
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Check-in photos
CREATE POLICY "Checkin photos select" ON trainr.checkin_photos
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR trainr.is_active_trainer_of(user_id));

CREATE POLICY "Checkin photos insert own" ON trainr.checkin_photos
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Checkin photos delete own" ON trainr.checkin_photos
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Weight logs
CREATE POLICY "Weight logs select" ON trainr.weight_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR trainr.is_active_trainer_of(user_id));

CREATE POLICY "Weight logs insert own" ON trainr.weight_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Personal records
CREATE POLICY "Personal records select" ON trainr.personal_records
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR trainr.is_active_trainer_of(user_id));

CREATE POLICY "Personal records write own" ON trainr.personal_records
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Trainer feed events
--   Client: creates events only for their own ACTIVE trainer.
--   Trainer: sees events only while the client is still linked;
--            may acknowledge (column grant above) and delete.
CREATE POLICY "Trainer feed events select" ON trainr.trainer_feed_events
  FOR SELECT TO authenticated USING (
    client_id = auth.uid()
    OR (trainer_id = auth.uid() AND trainr.is_active_trainer_of(client_id))
  );

CREATE POLICY "Trainer feed events insert" ON trainr.trainer_feed_events
  FOR INSERT TO authenticated WITH CHECK (
    client_id = auth.uid() AND trainer_id = trainr.my_active_trainer_id()
  );

CREATE POLICY "Trainer feed events acknowledge" ON trainr.trainer_feed_events
  FOR UPDATE TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainer feed events delete" ON trainr.trainer_feed_events
  FOR DELETE TO authenticated USING (auth.uid() IN (trainer_id, client_id));

-- Custom exercises: own, your active trainer's, and your active clients'.
CREATE POLICY "Custom exercises select" ON trainr.custom_exercises
  FOR SELECT TO authenticated USING (
    created_by = auth.uid()
    OR created_by = trainr.my_active_trainer_id()
    OR trainr.is_active_trainer_of(created_by)
  );

CREATE POLICY "Custom exercises insert own" ON trainr.custom_exercises
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Custom exercises delete own" ON trainr.custom_exercises
  FOR DELETE TO authenticated USING (created_by = auth.uid());

-- --------------------------------------------------------------------
-- 5. Account deletion (PRD 2.3 / 7.2)
--    Deletes the caller's auth user; every trainr row cascades from it.
--    The app removes the user's storage files first (storage objects
--    cannot be deleted from SQL).
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trainr.delete_my_account()
RETURNS VOID
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION trainr.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION trainr.delete_my_account() TO authenticated;

-- --------------------------------------------------------------------
-- 6. Photo storage: private bucket `trainr-media`
--    Files live at <owner uuid>/<meals|checkins|avatars>/<file>.
--    Owners manage their own files; an owner's active trainer and active
--    clients may view them.
-- --------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('trainr-media', 'trainr-media', false, 10485760,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- True when the caller may view files owned by p_owner (a folder name).
CREATE OR REPLACE FUNCTION trainr.can_view_user_media(p_owner TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_owner ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      p_owner::uuid = auth.uid()
      OR trainr.is_active_trainer_of(p_owner::uuid)
      OR p_owner::uuid = trainr.my_active_trainer_id()
    ELSE FALSE
  END;
$$;

REVOKE ALL ON FUNCTION trainr.can_view_user_media(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION trainr.can_view_user_media(TEXT) TO authenticated;

DROP POLICY IF EXISTS "Trainr media read" ON storage.objects;
DROP POLICY IF EXISTS "Trainr media upload own" ON storage.objects;
DROP POLICY IF EXISTS "Trainr media delete own" ON storage.objects;

CREATE POLICY "Trainr media read" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'trainr-media' AND trainr.can_view_user_media((storage.foldername(name))[1])
  );

CREATE POLICY "Trainr media upload own" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'trainr-media' AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Trainr media delete own" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'trainr-media' AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- --------------------------------------------------------------------
-- 7. Realtime: macro target changes reach the client app live (PRD 5.1)
-- --------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'trainr' AND tablename = 'macro_targets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE trainr.macro_targets;
  END IF;
END $$;

COMMIT;
