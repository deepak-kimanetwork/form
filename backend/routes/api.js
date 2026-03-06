import express from 'express';
import { generateForm, generateNextQuestion } from '../ai.js';
import { submitToSheets } from '../sheets.js';

const router = express.Router();

router.post('/generate', generateForm);
router.post('/generate-next', generateNextQuestion);
router.post('/submit', submitToSheets);

export default router;
