
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkForms() {
    console.log('Fetching existing forms...');
    const { data, error } = await supabase.from('forms').select('id, title').limit(5);
    
    if (error) {
        console.error('Error fetching forms:', error);
    } else {
        console.log('Existing forms:', data);
    }
}

checkForms();
