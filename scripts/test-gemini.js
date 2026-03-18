import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro';

async function testGemini() {
  console.log(`Testing Gemini API with model: ${modelName}`);
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Olá, responda com OK se estiver funcionando.");
    console.log("Response:", result.response.text());
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testGemini();
