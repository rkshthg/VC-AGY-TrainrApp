-- ================================================================
-- TRAINR 3-MONTH DATA RETENTION & STORAGE CLEANUP PROCEDURE
-- Deletes meal logs, unstarred progress photos, and archived logs > 90 days old.
-- ================================================================

CREATE OR REPLACE FUNCTION public.clean_old_trainr_data()
RETURNS void AS $$
DECLARE
  cutoff_date TIMESTAMP;
BEGIN
  -- Set 3-month (90 day) threshold date
  cutoff_date := NOW() - INTERVAL '90 days';

  -- 1. Delete meal entries older than 90 days
  DELETE FROM public.meal_entries
  WHERE created_at < cutoff_date
     OR (logged_date IS NOT NULL AND logged_date::date < cutoff_date::date);

  -- 2. Delete unstarred progress photos older than 90 days
  DELETE FROM public.progress_photos
  WHERE created_at < cutoff_date
    AND (is_starred IS NOT TRUE);

  -- 3. Delete unstarred progress check-ins older than 90 days
  DELETE FROM public.progress_check_ins
  WHERE check_in_date::date < cutoff_date::date
    AND (is_starred IS NOT TRUE);

  -- 4. Delete completed workout sessions older than 90 days
  DELETE FROM public.workout_sessions
  WHERE status = 'completed'
    AND ended_at < cutoff_date;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
