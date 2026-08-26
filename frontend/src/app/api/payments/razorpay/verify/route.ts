import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server-side API endpoint: POST /api/payments/razorpay/verify
 * Verifies razorpay_payment_id, razorpay_subscription_id / razorpay_order_id, and razorpay_signature.
 * For order payments: sets subscription_expires_at = now + 365 days, auto_renew = false in DB.
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Called from Route Handler
            }
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required', success: false }, { status: 401 });
    }

    const userId = user.id;
    const userEmail = user.email;

    const body = await req.json();
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_order_id,
      razorpay_signature,
      planKey,
      billingMode,
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
      await supabaseAdmin.from('subscriptions').upsert(
        {
          user_id: userId || null,
          user_email: userEmail || null,
          gateway: 'razorpay',
          gateway_sub_id: subIdToSave,
          plan_key: planKey || 'basic',
          billing_cycle: billingMode || (isOrderOrOnetime ? 'yearly_onetime' : 'monthly'),
          status: 'active',
          auto_renew: !isOrderOrOnetime,
          subscription_expires_at: expiresAt,
          current_period_end: expiresAt,
          updated_at: now.toISOString(),
        },
        { onConflict: 'gateway_sub_id' }
      );

      if (userId) {
        // Update users table matching both uid and id column conventions
        await supabaseAdmin.from('users').update({
          gateway: 'razorpay',
          gateway_subscription_id: subIdToSave,
          plan_id: planKey || 'basic',
          subscription_status: 'active',
          auto_renew: !isOrderOrOnetime,
          subscription_expires_at: expiresAt,
          current_period_end: expiresAt,
        }).eq('uid', userId);
      }

      if (userEmail) {
        await supabaseAdmin.from('users').update({
          gateway: 'razorpay',
          gateway_subscription_id: subIdToSave,
          plan_id: planKey || 'basic',
          subscription_status: 'active',
          auto_renew: !isOrderOrOnetime,
          subscription_expires_at: expiresAt,
          current_period_end: expiresAt,
        }).eq('email', userEmail);
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
