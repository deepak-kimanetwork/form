export const submitToSheets = async (req, res) => {
    try {
        const { formId, answers } = req.body;

        if (!process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
            console.warn('Webhook URL not configured, skipping sheets integration');
            // We can return a success anyway with a warning so development doesn't block
            return res.json({ success: true, simulated: true, warning: 'GOOGLE_SHEETS_WEBHOOK_URL not set' });
        }

        const response = await fetch(process.env.GOOGLE_SHEETS_WEBHOOK_URL, {
            method: 'POST',
            body: JSON.stringify({ formId, answers }),
            headers: { 'Content-Type': 'application/json' },
        });

        const result = await response.json();

        return res.json(result);
    } catch (error) {
        console.error('Error submitting to Google Sheets:', error);
        res.status(500).json({ error: 'Failed to submit form responses' });
    }
};
