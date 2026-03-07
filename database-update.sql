-- Run this in your Supabase SQL Editor to add the necessary columns for Auth and Sharing

ALTER TABLE public.forms 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS sharing_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS sharing_level TEXT DEFAULT 'none';

-- Update RLS policies if you have them enabled, or just disable RLS using:
-- ALTER TABLE public.forms DISABLE ROW LEVEL SECURITY;
