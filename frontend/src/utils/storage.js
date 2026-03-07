import { supabase } from './supabase';

export const checkCustomUrl = async (customUrl, currentFormId) => {
    try {
        const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return true; // Auth required to save anyway

        const res = await fetch(`${apiUrl}/api/forms/check-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ custom_url: customUrl, form_id: currentFormId })
        });

        if (res.ok) {
            const data = await res.json();
            return data.available;
        }
    } catch (err) {
        console.error('Failed to check custom URL:', err);
    }
    return true; // Default to allowing it, server will catch if actually duplicate
};

export const saveForm = async (form, editToken = null) => {
    try {
        const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

        const headers = { 'Content-Type': 'application/json' };

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const payload = { ...form };
        if (editToken) {
            payload.edit_token = editToken;
        }

        const res = await fetch(`${apiUrl}/api/forms`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to save form');
        }
    } catch (err) {
        console.error('Failed to sync form to cloud:', err);
        throw err;
    }
};

export const getForms = async () => {
    try {
        const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return [];

        const res = await fetch(`${apiUrl}/api/forms`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        if (res.ok) {
            return await res.json();
        }
    } catch (err) {
        console.error('Failed to fetch forms:', err);
    }
    return [];
};

export const getFormById = async (id, isShared = false) => {
    try {
        const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

        const endpoint = isShared ? `/api/shared/${id}` : `/api/forms/${id}`;

        const headers = {};
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const res = await fetch(`${apiUrl}${endpoint}`, { headers });
        if (res.ok) {
            return await res.json();
        }
    } catch (err) {
        console.error('Failed to fetch form from cloud:', err);
    }
    return null;
};

export const deleteForm = async (id) => {
    try {
        const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        await fetch(`${apiUrl}/api/forms/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
    } catch (err) {
        console.error('Failed to delete form:', err);
    }
};

// For storing local dev responses to show in the Responses page
export const saveResponseLocal = (response) => {
    const responses = getResponsesLocal();
    responses.push(response);
    localStorage.setItem('responses', JSON.stringify(responses));
};

export const getResponsesLocal = () => {
    const saved = localStorage.getItem('responses');
    return saved ? JSON.parse(saved) : [];
};

export const getResponsesByFormId = (formId) => {
    const responses = getResponsesLocal();
    return responses.filter(r => r.formId === formId);
};

export const getResponses = async (formId) => {
    try {
        const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return [];

        const res = await fetch(`${apiUrl}/api/forms/${formId}/responses`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        if (res.ok) {
            return await res.json();
        }
    } catch (err) {
        console.error('Failed to fetch responses:', err);
    }
    return [];
};

export const getAllResponses = async () => {
    try {
        const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return [];

        const res = await fetch(`${apiUrl}/api/responses`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        if (res.ok) {
            return await res.json();
        }
    } catch (err) {
        console.error('Failed to fetch all responses:', err);
    }
    return [];
};
