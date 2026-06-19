import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3001;

  app.use(express.json());

  // --- HEALTH CHECK ROUTE ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // --- AI ROUTE 1: DESCRIPTION GENERATOR ---
  app.post("/api/ai/generate-description", async (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Item or Service name is required" });
    }

    const ai = getAIClient();
    if (!ai) {
      // Graceful fallback description when key is missing or system is in mock mode
      const fallbackDesc = `Provides premium professional ${name.toLowerCase()} services tailored to the client's specifications, including complete planning, execution, detail configuration, and dedicated consulting support.`;
      return res.json({ description: fallbackDesc, isMock: true });
    }

    try {
      const prompt = `Write a professional, concise, polished invoice line item description for the service/product named: "${name}". Keep it to 15-25 words. Make it sound appealing to a professional corporate client. Do not use quotation marks around the answer.`;
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          temperature: 0.7,
        }
      });

      const description = response.text?.trim() || `High quality ${name} deliverables and consulting solutions.`;
      res.json({ description });
    } catch (err: any) {
      console.error("AI Description Error:", err);
      res.status(500).json({ error: "Failed to generate AI description", message: err.message });
    }
  });

  // --- AI ROUTE 2: TAX SUGGESTIONS ENGINE ---
  app.post("/api/ai/suggest-tax", async (req, res) => {
    const { businessType, region } = req.body;
    if (!businessType) {
      return res.status(400).json({ error: "Business type is required" });
    }

    const ai = getAIClient();
    if (!ai) {
      // Realistic fallback based on type
      let taxRate = 10;
      let taxType = "GST";
      if (businessType.toLowerCase().includes("consulting") || region === "US") {
        taxRate = 8.25;
        taxType = "Sales Tax";
      } else if (region === "EU" || businessType.toLowerCase().includes("boutique")) {
        taxRate = 20;
        taxType = "VAT";
      }
      return res.json({ taxPercentage: taxRate, taxType, isMock: true });
    }

    try {
      const prompt = `Suggest typical tax structures for a business of type "${businessType}" operating in region: "${region || 'global'}". Produce a JSON object with keys "taxPercentage" (a number) and "taxType" (e.g. VAT, GST, Sales Tax, CGST+SGST). Keep it simple and compliant.`;
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              taxPercentage: { type: Type.NUMBER, description: "Typical primary tax rate as percentage, e.g. 18" },
              taxType: { type: Type.STRING, description: "Type label, e.g. GST" },
            },
            required: ["taxPercentage", "taxType"]
          }
        }
      });

      const parsed = JSON.parse(response.text?.trim() || "{}");
      res.json(parsed);
    } catch (err: any) {
      console.error("AI Tax Suggestion Error:", err);
      res.status(500).json({ error: "Failed to suggest taxes", message: err.message });
    }
  });

  // --- AI ROUTE 3: VOICE & CONTEXT PARSER TO INVOICE BUILDER ---
  app.post("/api/ai/parse-invoice", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Natural language billing prompt is required" });
    }

    const ai = getAIClient();
    if (!ai) {
      // Graceful smart parsing simulation with fallback
      const regexMoney = /(?:[\$â‚¬Â£â‚¹]|\bUSD|\bINR)\s*([\d,]+)/i;
      const amountMatch = prompt.match(regexMoney) || prompt.match(/\b([\d,]+)\s*(?:USD|INR|rupees|dollars)/i) || prompt.match(/\b(\d{3,7})\b/);
      let guessedAmount = 1500;
      if (amountMatch && amountMatch[1]) {
        guessedAmount = parseFloat(amountMatch[1].replace(/,/g, ""));
      }

      let client = "ABC Enterprises";
      if (prompt.toLowerCase().includes("company")) {
        client = "Company Inc.";
      } else if (prompt.toLowerCase().match(/for\s+([a-zA-Z0-9\s]+)\s+for/)) {
        const match = prompt.toLowerCase().match(/for\s+([a-zA-Z0-9\s]+)\s+for/);
        if (match) client = match[1].trim().toUpperCase();
      }

      const generated = {
        clientName: client,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 14*24*60*60*1000).toISOString().split('T')[0],
        currency: prompt.toLowerCase().includes("â‚¹") || prompt.toLowerCase().includes("inr") ? "INR" : "USD",
        items: [
          {
            name: "Consultancy & General Business Solutions",
            rate: guessedAmount,
            quantity: 1,
            taxPercentage: 10,
            description: "AI-parsed standard billing service category item description details."
          }
        ],
        notes: "Parsed from context: " + prompt
      };

      return res.json({ ...generated, isMock: true });
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const systemInstruction = `You are a high-fidelity bill parser. Interpret the user's natural language request to create an invoice and construct a clean, valid JSON representation.
If money is specified, map the price.
Use standard fallback fields for today's date ${today} and a due date exactly 14 days later.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              clientName: { type: Type.STRING, description: "Name of the client company or individual parsed" },
              clientEmail: { type: Type.STRING, description: "Client email parsed if provided" },
              currency: { type: Type.STRING, description: "e.g. USD, INR, EUR, GBP based on symbols like ₹, $, €" },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Service or Product name" },
                    rate: { type: Type.NUMBER, description: "Unit rate" },
                    quantity: { type: Type.NUMBER, description: "Quantity" },
                    taxPercentage: { type: Type.NUMBER, description: "Suggested appropriate tax rate e.g. 10" },
                    description: { type: Type.STRING, description: "Brief elegant professional description of the service" }
                  },
                  required: ["name", "rate", "quantity"]
                }
              },
              notes: { type: Type.STRING, description: "Notes or terms derived from the string description" }
            },
            required: ["clientName", "items", "currency"]
          }
        }
      });

      const parsed = JSON.parse(response.text?.trim() || "{}");
      res.json(parsed);
    } catch (err: any) {
      console.error("AI Parse Invoice Error:", err);
      res.status(500).json({ error: "Failed to parse billing instruction", message: err.message });
    }
  });

  // --- AI ROUTE 4: AI PRESET GENERATOR ---
  app.post("/api/ai/generate-preset", async (req, res) => {
    const { businessDescription } = req.body;
    if (!businessDescription) {
      return res.status(400).json({ error: "Business Description is required" });
    }

    const ai = getAIClient();
    if (!ai) {
      // High-quality mockup template customized dynamically based on text
      const name = businessDescription.trim().replace(/^a\s+/i, "") + " Services";
      const hasIndia = businessDescription.toLowerCase().includes("india") || businessDescription.toLowerCase().includes("delhi") || businessDescription.toLowerCase().includes("mumbai");
      
      const generated = {
        name,
        currency: hasIndia ? "INR" : "USD",
        defaultTaxRate: hasIndia ? 18 : 10,
        notes: "Settle invoice payment via Bank transfer inside 14 business days.",
        items: [
          { name: "Premium Advisory Consultation", rate: 150, taxPercentage: 10, description: "Elite business guidance & strategy session." },
          { name: "Delivery Milestones Execution", rate: 500, taxPercentage: 10, description: "Comprehensive milestone execution assessment." },
          { name: "Support Services Retainer", rate: 250, taxPercentage: 10, description: "Ongoing operational maintenance and priority support services." }
        ]
      };
      return res.json({ ...generated, isMock: true });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Create a professional profile preset and key service catalog items for a business described as: "${businessDescription}".
Include a structured currency suggestion (e.g. INR for general indian agencies and USD for international freelancers), default tax settings, payment terms note, and 3 standard products/services the user frequently bills.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Elegant business/company profile preset name" },
              currency: { type: Type.STRING, description: "Primary currency code e.g. USD, INR, GBP, EUR" },
              defaultTaxRate: { type: Type.NUMBER, description: "Default profile tax rate e.g. 18" },
              notes: { type: Type.STRING, description: "Default standard terms and payment instructions" },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Service or Product name" },
                    rate: { type: Type.NUMBER, description: "Standard default unit price" },
                    taxPercentage: { type: Type.NUMBER, description: "Typical service tax rate percentage" },
                    description: { type: Type.STRING, description: "Brief appealing service item catalog description" }
                  },
                  required: ["name", "rate"]
                }
              }
            },
            required: ["name", "currency", "defaultTaxRate", "items"]
          }
        }
      });

      const parsed = JSON.parse(response.text?.trim() || "{}");
      res.json(parsed);
    } catch (err: any) {
      console.error("AI Preset Creator Error:", err);
      res.status(500).json({ error: "Failed to generate AI custom preset", message: err.message });
    }
  });

  // --- VITE DEV MIDDLEWARE OR PRODUCTION STATIC FILES ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Mobile Invoice Maker is up and running on: http://localhost:${PORT}`);
  });
}

startServer();
