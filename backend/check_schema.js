
import { supabase } from './db.js';

async function checkSchema() {
    if (!supabase) return;
    
    console.log('Checking database schema via public.forms...');
    const { data: forms, error: formsError } = await supabase.from('forms').select('*').limit(1);
    
    if (formsError) {
        console.error('Error fetching forms:', formsError);
    } else {
        console.log('Successfully fetched forms table structure.');
    }

    console.log('Checking database schema via public.responses...');
    const { data: responses, error: responsesError } = await supabase.from('responses').select('*').limit(1);
    
    if (responsesError) {
        console.error('Error fetching responses:', responsesError);
    } else {
        console.log('Successfully fetched responses table structure.');
    }
}

checkSchema();
