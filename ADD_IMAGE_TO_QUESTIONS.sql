-- Add image_url column to your existing questions table
-- Run this in Supabase SQL Editor

-- Step 1: Add image_url column to questions table
ALTER TABLE public.questions 
ADD COLUMN image_url TEXT;

-- Step 2: Update existing questions to have null image_url (optional)
-- This is already handled by the ALTER TABLE command above

-- Step 3: Test the update
SELECT id, question_text, image_url, created_at 
FROM public.questions 
ORDER BY created_at DESC 
LIMIT 5;


