
import { supabase } from './db.js';

async function checkForms() {
    if (!supabase) return;
    console.log('Checking form details...');
    const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', 'form_1772859199200');
    
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Form details:', JSON.stringify(data, null, 2));
    }
}

checkForms();
