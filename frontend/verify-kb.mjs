import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const THRESHOLD_HIGH = 0.75;
const THRESHOLD_MEDIUM = 0.55;

async function getEmbedding(text) {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
    config: {
      outputDimensionality: 768,
    }
  });
  return response.embeddings[0].values;
}

const underfittingTests = [
  // Dashboard
  "take me to the home page", "how to see my stats", "where is the dashboard", "show me recent invoices",
  // Security
  "i want to lock the app", "how to set a pin code", "turn on fingerprint login", "how to secure the app",
  // Invoices
  "how to bill a client", "create new invoice", "make a tax invoice", "generate a bill for services", "add an invoice",
  "how to add gst to a bill", "where do I put transport charges", "add eway bill number",
  "change an existing invoice", "edit a saved bill", "update the item price on a bill",
  "how to print the invoice", "save bill as pdf", "download invoice file",
  "add a new product row", "how to add items to my bill",
  // Settings
  "change my business name", "update company address", "change the owner name",
  "add bank account details", "put my upi id on the bill", "where to add ifsc code",
  "set default gst rate", "change default currency", "add my pan card number",
  "change invoice prefix", "reset invoice numbering", "update terms and conditions",
  "upload a new logo", "change the picture on my bill",
  "add my digital signature", "how to draw signature",
  "upgrade my plan", "view my subscription status",
  // Clients/Materials
  "add a new customer", "delete a client", "edit customer details",
  "add a product to catalog", "save material for later",
  // Misc
  "backup my data", "export everything to excel",
  "turn on dark mode", "change the app colors",
  "how does cloud sync work", "force sync to cloud",
  "change invoice template", "make my bills look professional"
];

const overfittingTests = [
  // Ambiguous cases
  { q: "how do I change my invoice numbering", shouldMatch: "Billing Settings" },
  { q: "how do I change my invoice template", shouldMatch: "Invoice Templates" },
  { q: "delete a client", shouldMatch: "Manage Clients" },
  { q: "delete an invoice", shouldMatch: "Edit Invoice" }, // No delete invoice specific entry, should map to Edit or Not match
  { q: "add logo to bill", shouldMatch: "Company Logo" },
  { q: "add items to bill", shouldMatch: "Add Items to Invoice" },
  { q: "change app colors", shouldMatch: "Dark Mode / Theme" },
  { q: "change invoice colors", shouldMatch: "Invoice Templates" },
  { q: "export one invoice", shouldMatch: "Download or Print Invoice" },
  { q: "export all data", shouldMatch: "Data Export & Backup" },
  { q: "how to add tax", shouldMatch: "Tax Config (GST)" },
  { q: "add tax to a specific bill", shouldMatch: "Create New Invoice" }, // or similar
  { q: "change my name", shouldMatch: "Company Profile" },
  { q: "change my customer's name", shouldMatch: "Manage Clients" },
  { q: "add signature to app", shouldMatch: "Digital Signature" },
  { q: "sign into the app", shouldMatch: "Dashboard Home" }, // Or unauthenticated home
  { q: "reset invoice number", shouldMatch: "Billing Settings" },
  { q: "reset pin lock", shouldMatch: "PIN Lock Security" }
];

const hallucinationTests = [
  "how to invite team members",
  "add a secondary user to my account",
  "setup multi-currency per invoice",
  "automate recurring invoices every month",
  "integrate with tally or quickbooks",
  "send automatic payment reminders via sms",
  "calculate income tax returns",
  "file gst directly from app",
  "create proforma invoice",
  "manage employee payroll"
];

async function runTests() {
  console.log("Running Underfitting Tests...");
  let underfitPass = 0;
  for (const q of underfittingTests) {
    const emb = await getEmbedding(q);
    const { data } = await supabase.rpc('match_kb_chunks', { query_embedding: emb, match_threshold: THRESHOLD_MEDIUM, match_count: 1 });
    if (data && data.length > 0) {
      underfitPass++;
    } else {
      console.log(`[FAIL] Underfitting: "${q}" matched NOTHING.`);
    }
  }
  console.log(`Underfitting Score: ${underfitPass} / ${underfittingTests.length}\n`);

  console.log("Running Overfitting Tests...");
  let overfitPass = 0;
  for (const t of overfittingTests) {
    const emb = await getEmbedding(t.q);
    const { data } = await supabase.rpc('match_kb_chunks', { query_embedding: emb, match_threshold: THRESHOLD_MEDIUM, match_count: 1 });
    if (data && data.length > 0) {
      if (data[0].topic === t.shouldMatch || data[0].similarity < THRESHOLD_HIGH) {
         // It's a pass if it matches correctly OR if it's medium confidence (which goes to LLM for disambiguation)
         overfitPass++;
      } else {
         console.log(`[FAIL] Overfitting: "${t.q}" wrongly matched "${data[0].topic}" with HIGH confidence.`);
      }
    } else {
       // If it doesn't match anything, it's also a fail for this test since we expect it to match something
       console.log(`[FAIL] Overfitting: "${t.q}" matched NOTHING, expected "${t.shouldMatch}".`);
    }
  }
  console.log(`Overfitting Score: ${overfitPass} / ${overfittingTests.length}\n`);

  console.log("Running Hallucination Tests...");
  let hallucinationPass = 0;
  for (const q of hallucinationTests) {
    const emb = await getEmbedding(q);
    const { data } = await supabase.rpc('match_kb_chunks', { query_embedding: emb, match_threshold: THRESHOLD_HIGH, match_count: 1 });
    if (!data || data.length === 0) {
      hallucinationPass++;
    } else {
      console.log(`[FAIL] Hallucination: Fake feature "${q}" wrongly matched "${data[0].topic}" with HIGH confidence.`);
    }
  }
  console.log(`Hallucination (No-Match) Score: ${hallucinationPass} / ${hallucinationTests.length}\n`);
}

runTests().catch(console.error);
