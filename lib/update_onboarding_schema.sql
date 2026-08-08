-- ================================================================
-- TRAINR DATABASE SCHEMA UPDATE FOR ONBOARDING & DATA RETENTION
-- Run this in your Supabase SQL Editor to update your tables.
-- ================================================================

-- 1. Add onboarding columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS sex TEXT,
ADD COLUMN IF NOT EXISTS height_cm NUMERIC,
ADD COLUMN IF NOT EXISTS weight_kg NUMERIC,
ADD COLUMN IF NOT EXISTS weight_goal TEXT,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- 2. Add onboarding columns to client_profiles table
ALTER TABLE public.client_profiles
ADD COLUMN IF NOT EXISTS sex TEXT,
ADD COLUMN IF NOT EXISTS height_cm NUMERIC,
ADD COLUMN IF NOT EXISTS weight_kg NUMERIC,
ADD COLUMN IF NOT EXISTS weight_goal TEXT,
ADD COLUMN IF NOT EXISTS chest_cm NUMERIC,
ADD COLUMN IF NOT EXISTS waist_cm NUMERIC,
ADD COLUMN IF NOT EXISTS hip_cm NUMERIC,
ADD COLUMN IF NOT EXISTS bicep_cm NUMERIC,
ADD COLUMN IF NOT EXISTS thigh_cm NUMERIC,
ADD COLUMN IF NOT EXISTS calorie_target NUMERIC DEFAULT 2200,
ADD COLUMN IF NOT EXISTS protein_target NUMERIC DEFAULT 160,
ADD COLUMN IF NOT EXISTS carbs_target NUMERIC DEFAULT 220,
ADD COLUMN IF NOT EXISTS fat_target NUMERIC DEFAULT 70,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- 3. Add is_starred column to progress_photos table
ALTER TABLE public.progress_photos
ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE;

-- 4. Add is_starred column to progress_check_ins table
ALTER TABLE public.progress_check_ins
ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE;

-- 5. Add trainer_code column to trainer_profiles and users tables
ALTER TABLE public.trainer_profiles 
ADD COLUMN IF NOT EXISTS trainer_code TEXT UNIQUE;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS trainer_code TEXT UNIQUE;


