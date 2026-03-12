
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function verifyResponse() {
    console.log('Verifying response for form_1772859199200...');
    const { data, count, error } = await supabase
        .from('responses')
        .select('*', { count: 'exact' })
        .eq('form_id', 'form_1772859199200')
        .order('created_at', { ascending: false })
        .limit(1);
    
    if (error) {
        console.error('Error fetching response:', error);
    } else {
        console.log('Total responses for this form:', count);
        console.log('Latest response:', data[0]);
    }
}

verifyResponse();
