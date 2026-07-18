import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  const key = process.env.GEMINI_API_KEY || '';
  return NextResponse.json({ 
    length: key.length, 
    prefix: key.substring(0, 4),
    suffix: key.substring(key.length - 4)
  });
}
