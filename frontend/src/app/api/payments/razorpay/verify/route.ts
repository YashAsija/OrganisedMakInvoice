import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-side API endpoint: POST /api/payments/razorpay/verify
 * Verifies razorpay_payment_id, razorpay_subscription_id / razorpay_order_id, and razorpay_signature.
 * For order payments: sets subscription_expires_at = now + 365 days, auto_renew = false in DB.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_order_id,
      razorpay_signature,
      planKey,
      billingMode,
      userId,
      userEmail,
    } = body;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json({ error: 'Razorpay secret key not configured' }, { status: 500 });
    }

    if (!razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment parameters for verification' }, { status: 400 });
    }

    let payload = '';
    if (razorpay_subscription_id) {
      payload = `${razorpay_payment_id}|${razorpay_subscription_id}`;
    } else if (razorpay_order_id) {
      payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    } else {
      return NextResponse.json({ error: 'Missing subscription_id or order_id' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(payload)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf-8'),
      Buffer.from(razorpay_signature, 'utf-8')
    );

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Razorpay signature', success: false }, { status: 400 });
    }

    // Initialize Supabase Admin client for trusted updates
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();

    const isOrderOrOnetime = razorpay_order_id || billingMode === 'yearly_onetime';
    const durationDays = billingMode === 'monthly' ? 30 : 365;
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const subIdToSave = razorpay_subscription_id || razorpay_order_id || razorpay_payment_id;

    if (userId || userEmail) {
      const rawPlanKey = (planKey || 'basic').toLowerCase();
      const normalizedPlanKey = rawPlanKey.includes('pro') ? 'professional' : rawPlanKey.includes('unlimited') ? 'enterprise' : (rawPlanKey.includes('starter') || rawPlanKey.includes('basic') || rawPlanKey.includes('professional') || rawPlanKey.includes('enterprise')) ? rawPlanKey : 'basic';

      let resolvedUserId: string | null = userId || null;
      if (userEmail) {
        try {
          const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
          if (authUsers && authUsers.users) {
            const match = authUsers.users.find(u => u.email?.toLowerCase() === userEmail.toLowerCase());
            if (match) resolvedUserId = match.id;
          }
        } catch (e) {
          console.warn('[Razorpay Verify] Auth user lookup warning:', e);
        }
      }

      const finalPlanType = normalizedPlanKey;
      const finalPlanName = normalizedPlanKey === 'professional' ? 'Professional' : normalizedPlanKey === 'enterprise' ? 'Enterprise' : normalizedPlanKey === 'basic' ? 'Basic' : 'Free';

      const payload = {
        user_id: resolvedUserId,
        plan_name: finalPlanName,
        plan_type: finalPlanType,
        status: 'active',
        expires_at: expiresAt,
        renews_at: expiresAt,
        authorized_token_node: subIdToSave || null,
        user_email: userEmail || null,
        updated_at: now.toISOString(),
      };

      if (resolvedUserId) {
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .upsert(payload, { onConflict: 'user_id' });

        if (error) {
          console.error('[Paid Subscription Save Error]', error);
          return NextResponse.json({ error: error.message, success: false }, { status: 500 });
        }
      }

      if (resolvedUserId) {
        await supabaseAdmin.from('users').update({ updatedAt: now.toISOString() }).eq('uid', resolvedUserId);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Razorpay payment signature verified successfully',
    });
  } catch (err: any) {
    console.error('[Razorpay Verify Error]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error', success: false }, { status: 500 });
  }
}
