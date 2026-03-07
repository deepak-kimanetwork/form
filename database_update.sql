-- Upgrading the forms table to support user ownership and sharing

-- Add user_id column to track the owner of the form
-- It references auth.users which is Supabase's built-in auth table
ALTER TABLE public.forms 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add sharing_id column (a unique text string for the public/shared link)
ALTER TABLE public.forms 
ADD COLUMN sharing_id TEXT UNIQUE;

-- Add sharing_level column ('none', 'view', 'edit')
ALTER TABLE public.forms 
ADD COLUMN sharing_level TEXT DEFAULT 'none' CHECK (sharing_level IN ('none', 'view', 'edit'));

-- Create an index to quickly find forms by sharing_id
CREATE INDEX idx_forms_sharing_id ON public.forms(sharing_id);

-- Create an index for faster lookups by user
CREATE INDEX idx_forms_user_id ON public.forms(user_id);

-- Important: Enable Row Level Security (RLS) if it's not already enabled
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

-- Note: You may need to create RLS policies depending on how you want to secure data at the DB level. 
-- Since we are handling authorization in the Node.js backend using the service role key or anon key, 
-- you might want to either disable RLS or allow all access to authenticated/anon roles if the API handles it.
-- For a backend-driven approach with anon keys, we suggest either handling it purely in backend or writing these policies:

-- Policy: Owners can do everything
CREATE POLICY "Owners can manage their forms" ON public.forms
    FOR ALL
    USING (auth.uid() = user_id);

-- Policy: Anyone can read forms (we will restrict this in the backend API anyway)
CREATE POLICY "Public can read forms" ON public.forms
    FOR SELECT
    USING (true);
