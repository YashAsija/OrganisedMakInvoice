import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side API endpoint: POST /api/payments/razorpay/create-subscription
 * Handles both recurring plan subscriptions and standard one-time payment orders.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, amount, userEmail, userId } = body;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: 'Razorpay server credentials unconfigured' }, { status: 500 });
    }

    const authString = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    // If planId starts with 'plan_' (a valid Razorpay Plan ID created in dashboard)
    if (planId && planId.startsWith('plan_')) {
      const res = await fetch('https://api.razorpay.com/v1/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`,
        },
        body: JSON.stringify({
          plan_id: planId,
          total_count: 120,
          quantity: 1,
          customer_notify: 1,
          notes: {
            userId: userId || '',
            userEmail: userEmail || '',
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.id) {
        return NextResponse.json({
          subscription_id: data.id,
          status: data.status,
          plan_id: data.plan_id,
        });
      }
      // If plan ID is not found in dashboard, fallback gracefully to Order API below
    }

    // Fallback/Direct Order Creation API (Works instantly for any amount without pre-created dashboard plan IDs)
    // Amount from PLANS config is already in paise (e.g. 199000 for ₹1,990 yearly, 19900 for ₹199 monthly)
    const orderAmountInPaise = amount
      ? (amount > 1000 ? Math.round(amount) : Math.round(amount * 100))
      : 19900;
    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify({
        amount: orderAmountInPaise,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
        notes: {
          userId: userId || '',
          userEmail: userEmail || '',
          planId: planId || 'basic',
        },
      }),
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      console.error('[Razorpay Order Error]', orderData);
      return NextResponse.json({ error: orderData.error?.description || 'Failed to create payment order' }, { status: orderRes.status });
    }

    return NextResponse.json({
      order_id: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency,
      status: orderData.status,
    });
  } catch (err: any) {
    console.error('[Razorpay Create-Subscription Exception]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
