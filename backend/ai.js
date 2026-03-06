import { GoogleGenAI } from '@google/genai';

// Initialize the API with our key
const getAiClient = () => {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
};

export const generateForm = async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const ai = getAiClient();

        const systemPrompt = `You are an expert form creator. Given a prompt by the user, you must return a strict JSON object that represents a form schema adhering to this structure:
{
  "title": "String title for the form",
  "questions": [
    {
      "id": "A unique string id",
      "label": "The question text",
      "type": "text | email | number | select | textarea | multiple-choice | rating | opinion-scale | welcome-screen | yes-no",
      "options": ["Option 1", "Option 2"], // only if type is 'select' or 'multiple-choice', otherwise omit this field
      "logic": [
        // OPTIONAL: generate logic jumps if the flow requires it (e.g. skip questions)
        { "condition": "equals", "value": "Option 1", "target": "A unique string id of a future question" }
      ]
    }
  ]
}
Do not return anything else except the JSON block. Do not use Markdown backticks. Provide raw JSON only.`;

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: `${systemPrompt}\n\nPrompt: ${prompt}`,
            config: {
                responseMimeType: "application/json",
            }
        });

        const jsonString = response.text;
        const schema = JSON.parse(jsonString);

        return res.json(schema);
    } catch (error) {
        console.error('Error generating form:', error);
        res.status(500).json({ error: 'Failed to generate form. Ensure GEMINI_API_KEY is configured.' });
    }
};

export const generateNextQuestion = async (req, res) => {
    try {
        const { answers, formTitle } = req.body;
        const ai = getAiClient();

        const systemPrompt = `Given the form title "${formTitle}" and the user's answers so far, generate ONE highly relevant follow-up question as a strict JSON object:
{
  "id": "unique-id",
  "label": "The question text",
  "type": "text | email | number | select | textarea",
  "options": ["Option 1", "Option 2"] // only if type is 'select', otherwise omit
}
Do not return anything else except the JSON block.`;

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: `${systemPrompt}\n\nAnswers: ${JSON.stringify(answers)}`,
            config: {
                responseMimeType: "application/json",
            }
        });

        const jsonString = response.text;
        const schema = JSON.parse(jsonString);

        return res.json(schema);
    } catch (error) {
        console.error('Error generating next question:', error);
        res.status(500).json({ error: 'Failed to generate next question' });
    }
};
