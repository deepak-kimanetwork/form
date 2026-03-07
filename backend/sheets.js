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
            headers: { 'Content-Type': 'application/json' }
        });

        // Google Apps Script can sometimes return an HTML error page if improperly configured
        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            console.error('Webhook did not return JSON. Raw response:', text.substring(0, 200));
            throw new Error('Invalid response from webhook');
        }

        return res.json(result);
    } catch (error) {
        console.error('Error submitting to Google Sheets:', error);
        res.status(500).json({ error: 'Failed to submit form responses via webhook' });
    }
};
