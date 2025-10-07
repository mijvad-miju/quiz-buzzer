-- Add winner announcement columns to game_state table
-- Run this in Supabase SQL Editor

-- Add winner_team_id and quiz_ended columns to game_state table
ALTER TABLE public.game_state 
ADD COLUMN IF NOT EXISTS winner_team_id UUID REFERENCES public.teams(id),
ADD COLUMN IF NOT EXISTS quiz_ended BOOLEAN DEFAULT false;

-- Update the types file will be needed after running this migration
-- The new columns will be:
-- winner_team_id: string | null
-- quiz_ended: boolean | null
