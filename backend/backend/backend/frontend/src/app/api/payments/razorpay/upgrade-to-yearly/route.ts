import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PLANS, PlanKey } from '@/lib/plans';
import { calculateProration } from '@/lib/proration';

/**
 * POST /api/payments/razorpay/upgrade-to-yearly
 * Step 1: Cancel existing monthly subscription at period end via Razorpay API (cancel_at_cycle_end: 1)
 * Step 2: Calculate proration chargeNow
 * Step 3: Create Razorpay Order for chargeNow if chargeNow > 0 with type: 'upgrade_proration'
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, targetBillingCycle } = body as {
      userId: string;
      targetBillingCycle: 'yearly_recurring' | 'yearly_onetime';
    };

    if (!userId || !targetBillingCycle) {
      return NextResponse.json({ error: 'Missing required parameters: userId or targetBillingCycle' }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: 'Razorpay credentials missing in environment' }, { status: 500 });
    }

    const authString = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user's current subscription
    const { data: sub, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (error || !sub) {
      return NextResponse.json({ error: 'Active subscription not found' }, { status: 404 });
    }

    const currentPlan = (sub.plan_key || 'basic') as PlanKey;
    const currentSubId = sub.gateway_sub_id;

    // Step 1: Cancel existing monthly subscription at period end via Razorpay API
    if (currentSubId && currentSubId.startsWith('sub_')) {
      try {
        await fetch(`https://api.razorpay.com/v1/subscriptions/${currentSubId}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${authString}`,
          },
          body: JSON.stringify({ cancel_at_cycle_end: 1 }),
        });
      } catch (err) {
        console.warn('[Razorpay Upgrade] Non-fatal error cancelling old subscription:', err);
      }
    }

    // Step 2: Proration Calculation
    const planConfig = PLANS[currentPlan] || PLANS.basic;
    const monthlyAmount = planConfig.monthly.razorpay.amount;
    const yearlyAmount = targetBillingCycle === 'yearly_onetime'
      ? planConfig.yearly_onetime.razorpay.amount
      : planConfig.yearly_recurring.razorpay.amount;

    const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    const { daysRemaining, creditAmount, chargeNow } = calculateProration({
      monthlyAmount,
      yearlyAmount,
      currentPeriodEnd,
    });

    // Step 3: Create Order if chargeNow > 0
    let orderId = '';
    if (chargeNow > 0) {
      const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`,
        },
        body: JSON.stringify({
          amount: chargeNow,
          currency: 'INR',
          receipt: `rcpt_upg_${currentPlan}_${Date.now()}`,
          notes: {
            userId,
            plan: currentPlan,
            mode: targetBillingCycle,
            type: 'upgrade_proration',
            oldSubscriptionId: sub.id,
          },
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error?.description || 'Failed to create proration order');
      }
      orderId = orderData.id;
    }

    return NextResponse.json({
      order_id: orderId,
      chargeNow,
      daysRemaining,
      creditAmount,
      oldSubscriptionId: sub.id,
      plan: currentPlan,
      targetBillingCycle,
    });
  } catch (err: any) {
    console.error('[Razorpay Upgrade-to-Yearly Error]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
