-- Step-by-step setup for sessions system
-- Run each section one by one in Supabase SQL Editor

-- Step 1: Create sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_name TEXT NOT NULL,
  session_number INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 2: Create questions table (if not exists) with session linking
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  image_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 3: Create session_scores table for leaderboard
CREATE TABLE IF NOT EXISTS public.session_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(session_id, team_id)
);

-- Step 4: Update game_state to include current session
ALTER TABLE public.game_state 
ADD COLUMN IF NOT EXISTS current_session_id UUID REFERENCES public.sessions(id),
ADD COLUMN IF NOT EXISTS current_question_id UUID REFERENCES public.questions(id),
ADD COLUMN IF NOT EXISTS session_question_index INTEGER DEFAULT 0;

-- Step 5: Enable RLS on new tables
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_scores ENABLE ROW LEVEL SECURITY;

-- Step 6: Create policies for sessions table
CREATE POLICY "Sessions are viewable by everyone"
  ON public.sessions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update sessions"
  ON public.sessions FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete sessions"
  ON public.sessions FOR DELETE
  USING (true);

-- Step 7: Create policies for questions table
CREATE POLICY "Questions are viewable by everyone"
  ON public.questions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert questions"
  ON public.questions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update questions"
  ON public.questions FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete questions"
  ON public.questions FOR DELETE
  USING (true);

-- Step 8: Create policies for session_scores table
CREATE POLICY "Session scores are viewable by everyone"
  ON public.session_scores FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert session scores"
  ON public.session_scores FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update session scores"
  ON public.session_scores FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete session scores"
  ON public.session_scores FOR DELETE
  USING (true);

-- Step 9: Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_scores;

-- Step 10: Grant necessary permissions
GRANT ALL ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO anon;
GRANT ALL ON public.questions TO authenticated;
GRANT ALL ON public.questions TO anon;
GRANT ALL ON public.session_scores TO authenticated;
GRANT ALL ON public.session_scores TO anon;

-- Step 11: Create function to check if session is complete (20 questions max)
CREATE OR REPLACE FUNCTION check_session_complete(session_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  question_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO question_count
  FROM public.questions
  WHERE session_id = session_uuid;
  
  RETURN question_count >= 20;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Create function to get session leaderboard
CREATE OR REPLACE FUNCTION get_session_leaderboard(session_uuid UUID)
RETURNS TABLE (
  team_name TEXT,
  team_number INTEGER,
  score INTEGER,
  questions_answered INTEGER,
  correct_answers INTEGER,
  accuracy DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.team_name,
    t.team_number,
    COALESCE(ss.score, 0) as score,
    COALESCE(ss.questions_answered, 0) as questions_answered,
    COALESCE(ss.correct_answers, 0) as correct_answers,
    CASE 
      WHEN COALESCE(ss.questions_answered, 0) > 0 
      THEN ROUND((COALESCE(ss.correct_answers, 0)::DECIMAL / ss.questions_answered::DECIMAL) * 100, 2)
      ELSE 0
    END as accuracy
  FROM public.teams t
  LEFT JOIN public.session_scores ss ON t.id = ss.team_id AND ss.session_id = session_uuid
  ORDER BY COALESCE(ss.score, 0) DESC, COALESCE(ss.correct_answers, 0) DESC;
END;
$$ LANGUAGE plpgsql;

-- Step 13: Create trigger to auto-complete session when 20 questions are reached
CREATE OR REPLACE FUNCTION auto_complete_session()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this session now has 20 questions
  IF check_session_complete(NEW.session_id) THEN
    UPDATE public.sessions 
    SET is_completed = true, is_active = false
    WHERE id = NEW.session_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_complete_session
  AFTER INSERT ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_session();

-- Step 14: Verify the setup
SELECT 'Sessions table created:' as status, COUNT(*) as count FROM public.sessions;
SELECT 'Questions table updated:' as status, COUNT(*) as count FROM public.questions;
SELECT 'Session scores table created:' as status, COUNT(*) as count FROM public.session_scores;
