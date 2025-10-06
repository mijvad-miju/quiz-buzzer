-- Quick setup - run this in Supabase SQL Editor

-- 1. Create sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_name TEXT NOT NULL,
  session_number INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Add session_id to questions table (if it doesn't exist)
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE;

-- 3. Create session_scores table
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

-- 4. Update game_state table
ALTER TABLE public.game_state 
ADD COLUMN IF NOT EXISTS current_session_id UUID REFERENCES public.sessions(id),
ADD COLUMN IF NOT EXISTS current_question_id UUID REFERENCES public.questions(id),
ADD COLUMN IF NOT EXISTS session_question_index INTEGER DEFAULT 0;

-- 5. Enable RLS and create policies
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_scores ENABLE ROW LEVEL SECURITY;

-- Sessions policies
CREATE POLICY "Sessions are viewable by everyone" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sessions" ON public.sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sessions" ON public.sessions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete sessions" ON public.sessions FOR DELETE USING (true);

-- Session scores policies
CREATE POLICY "Session scores are viewable by everyone" ON public.session_scores FOR SELECT USING (true);
CREATE POLICY "Anyone can insert session scores" ON public.session_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update session scores" ON public.session_scores FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete session scores" ON public.session_scores FOR DELETE USING (true);

-- 6. Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_scores;

-- 7. Grant permissions
GRANT ALL ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO anon;
GRANT ALL ON public.session_scores TO authenticated;
GRANT ALL ON public.session_scores TO anon;

-- 8. Create leaderboard function
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

-- 9. Test the setup
SELECT 'Setup complete! Sessions table created.' as status;
