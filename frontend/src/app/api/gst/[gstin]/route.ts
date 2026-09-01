import { NextResponse } from 'next/server';

export async function GET(req: Request, context: { params: Promise<{ gstin: string }> }) {
  const { gstin: rawGstin } = await context.params;
  const gstin = (rawGstin || '').trim().toUpperCase();

  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstin || !gstRegex.test(gstin)) {
    return NextResponse.json({ success: false, error: 'Invalid GSTIN format' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const primaryUrl = `https://sheet.gstincheck.co.in/check/DEMO_KEY/${gstin}`;
    const res = await fetch(primaryUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.flag === 0) {
        return NextResponse.json({ success: false, error: 'GSTIN not found' }, { status: 404 });
      }

      if (data && data.data) {
        const d = data.data;
        const bnm = d.pradr?.addr?.bnm || '';
        const bno = d.pradr?.addr?.bno || '';
        const st = d.pradr?.addr?.st || '';
        const loc = d.pradr?.addr?.loc || '';
        const dst = d.pradr?.addr?.dst || d.pradr?.addr?.loc || '';
        const stcd = d.pradr?.addr?.stcd || '';
        const pncd = d.pradr?.addr?.pncd || '';
        const fullAddress = d.pradr?.adr || [bno, bnm, st, loc, dst, stcd, pncd].filter(Boolean).join(', ');

        return NextResponse.json({
          success: true,
          companyName: d.lgnm || '',
          tradeName: d.tradeNam || d.lgnm || '',
          address: {
            building: bnm,
            plot: bno,
            street: st,
            locality: loc,
            city: dst,
            state: stcd,
            pincode: pncd,
            fullAddress: fullAddress
          },
          status: d.sts || 'Active',
          businessType: d.ctb || '',
          registrationDate: d.rgdt || ''
        });
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return NextResponse.json({ success: false, error: 'GST portal timeout' }, { status: 408 });
    }
  }

  // Fallback endpoint
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const fallbackUrl = `https://api.gst.in/commonapi/search?gstin=${gstin}`;
    const res = await fetch(fallbackUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://services.gst.gov.in/'
      }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const d = data.data || data;
      if (d && (d.lgnm || d.tradeNam)) {
        return NextResponse.json({
          success: true,
          companyName: d.lgnm || '',
          tradeName: d.tradeNam || d.lgnm || '',
          address: {
            building: d.pradr?.addr?.bnm || '',
            plot: d.pradr?.addr?.bno || '',
            street: d.pradr?.addr?.st || '',
            locality: d.pradr?.addr?.loc || '',
            city: d.pradr?.addr?.dst || d.pradr?.addr?.loc || '',
            state: d.pradr?.addr?.stcd || '',
            pincode: d.pradr?.addr?.pncd || '',
            fullAddress: d.pradr?.adr || ''
          },
          status: d.sts || 'Active',
          businessType: d.ctb || '',
          registrationDate: d.rgdt || ''
        });
      }
    }
  } catch (err) {}

  return NextResponse.json({ success: false, error: 'Lookup failed' }, { status: 500 });
}
