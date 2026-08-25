import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-side API endpoint: POST /api/webhooks/razorpay
 * Verifies x-razorpay-signature header before doing any DB operations — returns 400 on failure.
 * Handled Events:
 * - subscription.activated -> set status active, store gateway_sub_id, auto_renew = true
 * - subscription.charged -> update current_period_end
 * - subscription.cancelled -> set status cancelled
 * - payment.captured -> for yearly_onetime (notes.mode === 'yearly_onetime') -> subscription_expires_at = now + 365 days, auto_renew = false
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('[Razorpay Webhook Error] RAZORPAY_WEBHOOK_SECRET is unconfigured');
      return NextResponse.json({ error: 'Webhook secret unconfigured' }, { status: 500 });
    }

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature header' }, { status: 400 });
    }

    // Verify HMAC SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf-8'),
      Buffer.from(signature, 'utf-8')
    );

    if (!isValid) {
      console.warn('[Razorpay Webhook] Invalid signature rejected (400)');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    console.log(`[Razorpay Webhook Verified] Event: ${event}`);

    // Supabase Admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();

    if (event === 'subscription.activated') {
      const subEntity = payload.payload?.subscription?.entity;
      const subId = subEntity?.id;
      const planId = subEntity?.plan_id;
      const notes = subEntity?.notes || {};
      const userId = notes.userId;
      const userEmail = notes.userEmail;
      const planKey = notes.planKey || 'basic';
      const billingCycle = notes.billingMode || 'monthly';

      const currentPeriodEnd = subEntity?.current_end
        ? new Date(subEntity.current_end * 1000).toISOString()
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      if (subId) {
        await supabaseAdmin.from('subscriptions').upsert(
          {
            user_id: userId || null,
            user_email: userEmail || null,
            gateway: 'razorpay',
            gateway_sub_id: subId,
            plan_key: planKey,
            billing_cycle: billingCycle,
            status: 'active',
            auto_renew: true,
            current_period_end: currentPeriodEnd,
            updated_at: now.toISOString(),
          },
          { onConflict: 'gateway_sub_id' }
        );

        if (userId) {
          await supabaseAdmin.from('users').update({
            gateway: 'razorpay',
            gateway_subscription_id: subId,
            plan_id: planKey,
            subscription_status: 'active',
            auto_renew: true,
            current_period_end: currentPeriodEnd,
          }).eq('id', userId);
        }
      }
    } else if (event === 'subscription.charged') {
      const subEntity = payload.payload?.subscription?.entity;
      const subId = subEntity?.id;
      const currentPeriodEnd = subEntity?.current_end
        ? new Date(subEntity.current_end * 1000).toISOString()
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      if (subId) {
        await supabaseAdmin.from('subscriptions').update({
          current_period_end: currentPeriodEnd,
          status: 'active',
          updated_at: now.toISOString(),
        }).eq('gateway_sub_id', subId);
      }
    } else if (event === 'subscription.cancelled') {
      const subEntity = payload.payload?.subscription?.entity;
      const subId = subEntity?.id;

      if (subId) {
        await supabaseAdmin.from('subscriptions').update({
          status: 'cancelled',
          auto_renew: false,
          updated_at: now.toISOString(),
        }).eq('gateway_sub_id', subId);
      }
    } else if (event === 'payment.captured') {
      const payEntity = payload.payload?.payment?.entity;
      const notes = payEntity?.notes || {};

      // Handle Upgrade Proration Payments
      if (notes.type === 'upgrade_proration') {
        const orderId = payEntity?.order_id || payEntity?.id;
        const userId = notes.userId;
        const userEmail = notes.userEmail || payEntity?.email;
        const planKey = notes.plan || notes.planKey || 'basic';
        const targetMode = notes.mode || 'yearly_recurring';
        const oldSubscriptionId = notes.oldSubscriptionId;
        const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

        if (oldSubscriptionId) {
          await supabaseAdmin.from('subscriptions').update({
            status: 'cancelled',
            auto_renew: false,
            updated_at: now.toISOString(),
          }).eq('id', oldSubscriptionId);
        }

        if (orderId) {
          await supabaseAdmin.from('subscriptions').insert({
            user_id: userId || null,
            user_email: userEmail || null,
            gateway: 'razorpay',
            gateway_sub_id: orderId,
            plan_key: planKey,
            billing_cycle: targetMode,
            status: 'active',
            auto_renew: targetMode === 'yearly_recurring',
            subscription_expires_at: expiresAt,
            current_period_end: expiresAt,
            upgraded_from: oldSubscriptionId || null,
            upgraded_at: now.toISOString(),
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          });

          if (userId) {
            await supabaseAdmin.from('users').update({
              gateway: 'razorpay',
              gateway_subscription_id: orderId,
              plan_id: planKey,
              subscription_status: 'active',
              auto_renew: targetMode === 'yearly_recurring',
              subscription_expires_at: expiresAt,
              current_period_end: expiresAt,
            }).eq('id', userId);
          }
        }
      }
      // Handle yearly_onetime orders
      else if (notes.billingMode === 'yearly_onetime' || notes.mode === 'yearly_onetime') {
        const orderId = payEntity?.order_id || payEntity?.id;
        const userId = notes.userId;
        const userEmail = notes.userEmail || payEntity?.email;
        const planKey = notes.planKey || 'basic';
        const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

        if (orderId) {
          await supabaseAdmin.from('subscriptions').upsert(
            {
              user_id: userId || null,
              user_email: userEmail || null,
              gateway: 'razorpay',
              gateway_sub_id: orderId,
              plan_key: planKey,
              billing_cycle: 'yearly_onetime',
              status: 'active',
              auto_renew: false,
              subscription_expires_at: expiresAt,
              current_period_end: expiresAt,
              updated_at: now.toISOString(),
            },
            { onConflict: 'gateway_sub_id' }
          );

          if (userId) {
            await supabaseAdmin.from('users').update({
              gateway: 'razorpay',
              gateway_subscription_id: orderId,
              plan_id: planKey,
              subscription_status: 'active',
              auto_renew: false,
              subscription_expires_at: expiresAt,
              current_period_end: expiresAt,
            }).eq('id', userId);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[Razorpay Webhook Exception]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
