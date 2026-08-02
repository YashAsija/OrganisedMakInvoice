import React, { useState } from 'react';
import { 
  Check, 
  Sparkles, 
  Crown, 
  Zap, 
  ShieldCheck, 
  CreditCard,
  RefreshCw,
  Coins
} from 'lucide-react';
import { BusinessProfile, Invoice } from '../types';

interface SubscriptionPageProps {
  theme: 'light' | 'dark';
  profile: BusinessProfile;
  invoices?: Invoice[];
  subscriptionTier: 'free' | 'basic' | 'pro' | 'unlimited' | 'enterprise';
  onUpgrade: (tier: 'free' | 'basic' | 'pro' | 'unlimited' | 'enterprise') => void;
}

const PLANS = [
  {
    id: 'free' as const,
    tier: 'Free',
    name: 'Starter',
    tagline: 'Get started at zero cost. No credit card required.',
    monthly: '₹0',
    annual: '₹0',
    annualNote: 'Free forever. No commitment needed.',
    monthlyNote: 'Free forever. No credit card needed.',
    popular: false,
    limit: 10,
    features: [
      { text: 'Up to 10 invoices / month', included: true },
      { text: '1 business profile', included: true },
      { text: 'Invoice & Quotation', included: true },
      { text: 'Simple invoice template', included: true },
      { text: 'PDF export', included: true },
      { text: 'AI Smart Billing (Gemini)', included: false },
      { text: 'Advanced templates', included: false },
      { text: 'Priority support', included: false },
    ],
  },
  {
    id: 'basic' as const,
    tier: 'Basic',
    name: 'Basic',
    tagline: 'Perfect for freelancers scaling their invoicing.',
    monthly: '₹200',
    annual: '₹160',
    annualNote: 'Billed ₹1,920/year — save ₹480.',
    monthlyNote: 'Billed monthly. Cancel anytime.',
    popular: false,
    limit: 50,
    features: [
      { text: 'Up to 50 invoices / month', included: true },
      { text: '2 business profiles', included: true },
      { text: 'Invoice, Quotation & Purchase Order', included: true },
      { text: 'Simple + Advanced templates', included: true },
      { text: 'PDF export', included: true },
      { text: 'Sales & Purchase ledger', included: true },
      { text: 'AI Smart Billing (Gemini)', included: false },
      { text: 'Priority support', included: false },
    ],
  },
  {
    id: 'pro' as const,
    tier: 'Pro',
    name: 'Professional',
    tagline: 'For growing businesses that bill at volume.',
    monthly: '₹350',
    annual: '₹280',
    annualNote: 'Billed ₹3,360/year — save ₹840.',
    monthlyNote: 'Billed monthly. Cancel anytime.',
    popular: true,
    limit: 100,
    features: [
      { text: 'Up to 100 invoices / month', included: true },
      { text: '3 business profiles', included: true },
      { text: 'All document types incl. Debit & Credit Notes', included: true },
      { text: 'All templates + custom logo & signature', included: true },
      { text: 'AI Smart Billing (Gemini)', included: true },
      { text: 'Multi-rate tax splits', included: true },
      { text: 'Region-aware number formatting', included: true },
      { text: 'Priority support', included: false },
    ],
  },
  {
    id: 'unlimited' as const,
    tier: 'Unlimited',
    name: 'Unlimited',
    tagline: 'No caps, no limits. Built for high-volume operations.',
    monthly: '₹600',
    annual: '₹480',
    annualNote: 'Billed ₹5,760/year — save ₹1,440.',
    monthlyNote: 'Billed monthly. Cancel anytime.',
    popular: false,
    limit: Infinity,
    features: [
      { text: 'Unlimited invoices', included: true },
      { text: 'Unlimited business profiles', included: true },
      { text: 'All document types incl. Debit & Credit Notes', included: true },
      { text: 'All templates + custom logo & signature', included: true },
      { text: 'AI Smart Billing (Gemini)', included: true },
      { text: 'RAG-trained AI chat support', included: true },
      { text: 'Recurring invoice scheduler', included: true },
      { text: 'Priority support with SLA', included: true },
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
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<string | null>(null);

  // Normalise mapped subscription tier (enterprise maps to unlimited conceptually for limits check)
  const activeTier = subscriptionTier === 'enterprise' ? 'unlimited' : subscriptionTier;

  const handleUpgradeSimulate = (planId: 'free' | 'basic' | 'pro' | 'unlimited') => {
    setLoadingPlan(planId);
    setTimeout(() => {
      setLoadingPlan(null);
      onUpgrade(planId);
      setShowSuccessModal(planId);
    }, 1500);
  };

  const getMonthlyUsage = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return invoices.filter(inv => {
      if (!inv.date) return false;
      const d = new Date(inv.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
  };

  const usageCount = getMonthlyUsage();
  
  const getActiveLimit = () => {
    if (activeTier === 'free') return 10;
    if (activeTier === 'basic') return 50;
    if (activeTier === 'pro') return 100;
    return Infinity;
  };

  const activeLimit = getActiveLimit();
  const usagePercentage = activeLimit === Infinity ? 100 : Math.min(100, (usageCount / activeLimit) * 100);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-3 md:py-4 space-y-8 animate-in fade-in duration-300">
      
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e1b4b] via-[#0f172a] to-[#020617] p-8 md:p-12 text-white border border-slate-800/80 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-500/15 text-sky-400 rounded-full text-xs font-bold uppercase tracking-wider">
              <Crown className="w-3.5 h-3.5" />
              <span>Subscription Control Center</span>
            </div>
            <h1 className="text-3xl md:text-4.5xl font-black tracking-tight leading-none uppercase">
              Configure Your Billing Scale
            </h1>
            <p className="text-sm text-slate-400 max-w-xl">
              Unlock cloud synchronization, advanced PDF layout templates, unlimited recurring invoices, and dedicated priority support channels.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 shrink-0 md:w-80">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold block">Current Status</span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xl font-black text-white capitalize">{activeTier} Plan</span>
              {activeTier !== 'free' && (
                <span className="animate-pulse inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {activeTier === 'free' 
                ? 'Usage limited to 10 invoices per month.' 
                : activeTier === 'basic'
                  ? 'Basic plan limits are active on your account.'
                  : activeTier === 'pro' 
                    ? 'Professional billing activated on your account.'
                    : 'Unlimited capabilities fully unlocked.'}
            </p>
            
            {/* Usage limit meter */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Monthly Usage</span>
                <span className="font-bold">
                  {activeLimit === Infinity ? 'Unlimited' : `${usageCount} / ${activeLimit} Invoices`}
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    activeLimit === Infinity 
                      ? 'bg-emerald-450 w-full' 
                      : usagePercentage > 85 
                        ? 'bg-rose-500' 
                        : usagePercentage > 60 
                          ? 'bg-amber-400' 
                          : 'bg-sky-400'
                  }`}
                  style={{ width: `${usagePercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Billing Cycle Selector */}
      <div className="text-center space-y-4">
        <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-800 dark:text-white uppercase">
          Choose a Plan Designed for Growth
        </h2>
        
        <div className="flex items-center justify-center gap-3">
          <span className={`text-xs font-bold transition-colors ${!isYearly ? 'text-sky-600 dark:text-sky-400 font-extrabold' : 'text-slate-450 dark:text-zinc-500'}`}>Monthly Billing</span>
          <button
            type="button"
            onClick={() => setIsYearly(!isYearly)}
            className="w-12 h-6.5 rounded-full bg-slate-200 dark:bg-zinc-800 p-1 transition-colors relative focus:outline-none cursor-pointer flex items-center"
          >
            <div className={`w-4.5 h-4.5 rounded-full bg-sky-600 dark:bg-sky-500 shadow-md transition-transform duration-300 transform ${isYearly ? 'translate-x-5.5' : 'translate-x-0'}`} />
          </button>
          <span className={`text-xs font-bold transition-colors flex items-center gap-1.5 ${isYearly ? 'text-sky-600 dark:text-sky-400 font-extrabold' : 'text-slate-450 dark:text-zinc-500'}`}>
            Yearly Billing
            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-md font-extrabold uppercase tracking-wider">Save 20%</span>
          </span>
        </div>
      </div>

      {/* Plan Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => {
          const isActive = activeTier === plan.id;
          return (
            <div 
              key={plan.id} 
              className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between hover:scale-102 hover:shadow-xl ${
                theme === 'dark' 
                  ? 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700' 
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
              } ${plan.popular ? 'border-sky-500/40 ring-1 ring-sky-500/20 shadow-sky-500/5' : ''} ${isActive ? 'ring-2 ring-sky-550' : ''}`}
            >
              <div className="relative">
                {plan.popular && (
                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2">
                    <span className="text-[8px] px-2 py-0.5 bg-gradient-to-r from-sky-600 to-indigo-650 text-white rounded-full font-black uppercase tracking-wider shadow-md">Most Popular</span>
                  </div>
                )}
                
                <div className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1">{plan.tier}</div>
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">{plan.name}</h3>
                  {isActive && (
                    <span className="text-[9px] px-2 py-0.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-full font-bold">Active</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-505 dark:text-slate-400 mt-2 leading-relaxed min-h-[36px]">
                  {plan.tagline}
                </p>
                
                <div className="flex items-baseline gap-1 my-5">
                  <span className="text-3xl font-black text-slate-800 dark:text-white">
                    {isYearly ? plan.annual : plan.monthly}
                  </span>
                  <span className="text-xs text-slate-400">/mo</span>
                </div>
                <p className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 min-h-[24px]">
                  {isYearly ? plan.annualNote : plan.monthlyNote}
                </p>

                <div className="border-t border-slate-100 dark:border-zinc-800/85 pt-4 space-y-2.5 mb-6">
                  {plan.features.map((feat, i) => (
                    <div key={i} className={`flex items-start gap-2 text-[11px] ${feat.included ? '' : 'opacity-40'}`}>
                      {feat.included ? (
                        <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      ) : (
                        <span className="text-slate-400 shrink-0 font-bold ml-1.5 mr-1">–</span>
                      )}
                      <span className="text-slate-600 dark:text-zinc-300 leading-normal">{feat.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={isActive || loadingPlan !== null}
                onClick={() => handleUpgradeSimulate(plan.id)}
                className={`w-full py-2.5 font-bold text-xs rounded-xl cursor-pointer transition-all border flex items-center justify-center gap-2 ${
                  isActive
                    ? 'bg-slate-100 dark:bg-zinc-800/60 border-transparent text-slate-400 dark:text-zinc-500 cursor-default'
                    : plan.popular
                      ? 'bg-gradient-to-r from-sky-600 to-indigo-650 hover:from-sky-500 hover:to-indigo-600 active:scale-98 text-white shadow-md shadow-sky-500/20'
                      : 'border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-slate-200'
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
                ) : (
                  <>
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Get {plan.name}</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Trust badging / Security notice */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-6 rounded-2xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/50 dark:border-zinc-800/60 text-xs text-slate-500 dark:text-slate-450">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" />
          <span>256-bit Bank Grade Security Protocols</span>
        </div>
        <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
        <div className="flex items-center gap-2">
          <Coins className="w-4.5 h-4.5 text-amber-500" />
          <span>Simulated Checkout / Sandboxed Pricing</span>
        </div>
      </div>

      {/* Success Modal Confirmation Overlay */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-slate-200 dark:border-zinc-800 text-center shadow-2xl transform scale-100 animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto mb-5 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-8 h-8 fill-emerald-600 dark:fill-emerald-400" />
            </div>
            
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
              Upgrade Successful!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Congratulations! Your MakInvoices account has been upgraded to the <span className="font-extrabold capitalize text-sky-500">{showSuccessModal} Plan</span>. All features, layouts, and limits are instantly active.
            </p>

            <button
              onClick={() => setShowSuccessModal(null)}
              className="mt-6 w-full py-3 bg-slate-800 hover:bg-slate-700 dark:bg-white dark:text-zinc-900 text-white font-extrabold text-xs rounded-xl cursor-pointer active:scale-98 transition-all"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
