import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PLANS, PlanKey, BillingMode } from '@/lib/plans';
import { calculateProration } from '@/lib/proration';

/**
 * GET /api/payments/upgrade-preview
 * Returns proration breakdown for switching from monthly to annual billing.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const targetBillingCycle = (searchParams.get('targetBillingCycle') || 'yearly_recurring') as 'yearly_recurring' | 'yearly_onetime';

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch active subscription
    const { data: sub, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (error || !sub) {
      return NextResponse.json({ error: 'No active subscription found for user' }, { status: 404 });
    }

    const planKey = (sub.plan_key || 'basic') as PlanKey;
    const gateway = (sub.gateway || 'razorpay') as 'razorpay' | 'paddle';
    const planConfig = PLANS[planKey] || PLANS.basic;

    let monthlyAmount = 0;
    let yearlyAmount = 0;

    if (gateway === 'razorpay') {
      monthlyAmount = planConfig.monthly.razorpay.amount;
      yearlyAmount = targetBillingCycle === 'yearly_onetime'
        ? planConfig.yearly_onetime.razorpay.amount
        : planConfig.yearly_recurring.razorpay.amount;
    } else {
      // Paddle amounts normalized for calculations ($2.99 -> 299, $29.99 -> 2999)
      const paddleAmountMap: Record<PlanKey, { monthly: number; yearly: number }> = {
        basic: { monthly: 299, yearly: 2999 },
        professional: { monthly: 399, yearly: 3999 },
        enterprise: { monthly: 699, yearly: 6999 },
      };
      monthlyAmount = paddleAmountMap[planKey].monthly;
      yearlyAmount = paddleAmountMap[planKey].yearly;
    }

    const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    const proration = calculateProration({
      monthlyAmount,
      yearlyAmount,
      currentPeriodEnd,
    });

    return NextResponse.json({
      daysRemaining: proration.daysRemaining,
      creditAmount: proration.creditAmount,
      chargeNow: proration.chargeNow,
      currentPeriodEnd: currentPeriodEnd.toISOString(),
      gateway,
      planKey,
      monthlyAmount,
      yearlyAmount,
    });
  } catch (err: any) {
    console.error('[Upgrade-Preview Exception]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
