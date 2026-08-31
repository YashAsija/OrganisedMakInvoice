import React, { useState, useEffect } from 'react';
import { 
  Check, 
  Sparkles, 
  Crown, 
  Zap, 
  ShieldCheck, 
  CreditCard,
  RefreshCw,
  Coins,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { BusinessProfile, Invoice } from '../types';
import { detectRegion, Region } from '../lib/detectRegion';
import { getCurrentBillingCycleWindow } from '../lib/subscriptionGuard';
import { openRazorpayCheckout } from '../lib/razorpay';
import { openPaddleCheckout } from '../lib/paddle';
import { supabase } from '../lib/supabase';
import { getExpiryLabel } from '../context/SubscriptionContext';
import { getExpiryDisplay } from '../lib/subscriptionUtils';
import { SubscriptionStatus } from './SubscriptionStatus';
import { useSubscription } from '../hooks/useSubscription';
import { TrialConfirmModal } from './ui/TrialConfirmModal';

interface SubscriptionPageProps {
  theme: 'light' | 'dark';
  profile: BusinessProfile;
  invoices?: Invoice[];
  subscriptionTier: 'free' | 'basic' | 'pro' | 'unlimited' | 'enterprise';
  onUpgrade: (tier: 'free' | 'basic' | 'pro' | 'unlimited' | 'enterprise') => void;
}

const RAZORPAY_PLANS: Record<string, { month: string; year: string; amount: number }> = {
  free: { month: 'plan_starter_free', year: 'plan_starter_free', amount: 0 },
  basic: { month: 'plan_basic_m_199', year: 'plan_basic_y_1990', amount: 199 },
  pro: { month: 'plan_pro_m_299', year: 'plan_pro_y_2990', amount: 299 },
  unlimited: { month: 'plan_ent_m_599', year: 'plan_ent_y_5990', amount: 599 },
  enterprise: { month: 'plan_ent_m_599', year: 'plan_ent_y_5990', amount: 599 },
};

const PADDLE_PRICES: Record<string, { month: string; year: string }> = {
  free: { month: 'pri_starter_m', year: 'pri_starter_y' },
  basic: { month: 'pri_01m0se11wgk2dkv2cpw0jqqm60', year: 'pri_01m0sm1fx442c92zf4fv6fpxdf' },
  pro: { month: 'pri_01m0secg547pq6vzf9deyw7cpq', year: 'pri_01m0sm25kycrwxwb8tz4xad7zd' },
  unlimited: { month: 'pri_01m0sefvjdvda8fa0kgw7j4h7f', year: 'pri_01m0sm2zqrnvp5jzzg136c41q4' },
  enterprise: { month: 'pri_01m0sefvjdvda8fa0kgw7j4h7f', year: 'pri_01m0sm2zqrnvp5jzzg136c41q4' },
};

const PLANS = [
  {
    id: 'free' as const,
    tier: 'Free / Trial',
    name: 'Starter',
    tagline: 'Get started at zero cost. Essential billing and ledger tools.',
    monthly: '₹0',
    annual: '₹0',
    annualNote: 'Free forever. No commitment needed.',
    monthlyNote: 'Free forever. No credit card needed.',
    popular: false,
    limit: 10,
    reportLimit: 1,
    features: [
      { text: 'Sales Ledger and Purchase Ledger Access', included: true },
      { text: 'WhatsApp & Email Sharing, PDF Export, Payment Recording', included: true },
      { text: 'Interactive Editable Document Builder', included: true },
      { text: 'Expenses Tracker & Billing Dashboard', included: true },
      { text: '1 Accounting Report / month', included: true },
      { text: '10 Documents / month total quota', included: true },
      { text: 'Client, Vendor, HSN, Transport & Catalog Databases', included: true },
      { text: 'System Preset Templates & Auto UPI QR Code', included: true },
      { text: 'Dark and Light Theme Mode Toggle', included: true },
      { text: 'Email, FAQ & Ticket Support Channels', included: true },
      { text: 'Bulk Database Management', included: false },
      { text: 'Create Own Custom Simple & Advanced Templates', included: false },
      { text: 'Bulk Ledger Actions (Payments, Deletion, CSV Export)', included: false },
      { text: 'Personalised Logo & Signature', included: false },
      { text: 'Personalised Watermark & Company Watermark Removal', included: false },
      { text: 'Document Duplication & Document Type Converter', included: false },
      { text: 'AI Smart Billing & 24/7 AI Support', included: false },
      { text: 'Recurring Invoice Scheduler', included: false },
    ],
  },
  {
    id: 'basic' as const,
    tier: 'Basic',
    name: 'Basic',
    tagline: 'Perfect for freelancers & businesses scaling document management.',
    monthly: '₹199',
    annual: '₹1,990',
    annualNote: 'Billed ₹1,990/year — save 20%.',
    monthlyNote: 'Billed monthly. Cancel anytime.',
    popular: false,
    limit: 60,
    reportLimit: 5,
    features: [
      { text: '60 Documents / month total quota', included: true },
      { text: '5 Accounting Reports / month', included: true },
      { text: 'Bulk Database Management for All Registries', included: true },
      { text: 'Create Own Custom Simple & Advanced Templates', included: true },
      { text: 'Bulk Ledger Actions for Payments, Deletion & CSV Exports', included: true },
      { text: 'Personalised Company Logo & Signature', included: true },
      { text: 'Personalised Watermark & MakInvoices Watermark Removal', included: true },
      { text: 'Duplicate Documents & Convert Document Types', included: true },
      { text: 'Sales Ledger and Purchase Ledger Access', included: true },
      { text: 'Interactive Document Builder & Expenses Tracker', included: true },
      { text: 'Auto UPI Payment QR & Dark/Light Mode', included: true },
      { text: 'AI Smart Billing & 24/7 AI Support', included: false },
      { text: 'Recurring Invoice Scheduler', included: false },
    ],
  },
  {
    id: 'pro' as const,
    tier: 'Professional',
    name: 'Professional',
    tagline: 'For growing businesses requiring AI billing & recurring automation.',
    monthly: '₹299',
    annual: '₹2,990',
    annualNote: 'Billed ₹2,990/year — save 20%.',
    monthlyNote: 'Billed monthly. Cancel anytime.',
    popular: true,
    limit: 140,
    reportLimit: 15,
    features: [
      { text: '140 Documents / month total quota', included: true },
      { text: '15 Accounting Reports / month', included: true },
      { text: 'AI Smart Billing Feature with AI Document Parsing', included: true },
      { text: '24*7 Dedicated MakInvoices AI Assistant Support', included: true },
      { text: 'Automated Recurring Invoice Scheduler', included: true },
      { text: 'Bulk Database Management & Bulk Ledger Actions', included: true },
      { text: 'Create Own Custom Simple & Advanced Templates', included: true },
      { text: 'Personalised Logo, Signature & Watermark Removal', included: true },
      { text: 'Duplicate Existing Documents & Document Converter', included: true },
      { text: 'Sales Ledger and Purchase Ledger Access', included: true },
      { text: 'Interactive Document Builder & Expenses Tracker', included: true },
    ],
  },
  {
    id: 'unlimited' as const,
    tier: 'Enterprise',
    name: 'Enterprise',
    tagline: 'Unlimited scale and dedicated support for high-volume operations.',
    monthly: '₹599',
    annual: '₹5,990',
    annualNote: 'Billed ₹5,990/year — save 20%.',
    monthlyNote: 'Billed monthly. Cancel anytime.',
    popular: false,
    limit: Infinity,
    reportLimit: Infinity,
    features: [
      { text: 'Unlimited Monthly Documents Quota', included: true },
      { text: 'Unlimited Accounting Reports / month', included: true },
      { text: 'Priority 24/7 VIP Support & Service Level Agreement', included: true },
      { text: 'Dedicated Account Manager & Custom Onboarding', included: true },
      { text: 'AI Smart Billing & 24/7 MakInvoices AI Assistant Support', included: true },
      { text: 'Automated Recurring Invoice Scheduler', included: true },
      { text: 'Bulk Database Management & Bulk Ledger Actions', included: true },
      { text: 'Create Own Custom Simple & Advanced Templates', included: true },
      { text: 'Personalised Logo, Signature & Watermark', included: true },
      { text: 'Duplicate Existing Documents & Document Converter', included: true },
      { text: 'Full Sales & Purchase Ledger Capabilities', included: true },
    ],
  },
];

export default function SubscriptionPage({ 
  theme, 
  profile, 
  invoices = [],
  subscriptionTier, 
  onUpgrade 
}: SubscriptionPageProps) {
  const { subscription: ctxSub, isLoading: isCtxLoading, isRealtimeSyncing, startTrial } = useSubscription();
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<string | null>(null);
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState<boolean>(false);
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});
  const [region, setRegion] = useState<Region | null>(null);
  const [paddlePrices, setPaddlePrices] = useState<Record<string, { month: string; year: string }>>({});
  const [loadingPrices, setLoadingPrices] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly_recurring' | 'yearly_onetime'>('monthly');
  const [trialModalPlan, setTrialModalPlan] = useState<'basic' | 'professional' | null>(null);

  // Fetch current authenticated user to pass userId and userEmail to checkout
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email || profile?.email);
      }
    });
  }, [profile]);

  // Detect Region (IN vs INTL) dynamically on mount
  useEffect(() => {
    let isMounted = true;
    setLoadingPrices(true);
    import('../lib/detectRegion').then(({ getUserRegion }) => {
      getUserRegion().then((detRegion) => {
        if (isMounted) {
          setRegion(detRegion);
          setLoadingPrices(false);
        }
      }).catch(() => {
        if (isMounted) {
          setRegion('INTL');
          setLoadingPrices(false);
        }
      });
    });
    return () => { isMounted = false; };
  }, []);

  // Fetch Paddle prices for INTL
  useEffect(() => {
    if (region !== 'INTL') return;
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || 'live_0b8c91040964a20151647bd285b';
    const env = (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as 'sandbox' | 'production') || 'production';

    import('@paddle/paddle-js').then(({ initializePaddle }) => {
      initializePaddle({ environment: env, token }).then((paddle) => {
        if (!paddle) return;
        const items = [
          { priceId: PADDLE_PRICES.basic.month, quantity: 1 },
          { priceId: PADDLE_PRICES.basic.year, quantity: 1 },
          { priceId: PADDLE_PRICES.pro.month, quantity: 1 },
          { priceId: PADDLE_PRICES.pro.year, quantity: 1 },
          { priceId: PADDLE_PRICES.enterprise.month, quantity: 1 },
          { priceId: PADDLE_PRICES.enterprise.year, quantity: 1 },
        ];
        paddle.PricePreview({ items }).then((preview) => {
          if (preview?.data?.details?.lineItems) {
            const map: Record<string, { month: string; year: string }> = {
              basic: { month: '$2.99', year: '$29.99' },
              pro: { month: '$3.99', year: '$39.99' },
              unlimited: { month: '$6.99', year: '$69.99' },
              enterprise: { month: '$6.99', year: '$69.99' },
            };
            preview.data.details.lineItems.forEach((item: any) => {
              const formatted = item.formattedTotals?.total;
              if (formatted) {
                if (item.price?.id === PADDLE_PRICES.basic.month) map.basic.month = formatted;
                if (item.price?.id === PADDLE_PRICES.basic.year) map.basic.year = formatted;
                if (item.price?.id === PADDLE_PRICES.pro.month) map.pro.month = formatted;
                if (item.price?.id === PADDLE_PRICES.pro.year) map.pro.year = formatted;
                if (item.price?.id === PADDLE_PRICES.enterprise.month) map.unlimited.month = formatted;
                if (item.price?.id === PADDLE_PRICES.enterprise.year) map.unlimited.year = formatted;
              }
            });
            setPaddlePrices(map);
          }
        }).catch(() => {});
      });
    });
  }, [region]);

  // Auto-launch payment modal if user arrived from Pricing Page with a plan intent
  useEffect(() => {
    try {
      const storedIntent = localStorage.getItem('mak_selected_plan_intent');
      if (storedIntent) {
        localStorage.removeItem('mak_selected_plan_intent');
        const parsed = JSON.parse(storedIntent);
        if (parsed.billing === 'annual') {
          setIsYearly(true);
        }
        const planKeyMap: Record<string, 'basic' | 'professional' | 'enterprise'> = {
          basic: 'basic',
          pro: 'professional',
          professional: 'professional',
          unlimited: 'enterprise',
          enterprise: 'enterprise',
        };
        const validPlan = planKeyMap[parsed.tier] || 'basic';
        const mode = parsed.mode || (parsed.billing === 'annual' ? 'yearly_recurring' : 'monthly');

        setTimeout(() => {
          triggerCheckout(validPlan, mode);
        }, 500);
      }
    } catch (e) {}
  }, [region]);

  // Normalise mapped subscription tier (enterprise maps to unlimited conceptually for limits check)
  const activeTier = subscriptionTier === 'enterprise' ? 'unlimited' : subscriptionTier;

  const triggerCheckout = async (planKey: 'basic' | 'professional' | 'enterprise', mode: 'monthly' | 'yearly_recurring' | 'yearly_onetime') => {
    setLoadingPlan(planKey);
    try {
      const { handleCheckout } = await import('../lib/checkout');
      await handleCheckout(planKey, mode, userEmail || profile?.email, userId, () => {
        const upgradeTier = planKey === 'professional' ? 'pro' : planKey === 'enterprise' ? 'unlimited' : planKey;
        const now = new Date();
        const expires = new Date();
        if (mode === 'monthly') {
          expires.setMonth(now.getMonth() + 1);
        } else {
          expires.setFullYear(now.getFullYear() + 1);
        }
        localStorage.setItem('makbills_sub_activated_at', now.toISOString());
        localStorage.setItem('makbills_sub_expires_iso', expires.toISOString());
        localStorage.setItem('makbills_sub_expires_at', expires.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) + (mode === 'monthly' ? ' (Monthly Plan)' : ' (Annual Plan)'));
        localStorage.setItem('makbills_last_active_paid_tier', upgradeTier);
        onUpgrade(upgradeTier as any);
        setShowSuccessModal(planKey);
      });
    } catch (err: any) {
      alert(err.message || 'Payment initiation failed. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const getMonthlyUsage = () => {
    const { start, end } = getCurrentBillingCycleWindow();
    const startTime = start.getTime();
    const endTime = end.getTime();

    return invoices.filter(inv => {
      if (inv.status === 'draft') return false; // Drafts are un-published templates, but all created/finalized docs count
      const tsStr = inv.createdAt || inv.date;
      if (!tsStr) return false;
      const dTime = new Date(tsStr).getTime();
      return !isNaN(dTime) && dTime >= startTime && dTime < endTime;
    }).length;
  };

  const usageCount = getMonthlyUsage();
  
  const getActiveLimit = () => {
    if (activeTier === 'free') return 10;
    if (activeTier === 'basic') return 60;
    if (activeTier === 'pro') return 140;
    return Infinity;
  };

  const activeLimit = getActiveLimit();
  const usagePercentage = activeLimit === Infinity ? 100 : Math.min(100, (usageCount / activeLimit) * 100);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-3 md:py-4 space-y-8 animate-in fade-in duration-300">
      
      {/* Premium Header Bento Card */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-[#111a36] p-6 sm:p-8 md:p-10 border border-[#bae6fd]/60 dark:border-[#223269]/60 shadow-xs">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#0284c7]/5 dark:bg-[#0284c7]/10 rounded-full blur-3xl pointer-events-none" />

        {isCtxLoading ? (
          <div className="space-y-4 animate-pulse py-4">
            <div className="h-6 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-10 w-72 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-4 w-96 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          </div>
        ) : (
          <>
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#e0f2fe] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8] rounded-full text-[10px] font-black uppercase tracking-wider border border-[#bae6fd]/50 dark:border-[#223269]/50">
              <Crown className="w-3 h-3" />
              <span>Subscription Control Center</span>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl md:text-3.5xl font-black tracking-tight leading-tight uppercase text-[#0f172a] dark:text-white" style={{ fontFamily: "'Fraunces', serif" }}>
                Configure Your Billing Scale
              </h1>
              <p className="text-xs sm:text-sm text-[#64748b] dark:text-[#94a3b8] max-w-xl leading-relaxed">
                Unlock cloud synchronization, advanced PDF layout templates, unlimited recurring invoices, and dedicated priority support channels.
              </p>
            </div>
          </div>

          <div className="bg-[#f4f9ff] dark:bg-[#0b1329] rounded-2xl p-5 border border-[#bae6fd]/50 dark:border-[#223269]/50 shrink-0 w-full md:w-80 shadow-3xs hover:shadow-2xs transition-shadow">
            <div className="flex justify-between items-center">
              <span className="text-[9px] text-[#64748b] dark:text-[#94a3b8] uppercase tracking-widest font-extrabold block">Current Status</span>
              {activeTier !== 'free' && !isCtxLoading && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </div>
            
            {/* Plan name section */}
            {!ctxSub?.plan_name && isCtxLoading ? (
              <div className="animate-pulse h-6 bg-slate-200 dark:bg-slate-800 rounded w-32 mt-1.5" />
            ) : (
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-lg font-black text-[#0f172a] dark:text-white capitalize">
                  {ctxSub?.plan_name === 'Free' ? 'Starter' : ctxSub?.plan_name || activeTier} Plan
                </span>
              </div>
            )}
            
            {/* Subtitle section */}
            {!ctxSub && isCtxLoading ? (
              <div className="animate-pulse h-4 bg-slate-200 dark:bg-slate-800 rounded w-48 mt-1" />
            ) : (
              <p className="text-[10px] text-[#64748b] dark:text-[#94a3b8] mt-1 font-medium">
                {activeTier === 'free' 
                  ? 'Starter: Limit of 10 documents & 1 report/mo.' 
                  : activeTier === 'basic'
                    ? 'Basic: Limit of 60 documents & 5 reports/mo.'
                    : activeTier === 'pro' 
                      ? 'Professional: Limit of 140 documents & 15 reports/mo with AI Smart Billing.'
                      : 'Enterprise: Unlimited documents & reports fully unlocked.'}
              </p>
            )}

            <div className="mt-2 text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2.5 py-1 rounded-lg border border-sky-200 dark:border-sky-800/50 flex items-center justify-between gap-1.5 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span>Date of Activation:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {(() => {
                    const activatedAt = typeof window !== 'undefined' ? localStorage.getItem('makbills_sub_activated_at') : null;
                    const dateObj = activatedAt ? new Date(activatedAt) : new Date();
                    return isNaN(dateObj.getTime()) ? new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                  })()}
                </span>
              </div>
              {(() => {
                const expiryInfo = getExpiryDisplay(ctxSub);
                return (
                  <div className={`flex items-center gap-1.5 ${expiryInfo.color}`}>
                    <span>{expiryInfo.label}:</span>
                    <span className="font-mono font-extrabold">{expiryInfo.value}</span>
                  </div>
                );
              })()}
            </div>
            
            {/* Usage limit meters */}
            <div className="mt-4 pt-3.5 border-t border-[#bae6fd]/30 dark:border-[#223269]/30 space-y-3">
              {/* Documents Usage */}
              <div>
                <div className="flex justify-between text-[10px] mb-1 font-bold">
                  <span className="text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">Documents Usage</span>
                  <span className="text-[#0f172a] dark:text-white font-mono">
                    {activeLimit === Infinity ? 'Unlimited' : `${usageCount} / ${activeLimit}`}
                  </span>
                </div>
                
                <div className="w-full bg-[#e0f2fe]/45 dark:bg-[#1b264f]/40 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      activeLimit === Infinity 
                        ? 'bg-emerald-500 w-full' 
                        : usagePercentage > 85 
                          ? 'bg-rose-500' 
                          : usagePercentage > 60 
                            ? 'bg-amber-500' 
                            : 'bg-[#0284c7]'
                    }`}
                    style={{ width: `${usagePercentage}%` }}
                  />
                </div>
              </div>

              {/* Reports Usage */}
              <div>
                <div className="flex justify-between text-[10px] mb-1 font-bold">
                  <span className="text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">Reports Usage</span>
                  <span className="text-[#0f172a] dark:text-white font-mono">
                    {activeTier === 'free' ? '0 / 1' : activeTier === 'basic' ? '0 / 5' : activeTier === 'pro' ? '0 / 15' : 'Unlimited'}
                  </span>
                </div>
                
                <div className="w-full bg-[#e0f2fe]/45 dark:bg-[#1b264f]/40 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500 bg-[#7c3aed]"
                    style={{ width: (activeTier as string) === 'unlimited' || (activeTier as string) === 'enterprise' ? '100%' : '0%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        </>
        )}
      </div>



      {/* Pricing Billing Cycle Selector */}
      <div className="text-center space-y-4">
        <h2 className="text-xl md:text-2xl font-black tracking-tight text-[#0f172a] dark:text-white uppercase">
          Choose a Plan Designed for Growth
        </h2>
        
        <div className="flex items-center justify-center gap-3">
          <span className={`text-xs font-bold transition-colors ${!isYearly ? 'text-[#0284c7] dark:text-[#38bdf8] font-extrabold' : 'text-slate-500 dark:text-slate-400'}`}>Monthly Billing</span>
          <button
            type="button"
            onClick={() => setIsYearly(!isYearly)}
            className="w-12 h-6.5 rounded-full bg-[#e0f2fe]/40 dark:bg-[#0b1329] p-1 border border-[#bae6fd]/50 dark:border-[#223269]/50 transition-colors relative focus:outline-none cursor-pointer flex items-center"
          >
            <div className={`w-4.5 h-4.5 rounded-full bg-[#0284c7] dark:bg-[#38bdf8] shadow-md transition-transform duration-300 transform ${isYearly ? 'translate-x-5.5' : 'translate-x-0'}`} />
          </button>
          <span className={`text-xs font-bold transition-colors flex items-center gap-1.5 ${isYearly ? 'text-[#0284c7] dark:text-[#38bdf8] font-extrabold' : 'text-slate-500 dark:text-slate-400'}`}>
            Yearly Billing
            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-md font-extrabold uppercase tracking-wider">Save 20%</span>
          </span>
        </div>
      </div>

      {/* Plan Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => {
          const isActive = activeTier === plan.id;
          const displayedFeatures = plan.features.slice(0, 5);

          return (
            <div 
              key={plan.id} 
              className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between hover:scale-102 hover:shadow-xl ${
                theme === 'dark' ? 'bg-[#111a36] border-[#bae6fd]/40 hover:border-[#bae6fd]/60 dark:border-[#223269]/50 dark:hover:border-[#223269]/80' : 'bg-white border-[#bae6fd]/60 hover:border-[#0284c7]/40 shadow-xs'
              } ${plan.popular ? 'border-[#0284c7]/50 ring-1 ring-[#0284c7]/30 shadow-[#0284c7]/5' : ''} ${isActive ? 'ring-2 ring-[#0284c7]' : ''}`}
            >
              <div className="relative flex-1 flex flex-col">
                {plan.popular && (
                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2">
                    <span className="text-[8px] px-2 py-0.5 bg-gradient-to-r from-[#0284c7] to-[#2563eb] text-white rounded-full font-black uppercase tracking-wider shadow-md">Most Popular</span>
                  </div>
                )}
                
                <div className="text-[#64748b] dark:text-[#94a3b8] text-[10px] font-black uppercase tracking-wider mb-1">{plan.tier}</div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-black text-[#0f172a] dark:text-white leading-tight">{plan.name}</h3>
                    {(plan.id === 'basic' || plan.id === 'pro') && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[9.5px] font-extrabold mt-1">
                        ✓ 1 Month Free Trial Available
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <span className="text-[9px] px-2 py-0.5 bg-[#e0f2fe] text-[#0284c7] dark:bg-[#1b264f] dark:text-[#38bdf8] rounded-full font-bold">Active</span>
                  )}
                </div>
                <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-2 leading-relaxed min-h-[36px]">
                  {plan.tagline}
                </p>
                
                <div className="flex items-baseline gap-1 my-4">
                  <span className="text-3xl font-black text-[#0f172a] dark:text-white">
                    {loadingPrices ? (
                      <span className="animate-pulse bg-slate-200 dark:bg-slate-800 rounded px-4 py-1 text-transparent">...</span>
                    ) : plan.id === 'free' ? (
                      region === 'INTL' ? '$0' : '₹0'
                    ) : region === 'INTL' ? (
                      isYearly ? (paddlePrices[plan.id]?.year || (plan.id === 'basic' ? '$49.90' : plan.id === 'pro' ? '$99.90' : '$199.90')) : (paddlePrices[plan.id]?.month || (plan.id === 'basic' ? '$4.99' : plan.id === 'pro' ? '$9.99' : '$19.99'))
                    ) : (
                      isYearly ? plan.annual : plan.monthly
                    )}
                  </span>
                  <span className="text-xs text-[#64748b] dark:text-[#94a3b8]">{isYearly ? '/yr' : '/mo'}</span>
                </div>
                <p className="text-[10px] font-mono text-[#64748b] dark:text-zinc-500 min-h-[24px]">
                  {(plan.id === 'basic' || plan.id === 'pro')
                    ? `Try free for 30 days, then ${isYearly ? plan.annual : plan.monthly}${isYearly ? '/yr' : '/mo'}`
                    : (isYearly ? plan.annualNote : plan.monthlyNote)}
                </p>

                <div className="border-t border-[#bae6fd]/30 dark:border-[#223269]/30 pt-4 space-y-2.5 mb-6 flex-1">
                  {displayedFeatures.map((feat, i) => (
                    <div key={i} className={`flex items-start gap-2 text-[11px] ${feat.included ? '' : 'opacity-40'}`}>
                      {feat.included ? (
                        <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      ) : (
                        <span className="text-[#64748b] dark:text-[#94a3b8] shrink-0 font-bold ml-1.5 mr-1">–</span>
                      )}
                      <span className="text-slate-600 dark:text-zinc-300 leading-normal">{feat.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {(() => {
                const trialUsedPlans = ctxSub?.trial_used_plans || [];
                const isBasicTrialClaimed = trialUsedPlans.includes('basic') || Boolean(typeof window !== 'undefined' && localStorage.getItem('makbills_trial_used_basic'));
                const isProTrialClaimed = trialUsedPlans.includes('professional') || Boolean(typeof window !== 'undefined' && localStorage.getItem('makbills_trial_used_pro'));

                const canTrialBasic = plan.id === 'basic' && !isBasicTrialClaimed && !isActive;
                const canTrialPro = plan.id === 'pro' && !isProTrialClaimed && !isActive;

                // Check active valid subscription window for reclaim vs renew
                const lastPaidTier = typeof window !== 'undefined' ? localStorage.getItem('makbills_last_active_paid_tier') : null;
                const expiresIsoRaw = typeof window !== 'undefined' ? localStorage.getItem('makbills_sub_expires_iso') : null;
                const isMatchingTier = Boolean(
                  lastPaidTier === plan.id ||
                  (lastPaidTier === 'enterprise' && plan.id === 'unlimited') ||
                  (lastPaidTier === 'unlimited' && plan.id === 'unlimited')
                );

                const isWithinActivationWindow = Boolean(
                  isMatchingTier && 
                  (!expiresIsoRaw || new Date(expiresIsoRaw).getTime() > Date.now())
                );
                const isExpiredPaidPlan = Boolean(
                  isMatchingTier && 
                  expiresIsoRaw && 
                  new Date(expiresIsoRaw).getTime() <= Date.now()
                );

                return (
                  <div className="space-y-2 mt-2">
                    {(canTrialBasic || canTrialPro) && (
                      <button
                        type="button"
                        disabled={isCtxLoading}
                        onClick={async () => {
                          try {
                            const targetPlan = plan.id === 'pro' ? 'professional' : 'basic';
                            await startTrial(targetPlan);
                            localStorage.setItem(`makbills_trial_used_${plan.id}`, new Date().toISOString());
                            onUpgrade(plan.id as any);
                            setShowSuccessModal(`${plan.id}_trial`);
                          } catch (err: any) {
                            alert('Trial activation error: ' + (err?.message || 'Failed to start trial'));
                          }
                        }}
                        className={`w-full py-2.5 font-extrabold text-xs rounded-xl transition-all text-white shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 ${
                          isCtxLoading ? 'bg-emerald-800 opacity-60 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 active:scale-98 cursor-pointer'
                        }`}
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isCtxLoading ? 'animate-spin' : ''}`} />
                        <span>{isCtxLoading ? 'Activating Trial...' : 'Start 1-Month Free Trial'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isActive || loadingPlan !== null}
                      onClick={() => {
                        if (plan.id === 'free') {
                          setShowDowngradeConfirm(true);
                          return;
                        }

                        // Reclaim active plan without payment IF within valid activation time window
                        if (isWithinActivationWindow) {
                          onUpgrade(plan.id as any);
                          setShowSuccessModal(plan.id);
                          return;
                        }

                        // Otherwise (expired or new subscription), trigger paid payment checkout / renewal
                        const mappedKey = (plan.id === 'pro' ? 'professional' : plan.id === 'unlimited' ? 'enterprise' : plan.id) as 'basic' | 'professional' | 'enterprise';
                        const mode = isYearly ? 'yearly_recurring' : 'monthly';
                        triggerCheckout(mappedKey, mode);
                      }}
                      className={`w-full py-2.5 font-bold text-xs rounded-xl cursor-pointer transition-all border flex items-center justify-center gap-2 ${
                        isActive
                          ? 'bg-[#e0f2fe] dark:bg-zinc-800/60 border-transparent text-[#64748b] dark:text-[#94a3b8] dark:text-zinc-500 cursor-default'
                          : plan.popular && !(canTrialBasic || canTrialPro)
                            ? 'bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] active:scale-98 text-white shadow-md shadow-[#0284c7]/20'
                            : 'border-[#bae6fd]/60 dark:border-[#223269]/60 hover:bg-[#e0f2fe]/40 dark:hover:bg-[#1b264f]/40 text-[#0284c7] dark:text-[#38bdf8]'
                      }`}
                    >
                      {loadingPlan === plan.id ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : isActive ? (
                        'Currently Active'
                      ) : plan.id === 'free' ? (
                        'Downgrade to Free'
                      ) : isWithinActivationWindow ? (
                        <>
                          <Zap className="w-3.5 h-3.5 fill-[#0284c7] dark:fill-[#38bdf8]" />
                          <span>Reclaim {plan.name} Plan</span>
                        </>
                      ) : isExpiredPaidPlan ? (
                        <>
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Renew {plan.name} Plan</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>{(canTrialBasic || canTrialPro) ? `Buy Paid ${plan.name}` : `Get ${plan.name}`}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* Comprehensive Subscription Comparison Table */}
      <div className="mt-12 space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-xl sm:text-2xl font-black text-[#0f172a] dark:text-white uppercase tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
            Full Feature Comparison Matrix
          </h3>
          <p className="text-xs sm:text-sm text-[#64748b] dark:text-[#94a3b8] max-w-2xl mx-auto">
            Compare all capabilities, monthly document quotas, bulk ledger tools, template builders, and AI features across all plan tiers in detail.
          </p>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-[#bae6fd]/60 dark:border-[#223269]/60 bg-white dark:bg-[#111a36] shadow-sm">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[#bae6fd]/60 dark:border-[#223269]/60 bg-[#f4f9ff] dark:bg-[#0b1329]">
                <th className="p-4 text-xs font-black uppercase text-[#0f172a] dark:text-white w-1/3">Feature Capabilities</th>
                <th className="p-4 text-xs font-black uppercase text-center text-[#0f172a] dark:text-white">Starter</th>
                <th className="p-4 text-xs font-black uppercase text-center text-[#0f172a] dark:text-white">Basic</th>
                <th className="p-4 text-xs font-black uppercase text-center text-[#0284c7] dark:text-[#38bdf8]">Professional</th>
                <th className="p-4 text-xs font-black uppercase text-center text-[#0f172a] dark:text-white">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#bae6fd]/30 dark:divide-[#223269]/40 text-xs">
              {/* Monthly Quotas & Limits */}
              <tr className="bg-slate-50/50 dark:bg-[#162244]/50">
                <td colSpan={5} className="p-3 px-4 font-black uppercase tracking-wider text-[10px] text-[#0284c7] dark:text-[#38bdf8]">Monthly Quotas &amp; Limits</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">Documents / Month (Sales &amp; Purchase Total)</td>
                <td className="p-4 text-center font-bold">10 Docs</td>
                <td className="p-4 text-center font-bold">60 Docs</td>
                <td className="p-4 text-center font-bold text-[#0284c7] dark:text-[#38bdf8]">140 Docs</td>
                <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">Unlimited</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">Accounting Reports / Month</td>
                <td className="p-4 text-center font-bold">1 Report</td>
                <td className="p-4 text-center font-bold">5 Reports</td>
                <td className="p-4 text-center font-bold text-[#0284c7] dark:text-[#38bdf8]">15 Reports</td>
                <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">Unlimited</td>
              </tr>

              {/* Core Ledger Access & Actions */}
              <tr className="bg-slate-50/50 dark:bg-[#162244]/50">
                <td colSpan={5} className="p-3 px-4 font-black uppercase tracking-wider text-[10px] text-[#0284c7] dark:text-[#38bdf8]">Ledger Access &amp; Document Controls</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">Sales Ledger (Invoices, Quotations, Proforma, Credit Notes)</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">Purchase Ledger (Purchases, POs, Purchase Debit Notes)</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">Share Documents via WhatsApp &amp; Email</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">Edit, Record Payments, Download PDF &amp; Delete Documents</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
              </tr>

              {/* Document Builder & Expense Management */}
              <tr className="bg-slate-50/50 dark:bg-[#162244]/50">
                <td colSpan={5} className="p-3 px-4 font-black uppercase tracking-wider text-[10px] text-[#0284c7] dark:text-[#38bdf8]">Document Builder &amp; Expenses</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">Interactive Editable Document Builder</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">Expense Tracking &amp; Category Log</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">Interactive Billing &amp; Financial Dashboard</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">System Presets for Invoice Templates</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">Auto-Generated Payment QR from UPI ID</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">Dark / Light Theme Toggle Mode</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
                <td className="p-4 text-center text-emerald-500">✓</td>
              </tr>

              {/* Master Databases & Bulk Operations */}
              <tr className="bg-slate-50/50 dark:bg-[#162244]/50">
                <td colSpan={5} className="p-3 px-4 font-black uppercase tracking-wider text-[10px] text-[#0284c7] dark:text-[#38bdf8]">Databases &amp; Bulk Operations</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">Database Entry (Client, Vendor, HSN, Transport, Product Category, Catalog)</td>
                <td className="p-4 text-center font-bold">Single Entry</td>
                <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">Bulk + Single</td>
                <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">Bulk + Single</td>
                <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">Bulk + Single</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">Bulk Ledger Actions (Bulk Record Payments, Delete Bulk Docs, Export CSV)</td>
                <td className="p-4 text-center text-rose-500 font-bold">✕</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">Duplicate Existing Document Without Remaking</td>
                <td className="p-4 text-center text-rose-500 font-bold">✕</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">Convert Document Type (e.g. Quotation to Tax Invoice)</td>
                <td className="p-4 text-center text-rose-500 font-bold">✕</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
              </tr>

              {/* Template Customization & Branding */}
              <tr className="bg-slate-50/50 dark:bg-[#162244]/50">
                <td colSpan={5} className="p-3 px-4 font-black uppercase tracking-wider text-[10px] text-[#0284c7] dark:text-[#38bdf8]">Template Customization &amp; Branding</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">Create Own Templates using Simple &amp; Advanced Builders</td>
                <td className="p-4 text-center text-rose-500 font-bold">✕</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">Personalised Logo &amp; Personalised Digital Signature</td>
                <td className="p-4 text-center text-rose-500 font-bold">✕</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">Remove MakInvoices Watermark &amp; Add Personalised Watermark</td>
                <td className="p-4 text-center text-rose-500 font-bold">✕</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
              </tr>

              {/* AI Features & Automation */}
              <tr className="bg-slate-50/50 dark:bg-[#162244]/50">
                <td colSpan={5} className="p-3 px-4 font-black uppercase tracking-wider text-[10px] text-[#0284c7] dark:text-[#38bdf8]">AI Features &amp; Automation</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">AI Smart Billing Feature (AI Document Parsing)</td>
                <td className="p-4 text-center text-rose-500 font-bold">✕</td>
                <td className="p-4 text-center text-rose-500 font-bold">✕</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">MakInvoices AI Assistant 24*7 Support</td>
                <td className="p-4 text-center text-rose-500 font-bold">✕</td>
                <td className="p-4 text-center text-rose-500 font-bold">✕</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">Recurring Invoice Scheduler Automation</td>
                <td className="p-4 text-center text-rose-500 font-bold">✕</td>
                <td className="p-4 text-center text-rose-500 font-bold">✕</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
                <td className="p-4 text-center text-emerald-500 font-bold">✓</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">Support Channels &amp; Priority SLA</td>
                <td className="p-4 text-center font-medium">Email / FAQ / Ticket</td>
                <td className="p-4 text-center font-medium">Standard Support</td>
                <td className="p-4 text-center font-medium text-[#0284c7] dark:text-[#38bdf8]">24*7 AI + Priority</td>
                <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">VIP Priority + SLA</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Trust badging / Security notice */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-6 rounded-2xl bg-[#f4f9ff] dark:bg-[#0b1329]/40 border border-[#bae6fd]/40 dark:border-[#223269]/40 text-xs text-[#64748b] dark:text-[#94a3b8] dark:text-slate-450">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" />
          <span>256-bit Bank Grade Security Protocols</span>
        </div>
        <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-[#bae6fd] dark:bg-zinc-700" />
        <div className="flex items-center gap-2">
          <Coins className="w-4.5 h-4.5 text-amber-500" />
          <span>Simulated Checkout / Sandboxed Pricing</span>
        </div>
      </div>

      {/* Success Modal Confirmation Overlay */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white dark:bg-[#111a36] rounded-3xl p-8 border border-[#bae6fd]/60 dark:border-[#223269]/60 text-center shadow-2xl transform scale-100 animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto mb-5 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-8 h-8 fill-emerald-600 dark:fill-emerald-400" />
            </div>
            
            <h3 className="text-xl font-black text-[#0f172a] dark:text-white uppercase tracking-tight">
              {showSuccessModal.includes('_trial') ? '1-Month Free Trial Activated!' : 'Upgrade Successful!'}
            </h3>
            <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-2 leading-relaxed">
              {showSuccessModal.includes('_trial') ? (
                <>Congratulations! Your <span className="font-extrabold capitalize text-emerald-600 dark:text-emerald-400">1-Month Free Trial</span> for the {showSuccessModal === 'basic_trial' ? 'Basic Plan' : 'Professional Plan'} is now active. Enjoy full features for 30 days at zero cost!</>
              ) : (
                <>Congratulations! Your MakInvoices account has been upgraded to the <span className="font-extrabold capitalize text-[#0284c7]">{showSuccessModal} Plan</span>. All features, layouts, and limits are instantly active.</>
              )}
            </p>

            <button
              onClick={() => setShowSuccessModal(null)}
              className="mt-6 w-full py-3 bg-[#0284c7] hover:bg-[#0369a1] dark:bg-white dark:text-[#0b1329] dark:hover:bg-[#e0f2fe] text-white font-extrabold text-xs rounded-xl cursor-pointer active:scale-98 transition-all"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Downgrade Confirmation Overlay */}
      {showDowngradeConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white dark:bg-[#111a36] rounded-3xl p-8 border border-amber-500/40 text-center shadow-2xl transform scale-100 animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/50 rounded-full flex items-center justify-center mx-auto mb-5 text-amber-600 dark:text-amber-400">
              <Crown className="w-8 h-8" />
            </div>
            
            <h3 className="text-xl font-black text-[#0f172a] dark:text-white uppercase tracking-tight">
              Confirm Plan Downgrade
            </h3>
            <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-2 leading-relaxed">
              Are you sure you want to switch to the <span className="font-extrabold text-amber-600 dark:text-amber-400">Free Starter Plan</span>? Your active plan features will be locked, but you can restore your paid tier anytime without paying again.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => setShowDowngradeConfirm(false)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl cursor-pointer hover:bg-slate-200 transition-all"
              >
                Keep Active Plan
              </button>
              <button
                onClick={() => {
                  if (activeTier && activeTier !== 'free') {
                    localStorage.setItem('makbills_last_active_paid_tier', activeTier);
                  }
                  onUpgrade('free');
                  setShowDowngradeConfirm(false);
                  setShowSuccessModal('free');
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl cursor-pointer active:scale-98 transition-all shadow-md shadow-rose-600/20"
              >
                Confirm Downgrade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trial Confirmation Modal */}
      {trialModalPlan && (
        <TrialConfirmModal
          planType={trialModalPlan}
          isOpen={Boolean(trialModalPlan)}
          onClose={() => setTrialModalPlan(null)}
          onConfirmSuccess={() => {
            onUpgrade(trialModalPlan === 'professional' ? 'pro' : 'basic');
            setShowSuccessModal(`${trialModalPlan}_trial`);
          }}
        />
      )}

    </div>
  );
}
