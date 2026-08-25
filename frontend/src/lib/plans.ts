/**
 * Unified Plans Configuration
 * Contains exact plan IDs, price IDs, and amounts for Razorpay and Paddle.
 */

export type PlanKey = 'basic' | 'professional' | 'enterprise';
export type BillingMode = 'monthly' | 'yearly_recurring' | 'yearly_onetime';

export interface PlanConfig {
  monthly: {
    razorpay: { planId: string; amount: number };
    paddle: { priceId: string };
  };
  yearly_recurring: {
    razorpay: { planId: string; amount: number };
    paddle: { priceId: string };
  };
  yearly_onetime: {
    razorpay: { amount: number };
    paddle: { priceId: string };
  };
}

export const PLANS: Record<PlanKey, PlanConfig> = {
  basic: {
    monthly: {
      razorpay: { planId: 'plan_TTYzsswVwujxKt', amount: 19900 },
      paddle: { priceId: 'pri_01m0se11wgk2dkv2cpw0jqqm60' },
    },
    yearly_recurring: {
      razorpay: { planId: 'plan_TTYufWiv5d4Wgr', amount: 199000 },
      paddle: { priceId: 'pri_01m0sm1fx442c92zf4fv6fpxdf' },
    },
    yearly_onetime: {
      razorpay: { amount: 199000 },
      paddle: { priceId: 'pri_01m0spr05d2b6hp8ydn7a1xw9q' },
    },
  },
  professional: {
    monthly: {
      razorpay: { planId: 'plan_TTVnnkJbV6uJzV', amount: 29900 },
      paddle: { priceId: 'pri_01m0secg547pq6vzf9deyw7cpq' },
    },
    yearly_recurring: {
      razorpay: { planId: 'plan_TTZ0rGDnrTGzzY', amount: 299000 },
      paddle: { priceId: 'pri_01m0sm25kycrwxwb8tz4xad7zd' },
    },
    yearly_onetime: {
      razorpay: { amount: 299000 },
      paddle: { priceId: 'pri_01m0sprheegr518xmewcgzzsag' },
    },
  },
  enterprise: {
    monthly: {
      razorpay: { planId: 'plan_TTVo4PRW1GLArc', amount: 59900 },
      paddle: { priceId: 'pri_01m0sefvjdvda8fa0kgw7j4h7f' },
    },
    yearly_recurring: {
      razorpay: { planId: 'plan_TTZ1RFdtad3jTU', amount: 599000 },
      paddle: { priceId: 'pri_01m0sm2zqrnvp5jzzg136c41q4' },
    },
    yearly_onetime: {
      razorpay: { amount: 599000 },
      paddle: { priceId: 'pri_01m0sprwjefcfy06c1m9gkvx2d' },
    },
  },
};
