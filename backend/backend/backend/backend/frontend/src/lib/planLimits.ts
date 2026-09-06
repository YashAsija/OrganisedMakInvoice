export type PlanKey = 'starter' | 'basic' | 'professional' | 'enterprise';

export interface PlanLimits {
  documentsPerMonth: number | 'unlimited';
  reportsPerMonth: number | 'unlimited';
  label: string;
  color: string;
}

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  starter:      { documentsPerMonth: 10,          reportsPerMonth: 1,           label: 'Starter',      color: '#94a3b8' },
  basic:        { documentsPerMonth: 60,           reportsPerMonth: 5,           label: 'Basic',        color: '#0284c7' },
  professional: { documentsPerMonth: 140,          reportsPerMonth: 15,          label: 'Professional', color: '#7c3aed' },
  enterprise:   { documentsPerMonth: 'unlimited',  reportsPerMonth: 'unlimited', label: 'Enterprise',   color: '#16a34a' },
};

export function hasActiveSubscription(sub: any): boolean {
  if (!sub) return false;
  const now = new Date();
  if (sub.billing_cycle === 'yearly_onetime') {
    return !!sub.subscription_expires_at && new Date(sub.subscription_expires_at) > now;
  }
  return sub.status === 'active' && !!sub.current_period_end && new Date(sub.current_period_end) > now;
}

export function getUsagePercent(used: number, limit: number | 'unlimited'): number {
  if (limit === 'unlimited') return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}
