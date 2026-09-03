import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PLANS, PlanKey } from '@/lib/plans';

/**
 * POST /api/payments/paddle/upgrade-to-yearly
 * Calls Paddle API PATCH /subscriptions/{subscription_id} with proration_billing_mode: 'prorated_immediately'
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

    const paddleApiKey = process.env.PADDLE_API_KEY;
    if (!paddleApiKey) {
      return NextResponse.json({ error: 'PADDLE_API_KEY is unconfigured' }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user's active Paddle subscription
    const { data: sub, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('gateway', 'paddle')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (error || !sub || !sub.gateway_sub_id) {
      return NextResponse.json({ error: 'Active Paddle subscription not found' }, { status: 404 });
    }

    const planKey = (sub.plan_key || 'basic') as PlanKey;
    const planConfig = PLANS[planKey] || PLANS.basic;
    const priceId = targetBillingCycle === 'yearly_onetime'
      ? planConfig.yearly_onetime.paddle.priceId
      : planConfig.yearly_recurring.paddle.priceId;

    const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'production';
    const baseUrl = environment === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';

    // PATCH Paddle Subscription with prorated_immediately
    const paddleRes = await fetch(`${baseUrl}/subscriptions/${sub.gateway_sub_id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${paddleApiKey}`,
      },
      body: JSON.stringify({
        items: [
          {
            price_id: priceId,
            quantity: 1,
          },
        ],
        proration_billing_mode: 'prorated_immediately',
        custom_data: {
          userId,
          plan: planKey,
          mode: targetBillingCycle,
          type: 'upgrade_proration',
          oldSubscriptionId: sub.id,
        },
      }),
    });

    const paddleData = await paddleRes.json();
    if (!paddleRes.ok) {
      console.error('[Paddle Upgrade Error]', paddleData);
      return NextResponse.json({ error: paddleData.error?.detail || 'Failed to upgrade Paddle subscription' }, { status: paddleRes.status });
    }

    // Audit log update in DB
    const now = new Date().toISOString();
    await supabaseAdmin.from('subscriptions').update({
      billing_cycle: targetBillingCycle,
      auto_renew: targetBillingCycle === 'yearly_recurring',
      upgraded_at: now,
    }).eq('id', sub.id);

    return NextResponse.json({ success: true, message: 'Switched to Annual billing successfully via Paddle!' });
  } catch (err: any) {
    console.error('[Paddle Upgrade Exception]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
