import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend folder
dotenv.config({ path: 'c:/Users/Axel/Downloads/form/backend/.env' });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY missing in .env');
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // Note: The @google/generative-ai SDK doesn't have a direct 'listModels' method in the main client
        // We can use the REST API via fetch or use a model instance to try and probe.
        // However, the best way to check availability via SDK is often just trying to initialize.
        // Actually, we can use the fetch API to hit the models endpoint.

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log('Available Models:');
            data.models.forEach(model => {
                console.log(`- ${model.name} (${model.displayName})`);
            });
        } else {
            console.log('No models found or error:', data);
        }
    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
