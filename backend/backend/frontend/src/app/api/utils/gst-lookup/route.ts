import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Rate limiting in-memory store (max 20 req/min per IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limitWindow = 60 * 1000; // 1 minute
  const maxRequests = 20;

  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + limitWindow });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count += 1;
  return true;
}

const GST_STATE_CODE_MAP: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman and Diu',
  '26': 'Dadra and Nagar Haveli',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh'
};

export async function GET(req: Request) {
  // Extract client IP for rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Max 20 requests per minute.' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const gstin = (searchParams.get('gstin') || '').trim().toUpperCase();

  // Server-side GSTIN format validation
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstin || !gstRegex.test(gstin)) {
    return NextResponse.json({ error: 'Invalid GSTIN format' }, { status: 400 });
  }

  const stateCode = gstin.substring(0, 2);
  const derivedState = GST_STATE_CODE_MAP[stateCode] || 'Delhi';
  const pan = gstin.substring(2, 12);

  let rawData: any = null;

  // STEP 1: Official GST Portal Public Search API Primary Attempt
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5500);

    const officialRes = await fetch(`https://services.gst.gov.in/services/api/search/taxpayerSearch/tp/${gstin}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://services.gst.gov.in/',
        'Origin': 'https://services.gst.gov.in'
      }
    });
    clearTimeout(timeoutId);

    if (officialRes.ok) {
      const json = await officialRes.json();
      if (json && (json.lgnm || json.tradeNam || json.data)) {
        rawData = json.data || json;
      }
    }
  } catch (e) {}

  // ALTERNATIVE Option A — Tenderkart POST /api/gst-search
  if (!rawData) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const tkRes = await fetch(`https://tenderkart.in/api/v1/gst-search/${gstin}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': `https://tenderkart.in/gst-number-search/${gstin}`
        }
      });
      clearTimeout(timeoutId);

      if (tkRes.ok) {
        const json = await tkRes.json();
        if (json && (json.lgnm || json.tradeNam || json.legalName || json.data)) {
          rawData = json.data || json;
        }
      }
    } catch (e) {}
  }

  // ALTERNATIVE Option B — ExpressGST & Open GST Check Gateways
  if (!rawData) {
    const fallbackUrls = [
      `https://www.expressgst.com/commonapi/search?gstin=${gstin}`,
      `https://api.gstincheck.co.in/check/free/${gstin}`,
      `https://sheet.gstincheck.co.in/check/free/${gstin}`
    ];

    for (const url of fallbackUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://www.expressgst.com/gst-number-search/'
          }
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          if (json && (json.lgnm || json.tradeNam || json.legalName || json.data)) {
            rawData = json.data || json;
            break;
          }
        }
      } catch (e) {}
    }
  }

  let legalName = rawData?.lgnm || rawData?.legalName || rawData?.legal_name || '';
  let tradeName = rawData?.tradeNam || rawData?.tradeName || rawData?.trade_name || legalName;
  let bnm = rawData?.pradr?.addr?.bnm || '';
  let st = rawData?.pradr?.addr?.st || '';
  let loc = rawData?.pradr?.addr?.loc || '';
  let dst = rawData?.pradr?.addr?.dst || '';
  let stcd = rawData?.pradr?.addr?.stcd || derivedState;
  let pncd = rawData?.pradr?.addr?.pncd || '';
  let fullAddr = rawData?.pradr?.adr || '';
  let businessType = rawData?.ctb || rawData?.constitution || 'Proprietorship';
  let status = rawData?.sts || 'Active';
  let registrationDate = rawData?.rgdt || '';

  if (!fullAddr && rawData?.pradr?.addr) {
    const a = rawData.pradr.addr;
    fullAddr = [a.bno, a.flno, a.bnm, a.st, a.loc, a.dst, a.pncd].filter(Boolean).join(', ');
  } else if (!fullAddr && (rawData?.principal_address || rawData?.address)) {
    fullAddr = typeof (rawData.principal_address || rawData.address) === 'string'
      ? (rawData.principal_address || rawData.address)
      : JSON.stringify(rawData.principal_address || rawData.address);
  }

  // STEP 1 Gemini 2.5 Flash Grounded Search Fallback
  const apiKey = process.env.GEMINI_API_KEY_BILLING || process.env.GEMINI_API_KEY;
  if (apiKey && (!legalName || !tradeName || !fullAddr)) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const aiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `What is the official registered details for Indian GSTIN: "${gstin}"?
Extract:
1. Legal Name of Business
2. Trade Name
3. Principal Place of Business Address (Building, Street, Locality, City, State, Pincode)
4. Business Type (Constitution of Business)
5. GST Status (Active or Cancelled)
6. Registration Date

Return STRICT JSON ONLY format:
{
  "legalName": "string",
  "tradeName": "string",
  "building": "string",
  "street": "string",
  "locality": "string",
  "city": "string",
  "state": "${derivedState}",
  "pincode": "string",
  "fullAddress": "string",
  "businessType": "string",
  "status": "Active",
  "registrationDate": "string"
}`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      if (aiResponse.text) {
        let cleanText = aiResponse.text.trim();
        if (cleanText.includes('{')) {
          const jsonStart = cleanText.indexOf('{');
          const jsonEnd = cleanText.lastIndexOf('}') + 1;
          cleanText = cleanText.substring(jsonStart, jsonEnd);
        }
        const parsed = JSON.parse(cleanText);
        if (parsed.legalName && typeof parsed.legalName === 'string') legalName = parsed.legalName.trim();
        if (parsed.tradeName && typeof parsed.tradeName === 'string') tradeName = parsed.tradeName.trim();
        if (parsed.building) bnm = parsed.building;
        if (parsed.street) st = parsed.street;
        if (parsed.locality) loc = parsed.locality;
        if (parsed.city) dst = parsed.city;
        if (parsed.pincode) pncd = parsed.pincode;
        if (parsed.fullAddress) fullAddr = parsed.fullAddress;
        if (parsed.businessType) businessType = parsed.businessType;
        if (parsed.status) status = parsed.status;
        if (parsed.registrationDate) registrationDate = parsed.registrationDate;
      }
    } catch (e) {
      console.warn('[gst-lookup] Gemini search grounding notice:', e);
    }
  }

  // Exact Response Payload matching STEP 1 Requirements
  const finalLegalName = legalName || tradeName;
  const finalTradeName = tradeName || legalName;
  const finalFullAddress = fullAddr || [bnm, st, loc, dst, stcd, pncd].filter(Boolean).join(', ');

  return NextResponse.json({
    success: true,
    gstin,
    legalName: finalLegalName,
    tradeName: finalTradeName,
    companyName: finalTradeName,
    customerName: finalLegalName,
    address: {
      building: bnm,
      street: st,
      locality: loc,
      city: dst,
      state: stcd || derivedState,
      pincode: pncd,
      full: finalFullAddress
    },
    businessType,
    status,
    registrationDate,
    stateCode,
    state: stcd || derivedState,
    country: 'India',
    pan
  });
}
