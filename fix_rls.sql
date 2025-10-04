-- Complete fix for team registration RLS issue
-- This will allow anonymous users to register teams

-- Step 1: Check current policies (run this first to see what exists)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'teams';

-- Step 2: Drop ALL existing policies on teams table
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON public.teams;
DROP POLICY IF EXISTS "Admins can manage teams" ON public.teams;
DROP POLICY IF EXISTS "Anyone can register teams" ON public.teams;
DROP POLICY IF EXISTS "Anyone can update team scores" ON public.teams;
DROP POLICY IF EXISTS "Admins can delete teams" ON public.teams;

-- Step 3: Create new, correct policies
-- Allow everyone to view teams
CREATE POLICY "teams_select_policy" ON public.teams
FOR SELECT USING (true);

-- Allow anonymous users to register teams (INSERT)
CREATE POLICY "teams_insert_policy" ON public.teams
FOR INSERT WITH CHECK (true);

-- Allow everyone to update teams (for scoring)
CREATE POLICY "teams_update_policy" ON public.teams
FOR UPDATE USING (true) WITH CHECK (true);

-- Only admins can delete teams
CREATE POLICY "teams_delete_policy" ON public.teams
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Step 4: Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'teams';
