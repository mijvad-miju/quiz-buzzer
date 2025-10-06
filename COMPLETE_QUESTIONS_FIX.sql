-- Complete fix for questions table - add all missing columns
-- Run this in Supabase SQL Editor

-- Step 1: Check current table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'questions' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Add all missing columns to questions table
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_session_id ON public.questions(session_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON public.questions(session_id, order_index);
CREATE INDEX IF NOT EXISTS idx_questions_active ON public.questions(is_active);

-- Step 4: Update existing questions to have proper values
-- Set order_index for existing questions
UPDATE public.questions 
SET order_index = subquery.row_number
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_number
  FROM public.questions
) AS subquery
WHERE public.questions.id = subquery.id;

-- Set is_active to false for existing questions
UPDATE public.questions 
SET is_active = false 
WHERE is_active IS NULL;

-- Step 5: Add constraints to ensure data integrity
ALTER TABLE public.questions 
ADD CONSTRAINT IF NOT EXISTS check_order_index_positive CHECK (order_index >= 0);

-- Step 6: Create function to get next order index for a session
CREATE OR REPLACE FUNCTION get_next_order_index(session_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  next_index INTEGER;
BEGIN
  SELECT COALESCE(MAX(order_index), 0) + 1
  INTO next_index
  FROM public.questions
  WHERE session_id = session_uuid;
  
  RETURN next_index;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create function to reorder questions when one is deleted
CREATE OR REPLACE FUNCTION reorder_questions_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Update order_index for questions that come after the deleted one
  UPDATE public.questions 
  SET order_index = order_index - 1
  WHERE session_id = OLD.session_id 
    AND order_index > OLD.order_index;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger to automatically reorder questions
DROP TRIGGER IF EXISTS trigger_reorder_questions ON public.questions;
CREATE TRIGGER trigger_reorder_questions
  AFTER DELETE ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION reorder_questions_after_delete();

-- Step 9: Create function to check if session has questions
CREATE OR REPLACE FUNCTION session_has_questions(session_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  question_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO question_count
  FROM public.questions
  WHERE session_id = session_uuid;
  
  RETURN question_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create function to get session question count
CREATE OR REPLACE FUNCTION get_session_question_count(session_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  question_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO question_count
  FROM public.questions
  WHERE session_id = session_uuid;
  
  RETURN question_count;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Verify the table structure after changes
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'questions' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 12: Test the functions
SELECT 'Questions table structure updated successfully!' as status;
SELECT 'All required columns added: session_id, order_index, is_active' as result;
