import { GoogleGenAI } from '@google/genai';

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  console.error('Missing Gemini API Key');
  process.exit(1);
}

const genAI = new GoogleGenAI({ apiKey: geminiApiKey });

// Simple cosine distance function
function cosineDistance(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return 1 - (dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)));
}

async function getEmbedding(text) {
  const embeddingResponse = await genAI.models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
    config: { outputDimensionality: 768 }
  });
  return embeddingResponse.embeddings?.[0]?.values;
}

async function main() {
  const queries = [
    "how to do bill",
    "how to make bill",
    "raise an invoice",
    "cut a bill",
    "bill kaise banaye",
    "GST kaise add kare",
    "app lock kaise lagaye",
    "data nikaalna"
  ];

  const oldKeywords_invoice = [
    "invoice editor", "create invoice", "edit invoice", "quick bill", "billing", 
    "invoice details", "client details", "line items", "taxes", "discount", 
    "notes", "terms", "save invoice"
  ];
  const newKeywords_invoice = [
    ...oldKeywords_invoice,
    "invoice", "invoices", "bill", "bills", "make a bill", "generate invoice", 
    "new invoice", "raise an invoice", "invoice creation", "bill banana hai", 
    "cut a bill"
  ];

  const oldKeywords_gst = [
    "tax settings", "gst", "cgst", "sgst", "igst", "tax rates", "enable tax", 
    "configure tax", "default tax"
  ];
  const newKeywords_gst = [
    ...oldKeywords_gst,
    "tax", "taxes", "gst setting", "add tax", "gst kaise add kare", "configure gst"
  ];

  const oldKeywords_pin = [
    "pin lock", "security", "app lock", "passcode", "enable pin", "disable pin"
  ];
  const newKeywords_pin = [
    ...oldKeywords_pin,
    "secure app", "set pin", "add password", "lock app", "app lock kaise lagaye"
  ];

  const baseInvoiceContent = `Topic: Invoice Editor Modal\nSource File: /src/App.tsx\nSummary: A modal window for creating and editing invoices. It allows users to input client details, line items, taxes, and other invoice-specific information.\nSteps:\n1. Enter 'Invoice Number'.\n2. Enter 'Date'.\n...`;
  const baseGSTContent = `Topic: Tax Settings\nSource File: /src/App.tsx\nSummary: Configuration for global tax rates and settings. Users can enable/disable tax processing and set default rates for CGST, SGST, IGST, etc.\nSteps:\n1. Open Settings...`;
  const basePINContent = `Topic: PIN Lock Management\nSource File: /src/App.tsx\nSummary: Security settings for managing the app PIN lock. Users can enable, disable, and change their 4-digit PIN for application access.\nSteps:\n1. Open Security Settings...`;

  const oldContent_invoice = baseInvoiceContent + `\nKeywords: ${oldKeywords_invoice.join(', ')}`;
  const newContent_invoice = baseInvoiceContent + `\nKeywords: ${newKeywords_invoice.join(', ')}`;
  
  const oldContent_gst = baseGSTContent + `\nKeywords: ${oldKeywords_gst.join(', ')}`;
  const newContent_gst = baseGSTContent + `\nKeywords: ${newKeywords_gst.join(', ')}`;

  const oldContent_pin = basePINContent + `\nKeywords: ${oldKeywords_pin.join(', ')}`;
  const newContent_pin = basePINContent + `\nKeywords: ${newKeywords_pin.join(', ')}`;

  console.log("Generating embeddings...");
  
  const emb_old_inv = await getEmbedding(oldContent_invoice);
  const emb_new_inv = await getEmbedding(newContent_invoice);
  const emb_old_gst = await getEmbedding(oldContent_gst);
  const emb_new_gst = await getEmbedding(newContent_gst);
  const emb_old_pin = await getEmbedding(oldContent_pin);
  const emb_new_pin = await getEmbedding(newContent_pin);

  console.log("=========================================");
  console.log("SIMILARITY SCORES (BEFORE vs AFTER)");
  console.log("=========================================\n");

  for (const q of queries) {
    const qEmb = await getEmbedding(q);
    
    // Test against Invoices
    const sim_old_inv = 1 - cosineDistance(qEmb, emb_old_inv);
    const sim_new_inv = 1 - cosineDistance(qEmb, emb_new_inv);
    
    // Test against GST
    const sim_old_gst = 1 - cosineDistance(qEmb, emb_old_gst);
    const sim_new_gst = 1 - cosineDistance(qEmb, emb_new_gst);

    // Test against PIN
    const sim_old_pin = 1 - cosineDistance(qEmb, emb_old_pin);
    const sim_new_pin = 1 - cosineDistance(qEmb, emb_new_pin);

    // Find best among the 3 topics
    let bestOld = Math.max(sim_old_inv, sim_old_gst, sim_old_pin);
    let bestNew = Math.max(sim_new_inv, sim_new_gst, sim_new_pin);

    console.log(`Query: "${q}"`);
    console.log(`  BEFORE: ${bestOld.toFixed(4)}`);
    console.log(`  AFTER:  ${bestNew.toFixed(4)}`);

    // Determine bucket using NEW thresholds (0.79 / 0.58)
    let bucket = "LOW";
    if (bestNew > 0.79) bucket = "HIGH";
    else if (bestNew >= 0.58) bucket = "MEDIUM";

    console.log(`  NEW BUCKET: ${bucket}\n`);
  }
}

main();
