-- Fix team registration by updating RLS policies
-- Run this in Supabase SQL Editor

-- Step 1: Drop the restrictive policy that blocks team registration
DROP POLICY IF EXISTS "Admins can manage teams" ON public.teams;

-- Step 2: Create a policy that allows anyone to register teams
CREATE POLICY "Allow team registration" ON public.teams
FOR INSERT WITH CHECK (true);

-- Step 3: Test that team registration works
INSERT INTO public.teams (team_number, team_name) 
VALUES (999, 'Test Registration - Should Work');

-- Step 4: Clean up test data
DELETE FROM public.teams WHERE team_number = 999;
