export interface Subscription {
  id: string;
  user_id: string;
  gateway: 'razorpay' | 'paddle';
  gateway_sub_id?: string;
  plan_key: 'basic' | 'professional' | 'enterprise';
  billing_cycle: 'monthly' | 'yearly_recurring' | 'yearly_onetime';
  status: 'active' | 'cancelled' | 'expired';
  auto_renew: boolean;
  current_period_end?: string | Date;
  subscription_expires_at?: string | Date;
  created_at?: string;
  updated_at?: string;
}

export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'unlimited' | 'enterprise';

export interface PlanFeatureLimits {
  documentsPerMonth: number;
  reportsPerMonth: number;
  bulkDatabaseActions: boolean;
  customTemplates: boolean;
  watermarkRemoval: boolean;
  duplicateAndConvertDocuments: boolean;
  aiSmartBilling: boolean;
  aiSupport: boolean;
  recurringScheduler: boolean;
  unlimitedQuota: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, PlanFeatureLimits> = {
  free: {
    documentsPerMonth: 10,
    reportsPerMonth: 1,
    bulkDatabaseActions: false,
    customTemplates: false,
    watermarkRemoval: false,
    duplicateAndConvertDocuments: false,
    aiSmartBilling: false,
    aiSupport: false,
    recurringScheduler: false,
    unlimitedQuota: false,
  },
  basic: {
    documentsPerMonth: 60,
    reportsPerMonth: 5,
    bulkDatabaseActions: true,
    customTemplates: true,
    watermarkRemoval: true,
    duplicateAndConvertDocuments: true,
    aiSmartBilling: false,
    aiSupport: false,
    recurringScheduler: false,
    unlimitedQuota: false,
  },
  pro: {
    documentsPerMonth: 140,
    reportsPerMonth: 15,
    bulkDatabaseActions: true,
    customTemplates: true,
    watermarkRemoval: true,
    duplicateAndConvertDocuments: true,
    aiSmartBilling: true,
    aiSupport: true,
    recurringScheduler: true,
    unlimitedQuota: false,
  },
  unlimited: {
    documentsPerMonth: Infinity,
    reportsPerMonth: Infinity,
    bulkDatabaseActions: true,
    customTemplates: true,
    watermarkRemoval: true,
    duplicateAndConvertDocuments: true,
    aiSmartBilling: true,
    aiSupport: true,
    recurringScheduler: true,
    unlimitedQuota: true,
  },
  enterprise: {
    documentsPerMonth: Infinity,
    reportsPerMonth: Infinity,
    bulkDatabaseActions: true,
    customTemplates: true,
    watermarkRemoval: true,
    duplicateAndConvertDocuments: true,
    aiSmartBilling: true,
    aiSupport: true,
    recurringScheduler: true,
    unlimitedQuota: true,
  },
};

export function getTierLimits(tier: SubscriptionTier): PlanFeatureLimits {
  const normalizedTier = tier === 'enterprise' ? 'unlimited' : tier;
  return TIER_LIMITS[normalizedTier] || TIER_LIMITS.free;
}

export function isFeatureAllowed(tier: SubscriptionTier, feature: keyof PlanFeatureLimits): boolean {
  const limits = getTierLimits(tier);
  const val = limits[feature];
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val > 0;
  return false;
}

/**
 * Returns the active 1-month billing period window { start, end } based on date of activation.
 * The quota resets after every 1-month period completes from the date of activation.
 */
export function getCurrentBillingCycleWindow(): { start: Date; end: Date } {
  if (typeof window === 'undefined') {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
  }

  const activatedAtStr = localStorage.getItem('makbills_sub_activated_at');
  const now = new Date();

  if (!activatedAtStr) {
    // Default to start of current calendar month
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end };
  }

  const actDate = new Date(activatedAtStr);
  if (isNaN(actDate.getTime())) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end };
  }

  // Calculate current 1-month period boundary based on activation day/time
  let periodStart = new Date(actDate);
  while (periodStart.getTime() <= now.getTime()) {
    const nextPeriod = new Date(periodStart);
    nextPeriod.setMonth(nextPeriod.getMonth() + 1);
    if (nextPeriod.getTime() > now.getTime()) {
      // If we are in the first month of activation, start strictly at actDate
      const actualStart = periodStart.getTime() === actDate.getTime() ? actDate : periodStart;
      return { start: actualStart, end: nextPeriod };
    }
    periodStart = nextPeriod;
  }

  // Fallback if actDate is in the future
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

/**
 * Gets report download count within current activation billing cycle
 */
export function getBillingCycleReportCount(): number {
  if (typeof window === 'undefined') return 0;
  const { start } = getCurrentBillingCycleWindow();
  const cycleKey = `makbills_reports_count_${start.toISOString().slice(0, 10)}`;
  return parseInt(localStorage.getItem(cycleKey) || '0', 10);
}

/**
 * Increments report download count within current activation billing cycle
 */
export function incrementBillingCycleReportCount(): number {
  if (typeof window === 'undefined') return 0;
  const { start } = getCurrentBillingCycleWindow();
  const cycleKey = `makbills_reports_count_${start.toISOString().slice(0, 10)}`;
  const current = parseInt(localStorage.getItem(cycleKey) || '0', 10);
  const updated = current + 1;
  localStorage.setItem(cycleKey, String(updated));
  return updated;
}
