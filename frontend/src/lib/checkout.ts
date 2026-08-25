import { PLANS, PlanKey, BillingMode } from './plans';
import { detectRegion } from './detectRegion';
import { openRazorpayCheckout } from './razorpay';
import { openPaddleCheckout } from './paddle';

export async function handleCheckout(
  plan: PlanKey,
  mode: BillingMode,
  userEmail?: string,
  userId?: string,
  onSuccessCallback?: () => void
): Promise<void> {
  const country = await detectRegion();
  const planConfig = PLANS[plan][mode];

  if (country === 'IN') {
    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_TTVjnkLaEQRDCg';

    if (mode === 'yearly_onetime') {
      // 1. Razorpay Orders API — no subscription object created
      const amount = (planConfig.razorpay as { amount: number }).amount;
      const res = await fetch('/api/payments/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          plan: plan,
          mode: mode,
          userEmail: userEmail || '',
          userId: userId || '',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.order_id) {
        throw new Error(data.error || 'Failed to create Razorpay order');
      }

      await openRazorpayCheckout({
        keyId: razorpayKeyId,
        orderId: data.order_id,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: `MakInvoices ${plan.toUpperCase()}`,
        description: `${plan} (Pay Once - 1 Year)`,
        userEmail: userEmail,
        onSuccess: async (verifyPayload) => {
          try {
            await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...verifyPayload,
                planKey: plan,
                billingMode: mode,
                userId: userId,
                userEmail: userEmail,
              }),
            });
          } catch (e) {}
          if (onSuccessCallback) onSuccessCallback();
        },
      });
    } else {
      // 2. Razorpay Subscription (monthly or yearly_recurring)
      const planId = (planConfig.razorpay as { planId: string }).planId;
      const amount = (planConfig.razorpay as { amount: number }).amount;
      const res = await fetch('/api/payments/razorpay/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: planId,
          amount: amount,
          userEmail: userEmail || '',
          userId: userId || '',
          plan: plan,
          mode: mode,
        }),
      });

      const data = await res.json();
      if (!res.ok || (!data.subscription_id && !data.order_id)) {
        throw new Error(data.error || 'Failed to create Razorpay subscription');
      }

      await openRazorpayCheckout({
        keyId: razorpayKeyId,
        subscriptionId: data.subscription_id,
        orderId: data.order_id,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: `MakInvoices ${plan.toUpperCase()}`,
        description: `${plan} (${mode}) Subscription`,
        userEmail: userEmail,
        onSuccess: async (verifyPayload) => {
          try {
            await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...verifyPayload,
                planKey: plan,
                billingMode: mode,
                userId: userId,
                userEmail: userEmail,
              }),
            });
          } catch (e) {}
          if (onSuccessCallback) onSuccessCallback();
        },
      });
    }
  } else {
    // 3. Paddle handles all three modes via priceId
    const priceId = planConfig.paddle.priceId;
    await openPaddleCheckout({
      priceId: priceId,
      userEmail: userEmail,
      userId: userId,
      onSuccess: () => {
        if (onSuccessCallback) onSuccessCallback();
      },
    });
  }
}
