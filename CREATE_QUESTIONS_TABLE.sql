-- Complete setup for questions table
-- Run this in Supabase SQL Editor

-- Step 1: Create the questions table
CREATE TABLE public.questions (
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

-- Step 3: Create policies for questions table
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

-- Step 4: Add questions table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;

-- Step 5: Grant necessary permissions
GRANT ALL ON public.questions TO authenticated;
GRANT ALL ON public.questions TO anon;

-- Step 6: Test the setup by inserting a sample question
INSERT INTO public.questions (question_text, order_index) 
VALUES ('Sample question - setup complete!', 1);

-- Step 7: Verify the table was created
SELECT * FROM public.questions;

-- Step 8: Clean up test data
DELETE FROM public.questions WHERE question_text = 'Sample question - setup complete!';