import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the API with our key
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
    console.error('AI Error: GEMINI_API_KEY is missing or not configured in backend/.env');
    throw new Error('GEMINI_API_KEY is missing. Please check backend/.env file.');
  }
  return new GoogleGenerativeAI(apiKey);
};

// Robust JSON extraction from AI response
const extractJson = (text) => {
  try {
    // If it's already a clean JSON string
    return JSON.parse(text);
  } catch (e) {
    // Try to find JSON block
    const firstOpen = text.indexOf('{');
    const lastClose = text.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
      const jsonStr = text.substring(firstOpen, lastClose + 1);
      try {
        return JSON.parse(jsonStr);
      } catch (parseErr) {
        console.error('Failed to parse extracted JSON string:', jsonStr);
        throw parseErr;
      }
    }
    throw new Error('No valid JSON object found in response');
  }
};

export const generateForm = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ai = getAiClient();
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const systemPrompt = `You are an expert form creator. Given a prompt by the user, you must return a strict JSON object that represents a form schema.
Structure:
{
  "title": "Form Title",
  "theme": { "primaryColor": "#HEX", "backgroundColor": "#HEX", "textColor": "#HEX", "fontFamily": "Inter" },
  "sections": [
    { "id": "sec_1", "title": "Section Title" }
  ],
  "questions": [
    {
      "id": "q_1",
      "sectionId": "sec_1",
      "label": "Question text",
      "type": "text | email | number | select | textarea | multiple-choice | rating | opinion-scale | welcome-screen | yes-no",
      "required": true,
      "options": ["Opt 1", "Opt 2"], // if type is 'select' or 'multiple-choice'
      "logic": [
        { "condition": "equals | not_equals | contains | greater_than | less_than", "value": "Value", "target": "target_q_id" }
      ]
    }
  ]
}
For multiple-choice logic, if the user selects ANY of the options in the rule, it should trigger.
Do not use Markdown backticks. Provide raw JSON only. Ensure use of valid JSON.`;

    const result = await model.generateContent(`${systemPrompt}\n\nPrompt: ${prompt}`);
    const response = await result.response;
    const text = response.text();

    const schema = extractJson(text);
    return res.json(schema);
  } catch (error) {
    console.error('Error generating form:', error);
    res.status(500).json({ error: `Failed to generate form: ${error.message}` });
  }
};

export const generateNextQuestion = async (req, res) => {
  try {
    const { question, answer, formTitle } = req.body;
    const ai = getAiClient();
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const systemPrompt = `Given form "${formTitle || 'General Form'}" and current answer "${answer}" to "${question}", generate ONE follow-up question as JSON:
{
  "followUp": "Question text"
}
If no follow-up is needed, return empty object {}.
Raw JSON only.`;

    const result = await model.generateContent(`${systemPrompt}`);
    const response = await result.response;
    const text = response.text();
    const data = extractJson(text);

    return res.json(data);
  } catch (error) {
    console.error('Error generating next question:', error);
    res.status(500).json({ error: 'Failed to generate next question' });
  }
};

export const generateResponseSummary = async (req, res) => {
  try {
    const { answers } = req.body;
    if (!answers) return res.status(400).json({ error: 'Answers required' });

    const ai = getAiClient();
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const systemPrompt = `Summarize these form responses professionally. Identify high-value leads and provide a concise 3-4 line summary.
Output format:
{
  "summary": "Summary text here",
  "score": "High Value | Medium Value | Low Value"
}
Raw JSON only.`;

    const result = await model.generateContent(`${systemPrompt}\n\nAnswers: ${JSON.stringify(answers)}`);
    const response = await result.response;
    const text = response.text();
    const summary = extractJson(text);

    return res.json(summary);
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
};
