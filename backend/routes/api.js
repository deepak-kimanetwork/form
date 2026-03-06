import express from 'express';
import { generateForm, generateNextQuestion } from '../ai.js';
import { submitToSheets } from '../sheets.js';
import { supabase } from '../db.js';

const router = express.Router();

router.post('/generate', generateForm);
router.post('/generate-next', generateNextQuestion);
router.post('/submit', submitToSheets);

// Save form to Supabase
router.post('/forms', async (req, res) => {
    try {
        const { id, title, questions, theme } = req.body;
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

        const { data, error } = await supabase
            .from('forms')
            .upsert({ id, title, schema: { questions, theme } })
            .select();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error saving form:', error);
        res.status(500).json({ error: 'Failed to save form' });
    }
});

// Get form from Supabase
router.get('/forms/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

        const { data, error } = await supabase
            .from('forms')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return res.status(404).json({ error: 'Form not found' });
            throw error;
        }

        // Reconstruct form object
        const form = {
            id: data.id,
            title: data.title,
            ...data.schema
        };

        res.json(form);
    } catch (error) {
        console.error('Error fetching form:', error);
        res.status(500).json({ error: 'Failed to fetch form' });
    }
});

export default router;
