export const submitToSheets = async (req, res) => {
    try {
        const { formId, answers, webhookUrl } = req.body;

        if (!webhookUrl) {
            console.warn('Webhook URL not provided by form, skipping sheets integration');
            return res.json({ success: true, simulated: true, warning: 'webhookUrl not provided' });
        }

        console.log('Sending webhook to:', webhookUrl);
        const response = await fetch(webhookUrl, {
            method: 'POST',
            body: JSON.stringify({ formId, answers }),
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('Webhook fetch completed with status:', response.status);

        // Treat any 2xx status code as a success.
        if (!response.ok) {
            throw new Error(`Webhook responded with status: ${response.status}`);
        }

        const text = await response.text();
        let result;
        try {
            // Try to parse JSON (Google Apps Script returns this natively)
            result = JSON.parse(text);
        } catch (e) {
            // Unparseable (e.g. Zapier/webhook.site html), but response was OK, so consider it a success.
            console.log('Webhook returned non-JSON text but was successful:', text.substring(0, 100));
            result = { success: true, message: 'Webhook executed successfully but returned non-JSON data' };
        }

        return res.json(result);
    } catch (error) {
        console.error('Error submitting to Google Sheets:', error);
        res.status(500).json({ error: 'Failed to submit form responses via webhook' });
    }
};
