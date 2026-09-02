import { Subscription } from '../context/SubscriptionContext';

export interface ExpiryDisplayInfo {
  label: string;
  value: string;
  color: string;
}

export const validateSubscriptionPayload = (payload: any): any => {
  if (!payload) return payload;

  // NEVER modify paid plan payloads
  if (['basic', 'professional', 'enterprise'].includes(payload.plan_type)) {
    console.log('[Validate] Paid plan — skipping validation:', payload.plan_type);
    return payload;
  }

  // Free plan must have null expiry
  if (payload.plan_type === 'free') {
    payload.expires_at = null;
    payload.renews_at = null;
  }

  return payload;
};

export const getExpiryDisplay = (subscription: Subscription | null): ExpiryDisplayInfo => {
  if (!subscription || subscription.plan_type === 'free' || !subscription.expires_at) {
    return {
      label: 'Expires / Renews',
      value: 'Free forever',
      color: 'text-green-600 dark:text-green-400',
    };
  }

  const expiryDate = new Date(subscription.expires_at);
  const now = new Date();

  // Sanity check — if date is more than 2 years away, treat as corrupted date
  const twoYearsFromNow = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000);
  if (isNaN(expiryDate.getTime()) || expiryDate > twoYearsFromNow) {
    console.warn('[getExpiryDisplay] Suspicious future date detected:', subscription.expires_at);
    return {
      label: 'Expires / Renews',
      value: 'Free forever',
      color: 'text-green-600 dark:text-green-400',
    };
  }

  const formatted = expiryDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  if (subscription.status === 'trialing') {
    const daysLeft = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    return {
      label: 'Trial Ends',
      value: `${formatted} (${daysLeft} days left)`,
      color: daysLeft <= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400',
    };
  }

  if (subscription.status === 'expired') {
    return {
      label: 'Expired On',
      value: formatted,
      color: 'text-red-600 dark:text-red-400',
    };
  }

  // Active paid plan
  const planLabel = subscription.plan_name + ' Plan';
  return {
    label: 'Expires / Renews',
    value: `${formatted} (${planLabel})`,
    color: 'text-green-600 dark:text-green-400',
  };
};

/**
 * Seeds fresh subscription_usage records for a user whenever a subscription is purchased or upgraded.
 *
 * Rules:
 * - Monthly subscription: Seeds 1 monthly period (now -> now + 30 days) with documents_used: 0, reports_used: 0.
 * - Yearly subscription: Seeds 12 sequential monthly periods (Month 1..12) with documents_used: 0, reports_used: 0 for each month!
 */
export async function seedUsagePeriods(
  supabaseAdmin: any,
  userId: string,
  isYearly: boolean,
  startDate: Date = new Date()
): Promise<any[]> {
  if (!userId || !supabaseAdmin) return [];

  try {
    const monthsCount = isYearly ? 12 : 1;
    const records = [];

    for (let i = 0; i < monthsCount; i++) {
      const pStart = new Date(startDate.getTime());
      pStart.setMonth(pStart.getMonth() + i);

      const pEnd = new Date(pStart.getTime());
      pEnd.setMonth(pEnd.getMonth() + 1);

      records.push({
        user_id: userId,
        period_start: pStart.toISOString(),
        period_end: pEnd.toISOString(),
        documents_used: 0,
        reports_used: 0,
        updated_at: new Date().toISOString(),
      });
    }

    // Delete previous stale usage rows for this user that haven't started yet or overlap, then insert fresh
    const { data, error } = await supabaseAdmin
      .from('subscription_usage')
      .insert(records)
      .select();

    if (error) {
      console.warn('[seedUsagePeriods] Insert error:', error);
      return [];
    }

    console.log(`[seedUsagePeriods] ✅ Seeded ${monthsCount} fresh usage period(s) starting from ${startDate.toISOString()} for user:`, userId);
    return data || [];
  } catch (err) {
    console.error('[seedUsagePeriods] Exception:', err);
    return [];
  }
}
