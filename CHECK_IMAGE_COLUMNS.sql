-- Check if image_url columns exist in both tables
-- Run this in Supabase SQL Editor to diagnose the issue

-- Check questions table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'questions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check game_state table structure  
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'game_state' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any questions with images
SELECT id, question_text, image_url, created_at 
FROM public.questions 
ORDER BY created_at DESC 
LIMIT 5;

-- Check current game_state
SELECT id, current_question, image_url, is_locked 
FROM public.game_state 
LIMIT 1;

