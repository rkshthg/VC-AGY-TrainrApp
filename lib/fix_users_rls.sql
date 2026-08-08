-- Supabase RLS Fix Script for Trainr users & profiles
-- Execute this script in your Supabase SQL Editor to grant proper permissions for auth users.

-- 1. Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read users table
DROP POLICY IF EXISTS "Users can read users table" ON public.users;
CREATE POLICY "Users can read users table" ON public.users
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert their own user row
DROP POLICY IF EXISTS "Users can insert own record" ON public.users;
CREATE POLICY "Users can insert own record" ON public.users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update their own user row
DROP POLICY IF EXISTS "Users can update own record" ON public.users;
CREATE POLICY "Users can update own record" ON public.users
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 2. Enable RLS and permissions on trainer_profiles
ALTER TABLE public.trainer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trainers manage own profile" ON public.trainer_profiles;
CREATE POLICY "Trainers manage own profile" ON public.trainer_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Enable RLS and permissions on client_profiles
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients manage own profile" ON public.client_profiles;
CREATE POLICY "Clients manage own profile" ON public.client_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id OR auth.uid() IN (SELECT trainer_id FROM client_profiles WHERE user_id = client_profiles.user_id));
