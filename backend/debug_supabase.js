
import { supabase } from './db.js';

async function debugSupabase() {
    if (!supabase) {
        console.log('❌ Supabase client is NULL');
        return;
    }
    console.log('✅ Supabase client is initialized');
    
    const formId = 'form_1772859199200';
    const answers = { "Debug": "Test" };
    
    console.log(`Attempting to insert test response into 'responses' table for form ${formId}...`);
    const { data, error } = await supabase
        .from('responses')
        .insert([{ form_id: formId, answers }])
        .select();
        
    if (error) {
        console.error('❌ Insert error:', error);
    } else {
        console.log('✅ Insert success:', data);
    }
}

debugSupabase();
