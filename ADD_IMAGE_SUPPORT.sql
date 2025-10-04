-- Add image support to game_state table
-- Run this in Supabase SQL Editor

-- Add image_url column to game_state table
ALTER TABLE public.game_state 
ADD COLUMN image_url TEXT;

-- Update the existing game_state record to have null image_url
UPDATE public.game_state 
SET image_url = NULL 
WHERE image_url IS NULL;
