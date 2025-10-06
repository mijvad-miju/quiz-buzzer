-- Simple fix for questions table - just add missing columns
-- Run this in Supabase SQL Editor

-- Add missing columns to questions table
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS session_id UUID,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Add foreign key constraint for session_id
ALTER TABLE public.questions 
ADD CONSTRAINT IF NOT EXISTS questions_session_id_fkey 
FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_questions_session_id ON public.questions(session_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON public.questions(session_id, order_index);

-- Update existing questions to have proper values
UPDATE public.questions 
SET order_index = COALESCE(order_index, 0) + ROW_NUMBER() OVER (ORDER BY created_at ASC)
WHERE order_index IS NULL OR order_index = 0;

UPDATE public.questions 
SET is_active = COALESCE(is_active, false)
WHERE is_active IS NULL;

-- Verify the columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'questions' 
  AND table_schema = 'public'
  AND column_name IN ('session_id', 'order_index', 'is_active');

SELECT 'Questions table fixed successfully!' as status;
