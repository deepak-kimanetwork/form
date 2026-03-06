export const saveForm = async (form) => {
    // Save locally first
    const forms = getForms();
    const existingIndex = forms.findIndex((f) => f.id === form.id);
    if (existingIndex >= 0) {
        forms[existingIndex] = form;
    } else {
        forms.push(form);
    }
    localStorage.setItem('forms', JSON.stringify(forms));

    // Sync to cloud
    try {
        const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;
        await fetch(`${apiUrl}/api/forms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
    } catch (err) {
        console.error('Failed to sync form to cloud:', err);
    }
};

export const getForms = () => {
    const saved = localStorage.getItem('forms');
    return saved ? JSON.parse(saved) : [];
};

export const getFormById = async (id) => {
    // Try local first
    const forms = getForms();
    const localForm = forms.find((f) => f.id === id);
    if (localForm) return localForm;

    // Try cloud
    try {
        const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;
        const res = await fetch(`${apiUrl}/api/forms/${id}`);
        if (res.ok) {
            return await res.json();
        }
    } catch (err) {
        console.error('Failed to fetch form from cloud:', err);
    }
    return null;
};

export const deleteForm = (id) => {
    const forms = getForms();
    const updated = forms.filter((f) => f.id !== id);
    localStorage.setItem('forms', JSON.stringify(updated));
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
