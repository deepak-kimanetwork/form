import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend folder
dotenv.config({ path: 'c:/Users/Axel/Downloads/form/backend/.env' });

// Mock req and res for testing local functions
const mockReq = { body: { prompt: 'Create a simple contact form' } };
const mockRes = {
    status: (code) => ({ json: (data) => console.log(`Response [${code}]:`, data) }),
    json: (data) => console.log('Response [200]:', data)
};

// Import the real functions after setting up env
import { generateForm } from './ai.js';

async function testRotation() {
    console.log('--- Testing Form Generation with Rotation/Retry ---');
    try {
        await generateForm(mockReq, mockRes);
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testRotation();
