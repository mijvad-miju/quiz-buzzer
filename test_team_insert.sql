-- Test script to reproduce the team registration issue
-- Run this in Supabase SQL Editor

-- 1. First, let's see what happens when we try to insert as anonymous user
-- This should fail with RLS error
INSERT INTO public.teams (team_number, team_name) 
VALUES (1, 'Test Team');

-- 2. Check what policies are blocking this
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'teams' 
AND cmd IN ('INSERT', 'ALL');

-- 3. Test the has_role function
SELECT 
    auth.uid() as current_user_id,
    public.has_role(auth.uid(), 'admin') as has_admin_role,
    public.has_role(null, 'admin') as null_has_admin_role;

