-- Quick fix for questions table - add missing columns
-- Run this in Supabase SQL Editor

-- Add missing columns to questions table
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_questions_session_id ON public.questions(session_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON public.questions(session_id, order_index);

-- Update existing questions to have proper order_index
UPDATE public.questions 
SET order_index = subquery.row_number
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_number
  FROM public.questions
) AS subquery
WHERE public.questions.id = subquery.id;

-- Verify the columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'questions' 
  AND table_schema = 'public'
  AND column_name IN ('session_id', 'order_index', 'is_active');

SELECT 'Questions table fixed successfully!' as status;
