-- Fix questions table structure for session-based system
-- Run this in Supabase SQL Editor

-- Step 1: Add missing columns to questions table
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Step 2: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_questions_session_id ON public.questions(session_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON public.questions(session_id, order_index);

-- Step 3: Update existing questions to have proper order_index
-- This will set order_index for existing questions based on their creation time
UPDATE public.questions 
SET order_index = subquery.row_number
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_number
  FROM public.questions
) AS subquery
WHERE public.questions.id = subquery.id;

-- Step 4: Ensure all questions have session_id (if you have existing questions without sessions)
-- You may need to assign them to a default session or handle this manually
-- UPDATE public.questions SET session_id = (SELECT id FROM public.sessions LIMIT 1) WHERE session_id IS NULL;

-- Step 5: Add constraints to ensure data integrity
ALTER TABLE public.questions 
ADD CONSTRAINT IF NOT EXISTS check_order_index_positive CHECK (order_index >= 0);

-- Step 6: Create function to reorder questions when one is deleted
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

-- Step 7: Create trigger to automatically reorder questions
DROP TRIGGER IF EXISTS trigger_reorder_questions ON public.questions;
CREATE TRIGGER trigger_reorder_questions
  AFTER DELETE ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION reorder_questions_after_delete();

-- Step 8: Create function to get next order index for a session
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

-- Step 9: Create function to move question up in order
CREATE OR REPLACE FUNCTION move_question_up(question_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_order INTEGER;
  session_uuid UUID;
  prev_question_id UUID;
BEGIN
  -- Get current question details
  SELECT order_index, session_id 
  INTO current_order, session_uuid
  FROM public.questions 
  WHERE id = question_uuid;
  
  IF current_order <= 1 THEN
    RETURN false; -- Already at top
  END IF;
  
  -- Get previous question
  SELECT id INTO prev_question_id
  FROM public.questions
  WHERE session_id = session_uuid AND order_index = current_order - 1;
  
  -- Swap order indices
  UPDATE public.questions SET order_index = current_order WHERE id = prev_question_id;
  UPDATE public.questions SET order_index = current_order - 1 WHERE id = question_uuid;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create function to move question down in order
CREATE OR REPLACE FUNCTION move_question_down(question_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_order INTEGER;
  session_uuid UUID;
  next_question_id UUID;
  max_order INTEGER;
BEGIN
  -- Get current question details
  SELECT order_index, session_id 
  INTO current_order, session_uuid
  FROM public.questions 
  WHERE id = question_uuid;
  
  -- Get max order for session
  SELECT COALESCE(MAX(order_index), 0) INTO max_order
  FROM public.questions
  WHERE session_id = session_uuid;
  
  IF current_order >= max_order THEN
    RETURN false; -- Already at bottom
  END IF;
  
  -- Get next question
  SELECT id INTO next_question_id
  FROM public.questions
  WHERE session_id = session_uuid AND order_index = current_order + 1;
  
  -- Swap order indices
  UPDATE public.questions SET order_index = current_order WHERE id = next_question_id;
  UPDATE public.questions SET order_index = current_order + 1 WHERE id = question_uuid;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Verify the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'questions' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 12: Test the setup
SELECT 'Questions table structure updated successfully!' as status;
