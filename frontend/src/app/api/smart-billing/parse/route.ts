import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, current_invoice, allowed_fields } = body;

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Natural language billing prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY_BILLING || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[smart-billing] Missing GEMINI_API_KEY_BILLING or GEMINI_API_KEY in environment variables');
      return NextResponse.json({ error: 'AI billing service is not configured (missing API key)' }, { status: 500 });
    }

    const genAI = new GoogleGenAI({ apiKey });

    const today = new Date().toISOString().split('T')[0];
    const defaultDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Local Regex Pre-parsing logic for safety (identical to Python backend)
    const preParsed: Record<string, any> = {};
    const lowerPrompt = prompt.toLowerCase();

    // 1. Copy Billing to Shipping Intent
    if (/\bsame as (?:bill|billing)\b|\bcopy (?:bill|billing)\b|\bship to same\b|\bsame consignee\b/i.test(prompt)) {
      preParsed["copyBillingToShipping"] = true;
    }

    // 2. Client Name Intent
    const clientMatch = prompt.match(/(?:bill\s+to|billed\s+to|bill|client|customer|buyer|party|consignee|invoice)\s*(?:name)?\s*(?:is|as|=|:|\s)\s*([A-Za-z0-9\s&\.\,]{2,35})/i);
    if (clientMatch) {
      let cn = clientMatch[1].trim();
      cn = cn.split(/\b(for|and|with|vehicle|truck|driver|gstin|pan|email|phone|address|state|country|place|transport|discount|freight|hsn|gst|due|date|items?|products?|rs\.?|₹|\$|\d+)\b/i)[0].trim();
      if (cn && cn.length >= 2 && !/\b(ship to|same as|copy bill)\b/i.test(cn)) {
        preParsed["clientName"] = cn.replace(/\w\S*/g, (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      }
    }

    // 3. GSTIN Intent
    const gstMatch = prompt.match(/(?:gstin|gst|gst no|gst number|tax id|gst code)\s*(?:is|=|:|\s)\s*([0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}[1-9A-Za-z]{1}[Zz][0-9A-Za-z]{1})/i);
    if (gstMatch) {
      preParsed["clientGstin"] = gstMatch[1].trim().toUpperCase();
    }

    // 4. Vehicle No Intent
    const vMatch = prompt.match(/(?:vehicle|truck|lorry|car|auto|vessel|reg)\s*(?:no\.?|number|num|id)?\s*(?:is|=|:|\s)?\s*([a-zA-Z0-9\-]{4,16})/i);
    if (vMatch) {
      const vNum = vMatch[1].trim();
      if (vNum.length >= 4 && !/\b(same|bill|ship|with|from|and)\b/i.test(vNum)) {
        preParsed["vehicleNo"] = vNum.toUpperCase();
      }
    }

    // Define structural schema for Gemini Structured Output
    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        copyBillingToShipping: { type: Type.BOOLEAN, description: "Set to true if user requests to copy/set ship to details same as billing" },
        clientName: { type: Type.STRING, description: "Name of the client, party, buyer, or customer" },
        clientEmail: { type: Type.STRING, description: "Client email parsed if provided" },
        clientPhone: { type: Type.STRING, description: "Client phone parsed if provided" },
        clientAddress: { type: Type.STRING, description: "Client address parsed if provided" },
        clientGstin: { type: Type.STRING, description: "Client GSTIN parsed if provided" },
        clientPan: { type: Type.STRING, description: "Client PAN parsed if provided" },
        clientState: { type: Type.STRING, description: "Client State parsed if provided" },
        clientCountry: { type: Type.STRING, description: "Client Country parsed if provided" },
        shippedToName: { type: Type.STRING, description: "Shipping/Consignee Name parsed if provided" },
        shippedToPhone: { type: Type.STRING, description: "Shipping Phone parsed if provided" },
        shippedToEmail: { type: Type.STRING, description: "Shipping Email parsed if provided" },
        shippedToAddress: { type: Type.STRING, description: "Shipping Address parsed if provided" },
        shippedToGstin: { type: Type.STRING, description: "Shipping GSTIN parsed if provided" },
        shippedToPan: { type: Type.STRING, description: "Shipping PAN parsed if provided" },
        shippedToState: { type: Type.STRING, description: "Shipping State parsed if provided" },
        shippedToCountry: { type: Type.STRING, description: "Shipping Country parsed if provided" },
        invoiceNumber: { type: Type.STRING, description: "Invoice number if specified" },
        date: { type: Type.STRING, description: "Invoice date in YYYY-MM-DD format" },
        dueDate: { type: Type.STRING, description: "Invoice due date in YYYY-MM-DD format" },
        poNumber: { type: Type.STRING, description: "Purchase Order (PO) number" },
        referenceNumber: { type: Type.STRING, description: "Reference / Tracking number" },
        deliveryNote: { type: Type.STRING, description: "Delivery note" },
        notes: { type: Type.STRING, description: "Notes or special comments" },
        invoiceTerms: { type: Type.STRING, description: "Payment terms or conditions" },
        placeOfSupply: { type: Type.STRING, description: "Place of supply state" },
        transport: { type: Type.STRING, description: "Transport / Courier carrier name" },
        vehicleNo: { type: Type.STRING, description: "Vehicle registration number" },
        grRrNo: { type: Type.STRING, description: "GR/RR number" },
        driverMobile: { type: Type.STRING, description: "Driver mobile number" },
        station: { type: Type.STRING, description: "Station" },
        ewayBillNo: { type: Type.STRING, description: "E-Way Bill number" },
        discountType: { type: Type.STRING, description: "'none', 'percent', or 'flat'" },
        discountValue: { type: Type.NUMBER, description: "Discount amount or percentage" },
        freightCharges: { type: Type.NUMBER, description: "Freight/shipping charges" },
        invoiceType: { type: Type.STRING, description: "'invoice' or 'estimate'" },
        status: { type: Type.STRING, description: "'pending', 'paid', 'draft'" },
        taxMode: { type: Type.STRING, description: "'dynamic' or 'custom'" },
        customTaxName: { type: Type.STRING, description: "Custom tax name" },
        customTaxPercentage: { type: Type.NUMBER, description: "Custom tax percentage rate" },
        isRecurring: { type: Type.BOOLEAN, description: "Whether invoice is recurring" },
        recurringInterval: { type: Type.STRING, description: "'weekly', 'monthly', 'yearly'" },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Service or Product name" },
              rate: { type: Type.NUMBER, description: "Unit rate price" },
              quantity: { type: Type.NUMBER, description: "Quantity count" },
              quantityType: { type: Type.STRING, description: "Unit unit e.g. pcs, box, kg, hrs" },
              taxPercentage: { type: Type.NUMBER, description: "Suggested appropriate tax rate e.g. 18" },
              hsnCode: { type: Type.STRING, description: "HSN/SAC code if specified" },
              description: { type: Type.STRING, description: "Brief description of the item" }
            },
            required: ['name', 'rate', 'quantity']
          }
        }
      }
    };

    const allowedFieldsStr = allowed_fields && allowed_fields.length > 0
      ? `\nCRITICAL CONSTRAINTS: Only extract values for these fields: ${allowed_fields.join(', ')}. If other data is present, ignore it. Do NOT add keys outside this list.`
      : '';

    const currentInvoiceStr = current_invoice ? `\nCURRENT INVOICE STATE (Context):\n${JSON.stringify(current_invoice)}` : '';

    const systemInstruction = `You are a high-fidelity bill parser. Interpret the user's natural language billing request and construct a valid JSON representation matching the schema.
    Use standard fallback fields for today's date ${today} and a due date exactly 14 days later ${defaultDueDate}.
    \nNote: If the user prompt DOES NOT mention any products, services, or items to add, leave the 'items' array blank/empty. Do not invent products.
    ${allowedFieldsStr}
    ${currentInvoiceStr}`;

    let parsedResult: Record<string, any> = {};

    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema
        }
      });

      if (response.text) {
        parsedResult = JSON.parse(response.text.trim());
      }
    } catch (apiErr) {
      console.warn('[smart-billing] gemini-3.5-flash-lite failed, falling back to gemini-3.5-flash:', apiErr);
      const responseFallback = await genAI.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema
        }
      });
      if (responseFallback.text) {
        parsedResult = JSON.parse(responseFallback.text.trim());
      }
    }

    const finalResult = { ...parsedResult, ...preParsed };

    // Clean up any stray keys that shouldn't be names
    if (finalResult.clientName) {
      const cnLower = String(finalResult.clientName).toLowerCase();
      if (/\b(ship to|bill to|same as|copy bill|details same)\b/.test(cnLower)) {
        delete finalResult.clientName;
      }
    }

    // Filter out freight/discount from item array (matching backend behavior)
    if (Array.isArray(finalResult.items)) {
      finalResult.items = finalResult.items.filter((it: any) => {
        const nameLower = String(it.name || '').toLowerCase();
        if (/\b(freight|shipping charge|delivery charge|transport charge|discount)\b/.test(nameLower)) {
          if (/\b(freight|transport|shipping|delivery)\b/.test(nameLower) && !finalResult.freightCharges) {
            finalResult.freightCharges = Number(it.rate || 0);
          } else if (/\bdiscount\b/.test(nameLower) && !finalResult.discountValue) {
            finalResult.discountValue = Number(it.rate || 0);
            finalResult.discountType = 'flat';
          }
          return false;
        }
        return true;
      });
    }

    return NextResponse.json(finalResult);
  } catch (err: any) {
    console.error('[smart-billing] Route handler error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error occurred' }, { status: 500 });
  }
}
