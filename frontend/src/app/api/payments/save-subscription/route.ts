import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-side API endpoint: POST /api/payments/save-subscription
 * Persists subscription records to Supabase using SUPABASE_SERVICE_ROLE_KEY.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, planName, planType, billingMode, status, authorizedTokenNode } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Save Subscription] Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration error: missing Supabase keys' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate expiration and renewal timestamps based on billing cycle
    const now = new Date();
    const isYearly = billingMode === 'yearly_onetime' || billingMode === 'yearly_recurring' || billingMode === 'yearly';
    const durationDays = isYearly ? 365 : 30;
    const expiresDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    // Map planType and planName cleanly
    const rawPlan = (planType || planName || 'free').toLowerCase();
    let finalPlanType: string;

    if (rawPlan.includes('pro') || rawPlan.includes('professional')) {
      finalPlanType = 'professional';
    } else if (rawPlan.includes('unlimited') || rawPlan.includes('enterprise') || rawPlan.includes('ent')) {
      finalPlanType = 'enterprise';
    } else if (rawPlan.includes('basic')) {
      finalPlanType = 'basic';
    } else {
      finalPlanType = 'free';
    }

    let finalPlanName = planName;
    if (!finalPlanName) {
      if (finalPlanType === 'professional') finalPlanName = 'Professional';
      else if (finalPlanType === 'enterprise') finalPlanName = 'Enterprise';
      else if (finalPlanType === 'basic') finalPlanName = 'Basic';
      else finalPlanName = 'Free';
    }

    const subStatus = status || 'active';

    if (subStatus === 'trialing') {
      finalPlanType = 'free';
      finalPlanName = 'Free';
    }

    // Exact confirmed Supabase schema payload for subscriptions table
    const subPayload = {
      user_id: userId,
      plan_name: finalPlanName,
      plan_type: finalPlanType,
      status: subStatus,
      expires_at: expiresDate,
      renews_at: expiresDate,
      authorized_token_node: authorizedTokenNode || null,
      updated_at: now.toISOString(),
    };

    // Upsert into subscriptions table on conflict of user_id
    const { data: subData, error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .upsert(subPayload, { onConflict: 'user_id' })
      .select()
      .maybeSingle();

    if (subErr) {
      console.error('[Save Subscription API Error] Supabase upsert failed:', subErr);
      return NextResponse.json(
        {
          error: 'Failed to upsert subscription record',
          details: subErr.message,
          code: subErr.code,
          hint: subErr.hint,
        },
        { status: 500 }
      );
    }

    // Also update the public.users table for backward compatibility & direct query lookup
    try {
      const userUpdateData = {
        plan_type: finalPlanType,
        plan_id: finalPlanType,
        subscription_status: subStatus,
        expires_at: expiresDate,
        current_period_end: expiresDate,
        subscription_expires_at: expiresDate,
      };

      await supabaseAdmin.from('users').update(userUpdateData).eq('id', userId);
      await supabaseAdmin.from('users').update(userUpdateData).eq('uid', userId);
    } catch (userUpdateErr) {
      console.warn('[Save Subscription API] Users table update warning:', userUpdateErr);
    }

    return NextResponse.json({
      success: true,
      data: subData || subPayload,
    });
  } catch (err: any) {
    console.error('[Save Subscription API Exception]', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
