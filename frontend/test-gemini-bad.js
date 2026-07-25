const fs = require('fs');
const envStr = fs.readFileSync('.env.local', 'utf8');
const keyMatch = envStr.match(/GEMINI_API_KEY=([^\n\r]+)/);
const key = keyMatch ? keyMatch[1].trim().replace(/\"/g, '') : '';

const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: key });

ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'hello world'
}).then(res => console.log('Chat success:', res.text.substring(0, 50)))
  .catch(err => console.error('Chat error:', err.message));
