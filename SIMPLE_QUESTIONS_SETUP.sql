-- Simple setup for questions table without complex role checking
-- Run this in Supabase SQL Editor

-- Step 1: Create the questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  image_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 2: Enable RLS on questions table
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if they exist
DROP POLICY IF EXISTS "Questions are viewable by everyone" ON public.questions;
DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;
DROP POLICY IF EXISTS "Authenticated users can manage questions" ON public.questions;

-- Step 4: Create simple policies (no role checking)
-- Questions are viewable by everyone
CREATE POLICY "Questions are viewable by everyone"
  ON public.questions FOR SELECT
  USING (true);

-- Anyone can insert questions (for admin use)
CREATE POLICY "Anyone can insert questions"
  ON public.questions FOR INSERT
  WITH CHECK (true);

-- Anyone can update questions (for admin use)
CREATE POLICY "Anyone can update questions"
  ON public.questions FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Anyone can delete questions (for admin use)
CREATE POLICY "Anyone can delete questions"
  ON public.questions FOR DELETE
  USING (true);

-- Step 5: Add questions table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;

-- Step 6: Grant necessary permissions
GRANT ALL ON public.questions TO authenticated;
GRANT ALL ON public.questions TO anon;

-- Step 7: Test the setup
INSERT INTO public.questions (question_text, order_index) 
VALUES ('Test question - should work now', 1);

-- Step 8: Clean up test data
DELETE FROM public.questions WHERE question_text = 'Test question - should work now';
