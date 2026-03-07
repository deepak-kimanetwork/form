export const submitToSheets = async (req, res) => {
    try {
        const { formId, answers, webhookUrl } = req.body;

        if (!webhookUrl) {
            console.warn('Webhook URL not provided by form, skipping sheets integration');
            return res.json({ success: true, simulated: true, warning: 'webhookUrl not provided' });
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            body: JSON.stringify({ formId, answers }),
            headers: { 'Content-Type': 'application/json' },
            mode: 'no-cors' // Google Apps Script web apps often require no-cors for direct POSTs
        });

        const result = await response.json();

        return res.json(result);
    } catch (error) {
        console.error('Error submitting to Google Sheets:', error);
        res.status(500).json({ error: 'Failed to submit form responses' });
    }
};
