import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const headers = req.headers;
  
  // Read real IP from headers (Cloudflare -> x-real-ip -> x-forwarded-for -> fallback)
  const rawIp =
    headers.get('cf-connecting-ip') ||
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    '';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const apiUrl = rawIp ? `https://ipapi.co/${rawIp}/json/` : 'https://ipapi.co/json/';
    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const countryCode = (data.country_code || data.country || '').toUpperCase();
      const country = countryCode === 'IN' ? 'IN' : 'INTL';
      return NextResponse.json({ country, ip: rawIp });
    }
  } catch (err) {}

  return NextResponse.json({ country: 'INTL', ip: rawIp });
}
