-- Create admin user after setting up the database
-- Run this AFTER you've created an admin account through the app

-- This function will be called after an admin user signs up
-- You'll need to run this manually with the admin user's ID

-- Example usage (replace 'USER_ID_HERE' with actual user ID):
-- INSERT INTO public.user_roles (user_id, role) 
-- VALUES ('USER_ID_HERE', 'admin');

-- To get the user ID:
-- 1. Sign up as admin through the app
-- 2. Go to Supabase Dashboard → Authentication → Users
-- 3. Copy the user ID
-- 4. Run the INSERT statement above
