-- Setup policies for the questions table you created
-- Run this in Supabase SQL Editor to enable question management

-- Step 1: Enable RLS on questions table
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Step 2: Create policies for questions table
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

-- Step 3: Add questions table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;

-- Step 4: Grant necessary permissions
GRANT ALL ON public.questions TO authenticated;
GRANT ALL ON public.questions TO anon;


