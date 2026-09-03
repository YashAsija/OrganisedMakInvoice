import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  console.error("Missing GEMINI_API_KEY");
  process.exit(1);
}

const genAI = new GoogleGenAI({ apiKey: geminiApiKey });

// Helper to recursively get all .tsx and .ts files
function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

async function main() {
  console.log("Starting automated crawl of frontend source...");
  
  const srcDir = path.join(process.cwd(), 'src');
  
  // We want to crawl App.tsx and everything in components/
  const componentsDir = path.join(srcDir, 'components');
  
  const allFiles = [
    path.join(srcDir, 'App.tsx'),
    ...getAllFiles(componentsDir)
  ];
  
  console.log(`Found ${allFiles.length} files to process.`);

  // Chunk the files to avoid the 250,000 input token free tier limit
  const chunkSize = 3;
  let allEntries = [];

  for (let i = 0; i < allFiles.length; i += chunkSize) {
    const chunk = allFiles.slice(i, i + chunkSize);
    let combinedSource = "";

    for (const file of chunk) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        combinedSource += `\n\n--- FILE: ${file.replace(process.cwd(), '')} ---\n`;
        combinedSource += content;
      }
    }

    console.log(`Processing chunk ${i / chunkSize + 1} of ${Math.ceil(allFiles.length / chunkSize)} (${combinedSource.length} chars)...`);

    const prompt = `You are an expert technical writer and knowledge base creator.
I am providing you with the source code of a React application.
Your task is to crawl this source code, identify all routes, pages, modals, and nested settings screens, and auto-generate a structured knowledge base.
You must find all features, including deeply nested ones like "invoice/bill template customization", "tax settings", "pin lock", etc.

For EVERY feature, route, or modal found in this code chunk, extract:
- The route path (look at routing logic or file structure for exact paths). If it's a modal or nested tab, write the route that opens it or makes it visible.
- The page title/heading
- Visible labels, buttons, form fields, and tooltip texts
- Any existing inline help text

Then, format the output STRICTLY as a JSON array of objects.

For each entry, use this format:
{
  "topic": "Descriptive name of the feature",
  "route": "/exact/route",
  "source_file": "The exact FILE PATH provided in the chunk headers (e.g. /src/components/MyComponent.tsx)",
  "summary": "What this page/feature does, written in plain language",
  "steps": ["Step-by-step instructions to use this feature based on the UI elements. ONLY include steps, button labels, and field names that are COPY-PASTED directly from the actual rendered component/JSX code. Do not paraphrase. Do not guess 'typical SaaS' behavior. If a button doesn't exist in the JSX, do NOT include it."],
  "keywords": ["Every synonym or casual phrasing a user might type. Brainstorm aggressively!"]
}

CRITICAL INSTRUCTIONS:
- You must include the EXACT "source_file" path from the '--- FILE: ... ---' header that this feature was extracted from. This is for verification.
- ALL labels, field names, and step text MUST be verbatim from the provided JSX. If you invent a field that is not present in the code, you fail the test.
- DO NOT wrap the output in markdown code blocks like \`\`\`json. Return ONLY the raw JSON array. If no features are in this chunk, return [].

Here is the source code:
${combinedSource}
`;

    let retries = 5;
    let success = false;
    while (retries > 0 && !success) {
      try {
        // Add a small delay to avoid rate limiting
        if (i > 0 || retries < 5) {
          console.log(`Waiting to call API (retries left: ${retries})...`);
          await new Promise(resolve => setTimeout(resolve, retries < 5 ? 10000 : 5000));
        }

        const response = await genAI.models.generateContent({
          model: 'gemini-3.5-flash-lite',
          contents: prompt,
          config: {
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        });

        let rawJson = response.text;
        rawJson = rawJson.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
        const parsed = JSON.parse(rawJson);
        allEntries = allEntries.concat(parsed);
        console.log(`Added ${parsed.length} entries.`);
        success = true;
      } catch (err) {
        retries--;
        console.error(`Failed to generate knowledge base for this chunk: ${err.message || err}. Retries left: ${retries}`);
        if (retries === 0) {
          console.error("Skipping chunk permanently after exhausting all retries.");
        }
      }
    }
  }

  // Deduplicate by route/topic if needed, but a simple write is fine for now
  const outPath = path.join(process.cwd(), 'src/data/knowledge-base.json');
  fs.writeFileSync(outPath, JSON.stringify(allEntries, null, 2), 'utf8');
  console.log(`Successfully saved ${allEntries.length} total entries to ${outPath}`);
}

main();
