/**
 * Proration Calculation Utility (lib/proration.ts)
 * Calculates remaining days, unused monthly credit, and amount to charge now for annual upgrades.
 */

export interface CalculateProrationParams {
  monthlyAmount: number; // in paise (Razorpay) or cents (Paddle)
  yearlyAmount: number; // in paise (Razorpay) or cents (Paddle)
  currentPeriodEnd: Date;
}

export interface ProrationResult {
  daysRemaining: number;
  creditAmount: number;
  chargeNow: number;
}

export function calculateProration({
  monthlyAmount,
  yearlyAmount,
  currentPeriodEnd,
}: CalculateProrationParams): ProrationResult {
  const now = new Date();
  const msRemaining = currentPeriodEnd.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  const dailyRate = monthlyAmount / 30;
  const creditAmount = Math.floor(dailyRate * daysRemaining);
  const chargeNow = Math.max(0, yearlyAmount - creditAmount);

  return { daysRemaining, creditAmount, chargeNow };
}
