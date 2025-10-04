-- Database Diagnostic Script
-- Run this in Supabase SQL Editor to check the current state

-- 1. Check if tables exist
SELECT 
    schemaname, 
    tablename, 
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('teams', 'user_roles', 'game_state', 'buzz_events')
ORDER BY tablename;

-- 2. Check current RLS status on tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('teams', 'user_roles', 'game_state', 'buzz_events')
ORDER BY tablename;

-- 3. Check all current policies on teams table
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename = 'teams'
ORDER BY policyname;

-- 4. Check if the has_role function exists
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'has_role';

-- 5. Check if app_role enum exists
SELECT 
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'app_role'
ORDER BY e.enumsortorder;

-- 6. Check current data in teams table
SELECT 
    id,
    team_number,
    team_name,
    score,
    created_at
FROM public.teams
ORDER BY team_number;

-- 7. Check current data in user_roles table
SELECT 
    id,
    user_id,
    role,
    created_at
FROM public.user_roles
ORDER BY created_at;

-- 8. Test the has_role function with null (anonymous user)
SELECT public.has_role(null, 'admin') as anonymous_has_admin_role;

-- 9. Check if there are any existing users in auth.users
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users
LIMIT 5;

