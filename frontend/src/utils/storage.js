export const saveForm = (form) => {
    const forms = getForms();
    // If editing an existing form
    const existingIndex = forms.findIndex((f) => f.id === form.id);
    if (existingIndex >= 0) {
        forms[existingIndex] = form;
    } else {
        forms.push(form);
    }
    localStorage.setItem('forms', JSON.stringify(forms));
};

export const getForms = () => {
    const saved = localStorage.getItem('forms');
    return saved ? JSON.parse(saved) : [];
};

export const getFormById = (id) => {
    const forms = getForms();
    return forms.find((f) => f.id === id) || null;
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
