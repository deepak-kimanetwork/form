import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the API with our key
let clients = null;
let currentKeyIndex = 0;

const getClients = () => {
  if (clients) return clients;

  const apiKeys = process.env.GEMINI_API_KEYS ? process.env.GEMINI_API_KEYS.split(',') : [process.env.GEMINI_API_KEY];
  const validKeys = apiKeys.filter(key => key && key !== 'YOUR_GEMINI_API_KEY');

  if (validKeys.length === 0) {
    console.error('AI Error: GEMINI_API_KEY or GEMINI_API_KEYS is missing or not configured');
    throw new Error('GEMINI_API_KEY is missing. Please check backend/.env file.');
  }

  clients = validKeys.map(key => new GoogleGenerativeAI(key.trim()));
  return clients;
};

const rotateClient = () => {
  const c = getClients();
  currentKeyIndex = (currentKeyIndex + 1) % c.length;
  return c[currentKeyIndex];
};

const callWithRetry = async (fn, maxRetries = 3) => {
  let lastError;
  const c = getClients();
  const models = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];

  for (let m = 0; m < models.length; m++) {
    const currentModel = models[m];
    for (let i = 0; i < maxRetries; i++) {
      try {
        const client = c[currentKeyIndex];
        return await fn(client, currentModel);
      } catch (error) {
        lastError = error;
        if (error.message.includes('429') || error.message.includes('quota')) {
          console.warn(`Quota exceeded for key ${currentKeyIndex} with model ${currentModel}. Rotating key...`);
          rotateClient();
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
          continue;
        }
        throw error;
      }
    }
    console.warn(`All keys exhausted for model ${currentModel}. Falling back to next model...`);
  }
  throw lastError;
};

// Robust JSON extraction from AI response
const extractJson = (text) => {
  try {
    return JSON.parse(text);
  } catch (e) {
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
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const schema = await callWithRetry(async (client, modelName) => {
      const model = client.getGenerativeModel({ model: modelName });
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
      "type": "text | email | number | select | dropdown | textarea | multiple-choice | rating | opinion-scale | welcome-screen | yes-no | nested-choice",
      "required": true,
      "options": ["Opt 1", "Opt 2"], // if type is 'select', 'dropdown' or 'multiple-choice'
      "nestedOptions": [{"label": "Group 1", "subOptions": ["A", "B"]}], // ONLY if type is 'nested-choice'
      "logic": [
        { "condition": "equals | not_equals | contains | greater_than | less_than", "value": "Value", "target": "target_q_id" }
      ]
    }
  ]
}
For 'nested-choice', use 'nestedOptions' instead of 'options'. 
For multiple-choice logic, if the user selects ANY of the options in the rule, it should trigger.
Do not use Markdown backticks. Provide raw JSON only. Ensure use of valid JSON.`;

      const result = await model.generateContent(`${systemPrompt}\n\nPrompt: ${prompt}`);
      const response = await result.response;
      return extractJson(response.text());
    });

    return res.json(schema);
  } catch (error) {
    console.error('Error generating form:', error);
    res.status(500).json({ error: `Failed to generate form: ${error.message}` });
  }
};

export const generateNextQuestion = async (req, res) => {
  try {
    const { question, answer, formTitle } = req.body;

    const data = await callWithRetry(async (client, modelName) => {
      const model = client.getGenerativeModel({ model: modelName });
      const systemPrompt = `Given form "${formTitle || 'General Form'}" and current answer "${answer}" to "${question}", generate ONE follow-up question as JSON:
{
  "followUp": "Question text"
}
If no follow-up is needed, return empty object {}.
Raw JSON only.`;

      const result = await model.generateContent(`${systemPrompt}`);
      const response = await result.response;
      return extractJson(response.text());
    });

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

    const summary = await callWithRetry(async (client, modelName) => {
      const model = client.getGenerativeModel({ model: modelName });
      const systemPrompt = `Summarize these form responses professionally. Identify high-value leads and provide a concise 3-4 line summary.
Output format:
{
  "summary": "Summary text here",
  "score": "High Value | Medium Value | Low Value"
}
Raw JSON only.`;

      const result = await model.generateContent(`${systemPrompt}\n\nAnswers: ${JSON.stringify(answers)}`);
      const response = await result.response;
      return extractJson(response.text());
    });

    return res.json(summary);
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
};

export const generateMoreQuestions = async (req, res) => {
  try {
    const { prompt, currentQuestions, formTitle } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const questions = await callWithRetry(async (client, modelName) => {
      const model = client.getGenerativeModel({ model: modelName });
      const systemPrompt = `You are an expert form creator. The user already has a form titled "${formTitle || 'Survey'}" with ${currentQuestions?.length || 0} questions.
They want to add more questions based on this prompt: "${prompt}".
Generate 1-3 appropriate new questions as a JSON array of objects.
Question Object Structure:
{
  "label": "Question text",
  "type": "text | email | number | select | dropdown | textarea | multiple-choice | rating | opinion-scale | yes-no | nested-choice",
  "required": true,
  "options": ["Opt 1", "Opt 2"], // if type is 'select', 'dropdown' or 'multiple-choice'
  "nestedOptions": [{"label": "Category 1", "subOptions": ["Sub 1", "Sub 2"]}] // ONLY if type is 'nested-choice'
}
Do not include existing questions. Return ONLY the new questions.
Strict raw JSON array only.`;

      const result = await model.generateContent(`${systemPrompt}`);
      const response = await result.response;
      return extractJson(response.text());
    });

    return res.json({ questions: Array.isArray(questions) ? questions : [questions] });
  } catch (error) {
    console.error('Error generating more questions:', error);
    res.status(500).json({ error: `Failed to generate questions: ${error.message}` });
  }
};
