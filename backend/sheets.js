import { google } from 'googleapis';
import { supabase } from './db.js';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
);

export const getGoogleAuthUrl = (state) => {
    const scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.metadata.readonly'
    ];
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: state, // e.g., formId
        prompt: 'consent'
    });
};

export const handleGoogleCallback = async (code) => {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
};

const getAuthenticatedClient = async (tokens) => {
    const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
    );
    client.setCredentials(tokens);
    return client;
};

export const listSheets = async (tokens) => {
    const auth = await getAuthenticatedClient(tokens);
    const drive = google.drive({ version: 'v3', auth });
    const response = await drive.files.list({
        pageSize: 20,
        fields: 'files(id, name)',
        q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
    });
    return response.data.files;
};

export const createSheet = async (tokens, title) => {
    const auth = await getAuthenticatedClient(tokens);
    const sheets = google.sheets({ version: 'v4', auth });

    const resource = {
        properties: { title }
    };
    const spreadsheet = await sheets.spreadsheets.create({
        resource,
        fields: 'spreadsheetId,spreadsheetUrl'
    });
    return spreadsheet.data;
};

export const appendToSheet = async (tokens, spreadsheetId, answers) => {
    try {
        const auth = await getAuthenticatedClient(tokens);
        const sheets = google.sheets({ version: 'v4', auth });

        // Get existing headers
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'A1:Z1',
        });

        let headers = response.data.values ? response.data.values[0] : [];
        if (headers.length === 0) {
            headers = ['Timestamp', ...Object.keys(answers)];
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: 'A1',
                valueInputOption: 'RAW',
                resource: { values: [headers] }
            });
        }

        const row = headers.map(h => {
            if (h === 'Timestamp') return new Date().toISOString();
            return answers[h] || '';
        });

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'A1',
            valueInputOption: 'RAW',
            resource: { values: [row] }
        });

        return { success: true };
    } catch (error) {
        console.error('Error appending to Google Sheet:', error);
        throw error;
    }
};

export const submitToSheets = async (req, res) => {
    try {
        const { formId, answers, webhookUrl, googleSheetId, googleTokens } = req.body;

        // NEW: Direct Sheets API integration
        if (googleSheetId && googleTokens) {
            await appendToSheet(googleTokens, googleSheetId, answers);
            return res.json({ success: true, message: 'Response saved to Google Sheet' });
        }

        // Legacy: Webhook integration
        if (!webhookUrl) {
            console.warn('No sheet integration provided, skipping');
            return res.json({ success: true, simulated: true });
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            body: JSON.stringify({ formId, answers }),
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`Webhook failed: ${response.status}`);
        return res.json({ success: true });
    } catch (error) {
        console.error('Sheets integration error:', error);
        res.status(500).json({ error: 'Failed to submit to Google Sheets' });
    }
};
