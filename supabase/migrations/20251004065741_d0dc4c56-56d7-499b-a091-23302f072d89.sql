-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'participant');

-- Create user_roles table for authentication
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_number INTEGER NOT NULL CHECK (team_number BETWEEN 1 AND 4),
  team_name TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(team_number)
);

-- Enable RLS on teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Teams are viewable by everyone
CREATE POLICY "Teams are viewable by everyone"
  ON public.teams FOR SELECT
  USING (true);

-- Only admins can insert/update/delete teams
CREATE POLICY "Admins can manage teams"
  ON public.teams FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create game_state table
CREATE TABLE public.game_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_question TEXT,
  is_locked BOOLEAN DEFAULT false,
  first_buzzer_team_id UUID REFERENCES public.teams(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on game_state
ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;

-- Game state is viewable by everyone
CREATE POLICY "Game state is viewable by everyone"
  ON public.game_state FOR SELECT
  USING (true);

-- Only admins can update game state
CREATE POLICY "Admins can manage game state"
  ON public.game_state FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create buzz_events table for tracking buzzes
CREATE TABLE public.buzz_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) NOT NULL,
  buzzed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on buzz_events
ALTER TABLE public.buzz_events ENABLE ROW LEVEL SECURITY;

-- Buzz events are viewable by everyone
CREATE POLICY "Buzz events are viewable by everyone"
  ON public.buzz_events FOR SELECT
  USING (true);

-- Anyone can insert buzz events (for participants)
CREATE POLICY "Anyone can create buzz events"
  ON public.buzz_events FOR INSERT
  WITH CHECK (true);

-- Only admins can delete buzz events
CREATE POLICY "Admins can delete buzz events"
  ON public.buzz_events FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Initialize game state with default values
INSERT INTO public.game_state (current_question, is_locked)
VALUES ('Welcome to the Quiz!', false);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.buzz_events;