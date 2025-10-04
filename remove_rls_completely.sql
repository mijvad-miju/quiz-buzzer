-- COMPLETE RLS REMOVAL - This will allow team registration without any restrictions
-- Run this in Supabase SQL Editor

-- Step 1: Drop ALL existing policies on teams table
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON public.teams;
DROP POLICY IF EXISTS "Admins can manage teams" ON public.teams;
DROP POLICY IF EXISTS "Anyone can register teams" ON public.teams;
DROP POLICY IF EXISTS "Anyone can update team scores" ON public.teams;
DROP POLICY IF EXISTS "Admins can delete teams" ON public.teams;
DROP POLICY IF EXISTS "Allow team registration" ON public.teams;
DROP POLICY IF EXISTS "Allow team viewing" ON public.teams;
DROP POLICY IF EXISTS "Allow team updates" ON public.teams;
DROP POLICY IF EXISTS "Admin team deletion" ON public.teams;

-- Step 2: Completely disable RLS on teams table
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;

-- Step 3: Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'teams';

-- Step 4: Test insert to make sure it works
INSERT INTO public.teams (team_number, team_name) 
VALUES (999, 'Test Team - Should Work Now');

-- Step 5: Clean up test data
DELETE FROM public.teams WHERE team_number = 999;

