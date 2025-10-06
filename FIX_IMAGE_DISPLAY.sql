-- Complete fix for image display issues
-- Run this in Supabase SQL Editor

-- Step 1: Add image_url to questions table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' 
        AND column_name = 'image_url'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.questions ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Step 2: Add image_url to game_state table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_state' 
        AND column_name = 'image_url'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.game_state ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Step 3: Verify both tables have image_url columns
SELECT 'questions' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'questions' AND column_name = 'image_url'
UNION ALL
SELECT 'game_state' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'game_state' AND column_name = 'image_url';

-- Step 4: Test by inserting a sample question with image
INSERT INTO public.questions (question_text, image_url) 
VALUES ('Test question with image', 'https://via.placeholder.com/400x300/0066cc/ffffff?text=Sample+Image')
ON CONFLICT DO NOTHING;

-- Step 5: Show the test data
SELECT id, question_text, image_url, created_at 
FROM public.questions 
WHERE question_text = 'Test question with image';


