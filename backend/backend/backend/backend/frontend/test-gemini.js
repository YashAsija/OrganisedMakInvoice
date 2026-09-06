const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const key = (env.GEMINI_API_KEY || '').replace(/\"/g, '');

const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: key });

ai.models.generateContent({
  model: 'gemini-1.5-flash',
  contents: 'hello world'
}).then(res => console.log('Chat success:', res.text.substring(0, 50)))
  .catch(err => console.error('Chat error:', err.message));
