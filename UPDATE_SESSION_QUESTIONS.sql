-- Update database structure for session-specific question management
-- Run this in Supabase SQL Editor

-- 1. Update questions table to ensure proper session linking
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE;

-- 2. Create index for better performance on session-based queries
CREATE INDEX IF NOT EXISTS idx_questions_session_id ON public.questions(session_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON public.questions(session_id, order_index);

-- 3. Update game_state to track current session and question
ALTER TABLE public.game_state 
ADD COLUMN IF NOT EXISTS current_session_id UUID REFERENCES public.sessions(id),
ADD COLUMN IF NOT EXISTS current_question_id UUID REFERENCES public.questions(id),
ADD COLUMN IF NOT EXISTS session_question_index INTEGER DEFAULT 0;

-- 4. Create function to get questions for a specific session
CREATE OR REPLACE FUNCTION get_session_questions(session_uuid UUID)
RETURNS TABLE (
  id UUID,
  question_text TEXT,
  image_url TEXT,
  order_index INTEGER,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.question_text,
    q.image_url,
    q.order_index,
    q.is_active,
    q.created_at
  FROM public.questions q
  WHERE q.session_id = session_uuid
  ORDER BY q.order_index ASC;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to start quiz for a session
CREATE OR REPLACE FUNCTION start_session_quiz(session_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  first_question_id UUID;
  session_exists BOOLEAN;
BEGIN
  -- Check if session exists and has questions
  SELECT EXISTS(
    SELECT 1 FROM public.sessions s 
    WHERE s.id = session_uuid AND s.is_active = true
  ) INTO session_exists;
  
  IF NOT session_exists THEN
    RETURN false;
  END IF;
  
  -- Get first question for the session
  SELECT q.id INTO first_question_id
  FROM public.questions q
  WHERE q.session_id = session_uuid
  ORDER BY q.order_index ASC
  LIMIT 1;
  
  IF first_question_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Update game state with session and first question
  UPDATE public.game_state 
  SET 
    current_session_id = session_uuid,
    current_question_id = first_question_id,
    session_question_index = 0,
    current_question = (SELECT question_text FROM public.questions WHERE id = first_question_id),
    image_url = (SELECT image_url FROM public.questions WHERE id = first_question_id),
    is_locked = false,
    first_buzzer_team_id = null
  WHERE id = (SELECT id FROM public.game_state LIMIT 1);
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to move to next question in session
CREATE OR REPLACE FUNCTION next_session_question(session_uuid UUID, current_index INTEGER)
RETURNS TABLE (
  question_id UUID,
  question_text TEXT,
  image_url TEXT,
  question_index INTEGER,
  is_last BOOLEAN
) AS $$
DECLARE
  next_question_id UUID;
  next_question_text TEXT;
  next_image_url TEXT;
  total_questions INTEGER;
BEGIN
  -- Get total questions in session
  SELECT COUNT(*) INTO total_questions
  FROM public.questions
  WHERE session_id = session_uuid;
  
  -- Get next question
  SELECT q.id, q.question_text, q.image_url
  INTO next_question_id, next_question_text, next_image_url
  FROM public.questions q
  WHERE q.session_id = session_uuid
  ORDER BY q.order_index ASC
  OFFSET (current_index + 1)
  LIMIT 1;
  
  IF next_question_id IS NULL THEN
    -- No more questions, return null
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::INTEGER, true::BOOLEAN;
  ELSE
    -- Return next question info
    RETURN QUERY SELECT 
      next_question_id,
      next_question_text,
      next_image_url,
      current_index + 1,
      (current_index + 1 >= total_questions - 1)::BOOLEAN;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to move to previous question in session
CREATE OR REPLACE FUNCTION previous_session_question(session_uuid UUID, current_index INTEGER)
RETURNS TABLE (
  question_id UUID,
  question_text TEXT,
  image_url TEXT,
  question_index INTEGER,
  is_first BOOLEAN
) AS $$
DECLARE
  prev_question_id UUID;
  prev_question_text TEXT;
  prev_image_url TEXT;
BEGIN
  IF current_index <= 0 THEN
    -- Already at first question
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::INTEGER, true::BOOLEAN;
  ELSE
    -- Get previous question
    SELECT q.id, q.question_text, q.image_url
    INTO prev_question_id, prev_question_text, prev_image_url
    FROM public.questions q
    WHERE q.session_id = session_uuid
    ORDER BY q.order_index ASC
    OFFSET (current_index - 1)
    LIMIT 1;
    
    RETURN QUERY SELECT 
      prev_question_id,
      prev_question_text,
      prev_image_url,
      current_index - 1,
      (current_index - 1 <= 0)::BOOLEAN;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. Update the auto-complete trigger to work with session questions
CREATE OR REPLACE FUNCTION auto_complete_session()
RETURNS TRIGGER AS $$
DECLARE
  question_count INTEGER;
BEGIN
  -- Count questions in the session
  SELECT COUNT(*) INTO question_count
  FROM public.questions
  WHERE session_id = NEW.session_id;
  
  -- If session has 20 questions, mark as completed
  IF question_count >= 20 THEN
    UPDATE public.sessions 
    SET is_completed = true, is_active = false
    WHERE id = NEW.session_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to delete a question from a session
CREATE OR REPLACE FUNCTION delete_session_question(question_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  session_uuid UUID;
  deleted_order INTEGER;
BEGIN
  -- Get session and order of question to be deleted
  SELECT session_id, order_index 
  INTO session_uuid, deleted_order
  FROM public.questions 
  WHERE id = question_uuid;
  
  IF session_uuid IS NULL THEN
    RETURN false;
  END IF;
  
  -- Delete the question
  DELETE FROM public.questions WHERE id = question_uuid;
  
  -- Update order_index of remaining questions
  UPDATE public.questions 
  SET order_index = order_index - 1
  WHERE session_id = session_uuid AND order_index > deleted_order;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to reorder questions in a session
CREATE OR REPLACE FUNCTION reorder_session_questions(session_uuid UUID, question_orders JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  question_item JSONB;
BEGIN
  -- Update order_index for each question
  FOR question_item IN SELECT * FROM jsonb_array_elements(question_orders)
  LOOP
    UPDATE public.questions 
    SET order_index = (question_item->>'order_index')::INTEGER
    WHERE id = (question_item->>'id')::UUID AND session_id = session_uuid;
  END LOOP;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 11. Test the setup
SELECT 'Session question management functions created successfully!' as status;
