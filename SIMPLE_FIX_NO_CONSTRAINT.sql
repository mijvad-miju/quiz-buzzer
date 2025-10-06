-- Simple fix without foreign key constraint
-- Copy and paste this into Supabase SQL Editor

-- Step 1: Add missing columns to questions table
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS session_id UUID,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Step 2: Update existing questions with proper values
-- First, set order_index using a subquery approach
UPDATE public.questions 
SET order_index = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
  FROM public.questions
) AS subquery
WHERE public.questions.id = subquery.id;

UPDATE public.questions 
SET is_active = false
WHERE is_active IS NULL;

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_session_id ON public.questions(session_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON public.questions(session_id, order_index);

-- Step 4: Verify the fix worked
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'questions' 
  AND table_schema = 'public'
  AND column_name IN ('session_id', 'order_index', 'is_active')
ORDER BY column_name;

-- Step 5: Show success message
SELECT 'Questions table fixed successfully! All required columns added.' as status;
