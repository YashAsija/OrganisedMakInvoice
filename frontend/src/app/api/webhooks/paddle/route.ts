import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-side API endpoint: POST /api/webhooks/paddle
 * Verifies webhook signature using PADDLE_WEBHOOK_SECRET before doing any DB operation — 400 on failure.
 * Handled Events:
 * - subscription.activated -> set status active, store gateway_sub_id, auto_renew = true, update current_period_end
 * - subscription.updated -> update current_period_end, status
 * - subscription.cancelled -> set status cancelled
 * - transaction.completed -> only for yearly_onetime (check custom_data.mode) -> subscription_expires_at = now + 365 days, auto_renew = false
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('paddle-signature');
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('[Paddle Webhook Error] PADDLE_WEBHOOK_SECRET unconfigured');
      return NextResponse.json({ error: 'Webhook secret unconfigured' }, { status: 500 });
    }

    if (!signatureHeader) {
      return NextResponse.json({ error: 'Missing Paddle-Signature header' }, { status: 400 });
    }

    // Parse Paddle-Signature header format: ts=12345;h1=abc...
    const parts = signatureHeader.split(';').reduce((acc: Record<string, string>, item) => {
      const [key, val] = item.split('=');
      if (key && val) acc[key.trim()] = val.trim();
      return acc;
    }, {});

    const ts = parts.ts;
    const h1 = parts.h1;

    if (!ts || !h1) {
      return NextResponse.json({ error: 'Invalid Paddle-Signature header format' }, { status: 400 });
    }

    // Validate Signature: HMAC SHA256 of `ts:rawBody` using secret
    const signedPayload = `${ts}:${rawBody}`;
    const expectedH1 = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedH1, 'utf-8'),
      Buffer.from(h1, 'utf-8')
    );

    if (!isValid) {
      console.warn('[Paddle Webhook] Invalid signature rejected (400)');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event_type;
    console.log(`[Paddle Webhook Verified] Event: ${eventType}`);

    // Supabase Admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();

    if (eventType === 'subscription.activated') {
      const data = event.data;
      const subId = data.id || data.subscription_id;
      const customData = data.custom_data || {};
      const userId = customData.userId;
      const planKey = customData.plan || 'basic';
      const billingCycle = customData.mode || 'monthly';
      const customerEmail = data.customer?.email || data.user_email;
      const currentPeriodEnd = data.current_billing_period?.ends_at
        ? new Date(data.current_billing_period.ends_at).toISOString()
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      if (subId) {
        await supabaseAdmin.from('subscriptions').upsert(
          {
            user_id: userId || null,
            user_email: customerEmail || null,
            gateway: 'paddle',
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
            gateway: 'paddle',
            gateway_subscription_id: subId,
            plan_id: planKey,
            subscription_status: 'active',
            auto_renew: true,
            current_period_end: currentPeriodEnd,
          }).eq('id', userId);
        }
      }
    } else if (eventType === 'subscription.updated') {
      const data = event.data;
      const subId = data.id;
      const status = data.status || 'active';
      const customData = data.custom_data || {};
      const targetMode = customData.mode || 'yearly_recurring';
      const currentPeriodEnd = data.current_billing_period?.ends_at
        ? new Date(data.current_billing_period.ends_at).toISOString()
        : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

      if (subId) {
        const updateFields: any = {
          status: status,
          current_period_end: currentPeriodEnd,
          updated_at: now.toISOString(),
        };

        if (customData.type === 'upgrade_proration') {
          updateFields.billing_cycle = targetMode;
          updateFields.auto_renew = targetMode === 'yearly_recurring';
          updateFields.upgraded_at = now.toISOString();
          console.log(`[Paddle Webhook] Upgrade proration logged for sub: ${subId}`);
        }

        await supabaseAdmin.from('subscriptions').update(updateFields).eq('gateway_sub_id', subId);

        if (customData.userId) {
          await supabaseAdmin.from('users').update({
            subscription_status: status,
            current_period_end: currentPeriodEnd,
            auto_renew: targetMode === 'yearly_recurring',
          }).eq('id', customData.userId);
        }
      }
    } else if (eventType === 'subscription.cancelled' || eventType === 'subscription.canceled') {
      const subId = event.data?.id;

      if (subId) {
        await supabaseAdmin.from('subscriptions').update({
          status: 'cancelled',
          auto_renew: false,
          updated_at: now.toISOString(),
        }).eq('gateway_sub_id', subId);
      }
    } else if (eventType === 'transaction.completed') {
      const data = event.data;
      const customData = data.custom_data || {};

      // Handle yearly_onetime transactions
      if (customData.mode === 'yearly_onetime') {
        const transId = data.id;
        const userId = customData.userId;
        const customerEmail = data.customer?.email || data.user_email;
        const planKey = customData.plan || 'basic';
        const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

        if (transId) {
          await supabaseAdmin.from('subscriptions').upsert(
            {
              user_id: userId || null,
              user_email: customerEmail || null,
              gateway: 'paddle',
              gateway_sub_id: transId,
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
              gateway: 'paddle',
              gateway_subscription_id: transId,
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
    console.error('[Paddle Webhook Exception]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
