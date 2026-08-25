import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side API endpoint: POST /api/payments/razorpay/create-order
 * Creates a one-time order for yearly_onetime mode via Razorpay Orders API.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, plan, mode, userId, userEmail } = body;

    if (!amount || !plan || !mode) {
      return NextResponse.json({ error: 'Missing required parameters: amount, plan, or mode' }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: 'Razorpay server credentials unconfigured' }, { status: 500 });
    }

    const authString = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify({
        amount: amount, // amount in paise (e.g., 199000 for ₹1,990)
        currency: 'INR',
        receipt: `rcpt_${plan}_${mode}_${Date.now()}`,
        notes: {
          userId: userId || '',
          userEmail: userEmail || '',
          planKey: plan,
          billingMode: mode,
        },
      }),
    });

    const orderData = await orderRes.json();

    if (!orderRes.ok) {
      console.error('[Razorpay Create-Order Error]', orderData);
      return NextResponse.json({ error: orderData.error?.description || 'Failed to create Razorpay order' }, { status: orderRes.status });
    }

    return NextResponse.json({
      order_id: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency,
      status: orderData.status,
    });
  } catch (err: any) {
    console.error('[Razorpay Create-Order Exception]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
