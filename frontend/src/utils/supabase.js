import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'dummy_key';

if (!import.meta.env.VITE_SUPABASE_URL) {
    console.warn('VITE_SUPABASE_URL not set in frontend/.env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
