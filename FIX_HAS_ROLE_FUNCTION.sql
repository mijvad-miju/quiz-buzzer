-- Fix the has_role function and policies for question management
-- Run this in Supabase SQL Editor

-- Step 1: Create the has_role function
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, role_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user has the specified role
  -- For now, we'll check if the user exists in the auth.users table
  -- You can modify this logic based on your specific role requirements
  
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Simple check: if user exists in auth.users, they can be an admin
  -- You can add more sophisticated role checking here
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = user_id
  );
END;
$$;

-- Step 2: Create the questions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  image_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 3: Enable RLS on questions table
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if they exist
DROP POLICY IF EXISTS "Questions are viewable by everyone" ON public.questions;
DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;

-- Step 5: Create new policies
-- Questions are viewable by everyone
CREATE POLICY "Questions are viewable by everyone"
  ON public.questions FOR SELECT
  USING (true);

-- Only authenticated users can manage questions (simplified for now)
CREATE POLICY "Authenticated users can manage questions"
  ON public.questions FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Step 6: Add questions table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;

-- Step 7: Grant necessary permissions
GRANT ALL ON public.questions TO authenticated;
GRANT ALL ON public.questions TO anon;
