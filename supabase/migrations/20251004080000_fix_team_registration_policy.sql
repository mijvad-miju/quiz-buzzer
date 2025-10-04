-- Fix team registration policy to allow participants to register teams
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins can manage teams" ON public.teams;

-- Create separate policies for different operations
-- Allow anyone to insert teams (for registration)
CREATE POLICY "Anyone can register teams"
  ON public.teams FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update team scores (for game scoring)
CREATE POLICY "Anyone can update team scores"
  ON public.teams FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Only admins can delete teams
CREATE POLICY "Admins can delete teams"
  ON public.teams FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

