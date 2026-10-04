import { GoogleGenerativeAI } from '@google/generative-ai';

// The API key must be defined in your .env.local file as GEMINI_API_KEY
const apiKey = process.env.GEMINI_API_KEY || '';

export const genAI = new GoogleGenerativeAI(apiKey);

export const SYSTEM_INSTRUCTION = "Sei un tutor socratico amichevole per ragazzi delle scuole medie (12-13 anni). Non dare mai la soluzione diretta, ma fai domande mirate per sbloccare il ragionamento. Usa un linguaggio semplice e incoraggiante.";
