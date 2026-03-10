import express from 'express';
import {
    generateForm,
    generateNextQuestion,
    generateResponseSummary,
    generateMoreQuestions
} from '../ai.js';
import {
    submitToSheets,
    getGoogleAuthUrl,
    handleGoogleCallback,
    createSheet,
    listSheets
} from '../sheets.js';
import { supabase } from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/generate', generateForm);
router.post('/generate-next', generateNextQuestion);
router.post('/generate-more', generateMoreQuestions);
router.post('/summary', generateResponseSummary);

// Debug: Check what redirect URI the backend is actually using
router.get('/debug/oauth', (req, res) => {
    res.json({
        GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'NOT SET (falling back to http://localhost:5000/api/auth/google/callback)',
        GOOGLE_CLIENT_ID_SET: !!process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET_SET: !!process.env.GOOGLE_CLIENT_SECRET
    });
});

// Google OAuth Routes
router.get('/auth/google', (req, res) => {
    const { formId } = req.query;
    const url = getGoogleAuthUrl(formId);
    console.log('OAuth redirect URL being used:', process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback');
    res.redirect(url);
});

router.get('/auth/google/callback', async (req, res) => {
    try {
        const { code, state: formId } = req.query;
        const tokens = await handleGoogleCallback(code);

        // Return tokens to the frontend via a script that posts a message to the opener
        // or just redirect back with a success flag
        res.send(`
            <script>
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', tokens: ${JSON.stringify(tokens)}, formId: '${formId}' }, "*");
                window.close();
            </script>
        `);
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(500).send('Authentication failed');
    }
});

router.post('/create-sheet', async (req, res) => {
    try {
        const { tokens, title, headers } = req.body;
        const sheet = await createSheet(tokens, title, headers);
        res.json(sheet);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/list-sheets', async (req, res) => {
    try {
        const { tokens } = req.body;
        if (!tokens) return res.status(400).json({ error: 'Tokens required' });
        const sheets = await listSheets(tokens);
        res.json(sheets);
    } catch (error) {
        console.error('Error listing sheets:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/submit', async (req, res) => {
    try {
        const { formId, answers, webhookUrl } = req.body;

        if (supabase) {
            const { error } = await supabase
                .from('responses')
                .insert([{ form_id: formId, answers }]);

            if (error) {
                console.error("Error saving response to Supabase:", error);
            }
        }

        // If webhook logic applies, let it handle the response
        if (webhookUrl) {
            return await submitToSheets(req, res);
        }

        return res.json({ success: true, message: 'Response saved locally.' });
    } catch (err) {
        console.error('Submit route error:', err);
        return res.status(500).json({ error: 'Failed to process submission' });
    }
});

// Get stats for dashboard
router.get('/stats', requireAuth, async (req, res) => {
    try {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

        const { data: forms, error: formsError } = await supabase
            .from('forms')
            .select('id')
            .eq('user_id', req.user.id);

        if (formsError) throw formsError;

        const formCount = forms?.length || 0;
        if (formCount === 0) {
            return res.json({ totalForms: 0, totalResponses: 0 });
        }

        const formIds = forms.map(f => f.id);
        const { count, error: respError } = await supabase
            .from('responses')
            .select('*', { count: 'exact', head: true })
            .in('form_id', formIds);

        if (respError) throw respError;

        res.json({
            totalForms: formCount,
            totalResponses: count || 0
        });
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get user's forms
router.get('/forms', requireAuth, async (req, res) => {
    try {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

        const { data, error } = await supabase
            .from('forms')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(data.map(form => ({
            id: form.id,
            title: form.title,
            sharing_id: form.sharing_id,
            sharing_level: form.sharing_level,
            ...form.schema
        })));
    } catch (error) {
        console.error('Error fetching user forms:', error);
        res.status(500).json({ error: 'Failed to fetch forms' });
    }
});

// Get all responses for all forms owned by the user
router.get('/responses', requireAuth, async (req, res) => {
    try {
        console.log('Fetching all responses for user:', req.user.id);
        // First find forms owned by user
        const { data: forms, error: formsError } = await supabase
            .from('forms')
            .select('id')
            .eq('user_id', req.user.id);

        if (formsError) throw formsError;

        if (!forms || forms.length === 0) {
            console.log('No forms found for user');
            return res.json([]);
        }

        const formIds = forms.map(f => f.id);
        console.log('User form IDs:', formIds);

        // Then fetch responses for those forms
        const { data: responses, error } = await supabase
            .from('responses')
            .select('*')
            .in('form_id', formIds)
            .order('created_at', { ascending: false });

        if (error) throw error;
        console.log(`Found ${responses?.length || 0} responses in Supabase`);

        res.json(responses);
    } catch (err) {
        console.error('Error fetching all user responses:', err);
        res.status(500).json({ error: 'Failed to fetch all responses' });
    }
});

// Get responses for a specific form
router.get('/forms/:id/responses', requireAuth, async (req, res) => {
    try {
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

        // Verify ownership
        const { data: form, error: formError } = await supabase
            .from('forms')
            .select('id')
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .single();

        if (formError || !form) {
            return res.status(403).json({ error: 'Unauthorized or form not found' });
        }

        const { data: responses, error } = await supabase
            .from('responses')
            .select('*')
            .eq('form_id', req.params.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(responses);
    } catch (err) {
        console.error('Error fetching responses:', err);
        res.status(500).json({ error: 'Failed to fetch form responses' });
    }
});

// Save form to Supabase (Requires Auth OR valid sharing edit token)
router.post('/forms', optionalAuth, async (req, res) => {
    try {
        const { id, title, questions, theme, sharing_id, sharing_level, edit_token } = req.body;
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

        // Check if form exists
        const { data: existing } = await supabase.from('forms').select('*').eq('id', id).single();

        let isOwner = req.user && existing && existing.user_id === req.user.id;
        let isCreating = !existing;
        let hasEditLink = existing && existing.sharing_id === edit_token && existing.sharing_level === 'edit';

        if (!isCreating && !isOwner && !hasEditLink) {
            return res.status(403).json({ error: 'Not authorized to edit this form' });
        }

        if (isCreating && !req.user) {
            return res.status(401).json({ error: 'Must be logged in to create forms' });
        }

        const upsertData = {
            id,
            title,
            schema: { questions, theme, sections: req.body.sections },
            user_id: existing ? existing.user_id : req.user.id
        };

        if (req.body.custom_url !== undefined) {
            upsertData.custom_url = req.body.custom_url || null; // null if empty
        }

        // Only owner can change sharing settings
        if (isCreating || isOwner) {
            if (sharing_id !== undefined) upsertData.sharing_id = sharing_id;
            if (sharing_level !== undefined) upsertData.sharing_level = sharing_level;
        }

        const { data, error } = await supabase
            .from('forms')
            .upsert(upsertData)
            .select();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error saving form:', error);
        res.status(500).json({ error: 'Failed to save form' });
    }
});

// Get form by sharing token (for the builder/analytics)
router.get('/shared/:shareId', async (req, res) => {
    try {
        const { shareId } = req.params;
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

        const { data, error } = await supabase
            .from('forms')
            .select('*')
            .eq('sharing_id', shareId)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Shared form not found' });
        }

        if (data.sharing_level === 'none') {
            return res.status(403).json({ error: 'Sharing is disabled for this form' });
        }

        const form = {
            id: data.id,
            title: data.title,
            sharing_level: data.sharing_level, // Let frontend know their permission ('view' or 'edit')
            edit_token: data.sharing_id, // Pass back so frontend can use it to save
            ...data.schema
        };

        res.json(form);
    } catch (error) {
        console.error('Error fetching shared form:', error);
        res.status(500).json({ error: 'Failed to fetch shared form' });
    }
});

// Delete form from Supabase
router.delete('/forms/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

        const { error } = await supabase
            .from('forms')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting form:', error);
        res.status(500).json({ error: 'Failed to delete form' });
    }
});

// Check URL availability
router.post('/forms/check-url', requireAuth, async (req, res) => {
    try {
        const { custom_url, form_id } = req.body;
        if (!custom_url) return res.json({ available: true });

        const { data, error } = await supabase
            .from('forms')
            .select('id')
            .eq('custom_url', custom_url)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        // Available if no data found OR if the conflicting form is exactly the current form
        const isAvailable = !data || data.id === form_id;

        res.json({ available: isAvailable });
    } catch (error) {
        console.error('Error checking URL:', error);
        res.status(500).json({ error: 'Failed to check URL' });
    }
});

// Get form from Supabase (Public - for filling out)
router.get('/forms/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

        const { data, error } = await supabase
            .from('forms')
            .select('*')
            .or(`id.eq."${id}",custom_url.eq."${id}"`)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return res.status(404).json({ error: 'Form not found' });
            throw error;
        }

        // Reconstruct form object for public filler
        const form = {
            id: data.id,
            title: data.title,
            custom_url: data.custom_url,
            ...data.schema
        };

        res.json(form);
    } catch (error) {
        console.error('Error fetching form:', error);
        res.status(500).json({ error: 'Failed to fetch form' });
    }
});

export default router;
