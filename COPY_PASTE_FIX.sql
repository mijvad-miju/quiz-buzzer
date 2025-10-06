-- Copy and paste this entire script into Supabase SQL Editor
-- Then click "Run" to execute

-- Step 1: Add missing columns to questions table
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS session_id UUID,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Step 2: Add foreign key constraint (drop first if exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'questions_session_id_fkey' 
        AND table_name = 'questions'
    ) THEN
        ALTER TABLE public.questions 
        ADD CONSTRAINT questions_session_id_fkey 
        FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 3: Update existing questions with proper values
UPDATE public.questions 
SET order_index = ROW_NUMBER() OVER (ORDER BY created_at ASC)
WHERE order_index IS NULL OR order_index = 0;

UPDATE public.questions 
SET is_active = false
WHERE is_active IS NULL;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_session_id ON public.questions(session_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON public.questions(session_id, order_index);

-- Step 5: Verify the fix worked
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

-- Step 6: Show success message
SELECT 'Questions table fixed successfully! All required columns added.' as status;
